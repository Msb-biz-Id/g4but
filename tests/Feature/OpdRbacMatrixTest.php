<?php

namespace Tests\Feature;

use App\Enums\Role as RoleEnum;
use App\Models\Organization;
use App\Models\Role;
use App\Models\User;
use App\Services\AuthorizationService;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OpdRbacMatrixTest extends TestCase
{
    use RefreshDatabase;

    private Organization $opdRoot;

    private Organization $sekretariat;

    private Organization $bidangA;

    private Organization $bidangB;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);

        // Setup single OPD hierarchy
        $this->opdRoot = Organization::create([
            'name' => 'Dinas Pendidikan (OPD Induk)',
            'code' => 'DISDIK',
            'type' => 'opd',
            'is_active' => true,
        ]);

        $this->sekretariat = Organization::create([
            'name' => 'Sekretariat Dinas',
            'code' => 'SEKRETARIAT',
            'type' => 'sekretariat',
            'parent_id' => $this->opdRoot->id,
            'is_active' => true,
        ]);

        $this->bidangA = Organization::create([
            'name' => 'Bidang Pembinaan SMA',
            'code' => 'BID-SMA',
            'type' => 'bidang',
            'parent_id' => $this->opdRoot->id,
            'is_active' => true,
        ]);

        $this->bidangB = Organization::create([
            'name' => 'Bidang Pembinaan SMK',
            'code' => 'BID-SMK',
            'type' => 'bidang',
            'parent_id' => $this->opdRoot->id,
            'is_active' => true,
        ]);
    }

    public function test_all_seven_roles_exist(): void
    {
        $roleNames = Role::pluck('name')->all();

        $this->assertCount(7, $roleNames);
        $this->assertContains(RoleEnum::SuperAdmin->value, $roleNames);
        $this->assertContains(RoleEnum::AdminOpd->value, $roleNames);
        $this->assertContains(RoleEnum::KepalaOpd->value, $roleNames);
        $this->assertContains(RoleEnum::AdminSekretariat->value, $roleNames);
        $this->assertContains(RoleEnum::KepalaSekretariat->value, $roleNames);
        $this->assertContains(RoleEnum::AdminBidang->value, $roleNames);
        $this->assertContains(RoleEnum::KepalaBidang->value, $roleNames);
    }

    public function test_role_enum_helpers(): void
    {
        $unitScoped = RoleEnum::unitScopedRoles();
        $this->assertContains(RoleEnum::AdminSekretariat->value, $unitScoped);
        $this->assertContains(RoleEnum::KepalaSekretariat->value, $unitScoped);
        $this->assertContains(RoleEnum::AdminBidang->value, $unitScoped);
        $this->assertContains(RoleEnum::KepalaBidang->value, $unitScoped);
        $this->assertNotContains(RoleEnum::AdminOpd->value, $unitScoped);

        $leadership = RoleEnum::leadershipRoles();
        $this->assertContains(RoleEnum::KepalaOpd->value, $leadership);
        $this->assertContains(RoleEnum::KepalaSekretariat->value, $leadership);
        $this->assertContains(RoleEnum::KepalaBidang->value, $leadership);
        $this->assertNotContains(RoleEnum::AdminOpd->value, $leadership);

        $admins = RoleEnum::adminRoles();
        $this->assertContains(RoleEnum::SuperAdmin->value, $admins);
        $this->assertContains(RoleEnum::AdminOpd->value, $admins);
        $this->assertContains(RoleEnum::AdminSekretariat->value, $admins);
        $this->assertContains(RoleEnum::AdminBidang->value, $admins);
        $this->assertNotContains(RoleEnum::KepalaOpd->value, $admins);
    }

    public function test_user_methods_and_organization_scoping(): void
    {
        // 1. Super Admin
        $superAdmin = User::factory()->create();
        $superAdmin->roles()->attach(Role::where('name', RoleEnum::SuperAdmin->value)->first());
        $this->assertTrue($superAdmin->isOpdAdmin());
        $this->assertTrue($superAdmin->isSuperAdmin());
        $this->assertFalse($superAdmin->isUnitScoped());

        // 2. Admin OPD
        $adminOpd = User::factory()->create();
        $adminOpd->roles()->attach(Role::where('name', RoleEnum::AdminOpd->value)->first());
        $adminOpd->organizations()->attach($this->opdRoot->id, ['is_default' => true]);
        $this->assertTrue($adminOpd->isOpdAdmin());
        $this->assertFalse($adminOpd->isLeadership());
        $this->assertFalse($adminOpd->isUnitScoped());

        // 3. Kepala OPD
        $kepalaOpd = User::factory()->create();
        $kepalaOpd->roles()->attach(Role::where('name', RoleEnum::KepalaOpd->value)->first());
        $kepalaOpd->organizations()->attach($this->opdRoot->id, ['is_default' => true]);
        $this->assertFalse($kepalaOpd->isOpdAdmin());
        $this->assertTrue($kepalaOpd->isLeadership());

        // 4. Admin Sekretariat
        $adminSekretariat = User::factory()->create();
        $adminSekretariat->roles()->attach(Role::where('name', RoleEnum::AdminSekretariat->value)->first());
        $adminSekretariat->organizations()->attach($this->sekretariat->id, ['is_default' => true]);
        $this->assertTrue($adminSekretariat->isUnitScoped());
        $this->assertEquals($this->sekretariat->id, $adminSekretariat->unitOrganization()->id);
        $this->assertEquals([$this->sekretariat->id], $adminSekretariat->scopeOrganizationIds());

        // 5. Admin Bidang
        $adminBidangA = User::factory()->create();
        $adminBidangA->roles()->attach(Role::where('name', RoleEnum::AdminBidang->value)->first());
        $adminBidangA->organizations()->attach($this->bidangA->id, ['is_default' => true]);
        $this->assertTrue($adminBidangA->isUnitScoped());
        $this->assertEquals($this->bidangA->id, $adminBidangA->unitOrganization()->id);
        $this->assertEquals([$this->bidangA->id], $adminBidangA->scopeOrganizationIds());
    }

    public function test_authorization_service_scoping_and_isolation(): void
    {
        $authService = app(AuthorizationService::class);

        // Admin OPD can access all organizations
        $adminOpd = User::factory()->create();
        $adminOpd->roles()->attach(Role::where('name', RoleEnum::AdminOpd->value)->first());
        $adminOpd->organizations()->attach($this->opdRoot->id, ['is_default' => true]);

        $this->assertTrue($authService->canAccessOrganization($adminOpd, $this->opdRoot->id));
        $this->assertTrue($authService->canAccessOrganization($adminOpd, $this->sekretariat->id));
        $this->assertTrue($authService->canAccessOrganization($adminOpd, $this->bidangA->id));
        $this->assertTrue($authService->canAccessOrganization($adminOpd, $this->bidangB->id));

        // Admin Sekretariat only accesses Sekretariat
        $adminSekretariat = User::factory()->create();
        $adminSekretariat->roles()->attach(Role::where('name', RoleEnum::AdminSekretariat->value)->first());
        $adminSekretariat->organizations()->attach($this->sekretariat->id, ['is_default' => true]);

        $this->assertTrue($authService->canAccessOrganization($adminSekretariat, $this->sekretariat->id));
        $this->assertFalse($authService->canAccessOrganization($adminSekretariat, $this->bidangA->id));
        $this->assertFalse($authService->canAccessOrganization($adminSekretariat, $this->bidangB->id));

        // Admin Bidang A only accesses Bidang A
        $adminBidangA = User::factory()->create();
        $adminBidangA->roles()->attach(Role::where('name', RoleEnum::AdminBidang->value)->first());
        $adminBidangA->organizations()->attach($this->bidangA->id, ['is_default' => true]);

        $this->assertTrue($authService->canAccessOrganization($adminBidangA, $this->bidangA->id));
        $this->assertFalse($authService->canAccessOrganization($adminBidangA, $this->sekretariat->id));
        $this->assertFalse($authService->canAccessOrganization($adminBidangA, $this->bidangB->id));
    }

    public function test_maker_checker_segregation(): void
    {
        $authService = app(AuthorizationService::class);
        $authService->boot();

        // Maker: Admin Sekretariat
        $adminSekretariat = User::factory()->create();
        $adminSekretariat->roles()->attach(Role::where('name', RoleEnum::AdminSekretariat->value)->first());
        $adminSekretariat->organizations()->attach($this->sekretariat->id, ['is_default' => true]);

        $this->assertTrue($adminSekretariat->hasPermission('realization:create'));
        $this->assertTrue($adminSekretariat->hasPermission('realization:submit'));
        $this->assertFalse($adminSekretariat->hasPermission('realization:approve'));
        $this->assertFalse($adminSekretariat->hasPermission('agreement:approve'));

        // Checker: Kepala Sekretariat
        $kepalaSekretariat = User::factory()->create();
        $kepalaSekretariat->roles()->attach(Role::where('name', RoleEnum::KepalaSekretariat->value)->first());
        $kepalaSekretariat->organizations()->attach($this->sekretariat->id, ['is_default' => true]);

        $this->assertTrue($kepalaSekretariat->hasPermission('realization:approve'));
        $this->assertTrue($kepalaSekretariat->hasPermission('agreement:approve'));
        $this->assertFalse($kepalaSekretariat->hasPermission('realization:create'));
    }
}
