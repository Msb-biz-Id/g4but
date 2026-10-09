<?php

namespace Database\Seeders;

use App\Enums\Role as RoleEnum;
use App\Models\Organization;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class KamarOpdSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * Menyediakan "Kamar OPD" untuk 6 OPD Utama + 4 OPD Cadangan (Total 10 Kamar).
     * Akun pengguna diatur khusus dengan prefix 'kamar{N}' dan 'kamar.{slug}'
     * sehingga terpisah dan tidak bertabrakan dengan akun pada seeder user lama (LocalUserSeeder).
     */
    public function run(): void
    {
        $this->command?->info('================================================================');
        $this->command?->info('   MEMULAI SEEDER: PENYEDIAAN KAMAR 10 OPD (6 UTAMA + 4 CADANGAN)');
        $this->command?->info('================================================================');

        // 1. Pastikan Organisasi Induk Pemerintah Provinsi Papua Barat Tersedia
        $provinsi = Organization::firstOrCreate(
            ['code' => 'PROV-PAPBAR'],
            [
                'name'       => 'Pemerintah Provinsi Papua Barat',
                'short_name' => 'Pemprov Papua Barat',
                'type'       => 'province',
                'address'    => 'Jl. Abraham Atururi, Arfai, Manokwari',
                'is_active'  => true,
            ]
        );

        // 2. Daftar 10 Kamar OPD (6 OPD Utama + 4 OPD Cadangan)
        $kamarDefinitions = [
            // --- 6 OPD UTAMA ---
            [
                'kamar_num'   => 1,
                'category'    => 'Utama',
                'code'        => 'BIRO-ORG-PB',
                'name'        => 'Biro Organisasi Sekretariat Daerah',
                'short_name'  => 'Biro Organisasi',
                'slug'        => 'organisasi',
                'type'        => 'biro',
                'is_bappeda'  => false,
                'kepala'      => 'Dra. Hermelina M. Imbiri',
                'nip_kepala'  => '197003151996032001',
                'address'     => 'Kantor Gubernur Papua Barat Lt. 2, Arfai, Manokwari',
            ],
            [
                'kamar_num'   => 2,
                'category'    => 'Utama',
                'code'        => 'BIRO-PEM-PB',
                'name'        => 'Biro Pemerintahan dan Otonomi Daerah',
                'short_name'  => 'Biro Pemerintahan',
                'slug'        => 'pemerintahan',
                'type'        => 'biro',
                'is_bappeda'  => false,
                'kepala'      => 'Drs. Eduard Dowansiba, M.Si',
                'nip_kepala'  => '196908121995031002',
                'address'     => 'Kantor Gubernur Papua Barat Lt. 3, Arfai, Manokwari',
            ],
            [
                'kamar_num'   => 3,
                'category'    => 'Utama',
                'code'        => 'KOMINFO-PB',
                'name'        => 'Dinas Komunikasi, Informatika, Persandian dan Statistik',
                'short_name'  => 'Dinas Kominfo',
                'slug'        => 'kominfo',
                'type'        => 'opd',
                'is_bappeda'  => false,
                'kepala'      => 'Frans P. Istia, S.Sos., M.M.',
                'nip_kepala'  => '197505102000031003',
                'address'     => 'Kompleks Perkantoran Arfai, Manokwari, Papua Barat',
            ],
            [
                'kamar_num'   => 4,
                'category'    => 'Utama',
                'code'        => 'INSP-PB',
                'name'        => 'Inspektorat Daerah Provinsi Papua Barat',
                'short_name'  => 'Inspektorat',
                'slug'        => 'inspektorat',
                'type'        => 'inspektorat',
                'is_bappeda'  => false,
                'kepala'      => 'Drs. Sugiyono, M.Si, CGCAE',
                'nip_kepala'  => '196804141994031004',
                'address'     => 'Kompleks Kantor Gubernur Papua Barat, Arfai, Manokwari',
            ],
            [
                'kamar_num'   => 5,
                'category'    => 'Utama',
                'code'        => 'BAPPEDA-PB',
                'name'        => 'Badan Perencanaan Pembangunan Daerah',
                'short_name'  => 'Bappeda',
                'slug'        => 'bappeda',
                'type'        => 'opd',
                'is_bappeda'  => true,
                'kepala'      => 'Dance Sangkek, S.H., M.M.',
                'nip_kepala'  => '196711201993031005',
                'address'     => 'Jl. Brigjen Marinir (Purn) Abraham O. Atururi, Arfai, Manokwari',
            ],
            [
                'kamar_num'   => 6,
                'category'    => 'Utama',
                'code'        => 'DISKOP-PB',
                'name'        => 'Dinas Koperasi dan Usaha Kecil Menengah',
                'short_name'  => 'Dinas Koperasi',
                'slug'        => 'koperasi',
                'type'        => 'opd',
                'is_bappeda'  => false,
                'kepala'      => 'Drs. Enos Aronggear, M.M.',
                'nip_kepala'  => '197102181997031006',
                'address'     => 'Kompleks Perkantoran Gubernur Papua Barat, Arfai, Manokwari',
            ],

            // --- 4 OPD CADANGAN ---
            [
                'kamar_num'   => 7,
                'category'    => 'Cadangan 1',
                'code'        => 'DISDIK-PB',
                'name'        => 'Dinas Pendidikan',
                'short_name'  => 'Dinas Pendidikan',
                'slug'        => 'disdik',
                'type'        => 'opd',
                'is_bappeda'  => false,
                'kepala'      => 'Dr. Barnabas Mandacan, M.Pd',
                'nip_kepala'  => '197206101998031007',
                'address'     => 'Kompleks Perkantoran Gubernur Papua Barat, Arfai, Manokwari',
            ],
            [
                'kamar_num'   => 8,
                'category'    => 'Cadangan 2',
                'code'        => 'DINKES-PB',
                'name'        => 'Dinas Kesehatan',
                'short_name'  => 'Dinas Kesehatan',
                'slug'        => 'dinkes',
                'type'        => 'opd',
                'is_bappeda'  => false,
                'kepala'      => 'dr. Alwan Rimosan, Sp.A',
                'nip_kepala'  => '197607212002121008',
                'address'     => 'Jl. Merdeka No. 12, Manokwari, Papua Barat',
            ],
            [
                'kamar_num'   => 9,
                'category'    => 'Cadangan 3',
                'code'        => 'PUPR-PB',
                'name'        => 'Dinas Pekerjaan Umum dan Penataan Ruang',
                'short_name'  => 'Dinas PUPR',
                'slug'        => 'pupr',
                'type'        => 'opd',
                'is_bappeda'  => false,
                'kepala'      => 'Yohanis Momot, S.T., M.T.',
                'nip_kepala'  => '197409151999031009',
                'address'     => 'Jl. Trikora, Wosi, Manokwari, Papua Barat',
            ],
            [
                'kamar_num'   => 10,
                'category'    => 'Cadangan 4',
                'code'        => 'DISHUB-PB',
                'name'        => 'Dinas Perhubungan',
                'short_name'  => 'Dinas Perhubungan',
                'slug'        => 'dishub',
                'type'        => 'opd',
                'is_bappeda'  => false,
                'kepala'      => 'Albert Nakoh, S.T., M.T.',
                'nip_kepala'  => '197304121998031010',
                'address'     => 'Jl. Pahlawan No. 45, Manokwari, Papua Barat',
            ],
        ];

        // 3. Mapping Peran (Roles)
        $roleMap = [
            'Admin OPD'          => Role::firstWhere('name', RoleEnum::AdminOpd->value),
            'Operator OPD'       => Role::firstWhere('name', RoleEnum::OperatorOpd->value),
            'Validator OPD'      => Role::firstWhere('name', RoleEnum::ValidatorOpd->value),
            'Kepala OPD'         => Role::firstWhere('name', RoleEnum::KepalaOpd->value),
            'Admin Provinsi'     => Role::firstWhere('name', RoleEnum::AdminProvinsi->value),
            'Evaluator Provinsi' => Role::firstWhere('name', RoleEnum::EvaluatorProvinsi->value),
            'Inspektorat'        => Role::firstWhere('name', RoleEnum::Inspektorat->value),
        ];

        $defaultPassword = Hash::make('password');
        $tableRows = [];

        $resolveUniqueEmployeeNumber = function (?User $existingUser, string $desiredNumber, string $prefix = '1988'): string {
            if ($existingUser && !empty($existingUser->employee_number)) {
                return $existingUser->employee_number;
            }

            $isTaken = User::where('employee_number', $desiredNumber)
                ->when($existingUser, fn ($q) => $q->where('id', '!=', $existingUser->id))
                ->exists();

            if (!$isTaken) {
                return $desiredNumber;
            }

            do {
                $candidate = $prefix . str_pad((string) mt_rand(10000000000000, 99999999999999), 14, '0', STR_PAD_LEFT);
            } while (User::where('employee_number', $candidate)->exists());

            return $candidate;
        };

        // 4. Buat Kamar & Akun untuk Setiap OPD
        foreach ($kamarDefinitions as $def) {
            // Update atau buat organisasi OPD
            $org = Organization::updateOrCreate(
                ['code' => $def['code']],
                [
                    'name'        => $def['name'],
                    'short_name'  => $def['short_name'],
                    'type'        => $def['type'],
                    'parent_id'   => $provinsi->id,
                    'address'     => $def['address'],
                    'is_active'   => true,
                    'is_bappeda'  => $def['is_bappeda'],
                ]
            );

            $kNum = $def['kamar_num'];
            $kPad = str_pad((string)$kNum, 2, '0', STR_PAD_LEFT);
            $slug = $def['slug'];
            $short = $def['short_name'];
            $categoryLabel = $def['category'];

            // Format akun khusus Kamar:
            // 1. kamar{N}@ekasuari.test         -> Login Cepat Kamar (Admin OPD)
            // 2. admin.kamar{N}@ekasuari.test   -> Admin OPD Kamar
            // 3. operator.kamar{N}@ekasuari.test-> Operator Teknis Kamar
            // 4. validator.kamar{N}@ekasuari.test-> Validator OPD Kamar
            // 5. kepala.kamar{N}@ekasuari.test  -> Kepala OPD Kamar
            // 6. kamar.{slug}@ekasuari.test     -> Alias login berbasis nama OPD
            $kamarAccounts = [
                [
                    'email'           => "kamar{$kNum}@ekasuari.test",
                    'name'            => "Kamar {$kPad} - {$short}",
                    'job_title'       => "Akun Utama Kamar {$kPad} ({$short})",
                    'employee_number' => "198801{$kPad}2012011000",
                    'role'            => 'Admin OPD',
                ],
                [
                    'email'           => "admin.kamar{$kNum}@ekasuari.test",
                    'name'            => "Admin Kamar {$kPad} - {$short}",
                    'job_title'       => "Admin Pengelola Kamar {$kPad} ({$short})",
                    'employee_number' => "198801{$kPad}2012011001",
                    'role'            => 'Admin OPD',
                ],
                [
                    'email'           => "operator.kamar{$kNum}@ekasuari.test",
                    'name'            => "Operator Kamar {$kPad} - {$short}",
                    'job_title'       => "Operator Teknis Penginput Kinerja Kamar {$kPad}",
                    'employee_number' => "199202{$kPad}2016021002",
                    'role'            => 'Operator OPD',
                ],
                [
                    'email'           => "validator.kamar{$kNum}@ekasuari.test",
                    'name'            => "Validator Kamar {$kPad} - {$short}",
                    'job_title'       => "Validator Capaian Kinerja Kamar {$kPad}",
                    'employee_number' => "198903{$kPad}2014011003",
                    'role'            => 'Validator OPD',
                ],
                [
                    'email'           => "kepala.kamar{$kNum}@ekasuari.test",
                    'name'            => "{$def['kepala']} (Kamar {$kPad})",
                    'job_title'       => "Kepala {$short} - Kamar {$kPad}",
                    'employee_number' => $def['nip_kepala'],
                    'role'            => 'Kepala OPD',
                ],
                [
                    'email'           => "kamar.{$slug}@ekasuari.test",
                    'name'            => "Kamar {$short}",
                    'job_title'       => "Akun Alias Kamar {$short}",
                    'employee_number' => "198801{$kPad}2012011099",
                    'role'            => 'Admin OPD',
                ],
            ];

            foreach ($kamarAccounts as $acc) {
                $existingUser = User::firstWhere('email', $acc['email']);
                $employeeNumber = $resolveUniqueEmployeeNumber($existingUser, $acc['employee_number'], '1988');

                $user = User::updateOrCreate(
                    ['email' => $acc['email']],
                    [
                        'name'                 => $acc['name'],
                        'password'             => $defaultPassword,
                        'job_title'            => $acc['job_title'],
                        'employee_number'      => $employeeNumber,
                        'is_active'            => true,
                        'email_verified_at'    => now(),
                        'locale'               => 'id',
                        'must_change_password' => false,
                        'mfa_enabled'          => false,
                        'google2fa_enabled'    => false,
                    ]
                );

                if (isset($roleMap[$acc['role']])) {
                    $user->roles()->sync([$roleMap[$acc['role']]->id]);
                }

                $user->organizations()->sync([$org->id => ['is_default' => true]]);
            }

            $tableRows[] = [
                "Kamar {$kPad}",
                $categoryLabel,
                $short,
                "kamar{$kNum}@ekasuari.test",
                "operator.kamar{$kNum}@ekasuari.test",
                "validator.kamar{$kNum}@ekasuari.test",
                "kepala.kamar{$kNum}@ekasuari.test",
                'password',
            ];
        }

        // 5. Buat Akun Fasilitator & Evaluator Kamar (Pendamping Meja / Desk)
        $facilitatorAccounts = [
            [
                'email'           => 'fasilitator.kamar@ekasuari.test',
                'name'            => 'Fasilitator Kamar SAKIP',
                'job_title'       => 'Fasilitator & Admin Desk Evaluasi SAKIP',
                'employee_number' => '198205012005011991',
                'role'            => 'Admin Provinsi',
                'org'             => $provinsi,
            ],
            [
                'email'           => 'evaluator.kamar@ekasuari.test',
                'name'            => 'Tim Evaluator Kamar SAKIP',
                'job_title'       => 'Evaluator Penilai Kinerja Kamar OPD',
                'employee_number' => '198406022008011992',
                'role'            => 'Evaluator Provinsi',
                'org'             => Organization::firstWhere('code', 'BAPPEDA-PB') ?? $provinsi,
            ],
            [
                'email'           => 'pengawas.kamar@ekasuari.test',
                'name'            => 'Inspektur Pengawas Kamar',
                'job_title'       => 'Pengawas / Reviewer Inspektorat Kamar SAKIP',
                'employee_number' => '197907032003011993',
                'role'            => 'Inspektorat',
                'org'             => Organization::firstWhere('code', 'INSP-PB') ?? $provinsi,
            ],
        ];

        foreach ($facilitatorAccounts as $facc) {
            $user = User::updateOrCreate(
                ['email' => $facc['email']],
                [
                    'name'                 => $facc['name'],
                    'password'             => $defaultPassword,
                    'job_title'            => $facc['job_title'],
                    'employee_number'      => $facc['employee_number'],
                    'is_active'            => true,
                    'email_verified_at'    => now(),
                    'locale'               => 'id',
                    'must_change_password' => false,
                    'mfa_enabled'          => false,
                    'google2fa_enabled'    => false,
                ]
            );

            if (isset($roleMap[$facc['role']])) {
                $user->roles()->sync([$roleMap[$facc['role']]->id]);
            }

            if ($facc['org']) {
                $user->organizations()->sync([$facc['org']->id => ['is_default' => true]]);
            }
        }

        // 6. Tampilkan Ringkasan di Konsol
        if ($this->command) {
            $this->command->newLine();
            $this->command->table(
                ['Kamar', 'Status', 'Perangkat Daerah (OPD)', 'Akun Utama / Admin', 'Akun Operator', 'Akun Validator', 'Akun Kepala', 'Password'],
                $tableRows
            );

            $this->command->info('Akun Pendamping / Desk Kamar:');
            $this->command->line(' - Fasilitator (Admin Prov) : fasilitator.kamar@ekasuari.test (pass: password)');
            $this->command->line(' - Evaluator (Penilai)      : evaluator.kamar@ekasuari.test (pass: password)');
            $this->command->line(' - Pengawas (Inspektorat)   : pengawas.kamar@ekasuari.test (pass: password)');
            $this->command->newLine();
            $this->command->info('Sukses! Kamar 10 OPD beserta akun pengguna telah siap digunakan.');
        }
    }
}
