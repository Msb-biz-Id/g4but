<?php

namespace Database\Seeders;

use App\Models\IkuHistory;
use App\Models\Indicator;
use App\Models\IndicatorTarget;
use App\Models\IndicatorVersion;
use App\Models\MeasurementUnit;
use App\Models\Organization;
use App\Models\PlanningPeriod;
use App\Models\StrategicGoal;
use App\Models\StrategicObjective;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class IkuSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('=== IkuSeeder: Menyiapkan Master & Dummy Data IKU ===');

        DB::transaction(function () {
            // ── 1. SATUAN PENGUKURAN (Measurement Units) ──────────────────────────
            $this->command->info('1. Menyiapkan Satuan Pengukuran...');
            $unitsData = [
                ['code' => 'PERSEN',    'name' => 'Persen',            'symbol' => '%',        'description' => 'Persentase proporsi atau rasio'],
                ['code' => 'INDEKS',    'name' => 'Indeks',            'symbol' => 'Indeks',   'description' => 'Skor komposit indeks'],
                ['code' => 'POIN',      'name' => 'Poin / Nilai',      'symbol' => 'Poin',     'description' => 'Nilai capaian evaluasi angka'],
                ['code' => 'DOKUMEN',   'name' => 'Dokumen',           'symbol' => 'Dokumen',  'description' => 'Satuan dokumen resmi'],
                ['code' => 'ORANG',     'name' => 'Orang',             'symbol' => 'Orang',    'description' => 'Jumlah individu / jiwa'],
                ['code' => 'UNIT',      'name' => 'Unit / Instansi',   'symbol' => 'Unit',     'description' => 'Jumlah unit organisasi'],
                ['code' => 'KM',        'name' => 'Kilometer',         'symbol' => 'Km',       'description' => 'Panjang ruas jalan'],
                ['code' => 'LEMBAGA',   'name' => 'Lembaga / Badan',   'symbol' => 'Lembaga',  'description' => 'Badan hukum atau koperasi'],
            ];

            $units = [];
            foreach ($unitsData as $u) {
                $units[$u['code']] = MeasurementUnit::updateOrCreate(
                    ['code' => $u['code']],
                    [
                        'name' => $u['name'],
                        'symbol' => $u['symbol'],
                        'description' => $u['description'],
                        'is_active' => true,
                    ]
                );
            }

            // ── 2. PERIODE PERENCANAAN ───────────────────────────────────────────
            $this->command->info('2. Menyiapkan Periode Perencanaan...');
            $period = PlanningPeriod::updateOrCreate(
                ['code' => 'RPJMD-2025-2029'],
                [
                    'name' => 'Periode RPJMD Papua Barat 2025-2029',
                    'year' => 2025,
                    'type' => 'annual',
                    'start_date' => '2025-01-01',
                    'end_date' => '2029-12-31',
                    'status' => 'active',
                ]
            );

            // ── 3. ORGANISASI ────────────────────────────────────────────────────
            $provinsi = Organization::firstWhere('code', 'PROV-PAPBAR') ?? Organization::first();
            $bappeda = Organization::firstWhere('code', 'BAPPEDA-PB');
            $disdik = Organization::firstWhere('code', 'DISDIK-PB');
            $inspektorat = Organization::firstWhere('code', 'INSP-PB');
            $koperasi = Organization::firstWhere('code', 'DISKOP-PB');
            $pupr = Organization::firstWhere('code', 'PUPR-PB');

            // Pastikan Bappeda memiliki flag is_bappeda = true
            if ($bappeda) {
                $bappeda->update(['is_bappeda' => true]);
            }

            $adminUser = User::firstWhere('email', 'admin@ekasuari.test') ?? User::first();
            $bappedaUser = User::firstWhere('email', 'admin.bappeda@ekasuari.test') ?? User::firstWhere('email', 'admin.opd@ekasuari.test') ?? $adminUser;

            // ── 4. TUJUAN STRATEGIS (Strategic Goals) ────────────────────────────
            $this->command->info('3. Menyiapkan Tujuan Strategis...');
            $goals = [
                'pemda_1' => StrategicGoal::updateOrCreate(
                    ['code' => 'TUJ-PEMDA-01', 'planning_period_id' => $period->id],
                    [
                        'organization_id' => $provinsi->id,
                        'name' => 'Meningkatkan Kualitas Sumber Daya Manusia Papua Barat yang Cerdas, Sehat, dan Berdaya Saing',
                        'description' => 'Peningkatan indeks pembangunan manusia melalui pemerataan layanan kesehatan dan pendidikan',
                        'status' => 'active',
                    ]
                ),
                'pemda_2' => StrategicGoal::updateOrCreate(
                    ['code' => 'TUJ-PEMDA-02', 'planning_period_id' => $period->id],
                    [
                        'organization_id' => $provinsi->id,
                        'name' => 'Mewujudkan Pertumbuhan Ekonomi Daerah yang Inklusif, Berkelanjutan, dan Berbasis Potensi Lokal',
                        'description' => 'Akselerasi ekonomi kerakyatan dan pengentasan kemiskinan ekstrem di wilayah Papua Barat',
                        'status' => 'active',
                    ]
                ),
                'pemda_3' => StrategicGoal::updateOrCreate(
                    ['code' => 'TUJ-PEMDA-03', 'planning_period_id' => $period->id],
                    [
                        'organization_id' => $provinsi->id,
                        'name' => 'Meningkatkan Tata Kelola Pemerintahan yang Bersih, Efektif, dan Akuntabel Berbasis Digital',
                        'description' => 'Reformasi birokrasi dan peningkatan maturitas SAKIP di seluruh jajaran pemprov',
                        'status' => 'active',
                    ]
                ),
                'disdik' => StrategicGoal::updateOrCreate(
                    ['code' => 'TUJ-DISDIK-01', 'planning_period_id' => $period->id],
                    [
                        'organization_id' => $disdik?->id ?? $provinsi->id,
                        'name' => 'Meningkatkan Akses dan Mutu Layanan Pendidikan Berkualitas dan Merata',
                        'description' => 'Perluasan akses jenjang pendidikan menengah dan vokasi di Papua Barat',
                        'status' => 'active',
                    ]
                ),
                'bappeda' => StrategicGoal::updateOrCreate(
                    ['code' => 'TUJ-BAPPEDA-01', 'planning_period_id' => $period->id],
                    [
                        'organization_id' => $bappeda?->id ?? $provinsi->id,
                        'name' => 'Meningkatkan Efektivitas dan Keselarasan Perencanaan Pembangunan Daerah',
                        'description' => 'Penyelarasan dokumen RPJMD dan Renstra perangkat daerah',
                        'status' => 'active',
                    ]
                ),
                'insp' => StrategicGoal::updateOrCreate(
                    ['code' => 'TUJ-INSP-01', 'planning_period_id' => $period->id],
                    [
                        'organization_id' => $inspektorat?->id ?? $provinsi->id,
                        'name' => 'Meningkatkan Kualitas Pengawasan Internal dan Akuntabilitas Pemerintahan Daerah',
                        'description' => 'Penguatan SPIP dan kapabilitas APIP menuju tata kelola bebas korupsi',
                        'status' => 'active',
                    ]
                ),
                'kop' => StrategicGoal::updateOrCreate(
                    ['code' => 'TUJ-DISKOP-01', 'planning_period_id' => $period->id],
                    [
                        'organization_id' => $koperasi?->id ?? $provinsi->id,
                        'name' => 'Meningkatkan Daya Saing Koperasi dan UMKM Berbasis Komoditas Unggulan Lokal',
                        'description' => 'Pemberdayaan koperasi aktif dan peningkatan omzet pelaku usaha mikro',
                        'status' => 'active',
                    ]
                ),
                'pupr' => StrategicGoal::updateOrCreate(
                    ['code' => 'TUJ-PUPR-01', 'planning_period_id' => $period->id],
                    [
                        'organization_id' => $pupr?->id ?? $provinsi->id,
                        'name' => 'Meningkatkan Konektivitas Wilayah dan Kualitas Infrastruktur Dasar Daerah',
                        'description' => 'Peningkatan kemantapan jalan provinsi dan sarana prasarana penunjang',
                        'status' => 'active',
                    ]
                ),
            ];

            // ── 5. SASARAN STRATEGIS (Strategic Objectives) ──────────────────────
            $this->command->info('4. Menyiapkan Sasaran Strategis...');
            $objectives = [
                'pemda_1' => StrategicObjective::updateOrCreate(
                    ['code' => 'SAS-PEMDA-01', 'strategic_goal_id' => $goals['pemda_1']->id],
                    ['name' => 'Meningkatnya Indeks Pembangunan Manusia (IPM)', 'status' => 'active']
                ),
                'pemda_2' => StrategicObjective::updateOrCreate(
                    ['code' => 'SAS-PEMDA-02', 'strategic_goal_id' => $goals['pemda_2']->id],
                    ['name' => 'Menurunnya Persentase Penduduk Miskin', 'status' => 'active']
                ),
                'pemda_3' => StrategicObjective::updateOrCreate(
                    ['code' => 'SAS-PEMDA-03', 'strategic_goal_id' => $goals['pemda_3']->id],
                    ['name' => 'Meningkatnya Nilai Akuntabilitas Kinerja Instansi Pemerintah (SAKIP)', 'status' => 'active']
                ),
                'disdik' => StrategicObjective::updateOrCreate(
                    ['code' => 'SAS-DISDIK-01', 'strategic_goal_id' => $goals['disdik']->id],
                    ['name' => 'Meningkatnya Angka Partisipasi Kasar (APK) SMA/SMK', 'status' => 'active']
                ),
                'bappeda' => StrategicObjective::updateOrCreate(
                    ['code' => 'SAS-BAPPEDA-01', 'strategic_goal_id' => $goals['bappeda']->id],
                    ['name' => 'Meningkatnya Konsistensi Dokumen Perencanaan dan Penganggaran Daerah', 'status' => 'active']
                ),
                'insp' => StrategicObjective::updateOrCreate(
                    ['code' => 'SAS-INSP-01', 'strategic_goal_id' => $goals['insp']->id],
                    ['name' => 'Meningkatnya Tingkat Maturitas Sistem Pengendalian Intern Pemerintah (SPIP)', 'status' => 'active']
                ),
                'kop' => StrategicObjective::updateOrCreate(
                    ['code' => 'SAS-DISKOP-01', 'strategic_goal_id' => $goals['kop']->id],
                    ['name' => 'Meningkatnya Persentase Koperasi Aktif dan Mandiri', 'status' => 'active']
                ),
                'pupr' => StrategicObjective::updateOrCreate(
                    ['code' => 'SAS-PUPR-01', 'strategic_goal_id' => $goals['pupr']->id],
                    ['name' => 'Meningkatnya Persentase Kondisi Jalan Provinsi dalam Kategori Mantap', 'status' => 'active']
                ),
            ];

            // ── 6. DATA DUMMY IKU DENGAN VARIASI STATUS & WORKFLOW ───────────────
            $this->command->info('5. Menyiapkan Data Dummy IKU & Target Tahunan...');
            $ikusData = [
                // 1. IKU Pemda — Final
                [
                    'code' => 'IKU-PEMDA-0001',
                    'name' => 'Indeks Pembangunan Manusia (IPM)',
                    'level' => 'pemda',
                    'org_id' => null,
                    'goal_id' => $goals['pemda_1']->id,
                    'objective_id' => $objectives['pemda_1']->id,
                    'unit_id' => $units['INDEKS']->id,
                    'definition' => 'Pengukuran capaian pembangunan manusia berbasis sejumlah komponen dasar kualitas hidup, yaitu umur panjang dan hidup sehat, pengetahuan, dan standar hidup layak.',
                    'formula' => 'Rata-rata geometrik dari indeks kesehatan, indeks pendidikan, dan indeks pengeluaran riil per kapita disesuaikan.',
                    'baseline_year' => 2024,
                    'baseline_value' => 68.20,
                    'baseline_note' => 'BPS Papua Barat Rilis Desember 2024 (Skor 68.20)',
                    'polarization' => 'positif',
                    'data_source' => 'Badan Pusat Statistik (BPS) Provinsi Papua Barat',
                    'frequency' => 'annual',
                    'status' => 'final',
                    'targets' => [
                        ['year' => 2025, 'target' => 69.10],
                        ['year' => 2026, 'target' => 70.00],
                        ['year' => 2027, 'target' => 70.80],
                        ['year' => 2028, 'target' => 71.50],
                        ['year' => 2029, 'target' => 72.20],
                    ],
                    'histories' => [
                        ['action' => 'create',   'notes' => 'Inisiasi penyusunan IKU Pemda RPJMD 2025-2029'],
                        ['action' => 'submit',   'notes' => 'Diajukan ke Bappeda untuk verifikasi baseline'],
                        ['action' => 'review',   'notes' => 'Review parameter dan proyeksi target tahunan'],
                        ['action' => 'finalize', 'notes' => 'Disetujui dan difinalisasi sebagai IKU Utama Daerah'],
                    ],
                ],

                // 2. IKU Pemda — Final (Polarisasi Negatif)
                [
                    'code' => 'IKU-PEMDA-0002',
                    'name' => 'Persentase Penduduk Miskin',
                    'level' => 'pemda',
                    'org_id' => null,
                    'goal_id' => $goals['pemda_2']->id,
                    'objective_id' => $objectives['pemda_2']->id,
                    'unit_id' => $units['PERSEN']->id,
                    'definition' => 'Persentase penduduk yang berada di bawah garis kemiskinan terhadap total penduduk di Provinsi Papua Barat.',
                    'formula' => '(Jumlah Penduduk Miskin / Total Penduduk Daerah) × 100%',
                    'baseline_year' => 2024,
                    'baseline_value' => 21.43,
                    'baseline_note' => 'Survei Sosial Ekonomi Nasional (Susenas) Maret 2024 (21.43%)',
                    'polarization' => 'negatif',
                    'data_source' => 'BPS Provinsi Papua Barat',
                    'frequency' => 'annual',
                    'status' => 'final',
                    'targets' => [
                        ['year' => 2025, 'target' => 20.10],
                        ['year' => 2026, 'target' => 18.80],
                        ['year' => 2027, 'target' => 17.50],
                        ['year' => 2028, 'target' => 16.20],
                        ['year' => 2029, 'target' => 15.00],
                    ],
                    'histories' => [
                        ['action' => 'create',   'notes' => 'Penetapan target reduksi kemiskinan tahunan'],
                        ['action' => 'submit',   'notes' => 'Diajukan ke Bappeda'],
                        ['action' => 'review',   'notes' => 'Kesesuaian dengan target nasional Bappenas'],
                        ['action' => 'finalize', 'notes' => 'Target disahkan oleh Pimpinan Daerah'],
                    ],
                ],

                // 3. IKU Pemda — Status Review
                [
                    'code' => 'IKU-PEMDA-0003',
                    'name' => 'Nilai Akuntabilitas Kinerja Instansi Pemerintah (SAKIP) Provinsi',
                    'level' => 'pemda',
                    'org_id' => null,
                    'goal_id' => $goals['pemda_3']->id,
                    'objective_id' => $objectives['pemda_3']->id,
                    'unit_id' => $units['POIN']->id,
                    'definition' => 'Nilai hasil evaluasi penerapan akuntabilitas kinerja instansi pemerintah oleh Kementerian PAN-RB.',
                    'formula' => 'Akumulasi skor komponen perencanaan kinerja (30%), pengukuran (30%), pelaporan (15%), dan evaluasi internal (25%).',
                    'baseline_year' => 2024,
                    'baseline_value' => 64.85,
                    'baseline_note' => 'LHE SAKIP KemenPAN-RB 2024 (Nilai 66.50 - Predikat B)',
                    'polarization' => 'positif',
                    'data_source' => 'Kementerian Pendayagunaan Aparatur Negara dan Reformasi Birokrasi (KemenPAN-RB)',
                    'frequency' => 'annual',
                    'status' => 'review',
                    'targets' => [
                        ['year' => 2025, 'target' => 70.00],
                        ['year' => 2026, 'target' => 72.00],
                        ['year' => 2027, 'target' => 75.00],
                        ['year' => 2028, 'target' => 77.00],
                        ['year' => 2029, 'target' => 80.00],
                    ],
                    'histories' => [
                        ['action' => 'create', 'notes' => 'Penyusunan target predikat SAKIP menuju Predikat A'],
                        ['action' => 'submit', 'notes' => 'Diajukan oleh Bagian Organisasi Setda'],
                        ['action' => 'review', 'notes' => 'Sedang dalam review oleh Tim SAKIP Bappeda & Inspektorat'],
                    ],
                ],

                // 4. IKU OPD Disdik — Final
                [
                    'code' => 'IKU-PD-0001',
                    'name' => 'Angka Partisipasi Kasar (APK) SMA/SMK/MA',
                    'level' => 'perangkat_daerah',
                    'org_id' => $disdik?->id ?? $provinsi->id,
                    'goal_id' => $goals['disdik']->id,
                    'objective_id' => $objectives['disdik']->id,
                    'unit_id' => $units['PERSEN']->id,
                    'definition' => 'Perbandingan jumlah siswa terdaftar jenjang SMA/SMK/MA sederajat terhadap populasi penduduk kelompok usia 16-18 tahun.',
                    'formula' => '(Jumlah Siswa Jenjang SMA/SMK/MA / Jumlah Penduduk Usia 16-18 Tahun) × 100%',
                    'baseline_year' => 2024,
                    'baseline_value' => 76.80,
                    'baseline_note' => 'Dapodik Kemendikbudristek TA 2023/2024 (82.40%)',
                    'polarization' => 'positif',
                    'data_source' => 'Dinas Pendidikan Papua Barat / Dapodik',
                    'frequency' => 'annual',
                    'status' => 'final',
                    'targets' => [
                        ['year' => 2025, 'target' => 84.00],
                        ['year' => 2026, 'target' => 86.00],
                        ['year' => 2027, 'target' => 88.00],
                        ['year' => 2028, 'target' => 90.00],
                        ['year' => 2029, 'target' => 92.00],
                    ],
                    'histories' => [
                        ['action' => 'create',   'notes' => 'Penyusunan target APK Renstra Dinas Pendidikan'],
                        ['action' => 'submit',   'notes' => 'Diajukan oleh Admin OPD Disdik'],
                        ['action' => 'review',   'notes' => 'Review oleh Bidang PPM Bappeda'],
                        ['action' => 'finalize', 'notes' => 'Disahkan oleh Kepala Bappeda'],
                    ],
                ],

                // 5. IKU OPD Bappeda — Final
                [
                    'code' => 'IKU-PD-0002',
                    'name' => 'Persentase Keselarasan Dokumen Perencanaan (RPJMD - Renstra OPD)',
                    'level' => 'perangkat_daerah',
                    'org_id' => $bappeda?->id ?? $provinsi->id,
                    'goal_id' => $goals['bappeda']->id,
                    'objective_id' => $objectives['bappeda']->id,
                    'unit_id' => $units['PERSEN']->id,
                    'definition' => 'Rasio program dan sasaran strategis Renstra Perangkat Daerah yang selaras dengan prioritas pembangunan RPJMD Provinsi.',
                    'formula' => '(Jumlah Sasaran Renstra Selaras RPJMD / Total Sasaran Seluruh Renstra OPD) × 100%',
                    'baseline_year' => 2024,
                    'baseline_value' => 88.00,
                    'baseline_note' => 'Hasil Pengendalian dan Evaluasi Bappeda TA 2024 (88.00%)',
                    'polarization' => 'positif',
                    'data_source' => 'Bidang Perencanaan, Pengendalian & Evaluasi Bappeda Papua Barat',
                    'frequency' => 'annual',
                    'status' => 'final',
                    'targets' => [
                        ['year' => 2025, 'target' => 90.00],
                        ['year' => 2026, 'target' => 92.00],
                        ['year' => 2027, 'target' => 94.00],
                        ['year' => 2028, 'target' => 96.00],
                        ['year' => 2029, 'target' => 98.00],
                    ],
                    'histories' => [
                        ['action' => 'create',   'notes' => 'Inisiasi IKU Renstra Bappeda'],
                        ['action' => 'submit',   'notes' => 'Diajukan untuk penetapan'],
                        ['action' => 'review',   'notes' => 'Review internal'],
                        ['action' => 'finalize', 'notes' => 'Difinalisasi'],
                    ],
                ],

                // 6. IKU OPD Inspektorat — Status Diajukan
                [
                    'code' => 'IKU-PD-0003',
                    'name' => 'Tingkat Maturitas Penyelenggaraan SPIP',
                    'level' => 'perangkat_daerah',
                    'org_id' => $inspektorat?->id ?? $provinsi->id,
                    'goal_id' => $goals['insp']->id,
                    'objective_id' => $objectives['insp']->id,
                    'unit_id' => $units['POIN']->id,
                    'definition' => 'Tingkat kematangan penyelenggaraan Sistem Pengendalian Intern Pemerintah pada seluruh OPD Provinsi Papua Barat berdasarkan parameter BPKP.',
                    'formula' => 'Skor rata-rata tertimbang maturitas SPIP terintegrasi seluruh OPD hasil penjaminan kualitas BPKP.',
                    'baseline_year' => 2024,
                    'baseline_value' => 3.00,
                    'baseline_note' => 'Penetapan BPKP Perwakilan Papua Barat 2024 (Level 3 - Terdefinisi, Skor 3.00)',
                    'polarization' => 'positif',
                    'data_source' => 'Inspektorat Daerah / BPKP Perwakilan Provinsi Papua Barat',
                    'frequency' => 'annual',
                    'status' => 'diajukan',
                    'targets' => [
                        ['year' => 2025, 'target' => 3.20],
                        ['year' => 2026, 'target' => 3.40],
                        ['year' => 2027, 'target' => 3.60],
                        ['year' => 2028, 'target' => 3.80],
                        ['year' => 2029, 'target' => 4.00],
                    ],
                    'histories' => [
                        ['action' => 'create', 'notes' => 'Penyusunan target maturitas SPIP menuju Level 4 (Terkelola)'],
                        ['action' => 'submit', 'notes' => 'Diajukan ke Bappeda untuk proses review dan validasi'],
                    ],
                ],

                // 7. IKU OPD Koperasi — Status Perbaikan
                [
                    'code' => 'IKU-PD-0004',
                    'name' => 'Persentase Koperasi Aktif dan Berkinerja Baik',
                    'level' => 'perangkat_daerah',
                    'org_id' => $koperasi?->id ?? $provinsi->id,
                    'goal_id' => $goals['kop']->id,
                    'objective_id' => $objectives['kop']->id,
                    'unit_id' => $units['PERSEN']->id,
                    'definition' => 'Persentase koperasi terdaftar yang aktif menyelenggarakan Rapat Anggota Tahunan (RAT) dan menjalankan usaha produktif secara berkesinambungan.',
                    'formula' => '(Jumlah Koperasi Aktif & RAT / Total Koperasi Terdaftar di Papua Barat) × 100%',
                    'baseline_year' => 2024,
                    'baseline_value' => 62.50,
                    'baseline_note' => 'Database ODS KemenkopUKM per 31 Desember 2024 (62.50%)',
                    'polarization' => 'positif',
                    'data_source' => 'Online Data System (ODS) KemenkopUKM / Dinas Koperasi PB',
                    'frequency' => 'annual',
                    'status' => 'perbaikan',
                    'targets' => [
                        ['year' => 2025, 'target' => 65.00],
                        ['year' => 2026, 'target' => 68.00],
                        ['year' => 2027, 'target' => 72.00],
                        ['year' => 2028, 'target' => 76.00],
                        ['year' => 2029, 'target' => 80.00],
                    ],
                    'histories' => [
                        ['action' => 'create', 'notes' => 'Penyusunan target koperasi aktif'],
                        ['action' => 'submit', 'notes' => 'Diajukan ke Bappeda'],
                        ['action' => 'review', 'notes' => 'Review oleh Bidang Ekonomi Bappeda'],
                        ['action' => 'return', 'notes' => 'Mohon lampirkan rincian verifikasi ODS dan metodologi audit RAT untuk target tahun 2026-2027.'],
                    ],
                ],

                // 8. IKU OPD PUPR — Status Draft
                [
                    'code' => 'IKU-PD-0005',
                    'name' => 'Persentase Kemantapan Jalan Provinsi',
                    'level' => 'perangkat_daerah',
                    'org_id' => $pupr?->id ?? $provinsi->id,
                    'goal_id' => $goals['pupr']->id,
                    'objective_id' => $objectives['pupr']->id,
                    'unit_id' => $units['PERSEN']->id,
                    'definition' => 'Proporsi panjang jalan provinsi yang berada dalam kondisi baik dan sedang terhadap total seluruh panjang jalan provinsi.',
                    'formula' => '((Panjang Jalan Kondisi Baik (Km) + Panjang Jalan Kondisi Sedang (Km)) / Total Panjang Jalan Provinsi) × 100%',
                    'baseline_year' => 2024,
                    'baseline_value' => 64.12,
                    'baseline_note' => 'Survei Kondisi Jalan (SKJ) Dinas PUPR Papua Barat TA 2024 (64.12%)',
                    'polarization' => 'positif',
                    'data_source' => 'Dinas Pekerjaan Umum dan Penataan Ruang Papua Barat',
                    'frequency' => 'annual',
                    'status' => 'draft',
                    'targets' => [
                        ['year' => 2025, 'target' => 66.50],
                        ['year' => 2026, 'target' => 69.00],
                        ['year' => 2027, 'target' => 72.00],
                        ['year' => 2028, 'target' => 75.00],
                        ['year' => 2029, 'target' => 78.00],
                    ],
                    'histories' => [
                        ['action' => 'create', 'notes' => 'Konsep awal IKU jalan mantap Renstra PUPR 2025-2029 (Draft)'],
                    ],
                ],

                // 9. IKU OPD Koperasi — Status Nonaktif
                [
                    'code' => 'IKU-PD-0006',
                    'name' => 'Indeks Kepuasan Layanan Perizinan Koperasi',
                    'level' => 'perangkat_daerah',
                    'org_id' => $koperasi?->id ?? $provinsi->id,
                    'goal_id' => $goals['kop']->id,
                    'objective_id' => $objectives['kop']->id,
                    'unit_id' => $units['INDEKS']->id,
                    'definition' => 'Tingkat kepuasan pengurus koperasi terhadap pelayanan penerbitan izin usaha simpan pinjam.',
                    'formula' => 'Nilai rata-rata kuesioner Survei Kepuasan Masyarakat (SKM) skala 100.',
                    'baseline_year' => 2023,
                    'baseline_value' => 75.00,
                    'baseline_note' => 'Hasil SKM Dinas Koperasi TA 2023 (Skor 75.00)',
                    'polarization' => 'positif',
                    'data_source' => 'Dinas Koperasi dan UKM Papua Barat',
                    'frequency' => 'annual',
                    'status' => 'nonaktif',
                    'targets' => [
                        ['year' => 2025, 'target' => 78.00],
                        ['year' => 2026, 'target' => 80.00],
                    ],
                    'histories' => [
                        ['action' => 'create',     'notes' => 'Inisiasi IKU layanan'],
                        ['action' => 'finalize',   'notes' => 'Difinalisasi pada periode sebelumnya'],
                        ['action' => 'deactivate', 'notes' => 'Dinonaktifkan oleh Admin Bappeda karena dialihkan menjadi indikator kinerja Renja (bukan IKU level eselon II).'],
                    ],
                ],
            ];

            foreach ($ikusData as $d) {
                $iku = Indicator::updateOrCreate(
                    ['code' => $d['code']],
                    [
                        'name' => $d['name'],
                        'is_iku' => true,
                        'level' => $d['level'],
                        'planning_period_id' => $period->id,
                        'owner_organization_id' => $d['org_id'],
                        'strategic_goal_id' => $d['goal_id'],
                        'strategic_objective_id' => $d['objective_id'],
                        'measurement_unit_id' => $d['unit_id'],
                        'definition' => $d['definition'],
                        'formula_notes' => $d['formula'],
                        'baseline_year' => $d['baseline_year'],
                        'baseline_value' => $d['baseline_value'] ?? null,
                        'baseline_note' => $d['baseline_note'],
                        'polarization' => $d['polarization'],
                        'data_source' => $d['data_source'],
                        'frequency' => $d['frequency'],
                        'responsible_officer_id' => $bappedaUser->id,
                        'iku_status' => $d['status'],
                        'status' => $d['status'] === 'final' ? 'active' : 'draft',
                    ]
                );

                // Buat indicator_version jika belum ada
                $version = IndicatorVersion::updateOrCreate(
                    ['indicator_id' => $iku->id, 'version_number' => 1],
                    [
                        'name' => $iku->name,
                        'definition' => $iku->definition,
                        'frequency' => $iku->frequency,
                        'data_source' => $iku->data_source,
                        'formula_notes' => $iku->formula_notes,
                        'baseline_value' => $d['baseline_value'] ?? null,
                        'measurement_unit_id' => $iku->measurement_unit_id,
                    ]
                );

                if (! $iku->current_version_id) {
                    $iku->update(['current_version_id' => $version->id]);
                }

                // Simpan target tahunan ke indicator_targets
                $orgId = $iku->owner_organization_id ?? $provinsi->id;
                foreach ($d['targets'] as $tgt) {
                    IndicatorTarget::updateOrCreate(
                        [
                            'indicator_version_id' => $version->id,
                            'organization_id' => $orgId,
                            'planning_period_id' => $period->id,
                            'year' => $tgt['year'],
                        ],
                        [
                            'target_value' => $tgt['target'],
                            'status' => $d['status'] === 'final' ? 'approved' : 'draft',
                        ]
                    );
                }

                // Simpan audit trail (IkuHistory)
                foreach ($d['histories'] as $h) {
                    IkuHistory::create([
                        'indicator_id' => $iku->id,
                        'action' => $h['action'],
                        'notes' => $h['notes'],
                        'previous_data' => null,
                        'new_data' => ['iku_status' => $d['status']],
                        'user_id' => $bappedaUser->id,
                        'created_at' => now()->subDays(rand(1, 14)),
                    ]);
                }
            }

            $this->command->info('   OK 9 IKU realistis (Pemda & OPD) berhasil dibuat lengkap dengan Target Tahunan & Audit Trail.');
        });

        $this->command->info('=== IkuSeeder Selesai! ===');
    }
}
