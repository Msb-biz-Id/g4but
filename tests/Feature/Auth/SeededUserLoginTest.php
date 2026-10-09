<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\LocalUserSeeder;
use Database\Seeders\KamarOpdSeeder;
use Database\Seeders\AppConfigSeeder;
use Database\Seeders\MasterPeriodSeeder;
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
            LocalUserSeeder::class,
            KamarOpdSeeder::class,
            AppConfigSeeder::class,
            MasterPeriodSeeder::class,
        ]);
    }

    public function test_all_demo_accounts_can_login_and_access_dashboard(): void
    {
        $demoEmails = [
            'admin@ekasuari.test',
            'admin.provinsi@ekasuari.test',
            'pimpinan@ekasuari.test',
            'admin.opd@ekasuari.test',
            'operator.opd@ekasuari.test',
            'validator.opd@ekasuari.test',
            'kepala.opd@ekasuari.test',
            'admin.disdik@ekasuari.test',
            'admin.dinkes@ekasuari.test',
            'admin.bappeda@ekasuari.test',
            'admin.pupr@ekasuari.test',
            'admin.kominfo@ekasuari.test',
            'admin.dishub@ekasuari.test',
            'admin.koperasi@ekasuari.test',
            'admin.dinsos@ekasuari.test',
            'admin.dpmptsp@ekasuari.test',
            'admin.satpol@ekasuari.test',
            'admin.biro-org@ekasuari.test',
            'admin.biro-pem@ekasuari.test',
            'admin.inspektorat@ekasuari.test',
            'evaluator@ekasuari.test',
            'inspektorat@ekasuari.test',
            'auditor@ekasuari.test',
        ];

        // Specific check: inspektorat must have role Inspektorat (not Admin OPD)
        $inspUser = User::where('email', 'inspektorat@ekasuari.test')->first();
        $this->assertTrue($inspUser->hasRole('Inspektorat'), 'inspektorat@ekasuari.test must have role Inspektorat');

        foreach ($demoEmails as $email) {
            $user = User::where('email', $email)->first();
            $this->assertNotNull($user, "Account {$email} must exist in seeded database.");

            // Attempt login via POST /login
            $response = $this->post('/login', [
                'email' => $email,
                'password' => 'password',
            ]);

            $response->assertRedirect(route('dashboard', absolute: false));
            $this->assertAuthenticatedAs($user);

            // Access dashboard
            $dashResponse = $this->actingAs($user)->get('/dashboard');
            $this->assertTrue(
                in_array($dashResponse->getStatusCode(), [200, 302]),
                "User {$email} failed to access dashboard (status {$dashResponse->getStatusCode()})."
            );

            // Logout for next user
            $this->post('/logout');
            $this->assertGuest();
        }
    }
}
