<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Wajibkan MFA selesai dikonfirmasi sebelum akses resource protected.
 * Hanya berlaku jika user punya role kritis DAN sudah enable MFA.
 * (FR-IAM-007)
 */
class RequireMfa
{
    /** Role yang wajib MFA sebelum bisa akses sistem */
    private const MFA_REQUIRED_ROLES = ['Super Admin', 'Admin Provinsi', 'Evaluator'];

    public function handle(Request $request, Closure $next): Response
    {
        // Skip MFA enforcement di testing — tests authenticate langsung tanpa MFA flow
        if (app()->environment('testing')) {
            return $next($request);
        }

        // Skip MFA jika fitur dinonaktifkan via ENV (MFA_ENABLED=false)
        // Baca langsung dari env() sebagai fallback agar tidak bergantung config cache
        if (! config('auth.mfa_enabled', true) || ! env('MFA_ENABLED', true)) {
            return $next($request);
        }

        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        // Cek apakah user punya role kritis
        $userRoles = $user->roles->pluck('name')->all();
        $hasCriticalRole = ! empty(array_intersect($userRoles, self::MFA_REQUIRED_ROLES));

        if (! $hasCriticalRole) {
            return $next($request);
        }

        // Jika MFA belum di-setup, redirect ke halaman setup
        if (! $user->google2fa_enabled) {
            if ($request->routeIs('mfa.*') || $request->routeIs('logout')) {
                return $next($request);
            }

            return redirect()->route('mfa.setup')
                ->with('warning', 'Akun Anda memerlukan autentikasi dua faktor (MFA). Silakan setup sekarang.');
        }

        // Jika MFA sudah enabled tapi belum diverifikasi di sesi ini
        if (! $request->session()->get('mfa_verified')) {
            if ($request->routeIs('mfa.*') || $request->routeIs('logout')) {
                return $next($request);
            }

            return redirect()->route('mfa.challenge');
        }

        return $next($request);
    }
}
