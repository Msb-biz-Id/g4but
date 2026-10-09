<?php

namespace Tests\Feature\Auth;

use App\Enums\Role as RoleEnum;
use App\Models\User;
use Database\Seeders\AppConfigSeeder;
use Database\Seeders\OrganizationSeeder;
use Database\Seeders\PeriodSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\UserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SeededUserLoginTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            RolePermissionSeeder::class,
            OrganizationSeeder::class,
            UserSeeder::class,
            PeriodSeeder::class,
            AppConfigSeeder::class,
        ]);
    }

    public function test_all_opd_accounts_can_login_and_access_dashboard(): void
    {
        $accounts = [
            'superadmin@ekasuari.local' => RoleEnum::SuperAdmin->value,
            'admin.opd@ekasuari.local' => RoleEnum::AdminOpd->value,
            'kepala.opd@ekasuari.local' => RoleEnum::KepalaOpd->value,
            'admin.sekretariat@ekasuari.local' => RoleEnum::AdminSekretariat->value,
            'kepala.sekretariat@ekasuari.local' => RoleEnum::KepalaSekretariat->value,
            'admin.dikdas@ekasuari.local' => RoleEnum::AdminBidang->value,
            'kabid.dikdas@ekasuari.local' => RoleEnum::KepalaBidang->value,
        ];

        foreach ($accounts as $email => $expectedRole) {
            $user = User::where('email', $email)->first();
            $this->assertNotNull($user, "Akun {$email} harus terdaftar di sistem.");
            $this->assertTrue($user->roles()->where('name', $expectedRole)->exists(), "Akun {$email} harus memiliki role {$expectedRole}.");

            // Attempt login
            $response = $this->post(route('login'), [
                'email' => $email,
                'password' => 'Password@123',
            ]);

            $response->assertRedirect(route('dashboard'));
            $this->assertAuthenticatedAs($user);

            // Access dashboard
            $dashResponse = $this->actingAs($user)->get(route('dashboard'));
            $dashResponse->assertOk();

            // Logout for next iteration
            $this->post(route('logout'));
            $this->assertGuest();
        }
    }
}
