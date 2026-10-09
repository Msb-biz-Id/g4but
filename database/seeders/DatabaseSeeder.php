<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     *
     * Secara default, seeder ini hanya menyiapkan MASTER DATA & FONDASI SISTEM
     * (Roles, Permissions, Akun OPD, Konfigurasi, Periode, Satuan, dan Master IKU).
     *
     * Data transaksional (dokumen unggahan demo, perjanjian kinerja demo, realisasi demo,
     * dan lembar evaluasi dummy) dinonaktifkan agar form di aplikasi bersih (clean state)
     * dan siap digunakan untuk demonstrasi penginputan langsung ke klien.
     */
    public function run(): void
    {
        // ── 1. MASTER DATA & FONDASI SISTEM (Wajib untuk Operasional & Demo Input) ──
        $this->call([
            RolePermissionSeeder::class, // Hak akses & roles
            LocalUserSeeder::class,       // Master OPD & akun login baku
            KamarOpdSeeder::class,        // Penyediaan Kamar 10 OPD (Utama & Cadangan)
            AppConfigSeeder::class,       // Konfigurasi aplikasi & security
            MasterPeriodSeeder::class,    // Periode RPJMD, TA 2026, TW1-TW4, Satuan Pengukuran, AlertRules & AI Templates
        ]);

        // ── 2. DATA TRANSAKSIONAL DUMMY (KHUSUS PENGUJIAN / TESTING) ────────────────
        // Jika Anda membutuhkan data simulasi transaksi dummy penuh, jalankan manual:
        //   php artisan db:seed --class=IkuSeeder
        //   php artisan db:seed --class=DemoDataSeeder
        //   php artisan db:seed --class=SakipComprehensiveSeeder
        if (app()->environment('testing')) {
            $this->call([
                IkuSeeder::class,
                DemoDataSeeder::class,
                SakipComprehensiveSeeder::class,
            ]);
        }
    }
}
