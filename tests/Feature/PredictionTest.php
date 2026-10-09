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

class PredictionTest extends TestCase
{
    use RefreshDatabase;

    private Role $superAdminRole;

    private User $superAdmin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->superAdminRole = Role::create(['name' => RoleEnum::SuperAdmin->value]);
        $this->superAdmin = User::factory()->create();
        $this->superAdmin->roles()->attach($this->superAdminRole);
    }

    private function seedData(int $periodCount): array
    {
        $organization = Organization::create(['code' => 'OPD-PRED', 'name' => 'OPD Prediksi', 'type' => 'opd']);

        $planningPeriod = PlanningPeriod::create([
            'code' => 'PP-PRED-2026',
            'name' => 'Periode 2026',
            'year' => 2026,
            'type' => 'monthly',
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
            'status' => 'active',
        ]);

        $unit = MeasurementUnit::create(['code' => 'PCT', 'name' => 'Persen', 'symbol' => '%']);

        $indicator = Indicator::create([
            'code' => 'IKU-PRED-1',
            'name' => 'Indikator Prediksi',
            'type' => 'outcome',
            'direction' => 'higher_is_better',
            'measurement_unit_id' => $unit->id,
            'frequency' => 'monthly',
            'is_iku' => true,
            'status' => 'active',
            'owner_organization_id' => $organization->id,
        ]);

        $version = IndicatorVersion::create([
            'indicator_id' => $indicator->id,
            'version_number' => 1,
            'name' => $indicator->name,
            'type' => 'outcome',
            'direction' => 'higher_is_better',
            'measurement_unit_id' => $unit->id,
            'frequency' => 'monthly',
        ]);

        $indicator->update(['current_version_id' => $version->id]);

        IndicatorTarget::create([
            'indicator_version_id' => $version->id,
            'organization_id' => $organization->id,
            'planning_period_id' => $planningPeriod->id,
            'target_value' => 80,
            'status' => 'approved',
        ]);

        $periods = [];
        for ($i = 1; $i <= $periodCount; $i++) {
            $period = MeasurementPeriod::create([
                'planning_period_id' => $planningPeriod->id,
                'code' => 'MP-PRED-'.$i,
                'name' => 'Bulan '.$i,
                'type' => 'monthly',
                'start_date' => sprintf('2026-%02d-01', $i),
                'end_date' => sprintf('2026-%02d-28', $i),
                'status' => 'open',
            ]);

            $periods[] = $period;

            Realization::create([
                'indicator_version_id' => $version->id,
                'organization_id' => $organization->id,
                'measurement_period_id' => $period->id,
                'value' => 50 + $i * 5,
                'status' => 'approved',
            ]);
        }

        return compact('organization', 'indicator', 'periods');
    }

    public function test_prediction_page_is_accessible(): void
    {
        $this->seedData(5);

        $this->actingAs($this->superAdmin)
            ->get(route('predictions.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Predictions/Index'));
    }

    public function test_prediction_infeasible_with_insufficient_history(): void
    {
        $this->seedData(2);

        $response = $this->actingAs($this->superAdmin)
            ->post(route('predictions.generate'), ['indicator_id' => 1])
            ->assertRedirect();

        $this->assertArrayHasKey('prediction', session()->all());
        $prediction = session('prediction');
        $this->assertFalse($prediction['feasible']);
        $this->assertNotNull($prediction['reason']);
        $this->assertSame(2, $prediction['n']);
    }

    public function test_prediction_computes_forecast_with_enough_history(): void
    {
        $data = $this->seedData(6);

        $response = $this->actingAs($this->superAdmin)
            ->post(route('predictions.generate'), ['indicator_id' => $data['indicator']->id])
            ->assertRedirect();

        $prediction = session('prediction');
        $this->assertTrue($prediction['feasible']);
        $this->assertSame(6, $prediction['n']);
        $this->assertNotNull($prediction['forecast']);
        $this->assertNotNull($prediction['slope']);
        $this->assertNotNull($prediction['intercept']);
        $this->assertNotNull($prediction['target']);
        $this->assertNotNull($prediction['projected_achievement']);
        $this->assertContains($prediction['status'], ['good', 'warning', 'critical', 'no_data']);
    }

    public function test_prediction_includes_period_points(): void
    {
        $data = $this->seedData(5);

        $this->actingAs($this->superAdmin)
            ->post(route('predictions.generate'), ['indicator_id' => $data['indicator']->id]);

        $prediction = session('prediction');
        $this->assertCount(5, $prediction['points']);
        $this->assertSame('MP-PRED-1', $prediction['points'][0]['period_code']);
    }

    public function test_prediction_requires_permission(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('predictions.index'))
            ->assertForbidden();
    }

    public function test_prediction_generate_validation(): void
    {
        $this->actingAs($this->superAdmin)
            ->post(route('predictions.generate'), ['indicator_id' => 'not-an-id'])
            ->assertSessionHasErrors('indicator_id');
    }
}
