<?php

namespace Database\Seeders;

use App\Models\ActionPlan;
use App\Models\Evaluation;
use App\Models\EvaluationScore;
use App\Models\Indicator;
use App\Models\IndicatorTarget;
use App\Models\IndicatorVersion;
use App\Models\MeasurementPeriod;
use App\Models\MeasurementUnit;
use App\Models\MonitoringActionPlanBudget;
use App\Models\MonitoringActionPlanOutput;
use App\Models\Organization;
use App\Models\PerformancePeriod;
use App\Models\PlanningDocument;
use App\Models\PlanningPeriod;
use App\Models\Realization;
use App\Models\StrategicGoal;
use App\Models\StrategicObjective;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class SakipComprehensiveSeeder extends Seeder
{
    public function run(): void
    {
        $this->command?->info('=== Menyiapkan Data Komprehensif SAKIP (Dinamis Penuh) ===');

        DB::transaction(function () {
            // ── 1. Periode ──────────────────────────────────────────────────────────
            $period = PlanningPeriod::firstOrCreate(
                ['code' => 'RPJMD-2025-2029'],
                [
                    'name'       => 'Periode RPJMD Papua Barat 2025-2029',
                    'year'       => 2025,
                    'type'       => 'annual',
                    'start_date' => '2025-01-01',
                    'end_date'   => '2029-12-31',
                    'status'     => 'active',
                ]
            );

            $perfPeriod2026 = PerformancePeriod::firstOrCreate(
                ['year' => 2026],
                [
                    'name'        => 'Tahunan 2026',
                    'status'      => 'open',
                    'start_date'  => '2026-01-01',
                    'end_date'    => '2026-12-31',
                    'description' => 'Periode Tahunan TA 2026',
                ]
            );

            $admin = User::firstWhere('email', 'admin@ekasuari.test') ?? User::first();
            $adminId = $admin?->id ?? 1;

            $unitPersen = MeasurementUnit::firstOrCreate(['code' => 'PERSEN'], ['name' => 'Persen', 'symbol' => '%', 'is_active' => true]);
            $unitIndeks = MeasurementUnit::firstOrCreate(['code' => 'INDEKS'], ['name' => 'Indeks', 'symbol' => 'Indeks', 'is_active' => true]);
            $unitPoin   = MeasurementUnit::firstOrCreate(['code' => 'POIN'], ['name' => 'Poin', 'symbol' => 'Poin', 'is_active' => true]);

            // ── 2. Sub-Periode (Triwulan) ──────────────────────────────────────────
            $twDefs = [
                ['code' => 'TA-2025',  'name' => 'Tahunan 2025',     'start_date' => '2025-01-01', 'end_date' => '2025-12-31', 'status' => 'closed', 'type' => 'annual'],
                ['code' => 'TW1-2026', 'name' => 'Triwulan I 2026',  'start_date' => '2026-01-01', 'end_date' => '2026-03-31', 'status' => 'closed', 'type' => 'quarterly'],
                ['code' => 'TW2-2026', 'name' => 'Triwulan II 2026', 'start_date' => '2026-04-01', 'end_date' => '2026-06-30', 'status' => 'closed', 'type' => 'quarterly'],
                ['code' => 'TW3-2026', 'name' => 'Triwulan III 2026','start_date' => '2026-07-01', 'end_date' => '2026-09-30', 'status' => 'open',   'type' => 'quarterly'],
                ['code' => 'TW4-2026', 'name' => 'Triwulan IV 2026', 'start_date' => '2026-10-01', 'end_date' => '2026-12-31', 'status' => 'open',   'type' => 'quarterly'],
            ];
            foreach ($twDefs as $tw) {
                $twPeriods[$tw['code']] = MeasurementPeriod::updateOrCreate(
                    ['code' => $tw['code']],
                    array_merge($tw, ['planning_period_id' => $period->id, 'submission_deadline' => $tw['end_date']])
                );
            }

            // ── 3. Pemprov & OPD Lengkap ────────────────────────────────────────────
            $provinsi = Organization::updateOrCreate(
                ['code' => 'PROV-PAPBAR'],
                ['name' => 'Pemerintah Provinsi Papua Barat', 'type' => 'province', 'address' => 'Jl. Abraham Atururi, Arfai, Manokwari', 'is_active' => true]
            );

            $opdList = [
                ['code' => 'BAPPEDA-PB',  'name' => 'Badan Perencanaan Pembangunan Daerah', 'short' => 'Bappeda'],
                ['code' => 'INSP-PB',     'name' => 'Inspektorat Daerah',                   'short' => 'Inspektorat'],
                ['code' => 'DISDIK-PB',   'name' => 'Dinas Pendidikan',                     'short' => 'Dinas Pendidikan'],
                ['code' => 'DINKES-PB',   'name' => 'Dinas Kesehatan',                      'short' => 'Dinas Kesehatan'],
                ['code' => 'PUPR-PB',     'name' => 'Dinas Pekerjaan Umum dan Penataan Ruang','short' => 'Dinas PUPR'],
                ['code' => 'KOMINFO-PB',  'name' => 'Dinas Komunikasi, Informatika & Persandian','short' => 'Dinas Kominfo'],
                ['code' => 'DISHUB-PB',   'name' => 'Dinas Perhubungan',                    'short' => 'Dinas Perhubungan'],
                ['code' => 'DISKOP-PB',   'name' => 'Dinas Koperasi dan UKM',               'short' => 'Dinas Koperasi'],
                ['code' => 'DINSOS-PB',   'name' => 'Dinas Sosial',                         'short' => 'Dinas Sosial'],
                ['code' => 'DPMPTSP-PB',  'name' => 'Dinas Penanaman Modal dan PTSP',       'short' => 'DPMPTSP'],
                ['code' => 'SATPOL-PB',   'name' => 'Satuan Polisi Pamong Praja',           'short' => 'Satpol PP'],
                ['code' => 'BIRO-ORG-PB', 'name' => 'Biro Organisasi Sekretariat Daerah',   'short' => 'Biro Organisasi'],
            ];

            $seededOpds = [];
            foreach ($opdList as $item) {
                $seededOpds[$item['code']] = Organization::updateOrCreate(
                    ['code' => $item['code']],
                    [
                        'name'       => $item['name'],
                        'type'       => 'opd',
                        'parent_id'  => $provinsi->id,
                        'is_active'  => true,
                    ]
                );
            }

            // ── 4. Dokumen SAKIP Pemda (12 dari 13 tersedia = 92.31%) ──────────────
            $docTypesPemda = [
                ['type' => 'rpjmd',         'title' => 'RPJMD Provinsi Papua Barat 2025-2029',       'status' => 'approved', 'periode_type' => 'lima_tahunan', 'start_year' => 2025, 'end_year' => 2029],
                ['type' => 'pohon_kinerja', 'title' => 'Pohon Kinerja Pemerintah Daerah 2026',      'status' => 'approved', 'periode_type' => 'tahunan', 'start_year' => null, 'end_year' => null],
                ['type' => 'sop',           'title' => 'Proses Bisnis Pemerintah Daerah 2026',       'status' => 'approved', 'periode_type' => 'tahunan', 'start_year' => null, 'end_year' => null],
                ['type' => 'crosscutting',  'title' => 'Crosscutting Kinerja Pemerintah Daerah 2026','status' => 'approved', 'periode_type' => 'tahunan', 'start_year' => null, 'end_year' => null],
                ['type' => 'cascading',     'title' => 'Cascading Kinerja Pemerintah Daerah 2026',   'status' => 'approved', 'periode_type' => 'tahunan', 'start_year' => null, 'end_year' => null],
                ['type' => 'iku',           'title' => 'Indikator Kinerja Utama Pemda 2025-2029',    'status' => 'approved', 'periode_type' => 'lima_tahunan', 'start_year' => 2025, 'end_year' => 2029],
                ['type' => 'rkpd',          'title' => 'Rencana Kerja Pemerintah Daerah (RKPD) 2026','status' => 'approved', 'periode_type' => 'tahunan', 'start_year' => null, 'end_year' => null],
                ['type' => 'dpa',           'title' => 'Dokumen Anggaran/DPA Terkait 2026',          'status' => 'approved', 'periode_type' => 'tahunan', 'start_year' => null, 'end_year' => null],
                ['type' => 'pk',            'title' => 'Perjanjian Kinerja Gubernur Papua Barat 2026','status' => 'approved', 'periode_type' => 'tahunan', 'start_year' => null, 'end_year' => null],
                // No 10: Manajemen Risiko tidak di-seed untuk 2026 agar berstatus Belum Tersedia (-)
                ['type' => 'renaksi',       'title' => 'Rencana Aksi Kinerja Pemda 2026',            'status' => 'approved', 'periode_type' => 'tahunan', 'start_year' => null, 'end_year' => null],
                ['type' => 'pedoman_teknis','title' => 'Pedoman Teknis Perencanaan Kinerja 2026',    'status' => 'approved', 'periode_type' => 'tahunan', 'start_year' => null, 'end_year' => null],
                ['type' => 'lkjip',         'title' => 'Laporan Kinerja Instansi Pemerintah (LKjIP) 2026','status' => 'approved', 'periode_type' => 'tahunan', 'start_year' => null, 'end_year' => null],
            ];

            foreach ($docTypesPemda as $idx => $d) {
                $slug = strtolower(preg_replace('/[^a-zA-Z0-9]+/', '_', 'doc_prov_' . $d['type'] . '_26'));
                $relPath = "planning/documents/{$slug}.pdf";
                $filePath = $this->createSamplePdf(
                    $relPath,
                    $d['title'],
                    $provinsi->name,
                    strtoupper($d['type']),
                    (string) ($d['start_year'] ? $d['start_year'] . '-' . $d['end_year'] : 2026),
                    [
                        'Nomor Dokumen'     => '00' . ($idx + 1) . '/PEMDA/2026',
                        'Pemerintah Daerah' => $provinsi->name,
                        'Jenis Dokumen'     => strtoupper($d['type']),
                        'Tahun/Periode'     => (string) ($d['start_year'] ? $d['start_year'] . '-' . $d['end_year'] : 2026),
                        'Status Legalitas'  => 'Approved (Resmi)',
                        'Tanggal Penetapan' => now()->subDays(20)->format('d F Y'),
                    ]
                );

                PlanningDocument::updateOrCreate(
                    ['organization_id' => $provinsi->id, 'type' => $d['type'], 'year' => 2026],
                    [
                        'code'                  => 'DOC-PROV-' . strtoupper($d['type']) . '-26',
                        'document_number'       => '00' . ($idx + 1) . '/PEMDA/2026',
                        'title'                 => $d['title'],
                        'periode_type'          => $d['periode_type'],
                        'start_year'            => $d['start_year'] ?? null,
                        'end_year'              => $d['end_year'] ?? null,
                        'file_path'             => $filePath,
                        'status'                => $d['status'],
                        'performance_period_id' => $perfPeriod2026->id,
                        'created_by'            => $adminId,
                        'approved_by'           => $adminId,
                        'approved_at'           => now()->subDays(20),
                    ]
                );
            }

            // Dokumen per OPD (12 Dokumen Wajib: renstra, pohon_kinerja, sop, crosscutting, cascading, iku, renja, dpa, pk, monev, renaksi, lkjip)
            $canonical12 = ['renstra', 'pohon_kinerja', 'sop', 'crosscutting', 'cascading', 'iku', 'renja', 'dpa', 'pk', 'monev', 'renaksi', 'lkjip'];

            $opdSpecificDocs = [
                'BAPPEDA-PB' => $canonical12, // 100% Lengkap (12/12)
                'INSP-PB'    => $canonical12, // 100% Lengkap (12/12)
                'DISDIK-PB'  => array_diff($canonical12, ['lkjip']), // 91.67% Belum Lengkap (11/12)
                'DINKES-PB'  => array_diff($canonical12, ['sop', 'cascading', 'monev', 'lkjip']), // 66.67% Belum Lengkap (8/12)
                'PUPR-PB'    => array_diff($canonical12, ['monev', 'lkjip']), // 83.33% Belum Lengkap (10/12)
                'KOMINFO-PB' => $canonical12, // 100% Lengkap (12/12)
                'DISHUB-PB'  => [], // 0% Belum Tersedia (0/12)
                'DISKOP-PB'  => array_slice($canonical12, 0, 8), // 66.67% Belum Lengkap (8/12)
                'DINSOS-PB'  => $canonical12, // 100% Lengkap (12/12)
                'DPMPTSP-PB' => $canonical12, // 100% Lengkap (12/12)
                'SATPOL-PB'  => array_slice($canonical12, 0, 6), // 50% Belum Lengkap (6/12)
                'BIRO-ORG-PB'=> $canonical12, // 100% Lengkap (12/12)
            ];

            foreach ($seededOpds as $code => $opd) {
                // Bersihkan dokumen tahun 2026 yang sudah ada untuk OPD ini agar seed akurat
                PlanningDocument::where('organization_id', $opd->id)->where('year', 2026)->delete();

                $docTypesToSeed = $opdSpecificDocs[$code] ?? $canonical12;
                foreach ($docTypesToSeed as $i => $dt) {
                    $isMultiYear = in_array($dt, ['renstra', 'iku']);
                    $docYear = $isMultiYear ? '2025-2029' : '2026';
                    $slug = strtolower(preg_replace('/[^a-zA-Z0-9]+/', '_', 'doc_' . $code . '_' . $dt . '_26'));
                    $relPath = "planning/documents/{$slug}.pdf";

                    $filePath = $this->createSamplePdf(
                        $relPath,
                        'Dokumen ' . strtoupper($dt) . ' ' . $opd->name . ' 2026',
                        $opd->name,
                        strtoupper($dt),
                        $docYear,
                        [
                            'Nomor Dokumen'    => ($i + 1) . '/' . $code . '/2026',
                            'Perangkat Daerah' => $opd->name,
                            'Jenis Dokumen'    => strtoupper($dt),
                            'Tahun Anggaran'   => $docYear,
                            'Status Legalitas' => 'Approved (Resmi)',
                            'Tanggal Penetapan'=> now()->subDays(15)->format('d F Y'),
                        ]
                    );

                    PlanningDocument::updateOrCreate(
                        ['organization_id' => $opd->id, 'type' => $dt, 'year' => 2026],
                        [
                            'code'                  => 'DOC-' . $code . '-' . strtoupper($dt) . '-26',
                            'document_number'       => ($i + 1) . '/' . $code . '/2026',
                            'title'                 => 'Dokumen ' . strtoupper($dt) . ' ' . $opd->name . ' 2026',
                            'periode_type'          => $isMultiYear ? 'lima_tahunan' : 'tahunan',
                            'start_year'            => $isMultiYear ? 2025 : null,
                            'end_year'              => $isMultiYear ? 2029 : null,
                            'file_path'             => $filePath,
                            'status'                => 'approved',
                            'performance_period_id' => $perfPeriod2026->id,
                            'created_by'            => $adminId,
                            'approved_by'           => $adminId,
                            'approved_at'           => now()->subDays(15),
                        ]
                    );
                }
            }

            // ── 5. Sasaran Strategis RPJMD (10 sasaran simulasi) ──────────────────
            $goal = StrategicGoal::firstOrCreate(
                ['code' => 'TUJ-PEMDA-01'],
                [
                    'planning_period_id' => $period->id,
                    'organization_id'    => $provinsi->id,
                    'name'               => 'Meningkatkan Kesejahteraan dan Kualitas SDM Papua Barat',
                    'status'             => 'active',
                ]
            );

            $sasaranNames = [
                'Meningkatnya Akses dan Kualitas Pendidikan Menengah dan Vokasi',
                'Meningkatnya Derajat Kesehatan Masyarakat dan Pencegahan Stunting',
                'Menurunnya Angka Kemiskinan dan Kemiskinan Ekstrem Daerah',
                'Meningkatnya Konektivitas dan Kemantapan Infrastruktur Wilayah',
                'Meningkatnya Daya Saing Usaha Mikro, Kecil, Menengah dan Koperasi',
                'Meningkatnya Kualitas Tata Kelola Pemerintahan dan Reformasi Birokrasi',
                'Meningkatnya Kualitas Akuntabilitas Kinerja dan Pengawasan Internal',
                'Meningkatnya Keterbukaan Informasi Publik dan Layanan Digital',
                'Meningkatnya Kualitas Ketenteraman, Ketertiban Umum, dan Perlindungan Warga',
                'Meningkatnya Investasi dan Kemudahan Perizinan Berusaha',
                'Meningkatnya Kualitas Pengelolaan Lingkungan Hidup dan Sumber Daya Alam',
                'Meningkatnya Ketersediaan dan Keterjangkauan Pangan Daerah',
                'Meningkatnya Kesetaraan Gender dan Perlindungan Hak Perempuan dan Anak',
                'Meningkatnya Akuntabilitas Pengelolaan Keuangan dan Aset Daerah',
                'Meningkatnya Efektivitas Manajemen ASN dan Kelembagaan Perangkat Daerah',
                'Meningkatnya Pembangunan Karakter Pemuda dan Prestasi Olahraga',
                'Meningkatnya Pelestarian Warisan Budaya dan Seni Lokal Daerah',
                'Meningkatnya Keselarasan Tata Ruang dan Perencanaan Berbasis Spasial',
            ];

            $sasaranList = [];
            foreach ($sasaranNames as $i => $sName) {
                $sasaranList[] = StrategicObjective::updateOrCreate(
                    ['code' => 'SAS-PEMDA-' . str_pad($i + 1, 2, '0', STR_PAD_LEFT)],
                    ['strategic_goal_id' => $goal->id, 'name' => $sName, 'status' => 'active']
                );
            }

            // ── 6. Indikator Kinerja, Target 5 Tahun & Realisasi Dinamis (35 Indikator) ─
            $indicatorSpecs = [
                // ── 20 Indikator Tercapai (>= 100%) ────────────────────────────────────
                ['code' => 'IND-BAPP-01', 'name' => 'Persentase Keselarasan Dokumen Perencanaan RKPD-RPJMD', 'opd' => 'BAPPEDA-PB',  'target' => 90.0, 'real' => 91.0, 'real_2025' => 88.0, 'pol' => 'positif', 'is_iku' => true,  'level' => 'pemda',            'sasaran_idx' => 17],
                ['code' => 'IND-BAPP-02', 'name' => 'Indeks Kualitas Perencanaan Pembangunan Daerah',         'opd' => 'BAPPEDA-PB',  'target' => 85.0, 'real' => 86.0, 'real_2025' => 83.5, 'pol' => 'positif', 'is_iku' => false, 'level' => 'perangkat_daerah', 'sasaran_idx' => 17],
                ['code' => 'IND-INSP-01', 'name' => 'Persentase Tindak Lanjut Rekomendasi Hasil Pemeriksaan', 'opd' => 'INSP-PB',     'target' => 85.0, 'real' => 86.0, 'real_2025' => 82.0, 'pol' => 'positif', 'is_iku' => true,  'level' => 'pemda',            'sasaran_idx' => 6],
                ['code' => 'IND-INSP-02', 'name' => 'Tingkat Maturitas SPIP Pemerintah Provinsi',             'opd' => 'INSP-PB',     'target' => 3.50, 'real' => 3.54, 'real_2025' => 3.40, 'pol' => 'positif', 'is_iku' => false, 'level' => 'perangkat_daerah', 'sasaran_idx' => 6],
                ['code' => 'IND-KOMI-01', 'name' => 'Indeks Sistem Pemerintahan Berbasis Elektronik (SPBE)',  'opd' => 'KOMINFO-PB',  'target' => 3.20, 'real' => 3.25, 'real_2025' => 3.10, 'pol' => 'positif', 'is_iku' => true,  'level' => 'pemda',            'sasaran_idx' => 7],
                ['code' => 'IND-KOMI-02', 'name' => 'Persentase Wilayah Terjangkau Akses Internet',          'opd' => 'KOMINFO-PB',  'target' => 80.0, 'real' => 81.0, 'real_2025' => 77.0, 'pol' => 'positif', 'is_iku' => false, 'level' => 'perangkat_daerah', 'sasaran_idx' => 7],
                ['code' => 'IND-DPMP-01', 'name' => 'Nilai Realisasi Investasi Daerah (Triliun Rupiah)',      'opd' => 'DPMPTSP-PB',  'target' => 5.0,  'real' => 5.10, 'real_2025' => 4.80, 'pol' => 'positif', 'is_iku' => false, 'level' => 'perangkat_daerah', 'sasaran_idx' => 9],
                ['code' => 'IND-DPMP-02', 'name' => 'Persentase Izin Usaha Terbit Tepat Waktu',              'opd' => 'DPMPTSP-PB',  'target' => 90.0, 'real' => 91.0, 'real_2025' => 87.0, 'pol' => 'positif', 'is_iku' => true,  'level' => 'pemda',            'sasaran_idx' => 9],
                ['code' => 'IND-BORG-01', 'name' => 'Indeks Reformasi Birokrasi Pemerintah Daerah',          'opd' => 'BIRO-ORG-PB', 'target' => 70.0, 'real' => 71.0, 'real_2025' => 68.0, 'pol' => 'positif', 'is_iku' => true,  'level' => 'pemda',            'sasaran_idx' => 5],
                ['code' => 'IND-BORG-02', 'name' => 'Tingkat Efektivitas Kelembagaan Perangkat Daerah',      'opd' => 'BIRO-ORG-PB', 'target' => 85.0, 'real' => 86.0, 'real_2025' => 83.0, 'pol' => 'positif', 'is_iku' => false, 'level' => 'perangkat_daerah', 'sasaran_idx' => 14],
                ['code' => 'IND-BAPP-03', 'name' => 'Indeks Pembangunan Manusia (IPM)',                       'opd' => 'BAPPEDA-PB',  'target' => 71.50,'real' => 72.10,'real_2025' => 70.80,'pol' => 'positif', 'is_iku' => true,  'level' => 'pemda',            'sasaran_idx' => 0],
                ['code' => 'IND-BAPP-04', 'name' => 'Laju Pertumbuhan Ekonomi Non-Migas Daerah',             'opd' => 'BAPPEDA-PB',  'target' => 4.50, 'real' => 4.60, 'real_2025' => 4.20, 'pol' => 'positif', 'is_iku' => true,  'level' => 'pemda',            'sasaran_idx' => 2],
                ['code' => 'IND-DISD-03', 'name' => 'Persentase Guru Menengah Bersertifikasi Pendidik',       'opd' => 'DISDIK-PB',   'target' => 80.0, 'real' => 81.0, 'real_2025' => 78.0, 'pol' => 'positif', 'is_iku' => false, 'level' => 'perangkat_daerah', 'sasaran_idx' => 0],
                ['code' => 'IND-DINK-03', 'name' => 'Cakupan Fasilitas Kesehatan Berstandar Akreditasi',      'opd' => 'DINKES-PB',   'target' => 85.0, 'real' => 86.0, 'real_2025' => 82.0, 'pol' => 'positif', 'is_iku' => false, 'level' => 'perangkat_daerah', 'sasaran_idx' => 1],
                ['code' => 'IND-PUPR-03', 'name' => 'Rasio Konektivitas Antar Pusat Kegiatan Wilayah',        'opd' => 'PUPR-PB',     'target' => 75.0, 'real' => 76.0, 'real_2025' => 72.0, 'pol' => 'positif', 'is_iku' => false, 'level' => 'perangkat_daerah', 'sasaran_idx' => 3],
                ['code' => 'IND-DISH-02', 'name' => 'Indeks Kepuasan Pengguna Transportasi Daerah',          'opd' => 'DISHUB-PB',   'target' => 80.0, 'real' => 81.0, 'real_2025' => 77.0, 'pol' => 'positif', 'is_iku' => false, 'level' => 'perangkat_daerah', 'sasaran_idx' => 3],
                ['code' => 'IND-KOPR-02', 'name' => 'Persentase Pertumbuhan Volume Usaha Koperasi Binaan',    'opd' => 'DISKOP-PB',   'target' => 6.0,  'real' => 6.10, 'real_2025' => 5.80, 'pol' => 'positif', 'is_iku' => false, 'level' => 'perangkat_daerah', 'sasaran_idx' => 4],
                ['code' => 'IND-DINS-02', 'name' => 'Cakupan Bantuan Sosial Tepat Sasaran',                  'opd' => 'DINSOS-PB',   'target' => 92.0, 'real' => 93.0, 'real_2025' => 90.0, 'pol' => 'positif', 'is_iku' => false, 'level' => 'perangkat_daerah', 'sasaran_idx' => 2],
                ['code' => 'IND-SATP-02', 'name' => 'Persentase Penyelesaian Gangguan Trantibum',              'opd' => 'SATPOL-PB',   'target' => 88.0, 'real' => 89.0, 'real_2025' => 85.0, 'pol' => 'positif', 'is_iku' => false, 'level' => 'perangkat_daerah', 'sasaran_idx' => 8],
                ['code' => 'IND-DINK-04', 'name' => 'Angka Kematian Ibu (AKI) per 100.000 KH',                'opd' => 'DINKES-PB',   'target' => 180.0,'real' => 177.0,'real_2025' => 182.0,'pol' => 'negatif', 'is_iku' => true,  'level' => 'pemda',            'sasaran_idx' => 1],

                // ── 15 Indikator Perlu Perhatian (< 100%) ──────────────────────────────
                ['code' => 'IND-DISD-01', 'name' => 'Angka Partisipasi Kasar (APK) SMA/SMK',                 'opd' => 'DISDIK-PB',   'target' => 86.0, 'real' => 76.5, 'real_2025' => 74.0, 'pol' => 'positif', 'is_iku' => true,  'level' => 'pemda',            'sasaran_idx' => 0],
                ['code' => 'IND-DISD-02', 'name' => 'Persentase Kelulusan Siswa Berstandar Kompetensi',       'opd' => 'DISDIK-PB',   'target' => 90.0, 'real' => 80.0, 'real_2025' => 78.0, 'pol' => 'positif', 'is_iku' => false, 'level' => 'perangkat_daerah', 'sasaran_idx' => 0],
                ['code' => 'IND-DINK-01', 'name' => 'Prevalensi Stunting Balita',                             'opd' => 'DINKES-PB',   'target' => 15.0, 'real' => 16.7, 'real_2025' => 17.5, 'pol' => 'negatif', 'is_iku' => true,  'level' => 'pemda',            'sasaran_idx' => 1],
                ['code' => 'IND-DINK-02', 'name' => 'Cakupan Pelayanan Imunisasi Dasar Lengkap',              'opd' => 'DINKES-PB',   'target' => 92.0, 'real' => 82.0, 'real_2025' => 80.0, 'pol' => 'positif', 'is_iku' => false, 'level' => 'perangkat_daerah', 'sasaran_idx' => 1],
                ['code' => 'IND-PUPR-01', 'name' => 'Persentase Kemantapan Jalan Provinsi',                   'opd' => 'PUPR-PB',     'target' => 78.5, 'real' => 69.5, 'real_2025' => 67.0, 'pol' => 'positif', 'is_iku' => true,  'level' => 'pemda',            'sasaran_idx' => 3],
                ['code' => 'IND-PUPR-02', 'name' => 'Persentase Rumah Tangga Bersanitasi Layak',              'opd' => 'PUPR-PB',     'target' => 82.0, 'real' => 73.0, 'real_2025' => 71.0, 'pol' => 'positif', 'is_iku' => false, 'level' => 'perangkat_daerah', 'sasaran_idx' => 3],
                ['code' => 'IND-DISH-01', 'name' => 'Persentase Kelayakan Sarana Angkutan Perhubungan',      'opd' => 'DISHUB-PB',   'target' => 85.0, 'real' => 75.0, 'real_2025' => 73.0, 'pol' => 'positif', 'is_iku' => false, 'level' => 'perangkat_daerah', 'sasaran_idx' => 3],
                ['code' => 'IND-DINS-01', 'name' => 'Persentase Pemerlu Pelayanan Kesejahteraan Sosial Tertangani', 'opd' => 'DINSOS-PB', 'target' => 88.0, 'real' => 77.0, 'real_2025' => 74.0, 'pol' => 'positif', 'is_iku' => false, 'level' => 'perangkat_daerah', 'sasaran_idx' => 2],
                ['code' => 'IND-KOPR-01', 'name' => 'Persentase Koperasi Aktif dan Sehat',                   'opd' => 'DISKOP-PB',   'target' => 75.0, 'real' => 66.0, 'real_2025' => 64.0, 'pol' => 'positif', 'is_iku' => false, 'level' => 'perangkat_daerah', 'sasaran_idx' => 4],
                ['code' => 'IND-SATP-01', 'name' => 'Tingkat Kepatuhan Penegakan Perda dan Perkada',         'opd' => 'SATPOL-PB',   'target' => 85.0, 'real' => 75.0, 'real_2025' => 72.0, 'pol' => 'positif', 'is_iku' => false, 'level' => 'perangkat_daerah', 'sasaran_idx' => 8],
                ['code' => 'IND-BAPP-05', 'name' => 'Persentase Penduduk Miskin Daerah',                      'opd' => 'BAPPEDA-PB',  'target' => 20.0, 'real' => 25.0, 'real_2025' => 26.0, 'pol' => 'negatif', 'is_iku' => true,  'level' => 'pemda',            'sasaran_idx' => 2],
                ['code' => 'IND-BORG-03', 'name' => 'Nilai Evaluasi Akuntabilitas Kinerja Pemda (SAKIP)',     'opd' => 'BIRO-ORG-PB', 'target' => 75.0, 'real' => 86.0, 'real_2025' => 86.0, 'pol' => 'positif', 'is_iku' => true,  'level' => 'pemda',            'sasaran_idx' => 6],
                ['code' => 'IND-DISD-04', 'name' => 'Rata-rata Lama Sekolah Penduduk',                        'opd' => 'DISDIK-PB',   'target' => 85.0, 'real' => 79.0, 'real_2025' => 76.0, 'pol' => 'positif', 'is_iku' => true,  'level' => 'pemda',            'sasaran_idx' => 0],
                ['code' => 'IND-DINK-05', 'name' => 'Rasio Tenaga Medis per 10.000 Penduduk',                 'opd' => 'DINKES-PB',   'target' => 12.0, 'real' => 8.40, 'real_2025' => 8.00, 'pol' => 'positif', 'is_iku' => false, 'level' => 'perangkat_daerah', 'sasaran_idx' => 1],
                ['code' => 'IND-PUPR-04', 'name' => 'Persentase Irigasi Kewenangan Provinsi Kondisi Baik',   'opd' => 'PUPR-PB',     'target' => 70.0, 'real' => 49.0, 'real_2025' => 47.0, 'pol' => 'positif', 'is_iku' => false, 'level' => 'perangkat_daerah', 'sasaran_idx' => 3],
            ];

            foreach ($indicatorSpecs as $spec) {
                $ownerOpd = $seededOpds[$spec['opd']] ?? null;
                $assignedSasaran = $sasaranList[$spec['sasaran_idx'] ?? 0] ?? $sasaranList[0];

                $ind = Indicator::updateOrCreate(
                    ['code' => $spec['code']],
                    [
                        'name'                  => $spec['name'],
                        'is_iku'                => $spec['is_iku'],
                        'level'                 => $spec['level'],
                        'planning_period_id'    => $period->id,
                        'owner_organization_id' => $ownerOpd?->id,
                        'strategic_goal_id'     => $goal->id,
                        'strategic_objective_id'=> $assignedSasaran->id,
                        'measurement_unit_id'   => $unitPersen->id,
                        'polarization'          => $spec['pol'],
                        'frequency'             => 'quarterly',
                        'iku_status'            => 'final',
                        'status'                => 'active',
                    ]
                );

                $ver = IndicatorVersion::updateOrCreate(
                    ['indicator_id' => $ind->id, 'version_number' => 1],
                    [
                        'name'                => $ind->name,
                        'definition'          => $ind->name,
                        'frequency'           => 'quarterly',
                        'measurement_unit_id' => $unitPersen->id,
                    ]
                );

                if (!$ind->current_version_id) {
                    $ind->update(['current_version_id' => $ver->id]);
                }

                // Target 2025 s/d 2029
                foreach ([2025, 2026, 2027, 2028, 2029] as $yr) {
                    $multiplier = match ($yr) {
                        2025 => 0.96,
                        2026 => 1.00,
                        2027 => 1.04,
                        2028 => 1.08,
                        2029 => 1.12,
                    };
                    $targetYearVal = round($spec['target'] * $multiplier, 2);

                    IndicatorTarget::updateOrCreate(
                        [
                            'indicator_version_id' => $ver->id,
                            'organization_id'      => $ownerOpd?->id ?? $provinsi->id,
                            'planning_period_id'   => $period->id,
                            'year'                 => $yr,
                        ],
                        [
                            'target_value' => $targetYearVal,
                            'status'       => 'approved',
                        ]
                    );
                }

                // Realisasi Tahunan 2025
                if (isset($twPeriods['TA-2025'])) {
                    Realization::updateOrCreate(
                        [
                            'indicator_version_id'  => $ver->id,
                            'organization_id'       => $ownerOpd?->id ?? $provinsi->id,
                            'measurement_period_id' => $twPeriods['TA-2025']->id,
                        ],
                        [
                            'planning_period_id' => $period->id,
                            'value'              => $spec['real_2025'] ?? round($spec['real'] * 0.96, 2),
                            'status'             => 'approved',
                            'submitted_by'       => $adminId,
                            'approved_by'        => $adminId,
                            'submitted_at'       => now()->subDays(200),
                            'approved_at'        => now()->subDays(190),
                        ]
                    );
                }

                // Realisasi TW II 2026
                Realization::updateOrCreate(
                    [
                        'indicator_version_id'  => $ver->id,
                        'organization_id'       => $ownerOpd?->id ?? $provinsi->id,
                        'measurement_period_id' => $twPeriods['TW2-2026']->id,
                    ],
                    [
                        'planning_period_id' => $period->id,
                        'value'              => $spec['real'],
                        'status'             => 'approved',
                        'submitted_by'       => $adminId,
                        'approved_by'        => $adminId,
                        'submitted_at'       => now()->subDays(30),
                        'approved_at'        => now()->subDays(25),
                    ]
                );

                // Realisasi TW I 2026
                Realization::updateOrCreate(
                    [
                        'indicator_version_id'  => $ver->id,
                        'organization_id'       => $ownerOpd?->id ?? $provinsi->id,
                        'measurement_period_id' => $twPeriods['TW1-2026']->id,
                    ],
                    [
                        'planning_period_id' => $period->id,
                        'value'              => round($spec['real'] * 0.94, 2),
                        'status'             => 'approved',
                        'submitted_by'       => $adminId,
                        'approved_by'        => $adminId,
                        'submitted_at'       => now()->subDays(90),
                        'approved_at'        => now()->subDays(85),
                    ]
                );
            }

            // ── 7. Evaluasi SAKIP OPD Dinamis (Tabel evaluations & evaluation_scores) ─
            $sakipScoresBaseline = [
                'BAPPEDA-PB'  => ['perencanaan' => 26.5, 'pengukuran' => 26.0, 'pelaporan' => 13.5, 'evaluasi' => 20.5], // 86.50 (A)
                'INSP-PB'     => ['perencanaan' => 25.5, 'pengukuran' => 25.5, 'pelaporan' => 13.0, 'evaluasi' => 20.0], // 84.00 (A)
                'DISDIK-PB'   => ['perencanaan' => 24.5, 'pengukuran' => 25.0, 'pelaporan' => 12.5, 'evaluasi' => 19.5], // 81.50 (A)
                'DINKES-PB'   => ['perencanaan' => 24.0, 'pengukuran' => 24.5, 'pelaporan' => 12.5, 'evaluasi' => 19.5], // 80.50 (A)
                'PUPR-PB'     => ['perencanaan' => 24.0, 'pengukuran' => 24.0, 'pelaporan' => 12.0, 'evaluasi' => 19.0], // 79.00 (BB)
                'KOMINFO-PB'  => ['perencanaan' => 23.5, 'pengukuran' => 24.0, 'pelaporan' => 12.0, 'evaluasi' => 18.5], // 78.00 (BB)
                'DISHUB-PB'   => ['perencanaan' => 23.0, 'pengukuran' => 23.5, 'pelaporan' => 11.5, 'evaluasi' => 18.0], // 76.00 (BB)
                'DINSOS-PB'   => ['perencanaan' => 22.5, 'pengukuran' => 23.0, 'pelaporan' => 11.5, 'evaluasi' => 18.0], // 75.00 (BB)
                'DPMPTSP-PB'  => ['perencanaan' => 22.0, 'pengukuran' => 22.5, 'pelaporan' => 11.0, 'evaluasi' => 17.5], // 73.00 (BB)
                'BIRO-ORG-PB' => ['perencanaan' => 21.5, 'pengukuran' => 22.0, 'pelaporan' => 11.0, 'evaluasi' => 17.0], // 71.50 (BB)
                'DISKOP-PB'   => ['perencanaan' => 20.0, 'pengukuran' => 20.5, 'pelaporan' => 10.0, 'evaluasi' => 15.5], // 66.00 (B)
                'SATPOL-PB'   => ['perencanaan' => 16.0, 'pengukuran' => 16.5, 'pelaporan' => 8.0,  'evaluasi' => 13.0], // 53.50 (CC)
            ];

            foreach ($seededOpds as $code => $opd) {
                $eval = Evaluation::updateOrCreate(
                    ['organization_id' => $opd->id, 'title' => 'Evaluasi SAKIP ' . $opd->name . ' TA 2026'],
                    [
                        'code'               => 'EVAL-' . $code . '-2026',
                        'type'               => 'annual',
                        'planning_period_id' => $period->id,
                        'evaluator_id'       => $adminId,
                        'status'             => 'approved',
                        'started_at'         => now()->subDays(60),
                        'submitted_at'       => now()->subDays(45),
                        'approved_by'        => $adminId,
                        'approved_at'        => now()->subDays(40),
                    ]
                );

                $scores = $sakipScoresBaseline[$code] ?? ['perencanaan' => 22.0, 'pengukuran' => 22.0, 'pelaporan' => 11.0, 'evaluasi' => 17.0];

                $components = [
                    ['component' => 'Perencanaan Kinerja', 'score' => $scores['perencanaan'], 'max_score' => 30, 'weight' => 0.30],
                    ['component' => 'Pengukuran Kinerja',  'score' => $scores['pengukuran'],  'max_score' => 30, 'weight' => 0.30],
                    ['component' => 'Pelaporan Kinerja',   'score' => $scores['pelaporan'],   'max_score' => 15, 'weight' => 0.15],
                    ['component' => 'Evaluasi Internal',   'score' => $scores['evaluasi'],    'max_score' => 25, 'weight' => 0.25],
                ];

                foreach ($components as $c) {
                    EvaluationScore::updateOrCreate(
                        ['evaluation_id' => $eval->id, 'component' => $c['component']],
                        [
                            'criterion'         => $c['component'],
                            'score'             => $c['score'],
                            'max_score'         => $c['max_score'],
                            'weight'            => $c['weight'],
                            'evaluator_comment' => 'Penilaian sesuai bukti dokumen evaluasi AKIP.',
                        ]
                    );
                }
            }

            // 7B. Evaluasi SAKIP Pemerintah Daerah (Provinsi Papua Barat TA 2026)
            $pemdaOrg = Organization::where('type', 'province')->first() ?? Organization::find(1);
            if ($pemdaOrg) {
                $evalPemda2026 = Evaluation::updateOrCreate(
                    ['organization_id' => $pemdaOrg->id, 'title' => 'Evaluasi SAKIP ' . $pemdaOrg->name . ' TA 2026'],
                    [
                        'code'               => 'EVAL-PEMDA-2026',
                        'type'               => 'annual',
                        'planning_period_id' => $period->id,
                        'evaluator_id'       => $adminId,
                        'status'             => 'approved',
                        'evaluation_status'  => 'Final',
                        'lhe_file_path'      => 'lhe/sample-lhe-2025.pdf',
                        'started_at'         => now()->subDays(60),
                        'submitted_at'       => now()->subDays(45),
                        'approved_by'        => $adminId,
                        'approved_at'        => now()->subDays(40),
                    ]
                );

                $pemdaComponents = [
                    ['component' => 'Perencanaan Kinerja', 'score' => 26.50, 'max_score' => 30, 'weight' => 0.30],
                    ['component' => 'Pengukuran Kinerja',  'score' => 25.50, 'max_score' => 30, 'weight' => 0.30],
                    ['component' => 'Pelaporan Kinerja',   'score' => 13.00, 'max_score' => 15, 'weight' => 0.15],
                    ['component' => 'Evaluasi Internal',   'score' => 21.00, 'max_score' => 25, 'weight' => 0.25],
                ];

                foreach ($pemdaComponents as $c) {
                    EvaluationScore::updateOrCreate(
                        ['evaluation_id' => $evalPemda2026->id, 'component' => $c['component']],
                        [
                            'criterion'         => $c['component'],
                            'score'             => $c['score'],
                            'max_score'         => $c['max_score'],
                            'weight'            => $c['weight'],
                            'evaluator_comment' => 'Penilaian akuntabilitas kinerja instansi pemerintah daerah TA 2026.',
                        ]
                    );
                }
            }

            // ── 8. Rencana Aksi Triwulan Dinamis (Tabel action_plans) ───────────────
            $renaksBaseline = [
                ['opd' => 'BAPPEDA-PB',  'title' => 'Penyusunan Analisis Kinerja RKPD TW II',    'progress' => 93.33, 'status' => 'active'],
                ['opd' => 'DISDIK-PB',   'title' => 'Monitoring Bantuan Operasional Sekolah',   'progress' => 100.0, 'status' => 'completed'],
                ['opd' => 'DINKES-PB',   'title' => 'Distribusi PMT Balita Gizi Kurang',        'progress' => 72.00, 'status' => 'active'],
                ['opd' => 'DISHUB-PB',   'title' => 'Pemeriksaan Rutin Kelaikan Angkutan',      'progress' => 62.50, 'status' => 'active'],
                ['opd' => 'PUPR-PB',     'title' => 'Pemeliharaan Rutin Ruas Jalan Provinsi',   'progress' => 96.67, 'status' => 'active'],
                ['opd' => 'KOMINFO-PB',  'title' => 'Peningkatan Infrastruktur Jaringan SPBE', 'progress' => 100.0, 'status' => 'completed'],
                ['opd' => 'INSP-PB',     'title' => 'Audit Kepatuhan Pelaksanaan Renja OPD',    'progress' => 98.00, 'status' => 'completed'],
                ['opd' => 'DINSOS-PB',   'title' => 'Penyaluran Bantuan Sosial Terintegrasi',   'progress' => 88.50, 'status' => 'active'],
                ['opd' => 'DPMPTSP-PB',  'title' => 'Implementasi Layanan Perizinan OSS RBA',   'progress' => 91.00, 'status' => 'active'],
                ['opd' => 'SATPOL-PB',   'title' => 'Operasi Penertiban Reklame Liar',          'progress' => 45.00, 'status' => 'active'],
                ['opd' => 'DISKOP-PB',   'title' => 'Pelatihan Digitalisasi Manajemen Koperasi','progress' => 68.00, 'status' => 'active'],
                ['opd' => 'BIRO-ORG-PB', 'title' => 'Evaluasi Kelembagaan dan Anjab ABK',       'progress' => 90.00, 'status' => 'active'],
            ];

            $perfPeriod = \App\Models\PerformancePeriod::where('year', 2026)->first() ?? \App\Models\PerformancePeriod::first();

            foreach ($renaksBaseline as $i => $item) {
                $opd = $seededOpds[$item['opd']] ?? null;
                if (!$opd) continue;

                ActionPlan::updateOrCreate(
                    ['code' => 'RENAKS-' . $item['opd'] . '-TW2-26'],
                    [
                        'title'                  => $item['title'],
                        'activity'               => $item['title'],
                        'description'            => 'Rencana aksi prioritas Triwulan II Tahun 2026.',
                        'organization_id'        => $opd->id,
                        'planning_period_id'     => $period->id,
                        'performance_period_id'  => $perfPeriod?->id,
                        'strategic_objective_id' => $sasaranList[0]->id,
                        'start_date'             => '2026-04-01',
                        'end_date'               => '2026-06-30',
                        'progress'               => $item['progress'],
                        'status'                 => $item['status'],
                    ]
                );

                // ── 9. Monitoring Kinerja Fisik / Output Triwulan (Menu 4.4 & Baris 5) ──
                MonitoringActionPlanOutput::updateOrCreate(
                    [
                        'organization_id' => $opd->id,
                        'year'            => 2026,
                        'order_no'        => 1,
                    ],
                    [
                        'sasaran_strategis'      => 'Meningkatnya Akuntabilitas Kinerja dan Kualitas Pelayanan Publik Perangkat Daerah',
                        'indikator_sasaran'      => 'Indeks Reformasi Birokrasi dan SAKIP OPD',
                        'target_sasaran_tahunan' => 100.00,
                        'program'                => 'Program Penyelenggaraan Kinerja dan Urusan Perangkat Daerah',
                        'kegiatan'               => 'Pelaksanaan Rencana Aksi Prioritas Triwulan',
                        'subkegiatan'            => $item['title'],
                        'indikator_subkegiatan'  => 'Persentase Capaian Pelaksanaan ' . $item['title'],
                        'satuan'                 => '%',
                        'measurement_pattern'    => 'Positif',
                        'target_output_tahunan'  => 100.00,
                        'target_tw1'             => 100.00,
                        'target_tw2'             => 100.00,
                        'target_tw3'             => 100.00,
                        'target_tw4'             => 100.00,
                        'realisasi_tw1'          => min(100.0, round($item['progress'] * 0.95, 2)),
                        'realisasi_tw2'          => $item['progress'],
                        'realisasi_tw3'          => null,
                        'realisasi_tw4'          => null,
                        'person_in_charge'       => 'Sekretaris / Kepala Bidang Pengampu',
                        'created_by'             => $adminId,
                    ]
                );

                // ── 10. Monitoring Kinerja Anggaran / Serapan Triwulan (Menu 4.4 & Baris 5) ──
                $paguTw2 = 1500000000.0;
                $realisasiTw2 = round($paguTw2 * ($item['progress'] / 100), 2);
                MonitoringActionPlanBudget::updateOrCreate(
                    [
                        'organization_id' => $opd->id,
                        'year'            => 2026,
                        'order_no'        => 1,
                    ],
                    [
                        'sasaran_strategis'      => 'Meningkatnya Efisiensi dan Efektivitas Pengelolaan Keuangan Daerah',
                        'indikator_sasaran'      => 'Persentase Realisasi Anggaran Belanja Daerah',
                        'target_sasaran_tahunan' => 100.00,
                        'program'                => 'Program Penyelenggaraan Kinerja dan Urusan Perangkat Daerah',
                        'kegiatan'               => 'Pelaksanaan Rencana Aksi Prioritas Triwulan',
                        'subkegiatan'            => 'Anggaran ' . $item['title'],
                        'indikator_subkegiatan'  => 'Serapan Anggaran Belanja Subkegiatan',
                        'satuan'                 => 'Rupiah',
                        'pagu_tahunan'           => $paguTw2 * 4,
                        'pagu_tw1'               => $paguTw2,
                        'pagu_tw2'               => $paguTw2,
                        'pagu_tw3'               => $paguTw2,
                        'pagu_tw4'               => $paguTw2,
                        'realisasi_tw1'          => round($paguTw2 * 0.85, 2),
                        'realisasi_tw2'          => $realisasiTw2,
                        'realisasi_tw3'          => null,
                        'realisasi_tw4'          => null,
                        'penanggung_jawab_utama' => 'Bendahara Pengeluaran / PPK',
                        'pengampu_teknis'        => 'Kasubag Keuangan',
                        'created_by'             => $adminId,
                    ]
                );
            }
        });

        $this->command?->info('=== Seeder Komprehensif SAKIP Berhasil Disimpan! ===');
    }

    /**
     * Buat file PDF resmi untuk demo dan simpan ke disk local dan public.
     */
    private function createSamplePdf(string $path, string $title, string $opdName, string $docType, string $year, array $details = []): string
    {
        $detailRows = '';
        foreach ($details as $k => $v) {
            $detailRows .= "<tr><td style='padding:6px 10px;font-weight:bold;width:35%;border:1px solid #cbd5e1;background:#f8fafc;'>{$k}</td><td style='padding:6px 10px;border:1px solid #cbd5e1;'>{$v}</td></tr>";
        }

        $html = <<<HTML
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>{$title}</title>
<style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 30px; color: #1e293b; line-height: 1.5; font-size: 13px; }
    .header { text-align: center; border-bottom: 3px double #0f172a; padding-bottom: 12px; margin-bottom: 25px; }
    .header h2 { margin: 0; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; color: #0f172a; }
    .header h3 { margin: 4px 0; font-size: 14px; font-weight: bold; color: #334155; }
    .header p { margin: 0; font-size: 11px; color: #64748b; }
    .title-box { background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 15px; margin-bottom: 25px; text-align: center; }
    .title-box h1 { margin: 0 0 6px 0; font-size: 18px; color: #0284c7; }
    .title-box p { margin: 0; font-size: 12px; color: #475569; }
    .section-title { font-size: 14px; font-weight: bold; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin: 20px 0 10px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
    .footer { margin-top: 50px; }
    .signature { float: right; width: 260px; text-align: center; }
    .qr-box { float: left; width: 240px; font-size: 10px; color: #64748b; border: 1px solid #e2e8f0; padding: 10px; border-radius: 4px; line-height: 1.4; }
</style>
</head>
<body>
    <div class="header">
        <h2>Pemerintah Provinsi Papua Barat</h2>
        <h3>{$opdName}</h3>
        <p>Jl. Abraham Atururi, Kompleks Perkantoran Gubernur, Arfai - Manokwari, Papua Barat</p>
    </div>

    <div class="title-box">
        <h1>{$title}</h1>
        <p>Tahun Anggaran / Periode: {$year} &bull; Klasifikasi: {$docType}</p>
    </div>

    <div class="section-title">A. INFORMASI DOKUMEN</div>
    <table>
        <tbody>
            {$detailRows}
        </tbody>
    </table>

    <div class="section-title" style="margin-top: 25px;">B. RINGKASAN & PERNYATAAN KINERJA</div>
    <p style="text-align: justify; font-size: 12px; color: #334155;">
        Dokumen ini disusun sebagai wujud komitmen dan akuntabilitas kinerja instansi pemerintah dalam rangka penerapan Sistem Akuntabilitas Kinerja Instansi Pemerintah (SAKIP) terintegrasi pada Pemerintah Provinsi Papua Barat melalui aplikasi e-KASUARI. Seluruh target dan indikator yang tertuang telah diselaraskan dengan RPJMD Provinsi Papua Barat.
    </p>

    <div class="footer">
        <div class="qr-box">
            <strong>DOKUMEN RESMI TERVERIFIKASI</strong><br>
            Sistem Informasi e-KASUARI Papua Barat<br>
            Kode Dokumen: #DEMO-{$year}-{$docType}<br>
            Status Validasi: Sah & Terdaftar Digital
        </div>

        <div class="signature">
            <p style="margin: 0 0 50px 0;">Manokwari, {$year}<br><strong>Kepala Daerah / Pejabat Berwenang</strong></p>
            <p style="margin: 0; text-decoration: underline; font-weight: bold;">Gubernur Papua Barat</p>
            <p style="margin: 0; font-size: 11px; color: #64748b;">Pemerintah Provinsi Papua Barat</p>
        </div>
        <div style="clear: both;"></div>
    </div>
</body>
</html>
HTML;

        try {
            $pdf = Pdf::loadHTML($html);
            $content = $pdf->output();

            Storage::disk('local')->put($path, $content);
            Storage::disk('public')->put($path, $content);
        } catch (\Throwable $e) {
            $fallback = "DEMO DOKUMEN: {$title}\n{$opdName}\nTahun: {$year}\nKlasifikasi: {$docType}\n";
            Storage::disk('local')->put($path, $fallback);
            Storage::disk('public')->put($path, $fallback);
        }

        return $path;
    }
}
