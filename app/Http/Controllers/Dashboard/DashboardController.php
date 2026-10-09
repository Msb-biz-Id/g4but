<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use App\Models\Alert;
use App\Models\Evaluation;
use App\Models\IndicatorTarget;
use App\Models\MeasurementPeriod;
use App\Models\Organization;
use App\Models\PkoEvaluation;
use App\Models\PlanningPeriod;
use App\Models\Realization;
use App\Models\StrategicObjective;
use App\Services\AuthorizationService;
use App\Services\EarlyWarningAnalyticsService;
use App\Services\OpdAnalyticsService;
use App\Services\PerformanceMeasurementService;
use App\Services\SakipDocumentService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class DashboardController extends Controller
{
    public function __construct(
        private readonly AuthorizationService $authorization,
        private readonly SakipDocumentService $sakipDocService,
        private readonly OpdAnalyticsService $opdAnalytics,
        private readonly EarlyWarningAnalyticsService $ewsAnalytics,
    ) {}

    // ── Formula SAKIP Helper ───────────────────────────────────────────────────

    private function calculateCapaian(?float $realisasi, ?float $target, string $polarization = 'positif'): ?float
    {
        return PerformanceMeasurementService::calculateAchievement($target, $realisasi, $polarization);
    }

    /**
     * Menentukan status capaian kinerja.
     * BR-STATUS: Tidak Dinilai jika capaian null atau jika target & realisasi keduanya 0.
     */
    private function getStatusCapaian(?float $capaian, ?float $target = null, ?float $realisasi = null): string
    {
        if ($capaian === null) {
            return 'Tidak Dinilai';
        }
        if ($target !== null && $realisasi !== null && (float) $target == 0 && (float) $realisasi == 0) {
            return 'Tidak Dinilai';
        }
        if ($capaian < 0) {
            return 'Kritis';
        }
        if ($capaian >= 100) {
            return 'Tercapai';
        }
        if ($capaian >= 50) {
            return 'Perlu Perhatian';
        }

        return 'Kritis';
    }

    private function getStatusKelengkapan(float $pct): string
    {
        if ($pct >= 100) {
            return 'Lengkap';
        }
        if ($pct > 0) {
            return 'Belum Lengkap';
        }

        return 'Belum Tersedia';
    }

    private function getPredikatSakip(float $nilai): string
    {
        // Standar Evaluasi SAKIP PermenPANRB 22/2024 (Tabel 1 Halaman 6: Skala 7 Kategori AA - D):
        if ($nilai <= 0) {
            return 'BELUM DINILAI';
        }
        if ($nilai > 90) {
            return 'AA';
        }
        if ($nilai > 80) {
            return 'A';
        }
        if ($nilai > 70) {
            return 'BB';
        }
        if ($nilai > 60) {
            return 'B';
        }
        if ($nilai > 50) {
            return 'CC';
        }
        if ($nilai > 30) {
            return 'C';
        }

        return 'D';
    }

    private function getPredikatPko(float $nilai): string
    {
        // Standar Evaluasi PKO PermenPANRB 22/2024 (Tabel 4 Halaman 8: 5 Kategori Predikat):
        if ($nilai <= 0) {
            return 'BELUM DINILAI';
        }
        if ($nilai > 100) {
            return 'ISTIMEWA';
        }
        if ($nilai > 80) {
            return 'BAIK';
        }
        if ($nilai > 60) {
            return 'BUTUH PERBAIKAN';
        }
        if ($nilai > 20) {
            return 'KURANG';
        }

        return 'SANGAT KURANG';
    }

    private function resolveActiveTriwulan(int $year, ?string $selectedTriwulan = null): string
    {
        if ($selectedTriwulan && $selectedTriwulan !== 'Semua') {
            return $selectedTriwulan;
        }

        $today = date('Y-m-d');
        // 1. Cari MeasurementPeriod quarterly yang statusnya open dan tanggal hari ini di dalam rentang tanggalnya
        $activeQuarter = MeasurementPeriod::whereHas('planningPeriod', function ($q) use ($year) {
            $q->where('year', $year);
        })
            ->where('type', 'quarterly')
            ->whereIn('status', ['open', 'active'])
            ->where('start_date', '<=', $today)
            ->where('end_date', '>=', $today)
            ->first();

        // 2. Jika tidak ada yang mencakup hari ini, cari yang open terakhir untuk tahun tersebut
        if (! $activeQuarter) {
            $activeQuarter = MeasurementPeriod::whereHas('planningPeriod', function ($q) use ($year) {
                $q->where('year', $year);
            })
                ->where('type', 'quarterly')
                ->whereIn('status', ['open', 'active'])
                ->orderByDesc('end_date')
                ->first();
        }

        if ($activeQuarter) {
            $code = strtoupper($activeQuarter->code);
            $name = strtoupper($activeQuarter->name);
            if (str_contains($code, 'TW1') || str_contains($code, 'TW-1') || str_contains($name, 'TRIWULAN I') || str_contains($name, 'TW I')) {
                return 'TW I';
            }
            if (str_contains($code, 'TW2') || str_contains($code, 'TW-2') || str_contains($name, 'TRIWULAN II') || str_contains($name, 'TW II')) {
                return 'TW II';
            }
            if (str_contains($code, 'TW3') || str_contains($code, 'TW-3') || str_contains($name, 'TRIWULAN III') || str_contains($name, 'TW III')) {
                return 'TW III';
            }
            if (str_contains($code, 'TW4') || str_contains($code, 'TW-4') || str_contains($name, 'TRIWULAN IV') || str_contains($name, 'TW IV')) {
                return 'TW IV';
            }
        }

        // 3. Fallback berdasarkan kalender berjalan saat ini
        $month = (int) date('n');

        return match (true) {
            $month <= 3 => 'TW I',
            $month <= 6 => 'TW II',
            $month <= 9 => 'TW III',
            default => 'TW IV',
        };
    }

    private function getKoreksiAkip(string $predikat): float
    {
        return 0.00;
    }

    // ─────────────────────────────────────────────────────────────────────────

    public function index(Request $request): Response
    {
        $this->authorize('view-dashboard');

        $user = $request->user();
        $isProvincialAdmin = $this->authorization->isProvincialAdmin($user);
        $accessibleOrgIds = $this->authorization->accessibleOrganizationIds($user);

        $availableYears = PlanningPeriod::getAvailableYears();
        $startYear = ! empty($availableYears) ? min($availableYears) : 2025;

        $activeYear = PlanningPeriod::where('status', 'active')
            ->whereNotNull('year')
            ->where('year', '>=', 2000)
            ->where('year', '<=', 2100)
            ->orderByDesc('id')
            ->value('year');

        $defaultYear = $activeYear ? (int) $activeYear : ((int) date('Y') >= 2000 ? (int) date('Y') : 2026);

        $selectedOrgId = null;
        if (! $isProvincialAdmin) {
            $requestedOrgId = $request->filled('organization_id') ? (int) $request->get('organization_id') : null;
            if ($requestedOrgId && in_array($requestedOrgId, $accessibleOrgIds, true)) {
                $selectedOrgId = $requestedOrgId;
            } else {
                $selectedOrgId = $user->organization_id ?? ($accessibleOrgIds[0] ?? null);
            }
        } else {
            $selectedOrgId = $request->filled('organization_id') ? (int) $request->get('organization_id') : null;
        }

        $rawTahun = $request->get('tahun_evaluasi');
        $tahun = null;
        if ($rawTahun !== null && $rawTahun !== '') {
            $val = (int) $rawTahun;
            if ($val >= 1 && $val <= 10) {
                // Petakan indeks relatif 1..10 ke tahun kalender RPJMD (misal 1 -> 2025, 2 -> 2026)
                $tahun = $startYear + $val - 1;
            } elseif ($val >= 2000 && $val <= 2100) {
                $tahun = $val;
            }
        }
        if (! $tahun) {
            $tahun = in_array((int) date('Y'), $availableYears, true) ? (int) date('Y') : $defaultYear;
            if ($tahun < 2000 || $tahun > 2100) {
                $tahun = 2026;
            }
        }

        $filters = [
            'tahun_evaluasi' => $tahun,
            'triwulan' => $request->get('triwulan', 'Semua'),
            'organization_id' => $selectedOrgId,
            'strategic_objective_id' => $request->filled('strategic_objective_id') ? (int) $request->get('strategic_objective_id') : null,
            'status_kinerja' => $request->get('status_kinerja', 'Semua'),
        ];

        $orgScopeKey = $isProvincialAdmin ? 'all' : implode('-', $accessibleOrgIds);
        $cacheKey = 'sakip_dashboard_v5_'.md5(json_encode($filters).'_'.$orgScopeKey);
        $data = Cache::remember($cacheKey, 60, function () use ($filters, $isProvincialAdmin, $accessibleOrgIds) {
            return $this->computeDashboardData($filters, $isProvincialAdmin, $accessibleOrgIds);
        });

        return Inertia::render('Dashboard', $data);
    }

    private function computeDashboardData(array $filters, bool $isProvincialAdmin = true, array $accessibleOrgIds = []): array
    {
        $tahun = $filters['tahun_evaluasi'];
        $triwulan = $filters['triwulan'];
        $activeTriwulan = $this->resolveActiveTriwulan($tahun, $triwulan);
        $filterOpdId = $filters['organization_id'];
        $filterSasaranId = $filters['strategic_objective_id'];
        $filterStatus = $filters['status_kinerja'];

        // ── 1. Organisasi ──────────────────────────────────────────────────
        $provinsi = Organization::where('code', 'PROV-PAPBAR')->first()
            ?? Organization::where('type', 'province')->first();

        $allOpdQuery = Organization::where('type', 'opd')->orderBy('name');
        if (! $isProvincialAdmin) {
            $allOpdQuery->whereIn('id', $accessibleOrgIds);
        }
        if ($filterOpdId) {
            $allOpdQuery->where('id', $filterOpdId);
        }
        $allOpd = $allOpdQuery->get();
        $totalOpd = max($allOpd->count(), 1);

        // ── 2. Kelengkapan Dokumen Pemda (Dinamis 13 Parameter) & SAKIP Pemda ──────────────
        $pemdaMatrix = $this->sakipDocService->getSakipPemdaMatrix($tahun);
        $sakipPemda = $this->opdAnalytics->getSakipPemdaMatrix($tahun);
        $docsRequired = $pemdaMatrix['total_required'];
        $docsAvailable = $pemdaMatrix['available'];
        $kelengkapanPctPemda = $pemdaMatrix['percentage'];
        $statusPemda = $pemdaMatrix['status'];

        // ── 3. Kelengkapan Dokumen OPD (Dinamis 12 Dokumen Baku) ────────────
        $opdMatrix = $this->sakipDocService->getSakipOpdMatrix($tahun, $filterOpdId);
        $opdLengkap = $opdMatrix['opd_lengkap'];
        $opdLengkapPct = $opdMatrix['pct_lengkap'];

        // ── 4. Capaian Indikator IKU Pemda Dinamis (Reuse OpdAnalyticsService - Single Source of Truth) ───
        $ikuMatrix = $this->opdAnalytics->getIkuPemdaMatrix($tahun, $filterStatus);
        $rataCapaianIku = (float) ($ikuMatrix['summary']['rata_capaian'] ?? 0);
        $ikuStatusFinal = [
            'total' => (int) ($ikuMatrix['summary']['total_iku'] ?? 0),
            'tercapai' => (int) ($ikuMatrix['summary']['tercapai'] ?? 0),
            'perlu_perhatian' => (int) ($ikuMatrix['summary']['perlu_perhatian'] ?? 0),
            'terlambat' => 0,
            'kritis' => (int) ($ikuMatrix['summary']['kritis'] ?? 0),
            'tidak_dinilai' => (int) ($ikuMatrix['summary']['tidak_dinilai'] ?? 0),
        ];

        // ── 5. Capaian Indikator RPJMD dinonaktifkan (Rumah Besar OPD) ─────
        $rpjmdMatrix = [
            'summary' => [
                'rata_capaian' => 0,
                'total_indikator' => 0,
                'tercapai' => 0,
                'breakdown' => ['perlu_perhatian' => 0, 'terlambat' => 0, 'kritis' => 0, 'tidak_dinilai' => 0],
            ],
            'rows' => [],
            'trend' => [],
            'years' => [],
        ];
        $rataCapaianRpjmd = 0;
        $rpjmdStatusFinal = [
            'total' => 0,
            'tercapai' => 0,
            'perlu_perhatian' => 0,
            'terlambat' => 0,
            'kritis' => 0,
            'tidak_dinilai' => 0,
        ];

        // ── 6. Capaian & Ranking OPD Dinamis (Reuse OpdAnalyticsService - Fix Duplikasi N+1) ───
        $opdRankingMatrix = $this->opdAnalytics->getOpdPerformanceRanking($tahun, $filterOpdId, $filterStatus);
        $opdRankingData = array_map(function ($r) {
            return [
                'id' => $r['id'],
                'nama' => $r['perangkat_daerah'],
                'kode' => $r['kode'],
                'jumlah_indikator' => $r['jumlah_indikator'],
                'rata_capaian' => $r['rata_capaian'],
                'tercapai' => $r['tercapai'],
                'perlu_perhatian' => $r['perhatian'],
                'terlambat' => 0,
                'kritis' => $r['kritis'],
                'status' => $r['status'],
                'rank' => $r['rank'],
            ];
        }, $opdRankingMatrix['rows']);

        $opdStatusCount = [
            'tercapai' => $opdRankingMatrix['summary']['tercapai'] ?? 0,
            'perlu_perhatian' => $opdRankingMatrix['summary']['perlu_perhatian'] ?? 0,
            'terlambat' => 0,
            'kritis' => $opdRankingMatrix['summary']['kritis'] ?? 0,
        ];

        $rataCapaianOpd = $opdRankingMatrix['summary']['rata_capaian'] ?? 0.0;
        $opdKritis = $opdStatusCount['kritis'];
        $opdStatusFinal = [
            'total' => $totalOpd,
            'tercapai' => $opdStatusCount['tercapai'],
            'perlu_perhatian' => $opdStatusCount['perlu_perhatian'],
            'terlambat' => 0,
            'kritis' => $opdKritis,
            'tidak_dinilai' => $opdRankingMatrix['summary']['tidak_dinilai'] ?? 0,
        ];

        // ── 7. Nilai SAKIP OPD Dinamis (Tabel evaluations & evaluation_scores) ─
        $evaluationsQuery = Evaluation::with('scores')
            ->where('status', 'approved');

        if ($provinsi) {
            $evaluationsQuery->where('organization_id', '!=', $provinsi->id);
        }

        if ($filterOpdId) {
            $evaluationsQuery->where('organization_id', $filterOpdId);
        }

        $periodTahun = PlanningPeriod::where('year', $tahun)->first();
        if ($periodTahun) {
            $evaluationsQuery->where(function ($q) use ($periodTahun, $tahun) {
                $q->where('planning_period_id', $periodTahun->id)
                    ->orWhere('code', 'like', "%{$tahun}%")
                    ->orWhere('title', 'like', "%{$tahun}%");
            });
        }

        $evaluations = $evaluationsQuery->get();

        $sakipScores = [];
        $predikatCounts = [
            'AA' => 0,
            'A' => 0,
            'BB' => 0,
            'B' => 0,
            'CC' => 0,
            'C' => 0,
            'D' => 0,
        ];

        foreach ($evaluations as $ev) {
            $totalScore = (float) $ev->scores->sum('score');
            $predikat = $this->getPredikatSakip($totalScore);
            $sakipScores[$ev->organization_id] = [
                'nilai' => $totalScore,
                'predikat' => $predikat,
            ];

            if (isset($predikatCounts[$predikat])) {
                $predikatCounts[$predikat]++;
            }
        }

        $rataNilaiSakipOpd = count($sakipScores) > 0
            ? round(array_sum(array_column($sakipScores, 'nilai')) / count($sakipScores), 2)
            : 0.0;
        $predikatSakipOpd = count($sakipScores) > 0 ? $this->getPredikatSakip($rataNilaiSakipOpd) : 'BELUM DINILAI';

        $sakipDistribusi = [
            'rata_nilai' => $rataNilaiSakipOpd,
            'predikat_rata' => $predikatSakipOpd,
            'total_dievaluasi' => count($evaluations),
            'predikat_AA' => $predikatCounts['AA'],
            'predikat_A' => $predikatCounts['A'],
            'predikat_BB' => $predikatCounts['BB'],
            'predikat_B' => $predikatCounts['B'],
            'predikat_CC' => $predikatCounts['CC'],
            'predikat_C' => $predikatCounts['C'],
            'predikat_D' => $predikatCounts['D'],
            // Aliases for compatibility
            'predikat_ISTIMEWA' => $predikatCounts['AA'],
            'predikat_BAIK' => $predikatCounts['A'],
            'predikat_BUTUH_PERBAIKAN' => $predikatCounts['BB'],
            'predikat_KURANG' => $predikatCounts['B'],
            'predikat_SANGAT_KURANG' => $predikatCounts['CC'] + $predikatCounts['C'] + $predikatCounts['D'],
            'predikat_CC_bawah' => $predikatCounts['CC'] + $predikatCounts['C'] + $predikatCounts['D'],
        ];

        // ── 8. Penilaian Kinerja Organisasi (PKO) Dinamis ───────────────────
        $pkoEvalsByOrg = PkoEvaluation::where('year', $tahun)->get()->keyBy('organization_id');
        $pkoOpdData = [];
        foreach ($allOpd as $opd) {
            $pkoEval = $pkoEvalsByOrg->get($opd->id);
            if ($pkoEval && (float) $pkoEval->nko > 0) {
                $nilaiPko = (float) $pkoEval->nko;
                $predikatPko = $pkoEval->predikat ?: $this->getPredikatPko($nilaiPko);
            } else {
                $nilaiPko = 0.0;
                $predikatPko = 'BELUM DINILAI';
            }

            $pkoOpdData[] = [
                'nama' => $opd->name,
                'kode' => $opd->code,
                'nilai_pko' => $nilaiPko,
                'predikat' => $predikatPko,
            ];
        }

        usort($pkoOpdData, fn ($a, $b) => $b['nilai_pko'] <=> $a['nilai_pko']);
        $pkoOpdData = array_map(function ($item, $idx) {
            return array_merge($item, ['rank' => $idx + 1]);
        }, array_values($pkoOpdData), array_keys($pkoOpdData));

        // Nilai Rata Rata PKO Pemda = Σ nilai PKO seluruh OPD yang sudah dievaluasi ÷ jumlah OPD dievaluasi
        $evaluatedPko = array_filter($pkoOpdData, fn ($p) => $p['nilai_pko'] > 0);
        $rataRataPkoPemda = count($evaluatedPko) > 0
            ? round(array_sum(array_column($evaluatedPko, 'nilai_pko')) / count($evaluatedPko), 2)
            : 0.0;
        $predikatRataRataPkoPemda = count($evaluatedPko) > 0 ? $this->getPredikatPko($rataRataPkoPemda) : 'BELUM DINILAI';

        // Nilai PKO Pemda: Diambil langsung dari hasil evaluasi PKO Pemerintah Daerah (PkoEvaluation)
        $pemdaOrg = Organization::where('type', 'province')->first()
            ?? Organization::where('code', 'PROV-PAPBAR')->first()
            ?? Organization::find(1);

        $pkoPemdaEval = null;
        if ($pemdaOrg) {
            $pkoPemdaEval = PkoEvaluation::where('organization_id', $pemdaOrg->id)
                ->where('year', $tahun)
                ->first();
        }

        if ($pkoPemdaEval && (float) $pkoPemdaEval->nko > 0) {
            $nilaiPkoPemda = (float) $pkoPemdaEval->nko;
            $predikatPkoPemda = $pkoPemdaEval->predikat ?: $this->getPredikatPko($nilaiPkoPemda);
        } else {
            // Jika tahun berjalan belum ada di tabel pko_evaluations, nilai 0.0 & BELUM DINILAI
            $nilaiPkoPemda = 0.0;
            $predikatPkoPemda = 'BELUM DINILAI';
        }

        // ── 9. Tren 5 Tahun Dinamis ──────────────────────────────────────────
        $years = $rpjmdMatrix['years'] ?? $this->opdAnalytics->resolveYears($tahun);
        $rpjmdTrend = $rpjmdMatrix['trend'];

        $firstYr = $years[0] ?? $tahun;
        $ikuTrend = array_map(function ($t) {
            return [
                'tahun' => $t['tahun'],
                'target' => 100.0,
                'realisasi' => $t['capaian'],
            ];
        }, $ikuMatrix['trend'] ?? []);

        $pkoPemdaByYear = $pemdaOrg
            ? PkoEvaluation::where('organization_id', $pemdaOrg->id)->pluck('nko', 'year')
            : collect();

        $pkoTrend = array_map(function ($y) use ($tahun, $nilaiPkoPemda, $pkoPemdaByYear) {
            if ($y > $tahun) {
                return ['tahun' => $y, 'nilai' => null];
            }
            if ($y === $tahun) {
                return ['tahun' => $y, 'nilai' => $nilaiPkoPemda > 0 ? $nilaiPkoPemda : null];
            }
            $val = $pkoPemdaByYear->get($y);

            return [
                'tahun' => $y,
                'nilai' => $val !== null ? (float) $val : null,
            ];
        }, $years);

        // ── 10. Rencana Aksi Triwulan Fisik & Anggaran Dinamis (Baris 5) ─────
        $actionPlansMatrix = $this->opdAnalytics->getActionPlansMatrix($tahun, $activeTriwulan, $filterOpdId);
        $monitoringBudgetMatrix = $this->opdAnalytics->getMonitoringBudgetMatrix($tahun, $activeTriwulan, $filterOpdId);

        $renaksSummary = [
            'tahun' => $tahun,
            'triwulan' => $activeTriwulan,
            'on_track' => (int) ($actionPlansMatrix['summary']['opd_summary']['tercapai'] ?? 0),
            'perlu_perhatian' => (int) ($actionPlansMatrix['summary']['opd_summary']['perlu_perhatian'] ?? 0),
            'terlambat' => (int) ($actionPlansMatrix['summary']['opd_summary']['terlambat'] ?? 0),
            'kritis' => (int) ($actionPlansMatrix['summary']['opd_summary']['kritis'] ?? 0),
            'tidak_dinilai' => (int) ($actionPlansMatrix['summary']['opd_summary']['tidak_dinilai'] ?? 0),
            'rata_capaian' => (float) ($actionPlansMatrix['summary']['opd_summary']['rata_capaian'] ?? 0),
        ];

        $renaksOpd = array_map(fn ($r) => [
            'nama' => $r['opd'],
            'target_tw' => $r['target_tw'] !== null ? (float) $r['target_tw'] : null,
            'realisasi_tw' => $r['realisasi_tw'] !== null ? (float) $r['realisasi_tw'] : null,
            'capaian' => $r['capaian'] !== null ? (float) $r['capaian'] : null,
            'status' => $r['status'] ?? 'Tidak Dinilai',
        ], $actionPlansMatrix['opd_rows'] ?? []);

        // Ringkasan Kinerja Anggaran Triwulan
        $budgetSummary = [
            'tahun' => $tahun,
            'triwulan' => $activeTriwulan,
            'total_pagu' => (float) ($monitoringBudgetMatrix['summary']['total_pagu'] ?? 0),
            'total_realisasi' => (float) ($monitoringBudgetMatrix['summary']['total_realisasi'] ?? 0),
            'serapan_persen' => (float) ($monitoringBudgetMatrix['summary']['serapan_persen'] ?? 0),
            'tercapai' => (int) ($monitoringBudgetMatrix['summary']['opd_summary']['tercapai'] ?? 0),
            'perlu_perhatian' => (int) ($monitoringBudgetMatrix['summary']['opd_summary']['perlu_perhatian'] ?? 0),
            'kritis' => (int) ($monitoringBudgetMatrix['summary']['opd_summary']['kritis'] ?? 0),
            'tidak_dinilai' => (int) ($monitoringBudgetMatrix['summary']['opd_summary']['tidak_dinilai'] ?? 0),
            'rata_serapan' => (float) ($monitoringBudgetMatrix['summary']['opd_summary']['rata_capaian'] ?? 0),
        ];

        $budgetOpd = array_map(fn ($r) => [
            'nama' => $r['opd'],
            'pagu_tw' => (float) ($r['pagu_tw'] ?? 0),
            'realisasi_tw' => (float) ($r['realisasi_tw'] ?? 0),
            'serapan' => $r['serapan'] !== null ? (float) $r['serapan'] : null,
            'status' => $r['status'] ?? 'Tidak Dinilai',
        ], $monitoringBudgetMatrix['opd_rows'] ?? []);

        // ── 11. Daftar Perhatian Pimpinan Dinamis ────────────────────────────
        // Hitung OPD dengan nilai SAKIP di bawah threshold (< 70)
        $opdSakipPenurunan = 0;
        foreach ($allOpd as $opd) {
            $nilaiBaru = $sakipScores[$opd->id]['nilai'] ?? null;
            if ($nilaiBaru !== null && $nilaiBaru < 70) {
                $opdSakipPenurunan++;
            }
        }

        $attentionList = $this->buildAttentionList(
            $docsAvailable,
            $docsRequired,
            $totalOpd - $opdLengkap,
            $opdRankingData,
            $sakipDistribusi,
            $pkoOpdData,
            $rpjmdStatusFinal,
            $opdSakipPenurunan
        );

        // ── 12. Opsi Filter untuk Frontend ──────────────────────────────────
        $availableYears = array_values(array_filter(
            array_unique(array_merge(
                PlanningPeriod::getAvailableYears(),
                $years,
                [$tahun]
            )),
            fn ($y) => $y >= 2000 && $y <= 2100
        ));
        sort($availableYears);

        if (empty($availableYears)) {
            $availableYears = range(2025, 2029);
        }

        $orgFilterQuery = Organization::where('type', 'opd')->orderBy('name');
        if (! $isProvincialAdmin) {
            $orgFilterQuery->whereIn('id', $accessibleOrgIds);
        }

        $filterOptions = [
            'years' => $availableYears,
            'organizations' => $orgFilterQuery->get(['id', 'code', 'name']),
            'sasaran' => StrategicObjective::orderBy('code')->get(['id', 'code', 'name']),
            'triwulan' => ['Semua', 'TW I', 'TW II', 'TW III', 'TW IV'],
            'status' => ['Semua', 'Tercapai', 'Perlu Perhatian', 'Kritis'],
        ];

        return [
            'tahun_evaluasi' => $tahun,
            'triwulan_aktif' => $activeTriwulan,
            'current_filters' => $filters,
            'filter_options' => $filterOptions,

            'kpi' => [
                'kelengkapan_pemda' => [
                    'pct' => $kelengkapanPctPemda,
                    'tersedia' => $docsAvailable,
                    'total' => $docsRequired,
                    'status' => $statusPemda,
                ],
                'opd_sakip_lengkap' => [
                    'lengkap' => $opdLengkap,
                    'total' => $totalOpd,
                    'pct' => $opdLengkapPct,
                ],
                'rata_capaian_rpjmd' => [
                    'pct' => $rataCapaianRpjmd,
                    'status' => ($rpjmdStatusFinal['total'] ?? 0) > 0 ? $this->getStatusCapaian($rataCapaianRpjmd) : 'Tidak Dinilai',
                ],
                'capaian_iku_pemda' => [
                    'pct' => $rataCapaianIku,
                    'status' => ($ikuStatusFinal['total'] ?? 0) > 0 ? $this->getStatusCapaian($rataCapaianIku) : 'Tidak Dinilai',
                ],
                'rata_capaian_opd' => [
                    'pct' => $rataCapaianOpd,
                    'status' => (($opdRankingMatrix['summary']['tercapai'] ?? 0) + ($opdRankingMatrix['summary']['perlu_perhatian'] ?? 0) + ($opdRankingMatrix['summary']['kritis'] ?? 0) > 0) ? $this->getStatusCapaian($rataCapaianOpd) : 'Tidak Dinilai',
                ],
                'nilai_sakip_pemda' => [
                    'nilai' => (float) $sakipPemda['nilai'],
                    'predikat' => $sakipPemda['predikat'],
                ],
                'rata_nilai_sakip_opd' => [
                    'nilai' => $rataNilaiSakipOpd,
                    'predikat' => $predikatSakipOpd,
                ],
                'nilai_pko_pemda' => [
                    'nilai' => $nilaiPkoPemda,
                    'predikat' => $predikatPkoPemda,
                ],
                'rata_nilai_pko_opd' => [
                    'nilai' => $rataRataPkoPemda,
                    'predikat' => $predikatRataRataPkoPemda,
                    'total_opd' => count($pkoOpdData),
                ],
                'rata_rata_pko_pemda' => [
                    'nilai' => $rataRataPkoPemda,
                    'predikat' => $predikatRataRataPkoPemda,
                    'total_opd' => count($pkoOpdData),
                ],
                'opd_kritis' => [
                    'jumlah' => $opdKritis,
                ],
            ],

            'rpjmd_status' => $rpjmdStatusFinal,
            'iku_status' => $ikuStatusFinal,
            'opd_status' => $opdStatusFinal,

            'rpjmd_trend' => $rpjmdTrend,
            'iku_trend' => $ikuTrend,
            'pko_trend' => $pkoTrend,

            'opd_ranking' => array_values($opdRankingData),
            'sakip_distribusi' => $sakipDistribusi,
            'pko_opd' => $pkoOpdData,

            'renaks_summary' => $renaksSummary,
            'renaks_opd' => array_slice($renaksOpd, 0, 5),
            'budget_summary' => $budgetSummary,
            'budget_opd' => array_slice($budgetOpd, 0, 5),
            'attention_list' => $attentionList,
            'pemda_sakip_matrix' => $pemdaMatrix,
            'opd_sakip_matrix' => $opdMatrix,
            'sakip_pemda' => $sakipPemda,
            'sakip_pemda_matrix' => $sakipPemda,
            'rpjmd_matrix' => $rpjmdMatrix,
            'iku_pemda_matrix' => ($ikuPemdaMatrix = $ikuMatrix),
            'opd_ranking_matrix' => $opdRankingMatrix,
            'sakip_eval_matrix' => ($sakipEvalMatrix = $this->opdAnalytics->getSakipEvaluationMatrix($tahun, $filterOpdId)),
            'pko_matrix' => $this->opdAnalytics->getPkoMatrix($tahun, $filterOpdId, $opdRankingMatrix, $sakipEvalMatrix),
            'action_plans_matrix' => $actionPlansMatrix,
            'monitoring_budget_matrix' => $monitoringBudgetMatrix,
            'risk_map_matrix' => $this->ewsAnalytics->getRiskMap($tahun, $opdRankingMatrix, $ikuPemdaMatrix, $actionPlansMatrix, $sakipEvalMatrix, $opdMatrix),

            'summary' => [
                'average_achievement' => $rataCapaianOpd,
                'total_organizations' => $totalOpd,
                'opd_lengkap' => $opdLengkap,
            ],

            'last_updated_at' => now()->setTimezone('Asia/Jayapura')->format('d-m-Y H:i').' WIT',
        ];
    }

    /**
     * Membangun daftar perhatian pimpinan secara dinamis.
     * GAP 3: Item RPJMD & PKO sekarang dinamis.
     * GAP 5: Deteksi OPD dengan nilai SAKIP di bawah threshold.
     */
    private function buildAttentionList(
        int $docsAvailable,
        int $docsRequired,
        int $opdBelumLengkap,
        array $opdRanking,
        array $sakipDistribusi,
        array $pkoOpdData,
        array $rpjmdStatusCount,
        int $opdSakipPenurunan = 0
    ): array {
        $list = [];

        // 1. Dokumen Pemda belum lengkap
        $docsBelum = $docsRequired - $docsAvailable;
        if ($docsBelum > 0) {
            $list[] = [
                'uraian' => "{$docsBelum} dokumen SAKIP Pemerintah Daerah belum tersedia",
                'kategori' => 'Dokumen',
                'jumlah' => $docsBelum,
                'status' => $docsBelum >= 3 ? 'Kritis' : 'Perlu Perhatian',
            ];
        }

        // 2. SAKIP Dokumen OPD belum lengkap
        if ($opdBelumLengkap > 0) {
            $list[] = [
                'uraian' => "{$opdBelumLengkap} OPD belum memiliki dokumen SAKIP lengkap",
                'kategori' => 'SAKIP',
                'jumlah' => $opdBelumLengkap,
                'status' => 'Perlu Perhatian',
            ];
        }

        // 3. Kinerja RPJMD — DINAMIS dari rpjmdStatusCount (GAP 3)
        $rpjmdBelumTercapai = ($rpjmdStatusCount['perlu_perhatian'] ?? 0)
                            + ($rpjmdStatusCount['terlambat'] ?? 0)
                            + ($rpjmdStatusCount['kritis'] ?? 0);
        if ($rpjmdBelumTercapai > 0) {
            $list[] = [
                'uraian' => "{$rpjmdBelumTercapai} indikator RPJMD belum mencapai target",
                'kategori' => 'Kinerja',
                'jumlah' => $rpjmdBelumTercapai,
                'status' => ($rpjmdStatusCount['kritis'] ?? 0) > 0 ? 'Kritis' : 'Perlu Perhatian',
            ];
        }

        // 4. Kinerja OPD Kritis (< 50%)
        $kritisCount = array_sum(array_column($opdRanking, 'kritis'));
        if ($kritisCount > 0) {
            $list[] = [
                'uraian' => "{$kritisCount} indikator kinerja OPD berstatus kritis (< 50%)",
                'kategori' => 'Kinerja',
                'jumlah' => $kritisCount,
                'status' => 'Kritis',
            ];
        }

        // 5. SAKIP Predikat Rendah
        if ($sakipDistribusi['predikat_CC_bawah'] > 0) {
            $list[] = [
                'uraian' => "{$sakipDistribusi['predikat_CC_bawah']} OPD memiliki nilai SAKIP CC atau lebih rendah",
                'kategori' => 'SAKIP',
                'jumlah' => $sakipDistribusi['predikat_CC_bawah'],
                'status' => 'Kritis',
            ];
        }

        // 6. SAKIP nilai di bawah BB — penurunan performa (GAP 5)
        if ($opdSakipPenurunan > 0) {
            $list[] = [
                'uraian' => "{$opdSakipPenurunan} OPD memiliki nilai SAKIP di bawah BB (predikat B, CC, C, atau D)",
                'kategori' => 'SAKIP',
                'jumlah' => $opdSakipPenurunan,
                'status' => 'Perlu Perhatian',
            ];
        }

        // 7. OPD dengan nilai PKO Kurang / Sangat Kurang — DINAMIS (PermenPANRB 22/2024)
        $opdPkoRendah = count(array_filter($pkoOpdData, fn ($o) => $o['nilai_pko'] > 0 && (in_array(strtoupper($o['predikat']), ['KURANG', 'SANGAT KURANG']) || $o['nilai_pko'] < 60)));
        if ($opdPkoRendah > 0) {
            $list[] = [
                'uraian' => "{$opdPkoRendah} OPD memiliki predikat PKO Kurang atau Sangat Kurang",
                'kategori' => 'PKO',
                'jumlah' => $opdPkoRendah,
                'status' => $opdPkoRendah >= 3 ? 'Kritis' : 'Perlu Perhatian',
            ];
        }

        // 8. Alert database
        $dbAlerts = Alert::whereIn('status', ['open', 'acknowledged'])
            ->orderByRaw("CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END")
            ->limit(3)
            ->get();

        foreach ($dbAlerts as $alert) {
            $list[] = [
                'uraian' => $alert->title,
                'kategori' => 'Dokumen',
                'jumlah' => 1,
                'status' => in_array($alert->severity, ['critical', 'high']) ? 'Kritis' : 'Perlu Perhatian',
            ];
        }

        return $list;
    }

    // ── Drilldown ──────────────────────────────────────────────────────────────

    /**
     * FR-DASH-003: Drill-down per organisasi — detail pencapaian semua indikator satu OPD.
     */
    public function drilldown(Request $request, Organization $organization): Response
    {
        $this->authorize('view-dashboard');

        $user = $request->user();
        $organizationIds = $this->authorization->accessibleOrganizationIds($user);

        if (! in_array($organization->id, $organizationIds)) {
            abort(403, 'Tidak memiliki akses ke organisasi ini.');
        }

        $periodId = $request->integer('period_id');
        if ($periodId) {
            $period = MeasurementPeriod::find($periodId);
        } else {
            // Ambil period yang paling terakhir ada data realisasi untuk OPD ini
            $periodIdsWithData = Realization::where('organization_id', $organization->id)
                ->whereIn('status', ['submitted', 'approved'])
                ->pluck('measurement_period_id')
                ->unique()
                ->toArray();

            $period = count($periodIdsWithData) > 0
                ? MeasurementPeriod::whereIn('id', $periodIdsWithData)->orderByDesc('end_date')->first()
                : MeasurementPeriod::orderByDesc('end_date')->first();
        }

        $realizations = Realization::query()
            ->with([
                'indicatorVersion:id,indicator_id,name,direction,measurement_unit_id',
                'indicatorVersion.measurementUnit:id,symbol',
                'indicatorVersion.indicator:id,code,frequency',
                'measurementPeriod:id,code,name',
                'evidences:id,realization_id,status',
            ])
            ->where('organization_id', $organization->id)
            ->when($period, fn ($q) => $q->where('measurement_period_id', $period->id))
            ->whereIn('status', ['submitted', 'approved'])
            ->get();

        $targets = IndicatorTarget::query()
            ->where('organization_id', $organization->id)
            ->whereIn('status', ['submitted', 'approved'])
            ->get()
            ->keyBy(fn ($t) => $t->indicator_version_id.'|'.$t->organization_id);

        $details = $realizations->map(function ($r) use ($targets) {
            $t = $targets->get($r->indicator_version_id.'|'.$r->organization_id);
            $targetVal = $t ? (float) $t->target_value : null;
            $realVal = (float) $r->value;
            $dir = $r->indicatorVersion?->direction ?? 'higher_is_better';

            $pc = null;
            if ($targetVal !== null && $targetVal > 0) {
                $pc = $dir === 'lower_is_better'
                    ? round(($targetVal / $realVal) * 100, 2)
                    : round(($realVal / $targetVal) * 100, 2);
            }

            return [
                'id' => $r->id,
                'indicator_code' => $r->indicatorVersion?->indicator?->code ?? '—',
                'indicator_name' => $r->indicatorVersion?->name ?? '—',
                'unit' => $r->indicatorVersion?->measurementUnit?->symbol ?? '',
                'period' => $r->measurementPeriod?->name ?? '—',
                'target_value' => $t?->target_value,
                'actual_value' => $r->value,
                'achievement_pct' => $pc,
                'status' => $r->status,
                'evidence_count' => $r->evidences?->count() ?? 0,
                'traffic_light' => $pc === null ? 'gray'
                    : ($pc >= 100 ? 'green'
                    : ($pc >= 50 ? 'yellow' : 'red')),
            ];
        })->sortBy('indicator_code')->values();

        return Inertia::render('Dashboard/Drilldown', [
            'organization' => $organization->only('id', 'code', 'name'),
            'period' => $period ? $period->only('id', 'code', 'name') : null,
            'periods' => MeasurementPeriod::orderByDesc('end_date')->get(['id', 'code', 'name']),
            'details' => $details,
            'summary' => [
                'total' => $details->count(),
                'green' => $details->where('traffic_light', 'green')->count(),
                'yellow' => $details->where('traffic_light', 'yellow')->count(),
                'red' => $details->where('traffic_light', 'red')->count(),
                'gray' => $details->where('traffic_light', 'gray')->count(),
                'avg_pct' => $details->whereNotNull('achievement_pct')->avg('achievement_pct'),
            ],
        ]);
    }

    // ── Export PDF & CSV ───────────────────────────────────────────────────────

    /**
     * FR-DASH-011: Export data dashboard ke PDF (langsung) atau CSV.
     * Mendukung filter dashboard utama (tahun_evaluasi, triwulan, organization_id, strategic_objective_id, status_kinerja),
     * serta tipe ekspor: dashboard, sakip_pemda, sakip_opd, rpjmd, drilldown.
     */
    public function export(Request $request): SymfonyResponse
    {
        $this->authorize('view-dashboard');

        $user = $request->user();
        $organizationIds = $this->authorization->accessibleOrganizationIds($user);

        $availableYears = PlanningPeriod::getAvailableYears();
        $startYear = ! empty($availableYears) ? min($availableYears) : 2025;

        $activeYear = PlanningPeriod::where('status', 'active')
            ->whereNotNull('year')
            ->where('year', '>=', 2000)
            ->where('year', '<=', 2100)
            ->orderByDesc('id')
            ->value('year');

        $defaultYear = $activeYear ? (int) $activeYear : ((int) date('Y') >= 2000 ? (int) date('Y') : 2026);

        $rawTahun = $request->get('tahun_evaluasi', $request->get('year'));
        $tahun = null;
        if ($rawTahun !== null && $rawTahun !== '') {
            $val = (int) $rawTahun;
            if ($val >= 1 && $val <= 10) {
                $tahun = $startYear + $val - 1;
            } elseif ($val >= 2000 && $val <= 2100) {
                $tahun = $val;
            }
        }
        if (! $tahun) {
            $tahun = in_array((int) date('Y'), $availableYears, true) ? (int) date('Y') : $defaultYear;
            if ($tahun < 2000 || $tahun > 2100) {
                $tahun = 2026;
            }
        }
        $triwulan = $request->get('triwulan', 'Semua');
        $filterOpdId = $request->filled('organization_id') ? (int) $request->get('organization_id') : null;
        $filterSasaranId = $request->filled('strategic_objective_id') ? (int) $request->get('strategic_objective_id') : null;
        $filterStatus = $request->get('status_kinerja', $request->get('status', 'Semua'));
        $type = $request->get('type', 'dashboard');
        // Auto-detect drilldown jika parameter organization_id dan period_id dikirim
        if ($type === 'dashboard' && $request->filled('organization_id') && ($request->filled('period_id') || $request->has('period_id'))) {
            $type = 'drilldown';
        }
        $format = $request->get('format', 'pdf'); // Default: PDF Langsung
        $generatedAt = now()->translatedFormat('d F Y, H:i');

        // ── 1. Ekspor Format PDF (Default Langsung) ─────────────────────────
        if ($format === 'pdf') {
            if ($type === 'drilldown') {
                $orgId = $request->integer('organization_id');
                $organization = Organization::find($orgId);
                if (! $organization || ! in_array($organization->id, $organizationIds)) {
                    abort(403, 'Tidak memiliki akses ke organisasi ini.');
                }

                $periodId = $request->integer('period_id');
                if ($periodId) {
                    $period = MeasurementPeriod::find($periodId);
                } else {
                    $periodIdsWithData = Realization::where('organization_id', $organization->id)
                        ->whereIn('status', ['submitted', 'approved'])
                        ->pluck('measurement_period_id')
                        ->unique()
                        ->toArray();

                    $period = count($periodIdsWithData) > 0
                        ? MeasurementPeriod::whereIn('id', $periodIdsWithData)->orderByDesc('end_date')->first()
                        : MeasurementPeriod::orderByDesc('end_date')->first();
                }

                $realizations = Realization::query()
                    ->with([
                        'indicatorVersion:id,indicator_id,name,direction,measurement_unit_id',
                        'indicatorVersion.measurementUnit:id,symbol',
                        'indicatorVersion.indicator:id,code,frequency',
                        'measurementPeriod:id,code,name',
                        'evidences:id,realization_id,status',
                    ])
                    ->where('organization_id', $organization->id)
                    ->when($period, fn ($q) => $q->where('measurement_period_id', $period->id))
                    ->whereIn('status', ['submitted', 'approved'])
                    ->get();

                $targets = IndicatorTarget::query()
                    ->where('organization_id', $organization->id)
                    ->whereIn('status', ['submitted', 'approved'])
                    ->get()
                    ->keyBy(fn ($t) => $t->indicator_version_id.'|'.$t->organization_id);

                $details = $realizations->map(function ($r) use ($targets) {
                    $t = $targets->get($r->indicator_version_id.'|'.$r->organization_id);
                    $targetVal = $t ? (float) $t->target_value : null;
                    $realVal = (float) $r->value;
                    $dir = $r->indicatorVersion?->direction ?? 'higher_is_better';

                    $pc = null;
                    if ($targetVal !== null && $targetVal > 0) {
                        $pc = $dir === 'lower_is_better'
                            ? round(($targetVal / $realVal) * 100, 2)
                            : round(($realVal / $targetVal) * 100, 2);
                    }

                    return [
                        'id' => $r->id,
                        'indicator_code' => $r->indicatorVersion?->indicator?->code ?? '—',
                        'indicator_name' => $r->indicatorVersion?->name ?? '—',
                        'unit' => $r->indicatorVersion?->measurementUnit?->symbol ?? '',
                        'period' => $r->measurementPeriod?->name ?? '—',
                        'target_value' => $t?->target_value,
                        'actual_value' => $r->value,
                        'achievement_pct' => $pc,
                        'status' => $r->status,
                        'evidence_count' => $r->evidences?->count() ?? 0,
                        'traffic_light' => $pc === null ? 'gray'
                            : ($pc >= 100 ? 'green'
                            : ($pc >= 50 ? 'yellow' : 'red')),
                    ];
                })->sortBy('indicator_code')->values();

                $summary = [
                    'total' => $details->count(),
                    'green' => $details->where('traffic_light', 'green')->count(),
                    'yellow' => $details->where('traffic_light', 'yellow')->count(),
                    'red' => $details->where('traffic_light', 'red')->count(),
                    'gray' => $details->where('traffic_light', 'gray')->count(),
                    'avg_pct' => $details->whereNotNull('achievement_pct')->avg('achievement_pct'),
                ];

                $periodName = $period ? $period->name : 'Semua Periode';
                $slugOrg = strtolower(preg_replace('/[^a-zA-Z0-9]+/', '-', $organization->code));
                $filename = 'detail-kinerja-'.$slugOrg.'-'.now()->format('YmdHis').'.pdf';

                return Pdf::loadView('pdf.dashboard.drilldown', [
                    'organization' => $organization,
                    'period' => $period,
                    'periodName' => $periodName,
                    'details' => $details,
                    'summary' => $summary,
                    'generatedAt' => $generatedAt,
                ])->setPaper('a4', 'landscape')
                    ->setOptions(['defaultFont' => 'DejaVu Sans', 'isHtml5ParserEnabled' => true, 'isRemoteEnabled' => false])
                    ->download($filename);
            }

            if ($type === 'sakip_pemda') {
                $matrix = $this->sakipDocService->getSakipPemdaMatrix($tahun);
                $filename = 'matriks-sakip-pemda-'.$tahun.'-'.now()->format('YmdHis').'.pdf';

                return Pdf::loadView('pdf.dashboard.sakip-pemda', [
                    'matrix' => $matrix,
                    'year' => $tahun,
                    'generatedAt' => $generatedAt,
                ])->setPaper('a4', 'portrait')
                    ->setOptions(['defaultFont' => 'DejaVu Sans', 'isHtml5ParserEnabled' => true, 'isRemoteEnabled' => false])
                    ->download($filename);
            }

            if ($type === 'sakip_opd') {
                $matrix = $this->sakipDocService->getSakipOpdMatrix($tahun, $filterOpdId, $organizationIds);
                $filename = 'matriks-sakip-opd-'.$tahun.'-'.now()->format('YmdHis').'.pdf';

                return Pdf::loadView('pdf.dashboard.sakip-opd', [
                    'matrix' => $matrix,
                    'year' => $tahun,
                    'generatedAt' => $generatedAt,
                ])->setPaper('a4', 'landscape')
                    ->setOptions(['defaultFont' => 'DejaVu Sans', 'isHtml5ParserEnabled' => true, 'isRemoteEnabled' => false])
                    ->download($filename);
            }

            if ($type === 'rpjmd') {
                abort(404, 'Modul RPJMD telah dinonaktifkan.');
            }

            // Default: Laporan Eksekutif Capaian Kinerja & SAKIP Daerah
            $filters = [
                'tahun_evaluasi' => $tahun,
                'triwulan' => $triwulan,
                'organization_id' => $filterOpdId,
                'strategic_objective_id' => $filterSasaranId,
                'status_kinerja' => $filterStatus,
            ];
            $data = $this->computeDashboardData($filters);
            $data['generatedAt'] = $generatedAt;
            $data['filters'] = $filters;
            $filename = 'laporan-eksekutif-kinerja-'.$tahun.'-'.now()->format('YmdHis').'.pdf';

            return Pdf::loadView('pdf.dashboard.executive', $data)
                ->setPaper('a4', 'landscape')
                ->setOptions(['defaultFont' => 'DejaVu Sans', 'isHtml5ParserEnabled' => true, 'isRemoteEnabled' => false])
                ->download($filename);
        }

        // ── 2. Ekspor Format CSV Fallback (?format=csv) ─────────────────────

        // Tipe 1: Request dari Drilldown OPD spesifik
        if ($request->filled('period_id') && $type === 'drilldown') {
            $periodId = $request->integer('period_id');
            $period = MeasurementPeriod::find($periodId);

            $realizations = Realization::query()
                ->with([
                    'indicatorVersion:id,indicator_id,name,direction',
                    'indicatorVersion.indicator:id,code',
                    'organization:id,code,name',
                    'measurementPeriod:id,code,name',
                ])
                ->whereIn('organization_id', $organizationIds)
                ->when($filterOpdId, fn ($q) => $q->where('organization_id', $filterOpdId))
                ->when($period, fn ($q) => $q->where('measurement_period_id', $period->id))
                ->whereIn('status', ['submitted', 'approved'])
                ->get();

            $targets = IndicatorTarget::query()
                ->whereIn('organization_id', $organizationIds)
                ->where('status', 'approved')
                ->get()
                ->keyBy(fn ($t) => $t->indicator_version_id.'|'.$t->organization_id);

            $filename = 'dashboard-drilldown-'.now()->format('Ymd-His').'.csv';

            return response()->stream(function () use ($realizations, $targets, $period) {
                $out = fopen('php://output', 'w');
                fprintf($out, chr(0xEF).chr(0xBB).chr(0xBF)); // UTF-8 BOM
                fputcsv($out, ['Periode', 'OPD Kode', 'OPD Nama', 'Kode Indikator', 'Nama Indikator', 'Target', 'Realisasi', 'Capaian (%)', 'Status']);

                foreach ($realizations as $r) {
                    $t = $targets->get($r->indicator_version_id.'|'.$r->organization_id);
                    $target = $t ? (float) $t->target_value : null;
                    $real = (float) $r->value;
                    $dir = $r->indicatorVersion?->direction ?? 'higher_is_better';

                    $pc = null;
                    if ($target !== null && $target > 0) {
                        $pc = $dir === 'lower_is_better'
                            ? round(($target / $real) * 100, 2)
                            : round(($real / $target) * 100, 2);
                    }

                    fputcsv($out, [
                        $r->measurementPeriod?->name ?? ($period?->name ?? '—'),
                        $r->organization?->code ?? '—',
                        $r->organization?->name ?? '—',
                        $r->indicatorVersion?->indicator?->code ?? '—',
                        $r->indicatorVersion?->name ?? '—',
                        $target ?? '—',
                        $real,
                        $pc !== null ? number_format($pc, 2) : '—',
                        $r->status,
                    ]);
                }
                fclose($out);
            }, 200, [
                'Content-Type' => 'text/csv; charset=UTF-8',
                'Content-Disposition' => "attachment; filename={$filename}",
            ]);
        }

        // Tipe 2: SAKIP Pemda Matrix (13 Dokumen)
        if ($type === 'sakip_pemda') {
            $pemdaMatrix = $this->sakipDocService->getSakipPemdaMatrix($tahun);
            $filename = 'matriks-sakip-pemda-'.$tahun.'-'.now()->format('Ymd-His').'.csv';

            return response()->stream(function () use ($pemdaMatrix) {
                $out = fopen('php://output', 'w');
                fprintf($out, chr(0xEF).chr(0xBB).chr(0xBF));
                fputcsv($out, ['No', 'Dokumen Pemerintah Daerah', 'Tipe', 'Tahun/Periode', 'Ketersediaan', 'Status', 'Nomor Dokumen', 'Judul Dokumen', 'Tanggal Persetujuan', 'Ada Berkas Fisik']);

                foreach ($pemdaMatrix['rows'] as $row) {
                    fputcsv($out, [
                        $row['no'],
                        $row['name'],
                        $row['type'],
                        $row['period'],
                        $row['is_available'] ? 'Tersedia' : 'Belum Tersedia',
                        $row['status'],
                        $row['document_number'] ?? '-',
                        $row['document_title'] ?? '-',
                        $row['approved_at'] ?? '-',
                        ! empty($row['has_file']) ? 'Ya' : 'Tidak',
                    ]);
                }
                fclose($out);
            }, 200, [
                'Content-Type' => 'text/csv; charset=UTF-8',
                'Content-Disposition' => "attachment; filename={$filename}",
            ]);
        }

        // Tipe 3: SAKIP OPD Matrix (12 Dokumen)
        if ($type === 'sakip_opd') {
            $opdMatrix = $this->sakipDocService->getSakipOpdMatrix($tahun, $filterOpdId, $organizationIds);
            $filename = 'matriks-sakip-opd-'.$tahun.'-'.now()->format('Ymd-His').'.csv';
            $cols = $opdMatrix['columns'] ?? [];

            return response()->stream(function () use ($opdMatrix, $cols) {
                $out = fopen('php://output', 'w');
                fprintf($out, chr(0xEF).chr(0xBB).chr(0xBF));
                $headers = ['No', 'Kode OPD', 'Nama Perangkat Daerah'];
                foreach ($cols as $lbl) {
                    $headers[] = $lbl;
                }
                $headers[] = 'Tersedia';
                $headers[] = 'Total Wajib';
                $headers[] = 'Kelengkapan (%)';
                $headers[] = 'Status';
                fputcsv($out, $headers);

                foreach ($opdMatrix['rows'] as $row) {
                    $line = [
                        $row['no'],
                        $row['organization_code'],
                        $row['organization_name'],
                    ];
                    foreach (array_keys($cols) as $k) {
                        $line[] = ! empty($row['checks'][$k]) ? 'Tersedia' : 'Belum';
                    }
                    $line[] = $row['available_count'];
                    $line[] = $row['total_required'];
                    $line[] = $row['percentage'].'%';
                    $line[] = $row['status'];
                    fputcsv($out, $line);
                }
                fclose($out);
            }, 200, [
                'Content-Type' => 'text/csv; charset=UTF-8',
                'Content-Disposition' => "attachment; filename={$filename}",
            ]);
        }

        // Tipe 4: Matriks RPJMD (Dinonaktifkan)
        if ($type === 'rpjmd') {
            abort(404, 'Modul RPJMD telah dinonaktifkan.');
        }

        // Tipe Default: Dashboard Eksekutif Performance Monitoring
        $rpjmdMatrix = ['rows' => []];
        $filename = 'dashboard-monitoring-kinerja-'.$tahun.'-'.now()->format('Ymd-His').'.csv';

        return response()->stream(function () use ($rpjmdMatrix, $tahun, $triwulan) {
            $out = fopen('php://output', 'w');
            fprintf($out, chr(0xEF).chr(0xBB).chr(0xBF));
            fputcsv($out, [
                'No',
                'Tahun Evaluasi',
                'Triwulan',
                'Tujuan Pemda',
                'Sasaran Strategis RPJMD',
                'Kode Indikator',
                'Nama Indikator Kinerja',
                'Satuan',
                'Pola',
                'Target',
                'Realisasi',
                'Capaian (%)',
                'Status Kinerja',
                'Predikat Kinerja',
                'Perangkat Daerah Pengampu',
            ]);

            foreach ($rpjmdMatrix['rows'] as $row) {
                fputcsv($out, [
                    $row['no'],
                    $tahun,
                    $triwulan,
                    $row['tujuan'],
                    $row['sasaran'],
                    $row['kode'],
                    $row['indikator'],
                    $row['satuan'],
                    $row['polarization'] === 'negatif' ? 'Negatif (Semakin Rendah Semakin Baik)' : 'Positif',
                    $row['target'] !== null ? $row['target'] : '-',
                    $row['realisasi'] !== null ? $row['realisasi'] : '-',
                    $row['capaian'] !== null ? number_format($row['capaian'], 2).'%' : '-',
                    $row['status'],
                    $row['predikat'],
                    $row['opd_pengampu'],
                ]);
            }
            fclose($out);
        }, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename={$filename}",
        ]);
    }

    public function exportCsv(Request $request): SymfonyResponse
    {
        return $this->export($request);
    }
}
