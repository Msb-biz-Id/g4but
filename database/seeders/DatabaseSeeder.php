<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     *
     * Arsitektur Rumah Besar Satu OPD:
     * 1. RolePermissionSeeder (7 Role Baru & Matriks Permission 2.3)
     * 2. OrganizationSeeder (OPD Induk -> Sekretariat -> Bidang)
     * 3. UserSeeder (Akun User Resmi 7 Role)
     * 4. PeriodSeeder (Periode Tahunan, TW1-TW4, Satuan, EWS Rules)
     * 5. MasterIndicatorSeeder (Contoh IKU OPD, Sekretariat, dan Bidang)
     * 6. AppConfigSeeder (Pengaturan Aplikasi & Keamanan)
     */
    public function run(): void
    {
        $this->call([
            RolePermissionSeeder::class,
            OrganizationSeeder::class,
            UserSeeder::class,
            PeriodSeeder::class,
            MasterIndicatorSeeder::class,
            AppConfigSeeder::class,
        ]);
    }
}
