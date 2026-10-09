<?php

namespace Tests\Feature;

use App\Enums\Role as RoleEnum;
use App\Models\Indicator;
use App\Models\IndicatorTarget;
use App\Models\IndicatorVersion;
use App\Models\MeasurementUnit;
use App\Models\Organization;
use App\Models\PlanningPeriod;
use App\Models\Role;
use App\Models\StrategicGoal;
use App\Models\StrategicObjective;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class IkuModuleTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;

    private User $adminOpd;

    private User $kepalaOpd;

    private User $adminBidang;

    private User $kepalaBidang;

    private Organization $opd;

    private Organization $bidang;

    private PlanningPeriod $period;

    private StrategicGoal $goal;

    private StrategicObjective $objective;

    private MeasurementUnit $unit;

    protected function setUp(): void
    {
        parent::setUp();

        $superAdminRole = Role::create(['name' => RoleEnum::SuperAdmin->value]);
        $adminOpdRole = Role::create(['name' => RoleEnum::AdminOpd->value]);
        $kepalaOpdRole = Role::create(['name' => RoleEnum::KepalaOpd->value]);
        $adminBidangRole = Role::create(['name' => RoleEnum::AdminBidang->value]);
        $kepalaBidangRole = Role::create(['name' => RoleEnum::KepalaBidang->value]);

        $this->opd = Organization::create([
            'code' => 'OPD-INDUK',
            'name' => 'Dinas Komunikasi dan Informatika',
            'type' => 'opd',
            'is_active' => true,
        ]);

        $this->bidang = Organization::create([
            'code' => 'BIDANG-1',
            'name' => 'Bidang Aplikasi Informatika',
            'type' => 'bidang',
            'parent_id' => $this->opd->id,
            'is_active' => true,
        ]);

        $this->superAdmin = User::factory()->create();
        $this->superAdmin->roles()->attach($superAdminRole);
        $this->superAdmin->organizations()->attach($this->opd, ['is_default' => true]);

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

        $this->period = PlanningPeriod::create([
            'code' => 'RENSTRA-2026-2030',
            'name' => 'Renstra Kominfo 2026-2030',
            'year' => 2026,
            'type' => 'annual',
            'start_year' => 2026,
            'end_year' => 2030,
            'start_date' => '2026-01-01',
            'end_date' => '2030-12-31',
            'status' => 'active',
        ]);

        $this->goal = StrategicGoal::create([
            'planning_period_id' => $this->period->id,
            'organization_id' => $this->opd->id,
            'code' => 'TUJ-01',
            'name' => 'Meningkatkan Pelayanan SPBE',
            'status' => 'active',
        ]);

        $this->objective = StrategicObjective::create([
            'strategic_goal_id' => $this->goal->id,
            'code' => 'SAS-01',
            'name' => 'Meningkatnya Kualitas Aplikasi Daerah',
            'status' => 'active',
        ]);

        $this->unit = MeasurementUnit::create([
            'code' => 'PERSEN',
            'name' => 'Persen',
            'symbol' => '%',
            'is_active' => true,
        ]);
    }

    public function test_can_list_ikus_with_filter(): void
    {
        $this->actingAs($this->adminOpd)
            ->get(route('planning.iku.index', ['period_id' => $this->period->id]))
            ->assertOk();
    }

    public function test_admin_opd_can_create_iku_opd_with_yearly_targets_and_verify_draft(): void
    {
        $payload = [
            'level' => 'opd',
            'planning_period_id' => $this->period->id,
            'owner_organization_id' => $this->opd->id,
            'strategic_goal_id' => $this->goal->id,
            'strategic_objective_id' => $this->objective->id,
            'name' => 'Indeks SPBE OPD',
            'measurement_unit_id' => $this->unit->id,
            'definition' => 'Indeks kematangan SPBE internal OPD',
            'formula_notes' => 'Nilai evaluasi SPBE',
            'baseline_year' => 2025,
            'baseline_note' => 'Baseline 2025',
            'polarization' => 'positif',
            'data_source' => 'Internal Diskominfo',
            'frequency' => 'annual',
            'targets' => [
                ['year' => 2026, 'target_value' => 3.5],
                ['year' => 2027, 'target_value' => 3.8],
            ],
        ];

        $response = $this->actingAs($this->adminOpd)
            ->post(route('planning.iku.store'), $payload);

        $response->assertRedirect();

        $iku = Indicator::where('name', 'Indeks SPBE OPD')->first();
        $this->assertNotNull($iku);
        $this->assertEquals('draft', $iku->iku_status);
        $this->assertEquals('positif', $iku->polarization);
        $this->assertEquals(2025, $iku->baseline_year);

        $targets = IndicatorTarget::where('indicator_version_id', $iku->current_version_id)->get();
        $this->assertCount(2, $targets);
        $this->assertEquals(3.5, (float) $targets->where('year', 2026)->first()->target_value);
    }

    public function test_admin_bidang_can_create_unit_iku(): void
    {
        $payload = [
            'level' => 'unit',
            'planning_period_id' => $this->period->id,
            'owner_organization_id' => $this->bidang->id,
            'strategic_goal_id' => $this->goal->id,
            'strategic_objective_id' => $this->objective->id,
            'name' => 'Persentase Aplikasi Terintegrasi',
            'measurement_unit_id' => $this->unit->id,
            'definition' => 'Persentase integrasi sistem informasi',
            'formula_notes' => '(Aplikasi terintegrasi / Total aplikasi) * 100',
            'baseline_year' => 2025,
            'baseline_note' => 'Data 2025',
            'polarization' => 'positif',
            'data_source' => 'Bidang Aptika',
            'frequency' => 'annual',
            'targets' => [
                ['year' => 2026, 'target_value' => 80.0],
            ],
        ];

        $this->actingAs($this->adminBidang)
            ->post(route('planning.iku.store'), $payload)
            ->assertRedirect();

        $this->assertDatabaseHas('indicators', [
            'name' => 'Persentase Aplikasi Terintegrasi',
            'owner_organization_id' => $this->bidang->id,
            'level' => 'unit',
            'iku_status' => 'draft',
        ]);
    }

    public function test_cascade_api_endpoints_return_data(): void
    {
        $this->actingAs($this->adminOpd)
            ->getJson("/api/v1/iku/goals?period_id={$this->period->id}&level=opd&org_id={$this->opd->id}")
            ->assertOk()
            ->assertJsonFragment(['name' => 'Meningkatkan Pelayanan SPBE']);

        $this->actingAs($this->adminOpd)
            ->getJson("/api/v1/iku/objectives?goal_id={$this->goal->id}")
            ->assertOk()
            ->assertJsonFragment(['name' => 'Meningkatnya Kualitas Aplikasi Daerah']);

        $res = $this->actingAs($this->adminOpd)
            ->getJson("/api/v1/iku/period-years?period_id={$this->period->id}")
            ->assertOk();

        $this->assertEquals([2026, 2027, 2028, 2029, 2030], $res->json('data'));
    }

    public function test_complete_workflow_lifecycle_and_guard(): void
    {
        $iku = Indicator::create([
            'is_iku' => true,
            'code' => 'IKU-OPD-0001',
            'name' => 'Tingkat Kematangan SPBE',
            'level' => 'opd',
            'planning_period_id' => $this->period->id,
            'owner_organization_id' => $this->opd->id,
            'strategic_goal_id' => $this->goal->id,
            'strategic_objective_id' => $this->objective->id,
            'measurement_unit_id' => $this->unit->id,
            'definition' => 'Definisi',
            'formula_notes' => 'Formula',
            'baseline_year' => 2025,
            'polarization' => 'positif',
            'data_source' => 'Diskominfo',
            'frequency' => 'annual',
            'iku_status' => 'draft',
            'status' => 'draft',
        ]);

        $version = IndicatorVersion::create([
            'indicator_id' => $iku->id,
            'version_number' => 1,
            'name' => $iku->name,
            'created_by' => $this->adminOpd->id,
        ]);
        $iku->update(['current_version_id' => $version->id]);

        foreach (range(2026, 2030) as $yr) {
            IndicatorTarget::create([
                'indicator_version_id' => $version->id,
                'organization_id' => $this->opd->id,
                'planning_period_id' => $this->period->id,
                'year' => $yr,
                'target_value' => 3.5,
            ]);
        }

        // 1. Submit (Draft -> Diajukan oleh Admin OPD)
        $this->actingAs($this->adminOpd)
            ->post(route('planning.iku.submit', $iku))
            ->assertRedirect();
        $this->assertEquals('diajukan', $iku->fresh()->iku_status);

        // 2. Review (Diajukan -> Review oleh Kepala OPD)
        $this->actingAs($this->kepalaOpd)
            ->post(route('planning.iku.review', $iku))
            ->assertRedirect();
        $this->assertEquals('review', $iku->fresh()->iku_status);

        // 3. Return revision (Review -> Perbaikan dengan catatan)
        $this->actingAs($this->kepalaOpd)
            ->post(route('planning.iku.return', $iku), ['notes' => 'Perbaiki target 2027'])
            ->assertRedirect();
        $this->assertEquals('perbaikan', $iku->fresh()->iku_status);

        // 4. Submit again (Perbaikan -> Diajukan)
        $this->actingAs($this->adminOpd)
            ->post(route('planning.iku.submit', $iku))
            ->assertRedirect();
        $this->assertEquals('diajukan', $iku->fresh()->iku_status);

        // 5. Start review & Finalize (Diajukan -> Review -> Final oleh Kepala OPD)
        $this->actingAs($this->kepalaOpd)->post(route('planning.iku.review', $iku));
        $this->actingAs($this->kepalaOpd)->post(route('planning.iku.finalize', $iku))->assertRedirect();
        $this->assertEquals('final', $iku->fresh()->iku_status);

        // 6. Guard: Final IKU CANNOT be deleted!
        $this->actingAs($this->adminOpd)
            ->delete(route('planning.iku.destroy', $iku))
            ->assertForbidden();
        $this->assertNull($iku->fresh()->deleted_at);

        // 7. Deactivate (Final -> Nonaktif oleh Kepala OPD)
        $this->actingAs($this->kepalaOpd)
            ->post(route('planning.iku.deactivate', $iku))
            ->assertRedirect();
        $this->assertEquals('nonaktif', $iku->fresh()->iku_status);
    }

    public function test_can_export_excel_and_pdf(): void
    {
        $iku = Indicator::create([
            'is_iku' => true,
            'code' => 'IKU-OPD-0002',
            'name' => 'Kualitas Tata Kelola OPD',
            'level' => 'opd',
            'planning_period_id' => $this->period->id,
            'owner_organization_id' => $this->opd->id,
            'strategic_goal_id' => $this->goal->id,
            'strategic_objective_id' => $this->objective->id,
            'measurement_unit_id' => $this->unit->id,
            'definition' => 'Definisi tata kelola',
            'formula_notes' => 'Formula tata kelola',
            'baseline_year' => 2025,
            'polarization' => 'positif',
            'data_source' => 'Inspektorat Internal',
            'frequency' => 'annual',
            'iku_status' => 'final',
            'status' => 'active',
        ]);

        // Excel Export
        $this->actingAs($this->adminOpd)
            ->get(route('planning.iku.export.excel'))
            ->assertOk()
            ->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        // PDF Export
        $this->actingAs($this->adminOpd)
            ->get(route('planning.iku.export.pdf', $iku))
            ->assertOk();

        // PDF Rekap Export
        $this->actingAs($this->adminOpd)
            ->get(route('planning.iku.export.pdf-rekap', ['active_year' => 2026]))
            ->assertOk();
    }

    public function test_can_download_import_template(): void
    {
        $this->actingAs($this->adminOpd)
            ->get(route('planning.iku.import.template'))
            ->assertOk()
            ->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    }

    public function test_can_commit_import_from_session(): void
    {
        $validRows = [
            [
                'name' => 'Indikator Impor Unit',
                'level' => 'unit',
                'owner_organization_id' => $this->bidang->id,
                'measurement_unit_id' => $this->unit->id,
                'definition' => 'Definisi impor',
                'formula_notes' => 'Formula impor',
                'polarization' => 'positif',
                'baseline_year' => 2025,
                'baseline_note' => null,
                'data_source' => 'Bidang',
                'frequency' => 'annual',
            ],
        ];

        $this->actingAs($this->adminOpd)
            ->withSession(['iku_import_preview' => ['valid_rows' => $validRows]])
            ->post(route('planning.iku.import.commit'))
            ->assertRedirect(route('planning.iku.index'));

        $this->assertDatabaseHas('indicators', [
            'name' => 'Indikator Impor Unit',
            'is_iku' => true,
            'iku_status' => 'draft',
        ]);
    }

    public function test_duplicate_iku_prevention(): void
    {
        $payload = [
            'level' => 'opd',
            'planning_period_id' => $this->period->id,
            'owner_organization_id' => $this->opd->id,
            'strategic_goal_id' => $this->goal->id,
            'strategic_objective_id' => $this->objective->id,
            'name' => 'Indikator Unik Duplikasi',
            'measurement_unit_id' => $this->unit->id,
            'definition' => 'Definisi',
            'formula_notes' => 'Formula',
            'baseline_year' => 2025,
            'polarization' => 'positif',
            'data_source' => 'OPD',
            'frequency' => 'annual',
        ];

        // First creation succeeds
        $this->actingAs($this->adminOpd)->post(route('planning.iku.store'), $payload);

        // Second creation with exact same period, level, org, objective, and name
        $this->expectException(UniqueConstraintViolationException::class);
        Indicator::create([
            ...$payload,
            'code' => 'IKU-OPD-DUP',
            'is_iku' => true,
            'iku_status' => 'draft',
            'status' => 'draft',
        ]);
    }
}
