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

class AnalyticsTest extends TestCase
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

        $this->organization = Organization::create(['code' => 'OPD-A', 'name' => 'OPD Analitik', 'type' => 'opd']);

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
            'code' => 'IKU-300',
            'name' => 'Indikator Analitik',
            'type' => 'outcome',
            'direction' => 'higher_is_better',
            'measurement_unit_id' => $unit->id,
            'frequency' => 'quarterly',
            'is_iku' => true,
            'status' => 'active',
        ]);

        $this->version = IndicatorVersion::create([
            'indicator_id' => $indicator->id,
            'version_number' => 1,
            'name' => 'Indikator Analitik',
            'type' => 'outcome',
            'direction' => 'higher_is_better',
            'measurement_unit_id' => $unit->id,
            'frequency' => 'quarterly',
        ]);

        $indicator->update(['current_version_id' => $this->version->id]);

        IndicatorTarget::create([
            'indicator_version_id' => $this->version->id,
            'organization_id' => $this->organization->id,
            'planning_period_id' => $this->planningPeriod->id,
            'target_value' => 80,
            'status' => 'approved',
        ]);

        Realization::create([
            'indicator_version_id' => $this->version->id,
            'organization_id' => $this->organization->id,
            'measurement_period_id' => $this->measurementPeriod->id,
            'value' => 90,
            'status' => 'approved',
        ]);
    }

    public function test_analytics_page_shows_trend_deviation_comparison_and_heatmap(): void
    {
        $response = $this->actingAs($this->superAdmin)
            ->get(route('analytics.index'))
            ->assertOk();

        $response->assertInertia(fn ($page) => $page
            ->component('Analytics/Index')
            ->has('trend')
            ->has('deviation')
            ->has('opd_comparison')
            ->has('heatmap.periods'));
    }

    public function test_analytics_export_returns_csv(): void
    {
        $response = $this->actingAs($this->superAdmin)
            ->get(route('analytics.export'))
            ->assertOk();

        $this->assertStringContainsString('text/csv', $response->headers->get('Content-Type'));
        $this->assertStringContainsString('Indikator Analitik', $response->streamedContent());
    }

    public function test_trend_calculates_average_achievement(): void
    {
        $response = $this->actingAs($this->superAdmin)
            ->get(route('analytics.index'))
            ->assertOk();

        $response->assertInertia(fn ($page) => $page
            ->component('Analytics/Index')
            ->has('trend.0', fn ($point) => $point
                ->where('period', 'Triwulan I 2026')
                ->where('average_achievement', 112.5)
                ->where('realization_count', 1)
                ->etc()));
    }

    public function test_user_without_permission_cannot_access_analytics(): void
    {
        $regular = User::factory()->create();

        $this->actingAs($regular)
            ->get(route('analytics.index'))
            ->assertForbidden();
    }
}
