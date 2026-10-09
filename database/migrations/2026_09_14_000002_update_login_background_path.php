<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $now = now();

        DB::table('app_configs')
            ->where('key', 'ui_login_image')
            ->whereIn('value', ['/images/login-bg.jpg', 'images/login-bg.jpg'])
            ->update(['value' => '/images/login-bg.png', 'updated_at' => $now]);

        DB::table('app_configs')
            ->where('key', 'ui_login_image')
            ->whereIn('default_value', ['/images/login-bg.jpg', 'images/login-bg.jpg'])
            ->update(['default_value' => '/images/login-bg.png', 'updated_at' => $now]);
    }

    public function down(): void
    {
        DB::table('app_configs')
            ->where('key', 'ui_login_image')
            ->update([
                'value'         => '/images/login-bg.jpg',
                'default_value' => '/images/login-bg.jpg',
            ]);
    }
};
