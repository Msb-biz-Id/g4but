<?php

namespace Database\Seeders;

use App\Enums\Role as RoleEnum;
use App\Models\Organization;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class LocalUserSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Organisasi Induk Pemerintah Provinsi Papua Barat
        $provinsi = Organization::updateOrCreate(
            ['code' => 'PROV-PAPBAR'],
            [
                'name' => 'Pemerintah Provinsi Papua Barat',
                'type' => 'province',
                'address' => 'Jl. Abraham Atururi, Arfai, Manokwari',
                'is_active' => true,
            ],
        );

        // 2. Daftar Lengkap 12 Perangkat Daerah (OPD) Papua Barat
        $opdDefinitions = [
            [
                'code' => 'DISDIK-PB',
                'name' => 'Dinas Pendidikan',
                'short' => 'Dinas Pendidikan',
                'slug' => 'disdik',
                'kepala' => 'Dr. Barnabas Mandacan, M.Pd',
                'address' => 'Kompleks Perkantoran Gubernur Papua Barat, Arfai, Manokwari',
            ],
            [
                'code' => 'DINKES-PB',
                'name' => 'Dinas Kesehatan',
                'short' => 'Dinas Kesehatan',
                'slug' => 'dinkes',
                'kepala' => 'dr. Alwan Rimosan, Sp.A',
                'address' => 'Jl. Merdeka No. 12, Manokwari, Papua Barat',
            ],
            [
                'code' => 'BAPPEDA-PB',
                'name' => 'Badan Perencanaan Pembangunan Daerah',
                'short' => 'Bappeda',
                'slug' => 'bappeda',
                'kepala' => 'Dance Sangkek, S.H., M.M.',
                'address' => 'Jl. Brigjen Marinir (Purn) Abraham O. Atururi, Arfai, Manokwari',
                'is_bappeda' => true,
            ],
            [
                'code' => 'INSP-PB',
                'name' => 'Inspektorat Daerah',
                'short' => 'Inspektorat',
                'slug' => 'inspektorat',
                'kepala' => 'Drs. Sugiyono, M.Si, CGCAE',
                'address' => 'Kompleks Kantor Gubernur Papua Barat, Arfai, Manokwari',
                'type' => 'inspektorat',
            ],
            [
                'code' => 'PUPR-PB',
                'name' => 'Dinas Pekerjaan Umum dan Penataan Ruang',
                'short' => 'Dinas PUPR',
                'slug' => 'pupr',
                'kepala' => 'Yohanis Momot, S.T., M.T.',
                'address' => 'Jl. Trikora, Wosi, Manokwari, Papua Barat',
            ],
            [
                'code' => 'KOMINFO-PB',
                'name' => 'Dinas Komunikasi, Informatika & Persandian',
                'short' => 'Dinas Kominfo',
                'slug' => 'kominfo',
                'kepala' => 'Frans P. Istia, S.Sos., M.M.',
                'address' => 'Kompleks Perkantoran Arfai, Manokwari, Papua Barat',
            ],
            [
                'code' => 'DISHUB-PB',
                'name' => 'Dinas Perhubungan',
                'short' => 'Dinas Perhubungan',
                'slug' => 'dishub',
                'kepala' => 'Albert Nakoh, S.T., M.T.',
                'address' => 'Jl. Pahlawan No. 45, Manokwari, Papua Barat',
            ],
            [
                'code' => 'DISKOP-PB',
                'name' => 'Dinas Koperasi dan UKM',
                'short' => 'Dinas Koperasi',
                'slug' => 'koperasi',
                'kepala' => 'Drs. Enos Aronggear, M.M.',
                'address' => 'Kompleks Perkantoran Gubernur Papua Barat, Arfai, Manokwari',
            ],
            [
                'code' => 'DINSOS-PB',
                'name' => 'Dinas Sosial',
                'short' => 'Dinas Sosial',
                'slug' => 'dinsos',
                'kepala' => 'Lazarus Indouw, S.P., M.M.',
                'address' => 'Jl. Percetakan Negara, Manokwari, Papua Barat',
            ],
            [
                'code' => 'DPMPTSP-PB',
                'name' => 'Dinas Penanaman Modal dan PTSP',
                'short' => 'DPMPTSP',
                'slug' => 'dpmptsp',
                'kepala' => 'Tapil Rambing, S.E., M.Si',
                'address' => 'Jl. Siliwangi No. 8, Manokwari, Papua Barat',
            ],
            [
                'code' => 'SATPOL-PB',
                'name' => 'Satuan Polisi Pamong Praja',
                'short' => 'Satpol PP',
                'slug' => 'satpol',
                'kepala' => 'Octovianus Mayor, S.Sos.',
                'address' => 'Kompleks Kantor Gubernur Papua Barat, Arfai, Manokwari',
            ],
            [
                'code' => 'BIRO-ORG-PB',
                'name' => 'Biro Organisasi Sekretariat Daerah',
                'short' => 'Biro Organisasi',
                'slug' => 'biro-org',
                'kepala' => 'Dra. Hermelina M. Imbiri',
                'address' => 'Kantor Gubernur Papua Barat Lt. 2, Arfai, Manokwari',
            ],
            [
                'code' => 'BIRO-PEM-PB',
                'name' => 'Biro Pemerintahan dan Otonomi Daerah',
                'short' => 'Biro Pemerintahan',
                'slug' => 'biro-pem',
                'kepala' => 'Drs. Eduard Dowansiba, M.Si',
                'address' => 'Kantor Gubernur Papua Barat Lt. 3, Arfai, Manokwari',
            ],
        ];

        $seededOpds = [];
        foreach ($opdDefinitions as $def) {
            $seededOpds[$def['code']] = Organization::updateOrCreate(
                ['code' => $def['code']],
                [
                    'name' => $def['name'],
                    'type' => $def['type'] ?? 'opd',
                    'parent_id' => $provinsi->id,
                    'address' => $def['address'] ?? 'Kompleks Perkantoran Gubernur Papua Barat, Arfai, Manokwari',
                    'is_active' => true,
                    'is_bappeda' => $def['is_bappeda'] ?? false,
                ]
            );
        }

        // 3. Cache Peran (Role Models)
        $roleMap = [
            'Super Admin' => Role::firstWhere('name', RoleEnum::SuperAdmin->value),
            'Admin Provinsi' => Role::firstWhere('name', RoleEnum::AdminProvinsi->value),
            'Pimpinan Provinsi' => Role::firstWhere('name', RoleEnum::PimpinanProvinsi->value),
            'Evaluator Provinsi' => Role::firstWhere('name', RoleEnum::EvaluatorProvinsi->value),
            'Inspektorat' => Role::firstWhere('name', RoleEnum::Inspektorat->value),
            'Auditor' => Role::firstWhere('name', RoleEnum::Auditor->value),
            'Admin OPD' => Role::firstWhere('name', RoleEnum::AdminOpd->value),
            'Operator OPD' => Role::firstWhere('name', RoleEnum::OperatorOpd->value),
            'Validator OPD' => Role::firstWhere('name', RoleEnum::ValidatorOpd->value),
            'Kepala OPD' => Role::firstWhere('name', RoleEnum::KepalaOpd->value),
        ];

        $defaultPassword = Hash::make('password');

        // 4. Akun Tingkat Provinsi & Pengawas
        $provincialAccounts = [
            [
                'name' => 'Super Administrator',
                'email' => 'admin@ekasuari.test',
                'role' => 'Super Admin',
                'job_title' => 'Administrator Sistem & Keamanan',
                'employee' => '198001012005011001',
                'org' => $provinsi,
            ],
            [
                'name' => 'Admin Provinsi Papua Barat',
                'email' => 'admin.provinsi@ekasuari.test',
                'role' => 'Admin Provinsi',
                'job_title' => 'Administrator Master Data & Kebijakan Provinsi',
                'employee' => '198202022006021002',
                'org' => $provinsi,
            ],
            [
                'name' => 'Sekretaris Daerah Papua Barat',
                'email' => 'pimpinan@ekasuari.test',
                'role' => 'Pimpinan Provinsi',
                'job_title' => 'Pimpinan Daerah / Eksekutif Provinsi',
                'employee' => '196803031994031003',
                'org' => $provinsi,
            ],
            [
                'name' => 'Tim Evaluator SAKIP Bappeda',
                'email' => 'evaluator@ekasuari.test',
                'role' => 'Evaluator Provinsi',
                'job_title' => 'Tim Evaluator & Penilai Kinerja Provinsi',
                'employee' => '198604042010011004',
                'org' => $seededOpds['BAPPEDA-PB'],
            ],
            [
                'name' => 'Pengawas Utama Inspektorat',
                'email' => 'inspektorat@ekasuari.test',
                'role' => 'Inspektorat',
                'job_title' => 'Inspektur Pembantu Wilayah I',
                'employee' => '197605052002011005',
                'org' => $seededOpds['INSP-PB'],
            ],
            [
                'name' => 'Auditor Kinerja Eksternal',
                'email' => 'auditor@ekasuari.test',
                'role' => 'Auditor',
                'job_title' => 'Auditor Pemeriksa / BPKP',
                'employee' => '198306062008011006',
                'org' => $provinsi,
            ],
        ];

        // Helper untuk menjamin employee_number unik tanpa memicu pelanggaran unique constraint
        $resolveUniqueEmployeeNumber = function (?User $existingUser, string $desiredNumber, string $prefix = '1985'): string {
            if ($existingUser && ! empty($existingUser->employee_number)) {
                return $existingUser->employee_number;
            }

            $isTaken = User::where('employee_number', $desiredNumber)
                ->when($existingUser, fn ($q) => $q->where('id', '!=', $existingUser->id))
                ->exists();

            if (! $isTaken) {
                return $desiredNumber;
            }

            do {
                $candidate = $prefix.str_pad((string) mt_rand(10000000000000, 99999999999999), 14, '0', STR_PAD_LEFT);
            } while (User::where('employee_number', $candidate)->exists());

            return $candidate;
        };

        foreach ($provincialAccounts as $acc) {
            $existingUser = User::firstWhere('email', $acc['email']);
            $employeeNumber = $resolveUniqueEmployeeNumber($existingUser, $acc['employee'], '1980');

            $user = User::updateOrCreate(
                ['email' => $acc['email']],
                [
                    'name' => $acc['name'],
                    'password' => $defaultPassword,
                    'job_title' => $acc['job_title'],
                    'employee_number' => $employeeNumber,
                    'is_active' => true,
                    'email_verified_at' => now(),
                    'locale' => 'id',
                    'must_change_password' => false,
                    'mfa_enabled' => false,
                    'google2fa_enabled' => false,
                ]
            );

            if (isset($roleMap[$acc['role']])) {
                $user->roles()->sync([$roleMap[$acc['role']]->id]);
            }
            if ($acc['org']) {
                $user->organizations()->sync([$acc['org']->id => ['is_default' => true]]);
            }
        }

        // 5. Akun Pilot Bawaan (Backward Compatibility untuk Demo & Pengujian)
        // Diselaraskan dengan Dinas Pendidikan (DISDIK-PB) sesuai daftar akun pada modal Login.
        $pilotAccounts = [
            [
                'name' => 'Admin Dinas Pendidikan',
                'email' => 'admin.opd@ekasuari.test',
                'role' => 'Admin OPD',
                'job_title' => 'Admin OPD / Pengelola Data',
                'employee' => '198501012010011010',
                'org' => $seededOpds['DISDIK-PB'],
            ],
            [
                'name' => 'Operator Dinas Pendidikan',
                'email' => 'operator.opd@ekasuari.test',
                'role' => 'Operator OPD',
                'job_title' => 'Operator Teknis Penginput Kinerja',
                'employee' => '199002022015021020',
                'org' => $seededOpds['DISDIK-PB'],
            ],
            [
                'name' => 'Validator Dinas Pendidikan',
                'email' => 'validator.opd@ekasuari.test',
                'role' => 'Validator OPD',
                'job_title' => 'Validator & Verifikator Kinerja',
                'employee' => '198803032013011030',
                'org' => $seededOpds['DISDIK-PB'],
            ],
            [
                'name' => 'Dr. Barnabas Mandacan, M.Pd',
                'email' => 'kepala.opd@ekasuari.test',
                'role' => 'Kepala OPD',
                'job_title' => 'Kepala Dinas Pendidikan',
                'employee' => '197004041995031040',
                'org' => $seededOpds['DISDIK-PB'],
            ],
        ];

        foreach ($pilotAccounts as $acc) {
            $existingUser = User::firstWhere('email', $acc['email']);
            $employeeNumber = $resolveUniqueEmployeeNumber($existingUser, $acc['employee'], '1985');

            $user = User::updateOrCreate(
                ['email' => $acc['email']],
                [
                    'name' => $acc['name'],
                    'password' => $defaultPassword,
                    'job_title' => $acc['job_title'],
                    'employee_number' => $employeeNumber,
                    'is_active' => true,
                    'email_verified_at' => now(),
                    'locale' => 'id',
                    'must_change_password' => false,
                    'mfa_enabled' => false,
                    'google2fa_enabled' => false,
                ]
            );

            if (isset($roleMap[$acc['role']])) {
                $user->roles()->sync([$roleMap[$acc['role']]->id]);
            }
            if ($acc['org']) {
                $user->organizations()->sync([$acc['org']->id => ['is_default' => true]]);
            }
        }

        // 6. BUAT AKUN UNTUK SEMUA PERANGKAT DAERAH (SEMUA 12 OPD TANPA TERKECUALI)
        // Setiap OPD memiliki:
        // a. admin.{slug}@ekasuari.test (Admin OPD)
        // b. {slug}@ekasuari.test (Akun Utama Langsung / Admin OPD)
        // c. operator.{slug}@ekasuari.test (Operator OPD)
        // d. validator.{slug}@ekasuari.test (Validator OPD)
        // e. kepala.{slug}@ekasuari.test (Kepala OPD)
        $allOpds = Organization::where('type', '!=', 'province')->orderBy('code')->get();

        $metaByCode = [];
        $codeNumMap = [];
        foreach ($opdDefinitions as $idx => $d) {
            $metaByCode[$d['code']] = $d;
            $codeNumMap[$d['code']] = str_pad((string) ($idx + 1), 2, '0', STR_PAD_LEFT);
        }

        foreach ($allOpds as $i => $opd) {
            $meta = $metaByCode[$opd->code] ?? [
                'slug' => Str::slug(str_replace(['-PB', 'PROV-'], '', $opd->code)),
                'short' => $opd->name,
                'kepala' => 'Kepala '.$opd->name,
            ];

            $slug = $meta['slug'];
            $short = $meta['short'];
            $kepalaName = $meta['kepala'];
            $codeNum = $codeNumMap[$opd->code] ?? str_pad((string) ($i + 1), 2, '0', STR_PAD_LEFT);

            $opdUserSet = [
                // 1. Admin OPD spesifik
                [
                    'email' => "admin.{$slug}@ekasuari.test",
                    'name' => "Admin {$short}",
                    'job_title' => "Admin OPD / Pengelola SAKIP {$short}",
                    'employee_number' => "198501{$codeNum}2010011001",
                    'role' => 'Admin OPD',
                ],
                // 2. Akun utama langsung (misal: disdik@ekasuari.test, dinkes@ekasuari.test)
                // Untuk Inspektorat Daerah (INSP-PB), akun 'inspektorat@ekasuari.test' dialokasikan khusus
                // untuk peran Pengawas/APIP Provinsi. Akun OPD langsung menggunakan 'opd.inspektorat@ekasuari.test'.
                [
                    'email' => ($slug === 'inspektorat') ? 'opd.inspektorat@ekasuari.test' : "{$slug}@ekasuari.test",
                    'name' => "{$opd->name}",
                    'job_title' => "Akun Utama SAKIP {$short}",
                    'employee_number' => "198501{$codeNum}2010011000",
                    'role' => 'Admin OPD',
                ],
                // 3. Operator Teknis OPD
                [
                    'email' => "operator.{$slug}@ekasuari.test",
                    'name' => "Operator {$short}",
                    'job_title' => "Operator Teknis Kinerja {$short}",
                    'employee_number' => "199002{$codeNum}2015021002",
                    'role' => 'Operator OPD',
                ],
                // 4. Validator Capaian OPD
                [
                    'email' => "validator.{$slug}@ekasuari.test",
                    'name' => "Validator {$short}",
                    'job_title' => "Validator & Verifikator Kinerja {$short}",
                    'employee_number' => "198803{$codeNum}2013011003",
                    'role' => 'Validator OPD',
                ],
                // 5. Kepala Dinas / Badan / Biro / Satpol PP
                [
                    'email' => "kepala.{$slug}@ekasuari.test",
                    'name' => $kepalaName,
                    'job_title' => "Kepala {$short}",
                    'employee_number' => "197204{$codeNum}1998031004",
                    'role' => 'Kepala OPD',
                ],
            ];

            foreach ($opdUserSet as $acc) {
                $existingUser = User::firstWhere('email', $acc['email']);
                $employeeNumber = $resolveUniqueEmployeeNumber($existingUser, $acc['employee_number'], '1985');

                $user = User::updateOrCreate(
                    ['email' => $acc['email']],
                    [
                        'name' => $acc['name'],
                        'password' => $defaultPassword,
                        'job_title' => $acc['job_title'],
                        'employee_number' => $employeeNumber,
                        'is_active' => true,
                        'email_verified_at' => now(),
                        'locale' => 'id',
                        'must_change_password' => false,
                        'mfa_enabled' => false,
                        'google2fa_enabled' => false,
                    ]
                );

                if (isset($roleMap[$acc['role']])) {
                    $user->roles()->sync([$roleMap[$acc['role']]->id]);
                }
                $user->organizations()->sync([$opd->id => ['is_default' => true]]);
            }
        }
    }
}
