<?php

namespace App\Services\Ai;

use App\Contracts\AiProvider;
use App\Models\AiInsight;
use App\Models\AiPromptTemplate;
use App\Models\AiRequest;
use App\Models\AiUseLog;
use App\Models\AppConfig;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Orkestrator AI: memilih provider, merender prompt template ber-versi (AIG-006),
 * mencatat request (FR-AI-008), respons (FR-AI-009), hasil yang dapat direview
 * manusia (FR-AI-010), dan menjamin fallback (AIG-009).
 *
 * P1-E: Output AI wajib berformat JSON 3 field: ringkasan, perhatian, rekomendasi (BR-AI-007).
 * P1-E: Tidak ada silent fallback ke mock (BR-AI-008) — error dicatat sebagai FAILED.
 */
class AiService
{
    private const FEATURE_TITLES = [
        'executive_summary' => 'Executive Summary',
        'insight' => 'Analisis Insight Kinerja',
        'prediction' => 'Prediksi Capaian Akhir Tahun',
        'recommendation' => 'Rekomendasi Tindak Lanjut',
        'unit_status' => 'Status Kinerja per Unit Kerja',
        'opd_status' => 'Status Kinerja per Unit Kerja',
        'chat' => 'AI Asisten e-KASUARI',
    ];

    /**
     * Template default per feature.
     */
    private const DEFAULT_TEMPLATES = [
        'executive_summary' => [
            'name' => 'Executive Summary',
            'content' => <<<'PROMPT'
Anda adalah Analis SAKIP Eksekutif Perangkat Daerah.
Tugas Anda adalah menyusun Laporan Ringkasan Eksekutif Akuntabilitas Kinerja yang 100% berbasis DATA RESMI SISTEM e-KASUARI berikut.

==================================================
DATA RESMI SISTEM e-KASUARI:
- Lingkup Evaluasi: {scope}
- Periode Evaluasi: {period}
- Total Unit Kerja: {total_opd} Unit (OPD Induk, Sekretariat, dan Bidang)
- Status Rencana Aksi Fisik: On Track ({good_count} Unit), Perlu Perhatian ({warning_count} Unit), Kritis ({critical_count} Unit)
- Serapan Anggaran APBD: {serapan_anggaran}% (Total Pagu: Rp {total_pagu}, Realisasi: Rp {total_realisasi})
- Kelengkapan Dokumen SAKIP: {available_docs} dari {total_docs} dokumen terunggah
- Unit Kerja Berkinerja Kritis: {opd_kritis}
- Unit Kerja Perlu Perhatian: {opd_perhatian}
- Rincian Masalah / Indikator Deviasi:
{problems}

==================================================
ATURAN KETAT ANTI-HALUSINASI (WAJIB DIPATUHI):
1. HANYA gunakan angka, persentase, status, nama program, dan nama unit kerja yang secara eksplisit tercantum dalam DATA RESMI SISTEM di atas.
2. DILARANG KERAS mengarang angka atau membuat persentase fiktif (misalnya dilarang menyebut angka serapan selain {serapan_anggaran}%, dilarang menyebut program/survei fiktif).
3. Jika terdapat data yang bernilai 0 atau belum tersedia, nyatakan secara lugas bahwa data belum dilaporkan pada periode ini.
4. DILARANG menggunakan emoji apapun dalam seluruh teks.
5. Gunakan bahasa birokrasi pemerintahan Indonesia formal yang lugas, objektif, tajam, dan terstruktur.
PROMPT,
        ],
        'insight' => [
            'name' => 'Analisis Insight Kinerja',
            'content' => <<<'PROMPT'
Anda adalah Analis Kinerja SAKIP Perangkat Daerah.
Analisis insight deviasi capaian kinerja fisik vs realisasi anggaran belanja untuk {scope} pada {period}.

==================================================
DATA ACUAN FAKTUAL:
- Lingkup Analisis: {scope}
- Periode Evaluasi: {period}
- Serapan Anggaran APBD: {serapan_anggaran}% (Pagu: Rp {total_pagu}, Realisasi: Rp {total_realisasi})
- Rata-rata Capaian Fisik: {rata_fisik}%
- Temuan Kunci & Deviasi:
{insights}

==================================================
ATURAN KETAT ANTI-HALUSINASI:
1. HANYA sajikan temuan berdasarkan fakta disparitas angka pada data acuan di atas.
2. Sorot secara spesifik unit kerja yang mengalami deviasi (misalnya capaian fisik tertinggal atau serapan anggaran kritis).
3. DILARANG mengarang angka atau fakta yang tidak ada di data acuan.
4. DILARANG menggunakan emoji apapun.
5. Sajikan dalam format poin terstruktur dan narasi analitis birokrasi formal.
PROMPT,
        ],
        'prediction' => [
            'name' => 'Prediksi Capaian Akhir Tahun',
            'content' => <<<'PROMPT'
Anda adalah Analis Prediktif Akuntabilitas Kinerja Perangkat Daerah.
Lakukan telaah proyeksi probabilitas ketercapaian target akhir tahun untuk {scope} pada {period}.

==================================================
DATA FAKTUAL PROYEKSI:
- Lingkup Evaluasi: {scope}
- Tahun Anggaran: {year} ({triwulan})
- Posisi Serapan Anggaran Saat Ini: {current_serapan}%
- Estimasi Proyeksi Linier Akhir Tahun: {projected_serapan}%
- Kategori Probabilitas Sukses: {probabilitas_sukses}
- Unit Kerja dengan Serapan Tertinggal: {opd_tertinggal}
- Rekomendasi Akselerasi Awal: {rekomendasi_akselerasi}

==================================================
ATURAN KETAT ANTI-HALUSINASI:
1. HANYA gunakan angka posisi serapan {current_serapan}% dan proyeksi {projected_serapan}% sesuai data resmi.
2. DILARANG mengarang angka baru.
3. Sebutkan unit kerja yang membutuhkan intervensi akselerasi percepatan belanja program secara faktual.
4. DILARANG menggunakan emoji apapun.
5. Sajikan dalam format poin terstruktur dengan bahasa birokrasi formal.
PROMPT,
        ],
        'recommendation' => [
            'name' => 'Rekomendasi Tindak Lanjut',
            'content' => <<<'PROMPT'
Anda adalah Tenaga Ahli Penguatan Akuntabilitas Kinerja Perangkat Daerah.
Susun butir-butir Rekomendasi Tindak Lanjut Strategis dan Taktis berdasarkan hasil evaluasi {scope} ({period}).

==================================================
FAKTA KINERJA SISTEM:
- Lingkup: {scope}
- Periode: {period}
- Serapan Anggaran: {serapan_anggaran}% (Pagu: Rp {total_pagu}, Realisasi: Rp {total_realisasi})
- Status Fisik: On Track ({good_count} Unit), Perhatian ({warning_count} Unit), Kritis ({critical_count} Unit)
- Kelengkapan Dokumen SAKIP: {available_docs} dari {total_docs} dokumen terunggah
- Area Masalah yang Harus Diintervensi:
{problems}

==================================================
ATURAN KETAT ANTI-HALUSINASI:
1. Rekomendasi HARUS secara langsung menyelesaikan masalah, unit kerja, dan indikator yang terdata pada fakta kinerja di atas.
2. Kelompokkan rekomendasi ke dalam 4 Komponen SAKIP (Perencanaan, Pengukuran, Pelaporan, Evaluasi Internal).
3. DILARANG membuat rekomendasi generik atau mengarang masalah yang tidak ada di data fakta.
4. DILARANG menggunakan emoji apapun.
5. Gunakan bahasa birokrasi formal pemerintahan Indonesia.
PROMPT,
        ],
        'unit_status' => [
            'name' => 'Status Kinerja per Unit Kerja',
            'content' => <<<'PROMPT'
Anda adalah Analis Kinerja Organisasi Perangkat Daerah.
Sajikan telaah komparasi status capaian fisik dan serapan anggaran untuk unit kerja (OPD Induk, Sekretariat, dan Bidang) pada {scope} ({period}).

==================================================
MATRIKS STATUS UNIT KERJA:
{matrix}

==================================================
ATURAN KETAT ANTI-HALUSINASI:
1. HANYA gunakan status capaian fisik dan serapan anggaran yang tercantum pada matriks di atas.
2. Sajikan tabel rangkuman dan telaah naratif ringkas mengenai unit kerja berkinerja terbaik dan unit kerja yang memerlukan supervisi khusus.
3. DILARANG mengarang angka atau status di luar matriks.
4. DILARANG menggunakan emoji apapun.
PROMPT,
        ],
        'opd_status' => [
            'name' => 'Status Kinerja per Unit Kerja',
            'content' => <<<'PROMPT'
Anda adalah Analis Kinerja Organisasi Perangkat Daerah.
Sajikan telaah komparasi status capaian fisik dan serapan anggaran untuk unit kerja (OPD Induk, Sekretariat, dan Bidang) pada {scope} ({period}).

==================================================
MATRIKS STATUS UNIT KERJA:
{matrix}

==================================================
ATURAN KETAT ANTI-HALUSINASI:
1. HANYA gunakan status capaian fisik dan serapan anggaran yang tercantum pada matriks di atas.
2. Sajikan tabel rangkuman dan telaah naratif ringkas mengenai unit kerja berkinerja terbaik dan unit kerja yang memerlukan supervisi khusus.
3. DILARANG mengarang angka atau status di luar matriks.
4. DILARANG menggunakan emoji apapun.
PROMPT,
        ],
        'chat' => [
            'name' => 'Chat Assistant',
            'content' => <<<'PROMPT'
Anda adalah AI Asisten SAKIP & Kinerja Perangkat Daerah (e-KASUARI).
Tugas Anda: Menjawab pertanyaan pengguna secara formal, profesional, objektif, dan faktual berdasarkan DATA RESMI TERVERIFIKASI berikut.

<konteks_data_terverifikasi>
{answer}
</konteks_data_terverifikasi>

ATURAN KETAT:
1. Jawab HANYA berdasarkan fakta di dalam <konteks_data_terverifikasi>.
2. DILARANG KERAS MENGARANG angka, data, persentase, atau program yang tidak tercantum.
3. Jika data yang ditanyakan belum tersedia di sistem atau bernilai 0, nyatakan secara transparan dan sopan bahwa data belum dilaporkan ke e-KASUARI pada periode ini.
4. DILARANG KERAS MENGGUNAKAN EMOJI APAPUN dalam seluruh respon.
5. DILARANG menampilkan format teks JSON mentah atau kurung kurawal kode kepada pengguna. Sajikan selalu dalam paragraf narasi, poin terstruktur, atau tabel teks Markdown yang rapi.
6. Patuhi prinsip RBAC: hanya sajikan data yang berada dalam lingkup izin pengguna.
PROMPT,
        ],
    ];

    public function __construct(
        private readonly AiContextBuilder $contextBuilder,
        private readonly PromptGuardrail $guardrail = new PromptGuardrail,
    ) {}

    /**
     * Menghasilkan output AI untuk sebuah fitur.
     *
     * @param  array<string, mixed>  $contextData
     * @param  array<string, mixed>  $sources
     * @return array{output: string, output_parsed: array|null, provider: string, status: string,
     *               sources: list<string>, generated_at: string, log_id: int, insight_id: int, request_id: int}
     *
     * @throws \RuntimeException ketika prompt diblokir guardrail
     */
    public function generate(
        string $feature,
        string $promptContext,
        array $contextData,
        array $sources = [],
        ?int $organizationId = null,
        ?string $periode = null,
    ): array {
        // ── Input Guardrail (FR-PG-001..012) ──────────────────────────────────
        $guard = $this->guardrail->inspect($promptContext, ['feature' => $feature]);
        if ($guard['blocked']) {
            throw new \RuntimeException($guard['response']);
        }
        $contextData['generated_at'] ??= now()->toIso8601String();
        $contextData['user_query'] = $promptContext;

        $template = $this->resolveTemplate($feature);
        $prompt = $this->renderTemplate($template->content, $contextData);
        $prompt .= PHP_EOL.'---'.PHP_EOL.$promptContext;

        $provider = $this->resolveProvider();
        $started = microtime(true);

        // ── Panggil Provider — TANPA silent fallback (BR-AI-008) ─────────────
        $result = $provider->generate($feature, $prompt, $contextData);
        $status = 'success';
        $providerName = (string) ($result['provider_used'] ?? $provider->name());
        $error = null;

        $latency = (int) round((microtime(true) - $started) * 1000);
        $userId = auth()->id() ?? request()?->user()?->id ?? User::first()?->id ?? 1;

        // ── Output Guardrail (FR-PG-007, RULE-019) ────────────────────────────
        $outputCheck = $this->guardrail->inspectOutput($result['output'], ['feature' => $feature]);
        if (! $outputCheck['ok']) {
            $result['output'] = 'Respons tidak dapat ditampilkan karena tidak lolos validasi keamanan output.';
            $status = 'blocked';
        } else {
            $result['output'] = $this->guardrail->label($result['output']);
        }

        // ── Parse JSON output untuk feature executive_summary (BR-AI-007) ────
        $outputParsed = null;
        if ($feature === 'executive_summary' && $status === 'success') {
            $outputParsed = $this->parseExecutiveSummaryJson($result['output']);
            if ($outputParsed) {
                // Konversi teks mentah JSON ke narasi eksekutif agar tidak ada string JSON yang tampil
                $formattedText = $outputParsed['ringkasan']."\n\n";
                if (! empty($outputParsed['perhatian'])) {
                    $formattedText .= "Catatan Perhatian Khusus:\n";
                    foreach ($outputParsed['perhatian'] as $p) {
                        $formattedText .= '- '.($p['catatan'] ?? '')."\n";
                    }
                    $formattedText .= "\n";
                }
                if (! empty($outputParsed['rekomendasi'])) {
                    $formattedText .= "Rekomendasi Tindak Lanjut:\n";
                    foreach ($outputParsed['rekomendasi'] as $r) {
                        $formattedText .= '- '.($r['tindakan'] ?? '')."\n";
                    }
                }
                $result['output'] = trim($formattedText);
            }
        }

        // ── Universal Safety Net: Konversi format JSON mentah dari provider manapun ke teks naratif biasa ──
        if ($status === 'success' && self::isJsonLike($result['output'])) {
            $result['output'] = self::convertJsonStringToNarrative($result['output']);
        }

        // Label AI-generated content selalu disematkan pada teks akhir
        if ($status === 'success') {
            $result['output'] = $this->guardrail->label($result['output']);
        }

        $aiRequest = AiRequest::create([
            'user_id' => $userId,
            'feature' => $feature,
            'status' => $status === 'success' ? 'completed' : 'failed',
            'context' => $contextData,
            'prompt' => ['prompt' => $prompt, 'template' => $template->code.'@v'.$template->version],
            'response' => ['output' => $result['output'], 'provider' => $providerName],
            'model' => $providerName,
            'latency_ms' => $latency,
            'failure_reason' => $error,
        ]);

        $log = AiUseLog::create([
            'user_id' => $userId,
            'organization_id' => $organizationId,
            'periode' => $periode,
            'feature' => $feature,
            'provider' => $providerName,
            'prompt_template' => $template->code.'@v'.$template->version,
            'context_ref' => $sources,
            'prompt' => $prompt,
            'output' => $result['output'],
            'status' => $status,
            'error_message' => $error,
            'latency_ms' => $latency,
        ]);

        $title = (self::FEATURE_TITLES[$feature] ?? ucfirst($feature)).' — '.now()->format('Y-m-d H:i');

        $insight = AiInsight::create([
            'ai_request_id' => $aiRequest->id,
            'user_id' => $userId,
            'insight_type' => $feature,
            'title' => $title,
            'content' => [
                'output' => $result['output'],
                'output_parsed' => $outputParsed,
                'provider' => $providerName,
                'status' => $status,
                'template' => $template->code.'@v'.$template->version,
                'generated_at' => $contextData['generated_at'],
                'prompt_context' => $promptContext,
            ],
            'source_refs' => $sources,
            'status' => 'generated',
        ]);

        return [
            'output' => $result['output'],
            'output_parsed' => $outputParsed,
            'provider' => $providerName,
            'status' => $status,
            'sources' => $sources,
            'generated_at' => $contextData['generated_at'],
            'log_id' => $log->id,
            'insight_id' => $insight->id,
            'request_id' => $aiRequest->id,
        ];
    }

    /**
     * Parse JSON output executive_summary dari AI (BR-AI-007).
     * Fleksibel terhadap berbagai variasi skema JSON dari LLM eksternal.
     *
     * @return array{ringkasan: string, perhatian: array, rekomendasi: array}|null
     */
    public function parseExecutiveSummaryJson(string $raw): ?array
    {
        $cleaned = preg_replace('/^```(?:json)?\s*/i', '', trim($raw));
        $cleaned = preg_replace('/\s*```$/', '', $cleaned ?? $raw);

        if (preg_match('/(\{.*\})/s', $cleaned ?? '', $matches)) {
            $cleaned = $matches[1];
        }

        $decoded = json_decode($cleaned ?? '', true);

        if (! is_array($decoded)) {
            return null;
        }

        // Variasi 1: Format pembungkus objek kustom LLM (misal: "ringkasanEksekutif" => ["kinerjaOPD" => ...])
        $wrapperKey = isset($decoded['ringkasanEksekutif']) ? 'ringkasanEksekutif' : (isset($decoded['ringkasan_eksekutif']) ? 'ringkasan_eksekutif' : null);
        if ($wrapperKey && is_array($decoded[$wrapperKey])) {
            $inner = $decoded[$wrapperKey];
            $opd = $inner['kinerjaOPD'] ?? $inner['kinerja_opd'] ?? $inner;
            $periode = $inner['periode'] ?? '';

            $capaian = $opd['capaianUtama'] ?? $opd['capaian_utama'] ?? $opd['capaian'] ?? [];
            $ringkasanText = '';
            if (! empty($periode)) {
                $ringkasanText .= "Laporan Hasil Analisis Kinerja Eksekutif ({$periode}):\n";
            }
            if (is_array($capaian)) {
                $capaianLines = [];
                foreach ($capaian as $c) {
                    if (is_scalar($c) && trim((string) $c) !== '') {
                        $capaianLines[] = trim((string) $c);
                    }
                }
                $ringkasanText .= implode(' ', $capaianLines);
            } elseif (is_scalar($capaian)) {
                $ringkasanText .= (string) $capaian;
            }

            $kendala = $opd['kendalaSignifikan'] ?? $opd['kendala_signifikan'] ?? $opd['kendala'] ?? $opd['perhatian'] ?? [];
            $perhatianList = [];
            if (is_array($kendala)) {
                foreach ($kendala as $k) {
                    if (is_array($k)) {
                        $perhatianList[] = ['catatan' => (string) ($k['catatan'] ?? $k['kendala'] ?? reset($k) ?? '')];
                    } elseif (is_scalar($k) && trim((string) $k) !== '') {
                        $perhatianList[] = ['catatan' => trim((string) $k)];
                    }
                }
            }

            $rekomendasi = $opd['rekomendasiStrategis'] ?? $opd['rekomendasi_strategis'] ?? $opd['rekomendasi'] ?? [];
            $rekomendasiList = [];
            if (is_array($rekomendasi)) {
                foreach ($rekomendasi as $r) {
                    if (is_array($r)) {
                        $rekomendasiList[] = ['tindakan' => (string) ($r['tindakan'] ?? $r['rekomendasi'] ?? reset($r) ?? '')];
                    } elseif (is_scalar($r) && trim((string) $r) !== '') {
                        $rekomendasiList[] = ['tindakan' => trim((string) $r)];
                    }
                }
            }

            if (! empty($ringkasanText) || ! empty($perhatianList) || ! empty($rekomendasiList)) {
                return [
                    'ringkasan' => trim($ringkasanText) ?: 'Ringkasan eksekutif akuntabilitas kinerja Pemerintah Provinsi Papua Barat.',
                    'perhatian' => $perhatianList,
                    'rekomendasi' => $rekomendasiList,
                ];
            }
        }

        // Variasi 2: Skema standar 3 field (ringkasan, perhatian, rekomendasi)
        $ringkasan = $decoded['ringkasan'] ?? $decoded['ringkasan_eksekutif'] ?? $decoded['ringkasanEksekutif'] ?? $decoded['summary'] ?? null;
        if (is_array($ringkasan)) {
            $ringkasan = self::convertJsonToNarrative($ringkasan);
        }

        $perhatianRaw = $decoded['perhatian'] ?? $decoded['kendala'] ?? $decoded['kendalaSignifikan'] ?? $decoded['masalah'] ?? $decoded['catatan'] ?? [];
        $perhatian = [];
        if (is_array($perhatianRaw)) {
            foreach ($perhatianRaw as $p) {
                if (is_array($p)) {
                    $perhatian[] = [
                        'indikator_id' => $p['indikator_id'] ?? null,
                        'catatan' => (string) ($p['catatan'] ?? $p['kendala'] ?? $p['masalah'] ?? reset($p) ?? ''),
                    ];
                } elseif (is_scalar($p) && trim((string) $p) !== '') {
                    $perhatian[] = [
                        'indikator_id' => null,
                        'catatan' => trim((string) $p),
                    ];
                }
            }
        }

        $rekomendasiRaw = $decoded['rekomendasi'] ?? $decoded['rekomendasiStrategis'] ?? $decoded['saran'] ?? $decoded['tindak_lanjut'] ?? [];
        $rekomendasi = [];
        if (is_array($rekomendasiRaw)) {
            foreach ($rekomendasiRaw as $r) {
                if (is_array($r)) {
                    $rekomendasi[] = [
                        'indikator_id' => $r['indikator_id'] ?? null,
                        'tindakan' => (string) ($r['tindakan'] ?? $r['rekomendasi'] ?? $r['saran'] ?? reset($r) ?? ''),
                    ];
                } elseif (is_scalar($r) && trim((string) $r) !== '') {
                    $rekomendasi[] = [
                        'indikator_id' => null,
                        'tindakan' => trim((string) $r),
                    ];
                }
            }
        }

        if ($ringkasan !== null) {
            return [
                'ringkasan' => (string) $ringkasan,
                'perhatian' => $perhatian,
                'rekomendasi' => $rekomendasi,
            ];
        }

        // Variasi 3: JSON objek lain yang tetap dapat diekstrak
        if (! empty($perhatian) || ! empty($rekomendasi)) {
            return [
                'ringkasan' => self::convertJsonToNarrative($decoded),
                'perhatian' => $perhatian,
                'rekomendasi' => $rekomendasi,
            ];
        }

        return null;
    }

    /**
     * Memeriksa apakah suatu string berformat JSON.
     */
    public static function isJsonLike(string $text): bool
    {
        $trimmed = trim($text);
        if (str_starts_with($trimmed, '```')) {
            $trimmed = preg_replace('/^```(?:json)?\s*/i', '', $trimmed);
            $trimmed = preg_replace('/\s*```$/', '', $trimmed ?? '');
            $trimmed = trim($trimmed ?? '');
        }

        if (str_starts_with($trimmed, '{') && str_ends_with($trimmed, '}')) {
            $data = json_decode($trimmed, true);

            return is_array($data);
        }

        return false;
    }

    /**
     * Mengonversi string JSON menjadi teks naratif birokrasi yang rapi dan terstruktur.
     */
    public static function convertJsonStringToNarrative(string $jsonStr): string
    {
        $trimmed = trim($jsonStr);
        if (str_starts_with($trimmed, '```')) {
            $trimmed = preg_replace('/^```(?:json)?\s*/i', '', $trimmed);
            $trimmed = preg_replace('/\s*```$/', '', $trimmed ?? '');
            $trimmed = trim($trimmed ?? '');
        }

        if (preg_match('/(\{.*\})/s', $trimmed, $matches)) {
            $trimmed = $matches[1];
        }

        $decoded = json_decode($trimmed, true);
        if (! is_array($decoded)) {
            return $jsonStr;
        }

        return self::convertJsonToNarrative($decoded);
    }

    /**
     * Rekursif mengubah struktur array JSON menjadi format teks Markdown yang terbaca manusia.
     */
    public static function convertJsonToNarrative(array $data, int $level = 0): string
    {
        $output = '';

        foreach ($data as $key => $value) {
            $title = self::formatKeyToTitle((string) $key);

            if (is_array($value)) {
                $isList = array_is_list($value);

                if ($isList) {
                    $prefix = $level === 0 ? '### ' : '';
                    $output .= $prefix.$title."\n";

                    foreach ($value as $item) {
                        if (is_array($item)) {
                            $flatItem = implode(' — ', array_filter(array_map(function ($v) {
                                return is_scalar($v) ? trim((string) $v) : '';
                            }, $item)));
                            if ($flatItem !== '') {
                                $output .= '- '.$flatItem."\n";
                            }
                        } elseif (is_scalar($item) && trim((string) $item) !== '') {
                            $output .= '- '.trim((string) $item)."\n";
                        }
                    }
                    $output .= "\n";
                } else {
                    $prefix = $level === 0 ? '### ' : '';
                    $output .= $prefix.$title."\n\n";
                    $output .= self::convertJsonToNarrative($value, $level + 1)."\n";
                }
            } elseif (is_scalar($value)) {
                $valStr = trim((string) $value);
                if ($valStr !== '') {
                    if ($level === 0) {
                        $output .= '### '.$title."\n".$valStr."\n\n";
                    } else {
                        $output .= $title.': '.$valStr."\n\n";
                    }
                }
            }
        }

        return trim($output);
    }

    private static function formatKeyToTitle(string $key): string
    {
        $spaced = preg_replace('/([a-z])([A-Z])/', '$1 $2', $key);
        $spaced = str_replace(['_', '-'], ' ', $spaced ?? $key);

        return ucwords(strtolower($spaced));
    }

    private function resolveTemplate(string $feature): AiPromptTemplate
    {
        return DB::transaction(function () use ($feature) {
            $template = AiPromptTemplate::query()
                ->where('feature', $feature)
                ->where('is_active', true)
                ->latest('version')
                ->first();

            if ($template) {
                return $template;
            }

            $default = self::DEFAULT_TEMPLATES[$feature] ?? self::DEFAULT_TEMPLATES['chat'];

            return AiPromptTemplate::create([
                'code' => 'tmpl-'.$feature,
                'name' => $default['name'],
                'feature' => $feature,
                'version' => 1,
                'content' => $default['content'],
                'is_active' => true,
                'created_by' => request()->user()?->id,
            ]);
        });
    }

    private function resolveProvider(): AiProvider
    {
        $configured = app()->runningUnitTests()
            ? (string) config('ekasuari.ai.provider', 'mock')
            : (string) (AppConfig::value('ai.provider') ?: config('ekasuari.ai.provider', 'mock'));

        $apiKey = (string) (AppConfig::value('ai.api_key') ?: config('ekasuari.ai.api_key', ''));

        // Jika dikonfigurasi http/openai dan memiliki API Key aktif, gunakan HttpAiProvider
        if (in_array($configured, ['http', 'openai', 'openrouter'], true) && ! empty($apiKey)) {
            return new HttpAiProvider;
        }

        return new MockAiProvider;
    }

    /**
     * Membuat versi template baru (AIG-006, FR-AI-007). Versi lama dinonaktifkan.
     */
    public function createTemplateVersion(string $feature, string $content, ?string $name = null): AiPromptTemplate
    {
        return DB::transaction(function () use ($feature, $content, $name) {
            $version = (int) AiPromptTemplate::query()->where('feature', $feature)->max('version') + 1;

            AiPromptTemplate::query()
                ->where('feature', $feature)
                ->where('is_active', true)
                ->update(['is_active' => false]);

            return AiPromptTemplate::create([
                'code' => 'tmpl-'.$feature.'-v'.$version,
                'name' => $name ?: (self::DEFAULT_TEMPLATES[$feature]['name'] ?? ucfirst($feature)),
                'feature' => $feature,
                'version' => $version,
                'content' => $content,
                'is_active' => true,
                'created_by' => request()->user()?->id,
            ]);
        });
    }

    /**
     * Mengaktifkan versi template tertentu dan menonaktifkan versi lain pada fitur yang sama.
     */
    public function activateTemplate(AiPromptTemplate $template): void
    {
        DB::transaction(function () use ($template) {
            AiPromptTemplate::query()
                ->where('feature', $template->feature)
                ->where('is_active', true)
                ->where('id', '!=', $template->id)
                ->update(['is_active' => false]);

            $template->update(['is_active' => true]);
        });
    }

    /**
     * Merender placeholder {key} dari konteks (scalar atau list).
     *
     * @param  array<string, mixed>  $context
     */
    public function renderTemplate(string $template, array $context): string
    {
        return preg_replace_callback('/\{+([a-z_.]+)\}+/i', function (array $matches) use ($context) {
            $key = $matches[1];
            $value = data_get($context, $key);

            if ($value === null) {
                return 'n/a';
            }

            if (is_array($value)) {
                if ($value === []) {
                    return 'tidak ada data / belum dilaporkan';
                }

                if (isset($value['indicator'])) {
                    return sprintf('%s (%s): %.2f%%', $value['indicator'], $value['organization'] ?? 'OPD', $value['achievement'] ?? 0);
                }

                $lines = [];
                foreach ($value as $item) {
                    if (is_array($item)) {
                        if (isset($item['catatan'])) {
                            $lines[] = '- '.$item['catatan'];
                        } elseif (isset($item['tindakan'])) {
                            $lines[] = '- '.$item['tindakan'];
                        } elseif (isset($item['indicator'])) {
                            $lines[] = sprintf('- %s (%s): %s', $item['indicator'], $item['organization'] ?? 'OPD', $item['status'] ?? '-');
                        } else {
                            $lines[] = '- '.implode(', ', array_slice(array_map('strval', $item), 0, 4));
                        }
                    } else {
                        $itemStr = trim((string) $item);
                        if (! str_starts_with($itemStr, '-')) {
                            $itemStr = '- '.$itemStr;
                        }
                        $lines[] = $itemStr;
                    }
                }

                return implode("\n", $lines);
            }

            return (string) $value;
        }, $template) ?? $template;
    }
}
