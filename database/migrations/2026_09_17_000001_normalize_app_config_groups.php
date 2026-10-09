<?php

use App\Models\AppConfig;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Normalisasi nama grup AppConfig ke format standar huruf kecil
        DB::table('app_configs')->where('group', 'AI')->update(['group' => 'ai']);
        DB::table('app_configs')->where('group', 'General')->update(['group' => 'general']);
        DB::table('app_configs')->where('group', 'Security')->update(['group' => 'security']);
        DB::table('app_configs')->where('group', 'Notifikasi')->update(['group' => 'notification']);
        DB::table('app_configs')->where('group', 'WhatsApp')->update(['group' => 'whatsapp']);
        DB::table('app_configs')->where('group', 'Early Warning')->update(['group' => 'ews']);

        // 2. Pastikan ai.api_key selalu ada dan terdaftar pada group 'ai'
        $existingApiKey = AppConfig::where('key', 'ai.api_key')->first();
        if ($existingApiKey) {
            $existingApiKey->update([
                'group' => 'ai',
                'label' => 'API Key AI (OpenRouter / OpenAI / Gemini)',
                'type' => 'secret',
                'is_secret' => true,
            ]);
        } else {
            AppConfig::create([
                'group' => 'ai',
                'key' => 'ai.api_key',
                'label' => 'API Key AI (OpenRouter / OpenAI / Gemini)',
                'description' => 'Kunci API rahasia untuk autentikasi ke provider AI (contoh: sk-or-v1-... atau sk-...). Tersimpan aman dan tersamar.',
                'type' => 'secret',
                'value' => (string) config('ekasuari.ai.api_key', ''),
                'default_value' => '',
                'is_secret' => true,
            ]);
        }

        // 3. Pastikan ai.provider terdaftar pada group 'ai'
        $existingProvider = AppConfig::where('key', 'ai.provider')->first();
        if ($existingProvider) {
            $existingProvider->update([
                'group' => 'ai',
                'label' => 'Provider AI Aktif',
            ]);
        } else {
            AppConfig::create([
                'group' => 'ai',
                'key' => 'ai.provider',
                'label' => 'Provider AI Aktif',
                'description' => 'Pilih provider AI yang digunakan: "http" untuk API nyata (OpenRouter/OpenAI/Gemini) atau "mock" untuk simulasi lokal tanpa API eksternal.',
                'type' => 'string',
                'value' => (string) config('ekasuari.ai.provider', 'http'),
                'default_value' => 'http',
                'is_secret' => false,
            ]);
        }

        // 4. Migrasi kunci legacy ai_model ke ai.model jika ada
        $oldModel = AppConfig::where('key', 'ai_model')->first();
        if ($oldModel) {
            AppConfig::updateOrCreate(
                ['key' => 'ai.model'],
                [
                    'group' => 'ai',
                    'label' => 'Model AI Digunakan',
                    'description' => 'ID/nama model LLM yang dipanggil (contoh: openai/gpt-4o-mini, google/gemini-2.0-flash, gemini-pro).',
                    'type' => 'string',
                    'value' => $oldModel->value ?: 'openai/gpt-4o-mini',
                    'default_value' => 'openai/gpt-4o-mini',
                    'is_secret' => false,
                ]
            );
            $oldModel->delete();
        }

        // 5. Migrasi kunci legacy ai_max_tokens ke ai.max_tokens jika ada
        $oldTokens = AppConfig::where('key', 'ai_max_tokens')->first();
        if ($oldTokens) {
            AppConfig::updateOrCreate(
                ['key' => 'ai.max_tokens'],
                [
                    'group' => 'ai',
                    'label' => 'Maks. Token AI',
                    'description' => 'Batas maksimum token untuk setiap permintaan ke AI.',
                    'type' => 'integer',
                    'value' => $oldTokens->value ?: '2048',
                    'default_value' => '2048',
                    'is_secret' => false,
                ]
            );
            $oldTokens->delete();
        }

        // 6. Bersihkan cache konfigurasi
        Cache::forget('app_configs.all');
        Cache::forget('app_config_all');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No reverse needed for normalization
    }
};
