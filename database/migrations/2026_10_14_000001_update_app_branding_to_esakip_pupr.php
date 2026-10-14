<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Update branding nama aplikasi dan instansi menjadi E-Sakip PUPR Kabupaten Mimika.
     */
    public function up(): void
    {
        if (DB::getSchemaBuilder()->hasTable('app_configs')) {
            DB::table('app_configs')->whereIn('key', ['app.name', 'app_name'])->update([
                'value' => 'E-Sakip PUPR',
                'default_value' => 'E-Sakip PUPR',
            ]);

            DB::table('app_configs')->where('key', 'instansi_name')->update([
                'value' => 'Kabupaten Mimika',
                'default_value' => 'Kabupaten Mimika',
            ]);

            Cache::forget('app_general_config');
            Cache::forget('app_theme_config');
        }
    }

    public function down(): void
    {
        if (DB::getSchemaBuilder()->hasTable('app_configs')) {
            DB::table('app_configs')->whereIn('key', ['app.name', 'app_name'])->update([
                'value' => 'e-SAKIP',
                'default_value' => 'e-SAKIP',
            ]);

            DB::table('app_configs')->where('key', 'instansi_name')->update([
                'value' => 'Pemerintah Kabupaten Mimika',
                'default_value' => 'Pemerintah Kabupaten Mimika',
            ]);

            Cache::forget('app_general_config');
            Cache::forget('app_theme_config');
        }
    }
};
