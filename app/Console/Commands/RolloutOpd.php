<?php

namespace App\Console\Commands;

use App\Enums\Role as RoleEnum;
use App\Models\Organization;
use App\Models\Role;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class RolloutOpd extends Command
{
    protected $signature = 'opd:rollout {code} {name} {--admin-email=} {--admin-name=} {--password=}';

    protected $description = 'Menambahkan OPD baru dan (opsional) admin lokal untuk rollout bertahap (roadmap Sprint 15)';

    public function handle(): int
    {
        $code = $this->argument('code');
        $name = $this->argument('name');

        if (Organization::where('code', $code)->exists()) {
            $this->error("Organisasi dengan kode {$code} sudah ada.");

            return self::FAILURE;
        }

        $organization = Organization::create([
            'code' => $code,
            'name' => $name,
            'type' => 'opd',
        ]);

        $this->info("OPD {$code} ({$name}) dibuat.");

        if ($email = $this->option('admin-email')) {
            $adminName = $this->option('admin-name') ?? "Admin {$name}";
            $password = $this->option('password') ?? 'password';

            $user = User::create([
                'name' => $adminName,
                'email' => $email,
                'password' => Hash::make($password),
                'is_active' => true,
                'locale' => 'id',
            ]);

            $role = Role::firstWhere('name', RoleEnum::AdminOpd->value);
            if ($role) {
                $user->roles()->attach($role);
            }

            $user->organizations()->attach($organization->id, ['is_default' => true]);

            $this->info("Admin OPD {$adminName} ({$email}) dibuat untuk {$code}.");
        }

        return self::SUCCESS;
    }
}
