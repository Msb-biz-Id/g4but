<?php

namespace App\Console\Commands;

use App\Services\UserExportService;
use Database\Seeders\UserSeeder;
use Illuminate\Console\Command;

class SyncAndExportOpdUsers extends Command
{
    protected $signature = 'opd:sync-users 
        {--export= : Lokasi file CSV untuk ekspor daftar akun (opsional)}
        {--export-xlsx= : Lokasi file Excel (.xlsx) untuk ekspor daftar akun (opsional)}';

    protected $description = 'Sinkronisasi akun pengguna untuk seluruh unit kerja OPD & Biro serta ekspor daftar akun ke Excel / CSV';

    public function handle(UserExportService $exportService): int
    {
        $this->info('1. Menjalankan sinkronisasi akun pengguna untuk seluruh unit kerja OPD...');

        $seeder = new UserSeeder;
        $seeder->setCommand($this);
        $seeder->run();

        $this->newLine();
        $this->info('2. Mengumpulkan data akun resmi unit kerja (OPD Induk, Sekretariat, dan Bidang)...');

        $data = $exportService->getExportData();

        // Tampilkan Akun OPD Induk & Super Admin
        $this->newLine();
        $this->info('=== DAFTAR AKUN OPD INDUK & SUPER ADMIN ===');
        $this->table(
            ['No', 'Kluster', 'Unit Organisasi', 'Nama Pengguna', 'Email Login', 'Peran (Role)', 'Password'],
            array_map(fn ($r) => [
                $r['no'],
                $r['cluster'],
                $r['org_name'],
                $r['user_name'],
                $r['email'],
                $r['role'],
                $r['password'],
            ], $data['opd'])
        );

        // Preview Akun Sekretariat & Bidang
        $subUnitAccounts = array_merge($data['sekretariat'], $data['bidang']);
        $this->newLine();
        $this->info('=== PREVIEW DAFTAR AKUN SEKRETARIAT & BIDANG TEKNIS ===');
        $this->table(
            ['No', 'Kluster', 'Unit Organisasi', 'Email Login', 'Peran (Role)', 'Password'],
            array_map(fn ($r) => [
                $r['no'],
                $r['cluster'],
                $r['org_name'],
                $r['email'],
                $r['role'],
                $r['password'],
            ], array_slice($subUnitAccounts, 0, 20))
        );

        $totalUsers = count($data['all']);
        $totalOpd = count($data['opd']);
        $totalSek = count($data['sekretariat']);
        $totalBid = count($data['bidang']);

        $this->comment("Total Akun Terdata: {$totalUsers} akun ({$totalOpd} OPD Induk + {$totalSek} Sekretariat + {$totalBid} Bidang Teknis).");

        // Ekspor ke CSV jika diminta (atau default storage/app/daftar_akun_ekasuari.csv)
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
