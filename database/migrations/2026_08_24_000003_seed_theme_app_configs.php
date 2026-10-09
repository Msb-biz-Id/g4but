<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Tambah konfigurasi tema visual (warna, radius, font) ke tabel app_configs.
 */
return new class extends Migration
{
    public function up(): void
    {
        $configs = [
            [
                'key' => 'theme.primary_hsl',
                'value' => '243 75% 59%',
                'type' => 'string',
                'group' => 'Tema',
                'description' => 'Warna primer utama dalam format HSL (misal: 243 75% 59%)',
                'default_value' => '243 75% 59%',
                'is_secret' => false,
            ],
            [
                'key' => 'theme.primary_hsl_dark',
                'value' => '243 75% 70%',
                'type' => 'string',
                'group' => 'Tema',
                'description' => 'Warna primer mode gelap dalam format HSL',
                'default_value' => '243 75% 70%',
                'is_secret' => false,
            ],
            [
                'key' => 'theme.radius',
                'value' => '0.5',
                'type' => 'string',
                'group' => 'Tema',
                'description' => 'Border radius dalam rem (0 = sharp, 0.5 = normal, 0.75 = rounded, 1 = pill)',
                'default_value' => '0.5',
                'is_secret' => false,
            ],
            [
                'key' => 'theme.font_heading',
                'value' => 'Inter',
                'type' => 'string',
                'group' => 'Tema',
                'description' => 'Font untuk heading (Inter, Poppins, Plus Jakarta Sans)',
                'default_value' => 'Inter',
                'is_secret' => false,
            ],
            [
                'key' => 'theme.font_body',
                'value' => 'Inter',
                'type' => 'string',
                'group' => 'Tema',
                'description' => 'Font untuk body/konten (Inter, DM Sans, Nunito)',
                'default_value' => 'Inter',
                'is_secret' => false,
            ],
            [
                'key' => 'theme.preset',
                'value' => 'indigo',
                'type' => 'string',
                'group' => 'Tema',
                'description' => 'Nama preset warna aktif (indigo, blue, green, rose, orange, purple, teal, slate)',
                'default_value' => 'indigo',
                'is_secret' => false,
            ],
        ];

        foreach ($configs as $config) {
            DB::table('app_configs')->updateOrInsert(
                ['key' => $config['key']],
                array_merge($config, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }
    }

    public function down(): void
    {
        DB::table('app_configs')
            ->where('group', 'Tema')
            ->delete();
    }
};
