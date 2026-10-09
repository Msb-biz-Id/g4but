<?php

namespace Database\Seeders;

use App\Enums\Role as RoleEnum;
use App\Models\Organization;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Menyiapkan akun pengguna terstruktur untuk 7 role baru Rumah Besar OPD.
     */
    public function run(): void
    {
        $rootOpd = Organization::where('code', 'OPD-INDUK')->firstOrFail();
        $sekretariat = Organization::where('code', 'SEKRETARIAT')->firstOrFail();
        $bidang1 = Organization::where('code', 'BIDANG-1')->firstOrFail();
        $bidang2 = Organization::where('code', 'BIDANG-2')->firstOrFail();

        $defaultPassword = Hash::make('Password@123');

        $users = [
            // 1. Super Admin (Global System Admin)
            [
                'email' => 'superadmin@ekasuari.local',
                'name' => 'Super Administrator',
                'nip' => '198001012000011001',
                'organization_id' => $rootOpd->id,
                'role' => RoleEnum::SuperAdmin->value,
            ],
            // 2. Admin OPD (Maker OPD Inti)
            [
                'email' => 'admin.opd@ekasuari.local',
                'name' => 'Admin Perangkat Daerah',
                'nip' => '198502022005021002',
                'organization_id' => $rootOpd->id,
                'role' => RoleEnum::AdminOpd->value,
            ],
            // 3. Kepala OPD (Checker OPD Inti / Pimpinan)
            [
                'email' => 'kepala.opd@ekasuari.local',
                'name' => 'Kepala Dinas Pendidikan dan Kebudayaan',
                'nip' => '197503031995031003',
                'organization_id' => $rootOpd->id,
                'role' => RoleEnum::KepalaOpd->value,
            ],
            // 4. Admin Sekretariat (Maker Sekretariat)
            [
                'email' => 'admin.sekretariat@ekasuari.local',
                'name' => 'Admin Sekretariat Dinas',
                'nip' => '198804042008041004',
                'organization_id' => $sekretariat->id,
                'role' => RoleEnum::AdminSekretariat->value,
            ],
            // 5. Kepala Sekretariat (Checker Sekretariat / Sekretaris Dinas)
            [
                'email' => 'kepala.sekretariat@ekasuari.local',
                'name' => 'Sekretaris Dinas Pendidikan dan Kebudayaan',
                'nip' => '197805051998051005',
                'organization_id' => $sekretariat->id,
                'role' => RoleEnum::KepalaSekretariat->value,
            ],
            // 6. Admin Bidang Dikdas (Maker Bidang Dikdas)
            [
                'email' => 'admin.dikdas@ekasuari.local',
                'name' => 'Admin Bidang Dikdas',
                'nip' => '199006062010061006',
                'organization_id' => $bidang1->id,
                'role' => RoleEnum::AdminBidang->value,
            ],
            // 7. Kepala Bidang Dikdas (Checker Bidang Dikdas)
            [
                'email' => 'kabid.dikdas@ekasuari.local',
                'name' => 'Kepala Bidang Pendidikan Dasar',
                'nip' => '198207072002071007',
                'organization_id' => $bidang1->id,
                'role' => RoleEnum::KepalaBidang->value,
            ],
            // Admin Bidang Dikmen (Maker Bidang Dikmen)
            [
                'email' => 'admin.dikmen@ekasuari.local',
                'name' => 'Admin Bidang Dikmen',
                'nip' => '199108082011081008',
                'organization_id' => $bidang2->id,
                'role' => RoleEnum::AdminBidang->value,
            ],
            // Kepala Bidang Dikmen (Checker Bidang Dikmen)
            [
                'email' => 'kabid.dikmen@ekasuari.local',
                'name' => 'Kepala Bidang Pendidikan Menengah',
                'nip' => '198309092003091009',
                'organization_id' => $bidang2->id,
                'role' => RoleEnum::KepalaBidang->value,
            ],
        ];

        foreach ($users as $u) {
            $roleModel = Role::where('name', $u['role'])->first();

            $user = User::updateOrCreate(
                ['email' => $u['email']],
                [
                    'name' => $u['name'],
                    'employee_number' => $u['nip'],
                    'password' => $defaultPassword,
                    'is_active' => true,
                    'email_verified_at' => now(),
                    'must_change_password' => false,
                ]
            );

            if ($roleModel) {
                $user->roles()->syncWithoutDetaching([$roleModel->id]);
            }

            if (! empty($u['organization_id'])) {
                $user->organizations()->syncWithoutDetaching([
                    $u['organization_id'] => ['is_default' => true],
                ]);
            }
        }
    }
}
