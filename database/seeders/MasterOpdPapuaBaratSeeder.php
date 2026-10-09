<?php

namespace Database\Seeders;

use App\Models\Organization;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class MasterOpdPapuaBaratSeeder extends Seeder
{
    /**
     * Seeder untuk 36 Perangkat Daerah Resmi Provinsi Papua Barat + 10 Biro Setara OPD
     * Berdasarkan Daftar Resmi SAKIP Pemerintah Provinsi Papua Barat.
     */
    public function run(): void
    {
        $this->command?->info('================================================================');
        $this->command?->info('  MEMPERBARUI MASTER DATA: 36 OPD + 10 BIRO SETARA OPD PAPUA BARAT');
        $this->command?->info('================================================================');

        DB::transaction(function () {
            // ── 0. Sinkronisasi, Penggabungan & Pembersihan Data Lama di PostgreSQL ──
            $aliases = [
                'BIRO ADMINISTRASIPELAKSANAAN OTSUS'           => 'BIRO-OTSUS-PB',
                'BIRO ADMINISTRASI PELAKSANAAN OTONOMI KHUSUS' => 'BIRO-OTSUS-PB',
                'BIRO HUKUM'                                   => 'BIRO-HUKUM-PB',
                'BADAN PENGHUBUNG'                             => 'PENGHUBUNG-PB',
                'DINAS TRANSMIGRASI DAN TENAGA KERJA'          => 'DISNAKERTRANS-PB',
                'BAPENDA'                                      => 'BAPENDA-PB',
                'Biro Administrasi Pimpinan'                   => 'BIRO-ADPIM-PB',
                'Sekretariat Daerah'                           => 'SETDA-PB',
                'KOMINFO-PB'                                   => 'DISKOMINFO-PB',
            ];

            foreach ($aliases as $oldCode => $newCode) {
                $oldOrg = Organization::where('code', $oldCode)->first();
                $targetOrg = Organization::where('code', $newCode)->first();

                if ($oldOrg && $targetOrg && $oldOrg->id !== $targetOrg->id) {
                    // Pindahkan relasi pivot dan dokumen jika ada
                    DB::table('organization_user')->where('organization_id', $oldOrg->id)->update(['organization_id' => $targetOrg->id]);
                    DB::table('planning_documents')->where('organization_id', $oldOrg->id)->update(['organization_id' => $targetOrg->id]);
                    $oldOrg->forceDelete();
                } elseif ($oldOrg && ! $targetOrg) {
                    $oldOrg->update(['code' => $newCode]);
                }
            }

            // Hapus tuntas organisasi yang tidak ada di daftar resmi (seperti Dinas Damkar)
            $invalidOrgs = Organization::where(function ($q) {
                $q->where('code', 'like', '%Damkar%')
                  ->orWhere('name', 'like', '%Damkar%');
            })->get();

            foreach ($invalidOrgs as $inv) {
                $inv->users()->detach();
                $inv->forceDelete();
            }

            // ── 1. Induk Pemerintah Provinsi Papua Barat ────────────────────────────
            $provinsi = Organization::updateOrCreate(
                ['code' => 'PROV-PAPBAR'],
                [
                    'name'       => 'Pemerintah Provinsi Papua Barat',
                    'short_name' => 'Pemprov Papua Barat',
                    'type'       => 'province',
                    'parent_id'  => null,
                    'address'    => 'Jl. Brigjen Marinir (Purn) Abraham O. Atururi, Arfai, Manokwari',
                    'is_active'  => true,
                ]
            );

            // ── 2. Sekretariat Daerah (SETDA) ───────────────────────────────────────
            $setda = Organization::updateOrCreate(
                ['code' => 'SETDA-PB'],
                [
                    'name'       => 'Sekretariat Daerah',
                    'short_name' => 'Setda',
                    'type'       => 'opd',
                    'parent_id'  => $provinsi->id,
                    'address'    => 'Kompleks Kantor Gubernur Papua Barat, Arfai, Manokwari',
                    'is_active'  => true,
                ]
            );

            // ── 3. 10 Biro Sekretariat Daerah (Setara OPD -> type: 'opd') ───────────
            $biros = [
                ['code' => 'BIRO-PEM-PB',     'name' => 'Biro Pemerintahan',                'short_name' => 'Biro Pemerintahan'],
                ['code' => 'BIRO-HUKUM-PB',   'name' => 'Biro Hukum',                       'short_name' => 'Biro Hukum'],
                ['code' => 'BIRO-ADPIM-PB',   'name' => 'Biro Administrasi Pimpinan',        'short_name' => 'Biro Adpim'],
                ['code' => 'BIRO-ADBANG-PB',  'name' => 'Biro Administrasi Pembangunan',     'short_name' => 'Biro Adbang'],
                ['code' => 'BIRO-MENSPIR-PB', 'name' => 'Biro Mental dan Spiritual',        'short_name' => 'Biro Menspir'],
                ['code' => 'BIRO-EKBANG-PB',  'name' => 'Biro Perekonomian dan Kerjasama',   'short_name' => 'Biro Perekonomian'],
                ['code' => 'BIRO-UMUM-PB',    'name' => 'Biro Layanan Umum',                'short_name' => 'Biro Umum'],
                ['code' => 'BIRO-ORG-PB',     'name' => 'Biro Organisasi',                  'short_name' => 'Biro Organisasi'],
                ['code' => 'BIRO-PBJ-PB',     'name' => 'Biro Pengadaan Barang dan Jasa',   'short_name' => 'Biro PBJ'],
                ['code' => 'BIRO-OTSUS-PB',   'name' => 'Biro Otonomi Khusus (Otsus)',       'short_name' => 'Biro Otsus'],
            ];

            foreach ($biros as $b) {
                Organization::updateOrCreate(
                    ['code' => $b['code']],
                    [
                        'name'       => $b['name'],
                        'short_name' => $b['short_name'],
                        'type'       => 'opd', // Klien meminta Biro setara OPD agar tampil di analitik & ringkasan
                        'parent_id'  => $setda->id,
                        'address'    => 'Kompleks Kantor Gubernur Papua Barat, Arfai, Manokwari',
                        'is_active'  => true,
                    ]
                );
            }

            // ── 4. 35 Perangkat Daerah Lainnya (Nomor 2 s/d 36) ──────────────────────
            $opds = [
                // 2. Sekretariat DPRPB
                ['code' => 'SET-DPRPB',        'name' => 'Sekretariat DPRPB',                                                                          'short_name' => 'Sekretariat DPRPB'],
                // 3. Sekretariat MRPB
                ['code' => 'SET-MRPB',         'name' => 'Sekretariat MRPB',                                                                          'short_name' => 'Sekretariat MRPB'],
                // 4. Inspektorat
                ['code' => 'INSP-PB',          'name' => 'Inspektorat Daerah',                                                                        'short_name' => 'Inspektorat'],
                // 5. Dinas Pendidikan
                ['code' => 'DISDIK-PB',        'name' => 'Dinas Pendidikan',                                                                          'short_name' => 'Dinas Pendidikan'],
                // 6. Dinas Kesehatan
                ['code' => 'DINKES-PB',        'name' => 'Dinas Kesehatan',                                                                           'short_name' => 'Dinas Kesehatan'],
                // 7. Dinas Pekerjaan Umum dan Perumahan Rakyat
                ['code' => 'PUPR-PB',          'name' => 'Dinas Pekerjaan Umum dan Perumahan Rakyat',                                                 'short_name' => 'Dinas PUPR'],
                // 8. Satuan Polisi Pamong Praja Daerah Provinsi
                ['code' => 'SATPOL-PB',        'name' => 'Satuan Polisi Pamong Praja Daerah Provinsi',                                                'short_name' => 'Satpol PP'],
                // 9. Dinas Sosial
                ['code' => 'DINSOS-PB',        'name' => 'Dinas Sosial',                                                                              'short_name' => 'Dinas Sosial'],
                // 10. Dinas Administrasi Kependudukan, Pencatatan Sipil, Pengendalian Penduduk dan Keluarga Berencana
                ['code' => 'DUKCAPIL-PB',      'name' => 'Dinas Administrasi Kependudukan, Pencatatan Sipil, Pengendalian Penduduk dan Keluarga Berencana', 'short_name' => 'Dinas Dukcapil'],
                // 11. Dinas Transmigrasi dan Tenaga Kerja
                ['code' => 'DISNAKERTRANS-PB', 'name' => 'Dinas Transmigrasi dan Tenaga Kerja',                                                      'short_name' => 'Disnakertrans'],
                // 12. Dinas Ketahanan Pangan
                ['code' => 'DISPANG-PB',       'name' => 'Dinas Ketahanan Pangan',                                                                    'short_name' => 'Dinas Ketapang'],
                // 13. Dinas Tanaman Pangan, Hortikultura dan Perkebunan
                ['code' => 'DISTANBUN-PB',     'name' => 'Dinas Tanaman Pangan, Hortikultura dan Perkebunan',                                         'short_name' => 'Distanbun'],
                // 14. Dinas Peternakan dan Kesehatan Hewan
                ['code' => 'DISNAKKESWAN-PB',  'name' => 'Dinas Peternakan dan Kesehatan Hewan',                                                      'short_name' => 'Disnakkeswan'],
                // 15. Dinas Perhubungan
                ['code' => 'DISHUB-PB',        'name' => 'Dinas Perhubungan',                                                                         'short_name' => 'Dinas Perhubungan'],
                // 16. Dinas Kehutanan
                ['code' => 'DISHUT-PB',        'name' => 'Dinas Kehutanan',                                                                           'short_name' => 'Dinas Kehutanan'],
                // 17. Dinas Lingkungan Hidup dan Pertanahan
                ['code' => 'DLHP-PB',          'name' => 'Dinas Lingkungan Hidup dan Pertanahan',                                                     'short_name' => 'Dinas LHP'],
                // 18. Dinas Koperasi, Usaha Kecil dan Menengah
                ['code' => 'DISKOP-PB',        'name' => 'Dinas Koperasi, Usaha Kecil dan Menengah',                                                  'short_name' => 'Dinas Koperasi UKM'],
                // 19. Dinas Pemberdayaan Masyarakat dan Kampung
                ['code' => 'DPMK-PB',          'name' => 'Dinas Pemberdayaan Masyarakat dan Kampung',                                                 'short_name' => 'Dinas PMK'],
                // 20. Dinas Pemberdayaan Perempuan dan Perlindungan Anak
                ['code' => 'DP3A-PB',          'name' => 'Dinas Pemberdayaan Perempuan dan Perlindungan Anak',                                        'short_name' => 'Dinas P3A'],
                // 21. Dinas Kelautan dan Perikanan
                ['code' => 'DKP-PB',           'name' => 'Dinas Kelautan dan Perikanan',                                                              'short_name' => 'Dinas DKP'],
                // 22. Dinas Energi dan Sumber Daya Mineral
                ['code' => 'ESDM-PB',          'name' => 'Dinas Energi dan Sumber Daya Mineral',                                                      'short_name' => 'Dinas ESDM'],
                // 23. Dinas Kepemudaan dan Olahraga
                ['code' => 'DISPORA-PB',       'name' => 'Dinas Kepemudaan dan Olahraga',                                                             'short_name' => 'Dispora'],
                // 24. Dinas Kebudayaan dan Pariwisata
                ['code' => 'DISBUDPAR-PB',     'name' => 'Dinas Kebudayaan dan Pariwisata',                                                           'short_name' => 'Disbudpar'],
                // 25. Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu
                ['code' => 'DPMPTSP-PB',       'name' => 'Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu',                                    'short_name' => 'DPMPTSP'],
                // 26. Dinas Komunikasi Informatika, Persandian dan Statistik
                ['code' => 'DISKOMINFO-PB',    'name' => 'Dinas Komunikasi Informatika, Persandian dan Statistik',                                    'short_name' => 'Diskominfo Perstik'],
                // 27. Dinas Perindustrian dan Perdagangan
                ['code' => 'DISPERINDAG-PB',   'name' => 'Dinas Perindustrian dan Perdagangan',                                                       'short_name' => 'Disperindag'],
                // 28. Dinas Kearsipan dan Perpustakaan
                ['code' => 'DISPUSIP-PB',      'name' => 'Dinas Kearsipan dan Perpustakaan',                                                          'short_name' => 'Dispusip'],
                // 29. Badan Perencanaan Pembangunan Daerah
                ['code' => 'BAPPEDA-PB',       'name' => 'Badan Perencanaan Pembangunan Daerah',                                                      'short_name' => 'Bappeda', 'is_bappeda' => true],
                // 30. Badan Penelitian dan Pengembangan Daerah
                ['code' => 'BALITBANGDA-PB',   'name' => 'Badan Penelitian dan Pengembangan Daerah',                                                  'short_name' => 'Balitbangda'],
                // 31. Badan Pengelola Keuangan dan Aset Daerah
                ['code' => 'BPKAD-PB',         'name' => 'Badan Pengelola Keuangan dan Aset Daerah',                                                 'short_name' => 'BPKAD'],
                // 32. Badan Pendapatan Daerah
                ['code' => 'BAPENDA-PB',       'name' => 'Badan Pendapatan Daerah',                                                                   'short_name' => 'Bapenda'],
                // 33. Badan Kepegawaian Daerah
                ['code' => 'BKD-PB',           'name' => 'Badan Kepegawaian Daerah',                                                                  'short_name' => 'BKD'],
                // 34. Badan Pengembangan Sumber Daya Manusia Daerah Provinsi
                ['code' => 'BPSDM-PB',         'name' => 'Badan Pengembangan Sumber Daya Manusia Daerah Provinsi',                                    'short_name' => 'BPSDM'],
                // 35. Badan Penghubung
                ['code' => 'PENGHUBUNG-PB',    'name' => 'Badan Penghubung Daerah',                                                                   'short_name' => 'Badan Penghubung'],
                // 36. Badan Penanggulangan Bencana Daerah
                ['code' => 'BPBD-PB',          'name' => 'Badan Penanggulangan Bencana Daerah',                                                       'short_name' => 'BPBD'],
            ];

            foreach ($opds as $item) {
                Organization::updateOrCreate(
                    ['code' => $item['code']],
                    [
                        'name'       => $item['name'],
                        'short_name' => $item['short_name'],
                        'type'       => 'opd',
                        'parent_id'  => $provinsi->id,
                        'is_active'  => true,
                        'is_bappeda' => $item['is_bappeda'] ?? false,
                    ]
                );
            }

            // Pastikan tidak ada biro lama yang tertinggal dengan type = 'biro'
            Organization::where('type', 'biro')->update(['type' => 'opd']);
        });

        $this->command?->info('✓ Sukses! Master Data 36 OPD + 10 Biro telah terdaftar dan disinkronkan.');
    }
}
