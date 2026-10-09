<?php

namespace Database\Seeders;

use App\Models\Organization;
use Illuminate\Database\Seeder;

class OrganizationSeeder extends Seeder
{
    /**
     * Menyiapkan Struktur Satu Rumah Besar OPD:
     * Root OPD (Induk/Pimpinan) -> Sekretariat -> Bidang-bidang.
     */
    public function run(): void
    {
        // 1. Root: OPD Induk
        $rootOpd = Organization::updateOrCreate(
            ['code' => 'OPD-INDUK'],
            [
                'name' => 'Dinas Pendidikan dan Kebudayaan',
                'short_name' => 'Disdikbud',
                'type' => 'opd',
                'parent_id' => null,
                'address' => 'Jl. Perkantoran Utama, Kompleks Balai Kota',
                'phone' => '0986-123456',
                'email' => 'disdikbud@pemerintah.go.id',
                'is_active' => true,
            ]
        );

        // 2. Sekretariat (Child of Root OPD)
        $sekretariat = Organization::updateOrCreate(
            ['code' => 'SEKRETARIAT'],
            [
                'name' => 'Sekretariat Dinas',
                'short_name' => 'Sekretariat',
                'type' => 'sekretariat',
                'parent_id' => $rootOpd->id,
                'address' => 'Gedung A Lantai 1, Kompleks Balai Kota',
                'phone' => '0986-123457',
                'email' => 'sekretariat.disdikbud@pemerintah.go.id',
                'is_active' => true,
            ]
        );

        // 3. Bidang-bidang (Children of Root OPD)
        $bidangDefinitions = [
            [
                'code' => 'BIDANG-1',
                'name' => 'Bidang Pendidikan Dasar',
                'short_name' => 'Bidang Dikdas',
                'type' => 'bidang',
                'address' => 'Gedung B Lantai 1, Kompleks Balai Kota',
                'phone' => '0986-123458',
                'email' => 'dikdas@disdikbud.pemerintah.go.id',
            ],
            [
                'code' => 'BIDANG-2',
                'name' => 'Bidang Pendidikan Menengah dan Kejuruan',
                'short_name' => 'Bidang Dikmen',
                'type' => 'bidang',
                'address' => 'Gedung B Lantai 2, Kompleks Balai Kota',
                'phone' => '0986-123459',
                'email' => 'dikmen@disdikbud.pemerintah.go.id',
            ],
            [
                'code' => 'BIDANG-3',
                'name' => 'Bidang Pembinaan Ketenagaan dan Kurikulum',
                'short_name' => 'Bidang Ketenagaan',
                'type' => 'bidang',
                'address' => 'Gedung C Lantai 1, Kompleks Balai Kota',
                'phone' => '0986-123460',
                'email' => 'ketenagaan@disdikbud.pemerintah.go.id',
            ],
            [
                'code' => 'BIDANG-4',
                'name' => 'Bidang Kebudayaan dan Sejarah',
                'short_name' => 'Bidang Kebudayaan',
                'type' => 'bidang',
                'address' => 'Gedung C Lantai 2, Kompleks Balai Kota',
                'phone' => '0986-123461',
                'email' => 'kebudayaan@disdikbud.pemerintah.go.id',
            ],
        ];

        foreach ($bidangDefinitions as $b) {
            Organization::updateOrCreate(
                ['code' => $b['code']],
                array_merge($b, [
                    'parent_id' => $rootOpd->id,
                    'is_active' => true,
                ])
            );
        }
    }
}
