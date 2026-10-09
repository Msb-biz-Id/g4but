<?php

namespace App\Services;

use App\Models\AppConfig;
use Illuminate\Support\Facades\Log;

class PdfService
{
    private static ?string $cachedLogoBase64 = null;

    /**
     * Mengambil logo aplikasi secara dinamis dari database (app_configs)
     * dan mengubahnya menjadi Data URI Base64 (image/png atau image/jpeg)
     * yang 100% kompatibel dengan Dompdf di semua platform (Windows & Linux).
     */
    public static function getLogoBase64(): ?string
    {
        if (self::$cachedLogoBase64 !== null) {
            return self::$cachedLogoBase64;
        }

        $configLogo = null;
        try {
            $configLogo = AppConfig::where('key', 'app_logo')->value('value');
        } catch (\Throwable $e) {
            Log::warning('PdfService: Gagal mengambil config app_logo', ['error' => $e->getMessage()]);
        }

        $candidates = [];

        if (!empty($configLogo)) {
            $parsedPath = parse_url($configLogo, PHP_URL_PATH) ?? $configLogo;
            $cleanPath  = ltrim($parsedPath, '/\\');

            // Jika file di folder storage (misal /storage/uploads/logo.png)
            if (str_starts_with($cleanPath, 'storage/')) {
                $storageRel = substr($cleanPath, 8);
                $candidates[] = storage_path('app/public/' . $storageRel);
            }

            // Jika berformat .webp, prioritaskan versi .png saudara kandungnya jika ada
            if (str_ends_with(strtolower($cleanPath), '.webp')) {
                $pngVersion = preg_replace('/\.webp$/i', '.png', $cleanPath);
                $candidates[] = public_path($pngVersion);
                $candidates[] = storage_path('app/public/' . $pngVersion);
            }

            $candidates[] = public_path($cleanPath);
            $candidates[] = base_path($cleanPath);
            if (file_exists($configLogo)) {
                $candidates[] = $configLogo;
            }
        }

        // Fallback file default sistem (prioritaskan format JPEG yang bebas transparansi)
        $candidates[] = public_path('logo-flat.jpg');
        $candidates[] = public_path('images/logo-flat.jpg');
        $candidates[] = public_path('logo.jpg');
        $candidates[] = public_path('logo.png');
        $candidates[] = public_path('images/logo.png');
        $candidates[] = public_path('logo.webp');
        $candidates[] = public_path('images/logo.webp');

        foreach ($candidates as $filePath) {
            if (empty($filePath) || !file_exists($filePath) || !is_file($filePath)) {
                continue;
            }

            $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));

            // Format raster langsung didukung Dompdf
            // PERBAIKAN: Selalu ratakan (flatten) gambar ke atas background putih dan encode sebagai JPEG.
            // Ini mencegah Dompdf memanggil addImagePngAlpha() yang memicu ImagickException pada PHP 8.4/server dengan konfigurasi Imagick bermasalah.
            $data = @file_get_contents($filePath);
            if ($data !== false && strlen($data) > 0) {
                // Jika ekstensi sudah jpg/jpeg, return langsung
                if (in_array($ext, ['jpg', 'jpeg'], true)) {
                    self::$cachedLogoBase64 = 'data:image/jpeg;base64,' . base64_encode($data);
                    return self::$cachedLogoBase64;
                }

                // Untuk PNG atau WEBP, konversi ke JPEG berlatar putih menggunakan GD
                if (function_exists('imagecreatefromstring') && function_exists('imagecreatetruecolor') && function_exists('imagejpeg')) {
                    $im = @imagecreatefromstring($data);
                    if ($im !== false) {
                        $w = imagesx($im);
                        $h = imagesy($im);
                        $canvas = imagecreatetruecolor($w, $h);
                        $white = imagecolorallocate($canvas, 255, 255, 255);
                        imagefilledrectangle($canvas, 0, 0, $w, $h, $white);
                        imagecopy($canvas, $im, 0, 0, 0, 0, $w, $h);

                        ob_start();
                        imagejpeg($canvas, null, 92);
                        $jpegData = ob_get_clean();
                        imagedestroy($im);
                        imagedestroy($canvas);

                        if (!empty($jpegData)) {
                            self::$cachedLogoBase64 = 'data:image/jpeg;base64,' . base64_encode($jpegData);
                            return self::$cachedLogoBase64;
                        }
                    }
                }

                // Fallback jika GD tidak tersedia
                $mime = $ext === 'png' ? 'image/png' : 'image/jpeg';
                self::$cachedLogoBase64 = 'data:' . $mime . ';base64,' . base64_encode($data);
                return self::$cachedLogoBase64;
            }
        }

        return null;
    }

    /**
     * Ambil nama provinsi dinamis (default: 'Provinsi Papua Barat').
     */
    public static function getProvinceName(): string
    {
        try {
            return AppConfig::where('key', 'province_name')->value('value') ?: 'Provinsi Papua Barat';
        } catch (\Throwable) {
            return 'Provinsi Papua Barat';
        }
    }

    /**
     * Ambil nama aplikasi dinamis (default: 'e-KASUARI').
     */
    public static function getAppName(): string
    {
        try {
            return AppConfig::where('key', 'app_name')->value('value') ?: 'e-KASUARI';
        } catch (\Throwable) {
            return 'e-KASUARI';
        }
    }
}
