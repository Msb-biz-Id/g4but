<?php

namespace App\Services\Ai;

use App\Services\AuditService;

/**
 * Backend-controlled guardrail layer (BRD FR-PG-001..012, RULE-015..019).
 *
 * - Treats every user message as untrusted input.
 * - Detects common prompt-injection / jailbreak patterns before the message
 *   is forwarded to any provider.
 * - Produces opaque refusal responses that never reveal internal mechanics,
 *   prompts, credentials, or security reasons.
 */
class PromptGuardrail
{
    /**
     * @var array<int, string> regex patterns indicating a malicious/out-of-scope request
     */
    private const INJECTION_PATTERNS = [
        '/ignore\s+(all\s+)?(previous|above|prior|the)\s+instructions?/i',
        '/disregard\s+(all\s+)?(previous|above|prior)/i',
        '/lupakan\s+(semua|instruksi|prompt|aturan)/i',
        '/abaikan\s+(semua\s+)?(aturan|instruksi|prompt|batasan|peran)/i',
        '/(reveal|show|print|output|give)\s+(your|the|system|internal)\s*(prompt|instructions|system\s+prompt)/i',
        '/(tampilkan|bocorkan|berikan|buka|keluarkan)\s+(system\s+prompt|prompt\s+sistem|instruksi\s+internal|credential|kredensial|api\s+key)/i',
        '/system\s+prompt\b/i',
        '/prompt\s+sistem\b/i',
        '/as\s+(the\s+)?(admin|root|developer|superuser|dan\s+mode)/i',
        '/acting\s+as\s+(the\s+)?(admin|root|developer)\b/i',
        '/kamu\s+sekarang\s+adalah\b/i',
        '/you\s+are\s+now\s+(a|an|the)?\b/i',
        '/jailbreak/i',
        '/dan\s+mode/i',
        '/developer\s+mode/i',
        '/(nevermind|btw)\s+(above|previous)/i',
        '/(do\s+not|jangan)\s*(follow|ikuti)\s*(the|your)\s*(instructions|rules)/i',
        '/(password|credential|credentials|token|api\s+key|secret)\s*(=|:|\s+(is|adalah|yaitu))[^\n]{0,40}/i',
        '/(password|credential|token|api\s+key|secret)\b.{0,20}(leak|reveal|show|give|kirim|tampilkan|berikan)/i',
        '/simulate\s+(dangero(us|ous)|harmful|offensive)/i',
        '/bypass\s+(the\s+)?(system|rules|restrictions|guards|rbac|hak\s+akses)/i',
        '/what\s+is\s+your\s+(original|first|initial)\s*(prompt|instruction)/i',
        '/apa\s+(instruksi|prompt)\s+(asli|awal|pertama|sistem)\s+kamu/i',
        '/<\/?(system|instructions|context|data|rules|prompt|pertanyaan_pengguna)>/i',
    ];

    /**
     * @var array<int, string> patterns that indicate leaked secrets in model output
     */
    private const OUTPUT_SECRET_PATTERNS = [
        '/(password|credential|token|api[_\s-]?key|secret)\s*(=|:|\s+(is|adalah|yaitu))\s*[^\s]{4,}/i',
        '/sk-[a-zA-Z0-9]{20,}/',
        '/eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/',
    ];

    private const ALWAYS_REFUSE_KEYWORDS = [
        'password' => 'Kredensial dan informasi keamanan internal tidak dapat diberikan.',
        'api key' => 'Kredensial dan informasi keamanan internal tidak dapat diberikan.',
        'api_key' => 'Kredensial dan informasi keamanan internal tidak dapat diberikan.',
        'secret' => 'Kredensial dan informasi keamanan internal tidak dapat diberikan.',
        'token' => 'Kredensial dan informasi keamanan internal tidak dapat diberikan.',
        'system prompt' => 'Informasi teknis internal tidak dapat dibagikan melalui kanal ini.',
        'system instruction' => 'Informasi teknis internal tidak dapat dibagikan melalui kanal ini.',
        'prompt sistem' => 'Informasi teknis internal tidak dapat dibagikan melalui kanal ini.',
    ];

    /**
     * Inspect an incoming user message for injection or out-of-scope patterns.
     *
     * @param  array<string, mixed>  $context
     * @return array{blocked:bool, reason?:string, response:string}
     */
    public function inspect(string $message, array $context = []): array
    {
        $lower = mb_strtolower($message);

        foreach (self::INJECTION_PATTERNS as $pattern) {
            if (preg_match($pattern, $lower)) {
                $this->logThreat($message, 'injection_pattern_detected');

                return $this->refuse('Permintaan ditolak demi keamanan (terdeteksi potensi manipulasi instruksi / prompt injection).');
            }
        }

        foreach (self::ALWAYS_REFUSE_KEYWORDS as $keyword => $response) {
            if (str_contains($lower, $keyword)) {
                $this->logThreat($message, 'sensitive_keyword:'.$keyword);

                return $this->refuse($response);
            }
        }

        // Out-of-scope request: asking for data outside the allowed modules.
        if (! $this->isInScope($lower, $context)) {
            return $this->refuse('Permintaan berada di luar cakupan layanan analisis kinerja SAKIP.');
        }

        return ['blocked' => false, 'response' => ''];
    }

    private function logThreat(string $message, string $reason): void
    {
        try {
            if (class_exists(AuditService::class)) {
                app(AuditService::class)->log(
                    'prompt_injection_blocked',
                    'ai_guardrail',
                    null,
                    null,
                    [
                        'message' => substr($message, 0, 200),
                        'reason' => $reason,
                        'user_id' => \Illuminate\Support\Facades\Auth::id(),
                    ]
                );
            }
        } catch (\Throwable) {
            // Silence audit logging failure
        }
    }

    /**
     * Output-side validation (FR-PG-007, RULE-019). Runs after the provider
     * returns content to ensure it does not leak credentials, reveal internal
     * configuration, or promote unsafe content before it is persisted or
     * forwarded to a channel.
     *
     * @param  array<string, mixed>  $context
     * @return array{ok:bool, reason?:string}
     */
    public function inspectOutput(string $content, array $context = []): array
    {
        if (trim($content) === '') {
            return ['ok' => false, 'reason' => 'empty'];
        }

        $lower = mb_strtolower($content);

        // Never pass secrets through.
        foreach (self::OUTPUT_SECRET_PATTERNS as $pattern) {
            if (preg_match($pattern, $lower)) {
                return ['ok' => false, 'reason' => 'credential_leak'];
            }
        }

        // Internal references the system must never surface.
        if (preg_match('/\.env\b|APP_KEY|DB_PASSWORD|WHATSAPP_TOKEN|sk-[a-zA-Z0-9]{20,}/i', $content)) {
            return ['ok' => false, 'reason' => 'internal_reference'];
        }

        return ['ok' => true];
    }

    /**
     * Label AI-generated content as automated (EG-1 / output labeling).
     */
    public function label(string $content, string $channel = 'web'): string
    {
        $appName = class_exists(\App\Models\AppConfig::class)
            ? (\App\Models\AppConfig::where('key', 'app_name')->value('value') ?: config('app.name', 'e-SAKIP'))
            : config('app.name', 'e-SAKIP');

        $mark = $channel === 'whatsapp'
            ? "[Hasil analisis otomatis {$appName}]"
            : "Sumber: analisis otomatis {$appName}";

        $trimmed = rtrim($content);

        return str_contains($trimmed, $mark)
            ? $trimmed
            : $trimmed."\n\n{$mark}";
    }

    /**
     * @return array{blocked:bool, response:string}
     */
    private function refuse(string $response): array
    {
        return ['blocked' => true, 'response' => $response];
    }

    /**
     * @param  array<string, mixed>  $context
     */
    private function isInScope(string $lower, array $context): bool
    {
        // FR-PG: Jika feature di-set oleh sistem (bukan input user), langsung lolos.
        // Ini mencegah context numerik/JSON yang valid ter-blokir guardrail.
        $allowedFeatures = [
            'executive_summary', 'insight', 'recommendation', 'prediction', 'opd_status', 'chat',
            'executive_brief', 'review', 'data_completeness', 'trend',
            'risk_analysis', 'compliance_check',
        ];

        if (isset($context['feature']) && in_array($context['feature'], $allowedFeatures, true)) {
            return true;
        }

        // Untuk user input langsung (feature tidak di-set), lakukan keyword check.
        $allowedKeywords = [
            'ringkas', 'summary', 'risiko', 'risk', 'perhatian', 'rekomend', 'insight',
            'wawasan', 'capaian', 'indikator', 'kinerja', 'laporan', 'pelaporan',
            'evaluasi', 'target', 'realisasi', 'opd', 'periode', 'validasi', 'status',
            'pohon kinerja', 'perencanaan', 'whatsapp', 'bantuan', 'help', 'pedoman',
            'sop', 'faq', 'informasi', 'notifikasi', 'anggaran', 'divisi', 'cascading',
            'prediksi', 'proyeksi', 'forecast', 'triwulan', 'iku', 'sakip', 'apbd',
        ];

        foreach ($allowedKeywords as $kw) {
            if (str_contains($lower, $kw)) {
                return true;
            }
        }

        return false;
    }
}
