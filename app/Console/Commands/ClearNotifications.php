<?php

namespace App\Console\Commands;

use App\Models\Alert;
use App\Models\AppNotification;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ClearNotifications extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'notifications:clear
                            {--user= : ID atau email pengguna tertentu (opsional, jika hanya ingin mengosongkan notifikasi 1 pengguna)}
                            {--alerts : Sertakan pengosongan data peringatan EWS (tabel alerts)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Reset dan kosongkan seluruh data notifikasi sistem (tabel notifications).';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $userFilter = $this->option('user');
        $includeAlerts = (bool) $this->option('alerts');

        if ($userFilter) {
            $user = is_numeric($userFilter)
                ? User::find((int) $userFilter)
                : User::firstWhere('email', $userFilter);

            if (!$user) {
                $this->error("Pengguna dengan ID / Email '{$userFilter}' tidak ditemukan.");
                return Command::FAILURE;
            }

            $count = AppNotification::where('user_id', $user->id)->count();
            AppNotification::where('user_id', $user->id)->delete();

            $this->info("Berhasil mengosongkan {$count} notifikasi untuk pengguna {$user->name} ({$user->email}).");
        } else {
            $count = AppNotification::count();

            if (DB::getDriverName() === 'sqlite') {
                DB::statement('PRAGMA foreign_keys = OFF;');
                DB::table('notifications')->delete();
                if (Schema::hasTable('sqlite_sequence')) {
                    DB::table('sqlite_sequence')->where('name', 'notifications')->delete();
                }
                DB::statement('PRAGMA foreign_keys = ON;');
            } else {
                DB::table('notifications')->truncate();
            }

            $this->info("Berhasil mereset dan mengosongkan seluruh notifikasi sistem ({$count} data dihapus).");
        }

        if ($includeAlerts) {
            $alertCount = Alert::count();
            if (DB::getDriverName() === 'sqlite') {
                DB::statement('PRAGMA foreign_keys = OFF;');
                DB::table('alerts')->delete();
                if (Schema::hasTable('sqlite_sequence')) {
                    DB::table('sqlite_sequence')->where('name', 'alerts')->delete();
                }
                DB::statement('PRAGMA foreign_keys = ON;');
            } else {
                DB::table('alerts')->truncate();
            }
            $this->info("Berhasil mengosongkan seluruh peringatan EWS ({$alertCount} data alerts dihapus).");
        }

        Cache::flush();
        $this->comment('Cache sistem berhasil dibersihkan.');

        return Command::SUCCESS;
    }
}
