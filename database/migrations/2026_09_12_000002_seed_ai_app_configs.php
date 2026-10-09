<?php

use App\Models\AppConfig;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Bersihkan konfigurasi AI lama/duplikat jika ada
        AppConfig::where('group', 'ai')->whereIn('key', ['ai_model', 'ai_max_tokens'])->delete();

        $configs = [
            [
                'group'         => 'AI',
                'key'           => 'ai.provider',
                'label'         => 'Provider AI Aktif',
                'description'   => 'Pilih provider AI yang digunakan: "http" untuk API nyata (OpenRouter/OpenAI) atau "mock" untuk simulasi lokal tanpa API eksternal.',
                'type'          => 'string',
                'value'         => config('ekasuari.ai.provider', 'http'),
                'default_value' => 'http',
                'is_secret'     => false,
            ],
            [
                'group'         => 'AI',
                'key'           => 'ai.api_key',
                'label'         => 'API Key AI (OpenRouter / OpenAI)',
                'description'   => 'Kunci API rahasia untuk autentikasi ke OpenRouter atau OpenAI (contoh: sk-or-v1-... atau sk-...). Tersimpan aman dan tersamar.',
                'type'          => 'secret',
                'value'         => config('ekasuari.ai.api_key', ''),
                'default_value' => '',
                'is_secret'     => true,
            ],
            [
                'group'         => 'AI',
                'key'           => 'ai.base_url',
                'label'         => 'Base URL API AI',
                'description'   => 'Endpoint base URL provider AI. Default OpenRouter: https://openrouter.ai/api/v1 (atau https://api.openai.com/v1 untuk OpenAI resmi).',
                'type'          => 'string',
                'value'         => config('ekasuari.ai.base_url', 'https://openrouter.ai/api/v1'),
                'default_value' => 'https://openrouter.ai/api/v1',
                'is_secret'     => false,
            ],
            [
                'group'         => 'AI',
                'key'           => 'ai.model',
                'label'         => 'Model AI Digunakan',
                'description'   => 'ID/nama model LLM yang dipanggil (contoh: openai/gpt-4o-mini, google/gemini-2.0-flash, anthropic/claude-3.5-sonnet).',
                'type'          => 'string',
                'value'         => config('ekasuari.ai.model', 'openai/gpt-4o-mini'),
                'default_value' => 'openai/gpt-4o-mini',
                'is_secret'     => false,
            ],
            [
                'group'         => 'AI',
                'key'           => 'ai.timeout',
                'label'         => 'Batas Waktu Timeout (detik)',
                'description'   => 'Maksimal waktu tunggu respons panggilan API provider AI dalam detik (standar: 50 detik, SLA total: 60 detik).',
                'type'          => 'integer',
                'value'         => (string) config('ekasuari.ai.timeout', 50),
                'default_value' => '50',
                'is_secret'     => false,
            ],
            [
                'group'         => 'AI',
                'key'           => 'ai.daily_quota',
                'label'         => 'Kuota Harian Default per OPD',
                'description'   => 'Jumlah batas pemanggilan generate ringkasan per hari untuk setiap OPD jika belum diatur khusus (-1 untuk unlimited).',
                'type'          => 'integer',
                'value'         => (string) config('ekasuari.ai.daily_quota', 10),
                'default_value' => '10',
                'is_secret'     => false,
            ],
        ];

        foreach ($configs as $cfg) {
            AppConfig::updateOrCreate(
                ['key' => $cfg['key']],
                $cfg
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        AppConfig::where('group', 'AI')->whereIn('key', [
            'ai.provider',
            'ai.api_key',
            'ai.base_url',
            'ai.model',
            'ai.timeout',
            'ai.daily_quota',
        ])->delete();
    }
};
