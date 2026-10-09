<?php

namespace Database\Seeders;

use App\Models\Indicator;
use App\Models\IndicatorTarget;
use App\Models\IndicatorVersion;
use App\Models\MeasurementUnit;
use App\Models\Organization;
use App\Models\PlanningPeriod;
use Illuminate\Database\Seeder;

class MasterIndicatorSeeder extends Seeder
{
    /**
     * Menyiapkan contoh indikator kinerja berjenjang untuk OPD Induk,
     * Sekretariat, dan Bidang.
     */
    public function run(): void
    {
        $rootOpd = Organization::where('code', 'OPD-INDUK')->firstOrFail();
        $sekretariat = Organization::where('code', 'SEKRETARIAT')->firstOrFail();
        $bidang1 = Organization::where('code', 'BIDANG-1')->firstOrFail();
        $bidang2 = Organization::where('code', 'BIDANG-2')->firstOrFail();

        $pctUnit = MeasurementUnit::where('code', 'PCT')->firstOrFail();
        $dokUnit = MeasurementUnit::where('code', 'DOK')->firstOrFail();
        $nilaiUnit = MeasurementUnit::where('code', 'NILAI')->firstOrFail();

        $pp2026 = PlanningPeriod::where('code', 'TA-2026')->firstOrFail();

        $indicators = [
            // 1. IKU Level OPD (Induk)
            [
                'code' => 'IKU-OPD-01',
                'name' => 'Indeks Kepuasan Layanan Pendidikan Daerah',
                'type' => 'outcome',
                'direction' => 'higher_is_better',
                'measurement_unit_id' => $nilaiUnit->id,
                'frequency' => 'annual',
                'level' => 'perangkat_daerah',
                'polarization' => 'positif',
                'owner_organization_id' => $rootOpd->id,
                'target_value' => 85.0,
            ],
            [
                'code' => 'IKU-OPD-02',
                'name' => 'Tingkat Partisipasi Sekolah Dasar & Menengah',
                'type' => 'outcome',
                'direction' => 'higher_is_better',
                'measurement_unit_id' => $pctUnit->id,
                'frequency' => 'quarterly',
                'level' => 'perangkat_daerah',
                'polarization' => 'positif',
                'owner_organization_id' => $rootOpd->id,
                'target_value' => 96.5,
            ],

            // 2. IKU Level Sekretariat
            [
                'code' => 'IKU-SEKR-01',
                'name' => 'Nilai Akuntabilitas Kinerja Instansi Pemerintah (SAKIP) Dinas',
                'type' => 'outcome',
                'direction' => 'higher_is_better',
                'measurement_unit_id' => $nilaiUnit->id,
                'frequency' => 'annual',
                'level' => 'perangkat_daerah',
                'polarization' => 'positif',
                'owner_organization_id' => $sekretariat->id,
                'target_value' => 82.0,
            ],
            [
                'code' => 'IKU-SEKR-02',
                'name' => 'Persentase Kepatuhan Pengelolaan Administrasi & Keuangan',
                'type' => 'output',
                'direction' => 'higher_is_better',
                'measurement_unit_id' => $pctUnit->id,
                'frequency' => 'quarterly',
                'level' => 'perangkat_daerah',
                'polarization' => 'positif',
                'owner_organization_id' => $sekretariat->id,
                'target_value' => 100.0,
            ],

            // 3. IKU Level Bidang Dikdas
            [
                'code' => 'IKU-DIKDAS-01',
                'name' => 'Persentase Sekolah Dasar Terakreditasi Minimal B',
                'type' => 'output',
                'direction' => 'higher_is_better',
                'measurement_unit_id' => $pctUnit->id,
                'frequency' => 'quarterly',
                'level' => 'perangkat_daerah',
                'polarization' => 'positif',
                'owner_organization_id' => $bidang1->id,
                'target_value' => 88.0,
            ],

            // 4. IKU Level Bidang Dikmen
            [
                'code' => 'IKU-DIKMEN-01',
                'name' => 'Angka Kelulusan Siswa Menengah dan Kejuruan Berstandar Kompetensi',
                'type' => 'output',
                'direction' => 'higher_is_better',
                'measurement_unit_id' => $pctUnit->id,
                'frequency' => 'quarterly',
                'level' => 'perangkat_daerah',
                'polarization' => 'positif',
                'owner_organization_id' => $bidang2->id,
                'target_value' => 95.0,
            ],
        ];

        foreach ($indicators as $indData) {
            $targetVal = $indData['target_value'];
            unset($indData['target_value']);

            $indicator = Indicator::updateOrCreate(
                ['code' => $indData['code']],
                array_merge($indData, [
                    'is_iku' => true,
                    'status' => 'active',
                ])
            );

            $version = IndicatorVersion::updateOrCreate(
                [
                    'indicator_id' => $indicator->id,
                    'version_number' => 1,
                ],
                [
                    'name' => $indicator->name,
                    'type' => $indicator->type,
                    'direction' => $indicator->direction,
                    'measurement_unit_id' => $indicator->measurement_unit_id,
                    'frequency' => $indicator->frequency,
                ]
            );

            $indicator->update(['current_version_id' => $version->id]);

            IndicatorTarget::updateOrCreate(
                [
                    'indicator_version_id' => $version->id,
                    'organization_id' => $indicator->owner_organization_id,
                    'planning_period_id' => $pp2026->id,
                ],
                [
                    'target_value' => $targetVal,
                    'status' => 'approved',
                ]
            );
        }
    }
}
