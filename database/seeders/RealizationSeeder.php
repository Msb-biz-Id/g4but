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
     * 1. Hierarki Realisasi OPD (Tujuan & Sasaran Strategis Multi-Tahun 2022-2026)
     * 2. Evidence Digital (Bukti Dukung Sah untuk Realisasi Triwulanan)
     */
    public function run(): void
    {
        $rootOpd = Organization::where('code', 'OPD-INDUK')->firstOrFail();
        $adminOpd = User::where('email', 'admin.opd@esakip.local')->first()
            ?? User::where('email', 'superadmin@esakip.local')->firstOrFail();

        // ══════════════════════════════════════════════════════════════════════
        // 1. REALISASI HIERARKI OPD (REALIZATION OPD ITEMS)
        // ══════════════════════════════════════════════════════════════════════
        $hierarchyGoals = [
            [
                'order_no' => 1,
                'goal' => 'Tujuan 1: Meningkatkan Kemantapan dan Aksesibilitas Infrastruktur Dasar Wilayah Kabupaten Mimika',
                'goal_indicator' => 'Indeks Kemantapan Infrastruktur PUPR Daerah',
                'goal_indicator_unit' => 'Poin',
                'goal_measurement_pattern' => 'Positif',
                'goal_targets' => [
                    2022 => 72.0,
                    2023 => 75.5,
                    2024 => 81.0,
                    2025 => 84.5,
                    2026 => 87.0,
                ],
                'goal_realizations' => [
                    2022 => 73.1,
                    2023 => 76.8,
                    2024 => 82.3,
                    2025 => 85.1,
                    2026 => 86.8,
                ],
                'objectives' => [
                    [
                        'order_no' => 1,
                        'objective' => 'Sasaran 1.1: Peningkatan Kemantapan Jaringan Jalan Poros dan Jembatan Kabupaten',
                        'objective_indicator' => 'Persentase Jalan Kabupaten dalam Kondisi Mantap',
                        'unit' => '%',
                        'measurement_pattern' => 'Positif',
                        'targets' => [2022 => 58.0, 2023 => 62.0, 2024 => 68.0, 2025 => 72.5, 2026 => 76.0],
                        'realizations' => [2022 => 59.2, 2023 => 63.4, 2024 => 69.1, 2025 => 73.4, 2026 => 75.8],
                        'indicators' => [
                            [
                                'indicator' => 'Persentase Jalan Kabupaten dalam Kondisi Mantap',
                                'unit' => '%',
                                'measurement_pattern' => 'Positif',
                                'targets' => [2024 => 68.0, 2025 => 72.5, 2026 => 76.0],
                                'realizations' => [2024 => 69.1, 2025 => 73.4, 2026 => 75.8],
                            ],
                            [
                                'indicator' => 'Persentase Jembatan Layak dan Mantap',
                                'unit' => '%',
                                'measurement_pattern' => 'Positif',
                                'targets' => [2024 => 82.0, 2025 => 86.0, 2026 => 90.0],
                                'realizations' => [2024 => 83.5, 2025 => 87.1, 2026 => 89.5],
                            ],
                        ],
                    ],
                    [
                        'order_no' => 2,
                        'objective' => 'Sasaran 1.2: Peningkatan Akses Air Minum Perpipaan dan Kualitas Permukiman Sehat',
                        'objective_indicator' => 'Cakupan Akses Air Minum Layak dan Aman',
                        'unit' => '%',
                        'measurement_pattern' => 'Positif',
                        'targets' => [2022 => 65.0, 2023 => 68.5, 2024 => 74.0, 2025 => 78.0, 2026 => 82.0],
                        'realizations' => [2022 => 66.2, 2023 => 70.1, 2024 => 75.2, 2025 => 79.1, 2026 => 81.5],
                        'indicators' => [
                            [
                                'indicator' => 'Cakupan Akses Air Minum Layak dan Aman',
                                'unit' => '%',
                                'measurement_pattern' => 'Positif',
                                'targets' => [2024 => 74.0, 2025 => 78.0, 2026 => 82.0],
                                'realizations' => [2024 => 75.2, 2025 => 79.1, 2026 => 81.5],
                            ],
                            [
                                'indicator' => 'Persentase Gedung Daerah Memenuhi Standar Laik Fungsi',
                                'unit' => '%',
                                'measurement_pattern' => 'Positif',
                                'targets' => [2024 => 75.0, 2025 => 80.0, 2026 => 85.0],
                                'realizations' => [2024 => 76.5, 2025 => 81.2, 2026 => 84.0],
                            ],
                        ],
                    ],
                    [
                        'order_no' => 3,
                        'objective' => 'Sasaran 1.3: Pengurangan Risiko Bencana Banjir dan Pengamanan Kawasan Pesisir',
                        'objective_indicator' => 'Persentase Luas Kawasan Rawan Banjir yang Tertangani',
                        'unit' => '%',
                        'measurement_pattern' => 'Positif',
                        'targets' => [2022 => 52.0, 2023 => 56.0, 2024 => 65.0, 2025 => 70.0, 2026 => 75.0],
                        'realizations' => [2022 => 53.5, 2023 => 58.2, 2024 => 66.8, 2025 => 71.3, 2026 => 74.2],
                    ],
                ],
            ],
            [
                'order_no' => 2,
                'goal' => 'Tujuan 2: Mewujudkan Tertib Penataan Ruang Wilayah dan Akuntabilitas Tata Kelola Birokrasi PUPR',
                'goal_indicator' => 'Indeks Tertib Penataan Ruang dan Akuntabilitas PUPR',
                'goal_indicator_unit' => 'Poin',
                'goal_measurement_pattern' => 'Positif',
                'goal_targets' => [
                    2022 => 70.0,
                    2023 => 74.0,
                    2024 => 80.0,
                    2025 => 85.0,
                    2026 => 89.0,
                ],
                'goal_realizations' => [
                    2022 => 71.5,
                    2023 => 75.8,
                    2024 => 81.8,
                    2025 => 85.6,
                    2026 => 88.5,
                ],
                'objectives' => [
                    [
                        'order_no' => 1,
                        'objective' => 'Sasaran 2.1: Keteraturan Pemanfaatan Ruang Daerah Sesuai Zonasi RTRW',
                        'objective_indicator' => 'Tingkat Kesesuaian Pemanfaatan Ruang terhadap Dokumen RTRW',
                        'unit' => '%',
                        'measurement_pattern' => 'Positif',
                        'targets' => [2022 => 68.0, 2023 => 72.0, 2024 => 80.0, 2025 => 85.0, 2026 => 90.0],
                        'realizations' => [2022 => 69.5, 2023 => 73.8, 2024 => 81.5, 2025 => 86.0, 2026 => 89.4],
                    ],
                    [
                        'order_no' => 2,
                        'objective' => 'Sasaran 2.2: Penguatan Akuntabilitas Kinerja dan Transparansi Pelayanan Publik PUPR',
                        'objective_indicator' => 'Nilai Akuntabilitas Kinerja Instansi Pemerintah (SAKIP) Dinas',
                        'unit' => 'Poin',
                        'measurement_pattern' => 'Positif',
                        'targets' => [2022 => 75.0, 2023 => 78.5, 2024 => 82.0, 2025 => 85.0, 2026 => 88.0],
                        'realizations' => [2022 => 76.2, 2023 => 79.4, 2024 => 82.5, 2025 => 84.8, 2026 => 87.2],
                    ],
                ],
            ],
        ];

        foreach ($hierarchyGoals as $gData) {
            $objectives = $gData['objectives'] ?? [];
            unset($gData['objectives']);

            $goalItem = RealizationOpdItem::updateOrCreate(
                [
                    'organization_id' => $rootOpd->id,
                    'order_no' => $gData['order_no'],
                    'level' => 'goal',
                ],
                array_merge($gData, [
                    'organization_id' => $rootOpd->id,
                    'parent_id' => null,
                    'level' => 'goal',
                    'created_by' => $adminOpd->id,
                ])
            );

            foreach ($objectives as $objData) {
                RealizationOpdItem::updateOrCreate(
                    [
                        'organization_id' => $rootOpd->id,
                        'parent_id' => $goalItem->id,
                        'order_no' => $objData['order_no'],
                        'level' => 'objective',
                    ],
                    array_merge($objData, [
                        'organization_id' => $rootOpd->id,
                        'parent_id' => $goalItem->id,
                        'level' => 'objective',
                        'created_by' => $adminOpd->id,
                    ])
                );
            }
        }

        // ══════════════════════════════════════════════════════════════════════
        // 2. EVIDENCE DIGITAL BUKTI DUKUNG REALISASI
        // ══════════════════════════════════════════════════════════════════════
        $sampleRealizations = Realization::where('status', 'approved')->limit(8)->get();
        $sampleEvidenceTypes = [
            ['name' => 'Laporan_Progres_Fisik_Lap_TW.pdf', 'mime' => 'application/pdf', 'size' => 2450000],
            ['name' => 'Berita_Acara_Pemeriksaan_Pekerjaan_BAP.pdf', 'mime' => 'application/pdf', 'size' => 1850000],
            ['name' => 'Dokumentasi_Foto_Drone_Peningkatan_Jalan.jpg', 'mime' => 'image/jpeg', 'size' => 3200000],
            ['name' => 'Kurva_S_Kemajuan_Pekerjaan_Konstruksi.pdf', 'mime' => 'application/pdf', 'size' => 980000],
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
                    'uploaded_at' => now()->subDays(15),
                    'status' => 'verified',
                ]
            );
        }
    }
}
