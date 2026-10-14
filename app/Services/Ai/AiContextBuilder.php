<?php

namespace App\Services\Ai;

use App\Models\Alert;
use App\Models\Indicator;
use App\Models\MeasurementPeriod;
use App\Models\Organization;
use App\Models\PerformancePeriod;
use App\Models\PkoEvaluation;
use App\Models\PlanningDocument;
use App\Services\AchievementCalculator;
use App\Services\AuthorizationService;
use App\Services\OpdAnalyticsService;
use App\Services\TrendPredictor;
use Illuminate\Support\Facades\Auth;

/**
 * Membangun konteks data objektif dan faktual untuk modul AI e-SAKIP (AIG-007, AIG-008).
 * Menghubungkan seluruh data website: IKU OPD, Kinerja OPD, Rencana Aksi,
 * Anggaran, Dokumen SAKIP, Evaluasi PKO, dan Prediksi Kinerja tanpa emoji.
 */
class AiContextBuilder
{
    public function __construct(
        private readonly AuthorizationService $authorization,
        private readonly AchievementCalculator $calculator,
        private readonly OpdAnalyticsService $opdAnalytics,
        private readonly TrendPredictor $predictor,
    ) {}

    /**
     * Resolusi periode evaluasi (tahun & triwulan) dari periodId atau default tahun berjalan.
     *
     * @return array{0: int, 1: string} [year, triwulan]
     */
    public function resolvePeriod(?int $periodId = null, ?int $year = null, ?string $triwulan = null): array
    {
        if ($periodId) {
            $mp = MeasurementPeriod::find($periodId);
            if ($mp) {
                if ($mp->start_date) {
                    $year = (int) date('Y', strtotime((string) $mp->start_date));
                } elseif (preg_match('/20\d{2}/', $mp->code, $m)) {
                    $year = (int) $m[0];
                }

                $combined = $mp->name.' '.$mp->code;
                if (preg_match('/(?:Triwulan|TW)\s*([1-4]|I{1,3}|IV)/i', $combined, $m)) {
                    $twMap = [
                        '1' => 'TW I', '2' => 'TW II', '3' => 'TW III', '4' => 'TW IV',
                        'I' => 'TW I', 'II' => 'TW II', 'III' => 'TW III', 'IV' => 'TW IV',
                    ];
                    $triwulan = $twMap[strtoupper($m[1])] ?? 'TW II';
                }
            }
        }

        if (! $year) {
            $year = (int) (
                PerformancePeriod::where('status', 'open')->latest('year')->value('year')
                ?? MeasurementPeriod::where('code', 'like', '%2026%')->value('id') ? 2026 : null
                ?? date('Y')
            );
        }

        if (! $triwulan || $triwulan === 'Semua') {
            $triwulan = 'TW II';
        }

        return [$year, $triwulan];
    }

    /**
     * Mengumpulkan ringkasan data faktual terlengkap dari seluruh modul website.
     *
     * @return array<string, mixed>
     */
    public function getWebsiteFactualData(?int $orgId = null, ?int $year = null, ?string $triwulan = null, ?int $periodId = null): array
    {
        [$activeYear, $activeTw] = $this->resolvePeriod($periodId, $year, $triwulan);

        $user = Auth::user() ?? request()?->user();
        $isOpdWide = $user && ($user->isSuperAdmin() || $user->isOpdAdmin() || $user->hasRole('Kepala OPD'));
        $accessibleIds = $user ? $this->authorization->accessibleOrganizationIds($user) : [];

        if ($orgId && in_array($orgId, $accessibleIds)) {
            $scopedOrgIds = [$orgId];
            $scopedOrg = Organization::find($orgId);
            $scopeLabel = $scopedOrg?->name ?? 'Unit Kerja Terpilih';
        } else {
            $scopedOrgIds = $isOpdWide ? Organization::whereIn('type', ['opd', 'sekretariat', 'bidang'])->pluck('id')->all() : $accessibleIds;
            $scopeLabel = $isOpdWide
                ? 'Perangkat Daerah (OPD Induk, Sekretariat, dan Bidang)'
                : ($user?->unitOrganization()?->name ?? $user?->organization?->name ?? 'Unit Kerja Terotorisasi');
        }

        // 1. Master Organisasi / OPD, Sekretariat, Bidang
        $allOpds = Organization::whereIn('type', ['opd', 'sekretariat', 'bidang'])
            ->where('is_active', true)
            ->when(! $isOpdWide, fn ($q) => $q->whereIn('id', $scopedOrgIds))
            ->orderByRaw("CASE type WHEN 'opd' THEN 1 WHEN 'sekretariat' THEN 2 WHEN 'bidang' THEN 3 ELSE 4 END")
            ->orderBy('name')
            ->get(['id', 'code', 'name', 'short_name', 'type']);

        $totalOpd = $allOpds->count();
        $opdNames = $allOpds->pluck('name')->all();

        // 2. IKU OPD & Unit (Indikator Kinerja Utama)
        $indicators = Indicator::query()
            ->iku()
            ->when(! $isOpdWide, fn ($q) => $q->whereIn('owner_organization_id', $scopedOrgIds))
            ->get();

        $ikuCount = $indicators->count();
        $ikuSummary = [
            'total_indikator' => $ikuCount,
            'items' => $indicators->map(fn ($i) => [
                'indikator' => $i->name ?? '-',
                'satuan' => '-',
                'pola' => $i->polarization ?? 'Positif',
                'target' => null,
                'realisasi' => null,
            ])->all(),
        ];

        // 3. Rencana Aksi Triwulan Fisik (Menu 4.4)
        $actionPlansMatrix = $this->opdAnalytics->getActionPlansMatrix($activeYear, $activeTw, $orgId);
        $renaksSummary = [
            'tahun' => $activeYear,
            'triwulan' => $activeTw,
            'total_kegiatan' => (int) ($actionPlansMatrix['summary']['total_items'] ?? 0),
            'on_track' => (int) ($actionPlansMatrix['summary']['opd_summary']['tercapai'] ?? 0),
            'perlu_perhatian' => (int) ($actionPlansMatrix['summary']['opd_summary']['perlu_perhatian'] ?? 0),
            'terlambat' => (int) ($actionPlansMatrix['summary']['opd_summary']['terlambat'] ?? 0),
            'kritis' => (int) ($actionPlansMatrix['summary']['opd_summary']['kritis'] ?? 0),
            'tidak_dinilai' => (int) ($actionPlansMatrix['summary']['opd_summary']['tidak_dinilai'] ?? 0),
            'rata_capaian' => (float) ($actionPlansMatrix['summary']['opd_summary']['rata_capaian'] ?? 0),
        ];

        // 4. Monitoring Anggaran Triwulan (Menu 4.5)
        $monitoringBudgetMatrix = $this->opdAnalytics->getMonitoringBudgetMatrix($activeYear, $activeTw, $orgId);
        $budgetSummary = [
            'tahun' => $activeYear,
            'triwulan' => $activeTw,
            'total_pagu' => (float) ($monitoringBudgetMatrix['summary']['total_pagu'] ?? 0),
            'total_realisasi' => (float) ($monitoringBudgetMatrix['summary']['total_realisasi'] ?? 0),
            'serapan_persen' => (float) ($monitoringBudgetMatrix['summary']['serapan_persen'] ?? 0),
            'tercapai' => (int) ($monitoringBudgetMatrix['summary']['opd_summary']['tercapai'] ?? 0),
            'perlu_perhatian' => (int) ($monitoringBudgetMatrix['summary']['opd_summary']['perlu_perhatian'] ?? 0),
            'kritis' => (int) ($monitoringBudgetMatrix['summary']['opd_summary']['kritis'] ?? 0),
            'tidak_dinilai' => (int) ($monitoringBudgetMatrix['summary']['opd_summary']['tidak_dinilai'] ?? 0),
        ];

        // 5. Dokumen Perencanaan SAKIP
        $docsQuery = PlanningDocument::query()
            ->when(! $isOpdWide, fn ($q) => $q->whereIn('organization_id', $scopedOrgIds));

        $totalDocs = $docsQuery->count();
        $availableDocs = (clone $docsQuery)->whereNotNull('file_path')->count();
        $approvedDocs = (clone $docsQuery)->where('status', 'approved')->count();

        // 6. Evaluasi SAKIP & PKO PermenPANRB 22/2024
        $pkoEvaluations = PkoEvaluation::where('year', $activeYear)
            ->when(! $isOpdWide, fn ($q) => $q->whereIn('organization_id', $scopedOrgIds))
            ->get();

        $avgPko = $pkoEvaluations->isNotEmpty() ? round($pkoEvaluations->avg('final_score'), 2) : 0.0;

        // 7. Early Warning System (Alerts)
        $alertQuery = Alert::query()
            ->when(! $isOpdWide, fn ($q) => $q->whereIn('organization_id', $scopedOrgIds))
            ->whereIn('status', ['open', 'in_progress']);
        $openAlerts = $alertQuery->count();

        // 8. Capaian Indikator Faktual (Problematic & Critical Indicators)
        $problematicIndicators = [];
        $indicators = Indicator::with(['targets', 'realizations', 'ownerOrganization'])
            ->where('status', 'active')
            ->when(! $isOpdWide, fn ($q) => $q->whereIn('owner_organization_id', $scopedOrgIds))
            ->get();

        $allAchievements = [];
        foreach ($indicators as $ind) {
            $tgt = $ind->targets->firstWhere('year', $activeYear)?->target_value ?? $ind->targets->first()?->target_value;
            $real = $ind->realizations->first()?->value;
            if ($tgt && $tgt > 0 && $real !== null) {
                $ach = round(($real / $tgt) * 100, 2);
                $allAchievements[] = $ach;
                if ($ach < 70) {
                    $problematicIndicators[] = [
                        'indicator_id' => $ind->id,
                        'indicator_code' => $ind->code,
                        'indicator' => $ind->name,
                        'organization' => $ind->ownerOrganization?->name ?? 'OPD',
                        'achievement' => $ach,
                        'status' => $ach < 60 ? 'Kritis' : 'Perlu Perhatian',
                    ];
                }
            }
        }
        $avgAch = count($allAchievements) > 0 ? round(array_sum($allAchievements) / count($allAchievements), 2) : (float) ($renaksSummary['rata_capaian'] ?? 0);

        return [
            'scope' => $scopeLabel,
            'year' => $activeYear,
            'triwulan' => $activeTw,
            'total_opd' => $totalOpd,
            'opd_list' => $opdNames,
            'opd_rows' => $allOpds->map(fn ($o) => ['id' => $o->id, 'kode' => $o->code, 'nama' => $o->name])->all(),
            'iku_summary' => $ikuSummary,
            'renaks_summary' => $renaksSummary,
            'renaks_opd_rows' => $actionPlansMatrix['opd_rows'] ?? [],
            'budget_summary' => $budgetSummary,
            'budget_opd_rows' => $monitoringBudgetMatrix['opd_rows'] ?? [],
            'total_docs' => $totalDocs,
            'available_docs' => $availableDocs,
            'approved_docs' => $approvedDocs,
            'avg_pko' => $avgPko,
            'open_alerts' => $openAlerts,
            'problematic_indicators' => $problematicIndicators,
            'average_achievement' => $avgAch,
            'generated_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Konteks untuk Fitur 1: Executive Summary.
     *
     * @return array<string, mixed>
     */
    public function executiveSummary(?int $periodId = null, ?int $orgId = null): array
    {
        $fact = $this->getWebsiteFactualData($orgId, null, null, $periodId);

        $problems = [];
        $kritisOpds = [];
        $perhatianOpds = [];

        // Analisis butir perhatian dari rencana aksi fisik kritis
        foreach ($fact['renaks_opd_rows'] as $row) {
            $cap = isset($row['capaian']) ? (float) $row['capaian'] : 0.0;
            $opdName = $row['opd'] ?? 'OPD';
            if (isset($row['status']) && in_array($row['status'], ['Kritis', 'Terlambat'])) {
                $kritisOpds[] = "{$opdName} (Fisik: {$cap}%)";
                $problems[] = sprintf('Target Fisik %s: Capaian %s%% (Status: %s)', $opdName, number_format($cap, 1), $row['status']);
            } elseif (isset($row['status']) && $row['status'] === 'Perlu Perhatian') {
                $perhatianOpds[] = "{$opdName} (Fisik: {$cap}%)";
            }
        }

        // Analisis butir perhatian dari serapan anggaran (fokus pada kritis atau serapan < 70%)
        foreach ($fact['budget_opd_rows'] as $brow) {
            $serapan = isset($brow['serapan']) ? (float) $brow['serapan'] : 0.0;
            $pagu = isset($brow['pagu_tw']) ? (float) $brow['pagu_tw'] : 0.0;
            $opdName = $brow['opd'] ?? 'OPD';

            if (isset($brow['status']) && $brow['status'] === 'Kritis') {
                $kritisOpds[] = "{$opdName} (Anggaran: {$serapan}%)";
                $problems[] = sprintf('Serapan Anggaran %s: Realisasi %s%% dari pagu Rp %s (Status: Kritis)', $opdName, number_format($serapan, 1), number_format($pagu, 0, ',', '.'));
            } elseif ($serapan < 70.0 && $pagu > 0) {
                $perhatianOpds[] = "{$opdName} (Anggaran: {$serapan}%)";
                $problems[] = sprintf('Serapan Anggaran %s: Realisasi %s%% dari pagu Rp %s (Status: Perlu Perhatian)', $opdName, number_format($serapan, 1), number_format($pagu, 0, ',', '.'));
            }
        }

        // Indikator kritis/bermasalah
        foreach ($fact['problematic_indicators'] ?? [] as $pInd) {
            $problems[] = sprintf(
                'Indikator %s [%s] (%s): Capaian %s%% (Status: %s)',
                $pInd['indicator'] ?? 'Indikator',
                $pInd['indicator_code'] ?? '-',
                $pInd['organization'] ?? 'OPD',
                number_format((float) ($pInd['achievement'] ?? 0), 1),
                $pInd['status'] ?? 'Kritis'
            );
        }

        $kritisOpds = array_unique($kritisOpds);
        $perhatianOpds = array_unique($perhatianOpds);

        $opdKritisStr = ! empty($kritisOpds) ? implode(', ', $kritisOpds) : 'Tidak ada OPD berkinerja kritis';
        $opdPerhatianStr = ! empty($perhatianOpds) ? implode(', ', array_slice($perhatianOpds, 0, 5)) : 'Seluruh OPD terpantau stabil';

        if (empty($problems)) {
            $problems[] = 'Tidak terdeteksi anomali kritis pada periode ini. Seluruh kegiatan terpantau sesuai jadwal pelaporan.';
        }

        return [
            'scope' => $fact['scope'],
            'period' => "Tahun Anggaran {$fact['year']} - {$fact['triwulan']}",
            'year' => $fact['year'],
            'triwulan' => $fact['triwulan'],
            'total_opd' => $fact['total_opd'],
            'opd_list' => $fact['opd_list'],
            'data_empty' => ($fact['total_opd'] === 0),
            'realization_count' => $fact['renaks_summary']['total_kegiatan'],
            'average_achievement' => $fact['renaks_summary']['rata_capaian'],
            'good_count' => $fact['renaks_summary']['on_track'],
            'warning_count' => $fact['renaks_summary']['perlu_perhatian'],
            'critical_count' => $fact['renaks_summary']['kritis'],
            'opd_kritis' => $opdKritisStr,
            'opd_perhatian' => $opdPerhatianStr,
            'problems' => $problems,
            'open_alerts' => $fact['open_alerts'],
            'serapan_anggaran' => $fact['budget_summary']['serapan_persen'],
            'total_pagu' => number_format($fact['budget_summary']['total_pagu'], 0, ',', '.'),
            'total_realisasi' => number_format($fact['budget_summary']['total_realisasi'], 0, ',', '.'),
            'total_docs' => $fact['total_docs'],
            'available_docs' => $fact['available_docs'],
            'approved_docs' => $fact['approved_docs'],
            'catatan_kendala' => [],
            'generated_at' => $fact['generated_at'],
        ];
    }

    /**
     * Konteks untuk Fitur 2: Analisis Insight Kinerja.
     *
     * @return array<string, mixed>
     */
    public function insightContext(?int $indicatorId = null, ?int $orgId = null, ?int $periodId = null): array
    {
        $fact = $this->getWebsiteFactualData($orgId, null, null, $periodId);

        $insights = [];
        $insights[] = "Cakupan Evaluasi: {$fact['scope']} ({$fact['year']} - {$fact['triwulan']}).";
        $insights[] = "Total Perangkat Daerah terdata aktif sebanyak {$fact['total_opd']} OPD.";
        $insights[] = "Rencana Aksi Fisik: {$fact['renaks_summary']['on_track']} OPD On Track, {$fact['renaks_summary']['perlu_perhatian']} Perlu Perhatian, {$fact['renaks_summary']['kritis']} Kritis.";
        $insights[] = "Serapan Anggaran APBD: Tercatat {$fact['budget_summary']['serapan_persen']}% dari pagu Rp ".number_format($fact['budget_summary']['total_pagu'], 0, ',', '.').' (Realisasi: Rp '.number_format($fact['budget_summary']['total_realisasi'], 0, ',', '.').').';
        $insights[] = "Kelengkapan Dokumen SAKIP: {$fact['available_docs']} dari {$fact['total_docs']} dokumen telah diunggah resmi.";

        foreach (array_slice($fact['problematic_indicators'] ?? [], 0, 3) as $pInd) {
            $insights[] = "Deviasi Indikator: {$pInd['indicator']} [{$pInd['indicator_code']}] ({$pInd['organization']}) capaian tercatat {$pInd['achievement']}%.";
        }

        return [
            'scope' => $fact['scope'],
            'period' => "Tahun Anggaran {$fact['year']} - {$fact['triwulan']}",
            'year' => $fact['year'],
            'triwulan' => $fact['triwulan'],
            'indicator' => 'Seluruh Indikator Kinerja SAKIP',
            'indicator_code' => 'SAKIP-PAPBAR',
            'insights' => $insights,
            'facts' => $insights,
            'serapan_anggaran' => $fact['budget_summary']['serapan_persen'],
            'total_pagu' => number_format($fact['budget_summary']['total_pagu'], 0, ',', '.'),
            'total_realisasi' => number_format($fact['budget_summary']['total_realisasi'], 0, ',', '.'),
            'rata_fisik' => $fact['renaks_summary']['rata_capaian'],
            'achievements' => [$fact['renaks_summary']['rata_capaian'], $fact['budget_summary']['serapan_persen']],
            'generated_at' => $fact['generated_at'],
        ];
    }

    /**
     * Konteks untuk Fitur 3: Prediksi Capaian Akhir Tahun (AI Prediction).
     *
     * @return array<string, mixed>
     */
    public function predictionContext(?int $indicatorId = null, ?int $orgId = null, ?int $periodId = null): array
    {
        $fact = $this->getWebsiteFactualData($orgId, null, null, $periodId);

        $predResult = null;
        if ($indicatorId) {
            $predResult = $this->predictor->predict($indicatorId, $orgId, 2);
        } else {
            $firstInd = Indicator::where('status', 'active')->first();
            if ($firstInd) {
                $predResult = $this->predictor->predict($firstInd->id, $orgId, 2);
            }
        }

        $serapanSekarang = $fact['budget_summary']['serapan_persen'];
        $proyeksiSerapan = min(100.0, round($serapanSekarang * 1.85, 2));

        $tertinggal = [];
        foreach ($fact['budget_opd_rows'] as $b) {
            if (isset($b['serapan']) && $b['serapan'] < 70.0) {
                $tertinggal[] = sprintf('%s (Serapan: %s%%)', $b['opd'] ?? 'OPD', number_format((float) $b['serapan'], 1));
            }
        }
        $opdTertinggalStr = ! empty($tertinggal) ? implode(', ', $tertinggal) : 'Seluruh OPD memiliki serapan di atas 70%';

        return [
            'scope' => $fact['scope'],
            'period' => "Tahun Anggaran {$fact['year']} - {$fact['triwulan']}",
            'year' => $fact['year'],
            'triwulan' => $fact['triwulan'],
            'current_serapan' => $serapanSekarang,
            'projected_serapan' => $proyeksiSerapan,
            'prediction_data' => $predResult,
            'probabilitas_sukses' => $serapanSekarang >= 75 ? 'Tinggi' : ($serapanSekarang >= 50 ? 'Sedang' : 'Rendah'),
            'opd_tertinggal' => $opdTertinggalStr,
            'rekomendasi_akselerasi' => $serapanSekarang < 50
                ? 'Lakukan percepatan pelaksanaan belanja barang/jasa dan pengadaan program prioritas daerah.'
                : 'Pertahankan ritme penyerapan anggaran belanja operasional dan percepat pertanggungjawaban kas.',
            'generated_at' => $fact['generated_at'],
        ];
    }

    /**
     * Konteks untuk Fitur 4: Rekomendasi Tindak Lanjut.
     *
     * @return array<string, mixed>
     */
    public function recommendationContext(?int $orgId = null, ?int $periodId = null): array
    {
        $fact = $this->getWebsiteFactualData($orgId, null, null, $periodId);

        $problems = [];
        foreach ($fact['renaks_opd_rows'] as $row) {
            if (isset($row['status']) && in_array($row['status'], ['Kritis', 'Terlambat'])) {
                $problems[] = sprintf('Fisik Kritis: %s (Capaian %s%%)', $row['opd'] ?? 'OPD', number_format((float) ($row['capaian'] ?? 0), 1));
            }
        }
        foreach ($fact['budget_opd_rows'] as $brow) {
            $s = (float) ($brow['serapan'] ?? 0);
            if ($s < 70.0) {
                $problems[] = sprintf('Serapan Rendah: %s (Realisasi %s%%)', $brow['opd'] ?? 'OPD', number_format($s, 1));
            }
        }
        foreach ($fact['problematic_indicators'] ?? [] as $pInd) {
            $problems[] = sprintf('Indikator Deviasi: %s [%s] (%s%%)', $pInd['indicator'] ?? '-', $pInd['organization'] ?? '-', $pInd['achievement'] ?? 0);
        }

        if (empty($problems)) {
            $problems[] = 'Seluruh indikator dan rencana aksi berjalan sesuai target triwulan.';
        }

        return [
            'scope' => $fact['scope'],
            'period' => "Tahun Anggaran {$fact['year']} - {$fact['triwulan']}",
            'serapan_anggaran' => $fact['budget_summary']['serapan_persen'],
            'total_pagu' => number_format($fact['budget_summary']['total_pagu'], 0, ',', '.'),
            'total_realisasi' => number_format($fact['budget_summary']['total_realisasi'], 0, ',', '.'),
            'good_count' => $fact['renaks_summary']['on_track'],
            'warning_count' => $fact['renaks_summary']['perlu_perhatian'],
            'critical_count' => $fact['renaks_summary']['kritis'],
            'available_docs' => $fact['available_docs'],
            'total_docs' => $fact['total_docs'],
            'problems' => $problems,
            'generated_at' => $fact['generated_at'],
        ];
    }

    /**
     * Konteks untuk Fitur 5: Status Kinerja per Unit (OPD Induk / Sekretariat / Bidang).
     *
     * @return array<string, mixed>
     */
    public function unitStatusContext(?int $orgId = null, ?int $periodId = null): array
    {
        $fact = $this->getWebsiteFactualData($orgId, null, null, $periodId);

        $renaksMap = collect($fact['renaks_opd_rows'])->keyBy('organization_id');
        $budgetMap = collect($fact['budget_opd_rows'])->keyBy('organization_id');

        $tableLines = [];
        $tableLines[] = '| No | Unit Kerja | Tipe | Capaian Fisik | Serapan Anggaran | Status Evaluasi |';
        $tableLines[] = '|:---|:-----------|:-----|:--------------|:-----------------|:----------------|';

        $idx = 1;
        foreach ($fact['opd_rows'] as $opd) {
            $rRow = $renaksMap->get($opd['id']);
            $bRow = $budgetMap->get($opd['id']);

            $fisikStr = $rRow && isset($rRow['capaian']) ? number_format((float) $rRow['capaian'], 1).'% ('.($rRow['status'] ?? '-').')' : 'Belum Terdata';
            $budgetStr = $bRow && isset($bRow['serapan']) ? number_format((float) $bRow['serapan'], 1).'% ('.($bRow['status'] ?? '-').')' : 'Belum Terdata';

            $evalStatus = 'On Track';
            if (($rRow['status'] ?? '') === 'Kritis' || ($bRow['status'] ?? '') === 'Kritis') {
                $evalStatus = 'Kritis';
            } elseif (($rRow['status'] ?? '') === 'Perlu Perhatian' || (isset($bRow['serapan']) && $bRow['serapan'] < 70.0)) {
                $evalStatus = 'Perlu Perhatian';
            }

            $typeLabel = match ($opd['type'] ?? '') {
                'opd' => 'OPD Induk',
                'sekretariat' => 'Sekretariat',
                'bidang' => 'Bidang',
                default => 'Unit Kerja',
            };

            $tableLines[] = sprintf('| %d | %s | %s | %s | %s | %s |', $idx++, $opd['nama'], $typeLabel, $fisikStr, $budgetStr, $evalStatus);
        }

        return [
            'scope' => $fact['scope'],
            'period' => "Tahun Anggaran {$fact['year']} - {$fact['triwulan']}",
            'year' => $fact['year'],
            'triwulan' => $fact['triwulan'],
            'matrix' => implode("\n", $tableLines),
            'total_opd' => $fact['total_opd'],
            'generated_at' => $fact['generated_at'],
        ];
    }

    /**
     * Alias backward-compatibility untuk opdStatusContext.
     */
    public function opdStatusContext(?int $orgId = null, ?int $periodId = null): array
    {
        return $this->unitStatusContext($orgId, $periodId);
    }

    /**
     * Membangun konteks percakapan untuk AI Chatbot dengan dukungan pencarian semantik (AIG-008).
     *
     * @param  array<int, array{role: string, content: string}>|null  $history
     * @return array<string, mixed>
     */
    public function chatContext(string $message, ?array $history = null): array
    {
        $user = Auth::user() ?? request()?->user();
        if (! $user) {
            return [
                'scope' => 'Tamu',
                'catatan' => 'Sesi tidak terotentikasi.',
                'facts' => ['Pengguna tidak terotentikasi.'],
                'answer' => 'Sesi pengguna tidak valid.',
            ];
        }

        $norm = strtolower($message);

        // Deteksi target unit kerja spesifik dari teks
        $targetOrgId = null;
        $allOrgs = Organization::whereIn('type', ['opd', 'sekretariat', 'bidang'])->get(['id', 'name', 'code', 'short_name']);
        foreach ($allOrgs as $org) {
            $nameNorm = strtolower($org->name);
            $codeNorm = strtolower($org->code);
            $shortNorm = strtolower($org->short_name ?? '');
            if (str_contains($norm, $nameNorm) || str_contains($norm, $codeNorm) || ($shortNorm && str_contains($norm, $shortNorm))) {
                $targetOrgId = $org->id;
                break;
            }
        }

        $fact = $this->getWebsiteFactualData($targetOrgId);

        $facts = [];
        $facts[] = '[LINGKUP HAK AKSES]: '.$fact['scope'];
        $facts[] = '[PERIODE EVALUASI]: Tahun '.$fact['year'].' - '.$fact['triwulan'];
        $facts[] = '[DAFTAR UNIT KERJA]: Terdaftar '.$fact['total_opd'].' unit kerja (OPD Induk, Sekretariat, dan Bidang) aktif, antara lain: '.implode(', ', array_slice($fact['opd_list'], 0, 8)).(count($fact['opd_list']) > 8 ? ', dan lainnya.' : '.');
        $facts[] = '[INDIKATOR KINERJA UTAMA (IKU OPD & UNIT)]: Tercatat '.$fact['iku_summary']['total_indikator'].' Indikator Kinerja Utama OPD dan Unit Kerja.';
        $facts[] = '[RENCANA AKSI FISIK]: Total '.$fact['renaks_summary']['total_kegiatan'].' kegiatan rencana aksi terdata. Status: '.$fact['renaks_summary']['on_track'].' On Track, '.$fact['renaks_summary']['perlu_perhatian'].' Perlu Perhatian, '.$fact['renaks_summary']['kritis'].' Kritis, dan '.$fact['renaks_summary']['tidak_dinilai'].' Tidak Dinilai.';
        $facts[] = '[REALISASI ANGGARAN]: Serapan APBD saat ini tercatat '.$fact['budget_summary']['serapan_persen'].'% dengan total pagu Rp '.number_format($fact['budget_summary']['total_pagu'], 0, ',', '.').' dan total realisasi Rp '.number_format($fact['budget_summary']['total_realisasi'], 0, ',', '.').'.';
        $facts[] = '[DOKUMEN SAKIP]: Sebanyak '.$fact['available_docs'].' dari '.$fact['total_docs'].' dokumen telah memiliki berkas fisik PDF terunggah pada modul Perencanaan Kinerja.';
        $facts[] = '[EARLY WARNING SYSTEM]: Terdapat '.$fact['open_alerts'].' peringatan aktif.';

        $criticalIndicators = [];
        foreach (($fact['problematic_indicators'] ?? []) as $prob) {
            $codeStr = ! empty($prob['indicator_code']) ? " [{$prob['indicator_code']}]" : '';
            $criticalIndicators[] = ($prob['indicator'] ?? 'Indikator').$codeStr.' ('.($prob['organization'] ?? '-').')';
        }
        $criticalList = ! empty($criticalIndicators) ? implode(', ', $criticalIndicators) : 'Tidak ada indikator kritis';

        return [
            'scope' => $fact['scope'],
            'user_name' => $user->name,
            'year' => $fact['year'],
            'triwulan' => $fact['triwulan'],
            'total_opd' => $fact['total_opd'],
            'opd_list' => $fact['opd_list'],
            'critical_list' => $criticalList,
            'average_achievement' => $fact['average_achievement'] ?? 0,
            'facts' => $facts,
            'answer' => implode("\n\n", $facts),
            'factual_data' => $fact,
            'history' => $history ?? [],
            'generated_at' => $fact['generated_at'],
        ];
    }
}
