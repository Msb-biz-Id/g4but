<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use App\Models\AppConfig;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Sinkronkan nilai app_name dan hapus app.name duplicate
        $appName = DB::table('app_configs')->where('key', 'app_name')->value('value')
            ?: DB::table('app_configs')->where('key', 'app.name')->value('value')
            ?: 'e-KASUARI';

        DB::table('app_configs')->where('key', 'app_name')->update(['value' => $appName]);
        DB::table('app_configs')->where('key', 'app.name')->delete();

        // 2. Normalisasi group General -> general
        DB::table('app_configs')->where('group', 'General')->update(['group' => 'general']);

        // 3. Sinkronkan dan hapus duplikat security
        $sessionLifetime = DB::table('app_configs')->where('key', 'security.session_lifetime')->value('value')
            ?: DB::table('app_configs')->where('key', 'session_lifetime_minutes')->value('value')
            ?: '120';
        $maxLoginAttempts = DB::table('app_configs')->where('key', 'security.max_login_attempts')->value('value')
            ?: DB::table('app_configs')->where('key', 'max_login_attempts')->value('value')
            ?: '5';

        DB::table('app_configs')->where('key', 'security.session_lifetime')->update(['value' => $sessionLifetime]);
        DB::table('app_configs')->where('key', 'security.max_login_attempts')->update(['value' => $maxLoginAttempts]);
        DB::table('app_configs')->whereIn('key', ['session_lifetime_minutes', 'max_login_attempts'])->delete();

        // Normalisasi group Security -> security
        DB::table('app_configs')->where('group', 'Security')->update(['group' => 'security']);

        // 4. Hapus duplikat AI
        DB::table('app_configs')->whereIn('key', ['ai_model', 'ai_max_tokens'])->delete();
        // Normalisasi group AI -> ai
        DB::table('app_configs')->where('group', 'AI')->update(['group' => 'ai']);

        // 5. Normalisasi group Tema -> theme
        DB::table('app_configs')->where('group', 'Tema')->update(['group' => 'theme']);

        // 6. Normalisasi group Notifikasi -> notification, WhatsApp -> whatsapp, Early Warning -> ews
        DB::table('app_configs')->where('group', 'Notifikasi')->update(['group' => 'notification']);
        DB::table('app_configs')->where('group', 'WhatsApp')->update(['group' => 'whatsapp']);
        DB::table('app_configs')->where('group', 'Early Warning')->update(['group' => 'ews']);
    }

    public function down(): void
    {
        // No need to recreate duplicates
    }
};
