<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $now = now();

        // 1. Update Headline / Hero image
        DB::table('app_configs')
            ->where('key', 'ui_headline_image')
            ->whereIn('value', ['/images/hero-banner.jpg', 'images/hero-banner.jpg'])
            ->update(['value' => '/images/hero-banner.webp', 'updated_at' => $now]);

        DB::table('app_configs')
            ->where('key', 'ui_headline_image')
            ->whereIn('default_value', ['/images/hero-banner.jpg', 'images/hero-banner.jpg'])
            ->update(['default_value' => '/images/hero-banner.webp', 'updated_at' => $now]);

        // 2. Update Login background image
        DB::table('app_configs')
            ->where('key', 'ui_login_image')
            ->whereIn('value', [
                '/images/login-bg.png', 'images/login-bg.png',
                '/images/login-bg.jpg', 'images/login-bg.jpg',
            ])
            ->update(['value' => '/images/login-bg.webp', 'updated_at' => $now]);

        DB::table('app_configs')
            ->where('key', 'ui_login_image')
            ->whereIn('default_value', [
                '/images/login-bg.png', 'images/login-bg.png',
                '/images/login-bg.jpg', 'images/login-bg.jpg',
            ])
            ->update(['default_value' => '/images/login-bg.webp', 'updated_at' => $now]);

        // 3. Update App Logo
        DB::table('app_configs')
            ->where('key', 'app_logo')
            ->whereIn('value', ['/logo.png', 'logo.png'])
            ->update(['value' => '/logo.webp', 'updated_at' => $now]);

        DB::table('app_configs')
            ->where('key', 'app_logo')
            ->whereIn('default_value', ['/logo.png', 'logo.png'])
            ->update(['default_value' => '/logo.webp', 'updated_at' => $now]);

        // Clear general app configs cache
        Cache::forget('app_general_config');
    }

    public function down(): void
    {
        $now = now();

        DB::table('app_configs')
            ->where('key', 'ui_headline_image')
            ->update([
                'value'         => '/images/hero-banner.jpg',
                'default_value' => '/images/hero-banner.jpg',
                'updated_at'    => $now,
            ]);

        DB::table('app_configs')
            ->where('key', 'ui_login_image')
            ->update([
                'value'         => '/images/login-bg.png',
                'default_value' => '/images/login-bg.png',
                'updated_at'    => $now,
            ]);

        DB::table('app_configs')
            ->where('key', 'app_logo')
            ->update([
                'value'         => '/logo.png',
                'default_value' => '/logo.png',
                'updated_at'    => $now,
            ]);

        Cache::forget('app_general_config');
    }
};
