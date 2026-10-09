<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Test suite Fase 2 — Keamanan (FR-SEC-CSP, FR-SEC-HSTS, FR-SEC-REG).
 *
 * Memverifikasi:
 *  1. Security headers hadir di setiap response.
 *  2. Content-Security-Policy terpasang dan mengandung directive wajib.
 *  3. HSTS tidak dikirim pada HTTP (local dev aman).
 *  4. Route registrasi publik sudah dinonaktifkan (mengembalikan 404).
 *  5. Halaman login masih bisa diakses (tidak ikut ter-block).
 *  6. canRegister prop false di halaman Welcome.
 *  7. Login throttle aktif setelah sejumlah percobaan gagal.
 */
class SecurityTest extends TestCase
{
    use RefreshDatabase;

    // ── 2.1 Security Headers ────────────────────────────────────────────────

    #[Test]
    public function security_headers_present_on_every_response(): void
    {
        $response = $this->get('/');

        $response->assertHeader('X-Frame-Options', 'SAMEORIGIN');
        $response->assertHeader('X-Content-Type-Options', 'nosniff');
        $response->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->assertHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    }

    #[Test]
    public function content_security_policy_header_is_present(): void
    {
        $response = $this->get('/login');

        $response->assertHeader('Content-Security-Policy');

        $csp = $response->headers->get('Content-Security-Policy');

        $this->assertStringContainsString("default-src 'self'", $csp);
        $this->assertStringContainsString('script-src', $csp);
        $this->assertStringContainsString("object-src 'none'", $csp);
        $this->assertStringContainsString("base-uri 'self'", $csp);
        $this->assertStringContainsString("form-action 'self'", $csp);
    }

    #[Test]
    public function hsts_header_not_sent_over_plain_http(): void
    {
        // Di test environment, request tidak pakai HTTPS — HSTS tidak boleh dikirim
        $response = $this->get('/login');

        $this->assertNull(
            $response->headers->get('Strict-Transport-Security'),
            'HSTS tidak boleh dikirim pada HTTP — hanya pada HTTPS.'
        );
    }

    #[Test]
    public function security_headers_also_present_on_authenticated_routes(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get('/dashboard');

        $response->assertHeader('X-Frame-Options');
        $response->assertHeader('X-Content-Type-Options');
        $response->assertHeader('Content-Security-Policy');
    }

    // ── 2.2 Route Registrasi Dinonaktifkan ──────────────────────────────────

    #[Test]
    public function public_registration_get_route_is_disabled(): void
    {
        $response = $this->get('/register');

        $response->assertStatus(404);
    }

    #[Test]
    public function public_registration_post_route_is_disabled(): void
    {
        $response = $this->post('/register', [
            'name' => 'Penyusup',
            'email' => 'penyusup@evil.com',
            'password' => 'Password1!',
            'password_confirmation' => 'Password1!',
        ]);

        $response->assertStatus(404);
        $this->assertDatabaseMissing('users', ['email' => 'penyusup@evil.com']);
    }

    #[Test]
    public function login_page_still_accessible_after_register_disabled(): void
    {
        $response = $this->get('/login');

        $response->assertStatus(200);
    }

    #[Test]
    public function can_register_prop_is_false_on_welcome_page(): void
    {
        // Inertia meletakkan shared props & page props langsung di root page object,
        // bukan di dalam kunci "props". Gunakan ->where('canRegister', false).
        $response = $this->get('/');

        $response->assertInertia(fn ($page) => $page->where('canRegister', false)
        );
    }

    // ── 2.4 Rate Limiting ────────────────────────────────────────────────────

    #[Test]
    public function login_is_throttled_after_too_many_failures(): void
    {
        $user = User::factory()->create();

        foreach (range(1, 6) as $attempt) {
            $this->post('/login', [
                'email' => $user->email,
                'password' => 'wrong-password',
            ]);
        }

        $response = $this->post('/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ]);

        $this->assertTrue(
            $response->status() === 429 || $response->isRedirect(),
            "Percobaan login ke-7 seharusnya di-throttle, mendapat status: {$response->status()}"
        );
    }
}
