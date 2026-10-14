<?php

namespace Database\Seeders;

use App\Models\Indicator;
use App\Models\IndicatorTarget;
use App\Models\IndicatorVersion;
use App\Models\IkuRealization;
use App\Models\MeasurementPeriod;
use App\Models\MeasurementUnit;
use App\Models\Organization;
use App\Models\PlanningPeriod;
use App\Models\Realization;
use App\Models\User;
use Illuminate\Database\Seeder;

class MasterIndicatorSeeder extends Seeder
{
    /**
     * Menyiapkan Master Indikator Kinerja Utama (IKU) Berjenjang Resmi:
     * Dinas Pekerjaan Umum dan Penataan Ruang (PUPR) Kabupaten Mimika.
     * Mencakup: OPD Induk, Sekretariat, dan 4 Bidang Teknis
     * (Cipta Karya, Bina Marga, Sumber Daya Air, Penataan Ruang).
     * Disertai Target Multi-Tahun (2024-2026) dan Realisasi Kinerja Triwulanan.
     */
    public function run(): void
    {
        $rootOpd = Organization::where('code', 'OPD-INDUK')->firstOrFail();
        $sekretariat = Organization::where('code', 'SEKRETARIAT')->firstOrFail();
        $bidangCK = Organization::where('code', 'BIDANG-CK')->firstOrFail();
        $bidangBM = Organization::where('code', 'BIDANG-BM')->firstOrFail();
        $bidangSDA = Organization::where('code', 'BIDANG-SDA')->firstOrFail();
        $bidangTR = Organization::where('code', 'BIDANG-TR')->firstOrFail();

        $pctUnit = MeasurementUnit::where('code', 'PCT')->firstOrFail();
        $dokUnit = MeasurementUnit::where('code', 'DOK')->firstOrFail();
        $nilaiUnit = MeasurementUnit::where('code', 'NILAI')->firstOrFail();
        $kmUnit = MeasurementUnit::where('code', 'KM')->first() ?? $pctUnit;
        $unitUnit = MeasurementUnit::where('code', 'UNIT')->first() ?? $dokUnit;
        $haUnit = MeasurementUnit::where('code', 'HA')->first() ?? $dokUnit;

        // Seksi Organizations
        $seksiBM1 = Organization::where('code', 'SEKSI-BM-1')->first();
        $seksiBM2 = Organization::where('code', 'SEKSI-BM-2')->first();
        $seksiBM3 = Organization::where('code', 'SEKSI-BM-3')->first();
        $seksiCK1 = Organization::where('code', 'SEKSI-CK-1')->first();
        $seksiCK2 = Organization::where('code', 'SEKSI-CK-2')->first();
        $seksiCK3 = Organization::where('code', 'SEKSI-CK-3')->first();
        $seksiSDA1 = Organization::where('code', 'SEKSI-SDA-1')->first();
        $seksiSDA2 = Organization::where('code', 'SEKSI-SDA-2')->first();
        $seksiSDA3 = Organization::where('code', 'SEKSI-SDA-3')->first();
        $seksiTR1 = Organization::where('code', 'SEKSI-TR-1')->first();
        $seksiTR2 = Organization::where('code', 'SEKSI-TR-2')->first();
        $seksiTR3 = Organization::where('code', 'SEKSI-TR-3')->first();
        $uptd = Organization::where('code', 'UPTD-PUPR')->first();

        $pp2024 = PlanningPeriod::where('code', 'TA-2024')->first();
        $pp2025 = PlanningPeriod::where('code', 'TA-2025')->first();
        $pp2026 = PlanningPeriod::where('code', 'TA-2026')->firstOrFail();

        $superAdmin = User::where('email', 'superadmin@esakip.local')->first();
        $adminOpd = User::where('email', 'admin.opd@esakip.local')->first() ?? $superAdmin;
        $kadis = User::where('email', 'kepala.opd@esakip.local')->first() ?? $superAdmin;

        $indicators = [
            // ══ 1. IKU LEVEL OPD INDUK (DINAS PUPR MIMIKA) ══════════════════
            [
                'code' => 'IKU-OPD-01',
                'name' => 'Indeks Kemantapan Infrastruktur PUPR Kabupaten Mimika',
                'definition' => 'Komposit indeks ketercapaian kondisi mantap jalan, jembatan, air minum, sanitasi, dan drainase pengendali banjir.',
                'type' => 'outcome',
                'direction' => 'higher_is_better',
                'measurement_unit_id' => $nilaiUnit->id,
                'frequency' => 'annual',
                'level' => 'perangkat_daerah',
                'polarization' => 'positif',
                'owner_organization_id' => $rootOpd->id,
                'baseline_year' => 2023,
                'baseline_value' => 78.4,
                'targets' => [2024 => 81.0, 2025 => 84.5, 2026 => 87.0],
                'realizations' => [2024 => 82.3, 2025 => 85.1, 2026 => 86.8],
            ],
            [
                'code' => 'IKU-OPD-02',
                'name' => 'Persentase Jalan Kabupaten dalam Kondisi Mantap',
                'definition' => 'Panjang jalan poros dan strategis kabupaten dengan kondisi baik dan sedang dibanding total panjang jalan.',
                'type' => 'outcome',
                'direction' => 'higher_is_better',
                'measurement_unit_id' => $pctUnit->id,
                'frequency' => 'quarterly',
                'level' => 'perangkat_daerah',
                'polarization' => 'positif',
                'owner_organization_id' => $rootOpd->id,
                'baseline_year' => 2023,
                'baseline_value' => 64.2,
                'targets' => [2024 => 68.0, 2025 => 72.5, 2026 => 76.0],
                'realizations' => [2024 => 69.1, 2025 => 73.4, 2026 => 75.8],
            ],
            [
                'code' => 'IKU-OPD-03',
                'name' => 'Cakupan Akses Air Minum Layak dan Aman Berkelanjutan',
                'definition' => 'Persentase rumah tangga di wilayah perkotaan dan distrik Mimika yang terlayani air minum perpipaan layak.',
                'type' => 'outcome',
                'direction' => 'higher_is_better',
                'measurement_unit_id' => $pctUnit->id,
                'frequency' => 'quarterly',
                'level' => 'perangkat_daerah',
                'polarization' => 'positif',
                'owner_organization_id' => $rootOpd->id,
                'baseline_year' => 2023,
                'baseline_value' => 71.0,
                'targets' => [2024 => 74.0, 2025 => 78.0, 2026 => 82.0],
                'realizations' => [2024 => 75.2, 2025 => 79.1, 2026 => 81.5],
            ],
            [
                'code' => 'IKU-OPD-04',
                'name' => 'Persentase Luas Kawasan Rawan Banjir Sungai yang Tertangani',
                'definition' => 'Rasio pengurangan luas daerah genangan banjir Sungai Wania dan kawasan pesisir yang terlindungi tanggul.',
                'type' => 'outcome',
                'direction' => 'higher_is_better',
                'measurement_unit_id' => $pctUnit->id,
                'frequency' => 'quarterly',
                'level' => 'perangkat_daerah',
                'polarization' => 'positif',
                'owner_organization_id' => $rootOpd->id,
                'baseline_year' => 2023,
                'baseline_value' => 60.5,
                'targets' => [2024 => 65.0, 2025 => 70.0, 2026 => 75.0],
                'realizations' => [2024 => 66.8, 2025 => 71.3, 2026 => 74.2],
            ],
            [
                'code' => 'IKU-OPD-05',
                'name' => 'Tingkat Kesesuaian Pemanfaatan Ruang terhadap Dokumen RTRW',
                'definition' => 'Persentase izin kesesuaian ruang dan pemanfaatan lahan yang patuh terhadap zonasi RTRW Kabupaten Mimika.',
                'type' => 'outcome',
                'direction' => 'higher_is_better',
                'measurement_unit_id' => $pctUnit->id,
                'frequency' => 'annual',
                'level' => 'perangkat_daerah',
                'polarization' => 'positif',
                'owner_organization_id' => $rootOpd->id,
                'baseline_year' => 2023,
                'baseline_value' => 75.0,
                'targets' => [2024 => 80.0, 2025 => 85.0, 2026 => 90.0],
                'realizations' => [2024 => 81.5, 2025 => 86.0, 2026 => 89.4],
            ],

            // ══ 2. IKU LEVEL SEKRETARIAT DINAS ════════════════════════════════
            [
                'code' => 'IKU-SEKR-01',
                'name' => 'Nilai Akuntabilitas Kinerja Instansi Pemerintah (SAKIP) Dinas PUPR',
                'definition' => 'Hasil evaluasi akuntabilitas kinerja internal inspektorat atas perencanaan, pengukuran, pelaporan, dan evaluasi.',
                'type' => 'outcome',
                'direction' => 'higher_is_better',
                'measurement_unit_id' => $nilaiUnit->id,
                'frequency' => 'annual',
                'level' => 'perangkat_daerah',
                'polarization' => 'positif',
                'owner_organization_id' => $sekretariat->id,
                'baseline_year' => 2023,
                'baseline_value' => 79.2,
                'targets' => [2024 => 82.0, 2025 => 85.0, 2026 => 88.0],
                'realizations' => [2024 => 82.5, 2025 => 84.8, 2026 => 87.2],
            ],
            [
                'code' => 'IKU-SEKR-02',
                'name' => 'Persentase Kepatuhan Pengelolaan Administrasi, Keuangan, dan Aset',
                'definition' => 'Kepatuhan pelaporan keuangan tepat waktu, tertib inventarisasi BMD, dan kepatuhan SOP dinas.',
                'type' => 'output',
                'direction' => 'higher_is_better',
                'measurement_unit_id' => $pctUnit->id,
                'frequency' => 'quarterly',
                'level' => 'perangkat_daerah',
                'polarization' => 'positif',
                'owner_organization_id' => $sekretariat->id,
                'baseline_year' => 2023,
                'baseline_value' => 95.0,
                'targets' => [2024 => 98.0, 2025 => 100.0, 2026 => 100.0],
                'realizations' => [2024 => 98.5, 2025 => 99.4, 2026 => 100.0],
            ],

            // ══ 3. IKU LEVEL BIDANG CIPTA KARYA ═══════════════════════════════
            [
                'code' => 'IKU-CK-01',
                'name' => 'Persentase Bangunan Gedung Daerah Memenuhi Standar Laik Fungsi',
                'definition' => 'Rasio gedung pemerintahan daerah yang memiliki Sertifikat Laik Fungsi (SLF) dan standar tata bangunan aman.',
                'type' => 'output',
                'direction' => 'higher_is_better',
                'measurement_unit_id' => $pctUnit->id,
                'frequency' => 'quarterly',
                'level' => 'perangkat_daerah',
                'polarization' => 'positif',
                'owner_organization_id' => $bidangCK->id,
                'baseline_year' => 2023,
                'baseline_value' => 70.0,
                'targets' => [2024 => 75.0, 2025 => 80.0, 2026 => 85.0],
                'realizations' => [2024 => 76.5, 2025 => 81.2, 2026 => 84.0],
            ],
            [
                'code' => 'IKU-CK-02',
                'name' => 'Jumlah Sambungan Rumah (SR) Akses Air Minum Perpipaan Baru',
                'definition' => 'Pemasangan sambungan rumah tangga baru jaringan SPAM komunal perkotaan dan perdesaan Mimika.',
                'type' => 'output',
                'direction' => 'higher_is_better',
                'measurement_unit_id' => $dokUnit->id,
                'frequency' => 'quarterly',
                'level' => 'perangkat_daerah',
                'polarization' => 'positif',
                'owner_organization_id' => $bidangCK->id,
                'baseline_year' => 2023,
                'baseline_value' => 850,
                'targets' => [2024 => 1200, 2025 => 1500, 2026 => 1800],
                'realizations' => [2024 => 1250, 2025 => 1540, 2026 => 920],
            ],

            // ══ 4. IKU LEVEL BIDANG BINA MARGA ════════════════════════════════
            [
                'code' => 'IKU-BM-01',
                'name' => 'Panjang Jalan Kabupaten yang Ditingkatkan dan Direkonstruksi',
                'definition' => 'Total panjang ruas jalan poros kabupaten yang dilakukan pengaspalan baru dan peningkatan struktur.',
                'type' => 'output',
                'direction' => 'higher_is_better',
                'measurement_unit_id' => $kmUnit->id,
                'frequency' => 'quarterly',
                'level' => 'perangkat_daerah',
                'polarization' => 'positif',
                'owner_organization_id' => $bidangBM->id,
                'baseline_year' => 2023,
                'baseline_value' => 24.5,
                'targets' => [2024 => 32.0, 2025 => 38.0, 2026 => 45.0],
                'realizations' => [2024 => 33.2, 2025 => 38.6, 2026 => 22.4],
            ],
            [
                'code' => 'IKU-BM-02',
                'name' => 'Persentase Jembatan Kabupaten dalam Kondisi Mantap',
                'definition' => 'Rasio jembatan konstruksi beton/baja dengan nilai kondisi baik dan layak dilintasi beban kendaraan.',
                'type' => 'output',
                'direction' => 'higher_is_better',
                'measurement_unit_id' => $pctUnit->id,
                'frequency' => 'quarterly',
                'level' => 'perangkat_daerah',
                'polarization' => 'positif',
                'owner_organization_id' => $bidangBM->id,
                'baseline_year' => 2023,
                'baseline_value' => 78.0,
                'targets' => [2024 => 82.0, 2025 => 86.0, 2026 => 90.0],
                'realizations' => [2024 => 83.5, 2025 => 87.1, 2026 => 89.5],
            ],

            // ══ 5. IKU LEVEL BIDANG SUMBER DAYA AIR ═══════════════════════════
            [
                'code' => 'IKU-SDA-01',
                'name' => 'Panjang Saluran Drainase Primer dan Tanggul Banjir Terehabilitasi',
                'definition' => 'Panjang tanggul penahan banjir dan normalisasi alur sungai perkotaan Timika yang diselesaikan.',
                'type' => 'output',
                'direction' => 'higher_is_better',
                'measurement_unit_id' => $kmUnit->id,
                'frequency' => 'quarterly',
                'level' => 'perangkat_daerah',
                'polarization' => 'positif',
                'owner_organization_id' => $bidangSDA->id,
                'baseline_year' => 2023,
                'baseline_value' => 12.0,
                'targets' => [2024 => 16.0, 2025 => 20.0, 2026 => 25.0],
                'realizations' => [2024 => 16.8, 2025 => 21.2, 2026 => 12.5],
            ],

            // ══ 6. IKU LEVEL BIDANG PENATAAN RUANG ════════════════════════════
            [
                'code' => 'IKU-TR-01',
                'name' => 'Rasio Verifikasi Teknis Kesesuaian Kegiatan Pemanfaatan Ruang (KKPR)',
                'definition' => 'Rasio permohonan KKPR berusaha dan non-berusaha yang diterbitkan rekomendasi teknis tepat waktu.',
                'type' => 'output',
                'direction' => 'higher_is_better',
                'measurement_unit_id' => $pctUnit->id,
                'frequency' => 'quarterly',
                'level' => 'perangkat_daerah',
                'polarization' => 'positif',
                'owner_organization_id' => $bidangTR->id,
                'baseline_year' => 2023,
                'baseline_value' => 88.0,
                'targets' => [2024 => 92.0, 2025 => 95.0, 2026 => 98.0],
                'realizations' => [2024 => 93.4, 2025 => 96.2, 2026 => 97.5],
            ],

            // ══ 7. IKU LEVEL SEKSI & UPTD TEKNIS PUPR MIMIKA ══════════════
            // Seksi Bidang Bina Marga
            [
                'code' => 'IKU-S-BM-01',
                'name' => 'Panjang Rekonstruksi dan Peningkatan Jalan Poros Sp 2 - Sp 5',
                'definition' => 'Panjang penanganan jalan poros distrik dengan standar aspal hotmix.',
                'type' => 'output',
                'direction' => 'higher_is_better',
                'measurement_unit_id' => $kmUnit->id,
                'frequency' => 'quarterly',
                'level' => 'perangkat_daerah',
                'polarization' => 'positif',
                'owner_organization_id' => $seksiBM1?->id ?? $bidangBM->id,
                'baseline_year' => 2023,
                'baseline_value' => 8.0,
                'targets' => [2024 => 10.0, 2025 => 12.5, 2026 => 15.0],
                'realizations' => [2024 => 10.2, 2025 => 12.8, 2026 => 9.5],
            ],
            [
                'code' => 'IKU-S-BM-02',
                'name' => 'Persentase Penanganan Pemeliharaan Rutin Ruas Jalan Rusak Ringan',
                'definition' => 'Rasio perbaikan tambal lubang dan pembersihan bahu jalan kabupaten tepat waktu.',
                'type' => 'output',
                'direction' => 'higher_is_better',
                'measurement_unit_id' => $pctUnit->id,
                'frequency' => 'quarterly',
                'level' => 'perangkat_daerah',
                'polarization' => 'positif',
                'owner_organization_id' => $seksiBM2?->id ?? $bidangBM->id,
                'baseline_year' => 2023,
                'baseline_value' => 82.0,
                'targets' => [2024 => 86.0, 2025 => 90.0, 2026 => 94.0],
                'realizations' => [2024 => 87.5, 2025 => 91.0, 2026 => 93.0],
            ],
            [
                'code' => 'IKU-S-BM-03',
                'name' => 'Persentase Dokumen Detail Engineering Design (DED) Jalan Siap Lelang',
                'definition' => 'Ketersediaan dokumen teknis perencanaan konstruksi jalan dan jembatan.',
                'type' => 'output',
                'direction' => 'higher_is_better',
                'measurement_unit_id' => $pctUnit->id,
                'frequency' => 'quarterly',
                'level' => 'perangkat_daerah',
                'polarization' => 'positif',
                'owner_organization_id' => $seksiBM3?->id ?? $bidangBM->id,
                'baseline_year' => 2023,
                'baseline_value' => 90.0,
                'targets' => [2024 => 95.0, 2025 => 98.0, 2026 => 100.0],
                'realizations' => [2024 => 95.0, 2025 => 100.0, 2026 => 100.0],
            ],
            // Seksi Bidang Cipta Karya
            [
                'code' => 'IKU-S-CK-01',
                'name' => 'Persentase Pembangunan Gedung Pelayanan Publik Sesuai Standar K3',
                'definition' => 'Kepatuhan pelaksanaan proyek konstruksi gedung kantor dan fasilitas publik pada standar keselamatan.',
                'type' => 'output',
                'direction' => 'higher_is_better',
                'measurement_unit_id' => $pctUnit->id,
                'frequency' => 'quarterly',
                'level' => 'perangkat_daerah',
                'polarization' => 'positif',
                'owner_organization_id' => $seksiCK1?->id ?? $bidangCK->id,
                'baseline_year' => 2023,
                'baseline_value' => 85.0,
                'targets' => [2024 => 90.0, 2025 => 93.0, 2026 => 96.0],
                'realizations' => [2024 => 91.0, 2025 => 94.2, 2026 => 95.5],
            ],
            [
                'code' => 'IKU-S-CK-02',
                'name' => 'Luas Kawasan Permukiman Kumuh Perkotaan Timika yang Tertangani',
                'definition' => 'Total luas hektar kawasan permukiman yang diperbaiki drainase lingkungan dan sanitasi komunalnya.',
                'type' => 'output',
                'direction' => 'higher_is_better',
                'measurement_unit_id' => $haUnit->id,
                'frequency' => 'annual',
                'level' => 'perangkat_daerah',
                'polarization' => 'positif',
                'owner_organization_id' => $seksiCK2?->id ?? $bidangCK->id,
                'baseline_year' => 2023,
                'baseline_value' => 10.0,
                'targets' => [2024 => 15.0, 2025 => 20.0, 2026 => 25.0],
                'realizations' => [2024 => 15.8, 2025 => 21.0, 2026 => 18.2],
            ],
            [
                'code' => 'IKU-S-CK-03',
                'name' => 'Jumlah Sambungan Rumah (SR) Jaringan Air Bersih Perpipaan Terbangun',
                'definition' => 'Realisasi pemasangan sambungan air minum ke rumah tangga masyarakat berpenghasilan rendah.',
                'type' => 'output',
                'direction' => 'higher_is_better',
                'measurement_unit_id' => $unitUnit->id,
                'frequency' => 'quarterly',
                'level' => 'perangkat_daerah',
                'polarization' => 'positif',
                'owner_organization_id' => $seksiCK3?->id ?? $bidangCK->id,
                'baseline_year' => 2023,
                'baseline_value' => 500,
                'targets' => [2024 => 800, 2025 => 1200, 2026 => 1500],
                'realizations' => [2024 => 840, 2025 => 1250, 2026 => 980],
            ],
            // Seksi Bidang Sumber Daya Air
            [
                'code' => 'IKU-S-SDA-01',
                'name' => 'Panjang Saluran Drainase Perkotaan dan Pengendali Banjir Terbangun',
                'definition' => 'Pembangunan drainase primer dan sekunder untuk mengurangi titik genangan di perkotaan Timika.',
                'type' => 'output',
                'direction' => 'higher_is_better',
                'measurement_unit_id' => $kmUnit->id,
                'frequency' => 'quarterly',
                'level' => 'perangkat_daerah',
                'polarization' => 'positif',
                'owner_organization_id' => $seksiSDA1?->id ?? $bidangSDA->id,
                'baseline_year' => 2023,
                'baseline_value' => 6.0,
                'targets' => [2024 => 9.0, 2025 => 12.0, 2026 => 15.0],
                'realizations' => [2024 => 9.4, 2025 => 12.6, 2026 => 8.8],
            ],
            [
                'code' => 'IKU-S-SDA-02',
                'name' => 'Persentase Saluran Drainase Bebas Sedimen dan Sampah',
                'definition' => 'Tingkat kebersihan dan kelancaran aliran air pada jaringan saluran pembuang perkotaan.',
                'type' => 'output',
                'direction' => 'higher_is_better',
                'measurement_unit_id' => $pctUnit->id,
                'frequency' => 'quarterly',
                'level' => 'perangkat_daerah',
                'polarization' => 'positif',
                'owner_organization_id' => $seksiSDA2?->id ?? $bidangSDA->id,
                'baseline_year' => 2023,
                'baseline_value' => 75.0,
                'targets' => [2024 => 82.0, 2025 => 86.0, 2026 => 90.0],
                'realizations' => [2024 => 83.0, 2025 => 87.4, 2026 => 89.0],
            ],
            [
                'code' => 'IKU-S-SDA-03',
                'name' => 'Rasio Rekomendasi Teknis Pemanfaatan Sumber Air Baku Diterbitkan',
                'definition' => 'Ketepatan waktu penerbitan rekomendasi teknis izin pengambilan air tanah dan air permukaan.',
                'type' => 'output',
                'direction' => 'higher_is_better',
                'measurement_unit_id' => $pctUnit->id,
                'frequency' => 'quarterly',
                'level' => 'perangkat_daerah',
                'polarization' => 'positif',
                'owner_organization_id' => $seksiSDA3?->id ?? $bidangSDA->id,
                'baseline_year' => 2023,
                'baseline_value' => 92.0,
                'targets' => [2024 => 96.0, 2025 => 98.0, 2026 => 100.0],
                'realizations' => [2024 => 96.5, 2025 => 100.0, 2026 => 100.0],
            ],
            // Seksi Bidang Penataan Ruang
            [
                'code' => 'IKU-S-TR-01',
                'name' => 'Persentase Dokumen Rencana Rinci Tata Ruang (RDTR) Tersusun',
                'definition' => 'Progres penyusunan materi teknis dan rancangan peraturan kepala daerah tentang RDTR koridor prioritas.',
                'type' => 'output',
                'direction' => 'higher_is_better',
                'measurement_unit_id' => $pctUnit->id,
                'frequency' => 'annual',
                'level' => 'perangkat_daerah',
                'polarization' => 'positif',
                'owner_organization_id' => $seksiTR1?->id ?? $bidangTR->id,
                'baseline_year' => 2023,
                'baseline_value' => 70.0,
                'targets' => [2024 => 80.0, 2025 => 90.0, 2026 => 100.0],
                'realizations' => [2024 => 82.0, 2025 => 91.5, 2026 => 94.0],
            ],
            [
                'code' => 'IKU-S-TR-02',
                'name' => 'Tingkat Kesesuaian Lokasi Usaha dengan Pola Ruang RTRW Mimika',
                'definition' => 'Persentase verifikasi spasial lokasi berusaha yang sesuai dengan ketentuan zonasi rencana tata ruang.',
                'type' => 'output',
                'direction' => 'higher_is_better',
                'measurement_unit_id' => $pctUnit->id,
                'frequency' => 'quarterly',
                'level' => 'perangkat_daerah',
                'polarization' => 'positif',
                'owner_organization_id' => $seksiTR2?->id ?? $bidangTR->id,
                'baseline_year' => 2023,
                'baseline_value' => 88.0,
                'targets' => [2024 => 92.0, 2025 => 95.0, 2026 => 98.0],
                'realizations' => [2024 => 93.0, 2025 => 96.0, 2026 => 97.2],
            ],
            [
                'code' => 'IKU-S-TR-03',
                'name' => 'Persentase Pengawasan dan Penertiban Pemanfaatan Ruang',
                'definition' => 'Tingkat penanganan laporan pelanggaran pemanfaatan sempadan jalan dan sempadan sungai.',
                'type' => 'output',
                'direction' => 'higher_is_better',
                'measurement_unit_id' => $pctUnit->id,
                'frequency' => 'quarterly',
                'level' => 'perangkat_daerah',
                'polarization' => 'positif',
                'owner_organization_id' => $seksiTR3?->id ?? $bidangTR->id,
                'baseline_year' => 2023,
                'baseline_value' => 80.0,
                'targets' => [2024 => 85.0, 2025 => 90.0, 2026 => 94.0],
                'realizations' => [2024 => 85.0, 2025 => 90.5, 2026 => 92.0],
            ],
            // UPTD PUPR
            [
                'code' => 'IKU-UPTD-01',
                'name' => 'Tingkat Kesiapan Operasional Alat Berat Workshop dan Reaksi Cepat',
                'definition' => 'Rasio unit excavator, motor grader, dan dump truck yang siap operasi untuk penanganan darurat.',
                'type' => 'output',
                'direction' => 'higher_is_better',
                'measurement_unit_id' => $pctUnit->id,
                'frequency' => 'quarterly',
                'level' => 'perangkat_daerah',
                'polarization' => 'positif',
                'owner_organization_id' => $uptd?->id ?? $rootOpd->id,
                'baseline_year' => 2023,
                'baseline_value' => 86.0,
                'targets' => [2024 => 90.0, 2025 => 93.0, 2026 => 96.0],
                'realizations' => [2024 => 91.0, 2025 => 94.0, 2026 => 95.5],
            ],

            // ══ 8. ALIAS KOMPATIBILITAS SEEDER / TEST LAMA ═══════════════════
            [
                'code' => 'IKU-DIKDAS-01',
                'name' => 'Persentase Prasarana Jalan Distrik Sesuai Standar Teknis',
                'type' => 'output',
                'direction' => 'higher_is_better',
                'measurement_unit_id' => $pctUnit->id,
                'frequency' => 'quarterly',
                'level' => 'perangkat_daerah',
                'polarization' => 'positif',
                'owner_organization_id' => $bidangCK->id,
                'targets' => [2026 => 88.0],
                'realizations' => [2026 => 89.5],
            ],
            [
                'code' => 'IKU-DIKMEN-01',
                'name' => 'Tingkat Ketepatan Penyelesaian Proyek Infrastruktur Prioritas',
                'type' => 'output',
                'direction' => 'higher_is_better',
                'measurement_unit_id' => $pctUnit->id,
                'frequency' => 'quarterly',
                'level' => 'perangkat_daerah',
                'polarization' => 'positif',
                'owner_organization_id' => $bidangBM->id,
                'targets' => [2026 => 95.0],
                'realizations' => [2026 => 96.0],
            ],
        ];

        $periodMap = [
            2024 => $pp2024,
            2025 => $pp2025,
            2026 => $pp2026,
        ];

        foreach ($indicators as $indData) {
            $targets = $indData['targets'] ?? [];
            $realizations = $indData['realizations'] ?? [];
            unset($indData['targets'], $indData['realizations']);

            $indicator = Indicator::updateOrCreate(
                ['code' => $indData['code']],
                array_merge($indData, [
                    'is_iku' => true,
                    'status' => 'active',
                    'iku_status' => Indicator::IKU_STATUS_FINAL,
                    'planning_period_id' => $pp2026->id,
                    'responsible_officer_id' => $kadis->id,
                ])
            );

            $version = IndicatorVersion::updateOrCreate(
                [
                    'indicator_id' => $indicator->id,
                    'version_number' => 1,
                ],
                [
                    'name' => $indicator->name,
                    'type' => $indicator->type,
                    'direction' => $indicator->direction,
                    'measurement_unit_id' => $indicator->measurement_unit_id,
                    'frequency' => $indicator->frequency,
                ]
            );

            $indicator->update(['current_version_id' => $version->id]);

            // Simpan Target per Tahun
            foreach ($targets as $yr => $tVal) {
                $pPeriod = $periodMap[$yr] ?? $pp2026;
                IndicatorTarget::updateOrCreate(
                    [
                        'indicator_version_id' => $version->id,
                        'organization_id' => $indicator->owner_organization_id,
                        'planning_period_id' => $pPeriod->id,
                    ],
                    [
                        'year' => $yr,
                        'target_value' => $tVal,
                        'status' => 'approved',
                    ]
                );

                // Simpan Realisasi IKU Tahunan
                if (isset($realizations[$yr])) {
                    IkuRealization::updateOrCreate(
                        [
                            'indicator_id' => $indicator->id,
                            'year' => $yr,
                        ],
                        [
                            'planning_period_id' => $pPeriod->id,
                            'realization_value' => $realizations[$yr],
                            'notes' => "Realisasi tahun {$yr} terverifikasi berdasarkan audit fisik dan dokumen sah.",
                            'created_by' => $adminOpd->id,
                            'updated_by' => $kadis->id,
                        ]
                    );
                }
            }

            // Simpan Realisasi Triwulanan (2025 TW1-TW4 dan 2026 TW1-TW2)
            $twSeedData = [
                '2025-TW1' => ($realizations[2025] ?? 80) * 0.94,
                '2025-TW2' => ($realizations[2025] ?? 80) * 0.97,
                '2025-TW3' => ($realizations[2025] ?? 80) * 0.99,
                '2025-TW4' => $realizations[2025] ?? 80,
                '2026-TW1' => ($realizations[2026] ?? 85) * 0.93,
                '2026-TW2' => ($realizations[2026] ?? 85) * 0.97,
            ];

            foreach ($twSeedData as $twCode => $twVal) {
                $mp = MeasurementPeriod::where('code', $twCode)->first();
                if ($mp) {
                    Realization::updateOrCreate(
                        [
                            'organization_id' => $indicator->owner_organization_id,
                            'indicator_version_id' => $version->id,
                            'measurement_period_id' => $mp->id,
                        ],
                        [
                            'planning_period_id' => $mp->planning_period_id,
                            'value' => round($twVal, 2),
                            'narrative' => "Pencapaian {$indicator->name} pada {$mp->name} berjalan sesuai target sasaran.",
                            'status' => 'approved',
                            'submitted_by' => $adminOpd->id,
                            'submitted_at' => now()->subMonths(2),
                            'approved_by' => $kadis->id,
                            'approved_at' => now()->subMonths(1),
                            'version' => 1,
                        ]
                    );
                }
            }
        }
    }
}
