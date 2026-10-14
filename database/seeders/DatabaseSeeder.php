<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database secara total dan komprehensif.
     *
     * Arsitektur Rumah Besar Satu OPD (Dinas PUPR Kabupaten Mimika):
     * 1. RolePermissionSeeder (7 Role Baru & Matriks Permission 2.3)
     * 2. OrganizationSeeder (OPD Induk -> Sekretariat -> 4 Bidang -> 12 Seksi -> UPTD)
     * 3. UserSeeder (Akun User Resmi Seluruh Jajaran)
     * 4. PeriodSeeder (Periode Tahunan 2024-2026, TW1-TW4, Satuan Ukur PUPR, EWS Rules)
     * 5. MasterIndicatorSeeder (Master IKU OPD & Unit, Target Multi-Tahun, Realisasi Triwulanan)
     * 6. PlanningSeeder (Renstra, Renja, Pohon Kinerja Cascading, Perjanjian Kinerja, Rencana Aksi, Monitoring Budget & Output)
     * 7. RealizationSeeder (Hierarki Realisasi OPD 2022-2026, Bukti Dukung Sah Evidence)
     * 8. EvaluationSeeder (Evaluasi SAKIP 2024-2026, Rekomendasi LHE, Tindak Lanjut, PKO PermenPAN-RB 22/2024)
     * 9. OperationalSeeder (Early Warning System Alerts, Manajemen Risiko, LKjIP, Bank Regulasi, Notifikasi, Audit Log)
     * 10. AppConfigSeeder (Pengaturan Aplikasi, Identitas Instansi, & Keamanan)
     */
    public function run(): void
    {
        $this->call([
            RolePermissionSeeder::class,
            OrganizationSeeder::class,
            UserSeeder::class,
            PeriodSeeder::class,
            MasterIndicatorSeeder::class,
            PlanningSeeder::class,
            RealizationSeeder::class,
            EvaluationSeeder::class,
            OperationalSeeder::class,
            AppConfigSeeder::class,
        ]);
    }
}
