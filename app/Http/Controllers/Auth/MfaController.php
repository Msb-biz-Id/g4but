<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\AuditService;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Inertia\Inertia;
use Inertia\Response;
use PragmaRX\Google2FA\Google2FA;

/**
 * Mengatur setup, challenge, dan disable MFA (FR-IAM-007).
 */
class MfaController extends Controller
{
    public function __construct(
        private readonly Google2FA $google2fa,
        private readonly AuditService $audit,
    ) {}

    /**
     * Tampilkan halaman setup MFA (generate QR lokal sebagai SVG).
     */
    public function setupShow(Request $request): Response
    {
        $user = $request->user();

        // Generate secret baru jika belum ada
        if (! $user->google2fa_secret) {
            $secret = $this->google2fa->generateSecretKey();
            $user->update(['google2fa_secret' => Crypt::encryptString($secret)]);
        } else {
            $secret = Crypt::decryptString($user->google2fa_secret);
        }

        $qrCodeUrl = $this->google2fa->getQRCodeUrl(
            config('app.name', 'e-KASUARI'),
            $user->email,
            $secret,
        );

        // Generate QR code lokal sebagai SVG (tidak bergantung internet)
        $renderer = new ImageRenderer(
            new RendererStyle(200),
            new SvgImageBackEnd(),
        );
        $writer  = new Writer($renderer);
        $qrSvg   = $writer->writeString($qrCodeUrl);
        $qrImage = 'data:image/svg+xml;base64,' . base64_encode($qrSvg);

        return Inertia::render('Auth/MfaSetup', [
            'secret'  => $secret,
            'qrImage' => $qrImage,
        ]);
    }

    /**
     * Konfirmasi setup MFA dengan kode OTP pertama.
     */
    public function setupConfirm(Request $request): RedirectResponse
    {
        $request->validate([
            'code' => ['required', 'string', 'size:6'],
        ]);

        $user = $request->user();
        $secret = Crypt::decryptString($user->google2fa_secret);

        $valid = $this->google2fa->verifyKey($secret, $request->string('code'));

        if (! $valid) {
            return back()->withErrors(['code' => 'Kode OTP tidak valid. Pastikan waktu perangkat Anda sudah sinkron.']);
        }

        $user->update([
            'google2fa_enabled' => true,
            'google2fa_confirmed_at' => now(),
        ]);

        $request->session()->put('mfa_verified', true);

        $this->audit->log('mfa_enabled', 'user', $user->id, null);

        return redirect()->route('dashboard')->with('success', 'MFA berhasil diaktifkan. Akun Anda kini lebih aman.');
    }

    /**
     * Tampilkan halaman challenge OTP (setelah login).
     */
    public function challengeShow(Request $request): Response|RedirectResponse
    {
        if ($request->session()->get('mfa_verified')) {
            return redirect()->intended(route('dashboard'));
        }

        return Inertia::render('Auth/MfaChallenge');
    }

    /**
     * Verifikasi kode OTP dari challenge.
     */
    public function challengeVerify(Request $request): RedirectResponse
    {
        $request->validate([
            'code' => ['required', 'string', 'size:6'],
        ]);

        $user = $request->user();
        $secret = Crypt::decryptString($user->google2fa_secret);

        $valid = $this->google2fa->verifyKey($secret, $request->string('code'));

        if (! $valid) {
            $this->audit->log('mfa_failed', 'user', $user->id, null);

            return back()->withErrors(['code' => 'Kode OTP tidak valid atau sudah kedaluwarsa.']);
        }

        $request->session()->put('mfa_verified', true);

        $this->audit->log('mfa_verified', 'user', $user->id, null);

        return redirect()->intended(route('dashboard'));
    }

    /**
     * Disable MFA (hanya jika user konfirmasi dengan OTP aktif).
     */
    public function disable(Request $request): RedirectResponse
    {
        $request->validate([
            'code' => ['required', 'string', 'size:6'],
        ]);

        $user = $request->user();
        $secret = Crypt::decryptString($user->google2fa_secret);

        $valid = $this->google2fa->verifyKey($secret, $request->string('code'));

        if (! $valid) {
            return back()->withErrors(['code' => 'Kode OTP tidak valid.']);
        }

        $user->update([
            'google2fa_secret' => null,
            'google2fa_enabled' => false,
            'google2fa_confirmed_at' => null,
        ]);

        $request->session()->forget('mfa_verified');

        $this->audit->log('mfa_disabled', 'user', $user->id, null);

        return redirect()->route('profile.show')->with('success', 'MFA berhasil dinonaktifkan.');
    }
}
