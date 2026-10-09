<?php

namespace Tests\Feature;

use App\Enums\Role as RoleEnum;
use App\Models\Alert;
use App\Models\AlertRule;
use App\Models\Evaluation;
use App\Models\Indicator;
use App\Models\IndicatorTarget;
use App\Models\IndicatorVersion;
use App\Models\MeasurementPeriod;
use App\Models\MeasurementUnit;
use App\Models\Organization;
use App\Models\PerformancePeriod;
use App\Models\PlanningDocument;
use App\Models\PlanningPeriod;
use App\Models\Realization;
use App\Models\Report;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ReportingEvaluationEwsTest extends TestCase
{
    use RefreshDatabase;

    private Role $superAdminRole;

    private User $superAdmin;

    private Organization $organization;

    private PlanningPeriod $planningPeriod;

    private MeasurementPeriod $measurementPeriod;

    private IndicatorVersion $version;

    private IndicatorTarget $target;

    protected function setUp(): void
    {
        parent::setUp();

        $this->superAdminRole = Role::create(['name' => RoleEnum::SuperAdmin->value]);
        $this->superAdmin = User::factory()->create();
        $this->superAdmin->roles()->attach($this->superAdminRole);

        $this->organization = Organization::create(['code' => 'OPD-R', 'name' => 'OPD Riset', 'type' => 'opd']);

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
            'code' => 'IKU-200',
            'name' => 'Capaian Program',
            'type' => 'outcome',
            'direction' => 'higher_is_better',
            'measurement_unit_id' => $unit->id,
            'frequency' => 'quarterly',
            'status' => 'active',
        ]);

        $this->version = IndicatorVersion::create([
            'indicator_id' => $indicator->id,
            'version_number' => 1,
            'name' => 'Capaian Program',
            'type' => 'outcome',
            'direction' => 'higher_is_better',
            'measurement_unit_id' => $unit->id,
            'frequency' => 'quarterly',
        ]);

        $indicator->update(['current_version_id' => $this->version->id]);

        $this->target = IndicatorTarget::create([
            'indicator_version_id' => $this->version->id,
            'organization_id' => $this->organization->id,
            'planning_period_id' => $this->planningPeriod->id,
            'target_value' => 80,
            'status' => 'approved',
        ]);
    }

    public function test_dashboard_shows_summary(): void
    {
        Realization::create([
            'indicator_version_id' => $this->version->id,
            'organization_id' => $this->organization->id,
            'measurement_period_id' => $this->measurementPeriod->id,
            'value' => 90,
            'status' => 'approved',
        ]);

        $response = $this->actingAs($this->superAdmin)
            ->get(route('dashboard'))
            ->assertOk();

        $response->assertInertia(fn ($page) => $page
            ->component('Dashboard')
            ->has('summary.average_achievement'));
    }

    public function test_can_generate_and_download_csv_report(): void
    {
        Storage::fake('local');

        Realization::create([
            'indicator_version_id' => $this->version->id,
            'organization_id' => $this->organization->id,
            'measurement_period_id' => $this->measurementPeriod->id,
            'value' => 75,
            'status' => 'approved',
        ]);

        $this->actingAs($this->superAdmin)
            ->post(route('reports.generate'), [
                'title' => 'Rekap Triwulan I',
                'type' => 'recap',
                'organization_id' => $this->organization->id,
                'planning_period_id' => $this->planningPeriod->id,
                'format' => 'csv',
            ])
            ->assertRedirect(route('reports.index'));

        $report = Report::where('title', 'Rekap Triwulan I')->firstOrFail();
        $this->assertEquals('generated', $report->status);
        $this->assertNotNull($report->file_path);
        $this->assertEquals(1, $report->snapshots()->count());

        Storage::disk('local')->assertExists($report->file_path);

        $response = $this->actingAs($this->superAdmin)
            ->get(route('reports.download', $report));

        $response->assertOk();
        $response->assertDownload(str($report->title)->slug().'.csv');
    }

    public function test_reports_index_loads_with_selected_year_and_dynamic_planning_years(): void
    {
        // Add multi-year planning period
        \App\Models\PlanningPeriod::create([
            'code' => 'RPJMD-TEST-2025-2030',
            'name' => 'RPJMD Test 2025-2030',
            'type' => 'rpjmd',
            'start_date' => '2025-01-01',
            'end_date' => '2030-12-31',
            'status' => 'active',
            'year' => 2025,
        ]);

        $response = $this->actingAs($this->superAdmin)
            ->get(route('reports.index', ['year' => 2028]));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Reports/Index')
            ->where('selected_year', 2028)
            ->has('available_years')
            ->where('available_years', fn ($years) => $years->contains(2028) && $years->contains(2030) && $years->contains(2025))
        );
    }

    public function test_can_create_evaluation_add_score_and_recommendation(): void
    {
        $this->actingAs($this->superAdmin)
            ->post(route('evaluations.store'), [
                'title' => 'Evaluasi Semester I 2026',
                'type' => 'periodic',
                'organization_id' => $this->organization->id,
                'planning_period_id' => $this->planningPeriod->id,
            ])
            ->assertRedirect();

        $evaluation = Evaluation::where('title', 'Evaluasi Semester I 2026')->firstOrFail();

        $this->actingAs($this->superAdmin)
            ->post(route('evaluations.scores.store', $evaluation), [
                'component' => 'Perencanaan',
                'score' => 28,
                'max_score' => 30,
                'weight' => 0.3,
            ])
            ->assertRedirect();

        $this->actingAs($this->superAdmin)
            ->post(route('evaluations.recommendations.store', $evaluation), [
                'title' => 'Perbaiki dokumen perencanaan',
                'owner_organization_id' => $this->organization->id,
                'priority' => 'high',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('evaluation_scores', [
            'evaluation_id' => $evaluation->id,
            'component' => 'Perencanaan',
        ]);

        $this->assertDatabaseHas('recommendations', [
            'evaluation_id' => $evaluation->id,
            'title' => 'Perbaiki dokumen perencanaan',
        ]);
    }

    public function test_can_create_alert_rule_and_manage_alert_lifecycle(): void
    {
        $this->actingAs($this->superAdmin)
            ->post(route('alert-rules.store'), [
                'code' => 'EWS-PD-01',
                'name' => 'Deviasi Capaian',
                'rule_type' => 'performance_deviation',
                'severity' => 'critical',
                'config' => '{"threshold":60}',
            ])
            ->assertRedirect();

        $rule = AlertRule::where('code', 'EWS-PD-01')->firstOrFail();
        $this->assertTrue($rule->is_active);
        $this->assertEquals(['threshold' => 60], $rule->config);

        $alert = Alert::create([
            'rule_id' => $rule->id,
            'organization_id' => $this->organization->id,
            'indicator_version_id' => $this->version->id,
            'alert_type' => 'performance_deviation',
            'severity' => 'critical',
            'title' => 'Capaian di bawah ambang',
            'status' => 'open',
        ]);

        $this->actingAs($this->superAdmin)
            ->post(route('alerts.acknowledge', $alert))
            ->assertRedirect();

        $alert->refresh();
        $this->assertEquals('acknowledged', $alert->status);
        $this->assertNotNull($alert->acknowledged_at);

        $this->actingAs($this->superAdmin)
            ->post(route('alerts.resolve', $alert))
            ->assertRedirect();

        $alert->refresh();
        $this->assertEquals('resolved', $alert->status);
        $this->assertNotNull($alert->resolved_at);
    }

    public function test_can_view_alerts_index_successfully(): void
    {
        PerformancePeriod::create([
            'year' => 2026,
            'name' => 'Tahun 2026',
            'status' => 'open',
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
        ]);

        $response = $this->actingAs($this->superAdmin)
            ->get(route('alerts.index'));

        $response->assertOk();
    }

    public function test_user_without_permission_cannot_access_new_modules(): void
    {
        $regular = User::factory()->create();

        $this->actingAs($regular)->get(route('dashboard'))->assertForbidden();

        foreach (['reports', 'evaluations', 'alerts'] as $resource) {
            $this->actingAs($regular)
                ->get(route("{$resource}.index"))
                ->assertForbidden();
        }
    }

    public function test_can_upload_pemda_lkip_document_successfully(): void
    {
        Storage::fake('local');

        $provinsi = Organization::create([
            'code' => 'PROV-PB',
            'name' => 'Pemerintah Provinsi Papua Barat',
            'type' => 'province',
        ]);

        $file = UploadedFile::fake()->create('LKIP-Provinsi-2026.pdf', 1024, 'application/pdf');

        $response = $this->actingAs($this->superAdmin)
            ->post(route('reports.upload'), [
                'target_type' => 'pemda',
                'year' => 2026,
                'file' => $file,
            ]);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect();

        $doc = PlanningDocument::where('code', 'LKIP-PEMDA-2026')->first();
        $this->assertNotNull($doc);
        $this->assertEquals('lkjip', $doc->type);
        $this->assertEquals(2026, $doc->year);
        $this->assertEquals('approved', $doc->status);
        $this->assertNotNull($doc->file_path);
        Storage::disk('local')->assertExists($doc->file_path);
    }

    public function test_can_upload_opd_lkip_document_and_replace_existing(): void
    {
        Storage::fake('local');

        $file1 = UploadedFile::fake()->create('LKIP-OPD-v1.pdf', 512, 'application/pdf');

        $this->actingAs($this->superAdmin)
            ->post(route('reports.upload'), [
                'target_type' => 'opd',
                'organization_id' => $this->organization->id,
                'year' => 2026,
                'file' => $file1,
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $doc = PlanningDocument::where('organization_id', $this->organization->id)
            ->where('year', 2026)
            ->first();
        $this->assertNotNull($doc);
        $filePath1 = $doc->file_path;
        Storage::disk('local')->assertExists($filePath1);

        // Upload replacement
        $file2 = UploadedFile::fake()->create('LKIP-OPD-v2.pdf', 768, 'application/pdf');
        $this->actingAs($this->superAdmin)
            ->post(route('reports.upload'), [
                'target_type' => 'opd',
                'organization_id' => $this->organization->id,
                'year' => 2026,
                'file' => $file2,
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $doc->refresh();
        $this->assertNotEquals($filePath1, $doc->file_path);
        Storage::disk('local')->assertExists($doc->file_path);
        Storage::disk('local')->assertMissing($filePath1);

        // Preview & download
        $this->actingAs($this->superAdmin)
            ->get(route('reports.preview', $doc->id))
            ->assertOk();

        $this->actingAs($this->superAdmin)
            ->get(route('reports.file-download', $doc->id))
            ->assertOk();

        // Delete
        $this->actingAs($this->superAdmin)
            ->delete(route('reports.destroy', $doc->id))
            ->assertRedirect();

        $this->assertSoftDeleted('planning_documents', ['id' => $doc->id]);
    }

    public function test_opd_admin_can_access_own_lkip_upload_but_restricted_from_pemda_and_other_opds(): void
    {
        Storage::fake('local');

        $opdRole = Role::firstOrCreate(['name' => RoleEnum::AdminOpd->value]);
        $viewReportsPerm = \App\Models\Permission::firstOrCreate(['name' => 'report:view'], ['resource' => 'report', 'action' => 'view', 'module' => 'reporting']);
        $generateReportsPerm = \App\Models\Permission::firstOrCreate(['name' => 'report:generate'], ['resource' => 'report', 'action' => 'generate', 'module' => 'reporting']);
        $opdRole->permissions()->syncWithoutDetaching([$viewReportsPerm->id, $generateReportsPerm->id]);

        $opdUser = User::factory()->create();
        $opdUser->roles()->attach($opdRole);
        $opdUser->organizations()->attach($this->organization->id, ['is_default' => true]);

        $otherOrg = Organization::create(['code' => 'OPD-OTHER', 'name' => 'OPD Lain', 'type' => 'opd']);

        // Check reports.index props
        $response = $this->actingAs($opdUser)->get(route('reports.index', ['year' => 2026]));
        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Reports/Index')
            ->where('can_upload', true)
            ->where('is_provincial_admin', false)
            ->where('accessible_organization_ids', [$this->organization->id])
        );

        // Upload own OPD LKIP succeeds
        $file = UploadedFile::fake()->create('LKIP-OPD-Mine.pdf', 512, 'application/pdf');
        $this->actingAs($opdUser)
            ->post(route('reports.upload'), [
                'target_type' => 'opd',
                'organization_id' => $this->organization->id,
                'year' => 2026,
                'file' => $file,
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $this->assertDatabaseHas('planning_documents', [
            'organization_id' => $this->organization->id,
            'year' => 2026,
        ]);

        // Upload Pemda LKIP fails with 403
        $pemdaFile = UploadedFile::fake()->create('LKIP-Pemda.pdf', 512, 'application/pdf');
        $this->actingAs($opdUser)
            ->post(route('reports.upload'), [
                'target_type' => 'pemda',
                'year' => 2026,
                'file' => $pemdaFile,
            ])
            ->assertForbidden();

        // Upload Other OPD LKIP fails with 403
        $otherFile = UploadedFile::fake()->create('LKIP-Other.pdf', 512, 'application/pdf');
        $this->actingAs($opdUser)
            ->post(route('reports.upload'), [
                'target_type' => 'opd',
                'organization_id' => $otherOrg->id,
                'year' => 2026,
                'file' => $otherFile,
            ])
            ->assertForbidden();
    }

    public function test_opd_user_with_evaluation_permissions_cannot_manage_provincial_sakip_and_pko(): void
    {
        Storage::fake('public');

        $pemdaOrg = Organization::firstOrCreate(
            ['type' => 'province'],
            ['code' => 'PEMDA-PB', 'name' => 'Pemerintah Provinsi Papua Barat']
        );

        // Create Admin OPD role & user with evaluation:manage and evaluation:score
        $opdRole = Role::firstOrCreate(['name' => 'Admin OPD']);
        $managePerm = \App\Models\Permission::firstOrCreate(['name' => 'evaluation:manage'], ['resource' => 'evaluation', 'action' => 'manage', 'module' => 'evaluation']);
        $scorePerm = \App\Models\Permission::firstOrCreate(['name' => 'evaluation:score'], ['resource' => 'evaluation', 'action' => 'score', 'module' => 'evaluation']);
        $viewPerm = \App\Models\Permission::firstOrCreate(['name' => 'evaluation:view'], ['resource' => 'evaluation', 'action' => 'view', 'module' => 'evaluation']);
        $opdRole->permissions()->syncWithoutDetaching([$managePerm->id, $scorePerm->id, $viewPerm->id]);

        $opdUser = User::factory()->create();
        $opdUser->roles()->attach($opdRole);
        $opdUser->organizations()->attach($this->organization->id, ['is_default' => true]);

        // 1. OPD user cannot save SAKIP for Pemda
        $this->actingAs($opdUser)
            ->post(route('evaluations.sakip.save'), [
                'organization_id' => $pemdaOrg->id,
                'year' => 2026,
                'perencanaan' => 25,
                'pengukuran' => 25,
                'pelaporan' => 12,
                'evaluasi_internal' => 20,
            ])
            ->assertForbidden();

        // 2. OPD user can save SAKIP for their OWN OPD
        $this->actingAs($opdUser)
            ->post(route('evaluations.sakip.save'), [
                'organization_id' => $this->organization->id,
                'year' => 2026,
                'perencanaan' => 25,
                'pengukuran' => 25,
                'pelaporan' => 12,
                'evaluasi_internal' => 20,
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        // 3. OPD user cannot upload LHE for Pemda
        $lheFile = UploadedFile::fake()->create('LHE-Pemda.pdf', 512, 'application/pdf');
        $this->actingAs($opdUser)
            ->post(route('evaluations.sakip.upload-lhe'), [
                'organization_id' => $pemdaOrg->id,
                'year' => 2026,
                'file' => $lheFile,
            ])
            ->assertForbidden();

        // 4. OPD user cannot save PKO indicator for Pemda
        $this->actingAs($opdUser)
            ->post(route('evaluations.pko.indicators.save'), [
                'organization_id' => $pemdaOrg->id,
                'year' => 2026,
                'sasaran' => 'Sasaran Pemda',
                'indikator' => 'Indikator Pemda',
                'satuan' => '%',
                'target' => 100,
                'realisasi' => 90,
            ])
            ->assertForbidden();

        // 5. OPD user can save PKO indicator for their OWN OPD
        $this->actingAs($opdUser)
            ->post(route('evaluations.pko.indicators.save'), [
                'organization_id' => $this->organization->id,
                'year' => 2026,
                'sasaran' => 'Sasaran OPD',
                'indikator' => 'Indikator OPD',
                'satuan' => '%',
                'target' => 100,
                'realisasi' => 90,
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        // 6. Evaluations Index props show can_manage_pemda is false for OPD user
        $response = $this->actingAs($opdUser)->get(route('evaluations.index', ['year' => 2026]));
        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Evaluations/Index')
            ->where('can_manage', true)
            ->where('can_manage_pemda', false)
        );

        // 7. Super Admin / Provincial Evaluator has can_manage_pemda = true and CAN manage Pemda SAKIP
        $responseSuper = $this->actingAs($this->superAdmin)->get(route('evaluations.index', ['year' => 2026]));
        $responseSuper->assertOk();
        $responseSuper->assertInertia(fn ($page) => $page
            ->component('Evaluations/Index')
            ->where('can_manage', true)
            ->where('can_manage_pemda', true)
        );

        $this->actingAs($this->superAdmin)
            ->post(route('evaluations.sakip.save'), [
                'organization_id' => $pemdaOrg->id,
                'year' => 2026,
                'perencanaan' => 28,
                'pengukuran' => 27,
                'pelaporan' => 14,
                'evaluasi_internal' => 22,
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect();
    }
}

