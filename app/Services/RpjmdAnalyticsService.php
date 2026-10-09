<?php

namespace App\Services;

use App\Models\Indicator;
use App\Models\IndicatorTarget;
use App\Models\MeasurementPeriod;
use App\Models\Organization;
use App\Models\PlanningPeriod;
use App\Models\Realization;
use App\Models\RealizationRpjmdItem;
use App\Models\StrategicGoal;
use App\Models\StrategicObjective;
use App\Services\PerformanceMeasurementService;

class RpjmdAnalyticsService
{
    public const YEARS = [2026, 2027, 2028, 2029, 2030];

    /**
     * Resolusi siklus 5 tahunan RPJMD secara dinamis (mis. 2025 s/d 2029)
     * dan otomatis bertambah jika tahun evaluasi bergerak maju.
     */
    public function resolveRpjmdYears(int $evaluationYear = 2026): array
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
            $s = (int) date('Y', strtotime($rpjmd->start_date));
            $e = (int) date('Y', strtotime($rpjmd->end_date));
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

        // Pastikan start dan end berada dalam rentang tahun kalender valid (>= 2000)
        if ($start < 2000) {
            $start = 2025;
        }
        if ($end < $start || $end > 2100) {
            $end = $start + 4;
        }

        // Petakan indeks relatif (1..10) ke tahun kalender RPJMD (misal 1 -> 2025, 2 -> 2026)
        if ($evaluationYear >= 1 && $evaluationYear <= 10) {
            $evaluationYear = $start + $evaluationYear - 1;
        } elseif ($evaluationYear < 2000 || $evaluationYear > 2100) {
            $evaluationYear = (int) date('Y');
            if ($evaluationYear < 2000 || $evaluationYear > 2100) {
                $evaluationYear = $start;
            }
        }

        // Otomatis bertambah jika tahun evaluasi di luar rentang
        if ($evaluationYear >= 2000 && $evaluationYear <= 2100) {
            if ($evaluationYear < $start) {
                $start = $evaluationYear;
            }
            if ($evaluationYear > $end) {
                $end = $evaluationYear;
            }
        }

        // Siklus minimal 5 tahun (5 tahunan RPJMD)
        if (($end - $start + 1) < 5) {
            $end = $start + 4;
        }

        return range($start, $end);
    }

    /**
     * Hitung capaian kinerja (%) sesuai pola (Positif / Negatif).
     */
    public function calculateCapaian(?float $realization, ?float $target, string $polarization = 'positif'): ?float
    {
        if ($realization === null || $target === null) {
            return null;
        }

        if ((float) $target == 0 && (float) $realization == 0) {
            return null;
        }

        if ((float) $target == 0) {
            return 0.0;
        }

        if (strtolower($polarization) === 'negatif') {
            // Pola Negatif: (2 - (Realisasi / Target)) * 100%
            $capaian = (2 - ($realization / $target)) * 100;
        } else {
            // Pola Positif: (Realisasi / Target) * 100%
            $capaian = ($realization / $target) * 100;
        }

        return round($capaian, 2);
    }

    /**
     * Tentukan status evaluasi capaian & predikat:
     * - Ketika Nilainya Minus (< 0) => PREDIKAT: SANGAT KURANG (Status: Kritis)
     * - >= 100% => Tercapai (MEMUASKAN)
     * - 80% <= Capaian < 100% => Perlu Perhatian (BAIK)
     * - 50% <= Capaian < 80% => Terlambat (CUKUP)
     * - < 50% => Kritis (KURANG)
     */
    public function getStatusCapaian(?float $capaian, ?float $target = null, ?float $realization = null): array
    {
        if ($target !== null && $realization !== null && (float) $target == 0 && (float) $realization == 0) {
            return [
                'status'   => 'Tidak Dinilai',
                'badge'    => 'secondary',
                'predikat' => 'TIDAK DINILAI',
                'color'    => '#64748b',
                'bgClass'  => 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300',
            ];
        }

        // Aturan Khusus: Nilai Minus masuk PREDIKAT: SANGAT KURANG (Status: Kritis, Warna: Merah)
        if ($capaian !== null && $capaian < 0) {
            return [
                'status'   => 'Kritis',
                'badge'    => 'danger',
                'predikat' => 'SANGAT KURANG',
                'color'    => '#ef4444',
                'bgClass'  => 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 font-semibold',
            ];
        }

        // Jika target ada tapi realisasi belum ada / capaian null padahal target > 0 -> Kritis (Merah)
        if ($target !== null && (float) $target > 0 && ($realization === null || $capaian === null)) {
            return [
                'status'   => 'Kritis',
                'badge'    => 'danger',
                'predikat' => 'SANGAT KURANG',
                'color'    => '#ef4444',
                'bgClass'  => 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 font-semibold',
            ];
        }

        if ($capaian === null) {
            return [
                'status'   => 'Tidak Dinilai',
                'badge'    => 'secondary',
                'predikat' => 'TIDAK DINILAI',
                'color'    => '#64748b',
                'bgClass'  => 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300',
            ];
        }

        if ($capaian >= 100) {
            return [
                'status'   => 'Tercapai',
                'badge'    => 'success',
                'predikat' => 'MEMUASKAN',
                'color'    => '#10b981',
                'bgClass'  => 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300',
            ];
        }

        if ($capaian >= 50) {
            return [
                'status'   => 'Perlu Perhatian',
                'badge'    => 'warning',
                'predikat' => 'BAIK',
                'color'    => '#f59e0b',
                'bgClass'  => 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300',
            ];
        }

        return [
            'status'   => 'Kritis',
            'badge'    => 'danger',
            'predikat' => 'KURANG',
            'color'    => '#ef4444',
            'bgClass'  => 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300',
        ];
    }

    /**
     * Bangun data matriks lengkap Capaian RPJMD 5 Tahun (2025-2029).
     */
    public function getRpjmdMatrix(
        int $evaluationYear = 2026,
        ?int $filterSasaranId = null,
        ?int $filterOpdId = null,
        string $filterStatus = 'Semua'
    ): array {
        // Prioritas Utama: Ambil data indikator RPJMD dari RealizationRpjmdItem (diisi via form 4.1 Realisasi RPJMD)
        $goals = RealizationRpjmdItem::goals()
            ->with(['children' => fn($q) => $q->orderBy('order_no')->orderBy('id')])
            ->orderBy('id')
            ->get();

        $rpjmdItems = RealizationRpjmdItem::query()->orderBy('id')->get();

        if ($rpjmdItems->isNotEmpty()) {
            $years = $this->resolveRpjmdYears($evaluationYear);
            $rows = [];
            $capaianListEvalYear = [];
            $statusCountEvalYear = [
                'tercapai'        => 0,
                'perlu_perhatian' => 0,
                'kritis'          => 0,
                'tidak_dinilai'   => 0,
            ];

            // Struktur tren multi-tahun
            $trendYears = [];
            foreach ($years as $yr) {
                $trendYears[$yr] = [
                    'tahun'               => $yr,
                    'total_target'        => 0,
                    'total_realisasi'     => 0,
                    'capaian_list'        => [],
                    'tercapai_count'      => 0,
                    'perhatian_count'     => 0,
                    'kritis_count'        => 0,
                    'tidak_dinilai_count' => 0,
                    'count_evaluated'     => 0,
                ];
            }

            // Build hierarchical list: Tujuan (${gIdx}) -> Sasaran (${gIdx}.${oIdx}) -> Indikator
            $itemsToProcess = [];
            $allSasaranItems = [];
            if ($goals->isNotEmpty()) {
                // Group goals by mission so that contiguous goals under the same mission are processed together
                // and numbering restarts per mission:
                // Misi 1 -> Tujuan (1) -> Sasaran (1.1), (1.2)...
                //        -> Tujuan (2) -> Sasaran (2.1)...
                // Misi 2 -> Tujuan (1) -> Sasaran (1.1)...
                $goalsByMission = [];
                foreach ($goals as $goal) {
                    $mKey = trim($goal->mission ?: 'Misi RPJMD');
                    $goalsByMission[$mKey][] = $goal;
                }

                foreach ($goalsByMission as $missionName => $missionGoals) {
                    $gIdx = 1;
                    foreach ($missionGoals as $goal) {
                        $goalCode = "({$gIdx})";
                        if ($goal->children && $goal->children->isNotEmpty()) {
                            $oIdx = 1;
                            foreach ($goal->children as $child) {
                                $allSasaranItems[] = $child;
                                $indicators = $child->objective_indicators_list;
                                if (empty($indicators)) {
                                    $indicators = [
                                        [
                                            'id'                  => 1,
                                            'indicator'           => $child->objective_indicator ?: 'Indikator Sasaran',
                                            'unit'                => $child->unit ?? '%',
                                            'measurement_pattern' => $child->measurement_pattern ?? 'Positif',
                                            'targets'             => $child->targets ?? [],
                                            'realizations'        => $child->realizations ?? [],
                                        ]
                                    ];
                                }
                                $hasMultipleInds = count($indicators) > 1;
                                foreach ($indicators as $iIdx => $ind) {
                                    $code = $hasMultipleInds ? "({$gIdx}.{$oIdx}." . ($iIdx + 1) . ")" : "({$gIdx}.{$oIdx})";
                                    $itemsToProcess[] = [
                                        'item'           => $child,
                                        'goal_parent'    => $goal,
                                        'indicator_data' => $ind,
                                        'number_code'    => $code,
                                        'goal_code'      => $goalCode,
                                        'order_no'       => $child->order_no ?: $oIdx,
                                    ];
                                }
                                $oIdx++;
                            }
                        } else {
                            // Goal without children: process goal's own indicators
                            $allSasaranItems[] = $goal;
                            $indicators = $goal->goal_indicators_list;
                            if (empty($indicators)) {
                                $indicators = [
                                    [
                                        'id'                  => 1,
                                        'indicator'           => $goal->goal_indicator ?: 'Indikator Tujuan',
                                        'unit'                => $goal->goal_indicator_unit ?? '%',
                                        'measurement_pattern' => $goal->goal_measurement_pattern ?? 'Positif',
                                        'targets'             => $goal->goal_targets ?? $goal->targets ?? [],
                                        'realizations'        => $goal->goal_realizations ?? $goal->realizations ?? [],
                                    ]
                                ];
                            }
                            $hasMultipleInds = count($indicators) > 1;
                            foreach ($indicators as $iIdx => $ind) {
                                $code = $hasMultipleInds ? "({$gIdx}." . ($iIdx + 1) . ")" : "({$gIdx})";
                                $itemsToProcess[] = [
                                    'item'           => $goal,
                                    'goal_parent'    => null,
                                    'indicator_data' => $ind,
                                    'number_code'    => $code,
                                    'goal_code'      => $goalCode,
                                    'order_no'       => 0,
                                ];
                            }
                        }
                        $gIdx++;
                    }
                }
            } else {
                // Fallback grouping by mission + goal if no goal rows exist
                $groups = [];
                foreach ($rpjmdItems as $it) {
                    $mKey = trim($it->mission ?: 'Misi RPJMD');
                    $gKey = trim($it->goal ?: 'Tujuan RPJMD');
                    $groups[$mKey][$gKey][] = $it;
                }
                foreach ($groups as $mKey => $goalGroups) {
                    $gIdx = 1;
                    foreach ($goalGroups as $gKey => $subList) {
                        $goalCode = "({$gIdx})";
                        $oIdx = 1;
                        foreach ($subList as $it) {
                            $allSasaranItems[] = $it;
                            $indicators = $it->objective_indicators_list;
                            if (empty($indicators)) {
                                $indicators = [
                                    [
                                        'id'                  => 1,
                                        'indicator'           => $it->objective_indicator ?: ($it->goal_indicator ?: 'Indikator Sasaran'),
                                        'unit'                => $it->unit ?? '%',
                                        'measurement_pattern' => $it->measurement_pattern ?? 'Positif',
                                        'targets'             => $it->targets ?? [],
                                        'realizations'        => $it->realizations ?? [],
                                    ]
                                ];
                            }
                            $hasMultipleInds = count($indicators) > 1;
                            foreach ($indicators as $iIdx => $ind) {
                                $code = $hasMultipleInds ? "({$gIdx}.{$oIdx}." . ($iIdx + 1) . ")" : "({$gIdx}.{$oIdx})";
                                $itemsToProcess[] = [
                                    'item'           => $it,
                                    'goal_parent'    => null,
                                    'indicator_data' => $ind,
                                    'number_code'    => $code,
                                    'goal_code'      => $goalCode,
                                    'order_no'       => $oIdx,
                                ];
                            }
                            $oIdx++;
                        }
                        $gIdx++;
                    }
                }
            }

            $rowNumber = 1;
            foreach ($itemsToProcess as $entry) {
                $item = $entry['item'];
                $goalParent = $entry['goal_parent'];
                $ind = $entry['indicator_data'];
                $numberCode = $entry['number_code'];
                $goalCode = $entry['goal_code'];

                $targets = (array) ($ind['targets'] ?? []);
                $realizations = (array) ($ind['realizations'] ?? []);
                $pol = $ind['measurement_pattern'] ?? 'Positif';
                $unit = $ind['unit'] ?? '%';

                $misiName = trim($goalParent?->mission ?: ($item->mission ?: 'Misi RPJMD'));
                $tujuanName = $goalParent?->goal ?: ($item->goal ?: ($item->mission ?: 'Tujuan RPJMD'));
                $sasaranName = ($item->level ?? '') === 'goal' ? '— (Tujuan Induk) —' : ($item->objective ?: 'Sasaran RPJMD');
                $indikatorName = $ind['indicator'] ?? ($item->objective_indicator ?: ($item->goal_indicator ?: 'Indikator RPJMD'));

                // Yearly calculations
                $yearlyData = [];
                foreach ($years as $yr) {
                    $tVal = isset($targets[$yr]) && $targets[$yr] !== '' && $targets[$yr] !== null ? (float) $targets[$yr] : null;
                    $rVal = isset($realizations[$yr]) && $realizations[$yr] !== '' && $realizations[$yr] !== null ? (float) $realizations[$yr] : null;

                    $cap = PerformanceMeasurementService::calculateAchievement($tVal, $rVal, $pol);
                    $stInfo = PerformanceMeasurementService::determineStatus($cap, $tVal, $rVal);

                    $predikat = match ($stInfo['status']) {
                        'Tercapai'        => 'MEMUASKAN',
                        'Perlu Perhatian' => 'BAIK',
                        'Tidak Dinilai'   => 'TIDAK DINILAI',
                        default           => 'KURANG',
                    };

                    $yearlyData[$yr] = [
                        'target'      => $tVal,
                        'realization' => $rVal,
                        'achievement' => $cap,
                        'status'      => $stInfo['status'],
                        'predikat'    => $predikat,
                        'badge'       => $stInfo['badge'],
                        'color'       => $stInfo['color'],
                        'bgClass'     => $stInfo['bgClass'],
                    ];

                    if ($tVal !== null) $trendYears[$yr]['total_target'] += $tVal;
                    if ($rVal !== null) $trendYears[$yr]['total_realisasi'] += $rVal;
                }

                // Data untuk tahun evaluasi yang dipilih
                $evalData = $yearlyData[$evaluationYear] ?? [
                    'target'      => null,
                    'realization' => null,
                    'achievement' => null,
                    'status'      => 'Tidak Dinilai',
                    'predikat'    => 'TIDAK DINILAI',
                    'badge'       => 'secondary',
                    'color'       => '#64748b',
                    'bgClass'     => 'bg-slate-100 text-slate-700',
                ];

                // Filter status jika dipilih
                if ($filterStatus && $filterStatus !== 'Semua') {
                    if ($evalData['status'] !== $filterStatus) {
                        continue;
                    }
                }

                // Filter sasaran jika dipilih
                if ($filterSasaranId && $item->id !== (int) $filterSasaranId) {
                    continue;
                }

                if ($evalData['status'] === 'Tidak Dinilai') {
                    $statusCountEvalYear['tidak_dinilai']++;
                } elseif ($evalData['achievement'] !== null) {
                    $capaianListEvalYear[] = $evalData['achievement'];
                    match ($evalData['status']) {
                        'Tercapai'        => $statusCountEvalYear['tercapai']++,
                        'Perlu Perhatian' => $statusCountEvalYear['perlu_perhatian']++,
                        default           => $statusCountEvalYear['kritis']++,
                    };
                }

                $rows[] = [
                    'no'                     => $rowNumber++,
                    'number_code'            => $numberCode,
                    'goal_code'              => $goalCode,
                    'order_no'               => $entry['order_no'],
                    'id'                     => $item->id,
                    'kode'                   => 'IND-RPJMD-' . str_pad((string)$item->id, 3, '0', STR_PAD_LEFT) . (isset($ind['id']) ? '-' . $ind['id'] : ''),
                    'misi'                   => $misiName,
                    'tujuan'                 => $tujuanName,
                    'sasaran'                => $sasaranName,
                    'strategic_objective_id' => $item->id,
                    'indikator'              => $indikatorName,
                    'satuan'                 => $unit,
                    'polarization'           => $pol,
                    'target'                 => $evalData['target'],
                    'realisasi'              => $evalData['realization'],
                    'capaian'                => $evalData['achievement'],
                    'status'                 => $evalData['status'],
                    'predikat'               => $evalData['predikat'],
                    'badge'                  => $evalData['badge'],
                    'color'                  => $evalData['color'],
                    'bgClass'                => $evalData['bgClass'],
                    'opd_pengampu'           => 'Bappeda / Pemerintah Provinsi Papua Barat',
                    'opd_id'                 => null,
                    'yearly'                 => $yearlyData,
                ];
            }

            // Hitung tren tahunan per Sasaran (Group-Weighted Average: rata-rata indikator per sasaran dulu, lalu rata-rata sasaran)
            foreach ($years as $yr) {
                $sasaranCapList = [];
                foreach ($allSasaranItems as $sasaran) {
                    $isGoal = ($sasaran->level ?? '') === 'goal';
                    $indicators = $isGoal ? $sasaran->goal_indicators_list : $sasaran->objective_indicators_list;
                    if (empty($indicators)) {
                        $indicators = [[
                            'measurement_pattern' => $isGoal ? ($sasaran->goal_measurement_pattern ?? 'Positif') : ($sasaran->measurement_pattern ?? 'Positif'),
                            'targets'             => $isGoal ? ($sasaran->goal_targets ?? $sasaran->targets ?? []) : ($sasaran->targets ?? []),
                            'realizations'        => $isGoal ? ($sasaran->goal_realizations ?? $sasaran->realizations ?? []) : ($sasaran->realizations ?? []),
                        ]];
                    }
                    $evaluatedCaps = [];
                    foreach ($indicators as $ind) {
                        $targets = (array) ($ind['targets'] ?? []);
                        $realizations = (array) ($ind['realizations'] ?? []);
                        $t = isset($targets[$yr]) && $targets[$yr] !== '' && $targets[$yr] !== null ? (float) $targets[$yr] : null;
                        $r = isset($realizations[$yr]) && $realizations[$yr] !== '' && $realizations[$yr] !== null ? (float) $realizations[$yr] : null;
                        $pol = $ind['measurement_pattern'] ?? ($isGoal ? ($sasaran->goal_measurement_pattern ?? 'Positif') : ($sasaran->measurement_pattern ?? 'Positif'));
                        $cap = PerformanceMeasurementService::calculateAchievement($t, $r, $pol);
                        $st = PerformanceMeasurementService::determineStatus($cap, $t, $r);
                        if ($cap !== null && $st['status'] !== 'Tidak Dinilai') {
                            $evaluatedCaps[] = $cap;
                        }
                    }

                    if (!empty($evaluatedCaps)) {
                        $sasAvg = round(array_sum($evaluatedCaps) / count($evaluatedCaps), 2);
                        $sasaranCapList[] = $sasAvg;
                        if ($sasAvg >= 100) {
                            $trendYears[$yr]['tercapai_count']++;
                        } elseif ($sasAvg >= 50) {
                            $trendYears[$yr]['perhatian_count']++;
                        } else {
                            $trendYears[$yr]['kritis_count']++;
                        }
                    } else {
                        $trendYears[$yr]['tidak_dinilai_count']++;
                    }
                }
                $trendYears[$yr]['capaian_list'] = $sasaranCapList;
                $trendYears[$yr]['count_evaluated'] = count($sasaranCapList);
            }

            // Summary
            $uniqueGoals = count(array_unique(array_filter(array_column($rows, 'tujuan'))));
            $totalTujuan = $goals->isNotEmpty() ? $goals->count() : max($uniqueGoals, 1);
            $uniqueSasarans = count(array_unique(array_filter(array_column($rows, 'sasaran'))));
            $totalSasaran = count($allSasaranItems) > 0 ? count($allSasaranItems) : max($uniqueSasarans, 1);
            $totalIndikator = count($rows);

            $rataCapaian = count($capaianListEvalYear) > 0
                ? round(array_sum($capaianListEvalYear) / count($capaianListEvalYear), 2)
                : 0.0;

            $tercapai = $statusCountEvalYear['tercapai'];
            $perluPerhatian = $statusCountEvalYear['perlu_perhatian'];
            $kritis = $statusCountEvalYear['kritis'];
            $tidakDinilai = $statusCountEvalYear['tidak_dinilai'];

            $summary = [
                'total_tujuan'     => $totalTujuan,
                'total_sasaran'    => $totalSasaran,
                'total_indikator'  => $totalIndikator,
                'rata_capaian'     => $rataCapaian,
                'tercapai'         => $tercapai,
                'perlu_perhatian'  => $perluPerhatian,
                'kritis'           => $kritis,
                'tidak_dinilai'    => $tidakDinilai,
                'breakdown'        => [
                    'tercapai'        => $tercapai,
                    'perlu_perhatian' => $perluPerhatian,
                    'kritis'          => $kritis,
                    'tidak_dinilai'    => $tidakDinilai,
                ],
                'evaluation_year'  => $evaluationYear,
            ];

            // Tren per tahun
            $trendSeries = [];
            foreach ($years as $yr) {
                $cList = $trendYears[$yr]['capaian_list'];
                $avgAch = count($cList) > 0 ? round(array_sum($cList) / count($cList), 2) : null;

                $trendSeries[] = [
                    'tahun'            => $yr,
                    'target'           => 100.0,
                    'realisasi'        => $avgAch,
                    'capaian'          => $avgAch,
                    'tercapai'         => $trendYears[$yr]['tercapai_count'],
                    'perlu_perhatian'  => $trendYears[$yr]['perhatian_count'],
                    'kritis'           => $trendYears[$yr]['kritis_count'],
                    'tidak_dinilai'    => $trendYears[$yr]['tidak_dinilai_count'],
                    'status'           => $avgAch !== null ? ($avgAch >= 100 ? 'Tercapai' : ($avgAch >= 50 ? 'Perlu Perhatian' : 'Kritis')) : 'Belum Berjalan',
                ];
            }

            return [
                'summary'         => $summary,
                'trend'           => $trendSeries,
                'rows'            => $rows,
                'years'           => $years,
                'evaluation_year' => $evaluationYear,
            ];
        }

        // Fallback: Ambil dari master indikator (memiliki sasaran strategis & periode RPJMD)
        $query = Indicator::query()
            ->with([
                'strategicGoal:id,code,name',
                'strategicObjective:id,code,name,strategic_goal_id',
                'ownerOrganization:id,code,name',
                'measurementUnit:id,code,name,symbol',
                'currentVersion:id,indicator_id,name',
            ])
            ->whereNotNull('strategic_objective_id')
            ->where('code', 'like', 'IND-%')
            ->where('status', 'active');

        if ($filterSasaranId) {
            $query->where('strategic_objective_id', $filterSasaranId);
        }

        if ($filterOpdId) {
            $query->where('owner_organization_id', $filterOpdId);
        }

        $indicators = $query->orderBy('code')->get();

        // 2. Tentukan deret tahun 5 tahunan RPJMD dinamis
        $years = $this->resolveRpjmdYears($evaluationYear);

        // Pre-fetch target dan realisasi untuk seluruh tahun dalam siklus
        $versionIds = $indicators->pluck('current_version_id')->filter()->unique()->values()->all();

        $allTargets = IndicatorTarget::query()
            ->whereIn('indicator_version_id', $versionIds)
            ->whereIn('year', $years)
            ->get()
            ->groupBy(fn ($t) => "{$t->indicator_version_id}_{$t->year}");

        $allRealizations = Realization::query()
            ->whereIn('indicator_version_id', $versionIds)
            ->whereIn('status', ['approved', 'submitted'])
            ->with('measurementPeriod')
            ->orderByDesc('updated_at')
            ->get();

        // Kelompokkan realisasi per version_id dan tahun
        $realizationsByVersionAndYear = [];
        foreach ($allRealizations as $real) {
            $yr = null;
            if ($real->measurementPeriod?->start_date) {
                $yr = (int) date('Y', strtotime($real->measurementPeriod->start_date));
            } elseif (preg_match('/20\d{2}/', $real->measurementPeriod?->code ?? '', $matches)) {
                $yr = (int) $matches[0];
            } else {
                $yr = $evaluationYear;
            }

            $key = "{$real->indicator_version_id}_{$yr}";
            if (!isset($realizationsByVersionAndYear[$key])) {
                $realizationsByVersionAndYear[$key] = (float) $real->value;
            }
        }

        // 3. Bangun baris data matriks
        $rows = [];
        $capaianListEvalYear = [];
        $statusCountEvalYear = [
            'tercapai'        => 0,
            'perlu_perhatian' => 0,
            'kritis'          => 0,
            'tidak_dinilai'   => 0,
        ];

        // Struktur agregat multi-tahun
        $trendYears = [];
        foreach ($years as $yr) {
            $trendYears[$yr] = [
                'tahun'            => $yr,
                'total_target'     => 0,
                'total_realisasi'  => 0,
                'capaian_list'     => [],
                'tercapai_count'   => 0,
                'perhatian_count'  => 0,
                'kritis_count'     => 0,
                'count_evaluated'  => 0,
            ];
        }

        $goalGroups = [];
        foreach ($indicators as $ind) {
            $gKey = $ind->strategicGoal?->name ?? ($ind->strategicObjective?->strategicGoal?->name ?? 'Tujuan RPJMD');
            $goalGroups[$gKey][] = $ind;
        }

        $itemsToProcess = [];
        $gIdx = 1;
        foreach ($goalGroups as $subInds) {
            $goalCode = "({$gIdx})";
            $oIdx = 1;
            foreach ($subInds as $ind) {
                $itemsToProcess[] = [
                    'indicator'   => $ind,
                    'number_code' => "({$gIdx}.{$oIdx})",
                    'goal_code'   => $goalCode,
                    'order_no'    => $oIdx,
                ];
                $oIdx++;
            }
            $gIdx++;
        }

        $rowNumber = 1;
        foreach ($itemsToProcess as $entry) {
            $ind = $entry['indicator'];
            $numberCode = $entry['number_code'];
            $goalCode = $entry['goal_code'];
            $versionId = $ind->current_version_id;
            $polarization = $ind->polarization ?? 'positif';
            $unit = $ind->measurementUnit?->symbol
                ?? $ind->measurementUnit?->name
                ?? '%';

            $tujuanName = $ind->strategicGoal?->name
                ?? ($ind->strategicObjective?->strategicGoal?->name ?? 'Meningkatkan Kualitas SDM dan Kesejahteraan Daerah');
            $sasaranName = $ind->strategicObjective?->name
                ?? 'Meningkatnya Kualitas SDM dan Pelayanan Publik';

            // Hitung data per tahun dinamis
            $yearlyData = [];
            foreach ($years as $yr) {
                $targetRecord = $allTargets->get("{$versionId}_{$yr}")?->first();
                $targetVal = $targetRecord !== null ? (float) $targetRecord->target_value : null;

                // Cek realisasi dari database
                $realVal = $realizationsByVersionAndYear["{$versionId}_{$yr}"] ?? null;

                $cap = $this->calculateCapaian($realVal, $targetVal, $polarization);
                $stInfo = $this->getStatusCapaian($cap, $targetVal, $realVal);

                $yearlyData[$yr] = [
                    'target'      => $targetVal,
                    'realization' => $realVal,
                    'achievement' => $cap,
                    'status'      => $stInfo['status'],
                    'predikat'    => $stInfo['predikat'],
                    'badge'       => $stInfo['badge'],
                    'color'       => $stInfo['color'],
                    'bgClass'     => $stInfo['bgClass'],
                ];

                // Akumulasi ke trend multi-tahun
                if ($cap !== null && $stInfo['status'] !== 'Tidak Dinilai') {
                    $trendYears[$yr]['capaian_list'][] = $cap;
                    $trendYears[$yr]['count_evaluated']++;
                    if ($targetVal !== null) $trendYears[$yr]['total_target'] += $targetVal;
                    if ($realVal !== null) $trendYears[$yr]['total_realisasi'] += $realVal;

                    if ($cap >= 100) {
                        $trendYears[$yr]['tercapai_count']++;
                    } elseif ($cap >= 50) {
                        $trendYears[$yr]['perhatian_count']++;
                    } else {
                        $trendYears[$yr]['kritis_count']++;
                    }
                }
            }

            // Data untuk tahun evaluasi yang dipilih (default 2026)
            $evalData = $yearlyData[$evaluationYear] ?? [
                'target'      => null,
                'realization' => null,
                'achievement' => null,
                'status'      => 'Tidak Dinilai',
                'predikat'    => 'TIDAK DINILAI',
                'badge'       => 'secondary',
                'color'       => '#64748b',
                'bgClass'     => 'bg-slate-100 text-slate-700',
            ];

            // Filter status jika dipilih
            if ($filterStatus !== 'Semua') {
                $statusEval = $evalData['status'];
                if ($statusEval !== $filterStatus) {
                    continue;
                }
            }

            if ($evalData['status'] === 'Tidak Dinilai') {
                $statusCountEvalYear['tidak_dinilai']++;
            } elseif ($evalData['achievement'] !== null) {
                $capaianListEvalYear[] = $evalData['achievement'];

                match ($evalData['status']) {
                    'Tercapai'        => $statusCountEvalYear['tercapai']++,
                    'Perlu Perhatian' => $statusCountEvalYear['perlu_perhatian']++,
                    default           => $statusCountEvalYear['kritis']++,
                };
            }

            $rows[] = [
                'no'                     => $rowNumber++,
                'number_code'            => $numberCode,
                'goal_code'              => $goalCode,
                'order_no'               => $entry['order_no'],
                'id'                     => $ind->id,
                'kode'                   => $ind->code,
                'misi'                   => 'Misi RPJMD',
                'tujuan'                 => $tujuanName,
                'sasaran'                => $sasaranName,
                'strategic_objective_id' => $ind->strategic_objective_id,
                'indikator'              => $ind->currentVersion?->name ?? $ind->name,
                'satuan'                 => $unit,
                'polarization'           => $polarization,
                'target'                 => $evalData['target'],
                'realisasi'              => $evalData['realization'],
                'capaian'                => $evalData['achievement'],
                'status'                 => $evalData['status'],
                'predikat'               => $evalData['predikat'],
                'badge'                  => $evalData['badge'],
                'color'                  => $evalData['color'],
                'bgClass'                => $evalData['bgClass'],
                'opd_pengampu'           => $ind->ownerOrganization?->name ?? 'Bappeda dan OPD terkait',
                'opd_id'                 => $ind->owner_organization_id,
                'yearly'                 => $yearlyData,
            ];
        }

        // 4. Hitung Kartu Utama (Executive Summary)
        $uniqueSasaranCount = count(array_unique(array_filter(array_column($rows, 'strategic_objective_id'))));
        $rpjmdSasaranDbCount = StrategicObjective::where('code', 'like', 'SAS-PEMDA-%')->count();
        $totalSasaran = $filterSasaranId ? 1 : ($filterOpdId ? $uniqueSasaranCount : $rpjmdSasaranDbCount);

        $totalTujuan = count($goalGroups) > 0 ? count($goalGroups) : max(StrategicGoal::count(), 1);
        $totalIndikator = count($rows);

        $rataCapaian = count($capaianListEvalYear) > 0
            ? round(array_sum($capaianListEvalYear) / count($capaianListEvalYear), 2)
            : 0.0;

        $tercapai = $statusCountEvalYear['tercapai'];
        $perluPerhatian = $statusCountEvalYear['perlu_perhatian'];
        $kritis = $statusCountEvalYear['kritis'];
        $tidakDinilai = $statusCountEvalYear['tidak_dinilai'];

        $summary = [
            'total_tujuan'     => $totalTujuan,
            'total_sasaran'    => $totalSasaran,
            'total_indikator'  => $totalIndikator,
            'rata_capaian'     => $rataCapaian,
            'tercapai'         => $tercapai,
            'perlu_perhatian'  => $perluPerhatian,
            'kritis'           => $kritis,
            'tidak_dinilai'    => $tidakDinilai,
            'breakdown'        => [
                'tercapai'        => $tercapai,
                'perlu_perhatian' => $perluPerhatian,
                'kritis'          => $kritis,
                'tidak_dinilai'    => $tidakDinilai,
            ],
            'evaluation_year'  => $evaluationYear,
        ];

        // 5. Hitung deret tren dinamis
        $trendSeries = [];
        foreach ($years as $yr) {
            $cList = $trendYears[$yr]['capaian_list'];
            $avgAch = count($cList) > 0 ? round(array_sum($cList) / count($cList), 2) : null;

            $trendSeries[] = [
                'tahun'            => $yr,
                'target'           => 100.0,
                'realisasi'        => $avgAch,
                'capaian'          => $avgAch,
                'tercapai'         => $trendYears[$yr]['tercapai_count'],
                'perlu_perhatian'  => $trendYears[$yr]['perhatian_count'],
                'kritis'           => $trendYears[$yr]['kritis_count'],
                'status'           => $avgAch !== null ? ($avgAch >= 100 ? 'Tercapai' : ($avgAch >= 50 ? 'Perlu Perhatian' : 'Kritis')) : 'Belum Berjalan',
            ];
        }

        return [
            'summary'         => $summary,
            'trend'           => $trendSeries,
            'rows'            => $rows,
            'years'           => $years,
            'evaluation_year' => $evaluationYear,
        ];
    }
}
