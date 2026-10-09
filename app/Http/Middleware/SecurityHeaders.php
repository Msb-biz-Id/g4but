<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Menambahkan security headers standar ke setiap response (BRD §22).
 *
 * Header yang ditambahkan:
 *   – X-Frame-Options          : Cegah clickjacking
 *   – X-Content-Type-Options   : Cegah MIME-sniffing
 *   – X-XSS-Protection         : Legacy XSS filter (browser lama)
 *   – Referrer-Policy          : Kontrol informasi referrer
 *   – Permissions-Policy       : Batasi akses sensor/kamera/GPS
 *   – Content-Security-Policy  : Cegah XSS & injection (FR-SEC-CSP)
 *   – Strict-Transport-Security: Paksa HTTPS (hanya aktif jika HTTPS) (FR-SEC-HSTS)
 */
class SecurityHeaders
{
    /**
     * Content-Security-Policy untuk aplikasi Inertia.js + React (Vite).
     *
     * Catatan:
     * – 'unsafe-inline' diperlukan karena Vite menyuntikkan style/script inline
     *   dan Inertia menyematkan page props via tag <script> inline.
     * – Setelah mengadopsi Vite nonce atau hash-based CSP, hapus 'unsafe-inline'.
     * – blob: pada img-src diperlukan untuk preview file evidence.
     * – Di environment local, Vite dev server (port 5173) ditambahkan ke
     *   script-src, connect-src, dan style-src agar HMR berfungsi.
     */
    private function buildCsp(): string
    {
        $isLocal = app()->environment('local');

        // Vite dev server origins (hanya IPv4 — IPv6 [::1] tidak valid dalam CSP spec)
        $viteSrc = $isLocal
            ? ' http://localhost:5173 http://127.0.0.1:5173 ws://localhost:5173 ws://127.0.0.1:5173'
            : '';

        return "default-src 'self'; " .
            "script-src 'self' 'unsafe-inline'{$viteSrc}; " .
            "style-src 'self' 'unsafe-inline' https://fonts.bunny.net https://fonts.googleapis.com{$viteSrc}; " .
            "img-src 'self' data: blob:; " .
            "font-src 'self' data: https://fonts.bunny.net https://fonts.gstatic.com; " .
            "connect-src 'self'{$viteSrc}; " .
            "media-src 'self'; " .
            "object-src 'none'; " .
            "frame-ancestors 'self'; " .
            "base-uri 'self'; " .
            "form-action 'self';";
    }

    /**
     * HTTP Strict-Transport-Security.
     * max-age 1 tahun, terapkan ke semua subdomain.
     * Hanya dikirim pada koneksi HTTPS agar tidak merusak local dev HTTP.
     */
    private const HSTS = 'max-age=31536000; includeSubDomains';

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Header berlaku di semua environment
        $response->headers->set('X-Frame-Options', 'SAMEORIGIN');
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-XSS-Protection', '1; mode=block');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
        $response->headers->set('Content-Security-Policy', $this->buildCsp());

        // HSTS hanya pada HTTPS agar local dev (HTTP) tidak terkunci ke HTTPS
        if ($request->isSecure()) {
            $response->headers->set('Strict-Transport-Security', self::HSTS);
        }

        return $response;
    }
}

