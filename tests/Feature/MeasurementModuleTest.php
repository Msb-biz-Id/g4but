<?php

namespace Tests\Feature;

use App\Enums\Role as RoleEnum;
use App\Models\Indicator;
use App\Models\IndicatorTarget;
use App\Models\IndicatorVersion;
use App\Models\MeasurementPeriod;
use App\Models\MeasurementUnit;
use App\Models\Organization;
use App\Models\PlanningPeriod;
use App\Models\Realization;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MeasurementModuleTest extends TestCase
{
    use RefreshDatabase;

    private User $adminOpd;

    private User $kepalaOpd;

    private User $adminBidang;

    private User $kepalaBidang;

    private Organization $opd;

    private Organization $bidang;

    private PlanningPeriod $planningPeriod;

    private MeasurementPeriod $measurementPeriod;

    private Indicator $indicator;

    private IndicatorVersion $version;

    private IndicatorTarget $target;

    protected function setUp(): void
    {
        parent::setUp();

        $adminOpdRole = Role::create(['name' => RoleEnum::AdminOpd->value]);
        $kepalaOpdRole = Role::create(['name' => RoleEnum::KepalaOpd->value]);
        $adminBidangRole = Role::create(['name' => RoleEnum::AdminBidang->value]);
        $kepalaBidangRole = Role::create(['name' => RoleEnum::KepalaBidang->value]);

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

        $this->kepalaBidang = User::factory()->create();
        $this->kepalaBidang->roles()->attach($kepalaBidangRole);
        $this->kepalaBidang->organizations()->attach($this->bidang, ['is_default' => true]);

        $this->planningPeriod = PlanningPeriod::create([
            'code' => 'TA-2026',
            'name' => 'Tahun Anggaran 2026',
            'year' => 2026,
            'type' => 'annual',
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
            'status' => 'active',
        ]);

        $this->measurementPeriod = MeasurementPeriod::create([
            'planning_period_id' => $this->planningPeriod->id,
            'code' => 'TW-1-2026',
            'name' => 'Triwulan 1 2026',
            'type' => 'quarterly',
            'year' => 2026,
            'quarter' => 1,
            'start_date' => '2026-01-01',
            'end_date' => '2026-03-31',
            'status' => 'active',
        ]);

        $unit = MeasurementUnit::create([
            'code' => 'PERSEN',
            'name' => 'Persen',
            'symbol' => '%',
            'is_active' => true,
        ]);

        $this->indicator = Indicator::create([
            'code' => 'IND-001',
            'name' => 'Angka Partisipasi Murni SD',
            'measurement_unit_id' => $unit->id,
            'frequency' => 'quarterly',
            'status' => 'active',
        ]);

        $this->version = IndicatorVersion::create([
            'indicator_id' => $this->indicator->id,
            'version_number' => 1,
            'name' => $this->indicator->name,
            'measurement_unit_id' => $unit->id,
        ]);
        $this->indicator->update(['current_version_id' => $this->version->id]);

        $this->target = IndicatorTarget::create([
            'indicator_version_id' => $this->version->id,
            'organization_id' => $this->opd->id,
            'planning_period_id' => $this->planningPeriod->id,
            'year' => 2026,
            'target_value' => 95.0,
            'status' => 'approved',
        ]);
    }

    public function test_measurement_pages_accessible(): void
    {
        $this->actingAs($this->adminOpd)
            ->get(route('measurement.realization.opd'))
            ->assertOk();

        $this->actingAs($this->adminOpd)
            ->get(route('measurement.monitoring.output'))
            ->assertOk();

        $this->actingAs($this->adminOpd)
            ->get(route('measurement.monitoring.budget'))
            ->assertOk();
    }

    public function test_admin_can_submit_realization(): void
    {
        $this->actingAs($this->adminOpd)
            ->post(route('realizations.store'), [
                'indicator_version_id' => $this->version->id,
                'organization_id' => $this->opd->id,
                'measurement_period_id' => $this->measurementPeriod->id,
                'value' => 92.5,
                'save_and_submit' => true,
                'narrative' => 'Realisasi TW 1 tercapai 92.5%',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('realizations', [
            'indicator_version_id' => $this->version->id,
            'organization_id' => $this->opd->id,
            'measurement_period_id' => $this->measurementPeriod->id,
            'status' => 'submitted',
        ]);
    }

    public function test_maker_checker_segregation_on_realizations(): void
    {
        $realization = Realization::create([
            'indicator_version_id' => $this->version->id,
            'organization_id' => $this->opd->id,
            'measurement_period_id' => $this->measurementPeriod->id,
            'value' => 92.5,
            'status' => 'submitted',
            'created_by' => $this->adminOpd->id,
        ]);

        // Admin OPD (maker) CANNOT approve
        $this->actingAs($this->adminOpd)
            ->post(route('realizations.approve', $realization))
            ->assertForbidden();

        // Kepala OPD (checker) CAN approve
        $this->actingAs($this->kepalaOpd)
            ->post(route('realizations.approve', $realization))
            ->assertRedirect();

        $this->assertEquals('approved', $realization->fresh()->status);
    }
}
