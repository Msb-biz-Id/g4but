<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Tambah konfigurasi Umum (deskripsi, logo, favicon) dan UI (headline, login image).
 */
return new class extends Migration
{
    public function up(): void
    {
        $now = now();
        $configs = [
            // ── General: tambah deskripsi, logo, favicon ──────────────────
            [
                'key'           => 'app_description',
                'value'         => 'Sistem Akuntabilitas Kinerja Instansi Pemerintah Provinsi Papua Barat',
                'type'          => 'string',
                'group'         => 'general',
                'label'         => 'Deskripsi / Tagline Aplikasi',
                'description'   => 'Tagline atau deskripsi singkat yang tampil di halaman publik dan laporan.',
                'default_value' => 'Sistem Akuntabilitas Kinerja Instansi Pemerintah Provinsi Papua Barat',
                'is_secret'     => false,
            ],
            [
                'key'           => 'app_logo',
                'value'         => '/logo.png',
                'type'          => 'string',
                'group'         => 'general',
                'label'         => 'Logo Aplikasi',
                'description'   => 'Path file logo (PNG, SVG). Upload untuk mengganti logo di navbar, PDF, dan halaman publik.',
                'default_value' => '/logo.png',
                'is_secret'     => false,
            ],
            [
                'key'           => 'app_favicon',
                'value'         => '/favicon.ico',
                'type'          => 'string',
                'group'         => 'general',
                'label'         => 'Favicon Aplikasi',
                'description'   => 'Icon yang tampil di tab browser. Format ICO, PNG, atau SVG (rekomendasi 32×32px).',
                'default_value' => '/favicon.ico',
                'is_secret'     => false,
            ],
            // ── UI: gambar headline & login ─────────────────────────────
            [
                'key'           => 'ui_headline_image',
                'value'         => '/images/hero-banner.jpg',
                'type'          => 'string',
                'group'         => 'ui',
                'label'         => 'Gambar Headline (Welcome Page)',
                'description'   => 'Gambar banner utama di halaman publik Welcome. Rekomendasi rasio 16:9, min 1280×720px.',
                'default_value' => '/images/hero-banner.jpg',
                'is_secret'     => false,
            ],
            [
                'key'           => 'ui_login_image',
                'value'         => '/images/login-bg.png',
                'type'          => 'string',
                'group'         => 'ui',
                'label'         => 'Gambar Background Halaman Login',
                'description'   => 'Gambar latar belakang di halaman login. Rekomendasi min 1920×1080px.',
                'default_value' => '/images/login-bg.png',
                'is_secret'     => false,
            ],
            [
                'key'           => 'ui_headline_title',
                'value'         => '',
                'type'          => 'string',
                'group'         => 'ui',
                'label'         => 'Judul Overlay Headline',
                'description'   => 'Teks judul yang ditampilkan di atas gambar headline (kosongkan jika tidak perlu).',
                'default_value' => '',
                'is_secret'     => false,
            ],
            [
                'key'           => 'ui_headline_subtitle',
                'value'         => '',
                'type'          => 'string',
                'group'         => 'ui',
                'label'         => 'Subtitle Overlay Headline',
                'description'   => 'Teks subtitle di bawah judul headline (kosongkan jika tidak perlu).',
                'default_value' => '',
                'is_secret'     => false,
            ],
        ];

        foreach ($configs as $config) {
            DB::table('app_configs')->updateOrInsert(
                ['key' => $config['key']],
                array_merge($config, ['created_at' => $now, 'updated_at' => $now])
            );
        }
    }

    public function down(): void
    {
        DB::table('app_configs')->whereIn('key', [
            'app_description','app_logo','app_favicon',
            'ui_headline_image','ui_login_image','ui_headline_title','ui_headline_subtitle',
        ])->delete();
    }
};
