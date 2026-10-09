<?php

namespace Database\Seeders;

use App\Models\MonitoringActionPlanBudget;
use App\Models\MonitoringActionPlanOutput;
use App\Models\Organization;
use App\Models\RealizationIkuItem;
use App\Models\RealizationOpdItem;
use App\Models\RealizationRpjmdItem;
use App\Models\User;
use Illuminate\Database\Seeder;

class PerformanceMeasurementSampleSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::first();
        $adminId = $admin?->id;

        // 4.1 RPJMD Indicators Synchronization (35 Indikator Sasaran RPJMD Pemda)
        $rpjmdIndicators = \App\Models\Indicator::query()
            ->with([
                'strategicGoal:id,code,name',
                'strategicObjective:id,code,name,strategic_goal_id',
                'measurementUnit:id,code,name,symbol',
                'currentVersion:id,indicator_id,name',
            ])
            ->whereNotNull('strategic_objective_id')
            ->where('code', 'like', 'IND-%')
            ->where('status', 'active')
            ->orderBy('code')
            ->get();

        if ($rpjmdIndicators->isNotEmpty()) {
            RealizationRpjmdItem::where('objective_indicator', 'Persentase Kawasan Bebas Genangan / Banjir')->delete();
            $years = [2025, 2026, 2027, 2028, 2029, 2030];
            $versionIds = $rpjmdIndicators->pluck('current_version_id')->filter()->unique()->values()->all();

            $allTargets = \App\Models\IndicatorTarget::query()
                ->whereIn('indicator_version_id', $versionIds)
                ->whereIn('year', $years)
                ->get()
                ->groupBy(fn ($t) => "{$t->indicator_version_id}_{$t->year}");

            $allRealizations = \App\Models\Realization::query()
                ->whereIn('indicator_version_id', $versionIds)
                ->whereIn('status', ['approved', 'submitted'])
                ->with('measurementPeriod')
                ->orderByDesc('updated_at')
                ->get();

            $realsByVerAndYear = [];
            foreach ($allRealizations as $real) {
                $yr = null;
                if ($real->measurementPeriod?->start_date) {
                    $yr = (int) date('Y', strtotime($real->measurementPeriod->start_date));
                } elseif (preg_match('/20\d{2}/', $real->measurementPeriod?->code ?? '', $matches)) {
                    $yr = (int) $matches[0];
                } else {
                    $yr = 2026;
                }
                $key = "{$real->indicator_version_id}_{$yr}";
                if (!isset($realsByVerAndYear[$key])) {
                    $realsByVerAndYear[$key] = (float) $real->value;
                }
            }

            $orderPerGoal = [];
            foreach ($rpjmdIndicators as $ind) {
                $versionId = $ind->current_version_id;
                $indName = $ind->currentVersion?->name ?? $ind->name;
                $polarization = strtolower($ind->polarization ?? 'positif') === 'negatif' ? 'Negatif' : 'Positif';
                $unit = $ind->measurementUnit?->symbol ?? $ind->measurementUnit?->name ?? '%';
                $tujuan = $ind->strategicGoal?->name ?? 'Meningkatkan Kualitas SDM dan Kesejahteraan Daerah Papua Barat';
                $sasaran = $ind->strategicObjective?->name ?? 'Meningkatnya Kualitas Tata Kelola dan Pelayanan Publik';
                $mission = 'Mewujudkan Pembangunan Wilayah Papua Barat yang Berkelanjutan dan Merata';

                $targets = [];
                $realizations = [];

                foreach ($years as $yr) {
                    $tRec = $allTargets->get("{$versionId}_{$yr}")?->first();
                    $tVal = $tRec !== null ? (float) $tRec->target_value : null;
                    $rVal = $realsByVerAndYear["{$versionId}_{$yr}"] ?? null;

                    if ($rVal === null && $yr === 2025 && $tVal !== null) {
                        $rVal = round($tVal * 0.902, 2);
                    }

                    $targets[(string)$yr] = $tVal;
                    $realizations[(string)$yr] = $rVal;
                }

                // Ensure parent Goal exists
                $parentGoal = RealizationRpjmdItem::firstOrCreate(
                    [
                        'level'   => 'goal',
                        'mission' => $mission,
                        'goal'    => $tujuan,
                    ],
                    [
                        'parent_id'                => null,
                        'order_no'                 => 0,
                        'goal_indicator'           => 'Indikator Makro: ' . $tujuan,
                        'goal_indicator_unit'      => '%',
                        'goal_measurement_pattern' => 'Positif',
                        'unit'                     => '%',
                        'measurement_pattern'      => 'Positif',
                        'created_by'               => $adminId,
                    ]
                );

                if (!isset($orderPerGoal[$parentGoal->id])) {
                    $orderPerGoal[$parentGoal->id] = 1;
                } else {
                    $orderPerGoal[$parentGoal->id]++;
                }

                RealizationRpjmdItem::updateOrCreate(
                    ['objective_indicator' => $indName],
                    [
                        'parent_id'           => $parentGoal->id,
                        'level'               => 'objective',
                        'order_no'            => $orderPerGoal[$parentGoal->id],
                        'mission'             => $mission,
                        'goal'                => $tujuan,
                        'goal_indicator'      => $parentGoal->goal_indicator,
                        'goal_indicator_unit' => $parentGoal->goal_indicator_unit,
                        'objective'           => $sasaran,
                        'unit'                => $unit,
                        'measurement_pattern' => $polarization,
                        'targets'             => $targets,
                        'realizations'        => $realizations,
                        'created_by'          => $adminId,
                    ]
                );
            }
        }

        // 4.2 IKU PEMDA - Sinkronisasi dari Indikator IKU Pemda
        $ikuIndicators = \App\Models\Indicator::query()
            ->where('is_iku', true)
            ->where(function ($q) {
                $q->where('level', 'pemda')
                  ->orWhereNull('owner_organization_id')
                  ->orWhereHas('organization', fn($o) => $o->where('type', 'province')->orWhere('code', 'BAPPEDA-PB'));
            })
            ->where('status', 'active')
            ->with(['currentVersion', 'measurementUnit', 'strategicObjective'])
            ->orderBy('code')
            ->get();

        if ($ikuIndicators->isNotEmpty()) {
            $ikuVersionIds = $ikuIndicators->pluck('current_version_id')->filter()->all();

            $ikuTargets = \App\Models\IndicatorTarget::query()
                ->whereIn('indicator_version_id', $ikuVersionIds)
                ->whereIn('year', $years)
                ->get()
                ->groupBy(fn ($t) => "{$t->indicator_version_id}_{$t->year}");

            $ikuRealizations = \App\Models\Realization::query()
                ->whereIn('indicator_version_id', $ikuVersionIds)
                ->whereIn('status', ['approved', 'submitted'])
                ->with('measurementPeriod')
                ->orderByDesc('updated_at')
                ->get();

            $ikuRealsByVerAndYear = [];
            foreach ($ikuRealizations as $real) {
                $yr = null;
                if ($real->measurementPeriod?->start_date) {
                    $yr = (int) date('Y', strtotime($real->measurementPeriod->start_date));
                } elseif (preg_match('/20\d{2}/', $real->measurementPeriod?->code ?? '', $matches)) {
                    $yr = (int) $matches[0];
                } else {
                    $yr = 2026;
                }
                $key = "{$real->indicator_version_id}_{$yr}";
                if (!isset($ikuRealsByVerAndYear[$key])) {
                    $ikuRealsByVerAndYear[$key] = (float) $real->value;
                }
            }

            foreach ($ikuIndicators as $ind) {
                $versionId = $ind->current_version_id;
                $indName = $ind->currentVersion?->name ?? $ind->name;
                $polarization = strtolower($ind->polarization ?? 'positif') === 'negatif' ? 'Negatif' : 'Positif';
                $unit = $ind->measurementUnit?->symbol ?? $ind->measurementUnit?->name ?? '%';

                $targets = [];
                $realizations = [];

                foreach ($years as $yr) {
                    $tRec = $ikuTargets->get("{$versionId}_{$yr}")?->first();
                    $tVal = $tRec !== null ? (float) $tRec->target_value : null;
                    $rVal = $ikuRealsByVerAndYear["{$versionId}_{$yr}"] ?? null;

                    if (str_contains(strtolower($indName), 'sakip')) {
                        $rVal = 86.00;
                    } elseif ($rVal === null && $yr === 2025 && $tVal !== null) {
                        $rVal = round($tVal * 0.902, 2);
                    }

                    $targets[(string)$yr] = $tVal;
                    $realizations[(string)$yr] = $rVal;
                }

                RealizationIkuItem::updateOrCreate(
                    ['indicator_name' => $indName],
                    [
                        'unit' => $unit,
                        'measurement_pattern' => $polarization,
                        'targets' => $targets,
                        'realizations' => $realizations,
                        'created_by' => $adminId,
                    ]
                );
            }
        }

        // Get sample organization (e.g. Dinas PUPR or first organization)
        $org = Organization::where('name', 'like', '%Pekerjaan Umum%')
            ->orWhere('name', 'like', '%PUPR%')
            ->first() ?? Organization::first();

        if ($org) {
            // 4.3 Sample Realisasi OPD (Hierarkis: 1 Tujuan membawahi 2 Sasaran)
            if (RealizationOpdItem::where('organization_id', $org->id)->count() === 0) {
                $goalItem = RealizationOpdItem::create([
                    'organization_id'          => $org->id,
                    'parent_id'                => null,
                    'level'                    => 'goal',
                    'order_no'                 => 0,
                    'goal'                     => 'Meningkatnya Kualitas dan Pemerataan Pelayanan Infrastruktur Publik',
                    'goal_indicator'           => 'Indeks Kepuasan Layanan Infrastruktur',
                    'goal_indicator_unit'      => 'Poin',
                    'goal_measurement_pattern' => 'Positif',
                    'goal_targets'             => ['2025' => 75, '2026' => 80, '2027' => 82, '2028' => 85, '2029' => 88, '2030' => 90],
                    'goal_realizations'        => ['2025' => 76, '2026' => 81, '2027' => null, '2028' => null, '2029' => null, '2030' => null],
                    'created_by'               => $adminId,
                ]);

                // Sasaran (1.1)
                RealizationOpdItem::create([
                    'organization_id'     => $org->id,
                    'parent_id'           => $goalItem->id,
                    'level'               => 'objective',
                    'order_no'            => 1,
                    'goal'                => $goalItem->goal,
                    'goal_indicator'      => $goalItem->goal_indicator,
                    'goal_indicator_unit' => $goalItem->goal_indicator_unit,
                    'objective'           => 'Meningkatnya Efektivitas dan Realisasi Kinerja Bidang Permukiman dan Sanitasi',
                    'objective_indicator' => 'Persentase Sarana Prasarana Sesuai SPM',
                    'unit'                => '%',
                    'measurement_pattern' => 'Positif',
                    'targets'             => ['2025' => 80, '2026' => 85, '2027' => 88, '2028' => 90, '2029' => 92, '2030' => 95],
                    'realizations'        => ['2025' => 82, '2026' => 86, '2027' => null, '2028' => null, '2029' => null, '2030' => null],
                    'created_by'          => $adminId,
                ]);

                // Sasaran (1.2)
                RealizationOpdItem::create([
                    'organization_id'     => $org->id,
                    'parent_id'           => $goalItem->id,
                    'level'               => 'objective',
                    'order_no'            => 2,
                    'goal'                => $goalItem->goal,
                    'goal_indicator'      => $goalItem->goal_indicator,
                    'goal_indicator_unit' => $goalItem->goal_indicator_unit,
                    'objective'           => 'Meningkatnya Konektivitas dan Kelayakan Jaringan Jalan Provinsi',
                    'objective_indicator' => 'Persentase Kemantapan Jalan Provinsi',
                    'unit'                => '%',
                    'measurement_pattern' => 'Positif',
                    'targets'             => ['2025' => 70, '2026' => 75, '2027' => 78, '2028' => 82, '2029' => 85, '2030' => 88],
                    'realizations'        => ['2025' => 72, '2026' => 74, '2027' => null, '2028' => null, '2029' => null, '2030' => null],
                    'created_by'          => $adminId,
                ]);
            }

            // 4.4 Sample Kinerja Fisik / Output (From Client Screenshot)
            if (MonitoringActionPlanOutput::where('organization_id', $org->id)->where('year', 2026)->count() === 0) {
                MonitoringActionPlanOutput::create([
                    'organization_id' => $org->id,
                    'year' => 2026,
                    'order_no' => 1,
                    'sasaran_strategis' => 'Meningkatnya kualitas prasarana lingkungan, infrastruktur sumber daya air, dan penyelenggaraan konstruksi daerah',
                    'indikator_sasaran' => 'Indeks Kualitas Prasarana Lingkungan, Infrastruktur Sumber Daya Air, dan Penyelenggaraan Konstruksi Daerah.',
                    'target_sasaran_tahunan' => 75.00,
                    'program' => 'Program Pengelolaan dan Pengembangan Sistem Drainase',
                    'kegiatan' => 'Pengelolaan dan Pengembangan Sistem Drainase Kabupaten/Kota',
                    'subkegiatan' => 'Pembangunan Sistem Drainase Lingkungan',
                    'indikator_subkegiatan' => 'Panjang drainase lingkungan yang dibangun',
                    'satuan' => 'meter',
                    'measurement_pattern' => 'Positif',
                    'target_output_tahunan' => 1000.0,
                    'target_tw1' => 0.0,
                    'target_tw2' => 250.0,
                    'target_tw3' => 700.0,
                    'target_tw4' => 1000.0,
                    'realisasi_tw1' => 0.0,
                    'realisasi_tw2' => 250.0,
                    'realisasi_tw3' => 680.0,
                    'realisasi_tw4' => 1000.0,
                    'person_in_charge' => 'Bidang Cipta Karya / Seksi Penyehatan Prasarana',
                    'created_by' => $adminId,
                ]);
            }

            // 4.5 Sample Kinerja Anggaran (From Client Screenshot)
            if (MonitoringActionPlanBudget::where('organization_id', $org->id)->where('year', 2026)->count() === 0) {
                MonitoringActionPlanBudget::create([
                    'organization_id' => $org->id,
                    'year' => 2026,
                    'order_no' => 1,
                    'sasaran_strategis' => 'Meningkatnya kualitas prasarana lingkungan, infrastruktur sumber daya air, dan penyelenggaraan konstruksi daerah',
                    'indikator_sasaran' => 'Indeks Kualitas Prasarana Lingkungan, Infrastruktur Sumber Daya Air, dan Penyelenggaraan Konstruksi Daerah.',
                    'target_sasaran_tahunan' => 75.00,
                    'program' => 'Program Pengelolaan dan Pengembangan Sistem Drainase',
                    'kegiatan' => 'Pengelolaan dan Pengembangan Sistem Drainase Kabupaten/Kota',
                    'subkegiatan' => 'Pembangunan Sistem Drainase Lingkungan',
                    'indikator_subkegiatan' => 'Panjang drainase lingkungan yang dibangun',
                    'satuan' => 'meter',
                    'pagu_tahunan' => 1000000.00,
                    'pagu_tw1' => 0.0,
                    'pagu_tw2' => 0.0,
                    'pagu_tw3' => 0.0,
                    'pagu_tw4' => 1000000.00,
                    'realisasi_tw1' => 0.0,
                    'realisasi_tw2' => 0.0,
                    'realisasi_tw3' => 0.0,
                    'realisasi_tw4' => 1000000.00,
                    'penanggung_jawab_utama' => 'Bidang Cipta Karya',
                    'pengampu_teknis' => 'Seksi Penyehatan Prasarana Permukiman',
                    'created_by' => $adminId,
                ]);
            }
        }
    }
}
