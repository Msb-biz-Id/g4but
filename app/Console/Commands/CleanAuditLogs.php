<?php

namespace App\Console\Commands;

use App\Models\AuditLog;
use Illuminate\Console\Command;

class CleanAuditLogs extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'audit:clean 
                            {--days=30 : Jumlah hari retensi data log yang disimpan (default 30 hari)} 
                            {--dry-run : Menampilkan jumlah data yang akan dihapus tanpa benar-benar menghapusnya}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Bersihkan audit logs yang berumur lebih dari batas retensi (default 30 hari)';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $days = (int) $this->option('days');
        $isDryRun = (bool) $this->option('dry-run');

        if ($days <= 0) {
            $this->error('Parameter --days harus berupa angka positif.');
            return Command::FAILURE;
        }

        $cutoffDate = now()->subDays($days);
        $this->info("Memeriksa log aktivitas yang dibuat sebelum: {$cutoffDate->format('Y-m-d H:i:s')} ({$days} hari yang lalu)...");

        $query = AuditLog::where('created_at', '<', $cutoffDate);
        $count = $query->count();

        if ($count === 0) {
            $this->info('Tidak ada data log yang melebihi batas retensi.');
            return Command::SUCCESS;
        }

        if ($isDryRun) {
            $this->warn("[DRY RUN] Ditemukan {$count} entri log yang memenuhi syarat untuk dihapus.");
            return Command::SUCCESS;
        }

        $deleted = $query->delete();
        $this->info("Berhasil membersihkan {$deleted} entri log aktivitas lawas.");

        return Command::SUCCESS;
    }
}
