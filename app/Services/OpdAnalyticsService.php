<?php

namespace App\Services;

use App\Models\Evaluation;
use App\Models\MonitoringActionPlanOutput;
use App\Models\EvaluationScore;
use App\Models\Indicator;
use App\Models\IndicatorTarget;
use App\Models\MeasurementPeriod;
use App\Models\MonitoringActionPlanBudget;
use App\Models\Organization;
use App\Models\PkoEvaluation;
use App\Models\PlanningPeriod;
use App\Models\PlanningTree;
use App\Models\Realization;
use App\Models\IkuRealization;
use App\Models\RealizationIkuItem;
use App\Models\RealizationOpdItem;
use App\Models\StrategicObjective;
use App\Services\PerformanceMeasurementService;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

class OpdAnalyticsService
{
    /**
     * Hitung capaian persentase dengan penanganan polaritas positif dan negatif.
     */
    public function calculateCapaian(?float $realization, ?float $target, string $polarization = 'positif'): ?float
    {
        if ($realization === null || $target === null) {
            return null;
        }

        if ($target == 0.0 && $realization == 0.0) {
            return null; // Kriteria: Target = 0 dan Realisasi = 0 -> Tidak Dinilai
        }

        if ($target == 0.0) {
            return 0.0;
        }

        $pol = strtolower(trim($polarization));
        $isNegative = in_array($pol, ['negatif', 'negative', 'lower_is_better', 'semakin rendah semakin baik', 'turun']);

        if ($isNegative) {
            // Formula polaritas negatif (semakin rendah semakin baik): (2 - (Realisasi / Target)) * 100%
            return round((2 - ($realization / $target)) * 100.0, 2);
        }

        return round(($realization / $target) * 100.0, 2);
    }

    /**
     * Resolusi siklus 5 tahunan evaluasi secara dinamis (mis. 2026 s/d 2030)
     * dan otomatis bertambah jika tahun evaluasi bergerak maju.
     */
    public function resolveYears(int $year = 2026): array
    {
        $rpjmd = PlanningPeriod::where('status', 'active')
            ->where(function ($q) {
                $q->where('type', 'rpjmd')
                  ->orWhere('name', 'like', '%RPJMD%')
                  ->orWhere('code', 'like', '%RPJMD%');
            })
            ->orderByDesc('id')
            ->first()
            ?? PlanningPeriod::where(function ($q) {
                $q->where('type', 'rpjmd')
                  ->orWhere('name', 'like', '%RPJMD%')
                  ->orWhere('code', 'like', '%RPJMD%');
            })
            ->orderByDesc('id')
            ->first();

        if ($rpjmd && $rpjmd->start_date && $rpjmd->end_date) {
            $s = (int) date('Y', strtotime((string) $rpjmd->start_date));
            $e = (int) date('Y', strtotime((string) $rpjmd->end_date));
            $start = ($s >= 2000 && $s <= 2100) ? $s : 2025;
            $end = ($e >= $start && $e <= 2100) ? $e : $start + 4;
        } elseif ($rpjmd && $rpjmd->start_year && $rpjmd->end_year) {
            $s = (int) $rpjmd->start_year;
            $e = (int) $rpjmd->end_year;
            $start = ($s >= 2000 && $s <= 2100) ? $s : 2025;
            $end = ($e >= $start && $e <= 2100) ? $e : $start + 4;
        } else {
            $available = PlanningPeriod::getAvailableYears();
            if (!empty($available)) {
                $start = min($available);
                $end = max($available);
            } else {
                $start = 2025;
                $end = 2029;
            }
        }

        if ($start < 2000) {
            $start = 2025;
        }
        if ($end < $start || $end > 2100) {
            $end = $start + 4;
        }

        // Petakan indeks relatif (1..10) ke tahun kalender RPJMD (misal 1 -> 2025, 2 -> 2026)
        if ($year >= 1 && $year <= 10) {
            $year = $start + $year - 1;
        } elseif ($year < 2000 || $year > 2100) {
            $year = (int) date('Y');
            if ($year < 2000 || $year > 2100) {
                $year = $start;
            }
        }

        if ($year >= 2000 && $year <= 2100) {
            if ($year < $start) {
                $start = $year;
            }
            if ($year > $end) {
                $end = $year;
            }
        }

        if (($end - $start + 1) < 5) {
            $end = $start + 4;
        }

        return range($start, $end);
    }

    /**
     * Status capaian dan predikat mutu kinerja.
     * ATURAN KHUSUS: Ketika nilainya minus (< 0), otomatis masuk PREDIKAT: SANGAT KURANG (Status: Kritis, Badge: danger).
     */
    public function getStatusCapaian(?float $capaian, ?float $target = null, ?float $realization = null): array
    {
        if (($target !== null && $realization !== null && (float) $target == 0 && (float) $realization == 0) || $capaian === null) {
            return [
                'status'   => 'Tidak Dinilai',
                'predikat' => 'TIDAK DINILAI',
                'badge'    => 'secondary',
                'color'    => '#64748b',
                'bgClass'  => 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300',
            ];
        }

        // Aturan Khusus: Ketika Nilainya Minus atau < 50 maka masuk Status: Kritis (Merah)
        if ($capaian < 0) {
            return [
                'status'   => 'Kritis',
                'predikat' => 'SANGAT KURANG',
                'badge'    => 'danger',
                'color'    => '#dc2626',
                'bgClass'  => 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
            ];
        }

        if ($capaian >= 100.0) {
            return [
                'status'   => 'Tercapai',
                'predikat' => 'SANGAT BAIK',
                'badge'    => 'success',
                'color'    => '#16a34a',
                'bgClass'  => 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
            ];
        }

        if ($capaian >= 50.0) {
            return [
                'status'   => 'Perlu Perhatian',
                'predikat' => 'CUKUP',
                'badge'    => 'warning',
                'color'    => '#eab308',
                'bgClass'  => 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
            ];
        }

        return [
            'status'   => 'Kritis',
            'predikat' => 'SANGAT KURANG',
            'badge'    => 'danger',
            'color'    => '#dc2626',
            'bgClass'  => 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
        ];
    }

    /**
     * Predikat Nilai SAKIP sesuai PermenPANRB 22/2024 (Tabel 1 Halaman 6: Skala 7 Kategori AA - D).
     * - AA (Sangat Memuaskan) : Nilai > 90 - 100
     * - A (Memuaskan)         : Nilai > 80 - 90
     * - BB (Sangat Baik)      : Nilai > 70 - 80
     * - B (Baik)              : Nilai > 60 - 70
     * - CC (Cukup / Memadai)  : Nilai > 50 - 60
     * - C (Kurang)            : Nilai > 30 - 50
     * - D (Sangat Kurang)     : Nilai 0 - 30 / Nilai Minus (< 0)
     */
    public function getPredikatSakip(float $nilai): string
    {
        if ($nilai <= 0)  return 'BELUM DINILAI';
        if ($nilai > 90) return 'AA';
        if ($nilai > 80) return 'A';
        if ($nilai > 70) return 'BB';
        if ($nilai > 60) return 'B';
        if ($nilai > 50) return 'CC';
        if ($nilai > 30) return 'C';
        return 'D';
    }

    /**
     * Koreksi AKIP untuk PKO sudah tidak digunakan (0%).
     */
    public function getKoreksiAkip(string $predikat): float
    {
        return 0.00;
    }

    /**
     * Predikat Nilai PKO / NKO sesuai PermenPANRB 22/2024 (Tabel 4 Halaman 8: 5 Kategori Predikat):
     * - ISTIMEWA        : Nilai > 100%
     * - BAIK            : Nilai > 80% s.d. 100% (80% < X <= 100%)
     * - BUTUH PERBAIKAN : Nilai > 60% s.d. 80%  (60% < X <= 80%)
     * - KURANG          : Nilai > 20% s.d. 60%  (20% < X <= 60%)
     * - SANGAT KURANG   : Nilai <= 20% (0% <= X <= 20% atau minus < 0%)
     */
    public function getPredikatPko(float $nilai): string
    {
        if ($nilai <= 0)  return 'BELUM DINILAI';
        if ($nilai > 100) return 'ISTIMEWA';
        if ($nilai > 80)  return 'BAIK';
        if ($nilai > 60)  return 'BUTUH PERBAIKAN';
        if ($nilai > 20)  return 'KURANG';
        return 'SANGAT KURANG';
    }

    // =========================================================================
    // 1. CAPAIAN IKU PEMERINTAH DAERAH (Item 3 Panduan)
    // =========================================================================
    public function getIkuPemdaMatrix(int $year = 2026, ?string $filterStatus = null): array
    {
        $years = $this->resolveYears($year);

        $realizationIkuItems = RealizationIkuItem::query()->orderBy('id')->get();
        if ($realizationIkuItems->isNotEmpty()) {
            $rows = [];
            $totalCapaian = 0.0;
            $countEvaluated = 0;
            $statusCounts = ['tercapai' => 0, 'perlu_perhatian' => 0, 'kritis' => 0, 'tidak_dinilai' => 0];

            foreach ($realizationIkuItems as $item) {
                $targets = (array) ($item->targets ?? []);
                $realizations = (array) ($item->realizations ?? []);
                $pol = $item->measurement_pattern ?? 'Positif';

                $isSakipPemda = str_contains(strtolower($item->indicator_name), 'sakip');

                $targetVal = isset($targets[$year]) && $targets[$year] !== '' ? (float) $targets[$year] : null;
                $realVal = isset($realizations[$year]) && $realizations[$year] !== '' ? (float) $realizations[$year] : null;

                if ($isSakipPemda) {
                    $sakipMatrix = $this->getSakipPemdaMatrix($year);
                    if (!empty($sakipMatrix['nilai'])) {
                        $realVal = (float) $sakipMatrix['nilai'];
                    }
                }

                $capaian = PerformanceMeasurementService::calculateAchievement($targetVal, $realVal, $pol);
                $statusObj = PerformanceMeasurementService::determineStatus($capaian, $targetVal, $realVal);

                $yearly = [];
                foreach ($years as $yr) {
                    $tYr = isset($targets[$yr]) && $targets[$yr] !== '' ? (float) $targets[$yr] : null;
                    $rYr = isset($realizations[$yr]) && $realizations[$yr] !== '' ? (float) $realizations[$yr] : null;
                    if ($isSakipPemda) {
                        $sakipYr = $this->getSakipPemdaMatrix((int) $yr);
                        if (!empty($sakipYr['nilai'])) {
                            $rYr = (float) $sakipYr['nilai'];
                        }
                    }
                    $cYr = PerformanceMeasurementService::calculateAchievement($tYr, $rYr, $pol);
                    $sYr = PerformanceMeasurementService::determineStatus($cYr, $tYr, $rYr);
                    $yearly[$yr] = [
                        'year'        => $yr,
                        'target'      => $tYr,
                        'realization' => $rYr,
                        'achievement' => $cYr,
                        'status'      => $sYr['status'],
                        'predikat'    => $sYr['status'] === 'Tercapai' ? 'MEMUASKAN' : ($sYr['status'] === 'Perlu Perhatian' ? 'BAIK' : ($sYr['status'] === 'Tidak Dinilai' ? 'TIDAK DINILAI' : 'KURANG')),
                        'badge'       => $sYr['badge'] ?? '',
                    ];
                }

                $firstYrIku = $years[0] ?? $year;
                $capFirst = $yearly[$firstYrIku]['achievement'] ?? null;
                $tren = '→';
                if ($capaian !== null && $capFirst !== null) {
                    if ($capaian > $capFirst) $tren = '↑';
                    elseif ($capaian < $capFirst) $tren = '↓';
                }

                if ($statusObj['status'] === 'Tidak Dinilai') {
                    $statusCounts['tidak_dinilai']++;
                } elseif ($capaian !== null) {
                    $totalCapaian += $capaian;
                    $countEvaluated++;
                    match ($statusObj['status']) {
                        'Tercapai'        => $statusCounts['tercapai']++,
                        'Perlu Perhatian' => $statusCounts['perlu_perhatian']++,
                        default           => $statusCounts['kritis']++,
                    };
                }

                if ($filterStatus && $filterStatus !== 'Semua' && $statusObj['status'] !== $filterStatus) {
                    continue;
                }

                $rows[] = [
                    'no'           => count($rows) + 1,
                    'id'           => $item->id,
                    'code'         => 'IKU-PEMDA-' . str_pad((string)$item->id, 4, '0', STR_PAD_LEFT),
                    'sasaran'      => 'Sasaran Strategis Pemerintah Daerah',
                    'indikator'    => $item->indicator_name,
                    'satuan'       => $item->unit ?? '%',
                    'karakter'     => strtolower($pol) === 'negatif' ? 'Semakin rendah semakin baik' : 'Semakin tinggi semakin baik',
                    'polarization' => $pol,
                    'target'       => $targetVal,
                    'realisasi'    => $realVal,
                    'capaian'      => $capaian,
                    'status'       => $statusObj['status'],
                    'predikat'     => $statusObj['status'] === 'Tercapai' ? 'MEMUASKAN' : ($statusObj['status'] === 'Perlu Perhatian' ? 'BAIK' : ($statusObj['status'] === 'Tidak Dinilai' ? 'TIDAK DINILAI' : 'KURANG')),
                    'badge'        => $statusObj['badge'] ?? '',
                    'color'        => $statusObj['color'] ?? '#64748b',
                    'bgClass'      => $statusObj['bgClass'] ?? '',
                    'tren'         => $tren,
                    'opd_pengampu' => 'Pemerintah Provinsi Papua Barat',
                    'yearly'       => $yearly,
                ];
            }

            $rataCapaian = $countEvaluated > 0 ? round($totalCapaian / $countEvaluated, 2) : 0.0;

            $trend = [];
            foreach ($years as $yr) {
                $caps = [];
                $tercapaiCount = 0;
                $perhatianCount = 0;
                $kritisCount = 0;

                foreach ($realizationIkuItems as $it) {
                    $tgts = (array) ($it->targets ?? []);
                    $rls = (array) ($it->realizations ?? []);
                    $tY = isset($tgts[$yr]) && $tgts[$yr] !== '' ? (float) $tgts[$yr] : null;
                    $rY = isset($rls[$yr]) && $rls[$yr] !== '' ? (float) $rls[$yr] : null;
                    if (str_contains(strtolower($it->indicator_name), 'sakip')) {
                        $sakipYr = $this->getSakipPemdaMatrix((int) $yr);
                        if (!empty($sakipYr['nilai'])) {
                            $rY = (float) $sakipYr['nilai'];
                        }
                    }
                    $achY = PerformanceMeasurementService::calculateAchievement($tY, $rY, $it->measurement_pattern ?? 'Positif');
                    $stY = PerformanceMeasurementService::determineStatus($achY, $tY, $rY);
                    if ($achY !== null && $stY['status'] !== 'Tidak Dinilai') {
                        $caps[] = $achY;
                        if ($achY >= 100) $tercapaiCount++;
                        elseif ($achY >= 50) $perhatianCount++;
                        else $kritisCount++;
                    }
                }

                $avgAch = count($caps) > 0 ? round(array_sum($caps) / count($caps), 2) : null;
                $trendStatus = $avgAch !== null
                    ? ($avgAch >= 100 ? 'Tercapai' : ($avgAch >= 50 ? 'Perlu Perhatian' : 'Kritis'))
                    : 'Belum Berjalan';

                $trend[] = [
                    'tahun'     => $yr,
                    'capaian'   => $avgAch,
                    'tercapai'  => $tercapaiCount,
                    'perhatian' => $perhatianCount,
                    'kritis'    => $kritisCount,
                    'status'    => $trendStatus,
                ];
            }

            return [
                'summary' => [
                    'total_iku'        => $realizationIkuItems->count(),
                    'tercapai'         => $statusCounts['tercapai'],
                    'perlu_perhatian'  => $statusCounts['perlu_perhatian'],
                    'kritis'           => $statusCounts['kritis'],
                    'tidak_dinilai'    => $statusCounts['tidak_dinilai'],
                    'rata_capaian'     => $rataCapaian,
                    'evaluation_year'  => $year,
                ],
                'rows'  => $rows,
                'trend' => $trend,
                'years' => $years,
            ];
        }

        $indicators = Indicator::query()
            ->where('is_iku', true)
            ->where(function ($q) {
                $q->where('level', 'pemda')
                  ->orWhereNull('owner_organization_id')
                  ->orWhereHas('organization', fn($o) => $o->where('type', 'province')->orWhere('code', 'BAPPEDA-PB'));
            })
            ->where('status', 'active')
            ->with(['currentVersion.measurementUnit', 'strategicObjective', 'organization', 'targets'])
            ->orderBy('code')
            ->get();

        // Realisasi IKU dari tabel iku_realizations (input dari form 4.2 IKU)
        $ikuRealizations = Schema::hasTable('iku_realizations')
            ? IkuRealization::whereIn('indicator_id', $indicators->pluck('id'))
                ->whereIn('year', $years)
                ->get()
                ->groupBy('indicator_id')
            : collect();

        // Target multi-tahun
        $targets = IndicatorTarget::whereIn('year', $years)
            ->where('status', 'approved')
            ->get()
            ->groupBy('indicator_version_id');

        // Realisasi dinamis per tahun (fallback tabel legacy)
        $periodMap = [];
        foreach ($years as $yr) {
            $periodMap[$yr] = Realization::whereHas('measurementPeriod', fn($q) => $q->whereYear('start_date', $yr))
                ->orderByDesc('measurement_period_id')
                ->value('measurement_period_id')
                ?? (MeasurementPeriod::whereYear('start_date', $yr)->orderByDesc('id')->value('id')
                    ?? MeasurementPeriod::where('code', 'like', "%{$yr}%")->orderByDesc('id')->value('id'));
        }
        if (empty($periodMap[2026])) {
            $periodMap[2026] = MeasurementPeriod::where('code', 'TW2-2026')->value('id') ?? MeasurementPeriod::where('code', 'TW1-2026')->value('id');
        }
        if (empty($periodMap[2025])) {
            $periodMap[2025] = MeasurementPeriod::where('code', 'TA-2025')->value('id');
        }

        $realizations = Realization::whereIn('status', ['approved', 'submitted'])
            ->orderByDesc('updated_at')
            ->get()
            ->groupBy('indicator_version_id');

        $rows = [];
        $totalCapaian = 0.0;
        $countEvaluated = 0;
        $statusCounts = ['tercapai' => 0, 'perlu_perhatian' => 0, 'kritis' => 0, 'tidak_dinilai' => 0];

        foreach ($indicators as $ind) {
            $ver = $ind->currentVersion;
            $verId = $ver?->id;
            $pol = $ind->polarization ?? 'positif';
            $unitName = $ver?->measurementUnit?->symbol ?? $ver?->measurementUnit?->name ?? '%';

            // Target & Realisasi tahun aktif ($year)
            $targetVal = null;
            if ($verId && isset($targets[$verId])) {
                $tgtRow = $targets[$verId]->firstWhere('year', $year);
                $targetVal = $tgtRow ? (float) $tgtRow->target_value : null;
            }
            if ($targetVal === null && $ind->relationLoaded('targets')) {
                $tgtRow = $ind->targets->firstWhere('year', $year);
                $targetVal = $tgtRow ? (float) $tgtRow->target_value : null;
            }

            $realVal = null;
            $ikuRealYear = $ikuRealizations->get($ind->id)?->firstWhere('year', $year);
            if ($ikuRealYear && $ikuRealYear->realization_value !== null) {
                $realVal = (float) $ikuRealYear->realization_value;
            } elseif ($verId && isset($realizations[$verId])) {
                $activePeriodId = $periodMap[$year] ?? null;
                $relRow = $activePeriodId ? $realizations[$verId]->firstWhere('measurement_period_id', $activePeriodId) : null;
                if (!$relRow) {
                    $relRow = $realizations[$verId]->first();
                }
                $realVal = $relRow ? (float) $relRow->value : null;
            }

            $capaian = $this->calculateCapaian($realVal, $targetVal, $pol);
            $statusObj = $this->getStatusCapaian($capaian, $targetVal, $realVal);

            // Perhitungan per tahun (siklus RPJMD dinamis) untuk deret waktu & tabel 5 tahun
            $yearly = [];
            foreach ($years as $yr) {
                $tYr = null;
                if ($verId && isset($targets[$verId])) {
                    $tRow = $targets[$verId]->firstWhere('year', $yr);
                    $tYr = $tRow ? (float) $tRow->target_value : null;
                }
                if ($tYr === null && $ind->relationLoaded('targets')) {
                    $tRow = $ind->targets->firstWhere('year', $yr);
                    $tYr = $tRow ? (float) $tRow->target_value : null;
                }

                $rYr = null;
                $ikuRealYr = $ikuRealizations->get($ind->id)?->firstWhere('year', $yr);
                if ($ikuRealYr && $ikuRealYr->realization_value !== null) {
                    $rYr = (float) $ikuRealYr->realization_value;
                } elseif ($verId && isset($realizations[$verId])) {
                    $pId = $periodMap[$yr] ?? null;
                    $rRow = $pId ? $realizations[$verId]->firstWhere('measurement_period_id', $pId) : null;
                    $rYr = $rRow ? (float) $rRow->value : null;
                }

                $cYr = $this->calculateCapaian($rYr, $tYr, $pol);
                $sYr = $this->getStatusCapaian($cYr, $tYr, $rYr);

                $yearly[$yr] = [
                    'year'        => $yr,
                    'target'      => $tYr,
                    'realization' => $rYr,
                    'achievement' => $cYr,
                    'status'      => $sYr['status'],
                    'predikat'    => $sYr['predikat'],
                    'badge'       => $sYr['badge'],
                ];
            }

            // Hitung tren panah dibanding tahun pertama siklus RPJMD
            $firstYrIku  = $years[0] ?? $year;
            $capFirst    = $yearly[$firstYrIku]['achievement'] ?? null;
            $tren = '→';
            if ($capaian !== null && $capFirst !== null) {
                if ($capaian > $capFirst) $tren = '↑';
                elseif ($capaian < $capFirst) $tren = '↓';
            }

            if ($statusObj['status'] === 'Tidak Dinilai') {
                $statusCounts['tidak_dinilai']++;
            } elseif ($capaian !== null) {
                $totalCapaian += $capaian;
                $countEvaluated++;
                match ($statusObj['status']) {
                    'Tercapai'        => $statusCounts['tercapai']++,
                    'Perlu Perhatian' => $statusCounts['perlu_perhatian']++,
                    default           => $statusCounts['kritis']++,
                };
            }

            if ($filterStatus && $filterStatus !== 'Semua' && $statusObj['status'] !== $filterStatus) {
                continue;
            }

            $rows[] = [
                'no'           => count($rows) + 1,
                'id'           => $ind->id,
                'code'         => $ind->code,
                'sasaran'      => $ind->strategicObjective?->name ?? 'Sasaran Pembangunan Provinsi',
                'indikator'    => $ind->name,
                'satuan'       => $unitName,
                'karakter'     => in_array(strtolower($pol), ['negatif', 'lower_is_better']) ? 'Semakin rendah semakin baik' : 'Semakin tinggi semakin baik',
                'polarization' => $pol,
                'target'       => $targetVal,
                'realisasi'    => $realVal,
                'capaian'      => $capaian,
                'status'       => $statusObj['status'],
                'predikat'     => $statusObj['predikat'],
                'badge'        => $statusObj['badge'],
                'color'        => $statusObj['color'],
                'bgClass'      => $statusObj['bgClass'],
                'tren'         => $tren,
                'opd_pengampu' => $ind->organization?->name ?? 'Pemerintah Provinsi Papua Barat',
                'yearly'       => $yearly,
            ];
        }

        $rataCapaian = $countEvaluated > 0 ? round($totalCapaian / $countEvaluated, 2) : 0.0;

        // Tren 5 Tahun
        $trend = [];
        foreach ($years as $yr) {
            $caps = [];
            $tercapaiCount = 0;
            $perhatianCount = 0;
            $kritisCount = 0;

            foreach ($rows as $r) {
                $ach = $r['yearly'][$yr]['achievement'] ?? null;
                $stat = $r['yearly'][$yr]['status'] ?? null;
                if ($ach !== null && $stat !== 'Tidak Dinilai') {
                    $caps[] = $ach;
                    if ($ach >= 100) {
                        $tercapaiCount++;
                    } elseif ($ach >= 50) {
                        $perhatianCount++;
                    } else {
                        $kritisCount++;
                    }
                }
            }

            $avgAch = count($caps) > 0 ? round(array_sum($caps) / count($caps), 2) : null;
            $trendStatus = $avgAch !== null
                ? ($avgAch >= 100 ? 'Tercapai' : ($avgAch >= 50 ? 'Perlu Perhatian' : 'Kritis'))
                : 'Belum Berjalan';

            $trend[] = [
                'tahun'     => $yr,
                'capaian'   => $avgAch,
                'tercapai'  => $tercapaiCount,
                'perhatian' => $perhatianCount,
                'kritis'    => $kritisCount,
                'status'    => $trendStatus,
            ];
        }

        return [
            'summary' => [
                'total_iku'        => count($indicators),
                'tercapai'         => $statusCounts['tercapai'],
                'perlu_perhatian'  => $statusCounts['perlu_perhatian'],
                'kritis'           => $statusCounts['kritis'],
                'tidak_dinilai'    => $statusCounts['tidak_dinilai'],
                'rata_capaian'     => $rataCapaian,
                'evaluation_year'  => $year,
            ],
            'rows'  => $rows,
            'trend' => $trend,
            'years' => $years,
        ];
    }

    // =========================================================================
    // 2. CAPAIAN KINERJA OPD & RANKING DENGAN DRILL-DOWN (Item 4 Panduan)
    // =========================================================================
    public function getOpdPerformanceRanking(int $year = 2026, ?int $filterOpdId = null, ?string $filterStatus = null): array
    {
        $allOpd = Organization::where('type', 'opd')
            ->where('is_active', true)
            ->when($filterOpdId, fn($q) => $q->where('id', $filterOpdId))
            ->orderBy('name')
            ->get();

        $years = $this->resolveYears($year);

        // Tarik Pohon Kinerja OPD untuk drilldown: OPD -> Sasaran -> Indikator -> Target -> Realisasi -> Program -> Kegiatan -> Subkegiatan
        $planningTrees = PlanningTree::with('organization')->get()->groupBy('organization_id');

        // BATCH LOADING (Fix N+1 query loops):
        // 1. Ambil semua indikator aktif untuk seluruh OPD sekaligus
        $indicatorsByOpd = Indicator::whereIn('owner_organization_id', $allOpd->pluck('id'))
            ->where('status', 'active')
            ->with(['currentVersion.measurementUnit', 'strategicObjective'])
            ->get()
            ->groupBy('owner_organization_id');

        $allVersionIds = $indicatorsByOpd->flatten()
            ->pluck('current_version_id')
            ->filter()
            ->unique()
            ->values()
            ->all();

        // 2. Ambil semua target untuk seluruh versi indikator dan 5 tahun sekaligus
        $targetsByVerAndYear = IndicatorTarget::whereIn('indicator_version_id', $allVersionIds)
            ->whereIn('year', $years)
            ->whereIn('status', ['approved', 'submitted', 'draft'])
            ->get()
            ->groupBy(fn($t) => $t->indicator_version_id . '_' . $t->year);

        // 3. Ambil peta MeasurementPeriod ID per tahun sekaligus
        $periodsByYear = MeasurementPeriod::all()->groupBy(fn($p) => $p->start_date ? (int) $p->start_date->format('Y') : 0);

        // 4. Ambil semua realisasi untuk seluruh versi indikator sekaligus
        $realizationsByVer = Realization::whereIn('indicator_version_id', $allVersionIds)
            ->whereIn('status', ['approved', 'submitted'])
            ->orderByDesc('updated_at')
            ->get()
            ->groupBy('indicator_version_id');

        // 5. Ambil item Realisasi Kinerja OPD (Menu 4.3)
        $realizationOpdByOrg = Schema::hasTable('realization_opd_items')
            ? RealizationOpdItem::with('parent')
                ->whereIn('organization_id', $allOpd->pluck('id'))
                ->orderBy('order_no')
                ->orderBy('id')
                ->get()
                ->groupBy('organization_id')
            : collect();

        $rows = [];
        $totalCapaianAll = 0.0;
        $evalCount = 0;

        foreach ($allOpd as $opd) {
            $inds = $indicatorsByOpd->get($opd->id, collect());
            $opdItems = $realizationOpdByOrg->get($opd->id, collect());

            $capList = [];
            $stCounts = ['tercapai' => 0, 'perlu_perhatian' => 0, 'kritis' => 0, 'tidak_dinilai' => 0];
            $drilldownIndicators = [];

            if ($opdItems->isNotEmpty()) {
                $evalItems = $opdItems->where('level', 'objective');
                if ($evalItems->isEmpty()) {
                    $evalItems = $opdItems;
                }

                foreach ($evalItems as $item) {
                    $indList = !empty($item->objective_indicators_list)
                        ? $item->objective_indicators_list
                        : (!empty($item->indicators) ? $item->indicators : (!empty($item->goal_indicators_list) ? $item->goal_indicators_list : [
                            [
                                'indicator' => $item->objective_indicator ?: ($item->goal_indicator ?: 'Indikator OPD #' . $item->id),
                                'unit' => $item->unit ?: ($item->goal_indicator_unit ?: '%'),
                                'measurement_pattern' => $item->measurement_pattern ?: ($item->goal_measurement_pattern ?: 'Positif'),
                                'targets' => $item->targets ?: ($item->goal_targets ?: []),
                                'realizations' => $item->realizations ?: ($item->goal_realizations ?: []),
                            ]
                        ]));

                    foreach ($indList as $subIdx => $ind) {
                        $targets = (array) ($ind['targets'] ?? []);
                        $realizations = (array) ($ind['realizations'] ?? []);
                        $pol = $ind['measurement_pattern'] ?? ($item->measurement_pattern ?? 'Positif');

                        $tVal = isset($targets[$year]) && $targets[$year] !== '' && $targets[$year] !== null ? (float) $targets[$year] : null;
                        $rVal = isset($realizations[$year]) && $realizations[$year] !== '' && $realizations[$year] !== null ? (float) $realizations[$year] : null;

                        $cap = PerformanceMeasurementService::calculateAchievement($tVal, $rVal, $pol);
                        $statusObj = PerformanceMeasurementService::determineStatus($cap, $tVal, $rVal);

                        if ($cap !== null && $statusObj['status'] !== 'Tidak Dinilai') {
                            $capList[] = $cap;
                        }

                        match ($statusObj['status']) {
                            'Tercapai'        => $stCounts['tercapai']++,
                            'Perlu Perhatian' => $stCounts['perlu_perhatian']++,
                            'Tidak Dinilai'   => $stCounts['tidak_dinilai']++,
                            default           => $stCounts['kritis']++,
                        };

                        $drilldownIndicators[] = [
                            'id'           => $item->id . '_' . $subIdx,
                            'code'         => 'OPD-' . $item->id . (count($indList) > 1 ? '.' . ($subIdx + 1) : ''),
                            'nama'         => $ind['indicator'] ?: ($item->objective_indicator ?: ($item->goal_indicator ?: 'Indikator OPD #' . $item->id)),
                            'sasaran'      => $item->objective ?: ($item->goal ?: 'Sasaran Kinerja OPD'),
                            'satuan'       => $ind['unit'] ?: ($item->unit ?: '%'),
                            'polarization' => $pol,
                            'target'       => $tVal,
                            'realisasi'    => $rVal,
                            'capaian'      => $cap,
                            'status'       => $statusObj['status'],
                            'predikat'     => $statusObj['status'] === 'Tercapai' ? 'MEMUASKAN' : ($statusObj['status'] === 'Perlu Perhatian' ? 'BAIK' : ($statusObj['status'] === 'Tidak Dinilai' ? 'TIDAK DINILAI' : 'KURANG')),
                            'badge'        => $statusObj['badge'],
                            'bgClass'      => $statusObj['bgClass'],
                        ];
                    }
                }
            } elseif ($inds->isNotEmpty()) {
                foreach ($inds as $ind) {
                    $ver = $ind->currentVersion;
                    if (!$ver) continue;

                    $targetRow = $targetsByVerAndYear->get($ver->id . '_' . $year)?->first();
                    $target = $targetRow?->target_value;

                    $verReals = $realizationsByVer->get($ver->id, collect());
                    $real = $verReals->first()?->value;

                    $tFloat = $target !== null ? (float) $target : null;
                    $rFloat = $real !== null ? (float) $real : null;
                    $cap = $this->calculateCapaian($rFloat, $tFloat, $ind->polarization ?? 'positif');
                    $statusObj = $this->getStatusCapaian($cap, $tFloat, $rFloat);

                    if ($cap !== null && $statusObj['status'] !== 'Belum Ada Data' && $statusObj['status'] !== 'Tidak Dinilai') {
                        $capList[] = $cap;
                    }

                    match ($statusObj['status']) {
                        'Tercapai'        => $stCounts['tercapai']++,
                        'Perlu Perhatian' => $stCounts['perlu_perhatian']++,
                        'Tidak Dinilai'   => $stCounts['tidak_dinilai']++,
                        default           => $stCounts['kritis']++,
                    };

                    $drilldownIndicators[] = [
                        'id'           => $ind->id,
                        'code'         => $ind->code,
                        'nama'         => $ind->name,
                        'sasaran'      => $ind->strategicObjective?->name ?? 'Sasaran Strategis Perangkat Daerah',
                        'satuan'       => $ver->measurementUnit?->symbol ?? '%',
                        'polarization' => $ind->polarization ?? 'positif',
                        'target'       => $tFloat,
                        'realisasi'    => $rFloat,
                        'capaian'      => $cap,
                        'status'       => $statusObj['status'],
                        'predikat'     => $statusObj['predikat'],
                        'badge'        => $statusObj['badge'],
                        'bgClass'      => $statusObj['bgClass'],
                    ];
                }
            }

            $avgCap = count($capList) > 0 ? round(array_sum($capList) / count($capList), 2) : 0.0;
            $overallStatus = count($capList) > 0 ? $this->getStatusCapaian($avgCap) : [
                'status'   => 'Tidak Dinilai',
                'predikat' => 'TIDAK DINILAI',
                'badge'    => 'secondary',
                'color'    => '#64748b',
                'bgClass'  => 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300',
            ];

            if ($filterStatus && $filterStatus !== 'Semua' && $overallStatus['status'] !== $filterStatus) {
                continue;
            }

            // Hitung tren 5 tahun (siklus RPJMD dinamis) untuk OPD ini (in-memory, no SQL)
            $yearly = [];
            foreach ($years as $yr) {
                if ($yr === $year) {
                    $capYr = $avgCap;
                } else {
                    $yrCaps = [];
                    if ($opdItems->isNotEmpty()) {
                        $evalItems = $opdItems->where('level', 'objective');
                        if ($evalItems->isEmpty()) {
                            $evalItems = $opdItems;
                        }
                        foreach ($evalItems as $item) {
                            $indList = !empty($item->objective_indicators_list)
                                ? $item->objective_indicators_list
                                : (!empty($item->indicators) ? $item->indicators : (!empty($item->goal_indicators_list) ? $item->goal_indicators_list : [
                                    [
                                        'measurement_pattern' => $item->measurement_pattern ?? ($item->goal_measurement_pattern ?? 'Positif'),
                                        'targets' => $item->targets ?: ($item->goal_targets ?: []),
                                        'realizations' => $item->realizations ?: ($item->goal_realizations ?: []),
                                    ]
                                ]));
                            foreach ($indList as $ind) {
                                $targets = (array) ($ind['targets'] ?? []);
                                $realizations = (array) ($ind['realizations'] ?? []);
                                $pol = $ind['measurement_pattern'] ?? ($item->measurement_pattern ?? 'Positif');
                                $tYr = isset($targets[$yr]) && $targets[$yr] !== '' && $targets[$yr] !== null ? (float) $targets[$yr] : null;
                                $rYr = isset($realizations[$yr]) && $realizations[$yr] !== '' && $realizations[$yr] !== null ? (float) $realizations[$yr] : null;
                                $cYr = PerformanceMeasurementService::calculateAchievement($tYr, $rYr, $pol);
                                if ($cYr !== null && !($tYr == 0.0 && $rYr == 0.0)) {
                                    $yrCaps[] = $cYr;
                                }
                            }
                        }
                    } elseif ($inds->isNotEmpty()) {
                        foreach ($inds as $ind) {
                            $vId = $ind->currentVersion?->id;
                            if (!$vId) continue;
                            $tRow = $targetsByVerAndYear->get($vId . '_' . $yr)?->first();
                            $tVal = $tRow?->target_value;
                            if ($tVal !== null) {
                                $pId = $periodsByYear->get($yr)?->first()?->id;
                                $rRow = $pId ? $realizationsByVer->get($vId, collect())->firstWhere('measurement_period_id', $pId) : null;
                                $rVal = $rRow?->value;
                                $c = $this->calculateCapaian($rVal !== null ? (float)$rVal : null, (float)$tVal, $ind->polarization ?? 'positif');
                                if ($c !== null) $yrCaps[] = $c;
                            }
                        }
                    }

                    if (count($yrCaps) > 0) {
                        $capYr = round(array_sum($yrCaps) / count($yrCaps), 2);
                    } else {
                        $capYr = null;
                    }
                }
                $stYr = $capYr !== null ? $this->getStatusCapaian($capYr) : [
                    'status'   => 'Tidak Dinilai',
                    'predikat' => 'TIDAK DINILAI',
                    'badge'    => 'secondary',
                    'color'    => '#64748b',
                    'bgClass'  => 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300',
                ];
                $yearly[$yr] = [
                    'year'        => $yr,
                    'capaian'     => $capYr,
                    'status'      => $stYr['status'],
                    'predikat'    => $stYr['predikat'],
                    'badge'       => $stYr['badge'],
                    'bgClass'     => $stYr['bgClass'],
                ];
            }

            $firstYr   = $years[0] ?? $year;
            $capFirst  = $yearly[$firstYr]['capaian'] ?? $avgCap;
            $tren = '→';
            if ($avgCap > $capFirst) $tren = '↑';
            elseif ($avgCap < $capFirst) $tren = '↓';

            // Siapkan struktur drilldown lengkap PermenPANRB 89/22:
            // OPD -> Sasaran (csf) -> Indikator Kinerja -> Target -> Realisasi -> Program (kondisi_antara) -> Kegiatan (kondisi_operasional) -> Subkegiatan (output)
            $opdTreeNodes = $planningTrees->get($opd->id, collect());
            $programs = [];

            if ($opdTreeNodes->isNotEmpty()) {
                $progNodes = $opdTreeNodes->where('level', 'kondisi_antara');
                $kegNodes  = $opdTreeNodes->where('level', 'kondisi_operasional');
                $subNodes  = $opdTreeNodes->where('level', 'output');

                foreach ($progNodes as $pn) {
                    $kegiatanList = [];
                    foreach ($kegNodes->where('parent_id', $pn->id) as $kn) {
                        $subkegList = [];
                        foreach ($subNodes->where('parent_id', $kn->id) as $sn) {
                            $subkegList[] = [
                                'kode' => $sn->code,
                                'nama' => $sn->name,
                                'deskripsi' => $sn->description,
                            ];
                        }
                        $kegiatanList[] = [
                            'kode' => $kn->code,
                            'nama' => $kn->name,
                            'subkegiatan' => $subkegList,
                        ];
                    }
                    $programs[] = [
                        'kode' => $pn->code,
                        'nama' => $pn->name,
                        'kegiatan' => $kegiatanList,
                    ];
                }
            }

            // Fallback program jika pohon kinerja belum terisi lengkap
            if (empty($programs)) {
                $programs = [
                    [
                        'kode' => 'PROG-01',
                        'nama' => 'Program Penunjang Urusan Pemerintahan Daerah ' . $opd->name,
                        'kegiatan' => [
                            [
                                'kode' => 'KEG-01',
                                'nama' => 'Perencanaan, Penganggaran, dan Evaluasi Kinerja Perangkat Daerah',
                                'subkegiatan' => [
                                    ['kode' => 'SUB-01', 'nama' => 'Penyusunan Dokumen Perencanaan dan Laporan Akuntabilitas'],
                                    ['kode' => 'SUB-02', 'nama' => 'Koordinasi dan Sinkronisasi Pengendalian Target Kinerja'],
                                ],
                            ],
                        ],
                    ],
                    [
                        'kode' => 'PROG-02',
                        'nama' => 'Program Prioritas Akselerasi Kinerja Bidang Teknis ' . $opd->name,
                        'kegiatan' => [
                            [
                                'kode' => 'KEG-02',
                                'nama' => 'Pelaksanaan Kegiatan Strategis dan Pemberian Layanan Masyarakat',
                                'subkegiatan' => [
                                    ['kode' => 'SUB-03', 'nama' => 'Penyediaan Sarana Prasarana dan Dukungan Operasional Utama'],
                                ],
                            ],
                        ],
                    ],
                ];
            }

            // Susun hierarki terintegrasi: OPD -> Sasaran -> Indikator Kinerja -> Target -> Realisasi -> Program -> Kegiatan -> Subkegiatan
            $sasaranMap = [];
            foreach ($drilldownIndicators as $dInd) {
                $sName = $dInd['sasaran'];
                if (!isset($sasaranMap[$sName])) {
                    $sasaranMap[$sName] = [
                        'sasaran'   => $sName,
                        'indikator' => [],
                        'programs'  => $programs,
                    ];
                }

                // Analisis Mengapa Indikator Berstatus Merah / Kritis (Kebutuhan Pimpinan)
                $alasanMerah = null;
                if ($dInd['capaian'] !== null && $dInd['capaian'] < 0) {
                    $alasanMerah = 'Capaian bernilai MINUS (< 0%), otomatis masuk PREDIKAT: SANGAT KURANG (Status Kritis).';
                } elseif ($dInd['status'] === 'Kritis' || ($dInd['capaian'] !== null && $dInd['capaian'] < 50)) {
                    $alasanMerah = 'Realisasi (' . ($dInd['realisasi'] ?? '-') . ') sangat rendah dibandingkan Target / Benchmark (' . ($dInd['target'] ?? '-') . '), capaian di bawah 50% (Status Kritis).';
                }

                $dInd['penyebab_merah'] = $alasanMerah;
                $sasaranMap[$sName]['indikator'][] = $dInd;
            }

            $totalCapaianAll += $avgCap;
            $evalCount++;

            $rows[] = [
                'id'               => $opd->id,
                'kode'             => $opd->code,
                'perangkat_daerah' => $opd->name,
                'jumlah_indikator' => count($drilldownIndicators) ?: ($inds->isNotEmpty() ? count($inds) : 0),
                'rata_capaian'     => $avgCap,
                'tercapai'         => $stCounts['tercapai'],
                'perhatian'        => $stCounts['perlu_perhatian'],
                'terlambat'        => 0,
                'kritis'           => $stCounts['kritis'],
                'tidak_dinilai'    => $stCounts['tidak_dinilai'],
                'status'           => $overallStatus['status'],
                'predikat'         => $overallStatus['predikat'],
                'badge'            => $overallStatus['badge'],
                'bgClass'          => $overallStatus['bgClass'],
                'yearly'           => $yearly,
                'tren'             => $tren,
                'drilldown'        => [
                    'opd'              => $opd->name,
                    'kode'             => $opd->code,
                    'indikator'        => $drilldownIndicators,
                    'programs'         => $programs,
                    'sasaran_hierarki' => array_values($sasaranMap),
                ],
            ];
        }

        // Urutkan ranking dari rata-rata capaian tertinggi
        usort($rows, fn($a, $b) => $b['rata_capaian'] <=> $a['rata_capaian']);
        foreach ($rows as $idx => &$r) {
            $r['rank'] = $idx + 1;
        }
        unset($r);

        // Tren 5 Tahun Kinerja OPD Dinamis (Tahun terpilih merefleksikan hasil evaluasi aktif)
        $opdTrend = array_map(function ($yr) use ($year, $evalCount, $totalCapaianAll) {
            $rata = ($yr === $year && $evalCount > 0)
                ? round($totalCapaianAll / $evalCount, 2)
                : null;
            return ['tahun' => $yr, 'rata_capaian' => $rata, 'target' => 100.0];
        }, $years);

        return [
            'summary' => [
                'total_opd'       => count($allOpd),
                'rata_capaian'    => $evalCount > 0 ? round($totalCapaianAll / $evalCount, 2) : 0.0,
                'tercapai'        => count(array_filter($rows, fn($r) => $r['status'] === 'Tercapai')),
                'perlu_perhatian' => count(array_filter($rows, fn($r) => $r['status'] === 'Perlu Perhatian')),
                'terlambat'       => 0,
                'kritis'          => count(array_filter($rows, fn($r) => $r['status'] === 'Kritis')),
                'tidak_dinilai'   => count(array_filter($rows, fn($r) => $r['status'] === 'Tidak Dinilai')),
            ],
            'rows'  => $rows,
            'trend' => $opdTrend,
            'years' => $years,
        ];
    }

    // =========================================================================
    // 3A. NILAI SAKIP PEMERINTAH DAERAH (4 KOMPONEN) - DARI MODUL EVALUASI PEMDA
    // =========================================================================
    public function getSakipPemdaMatrix(int $year = 2026): array
    {
        $pemda = Organization::where('type', 'province')->first() ?? Organization::find(1);
        $period = PlanningPeriod::where('year', $year)->first() ?? PlanningPeriod::where('code', 'like', "%{$year}%")->first();
        $years = $this->resolveYears($year);

        $evalPemda = null;
        if ($pemda) {
            $evalPemda = Evaluation::with('scores')
                ->where('organization_id', $pemda->id)
                ->where(function ($q) use ($period, $year) {
                    if ($period) {
                        $q->where('planning_period_id', $period->id);
                    }
                    $q->orWhere('code', 'like', "%{$year}%")
                      ->orWhere('title', 'like', "%{$year}%");
                })
                ->latest('id')
                ->first();

            if (! $evalPemda) {
                $evalPemda = Evaluation::with('scores')
                    ->where('organization_id', $pemda->id)
                    ->latest('id')
                    ->first();
            }
        }

        $scores = $evalPemda?->scores ?? collect();

        $p1 = (float) ($scores->where('component', 'Perencanaan Kinerja')->first()?->score ?? 0);
        $p2 = (float) ($scores->where('component', 'Pengukuran Kinerja')->first()?->score ?? 0);
        $p3 = (float) ($scores->where('component', 'Pelaporan Kinerja')->first()?->score ?? 0);
        $p4 = (float) ($scores->where('component', 'Evaluasi Internal')->first()?->score ?? 0);

        $hasScores = $evalPemda && $scores->isNotEmpty() && ($p1 > 0 || $p2 > 0 || $p3 > 0 || $p4 > 0);
        $nilai = $hasScores ? round($p1 + $p2 + $p3 + $p4, 2) : 0.0;
        $predikat = $hasScores ? $this->getPredikatSakip($nilai) : 'BELUM DINILAI';

        $komponenDetail = [
            [
                'no'        => 1,
                'komponen'  => 'Perencanaan Kinerja',
                'bobot'     => 30.0,
                'nilai'     => $p1,
                'persen'    => $p1 > 0 ? round(($p1 / 30.0) * 100, 2) : 0.0,
                'predikat'  => $p1 > 0 ? $this->getPredikatSakip(($p1 / 30.0) * 100) : 'BELUM DINILAI',
                'deskripsi' => 'Kualitas dokumen perencanaan kinerja Renstra/RPJMD, cascading tujuan dan sasaran, serta keterukuran indikator kinerja daerah.',
            ],
            [
                'no'        => 2,
                'komponen'  => 'Pengukuran Kinerja',
                'bobot'     => 30.0,
                'nilai'     => $p2,
                'persen'    => $p2 > 0 ? round(($p2 / 30.0) * 100, 2) : 0.0,
                'predikat'  => $p2 > 0 ? $this->getPredikatSakip(($p2 / 30.0) * 100) : 'BELUM DINILAI',
                'deskripsi' => 'Efektivitas sistem pengukuran capaian IKU triwulanan dan tahunan berbasis data realisasi kinerja yang valid dan terverifikasi.',
            ],
            [
                'no'        => 3,
                'komponen'  => 'Pelaporan Kinerja',
                'bobot'     => 15.0,
                'nilai'     => $p3,
                'persen'    => $p3 > 0 ? round(($p3 / 15.0) * 100, 2) : 0.0,
                'predikat'  => $p3 > 0 ? $this->getPredikatSakip(($p3 / 15.0) * 100) : 'BELUM DINILAI',
                'deskripsi' => 'Penyusunan dan ketepatan waktu Laporan Kinerja Instansi Pemerintah (LKjIP) menyajikan efisiensi penggunaan sumber daya terhadap capaian.',
            ],
            [
                'no'        => 4,
                'komponen'  => 'Evaluasi Internal',
                'bobot'     => 25.0,
                'nilai'     => $p4,
                'persen'    => $p4 > 0 ? round(($p4 / 25.0) * 100, 2) : 0.0,
                'predikat'  => $p4 > 0 ? $this->getPredikatSakip(($p4 / 25.0) * 100) : 'BELUM DINILAI',
                'deskripsi' => 'Pelaksanaan evaluasi akuntabilitas kinerja internal oleh Inspektorat dan pemantauan tindak lanjut rekomendasi hasil evaluasi.',
            ],
        ];

        // Tren deret waktu SAKIP Pemda 5 tahun (siklus RPJMD)
        $trend = [];
        foreach ($years as $yr) {
            $val = ($yr === $year && $hasScores) ? $nilai : null;
            $trend[] = [
                'tahun'    => $yr,
                'nilai'    => $val,
                'predikat' => $val !== null ? $this->getPredikatSakip($val) : '-',
            ];
        }

        return [
            'tahun'              => $year,
            'organization_id'    => $pemda?->id,
            'organization_code'  => $pemda?->code ?? 'PEMPROV-PB',
            'organization_name'  => $pemda?->name ?? 'Pemerintah Provinsi Papua Barat',
            'perencanaan'        => $p1,
            'pengukuran'         => $p2,
            'pelaporan'          => $p3,
            'evaluasi_internal'  => $p4,
            'nilai'              => $nilai,
            'predikat'           => $predikat,
            'status_evaluasi'    => $evalPemda?->evaluation_status ?? 'Belum Dievaluasi',
            'lhe_file_path'      => $evalPemda?->lhe_file_path,
            'lhe_file_url'       => $evalPemda?->lhe_file_path ? Storage::disk('public')->url($evalPemda->lhe_file_path) : null,
            'lhe'                => $evalPemda ? [
                'nomor_lhe'      => $evalPemda->lhe_number ?? ('LHE-SAKIP-PEMPROV-PB/' . $year),
                'tanggal'        => $evalPemda->approved_at ? $evalPemda->approved_at->format('d/m/Y') : ('10/11/' . $year),
                'evaluator'      => 'Kementerian Pendayagunaan Aparatur Negara dan Reformasi Birokrasi (KemenPANRB)',
                'catatan'        => "Pemerintah Provinsi Papua Barat telah dievaluasi dengan predikat mutu {$predikat}.",
                'rekomendasi'    => 'Tingkatkan kualitas efektivitas evaluasi internal terhadap seluruh perangkat daerah dan percepat integrasi sistem pelaporan kinerja digital real-time.',
                'status_dokumen' => $evalPemda->lhe_file_path ? 'LHE Resmi KemenPANRB' : 'LHE Siap Unduh',
            ] : null,
            'komponen'           => $komponenDetail,
            'trend'              => $trend,
            'years'              => $years,
        ];
    }

    // =========================================================================
    // 3B. NILAI SAKIP OPD (4 KOMPONEN) (Item 5 Panduan)
    // =========================================================================
    public function getSakipEvaluationMatrix(int $year = 2026, ?int $filterOpdId = null, ?string $filterPredikat = null): array
    {
        $sakipPemda = $this->getSakipPemdaMatrix($year);

        $allOpd = Organization::where('type', 'opd')
            ->where('is_active', true)
            ->when($filterOpdId, fn($q) => $q->where('id', $filterOpdId))
            ->orderBy('name')
            ->get();

        $years = $this->resolveYears($year);

        $evaluations = Evaluation::with(['scores', 'organization'])
            ->where('status', 'approved')
            ->get()
            ->groupBy('organization_id');

        $rows = [];
        $predCounts = [
            'AA' => 0,
            'A'  => 0,
            'BB' => 0,
            'B'  => 0,
            'CC' => 0,
            'C'  => 0,
            'D'  => 0,
        ];
        $totalNilai = 0.0;

        foreach ($allOpd as $opd) {
            $orgEvals = $evaluations->get($opd->id, collect());

            // Cari evaluasi tahun evaluasi aktif
            $ev = $orgEvals->first(function ($e) use ($year) {
                if ($e->planningPeriod && (int)$e->planningPeriod->year === $year) return true;
                if ($e->approved_at && (int)$e->approved_at->format('Y') === $year) return true;
                if ($e->created_at && (int)$e->created_at->format('Y') === $year) return true;
                return false;
            });

            $scores = $ev?->scores ?? collect();

            $p1 = (float) $scores->where('component', 'Perencanaan Kinerja')->sum('score');
            $p2 = (float) $scores->where('component', 'Pengukuran Kinerja')->sum('score');
            $p3 = (float) $scores->where('component', 'Pelaporan Kinerja')->sum('score');
            $p4 = (float) $scores->where('component', 'Evaluasi Internal')->sum('score');

            // Default baseline jika belum ada penilaian evaluasi
            $hasScore = $scores->isNotEmpty() && ($p1 > 0 || $p2 > 0 || $p3 > 0 || $p4 > 0);
            $nilai = $hasScore ? round($p1 + $p2 + $p3 + $p4, 2) : 0.0;
            $predikat = $hasScore ? $this->getPredikatSakip($nilai) : 'BELUM DINILAI';

            if ($hasScore && isset($predCounts[$predikat])) {
                $predCounts[$predikat]++;
            }

            if ($filterPredikat && $filterPredikat !== 'Semua') {
                $f = strtoupper(trim($filterPredikat));
                if ($f === 'AA' && !in_array($predikat, ['AA', 'ISTIMEWA'])) continue;
                elseif ($f === 'A' && !in_array($predikat, ['A', 'BAIK'])) continue;
                elseif ($f === 'BB' && !in_array($predikat, ['BB', 'BUTUH PERBAIKAN'])) continue;
                elseif ($f === 'B' && !in_array($predikat, ['B', 'KURANG'])) continue;
                elseif ($f === 'CC' && $predikat !== 'CC') continue;
                elseif ($f === 'C' && $predikat !== 'C') continue;
                elseif ($f === 'D' && !in_array($predikat, ['D', 'SANGAT KURANG'])) continue;
                elseif ($f === 'CC_BAWAH' && !in_array($predikat, ['CC', 'C', 'D', 'SANGAT KURANG'])) continue;
                elseif ($f === 'BAIK' && !in_array($predikat, ['BAIK', 'A', 'AA'])) continue;
                elseif (!in_array($f, ['AA','A','BB','B','CC','C','D','CC_BAWAH','BAIK']) && strtoupper($predikat) !== $f) continue;
            }

            $totalNilai += $nilai;

            // Hitung data matriks 5 tahun (siklus RPJMD dinamis) per OPD
            $yearly = [];
            foreach ($years as $yr) {
                if ($yr === $year) {
                    $yrNilai = $hasScore ? $nilai : null;
                    $yrPred = $hasScore ? $predikat : '-';
                } else {
                    $evYr = $orgEvals->first(function ($e) use ($yr) {
                        if ($e->approved_at && (int)$e->approved_at->format('Y') === $yr) return true;
                        if ($e->created_at && (int)$e->created_at->format('Y') === $yr) return true;
                        return false;
                    });
                    if ($evYr && $evYr->scores->isNotEmpty()) {
                        $yrNilai = round((float) $evYr->scores->sum('score'), 2);
                        $yrPred = $this->getPredikatSakip($yrNilai);
                    } else {
                        $yrNilai = null;
                        $yrPred = '-';
                    }
                }

                $yearly[$yr] = [
                    'year'     => $yr,
                    'nilai'    => $yrNilai,
                    'predikat' => $yrPred,
                ];
            }

            $firstYrSakip = $years[0] ?? $year;
            $nilaiFirst   = $yearly[$firstYrSakip]['nilai'] ?? $nilai;
            $tren = '→';
            if ($nilai > 0 && $nilaiFirst !== null && $nilai > $nilaiFirst + 0.5) $tren = '↑';
            elseif ($nilai > 0 && $nilaiFirst !== null && $nilai < $nilaiFirst - 0.5) $tren = '↓';

            $rows[] = [
                'organization_id'   => $opd->id,
                'kode'              => $opd->code,
                'perangkat_daerah'  => $opd->name,
                'perencanaan'       => $p1,
                'pengukuran'        => $p2,
                'pelaporan'         => $p3,
                'evaluasi_internal' => $p4,
                'nilai'             => $nilai,
                'predikat'          => $predikat,
                'yearly'            => $yearly,
                'tren'              => $tren,
                'lhe'               => $ev ? [
                    'nomor_lhe'        => 'LHE-' . $opd->code . '/' . $year,
                    'tanggal'          => $ev->approved_at ? $ev->approved_at->format('d/m/Y') : '15/08/' . $year,
                    'evaluator'        => 'Inspektorat Provinsi Papua Barat',
                    'catatan'          => 'Penerapan SAKIP telah memenuhi standar akuntabilitas dengan perbaikan berkelanjutan pada kualitas indikator kinerja.',
                    'rekomendasi'      => 'Tingkatkan integrasi pengukuran triwulanan dan evaluasi tindak lanjut rekomendasi tahun sebelumnya.',
                    'status_dokumen'   => $ev->lhe_file_path ? 'LHE Diterbitkan' : 'LHE Siap Unduh',
                ] : null,
            ];
        }

        // Urutkan nilai SAKIP tertinggi
        usort($rows, fn($a, $b) => $b['nilai'] <=> $a['nilai']);
        foreach ($rows as $i => &$r) {
            $r['no'] = $i + 1;
        }
        unset($r);

        $evalCount = count(array_filter($rows, fn($r) => $r['nilai'] > 0));
        $rataNilai = $evalCount > 0 ? round($totalNilai / $evalCount, 2) : 0.0;

        // Tren 5 Tahun Nilai SAKIP OPD Dinamis (Tahun terpilih merefleksikan nilai aktif)
        $sakipTrend = array_map(function ($yr) use ($year, $rataNilai, $evalCount) {
            $val = ($yr === $year && $evalCount > 0) ? $rataNilai : null;
            return [
                'tahun'    => $yr,
                'nilai'    => $val,
                'predikat' => $val !== null ? $this->getPredikatSakip($val) : '-',
            ];
        }, $years);

        return [
            'summary' => [
                'opd_dievaluasi'           => count($rows),
                'rata_rata_nilai'          => $rataNilai,
                'predikat_AA'              => $predCounts['AA'] ?? 0,
                'predikat_A'               => $predCounts['A'] ?? 0,
                'predikat_BB'              => $predCounts['BB'] ?? 0,
                'predikat_B'               => $predCounts['B'] ?? 0,
                'predikat_CC'              => $predCounts['CC'] ?? 0,
                'predikat_C'               => $predCounts['C'] ?? 0,
                'predikat_D'               => $predCounts['D'] ?? 0,
                // Compatibility aliases
                'predikat_ISTIMEWA'        => $predCounts['AA'] ?? 0,
                'predikat_BAIK'            => $predCounts['A'] ?? 0,
                'predikat_BUTUH_PERBAIKAN' => $predCounts['BB'] ?? 0,
                'predikat_KURANG'          => $predCounts['B'] ?? 0,
                'predikat_SANGAT_KURANG'   => ($predCounts['CC'] ?? 0) + ($predCounts['C'] ?? 0) + ($predCounts['D'] ?? 0),
                'predikat_CC_bawah'        => ($predCounts['CC'] ?? 0) + ($predCounts['C'] ?? 0) + ($predCounts['D'] ?? 0),
            ],
            'rows'  => $rows,
            'trend' => $sakipTrend,
            'years' => $years,
            'pemda' => $sakipPemda,
        ];
    }

    // =========================================================================
    // 4. PKO PEMDA & PERANGKAT DAERAH (Item 6 & 7 Panduan)
    // =========================================================================
    public function getPkoMatrix(int $year = 2026, ?int $filterOpdId = null, ?array $opdRankRes = null, ?array $sakipRes = null): array
    {
        // Ambil ranking kinerja OPD & SAKIP (gunakan precomputed jika tersedia untuk eliminasi duplicate queries)
        $opdRankRes = $opdRankRes ?? $this->getOpdPerformanceRanking($year, $filterOpdId);
        $sakipRes   = $sakipRes   ?? $this->getSakipEvaluationMatrix($year, $filterOpdId);
        $sakipByOrg = collect($sakipRes['rows'])->keyBy('organization_id');

        // Cek evaluasi PKO riil dari model PkoEvaluation
        $yearsList = $this->resolveYears($year);
        $pkoEvalsByOrg = PkoEvaluation::where('year', $year)->get()->keyBy('organization_id');
        $allPkoEvalsByOrg = PkoEvaluation::whereIn('year', $yearsList)->get()->groupBy('organization_id');

        $pkoRows = [];
        $totalPko = 0.0;
        $countPko = 0;

        foreach ($opdRankRes['rows'] as $item) {
            $orgId = $item['id'];
            $sakipItem = $sakipByOrg->get($orgId);
            $predSakip = $sakipItem['predikat'] ?? 'BELUM DINILAI';

            $achievePct = (float) $item['rata_capaian'];

            // Sesuai panduan & instruksi: nilai dan predikat PKO berbasis Capaian Kinerja (tanpa pemotongan AKIP)
            $pkoEval = $pkoEvalsByOrg->get($orgId);
            if ($pkoEval && (float) $pkoEval->nko > 0) {
                $nilaiPko = (float) $pkoEval->nko;
                $predPko  = $pkoEval->predikat ?: $this->getPredikatPko($nilaiPko);
                $koreksi  = 0.0;
                $totalPko += $nilaiPko;
                $countPko++;
            } else {
                $koreksi  = 0.0;
                $nilaiPko = 0.0;
                $predPko  = 'BELUM DINILAI';
            }

            $yearlyPko = [];
            $orgPkoHistory = $allPkoEvalsByOrg->get($orgId, collect());
            foreach ($yearsList as $yr) {
                $histEval = $orgPkoHistory->firstWhere('year', $yr);
                if ($histEval && (float) $histEval->nko > 0) {
                    $yrNilaiPko = (float) $histEval->nko;
                    $yrPredPko  = $histEval->predikat ?: $this->getPredikatPko($yrNilaiPko);
                } elseif ($yr === $year) {
                    $yrNilaiPko = 0.0;
                    $yrPredPko  = 'BELUM DINILAI';
                } else {
                    $yrNilaiPko = null;
                    $yrPredPko  = '-';
                }

                $yearlyPko[$yr] = [
                    'year'     => $yr,
                    'nilai'    => $yrNilaiPko,
                    'predikat' => $yrPredPko,
                ];
            }

            $firstYr = $yearsList[0] ?? $year;
            $valBase = $yearlyPko[$firstYr]['nilai'] ?? $nilaiPko;
            $tren = '→';
            if ($valBase !== null && $nilaiPko > $valBase + 0.5) $tren = '↑';
            elseif ($valBase !== null && $nilaiPko < $valBase - 0.5) $tren = '↓';

            $pkoRows[] = [
                'organization_id'  => $orgId,
                'kode'             => $item['kode'],
                'perangkat_daerah' => $item['perangkat_daerah'],
                'capaian_kinerja'  => $achievePct,
                'predikat_sakip'   => $predSakip,
                'koreksi_akip'     => ($koreksi * 100) . '%',
                'nilai_pko'        => $nilaiPko,
                'predikat'         => $predPko,
                'yearly'           => $yearlyPko,
                'tren'             => $tren,
            ];
        }

        // Urutkan nilai PKO tertinggi
        usort($pkoRows, fn($a, $b) => $b['nilai_pko'] <=> $a['nilai_pko']);
        $totalOpd = count($pkoRows);
        foreach ($pkoRows as $idx => &$r) {
            $r['peringkat'] = $idx + 1;
            $r['kategori']  = $idx < 10 ? 'Top 10' : ($totalOpd - $idx <= 10 ? 'Perlu Perhatian' : 'Menengah');
        }
        unset($r);

        // Attention count: OPD yang predikat PKO-nya KURANG atau SANGAT KURANG (atau nilai < 60) hanya jika nilai_pko > 0
        $attentionRows = array_values(array_filter($pkoRows, fn($r) => $r['nilai_pko'] > 0 && (in_array(strtoupper($r['predikat']), ['KURANG', 'SANGAT KURANG', 'C', 'D']) || $r['nilai_pko'] < 60)));
        $attentionCount = count($attentionRows);

        // Top 10 OPD & OPD Membutuhkan Perhatian
        $top10 = array_slice($pkoRows, 0, min(10, $totalOpd));
        $attention10 = !empty($attentionRows) ? array_slice($attentionRows, 0, min(10, $attentionCount)) : array_slice($pkoRows, max(0, $totalOpd - 10));

        // Deret Waktu Capaian PKO Pemerintah Daerah secara Dinamis
        $years = $yearsList;
        $pkoPemdaTrend = [];

        $pemda = Organization::where('type', 'province')->first()
            ?? Organization::where('code', 'PROV-PAPBAR')->first()
            ?? Organization::find(1);

        $pkoPemdaEvals = $pemda ? PkoEvaluation::where('organization_id', $pemda->id)->get()->keyBy('year') : collect();

        foreach ($years as $yr) {
            if ($yr <= $year) {
                if ($pkoPemdaEvals->has($yr) && (float) $pkoPemdaEvals->get($yr)->nko > 0) {
                    $valYr = (float) $pkoPemdaEvals->get($yr)->nko;
                    $predYr = $pkoPemdaEvals->get($yr)->predikat ?: $this->getPredikatPko($valYr);
                } else {
                    $valYr = null;
                    $predYr = '-';
                }
                $pkoPemdaTrend[] = [
                    'tahun'    => $yr,
                    'nilai'    => $valYr,
                    'predikat' => $predYr,
                ];
            } else {
                // Data tahun yang belum ada tidak usah diproyeksikan, nilai null
                $pkoPemdaTrend[] = [
                    'tahun'    => $yr,
                    'nilai'    => null,
                    'predikat' => '-',
                ];
            }
        }

        for ($i = 0; $i < count($pkoPemdaTrend); $i++) {
            if ($i === 0 || $pkoPemdaTrend[$i]['nilai'] === null || $pkoPemdaTrend[$i - 1]['nilai'] === null) {
                $pkoPemdaTrend[$i]['tren'] = $pkoPemdaTrend[$i]['nilai'] !== null ? '→' : '-';
            } else {
                $prev = $pkoPemdaTrend[$i - 1]['nilai'];
                $curr = $pkoPemdaTrend[$i]['nilai'];
                $diff = $curr - $prev;
                $pkoPemdaTrend[$i]['tren'] = $diff > 0.05 ? '↑' : ($diff < -0.05 ? '↓' : '→');
            }
        }

        $pkoPemdaEval = null;
        if ($pemda) {
            $pkoPemdaEval = $pkoPemdaEvals->get($year);
        }

        if ($pkoPemdaEval && (float) $pkoPemdaEval->nko > 0) {
            $nilaiPkoPemda = (float) $pkoPemdaEval->nko;
            $predPkoPemda  = $pkoPemdaEval->predikat ?: $this->getPredikatPko($nilaiPkoPemda);
        } else {
            $nilaiPkoPemda = 0.0;
            $predPkoPemda  = 'BELUM DINILAI';
        }

        return [
            'years'     => $years,
            'pemda_pko' => [
                'tahun'    => $year,
                'nilai'    => $nilaiPkoPemda,
                'predikat' => $predPkoPemda,
                'trend'    => $pkoPemdaTrend,
            ],
            'opd_pko' => [
                'total_opd'       => $totalOpd,
                'rows'            => $pkoRows,
                'top_10'          => $top10,
                'attention_10'    => $attention10,
                'attention_count' => $attentionCount,
            ],
        ];
    }

    // =========================================================================
    // 5. CAPAIAN KINERJA RENCANA AKSI TRIWULAN (Item 8 Panduan)
    // Sumber data: MonitoringActionPlanOutput (Menu 4.4 Monitoring Fisik/Output)
    // =========================================================================
    public function getActionPlansMatrix(int $year = 2026, ?string $triwulan = null, ?int $filterOpdId = null): array
    {
        $tw = $triwulan && $triwulan !== 'Semua' ? $triwulan : 'TW II';

        // Peta kolom target & realisasi berdasarkan triwulan
        $twMap    = ['TW I' => '1', 'TW II' => '2', 'TW III' => '3', 'TW IV' => '4'];
        $twNum    = $twMap[$tw] ?? '2';
        $colTarget = "target_tw{$twNum}";
        $colReal   = "realisasi_tw{$twNum}";

        $allOpd = Organization::where('type', 'opd')
            ->where('is_active', true)
            ->when($filterOpdId, fn($q) => $q->where('id', $filterOpdId))
            ->orderBy('name')
            ->get();

        // Ambil dari MonitoringActionPlanOutput (Menu 4.4) bukan ActionPlan
        $monitoringItems = MonitoringActionPlanOutput::with('organization')
            ->where('year', $year)
            ->when($filterOpdId, fn($q) => $q->where('organization_id', $filterOpdId))
            ->orderBy('organization_id')
            ->orderBy('order_no')
            ->orderBy('id')
            ->get();

        $itemsByOrg = $monitoringItems->groupBy('organization_id');

        $rows = [];
        $statusCounts = ['tercapai' => 0, 'perlu_perhatian' => 0, 'terlambat' => 0, 'kritis' => 0, 'tidak_dinilai' => 0];
        $totalCapaian = 0.0;

        foreach ($monitoringItems as $idx => $item) {
            $targetVal = $item->{$colTarget} !== null ? (float) $item->{$colTarget} : null;
            $realVal   = $item->{$colReal}   !== null ? (float) $item->{$colReal}   : null;

            $polaritas = strtolower($item->measurement_pattern ?? 'Positif') === 'negatif' ? 'negatif' : 'positif';
            $cap  = ($targetVal !== null && $realVal !== null)
                ? $this->calculateCapaian($realVal, $targetVal, $polaritas)
                : null;
            $stObj = $this->getStatusCapaian($cap, $targetVal, $realVal);

            match ($stObj['status']) {
                'Tercapai'        => $statusCounts['tercapai']++,
                'Perlu Perhatian' => $statusCounts['perlu_perhatian']++,
                'Tidak Dinilai'   => $statusCounts['tidak_dinilai']++,
                default           => $statusCounts['kritis']++,
            };

            if ($cap !== null) {
                $totalCapaian += $cap;
            }

            $rows[] = [
                'no'               => $idx + 1,
                'id'               => $item->id,
                'kode'             => $item->organization?->code ?? '-',
                'perangkat_daerah' => $item->organization?->name ?? 'OPD Terkait',
                'organization_id'  => $item->organization_id,
                'rencana_aksi'     => $item->subkegiatan ?? $item->indikator_subkegiatan ?? '-',
                'indikator'        => $item->indikator_subkegiatan ?? '-',
                'satuan'           => $item->satuan ?? '-',
                'target_tw'        => $targetVal,
                'realisasi_tw'     => $realVal,
                'capaian'          => $cap,
                'status'           => $stObj['status'],
                'predikat'         => $stObj['predikat'],
                'badge'            => $stObj['badge'],
                'bgClass'          => $stObj['bgClass'],
            ];
        }

        $countWithCapaian = count(array_filter($rows, fn($r) => $r['capaian'] !== null));
        $rataCapaian = $countWithCapaian > 0 ? round($totalCapaian / $countWithCapaian, 2) : 0.0;

        // Matriks Rekapitulasi per OPD
        $opdRows = [];
        $opdStatusCounts = ['tercapai' => 0, 'perlu_perhatian' => 0, 'terlambat' => 0, 'kritis' => 0, 'tidak_dinilai' => 0];
        $totalOpdCap = 0.0;
        $countOpdWithCapaian = 0;

        foreach ($allOpd as $opd) {
            $orgItems = $itemsByOrg->get($opd->id, collect());
            $planDetails = [];
            $avgTarget = null;
            $avgReal   = null;
            $capaian   = null;

            if ($orgItems->isNotEmpty()) {
                $targets = [];
                $reals   = [];
                foreach ($orgItems as $item) {
                    $t = $item->{$colTarget} !== null ? (float) $item->{$colTarget} : null;
                    $r = $item->{$colReal}   !== null ? (float) $item->{$colReal}   : null;
                    $pol = strtolower($item->measurement_pattern ?? 'Positif') === 'negatif' ? 'negatif' : 'positif';
                    $c  = ($t !== null && $r !== null) ? $this->calculateCapaian($r, $t, $pol) : null;
                    $st = $this->getStatusCapaian($c, $t, $r);

                    if ($t !== null) $targets[] = $t;
                    if ($r !== null) $reals[]   = $r;

                    $planDetails[] = [
                        'id'        => $item->id,
                        'kode'      => $item->organization?->code ?? '-',
                        'judul'     => $item->subkegiatan ?? $item->indikator_subkegiatan ?? '-',
                        'indikator' => $item->indikator_subkegiatan ?? '-',
                        'satuan'    => $item->satuan ?? '-',
                        'target'    => $t,
                        'realisasi' => $r,
                        'capaian'   => $c,
                        'status'    => $st['status'],
                        'predikat'  => $st['predikat'],
                        'badge'     => $st['badge'],
                    ];
                }
                $avgTarget = count($targets) > 0 ? round(array_sum($targets) / count($targets), 2) : null;
                $avgReal   = count($reals)   > 0 ? round(array_sum($reals)   / count($reals),   2) : null;
                $capaian   = ($avgTarget !== null && $avgReal !== null)
                    ? $this->calculateCapaian($avgReal, $avgTarget, 'positif')
                    : null;
            }
            // Jika OPD belum input data: avgTarget/avgReal/capaian tetap null → "Tidak Dinilai"

            $stObj = $this->getStatusCapaian($capaian, $avgTarget, $avgReal);

            match ($stObj['status']) {
                'Tercapai'        => $opdStatusCounts['tercapai']++,
                'Perlu Perhatian' => $opdStatusCounts['perlu_perhatian']++,
                'Tidak Dinilai'   => $opdStatusCounts['tidak_dinilai']++,
                default           => $opdStatusCounts['kritis']++,
            };

            if ($capaian !== null) {
                $totalOpdCap += $capaian;
                $countOpdWithCapaian++;
            }

            // Tren triwulanan per OPD berdasarkan kolom aktual dari DB
            $twCols = ['1', '2', '3', '4'];
            $quarterly = [];
            foreach ($twCols as $n) {
                $tCol = "target_tw{$n}";
                $rCol = "realisasi_tw{$n}";
                // Rata-rata semua item OPD untuk TW ini
                $tVals = $orgItems->filter(fn($i) => $i->{$tCol} !== null)->map(fn($i) => (float)$i->{$tCol});
                $rVals = $orgItems->filter(fn($i) => $i->{$rCol} !== null)->map(fn($i) => (float)$i->{$rCol});
                $tAvg  = $tVals->count() > 0 ? round($tVals->avg(), 2) : null;
                $rAvg  = $rVals->count() > 0 ? round($rVals->avg(), 2) : null;
                $cap   = ($tAvg !== null && $rAvg !== null) ? $this->calculateCapaian($rAvg, $tAvg, 'positif') : null;
                $quarterly["TW {$n}"] = ['capaian' => $cap, 'status' => $this->getStatusCapaian($cap, $tAvg, $rAvg)['status']];
            }

            $q1 = $quarterly['TW 1']['capaian'];
            $q2 = $quarterly['TW 2']['capaian'] ?? $capaian;
            $tren = '→';
            if ($q2 !== null && $q1 !== null) {
                if ($q2 > $q1 + 0.5) $tren = '↑';
                elseif ($q2 < $q1 - 0.5) $tren = '↓';
            }

            $opdRows[] = [
                'organization_id' => $opd->id,
                'kode'            => $opd->code,
                'opd'             => $opd->name,
                'items_count'     => $orgItems->count(),
                'target_tw'       => $avgTarget,
                'realisasi_tw'    => $avgReal,
                'capaian'         => $capaian,
                'status'          => $stObj['status'],
                'predikat'        => $stObj['predikat'],
                'badge'           => $stObj['badge'],
                'bgClass'         => $stObj['bgClass'],
                'is_overachieved' => $capaian !== null && $capaian > 100.0,
                'tren'            => $tren,
                'quarterly'       => [
                    'TW I'   => $quarterly['TW 1'],
                    'TW II'  => $quarterly['TW 2'],
                    'TW III' => $quarterly['TW 3'],
                    'TW IV'  => $quarterly['TW 4'],
                ],
                'plans_count'     => count($planDetails),
                'plans'           => $planDetails,
            ];
        }

        // Urutkan ranking OPD dari capaian tertinggi (null di akhir)
        usort($opdRows, function ($a, $b) {
            if ($a['capaian'] === null && $b['capaian'] === null) return 0;
            if ($a['capaian'] === null) return 1;
            if ($b['capaian'] === null) return -1;
            return $b['capaian'] <=> $a['capaian'];
        });
        foreach ($opdRows as $idx => &$r) {
            $r['no'] = $idx + 1;
        }
        unset($r);

        // Tren 4 Triwulan Agregat Pemerintah Daerah (berdasarkan data aktual per TW)
        $quarterlyTrend = [];
        foreach (['1' => 'TW I', '2' => 'TW II', '3' => 'TW III', '4' => 'TW IV'] as $n => $label) {
            $tCol = "target_tw{$n}";
            $rCol = "realisasi_tw{$n}";
            $allTargets = $monitoringItems->filter(fn($i) => $i->{$tCol} !== null)->map(fn($i) => (float)$i->{$tCol});
            $allReals   = $monitoringItems->filter(fn($i) => $i->{$rCol} !== null)->map(fn($i) => (float)$i->{$rCol});
            $tAvg = $allTargets->count() > 0 ? round($allTargets->avg(), 2) : 0.0;
            $rAvg = $allReals->count()   > 0 ? round($allReals->avg(), 2)   : null;
            $cap  = ($rAvg !== null) ? $this->calculateCapaian($rAvg, $tAvg, 'positif') : null;
            $st   = $this->getStatusCapaian($cap, $tAvg, $rAvg);
            $quarterlyTrend[] = [
                'triwulan'  => $label,
                'target'    => $tAvg,
                'realisasi' => $rAvg,
                'capaian'   => $cap,
                'status'    => $st['status'],
            ];
        }

        return [
            'summary' => [
                'tahun'           => $year,
                'triwulan'        => $tw,
                'total_opd'       => count($allOpd),
                'total_renaksi'   => count($rows),
                'tercapai'        => $statusCounts['tercapai'],
                'perlu_perhatian' => $statusCounts['perlu_perhatian'],
                'terlambat'       => $statusCounts['terlambat'],
                'kritis'          => $statusCounts['kritis'],
                'tidak_dinilai'   => $statusCounts['tidak_dinilai'],
                'rata_capaian'    => $rataCapaian,
                'opd_summary'     => [
                    'tercapai'        => $opdStatusCounts['tercapai'],
                    'perlu_perhatian' => $opdStatusCounts['perlu_perhatian'],
                    'terlambat'       => $opdStatusCounts['terlambat'],
                    'kritis'          => $opdStatusCounts['kritis'],
                    'tidak_dinilai'   => $opdStatusCounts['tidak_dinilai'],
                    'rata_capaian'    => $countOpdWithCapaian > 0 ? round($totalOpdCap / $countOpdWithCapaian, 2) : 0.0,
                ],
            ],
            'opd_rows' => $opdRows,
            'rows'     => $rows,
            'trend'    => $quarterlyTrend,
            'quarters' => ['TW I', 'TW II', 'TW III', 'TW IV'],
        ];
    }

    /**
     * Monitoring Anggaran: rekapitulasi serapan keuangan per triwulan dari MonitoringActionPlanBudget.
     * Tidak menggunakan status/predikat — hanya menampilkan Pagu, Realisasi, dan Serapan (%).
     */
    public function getMonitoringBudgetMatrix(int $year = 2026, ?string $triwulan = null, ?int $filterOpdId = null): array
    {
        $tw     = $triwulan && $triwulan !== 'Semua' ? $triwulan : 'TW II';
        $twMap  = ['TW I' => 'tw1', 'TW II' => 'tw2', 'TW III' => 'tw3', 'TW IV' => 'tw4'];
        $twCol  = $twMap[$tw] ?? 'tw2';

        $allOpd = Organization::where('type', 'opd')
            ->where('is_active', true)
            ->when($filterOpdId, fn($q) => $q->where('id', $filterOpdId))
            ->orderBy('name')
            ->get();

        $items = MonitoringActionPlanBudget::with('organization')
            ->where('year', $year)
            ->when($filterOpdId, fn($q) => $q->where('organization_id', $filterOpdId))
            ->orderBy('organization_id')
            ->orderBy('order_no')
            ->get();

        $itemsByOrg = $items->groupBy('organization_id');

        // Detail rows (per item/subkegiatan)
        $rows = [];
        $totalPaguAll      = 0.0;
        $totalRealisasiAll = 0.0;

        foreach ($items as $idx => $item) {
            $pagu      = (float) ($item->{"pagu_{$twCol}"} ?? $item->pagu_tahunan ?? 0);
            $realisasi = (float) ($item->{"realisasi_{$twCol}"} ?? 0);
            $serapan   = $pagu > 0 ? round($realisasi / $pagu * 100, 2) : null;
            $stObj     = $this->getStatusCapaian($serapan, $pagu, $realisasi);

            $totalPaguAll      += $pagu;
            $totalRealisasiAll += $realisasi;

            $rows[] = [
                'no'                    => $idx + 1,
                'id'                    => $item->id,
                'organization_id'       => $item->organization_id,
                'kode'                  => $item->organization?->code ?? '-',
                'perangkat_daerah'      => $item->organization?->name ?? '-',
                'program'               => $item->program ?? '-',
                'kegiatan'              => $item->kegiatan ?? '-',
                'subkegiatan'           => $item->subkegiatan ?? '-',
                'indikator_subkegiatan' => $item->indikator_subkegiatan ?? '-',
                'pagu_tw'               => $pagu,
                'realisasi_tw'          => $realisasi,
                'serapan'               => $serapan,
                'capaian'               => $serapan,
                'status'                => $stObj['status'],
                'predikat'              => $stObj['predikat'],
                'badge'                 => $stObj['badge'],
                'bgClass'               => $stObj['bgClass'],
            ];
        }

        // OPD summary rows
        $opdRows = [];
        $budgetStatusCounts = ['tercapai' => 0, 'perlu_perhatian' => 0, 'kritis' => 0, 'tidak_dinilai' => 0];
        $totalSerapanSum = 0.0;
        $countOpdEvaluated = 0;

        foreach ($allOpd as $opd) {
            $orgItems = $itemsByOrg->get($opd->id, collect());
            $paguOpd      = 0.0;
            $realisasiOpd = 0.0;
            $itemDetails  = [];

            foreach ($orgItems as $item) {
                $p = (float) ($item->{"pagu_{$twCol}"} ?? $item->pagu_tahunan ?? 0);
                $r = (float) ($item->{"realisasi_{$twCol}"} ?? 0);
                $s = $p > 0 ? round($r / $p * 100, 2) : null;
                $st = $this->getStatusCapaian($s, $p, $r);

                $paguOpd      += $p;
                $realisasiOpd += $r;

                $itemDetails[] = [
                    'id'                    => $item->id,
                    'kode'                  => $item->organization?->code ?? '-',
                    'program'               => $item->program ?? '-',
                    'kegiatan'              => $item->kegiatan ?? '-',
                    'subkegiatan'           => $item->subkegiatan ?? '-',
                    'indikator_subkegiatan' => $item->indikator_subkegiatan ?? '-',
                    'pagu_tw'               => $p,
                    'realisasi_tw'          => $r,
                    'serapan'               => $s,
                    'status'                => $st['status'],
                    'predikat'              => $st['predikat'],
                    'badge'                 => $st['badge'],
                ];
            }

            $serapanOpd = ($orgItems->isNotEmpty() && $paguOpd > 0)
                ? round($realisasiOpd / $paguOpd * 100, 2)
                : null;
            $stObj = $this->getStatusCapaian($serapanOpd, $paguOpd, $realisasiOpd);

            match ($stObj['status']) {
                'Tercapai'        => $budgetStatusCounts['tercapai']++,
                'Perlu Perhatian' => $budgetStatusCounts['perlu_perhatian']++,
                'Tidak Dinilai'   => $budgetStatusCounts['tidak_dinilai']++,
                default           => $budgetStatusCounts['kritis']++,
            };

            if ($serapanOpd !== null) {
                $totalSerapanSum += $serapanOpd;
                $countOpdEvaluated++;
            }

            // Quarterly serapan per OPD (TW I s/d TW IV)
            $quarterly = [];
            foreach (['1' => 'TW I', '2' => 'TW II', '3' => 'TW III', '4' => 'TW IV'] as $num => $qName) {
                $colP = "pagu_tw{$num}";
                $colR = "realisasi_tw{$num}";
                $paguQ = 0.0;
                $realQ = 0.0;
                foreach ($orgItems as $item) {
                    $paguQ += (float) ($item->{$colP} ?? 0);
                    $realQ += (float) ($item->{$colR} ?? 0);
                }
                $serapanQ = ($orgItems->isNotEmpty() && $paguQ > 0) ? round($realQ / $paguQ * 100, 2) : null;
                $stQ = $this->getStatusCapaian($serapanQ, $paguQ, $realQ);
                $quarterly[$qName] = [
                    'pagu'      => $paguQ,
                    'realisasi' => $realQ,
                    'serapan'   => $serapanQ,
                    'capaian'   => $serapanQ,
                    'status'    => $stQ['status'],
                ];
            }

            $q1 = $quarterly['TW I']['serapan'];
            $q2 = $quarterly['TW II']['serapan'] ?? $serapanOpd;
            $tren = '→';
            if ($q2 !== null && $q1 !== null) {
                if ($q2 > $q1 + 0.5) $tren = '↑';
                elseif ($q2 < $q1 - 0.5) $tren = '↓';
            }

            $opdRows[] = [
                'organization_id' => $opd->id,
                'kode'            => $opd->code,
                'opd'             => $opd->name,
                'items_count'     => $orgItems->count(),
                'pagu_tw'         => $paguOpd,
                'realisasi_tw'    => $realisasiOpd,
                'serapan'         => $serapanOpd,
                'capaian'         => $serapanOpd,
                'status'          => $stObj['status'],
                'predikat'        => $stObj['predikat'],
                'badge'           => $stObj['badge'],
                'bgClass'         => $stObj['bgClass'],
                'is_overachieved' => $serapanOpd !== null && $serapanOpd > 100.0,
                'tren'            => $tren,
                'quarterly'       => $quarterly,
                'items'           => $itemDetails,
                'plans'           => $itemDetails,
            ];
        }

        // Sort OPD by serapan desc (null di akhir)
        usort($opdRows, function ($a, $b) {
            if ($a['serapan'] === null && $b['serapan'] === null) return 0;
            if ($a['serapan'] === null) return 1;
            if ($b['serapan'] === null) return -1;
            return $b['serapan'] <=> $a['serapan'];
        });
        foreach ($opdRows as $i => &$r) { $r['no'] = $i + 1; }
        unset($r);

        $totalSerapan = $totalPaguAll > 0 ? round($totalRealisasiAll / $totalPaguAll * 100, 2) : 0.0;
        $avgSerapanOpd = $countOpdEvaluated > 0 ? round($totalSerapanSum / $countOpdEvaluated, 2) : 0.0;

        // Tren 4 triwulan (agregat semua OPD)
        $quarterlyTrend = [];
        foreach (['TW I' => 'tw1', 'TW II' => 'tw2', 'TW III' => 'tw3', 'TW IV' => 'tw4'] as $label => $col) {
            $paguTw      = $items->sum(fn($i) => (float) ($i->{"pagu_{$col}"} ?? 0));
            $realisasiTw = $items->sum(fn($i) => (float) ($i->{"realisasi_{$col}"} ?? 0));
            $serapanTw   = $paguTw > 0 ? round($realisasiTw / $paguTw * 100, 2) : null;
            $st          = $this->getStatusCapaian($serapanTw, $paguTw, $realisasiTw);
            $quarterlyTrend[] = [
                'triwulan'   => $label,
                'pagu'       => $paguTw,
                'realisasi'  => $realisasiTw,
                'serapan'    => $serapanTw,
                'capaian'    => $serapanTw,
                'status'     => $st['status'],
            ];
        }

        return [
            'summary' => [
                'tahun'            => $year,
                'triwulan'         => $tw,
                'total_opd'        => count($allOpd),
                'total_items'      => count($rows),
                'total_pagu'       => $totalPaguAll,
                'total_realisasi'  => $totalRealisasiAll,
                'serapan_persen'   => $totalSerapan,
                'rata_capaian'     => $avgSerapanOpd,
                'opd_summary'      => [
                    'tercapai'        => $budgetStatusCounts['tercapai'],
                    'perlu_perhatian' => $budgetStatusCounts['perlu_perhatian'],
                    'kritis'          => $budgetStatusCounts['kritis'],
                    'tidak_dinilai'   => $budgetStatusCounts['tidak_dinilai'],
                    'rata_capaian'    => $avgSerapanOpd,
                ],
                'status_counts'    => $budgetStatusCounts,
            ],
            'opd_rows' => $opdRows,
            'rows'     => $rows,
            'trend'    => $quarterlyTrend,
            'quarters' => ['TW I', 'TW II', 'TW III', 'TW IV'],
        ];
    }
}
