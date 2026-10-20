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
     * Menyiapkan akun pengguna terstruktur resmi untuk seluruh jajaran:
     * Dinas Pekerjaan Umum dan Penataan Ruang (PUPR) Kabupaten Mimika.
     * Termasuk: Kepala Dinas, Sekretariat, 4 Bidang, 12 Seksi Teknis, dan UPTD.
     */
    public function run(): void
    {
        $rootOpd = Organization::where('code', 'OPD-INDUK')->firstOrFail();
        $sekretariat = Organization::where('code', 'SEKRETARIAT')->firstOrFail();
        $subbagProg = Organization::where('code', 'SUBBAG-PROG')->first() ?? $sekretariat;
        $subbagKeu = Organization::where('code', 'SUBBAG-KEU')->first() ?? $sekretariat;
        $subbagUmum = Organization::where('code', 'SUBBAG-UMUM')->first() ?? $sekretariat;

        // 4 Bidang Teknis
        $bidangCK = Organization::where('code', 'BIDANG-CK')->firstOrFail();
        $bidangBM = Organization::where('code', 'BIDANG-BM')->firstOrFail();
        $bidangSDA = Organization::where('code', 'BIDANG-SDA')->firstOrFail();
        $bidangTR = Organization::where('code', 'BIDANG-TR')->firstOrFail();
        $uptd = Organization::where('code', 'UPTD-PUPR')->first() ?? $rootOpd;

        // 12 Seksi
        $seksiCK1 = Organization::where('code', 'SEKSI-CK-1')->first() ?? $bidangCK;
        $seksiCK2 = Organization::where('code', 'SEKSI-CK-2')->first() ?? $bidangCK;
        $seksiCK3 = Organization::where('code', 'SEKSI-CK-3')->first() ?? $bidangCK;

        $seksiBM1 = Organization::where('code', 'SEKSI-BM-1')->first() ?? $bidangBM;
        $seksiBM2 = Organization::where('code', 'SEKSI-BM-2')->first() ?? $bidangBM;
        $seksiBM3 = Organization::where('code', 'SEKSI-BM-3')->first() ?? $bidangBM;

        $seksiSDA1 = Organization::where('code', 'SEKSI-SDA-1')->first() ?? $bidangSDA;
        $seksiSDA2 = Organization::where('code', 'SEKSI-SDA-2')->first() ?? $bidangSDA;
        $seksiSDA3 = Organization::where('code', 'SEKSI-SDA-3')->first() ?? $bidangSDA;

        $seksiTR1 = Organization::where('code', 'SEKSI-TR-1')->first() ?? $bidangTR;
        $seksiTR2 = Organization::where('code', 'SEKSI-TR-2')->first() ?? $bidangTR;
        $seksiTR3 = Organization::where('code', 'SEKSI-TR-3')->first() ?? $bidangTR;

        $defaultPassword = Hash::make('Password@123');

        $users = [
            // ══ 1. PIMPINAN DINAS & ADMINISTRATOR SISTEM ════════════════════
            [
                'email' => 'superadmin@siperforma.local',
                'name' => 'Super Administrator Sistem',
                'nip' => '198001012000011001',
                'organization_id' => $rootOpd->id,
                'role' => RoleEnum::SuperAdmin->value,
            ],
            [
                'email' => 'kepala.dinas@siperforma.local',
                'name' => 'Kepala Dinas PUPR Kabupaten Mimika',
                'nip' => '197503031995031003',
                'organization_id' => $rootOpd->id,
                'role' => RoleEnum::KepalaOpd->value,
            ],
            [
                'email' => 'admin.pupr@siperforma.local',
                'name' => 'Admin Dinas PUPR Mimika',
                'nip' => '198502022005021002',
                'organization_id' => $rootOpd->id,
                'role' => RoleEnum::AdminOpd->value,
            ],

            // ══ 2. SEKRETARIAT DINAS & 3 SUBBAGIAN ═══════════════════════════
            [
                'email' => 'kepala.sekretariat@siperforma.local',
                'name' => 'Sekretaris Dinas PUPR Mimika',
                'nip' => '197805051998051005',
                'organization_id' => $sekretariat->id,
                'role' => RoleEnum::KepalaSekretariat->value,
            ],
            [
                'email' => 'admin.sekretariat@siperforma.local',
                'name' => 'Admin Sekretariat Dinas PUPR',
                'nip' => '198804042008041004',
                'organization_id' => $sekretariat->id,
                'role' => RoleEnum::AdminSekretariat->value,
            ],
            [
                'email' => 'kasubbag.program@siperforma.local',
                'name' => 'Kasubbag Program dan Evaluasi',
                'nip' => '198603122009031006',
                'organization_id' => $subbagProg->id,
                'role' => RoleEnum::AdminSekretariat->value,
            ],
            [
                'email' => 'kasubbag.keuangan@siperforma.local',
                'name' => 'Kasubbag Keuangan dan Aset',
                'nip' => '198704152010042007',
                'organization_id' => $subbagKeu->id,
                'role' => RoleEnum::AdminSekretariat->value,
            ],
            [
                'email' => 'kasubbag.umum@siperforma.local',
                'name' => 'Kasubbag Umum dan Kepegawaian',
                'nip' => '198805202011051008',
                'organization_id' => $subbagUmum->id,
                'role' => RoleEnum::AdminSekretariat->value,
            ],

            // ══ 3. BIDANG CIPTA KARYA & 3 SEKSI ══════════════════════════════
            [
                'email' => 'kabid.ciptakarya@siperforma.local',
                'name' => 'Kepala Bidang Cipta Karya',
                'nip' => '198207072002071011',
                'organization_id' => $bidangCK->id,
                'role' => RoleEnum::KepalaBidang->value,
            ],
            [
                'email' => 'admin.ciptakarya@siperforma.local',
                'name' => 'Operator Bidang Cipta Karya',
                'nip' => '199006062010061012',
                'organization_id' => $bidangCK->id,
                'role' => RoleEnum::AdminBidang->value,
            ],
            [
                'email' => 'seksi.gedung@siperforma.local',
                'name' => 'Kasi Bangunan Gedung dan Penataan Lingkungan',
                'nip' => '198601152009011013',
                'organization_id' => $seksiCK1->id,
                'role' => RoleEnum::AdminBidang->value,
            ],
            [
                'email' => 'seksi.prasarana@siperforma.local',
                'name' => 'Kasi Penyehatan Prasarana Pemukiman',
                'nip' => '198702202010021014',
                'organization_id' => $seksiCK2->id,
                'role' => RoleEnum::AdminBidang->value,
            ],
            [
                'email' => 'seksi.airminum@siperforma.local',
                'name' => 'Kasi Air Minum Dan Sanitasi',
                'nip' => '198803252011031015',
                'organization_id' => $seksiCK3->id,
                'role' => RoleEnum::AdminBidang->value,
            ],

            // ══ 4. BIDANG BINA MARGA & 3 SEKSI ═══════════════════════════════
            [
                'email' => 'kabid.binamarga@siperforma.local',
                'name' => 'Kepala Bidang Bina Marga',
                'nip' => '198108082001081021',
                'organization_id' => $bidangBM->id,
                'role' => RoleEnum::KepalaBidang->value,
            ],
            [
                'email' => 'admin.binamarga@siperforma.local',
                'name' => 'Operator Bidang Bina Marga',
                'nip' => '199109092011091022',
                'organization_id' => $bidangBM->id,
                'role' => RoleEnum::AdminBidang->value,
            ],
            [
                'email' => 'seksi.pembangunanjalan@siperforma.local',
                'name' => 'Kasi Pembangunan Dan Peningkatan Jalan dan Jembatan',
                'nip' => '198504102008041023',
                'organization_id' => $seksiBM1->id,
                'role' => RoleEnum::AdminBidang->value,
            ],
            [
                'email' => 'seksi.pemeliharaanjalan@siperforma.local',
                'name' => 'Kasi Pemeliharaan Jalan dan Jembatan',
                'nip' => '198605152009051024',
                'organization_id' => $seksiBM2->id,
                'role' => RoleEnum::AdminBidang->value,
            ],
            [
                'email' => 'seksi.perencanaanjalan@siperforma.local',
                'name' => 'Kasi Perencanaan Dan Leger Jalan dan Jembatan',
                'nip' => '198706202010061025',
                'organization_id' => $seksiBM3->id,
                'role' => RoleEnum::AdminBidang->value,
            ],

            // ══ 5. BIDANG SUMBER DAYA AIR & 3 SEKSI ══════════════════════════
            [
                'email' => 'kabid.sda@siperforma.local',
                'name' => 'Kepala Bidang Sumber Daya Air',
                'nip' => '198309092003091031',
                'organization_id' => $bidangSDA->id,
                'role' => RoleEnum::KepalaBidang->value,
            ],
            [
                'email' => 'admin.sda@siperforma.local',
                'name' => 'Operator Bidang Sumber Daya Air',
                'nip' => '199210102012101032',
                'organization_id' => $bidangSDA->id,
                'role' => RoleEnum::AdminBidang->value,
            ],
            [
                'email' => 'seksi.sarpras.sda@siperforma.local',
                'name' => 'Kasi Pembangunan Sarana dan Prasarana SDA',
                'nip' => '198607122009071033',
                'organization_id' => $seksiSDA1->id,
                'role' => RoleEnum::AdminBidang->value,
            ],
            [
                'email' => 'seksi.op.sda@siperforma.local',
                'name' => 'Kasi Operasi dan Pemeliharaan SDA',
                'nip' => '198708182010081034',
                'organization_id' => $seksiSDA2->id,
                'role' => RoleEnum::AdminBidang->value,
            ],
            [
                'email' => 'seksi.binamanfaat.sda@siperforma.local',
                'name' => 'Kasi Bina Manfaat SDA',
                'nip' => '198809222011091035',
                'organization_id' => $seksiSDA3->id,
                'role' => RoleEnum::AdminBidang->value,
            ],

            // ══ 6. BIDANG PENATAAN RUANG & 3 SEKSI ═══════════════════════════
            [
                'email' => 'kabid.penataanruang@siperforma.local',
                'name' => 'Kepala Bidang Penataan Ruang',
                'nip' => '198411112004111041',
                'organization_id' => $bidangTR->id,
                'role' => RoleEnum::KepalaBidang->value,
            ],
            [
                'email' => 'admin.penataanruang@siperforma.local',
                'name' => 'Operator Bidang Penataan Ruang',
                'nip' => '199312122013121042',
                'organization_id' => $bidangTR->id,
                'role' => RoleEnum::AdminBidang->value,
            ],
            [
                'email' => 'seksi.perencanaanruang@siperforma.local',
                'name' => 'Kasi Perencanaan Penataan Ruang',
                'nip' => '198710052010101043',
                'organization_id' => $seksiTR1->id,
                'role' => RoleEnum::AdminBidang->value,
            ],
            [
                'email' => 'seksi.pemanfaatanruang@siperforma.local',
                'name' => 'Kasi Pemanfaatan Ruang',
                'nip' => '198811122011111044',
                'organization_id' => $seksiTR2->id,
                'role' => RoleEnum::AdminBidang->value,
            ],
            [
                'email' => 'seksi.pengendalianruang@siperforma.local',
                'name' => 'Kasi Pengendalian Tata Ruang',
                'nip' => '198912202012121045',
                'organization_id' => $seksiTR3->id,
                'role' => RoleEnum::AdminBidang->value,
            ],

            // ══ 7. UPTD PUPR ═════════════════════════════════════════════════
            [
                'email' => 'kepala.uptd@siperforma.local',
                'name' => 'Kepala UPTD Dinas PUPR',
                'nip' => '198601012006011051',
                'organization_id' => $uptd->id,
                'role' => RoleEnum::KepalaBidang->value,
            ],
            [
                'email' => 'admin.uptd@siperforma.local',
                'name' => 'Operator UPTD Dinas PUPR',
                'nip' => '199202022012021052',
                'organization_id' => $uptd->id,
                'role' => RoleEnum::AdminBidang->value,
            ],

            // ══ 8. ALIAS AKUN UJI COBA (KOMPATIBILITAS SEEDER / TEST LAMA) ═══
            [
                'email' => 'kabid.dikdas@siperforma.local',
                'name' => 'Kabid Cipta Karya (Checker)',
                'nip' => '198207072002071007',
                'organization_id' => $bidangCK->id,
                'role' => RoleEnum::KepalaBidang->value,
            ],
            [
                'email' => 'admin.dikdas@siperforma.local',
                'name' => 'Operator Cipta Karya (Maker)',
                'nip' => '199006062010061006',
                'organization_id' => $bidangCK->id,
                'role' => RoleEnum::AdminBidang->value,
            ],
            [
                'email' => 'kabid.dikmen@siperforma.local',
                'name' => 'Kabid Bina Marga (Checker)',
                'nip' => '198309092003091009',
                'organization_id' => $bidangBM->id,
                'role' => RoleEnum::KepalaBidang->value,
            ],
            [
                'email' => 'admin.dikmen@siperforma.local',
                'name' => 'Operator Bina Marga (Maker)',
                'nip' => '199108082011081008',
                'organization_id' => $bidangBM->id,
                'role' => RoleEnum::AdminBidang->value,
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
