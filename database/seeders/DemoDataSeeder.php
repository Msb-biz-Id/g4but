<?php

namespace Database\Seeders;

use App\Models\Agreement;
use App\Models\AiPromptTemplate;
use App\Models\Alert;
use App\Models\AlertRule;
use App\Models\AppConfig;
use App\Models\AppNotification;
use App\Models\Indicator;
use App\Models\KnowledgeDocument;
use App\Models\MeasurementPeriod;
use App\Models\Organization;
use App\Models\PerformancePeriod;
use App\Models\PlanningDocument;
use App\Models\PlanningPeriod;
use App\Models\PlanningTree;
use App\Models\User;
use App\Models\WhatsappIdentity;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('=== DemoDataSeeder: Menyiapkan data uji coba ===');

        // ── A. PERBAIKI 4 OPD PILOT PROJECT ──────────────────────────────────
        $this->command->info('A. Menyiapkan OPD Pilot...');

        $provinsi = Organization::updateOrCreate(
            ['code' => 'PROV-PAPBAR'],
            ['name' => 'Pemerintah Provinsi Papua Barat', 'type' => 'province', 'address' => 'Jl. Abraham Atururi, Arfai, Manokwari', 'is_active' => true]
        );

        $bappeda = Organization::updateOrCreate(
            ['code' => 'BAPPEDA-PB'],
            ['name' => 'Badan Perencanaan Pembangunan Daerah Papua Barat', 'type' => 'opd', 'parent_id' => $provinsi->id, 'address' => 'Jl. Brigjen Marinir (Purn) Abraham O. Atururi, Arfai, Manokwari', 'is_active' => true]
        );

        $inspektorat = Organization::updateOrCreate(
            ['code' => 'INSP-PB'],
            ['name' => 'Inspektorat Daerah Provinsi Papua Barat', 'type' => 'inspektorat', 'parent_id' => $provinsi->id, 'address' => 'Kompleks Kantor Gubernur Papua Barat, Arfai, Manokwari', 'is_active' => true]
        );

        $koperasi = Organization::updateOrCreate(
            ['code' => 'DISKOP-PB'],
            ['name' => 'Dinas Koperasi dan UKM Provinsi Papua Barat', 'type' => 'opd', 'parent_id' => $provinsi->id, 'address' => 'Kompleks Perkantoran Gubernur Papua Barat, Arfai, Manokwari', 'is_active' => true]
        );

        $pupr = Organization::updateOrCreate(
            ['code' => 'PUPR-PB'],
            ['name' => 'Dinas Pekerjaan Umum dan Penataan Ruang Provinsi Papua Barat', 'type' => 'opd', 'parent_id' => $provinsi->id, 'address' => 'Jl. Trikora, Wosi, Manokwari, Papua Barat', 'is_active' => true]
        );

        $this->command->info('   OK 5 Organisasi siap (Provinsi + 4 OPD Pilot)');
        $pilotOrgs = [$bappeda, $inspektorat, $koperasi, $pupr];

        // ── B. BUAT PERIODE AKTIF (PerformancePeriod & PlanningPeriod) ───────
        $this->command->info('B. Membuat Periode aktif...');

        $periodeTagungan = PerformancePeriod::updateOrCreate(
            ['year' => 2026, 'name' => 'Tahunan 2026'],
            ['status' => 'open', 'start_date' => '2026-01-01', 'end_date' => '2026-12-31', 'description' => 'Periode Tahunan TA 2026']
        );

        $periode5Tahunan = PerformancePeriod::updateOrCreate(
            ['year' => 2025, 'name' => 'Lima Tahunan 2025-2029'],
            ['status' => 'open', 'start_date' => '2025-01-01', 'end_date' => '2029-12-31', 'description' => 'Periode Renstra 5 Tahunan 2025-2029']
        );

        // PlanningPeriod untuk modul Master Data -> Periode (Periods/Index.tsx)
        $pp2026 = PlanningPeriod::updateOrCreate(
            ['code' => 'TA-2026'],
            [
                'name'       => 'Periode Kinerja Tahunan 2026',
                'year'       => 2026,
                'type'       => 'annual',
                'start_date' => '2026-01-01',
                'end_date'   => '2026-12-31',
                'status'     => 'active',
            ]
        );

        $ppRpjmd = PlanningPeriod::updateOrCreate(
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

        // Sub-periode pengukuran (Triwulan I - IV) pada TA 2026
        $subPeriods = [
            ['code' => 'TW1-2026', 'name' => 'Triwulan I 2026', 'type' => 'quarterly', 'start_date' => '2026-01-01', 'end_date' => '2026-03-31', 'submission_deadline' => '2026-04-15', 'status' => 'closed'],
            ['code' => 'TW2-2026', 'name' => 'Triwulan II 2026', 'type' => 'quarterly', 'start_date' => '2026-04-01', 'end_date' => '2026-06-30', 'submission_deadline' => '2026-07-15', 'status' => 'closed'],
            ['code' => 'TW3-2026', 'name' => 'Triwulan III 2026', 'type' => 'quarterly', 'start_date' => '2026-07-01', 'end_date' => '2026-09-30', 'submission_deadline' => '2026-10-15', 'status' => 'open'],
            ['code' => 'TW4-2026', 'name' => 'Triwulan IV 2026', 'type' => 'quarterly', 'start_date' => '2026-10-01', 'end_date' => '2026-12-31', 'submission_deadline' => '2027-01-15', 'status' => 'open'],
        ];

        foreach ($subPeriods as $sp) {
            MeasurementPeriod::updateOrCreate(
                ['code' => $sp['code']],
                array_merge($sp, ['planning_period_id' => $pp2026->id])
            );
        }

        $this->command->info('   OK Periode Tahunan 2026 & RPJMD 2025-2029 (PlanningPeriod)');
        $this->command->info('   OK 4 Sub-Periode Pengukuran (Triwulan I - IV)');

        // ── C. SEED DEMO PLANNING DOCUMENTS ──────────────────────────────────
        $this->command->info('C. Membuat demo Dokumen Perencanaan...');

        $admin = User::where('email', 'admin@ekasuari.test')->first();
        $pimpinan = User::where('email', 'pimpinan@ekasuari.test')->first();
        $adminOpd = User::where('email', 'admin.opd@ekasuari.test')->first();
        $adminId = $admin?->id ?? 1;

        $docDefs = [
            'BAPPEDA-PB' => [
                ['type' => 'rpjmd',   'periode_type' => 'lima_tahunan', 'code' => 'DOC-BAPP-RPJMD-25', 'num' => '050/001/BAPPEDA/2025', 'title' => 'RPJMD Provinsi Papua Barat 2025-2029',       'period' => $periode5Tahunan, 'year' => 2025, 'status' => 'approved', 'has_file' => true],
                ['type' => 'renstra', 'periode_type' => 'lima_tahunan', 'code' => 'DOC-BAPP-RENSTRA-25', 'num' => '050/002/BAPPEDA/2025', 'title' => 'Renstra Bappeda Papua Barat 2025-2029',       'period' => $periode5Tahunan, 'year' => 2025, 'status' => 'approved', 'has_file' => true],
                ['type' => 'renja',   'periode_type' => 'tahunan',      'code' => 'DOC-BAPP-RENJA-26',   'num' => '050/010/BAPPEDA/2026', 'title' => 'Renja Bappeda Papua Barat Tahun 2026',        'period' => $periodeTagungan, 'year' => 2026, 'status' => 'approved', 'has_file' => true],
                ['type' => 'pk',      'periode_type' => 'tahunan',      'code' => 'DOC-BAPP-PK-26',      'num' => '050/012/BAPPEDA/2026', 'title' => 'Perjanjian Kinerja Bappeda 2026',             'period' => $periodeTagungan, 'year' => 2026, 'status' => 'approved', 'has_file' => true],
                ['type' => 'iku',     'periode_type' => 'lima_tahunan', 'code' => 'DOC-BAPP-IKU-25',     'num' => '050/003/BAPPEDA/2025', 'title' => 'Indikator Kinerja Utama (IKU) Pemprov PB 2025', 'period' => $periode5Tahunan, 'year' => 2025, 'status' => 'approved', 'has_file' => true],
                ['type' => 'lkjip',   'periode_type' => 'tahunan',      'code' => 'DOC-BAPP-LKJIP-25',   'num' => '050/099/BAPPEDA/2025', 'title' => 'Laporan Kinerja (LKjIP) Bappeda TA 2025',     'period' => $periode5Tahunan, 'year' => 2025, 'status' => 'approved', 'has_file' => true],
            ],
            'INSP-PB' => [
                ['type' => 'renstra', 'periode_type' => 'lima_tahunan', 'code' => 'DOC-INSP-RENSTRA-25', 'num' => '700/001/INSP/2025',    'title' => 'Renstra Inspektorat Daerah Papua Barat 2025-2029', 'period' => $periode5Tahunan, 'year' => 2025, 'status' => 'approved', 'has_file' => true],
                ['type' => 'renja',   'periode_type' => 'tahunan',      'code' => 'DOC-INSP-RENJA-26',   'num' => '700/003/INSP/2026',    'title' => 'Renja Inspektorat Papua Barat Tahun 2026',         'period' => $periodeTagungan, 'year' => 2026, 'status' => 'review',   'has_file' => true],
                ['type' => 'pk',      'periode_type' => 'tahunan',      'code' => 'DOC-INSP-PK-26',      'num' => '700/005/INSP/2026',    'title' => 'Perjanjian Kinerja Inspektorat 2026',              'period' => $periodeTagungan, 'year' => 2026, 'status' => 'draft',    'has_file' => true],
                ['type' => 'iku',     'periode_type' => 'lima_tahunan', 'code' => 'DOC-INSP-IKU-25',     'num' => '700/002/INSP/2025',    'title' => 'Indikator Kinerja Utama (IKU) Inspektorat 2025',   'period' => $periode5Tahunan, 'year' => 2025, 'status' => 'approved', 'has_file' => true],
                ['type' => 'lhe',     'periode_type' => 'tahunan',      'code' => 'DOC-INSP-LHE-25',     'num' => '700/088/INSP/2025',    'title' => 'Laporan Hasil Evaluasi (LHE) AKIP 2025',           'period' => $periode5Tahunan, 'year' => 2025, 'status' => 'approved', 'has_file' => true],
            ],
            'DISKOP-PB' => [
                ['type' => 'renstra', 'periode_type' => 'lima_tahunan', 'code' => 'DOC-KOP-RENSTRA-25',  'num' => '518/001/DISKOP/2025',  'title' => 'Renstra Dinas Koperasi & UKM Papua Barat 2025-2029', 'period' => $periode5Tahunan, 'year' => 2025, 'status' => 'locked',   'has_file' => true],
                ['type' => 'renja',   'periode_type' => 'tahunan',      'code' => 'DOC-KOP-RENJA-26',    'num' => '518/010/DISKOP/2026',  'title' => 'Renja Dinas Koperasi & UKM Tahun 2026',              'period' => $periodeTagungan, 'year' => 2026, 'status' => 'approved', 'has_file' => true],
                ['type' => 'pk',      'periode_type' => 'tahunan',      'code' => 'DOC-KOP-PK-26',       'num' => '518/022/DISKOP/2026',  'title' => 'Perjanjian Kinerja Dinas Koperasi & UKM 2026',       'period' => $periodeTagungan, 'year' => 2026, 'status' => 'review',   'has_file' => true],
                ['type' => 'dpa',     'periode_type' => 'tahunan',      'code' => 'DOC-KOP-DPA-26',      'num' => '518/030/DISKOP/2026',  'title' => 'DPA Dinas Koperasi & UKM Tahun 2026',               'period' => $periodeTagungan, 'year' => 2026, 'status' => 'draft',    'has_file' => false],
                ['type' => 'lkjip',   'periode_type' => 'tahunan',      'code' => 'DOC-KOP-LKJIP-25',    'num' => '518/095/DISKOP/2025',  'title' => 'Laporan Kinerja (LKjIP) Dinas Koperasi TA 2025',    'period' => $periode5Tahunan, 'year' => 2025, 'status' => 'approved', 'has_file' => true],
            ],
            'PUPR-PB' => [
                ['type' => 'renstra', 'periode_type' => 'lima_tahunan', 'code' => 'DOC-PUPR-RENSTRA-25', 'num' => '600/001/PUPR/2025',    'title' => 'Renstra Dinas PUPR Papua Barat 2025-2029', 'period' => $periode5Tahunan, 'year' => 2025, 'status' => 'approved', 'has_file' => true],
                ['type' => 'renja',   'periode_type' => 'tahunan',      'code' => 'DOC-PUPR-RENJA-26',   'num' => '600/015/PUPR/2026',    'title' => 'Renja Dinas PUPR Papua Barat Tahun 2026',  'period' => $periodeTagungan, 'year' => 2026, 'status' => 'draft',    'has_file' => true],
                ['type' => 'pk',      'periode_type' => 'tahunan',      'code' => 'DOC-PUPR-PK-26',      'num' => '600/031/PUPR/2026',    'title' => 'Perjanjian Kinerja Dinas PUPR 2026',       'period' => $periodeTagungan, 'year' => 2026, 'status' => 'draft',    'has_file' => false],
                ['type' => 'dpa',     'periode_type' => 'tahunan',      'code' => 'DOC-PUPR-DPA-26',     'num' => '600/040/PUPR/2026',    'title' => 'DPA Dinas PUPR Tahun 2026',                'period' => $periodeTagungan, 'year' => 2026, 'status' => 'approved', 'has_file' => true],
                ['type' => 'lhe',     'periode_type' => 'tahunan',      'code' => 'DOC-PUPR-LHE-25',     'num' => '600/085/PUPR/2025',    'title' => 'Laporan Evaluasi Pengawasan Fisik PUPR 2025','period' => $periode5Tahunan, 'year' => 2025, 'status' => 'approved', 'has_file' => true],
            ],
        ];

        foreach ($pilotOrgs as $org) {
            $defs = $docDefs[$org->code] ?? [];
            foreach ($defs as $d) {
                $status = $d['status'] ?? 'draft';
                $filePath = null;

                if ($d['has_file']) {
                    $slug = strtolower(preg_replace('/[^a-zA-Z0-9]+/', '_', $d['code']));
                    $relPath = "planning/documents/{$slug}.pdf";
                    $filePath = $this->createSamplePdf(
                        $relPath,
                        $d['title'],
                        $org->name,
                        strtoupper($d['type']),
                        (string)$d['year'],
                        [
                            'Nomor Dokumen' => $d['num'],
                            'Perangkat Daerah' => $org->name,
                            'Jenis Dokumen' => strtoupper($d['type']),
                            'Tahun Anggaran' => (string)$d['year'],
                            'Status Legalitas' => ucfirst($status),
                            'Tanggal Penetapan' => now()->subDays(15)->format('d F Y'),
                        ]
                    );
                }

                PlanningDocument::updateOrCreate(
                    ['organization_id' => $org->id, 'performance_period_id' => $d['period']->id, 'type' => $d['type']],
                    [
                        'code'            => $d['code'],
                        'document_number' => $d['num'],
                        'year'            => $d['year'],
                        'periode_type'    => $d['periode_type'],
                        'title'           => $d['title'],
                        'description'     => 'Dokumen resmi simulasi e-KASUARI Provinsi Papua Barat.',
                        'issued_at'       => now()->toDateString(),
                        'start_year'      => (int)$d['period']->start_date->format('Y'),
                        'end_year'        => (int)$d['period']->end_date->format('Y'),
                        'file_path'       => $filePath,
                        'status'          => $status,
                        'created_by'      => $adminId,
                        'updated_by'      => $adminId,
                        'approved_by'     => in_array($status, ['approved', 'locked']) ? $adminId : null,
                        'approved_at'     => in_array($status, ['approved', 'locked']) ? now()->subDays(rand(5, 20)) : null,
                        'locked_at'       => $status === 'locked' ? now()->subDays(3) : null,
                    ]
                );
            }
            $this->command->info("   OK {$org->name}: ".count($defs)." dokumen (variasi status & PDF)");
        }

        // ── D. SEED DEMO POHON KINERJA ────────────────────────────────────────
        $this->command->info('D. Membuat demo Pohon Kinerja...');

        $trees = [
            'BAPPEDA-PB' => [
                'outcome' => 'Meningkatnya kualitas perencanaan pembangunan daerah yang partisipatif dan berbasis data',
                'csfs' => [
                    ['name' => 'Sinkronisasi dokumen perencanaan daerah dengan nasional tercapai minimal 85%',
                     'conditions' => ['Tersedianya database perencanaan yang terintegrasi', 'Terselenggaranya forum musrenbang yang representatif']],
                    ['name' => 'Peningkatan kapasitas SDM perencana OPD',
                     'conditions' => ['Terlaksananya bimtek perencanaan berbasis kinerja']],
                ],
            ],
            'INSP-PB' => [
                'outcome' => 'Meningkatnya efektivitas pengawasan internal pemerintah daerah',
                'csfs' => [
                    ['name' => 'Penyelesaian tindak lanjut hasil pemeriksaan minimal 80%',
                     'conditions' => ['Terselenggaranya audit reguler pada seluruh OPD Pilot', 'Tersedianya sistem monitoring tindak lanjut rekomendasi']],
                ],
            ],
            'DISKOP-PB' => [
                'outcome' => 'Meningkatnya daya saing Koperasi dan UMKM di Provinsi Papua Barat',
                'csfs' => [
                    ['name' => 'Bertambahnya jumlah koperasi aktif sebesar 15% per tahun',
                     'conditions' => ['Terselenggaranya pendampingan dan pembinaan koperasi', 'Tersedianya akses pembiayaan bagi UMKM']],
                    ['name' => 'Peningkatan omzet UMKM binaan minimal 20%',
                     'conditions' => ['Terlaksananya pelatihan kewirausahaan berbasis komoditi lokal']],
                ],
            ],
            'PUPR-PB' => [
                'outcome' => 'Meningkatnya kualitas infrastruktur jalan dan jembatan di Provinsi Papua Barat',
                'csfs' => [
                    ['name' => 'Kemantapan jalan provinsi mencapai 75% pada akhir 2026',
                     'conditions' => ['Terlaksananya pemeliharaan rutin jalan sepanjang 450 km', 'Selesainya pembangunan jembatan prioritas di 3 kabupaten']],
                    ['name' => 'Cakupan layanan air bersih perkotaan mencapai 80%',
                     'conditions' => ['Tersedianya jaringan pipa distribusi air bersih yang memadai']],
                ],
            ],
        ];

        foreach ($pilotOrgs as $org) {
            $t = $trees[$org->code] ?? null;
            if (!$t) continue;

            $outcome = PlanningTree::updateOrCreate(
                ['organization_id' => $org->id, 'performance_period_id' => $periode5Tahunan->id, 'parent_id' => null, 'level' => 1],
                ['code' => $org->code.'-OUT-1', 'name' => $t['outcome'], 'is_active' => true, 'sort_order' => 1]
            );

            foreach ($t['csfs'] as $ci => $csf) {
                $csfNode = PlanningTree::updateOrCreate(
                    ['organization_id' => $org->id, 'performance_period_id' => $periode5Tahunan->id, 'parent_id' => $outcome->id, 'level' => 2, 'sort_order' => $ci + 1],
                    ['code' => $org->code.'-CSF-'.($ci+1), 'name' => $csf['name'], 'is_active' => true]
                );
                foreach ($csf['conditions'] as $ki => $cond) {
                    PlanningTree::updateOrCreate(
                        ['organization_id' => $org->id, 'performance_period_id' => $periode5Tahunan->id, 'parent_id' => $csfNode->id, 'level' => 3, 'sort_order' => $ki + 1],
                        ['code' => $org->code.'-KA-'.($ci+1).($ki+1), 'name' => $cond, 'is_active' => true]
                    );
                }
            }
            $count = PlanningTree::where('organization_id', $org->id)->count();
            $this->command->info("   OK {$org->name}: {$count} node");
        }

        // ── D.1 MASTER INDIKATOR KINERJA ─────────────────────────────────────
        $this->command->info('D.1 Membuat Master Indikator Kinerja OPD Pilot...');

        $indikatorData = [
            'BAPPEDA-PB' => [
                ['code' => 'IKU-BAPP-01', 'name' => 'Persentase Keselarasan Dokumen Perencanaan Daerah dengan RKPD Nasional', 'type' => 'outcome', 'direction' => 'higher_is_better', 'frequency' => 'annual', 'is_iku' => true, 'target' => 90.0],
                ['code' => 'IKU-BAPP-02', 'name' => 'Indeks Kualitas Perencanaan Pembangunan Daerah', 'type' => 'output', 'direction' => 'higher_is_better', 'frequency' => 'annual', 'is_iku' => false, 'target' => 85.5],
            ],
            'INSP-PB' => [
                ['code' => 'IKU-INSP-01', 'name' => 'Persentase Tindak Lanjut Rekomendasi Hasil Pemeriksaan Internal', 'type' => 'outcome', 'direction' => 'higher_is_better', 'frequency' => 'annual', 'is_iku' => true, 'target' => 85.0],
                ['code' => 'IKU-INSP-02', 'name' => 'Tingkat Maturitas SPIP Pemerintah Provinsi Papua Barat', 'type' => 'output', 'direction' => 'higher_is_better', 'frequency' => 'annual', 'is_iku' => true, 'target' => 3.5],
            ],
            'DISKOP-PB' => [
                ['code' => 'IKU-KOP-01', 'name' => 'Persentase Koperasi Aktif dan Sehat di Papua Barat', 'type' => 'outcome', 'direction' => 'higher_is_better', 'frequency' => 'annual', 'is_iku' => true, 'target' => 75.0],
                ['code' => 'IKU-KOP-02', 'name' => 'Persentase Pertumbuhan Volume Usaha UMKM Binaan', 'type' => 'output', 'direction' => 'higher_is_better', 'frequency' => 'annual', 'is_iku' => false, 'target' => 15.0],
            ],
            'PUPR-PB' => [
                ['code' => 'IKU-PUPR-01', 'name' => 'Persentase Kemantapan Jalan Provinsi Papua Barat', 'type' => 'outcome', 'direction' => 'higher_is_better', 'frequency' => 'annual', 'is_iku' => true, 'target' => 78.5],
                ['code' => 'IKU-PUPR-02', 'name' => 'Persentase Rumah Tangga Bersanitasi Layak', 'type' => 'output', 'direction' => 'higher_is_better', 'frequency' => 'annual', 'is_iku' => true, 'target' => 82.0],
            ],
        ];

        $createdIndicators = [];
        foreach ($pilotOrgs as $org) {
            $items = $indikatorData[$org->code] ?? [];
            foreach ($items as $item) {
                $targetVal = $item['target'];
                unset($item['target']);

                $ind = Indicator::updateOrCreate(
                    ['code' => $item['code']],
                    array_merge($item, [
                        'owner_organization_id' => $org->id,
                        'status' => 'active',
                    ])
                );
                $createdIndicators[$org->code][] = ['model' => $ind, 'target' => $targetVal];
            }
            $this->command->info("   OK {$org->name}: " . count($items) . " indikator aktif");
        }

        // ── D.2 PERJANJIAN KINERJA (AGREEMENT) ──────────────────────────────
        $this->command->info('D.2 Menyiapkan Perjanjian Kinerja (variasi status & PDF)...');

        $pkDefs = [
            'BAPPEDA-PB' => [
                'code'            => 'PK-BAPPEDA-2026',
                'name'            => 'Perjanjian Kinerja Bappeda Tahun 2026',
                'doc_num'         => '050/012/BAPPEDA/2026',
                'status'          => 'approved',
                'desc'            => 'Perjanjian Kinerja definitif Bappeda Papua Barat TA 2026 telah disetujui Gubernur.',
            ],
            'INSP-PB' => [
                'code'            => 'PK-INSP-2026',
                'name'            => 'Perjanjian Kinerja Inspektorat Daerah Tahun 2026',
                'doc_num'         => '700/005/INSP/2026',
                'status'          => 'submitted',
                'desc'            => 'Perjanjian Kinerja telah diajukan ke Sekretaris Daerah untuk proses telaah dan persetujuan.',
            ],
            'DISKOP-PB' => [
                'code'            => 'PK-DISKOP-2026',
                'name'            => 'Perjanjian Kinerja Dinas Koperasi & UKM Tahun 2026',
                'doc_num'         => '518/022/DISKOP/2026',
                'status'          => 'locked',
                'desc'            => 'Perjanjian Kinerja telah final dan dikunci untuk proses pelaporan triwulanan.',
            ],
            'PUPR-PB' => [
                'code'            => 'PK-PUPR-2026',
                'name'            => 'Perjanjian Kinerja Dinas PUPR Tahun 2026',
                'doc_num'         => '600/031/PUPR/2026',
                'status'          => 'draft',
                'desc'            => 'Draft awal Perjanjian Kinerja Dinas PUPR sedang dalam tahap harmonisasi indikator teknis.',
            ],
        ];

        foreach ($pilotOrgs as $org) {
            $def = $pkDefs[$org->code] ?? null;
            if (!$def) continue;

            $slug = strtolower(preg_replace('/[^a-zA-Z0-9]+/', '_', $def['doc_num']));
            $relPath = "planning/agreements/{$slug}.pdf";
            $status = $def['status'];

            $filePath = $this->createSamplePdf(
                $relPath,
                $def['name'],
                $org->name,
                'PERJANJIAN KINERJA (PK)',
                '2026',
                [
                    'Nomor Dokumen' => $def['doc_num'],
                    'Pihak Pertama' => "Kepala {$org->name}",
                    'Pihak Kedua'   => 'Gubernur Papua Barat',
                    'Tahun Anggaran' => '2026',
                    'Status'        => ucfirst($status),
                ]
            );

            $agreement = Agreement::updateOrCreate(
                ['code' => $def['code']],
                [
                    'organization_id'        => $org->id,
                    'performance_period_id'  => $periodeTagungan->id,
                    'planning_period_id'     => $pp2026->id,
                    'name'                   => $def['name'],
                    'title'                  => $def['name'],
                    'document_number'        => $def['doc_num'],
                    'responsible_name'       => "Kepala {$org->name}",
                    'counterpart_name'       => 'Gubernur Papua Barat',
                    'version'                => 1,
                    'description'            => $def['desc'],
                    'file_path'              => $filePath,
                    'status'                 => $status,
                    'created_by'             => $adminId,
                    'updated_by'             => $adminId,
                    'submitted_by'           => in_array($status, ['submitted', 'approved', 'locked']) ? ($adminOpd?->id ?? $adminId) : null,
                    'submitted_at'           => in_array($status, ['submitted', 'approved', 'locked']) ? now()->subDays(10) : null,
                    'approved_by'            => in_array($status, ['approved', 'locked']) ? $adminId : null,
                    'approved_at'            => in_array($status, ['approved', 'locked']) ? now()->subDays(5) : null,
                    'locked_at'              => $status === 'locked' ? now()->subDays(2) : null,
                ]
            );

            // Hubungkan indikator ke Agreement
            $syncData = [];
            if (!empty($createdIndicators[$org->code])) {
                foreach ($createdIndicators[$org->code] as $indItem) {
                    $syncData[$indItem['model']->id] = ['target' => $indItem['target']];
                }
                $agreement->indicators()->sync($syncData);
            }

            $this->command->info("   OK {$org->name}: PK ({$status}) + " . count($syncData) . " indikator + PDF");
        }

        // ── D.3 KNOWLEDGE DOCUMENTS (PUBLIC & INTERNAL) ──────────────────────
        $this->command->info('D.3 Menyiapkan Dokumen Pengetahuan (Knowledge Base)...');

        $kbDocs = [
            [
                'title'         => 'PermenPAN-RB No. 88 Tahun 2021 tentang Pedoman Evaluasi AKIP',
                'document_type' => 'regulation',
                'category'      => 'Regulasi Nasional',
                'access'        => 'public',
                'status'        => 'published',
                'tags'          => 'SAKIP, AKIP, Evaluasi, PermenPAN',
                'content'       => 'Pedoman teknis evaluasi Akuntabilitas Kinerja Instansi Pemerintah (AKIP) mencakup perencanaan, pengukuran, pelaporan, dan evaluasi internal.',
            ],
            [
                'title'         => 'Petunjuk Teknis Pengukuran Kinerja SAKIP Papua Barat (e-KASUARI)',
                'document_type' => 'guideline',
                'category'      => 'Petunjuk Teknis',
                'access'        => 'public',
                'status'        => 'published',
                'tags'          => 'Juknis, e-KASUARI, Pengukuran, Panduan OPD',
                'content'       => 'Panduan operasional bagi seluruh operator dan verifikator OPD dalam penginputan capaian indikator kinerja berkala triwulanan.',
            ],
            [
                'title'         => 'SOP Verifikasi dan Penetapan Dokumen Perjanjian Kinerja',
                'document_type' => 'sop',
                'category'      => 'Standar Operasional Prosedur',
                'access'        => 'public',
                'status'        => 'published',
                'tags'          => 'SOP, PK, Perjanjian Kinerja, Verifikasi',
                'content'       => 'Alur kerja verifikasi perjanjian kinerja berjenjang dari operator OPD, verifikator Bappeda, hingga persetujuan Gubernur.',
            ],
            [
                'title'         => 'Peraturan Gubernur Papua Barat tentang Penyelenggaraan SAKIP Terintegrasi',
                'document_type' => 'regulation',
                'category'      => 'Regulasi Daerah',
                'access'        => 'public',
                'status'        => 'published',
                'tags'          => 'Pergub, Papua Barat, SAKIP, Regulasi',
                'content'       => 'Landasan hukum penerapan sistem manajemen kinerja terintegrasi e-KASUARI di lingkungan Pemerintah Provinsi Papua Barat.',
            ],
            [
                'title'         => 'Draft Panduan Integrasi Modul Evaluasi dengan SIPD Kemendagri',
                'document_type' => 'tutorial',
                'category'      => 'Integrasi Teknis',
                'access'        => 'internal',
                'status'        => 'draft',
                'tags'          => 'SIPD, Integrasi, API, Internal',
                'content'       => 'Dokumen teknis internal pemetaan data anggaran DPA dan realisasi belanja dari SIPD ke e-KASUARI.',
            ],
            [
                'title'         => 'FAQ: Pertanyaan Umum Seputar Pengisian dan Pelaporan SAKIP e-KASUARI',
                'document_type' => 'faq',
                'category'      => 'Tanya Jawab',
                'access'        => 'public',
                'status'        => 'published',
                'tags'          => 'FAQ, Bantuan, Kendala, Pertanyaan Umum',
                'content'       => 'Kumpulan jawaban atas pertanyaan yang sering diajukan terkait batas waktu pengisian capaian, verifikasi Bappeda, dan kendala teknis aplikasi.',
            ],
            [
                'title'         => 'Sosialisasi Penerapan e-KASUARI Terintegrasi untuk Seluruh OPD Papua Barat',
                'document_type' => 'news',
                'category'      => 'Berita & Informasi',
                'access'        => 'public',
                'status'        => 'published',
                'tags'          => 'Sosialisasi, e-KASUARI, Berita, Bappeda',
                'content'       => 'Bappeda Papua Barat menyelenggarakan workshop bimbingan teknis implementasi sistem e-KASUARI guna akselerasi nilai AKIP daerah.',
            ],
            [
                'title'         => 'Video Tutorial: Alur Penyusunan Pohon Kinerja dan Cascading Indikator OPD',
                'document_type' => 'video_tutorial',
                'category'      => 'Tutorial Video',
                'access'        => 'public',
                'status'        => 'published',
                'external_url'  => 'https://www.youtube.com',
                'tags'          => 'Video, Tutorial, Pohon Kinerja, Cascading',
                'content'       => 'Panduan video interaktif langkah demi langkah dalam menyusun pohon kinerja dari level Sasaran Strategis hingga Sub-Kegiatan.',
            ],
            [
                'title'         => 'Portal SIPD RI — Sistem Informasi Pemerintahan Daerah (Kemendagri)',
                'document_type' => 'external_link',
                'category'      => 'Aplikasi Eksternal',
                'access'        => 'public',
                'status'        => 'published',
                'external_url'  => 'https://sipd-ri.kemendagri.go.id',
                'tags'          => 'SIPD, Kemendagri, Perencanaan, Penganggaran',
                'content'       => 'Tautan resmi menuju aplikasi SIPD-RI Kementerian Dalam Negeri untuk integrasi data perencanaan dan penatausahaan keuangan.',
            ],
            [
                'title'         => 'Portal ESR KemenPANRB — Evaluasi SAKIP Nasional',
                'document_type' => 'external_link',
                'category'      => 'Aplikasi Eksternal',
                'access'        => 'public',
                'status'        => 'published',
                'external_url'  => 'https://esr.menpan.go.id',
                'tags'          => 'ESR, KemenPANRB, LHE, Evaluasi AKIP',
                'content'       => 'Aplikasi Electronic SAKIP Review (ESR) Kementerian PANRB untuk pelaporan dan hasil evaluasi akuntabilitas kinerja pemerintah daerah.',
            ],
        ];

        foreach ($kbDocs as $i => $kb) {
            $slug = 'kb_' . ($i + 1) . '_' . strtolower(preg_replace('/[^a-zA-Z0-9]+/', '_', substr($kb['title'], 0, 30)));
            $relPath = "knowledge/documents/{$slug}.pdf";

            $filePath = $this->createSamplePdf(
                $relPath,
                $kb['title'],
                'Pemerintah Provinsi Papua Barat',
                strtoupper($kb['document_type']),
                '2026',
                [
                    'Judul Dokumen' => $kb['title'],
                    'Jenis'         => ucfirst($kb['document_type']),
                    'Kategori'      => $kb['category'],
                    'Hak Akses'     => ucfirst($kb['access']),
                    'Status'        => ucfirst($kb['status']),
                ]
            );

            KnowledgeDocument::updateOrCreate(
                ['title' => $kb['title']],
                array_merge($kb, [
                    'file_path'    => $filePath,
                    'version'      => 1,
                    'published_by' => $kb['status'] === 'published' ? $adminId : null,
                    'published_at' => $kb['status'] === 'published' ? now()->subDays(rand(5, 30)) : null,
                ])
            );
        }
        $this->command->info('   OK ' . count($kbDocs) . ' Dokumen Pengetahuan (Publik & Internal) + PDF siap');

        // ── E. ALERT RULES & ALERTS (EWS) ────────────────────────────────────
        $this->command->info('E. Membuat Alert Rules & Alerts (EWS)...');

        $rPerf = AlertRule::updateOrCreate(
            ['code' => 'EWS_PERF_DEV'],
            ['name' => 'Deviasi Capaian Kinerja Rendah (< 60%)', 'rule_type' => 'performance_deviation', 'severity' => 'critical', 'is_active' => true, 'config' => ['threshold' => 60, 'operator' => '<']]
        );
        $rLate = AlertRule::updateOrCreate(
            ['code' => 'EWS_LATE_SUBMIT'],
            ['name' => 'Keterlambatan Pelaporan Pengukuran Kinerja', 'rule_type' => 'late_report', 'severity' => 'high', 'is_active' => true, 'config' => ['grace_days' => 0]]
        );
        $rEvid = AlertRule::updateOrCreate(
            ['code' => 'EWS_NO_EVIDENCE'],
            ['name' => 'Realisasi Kinerja Tanpa Bukti Dukung', 'rule_type' => 'missing_evidence', 'severity' => 'warning', 'is_active' => true, 'config' => []]
        );
        $r1 = AlertRule::updateOrCreate(
            ['code' => 'DOC_OVERDUE'],
            ['name' => 'Dokumen SAKIP Belum Lengkap / Terlambat Unggah', 'rule_type' => 'document_overdue', 'severity' => 'high', 'is_active' => true, 'config' => ['threshold_days' => 30]]
        );
        $r2 = AlertRule::updateOrCreate(
            ['code' => 'PK_UNSIGNED'],
            ['name' => 'Perjanjian Kinerja Belum Disahkan', 'rule_type' => 'pk_unsigned', 'severity' => 'medium', 'is_active' => true, 'config' => ['threshold_days' => 14]]
        );
        $r3 = AlertRule::updateOrCreate(
            ['code' => 'DOC_REVISION'],
            ['name' => 'Revisi Dokumen SAKIP Tertunda', 'rule_type' => 'revision_pending', 'severity' => 'low', 'is_active' => true, 'config' => ['threshold_days' => 7]]
        );

        $alerts = [
            ['rule_id' => $r1->id, 'organization_id' => $koperasi->id, 'alert_type' => 'document_overdue', 'severity' => 'high', 'title' => 'Koperasi & UKM: RKA 2026 Belum Diunggah', 'message' => 'Dokumen RKA TA 2026 belum diunggah melebihi batas 30 hari. Segera lakukan pengunggahan.', 'status' => 'open', 'owner_id' => $admin?->id],
            ['rule_id' => $r1->id, 'organization_id' => $pupr->id, 'alert_type' => 'document_overdue', 'severity' => 'high', 'title' => 'PUPR: LKjIP 2025 Belum Tersedia', 'message' => 'Laporan Kinerja (LKjIP) tahun 2025 belum diunggah. Diperlukan untuk proses evaluasi SAKIP.', 'status' => 'open', 'owner_id' => $admin?->id],
            ['rule_id' => $r2->id, 'organization_id' => $inspektorat->id, 'alert_type' => 'pk_unsigned', 'severity' => 'medium', 'title' => 'Inspektorat: PK 2026 Belum Final', 'message' => 'Perjanjian Kinerja Inspektorat 2026 masih draft, belum ditandatangani Kepala OPD.', 'status' => 'open', 'owner_id' => $adminOpd?->id],
            ['rule_id' => $r3->id, 'organization_id' => $bappeda->id, 'alert_type' => 'revision_pending', 'severity' => 'low', 'title' => 'Bappeda: Renstra Menunggu Revisi', 'message' => 'Renstra Bappeda 2025-2029 dikembalikan untuk perbaikan bagian indikator sasaran.', 'status' => 'acknowledged', 'owner_id' => $adminOpd?->id, 'acknowledged_by' => $pimpinan?->id, 'acknowledged_at' => now()->subHours(2)],
            ['rule_id' => $r1->id, 'organization_id' => $pupr->id, 'alert_type' => 'document_overdue', 'severity' => 'medium', 'title' => 'PUPR: Monitoring Triwulan I Belum Ada', 'message' => 'Laporan monitoring triwulan I 2026 belum tersedia dalam sistem.', 'status' => 'open', 'owner_id' => $admin?->id],
        ];

        foreach ($alerts as $a) {
            Alert::updateOrCreate(
                ['title' => $a['title'], 'organization_id' => $a['organization_id']],
                $a
            );
        }
        $this->command->info('   OK Alert Rules & Alerts siap');

        // ── F. NOTIFIKASI ────────────────────────────────────────────────────
        $this->command->info('F. Membuat Notifikasi Sistem...');

        $notifs = [
            ['user_id' => $pimpinan?->id, 'event' => 'alert.created', 'channel' => 'in_app', 'title' => 'Peringatan Kinerja Baru', 'message' => '2 OPD pilot belum upload dokumen wajib. Harap segera ditindaklanjuti.', 'resource_type' => 'Alert', 'delivery_status' => 'delivered', 'metadata' => ['alert_count' => 2, 'severity' => 'high']],
            ['user_id' => $adminOpd?->id, 'event' => 'document.revision_requested', 'channel' => 'in_app', 'title' => 'Dokumen Perlu Direvisi', 'message' => 'Renstra Bappeda 2025-2029 dikembalikan Admin Provinsi. Silakan periksa catatan revisi.', 'resource_type' => 'PlanningDocument', 'delivery_status' => 'delivered', 'metadata' => ['doc_type' => 'renstra']],
            ['user_id' => $admin?->id, 'event' => 'user.login', 'channel' => 'in_app', 'title' => 'Login Baru Terdeteksi', 'message' => 'Login berhasil dari perangkat baru pada ' . now()->subHours(1)->format('d M Y H:i') . '.', 'resource_type' => 'User', 'delivery_status' => 'delivered', 'metadata' => ['ip' => '192.168.1.10']],
            ['user_id' => $pimpinan?->id, 'event' => 'document.uploaded', 'channel' => 'in_app', 'title' => 'Dokumen Baru Diupload', 'message' => 'Dinas PUPR telah mengupload Perjanjian Kinerja 2026. Siap untuk ditinjau.', 'resource_type' => 'PlanningDocument', 'delivery_status' => 'delivered', 'read_at' => now()->subMinutes(30), 'metadata' => ['org' => 'PUPR']],
            ['user_id' => $adminOpd?->id, 'event' => 'system.reminder', 'channel' => 'in_app', 'title' => 'Pengingat Batas Waktu', 'message' => 'Batas waktu upload dokumen Renja 2026 tinggal 7 hari lagi. Pastikan semua dokumen sudah disiapkan.', 'resource_type' => 'System', 'delivery_status' => 'delivered', 'metadata' => ['days_left' => 7]],
        ];

        foreach ($notifs as $n) {
            if (!empty($n['user_id'])) {
                AppNotification::updateOrCreate(
                    ['title' => $n['title'], 'user_id' => $n['user_id']],
                    $n
                );
            }
        }
        $this->command->info('   OK Notifikasi siap');

        // ── G. AI PROMPT TEMPLATES ───────────────────────────────────────────
        $this->command->info('G. Membuat AI Prompt Templates...');

        $templates = [
            ['code' => 'EXEC_SUMMARY', 'name' => 'Ringkasan Eksekutif Kinerja OPD', 'feature' => 'executive_summary', 'version' => 1, 'content' => 'Buatkan ringkasan eksekutif kinerja OPD {{opd_name}} untuk periode {{period}}. Sertakan: (1) capaian utama, (2) kendala signifikan, (3) rekomendasi strategis. Gunakan bahasa formal dan singkat maksimal 300 kata.', 'is_active' => true, 'created_by' => $admin?->id],
            ['code' => 'COMPLIANCE_ANALYSIS', 'name' => 'Analisis Kepatuhan Dokumen', 'feature' => 'compliance', 'version' => 1, 'content' => 'Analisis tingkat kepatuhan pengunggahan dokumen perencanaan seluruh OPD periode {{period}}. Identifikasi OPD yang terlambat dan berikan rekomendasi intervensi.', 'is_active' => true, 'created_by' => $admin?->id],
            ['code' => 'IMPROVEMENT_REC', 'name' => 'Rekomendasi Peningkatan Kinerja', 'feature' => 'recommendation', 'version' => 1, 'content' => 'Berdasarkan data kinerja OPD {{opd_name}}, berikan 3-5 rekomendasi konkret untuk meningkatkan capaian indikator yang masih di bawah target. Format dalam poin singkat.', 'is_active' => true, 'created_by' => $admin?->id],
            ['code' => 'EWS_REPORT', 'name' => 'Laporan Early Warning System', 'feature' => 'ews', 'version' => 1, 'content' => 'Buat laporan singkat EWS untuk Gubernur Papua Barat: (1) jumlah OPD berisiko tinggi, (2) dokumen terlambat, (3) langkah mitigasi yang disarankan.', 'is_active' => true, 'created_by' => $admin?->id],
        ];

        foreach ($templates as $tpl) {
            AiPromptTemplate::updateOrCreate(['code' => $tpl['code']], $tpl);
        }
        $this->command->info('   OK AI Prompt Templates siap');

        // ── H. WHATSAPP IDENTITIES ───────────────────────────────────────────
        $this->command->info('H. Membuat WhatsApp Identities...');

        if ($pimpinan) {
            WhatsappIdentity::updateOrCreate(
                ['phone_number' => '+6281234567890'],
                ['user_id' => $pimpinan->id, 'display_number' => '+628123-456-7890', 'is_verified' => true, 'verified_at' => now()->subDays(5), 'is_active' => true, 'is_suspended' => false]
            );
        }
        if ($admin) {
            WhatsappIdentity::updateOrCreate(
                ['phone_number' => '+6281234567891'],
                ['user_id' => $admin->id, 'display_number' => '+628123-456-7891', 'is_verified' => true, 'verified_at' => now()->subDays(3), 'is_active' => true, 'is_suspended' => false]
            );
        }
        $this->command->info('   OK WhatsApp Identities siap');

        // ── I. APP CONFIG ────────────────────────────────────────────────────
        $this->command->info('I. Mengatur Konfigurasi Sistem...');

        $configs = [
            ['group' => 'general', 'key' => 'app_name', 'value' => 'e-KASUARI', 'label' => 'Nama Aplikasi', 'type' => 'string', 'is_secret' => false, 'default_value' => 'e-KASUARI', 'description' => 'Nama resmi aplikasi yang ditampilkan di seluruh sistem'],
            ['group' => 'general', 'key' => 'province_name', 'value' => 'Provinsi Papua Barat', 'label' => 'Nama Provinsi', 'type' => 'string', 'is_secret' => false, 'default_value' => '', 'description' => 'Nama provinsi pengguna sistem'],
            ['group' => 'general', 'key' => 'contact_email', 'value' => 'admin@papuabarat.go.id', 'label' => 'Email Kontak Admin', 'type' => 'string', 'is_secret' => false, 'default_value' => '', 'description' => 'Email kontak untuk keperluan sistem'],
            ['group' => 'general', 'key' => 'fiscal_year', 'value' => '2026', 'label' => 'Tahun Anggaran Aktif', 'type' => 'integer', 'is_secret' => false, 'default_value' => '2026', 'description' => 'Tahun anggaran yang sedang berjalan'],
            ['group' => 'upload', 'key' => 'max_file_size_mb', 'value' => '10', 'label' => 'Ukuran Maksimal Upload (MB)', 'type' => 'integer', 'is_secret' => false, 'default_value' => '10', 'description' => 'Batas ukuran file yang bisa diupload'],
            ['group' => 'upload', 'key' => 'allowed_extensions', 'value' => 'pdf,xlsx,xls,docx,doc,pptx', 'label' => 'Ekstensi File Diizinkan', 'type' => 'string', 'is_secret' => false, 'default_value' => 'pdf,xlsx', 'description' => 'Format file yang diizinkan untuk diupload'],
            ['group' => 'ai', 'key' => 'ai_model', 'value' => 'gemini-pro', 'label' => 'Model AI Digunakan', 'type' => 'string', 'is_secret' => false, 'default_value' => 'gemini-pro', 'description' => 'Model AI yang digunakan untuk analisis kinerja'],
            ['group' => 'ai', 'key' => 'ai_max_tokens', 'value' => '2048', 'label' => 'Maks Token AI', 'type' => 'integer', 'is_secret' => false, 'default_value' => '2048', 'description' => 'Batas token per request ke AI'],
            ['group' => 'security', 'key' => 'session_lifetime_minutes', 'value' => '120', 'label' => 'Durasi Sesi (Menit)', 'type' => 'integer', 'is_secret' => false, 'default_value' => '120', 'description' => 'Berapa menit sesi login aktif sebelum logout otomatis'],
            ['group' => 'security', 'key' => 'max_login_attempts', 'value' => '5', 'label' => 'Maks Percobaan Login', 'type' => 'integer', 'is_secret' => false, 'default_value' => '5', 'description' => 'Jumlah maksimal percobaan login sebelum akun dikunci sementara'],
        ];

        foreach ($configs as $c) {
            AppConfig::updateOrCreate(['key' => $c['key']], $c);
        }
        $this->command->info('   OK Konfigurasi sistem siap');

        $this->command->info('');
        $this->command->info('=== SELESAI ===');
        $this->command->info('OPDs       : ' . Organization::count());
        $this->command->info('Periods    : ' . PerformancePeriod::count());
        $this->command->info('Documents  : ' . PlanningDocument::count());
        $this->command->info('Agreements : ' . Agreement::count());
        $this->command->info('Indicators : ' . Indicator::count());
        $this->command->info('Knowledge  : ' . KnowledgeDocument::count());
        $this->command->info('Tree Nodes : ' . PlanningTree::count());
        $this->command->info('Alerts     : ' . Alert::count());
        $this->command->info('Notifs     : ' . AppNotification::count());
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
            <p style="margin: 0 0 50px 0;">Manokwari, {$year}<br><strong>Kepala {$opdName}</strong></p>
            <p style="margin: 0; text-decoration: underline; font-weight: bold;">Pimpinan OPD Terkait</p>
            <p style="margin: 0; font-size: 11px; color: #64748b;">NIP. 19750512 200212 1 003</p>
        </div>
        <div style="clear: both;"></div>
    </div>
</body>
</html>
HTML;

        try {
            $pdf = Pdf::loadHTML($html);
            $content = $pdf->output();

            // Simpan ke local disk (storage/app/private/...)
            Storage::disk('local')->put($path, $content);

            // Simpan juga ke public disk (storage/app/public/...)
            Storage::disk('public')->put($path, $content);
        } catch (\Throwable $e) {
            $fallback = "DEMO DOKUMEN: {$title}\n{$opdName}\nTahun: {$year}\nKlasifikasi: {$docType}\n";
            Storage::disk('local')->put($path, $fallback);
            Storage::disk('public')->put($path, $fallback);
        }

        return $path;
    }
}