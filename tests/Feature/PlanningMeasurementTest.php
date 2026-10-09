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
use App\Models\StrategicGoal;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PlanningMeasurementTest extends TestCase
{
    use RefreshDatabase;

    private Role $superAdminRole;

    private User $superAdmin;

    private Organization $organization;

    private PlanningPeriod $planningPeriod;

    private MeasurementPeriod $measurementPeriod;

    private IndicatorVersion $version;

    protected function setUp(): void
    {
        parent::setUp();

        $this->superAdminRole = Role::create(['name' => RoleEnum::SuperAdmin->value]);
        $this->superAdmin = User::factory()->create();
        $this->superAdmin->roles()->attach($this->superAdminRole);

        $this->organization = Organization::create(['code' => 'OPD-T', 'name' => 'OPD Tes', 'type' => 'opd']);

        $this->planningPeriod = PlanningPeriod::create([
            'code' => 'PP-2026',
            'name' => 'Periode 2026',
            'year' => 2026,
            'type' => 'annual',
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
            'status' => 'active',
        ]);

        $this->measurementPeriod = MeasurementPeriod::create([
            'planning_period_id' => $this->planningPeriod->id,
            'code' => 'MP-2026-Q1',
            'name' => 'Triwulan I 2026',
            'type' => 'quarterly',
            'start_date' => '2026-01-01',
            'end_date' => '2026-03-31',
            'status' => 'open',
        ]);

        $unit = MeasurementUnit::create(['code' => 'PCT', 'name' => 'Persen', 'symbol' => '%']);

        $indicator = Indicator::create([
            'code' => 'IKU-100',
            'name' => 'Capaian Kinerja',
            'type' => 'outcome',
            'direction' => 'higher_is_better',
            'measurement_unit_id' => $unit->id,
            'frequency' => 'quarterly',
            'status' => 'active',
        ]);

        $this->version = IndicatorVersion::create([
            'indicator_id' => $indicator->id,
            'version_number' => 1,
            'name' => 'Capaian Kinerja',
            'type' => 'outcome',
            'direction' => 'higher_is_better',
            'measurement_unit_id' => $unit->id,
            'frequency' => 'quarterly',
        ]);

        $indicator->update(['current_version_id' => $this->version->id]);
    }

    public function test_admin_can_create_goal_and_objective(): void
    {
        $this->actingAs($this->superAdmin)
            ->post(route('goals.store'), [
                'planning_period_id' => $this->planningPeriod->id,
                'organization_id' => $this->organization->id,
                'code' => 'G1',
                'name' => 'Meningkatkan Kualitas Pelayanan',
            ])
            ->assertRedirect(route('goals.index'));

        $goal = StrategicGoal::where('code', 'G1')->firstOrFail();

        $this->actingAs($this->superAdmin)
            ->post(route('goals.objectives.store', $goal), [
                'code' => 'S1',
                'name' => 'Meningkatkan Akuntabilitas Kinerja',
            ])
            ->assertRedirect(route('goals.index'));

        $this->assertDatabaseHas('strategic_objectives', [
            'strategic_goal_id' => $goal->id,
            'code' => 'S1',
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'create',
            'resource_type' => 'strategic_goal',
        ]);
    }

    public function test_create_goal_with_empty_data_fails_validation(): void
    {
        $this->actingAs($this->superAdmin)
            ->post(route('goals.store'), [
                'planning_period_id' => '',
                'organization_id' => '',
                'code' => '',
                'name' => '',
            ])
            ->assertSessionHasErrors(['planning_period_id', 'organization_id', 'code', 'name']);
    }

    public function test_create_objective_with_empty_data_fails_validation(): void
    {
        $goal = StrategicGoal::create([
            'planning_period_id' => $this->planningPeriod->id,
            'organization_id' => $this->organization->id,
            'code' => 'G_TEST',
            'name' => 'Goal Test',
        ]);

        $this->actingAs($this->superAdmin)
            ->post(route('goals.objectives.store', $goal), [
                'code' => '',
                'name' => '',
            ])
            ->assertSessionHasErrors(['code', 'name']);
    }

    public function test_can_create_and_approve_target(): void
    {
        $this->actingAs($this->superAdmin)
            ->post(route('targets.store'), [
                'indicator_version_id' => $this->version->id,
                'organization_id' => $this->organization->id,
                'planning_period_id' => $this->planningPeriod->id,
                'target_value' => 80,
            ])
            ->assertRedirect(route('targets.index', ['period_id' => $this->planningPeriod->id]));

        $target = IndicatorTarget::where('indicator_version_id', $this->version->id)->firstOrFail();

        $this->actingAs($this->superAdmin)
            ->put(route('targets.update', $target), [
                'target_value' => 85,
                'status' => 'approved',
            ])
            ->assertRedirect();

        $target->refresh();

        $this->assertEquals(85, (float) $target->target_value);
        $this->assertEquals('approved', $target->status);
        $this->assertNotNull($target->approved_at);
    }

    public function test_can_create_submit_approve_realization(): void
    {
        $this->actingAs($this->superAdmin)
            ->post(route('realizations.store'), [
                'indicator_version_id' => $this->version->id,
                'organization_id' => $this->organization->id,
                'measurement_period_id' => $this->measurementPeriod->id,
                'value' => 90,
                'narrative' => 'Capaian baik',
            ])
            ->assertRedirect(route('realizations.index'));

        $realization = Realization::where('indicator_version_id', $this->version->id)->firstOrFail();
        $this->assertEquals('draft', $realization->status);

        $this->actingAs($this->superAdmin)
            ->post(route('realizations.submit', $realization))
            ->assertRedirect(route('realizations.index'));

        $realization->refresh();
        $this->assertEquals('submitted', $realization->status);
        $this->assertNotNull($realization->submitted_at);

        $this->actingAs($this->superAdmin)
            ->post(route('realizations.approve', $realization))
            ->assertRedirect();

        $realization->refresh();
        $this->assertEquals('approved', $realization->status);
        $this->assertNotNull($realization->approved_at);
        $this->assertEquals(2, $realization->version);

        $this->assertDatabaseHas('validations', [
            'realization_id' => $realization->id,
            'action' => 'approved',
        ]);
    }

    public function test_can_request_revision_on_submitted_realization(): void
    {
        $realization = Realization::create([
            'indicator_version_id' => $this->version->id,
            'organization_id' => $this->organization->id,
            'measurement_period_id' => $this->measurementPeriod->id,
            'value' => 50,
            'status' => 'submitted',
        ]);

        $this->actingAs($this->superAdmin)
            ->post(route('realizations.revision', $realization), [
                'reason' => 'Angka belum lengkap',
            ])
            ->assertRedirect();

        $realization->refresh();
        $this->assertEquals('revision_required', $realization->status);

        $this->assertDatabaseHas('validations', [
            'realization_id' => $realization->id,
            'action' => 'revision_request',
        ]);
    }

    public function test_revision_without_reason_rejected(): void
    {
        $realization = Realization::create([
            'indicator_version_id' => $this->version->id,
            'organization_id' => $this->organization->id,
            'measurement_period_id' => $this->measurementPeriod->id,
            'value' => 50,
            'status' => 'submitted',
        ]);

        $this->actingAs($this->superAdmin)
            ->post(route('realizations.revision', $realization), ['reason' => ''])
            ->assertSessionHasErrors('reason');

        $realization->refresh();
        $this->assertEquals('submitted', $realization->status);
    }

    public function test_can_upload_and_download_evidence(): void
    {
        Storage::fake('local');

        $realization = Realization::create([
            'indicator_version_id' => $this->version->id,
            'organization_id' => $this->organization->id,
            'measurement_period_id' => $this->measurementPeriod->id,
            'value' => 70,
            'status' => 'draft',
        ]);

        $file = UploadedFile::fake()->create('bukti.pdf', 100, 'application/pdf');

        $this->actingAs($this->superAdmin)
            ->post(route('evidences.store', $realization), [
                'file' => $file,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('evidences', [
            'realization_id' => $realization->id,
            'file_name' => 'bukti.pdf',
        ]);

        $evidence = $realization->evidences()->firstOrFail();

        $response = $this->actingAs($this->superAdmin)
            ->get(route('evidences.download', [$realization, $evidence]));

        $response->assertOk();
        Storage::disk('local')->assertExists($evidence->object_key);
    }

    public function test_user_without_permission_cannot_access_planning_measurement(): void
    {
        $regular = User::factory()->create();

        foreach (['goals', 'targets', 'realizations'] as $resource) {
            $this->actingAs($regular)
                ->get(route("{$resource}.index"))
                ->assertForbidden();
        }
    }
}
