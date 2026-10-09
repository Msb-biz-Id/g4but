<?php

namespace Database\Seeders;

use App\Models\AlertRule;
use App\Models\MeasurementPeriod;
use App\Models\MeasurementUnit;
use App\Models\PerformancePeriod;
use App\Models\PlanningPeriod;
use Illuminate\Database\Seeder;

class PeriodSeeder extends Seeder
{
    /**
     * Menyiapkan Master Periode Perencanaan, Periode Kinerja Tahunan,
     * Triwulan Pengukuran, Satuan Ukur, dan Aturan Peringatan Dini (EWS).
     */
    public function run(): void
    {
        // 1. Planning Period (Tahunan 2026)
        $pp2026 = PlanningPeriod::updateOrCreate(
            ['code' => 'TA-2026'],
            [
                'name' => 'Tahun Anggaran 2026',
                'year' => 2026,
                'type' => 'annual',
                'start_date' => '2026-01-01',
                'end_date' => '2026-12-31',
                'status' => 'active',
            ]
        );

        // 2. Performance Period (Tahunan 2026)
        $perf2026 = PerformancePeriod::updateOrCreate(
            ['year' => 2026],
            [
                'name' => 'Tahunan 2026',
                'status' => 'open',
                'start_date' => '2026-01-01',
                'end_date' => '2026-12-31',
                'description' => 'Periode Kinerja Tahunan 2026',
            ]
        );

        // 3. Measurement Periods (Triwulan I - IV)
        $quarters = [
            [
                'code' => '2026-TW1',
                'name' => 'Triwulan I 2026',
                'type' => 'quarterly',
                'start_date' => '2026-01-01',
                'end_date' => '2026-03-31',
                'status' => 'closed',
            ],
            [
                'code' => '2026-TW2',
                'name' => 'Triwulan II 2026',
                'type' => 'quarterly',
                'start_date' => '2026-04-01',
                'end_date' => '2026-06-30',
                'status' => 'open',
            ],
            [
                'code' => '2026-TW3',
                'name' => 'Triwulan III 2026',
                'type' => 'quarterly',
                'start_date' => '2026-07-01',
                'end_date' => '2026-09-30',
                'status' => 'open',
            ],
            [
                'code' => '2026-TW4',
                'name' => 'Triwulan IV 2026',
                'type' => 'quarterly',
                'start_date' => '2026-10-01',
                'end_date' => '2026-12-31',
                'status' => 'open',
            ],
        ];

        foreach ($quarters as $q) {
            MeasurementPeriod::updateOrCreate(
                ['code' => $q['code']],
                array_merge($q, [
                    'planning_period_id' => $pp2026->id,
                ])
            );
        }

        // 4. Measurement Units (Satuan Pengukuran)
        $units = [
            ['code' => 'PCT', 'name' => 'Persen', 'symbol' => '%', 'description' => 'Persentase Capaian', 'is_active' => true],
            ['code' => 'DOK', 'name' => 'Dokumen', 'symbol' => 'Dokumen', 'description' => 'Jumlah Dokumen', 'is_active' => true],
            ['code' => 'ORG', 'name' => 'Orang / Pegawai', 'symbol' => 'Orang', 'description' => 'Jumlah Individu/Pegawai', 'is_active' => true],
            ['code' => 'UNIT', 'name' => 'Unit / Sekolah', 'symbol' => 'Unit', 'description' => 'Jumlah Satuan Fasilitas', 'is_active' => true],
            ['code' => 'PAKET', 'name' => 'Paket Pekerjaan', 'symbol' => 'Paket', 'description' => 'Paket Kegiatan Fisik', 'is_active' => true],
            ['code' => 'NILAI', 'name' => 'Indeks / Nilai', 'symbol' => 'Poin', 'description' => 'Skor atau Indeks Evaluasi', 'is_active' => true],
            ['code' => 'BULAN', 'name' => 'Bulan Layanan', 'symbol' => 'Bulan', 'description' => 'Durasi Waktu', 'is_active' => true],
            ['code' => 'RUPIAH', 'name' => 'Rupiah', 'symbol' => 'Rp', 'description' => 'Nilai Nominal Keuangan', 'is_active' => true],
        ];

        foreach ($units as $u) {
            MeasurementUnit::updateOrCreate(
                ['code' => $u['code']],
                $u
            );
        }

        // 5. Alert Rules (EWS Fondasi)
        $alertRules = [
            [
                'code' => 'REALIZATION_BELOW_TARGET',
                'name' => 'Realisasi Jauh di Bawah Target',
                'rule_type' => 'percentage_deviation',
                'severity' => 'critical',
                'config' => ['threshold' => 60.0, 'description' => 'Memicu peringatan jika capaian kinerja indikator triwulan < 60%'],
                'is_active' => true,
            ],
            [
                'code' => 'REALIZATION_WARNING_TARGET',
                'name' => 'Realisasi Perlu Perhatian',
                'rule_type' => 'percentage_deviation',
                'severity' => 'warning',
                'config' => ['threshold' => 80.0, 'description' => 'Memicu peringatan jika capaian kinerja indikator triwulan di antara 60% dan 79%'],
                'is_active' => true,
            ],
            [
                'code' => 'SUBMISSION_LATE',
                'name' => 'Keterlambatan Pelaporan Triwulan',
                'rule_type' => 'deadline_days',
                'severity' => 'warning',
                'config' => ['threshold_days' => 5, 'description' => 'Memicu peringatan jika melewati batas waktu pelaporan triwulanan'],
                'is_active' => true,
            ],
            [
                'code' => 'BUDGET_ABSORPTION_LOW',
                'name' => 'Serapan Anggaran Triwulan Rendah',
                'rule_type' => 'budget_percentage',
                'severity' => 'critical',
                'config' => ['threshold' => 50.0, 'description' => 'Memicu peringatan jika serapan kas program < 50% dari pagu triwulan'],
                'is_active' => true,
            ],
        ];

        foreach ($alertRules as $rule) {
            AlertRule::updateOrCreate(
                ['code' => $rule['code']],
                $rule
            );
        }
    }
}
