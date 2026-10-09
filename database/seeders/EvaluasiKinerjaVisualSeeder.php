<?php

namespace Database\Seeders;

use App\Models\Evaluation;
use App\Models\EvaluationScore;
use App\Models\Organization;
use App\Models\PkoEvaluation;
use App\Models\PkoIndicator;
use App\Models\PlanningPeriod;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

class EvaluasiKinerjaVisualSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Pastikan Planning Period 2025 ada
        $period2025 = PlanningPeriod::firstOrCreate(
            ['year' => 2025],
            [
                'code' => 'TA-2025',
                'name' => 'Tahun Anggaran 2025',
                'start_year' => 2025,
                'end_year' => 2025,
            ]
        );

        // Dummy LHE file
        Storage::disk('public')->put('lhe/sample-lhe-2025.pdf', '%PDF-1.4 sample LHE document content for evaluation SAKIP');

        // Bersihkan data sampah / soft-deleted evaluations agar tidak memicu unique violation
        Evaluation::onlyTrashed()->where('code', 'like', 'EVAL-%-2025')->forceDelete();

        // 2. SAKIP Pemerintah Daerah (Provinsi Papua Barat - ID 1)
        $pemda = Organization::where('type', 'province')->first() ?? Organization::find(1);
        if ($pemda) {
            $evalPemda = Evaluation::withTrashed()->firstOrNew(['code' => 'EVAL-PEMDA-2025']);
            $evalPemda->fill([
                'organization_id' => $pemda->id,
                'planning_period_id' => $period2025->id,
                'type' => 'annual',
                'title' => 'Evaluasi SAKIP Pemerintah Provinsi Papua Barat TA 2025',
                'status' => 'approved',
                'evaluation_status' => 'Final',
                'lhe_file_path' => 'lhe/sample-lhe-2025.pdf',
                'started_at' => '2025-01-10 08:00:00',
                'submitted_at' => '2025-02-15 10:00:00',
                'approved_at' => '2025-02-20 14:00:00',
            ]);
            if ($evalPemda->exists && $evalPemda->trashed()) {
                $evalPemda->restore();
            }
            $evalPemda->save();

            $pemdaScores = [
                ['component' => 'Perencanaan Kinerja', 'score' => 26.50, 'max_score' => 30, 'weight' => 0.30],
                ['component' => 'Pengukuran Kinerja',  'score' => 25.50, 'max_score' => 30, 'weight' => 0.30],
                ['component' => 'Pelaporan Kinerja',   'score' => 13.00, 'max_score' => 15, 'weight' => 0.15],
                ['component' => 'Evaluasi Internal',   'score' => 21.00, 'max_score' => 25, 'weight' => 0.25],
            ];

            foreach ($pemdaScores as $sc) {
                EvaluationScore::updateOrCreate(
                    ['evaluation_id' => $evalPemda->id, 'component' => $sc['component']],
                    [
                        'criterion' => $sc['component'],
                        'score' => $sc['score'],
                        'max_score' => $sc['max_score'],
                        'weight' => $sc['weight'],
                        'evaluator_comment' => 'Penilaian evaluasi akuntabilitas kinerja internal pemerintah daerah.',
                    ]
                );
            }
        }

        // 3. SAKIP OPD (Tahun 2025) - 100% Sesuai Gambar
        $opdBaseline = [
            'BAPPEDA-PB' => ['perencanaan' => 26.50, 'pengukuran' => 25.50, 'pelaporan' => 13.00, 'evaluasi' => 21.50], // 86.50 (BAIK)
            'INSP-PB' => ['perencanaan' => 25.50, 'pengukuran' => 25.00, 'pelaporan' => 13.00, 'evaluasi' => 20.50], // 84.00 (BAIK)
            'DISDIK-PB' => ['perencanaan' => 24.50, 'pengukuran' => 25.00, 'pelaporan' => 12.50, 'evaluasi' => 19.50], // 81.50 (BAIK) - 100% Sesuai Screenshot
            'DINKES-PB' => ['perencanaan' => 24.50, 'pengukuran' => 24.50, 'pelaporan' => 12.50, 'evaluasi' => 19.00], // 80.50 (BAIK)
            'PUPR-PB' => ['perencanaan' => 24.00, 'pengukuran' => 24.00, 'pelaporan' => 12.00, 'evaluasi' => 19.00], // 79.00 (BUTUH PERBAIKAN)
            'KOMINFO-PB' => ['perencanaan' => 23.50, 'pengukuran' => 24.00, 'pelaporan' => 12.00, 'evaluasi' => 18.50], // 78.00 (BUTUH PERBAIKAN)
            'DISHUB-PB' => ['perencanaan' => 23.00, 'pengukuran' => 23.50, 'pelaporan' => 11.50, 'evaluasi' => 18.00], // 76.00 (BUTUH PERBAIKAN)
            'DINSOS-PB' => ['perencanaan' => 22.50, 'pengukuran' => 23.00, 'pelaporan' => 11.50, 'evaluasi' => 18.00], // 75.00 (BUTUH PERBAIKAN)
            'DPMPTSP-PB' => ['perencanaan' => 22.00, 'pengukuran' => 22.50, 'pelaporan' => 11.00, 'evaluasi' => 17.50], // 73.00 (BUTUH PERBAIKAN)
            'BIRO-ORG-PB' => ['perencanaan' => 21.50, 'pengukuran' => 22.00, 'pelaporan' => 11.00, 'evaluasi' => 17.00], // 71.50 (BUTUH PERBAIKAN)
            'DISKOP-PB' => ['perencanaan' => 20.00, 'pengukuran' => 20.50, 'pelaporan' => 10.00, 'evaluasi' => 15.50], // 66.00 (BUTUH PERBAIKAN)
            'SATPOL-PB' => ['perencanaan' => 16.00, 'pengukuran' => 16.50, 'pelaporan' => 8.00,  'evaluasi' => 13.00], // 53.50 (KURANG)
        ];

        foreach ($opdBaseline as $code => $scores) {
            $opd = Organization::where('code', $code)->first();
            if (! $opd) {
                continue;
            }

            $evalOpd = Evaluation::withTrashed()->firstOrNew(['code' => 'EVAL-'.$code.'-2025']);
            $evalOpd->fill([
                'organization_id' => $opd->id,
                'planning_period_id' => $period2025->id,
                'type' => 'annual',
                'title' => 'Evaluasi SAKIP '.$opd->name.' TA 2025',
                'status' => 'approved',
                'evaluation_status' => 'Final',
                'lhe_file_path' => 'lhe/sample-lhe-2025.pdf',
                'started_at' => '2025-01-10 08:00:00',
                'submitted_at' => '2025-02-15 10:00:00',
                'approved_at' => '2025-02-20 14:00:00',
            ]);
            if ($evalOpd->exists && $evalOpd->trashed()) {
                $evalOpd->restore();
            }
            $evalOpd->save();

            $components = [
                ['component' => 'Perencanaan Kinerja', 'score' => $scores['perencanaan'], 'max_score' => 30, 'weight' => 0.30],
                ['component' => 'Pengukuran Kinerja',  'score' => $scores['pengukuran'],  'max_score' => 30, 'weight' => 0.30],
                ['component' => 'Pelaporan Kinerja',   'score' => $scores['pelaporan'],   'max_score' => 15, 'weight' => 0.15],
                ['component' => 'Evaluasi Internal',   'score' => $scores['evaluasi'],    'max_score' => 25, 'weight' => 0.25],
            ];

            foreach ($components as $c) {
                EvaluationScore::updateOrCreate(
                    ['evaluation_id' => $evalOpd->id, 'component' => $c['component']],
                    [
                        'criterion' => $c['component'],
                        'score' => $c['score'],
                        'max_score' => $c['max_score'],
                        'weight' => $c['weight'],
                        'evaluator_comment' => 'Penilaian evaluasi akuntabilitas kinerja OPD.',
                    ]
                );
            }
        }

        // 3B. SAKIP Pemerintah Daerah & OPD (Tahun Anggaran 2026)
        $period2026 = PlanningPeriod::firstOrCreate(
            ['year' => 2026],
            [
                'code' => 'TA-2026',
                'name' => 'Tahun Anggaran 2026',
                'start_year' => 2026,
                'end_year' => 2026,
                'status' => 'active',
            ]
        );

        if ($pemda) {
            $evalPemda2026 = Evaluation::withTrashed()->firstOrNew(['code' => 'EVAL-PEMDA-2026']);
            $evalPemda2026->fill([
                'organization_id' => $pemda->id,
                'planning_period_id' => $period2026->id,
                'type' => 'annual',
                'title' => 'Evaluasi SAKIP Pemerintah Provinsi Papua Barat TA 2026',
                'status' => 'approved',
                'evaluation_status' => 'Final',
                'lhe_file_path' => 'lhe/sample-lhe-2025.pdf',
                'started_at' => '2026-01-10 08:00:00',
                'submitted_at' => '2026-02-15 10:00:00',
                'approved_at' => '2026-02-20 14:00:00',
            ]);
            if ($evalPemda2026->exists && $evalPemda2026->trashed()) {
                $evalPemda2026->restore();
            }
            $evalPemda2026->save();

            $pemdaScores2026 = [
                ['component' => 'Perencanaan Kinerja', 'score' => 26.50, 'max_score' => 30, 'weight' => 0.30],
                ['component' => 'Pengukuran Kinerja',  'score' => 25.50, 'max_score' => 30, 'weight' => 0.30],
                ['component' => 'Pelaporan Kinerja',   'score' => 13.00, 'max_score' => 15, 'weight' => 0.15],
                ['component' => 'Evaluasi Internal',   'score' => 21.00, 'max_score' => 25, 'weight' => 0.25],
            ];

            foreach ($pemdaScores2026 as $sc) {
                EvaluationScore::updateOrCreate(
                    ['evaluation_id' => $evalPemda2026->id, 'component' => $sc['component']],
                    [
                        'criterion' => $sc['component'],
                        'score' => $sc['score'],
                        'max_score' => $sc['max_score'],
                        'weight' => $sc['weight'],
                        'evaluator_comment' => 'Penilaian evaluasi akuntabilitas kinerja internal pemerintah daerah TA 2026.',
                    ]
                );
            }
        }

        foreach ($opdBaseline as $code => $scores) {
            $opd = Organization::where('code', $code)->first();
            if (! $opd) {
                continue;
            }

            $evalOpd2026 = Evaluation::withTrashed()->firstOrNew(['code' => 'EVAL-'.$code.'-2026']);
            $evalOpd2026->fill([
                'organization_id' => $opd->id,
                'planning_period_id' => $period2026->id,
                'type' => 'annual',
                'title' => 'Evaluasi SAKIP '.$opd->name.' TA 2026',
                'status' => 'approved',
                'evaluation_status' => 'Final',
                'lhe_file_path' => 'lhe/sample-lhe-2025.pdf',
                'started_at' => '2026-01-10 08:00:00',
                'submitted_at' => '2026-02-15 10:00:00',
                'approved_at' => '2026-02-20 14:00:00',
            ]);
            if ($evalOpd2026->exists && $evalOpd2026->trashed()) {
                $evalOpd2026->restore();
            }
            $evalOpd2026->save();

            $components = [
                ['component' => 'Perencanaan Kinerja', 'score' => $scores['perencanaan'], 'max_score' => 30, 'weight' => 0.30],
                ['component' => 'Pengukuran Kinerja',  'score' => $scores['pengukuran'],  'max_score' => 30, 'weight' => 0.30],
                ['component' => 'Pelaporan Kinerja',   'score' => $scores['pelaporan'],   'max_score' => 15, 'weight' => 0.15],
                ['component' => 'Evaluasi Internal',   'score' => $scores['evaluasi'],    'max_score' => 25, 'weight' => 0.25],
            ];

            foreach ($components as $c) {
                EvaluationScore::updateOrCreate(
                    ['evaluation_id' => $evalOpd2026->id, 'component' => $c['component']],
                    [
                        'criterion' => $c['component'],
                        'score' => $c['score'],
                        'max_score' => $c['max_score'],
                        'weight' => $c['weight'],
                        'evaluator_comment' => 'Penilaian evaluasi akuntabilitas kinerja OPD TA 2026.',
                    ]
                );
            }
        }

        // 4. PKO PEMERINTAH DAERAH (Tahun 2025) - 100% Sesuai Gambar
        if ($pemda) {
            $pkoPemda = PkoEvaluation::updateOrCreate(
                [
                    'year' => 2025,
                    'organization_id' => $pemda->id,
                ],
                [
                    'total_capaian_pk' => -13.76,
                    'nko' => -4.59,
                    'predikat' => 'D',
                    'status' => 'Final',
                ]
            );

            // Bersihkan indikator lama jika ada
            PkoIndicator::where('pko_evaluation_id', $pkoPemda->id)->delete();

            $pkoItems = [
                [
                    'order' => 1,
                    'sasaran' => 'Meningkatnya nilai investasi daerah',
                    'indikator' => 'Persentase peningkatan investasi di Kabupaten Mimika',
                    'satuan' => 'Persen',
                    'target' => 5.00,
                    'realisasi' => -11.86,
                    'capaian_pk' => -237.20,
                    'normalisasi_capaian' => -237.20,
                    'koreksi_akip' => 20.00,
                    'nilai_akhir' => -189.76,
                ],
                [
                    'order' => 2,
                    'sasaran' => 'Meningkatnya kinerja tata kelola penanaman modal',
                    'indikator' => 'Nilai Realisasi Investasi PMA dan PMDN',
                    'satuan' => 'Rp Triliun',
                    'target' => 2.46,
                    'realisasi' => 28.32,
                    'capaian_pk' => 1151.22,
                    'normalisasi_capaian' => 110.00,
                    'koreksi_akip' => 20.00,
                    'nilai_akhir' => 88.00,
                ],
                [
                    'order' => 3,
                    'sasaran' => 'Meningkatnya kinerja tata kelola penanaman modal',
                    'indikator' => 'Realisasi total terhadap target investasi',
                    'satuan' => 'Persen',
                    'target' => 100.00,
                    'realisasi' => 1151.00,
                    'capaian_pk' => 1151.00,
                    'normalisasi_capaian' => 110.00,
                    'koreksi_akip' => 20.00,
                    'nilai_akhir' => 88.00,
                ],
            ];

            foreach ($pkoItems as $item) {
                PkoIndicator::create([
                    'pko_evaluation_id' => $pkoPemda->id,
                    ...$item,
                ]);
            }

            // 4B. PKO PEMERINTAH DAERAH (Tahun 2026) - Berbasis IKU Utama Pemprov Papua Barat
            $pkoPemda2026 = PkoEvaluation::updateOrCreate(
                [
                    'year' => 2026,
                    'organization_id' => $pemda->id,
                ],
                [
                    'total_capaian_pk' => 486.80,
                    'nko' => 97.36,
                    'predikat' => 'AA',
                    'status' => 'Final',
                ]
            );

            PkoIndicator::where('pko_evaluation_id', $pkoPemda2026->id)->delete();
            $pkoItems2026 = [
                [
                    'order' => 1,
                    'sasaran' => 'Meningkatnya pertumbuhan ekonomi dan pemerataan pendapatan masyarakat',
                    'indikator' => 'Laju Pertumbuhan Ekonomi Non-Migas Daerah',
                    'satuan' => 'Persen',
                    'target' => 4.80,
                    'realisasi' => 4.60,
                    'capaian_pk' => 95.83,
                    'normalisasi_capaian' => 95.83,
                    'koreksi_akip' => 0.00,
                    'nilai_akhir' => 95.83,
                ],
                [
                    'order' => 2,
                    'sasaran' => 'Meningkatnya kualitas sumber daya manusia dan daya saing daerah',
                    'indikator' => 'Indeks Pembangunan Manusia (IPM)',
                    'satuan' => 'Poin',
                    'target' => 70.00,
                    'realisasi' => 68.20,
                    'capaian_pk' => 97.43,
                    'normalisasi_capaian' => 97.43,
                    'koreksi_akip' => 0.00,
                    'nilai_akhir' => 97.43,
                ],
                [
                    'order' => 3,
                    'sasaran' => 'Menurunnya tingkat kemiskinan masyarakat di Papua Barat',
                    'indikator' => 'Persentase Penduduk Miskin Daerah',
                    'satuan' => 'Persen',
                    'target' => 21.00,
                    'realisasi' => 20.50,
                    'capaian_pk' => 97.62,
                    'normalisasi_capaian' => 97.62,
                    'koreksi_akip' => 0.00,
                    'nilai_akhir' => 97.62,
                ],
                [
                    'order' => 4,
                    'sasaran' => 'Meningkatnya akuntabilitas tata kelola pemerintahan daerah',
                    'indikator' => 'Nilai Akuntabilitas Kinerja Instansi Pemerintah (SAKIP) Provinsi',
                    'satuan' => 'Nilai',
                    'target' => 85.00,
                    'realisasi' => 86.00,
                    'capaian_pk' => 101.18,
                    'normalisasi_capaian' => 101.18,
                    'koreksi_akip' => 0.00,
                    'nilai_akhir' => 101.18,
                ],
                [
                    'order' => 5,
                    'sasaran' => 'Meningkatnya kualitas pelayanan publik dan kemudahan berusaha',
                    'indikator' => 'Persentase Izin Usaha Terbit Tepat Waktu',
                    'satuan' => 'Persen',
                    'target' => 95.00,
                    'realisasi' => 90.00,
                    'capaian_pk' => 94.74,
                    'normalisasi_capaian' => 94.74,
                    'koreksi_akip' => 0.00,
                    'nilai_akhir' => 94.74,
                ],
            ];

            foreach ($pkoItems2026 as $item) {
                PkoIndicator::create([
                    'pko_evaluation_id' => $pkoPemda2026->id,
                    ...$item,
                ]);
            }
            $pkoPemda2026->recalculateSummary();
        }

        // 5. PKO PERANGKAT DAERAH (Tahun 2025)
        // Contoh OPD utama: DPMPTSP (Dinas Penanaman Modal dan PTSP) & Bappeda
        $dpmptsp = Organization::where('code', 'DPMPTSP-PB')->first();
        if ($dpmptsp) {
            $pkoOpd = PkoEvaluation::updateOrCreate(
                [
                    'year' => 2025,
                    'organization_id' => $dpmptsp->id,
                ],
                [
                    'total_capaian_pk' => -13.76,
                    'nko' => -4.59,
                    'predikat' => 'D',
                    'status' => 'Final',
                ]
            );

            PkoIndicator::where('pko_evaluation_id', $pkoOpd->id)->delete();
            foreach ($pkoItems as $item) {
                PkoIndicator::create([
                    'pko_evaluation_id' => $pkoOpd->id,
                    ...$item,
                ]);
            }
        }

        $bappeda = Organization::where('code', 'BAPPEDA-PB')->first();
        if ($bappeda) {
            $pkoBappeda = PkoEvaluation::updateOrCreate(
                [
                    'year' => 2025,
                    'organization_id' => $bappeda->id,
                ],
                [
                    'total_capaian_pk' => 100.00,
                    'nko' => 100.00,
                    'predikat' => 'AA',
                    'status' => 'Final',
                ]
            );

            PkoIndicator::where('pko_evaluation_id', $pkoBappeda->id)->delete();
            PkoIndicator::create([
                'pko_evaluation_id' => $pkoBappeda->id,
                'order' => 1,
                'sasaran' => 'Meningkatnya kualitas dokumen perencanaan pembangunan daerah',
                'indikator' => 'Persentase keselarasan RKPD dengan RPJMD',
                'satuan' => 'Persen',
                'target' => 100.00,
                'realisasi' => 100.00,
                'capaian_pk' => 100.00,
                'normalisasi_capaian' => 100.00,
                'koreksi_akip' => 0.00,
                'nilai_akhir' => 100.00,
            ]);
        }
    }
}
