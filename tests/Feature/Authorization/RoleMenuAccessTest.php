<?php

namespace Tests\Feature\Authorization;

use App\Enums\Role as RoleEnum;
use App\Models\Organization;
use App\Models\PlanningPeriod;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoleMenuAccessTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;
    private User $adminProvinsi;
    private User $adminOpd;
    private User $operatorOpd;
    private User $validatorOpd;
    private User $kepalaOpd;
    private User $evaluatorProvinsi;
    private User $inspektorat;
    private User $pimpinanProvinsi;
    private User $auditor;

    private Organization $provinsi;
    private Organization $opd;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->provinsi = Organization::create([
            'id'        => 1,
            'code'      => 'PROV-PB',
            'name'      => 'Pemerintah Provinsi Papua Barat',
            'type'      => 'province',
            'is_active' => true,
        ]);

        $this->opd = Organization::create([
            'code'      => 'DISDIK-PB',
            'name'      => 'Dinas Pendidikan',
            'type'      => 'opd',
            'is_active' => true,
        ]);

        PlanningPeriod::create([
            'code'       => 'RPJMD-2025-2029',
            'name'       => 'RPJMD 2025-2029',
            'year'       => 2025,
            'start_year' => 2025,
            'end_year'   => 2029,
            'start_date' => '2025-01-01',
            'end_date'   => '2029-12-31',
            'type'       => 'rpjmd',
            'status'     => 'active',
        ]);

        $this->superAdmin        = $this->createUserWithRole(RoleEnum::SuperAdmin->value, $this->provinsi);
        $this->adminProvinsi     = $this->createUserWithRole(RoleEnum::AdminProvinsi->value, $this->provinsi);
        $this->adminOpd          = $this->createUserWithRole(RoleEnum::AdminOpd->value, $this->opd);
        $this->operatorOpd       = $this->createUserWithRole(RoleEnum::OperatorOpd->value, $this->opd);
        $this->validatorOpd      = $this->createUserWithRole(RoleEnum::ValidatorOpd->value, $this->opd);
        $this->kepalaOpd         = $this->createUserWithRole(RoleEnum::KepalaOpd->value, $this->opd);
        $this->evaluatorProvinsi = $this->createUserWithRole(RoleEnum::EvaluatorProvinsi->value, $this->provinsi);
        $this->inspektorat       = $this->createUserWithRole(RoleEnum::Inspektorat->value, $this->provinsi);
        $this->pimpinanProvinsi  = $this->createUserWithRole(RoleEnum::PimpinanProvinsi->value, $this->provinsi);
        $this->auditor           = $this->createUserWithRole(RoleEnum::Auditor->value, $this->provinsi);
    }

    private function createUserWithRole(string $roleName, Organization $org): User
    {
        $role = Role::where('name', $roleName)->firstOrFail();
        $user = User::factory()->create();
        $user->roles()->attach($role);
        $user->organizations()->attach($org, ['is_default' => true]);

        return $user;
    }

    // =========================================================================
    // 1. ROLE OPD CANNOT ACCESS MASTER DATA
    // =========================================================================

    public function test_admin_opd_cannot_access_master_data(): void
    {
        $this->actingAs($this->adminOpd)->get(route('organizations.index'))->assertForbidden();
        $this->actingAs($this->adminOpd)->get(route('periods.index'))->assertForbidden();
        $this->actingAs($this->adminOpd)->get(route('units.index'))->assertForbidden();
        $this->actingAs($this->adminOpd)->get(route('indicators.index'))->assertForbidden();
    }

    public function test_operator_opd_cannot_access_master_data(): void
    {
        $this->actingAs($this->operatorOpd)->get(route('organizations.index'))->assertForbidden();
        $this->actingAs($this->operatorOpd)->get(route('periods.index'))->assertForbidden();
        $this->actingAs($this->operatorOpd)->get(route('units.index'))->assertForbidden();
        $this->actingAs($this->operatorOpd)->get(route('indicators.index'))->assertForbidden();
    }

    public function test_validator_opd_cannot_access_master_data(): void
    {
        $this->actingAs($this->validatorOpd)->get(route('organizations.index'))->assertForbidden();
        $this->actingAs($this->validatorOpd)->get(route('periods.index'))->assertForbidden();
        $this->actingAs($this->validatorOpd)->get(route('units.index'))->assertForbidden();
        $this->actingAs($this->validatorOpd)->get(route('indicators.index'))->assertForbidden();
    }

    public function test_kepala_opd_cannot_access_master_data(): void
    {
        $this->actingAs($this->kepalaOpd)->get(route('organizations.index'))->assertForbidden();
        $this->actingAs($this->kepalaOpd)->get(route('periods.index'))->assertForbidden();
        $this->actingAs($this->kepalaOpd)->get(route('units.index'))->assertForbidden();
        $this->actingAs($this->kepalaOpd)->get(route('indicators.index'))->assertForbidden();
    }

    // =========================================================================
    // 2. PROVINCIAL ADMINS CAN ACCESS MASTER DATA
    // =========================================================================

    public function test_super_admin_and_admin_provinsi_can_access_master_data(): void
    {
        $this->actingAs($this->superAdmin)->get(route('organizations.index'))->assertOk();
        $this->actingAs($this->superAdmin)->get(route('periods.index'))->assertOk();

        $this->actingAs($this->adminProvinsi)->get(route('organizations.index'))->assertOk();
        $this->actingAs($this->adminProvinsi)->get(route('periods.index'))->assertOk();
    }

    public function test_other_provincial_roles_cannot_access_master_data(): void
    {
        $this->actingAs($this->evaluatorProvinsi)->get(route('organizations.index'))->assertForbidden();
        $this->actingAs($this->evaluatorProvinsi)->get(route('periods.index'))->assertForbidden();

        $this->actingAs($this->inspektorat)->get(route('organizations.index'))->assertForbidden();
        $this->actingAs($this->inspektorat)->get(route('periods.index'))->assertForbidden();

        $this->actingAs($this->pimpinanProvinsi)->get(route('organizations.index'))->assertForbidden();
        $this->actingAs($this->pimpinanProvinsi)->get(route('periods.index'))->assertForbidden();

        $this->actingAs($this->auditor)->get(route('organizations.index'))->assertForbidden();
        $this->actingAs($this->auditor)->get(route('periods.index'))->assertForbidden();
    }

    // =========================================================================
    // 3. MONITORING OPD (MATRIX) ACCESS
    // =========================================================================

    public function test_provincial_overseers_can_access_monitoring_matrix(): void
    {
        $this->actingAs($this->superAdmin)->get(route('planning.monitoring-matrix'))->assertOk();
        $this->actingAs($this->adminProvinsi)->get(route('planning.monitoring-matrix'))->assertOk();
        $this->actingAs($this->evaluatorProvinsi)->get(route('planning.monitoring-matrix'))->assertOk();
        $this->actingAs($this->inspektorat)->get(route('planning.monitoring-matrix'))->assertOk();
        $this->actingAs($this->pimpinanProvinsi)->get(route('planning.monitoring-matrix'))->assertOk();
    }

    public function test_opd_roles_cannot_access_monitoring_matrix(): void
    {
        $this->actingAs($this->adminOpd)->get(route('planning.monitoring-matrix'))->assertForbidden();
        $this->actingAs($this->operatorOpd)->get(route('planning.monitoring-matrix'))->assertForbidden();
        $this->actingAs($this->validatorOpd)->get(route('planning.monitoring-matrix'))->assertForbidden();
        $this->actingAs($this->kepalaOpd)->get(route('planning.monitoring-matrix'))->assertForbidden();
    }

    // =========================================================================
    // 4. USER & ROLE MANAGEMENT ACCESS
    // =========================================================================

    public function test_admin_opd_can_access_users_but_not_roles(): void
    {
        $this->actingAs($this->adminOpd)->get(route('users.index'))->assertOk();
        $this->actingAs($this->adminOpd)->get(route('roles.index'))->assertForbidden();
    }

    public function test_operator_and_validator_cannot_access_users_or_roles(): void
    {
        $this->actingAs($this->operatorOpd)->get(route('users.index'))->assertForbidden();
        $this->actingAs($this->operatorOpd)->get(route('roles.index'))->assertForbidden();

        $this->actingAs($this->validatorOpd)->get(route('users.index'))->assertForbidden();
        $this->actingAs($this->validatorOpd)->get(route('roles.index'))->assertForbidden();
    }

    // =========================================================================
    // 5. AUDIT LOG ACCESS
    // =========================================================================

    public function test_only_auditor_inspektorat_and_provincial_admins_can_access_audit_log(): void
    {
        $this->actingAs($this->superAdmin)->get(route('audit.index'))->assertOk();
        $this->actingAs($this->adminProvinsi)->get(route('audit.index'))->assertOk();
        $this->actingAs($this->inspektorat)->get(route('audit.index'))->assertOk();
        $this->actingAs($this->auditor)->get(route('audit.index'))->assertOk();

        $this->actingAs($this->adminOpd)->get(route('audit.index'))->assertForbidden();
        $this->actingAs($this->operatorOpd)->get(route('audit.index'))->assertForbidden();
        $this->actingAs($this->validatorOpd)->get(route('audit.index'))->assertForbidden();
        $this->actingAs($this->kepalaOpd)->get(route('audit.index'))->assertForbidden();
    }
}
