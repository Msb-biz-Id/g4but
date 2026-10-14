<?php

namespace Database\Seeders;

use App\Models\Organization;
use Illuminate\Database\Seeder;

class OrganizationSeeder extends Seeder
{
    /**
     * Menyiapkan Struktur Satu Rumah Besar OPD Resmi:
     * Dinas Pekerjaan Umum dan Penataan Ruang Kabupaten Mimika
     * 1. Pimpinan Dinas (Root OPD)
     * 2. Sekretariat
     * 3. Bidang Cipta Karya (3 Seksi)
     * 4. Bidang Bina Marga (3 Seksi)
     * 5. Bidang Sumber Daya Air (3 Seksi)
     * 6. Bidang Penataan Ruang (3 Seksi)
     * 7. UPTD
     */
    public function run(): void
    {
        // 1. Root: OPD Induk Dinas PUPR Kabupaten Mimika
        $rootOpd = Organization::updateOrCreate(
            ['code' => 'OPD-INDUK'],
            [
                'name' => 'Dinas Pekerjaan Umum dan Penataan Ruang Kabupaten Mimika',
                'short_name' => 'Dinas PUPR Mimika',
                'type' => 'opd',
                'parent_id' => null,
                'address' => 'Jl. Cenderawasih SP 2, Timika, Kabupaten Mimika, Papua Tengah',
                'phone' => '0901-321456',
                'email' => 'pupr@mimikakab.go.id',
                'is_active' => true,
            ]
        );

        // Hapus duplikat lama jika ada
        Organization::where('code', 'PUPR-MIMIKA')->delete();
        Organization::whereIn('code', ['BIDANG-1', 'BIDANG-2', 'BIDANG-3', 'BIDANG-4'])->delete();

        // 2. Sekretariat Dinas PUPR
        $sekretariat = Organization::updateOrCreate(
            ['code' => 'SEKRETARIAT'],
            [
                'name' => 'Sekretariat Dinas PUPR',
                'short_name' => 'Sekretariat',
                'type' => 'sekretariat',
                'parent_id' => $rootOpd->id,
                'address' => 'Gedung Kantor Dinas PUPR Lantai 1, Timika',
                'phone' => '0901-321457',
                'email' => 'sekretariat.pupr@mimikakab.go.id',
                'is_active' => true,
            ]
        );

        // 2.1 Subbagian di bawah Sekretariat (type = 'sekretariat')
        $subbagDefinitions = [
            ['code' => 'SUBBAG-PROG', 'name' => 'Subbagian Program dan Evaluasi', 'short_name' => 'Program & Evaluasi'],
            ['code' => 'SUBBAG-KEU', 'name' => 'Subbagian Keuangan dan Pengelolaan Aset', 'short_name' => 'Keuangan & Aset'],
            ['code' => 'SUBBAG-UMUM', 'name' => 'Subbagian Umum dan Kepegawaian', 'short_name' => 'Umum & Kepegawaian'],
        ];

        foreach ($subbagDefinitions as $subDef) {
            Organization::updateOrCreate(
                ['code' => $subDef['code']],
                [
                    'name' => $subDef['name'],
                    'short_name' => $subDef['short_name'],
                    'type' => 'sekretariat',
                    'parent_id' => $sekretariat->id,
                    'address' => 'Gedung Kantor Dinas PUPR Lantai 1, Timika',
                    'is_active' => true,
                ]
            );
        }

        // 3. 4 Bidang Teknis Utama Dinas PUPR Mimika
        $bidangDefinitions = [
            [
                'code' => 'BIDANG-CK',
                'name' => 'Bidang Cipta Karya',
                'short_name' => 'Cipta Karya',
                'type' => 'bidang',
                'phone' => '0901-321461',
                'email' => 'ciptakarya.pupr@mimikakab.go.id',
                'sections' => [
                    ['code' => 'SEKSI-CK-1', 'name' => 'Seksi Bangunan Gedung dan Penataan Lingkungan', 'short_name' => 'Gedung & Lingkungan'],
                    ['code' => 'SEKSI-CK-2', 'name' => 'Seksi Penyehatan Prasarana Pemukiman', 'short_name' => 'Prasarana Pemukiman'],
                    ['code' => 'SEKSI-CK-3', 'name' => 'Seksi Air Minum Dan Sanitasi', 'short_name' => 'Air Minum & Sanitasi'],
                ],
            ],
            [
                'code' => 'BIDANG-BM',
                'name' => 'Bidang Bina Marga',
                'short_name' => 'Bina Marga',
                'type' => 'bidang',
                'phone' => '0901-321462',
                'email' => 'binamarga.pupr@mimikakab.go.id',
                'sections' => [
                    ['code' => 'SEKSI-BM-1', 'name' => 'Seksi Pembangunan Dan Peningkatan Jalan dan Jembatan', 'short_name' => 'Pembangunan Jalan'],
                    ['code' => 'SEKSI-BM-2', 'name' => 'Seksi Pemeliharaan Jalan dan Jembatan', 'short_name' => 'Pemeliharaan Jalan'],
                    ['code' => 'SEKSI-BM-3', 'name' => 'Seksi Perencanaan Dan Leger Jalan dan Jembatan', 'short_name' => 'Perencanaan & Leger'],
                ],
            ],
            [
                'code' => 'BIDANG-SDA',
                'name' => 'Bidang Sumber Daya Air',
                'short_name' => 'Sumber Daya Air',
                'type' => 'bidang',
                'phone' => '0901-321463',
                'email' => 'sda.pupr@mimikakab.go.id',
                'sections' => [
                    ['code' => 'SEKSI-SDA-1', 'name' => 'Seksi Pembangunan Sarana dan Prasarana SDA', 'short_name' => 'Pembangunan Sarpras SDA'],
                    ['code' => 'SEKSI-SDA-2', 'name' => 'Seksi Operasi dan Pemeliharaan SDA', 'short_name' => 'Operasi & Pemeliharaan SDA'],
                    ['code' => 'SEKSI-SDA-3', 'name' => 'Seksi Bina Manfaat SDA', 'short_name' => 'Bina Manfaat SDA'],
                ],
            ],
            [
                'code' => 'BIDANG-TR',
                'name' => 'Bidang Penataan Ruang',
                'short_name' => 'Penataan Ruang',
                'type' => 'bidang',
                'phone' => '0901-321464',
                'email' => 'tataruang.pupr@mimikakab.go.id',
                'sections' => [
                    ['code' => 'SEKSI-TR-1', 'name' => 'Seksi Perencanaan Penataan Ruang', 'short_name' => 'Perencanaan Ruang'],
                    ['code' => 'SEKSI-TR-2', 'name' => 'Seksi Pemanfaatan Ruang', 'short_name' => 'Pemanfaatan Ruang'],
                    ['code' => 'SEKSI-TR-3', 'name' => 'Seksi Pengendalian Tata Ruang', 'short_name' => 'Pengendalian Ruang'],
                ],
            ],
        ];

        foreach ($bidangDefinitions as $bDef) {
            $bidang = Organization::updateOrCreate(
                ['code' => $bDef['code']],
                [
                    'name' => $bDef['name'],
                    'short_name' => $bDef['short_name'],
                    'type' => $bDef['type'],
                    'parent_id' => $rootOpd->id,
                    'address' => 'Kompleks Kantor Dinas PUPR Mimika, Timika',
                    'phone' => $bDef['phone'],
                    'email' => $bDef['email'],
                    'is_active' => true,
                ]
            );

            // Buat seksi-seksi di bawah bidang ini (Bidang setara dengan Seksi: type = 'bidang')
            foreach ($bDef['sections'] as $secDef) {
                Organization::updateOrCreate(
                    ['code' => $secDef['code']],
                    [
                        'name' => $secDef['name'],
                        'short_name' => $secDef['short_name'],
                        'type' => 'bidang',
                        'parent_id' => $bidang->id,
                        'address' => 'Kompleks Kantor Dinas PUPR Mimika, Timika',
                        'is_active' => true,
                    ]
                );
            }
        }

        // 4. UPTD Dinas PUPR (Setara Bidang: type = 'bidang')
        Organization::updateOrCreate(
            ['code' => 'UPTD-PUPR'],
            [
                'name' => 'Unit Pelaksana Teknis Daerah (UPTD) PUPR',
                'short_name' => 'UPTD PUPR',
                'type' => 'bidang',
                'parent_id' => $rootOpd->id,
                'address' => 'Jl. Poros Timika - SP 2, Mimika',
                'phone' => '0901-321470',
                'email' => 'uptd.pupr@mimikakab.go.id',
                'is_active' => true,
            ]
        );
    }
}
