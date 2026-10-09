<?php

namespace App\Console\Commands;

use App\Services\UserExportService;
use Database\Seeders\SyncAllOpdUsersSeeder;
use Illuminate\Console\Command;

class SyncAndExportOpdUsers extends Command
{
    protected $signature = 'opd:sync-users 
        {--export= : Lokasi file CSV untuk ekspor daftar akun (opsional)}
        {--export-xlsx= : Lokasi file Excel (.xlsx) untuk ekspor daftar akun (opsional)}';

    protected $description = 'Sinkronisasi akun pengguna untuk seluruh 36 OPD + 10 Biro Papua Barat serta ekspor daftar akun (Super Admin, Pemprov & OPD) ke Excel / CSV';

    public function handle(UserExportService $exportService): int
    {
        $this->info('1. Menjalankan sinkronisasi akun pengguna untuk seluruh OPD & Biro...');

        $seeder = new SyncAllOpdUsersSeeder;
        $seeder->setCommand($this);
        $seeder->run();

        $this->newLine();
        $this->info('2. Mengumpulkan data akun resmi (Super Admin, Pemprov & seluruh 46 OPD)...');

        $data = $exportService->getExportData();

        // Tampilkan Akun Pemprov & Super Admin
        $this->newLine();
        $this->info('=== DAFTAR AKUN LEVEL PROVINSI & SUPER ADMIN ===');
        $this->table(
            ['No', 'Kategori', 'Nama Instansi', 'Nama Pengguna', 'Email Login', 'Peran (Role)', 'Password'],
            array_map(fn ($r) => [
                $r['no'],
                $r['cluster'],
                $r['org_name'],
                $r['user_name'],
                $r['email'],
                $r['role'],
                $r['password'],
            ], $data['provinsi'])
        );

        // Preview Akun OPD (30 teratas)
        $this->newLine();
        $this->info('=== PREVIEW DAFTAR AKUN PERANGKAT DAERAH (36 OPD + 10 BIRO) ===');
        $opdPreview = array_slice($data['opd'], 0, 20);
        $this->table(
            ['No', 'Kode', 'Instansi', 'Email Login', 'Peran (Role)', 'Password'],
            array_map(fn ($r) => [
                $r['no'],
                $r['code'],
                $r['org_name'],
                $r['email'],
                $r['role'],
                $r['password'],
            ], $opdPreview)
        );

        $totalUsers = count($data['all']);
        $totalProv = count($data['provinsi']);
        $totalOpd = count($data['opd']);

        $this->comment("Total Akun Terdata: {$totalUsers} akun ({$totalProv} Akun Pemprov/Super Admin + {$totalOpd} Akun OPD & Biro).");

        // Ekspor ke CSV jika diminta (atau default storage/app/daftar_akun_opd.csv)
        $csvPath = $this->option('export') ?: storage_path('app/daftar_akun_ekasuari.csv');
        $exportService->exportToCsv($csvPath);
        $this->info("✓ Berkas CSV berhasil disimpan ke: {$csvPath}");

        // Salin juga ke path kompatibilitas lama
        if ($csvPath !== storage_path('app/daftar_akun_opd.csv')) {
            @copy($csvPath, storage_path('app/daftar_akun_opd.csv'));
        }

        // Ekspor ke Excel (.xlsx)
        $xlsxPath = $this->option('export-xlsx') ?: storage_path('app/daftar_akun_ekasuari.xlsx');
        $exportService->exportToXlsx($xlsxPath);
        $this->info("✓ Berkas Excel (.xlsx) berhasil diekspor ke: {$xlsxPath}");

        return self::SUCCESS;
    }
}
