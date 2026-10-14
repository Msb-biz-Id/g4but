<?php

namespace Database\Seeders;

use App\Models\Evaluation;
use App\Models\EvaluationScore;
use App\Models\Followup;
use App\Models\Organization;
use App\Models\PkoEvaluation;
use App\Models\PkoIndicator;
use App\Models\PlanningPeriod;
use App\Models\Recommendation;
use App\Models\User;
use Illuminate\Database\Seeder;

class EvaluationSeeder extends Seeder
{
    /**
     * Menyiapkan Data Evaluasi Kinerja (SAKIP) & Penilaian Kinerja Organisasi (PKO):
     * 1. Evaluasi SAKIP Resmi PermenPAN-RB No. 88/2021 (OPD Induk & Seluruh Bidang/Unit)
     * 2. 5 Komponen Evaluasi Berbobot (Perencanaan 30, Pengukuran 30, Pelaporan 15, Evaluasi Internal 10, Capaian 15)
     * 3. Rekomendasi Hasil Evaluasi (LHE) & Tindak Lanjut Perbaikan Berbagai Unit
     * 4. PKO Sesuai PermenPAN-RB No. 22/2024 untuk OPD Induk, 4 Bidang, Sekretariat, UPTD, dan Seksi
     */
    public function run(): void
    {
        $rootOpd = Organization::where('code', 'OPD-INDUK')->firstOrFail();
        $sekretariat = Organization::where('code', 'SEKRETARIAT')->firstOrFail();
        $bidangBM = Organization::where('code', 'BIDANG-BM')->firstOrFail();
        $bidangCK = Organization::where('code', 'BIDANG-CK')->firstOrFail();
        $bidangSDA = Organization::where('code', 'BIDANG-SDA')->firstOrFail();
        $bidangTR = Organization::where('code', 'BIDANG-TR')->firstOrFail();
        $uptd = Organization::where('code', 'UPTD-PUPR')->first() ?? $rootOpd;

        $seksiBM1 = Organization::where('code', 'SEKSI-BM-1')->first() ?? $bidangBM;
        $seksiCK3 = Organization::where('code', 'SEKSI-CK-3')->first() ?? $bidangCK;
        $seksiSDA1 = Organization::where('code', 'SEKSI-SDA-1')->first() ?? $bidangSDA;
        $seksiTR1 = Organization::where('code', 'SEKSI-TR-1')->first() ?? $bidangTR;

        $pp2024 = PlanningPeriod::where('code', 'TA-2024')->first();
        $pp2025 = PlanningPeriod::where('code', 'TA-2025')->first();
        $pp2026 = PlanningPeriod::where('code', 'TA-2026')->firstOrFail();

        $superAdmin = User::where('email', 'superadmin@esakip.local')->first();
        $kadis = User::where('email', 'kepala.opd@esakip.local')->first() ?? $superAdmin;
        $adminOpd = User::where('email', 'admin.opd@esakip.local')->first() ?? $superAdmin;

        // ══════════════════════════════════════════════════════════════════════
        // 1. EVALUASI SAKIP RESMI (EVALUATIONS & SCORES) OPD & UNIT KERJA
        // ══════════════════════════════════════════════════════════════════════
        $evalDefinitions = [
            // OPD Induk Dinas PUPR
            [
                'code' => 'EVAL-SAKIP-2024',
                'title' => 'Evaluasi Akuntabilitas Kinerja Instansi Pemerintah (AKIP) Tahun 2024',
                'year' => 2024,
                'organization' => $rootOpd,
                'period' => $pp2024 ?? $pp2026,
                'status' => 'approved',
                'evaluation_status' => 'final',
                'scores' => [
                    ['component' => 'Perencanaan Kinerja', 'criterion' => 'Kualitas Dokumen Renstra, Renja & Pohon Kinerja', 'score' => 24.80, 'max_score' => 30.00, 'weight' => 0.30, 'evaluator_comment' => 'Cascading sasaran terpetakan baik hingga eselon III.'],
                    ['component' => 'Pengukuran Kinerja', 'criterion' => 'Pemenuhan Target IKU & Bukti Sah Evidence', 'score' => 25.20, 'max_score' => 30.00, 'weight' => 0.30, 'evaluator_comment' => 'Pengukuran berkala triwulanan konsisten dan didukung BAP.'],
                    ['component' => 'Pelaporan Kinerja', 'criterion' => 'Ketepatan Waktu & Kualitas Analisis LKjIP', 'score' => 12.60, 'max_score' => 15.00, 'weight' => 0.15, 'evaluator_comment' => 'LKjIP disajikan komprehensif dengan analisis efisiensi anggaran.'],
                    ['component' => 'Evaluasi Akuntabilitas Internal', 'criterion' => 'Pemantauan Berkala Tim SAKIP Dinas', 'score' => 8.10, 'max_score' => 10.00, 'weight' => 0.10, 'evaluator_comment' => 'Tindak lanjut rekomendasi tahun sebelumnya mencapai 90%.'],
                    ['component' => 'Capaian Kinerja', 'criterion' => 'Realisasi Target Sasaran Strategis Daerah', 'score' => 12.20, 'max_score' => 15.00, 'weight' => 0.15, 'evaluator_comment' => 'Target kemantapan jalan dan air minum melampaui baseline.'],
                ],
            ],
            [
                'code' => 'EVAL-SAKIP-2025',
                'title' => 'Evaluasi Akuntabilitas Kinerja Instansi Pemerintah (AKIP) Tahun 2025',
                'year' => 2025,
                'organization' => $rootOpd,
                'period' => $pp2025 ?? $pp2026,
                'status' => 'approved',
                'evaluation_status' => 'final',
                'scores' => [
                    ['component' => 'Perencanaan Kinerja', 'criterion' => 'Kualitas Dokumen Renstra, Renja & Pohon Kinerja', 'score' => 25.60, 'max_score' => 30.00, 'weight' => 0.30, 'evaluator_comment' => 'Integrasi cascading cross-cutting antar bidang berjalan efektif.'],
                    ['component' => 'Pengukuran Kinerja', 'criterion' => 'Pemenuhan Target IKU & Bukti Sah Evidence', 'score' => 25.80, 'max_score' => 30.00, 'weight' => 0.30, 'evaluator_comment' => 'Sistem e-SAKIP mempercepat verifikasi evidence lapangan.'],
                    ['component' => 'Pelaporan Kinerja', 'criterion' => 'Ketepatan Waktu & Kualitas Analisis LKjIP', 'score' => 13.00, 'max_score' => 15.00, 'weight' => 0.15, 'evaluator_comment' => 'Publikasi laporan tepat waktu sebelum batas akhir pelaporan.'],
                    ['component' => 'Evaluasi Akuntabilitas Internal', 'criterion' => 'Pemantauan Berkala Tim SAKIP Dinas', 'score' => 8.40, 'max_score' => 10.00, 'weight' => 0.10, 'evaluator_comment' => 'Evaluasi mandiri berjalan tiap triwulan dipimpin Sekretaris.'],
                    ['component' => 'Capaian Kinerja', 'criterion' => 'Realisasi Target Sasaran Strategis Daerah', 'score' => 12.75, 'max_score' => 15.00, 'weight' => 0.15, 'evaluator_comment' => 'Capaian kinerja fisik infrastruktur di atas 95% target.'],
                ],
            ],
            [
                'code' => 'EVAL-SAKIP-2026',
                'title' => 'Evaluasi Akuntabilitas Kinerja Instansi Pemerintah (AKIP) Tahun 2026 (Berjalan)',
                'year' => 2026,
                'organization' => $rootOpd,
                'period' => $pp2026,
                'status' => 'draft',
                'evaluation_status' => 'in_progress',
                'scores' => [
                    ['component' => 'Perencanaan Kinerja', 'criterion' => 'Kualitas Dokumen Renstra, Renja & Pohon Kinerja', 'score' => 26.00, 'max_score' => 30.00, 'weight' => 0.30, 'evaluator_comment' => 'Dokumen perencanaan lengkap dan telah disahkan bupati.'],
                    ['component' => 'Pengukuran Kinerja', 'criterion' => 'Pemenuhan Target IKU & Bukti Sah Evidence', 'score' => 25.50, 'max_score' => 30.00, 'weight' => 0.30, 'evaluator_comment' => 'Pengukuran TW I dan TW II telah terisi dan terverifikasi.'],
                    ['component' => 'Pelaporan Kinerja', 'criterion' => 'Ketepatan Waktu & Kualitas Analisis LKjIP', 'score' => 12.80, 'max_score' => 15.00, 'weight' => 0.15, 'evaluator_comment' => 'Draft ringkasan eksekutif telah disiapkan.'],
                    ['component' => 'Evaluasi Akuntabilitas Internal', 'criterion' => 'Pemantauan Berkala Tim SAKIP Dinas', 'score' => 8.50, 'max_score' => 10.00, 'weight' => 0.10, 'evaluator_comment' => 'Rapat koordinasi berkala triwulan terlaksana.'],
                    ['component' => 'Capaian Kinerja', 'criterion' => 'Realisasi Target Sasaran Strategis Daerah', 'score' => 12.50, 'max_score' => 15.00, 'weight' => 0.15, 'evaluator_comment' => 'Tren pencapaian IKU menunjukkan progres positif.'],
                ],
            ],

            // Evaluasi Internal Bidang Bina Marga
            [
                'code' => 'EVAL-BM-2025',
                'title' => 'Evaluasi Kinerja Internal SAKIP Bidang Bina Marga Tahun 2025',
                'year' => 2025,
                'organization' => $bidangBM,
                'period' => $pp2025 ?? $pp2026,
                'status' => 'approved',
                'evaluation_status' => 'final',
                'scores' => [
                    ['component' => 'Perencanaan Kinerja', 'criterion' => 'Kesesuaian Renja Bina Marga dengan Renstra', 'score' => 26.20, 'max_score' => 30.00, 'weight' => 0.30, 'evaluator_comment' => 'Target fisik jalan terinci dengan baik per seksi.'],
                    ['component' => 'Pengukuran Kinerja', 'criterion' => 'Ketepatan Pengukuran Fisik Jalan', 'score' => 26.50, 'max_score' => 30.00, 'weight' => 0.30, 'evaluator_comment' => 'Evidence BAP dan foto drone lengkap terunggah.'],
                    ['component' => 'Pelaporan Kinerja', 'criterion' => 'Laporan Progres Triwulanan Bidang', 'score' => 13.20, 'max_score' => 15.00, 'weight' => 0.15, 'evaluator_comment' => 'Laporan triwulan tepat waktu.'],
                    ['component' => 'Evaluasi Akuntabilitas Internal', 'criterion' => 'Tindak Lanjut Hasil Audit Lapangan', 'score' => 8.70, 'max_score' => 10.00, 'weight' => 0.10, 'evaluator_comment' => 'Koordinasi pengawas berjalan efektif.'],
                    ['component' => 'Capaian Kinerja', 'criterion' => 'Realisasi Kemantapan Jalan Kabupaten', 'score' => 13.10, 'max_score' => 15.00, 'weight' => 0.15, 'evaluator_comment' => 'Kemantapan jalan mencapai 73.4% dari target 72.5%.'],
                ],
            ],

            // Evaluasi Internal Bidang Cipta Karya
            [
                'code' => 'EVAL-CK-2025',
                'title' => 'Evaluasi Kinerja Internal SAKIP Bidang Cipta Karya Tahun 2025',
                'year' => 2025,
                'organization' => $bidangCK,
                'period' => $pp2025 ?? $pp2026,
                'status' => 'approved',
                'evaluation_status' => 'final',
                'scores' => [
                    ['component' => 'Perencanaan Kinerja', 'criterion' => 'Kesesuaian Program Cipta Karya', 'score' => 25.80, 'max_score' => 30.00, 'weight' => 0.30, 'evaluator_comment' => 'Program air minum dan sanitasi sinkron dengan RPJMD.'],
                    ['component' => 'Pengukuran Kinerja', 'criterion' => 'Verifikasi Realisasi Sambungan Rumah', 'score' => 26.00, 'max_score' => 30.00, 'weight' => 0.30, 'evaluator_comment' => 'Daftar nama dan koordinat penerima SR valid.'],
                    ['component' => 'Pelaporan Kinerja', 'criterion' => 'Pelaporan Kinerja Fisik & Keuangan', 'score' => 12.80, 'max_score' => 15.00, 'weight' => 0.15, 'evaluator_comment' => 'Penyusunan matriks capaian lengkap.'],
                    ['component' => 'Evaluasi Akuntabilitas Internal', 'criterion' => 'Pengendalian Mutu Konstruksi', 'score' => 8.50, 'max_score' => 10.00, 'weight' => 0.10, 'evaluator_comment' => 'Uji beton laboratorium rutin.'],
                    ['component' => 'Capaian Kinerja', 'criterion' => 'Cakupan Air Minum Perpipaan', 'score' => 13.00, 'max_score' => 15.00, 'weight' => 0.15, 'evaluator_comment' => 'Target air minum tercapai 79.1%.'],
                ],
            ],

            // Evaluasi Internal Bidang SDA
            [
                'code' => 'EVAL-SDA-2025',
                'title' => 'Evaluasi Kinerja Internal SAKIP Bidang Sumber Daya Air Tahun 2025',
                'year' => 2025,
                'organization' => $bidangSDA,
                'period' => $pp2025 ?? $pp2026,
                'status' => 'approved',
                'evaluation_status' => 'final',
                'scores' => [
                    ['component' => 'Perencanaan Kinerja', 'criterion' => 'Rencana Penanganan Kawasan Banjir', 'score' => 25.20, 'max_score' => 30.00, 'weight' => 0.30, 'evaluator_comment' => 'Master plan drainase perkotaan jadi rujukan kegiatan.'],
                    ['component' => 'Pengukuran Kinerja', 'criterion' => 'Pengukuran Luas Tertangani Banjir', 'score' => 25.50, 'max_score' => 30.00, 'weight' => 0.30, 'evaluator_comment' => 'Perhitungan reduksi genangan berbasis peta GIS.'],
                    ['component' => 'Pelaporan Kinerja', 'criterion' => 'Ketepatan Laporan SDA', 'score' => 12.70, 'max_score' => 15.00, 'weight' => 0.15, 'evaluator_comment' => 'Format pelaporan konsisten.'],
                    ['component' => 'Evaluasi Akuntabilitas Internal', 'criterion' => 'Evaluasi Berkala Tanggul', 'score' => 8.30, 'max_score' => 10.00, 'weight' => 0.10, 'evaluator_comment' => 'Inspeksi saluran berjalan baik.'],
                    ['component' => 'Capaian Kinerja', 'criterion' => 'Realisasi Fisik Saluran dan Parapet', 'score' => 12.80, 'max_score' => 15.00, 'weight' => 0.15, 'evaluator_comment' => 'Realisasi 71.3% melampaui target 70.0%.'],
                ],
            ],

            // Evaluasi Internal Bidang Penataan Ruang
            [
                'code' => 'EVAL-TR-2025',
                'title' => 'Evaluasi Kinerja Internal SAKIP Bidang Penataan Ruang Tahun 2025',
                'year' => 2025,
                'organization' => $bidangTR,
                'period' => $pp2025 ?? $pp2026,
                'status' => 'approved',
                'evaluation_status' => 'final',
                'scores' => [
                    ['component' => 'Perencanaan Kinerja', 'criterion' => 'Penyusunan Rencana Rinci Tata Ruang', 'score' => 26.00, 'max_score' => 30.00, 'weight' => 0.30, 'evaluator_comment' => 'Tahapan RDTR terencana rapi.'],
                    ['component' => 'Pengukuran Kinerja', 'criterion' => 'Tingkat Kepatuhan Kesesuaian Ruang', 'score' => 26.20, 'max_score' => 30.00, 'weight' => 0.30, 'evaluator_comment' => 'Verifikasi rekomendasi KKPR tercatat di OSS.'],
                    ['component' => 'Pelaporan Kinerja', 'criterion' => 'Pelaporan Pengawasan Ruang', 'score' => 13.00, 'max_score' => 15.00, 'weight' => 0.15, 'evaluator_comment' => 'Laporan triwulan teratur.'],
                    ['component' => 'Evaluasi Akuntabilitas Internal', 'criterion' => 'Audit Kepatuhan Garis Sempadan', 'score' => 8.60, 'max_score' => 10.00, 'weight' => 0.10, 'evaluator_comment' => 'Patroli pengawasan terlaksana.'],
                    ['component' => 'Capaian Kinerja', 'criterion' => 'Kesesuaian Tata Ruang RTRW', 'score' => 13.00, 'max_score' => 15.00, 'weight' => 0.15, 'evaluator_comment' => 'Tercapai 86.0% (target 85.0%).'],
                ],
            ],
        ];

        foreach ($evalDefinitions as $eDef) {
            $eval = Evaluation::updateOrCreate(
                ['code' => $eDef['code']],
                [
                    'title' => $eDef['title'],
                    'organization_id' => $eDef['organization']->id,
                    'planning_period_id' => $eDef['period']->id,
                    'type' => 'internal',
                    'evaluator_id' => $superAdmin->id,
                    'status' => $eDef['status'],
                    'evaluation_status' => $eDef['evaluation_status'],
                    'started_at' => now()->subMonths(6),
                    'submitted_at' => now()->subMonths(4),
                    'approved_by' => $kadis->id,
                    'approved_at' => now()->subMonths(3),
                ]
            );

            foreach ($eDef['scores'] as $sc) {
                EvaluationScore::updateOrCreate(
                    [
                        'evaluation_id' => $eval->id,
                        'component' => $sc['component'],
                    ],
                    array_merge($sc, ['evaluation_id' => $eval->id])
                );
            }

            // Tambahkan Rekomendasi Resmi untuk Evaluasi 2025
            if ($eDef['code'] === 'EVAL-SAKIP-2025') {
                $recommendations = [
                    [
                        'title' => 'Penyempurnaan Perumusan Indikator Kinerja Output pada Seksi Bina Marga',
                        'description' => 'Disarankan agar satuan ukuran pada sub-kegiatan pemeliharaan jalan menggunakan kilometer efektif untuk memudahkan audit lapangan.',
                        'owner_organization_id' => $bidangBM->id,
                        'priority' => 'high',
                        'status' => 'completed',
                        'due_date' => '2026-03-31',
                        'followup_desc' => 'Telah dilakukan perbaikan indikator sub-kegiatan pada dokumen Renja 2026 dan aplikasi e-SAKIP.',
                    ],
                    [
                        'title' => 'Optimalisasi Pengunggahan Bukti Dukung (Evidence) Digital Sebelum Tutup Buku Triwulan',
                        'description' => 'Pengawas teknis lapangan wajib mengunggah berita acara pemeriksaan fisik dan foto drone selambatnya H+5 setelah akhir triwulan.',
                        'owner_organization_id' => $bidangCK->id,
                        'priority' => 'medium',
                        'status' => 'completed',
                        'due_date' => '2026-04-15',
                        'followup_desc' => 'Diterbitkan SOP Internal Dinas No. 050/SOP-PUPR/2026 mengenai jadwal verifikasi evidence.',
                    ],
                    [
                        'title' => 'Peningkatan Akurasi Pengukuran Reduksi Titik Genangan Air Bidang SDA',
                        'description' => 'Perlu ditambahkan data koordinat geospasial titik rawan banjir sebelum dan sesudah normalisasi alur saluran drainase.',
                        'owner_organization_id' => $bidangSDA->id,
                        'priority' => 'medium',
                        'status' => 'completed',
                        'due_date' => '2026-05-15',
                        'followup_desc' => 'Telah dibuat peta tematik spasial drainase perkotaan terintegrasi dengan WebGIS dinas.',
                    ],
                    [
                        'title' => 'Percepatan Asistensi Rekomendasi KKPR OSS untuk Kemudahan Investasi',
                        'description' => 'Memangkas waktu layanan rekomendasi KKPR dari 14 hari menjadi maksimal 5 hari kerja dengan formulir digital.',
                        'owner_organization_id' => $bidangTR->id,
                        'priority' => 'high',
                        'status' => 'completed',
                        'due_date' => '2026-04-30',
                        'followup_desc' => 'Layanan KKPR berhasil diintegrasikan dengan modul survei spasial mobile.',
                    ],
                    [
                        'title' => 'Penguatan Analisis Kausalitas Keberhasilan dan Efisiensi Anggaran pada Dokumen LKjIP',
                        'description' => 'Laporan LKjIP perlu memperdalam perbandingan rasio serapan kas terhadap output fisik nyata di lapangan.',
                        'owner_organization_id' => $rootOpd->id,
                        'priority' => 'medium',
                        'status' => 'in_progress',
                        'due_date' => '2026-06-30',
                        'followup_desc' => 'Sedang disusun format matriks kausalitas anggaran terintegrasi pada modul pelaporan LKjIP.',
                    ],
                ];

                foreach ($recommendations as $recDef) {
                    $fuDesc = $recDef['followup_desc'];
                    unset($recDef['followup_desc']);

                    $rec = Recommendation::updateOrCreate(
                        [
                            'evaluation_id' => $eval->id,
                            'title' => $recDef['title'],
                        ],
                        array_merge($recDef, [
                            'evaluation_id' => $eval->id,
                            'assigned_to' => $adminOpd->id,
                        ])
                    );

                    Followup::updateOrCreate(
                        ['recommendation_id' => $rec->id],
                        [
                            'description' => $fuDesc,
                            'submitted_by' => $adminOpd->id,
                            'submitted_at' => now()->subDays(20),
                            'status' => $rec->status === 'completed' ? 'verified' : 'submitted',
                            'verified_by' => $kadis->id,
                            'verified_at' => $rec->status === 'completed' ? now()->subDays(10) : null,
                        ]
                    );
                }
            }
        }

        // ══════════════════════════════════════════════════════════════════════
        // 2. PENILAIAN KINERJA ORGANISASI (PKO) PERMENPAN-RB NO. 22/2024
        // ══════════════════════════════════════════════════════════════════════
        $pkoEntities = [
            // OPD Induk (2024, 2025, 2026)
            [
                'org' => $rootOpd,
                'years' => [
                    2024 => [
                        'indicators' => [
                            ['order' => 1, 'sasaran' => 'Meningkatnya Kemantapan Jalan Daerah', 'indikator' => 'Persentase Jalan Mantap', 'satuan' => '%', 'target' => 68.0, 'realisasi' => 69.1, 'capaian_pk' => 101.62, 'normalisasi_capaian' => 100.0, 'koreksi_akip' => 0.0, 'nilai_akhir' => 100.0],
                            ['order' => 2, 'sasaran' => 'Meningkatnya Akses Air Minum Layak', 'indikator' => 'Cakupan Air Minum Perpipaan', 'satuan' => '%', 'target' => 74.0, 'realisasi' => 75.2, 'capaian_pk' => 101.62, 'normalisasi_capaian' => 100.0, 'koreksi_akip' => 0.0, 'nilai_akhir' => 100.0],
                            ['order' => 3, 'sasaran' => 'Pengendalian Banjir Kawasan Perkotaan', 'indikator' => 'Luas Banjir Tertangani', 'satuan' => '%', 'target' => 65.0, 'realisasi' => 66.8, 'capaian_pk' => 102.77, 'normalisasi_capaian' => 100.0, 'koreksi_akip' => 0.0, 'nilai_akhir' => 100.0],
                            ['order' => 4, 'sasaran' => 'Penguatan Akuntabilitas SAKIP', 'indikator' => 'Nilai SAKIP Dinas PUPR', 'satuan' => 'Poin', 'target' => 82.0, 'realisasi' => 82.5, 'capaian_pk' => 100.61, 'normalisasi_capaian' => 100.0, 'koreksi_akip' => 0.0, 'nilai_akhir' => 100.0],
                        ],
                    ],
                    2025 => [
                        'indicators' => [
                            ['order' => 1, 'sasaran' => 'Meningkatnya Kemantapan Jalan Daerah', 'indikator' => 'Persentase Jalan Mantap', 'satuan' => '%', 'target' => 72.5, 'realisasi' => 73.4, 'capaian_pk' => 101.24, 'normalisasi_capaian' => 100.0, 'koreksi_akip' => 0.0, 'nilai_akhir' => 100.0],
                            ['order' => 2, 'sasaran' => 'Meningkatnya Akses Air Minum Layak', 'indikator' => 'Cakupan Air Minum Perpipaan', 'satuan' => '%', 'target' => 78.0, 'realisasi' => 79.1, 'capaian_pk' => 101.41, 'normalisasi_capaian' => 100.0, 'koreksi_akip' => 0.0, 'nilai_akhir' => 100.0],
                            ['order' => 3, 'sasaran' => 'Pengendalian Banjir Kawasan Perkotaan', 'indikator' => 'Luas Banjir Tertangani', 'satuan' => '%', 'target' => 70.0, 'realisasi' => 71.3, 'capaian_pk' => 101.86, 'normalisasi_capaian' => 100.0, 'koreksi_akip' => 0.0, 'nilai_akhir' => 100.0],
                            ['order' => 4, 'sasaran' => 'Kesesuaian Tata Ruang RTRW', 'indikator' => 'Tingkat Kepatuhan Ruang', 'satuan' => '%', 'target' => 85.0, 'realisasi' => 86.0, 'capaian_pk' => 101.18, 'normalisasi_capaian' => 100.0, 'koreksi_akip' => 0.0, 'nilai_akhir' => 100.0],
                            ['order' => 5, 'sasaran' => 'Penguatan Akuntabilitas SAKIP', 'indikator' => 'Nilai SAKIP Dinas PUPR', 'satuan' => 'Poin', 'target' => 85.0, 'realisasi' => 84.8, 'capaian_pk' => 99.76, 'normalisasi_capaian' => 99.76, 'koreksi_akip' => 0.0, 'nilai_akhir' => 99.76],
                        ],
                    ],
                    2026 => [
                        'indicators' => [
                            ['order' => 1, 'sasaran' => 'Meningkatnya Kemantapan Jalan Daerah', 'indikator' => 'Persentase Jalan Mantap', 'satuan' => '%', 'target' => 76.0, 'realisasi' => 75.8, 'capaian_pk' => 99.74, 'normalisasi_capaian' => 99.74, 'koreksi_akip' => 0.0, 'nilai_akhir' => 99.74],
                            ['order' => 2, 'sasaran' => 'Meningkatnya Akses Air Minum Layak', 'indikator' => 'Cakupan Air Minum Perpipaan', 'satuan' => '%', 'target' => 82.0, 'realisasi' => 81.5, 'capaian_pk' => 99.39, 'normalisasi_capaian' => 99.39, 'koreksi_akip' => 0.0, 'nilai_akhir' => 99.39],
                            ['order' => 3, 'sasaran' => 'Pengendalian Banjir Kawasan Perkotaan', 'indikator' => 'Luas Banjir Tertangani', 'satuan' => '%', 'target' => 75.0, 'realisasi' => 74.2, 'capaian_pk' => 98.93, 'normalisasi_capaian' => 98.93, 'koreksi_akip' => 0.0, 'nilai_akhir' => 98.93],
                            ['order' => 4, 'sasaran' => 'Penguatan Akuntabilitas SAKIP', 'indikator' => 'Nilai SAKIP Dinas PUPR', 'satuan' => 'Poin', 'target' => 88.0, 'realisasi' => 87.2, 'capaian_pk' => 99.09, 'normalisasi_capaian' => 99.09, 'koreksi_akip' => 0.0, 'nilai_akhir' => 99.09],
                        ],
                    ],
                ],
            ],

            // Bidang Bina Marga
            [
                'org' => $bidangBM,
                'years' => [
                    2025 => [
                        'indicators' => [
                            ['order' => 1, 'sasaran' => 'Kemantapan Jalan Kabupaten', 'indikator' => 'Persentase Jalan Mantap', 'satuan' => '%', 'target' => 72.5, 'realisasi' => 73.4, 'capaian_pk' => 101.24, 'normalisasi_capaian' => 100.0, 'koreksi_akip' => 0.0, 'nilai_akhir' => 100.0],
                            ['order' => 2, 'sasaran' => 'Panjang Jalan Selesai Ditingkatkan', 'indikator' => 'Panjang Jalan Rekonstruksi', 'satuan' => 'km', 'target' => 32.0, 'realisasi' => 33.5, 'capaian_pk' => 104.69, 'normalisasi_capaian' => 100.0, 'koreksi_akip' => 0.0, 'nilai_akhir' => 100.0],
                        ],
                    ],
                    2026 => [
                        'indicators' => [
                            ['order' => 1, 'sasaran' => 'Kemantapan Jalan Kabupaten', 'indikator' => 'Persentase Jalan Mantap', 'satuan' => '%', 'target' => 76.0, 'realisasi' => 75.8, 'capaian_pk' => 99.74, 'normalisasi_capaian' => 99.74, 'koreksi_akip' => 0.0, 'nilai_akhir' => 99.74],
                            ['order' => 2, 'sasaran' => 'Peningkatan Jalan Antar Distrik', 'indikator' => 'Panjang Jalan Ditingkatkan', 'satuan' => 'km', 'target' => 40.0, 'realisasi' => 38.5, 'capaian_pk' => 96.25, 'normalisasi_capaian' => 96.25, 'koreksi_akip' => 0.0, 'nilai_akhir' => 96.25],
                        ],
                    ],
                ],
            ],

            // Bidang Cipta Karya
            [
                'org' => $bidangCK,
                'years' => [
                    2025 => [
                        'indicators' => [
                            ['order' => 1, 'sasaran' => 'Akses Air Minum Aman', 'indikator' => 'Cakupan Air Minum Perpipaan', 'satuan' => '%', 'target' => 78.0, 'realisasi' => 79.1, 'capaian_pk' => 101.41, 'normalisasi_capaian' => 100.0, 'koreksi_akip' => 0.0, 'nilai_akhir' => 100.0],
                            ['order' => 2, 'sasaran' => 'Penyediaan Sarana Air Bersih', 'indikator' => 'Sambungan Rumah Baru', 'satuan' => 'SR', 'target' => 1200, 'realisasi' => 1250, 'capaian_pk' => 104.17, 'normalisasi_capaian' => 100.0, 'koreksi_akip' => 0.0, 'nilai_akhir' => 100.0],
                        ],
                    ],
                    2026 => [
                        'indicators' => [
                            ['order' => 1, 'sasaran' => 'Akses Air Minum Aman', 'indikator' => 'Cakupan Air Minum Perpipaan', 'satuan' => '%', 'target' => 82.0, 'realisasi' => 81.5, 'capaian_pk' => 99.39, 'normalisasi_capaian' => 99.39, 'koreksi_akip' => 0.0, 'nilai_akhir' => 99.39],
                            ['order' => 2, 'sasaran' => 'Penyediaan Sarana Air Bersih', 'indikator' => 'Sambungan Rumah Baru', 'satuan' => 'SR', 'target' => 1500, 'realisasi' => 1480, 'capaian_pk' => 98.67, 'normalisasi_capaian' => 98.67, 'koreksi_akip' => 0.0, 'nilai_akhir' => 98.67],
                        ],
                    ],
                ],
            ],

            // Bidang Sumber Daya Air
            [
                'org' => $bidangSDA,
                'years' => [
                    2025 => [
                        'indicators' => [
                            ['order' => 1, 'sasaran' => 'Pengendalian Banjir Kota', 'indikator' => 'Luas Rawan Banjir Tertangani', 'satuan' => '%', 'target' => 70.0, 'realisasi' => 71.3, 'capaian_pk' => 101.86, 'normalisasi_capaian' => 100.0, 'koreksi_akip' => 0.0, 'nilai_akhir' => 100.0],
                        ],
                    ],
                    2026 => [
                        'indicators' => [
                            ['order' => 1, 'sasaran' => 'Pengendalian Banjir Kota', 'indikator' => 'Luas Rawan Banjir Tertangani', 'satuan' => '%', 'target' => 75.0, 'realisasi' => 74.2, 'capaian_pk' => 98.93, 'normalisasi_capaian' => 98.93, 'koreksi_akip' => 0.0, 'nilai_akhir' => 98.93],
                        ],
                    ],
                ],
            ],

            // Bidang Penataan Ruang
            [
                'org' => $bidangTR,
                'years' => [
                    2025 => [
                        'indicators' => [
                            ['order' => 1, 'sasaran' => 'Tertib Zonasi RTRW', 'indikator' => 'Kesesuaian Pemanfaatan Ruang', 'satuan' => '%', 'target' => 85.0, 'realisasi' => 86.0, 'capaian_pk' => 101.18, 'normalisasi_capaian' => 100.0, 'koreksi_akip' => 0.0, 'nilai_akhir' => 100.0],
                        ],
                    ],
                    2026 => [
                        'indicators' => [
                            ['order' => 1, 'sasaran' => 'Tertib Zonasi RTRW', 'indikator' => 'Kesesuaian Pemanfaatan Ruang', 'satuan' => '%', 'target' => 90.0, 'realisasi' => 89.4, 'capaian_pk' => 99.33, 'normalisasi_capaian' => 99.33, 'koreksi_akip' => 0.0, 'nilai_akhir' => 99.33],
                        ],
                    ],
                ],
            ],

            // UPTD PUPR
            [
                'org' => $uptd,
                'years' => [
                    2025 => [
                        'indicators' => [
                            ['order' => 1, 'sasaran' => 'Kesiapan Operasional Alat & Lab', 'indikator' => 'Tingkat Kesiapan Alat dan Uji Lab', 'satuan' => '%', 'target' => 92.0, 'realisasi' => 93.0, 'capaian_pk' => 101.09, 'normalisasi_capaian' => 100.0, 'koreksi_akip' => 0.0, 'nilai_akhir' => 100.0],
                        ],
                    ],
                    2026 => [
                        'indicators' => [
                            ['order' => 1, 'sasaran' => 'Kesiapan Operasional Alat & Lab', 'indikator' => 'Tingkat Kesiapan Alat dan Uji Lab', 'satuan' => '%', 'target' => 95.0, 'realisasi' => 94.5, 'capaian_pk' => 99.47, 'normalisasi_capaian' => 99.47, 'koreksi_akip' => 0.0, 'nilai_akhir' => 99.47],
                        ],
                    ],
                ],
            ],

            // Sekretariat Dinas
            [
                'org' => $sekretariat,
                'years' => [
                    2025 => [
                        'indicators' => [
                            ['order' => 1, 'sasaran' => 'Akuntabilitas SAKIP Dinas', 'indikator' => 'Nilai SAKIP Dinas PUPR', 'satuan' => 'Poin', 'target' => 85.0, 'realisasi' => 84.8, 'capaian_pk' => 99.76, 'normalisasi_capaian' => 99.76, 'koreksi_akip' => 0.0, 'nilai_akhir' => 99.76],
                        ],
                    ],
                    2026 => [
                        'indicators' => [
                            ['order' => 1, 'sasaran' => 'Akuntabilitas SAKIP Dinas', 'indikator' => 'Nilai SAKIP Dinas PUPR', 'satuan' => 'Poin', 'target' => 88.0, 'realisasi' => 87.2, 'capaian_pk' => 99.09, 'normalisasi_capaian' => 99.09, 'koreksi_akip' => 0.0, 'nilai_akhir' => 99.09],
                        ],
                    ],
                ],
            ],
        ];

        foreach ($pkoEntities as $pkoItem) {
            $org = $pkoItem['org'];
            $yearsData = $pkoItem['years'];

            foreach ($yearsData as $yr => $data) {
                $pko = PkoEvaluation::updateOrCreate(
                    [
                        'year' => $yr,
                        'organization_id' => $org->id,
                    ],
                    [
                        'year' => $yr,
                        'organization_id' => $org->id,
                        'status' => $yr <= 2025 ? 'final' : 'draft',
                    ]
                );

                foreach ($data['indicators'] as $ind) {
                    PkoIndicator::updateOrCreate(
                        [
                            'pko_evaluation_id' => $pko->id,
                            'order' => $ind['order'],
                        ],
                        array_merge($ind, ['pko_evaluation_id' => $pko->id])
                    );
                }

                // Hitung skor total dan predikat resmi
                $pko->recalculateSummary();
            }
        }
    }
}
