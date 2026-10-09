<?php

namespace Tests\Feature;

use App\Enums\Role as RoleEnum;
use App\Models\Agreement;
use App\Models\Organization;
use App\Models\PerformancePeriod;
use App\Models\PlanningPeriod;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlanningModuleTest extends TestCase
{
    use RefreshDatabase;

    private User $adminOpd;

    private User $kepalaOpd;

    private User $adminBidang;

    private Organization $opd;

    private Organization $bidang;

    private PlanningPeriod $planningPeriod;

    private PerformancePeriod $perfPeriod;

    protected function setUp(): void
    {
        parent::setUp();

        $adminOpdRole = Role::create(['name' => RoleEnum::AdminOpd->value]);
        $kepalaOpdRole = Role::create(['name' => RoleEnum::KepalaOpd->value]);
        $adminBidangRole = Role::create(['name' => RoleEnum::AdminBidang->value]);

        $this->opd = Organization::create([
            'code' => 'OPD-INDUK',
            'name' => 'Dinas Pendidikan dan Kebudayaan',
            'type' => 'opd',
            'is_active' => true,
        ]);

        $this->bidang = Organization::create([
            'code' => 'BIDANG-1',
            'name' => 'Bidang Pendidikan Dasar',
            'type' => 'bidang',
            'parent_id' => $this->opd->id,
            'is_active' => true,
        ]);

        $this->adminOpd = User::factory()->create();
        $this->adminOpd->roles()->attach($adminOpdRole);
        $this->adminOpd->organizations()->attach($this->opd, ['is_default' => true]);

        $this->kepalaOpd = User::factory()->create();
        $this->kepalaOpd->roles()->attach($kepalaOpdRole);
        $this->kepalaOpd->organizations()->attach($this->opd, ['is_default' => true]);

        $this->adminBidang = User::factory()->create();
        $this->adminBidang->roles()->attach($adminBidangRole);
        $this->adminBidang->organizations()->attach($this->bidang, ['is_default' => true]);

        $this->planningPeriod = PlanningPeriod::create([
            'code' => 'TA-2026',
            'name' => 'Tahun Anggaran 2026',
            'year' => 2026,
            'type' => 'annual',
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
            'status' => 'active',
        ]);

        $this->perfPeriod = PerformancePeriod::create([
            'name' => 'Periode Kinerja 2026',
            'year' => 2026,
            'type' => 'annual',
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
            'status' => 'active',
        ]);
    }

    public function test_planning_index_is_accessible(): void
    {
        $this->actingAs($this->adminOpd)
            ->get(route('planning.index'))
            ->assertOk();
    }

    public function test_admin_opd_can_access_documents_and_store(): void
    {
        $this->actingAs($this->adminOpd)
            ->get(route('planning.documents.index'))
            ->assertOk();

        $this->actingAs($this->adminOpd)
            ->post(route('planning.documents.store'), [
                'organization_id' => $this->opd->id,
                'performance_period_id' => $this->perfPeriod->id,
                'type' => 'renstra',
                'title' => 'Renstra Disdik 2026-2030',
                'document_year' => '2026-2030',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('planning_documents', [
            'organization_id' => $this->opd->id,
            'title' => 'Renstra Disdik 2026-2030',
        ]);
    }

    public function test_admin_opd_can_create_performance_agreement(): void
    {
        $this->actingAs($this->adminOpd)
            ->get(route('planning.agreements.index'))
            ->assertOk();

        $this->actingAs($this->adminOpd)
            ->post(route('planning.agreements.store'), [
                'organization_id' => $this->opd->id,
                'performance_period_id' => $this->perfPeriod->id,
                'name' => 'Perjanjian Kinerja Disdik 2026',
                'document_number' => 'PK/001/2026',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('performance_agreements', [
            'organization_id' => $this->opd->id,
            'name' => 'Perjanjian Kinerja Disdik 2026',
            'status' => 'submitted',
        ]);
    }

    public function test_maker_checker_segregation_on_agreements(): void
    {
        $agreement = Agreement::create([
            'organization_id' => $this->opd->id,
            'performance_period_id' => $this->perfPeriod->id,
            'name' => 'PK Uji Segregasi',
            'status' => 'submitted',
            'created_by' => $this->adminOpd->id,
        ]);

        // Admin OPD (maker) CANNOT approve agreement
        $this->actingAs($this->adminOpd)
            ->post(route('planning.agreements.approve', $agreement))
            ->assertForbidden();

        // Kepala OPD (checker) CAN approve agreement
        $this->actingAs($this->kepalaOpd)
            ->post(route('planning.agreements.approve', $agreement))
            ->assertRedirect();

        $this->assertEquals('approved', $agreement->fresh()->status);
    }
}
