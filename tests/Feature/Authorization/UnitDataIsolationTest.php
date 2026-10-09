<?php

namespace Tests\Feature\Authorization;

use App\Models\Organization;
use App\Models\User;
use App\Services\AuthorizationService;
use Database\Seeders\OrganizationSeeder;
use Database\Seeders\PeriodSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\UserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UnitDataIsolationTest extends TestCase
{
    use RefreshDatabase;

    private AuthorizationService $authService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            RolePermissionSeeder::class,
            OrganizationSeeder::class,
            UserSeeder::class,
            PeriodSeeder::class,
        ]);

        $this->authService = app(AuthorizationService::class);
    }

    public function test_opd_wide_users_can_access_all_units(): void
    {
        $superAdmin = User::where('email', 'superadmin@ekasuari.local')->firstOrFail();
        $adminOpd = User::where('email', 'admin.opd@ekasuari.local')->firstOrFail();
        $kepalaOpd = User::where('email', 'kepala.opd@ekasuari.local')->firstOrFail();

        $allOrgCount = Organization::whereIn('type', ['opd', 'sekretariat', 'bidang'])->count();

        $this->assertCount($allOrgCount, $this->authService->accessibleOrganizationIds($superAdmin));
        $this->assertCount($allOrgCount, $this->authService->accessibleOrganizationIds($adminOpd));
        $this->assertCount($allOrgCount, $this->authService->accessibleOrganizationIds($kepalaOpd));
    }

    public function test_sekretariat_users_isolated_to_sekretariat_unit(): void
    {
        $adminSekr = User::where('email', 'admin.sekretariat@ekasuari.local')->firstOrFail();
        $kepalaSekr = User::where('email', 'kepala.sekretariat@ekasuari.local')->firstOrFail();
        $sekretariat = Organization::where('code', 'SEKRETARIAT')->firstOrFail();

        $adminAccessible = $this->authService->accessibleOrganizationIds($adminSekr);
        $kepalaAccessible = $this->authService->accessibleOrganizationIds($kepalaSekr);

        $this->assertEquals([$sekretariat->id], $adminAccessible);
        $this->assertEquals([$sekretariat->id], $kepalaAccessible);
    }

    public function test_bidang_users_isolated_to_their_respective_bidang(): void
    {
        $adminDikdas = User::where('email', 'admin.dikdas@ekasuari.local')->firstOrFail();
        $kabidDikdas = User::where('email', 'kabid.dikdas@ekasuari.local')->firstOrFail();
        $bidangDikdas = Organization::where('code', 'BIDANG-1')->firstOrFail();
        $bidangDikmen = Organization::where('code', 'BIDANG-2')->firstOrFail();

        $accessibleDikdas = $this->authService->accessibleOrganizationIds($adminDikdas);
        $accessibleKabid = $this->authService->accessibleOrganizationIds($kabidDikdas);

        $this->assertEquals([$bidangDikdas->id], $accessibleDikdas);
        $this->assertEquals([$bidangDikdas->id], $accessibleKabid);

        // Does NOT contain Dikmen
        $this->assertNotContains($bidangDikmen->id, $accessibleDikdas);
        $this->assertNotContains($bidangDikmen->id, $accessibleKabid);
    }
}
