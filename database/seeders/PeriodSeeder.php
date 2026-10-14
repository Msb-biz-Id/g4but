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
        // 1. Planning Periods (2024, 2025, 2026)
        $years = [2024, 2025, 2026];
        $planningPeriods = [];

        foreach ($years as $year) {
            $planningPeriods[$year] = PlanningPeriod::updateOrCreate(
                ['code' => "TA-{$year}"],
                [
                    'name' => "Tahun Anggaran {$year}",
                    'year' => $year,
                    'type' => 'annual',
                    'start_date' => "{$year}-01-01",
                    'end_date' => "{$year}-12-31",
                    'status' => $year === 2026 ? 'active' : 'closed',
                ]
            );

            // 2. Performance Period
            PerformancePeriod::updateOrCreate(
                ['year' => $year],
                [
                    'name' => "Tahunan {$year}",
                    'status' => $year === 2026 ? 'open' : 'closed',
                    'start_date' => "{$year}-01-01",
                    'end_date' => "{$year}-12-31",
                    'description' => "Periode Kinerja Tahunan {$year}",
                ]
            );

            // 3. Measurement Periods (TW1 - TW4)
            $twDefinitions = [
                ['suffix' => 'TW1', 'name' => 'Triwulan I', 'start' => '01-01', 'end' => '03-31', 'status' => $year < 2026 ? 'closed' : 'closed'],
                ['suffix' => 'TW2', 'name' => 'Triwulan II', 'start' => '04-01', 'end' => '06-30', 'status' => $year < 2026 ? 'closed' : 'open'],
                ['suffix' => 'TW3', 'name' => 'Triwulan III', 'start' => '07-01', 'end' => '09-30', 'status' => $year < 2026 ? 'closed' : 'open'],
                ['suffix' => 'TW4', 'name' => 'Triwulan IV', 'start' => '10-01', 'end' => '12-31', 'status' => $year < 2026 ? 'closed' : 'open'],
            ];

            foreach ($twDefinitions as $tw) {
                MeasurementPeriod::updateOrCreate(
                    ['code' => "{$year}-{$tw['suffix']}"],
                    [
                        'name' => "{$tw['name']} {$year}",
                        'type' => 'quarterly',
                        'planning_period_id' => $planningPeriods[$year]->id,
                        'start_date' => "{$year}-{$tw['start']}",
                        'end_date' => "{$year}-{$tw['end']}",
                        'status' => $tw['status'],
                    ]
                );
            }
        }

        // 4. Measurement Units (Satuan Pengukuran Lengkap PUPR)
        $units = [
            ['code' => 'PCT', 'name' => 'Persen', 'symbol' => '%', 'description' => 'Persentase Capaian', 'is_active' => true],
            ['code' => 'DOK', 'name' => 'Dokumen', 'symbol' => 'Dokumen', 'description' => 'Jumlah Dokumen', 'is_active' => true],
            ['code' => 'ORG', 'name' => 'Orang / Pegawai', 'symbol' => 'Orang', 'description' => 'Jumlah Individu/Pegawai', 'is_active' => true],
            ['code' => 'UNIT', 'name' => 'Unit / Bangunan', 'symbol' => 'Unit', 'description' => 'Jumlah Satuan Fasilitas', 'is_active' => true],
            ['code' => 'PAKET', 'name' => 'Paket Pekerjaan', 'symbol' => 'Paket', 'description' => 'Paket Kegiatan Konstruksi', 'is_active' => true],
            ['code' => 'NILAI', 'name' => 'Indeks / Nilai', 'symbol' => 'Poin', 'description' => 'Skor atau Indeks Evaluasi', 'is_active' => true],
            ['code' => 'BULAN', 'name' => 'Bulan Layanan', 'symbol' => 'Bulan', 'description' => 'Durasi Waktu', 'is_active' => true],
            ['code' => 'RUPIAH', 'name' => 'Rupiah', 'symbol' => 'Rp', 'description' => 'Nilai Nominal Keuangan', 'is_active' => true],
            ['code' => 'KM', 'name' => 'Kilometer', 'symbol' => 'km', 'description' => 'Panjang Ruas Jalan Daerah', 'is_active' => true],
            ['code' => 'M', 'name' => 'Meter', 'symbol' => 'm', 'description' => 'Panjang Saluran/Jembatan', 'is_active' => true],
            ['code' => 'L_DTK', 'name' => 'Liter per Detik', 'symbol' => 'L/dtk', 'description' => 'Kapasitas Debit Air Bersih SPAM', 'is_active' => true],
            ['code' => 'HA', 'name' => 'Hektar', 'symbol' => 'Ha', 'description' => 'Luas Cakungan Kawasan/Irigasi', 'is_active' => true],
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
