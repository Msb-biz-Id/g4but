<?php

namespace Database\Seeders;

use App\Enums\Role as RoleEnum;
use App\Models\Organization;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class SyncAllOpdUsersSeeder extends Seeder
{
    /**
     * Sinkronisasi Master Pengguna untuk seluruh 36 OPD + 10 Biro Papua Barat.
     * Membuat akun operasional (Admin OPD, Operator, Validator, Kepala OPD)
     * untuk setiap OPD dan Biro yang belum memiliki akun, serta menyelaraskan relasi pivot.
     */
    public function run(): void
    {
        $this->command?->info('================================================================');
        $this->command?->info('  SINKRONISASI MASTER PENGGUNA UNTUK 36 OPD + 10 BIRO PAPUA BARAT');
        $this->command?->info('================================================================');

        DB::transaction(function () {
            // 1. Dapatkan mapping model Role
            $roleAdminOpd     = Role::firstWhere('name', RoleEnum::AdminOpd->value);
            $roleOperatorOpd  = Role::firstWhere('name', RoleEnum::OperatorOpd->value);
            $roleValidatorOpd = Role::firstWhere('name', RoleEnum::ValidatorOpd->value);
            $roleKepalaOpd    = Role::firstWhere('name', RoleEnum::KepalaOpd->value);

            $defaultPassword = Hash::make('password'); // Password default untuk pembagian akun awal

            // 2. Ambil seluruh OPD dan Biro yang aktif
            $allOpds = Organization::where('type', '!=', 'province')
                ->where('is_active', true)
                ->orderBy('id')
                ->get();

            // Mapping manual slug yang rapi
            $slugCustom = [
                'SETDA-PB'         => 'setda',
                'BIRO-PEM-PB'      => 'biro-pem',
                'BIRO-HUKUM-PB'    => 'biro-hukum',
                'BIRO-ADPIM-PB'    => 'biro-adpim',
                'BIRO-ADBANG-PB'   => 'biro-adbang',
                'BIRO-MENSPIR-PB'  => 'biro-menspir',
                'BIRO-EKBANG-PB'   => 'biro-ekbang',
                'BIRO-UMUM-PB'     => 'biro-umum',
                'BIRO-ORG-PB'      => 'biro-org',
                'BIRO-PBJ-PB'      => 'biro-pbj',
                'BIRO-OTSUS-PB'    => 'biro-otsus',
                'SET-DPRPB'        => 'dprpb',
                'SET-MRPB'         => 'mrpb',
                'INSP-PB'          => 'inspektorat',
                'DISDIK-PB'        => 'disdik',
                'DINKES-PB'        => 'dinkes',
                'PUPR-PB'          => 'pupr',
                'SATPOL-PB'        => 'satpol',
                'DINSOS-PB'        => 'dinsos',
                'DUKCAPIL-PB'      => 'dukcapil',
                'DISNAKERTRANS-PB' => 'disnakertrans',
                'DISPANG-PB'       => 'dispang',
                'DISTANBUN-PB'     => 'distanbun',
                'DISNAKKESWAN-PB'  => 'disnakkeswan',
                'DISHUB-PB'        => 'dishub',
                'DISHUT-PB'        => 'dishut',
                'DLHP-PB'          => 'dlhp',
                'DISKOP-PB'        => 'diskop',
                'DPMK-PB'          => 'dpmk',
                'DP3A-PB'          => 'dp3a',
                'DKP-PB'           => 'dkp',
                'ESDM-PB'          => 'esdm',
                'DISPORA-PB'       => 'dispora',
                'DISBUDPAR-PB'     => 'disbudpar',
                'DPMPTSP-PB'       => 'dpmptsp',
                'DISKOMINFO-PB'    => 'diskominfo',
                'DISPERINDAG-PB'   => 'disperindag',
                'DISPUSIP-PB'      => 'dispusip',
                'BAPPEDA-PB'       => 'bappeda',
                'BALITBANGDA-PB'   => 'balitbangda',
                'BPKAD-PB'         => 'bpkad',
                'BAPENDA-PB'       => 'bapenda',
                'BKD-PB'           => 'bkd',
                'BPSDM-PB'         => 'bpsdm',
                'PENGHUBUNG-PB'    => 'penghubung',
                'BPBD-PB'          => 'bpbd',
            ];

            $createdCount = 0;
            $syncedCount  = 0;

            foreach ($allOpds as $idx => $opd) {
                $slug = $slugCustom[$opd->code] ?? Str::slug(str_replace(['-PB', 'PROV-'], '', $opd->code));
                $short = $opd->short_name ?: $opd->name;
                $pad = str_pad((string) ($idx + 1), 2, '0', STR_PAD_LEFT);

                // Daftar akun standar per instansi (Tepat 4 akun fungsional: 1 Admin, 1 Operator, 1 Validator, 1 Kepala)
                $accountDefinitions = [
                    [
                        'email'     => "admin.{$slug}@ekasuari.test",
                        'name'      => "Admin {$short}",
                        'job_title' => "Admin OPD / Pengelola SAKIP {$short}",
                        'role'      => $roleAdminOpd,
                        'nip'       => "198501{$pad}2010011001",
                    ],
                    [
                        'email'     => "operator.{$slug}@ekasuari.test",
                        'name'      => "Operator {$short}",
                        'job_title' => "Operator Teknis Kinerja {$short}",
                        'role'      => $roleOperatorOpd,
                        'nip'       => "199002{$pad}2015021002",
                    ],
                    [
                        'email'     => "validator.{$slug}@ekasuari.test",
                        'name'      => "Validator {$short}",
                        'job_title' => "Validator & Verifikator Kinerja {$short}",
                        'role'      => $roleValidatorOpd,
                        'nip'       => "198803{$pad}2013011003",
                    ],
                    [
                        'email'     => "kepala.{$slug}@ekasuari.test",
                        'name'      => "Kepala {$short}",
                        'job_title' => "Pimpinan Instansi ({$short})",
                        'role'      => $roleKepalaOpd,
                        'nip'       => "197204{$pad}1998031004",
                    ],
                ];

                foreach ($accountDefinitions as $acc) {
                    $user = User::firstWhere('email', $acc['email']);
                    if (! $user) {
                        // Generate NIP unik jika NIP bentrok
                        $nip = $acc['nip'];
                        if (User::where('employee_number', $nip)->exists()) {
                            $nip = '1985' . str_pad((string) mt_rand(10000000000000, 99999999999999), 14, '0', STR_PAD_LEFT);
                        }

                        $user = User::create([
                            'name'                 => $acc['name'],
                            'email'                => $acc['email'],
                            'password'             => $defaultPassword,
                            'job_title'            => $acc['job_title'],
                            'employee_number'      => $nip,
                            'is_active'            => true,
                            'email_verified_at'    => now(),
                            'locale'               => 'id',
                            'must_change_password' => false,
                            'mfa_enabled'          => false,
                            'google2fa_enabled'    => false,
                        ]);
                        $createdCount++;
                    }

                    // Pastikan Role terhubung
                    if ($acc['role'] && ! $user->roles()->where('roles.id', $acc['role']->id)->exists()) {
                        $user->roles()->syncWithoutDetaching([$acc['role']->id]);
                    }

                    // Pastikan Organisasi terhubung di pivot organization_user
                    $user->organizations()->syncWithoutDetaching([$opd->id => ['is_default' => true]]);
                    $syncedCount++;
                }
            }

            // 3. Pembersihan Akun Duplikat / Alias / Demo Kamar (Cleanup)
            $aliasEmails = [];
            foreach ($allOpds as $o) {
                $s = $slugCustom[$o->code] ?? Str::slug(str_replace(['-PB', 'PROV-', 'SET-'], '', $o->code));
                if ($s !== 'inspektorat') {
                    $aliasEmails[] = "{$s}@ekasuari.test";
                }
            }

            $demoKamarPattern = User::where('email', 'like', 'kamar%@ekasuari.test')
                ->orWhere('email', 'like', '%.kamar%@ekasuari.test')
                ->orWhere('email', 'like', 'kamar.%@ekasuari.test')
                ->orWhereIn('email', ['admin.opd@ekasuari.test', 'operator.opd@ekasuari.test', 'validator.opd@ekasuari.test', 'kepala.opd@ekasuari.test'])
                ->pluck('email')
                ->all();

            $candidatesToDelete = array_unique(array_merge($aliasEmails, $demoKamarPattern));

            $deletedCount = 0;
            foreach ($candidatesToDelete as $email) {
                $u = User::where('email', $email)->first();
                if ($u) {
                    $hasDocs = \App\Models\PlanningDocument::where('created_by', $u->id)->exists();
                    if (! $hasDocs) {
                        $u->roles()->detach();
                        $u->organizations()->detach();
                        $u->delete();
                        $deletedCount++;
                    }
                }
            }

            // 4. Tangani akun yang tertaut ke organisasi tidak aktif (misal Dinas Damkar)
            $inactiveOrgs = Organization::where('is_active', false)->pluck('id');
            if ($inactiveOrgs->isNotEmpty()) {
                $orphanedUsers = User::whereHas('organizations', fn ($q) => $q->whereIn('organizations.id', $inactiveOrgs))
                    ->whereDoesntHave('organizations', fn ($q) => $q->whereNotIn('organizations.id', $inactiveOrgs))
                    ->get();

                foreach ($orphanedUsers as $u) {
                    $u->roles()->detach();
                    $u->organizations()->detach();
                    $u->delete();
                }
            }

            $this->command?->info("✓ Selesai! Berhasil membuat {$createdCount} akun baru, membersihkan {$deletedCount} akun duplikat, dan menyelaraskan {$syncedCount} tautan OPD.");
        });
    }
}
