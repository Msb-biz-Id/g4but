<?php

namespace App\Services\Ai;

use App\Contracts\AiProvider;
use App\Models\AppConfig;
use Illuminate\Support\Facades\Http;

/**
 * Provider HTTP yang langsung memanggil OpenAI-compatible API (OpenRouter, OpenAI, dll).
 * Adapter memungkinkan pergantian model/provider tanpa merombak aplikasi (AIG-005).
 *
 * Konfigurasi dibaca secara dinamis dari tabel app_configs (menu Pengaturan Sistem),
 * dengan fallback ke environment variables (.env).
 */
class HttpAiProvider implements AiProvider
{
    public function name(): string
    {
        return 'http';
    }

    public function generate(string $feature, string $prompt, array $context): array
    {
        $apiKey = (string) (AppConfig::value('ai.api_key') ?: config('ekasuari.ai.api_key', ''));
        $baseUrl = rtrim((string) (AppConfig::value('ai.base_url') ?: config('ekasuari.ai.base_url', 'https://openrouter.ai/api/v1')), '/');
        $model = (string) (AppConfig::value('ai.model') ?: config('ekasuari.ai.model', 'openai/gpt-4o-mini'));
        $timeout = (int) (AppConfig::value('ai.timeout') ?: config('ekasuari.ai.timeout', 50));

        if (empty($apiKey)) {
            throw new \RuntimeException(
                'API Key AI belum dikonfigurasi. Silakan atur di menu Pengaturan Sistem (/settings) atau di environment variable.'
            );
        }

        $isChat = $feature === 'chat';
        if ($isChat) {
            $userMessage = $context['user_query'] ?? 'Jawab pertanyaan pengguna berdasarkan data terverifikasi di atas.';
        } elseif ($feature === 'executive_summary') {
            $userMessage = "Buat analisis ringkasan eksekutif komprehensif berdasarkan data resmi di atas.\n"
                ."Format output WAJIB berupa JSON valid dengan 3 atribut tingkat atas:\n"
                ."{\n"
                ."  \"ringkasan\": \"teks narasi ringkasan eksekutif mengenai kondisi capaian fisik dan serapan APBD...\",\n"
                ."  \"perhatian\": [\n"
                ."    {\"catatan\": \"catatan kendala atau indikator kritis 1...\"},\n"
                ."    {\"catatan\": \"catatan kendala atau indikator kritis 2...\"}\n"
                ."  ],\n"
                ."  \"rekomendasi\": [\n"
                ."    {\"tindakan\": \"rekomendasi tindak lanjut strategis 1...\"},\n"
                ."    {\"tindakan\": \"rekomendasi tindak lanjut strategis 2...\"}\n"
                ."  ]\n"
                ."}\n"
                .'Pastikan format JSON valid tanpa atribut pembungkus tambahan.';
        } else {
            $userMessage = 'Sajikan telaah dan rekomendasi resmi dalam bentuk teks narasi terstruktur dan poin-poin yang jelas menggunakan bahasa birokrasi formal pemerintahan Indonesia. DILARANG menggunakan format JSON atau kurung kurawal.';
        }

        $llmMessages = [
            [
                'role' => 'system',
                'content' => $prompt,
            ],
        ];

        if ($isChat && ! empty($context['history']) && is_array($context['history'])) {
            foreach (array_slice($context['history'], -6) as $turn) {
                if (isset($turn['role'], $turn['content']) && in_array($turn['role'], ['user', 'assistant'])) {
                    $llmMessages[] = [
                        'role' => $turn['role'],
                        'content' => (string) $turn['content'],
                    ];
                }
            }
        }

        $llmMessages[] = [
            'role' => 'user',
            'content' => $userMessage,
        ];

        $payload = [
            'model' => $model,
            'messages' => $llmMessages,
            'temperature' => 0.3,
            'max_tokens' => $isChat ? 1500 : 1024,
        ];

        if ($feature === 'executive_summary') {
            $payload['response_format'] = ['type' => 'json_object'];
        }

        $response = Http::timeout($timeout)
            ->withoutVerifying()
            ->withHeaders([
                'Authorization' => 'Bearer '.$apiKey,
                'HTTP-Referer' => config('app.url', 'http://localhost'), // OpenRouter header
                'X-Title' => config('app.name', 'e-SAKIP'),       // OpenRouter header
                'Content-Type' => 'application/json',
            ])
            ->post($baseUrl.'/chat/completions', $payload);

        if ($response->failed()) {
            $errBody = $response->json('error.message') ?? $response->body();
            throw new \RuntimeException(
                'AI provider HTTP '.$response->status().': '.$errBody
            );
        }

        $data = $response->json();
        $content = $data['choices'][0]['message']['content'] ?? '';
        $modelUsed = $data['model'] ?? $model;

        return [
            'output' => (string) $content,
            'provider_used' => 'http:llm:'.$modelUsed,
        ];
    }
}
