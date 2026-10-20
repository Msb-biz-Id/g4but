<?php

use Illuminate\Database\Migrations\Migration;
use App\Models\AppConfig;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $defaultLogos = [
            [
                'id' => '1',
                'name' => 'Pemerintah Kabupaten Mimika',
                'image' => '/logo.webp',
                'url' => 'https://mimikakab.go.id',
                'active' => true,
            ],
            [
                'id' => '2',
                'name' => 'Kementerian Pekerjaan Umum dan Perumahan Rakyat (PUPR)',
                'image' => '/images/partners/pupr.png',
                'url' => 'https://pu.go.id',
                'active' => true,
            ],
            [
                'id' => '3',
                'name' => 'Kementerian PAN dan Reformasi Birokrasi (PAN-RB)',
                'image' => '/images/partners/menpanrb.png',
                'url' => 'https://menpan.go.id',
                'active' => true,
            ],
            [
                'id' => '4',
                'name' => 'Badan Pemeriksa Keuangan Republik Indonesia (BPK RI)',
                'image' => '/images/partners/bpk.png',
                'url' => 'https://bpk.go.id',
                'active' => true,
            ],
            [
                'id' => '5',
                'name' => 'Badan Pengawasan Keuangan dan Pembangunan (BPKP)',
                'image' => '/images/partners/bpkp.png',
                'url' => 'https://bpkp.go.id',
                'active' => true,
            ],
            [
                'id' => '6',
                'name' => 'Kementerian Dalam Negeri Republik Indonesia',
                'image' => '/images/partners/kemendagri.png',
                'url' => 'https://kemendagri.go.id',
                'active' => true,
            ],
            [
                'id' => '7',
                'name' => 'Badan Pusat Statistik Republik Indonesia (BPS RI)',
                'image' => '/images/partners/bps.png',
                'url' => 'https://bps.go.id',
                'active' => true,
            ],
        ];

        AppConfig::updateOrCreate(
            ['key' => 'ui_logo_slider'],
            [
                'group' => 'UI',
                'label' => 'Slide Logo Mitra & Terkait',
                'description' => 'Daftar logo instansi, mitra, dan tautan yang tampil pada slider beranda di bawah headline.',
                'type' => 'json',
                'value' => json_encode($defaultLogos, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT),
                'default_value' => json_encode($defaultLogos, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT),
                'is_secret' => false,
            ]
        );
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        AppConfig::where('key', 'ui_logo_slider')->delete();
    }
};
