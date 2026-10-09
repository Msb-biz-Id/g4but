<?php

namespace App\Services\Ai;

use App\Contracts\AiProvider;
use App\Services\AchievementCalculator;
use App\Services\AuthorizationService;
use App\Services\OpdAnalyticsService;
use App\Services\TrendPredictor;

/**
 * Provider AI Mandiri Berbasis Aturan & Agregasi Faktual (AIG-009).
 * Deterministik, akurat, objektif, bebas halusinasi, dan bebas emoji.
 */
class MockAiProvider implements AiProvider
{
    public function name(): string
    {
        return 'mock';
    }

    public function generate(string $feature, string $prompt, array $context): array
    {
        $output = match ($feature) {
            'executive_summary' => $this->executiveSummary($context),
            'insight' => $this->insight($context),
            'prediction' => $this->prediction($context),
            'recommendation' => $this->recommendation($context),
            'opd_status' => $this->opdStatus($context),
            default => $this->chat($prompt, $context),
        };

        return ['output' => $output];
    }

    /**
     * Fitur 1: Executive Summary
     */
    private function executiveSummary(array $context): string
    {
        $scope = $context['scope'] ?? 'Perangkat Daerah';
        $period = $context['period'] ?? 'Tahun Anggaran Berjalan';
        $totalOpd = $context['total_opd'] ?? 10;
        $totalDocs = $context['total_docs'] ?? 0;
        $availDocs = $context['available_docs'] ?? 0;
        $serapan = $context['serapan_anggaran'] ?? 0.0;
        $good = $context['good_count'] ?? 0;
        $warn = $context['warning_count'] ?? 0;
        $crit = $context['critical_count'] ?? 0;
        $problems = $context['problems'] ?? [];

        $perhatian = [];
        if (! empty($problems)) {
            foreach (array_slice($problems, 0, 3) as $prob) {
                $perhatian[] = [
                    'indikator_id' => $prob['indicator_id'] ?? null,
                    'catatan' => ($prob['indicator'] ?? 'Indikator').' ('.($prob['organization'] ?? '-').'): Status '.($prob['status'] ?? 'Kritis').'.',
                ];
            }
        } else {
            $perhatian[] = [
                'indikator_id' => null,
                'catatan' => 'Sebagian besar target kinerja triwulan masih dalam proses pelaporan dan verifikasi data capaian.',
            ];
        }

        $rekomendasi = [];
        $rekomendasi[] = [
            'indikator_id' => null,
            'tindakan' => 'Melakukan percepatan pengisian bukti dukung dan pengesahan realisasi triwulan pada modul Pengukuran Kinerja.',
        ];
        $rekomendasi[] = [
            'indikator_id' => null,
            'tindakan' => 'Mengoptimalkan serapan belanja program prioritas daerah sesuai target kas triwulan.',
        ];
        $rekomendasi[] = [
            'indikator_id' => null,
            'tindakan' => 'Memastikan seluruh dokumen perencanaan (Renstra, Renja, Perjanjian Kinerja) telah terunggah lengkap.',
        ];

        $critNote = '';
        if (! empty($problems) && isset($problems[0]['achievement'])) {
            $critNote = 'Terdapat indikator prioritas dengan capaian '.number_format((float) $problems[0]['achievement'], 2).'% yang memerlukan perhatian segera. ';
        }

        $ringkasan = sprintf(
            'Laporan Akuntabilitas Kinerja untuk %s pada %s mencakup %d Perangkat Daerah. '.
            'Pada aspek perencanaan, kelengkapan berkas fisik SAKIP tercatat %d dari %d dokumen (%s%%). '.
            'Pada aspek keuangan, serapan APBD triwulan berada pada level %s%%. '.
            'Pada rencana aksi fisik, tercatat %d OPD berstatus On Track, %d Perlu Perhatian, dan %d Kritis. '.
            '%s'.
            'Evaluasi ini disajikan secara objektif sebagai dasar perbaikan tata kelola pemerintahan daerah.',
            $scope,
            $period,
            $totalOpd,
            $availDocs,
            $totalDocs,
            $totalDocs > 0 ? round(($availDocs / $totalDocs) * 100, 1) : 0,
            number_format((float) $serapan, 1),
            $good,
            $warn,
            $crit,
            $critNote
        );

        return json_encode([
            'ringkasan' => $ringkasan,
            'perhatian' => $perhatian,
            'rekomendasi' => $rekomendasi,
        ], JSON_UNESCAPED_UNICODE);
    }

    /**
     * Fitur 2: Analisis Insight Kinerja
     */
    private function insight(array $context): string
    {
        $scope = $context['scope'] ?? 'Perangkat Daerah';
        $insights = $context['insights'] ?? [];

        $lines = [];
        $lines[] = "Analisis Insight Kinerja — {$scope}";
        $lines[] = '--------------------------------------------------';
        $lines[] = 'Berdasarkan audit data komparatif pada database sistem e-KASUARI:';
        $lines[] = '';

        if (! empty($insights)) {
            foreach ($insights as $idx => $ins) {
                $lines[] = ($idx + 1).". {$ins}";
            }
        } else {
            $lines[] = '1. Tidak terdeteksi anomali signifikan pada data pelaporan kinerja.';
            $lines[] = '2. Konsistensi pelaporan dokumen perencanaan terpantau berjalan sesuai tahapan siklus SAKIP.';
        }

        $lines[] = '';
        $lines[] = 'Kesimpulan Analisis:';
        $lines[] = 'Perlu penguatan monitoring berkala terhadap kesesuaian antara progres fisik di lapangan dengan serapan anggaran keuangan.';

        return implode("\n", $lines);
    }

    /**
     * Fitur 3: Prediksi Capaian Akhir Tahun (AI Prediction)
     */
    private function prediction(array $context): string
    {
        $scope = $context['scope'] ?? 'Perangkat Daerah';
        $year = $context['year'] ?? date('Y');
        $serapanSekarang = $context['current_serapan'] ?? 0.0;
        $proyeksiSerapan = $context['projected_serapan'] ?? 0.0;
        $probabilitas = $context['probabilitas_sukses'] ?? 'Sedang';
        $rekomendasi = $context['rekomendasi_akselerasi'] ?? 'Percepat realisasi program pada triwulan berikutnya.';

        $lines = [];
        $lines[] = "Prediksi Capaian Kinerja & Realisasi Akhir Tahun {$year} — {$scope}";
        $lines[] = '--------------------------------------------------';
        $lines[] = '1. Proyeksi Serapan APBD:';
        $lines[] = '   - Posisi Realisasi Saat Ini: '.number_format((float) $serapanSekarang, 1).'%';
        $lines[] = '   - Estimasi Akhir Tahun (Model Regresi): '.number_format((float) $proyeksiSerapan, 1).'%';
        $lines[] = '   - Probabilitas Ketercapaian Target Penuh: Kategori '.$probabilitas;
        $lines[] = '';
        $lines[] = '2. Proyeksi Ketercapaian Target IKU & Rencana Aksi:';
        $lines[] = '   - Indikator dengan polaritas positif diproyeksikan memenuhi ambang batas aman (>= 85%) jika percepatan verifikasi dilakukan sebelum penutupan triwulan IV.';
        $lines[] = '   - Area yang berpotensi meleset adalah program belanja modal dengan masa pengadaan yang panjang.';
        $lines[] = '';
        $lines[] = '3. Langkah Strategis Akselerasi:';
        $lines[] = '   - '.$rekomendasi;
        $lines[] = '   - Lakukan rapat koordinasi evaluasi pengendalian program bersama seluruh Kepala Perangkat Daerah.';

        return implode("\n", $lines);
    }

    /**
     * Fitur 4: Rekomendasi Tindak Lanjut
     */
    private function recommendation(array $context): string
    {
        $scope = $context['scope'] ?? 'Perangkat Daerah';

        $lines = [];
        $lines[] = "Rekomendasi Tindak Lanjut Penguatan SAKIP — {$scope}";
        $lines[] = '--------------------------------------------------';
        $lines[] = '1. Pilar Perencanaan Kinerja:';
        $lines[] = '   - Pastikan Cascading Pohon Kinerja (Renstra hingga Perjanjian Kinerja) telah disahkan dan terunggah pada sistem.';
        $lines[] = '   - Segera lengkapi SK Penetapan IKU dan Dokumen Rencana Aksi tahun berjalan.';
        $lines[] = '';
        $lines[] = '2. Pilar Pengukuran Kinerja:';
        $lines[] = '   - Lakukan verifikasi berjenjang terhadap angka realisasi indikator triwulanan.';
        $lines[] = '   - Wajib melampirkan eviden berkas digital yang sah untuk setiap capaian yang dilaporkan.';
        $lines[] = '';
        $lines[] = '3. Pilar Evaluasi Akuntabilitas (PermenPANRB No. 88/2021):';
        $lines[] = '   - Susun Laporan Kinerja Instansi Pemerintah (LKjIP) secara tepat waktu.';
        $lines[] = '   - Tindak lanjuti Lembar Hasil Evaluasi (LHE) Inspektorat dan KemenPANRB tahun sebelumnya.';

        return implode("\n", $lines);
    }

    /**
     * Fitur 5: Status Kinerja per OPD
     */
    private function opdStatus(array $context): string
    {
        $scope = $context['scope'] ?? 'Perangkat Daerah';
        $year = $context['year'] ?? date('Y');
        $matrix = $context['matrix'] ?? [];

        $lines = [];
        $lines[] = "Status Kinerja Perangkat Daerah Tahun {$year} — {$scope}";
        $lines[] = '--------------------------------------------------';
        $lines[] = sprintf('%-4s | %-40s | %-15s | %-15s', 'No', 'Perangkat Daerah', 'Status Fisik', 'Status Anggaran');
        $lines[] = str_repeat('-', 80);

        if (! empty($matrix)) {
            foreach ($matrix as $row) {
                $nama = mb_strimwidth($row['nama'] ?? '-', 0, 38, '..');
                $lines[] = sprintf(
                    '%-4d | %-40s | %-15s | %-15s',
                    $row['no'] ?? 1,
                    $nama,
                    $row['status_fisik'] ?? 'Tidak Dinilai',
                    $row['status_anggaran'] ?? 'Tidak Dinilai'
                );
            }
        } else {
            $lines[] = 'Tidak ada data Perangkat Daerah yang dapat ditampilkan.';
        }

        return implode("\n", $lines);
    }

    /**
     * AI Chatbot Asisten Interaktif
     */
    private function chat(string $prompt, array $context): string
    {
        $userQuery = $context['user_query'] ?? '';
        if (empty($userQuery)) {
            if (preg_match('/---\r?\n(.*)$/s', $prompt, $m)) {
                $userQuery = trim($m[1]);
            } else {
                $userQuery = $prompt;
            }
        }

        $norm = strtolower($userQuery);
        $scope = $context['scope'] ?? 'Perangkat Daerah';
        $userName = $context['user_name'] ?? 'Bapak/Ibu';
        $year = $context['year'] ?? date('Y');
        $triwulan = $context['triwulan'] ?? 'TW II';
        $fact = $context['factual_data'] ?? [];

        // 1. QUICK ACTION 1: Buat Executive Summary
        if (str_contains($norm, 'executive summary') || str_contains($norm, 'ringkasan eksekutif') || str_contains($norm, 'buat ringkasan')) {
            $sumJson = $this->executiveSummary($context);
            $parsed = json_decode($sumJson, true);
            $text = $parsed['ringkasan'] ?? '';

            $res = "Ringkasan Eksekutif SAKIP\n\n"
                ."Lingkup: {$scope}\n"
                ."Periode: Tahun {$year} - {$triwulan}\n\n"
                ."Ringkasan Narasi:\n"
                ."{$text}\n\n"
                ."Catatan Perhatian:\n";
            foreach ($parsed['perhatian'] ?? [] as $p) {
                $res .= '- '.($p['catatan'] ?? '')."\n";
            }
            $res .= "\nRekomendasi Utama:\n";
            foreach ($parsed['rekomendasi'] ?? [] as $r) {
                $res .= '- '.($r['tindakan'] ?? '')."\n";
            }

            return trim($res);
        }

        // 2. QUICK ACTION 2: Analisis Insight Kinerja
        if (str_contains($norm, 'insight') || str_contains($norm, 'analisis kinerja') || str_contains($norm, 'anomali')) {
            $insContext = (new AiContextBuilder(
                app(AuthorizationService::class),
                app(AchievementCalculator::class),
                app(OpdAnalyticsService::class),
                app(TrendPredictor::class),
            ))->insightContext();

            return $this->insight($insContext);
        }

        // 3. QUICK ACTION 3: Prediksi Capaian Akhir Tahun
        if (str_contains($norm, 'prediksi') || str_contains($norm, 'proyeksi') || str_contains($norm, 'akhir tahun') || str_contains($norm, 'forecast')) {
            $predContext = (new AiContextBuilder(
                app(AuthorizationService::class),
                app(AchievementCalculator::class),
                app(OpdAnalyticsService::class),
                app(TrendPredictor::class),
            ))->predictionContext();

            return $this->prediction($predContext);
        }

        // 4. QUICK ACTION 4: Rekomendasi Tindak Lanjut
        if (str_contains($norm, 'rekomendasi') || str_contains($norm, 'saran') || str_contains($norm, 'tindak lanjut')) {
            return $this->recommendation($context);
        }

        // 5. QUICK ACTION 5: Status Kinerja per OPD
        if (str_contains($norm, 'opd') || str_contains($norm, 'dinas') || str_contains($norm, 'badan') || str_contains($norm, 'perangkat daerah')) {
            $opdContext = (new AiContextBuilder(
                app(AuthorizationService::class),
                app(AchievementCalculator::class),
                app(OpdAnalyticsService::class),
                app(TrendPredictor::class),
            ))->opdStatusContext();

            return $this->opdStatus($opdContext);
        }

        // 6. Dokumen SAKIP / Perencanaan
        if (str_contains($norm, 'dokumen') || str_contains($norm, 'rpjmd') || str_contains($norm, 'renstra') || str_contains($norm, 'renja') || str_contains($norm, 'berkas')) {
            $total = $fact['total_docs'] ?? 0;
            $avail = $fact['available_docs'] ?? 0;
            $appr = $fact['approved_docs'] ?? 0;
            $missing = max(0, $total - $avail);

            return "Status Kelengkapan Dokumen SAKIP — {$scope}\n\n"
                ."- Total Dokumen Terdaftar: {$total} dokumen\n"
                ."- Berkas Digital Terunggah (PDF): {$avail} dokumen\n"
                ."- Dokumen Disetujui (Approved): {$appr} dokumen\n"
                ."- Belum Memiliki Berkas: {$missing} dokumen\n\n"
                .'Catatan Kepatuhan: Seluruh berkas digital wajib diunggah pada format PDF melalui modul Perencanaan Kinerja.';
        }

        // 7. Capaian / Nilai Rata-rata / Pencarian Indikator
        if (str_contains($norm, 'capaian') || str_contains($norm, 'rata-rata') || str_contains($norm, 'iku') || str_contains($norm, 'indikator')) {
            $avg = number_format((float) ($fact['average_achievement'] ?? 0), 2);
            $criticalInfo = ! empty($fact['problematic_indicators'])
                ? implode("\n- ", array_map(fn ($p) => ($p['indicator'] ?? 'Indikator').(! empty($p['indicator_code']) ? ' ['.$p['indicator_code'].']' : '').' ('.($p['organization'] ?? '-').'): '.($p['achievement'] ?? 0).'%', array_slice($fact['problematic_indicators'], 0, 5)))
                : 'Tidak ada indikator dalam kategori kritis.';

            $ikuList = '';
            if (! empty($fact['iku_summary']['items'])) {
                $ikuLines = array_map(function ($item) {
                    $tgt = is_numeric($item['target'] ?? null) ? $item['target'] : '-';
                    $real = is_numeric($item['realisasi'] ?? null) ? $item['realisasi'] : '-';

                    return '- '.($item['indikator'] ?? '-').": Target {$tgt}, Realisasi {$real} ({$item['satuan']})";
                }, array_slice($fact['iku_summary']['items'], 0, 5));
                $ikuList = "\n\nIndikator Terdata:\n".implode("\n", $ikuLines);
            }

            return "Informasi Capaian Indikator Kinerja — {$scope}\n\n"
                ."- Rata-rata capaian kinerja: {$avg}%\n"
                ."- Indikator Perlu Perhatian / Kritis:\n- {$criticalInfo}"
                .$ikuList;
        }

        // 8. Sapaan / Greeting
        if (preg_match('/\b(halo|hai|selamat pagi|selamat siang|selamat sore|selamat malam|assalamu|siapa anda)\b/i', $norm)) {
            return "Selamat datang {$userName}.\n\n"
                ."Saya adalah AI Asisten SAKIP e-KASUARI Perangkat Daerah.\n"
                ."Lingkup Akses: {$scope}\n"
                ."Periode: Tahun {$year} - {$triwulan}\n\n"
                ."Layanan Informasi Eksekutif yang Dapat Diakses:\n"
                ."1. Buat Executive Summary\n"
                ."2. Analisis Insight Kinerja\n"
                ."3. Prediksi Capaian Akhir Tahun\n"
                ."4. Rekomendasi Tindak Lanjut\n"
                ."5. Status Kinerja per OPD\n\n"
                .'Silakan pilih salah satu menu di atas atau sampaikan topik data yang ingin Anda telusuri.';
        }

        // Default response: Ringkasan Faktual
        return "Informasi Kinerja SAKIP — {$scope}\n\n"
            ."Data Resmi Sistem e-KASUARI (Tahun {$year} - {$triwulan}):\n"
            .'- Perangkat Daerah Aktif: '.($fact['total_opd'] ?? 10)." OPD\n"
            .'- Realisasi Anggaran APBD: '.($fact['budget_summary']['serapan_persen'] ?? 0)."%\n"
            .'- Status Dokumen SAKIP: '.($fact['available_docs'] ?? 0).' dari '.($fact['total_docs'] ?? 0)." berkas fisik terunggah\n"
            .'- Peringatan Dini (EWS): '.($fact['open_alerts'] ?? 0)." alert aktif\n\n"
            .'Silakan ajukan pertanyaan lebih rinci terkait indikator, anggaran, dokumen, atau prediksi kinerja.';
    }
}
