<?php

namespace App\Console\Commands;

use App\Models\Role;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class IssueIntegrationToken extends Command
{
    protected $signature = 'integration:token {name} {--email=} {--ability=integration:indicators}';

    protected $description = 'Buat service account + API token (Sanctum) untuk integrasi sistem eksternal';

    public function handle(): int
    {
        $name = (string) $this->argument('name');
        $email = (string) ($this->option('email') ?: 'svc.'.Str::slug($name).'@ekasuari.test');
        $ability = (string) $this->option('ability');

        $user = User::query()->where('email', $email)->first();

        if (! $user) {
            $user = User::create([
                'name' => $name,
                'email' => $email,
                'password' => Str::random(48),
                'is_active' => true,
                'email_verified_at' => now(),
                'is_service_account' => true,
            ]);

            $role = Role::query()->where('name', 'System')->first()
                ?? Role::query()->where('name', 'Admin OPD')->first();

            if ($role) {
                $user->roles()->attach($role);
            }

            $this->info("Service account '{$name}' dibuat (id: {$user->id}).");
        } else {
            $this->warn("Service account '{$name}' sudah ada, token baru diterbitkan.");
        }

        $token = $user->createToken("integration:{$name}", [$ability])->plainTextToken;

        $this->info('API Token diterbitkan dengan ability '.$ability.':');
        $this->line($token);
        $this->warn('Simpan token di tempat aman; token hanya ditampilkan sekali.');

        return self::SUCCESS;
    }
}
