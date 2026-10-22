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
        $superAdmin = User::where('email', 'superadmin@siperforma.local')->firstOrFail();
        $adminOpd = User::where('email', 'admin.pupr@siperforma.local')->firstOrFail();
        $kepalaOpd = User::where('email', 'kepala.dinas@siperforma.local')->firstOrFail();

        $allOrgCount = Organization::whereIn('type', ['opd', 'sekretariat', 'bidang'])->count();

        $this->assertCount($allOrgCount, $this->authService->accessibleOrganizationIds($superAdmin));
        $this->assertCount($allOrgCount, $this->authService->accessibleOrganizationIds($adminOpd));
        $this->assertCount($allOrgCount, $this->authService->accessibleOrganizationIds($kepalaOpd));
    }

    public function test_sekretariat_users_isolated_to_sekretariat_unit(): void
    {
        $adminSekr = User::where('email', 'admin.sekretariat@siperforma.local')->firstOrFail();
        $kepalaSekr = User::where('email', 'kepala.sekretariat@siperforma.local')->firstOrFail();
        $sekretariat = Organization::where('code', 'SEKRETARIAT')->firstOrFail();

        $adminAccessible = $this->authService->accessibleOrganizationIds($adminSekr);
        $kepalaAccessible = $this->authService->accessibleOrganizationIds($kepalaSekr);

        $this->assertContains($sekretariat->id, $adminAccessible);
        $this->assertContains($sekretariat->id, $kepalaAccessible);

        $bidang = Organization::whereIn('code', ['BIDANG-CK', 'BIDANG-1'])->first();
        if ($bidang) {
            $this->assertNotContains($bidang->id, $adminAccessible);
            $this->assertNotContains($bidang->id, $kepalaAccessible);
        }
    }

    public function test_bidang_users_isolated_to_their_respective_bidang(): void
    {
        $adminDikdas = User::where('email', 'admin.dikdas@siperforma.local')->firstOrFail();
        $kabidDikdas = User::where('email', 'kabid.dikdas@siperforma.local')->firstOrFail();
        $bidangDikdas = Organization::whereIn('code', ['BIDANG-CK', 'BIDANG-1'])->firstOrFail();
        $bidangDikmen = Organization::whereIn('code', ['BIDANG-BM', 'BIDANG-2'])->firstOrFail();

        $accessibleDikdas = $this->authService->accessibleOrganizationIds($adminDikdas);
        $accessibleKabid = $this->authService->accessibleOrganizationIds($kabidDikdas);

        $this->assertContains($bidangDikdas->id, $accessibleDikdas);
        $this->assertContains($bidangDikdas->id, $accessibleKabid);

        // Does NOT contain Dikmen
        $this->assertNotContains($bidangDikmen->id, $accessibleDikdas);
        $this->assertNotContains($bidangDikmen->id, $accessibleKabid);
    }
}

