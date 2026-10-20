<?php

namespace Database\Seeders;

use App\Models\Evidence;
use App\Models\Organization;
use App\Models\Realization;
use App\Models\RealizationOpdItem;
use App\Models\User;
use Illuminate\Database\Seeder;

class RealizationSeeder extends Seeder
{
    /**
     * Menyiapkan Data Realisasi Kinerja Berjenjang OPD PUPR Kabupaten Mimika:
     * 1. Hierarki Realisasi OPD (Tujuan & Sasaran Strategis Multi-Tahun 2022-2026) untuk Seluruh Bidang & Seksi
     * 2. Evidence Digital (Bukti Dukung Sah untuk Realisasi Triwulanan Berbagai Unit)
     */
    public function run(): void
    {
        $rootOpd = Organization::where('code', 'OPD-INDUK')->firstOrFail();
        $sekretariat = Organization::where('code', 'SEKRETARIAT')->firstOrFail();

        $bidangBM = Organization::where('code', 'BIDANG-BM')->firstOrFail();
        $bidangCK = Organization::where('code', 'BIDANG-CK')->firstOrFail();
        $bidangSDA = Organization::where('code', 'BIDANG-SDA')->firstOrFail();
        $bidangTR = Organization::where('code', 'BIDANG-TR')->firstOrFail();
        $uptd = Organization::where('code', 'UPTD-PUPR')->first() ?? $rootOpd;

        $seksiBM1 = Organization::where('code', 'SEKSI-BM-1')->first() ?? $bidangBM;
        $seksiBM2 = Organization::where('code', 'SEKSI-BM-2')->first() ?? $bidangBM;
        $seksiBM3 = Organization::where('code', 'SEKSI-BM-3')->first() ?? $bidangBM;

        $seksiCK1 = Organization::where('code', 'SEKSI-CK-1')->first() ?? $bidangCK;
        $seksiCK2 = Organization::where('code', 'SEKSI-CK-2')->first() ?? $bidangCK;
        $seksiCK3 = Organization::where('code', 'SEKSI-CK-3')->first() ?? $bidangCK;

        $seksiSDA1 = Organization::where('code', 'SEKSI-SDA-1')->first() ?? $bidangSDA;
        $seksiSDA2 = Organization::where('code', 'SEKSI-SDA-2')->first() ?? $bidangSDA;
        $seksiSDA3 = Organization::where('code', 'SEKSI-SDA-3')->first() ?? $bidangSDA;

        $seksiTR1 = Organization::where('code', 'SEKSI-TR-1')->first() ?? $bidangTR;
        $seksiTR2 = Organization::where('code', 'SEKSI-TR-2')->first() ?? $bidangTR;
        $seksiTR3 = Organization::where('code', 'SEKSI-TR-3')->first() ?? $bidangTR;

        $adminOpd = User::where('email', 'admin.pupr@siperforma.local')->first()
            ?? User::where('email', 'superadmin@siperforma.local')->firstOrFail();

        // ══════════════════════════════════════════════════════════════════════
        // 1. DATA REALISASI HIERARKI MULTI-TAHUN PER ORGANISASI (REALIZATION OPD ITEMS)
        // ══════════════════════════════════════════════════════════════════════
        $orgHierarchyData = [
            // A. OPD Induk
            [
                'org' => $rootOpd,
                'goals' => [
                    [
                        'order_no' => 1,
                        'goal' => 'Tujuan 1: Meningkatkan Kemantapan dan Aksesibilitas Infrastruktur Dasar Wilayah Kabupaten Mimika',
                        'goal_indicator' => 'Indeks Kemantapan Infrastruktur PUPR Daerah',
                        'goal_indicator_unit' => 'Poin',
                        'goal_measurement_pattern' => 'Positif',
                        'goal_targets' => [2022 => 72.0, 2023 => 75.5, 2024 => 81.0, 2025 => 84.5, 2026 => 87.0],
                        'goal_realizations' => [2022 => 73.1, 2023 => 76.8, 2024 => 82.3, 2025 => 85.1, 2026 => 86.8],
                        'objectives' => [
                            [
                                'order_no' => 1,
                                'objective' => 'Sasaran 1.1: Peningkatan Kemantapan Jaringan Jalan Poros dan Jembatan Kabupaten',
                                'objective_indicator' => 'Persentase Jalan Kabupaten dalam Kondisi Mantap',
                                'unit' => '%',
                                'measurement_pattern' => 'Positif',
                                'targets' => [2022 => 58.0, 2023 => 62.0, 2024 => 68.0, 2025 => 72.5, 2026 => 76.0],
                                'realizations' => [2022 => 59.2, 2023 => 63.4, 2024 => 69.1, 2025 => 73.4, 2026 => 75.8],
                            ],
                            [
                                'order_no' => 2,
                                'objective' => 'Sasaran 1.2: Peningkatan Akses Air Minum Perpipaan dan Sanitasi Layak',
                                'objective_indicator' => 'Cakupan Akses Air Minum Layak dan Aman',
                                'unit' => '%',
                                'measurement_pattern' => 'Positif',
                                'targets' => [2022 => 65.0, 2023 => 68.5, 2024 => 74.0, 2025 => 78.0, 2026 => 82.0],
                                'realizations' => [2022 => 66.2, 2023 => 70.1, 2024 => 75.2, 2025 => 79.1, 2026 => 81.5],
                            ],
                        ],
                    ],
                    [
                        'order_no' => 2,
                        'goal' => 'Tujuan 2: Mewujudkan Tertib Penataan Ruang Wilayah dan Akuntabilitas Tata Kelola Birokrasi PUPR',
                        'goal_indicator' => 'Indeks Tertib Penataan Ruang dan Akuntabilitas PUPR',
                        'goal_indicator_unit' => 'Poin',
                        'goal_measurement_pattern' => 'Positif',
                        'goal_targets' => [2022 => 70.0, 2023 => 74.0, 2024 => 80.0, 2025 => 85.0, 2026 => 89.0],
                        'goal_realizations' => [2022 => 71.5, 2023 => 75.8, 2024 => 81.8, 2025 => 85.6, 2026 => 88.5],
                        'objectives' => [
                            [
                                'order_no' => 1,
                                'objective' => 'Sasaran 2.1: Keteraturan Pemanfaatan Ruang Sesuai Zonasi RTRW',
                                'objective_indicator' => 'Tingkat Kesesuaian Pemanfaatan Ruang terhadap Dokumen RTRW',
                                'unit' => '%',
                                'measurement_pattern' => 'Positif',
                                'targets' => [2022 => 68.0, 2023 => 72.0, 2024 => 80.0, 2025 => 85.0, 2026 => 90.0],
                                'realizations' => [2022 => 69.5, 2023 => 73.8, 2024 => 81.5, 2025 => 86.0, 2026 => 89.4],
                            ],
                            [
                                'order_no' => 2,
                                'objective' => 'Sasaran 2.2: Penguatan Akuntabilitas Kinerja Instansi SAKIP',
                                'objective_indicator' => 'Nilai Akuntabilitas Kinerja Instansi Pemerintah (SAKIP) Dinas',
                                'unit' => 'Poin',
                                'measurement_pattern' => 'Positif',
                                'targets' => [2022 => 75.0, 2023 => 78.5, 2024 => 82.0, 2025 => 85.0, 2026 => 88.0],
                                'realizations' => [2022 => 76.2, 2023 => 79.4, 2024 => 82.5, 2025 => 84.8, 2026 => 87.2],
                            ],
                        ],
                    ],
                ],
            ],

            // B. Bidang Bina Marga
            [
                'org' => $bidangBM,
                'goals' => [
                    [
                        'order_no' => 1,
                        'goal' => 'Sasaran Strategis: Meningkatnya Kualitas dan Kemantapan Jalan dan Jembatan Kabupaten',
                        'goal_indicator' => 'Persentase Jalan Kabupaten dalam Kondisi Mantap',
                        'goal_indicator_unit' => '%',
                        'goal_measurement_pattern' => 'Positif',
                        'goal_targets' => [2024 => 68.0, 2025 => 72.5, 2026 => 76.0],
                        'goal_realizations' => [2024 => 69.1, 2025 => 73.4, 2026 => 75.8],
                        'objectives' => [
                            [
                                'order_no' => 1,
                                'objective' => 'Program Penyelenggaraan Jalan dan Jembatan',
                                'objective_indicator' => 'Panjang Jalan Kabupaten Selesai Ditingkatkan/Diperbaiki',
                                'unit' => 'km',
                                'measurement_pattern' => 'Positif',
                                'targets' => [2024 => 25.0, 2025 => 32.0, 2026 => 40.0],
                                'realizations' => [2024 => 26.2, 2025 => 33.5, 2026 => 38.5],
                            ],
                        ],
                    ],
                ],
            ],

            // Seksi Bina Marga 1
            [
                'org' => $seksiBM1,
                'goals' => [
                    [
                        'order_no' => 1,
                        'goal' => 'Sasaran Seksi: Terlaksananya Pembangunan dan Rekonstruksi Jalan Poros Strategis',
                        'goal_indicator' => 'Panjang Jalan dan Jembatan Baru/Peningkatan Terbangun',
                        'goal_indicator_unit' => 'km',
                        'goal_measurement_pattern' => 'Positif',
                        'goal_targets' => [2024 => 15.0, 2025 => 20.0, 2026 => 25.0],
                        'goal_realizations' => [2024 => 15.8, 2025 => 21.2, 2026 => 24.5],
                        'objectives' => [
                            [
                                'order_no' => 1,
                                'objective' => 'Kegiatan Rekonstruksi Jalan Poros Antar Distrik',
                                'objective_indicator' => 'Persentase Fisik Peningkatan Jalan Selesai Sesuai Spesifikasi',
                                'unit' => '%',
                                'measurement_pattern' => 'Positif',
                                'targets' => [2024 => 100.0, 2025 => 100.0, 2026 => 100.0],
                                'realizations' => [2024 => 100.0, 2025 => 100.0, 2026 => 96.5],
                            ],
                        ],
                    ],
                ],
            ],

            // Seksi Bina Marga 2
            [
                'org' => $seksiBM2,
                'goals' => [
                    [
                        'order_no' => 1,
                        'goal' => 'Sasaran Seksi: Terjaganya Kondisi Jalan Melalui Pemeliharaan Rutin dan Berkala',
                        'goal_indicator' => 'Panjang Jalan yang Tertangani Pemeliharaan Rutin',
                        'goal_indicator_unit' => 'km',
                        'goal_measurement_pattern' => 'Positif',
                        'goal_targets' => [2024 => 30.0, 2025 => 40.0, 2026 => 50.0],
                        'goal_realizations' => [2024 => 32.0, 2025 => 42.5, 2026 => 48.0],
                        'objectives' => [
                            [
                                'order_no' => 1,
                                'objective' => 'Kegiatan Penambalan Cepat Lubang Jalan (Zero Potholes)',
                                'objective_indicator' => 'Tingkat Ketepatan Penanganan Lubang Jalan Protokol',
                                'unit' => '%',
                                'measurement_pattern' => 'Positif',
                                'targets' => [2024 => 85.0, 2025 => 90.0, 2026 => 95.0],
                                'realizations' => [2024 => 86.5, 2025 => 91.0, 2026 => 94.2],
                            ],
                        ],
                    ],
                ],
            ],

            // C. Bidang Cipta Karya
            [
                'org' => $bidangCK,
                'goals' => [
                    [
                        'order_no' => 1,
                        'goal' => 'Sasaran Strategis: Meningkatnya Kualitas Hunian, Air Minum, dan Bangunan Gedung',
                        'goal_indicator' => 'Cakupan Akses Air Minum Layak dan Aman',
                        'goal_indicator_unit' => '%',
                        'goal_measurement_pattern' => 'Positif',
                        'goal_targets' => [2024 => 74.0, 2025 => 78.0, 2026 => 82.0],
                        'goal_realizations' => [2024 => 75.2, 2025 => 79.1, 2026 => 81.5],
                        'objectives' => [
                            [
                                'order_no' => 1,
                                'objective' => 'Program Pengembangan Permukiman dan Cipta Karya',
                                'objective_indicator' => 'Jumlah Sambungan Rumah Air Minum Baru Terbangun',
                                'unit' => 'SR',
                                'measurement_pattern' => 'Positif',
                                'targets' => [2024 => 800, 2025 => 1200, 2026 => 1500],
                                'realizations' => [2024 => 840, 2025 => 1250, 2026 => 1480],
                            ],
                        ],
                    ],
                ],
            ],

            // Seksi Cipta Karya 3 (Air Minum & Sanitasi)
            [
                'org' => $seksiCK3,
                'goals' => [
                    [
                        'order_no' => 1,
                        'goal' => 'Sasaran Seksi: Perluasan Jaringan SPAM Komunal dan Sanitasi Perkotaan',
                        'goal_indicator' => 'Jumlah Sambungan Rumah Baru Air Minum Perpipaan',
                        'goal_indicator_unit' => 'SR',
                        'goal_measurement_pattern' => 'Positif',
                        'goal_targets' => [2024 => 800, 2025 => 1200, 2026 => 1500],
                        'goal_realizations' => [2024 => 840, 2025 => 1250, 2026 => 1480],
                        'objectives' => [
                            [
                                'order_no' => 1,
                                'objective' => 'Penyediaan Prasarana Tangki Septik Komunal Sehat',
                                'objective_indicator' => 'Jumlah KK Terfasilitasi Tangki Septik Standar',
                                'unit' => 'KK',
                                'measurement_pattern' => 'Positif',
                                'targets' => [2024 => 200, 2025 => 300, 2026 => 400],
                                'realizations' => [2024 => 210, 2025 => 315, 2026 => 390],
                            ],
                        ],
                    ],
                ],
            ],

            // D. Bidang Sumber Daya Air
            [
                'org' => $bidangSDA,
                'goals' => [
                    [
                        'order_no' => 1,
                        'goal' => 'Sasaran Strategis: Meningkatnya Keandalan Pengendalian Banjir dan Drainase',
                        'goal_indicator' => 'Persentase Luas Kawasan Rawan Banjir yang Tertangani',
                        'goal_indicator_unit' => '%',
                        'goal_measurement_pattern' => 'Positif',
                        'goal_targets' => [2024 => 65.0, 2025 => 70.0, 2026 => 75.0],
                        'goal_realizations' => [2024 => 66.8, 2025 => 71.3, 2026 => 74.2],
                        'objectives' => [
                            [
                                'order_no' => 1,
                                'objective' => 'Program Pengendalian Banjir dan Pengelolaan Sungai',
                                'objective_indicator' => 'Panjang Saluran Drainase dan Tanggul Terbangun/Dipelihara',
                                'unit' => 'km',
                                'measurement_pattern' => 'Positif',
                                'targets' => [2024 => 15.0, 2025 => 20.0, 2026 => 26.0],
                                'realizations' => [2024 => 15.5, 2025 => 21.0, 2026 => 25.2],
                            ],
                        ],
                    ],
                ],
            ],

            // Seksi SDA 1
            [
                'org' => $seksiSDA1,
                'goals' => [
                    [
                        'order_no' => 1,
                        'goal' => 'Sasaran Seksi: Pembangunan Tanggul Pengendali Limpasan Air Sungai',
                        'goal_indicator' => 'Panjang Tanggul Pengendali Banjir Selesai Dibangun',
                        'goal_indicator_unit' => 'km',
                        'goal_measurement_pattern' => 'Positif',
                        'goal_targets' => [2024 => 2.0, 2025 => 3.5, 2026 => 5.0],
                        'goal_realizations' => [2024 => 2.1, 2025 => 3.7, 2026 => 4.8],
                        'objectives' => [
                            [
                                'order_no' => 1,
                                'objective' => 'Pembangunan Parapet Beton Sungai Wania',
                                'objective_indicator' => 'Persentase Realisasi Fisik Konstruksi Tanggul',
                                'unit' => '%',
                                'measurement_pattern' => 'Positif',
                                'targets' => [2024 => 100.0, 2025 => 100.0, 2026 => 100.0],
                                'realizations' => [2024 => 100.0, 2025 => 100.0, 2026 => 97.0],
                            ],
                        ],
                    ],
                ],
            ],

            // E. Bidang Penataan Ruang
            [
                'org' => $bidangTR,
                'goals' => [
                    [
                        'order_no' => 1,
                        'goal' => 'Sasaran Strategis: Meningkatnya Keteraturan dan Kepatuhan Zonasi RTRW',
                        'goal_indicator' => 'Tingkat Kesesuaian Pemanfaatan Ruang terhadap Dokumen RTRW',
                        'goal_indicator_unit' => '%',
                        'goal_measurement_pattern' => 'Positif',
                        'goal_targets' => [2024 => 80.0, 2025 => 85.0, 2026 => 90.0],
                        'goal_realizations' => [2024 => 81.5, 2025 => 86.0, 2026 => 89.4],
                        'objectives' => [
                            [
                                'order_no' => 1,
                                'objective' => 'Program Penyelenggaraan Penataan Ruang',
                                'objective_indicator' => 'Rasio Persetujuan Kesesuaian Kegiatan Pemanfaatan Ruang (PKKPR)',
                                'unit' => '%',
                                'measurement_pattern' => 'Positif',
                                'targets' => [2024 => 85.0, 2025 => 90.0, 2026 => 95.0],
                                'realizations' => [2024 => 87.0, 2025 => 91.5, 2026 => 94.0],
                            ],
                        ],
                    ],
                ],
            ],

            // Seksi TR 1
            [
                'org' => $seksiTR1,
                'goals' => [
                    [
                        'order_no' => 1,
                        'goal' => 'Sasaran Seksi: Penyusunan Dokumen Rencana Rinci Tata Ruang (RDTR)',
                        'goal_indicator' => 'Persentase Dokumen Rencana Detail Tata Ruang Selesai Tersusun',
                        'goal_indicator_unit' => '%',
                        'goal_measurement_pattern' => 'Positif',
                        'goal_targets' => [2024 => 80.0, 2025 => 90.0, 2026 => 100.0],
                        'goal_realizations' => [2024 => 82.0, 2025 => 91.5, 2026 => 98.0],
                        'objectives' => [
                            [
                                'order_no' => 1,
                                'objective' => 'Penyusunan Materi Teknis RDTR Perkotaan Timika',
                                'objective_indicator' => 'Tahapan Konsultasi Publik dan Persetujuan Substansi Tuntas',
                                'unit' => '%',
                                'measurement_pattern' => 'Positif',
                                'targets' => [2024 => 100.0, 2025 => 100.0, 2026 => 100.0],
                                'realizations' => [2024 => 100.0, 2025 => 100.0, 2026 => 96.0],
                            ],
                        ],
                    ],
                ],
            ],

            // F. UPTD PUPR
            [
                'org' => $uptd,
                'goals' => [
                    [
                        'order_no' => 1,
                        'goal' => 'Sasaran UPTD: Peningkatan Keandalan Peralatan Berat dan Uji Mutu Konstruksi',
                        'goal_indicator' => 'Persentase Kesiapan Operasional Alat Berat & Pelayanan Uji Lab',
                        'goal_indicator_unit' => '%',
                        'goal_measurement_pattern' => 'Positif',
                        'goal_targets' => [2024 => 88.0, 2025 => 92.0, 2026 => 95.0],
                        'goal_realizations' => [2024 => 89.2, 2025 => 93.0, 2026 => 94.5],
                        'objectives' => [
                            [
                                'order_no' => 1,
                                'objective' => 'Operasionalisasi Layanan Laboratorium Pengujian Material',
                                'objective_indicator' => 'Jumlah Benda Uji Beton/Aspal Teruji Terakreditasi',
                                'unit' => 'Sampel',
                                'measurement_pattern' => 'Positif',
                                'targets' => [2024 => 250, 2025 => 300, 2026 => 350],
                                'realizations' => [2024 => 265, 2025 => 312, 2026 => 340],
                            ],
                        ],
                    ],
                ],
            ],

            // G. Sekretariat
            [
                'org' => $sekretariat,
                'goals' => [
                    [
                        'order_no' => 1,
                        'goal' => 'Sasaran Sekretariat: Penguatan Tata Kelola Reformasi Birokrasi dan Akuntabilitas SAKIP',
                        'goal_indicator' => 'Nilai Akuntabilitas Kinerja Instansi Pemerintah (SAKIP) Dinas',
                        'goal_indicator_unit' => 'Poin',
                        'goal_measurement_pattern' => 'Positif',
                        'goal_targets' => [2024 => 82.0, 2025 => 85.0, 2026 => 88.0],
                        'goal_realizations' => [2024 => 82.5, 2025 => 84.8, 2026 => 87.2],
                        'objectives' => [
                            [
                                'order_no' => 1,
                                'objective' => 'Pengelolaan Administrasi Kepegawaian dan Perencanaan Kinerja',
                                'objective_indicator' => 'Tingkat Kepatuhan Pengunggahan Dokumen SAKIP Tepat Waktu',
                                'unit' => '%',
                                'measurement_pattern' => 'Positif',
                                'targets' => [2024 => 95.0, 2025 => 100.0, 2026 => 100.0],
                                'realizations' => [2024 => 96.0, 2025 => 100.0, 2026 => 100.0],
                            ],
                        ],
                    ],
                ],
            ],
        ];

        foreach ($orgHierarchyData as $entry) {
            $org = $entry['org'];
            $goals = $entry['goals'];

            foreach ($goals as $gData) {
                $objectives = $gData['objectives'] ?? [];
                unset($gData['objectives']);

                $goalItem = RealizationOpdItem::updateOrCreate(
                    [
                        'organization_id' => $org->id,
                        'order_no' => $gData['order_no'],
                        'level' => 'goal',
                    ],
                    array_merge($gData, [
                        'organization_id' => $org->id,
                        'parent_id' => null,
                        'level' => 'goal',
                        'created_by' => $adminOpd->id,
                    ])
                );

                foreach ($objectives as $objData) {
                    RealizationOpdItem::updateOrCreate(
                        [
                            'organization_id' => $org->id,
                            'parent_id' => $goalItem->id,
                            'order_no' => $objData['order_no'],
                            'level' => 'objective',
                        ],
                        array_merge($objData, [
                            'organization_id' => $org->id,
                            'parent_id' => $goalItem->id,
                            'level' => 'objective',
                            'created_by' => $adminOpd->id,
                        ])
                    );
                }
            }
        }

        // ══════════════════════════════════════════════════════════════════════
        // 2. EVIDENCE DIGITAL BUKTI DUKUNG REALISASI LENGKAP
        // ══════════════════════════════════════════════════════════════════════
        $sampleRealizations = Realization::where('status', 'approved')->get();
        $sampleEvidenceTypes = [
            ['name' => 'Laporan_Progres_Fisik_Konstruksi_TW.pdf', 'mime' => 'application/pdf', 'size' => 2450000],
            ['name' => 'Berita_Acara_Pemeriksaan_Pekerjaan_BAP.pdf', 'mime' => 'application/pdf', 'size' => 1850000],
            ['name' => 'Dokumentasi_Foto_Drone_Pekerjaan_Lapangan.jpg', 'mime' => 'image/jpeg', 'size' => 3200000],
            ['name' => 'Kurva_S_Kemajuan_Pekerjaan_Fisik.pdf', 'mime' => 'application/pdf', 'size' => 980000],
            ['name' => 'Sertifikat_Hasil_Uji_Kuat_Tekan_Laboratorium.pdf', 'mime' => 'application/pdf', 'size' => 1420000],
            ['name' => 'Berita_Acara_Serah_Terima_Sementara_PHO.pdf', 'mime' => 'application/pdf', 'size' => 2100000],
        ];

        foreach ($sampleRealizations as $index => $rel) {
            $eviDef = $sampleEvidenceTypes[$index % count($sampleEvidenceTypes)];
            Evidence::updateOrCreate(
                [
                    'realization_id' => $rel->id,
                    'file_name' => $eviDef['name'],
                ],
                [
                    'object_key' => 'evidences/2026/'.uniqid().'_'.$eviDef['name'],
                    'mime_type' => $eviDef['mime'],
                    'size' => $eviDef['size'],
                    'checksum' => md5($eviDef['name'].$rel->id),
                    'uploader_id' => $adminOpd->id,
                    'uploaded_at' => now()->subDays(rand(5, 45)),
                    'status' => 'verified',
                ]
            );
        }
    }
}
