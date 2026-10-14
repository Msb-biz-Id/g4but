<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Test registrasi user.
 *
 * Keputusan desain (FR-SEC-REG): Registrasi mandiri via URL /register
 * DINONAKTIFKAN. e-SAKIP adalah sistem internal pemerintah — user hanya
 * boleh dibuat oleh Super Admin melalui menu Manajemen User.
 *
 * Test di bawah memverifikasi bahwa:
 *  1. Route /register mengembalikan 404 (bukan 200).
 *  2. POST /register tidak berhasil membuat user baru.
 *  3. User tetap bisa dibuat secara programatik (via factory/admin flow).
 */
class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function registration_screen_is_disabled_and_returns_404(): void
    {
        // Registrasi publik dinonaktifkan — harus 404, bukan 200
        $response = $this->get('/register');

        $response->assertStatus(404);
    }

    #[Test]
    public function new_users_cannot_self_register_via_public_route(): void
    {
        // POST ke /register harus 404 — tidak boleh membuat user baru secara mandiri
        $response = $this->post('/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response->assertStatus(404);

        // Tidak ada user yang terbuat
        $this->assertGuest();
        $this->assertDatabaseMissing('users', ['email' => 'test@example.com']);
    }

    #[Test]
    public function users_can_be_created_by_admin_programmatically(): void
    {
        // User tetap dapat dibuat via factory (simulasi alur Admin → buat user)
        $user = User::factory()->create([
            'email' => 'operator@opd.go.id',
        ]);

        $this->assertDatabaseHas('users', ['email' => 'operator@opd.go.id']);
        $this->assertTrue($user->exists);
    }
}
