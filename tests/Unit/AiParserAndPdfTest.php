<?php

namespace Tests\Unit;

use App\Services\Ai\AiService;
use App\Services\PdfService;
use Barryvdh\DomPDF\Facade\Pdf;
use Tests\TestCase;

class AiParserAndPdfTest extends TestCase
{
    public function test_parses_user_screenshot_json_structure(): void
    {
        $userJson = <<<'JSON'
{
  "ringkasanEksekutif": {
    "periode": "Tahun Anggaran 2026 - TW II",
    "kinerjaOPD": {
      "capaianUtama": [
        "OPD berhasil mencapai target peningkatan efisiensi operasional sebesar 15% dibandingkan periode sebelumnya.",
        "Implementasi program digitalisasi layanan publik telah meningkatkan kepuasan masyarakat sebesar 20%.",
        "Pengembangan infrastruktur strategis berhasil diselesaikan tepat waktu, meningkatkan aksesibilitas dan konektivitas wilayah."
      ],
      "kendalaSignifikan": [
        "Keterbatasan anggaran menghambat beberapa proyek prioritas yang direncanakan.",
        "Adanya perubahan regulasi yang tidak terduga mengakibatkan penundaan dalam implementasi kebijakan baru.",
        "Tingkat koordinasi antar-departemen masih perlu ditingkatkan untuk menghindari duplikasi usaha dan meningkatkan efisiensi."
      ],
      "rekomendasiStrategis": [
        "Meningkatkan kerjasama dengan sektor swasta untuk mengatasi keterbatasan anggaran melalui kemitraan strategis.",
        "Mengembangkan mekanisme adaptasi regulasi yang lebih fleksibel untuk mengantisipasi perubahan kebijakan yang tidak terduga.",
        "Memperkuat sistem koordinasi dan komunikasi antar-departemen untuk memastikan sinergi dalam pelaksanaan program dan kegiatan."
      ]
    }
  }
}
JSON;

        $aiService = app(AiService::class);
        $parsed = $aiService->parseExecutiveSummaryJson($userJson);

        $this->assertNotNull($parsed, 'Harus berhasil diparse meskipun format JSON berkunci ringkasanEksekutif');
        $this->assertArrayHasKey('ringkasan', $parsed);
        $this->assertArrayHasKey('perhatian', $parsed);
        $this->assertArrayHasKey('rekomendasi', $parsed);

        $this->assertStringContainsString('Tahun Anggaran 2026 - TW II', $parsed['ringkasan']);
        $this->assertStringContainsString('efisiensi operasional sebesar 15%', $parsed['ringkasan']);
        $this->assertCount(3, $parsed['perhatian']);
        $this->assertStringContainsString('Keterbatasan anggaran', $parsed['perhatian'][0]['catatan']);
        $this->assertCount(3, $parsed['rekomendasi']);
        $this->assertStringContainsString('Meningkatkan kerjasama', $parsed['rekomendasi'][0]['tindakan']);
    }

    public function test_parses_standard_three_field_json(): void
    {
        $standardJson = json_encode([
            'ringkasan' => 'Capaian kinerja fisik mencapai 85% pada triwulan ini.',
            'perhatian' => [
                ['catatan' => 'Indikator X mengalami keterlambatan.'],
            ],
            'rekomendasi' => [
                ['tindakan' => 'Lakukan monitoring lapangan.'],
            ],
        ]);

        $aiService = app(AiService::class);
        $parsed = $aiService->parseExecutiveSummaryJson($standardJson);

        $this->assertNotNull($parsed);
        $this->assertSame('Capaian kinerja fisik mencapai 85% pada triwulan ini.', $parsed['ringkasan']);
        $this->assertCount(1, $parsed['perhatian']);
        $this->assertCount(1, $parsed['rekomendasi']);
    }

    public function test_converts_json_string_to_clean_narrative(): void
    {
        $rawJson = json_encode([
            'overview' => 'Status kinerja berjalan baik.',
            'prioritas' => ['Program air bersih', 'Pendidikan vokasi'],
        ]);

        $narrative = AiService::convertJsonStringToNarrative($rawJson);

        $this->assertStringNotContainsString('{', $narrative);
        $this->assertStringNotContainsString('}', $narrative);
        $this->assertStringContainsString('Overview', $narrative);
        $this->assertStringContainsString('Status kinerja berjalan baik', $narrative);
        $this->assertStringContainsString('Prioritas', $narrative);
        $this->assertStringContainsString('Program air bersih', $narrative);
    }

    public function test_pdf_service_returns_jpeg_base64(): void
    {
        $base64 = PdfService::getLogoBase64();

        $this->assertNotNull($base64);
        $this->assertStringStartsWith('data:image/jpeg;base64,', $base64, 'Logo harus berupa JPEG Base64 agar bebas transparansi');
    }

    public function test_pdf_generation_does_not_throw_imagick_exception(): void
    {
        $logoBase64 = PdfService::getLogoBase64();

        $pdf = Pdf::loadView('pdf.ai-report', [
            'title' => 'Executive Summary',
            'feature' => 'executive_summary',
            'scope' => 'Pemerintah Provinsi Papua Barat',
            'output' => 'Laporan ringkasan eksekutif berjalan lancar.',
            'formattedContent' => '<p class="paragraph">Laporan ringkasan eksekutif berjalan lancar.</p>',
            'userName' => 'Test Administrator',
            'generatedAt' => '17/09/2026 01:00',
            'logoBase64' => $logoBase64,
        ])->setPaper('a4', 'portrait');

        $binary = $pdf->output();
        $this->assertNotEmpty($binary);
        $this->assertStringStartsWith('%PDF', $binary);
    }

    public function test_pdf_renders_official_kop_and_structured_executive_summary(): void
    {
        $parsed = [
            'ringkasan' => 'Capaian kinerja fisik mencapai 92.5% dan realisasi anggaran menyerap 88.3%.',
            'perhatian' => [
                ['catatan' => 'Deviasi anggaran pada program infrastruktur jalan.'],
                ['catatan' => 'Keterlambatan input data kinerja di 2 OPD.'],
            ],
            'rekomendasi' => [
                ['tindakan' => 'Lakukan akselerasi lelang fisik pada awal TW III.'],
                ['tindakan' => 'Tingkatkan pendampingan SAKIP berkala.'],
            ],
        ];

        $html = view('pdf.ai-report', [
            'title' => 'Executive Summary',
            'feature' => 'executive_summary',
            'scope' => 'Pemerintah Provinsi Papua Barat',
            'output' => 'dummy',
            'parsed' => $parsed,
            'formattedContent' => '',
            'userName' => 'John Doe',
            'generatedAt' => '17/09/2026 03:00',
            'logoBase64' => PdfService::getLogoBase64(),
            'provinceName' => 'Provinsi Papua Barat',
            'appName' => 'e-SAKIP',
        ])->render();

        $this->assertStringContainsString('E-SAKIP &mdash; SISTEM AKUNTABILITAS KINERJA INSTANSI PEMERINTAH', $html);
        $this->assertStringContainsString('EXECUTIVE SUMMARY', $html);
        $this->assertStringContainsString('hdr-table', $html);
        $this->assertStringContainsString('hdr-logo-cell', $html);
        $this->assertStringContainsString('RINGKASAN EKSEKUTIF ANALISIS', $html);
        $this->assertStringContainsString('Capaian kinerja fisik mencapai 92.5%', $html);
        $this->assertStringContainsString('CATATAN PERHATIAN KHUSUS', $html);
        $this->assertStringContainsString('Deviasi anggaran pada program infrastruktur jalan', $html);
        $this->assertStringContainsString('REKOMENDASI TINDAK LANJUT STRATEGIS', $html);
        $this->assertStringContainsString('Lakukan akselerasi lelang fisik', $html);
        $this->assertStringContainsString('Manokwari,', $html);
        $this->assertStringContainsString('John Doe', $html);

        // Generate binary PDF to ensure Dompdf renders without errors
        $pdf = Pdf::loadHTML($html)->setPaper('a4', 'portrait');
        $binary = $pdf->output();
        $this->assertNotEmpty($binary);
        $this->assertStringStartsWith('%PDF', $binary);
    }
}
