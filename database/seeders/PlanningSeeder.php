<?php

namespace Database\Seeders;

use App\Models\ActionPlan;
use App\Models\Agreement;
use App\Models\Indicator;
use App\Models\MonitoringActionPlanBudget;
use App\Models\MonitoringActionPlanOutput;
use App\Models\Organization;
use App\Models\PerformancePeriod;
use App\Models\PlanningDocument;
use App\Models\PlanningPeriod;
use App\Models\PlanningTree;
use App\Models\User;
use Illuminate\Database\Seeder;

class PlanningSeeder extends Seeder
{
    /**
     * Menyiapkan Data Perencanaan Lengkap Dinas PUPR Kabupaten Mimika:
     * 1. Dokumen Perencanaan Resmi (Renstra, Renja, Perjanjian Kinerja)
     * 2. Pohon Kinerja Cascading 4 Level (Outcome -> CSF -> Kondisi Antara -> Kondisi Operasional)
     * 3. Perjanjian Kinerja (PK) Kepala Dinas, Sekretaris, dan para Kepala Bidang
     * 4. Rencana Aksi Kinerja (Action Plan)
     * 5. Monitoring Kinerja Anggaran (Budget) & Output Fisik Triwulanan
     */
    public function run(): void
    {
        $rootOpd = Organization::where('code', 'OPD-INDUK')->firstOrFail();
        $sekretariat = Organization::where('code', 'SEKRETARIAT')->firstOrFail();
        $bidangCK = Organization::where('code', 'BIDANG-CK')->firstOrFail();
        $bidangBM = Organization::where('code', 'BIDANG-BM')->firstOrFail();
        $bidangSDA = Organization::where('code', 'BIDANG-SDA')->firstOrFail();
        $bidangTR = Organization::where('code', 'BIDANG-TR')->firstOrFail();

        $pp2024 = PlanningPeriod::where('code', 'TA-2024')->first();
        $pp2025 = PlanningPeriod::where('code', 'TA-2025')->first();
        $pp2026 = PlanningPeriod::where('code', 'TA-2026')->firstOrFail();

        $perf2024 = PerformancePeriod::where('year', 2024)->first();
        $perf2025 = PerformancePeriod::where('year', 2025)->first();
        $perf2026 = PerformancePeriod::where('year', 2026)->first() ?? $perf2025;

        $superAdmin = User::where('email', 'superadmin@esakip.local')->first();
        $kadis = User::where('email', 'kepala.opd@esakip.local')->first() ?? $superAdmin;
        $adminOpd = User::where('email', 'admin.opd@esakip.local')->first() ?? $superAdmin;

        // ══════════════════════════════════════════════════════════════════════
        // 1. DOKUMEN PERENCANAAN RESMI (PLANNING DOCUMENTS)
        // ══════════════════════════════════════════════════════════════════════
        $planningDocs = [
            [
                'code' => 'RENSTRA-PUPR-2024-2026',
                'title' => 'Rencana Strategis (Renstra) Dinas PUPR Kabupaten Mimika 2024-2026',
                'type' => 'renstra',
                'periode_type' => 'lima_tahunan',
                'year' => 2024,
                'start_year' => 2024,
                'end_year' => 2026,
                'start_date' => '2024-01-01',
                'end_date' => '2026-12-31',
                'document_number' => '050/112/RENSTRA-PUPR/2024',
                'issued_at' => '2024-01-15',
                'description' => 'Dokumen Induk Perencanaan Strategis Pembangunan Infrastruktur dan Penataan Ruang Kabupaten Mimika.',
                'status' => 'locked',
                'approved_at' => '2024-01-20 10:00:00',
                'locked_at' => '2024-01-20 10:00:00',
                'planning_period_id' => $pp2026->id,
                'performance_period_id' => $perf2026->id,
            ],
            [
                'code' => 'RENJA-PUPR-2025',
                'title' => 'Rencana Kerja (Renja) Dinas PUPR Kabupaten Mimika Tahun 2025',
                'type' => 'renja',
                'periode_type' => 'tahunan',
                'year' => 2025,
                'start_year' => 2025,
                'end_year' => 2025,
                'start_date' => '2025-01-01',
                'end_date' => '2025-12-31',
                'document_number' => '050/045/RENJA-PUPR/2025',
                'issued_at' => '2025-01-10',
                'description' => 'Rencana Kerja Tahunan Dinas PUPR Mimika Tahun Anggaran 2025.',
                'status' => 'locked',
                'approved_at' => '2025-01-18 09:30:00',
                'locked_at' => '2025-01-18 09:30:00',
                'planning_period_id' => $pp2025 ? $pp2025->id : $pp2026->id,
                'performance_period_id' => $perf2025 ? $perf2025->id : $perf2026->id,
            ],
            [
                'code' => 'RENJA-PUPR-2026',
                'title' => 'Rencana Kerja (Renja) Dinas PUPR Kabupaten Mimika Tahun 2026',
                'type' => 'renja',
                'periode_type' => 'tahunan',
                'year' => 2026,
                'start_year' => 2026,
                'end_year' => 2026,
                'start_date' => '2026-01-01',
                'end_date' => '2026-12-31',
                'document_number' => '050/088/RENJA-PUPR/2026',
                'issued_at' => '2026-01-12',
                'description' => 'Rencana Kerja Tahunan Dinas PUPR Mimika Tahun Anggaran 2026 (Berjalan).',
                'status' => 'approved',
                'approved_at' => '2026-01-25 11:00:00',
                'planning_period_id' => $pp2026->id,
                'performance_period_id' => $perf2026->id,
            ],
            [
                'code' => 'PK-KADIS-PUPR-2026',
                'title' => 'Perjanjian Kinerja (PK) Kepala Dinas PUPR Kabupaten Mimika Tahun 2026',
                'type' => 'perjanjian_kinerja',
                'periode_type' => 'tahunan',
                'year' => 2026,
                'start_year' => 2026,
                'end_year' => 2026,
                'start_date' => '2026-01-01',
                'end_date' => '2026-12-31',
                'document_number' => '800/012/PK-KADIS/2026',
                'issued_at' => '2026-01-05',
                'description' => 'Kesepakatan Kinerja Antara Bupati Mimika dan Kepala Dinas PUPR Kabupaten Mimika Tahun 2026.',
                'status' => 'approved',
                'approved_at' => '2026-01-15 14:00:00',
                'planning_period_id' => $pp2026->id,
                'performance_period_id' => $perf2026->id,
            ],
        ];

        foreach ($planningDocs as $doc) {
            PlanningDocument::updateOrCreate(
                ['code' => $doc['code']],
                array_merge($doc, [
                    'organization_id' => $rootOpd->id,
                    'created_by' => $adminOpd->id,
                    'approved_by' => $kadis->id,
                ])
            );
        }

        // ══════════════════════════════════════════════════════════════════════
        // 2. POHON KINERJA CASCADING (PLANNING TREES)
        // ══════════════════════════════════════════════════════════════════════
        // Level 1: OUTCOME (Tujuan Strategis OPD Induk)
        $ikuOpd01 = Indicator::where('code', 'IKU-OPD-01')->first();
        $rootTree = PlanningTree::updateOrCreate(
            ['code' => 'TREE-OUTCOME-01'],
            [
                'organization_id' => $rootOpd->id,
                'performance_period_id' => $perf2026->id,
                'parent_id' => null,
                'level' => 'outcome',
                'name' => 'Meningkatnya Kualitas dan Pemerataan Infrastruktur Wilayah serta Keteraturan Tata Ruang Berkelanjutan di Kabupaten Mimika',
                'description' => 'Tujuan strategis penyelenggaraan urusan pekerjaan umum dan penataan ruang daerah.',
                'indicator_id' => $ikuOpd01?->id,
                'sort_order' => 1,
                'is_active' => true,
            ]
        );

        // Level 2: CSF (Sasaran Strategis per Matra/Bidang)
        $csfDefinitions = [
            [
                'code' => 'TREE-CSF-BM',
                'name' => 'Meningkatnya Konektivitas dan Kemantapan Jaringan Jalan serta Jembatan Daerah',
                'desc' => 'Sasaran strategis Bidang Bina Marga untuk memperlancar mobilitas orang dan barang.',
                'org' => $bidangBM,
                'indicator' => Indicator::where('code', 'IKU-OPD-02')->first(),
                'order' => 1,
                'children' => [
                    [
                        'code' => 'TREE-PROG-BM',
                        'level' => 'kondisi_antara',
                        'name' => 'Program Penyelenggaraan Jalan dan Jembatan Kabupaten',
                        'desc' => 'Program prioritas peningkatan kapasitas dan pemeliharaan rutin jaringan jalan.',
                        'order' => 1,
                        'kegiatan' => [
                            ['code' => 'TREE-KEG-BM-01', 'name' => 'Pembangunan dan Rekonstruksi Jalan Poros Penghubung Distrik', 'order' => 1],
                            ['code' => 'TREE-KEG-BM-02', 'name' => 'Pemeliharaan Berkala Ruas Jalan dan Penggantian Jembatan Rusak', 'order' => 2],
                        ],
                    ],
                ],
            ],
            [
                'code' => 'TREE-CSF-CK',
                'name' => 'Meningkatnya Aksesibilitas Air Minum Layak, Sanitasi Sehat, dan Kelaikan Bangunan Gedung Daerah',
                'desc' => 'Sasaran strategis Bidang Cipta Karya untuk penyediaan fasilitas dasar permukiman.',
                'org' => $bidangCK,
                'indicator' => Indicator::where('code', 'IKU-OPD-03')->first(),
                'order' => 2,
                'children' => [
                    [
                        'code' => 'TREE-PROG-CK',
                        'level' => 'kondisi_antara',
                        'name' => 'Program Pengelolaan dan Pengembangan Sistem Air Minum & Penataan Bangunan',
                        'desc' => 'Pengembangan jaringan SPAM komunal dan pengawasan kelaikan gedung daerah.',
                        'order' => 1,
                        'kegiatan' => [
                            ['code' => 'TREE-KEG-CK-01', 'name' => 'Pembangunan Jaringan Perpipaan dan Sambungan Rumah (SR) SPAM Mimika', 'order' => 1],
                            ['code' => 'TREE-KEG-CK-02', 'name' => 'Pembangunan dan Penataan Bangunan Gedung Pemerintahan Daerah', 'order' => 2],
                        ],
                    ],
                ],
            ],
            [
                'code' => 'TREE-CSF-SDA',
                'name' => 'Meningkatnya Keandalan Pengendalian Banjir, Ketahanan Sumber Daya Air, dan Saluran Drainase',
                'desc' => 'Sasaran strategis Bidang SDA untuk mitigasi banjir sungai dan pengamanan kawasan pesisir.',
                'org' => $bidangSDA,
                'indicator' => Indicator::where('code', 'IKU-OPD-04')->first(),
                'order' => 3,
                'children' => [
                    [
                        'code' => 'TREE-PROG-SDA',
                        'level' => 'kondisi_antara',
                        'name' => 'Program Pengelolaan Sumber Daya Air dan Pengendalian Banjir',
                        'desc' => 'Normalisasi berkala daerah aliran sungai dan pembangunan tanggul banjir.',
                        'order' => 1,
                        'kegiatan' => [
                            ['code' => 'TREE-KEG-SDA-01', 'name' => 'Normalisasi Alur Sungai Wania dan Pembangunan Tanggul Pengendali Banjir', 'order' => 1],
                            ['code' => 'TREE-KEG-SDA-02', 'name' => 'Operasi dan Pemeliharaan Pintu Air serta Saluran Drainase Perkotaan Timika', 'order' => 2],
                        ],
                    ],
                ],
            ],
            [
                'code' => 'TREE-CSF-TR',
                'name' => 'Meningkatnya Keteraturan Tata Ruang Wilayah dan Kepastian Hukum Pemanfaatan Ruang',
                'desc' => 'Sasaran strategis Bidang Penataan Ruang untuk tertib tata ruang dan perizinan zonasi.',
                'org' => $bidangTR,
                'indicator' => Indicator::where('code', 'IKU-OPD-05')->first(),
                'order' => 4,
                'children' => [
                    [
                        'code' => 'TREE-PROG-TR',
                        'level' => 'kondisi_antara',
                        'name' => 'Program Penyelenggaraan Penataan Ruang Daerah',
                        'desc' => 'Penyusunan regulasi rencana detail tata ruang dan pengawasan kepatuhan zonasi.',
                        'order' => 1,
                        'kegiatan' => [
                            ['code' => 'TREE-KEG-TR-01', 'name' => 'Penyusunan Rencana Detail Tata Ruang (RDTR) Kawasan Perkotaan Timika', 'order' => 1],
                            ['code' => 'TREE-KEG-TR-02', 'name' => 'Verifikasi Lapangan dan Penerbitan Rekomendasi Teknis KKPR', 'order' => 2],
                        ],
                    ],
                ],
            ],
            [
                'code' => 'TREE-CSF-SEKR',
                'name' => 'Meningkatnya Akuntabilitas Kinerja dan Tata Kelola Birokrasi Dinas PUPR',
                'desc' => 'Sasaran penunjang Sekretariat Dinas untuk perwujudan predikat SAKIP A.',
                'org' => $sekretariat,
                'indicator' => Indicator::where('code', 'IKU-SEKR-01')->first(),
                'order' => 5,
                'children' => [
                    [
                        'code' => 'TREE-PROG-SEKR',
                        'level' => 'kondisi_antara',
                        'name' => 'Program Penunjang Urusan Pemerintahan Daerah Dinas PUPR',
                        'desc' => 'Koordinasi perencanaan, keuangan, kepegawaian, dan pelaporan SAKIP.',
                        'order' => 1,
                        'kegiatan' => [
                            ['code' => 'TREE-KEG-SEKR-01', 'name' => 'Penyusunan Dokumen Perencanaan, Evaluasi, dan Pelaporan LKjIP Dinas', 'order' => 1],
                        ],
                    ],
                ],
            ],
        ];

        foreach ($csfDefinitions as $csfDef) {
            $csfNode = PlanningTree::updateOrCreate(
                ['code' => $csfDef['code']],
                [
                    'organization_id' => $csfDef['org']->id,
                    'performance_period_id' => $perf2026->id,
                    'parent_id' => $rootTree->id,
                    'level' => 'csf',
                    'name' => $csfDef['name'],
                    'description' => $csfDef['desc'],
                    'indicator_id' => $csfDef['indicator']?->id,
                    'sort_order' => $csfDef['order'],
                    'is_active' => true,
                ]
            );

            foreach ($csfDef['children'] as $progDef) {
                $progNode = PlanningTree::updateOrCreate(
                    ['code' => $progDef['code']],
                    [
                        'organization_id' => $csfDef['org']->id,
                        'performance_period_id' => $perf2026->id,
                        'parent_id' => $csfNode->id,
                        'level' => $progDef['level'],
                        'name' => $progDef['name'],
                        'description' => $progDef['desc'],
                        'sort_order' => $progDef['order'],
                        'is_active' => true,
                    ]
                );

                foreach ($progDef['kegiatan'] as $kegDef) {
                    PlanningTree::updateOrCreate(
                        ['code' => $kegDef['code']],
                        [
                            'organization_id' => $csfDef['org']->id,
                            'performance_period_id' => $perf2026->id,
                            'parent_id' => $progNode->id,
                            'level' => 'kondisi_operasional',
                            'name' => $kegDef['name'],
                            'sort_order' => $kegDef['order'],
                            'is_active' => true,
                        ]
                    );
                }
            }
        }

        // ══════════════════════════════════════════════════════════════════════
        // 3. PERJANJIAN KINERJA (AGREEMENTS)
        // ══════════════════════════════════════════════════════════════════════
        $agreements = [
            [
                'code' => 'PK-KADIS-2025',
                'title' => 'Perjanjian Kinerja Kepala Dinas PUPR Kabupaten Mimika Tahun 2025',
                'name' => 'PK Kepala Dinas PUPR 2025',
                'document_number' => '800/01/PK-PUPR/2025',
                'organization_id' => $rootOpd->id,
                'planning_period_id' => $pp2025 ? $pp2025->id : $pp2026->id,
                'performance_period_id' => $perf2025 ? $perf2025->id : $perf2026->id,
                'responsible_name' => 'Kepala Dinas PUPR Mimika',
                'counterpart_name' => 'Bupati Mimika',
                'status' => 'approved',
            ],
            [
                'code' => 'PK-KADIS-2026',
                'title' => 'Perjanjian Kinerja Kepala Dinas PUPR Kabupaten Mimika Tahun 2026',
                'name' => 'PK Kepala Dinas PUPR 2026',
                'document_number' => '800/01/PK-PUPR/2026',
                'organization_id' => $rootOpd->id,
                'planning_period_id' => $pp2026->id,
                'performance_period_id' => $perf2026->id,
                'responsible_name' => 'Kepala Dinas PUPR Mimika',
                'counterpart_name' => 'Bupati Mimika',
                'status' => 'approved',
            ],
            [
                'code' => 'PK-SEKR-2026',
                'title' => 'Perjanjian Kinerja Sekretaris Dinas PUPR Mimika Tahun 2026',
                'name' => 'PK Sekretaris Dinas 2026',
                'document_number' => '800/02/PK-SEKR/2026',
                'organization_id' => $sekretariat->id,
                'planning_period_id' => $pp2026->id,
                'performance_period_id' => $perf2026->id,
                'responsible_name' => 'Sekretaris Dinas PUPR Mimika',
                'counterpart_name' => 'Kepala Dinas PUPR Mimika',
                'status' => 'approved',
            ],
            [
                'code' => 'PK-BM-2026',
                'title' => 'Perjanjian Kinerja Kepala Bidang Bina Marga Tahun 2026',
                'name' => 'PK Kabid Bina Marga 2026',
                'document_number' => '800/03/PK-BM/2026',
                'organization_id' => $bidangBM->id,
                'planning_period_id' => $pp2026->id,
                'performance_period_id' => $perf2026->id,
                'responsible_name' => 'Kepala Bidang Bina Marga',
                'counterpart_name' => 'Kepala Dinas PUPR Mimika',
                'status' => 'approved',
            ],
            [
                'code' => 'PK-CK-2026',
                'title' => 'Perjanjian Kinerja Kepala Bidang Cipta Karya Tahun 2026',
                'name' => 'PK Kabid Cipta Karya 2026',
                'document_number' => '800/04/PK-CK/2026',
                'organization_id' => $bidangCK->id,
                'planning_period_id' => $pp2026->id,
                'performance_period_id' => $perf2026->id,
                'responsible_name' => 'Kepala Bidang Cipta Karya',
                'counterpart_name' => 'Kepala Dinas PUPR Mimika',
                'status' => 'approved',
            ],
            [
                'code' => 'PK-SDA-2026',
                'title' => 'Perjanjian Kinerja Kepala Bidang Sumber Daya Air Tahun 2026',
                'name' => 'PK Kabid SDA 2026',
                'document_number' => '800/05/PK-SDA/2026',
                'organization_id' => $bidangSDA->id,
                'planning_period_id' => $pp2026->id,
                'performance_period_id' => $perf2026->id,
                'responsible_name' => 'Kepala Bidang Sumber Daya Air',
                'counterpart_name' => 'Kepala Dinas PUPR Mimika',
                'status' => 'approved',
            ],
            [
                'code' => 'PK-TR-2026',
                'title' => 'Perjanjian Kinerja Kepala Bidang Penataan Ruang Tahun 2026',
                'name' => 'PK Kabid Penataan Ruang 2026',
                'document_number' => '800/06/PK-TR/2026',
                'organization_id' => $bidangTR->id,
                'planning_period_id' => $pp2026->id,
                'performance_period_id' => $perf2026->id,
                'responsible_name' => 'Kepala Bidang Penataan Ruang',
                'counterpart_name' => 'Kepala Dinas PUPR Mimika',
                'status' => 'approved',
            ],
        ];

        foreach ($agreements as $ag) {
            Agreement::updateOrCreate(
                ['code' => $ag['code']],
                array_merge($ag, [
                    'created_by' => $adminOpd->id,
                    'submitted_by' => $adminOpd->id,
                    'submitted_at' => now()->subDays(60),
                    'approved_by' => $kadis->id,
                    'approved_at' => now()->subDays(50),
                ])
            );
        }

        // ══════════════════════════════════════════════════════════════════════
        // 4. RENCANA AKSI KINERJA (ACTION PLANS)
        // ══════════════════════════════════════════════════════════════════════
        $actionPlans = [
            [
                'code' => 'AP-BM-01',
                'title' => 'Peningkatan dan Pengaspalan Jalan Poros Sp 2 - Sp 5 Timika',
                'activity' => 'Rekonstruksi badan jalan dan pengaspalan hotmix sepanjang 8.5 km',
                'organization_id' => $bidangBM->id,
                'target_value' => 8.5,
                'progress' => 65.0,
                'status' => 'in_progress',
                'start_date' => '2026-02-01',
                'end_date' => '2026-10-31',
            ],
            [
                'code' => 'AP-BM-02',
                'title' => 'Penggantian Gelagar Jembatan Sungai Iwaka',
                'activity' => 'Pemasangan gelagar baja komposit bentang 40 meter',
                'organization_id' => $bidangBM->id,
                'target_value' => 1.0,
                'progress' => 80.0,
                'status' => 'in_progress',
                'start_date' => '2026-03-01',
                'end_date' => '2026-09-30',
            ],
            [
                'code' => 'AP-CK-01',
                'title' => 'Perluasan Jaringan Pipa Distribusi Utama SPAM Kuala Kencana',
                'activity' => 'Pemasangan pipa HDPE diameter 200mm sepanjang 6.2 km dan 500 Sambungan Rumah',
                'organization_id' => $bidangCK->id,
                'target_value' => 500.0,
                'progress' => 70.0,
                'status' => 'in_progress',
                'start_date' => '2026-01-15',
                'end_date' => '2026-08-31',
            ],
            [
                'code' => 'AP-CK-02',
                'title' => 'Pembangunan Gedung Kantor Pelayanan Publik Daerah Mimika',
                'activity' => 'Penyelesaian struktur lantai 3 dan finishing arsitektural gedung',
                'organization_id' => $bidangCK->id,
                'target_value' => 1.0,
                'progress' => 45.0,
                'status' => 'in_progress',
                'start_date' => '2026-03-15',
                'end_date' => '2026-11-30',
            ],
            [
                'code' => 'AP-SDA-01',
                'title' => 'Pembangunan Tanggul Beton Pengendali Banjir Sungai Wania',
                'activity' => 'Konstruksi bronjong dan parapet beton penahan limpasan sepanjang 2.4 km',
                'organization_id' => $bidangSDA->id,
                'target_value' => 2.4,
                'progress' => 55.0,
                'status' => 'in_progress',
                'start_date' => '2026-02-15',
                'end_date' => '2026-10-15',
            ],
            [
                'code' => 'AP-TR-01',
                'title' => 'Revisi Materi Teknis dan Raperda RTRW Kabupaten Mimika',
                'activity' => 'Konsultasi publik dan asistensi teknis persetujuan substansi Kementerian ATR/BPN',
                'organization_id' => $bidangTR->id,
                'target_value' => 1.0,
                'progress' => 90.0,
                'status' => 'completed',
                'start_date' => '2026-01-10',
                'end_date' => '2026-05-30',
            ],
            [
                'code' => 'AP-SEKR-01',
                'title' => 'Implementasi Integrasi Aplikasi e-SAKIP PUPR Mimika',
                'activity' => 'Pelatihan operator seluruh bidang teknis dan standarisasi bukti dukung evidence',
                'organization_id' => $sekretariat->id,
                'target_value' => 100.0,
                'progress' => 100.0,
                'status' => 'completed',
                'start_date' => '2026-01-05',
                'end_date' => '2026-04-15',
            ],
        ];

        foreach ($actionPlans as $ap) {
            ActionPlan::updateOrCreate(
                ['code' => $ap['code']],
                array_merge($ap, [
                    'planning_period_id' => $pp2026->id,
                    'performance_period_id' => $perf2026->id,
                    'created_by' => $adminOpd->id,
                ])
            );
        }

        // ══════════════════════════════════════════════════════════════════════
        // 5. MONITORING ANGGARAN & OUTPUT FISIK (MONITORING ACTION PLAN)
        // ══════════════════════════════════════════════════════════════════════
        $monitoringBudgetItems = [
            [
                'order_no' => 1,
                'sasaran_strategis' => 'Meningkatnya Kemantapan Jaringan Jalan dan Jembatan Kabupaten',
                'indikator_sasaran' => 'Persentase Jalan Kabupaten Kondisi Mantap',
                'target_sasaran_tahunan' => 76.0,
                'program' => 'Penyelenggaraan Jalan dan Jembatan',
                'kegiatan' => 'Pembangunan Jalan Kabupaten',
                'subkegiatan' => 'Peningkatan Jalan Poros Sp 2 - Sp 5 Timika',
                'indikator_subkegiatan' => 'Panjang Jalan Terekonstruksi (km)',
                'satuan' => 'km',
                'pagu_tahunan' => 24500000000,
                'pagu_tw1' => 4900000000,
                'pagu_tw2' => 7350000000,
                'pagu_tw3' => 7350000000,
                'pagu_tw4' => 4900000000,
                'realisasi_tw1' => 4850000000,
                'realisasi_tw2' => 7100000000,
                'realisasi_tw3' => 0,
                'realisasi_tw4' => 0,
                'penanggung_jawab_utama' => 'Kepala Bidang Bina Marga',
                'pengampu_teknis' => 'Seksi Pembangunan Jalan dan Jembatan',
                'organization_id' => $bidangBM->id,
            ],
            [
                'order_no' => 2,
                'sasaran_strategis' => 'Meningkatnya Aksesibilitas Air Minum Layak dan Aman',
                'indikator_sasaran' => 'Cakupan Akses Air Minum Layak (%)',
                'target_sasaran_tahunan' => 82.0,
                'program' => 'Pengembangan Sistem Penyediaan Air Minum (SPAM)',
                'kegiatan' => 'Pembangunan Jaringan Distribusi Air Bersih',
                'subkegiatan' => 'Perluasan Jaringan SPAM Komunal Kuala Kencana',
                'indikator_subkegiatan' => 'Jumlah Sambungan Rumah Baru (SR)',
                'satuan' => 'SR',
                'pagu_tahunan' => 12800000000,
                'pagu_tw1' => 2560000000,
                'pagu_tw2' => 3840000000,
                'pagu_tw3' => 3840000000,
                'pagu_tw4' => 2560000000,
                'realisasi_tw1' => 2500000000,
                'realisasi_tw2' => 3720000000,
                'realisasi_tw3' => 0,
                'realisasi_tw4' => 0,
                'penanggung_jawab_utama' => 'Kepala Bidang Cipta Karya',
                'pengampu_teknis' => 'Seksi Air Minum Dan Sanitasi',
                'organization_id' => $bidangCK->id,
            ],
            [
                'order_no' => 3,
                'sasaran_strategis' => 'Meningkatnya Pengendalian Banjir dan Pengamanan Sungai',
                'indikator_sasaran' => 'Luas Kawasan Banjir yang Tertangani (%)',
                'target_sasaran_tahunan' => 75.0,
                'program' => 'Pengendalian Banjir dan Drainase',
                'kegiatan' => 'Pengendalian Banjir Sungai Wania',
                'subkegiatan' => 'Pembangunan Tanggul Beton Sungai Wania',
                'indikator_subkegiatan' => 'Panjang Tanggul Dibangun (km)',
                'satuan' => 'km',
                'pagu_tahunan' => 16500000000,
                'pagu_tw1' => 3300000000,
                'pagu_tw2' => 4950000000,
                'pagu_tw3' => 4950000000,
                'pagu_tw4' => 3300000000,
                'realisasi_tw1' => 3150000000,
                'realisasi_tw2' => 4600000000,
                'realisasi_tw3' => 0,
                'realisasi_tw4' => 0,
                'penanggung_jawab_utama' => 'Kepala Bidang Sumber Daya Air',
                'pengampu_teknis' => 'Seksi Sarana dan Prasarana SDA',
                'organization_id' => $bidangSDA->id,
            ],
            [
                'order_no' => 4,
                'sasaran_strategis' => 'Meningkatnya Akuntabilitas Kinerja dan Keuangan Dinas',
                'indikator_sasaran' => 'Nilai SAKIP Dinas PUPR (Poin)',
                'target_sasaran_tahunan' => 88.0,
                'program' => 'Penunjang Urusan Pemerintahan Daerah',
                'kegiatan' => 'Perencanaan dan Evaluasi Kinerja',
                'subkegiatan' => 'Pengelolaan Pelaporan Kinerja dan Keuangan SAKIP',
                'indikator_subkegiatan' => 'Jumlah Laporan SAKIP Terbit (Dok)',
                'satuan' => 'Dokumen',
                'pagu_tahunan' => 1500000000,
                'pagu_tw1' => 375000000,
                'pagu_tw2' => 375000000,
                'pagu_tw3' => 375000000,
                'pagu_tw4' => 375000000,
                'realisasi_tw1' => 375000000,
                'realisasi_tw2' => 370000000,
                'realisasi_tw3' => 0,
                'realisasi_tw4' => 0,
                'penanggung_jawab_utama' => 'Sekretaris Dinas PUPR',
                'pengampu_teknis' => 'Subbag Penyusunan Program',
                'organization_id' => $sekretariat->id,
            ],
        ];

        foreach ($monitoringBudgetItems as $mbi) {
            MonitoringActionPlanBudget::updateOrCreate(
                [
                    'organization_id' => $mbi['organization_id'],
                    'year' => 2026,
                    'order_no' => $mbi['order_no'],
                ],
                array_merge($mbi, [
                    'year' => 2026,
                    'created_by' => $adminOpd->id,
                ])
            );

            // Dampingi dengan Output Fisik yang Sinkron
            MonitoringActionPlanOutput::updateOrCreate(
                [
                    'organization_id' => $mbi['organization_id'],
                    'year' => 2026,
                    'order_no' => $mbi['order_no'],
                ],
                [
                    'organization_id' => $mbi['organization_id'],
                    'year' => 2026,
                    'order_no' => $mbi['order_no'],
                    'sasaran_strategis' => $mbi['sasaran_strategis'],
                    'indikator_sasaran' => $mbi['indikator_sasaran'],
                    'target_sasaran_tahunan' => $mbi['target_sasaran_tahunan'],
                    'program' => $mbi['program'],
                    'kegiatan' => $mbi['kegiatan'],
                    'subkegiatan' => $mbi['subkegiatan'],
                    'indikator_subkegiatan' => $mbi['indikator_subkegiatan'],
                    'satuan' => $mbi['satuan'],
                    'measurement_pattern' => 'cumulative',
                    'target_output_tahunan' => 100.0,
                    'target_tw1' => 25.0,
                    'target_tw2' => 50.0,
                    'target_tw3' => 75.0,
                    'target_tw4' => 100.0,
                    'realisasi_tw1' => 26.5,
                    'realisasi_tw2' => 52.0,
                    'realisasi_tw3' => 0.0,
                    'realisasi_tw4' => 0.0,
                    'person_in_charge' => $mbi['penanggung_jawab_utama'],
                    'created_by' => $adminOpd->id,
                ]
            );
        }
    }
}
