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
     * 3. Perjanjian Kinerja (PK) Lengkap: Kepala Dinas, Sekretaris, 4 Kabid, 12 Kasi, Kepala UPTD
     * 4. Rencana Aksi Kinerja (Action Plan) untuk Seluruh Bidang, Seksi, dan UPTD
     * 5. Monitoring Kinerja Anggaran (Budget) & Output Fisik Triwulanan untuk Seluruh Unit
     */
    public function run(): void
    {
        $rootOpd = Organization::where('code', 'OPD-INDUK')->firstOrFail();
        $sekretariat = Organization::where('code', 'SEKRETARIAT')->firstOrFail();

        // 4 Bidang
        $bidangCK = Organization::where('code', 'BIDANG-CK')->firstOrFail();
        $bidangBM = Organization::where('code', 'BIDANG-BM')->firstOrFail();
        $bidangSDA = Organization::where('code', 'BIDANG-SDA')->firstOrFail();
        $bidangTR = Organization::where('code', 'BIDANG-TR')->firstOrFail();
        $uptd = Organization::where('code', 'UPTD-PUPR')->first() ?? $rootOpd;

        // 12 Seksi
        $seksiCK1 = Organization::where('code', 'SEKSI-CK-1')->first() ?? $bidangCK;
        $seksiCK2 = Organization::where('code', 'SEKSI-CK-2')->first() ?? $bidangCK;
        $seksiCK3 = Organization::where('code', 'SEKSI-CK-3')->first() ?? $bidangCK;

        $seksiBM1 = Organization::where('code', 'SEKSI-BM-1')->first() ?? $bidangBM;
        $seksiBM2 = Organization::where('code', 'SEKSI-BM-2')->first() ?? $bidangBM;
        $seksiBM3 = Organization::where('code', 'SEKSI-BM-3')->first() ?? $bidangBM;

        $seksiSDA1 = Organization::where('code', 'SEKSI-SDA-1')->first() ?? $bidangSDA;
        $seksiSDA2 = Organization::where('code', 'SEKSI-SDA-2')->first() ?? $bidangSDA;
        $seksiSDA3 = Organization::where('code', 'SEKSI-SDA-3')->first() ?? $bidangSDA;

        $seksiTR1 = Organization::where('code', 'SEKSI-TR-1')->first() ?? $bidangTR;
        $seksiTR2 = Organization::where('code', 'SEKSI-TR-2')->first() ?? $bidangTR;
        $seksiTR3 = Organization::where('code', 'SEKSI-TR-3')->first() ?? $bidangTR;

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
                'document_number' => '050/012/RENJA-PUPR/2026',
                'issued_at' => '2026-01-12',
                'description' => 'Rencana Kerja Tahunan Dinas PUPR Mimika Tahun Anggaran 2026 memuat program prioritas infrastruktur.',
                'status' => 'approved',
                'approved_at' => '2026-01-20 14:00:00',
                'locked_at' => null,
                'planning_period_id' => $pp2026->id,
                'performance_period_id' => $perf2026->id,
            ],
        ];

        foreach ($planningDocs as $docData) {
            PlanningDocument::updateOrCreate(
                ['code' => $docData['code']],
                array_merge($docData, [
                    'organization_id' => $rootOpd->id,
                    'created_by' => $adminOpd->id,
                    'approved_by' => $kadis->id,
                ])
            );
        }

        // ══════════════════════════════════════════════════════════════════════
        // 2. POHON KINERJA CASCADING RESMI (PLANNING TREE)
        // ══════════════════════════════════════════════════════════════════════
        $rootTree = PlanningTree::updateOrCreate(
            ['code' => 'TREE-OUTCOME-MIMIKA'],
            [
                'organization_id' => $rootOpd->id,
                'performance_period_id' => $perf2026->id,
                'parent_id' => null,
                'level' => 'ultimate_outcome',
                'name' => 'Terwujudnya Infrastruktur Wilayah yang Handal, Terintegrasi, dan Berkelanjutan di Kabupaten Mimika',
                'description' => 'Visi strategis pembangunan fisik dan spasial untuk mendukung konektivitas ekonomi dan kesejahteraan masyarakat Mimika.',
                'indicator_id' => Indicator::where('code', 'IKU-OPD-01')->first()?->id,
                'sort_order' => 1,
                'is_active' => true,
            ]
        );

        $csfDefinitions = [
            [
                'code' => 'TREE-CSF-BM',
                'name' => 'Meningkatnya Kemantapan dan Aksesibilitas Jaringan Jalan dan Jembatan Kabupaten',
                'desc' => 'Sasaran strategis Bidang Bina Marga untuk memperlancar mobilitas orang dan barang.',
                'org' => $bidangBM,
                'indicator' => Indicator::where('code', 'IKU-OPD-01')->first(),
                'order' => 1,
                'children' => [
                    [
                        'code' => 'TREE-PROG-BM',
                        'level' => 'kondisi_antara',
                        'name' => 'Program Penyelenggaraan Jalan dan Jembatan Daerah',
                        'desc' => 'Peningkatan kapasitas struktur jalan dan pemeliharaan jembatan secara terintegrasi.',
                        'order' => 1,
                        'kegiatan' => [
                            ['code' => 'TREE-KEG-BM-01', 'name' => 'Pembangunan dan Peningkatan Jalan Poros SP 2 - SP 5 Timika', 'order' => 1, 'org_id' => $seksiBM1->id],
                            ['code' => 'TREE-KEG-BM-02', 'name' => 'Pemeliharaan Berkala dan Rutin Jalan Dalam Kota Timika', 'order' => 2, 'org_id' => $seksiBM2->id],
                            ['code' => 'TREE-KEG-BM-03', 'name' => 'Penyusunan Dokumen Leger Jalan dan Database Jembatan', 'order' => 3, 'org_id' => $seksiBM3->id],
                        ],
                    ],
                ],
            ],
            [
                'code' => 'TREE-CSF-CK',
                'name' => 'Meningkatnya Pemenuhan Infrastruktur Permukiman, Bangunan Gedung, dan Air Minum Layak',
                'desc' => 'Sasaran strategis Bidang Cipta Karya untuk mewujudkan lingkungan hunian sehat dan layak huni.',
                'org' => $bidangCK,
                'indicator' => Indicator::where('code', 'IKU-OPD-02')->first(),
                'order' => 2,
                'children' => [
                    [
                        'code' => 'TREE-PROG-CK',
                        'level' => 'kondisi_antara',
                        'name' => 'Program Pengembangan Permukiman dan Cipta Karya Terpadu',
                        'desc' => 'Penyediaan sarana air bersih, sanitasi terpadu, dan gedung pemerintahan laik fungsi.',
                        'order' => 1,
                        'kegiatan' => [
                            ['code' => 'TREE-KEG-CK-01', 'name' => 'Pembangunan Gedung Pelayanan Kantor Pemerintahan Daerah', 'order' => 1, 'org_id' => $seksiCK1->id],
                            ['code' => 'TREE-KEG-CK-02', 'name' => 'Penataan Lingkungan Permukiman Kumuh dan Drainase Lingkungan', 'order' => 2, 'org_id' => $seksiCK2->id],
                            ['code' => 'TREE-KEG-CK-03', 'name' => 'Perluasan Jaringan SPAM Komunal dan Peningkatan Akses Sanitasi', 'order' => 3, 'org_id' => $seksiCK3->id],
                        ],
                    ],
                ],
            ],
            [
                'code' => 'TREE-CSF-SDA',
                'name' => 'Meningkatnya Keandalan Pengendalian Banjir, Ketahanan Sumber Daya Air, dan Saluran Drainase',
                'desc' => 'Sasaran strategis Bidang SDA untuk mitigasi banjir sungai dan pengamanan kawasan permukiman.',
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
                            ['code' => 'TREE-KEG-SDA-01', 'name' => 'Normalisasi Alur Sungai Wania dan Pembangunan Tanggul Pengendali Banjir', 'order' => 1, 'org_id' => $seksiSDA1->id],
                            ['code' => 'TREE-KEG-SDA-02', 'name' => 'Operasi dan Pemeliharaan Pintu Air serta Saluran Drainase Perkotaan Timika', 'order' => 2, 'org_id' => $seksiSDA2->id],
                            ['code' => 'TREE-KEG-SDA-03', 'name' => 'Survei dan Rekomendasi Teknis Pemanfaatan Sumber Air Baku', 'order' => 3, 'org_id' => $seksiSDA3->id],
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
                            ['code' => 'TREE-KEG-TR-01', 'name' => 'Penyusunan Rencana Detail Tata Ruang (RDTR) Kawasan Perkotaan Timika', 'order' => 1, 'org_id' => $seksiTR1->id],
                            ['code' => 'TREE-KEG-TR-02', 'name' => 'Verifikasi Lapangan dan Penerbitan Rekomendasi Teknis KKPR', 'order' => 2, 'org_id' => $seksiTR2->id],
                            ['code' => 'TREE-KEG-TR-03', 'name' => 'Pengawasan, Penertiban, dan Pengendalian Pemanfaatan Ruang Koridor', 'order' => 3, 'org_id' => $seksiTR3->id],
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
                            ['code' => 'TREE-KEG-SEKR-01', 'name' => 'Penyusunan Dokumen Perencanaan, Evaluasi, dan Pelaporan LKjIP Dinas', 'order' => 1, 'org_id' => $sekretariat->id],
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
                            'organization_id' => $kegDef['org_id'] ?? $csfDef['org']->id,
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
        // 3. PERJANJIAN KINERJA (AGREEMENTS) LENGKAP TIAP BIDANG & SEKSI
        // ══════════════════════════════════════════════════════════════════════
        $agreements = [
            // Pimpinan Dinas
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

            // Sekretariat
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

            // 4 Bidang Teknis
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

            // 12 Seksi Bidang Bina Marga
            [
                'code' => 'PK-S-BM-1-2026',
                'title' => 'Perjanjian Kinerja Kepala Seksi Pembangunan Jalan dan Jembatan 2026',
                'name' => 'PK Kasi Pembangunan Jalan & Jembatan 2026',
                'document_number' => '800/07/PK-SBM1/2026',
                'organization_id' => $seksiBM1->id,
                'planning_period_id' => $pp2026->id,
                'performance_period_id' => $perf2026->id,
                'responsible_name' => 'Kepala Seksi Pembangunan Jalan dan Jembatan',
                'counterpart_name' => 'Kepala Bidang Bina Marga',
                'status' => 'approved',
            ],
            [
                'code' => 'PK-S-BM-2-2026',
                'title' => 'Perjanjian Kinerja Kepala Seksi Pemeliharaan Jalan dan Jembatan 2026',
                'name' => 'PK Kasi Pemeliharaan Jalan & Jembatan 2026',
                'document_number' => '800/08/PK-SBM2/2026',
                'organization_id' => $seksiBM2->id,
                'planning_period_id' => $pp2026->id,
                'performance_period_id' => $perf2026->id,
                'responsible_name' => 'Kepala Seksi Pemeliharaan Jalan dan Jembatan',
                'counterpart_name' => 'Kepala Bidang Bina Marga',
                'status' => 'approved',
            ],
            [
                'code' => 'PK-S-BM-3-2026',
                'title' => 'Perjanjian Kinerja Kepala Seksi Perencanaan dan Leger Jalan 2026',
                'name' => 'PK Kasi Perencanaan & Leger Jalan 2026',
                'document_number' => '800/09/PK-SBM3/2026',
                'organization_id' => $seksiBM3->id,
                'planning_period_id' => $pp2026->id,
                'performance_period_id' => $perf2026->id,
                'responsible_name' => 'Kepala Seksi Perencanaan Dan Leger Jalan',
                'counterpart_name' => 'Kepala Bidang Bina Marga',
                'status' => 'approved',
            ],

            // 12 Seksi Bidang Cipta Karya
            [
                'code' => 'PK-S-CK-1-2026',
                'title' => 'Perjanjian Kinerja Kepala Seksi Bangunan Gedung dan Lingkungan 2026',
                'name' => 'PK Kasi Bangunan Gedung 2026',
                'document_number' => '800/10/PK-SCK1/2026',
                'organization_id' => $seksiCK1->id,
                'planning_period_id' => $pp2026->id,
                'performance_period_id' => $perf2026->id,
                'responsible_name' => 'Kepala Seksi Bangunan Gedung dan Lingkungan',
                'counterpart_name' => 'Kepala Bidang Cipta Karya',
                'status' => 'approved',
            ],
            [
                'code' => 'PK-S-CK-2-2026',
                'title' => 'Perjanjian Kinerja Kepala Seksi Penyehatan Prasarana Pemukiman 2026',
                'name' => 'PK Kasi Penyehatan Pemukiman 2026',
                'document_number' => '800/11/PK-SCK2/2026',
                'organization_id' => $seksiCK2->id,
                'planning_period_id' => $pp2026->id,
                'performance_period_id' => $perf2026->id,
                'responsible_name' => 'Kepala Seksi Penyehatan Prasarana Pemukiman',
                'counterpart_name' => 'Kepala Bidang Cipta Karya',
                'status' => 'approved',
            ],
            [
                'code' => 'PK-S-CK-3-2026',
                'title' => 'Perjanjian Kinerja Kepala Seksi Air Minum Dan Sanitasi 2026',
                'name' => 'PK Kasi Air Minum & Sanitasi 2026',
                'document_number' => '800/12/PK-SCK3/2026',
                'organization_id' => $seksiCK3->id,
                'planning_period_id' => $pp2026->id,
                'performance_period_id' => $perf2026->id,
                'responsible_name' => 'Kepala Seksi Air Minum Dan Sanitasi',
                'counterpart_name' => 'Kepala Bidang Cipta Karya',
                'status' => 'approved',
            ],

            // 12 Seksi Bidang Sumber Daya Air
            [
                'code' => 'PK-S-SDA-1-2026',
                'title' => 'Perjanjian Kinerja Kepala Seksi Pembangunan Sarpras SDA 2026',
                'name' => 'PK Kasi Pembangunan Sarpras SDA 2026',
                'document_number' => '800/13/PK-SSDA1/2026',
                'organization_id' => $seksiSDA1->id,
                'planning_period_id' => $pp2026->id,
                'performance_period_id' => $perf2026->id,
                'responsible_name' => 'Kepala Seksi Pembangunan Sarpras SDA',
                'counterpart_name' => 'Kepala Bidang Sumber Daya Air',
                'status' => 'approved',
            ],
            [
                'code' => 'PK-S-SDA-2-2026',
                'title' => 'Perjanjian Kinerja Kepala Seksi Operasi dan Pemeliharaan SDA 2026',
                'name' => 'PK Kasi OP SDA 2026',
                'document_number' => '800/14/PK-SSDA2/2026',
                'organization_id' => $seksiSDA2->id,
                'planning_period_id' => $pp2026->id,
                'performance_period_id' => $perf2026->id,
                'responsible_name' => 'Kepala Seksi Operasi dan Pemeliharaan SDA',
                'counterpart_name' => 'Kepala Bidang Sumber Daya Air',
                'status' => 'approved',
            ],
            [
                'code' => 'PK-S-SDA-3-2026',
                'title' => 'Perjanjian Kinerja Kepala Seksi Bina Manfaat SDA 2026',
                'name' => 'PK Kasi Bina Manfaat SDA 2026',
                'document_number' => '800/15/PK-SSDA3/2026',
                'organization_id' => $seksiSDA3->id,
                'planning_period_id' => $pp2026->id,
                'performance_period_id' => $perf2026->id,
                'responsible_name' => 'Kepala Seksi Bina Manfaat SDA',
                'counterpart_name' => 'Kepala Bidang Sumber Daya Air',
                'status' => 'approved',
            ],

            // 12 Seksi Bidang Penataan Ruang
            [
                'code' => 'PK-S-TR-1-2026',
                'title' => 'Perjanjian Kinerja Kepala Seksi Perencanaan Tata Ruang 2026',
                'name' => 'PK Kasi Perencanaan Tata Ruang 2026',
                'document_number' => '800/16/PK-STR1/2026',
                'organization_id' => $seksiTR1->id,
                'planning_period_id' => $pp2026->id,
                'performance_period_id' => $perf2026->id,
                'responsible_name' => 'Kepala Seksi Perencanaan Tata Ruang',
                'counterpart_name' => 'Kepala Bidang Penataan Ruang',
                'status' => 'approved',
            ],
            [
                'code' => 'PK-S-TR-2-2026',
                'title' => 'Perjanjian Kinerja Kepala Seksi Pemanfaatan Ruang 2026',
                'name' => 'PK Kasi Pemanfaatan Ruang 2026',
                'document_number' => '800/17/PK-STR2/2026',
                'organization_id' => $seksiTR2->id,
                'planning_period_id' => $pp2026->id,
                'performance_period_id' => $perf2026->id,
                'responsible_name' => 'Kepala Seksi Pemanfaatan Ruang',
                'counterpart_name' => 'Kepala Bidang Penataan Ruang',
                'status' => 'approved',
            ],
            [
                'code' => 'PK-S-TR-3-2026',
                'title' => 'Perjanjian Kinerja Kepala Seksi Pengendalian Tata Ruang 2026',
                'name' => 'PK Kasi Pengendalian Tata Ruang 2026',
                'document_number' => '800/18/PK-STR3/2026',
                'organization_id' => $seksiTR3->id,
                'planning_period_id' => $pp2026->id,
                'performance_period_id' => $perf2026->id,
                'responsible_name' => 'Kepala Seksi Pengendalian Tata Ruang',
                'counterpart_name' => 'Kepala Bidang Penataan Ruang',
                'status' => 'approved',
            ],

            // UPTD PUPR
            [
                'code' => 'PK-UPTD-2026',
                'title' => 'Perjanjian Kinerja Kepala UPTD Pengujian dan Peralatan 2026',
                'name' => 'PK Kepala UPTD PUPR 2026',
                'document_number' => '800/19/PK-UPTD/2026',
                'organization_id' => $uptd->id,
                'planning_period_id' => $pp2026->id,
                'performance_period_id' => $perf2026->id,
                'responsible_name' => 'Kepala UPTD Pengujian dan Peralatan PUPR',
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
        // 4. RENCANA AKSI KINERJA (ACTION PLANS) LENGKAP TIAP BIDANG & SEKSI
        // ══════════════════════════════════════════════════════════════════════
        $actionPlans = [
            // Bidang Bina Marga & Seksinya
            [
                'code' => 'AP-BM-01',
                'title' => 'Peningkatan dan Pengaspalan Jalan Poros Sp 2 - Sp 5 Timika',
                'activity' => 'Rekonstruksi badan jalan dan pengaspalan hotmix sepanjang 8.5 km',
                'organization_id' => $seksiBM1->id,
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
                'organization_id' => $seksiBM1->id,
                'target_value' => 1.0,
                'progress' => 80.0,
                'status' => 'in_progress',
                'start_date' => '2026-03-01',
                'end_date' => '2026-09-30',
            ],
            [
                'code' => 'AP-BM-03',
                'title' => 'Pemeliharaan Rutin dan Penambalan Jalan Berlubang Dalam Kota Timika',
                'activity' => 'Patching aspal dingin/panas pada 18 ruas jalan protokol kota',
                'organization_id' => $seksiBM2->id,
                'target_value' => 35.0,
                'progress' => 55.0,
                'status' => 'in_progress',
                'start_date' => '2026-01-15',
                'end_date' => '2026-12-15',
            ],
            [
                'code' => 'AP-BM-04',
                'title' => 'Penyusunan Dokumen Leger Jalan dan Pemutakhiran Database IRMS',
                'activity' => 'Survei kondisi perkerasan jalan kabupaten menggunakan alat survei digital',
                'organization_id' => $seksiBM3->id,
                'target_value' => 100.0,
                'progress' => 90.0,
                'status' => 'completed',
                'start_date' => '2026-01-10',
                'end_date' => '2026-06-30',
            ],

            // Bidang Cipta Karya & Seksinya
            [
                'code' => 'AP-CK-01',
                'title' => 'Pembangunan Gedung Kantor Bersama Pelayanan Publik Daerah Mimika',
                'activity' => 'Penyelesaian struktur lantai 3 dan instalasi ME gedung pelayanan',
                'organization_id' => $seksiCK1->id,
                'target_value' => 1.0,
                'progress' => 45.0,
                'status' => 'in_progress',
                'start_date' => '2026-03-15',
                'end_date' => '2026-11-30',
            ],
            [
                'code' => 'AP-CK-02',
                'title' => 'Peningkatan Kualitas Permukiman Kumuh Kawasan Kwamki Narama',
                'activity' => 'Pembangunan jalan lingkungan rabat beton dan drainase permukiman',
                'organization_id' => $seksiCK2->id,
                'target_value' => 12.5,
                'progress' => 75.0,
                'status' => 'in_progress',
                'start_date' => '2026-02-10',
                'end_date' => '2026-10-15',
            ],
            [
                'code' => 'AP-CK-03',
                'title' => 'Perluasan Jaringan Pipa Distribusi Utama SPAM Kuala Kencana',
                'activity' => 'Pemasangan pipa HDPE diameter 200mm sepanjang 6.2 km dan 500 Sambungan Rumah',
                'organization_id' => $seksiCK3->id,
                'target_value' => 500.0,
                'progress' => 70.0,
                'status' => 'in_progress',
                'start_date' => '2026-01-15',
                'end_date' => '2026-08-31',
            ],
            [
                'code' => 'AP-CK-04',
                'title' => 'Pembangunan Tangki Septik Komunal Skala Kawasan Permukiman Sehat',
                'activity' => 'Konstruksi tangki septik biofilter untuk 250 kepala keluarga',
                'organization_id' => $seksiCK3->id,
                'target_value' => 250.0,
                'progress' => 60.0,
                'status' => 'in_progress',
                'start_date' => '2026-02-20',
                'end_date' => '2026-09-30',
            ],

            // Bidang Sumber Daya Air & Seksinya
            [
                'code' => 'AP-SDA-01',
                'title' => 'Pembangunan Tanggul Beton dan Parapet Pengendali Banjir Sungai Wania',
                'activity' => 'Konstruksi bronjong kawat dan parapet beton penahan limpasan sepanjang 2.4 km',
                'organization_id' => $seksiSDA1->id,
                'target_value' => 2.4,
                'progress' => 55.0,
                'status' => 'in_progress',
                'start_date' => '2026-02-15',
                'end_date' => '2026-10-15',
            ],
            [
                'code' => 'AP-SDA-02',
                'title' => 'Pengerukan Sedimen dan Pembersihan Alur Saluran Pembuang Timika Jaya',
                'activity' => 'Normalisasi saluran drainase perkotaan dengan ekskavator amphibi',
                'organization_id' => $seksiSDA2->id,
                'target_value' => 14.0,
                'progress' => 85.0,
                'status' => 'in_progress',
                'start_date' => '2026-01-20',
                'end_date' => '2026-08-30',
            ],
            [
                'code' => 'AP-SDA-03',
                'title' => 'Inventarisasi dan Pemetaan Geospasial Potensi Sumber Air Baku',
                'activity' => 'Survei debit dan baku mutu air pada 12 titik tangkapan air wilayah Mimika',
                'organization_id' => $seksiSDA3->id,
                'target_value' => 12.0,
                'progress' => 100.0,
                'status' => 'completed',
                'start_date' => '2026-01-10',
                'end_date' => '2026-05-15',
            ],

            // Bidang Penataan Ruang & Seksinya
            [
                'code' => 'AP-TR-01',
                'title' => 'Penyusunan Dokumen RDTR BWP Perkotaan Timika Koridor SP 2 - SP 5',
                'activity' => 'Konsultasi publik tahap II dan asistensi peta dasar skala 1:5000',
                'organization_id' => $seksiTR1->id,
                'target_value' => 1.0,
                'progress' => 90.0,
                'status' => 'completed',
                'start_date' => '2026-01-10',
                'end_date' => '2026-05-30',
            ],
            [
                'code' => 'AP-TR-02',
                'title' => 'Layanan Verifikasi Lapangan dan Asistensi Rekomendasi KKPR Berusaha',
                'activity' => 'Penerbitan surat rekomendasi teknis kesesuaian ruang sistem OSS-RBA',
                'organization_id' => $seksiTR2->id,
                'target_value' => 180.0,
                'progress' => 65.0,
                'status' => 'in_progress',
                'start_date' => '2026-01-05',
                'end_date' => '2026-12-20',
            ],
            [
                'code' => 'AP-TR-03',
                'title' => 'Patroli Pengawasan Tertib Pemanfaatan Garis Sempadan Jalan dan Bangunan',
                'activity' => 'Inspeksi berkala kepatuhan izin mendirikan bangunan terhadap rencana tata ruang',
                'organization_id' => $seksiTR3->id,
                'target_value' => 24.0,
                'progress' => 50.0,
                'status' => 'in_progress',
                'start_date' => '2026-02-01',
                'end_date' => '2026-11-30',
            ],

            // UPTD PUPR
            [
                'code' => 'AP-UPTD-01',
                'title' => 'Kalibrasi dan Pengujian Laboratorium Uji Kuat Tekan Beton & Aspal',
                'activity' => 'Pengujian mutu sampel material konstruksi proyek dinas dan masyarakat',
                'organization_id' => $uptd->id,
                'target_value' => 350.0,
                'progress' => 60.0,
                'status' => 'in_progress',
                'start_date' => '2026-01-15',
                'end_date' => '2026-12-10',
            ],
            [
                'code' => 'AP-UPTD-02',
                'title' => 'Kesiapsiagaan Mobilisasi Alat Berat Tanggap Darurat Bencana Longsor/Banjir',
                'activity' => 'Pemeliharaan kesiapan unit wheel loader, grader, dan dump truck dinas',
                'organization_id' => $uptd->id,
                'target_value' => 100.0,
                'progress' => 95.0,
                'status' => 'in_progress',
                'start_date' => '2026-01-01',
                'end_date' => '2026-12-31',
            ],

            // Sekretariat
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
            [
                'code' => 'AP-SEKR-02',
                'title' => 'Penyusunan Laporan Kinerja Instansi Pemerintah (LKjIP) Dinas PUPR 2025',
                'activity' => 'Pengumpulan data capaian IKU, analisis efisiensi, dan layout dokumen LKjIP',
                'organization_id' => $sekretariat->id,
                'target_value' => 1.0,
                'progress' => 100.0,
                'status' => 'completed',
                'start_date' => '2026-01-10',
                'end_date' => '2026-03-31',
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
            // Bina Marga - Seksi 1
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
                'organization_id' => $seksiBM1->id,
            ],
            // Bina Marga - Seksi 2
            [
                'order_no' => 2,
                'sasaran_strategis' => 'Meningkatnya Kemantapan Jaringan Jalan dan Jembatan Kabupaten',
                'indikator_sasaran' => 'Persentase Jalan Kabupaten Kondisi Mantap',
                'target_sasaran_tahunan' => 76.0,
                'program' => 'Penyelenggaraan Jalan dan Jembatan',
                'kegiatan' => 'Pemeliharaan Jalan dan Jembatan',
                'subkegiatan' => 'Pemeliharaan Berkala Jalan Perkotaan Timika',
                'indikator_subkegiatan' => 'Panjang Jalan Terpelihara (km)',
                'satuan' => 'km',
                'pagu_tahunan' => 8500000000,
                'pagu_tw1' => 1700000000,
                'pagu_tw2' => 2550000000,
                'pagu_tw3' => 2550000000,
                'pagu_tw4' => 1700000000,
                'realisasi_tw1' => 1650000000,
                'realisasi_tw2' => 2480000000,
                'realisasi_tw3' => 0,
                'realisasi_tw4' => 0,
                'penanggung_jawab_utama' => 'Kepala Bidang Bina Marga',
                'pengampu_teknis' => 'Seksi Pemeliharaan Jalan dan Jembatan',
                'organization_id' => $seksiBM2->id,
            ],
            // Cipta Karya - Seksi 1
            [
                'order_no' => 3,
                'sasaran_strategis' => 'Meningkatnya Kelayakan Bangunan Gedung Pemerintahan',
                'indikator_sasaran' => 'Persentase Gedung Memenuhi Standar Laik Fungsi',
                'target_sasaran_tahunan' => 85.0,
                'program' => 'Penataan Bangunan Gedung',
                'kegiatan' => 'Pembangunan Gedung Daerah',
                'subkegiatan' => 'Pembangunan Gedung Pelayanan Kantor Bersama Timika',
                'indikator_subkegiatan' => 'Gedung Selesai Terbangun (Unit)',
                'satuan' => 'Unit',
                'pagu_tahunan' => 18000000000,
                'pagu_tw1' => 3600000000,
                'pagu_tw2' => 5400000000,
                'pagu_tw3' => 5400000000,
                'pagu_tw4' => 3600000000,
                'realisasi_tw1' => 3450000000,
                'realisasi_tw2' => 5200000000,
                'realisasi_tw3' => 0,
                'realisasi_tw4' => 0,
                'penanggung_jawab_utama' => 'Kepala Bidang Cipta Karya',
                'pengampu_teknis' => 'Seksi Bangunan Gedung dan Lingkungan',
                'organization_id' => $seksiCK1->id,
            ],
            // Cipta Karya - Seksi 3
            [
                'order_no' => 4,
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
                'organization_id' => $seksiCK3->id,
            ],
            // Sumber Daya Air - Seksi 1
            [
                'order_no' => 5,
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
                'organization_id' => $seksiSDA1->id,
            ],
            // Sumber Daya Air - Seksi 2
            [
                'order_no' => 6,
                'sasaran_strategis' => 'Meningkatnya Pengendalian Banjir dan Pengamanan Sungai',
                'indikator_sasaran' => 'Luas Kawasan Banjir yang Tertangani (%)',
                'target_sasaran_tahunan' => 75.0,
                'program' => 'Pengendalian Banjir dan Drainase',
                'kegiatan' => 'Operasi dan Pemeliharaan Drainase',
                'subkegiatan' => 'Normalisasi Saluran Pembuang Kota Timika',
                'indikator_subkegiatan' => 'Panjang Saluran Dinormalisasi (km)',
                'satuan' => 'km',
                'pagu_tahunan' => 4500000000,
                'pagu_tw1' => 900000000,
                'pagu_tw2' => 1350000000,
                'pagu_tw3' => 1350000000,
                'pagu_tw4' => 900000000,
                'realisasi_tw1' => 880000000,
                'realisasi_tw2' => 1310000000,
                'realisasi_tw3' => 0,
                'realisasi_tw4' => 0,
                'penanggung_jawab_utama' => 'Kepala Bidang Sumber Daya Air',
                'pengampu_teknis' => 'Seksi Operasi dan Pemeliharaan SDA',
                'organization_id' => $seksiSDA2->id,
            ],
            // Penataan Ruang - Seksi 1
            [
                'order_no' => 7,
                'sasaran_strategis' => 'Meningkatnya Keteraturan Tata Ruang Daerah',
                'indikator_sasaran' => 'Tingkat Kesesuaian Tata Ruang RTRW (%)',
                'target_sasaran_tahunan' => 90.0,
                'program' => 'Penyelenggaraan Penataan Ruang',
                'kegiatan' => 'Perencanaan Tata Ruang',
                'subkegiatan' => 'Penyusunan RDTR BWP Perkotaan Timika',
                'indikator_subkegiatan' => 'Dokumen RDTR Selesai Disusun (Dok)',
                'satuan' => 'Dokumen',
                'pagu_tahunan' => 2200000000,
                'pagu_tw1' => 440000000,
                'pagu_tw2' => 660000000,
                'pagu_tw3' => 660000000,
                'pagu_tw4' => 440000000,
                'realisasi_tw1' => 430000000,
                'realisasi_tw2' => 650000000,
                'realisasi_tw3' => 0,
                'realisasi_tw4' => 0,
                'penanggung_jawab_utama' => 'Kepala Bidang Penataan Ruang',
                'pengampu_teknis' => 'Seksi Perencanaan Tata Ruang',
                'organization_id' => $seksiTR1->id,
            ],
            // Penataan Ruang - Seksi 2
            [
                'order_no' => 8,
                'sasaran_strategis' => 'Meningkatnya Keteraturan Tata Ruang Daerah',
                'indikator_sasaran' => 'Tingkat Kesesuaian Tata Ruang RTRW (%)',
                'target_sasaran_tahunan' => 90.0,
                'program' => 'Penyelenggaraan Penataan Ruang',
                'kegiatan' => 'Pemanfaatan Ruang',
                'subkegiatan' => 'Pelayanan Rekomendasi Teknis KKPR OSS',
                'indikator_subkegiatan' => 'Jumlah Rekomendasi KKPR Diterbitkan (Surat)',
                'satuan' => 'Surat',
                'pagu_tahunan' => 1200000000,
                'pagu_tw1' => 240000000,
                'pagu_tw2' => 360000000,
                'pagu_tw3' => 360000000,
                'pagu_tw4' => 240000000,
                'realisasi_tw1' => 235000000,
                'realisasi_tw2' => 355000000,
                'realisasi_tw3' => 0,
                'realisasi_tw4' => 0,
                'penanggung_jawab_utama' => 'Kepala Bidang Penataan Ruang',
                'pengampu_teknis' => 'Seksi Pemanfaatan Ruang',
                'organization_id' => $seksiTR2->id,
            ],
            // UPTD PUPR
            [
                'order_no' => 9,
                'sasaran_strategis' => 'Meningkatnya Mutu Konstruksi dan Efektivitas Peralatan',
                'indikator_sasaran' => 'Tingkat Kesiapan Alat Berat & Keandalan Uji Lab (%)',
                'target_sasaran_tahunan' => 92.0,
                'program' => 'Operasional UPTD Peralatan dan Pengujian',
                'kegiatan' => 'Pengujian Laboratorium dan Sewa Alat Berat',
                'subkegiatan' => 'Operasionalisasi Uji Mutu Bahan Konstruksi & Pemeliharaan Alat',
                'indikator_subkegiatan' => 'Sampel Uji Beton & Jam Operasi Alat (Jam)',
                'satuan' => 'Sampel/Jam',
                'pagu_tahunan' => 1800000000,
                'pagu_tw1' => 450000000,
                'pagu_tw2' => 450000000,
                'pagu_tw3' => 450000000,
                'pagu_tw4' => 450000000,
                'realisasi_tw1' => 440000000,
                'realisasi_tw2' => 445000000,
                'realisasi_tw3' => 0,
                'realisasi_tw4' => 0,
                'penanggung_jawab_utama' => 'Kepala UPTD PUPR',
                'pengampu_teknis' => 'UPTD PUPR Mimika',
                'organization_id' => $uptd->id,
            ],
            // Sekretariat
            [
                'order_no' => 10,
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
