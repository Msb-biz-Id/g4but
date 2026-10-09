<?php

namespace Tests\Feature;

use App\Models\Indicator;
use App\Models\IndicatorVersion;
use App\Models\IntegrationLog;
use App\Models\MeasurementPeriod;
use App\Models\MeasurementUnit;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\PlanningPeriod;
use App\Models\Realization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class IntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seedData();
    }

    private function seedData(): void
    {
        $organization = Organization::create(['code' => 'OPD-INT', 'name' => 'OPD Integrasi', 'type' => 'opd']);

        $planningPeriod = PlanningPeriod::create([
            'code' => 'PP-INT-2026',
            'name' => 'Periode 2026',
            'year' => 2026,
            'type' => 'annual',
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
            'status' => 'active',
        ]);

        MeasurementPeriod::create([
            'planning_period_id' => $planningPeriod->id,
            'code' => 'MP-INT-Q1',
            'name' => 'Triwulan I 2026',
            'type' => 'quarterly',
            'start_date' => '2026-01-01',
            'end_date' => '2026-03-31',
            'status' => 'open',
        ]);

        $unit = MeasurementUnit::create(['code' => 'PCT', 'name' => 'Persen', 'symbol' => '%']);

        $indicator = Indicator::create([
            'code' => 'IKU-INT-1',
            'name' => 'Indikator Integrasi',
            'type' => 'outcome',
            'direction' => 'higher_is_better',
            'measurement_unit_id' => $unit->id,
            'frequency' => 'quarterly',
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
            'frequency' => 'quarterly',
        ]);

        $indicator->update(['current_version_id' => $version->id]);
    }

    public function test_integration_health_requires_authentication(): void
    {
        $this->getJson('/api/v1/integrations/health')->assertUnauthorized();
    }

    public function test_integration_health_with_service_token(): void
    {
        $user = User::factory()->create(['is_service_account' => true]);
        $token = $user->createToken('test', ['integration:indicators'])->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/v1/integrations/health')
            ->assertOk()
            ->assertJsonPath('status', 'ok');
    }

    public function test_receive_realization_creates_record_and_log(): void
    {
        $user = User::factory()->create(['is_service_account' => true]);
        $token = $user->createToken('test', ['integration:indicators'])->plainTextToken;

        $this->withToken($token)
            ->postJson('/api/v1/integrations/realizations', [
                'external_id' => 'EXT-100',
                'opd_code' => 'OPD-INT',
                'indicator_code' => 'IKU-INT-1',
                'period' => '2026-02-15',
                'value' => 85.5,
            ])
            ->assertStatus(201)
            ->assertJsonPath('data.ok', true);

        $this->assertDatabaseHas('realizations', ['value' => 85.5, 'status' => 'approved']);
        $this->assertDatabaseHas('integration_logs', [
            'integration_name' => 'ekasuari-inbound',
            'request_id' => 'EXT-100',
        ]);
    }

    public function test_receive_realization_is_idempotent_by_header(): void
    {
        $user = User::factory()->create(['is_service_account' => true]);
        $token = $user->createToken('test', ['integration:indicators'])->plainTextToken;

        $payload = [
            'external_id' => 'EXT-200',
            'opd_code' => 'OPD-INT',
            'indicator_code' => 'IKU-INT-1',
            'period' => '2026-02-20',
            'value' => 90,
        ];

        $this->withToken($token)
            ->withHeaders(['Idempotency-Key' => 'idem-1'])
            ->postJson('/api/v1/integrations/realizations', $payload)
            ->assertStatus(201);

        $this->withToken($token)
            ->withHeaders(['Idempotency-Key' => 'idem-1'])
            ->postJson('/api/v1/integrations/realizations', $payload)
            ->assertStatus(200)
            ->assertJsonPath('idempotent_replay', true);

        $this->assertSame(1, Realization::count());
        $this->assertSame(2, IntegrationLog::where('request_id', 'idem-1')->count());
    }

    public function test_receive_realization_rejects_unknown_opd(): void
    {
        $user = User::factory()->create(['is_service_account' => true]);
        $token = $user->createToken('test', ['integration:indicators'])->plainTextToken;

        $this->withToken($token)
            ->postJson('/api/v1/integrations/realizations', [
                'external_id' => 'EXT-300',
                'opd_code' => 'OPD-TIDAK-ADA',
                'indicator_code' => 'IKU-INT-1',
                'period' => '2026-02-20',
                'value' => 50,
            ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'OPD dengan kode OPD-TIDAK-ADA tidak ditemukan.');
    }

    public function test_integrations_page_requires_permission(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('integrations.index'))
            ->assertForbidden();
    }

    public function test_integrations_page_allowed_with_permission(): void
    {
        $permission = Permission::create([
            'name' => 'integration:view',
            'resource' => 'integration',
            'action' => 'view',
            'module' => 'integration',
        ]);

        $user = User::factory()->create();
        $user->permissions()->attach($permission);

        $this->actingAs($user)
            ->get(route('integrations.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Integrations/Index'));
    }
}
