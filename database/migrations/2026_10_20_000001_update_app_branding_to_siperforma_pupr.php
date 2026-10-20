<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Update branding nama aplikasi menjadi SIPERFORMA PUPR.
     */
    public function up(): void
    {
        if (DB::getSchemaBuilder()->hasTable('app_configs')) {
            DB::table('app_configs')->whereIn('key', ['app.name', 'app_name'])->update([
                'value' => 'SIPERFORMA PUPR',
                'default_value' => 'SIPERFORMA PUPR',
            ]);

            DB::table('app_configs')->where('key', 'notification.sender_name')->update([
                'value' => 'SIPERFORMA PUPR System',
                'default_value' => 'SIPERFORMA PUPR System',
            ]);

            Cache::forget('app_general_config');
            Cache::forget('app_theme_config');
        }
    }

    public function down(): void
    {
        if (DB::getSchemaBuilder()->hasTable('app_configs')) {
            DB::table('app_configs')->whereIn('key', ['app.name', 'app_name'])->update([
                'value' => 'E-Sakip PUPR',
                'default_value' => 'E-Sakip PUPR',
            ]);

            DB::table('app_configs')->where('key', 'notification.sender_name')->update([
                'value' => 'e-SAKIP System',
                'default_value' => 'e-SAKIP System',
            ]);

            Cache::forget('app_general_config');
            Cache::forget('app_theme_config');
        }
    }
};
