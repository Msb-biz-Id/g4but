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
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class IkuTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;
    private User $adminOpd;
    private User $adminBappeda;
    private Organization $bappedaOrg;
    private Organization $dinasOrg;
    private PlanningPeriod $period;
    private StrategicGoal $goal;
    private StrategicObjective $objective;
    private MeasurementUnit $unit;

    protected function setUp(): void
    {
        parent::setUp();

        $superAdminRole = Role::create(['name' => RoleEnum::SuperAdmin->value]);
        $adminProvRole  = Role::create(['name' => RoleEnum::AdminProvinsi->value]);
        $adminOpdRole   = Role::create(['name' => 'admin_opd']);

        $this->bappedaOrg = Organization::create([
            'code'       => 'BAPPEDA-PB',
            'name'       => 'Badan Perencanaan Pembangunan Daerah Papua Barat',
            'is_bappeda' => true,
            'is_active'  => true,
        ]);

        $this->dinasOrg = Organization::create([
            'code'       => 'DISDIK-PB',
            'name'       => 'Dinas Pendidikan Papua Barat',
            'is_bappeda' => false,
            'is_active'  => true,
        ]);

        $this->superAdmin = User::factory()->create();
        $this->superAdmin->roles()->attach($superAdminRole);
        $this->superAdmin->organizations()->attach($this->bappedaOrg, ['is_default' => true]);

        $this->adminBappeda = User::factory()->create();
        $this->adminBappeda->roles()->attach($adminProvRole);
        $this->adminBappeda->organizations()->attach($this->bappedaOrg, ['is_default' => true]);

        $this->adminOpd = User::factory()->create();
        $this->adminOpd->roles()->attach($adminOpdRole);
        $this->adminOpd->organizations()->attach($this->dinasOrg, ['is_default' => true]);

        $this->period = PlanningPeriod::create([
            'code'       => 'RPJMD-2025-2029',
            'name'       => 'RPJMD Papua Barat 2025-2029',
            'year'       => 2025,
            'type'       => 'annual',
            'start_date' => '2025-01-01',
            'end_date'   => '2029-12-31',
            'status'     => 'active',
        ]);

        $this->goal = StrategicGoal::create([
            'planning_period_id' => $this->period->id,
            'organization_id'    => $this->dinasOrg->id,
            'code'               => 'TUJ-01',
            'name'               => 'Meningkatkan Kualitas SDM',
            'status'             => 'active',
        ]);

        $this->objective = StrategicObjective::create([
            'strategic_goal_id' => $this->goal->id,
            'code'              => 'SAS-01',
            'name'              => 'Meningkatnya Akses Pendidikan Menengah',
            'status'            => 'active',
        ]);

        $this->unit = MeasurementUnit::create([
            'code'      => 'PERSEN',
            'name'      => 'Persen',
            'symbol'    => '%',
            'is_active' => true,
        ]);
    }

    public function test_can_list_ikus_with_filter(): void
    {
        $this->actingAs($this->superAdmin)
            ->get(route('planning.iku.index', ['period_id' => $this->period->id]))
            ->assertOk();
    }

    public function test_can_create_iku_with_yearly_targets_and_verify_draft(): void
    {
        $payload = [
            'level'                  => 'perangkat_daerah',
            'planning_period_id'     => $this->period->id,
            'owner_organization_id'  => $this->dinasOrg->id,
            'strategic_goal_id'      => $this->goal->id,
            'strategic_objective_id' => $this->objective->id,
            'name'                   => 'Angka Partisipasi Kasar SMA',
            'measurement_unit_id'    => $this->unit->id,
            'definition'             => 'Jumlah siswa terdaftar SMA dibanding usia sekolah',
            'formula_notes'          => '(Siswa SMA / Usia 16-18) * 100',
            'baseline_year'          => 2024,
            'baseline_note'          => 'Data Dapodik',
            'polarization'           => 'positif',
            'data_source'            => 'Dinas Pendidikan',
            'frequency'              => 'annual',
            'targets'                => [
                ['year' => 2025, 'target_value' => 85.5],
                ['year' => 2026, 'target_value' => 87.0],
                ['year' => 2027, 'target_value' => 89.0],
            ],
        ];

        $response = $this->actingAs($this->superAdmin)
            ->post(route('planning.iku.store'), $payload);

        $response->assertRedirect();

        $iku = Indicator::where('name', 'Angka Partisipasi Kasar SMA')->first();
        $this->assertNotNull($iku);
        $this->assertEquals('draft', $iku->iku_status);
        $this->assertEquals('positif', $iku->polarization);
        $this->assertEquals(2024, $iku->baseline_year);

        // Verify yearly targets were stored
        $targets = IndicatorTarget::where('indicator_version_id', $iku->current_version_id)->get();
        $this->assertCount(3, $targets);
        $this->assertEquals(85.5, (float) $targets->where('year', 2025)->first()->target_value);
    }

    public function test_cascade_api_endpoints_return_data(): void
    {
        // Goals endpoint
        $this->actingAs($this->superAdmin)
            ->getJson("/api/v1/iku/goals?period_id={$this->period->id}&level=perangkat_daerah&org_id={$this->dinasOrg->id}")
            ->assertOk()
            ->assertJsonFragment(['name' => 'Meningkatkan Kualitas SDM']);

        // Objectives endpoint
        $this->actingAs($this->superAdmin)
            ->getJson("/api/v1/iku/objectives?goal_id={$this->goal->id}")
            ->assertOk()
            ->assertJsonFragment(['name' => 'Meningkatnya Akses Pendidikan Menengah']);

        // Period years range
        $res = $this->actingAs($this->superAdmin)
            ->getJson("/api/v1/iku/period-years?period_id={$this->period->id}")
            ->assertOk();

        $this->assertEquals([2025, 2026, 2027, 2028, 2029], $res->json('data'));
    }

    public function test_complete_workflow_lifecycle_and_guard(): void
    {
        $iku = Indicator::create([
            'is_iku'                 => true,
            'code'                   => 'IKU-PD-0001',
            'name'                   => 'Angka Kelulusan SMA',
            'level'                  => 'perangkat_daerah',
            'planning_period_id'     => $this->period->id,
            'owner_organization_id'  => $this->dinasOrg->id,
            'strategic_goal_id'      => $this->goal->id,
            'strategic_objective_id' => $this->objective->id,
            'measurement_unit_id'    => $this->unit->id,
            'definition'             => 'Definisi',
            'formula_notes'          => 'Formula',
            'baseline_year'          => 2024,
            'polarization'           => 'positif',
            'data_source'            => 'Disdik',
            'frequency'              => 'annual',
            'iku_status'             => 'draft',
            'status'                 => 'draft',
        ]);

        $version = IndicatorVersion::create([
            'indicator_id'   => $iku->id,
            'version_number' => 1,
            'name'           => $iku->name,
            'created_by'     => $this->superAdmin->id,
        ]);
        $iku->update(['current_version_id' => $version->id]);

        foreach (range(2025, 2029) as $yr) {
            IndicatorTarget::create([
                'indicator_version_id' => $version->id,
                'organization_id'      => $this->dinasOrg->id,
                'planning_period_id'   => $this->period->id,
                'year'                 => $yr,
                'target_value'         => 85.0,
            ]);
        }

        // 1. Submit (Draft -> Diajukan)
        $this->actingAs($this->superAdmin)
            ->post(route('planning.iku.submit', $iku))
            ->assertRedirect();
        $this->assertEquals('diajukan', $iku->fresh()->iku_status);

        // 2. Review (Diajukan -> Review by Bappeda)
        $this->actingAs($this->adminBappeda)
            ->post(route('planning.iku.review', $iku))
            ->assertRedirect();
        $this->assertEquals('review', $iku->fresh()->iku_status);

        // 3. Return revision (Review -> Perbaikan)
        $this->actingAs($this->adminBappeda)
            ->post(route('planning.iku.return', $iku), ['notes' => 'Perbaiki target 2026'])
            ->assertRedirect();
        $this->assertEquals('perbaikan', $iku->fresh()->iku_status);

        // 4. Submit again (Perbaikan -> Diajukan)
        $this->actingAs($this->superAdmin)
            ->post(route('planning.iku.submit', $iku))
            ->assertRedirect();
        $this->assertEquals('diajukan', $iku->fresh()->iku_status);

        // 5. Start review & Finalize (Diajukan -> Review -> Final)
        $this->actingAs($this->adminBappeda)->post(route('planning.iku.review', $iku));
        $this->actingAs($this->adminBappeda)->post(route('planning.iku.finalize', $iku))->assertRedirect();
        $this->assertEquals('final', $iku->fresh()->iku_status);

        // 6. Guard: Final IKU CANNOT be deleted!
        $this->actingAs($this->superAdmin)
            ->delete(route('planning.iku.destroy', $iku))
            ->assertRedirect();
        $this->assertNull($iku->fresh()->deleted_at);

        // 7. Deactivate (Final -> Nonaktif)
        $this->actingAs($this->adminBappeda)
            ->post(route('planning.iku.deactivate', $iku))
            ->assertRedirect();
        $this->assertEquals('nonaktif', $iku->fresh()->iku_status);
    }

    public function test_can_export_excel_and_pdf(): void
    {
        $iku = Indicator::create([
            'is_iku'                 => true,
            'code'                   => 'IKU-PD-0002',
            'name'                   => 'Tingkat Literasi',
            'level'                  => 'pemda',
            'planning_period_id'     => $this->period->id,
            'strategic_goal_id'      => $this->goal->id,
            'strategic_objective_id' => $this->objective->id,
            'measurement_unit_id'    => $this->unit->id,
            'definition'             => 'Definisi literasi',
            'formula_notes'          => 'Formula literasi',
            'baseline_year'          => 2024,
            'polarization'           => 'positif',
            'data_source'            => 'BPS',
            'frequency'              => 'annual',
            'iku_status'             => 'final',
            'status'                 => 'active',
        ]);

        // Excel Export
        $this->actingAs($this->superAdmin)
            ->get(route('planning.iku.export.excel'))
            ->assertOk()
            ->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        // PDF Export
        $this->actingAs($this->superAdmin)
            ->get(route('planning.iku.export.pdf', $iku))
            ->assertOk();

        // PDF Rekap Export
        $this->actingAs($this->superAdmin)
            ->get(route('planning.iku.export.pdf-rekap', ['active_year' => 2025]))
            ->assertOk();
    }

    public function test_can_download_import_template(): void
    {
        $this->actingAs($this->superAdmin)
            ->get(route('planning.iku.import.template'))
            ->assertOk()
            ->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    }

    public function test_can_commit_import_from_session(): void
    {
        $validRows = [
            [
                'name'                  => 'Indikator Impor Contoh',
                'level'                 => 'pemda',
                'owner_organization_id' => null,
                'measurement_unit_id'   => $this->unit->id,
                'definition'            => 'Definisi impor',
                'formula_notes'         => 'Formula impor',
                'polarization'          => 'positif',
                'baseline_year'         => 2024,
                'baseline_note'         => null,
                'data_source'           => 'BPS',
                'frequency'             => 'annual',
            ],
        ];

        $this->actingAs($this->superAdmin)
            ->withSession(['iku_import_preview' => ['valid_rows' => $validRows]])
            ->post(route('planning.iku.import.commit'))
            ->assertRedirect(route('planning.iku.index'));

        $this->assertDatabaseHas('indicators', [
            'name'       => 'Indikator Impor Contoh',
            'is_iku'     => true,
            'iku_status' => 'draft',
        ]);
    }

    public function test_duplicate_iku_prevention(): void
    {
        $payload = [
            'level'                  => 'perangkat_daerah',
            'planning_period_id'     => $this->period->id,
            'owner_organization_id'  => $this->dinasOrg->id,
            'strategic_goal_id'      => $this->goal->id,
            'strategic_objective_id' => $this->objective->id,
            'name'                   => 'Indikator Unik Duplikasi',
            'measurement_unit_id'    => $this->unit->id,
            'definition'             => 'Definisi',
            'formula_notes'          => 'Formula',
            'baseline_year'          => 2024,
            'polarization'           => 'positif',
            'data_source'            => 'Dinas',
            'frequency'              => 'annual',
        ];

        // First creation succeeds
        $this->actingAs($this->superAdmin)->post(route('planning.iku.store'), $payload);

        // Second creation with exact same period, level, org, objective, and name
        $this->expectException(\Illuminate\Database\UniqueConstraintViolationException::class);
        Indicator::create([
            ...$payload,
            'code'       => 'IKU-PD-DUP',
            'is_iku'     => true,
            'iku_status' => 'draft',
            'status'     => 'draft',
        ]);
    }
}
