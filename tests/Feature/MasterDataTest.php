<?php

namespace Tests\Feature;

use App\Enums\Role as RoleEnum;
use App\Models\Indicator;
use App\Models\IndicatorVersion;
use App\Models\MeasurementPeriod;
use App\Models\MeasurementUnit;
use App\Models\Organization;
use App\Models\PlanningPeriod;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MasterDataTest extends TestCase
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

    public function test_can_create_organization_with_units(): void
    {
        $this->actingAs($this->superAdmin)
            ->post(route('organizations.store'), [
                'code' => 'DINAS-A',
                'name' => 'Dinas Contoh A',
                'type' => 'opd',
                'is_active' => true,
            ])
            ->assertRedirect(route('organizations.index'));

        $org = Organization::where('code', 'DINAS-A')->firstOrFail();

        $this->actingAs($this->superAdmin)
            ->post(route('organizations.units.store', $org), [
                'code' => 'A-BID-1',
                'name' => 'Bidang Satu',
                'unit_type' => 'bidang',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('organization_units', [
            'organization_id' => $org->id,
            'code' => 'A-BID-1',
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'create',
            'resource_type' => 'organization',
            'resource_id' => $org->id,
        ]);
    }

    public function test_can_create_measurement_unit(): void
    {
        $this->actingAs($this->superAdmin)
            ->post(route('units.store'), [
                'code' => 'UNIT',
                'name' => 'Unit',
                'symbol' => 'u',
                'is_active' => true,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('measurement_units', ['code' => 'UNIT']);
    }

    public function test_can_create_planning_period_and_measurement_period(): void
    {
        $this->actingAs($this->superAdmin)
            ->post(route('periods.store'), [
                'code' => 'PP-2026',
                'name' => 'Periode Perencanaan 2026',
                'year' => 2026,
                'type' => 'annual',
                'start_date' => '2026-01-01',
                'end_date' => '2026-12-31',
                'status' => 'draft',
            ])
            ->assertRedirect();

        $period = PlanningPeriod::where('code', 'PP-2026')->firstOrFail();

        $this->actingAs($this->superAdmin)
            ->post(route('periods.measurement-periods.store', $period), [
                'code' => 'MP-2026-Q1',
                'name' => 'Triwulan I 2026',
                'type' => 'quarterly',
                'start_date' => '2026-01-01',
                'end_date' => '2026-03-31',
                'status' => 'open',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('measurement_periods', ['code' => 'MP-2026-Q1']);

        $mp = MeasurementPeriod::where('code', 'MP-2026-Q1')->firstOrFail();
        $this->actingAs($this->superAdmin)
            ->delete(route('measurement-periods.destroy', $mp))
            ->assertRedirect();

        $this->assertDatabaseMissing('measurement_periods', ['id' => $mp->id]);
    }

    public function test_can_create_indicator_with_initial_version(): void
    {
        $unit = MeasurementUnit::create(['code' => 'PCT', 'name' => 'Persen', 'symbol' => '%']);
        $org = Organization::create(['code' => 'OPD-X', 'name' => 'OPD X', 'type' => 'opd']);

        $this->actingAs($this->superAdmin)
            ->post(route('indicators.store'), [
                'code' => 'IKU-001',
                'name' => 'Nilai SAKIP',
                'type' => 'outcome',
                'direction' => 'higher_is_better',
                'measurement_unit_id' => $unit->id,
                'frequency' => 'annual',
                'owner_organization_id' => $org->id,
                'is_iku' => true,
                'baseline_value' => 60,
            ])
            ->assertRedirect(route('indicators.index'));

        $indicator = Indicator::where('code', 'IKU-001')->firstOrFail();
        $this->assertNotNull($indicator->current_version_id);

        $version = IndicatorVersion::findOrFail($indicator->current_version_id);
        $this->assertEquals(1, $version->version_number);
        $this->assertEquals('Nilai SAKIP', $version->name);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'create',
            'resource_type' => 'indicator',
            'resource_id' => $indicator->id,
        ]);
    }

    public function test_updating_used_indicator_creates_new_version(): void
    {
        $unit = MeasurementUnit::create(['code' => 'PCT', 'name' => 'Persen', 'symbol' => '%']);

        $indicator = Indicator::create([
            'code' => 'IKU-002',
            'name' => 'Indikator Lama',
            'type' => 'output',
            'direction' => 'higher_is_better',
            'frequency' => 'annual',
            'status' => 'active',
        ]);
        $version = IndicatorVersion::create([
            'indicator_id' => $indicator->id,
            'version_number' => 1,
            'name' => 'Indikator Lama',
            'type' => 'output',
            'direction' => 'higher_is_better',
            'measurement_unit_id' => $unit->id,
            'frequency' => 'annual',
        ]);
        $indicator->update(['current_version_id' => $version->id]);

        $this->actingAs($this->superAdmin)
            ->put(route('indicators.update', $indicator), [
                'code' => 'IKU-002',
                'name' => 'Indikator Baru',
                'type' => 'output',
                'direction' => 'higher_is_better',
                'measurement_unit_id' => $unit->id,
                'frequency' => 'annual',
                'change_reason' => 'Revisi nomenklatur',
            ])
            ->assertRedirect(route('indicators.index'));

        $indicator->refresh();
        $newVersion = IndicatorVersion::findOrFail($indicator->current_version_id);

        $this->assertEquals(2, $newVersion->version_number);
        $this->assertEquals('Indikator Baru', $newVersion->name);
        $this->assertEquals(2, $indicator->versions()->count());
    }

    public function test_duplicate_organization_code_rejected(): void
    {
        Organization::create(['code' => 'DUP-1', 'name' => 'Duplikat', 'type' => 'opd']);

        $this->actingAs($this->superAdmin)
            ->post(route('organizations.store'), [
                'code' => 'DUP-1',
                'name' => 'Lain',
                'type' => 'opd',
            ])
            ->assertSessionHasErrors('code');
    }

    public function test_user_without_permission_cannot_access_master_data(): void
    {
        $regular = User::factory()->create();

        foreach (['organizations', 'indicators', 'units', 'periods'] as $resource) {
            $this->actingAs($regular)
                ->get(route("{$resource}.index"))
                ->assertForbidden();
        }
    }

    public function test_admin_provinsi_can_create_organization_with_short_name(): void
    {
        $adminProvRole = Role::create(['name' => RoleEnum::AdminProvinsi->value]);
        $adminProv = User::factory()->create();
        $adminProv->roles()->attach($adminProvRole);

        $this->actingAs($adminProv)
            ->post(route('organizations.store'), [
                'code' => 'BAPENDA-PB',
                'name' => 'Badan Pendapatan Daerah',
                'short_name' => 'BAPENDA',
                'type' => 'opd',
                'parent_id' => '',
                'is_active' => true,
            ])
            ->assertRedirect(route('organizations.index'));

        $this->assertDatabaseHas('organizations', [
            'code' => 'BAPENDA-PB',
            'name' => 'Badan Pendapatan Daerah',
            'short_name' => 'BAPENDA',
            'parent_id' => null,
        ]);
    }

    public function test_can_generate_quarterly_periods_in_batch(): void
    {
        $period = PlanningPeriod::create([
            'code' => 'PP-2027',
            'name' => 'Tahun 2027',
            'year' => 2027,
            'type' => 'annual',
            'start_date' => '2027-01-01',
            'end_date' => '2027-12-31',
            'status' => 'active',
        ]);

        $this->actingAs($this->superAdmin)
            ->post(route('periods.generate-quarters', $period))
            ->assertRedirect();

        $this->assertDatabaseHas('measurement_periods', [
            'planning_period_id' => $period->id,
            'code' => 'TW1-2027',
            'type' => 'quarterly',
        ]);
        $this->assertDatabaseHas('measurement_periods', [
            'planning_period_id' => $period->id,
            'code' => 'TW2-2027',
            'type' => 'quarterly',
        ]);
        $this->assertDatabaseHas('measurement_periods', [
            'planning_period_id' => $period->id,
            'code' => 'TW3-2027',
            'type' => 'quarterly',
        ]);
        $this->assertDatabaseHas('measurement_periods', [
            'planning_period_id' => $period->id,
            'code' => 'TW4-2027',
            'type' => 'quarterly',
        ]);
    }

    public function test_activating_planning_period_deactivates_existing_active_period_of_same_type(): void
    {
        $oldPeriod = PlanningPeriod::create([
            'code' => 'PP-2024',
            'name' => 'Tahun 2024',
            'year' => 2024,
            'type' => 'annual',
            'start_date' => '2024-01-01',
            'end_date' => '2024-12-31',
            'status' => 'active',
        ]);

        $this->actingAs($this->superAdmin)
            ->post(route('periods.store'), [
                'code' => 'PP-2025',
                'name' => 'Tahun 2025',
                'year' => 2025,
                'type' => 'annual',
                'start_date' => '2025-01-01',
                'end_date' => '2025-12-31',
                'status' => 'active',
            ])
            ->assertRedirect();

        $oldPeriod->refresh();
        $this->assertEquals('closed', $oldPeriod->status);

        $this->assertDatabaseHas('planning_periods', [
            'code' => 'PP-2025',
            'status' => 'active',
        ]);
    }

    public function test_can_update_organization(): void
    {
        $org = Organization::create([
            'code' => 'DISHUB-PB',
            'name' => 'Dinas Perhubungan',
            'short_name' => 'DISHUB',
            'type' => 'opd',
            'is_active' => true,
        ]);

        $this->actingAs($this->superAdmin)
            ->put(route('organizations.update', $org), [
                'code' => 'DISHUB-PB-REV',
                'name' => 'Dinas Perhubungan Papua Barat',
                'short_name' => 'DISHUB PB',
                'type' => 'opd',
                'parent_id' => '',
                'address' => 'Jl. Trans Papua',
                'phone' => '081234567890',
                'email' => 'dishub@papuabaratprov.go.id',
                'is_active' => true,
            ])
            ->assertRedirect(route('organizations.index'));

        $org->refresh();
        $this->assertEquals('DISHUB-PB-REV', $org->code);
        $this->assertEquals('Dinas Perhubungan Papua Barat', $org->name);
        $this->assertEquals('DISHUB PB', $org->short_name);
        $this->assertEquals('Jl. Trans Papua', $org->address);
    }

    public function test_can_delete_organization_without_dependencies(): void
    {
        $org = Organization::create([
            'code' => 'TEST-DEL',
            'name' => 'Organisasi Percobaan',
            'type' => 'opd',
            'is_active' => true,
        ]);

        $this->actingAs($this->superAdmin)
            ->delete(route('organizations.destroy', $org))
            ->assertRedirect(route('organizations.index'));

        $this->assertSoftDeleted('organizations', ['id' => $org->id]);
    }

    public function test_cannot_delete_organization_with_sub_organizations(): void
    {
        $parent = Organization::create([
            'code' => 'PARENT-ORG',
            'name' => 'Organisasi Induk',
            'type' => 'province',
            'is_active' => true,
        ]);

        Organization::create([
            'code' => 'CHILD-ORG',
            'name' => 'Organisasi Anak',
            'type' => 'opd',
            'parent_id' => $parent->id,
            'is_active' => true,
        ]);

        $this->actingAs($this->superAdmin)
            ->delete(route('organizations.destroy', $parent))
            ->assertSessionHasErrors('error');

        $this->assertDatabaseHas('organizations', ['id' => $parent->id, 'deleted_at' => null]);
    }

    public function test_can_delete_planning_period_along_with_its_measurement_periods(): void
    {
        $period = PlanningPeriod::create([
            'code' => 'PP-2029',
            'name' => 'Tahun 2029',
            'year' => 2029,
            'type' => 'annual',
            'start_date' => '2029-01-01',
            'end_date' => '2029-12-31',
            'status' => 'draft',
        ]);

        MeasurementPeriod::create([
            'planning_period_id' => $period->id,
            'code' => 'TW1-2029',
            'name' => 'Triwulan I 2029',
            'type' => 'quarterly',
            'start_date' => '2029-01-01',
            'end_date' => '2029-03-31',
            'status' => 'open',
        ]);

        $this->actingAs($this->superAdmin)
            ->delete(route('periods.destroy', $period))
            ->assertRedirect();

        $this->assertDatabaseMissing('planning_periods', ['id' => $period->id]);
        $this->assertDatabaseMissing('measurement_periods', ['code' => 'TW1-2029']);
    }
}
