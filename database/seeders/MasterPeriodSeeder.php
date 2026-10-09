<?php

namespace Database\Seeders;

use App\Models\AiPromptTemplate;
use App\Models\AlertRule;
use App\Models\MeasurementPeriod;
use App\Models\MeasurementUnit;
use App\Models\PerformancePeriod;
use App\Models\PlanningPeriod;
use App\Models\User;
use Illuminate\Database\Seeder;

class MasterPeriodSeeder extends Seeder
{
    /**
     * Menyiapkan Master Periode Perencanaan, Periode Kinerja, Sub-Periode (Triwulan),
     * Aturan Peringatan Dini (Alert Rules), dan Template Prompt AI.
     *
     * Data ini merupakan fondasi struktural yang wajib ada agar form input
     * dokumen perencanaan, perjanjian kinerja, dan pengukuran triwulanan dapat berfungsi.
     */
    public function run(): void
    {
        $this->command?->info('Menyiapkan Master Periode & Konfigurasi Fondasi...');

        // ── 1. PERIODE PERENCANAAN (PlanningPeriod) ───────────────────────────
        $ppRpjmd = PlanningPeriod::updateOrCreate(
            ['code' => 'RPJMD-2025-2029'],
            [
                'name' => 'Periode RPJMD Papua Barat 2025-2029',
                'year' => 2025,
                'type' => 'annual',
                'start_date' => '2025-01-01',
                'end_date' => '2029-12-31',
                'status' => 'active',
            ]
        );

        $pp2026 = PlanningPeriod::updateOrCreate(
            ['code' => 'TA-2026'],
            [
                'name' => 'Periode Kinerja Tahunan 2026',
                'year' => 2026,
                'type' => 'annual',
                'start_date' => '2026-01-01',
                'end_date' => '2026-12-31',
                'status' => 'active',
            ]
        );

        // ── 2. PERIODE KINERJA (PerformancePeriod) ────────────────────────────
        $perfPeriod2026 = PerformancePeriod::updateOrCreate(
            ['year' => 2026],
            [
                'name' => 'Tahunan 2026',
                'status' => 'open',
                'start_date' => '2026-01-01',
                'end_date' => '2026-12-31',
                'description' => 'Periode Tahunan TA 2026',
            ]
        );

        $perfPeriod5Tahunan = PerformancePeriod::updateOrCreate(
            ['year' => 2025],
            [
                'name' => 'Lima Tahunan 2025-2029',
                'status' => 'open',
                'start_date' => '2025-01-01',
                'end_date' => '2029-12-31',
                'description' => 'Periode Renstra 5 Tahunan 2025-2029',
            ]
        );

        // ── 3. SUB-PERIODE PENGUKURAN TRIWULAN (MeasurementPeriod) ────────────
        $subPeriods = [
            [
                'code' => 'TW1-2026',
                'name' => 'Triwulan I 2026',
                'type' => 'quarterly',
                'start_date' => '2026-01-01',
                'end_date' => '2026-03-31',
                'submission_deadline' => '2026-04-15',
                'status' => 'closed',
            ],
            [
                'code' => 'TW2-2026',
                'name' => 'Triwulan II 2026',
                'type' => 'quarterly',
                'start_date' => '2026-04-01',
                'end_date' => '2026-06-30',
                'submission_deadline' => '2026-07-15',
                'status' => 'closed',
            ],
            [
                'code' => 'TW3-2026',
                'name' => 'Triwulan III 2026',
                'type' => 'quarterly',
                'start_date' => '2026-07-01',
                'end_date' => '2026-09-30',
                'submission_deadline' => '2026-10-15',
                'status' => 'open',
            ],
            [
                'code' => 'TW4-2026',
                'name' => 'Triwulan IV 2026',
                'type' => 'quarterly',
                'start_date' => '2026-10-01',
                'end_date' => '2026-12-31',
                'submission_deadline' => '2027-01-15',
                'status' => 'open',
            ],
        ];

        foreach ($subPeriods as $sp) {
            MeasurementPeriod::updateOrCreate(
                ['code' => $sp['code']],
                array_merge($sp, ['planning_period_id' => $pp2026->id])
            );
        }

        // ── 4. SATUAN PENGUKURAN (MeasurementUnit) ───────────────────────────
        $unitsData = [
            ['code' => 'PERSEN',    'name' => 'Persen',            'symbol' => '%',        'description' => 'Persentase proporsi atau rasio'],
            ['code' => 'INDEKS',    'name' => 'Indeks',            'symbol' => 'Indeks',   'description' => 'Skor komposit indeks'],
            ['code' => 'POIN',      'name' => 'Poin / Nilai',      'symbol' => 'Poin',     'description' => 'Nilai capaian evaluasi angka'],
            ['code' => 'DOKUMEN',   'name' => 'Dokumen',           'symbol' => 'Dokumen',  'description' => 'Satuan dokumen resmi'],
            ['code' => 'ORANG',     'name' => 'Orang',             'symbol' => 'Orang',    'description' => 'Jumlah individu / jiwa'],
            ['code' => 'UNIT',      'name' => 'Unit / Instansi',   'symbol' => 'Unit',     'description' => 'Jumlah unit organisasi'],
            ['code' => 'KM',        'name' => 'Kilometer',         'symbol' => 'Km',       'description' => 'Panjang ruas jalan'],
            ['code' => 'LEMBAGA',   'name' => 'Lembaga / Badan',   'symbol' => 'Lembaga',  'description' => 'Badan hukum atau koperasi'],
        ];

        foreach ($unitsData as $u) {
            MeasurementUnit::updateOrCreate(
                ['code' => $u['code']],
                [
                    'name' => $u['name'],
                    'symbol' => $u['symbol'],
                    'description' => $u['description'],
                    'is_active' => true,
                ]
            );
        }

        // ── 5. ATURAN PERINGATAN DINI (AlertRule EWS) ─────────────────────────
        AlertRule::updateOrCreate(
            ['code' => 'EWS_PERF_DEV'],
            [
                'name' => 'Deviasi Capaian Kinerja Rendah (< 60%)',
                'rule_type' => 'performance_deviation',
                'severity' => 'critical',
                'is_active' => true,
                'config' => ['threshold' => 60, 'operator' => '<'],
            ]
        );

        AlertRule::updateOrCreate(
            ['code' => 'EWS_LATE_SUBMIT'],
            [
                'name' => 'Keterlambatan Pelaporan Pengukuran Kinerja',
                'rule_type' => 'late_report',
                'severity' => 'high',
                'is_active' => true,
                'config' => ['grace_days' => 0],
            ]
        );

        AlertRule::updateOrCreate(
            ['code' => 'EWS_NO_EVIDENCE'],
            [
                'name' => 'Realisasi Kinerja Tanpa Bukti Dukung',
                'rule_type' => 'missing_evidence',
                'severity' => 'warning',
                'is_active' => true,
                'config' => [],
            ]
        );

        AlertRule::updateOrCreate(
            ['code' => 'DOC_OVERDUE'],
            [
                'name' => 'Dokumen SAKIP Belum Lengkap / Terlambat Unggah',
                'rule_type' => 'document_overdue',
                'severity' => 'high',
                'is_active' => true,
                'config' => ['threshold_days' => 30],
            ]
        );

        AlertRule::updateOrCreate(
            ['code' => 'PK_UNSIGNED'],
            [
                'name' => 'Perjanjian Kinerja Belum Disahkan',
                'rule_type' => 'pk_unsigned',
                'severity' => 'medium',
                'is_active' => true,
                'config' => ['threshold_days' => 14],
            ]
        );

        AlertRule::updateOrCreate(
            ['code' => 'DOC_REVISION'],
            [
                'name' => 'Revisi Dokumen SAKIP Tertunda',
                'rule_type' => 'revision_pending',
                'severity' => 'low',
                'is_active' => true,
                'config' => ['threshold_days' => 7],
            ]
        );

        // ── 5. TEMPLATE PROMPT AI (AiPromptTemplate) ──────────────────────────
        $admin = User::firstWhere('email', 'admin@ekasuari.test');
        $adminId = $admin?->id ?? 1;

        $templates = [
            [
                'code' => 'EXEC_SUMMARY',
                'name' => 'Ringkasan Eksekutif Kinerja OPD',
                'feature' => 'executive_summary',
                'version' => 1,
                'content' => 'Buatkan ringkasan eksekutif kinerja OPD {{opd_name}} untuk periode {{period}}. Sertakan: (1) capaian utama, (2) kendala signifikan, (3) rekomendasi strategis. Gunakan bahasa formal dan singkat maksimal 300 kata.',
                'is_active' => true,
                'created_by' => $adminId,
            ],
            [
                'code' => 'COMPLIANCE_ANALYSIS',
                'name' => 'Analisis Kepatuhan Dokumen',
                'feature' => 'compliance',
                'version' => 1,
                'content' => 'Analisis tingkat kepatuhan pengunggahan dokumen perencanaan seluruh OPD periode {{period}}. Identifikasi OPD yang terlambat dan berikan rekomendasi intervensi.',
                'is_active' => true,
                'created_by' => $adminId,
            ],
            [
                'code' => 'IMPROVEMENT_REC',
                'name' => 'Rekomendasi Peningkatan Kinerja',
                'feature' => 'recommendation',
                'version' => 1,
                'content' => 'Berdasarkan data kinerja OPD {{opd_name}}, berikan 3-5 rekomendasi konkret untuk meningkatkan capaian indikator yang masih di bawah target. Format dalam poin singkat.',
                'is_active' => true,
                'created_by' => $adminId,
            ],
            [
                'code' => 'EWS_REPORT',
                'name' => 'Laporan Early Warning System',
                'feature' => 'ews',
                'version' => 1,
                'content' => 'Buat laporan singkat EWS untuk Gubernur Papua Barat: (1) jumlah OPD berisiko tinggi, (2) dokumen terlambat, (3) langkah mitigasi yang disarankan.',
                'is_active' => true,
                'created_by' => $adminId,
            ],
        ];

        foreach ($templates as $tpl) {
            AiPromptTemplate::updateOrCreate(['code' => $tpl['code']], $tpl);
        }

        $this->command?->info('Master Periode & Konfigurasi Fondasi Selesai disiapkan.');
    }
}
