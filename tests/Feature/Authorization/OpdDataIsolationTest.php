<?php

namespace Tests\Feature\Authorization;

use App\Enums\Role as RoleEnum;
use App\Models\ActionPlan;
use App\Models\Alert;
use App\Models\AlertRule;
use App\Models\DocumentRevision;
use App\Models\Evaluation;
use App\Models\Indicator;
use App\Models\IndicatorTarget;
use App\Models\IndicatorVersion;
use App\Models\MeasurementPeriod;
use App\Models\MeasurementUnit;
use App\Models\Organization;
use App\Models\PerformanceAgreement;
use App\Models\PerformancePeriod;
use App\Models\PlanningDocument;
use App\Models\PlanningPeriod;
use App\Models\PlanningTree;
use App\Models\Realization;
use App\Models\Risk;
use App\Models\Role;
use App\Models\StrategicGoal;
use App\Models\User;
use App\Services\IkuImportService;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class OpdDataIsolationTest extends TestCase
{
    use RefreshDatabase;

    private User $userOpdA;

    private User $userOpdB;

    private User $superAdmin;

    private Organization $orgProv;

    private Organization $orgOpdA;

    private Organization $orgOpdB;

    private PlanningPeriod $planningPeriod;

    private PerformancePeriod $performancePeriod;

    private MeasurementPeriod $measurementPeriod;

    private MeasurementUnit $unit;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');

        $this->seed(RolePermissionSeeder::class);

        $superAdminRole = Role::where('name', RoleEnum::SuperAdmin->value)->firstOrFail();
        $adminOpdRole = Role::where('name', RoleEnum::AdminOpd->value)->firstOrFail();

        // Province organization (id: 1)
        $this->orgProv = Organization::create([
            'id' => 1,
            'code' => 'PROV-PB',
            'name' => 'Pemerintah Provinsi Papua Barat',
            'type' => 'province',
            'is_bappeda' => false,
            'is_active' => true,
        ]);

        // OPD A (Dinas Pendidikan)
        $this->orgOpdA = Organization::create([
            'code' => 'DISDIK-PB',
            'name' => 'Dinas Pendidikan Papua Barat',
            'type' => 'opd',
            'is_bappeda' => false,
            'is_active' => true,
        ]);

        // OPD B (Dinas Kesehatan)
        $this->orgOpdB = Organization::create([
            'code' => 'DINKES-PB',
            'name' => 'Dinas Kesehatan Papua Barat',
            'type' => 'opd',
            'is_bappeda' => false,
            'is_active' => true,
        ]);

        // Users
        $this->userOpdA = User::factory()->create();
        $this->userOpdA->roles()->attach($adminOpdRole);
        $this->userOpdA->organizations()->attach($this->orgOpdA, ['is_default' => true]);

        $this->userOpdB = User::factory()->create();
        $this->userOpdB->roles()->attach($adminOpdRole);
        $this->userOpdB->organizations()->attach($this->orgOpdB, ['is_default' => true]);

        $this->superAdmin = User::factory()->create();
        $this->superAdmin->roles()->attach($superAdminRole);
        $this->superAdmin->organizations()->attach($this->orgProv, ['is_default' => true]);

        // Periods & Units
        $this->planningPeriod = PlanningPeriod::create([
            'code' => 'RPJMD-2025-2029',
            'name' => 'RPJMD Papua Barat 2025-2029',
            'year' => 2025,
            'start_year' => 2025,
            'end_year' => 2029,
            'start_date' => '2025-01-01',
            'end_date' => '2029-12-31',
            'type' => 'rpjmd',
            'status' => 'active',
        ]);

        $this->performancePeriod = PerformancePeriod::create([
            'name' => '2025',
            'year' => 2025,
            'status' => 'active',
        ]);

        $this->measurementPeriod = MeasurementPeriod::create([
            'planning_period_id' => $this->planningPeriod->id,
            'code' => 'TW1-2025',
            'name' => 'Triwulan 1 2025',
            'type' => 'quarterly',
            'start_date' => '2025-01-01',
            'end_date' => '2025-03-31',
            'status' => 'active',
        ]);

        $this->unit = MeasurementUnit::create([
            'code' => 'PERSEN',
            'name' => 'Persen',
            'symbol' => '%',
            'is_active' => true,
        ]);
    }

    // =========================================================================
    // 1. PLANNING DOCUMENTS
    // =========================================================================

    public function test_opd_cannot_create_planning_document_for_another_opd(): void
    {
        $payload = [
            'organization_id' => $this->orgOpdB->id, // OPD B
            'performance_period_id' => $this->performancePeriod->id,
            'type' => 'renstra',
            'title' => 'Renstra Dinkes',
            'year' => 2025,
            'periode_type' => 'tahunan',
        ];

        $response = $this->actingAs($this->userOpdA)
            ->post(route('planning.documents.store'), $payload);

        $response->assertForbidden();
    }

    public function test_opd_cannot_update_or_delete_planning_document_of_another_opd(): void
    {
        $docOpdB = PlanningDocument::create([
            'organization_id' => $this->orgOpdB->id,
            'performance_period_id' => $this->performancePeriod->id,
            'code' => 'RENSTRA-DINKES-2025',
            'type' => 'renstra',
            'title' => 'Renstra Dinkes Asli',
            'year' => 2025,
            'status' => 'draft',
            'periode_type' => 'tahunan',
            'created_by' => $this->userOpdB->id,
        ]);

        // Attempt update
        $this->actingAs($this->userOpdA)
            ->put(route('planning.documents.update', $docOpdB), [
                'organization_id' => $this->orgOpdB->id,
                'performance_period_id' => $this->performancePeriod->id,
                'type' => 'renstra',
                'title' => 'Hacked Renstra',
                'year' => 2025,
                'periode_type' => 'tahunan',
            ])
            ->assertForbidden();

        // Attempt delete
        $this->actingAs($this->userOpdA)
            ->delete(route('planning.documents.destroy', $docOpdB))
            ->assertForbidden();

        // Verify document remains unchanged
        $this->assertDatabaseHas('planning_documents', [
            'id' => $docOpdB->id,
            'title' => 'Renstra Dinkes Asli',
        ]);
    }

    // =========================================================================
    // 2. PERFORMANCE AGREEMENTS (Perjanjian Kinerja)
    // =========================================================================

    public function test_opd_cannot_create_or_delete_agreement_for_another_opd(): void
    {
        // Store attempt for other OPD
        $this->actingAs($this->userOpdA)
            ->post(route('planning.agreements.store'), [
                'organization_id' => $this->orgOpdB->id,
                'performance_period_id' => $this->performancePeriod->id,
                'name' => 'PK Dinkes',
                'year' => 2025,
            ])
            ->assertForbidden();

        $agreementB = PerformanceAgreement::create([
            'organization_id' => $this->orgOpdB->id,
            'planning_period_id' => $this->planningPeriod->id,
            'code' => 'PK-DINKES-2025',
            'title' => 'PK Dinkes 2025',
            'status' => 'draft',
            'created_by' => $this->userOpdB->id,
        ]);

        // Destroy attempt
        $this->actingAs($this->userOpdA)
            ->delete(route('planning.agreements.destroy', $agreementB))
            ->assertForbidden();
    }

    // =========================================================================
    // 3. ACTION PLANS (Rencana Aksi)
    // =========================================================================

    public function test_opd_cannot_create_or_modify_action_plan_for_another_opd(): void
    {
        // Store attempt
        $this->actingAs($this->userOpdA)
            ->post(route('planning.action-plans.store'), [
                'organization_id' => $this->orgOpdB->id,
                'performance_period_id' => $this->performancePeriod->id,
                'activity' => 'Kegiatan Kesehatan',
                'status' => 'not_started',
            ])
            ->assertForbidden();

        $planB = ActionPlan::create([
            'organization_id' => $this->orgOpdB->id,
            'performance_period_id' => $this->performancePeriod->id,
            'planning_period_id' => $this->performancePeriod->id,
            'title' => 'Rencana Aksi Dinkes',
            'activity' => 'Rencana Aksi Dinkes',
            'status' => 'not_started',
            'created_by' => $this->userOpdB->id,
        ]);

        // Advance attempt
        $this->actingAs($this->userOpdA)
            ->post(route('planning.action-plans.advance', $planB), [
                'progress' => 50,
            ])
            ->assertForbidden();

        // Destroy attempt
        $this->actingAs($this->userOpdA)
            ->delete(route('planning.action-plans.destroy', $planB))
            ->assertForbidden();
    }

    // =========================================================================
    // 4. PLANNING TREES (Pohon Kinerja)
    // =========================================================================

    public function test_opd_cannot_access_or_modify_another_opds_planning_tree(): void
    {
        $treeB = PlanningTree::create([
            'organization_id' => $this->orgOpdB->id,
            'performance_period_id' => $this->performancePeriod->id,
            'level' => 'outcome',
            'code' => 'SAS-DINKES-01',
            'name' => 'Meningkatkan Pelayanan Kesehatan',
            'created_by' => $this->userOpdB->id,
        ]);

        // Tree builder access for other OPD
        $this->actingAs($this->userOpdA)
            ->get(route('planning.trees.builder', $treeB))
            ->assertForbidden();

        // Store under other OPD
        $this->actingAs($this->userOpdA)
            ->post(route('planning.trees.store'), [
                'organization_id' => $this->orgOpdB->id,
                'performance_period_id' => $this->performancePeriod->id,
                'level' => 'output',
                'code' => 'OUT-01',
                'name' => 'Sub Kegiatan',
            ])
            ->assertForbidden();

        // Destroy tree of other OPD
        $this->actingAs($this->userOpdA)
            ->delete(route('planning.trees.destroy', $treeB))
            ->assertForbidden();
    }

    public function test_opd_can_view_provincial_macro_tree(): void
    {
        $treeProv = PlanningTree::create([
            'organization_id' => $this->orgProv->id, // Org 1
            'performance_period_id' => $this->performancePeriod->id,
            'level' => 'visi',
            'code' => 'VISI-PROV',
            'name' => 'Visi Pemprov Papua Barat',
            'created_by' => $this->superAdmin->id,
        ]);

        $this->actingAs($this->userOpdA)
            ->get(route('planning.trees.builder', $treeProv))
            ->assertOk();
    }

    // =========================================================================
    // 5. RISKS (Manajemen Risiko)
    // =========================================================================

    public function test_opd_cannot_create_or_modify_risk_for_another_opd(): void
    {
        // Store attempt
        $this->actingAs($this->userOpdA)
            ->post(route('planning.risks.store'), [
                'organization_id' => $this->orgOpdB->id,
                'performance_period_id' => $this->performancePeriod->id,
                'risk_event' => 'Risiko Dinkes',
                'likelihood' => 3,
                'impact_level' => 4,
                'status' => 'open',
            ])
            ->assertForbidden();

        $riskB = Risk::create([
            'organization_id' => $this->orgOpdB->id,
            'performance_period_id' => $this->performancePeriod->id,
            'title' => 'Risiko Dinkes',
            'risk_event' => 'Risiko Dinkes',
            'likelihood' => 3,
            'impact_level' => 4,
            'risk_level' => 'high',
            'status' => 'open',
            'created_by' => $this->userOpdB->id,
        ]);

        // Update attempt
        $this->actingAs($this->userOpdA)
            ->put(route('planning.risks.update', $riskB), [
                'organization_id' => $this->orgOpdB->id,
                'performance_period_id' => $this->performancePeriod->id,
                'risk_event' => 'Risiko Dinkes Diubah',
                'likelihood' => 4,
                'impact_level' => 5,
                'status' => 'open',
            ])
            ->assertForbidden();

        // Destroy attempt
        $this->actingAs($this->userOpdA)
            ->delete(route('planning.risks.destroy', $riskB))
            ->assertForbidden();
    }

    // =========================================================================
    // 6. PERFORMANCE MEASUREMENT (Pengukuran Kinerja)
    // =========================================================================

    public function test_opd_cannot_view_or_mutate_measurement_of_another_opd(): void
    {
        // View OPD Realization page with query param organization_id=OPD_B
        $this->actingAs($this->userOpdA)
            ->get(route('measurement.realization.opd', ['organization_id' => $this->orgOpdB->id]))
            ->assertForbidden();

        // View Output Monitoring page with query param organization_id=OPD_B
        $this->actingAs($this->userOpdA)
            ->get(route('measurement.monitoring.output', ['organization_id' => $this->orgOpdB->id]))
            ->assertForbidden();

        // View Budget Monitoring page with query param organization_id=OPD_B
        $this->actingAs($this->userOpdA)
            ->get(route('measurement.monitoring.budget', ['organization_id' => $this->orgOpdB->id]))
            ->assertForbidden();

        // Attempt store OPD realization item for OPD B
        $this->actingAs($this->userOpdA)
            ->post(route('measurement.realization.opd.store'), [
                'organization_id' => $this->orgOpdB->id,
                'goal' => 'Tujuan Kesehatan',
                'measurement_pattern' => 'Positif',
            ])
            ->assertForbidden();

        // Attempt store Output item for OPD B
        $this->actingAs($this->userOpdA)
            ->post(route('measurement.monitoring.output.store'), [
                'organization_id' => $this->orgOpdB->id,
                'year' => 2025,
                'measurement_pattern' => 'Positif',
            ])
            ->assertForbidden();

        // Attempt store Budget item for OPD B
        $this->actingAs($this->userOpdA)
            ->post(route('measurement.monitoring.budget.store'), [
                'organization_id' => $this->orgOpdB->id,
                'year' => 2025,
            ])
            ->assertForbidden();
    }

    // =========================================================================
    // 7. REALIZATIONS & EVIDENCES
    // =========================================================================

    public function test_opd_cannot_store_realization_for_another_opd(): void
    {
        $indicator = Indicator::create([
            'code' => 'IND-DINKES-01',
            'name' => 'Cakupan Imunisasi',
            'status' => 'active',
            'owner_organization_id' => $this->orgOpdB->id,
        ]);

        $version = IndicatorVersion::create([
            'indicator_id' => $indicator->id,
            'version_number' => 1,
            'name' => 'Cakupan Imunisasi',
            'type' => 'output',
            'direction' => 'higher_is_better',
            'measurement_unit_id' => $this->unit->id,
            'frequency' => 'quarterly',
        ]);

        $indicator->update(['current_version_id' => $version->id]);

        // Attempt POST /realizations with organization_id = OPD B
        $response = $this->actingAs($this->userOpdA)
            ->post(route('realizations.store'), [
                'indicator_version_id' => $version->id,
                'organization_id' => $this->orgOpdB->id,
                'measurement_period_id' => $this->measurementPeriod->id,
                'value' => 85.5,
            ]);

        // Should fail validation on organization_id
        $response->assertSessionHasErrors('organization_id');
    }

    public function test_opd_cannot_upload_or_delete_evidence_on_another_opds_realization(): void
    {
        $indicator = Indicator::create([
            'code' => 'IND-DINKES-02',
            'name' => 'Pelayanan Balita',
            'status' => 'active',
            'owner_organization_id' => $this->orgOpdB->id,
        ]);

        $version = IndicatorVersion::create([
            'indicator_id' => $indicator->id,
            'version_number' => 1,
            'name' => 'Pelayanan Balita',
            'type' => 'output',
            'direction' => 'higher_is_better',
            'measurement_unit_id' => $this->unit->id,
            'frequency' => 'quarterly',
        ]);

        $realizationB = Realization::create([
            'indicator_version_id' => $version->id,
            'organization_id' => $this->orgOpdB->id,
            'measurement_period_id' => $this->measurementPeriod->id,
            'value' => 90.0,
            'status' => 'draft',
            'created_by' => $this->userOpdB->id,
        ]);

        $file = UploadedFile::fake()->create('laporan.pdf', 100, 'application/pdf');

        // User A tries to upload evidence on Realization B
        $this->actingAs($this->userOpdA)
            ->post(route('evidences.store', $realizationB), [
                'file' => $file,
            ])
            ->assertForbidden();
    }

    // =========================================================================
    // 8. MASTER DATA: GOALS, OBJECTIVES, TARGETS
    // =========================================================================

    public function test_opd_cannot_create_or_mutate_goals_for_another_opd(): void
    {
        // Attempt create goal for OPD B
        $this->actingAs($this->userOpdA)
            ->post(route('goals.store'), [
                'planning_period_id' => $this->planningPeriod->id,
                'organization_id' => $this->orgOpdB->id,
                'code' => 'TUJ-DINKES-01',
                'name' => 'Tujuan Kesehatan',
            ])
            ->assertForbidden();

        $goalB = StrategicGoal::create([
            'planning_period_id' => $this->planningPeriod->id,
            'organization_id' => $this->orgOpdB->id,
            'code' => 'TUJ-DINKES-02',
            'name' => 'Tujuan Dinkes',
            'status' => 'active',
        ]);

        // Attempt create objective under goal B
        $this->actingAs($this->userOpdA)
            ->post(route('goals.objectives.store', $goalB), [
                'code' => 'SAS-DINKES-02',
                'name' => 'Sasaran Dinkes',
            ])
            ->assertForbidden();

        // Attempt update goal B
        $this->actingAs($this->userOpdA)
            ->put(route('goals.update', $goalB), [
                'code' => 'TUJ-DINKES-02-MOD',
                'name' => 'Tujuan Dinkes Mod',
            ])
            ->assertForbidden();

        // Attempt delete goal B
        $this->actingAs($this->userOpdA)
            ->delete(route('goals.destroy', $goalB))
            ->assertForbidden();
    }

    public function test_opd_cannot_create_or_mutate_target_for_another_opd(): void
    {
        $indicator = Indicator::create([
            'code' => 'IND-DINKES-03',
            'name' => 'Indikator Dinkes',
            'status' => 'active',
            'owner_organization_id' => $this->orgOpdB->id,
        ]);

        $version = IndicatorVersion::create([
            'indicator_id' => $indicator->id,
            'version_number' => 1,
            'name' => 'Indikator Dinkes',
            'type' => 'output',
            'direction' => 'higher_is_better',
            'measurement_unit_id' => $this->unit->id,
            'frequency' => 'quarterly',
        ]);

        // Attempt store target for OPD B
        $this->actingAs($this->userOpdA)
            ->post(route('targets.store'), [
                'indicator_version_id' => $version->id,
                'organization_id' => $this->orgOpdB->id,
                'planning_period_id' => $this->planningPeriod->id,
                'target_value' => 100,
            ])
            ->assertForbidden();

        $targetB = IndicatorTarget::create([
            'indicator_version_id' => $version->id,
            'organization_id' => $this->orgOpdB->id,
            'planning_period_id' => $this->planningPeriod->id,
            'target_value' => 80,
            'status' => 'draft',
        ]);

        // Attempt update target of OPD B
        $this->actingAs($this->userOpdA)
            ->put(route('targets.update', $targetB), [
                'target_value' => 90,
                'status' => 'approved',
            ])
            ->assertForbidden();
    }

    // =========================================================================
    // 9. SUPER ADMIN PROVINSI CAN ACCESS ACROSS OPDS
    // =========================================================================

    public function test_super_admin_can_manage_across_all_opds(): void
    {
        // Super Admin can create planning document for OPD B
        $this->actingAs($this->superAdmin)
            ->post(route('planning.documents.store'), [
                'organization_id' => $this->orgOpdB->id,
                'performance_period_id' => $this->performancePeriod->id,
                'type' => 'renstra',
                'title' => 'Renstra Dinkes oleh Super Admin',
                'year' => 2025,
                'periode_type' => 'tahunan',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('planning_documents', [
            'organization_id' => $this->orgOpdB->id,
            'title' => 'Renstra Dinkes oleh Super Admin',
        ]);

        // Super Admin can view OPD B's measurement pages
        $this->actingAs($this->superAdmin)
            ->get(route('measurement.realization.opd', ['organization_id' => $this->orgOpdB->id]))
            ->assertOk();
    }

    // =========================================================================
    // 10. REPORTING (LKIP Upload / Delete)
    // =========================================================================

    public function test_opd_cannot_upload_or_delete_lkip_for_another_opd_or_pemda(): void
    {
        $file = UploadedFile::fake()->create('lkip.pdf', 100, 'application/pdf');

        // OPD A tries to upload LKIP for Pemda
        $this->actingAs($this->userOpdA)
            ->post(route('reports.upload'), [
                'target_type' => 'pemda',
                'year' => 2025,
                'file' => $file,
            ])
            ->assertForbidden();

        // OPD A tries to upload LKIP for OPD B
        $this->actingAs($this->userOpdA)
            ->post(route('reports.upload'), [
                'target_type' => 'opd',
                'organization_id' => $this->orgOpdB->id,
                'year' => 2025,
                'file' => $file,
            ])
            ->assertForbidden();

        $docB = PlanningDocument::create([
            'organization_id' => $this->orgOpdB->id,
            'performance_period_id' => $this->performancePeriod->id,
            'code' => 'LKIP-OPD-B-2025',
            'type' => 'lkjip',
            'title' => 'LKIP Dinkes 2025',
            'year' => 2025,
            'periode_type' => 'tahunan',
            'status' => 'approved',
            'created_by' => $this->userOpdB->id,
        ]);

        // OPD A tries to delete LKIP of OPD B
        $this->actingAs($this->userOpdA)
            ->delete(route('reports.destroy', $docB->id))
            ->assertForbidden();
    }

    // =========================================================================
    // 11. IKU ISOLATION & PEMDA DATA PROTECTION
    // =========================================================================

    public function test_opd_cannot_create_pemda_iku(): void
    {
        $this->actingAs($this->userOpdA)
            ->post(route('planning.iku.store'), [
                'level' => 'pemda',
                'name' => 'IKU Pemda Ilegal',
                'planning_period_id' => $this->planningPeriod->id,
                'measurement_unit_id' => $this->unit->id,
                'definition' => 'Definisi',
                'polarization' => 'positif',
                'data_source' => 'BPS',
                'frequency' => 'annual',
            ])
            ->assertForbidden();
    }

    public function test_opd_cannot_edit_update_submit_or_delete_pemda_iku(): void
    {
        $ikuPemda = Indicator::create([
            'is_iku' => true,
            'code' => 'IKU-PEMDA-001',
            'name' => 'IKU Pemerintah Daerah',
            'level' => 'pemda',
            'owner_organization_id' => null,
            'planning_period_id' => $this->planningPeriod->id,
            'measurement_unit_id' => $this->unit->id,
            'definition' => 'Definisi IKU Pemda',
            'polarization' => 'positif',
            'data_source' => 'BPS',
            'frequency' => 'annual',
            'iku_status' => 'draft',
            'status' => 'draft',
        ]);

        // Attempt edit view
        $this->actingAs($this->userOpdA)
            ->get(route('planning.iku.edit', $ikuPemda))
            ->assertForbidden();

        // Attempt update
        $this->actingAs($this->userOpdA)
            ->put(route('planning.iku.update', $ikuPemda), [
                'name' => 'IKU Pemda Telah Diubah',
                'level' => 'pemda',
                'measurement_unit_id' => $this->unit->id,
                'polarization' => 'positif',
                'data_source' => 'BPS',
                'frequency' => 'annual',
            ])
            ->assertForbidden();

        // Attempt submit
        $this->actingAs($this->userOpdA)
            ->post(route('planning.iku.submit', $ikuPemda))
            ->assertForbidden();

        // Attempt delete
        $this->actingAs($this->userOpdA)
            ->delete(route('planning.iku.destroy', $ikuPemda))
            ->assertForbidden();
    }

    public function test_opd_cannot_edit_update_submit_or_delete_another_opds_iku(): void
    {
        $ikuOpdB = Indicator::create([
            'is_iku' => true,
            'code' => 'IKU-PD-DINKES-01',
            'name' => 'Cakupan Layanan Kesehatan Dinkes',
            'level' => 'perangkat_daerah',
            'owner_organization_id' => $this->orgOpdB->id,
            'planning_period_id' => $this->planningPeriod->id,
            'measurement_unit_id' => $this->unit->id,
            'definition' => 'Definisi IKU Dinkes',
            'polarization' => 'positif',
            'data_source' => 'Dinkes',
            'frequency' => 'annual',
            'iku_status' => 'draft',
            'status' => 'draft',
        ]);

        // Attempt edit view
        $this->actingAs($this->userOpdA)
            ->get(route('planning.iku.edit', $ikuOpdB))
            ->assertForbidden();

        // Attempt update
        $this->actingAs($this->userOpdA)
            ->put(route('planning.iku.update', $ikuOpdB), [
                'name' => 'IKU Dinkes Diacak Acak',
                'level' => 'perangkat_daerah',
                'measurement_unit_id' => $this->unit->id,
                'polarization' => 'positif',
                'data_source' => 'Dinkes',
                'frequency' => 'annual',
            ])
            ->assertForbidden();

        // Attempt submit
        $this->actingAs($this->userOpdA)
            ->post(route('planning.iku.submit', $ikuOpdB))
            ->assertForbidden();

        // Attempt delete
        $this->actingAs($this->userOpdA)
            ->delete(route('planning.iku.destroy', $ikuOpdB))
            ->assertForbidden();
    }

    public function test_opd_cannot_review_finalize_or_deactivate_any_iku(): void
    {
        $ikuOpdA = Indicator::create([
            'is_iku' => true,
            'code' => 'IKU-PD-DISDIK-01',
            'name' => 'Angka Partisipasi Murni',
            'level' => 'perangkat_daerah',
            'owner_organization_id' => $this->orgOpdA->id,
            'planning_period_id' => $this->planningPeriod->id,
            'measurement_unit_id' => $this->unit->id,
            'definition' => 'APM Pendidikan',
            'polarization' => 'positif',
            'data_source' => 'Disdik',
            'frequency' => 'annual',
            'iku_status' => 'diajukan',
            'status' => 'draft',
        ]);

        // Review attempt
        $this->actingAs($this->userOpdA)
            ->post(route('planning.iku.review', $ikuOpdA))
            ->assertForbidden();

        // Finalize attempt
        $this->actingAs($this->userOpdA)
            ->post(route('planning.iku.finalize', $ikuOpdA))
            ->assertForbidden();

        // Deactivate attempt
        $this->actingAs($this->userOpdA)
            ->post(route('planning.iku.deactivate', $ikuOpdA))
            ->assertForbidden();
    }

    public function test_bappeda_opd_user_cannot_bypass_isolation(): void
    {
        $bappedaOrg = Organization::create([
            'code' => 'BAPPEDA-TEST',
            'name' => 'Bappeda Papua Barat',
            'type' => 'opd',
            'is_bappeda' => true,
            'is_active' => true,
        ]);

        $adminOpdRole = Role::where('name', RoleEnum::AdminOpd->value)->firstOrFail();
        $userBappedaOpd = User::factory()->create();
        $userBappedaOpd->roles()->attach($adminOpdRole);
        $userBappedaOpd->organizations()->attach($bappedaOrg, ['is_default' => true]);

        $ikuPemda = Indicator::create([
            'is_iku' => true,
            'code' => 'IKU-PEMDA-BP',
            'name' => 'Pertumbuhan Ekonomi Pemda',
            'level' => 'pemda',
            'owner_organization_id' => null,
            'planning_period_id' => $this->planningPeriod->id,
            'measurement_unit_id' => $this->unit->id,
            'definition' => 'PDRB',
            'polarization' => 'positif',
            'data_source' => 'BPS',
            'frequency' => 'annual',
            'iku_status' => 'draft',
            'status' => 'draft',
        ]);

        // Even though user belongs to Bappeda org, role Admin OPD CANNOT edit Pemda IKU
        $this->actingAs($userBappedaOpd)
            ->get(route('planning.iku.edit', $ikuPemda))
            ->assertForbidden();

        // Admin OPD in Bappeda CANNOT review IKU
        $this->actingAs($userBappedaOpd)
            ->post(route('planning.iku.review', $ikuPemda))
            ->assertForbidden();

        // User in Bappeda CAN mutate 4.1 RPJMD Realization (as authorized pengampu)
        $this->actingAs($userBappedaOpd)
            ->post(route('measurement.realization.rpjmd.store'), [
                'mission' => 'M1',
                'goal' => 'G1',
                'unit' => '%',
                'measurement_pattern' => 'Positif',
            ])
            ->assertRedirect();

        // User in Bappeda CAN mutate 4.2 IKU Pemda Realization (as authorized pengampu)
        $this->actingAs($userBappedaOpd)
            ->post(route('measurement.realization.iku.store'), [
                'indicator_name' => 'Pertumbuhan Ekonomi Baru',
                'unit' => '%',
                'measurement_pattern' => 'Positif',
            ])
            ->assertRedirect();

        // But user in Bappeda CANNOT mutate other OPD's 4.3 Realization
        $this->actingAs($userBappedaOpd)
            ->post(route('measurement.realization.opd.store'), [
                'organization_id' => $this->orgOpdA->id,
                'goal' => 'Goal Opd A',
                'objective_indicator' => 'Indikator Opd A',
                'unit' => '%',
                'measurement_pattern' => 'Positif',
            ])
            ->assertForbidden();
    }

    // =========================================================================
    // 13. PLANNING LOCK & APPROVAL RESTRICTIONS
    // =========================================================================

    public function test_opd_cannot_lock_planning_document_or_agreement(): void
    {
        $docA = PlanningDocument::create([
            'organization_id' => $this->orgOpdA->id,
            'performance_period_id' => $this->performancePeriod->id,
            'code' => 'RENSTRA-DISDIK-2025',
            'type' => 'renstra',
            'title' => 'Renstra Disdik',
            'year' => 2025,
            'periode_type' => 'tahunan',
            'status' => 'approved',
            'created_by' => $this->userOpdA->id,
        ]);

        $agreementA = PerformanceAgreement::create([
            'organization_id' => $this->orgOpdA->id,
            'planning_period_id' => $this->planningPeriod->id,
            'code' => 'PK-DISDIK-2025',
            'title' => 'PK Disdik 2025',
            'status' => 'approved',
            'created_by' => $this->userOpdA->id,
        ]);

        // Attempt locking document
        $this->actingAs($this->userOpdA)
            ->post(route('planning.documents.lock', $docA))
            ->assertForbidden();

        // Attempt locking agreement
        $this->actingAs($this->userOpdA)
            ->post(route('planning.agreements.lock', $agreementA))
            ->assertForbidden();
    }

    // =========================================================================
    // 14. INDICATOR ISOLATION
    // =========================================================================

    public function test_opd_cannot_create_or_mutate_pemda_or_another_opd_indicator(): void
    {
        // OPD cannot create global/Pemda indicator (owner_organization_id = null or 1)
        $this->actingAs($this->userOpdA)
            ->post(route('indicators.store'), [
                'code' => 'IND-GLOBAL-01',
                'name' => 'Indikator Global',
                'type' => 'output',
                'direction' => 'higher_is_better',
                'frequency' => 'annual',
                'owner_organization_id' => null,
            ])
            ->assertForbidden();

        $this->actingAs($this->userOpdA)
            ->post(route('indicators.store'), [
                'code' => 'IND-PEMDA-01',
                'name' => 'Indikator Pemda',
                'type' => 'output',
                'direction' => 'higher_is_better',
                'frequency' => 'annual',
                'owner_organization_id' => 1,
            ])
            ->assertForbidden();

        // Create Pemda indicator (owner_organization_id = null)
        $pemdaInd = Indicator::create([
            'code' => 'IND-PEMDA-EXISTING',
            'name' => 'Indikator Pemda Existing',
            'status' => 'draft',
            'owner_organization_id' => null,
        ]);

        IndicatorVersion::create([
            'indicator_id' => $pemdaInd->id,
            'version_number' => 1,
            'name' => 'Indikator Pemda Existing',
            'type' => 'outcome',
            'direction' => 'higher_is_better',
            'measurement_unit_id' => $this->unit->id,
            'frequency' => 'annual',
        ]);

        // Attempt edit
        $this->actingAs($this->userOpdA)
            ->get(route('indicators.edit', $pemdaInd))
            ->assertForbidden();

        // Attempt update
        $this->actingAs($this->userOpdA)
            ->put(route('indicators.update', $pemdaInd), [
                'code' => 'IND-PEMDA-EXISTING',
                'name' => 'Indikator Pemda Hacked',
                'type' => 'outcome',
                'direction' => 'higher_is_better',
                'frequency' => 'annual',
            ])
            ->assertForbidden();

        // Attempt activate
        $this->actingAs($this->userOpdA)
            ->post(route('indicators.activate', $pemdaInd))
            ->assertForbidden();

        // Attempt archive
        $this->actingAs($this->userOpdA)
            ->post(route('indicators.archive', $pemdaInd))
            ->assertForbidden();
    }

    public function test_opd_cannot_send_acknowledge_or_resolve_revisions_for_other_opds(): void
    {
        $docB = PlanningDocument::create([
            'type' => 'renja',
            'title' => 'Renja Dinkes',
            'organization_id' => $this->orgOpdB->id,
            'year' => 2025,
            'status' => 'approved',
            'created_by' => $this->userOpdB->id,
        ]);

        // 1. OPD user cannot send revision note to docB (must be provincial admin/evaluator)
        $this->actingAs($this->userOpdA)
            ->post(route('planning.documents.revisions.store', $docB), [
                'note' => 'Perbaiki Renja ini segera demi keselarasan.',
            ])
            ->assertForbidden();

        // 2. Provincial admin creates revision note for docB
        $revision = DocumentRevision::create([
            'planning_document_id' => $docB->id,
            'note' => 'Catatan revisi dari Provinsi untuk Dinkes.',
            'status' => 'pending',
            'created_by' => $this->superAdmin->id,
        ]);

        // 3. User OPD A cannot acknowledge or resolve revision of docB
        $this->actingAs($this->userOpdA)
            ->patch(route('planning.revisions.acknowledge', $revision))
            ->assertForbidden();

        $this->actingAs($this->userOpdA)
            ->patch(route('planning.revisions.resolve', $revision))
            ->assertForbidden();
    }

    public function test_bappeda_opd_cannot_approve_planning_documents(): void
    {
        $orgBappeda = Organization::create([
            'code' => 'BAPPEDA-OPD',
            'name' => 'Bappeda OPD',
            'type' => 'bappeda',
            'is_bappeda' => true,
            'is_active' => true,
        ]);

        $userBappedaOpd = User::factory()->create();
        $userBappedaOpd->roles()->attach(Role::where('name', 'Admin OPD')->first());
        $userBappedaOpd->organizations()->attach($orgBappeda, ['is_default' => true]);

        $docA = PlanningDocument::create([
            'type' => 'renja',
            'title' => 'Renja Disdik',
            'organization_id' => $this->orgOpdA->id,
            'year' => 2025,
            'status' => 'review',
            'created_by' => $this->userOpdA->id,
        ]);

        // User in Bappeda org with Admin OPD role cannot approve document
        $this->actingAs($userBappedaOpd)
            ->post(route('planning.docs.approve', $docA))
            ->assertForbidden();
    }

    public function test_opd_cannot_acknowledge_or_resolve_alerts_of_other_opds(): void
    {
        $rule = AlertRule::create([
            'code' => 'TEST-RULE-01',
            'name' => 'Test Rule',
            'rule_type' => 'submission_overdue',
            'severity' => 'warning',
            'is_active' => true,
        ]);

        $alertB = Alert::create([
            'rule_id' => $rule->id,
            'alert_type' => 'submission_overdue',
            'organization_id' => $this->orgOpdB->id,
            'severity' => 'warning',
            'title' => 'Keterlambatan Dinkes',
            'message' => 'Belum input realisasi',
            'status' => 'active',
        ]);

        // OPD A cannot acknowledge alert of OPD B
        $this->actingAs($this->userOpdA)
            ->post(route('alerts.acknowledge', $alertB))
            ->assertForbidden();

        // OPD A cannot resolve alert of OPD B
        $this->actingAs($this->userOpdA)
            ->post(route('alerts.resolve', $alertB))
            ->assertForbidden();
    }

    public function test_opd_cannot_lock_targets_or_modify_locked_targets(): void
    {
        $indicator = Indicator::create([
            'code' => 'IND-DISDIK-TARGET',
            'name' => 'Indikator Disdik',
            'status' => 'active',
            'owner_organization_id' => $this->orgOpdA->id,
        ]);

        $version = IndicatorVersion::create([
            'indicator_id' => $indicator->id,
            'version_number' => 1,
            'name' => 'Indikator Disdik',
            'type' => 'output',
            'direction' => 'higher_is_better',
            'measurement_unit_id' => $this->unit->id,
            'frequency' => 'annual',
        ]);

        $target = IndicatorTarget::create([
            'indicator_version_id' => $version->id,
            'organization_id' => $this->orgOpdA->id,
            'planning_period_id' => $this->planningPeriod->id,
            'target_value' => 80,
            'status' => 'draft',
        ]);

        // 1. OPD A cannot set status => 'locked'
        $this->actingAs($this->userOpdA)
            ->put(route('targets.update', $target), [
                'target_value' => 85,
                'status' => 'locked',
            ])
            ->assertForbidden();

        // 2. Lock target as Super Admin
        $target->update(['status' => 'locked']);

        // 3. OPD A cannot modify target once locked
        $this->actingAs($this->userOpdA)
            ->put(route('targets.update', $target), [
                'target_value' => 90,
                'status' => 'draft',
            ])
            ->assertForbidden();
    }

    public function test_opd_cannot_view_evaluation_detail_of_another_opd(): void
    {
        $evalOpdB = Evaluation::create([
            'organization_id' => $this->orgOpdB->id,
            'planning_period_id' => $this->planningPeriod->id,
            'type' => 'annual',
            'code' => 'EVAL-DINKES-2025',
            'title' => 'Evaluasi Dinkes',
            'status' => 'approved',
        ]);

        $evalOpdA = Evaluation::create([
            'organization_id' => $this->orgOpdA->id,
            'planning_period_id' => $this->planningPeriod->id,
            'type' => 'annual',
            'code' => 'EVAL-DISDIK-2025',
            'title' => 'Evaluasi Disdik',
            'status' => 'approved',
        ]);

        $evalPemda = Evaluation::create([
            'organization_id' => $this->orgProv->id,
            'planning_period_id' => $this->planningPeriod->id,
            'type' => 'annual',
            'code' => 'EVAL-PEMDA-2025',
            'title' => 'Evaluasi Pemda',
            'status' => 'approved',
        ]);

        // 1. OPD A cannot view OPD B's evaluation
        $this->actingAs($this->userOpdA)
            ->get(route('evaluations.show', $evalOpdB))
            ->assertForbidden();

        // 2. OPD A can view their own evaluation
        $this->actingAs($this->userOpdA)
            ->get(route('evaluations.show', $evalOpdA))
            ->assertOk();

        // 3. OPD A can view Pemda evaluation
        $this->actingAs($this->userOpdA)
            ->get(route('evaluations.show', $evalPemda))
            ->assertOk();
    }

    public function test_opd_cannot_import_pemda_or_other_opd_iku(): void
    {
        $importService = app(IkuImportService::class);

        // Rows containing Pemda and other OPD IKU
        $rows = [
            [
                'name' => 'IKU Pemda Hacked',
                'level' => 'pemda',
                'owner_organization_id' => null,
                'planning_period_id' => $this->planningPeriod->id,
            ],
            [
                'name' => 'IKU Dinkes Hacked',
                'level' => 'perangkat_daerah',
                'owner_organization_id' => $this->orgOpdB->id,
                'planning_period_id' => $this->planningPeriod->id,
            ],
        ];

        // OPD A commits rows
        $imported = $importService->commit($rows, $this->userOpdA);

        // Zero rows imported
        $this->assertEquals(0, $imported);
        $this->assertDatabaseMissing('indicators', ['name' => 'IKU Pemda Hacked']);
        $this->assertDatabaseMissing('indicators', ['name' => 'IKU Dinkes Hacked']);

        // Check controller upload endpoint without permission
        $plainUser = User::factory()->create();
        $this->actingAs($plainUser)
            ->post(route('planning.iku.import.upload'))
            ->assertForbidden();

        $this->actingAs($plainUser)
            ->post(route('planning.iku.import.commit'))
            ->assertForbidden();
    }

    public function test_opd_notification_user_list_is_strictly_isolated_to_own_organization(): void
    {
        // Colleague in OPD A
        $colleagueOpdA = User::factory()->create(['name' => 'Staf Disdik A']);
        $colleagueOpdA->organizations()->attach($this->orgOpdA);

        // User in OPD B
        $colleagueOpdB = User::factory()->create(['name' => 'Staf Dinkes B']);
        $colleagueOpdB->organizations()->attach($this->orgOpdB);

        // When OPD A visits /notifications:
        $response = $this->actingAs($this->userOpdA)
            ->get(route('notifications.index'))
            ->assertOk();

        $response->assertInertia(function ($page) use ($colleagueOpdA, $colleagueOpdB) {
            $page->component('Notifications/Index');
            $users = collect($page->toArray()['props']['users']);
            $userIds = $users->pluck('id')->all();

            // Must include self and colleague in OPD A
            $this->assertContains($this->userOpdA->id, $userIds);
            $this->assertContains($colleagueOpdA->id, $userIds);

            // Must NOT include user from OPD B or Super Admin
            $this->assertNotContains($this->userOpdB->id, $userIds);
            $this->assertNotContains($colleagueOpdB->id, $userIds);
            $this->assertNotContains($this->superAdmin->id, $userIds);
        });

        // When Super Admin visits /notifications:
        $adminResponse = $this->actingAs($this->superAdmin)
            ->get(route('notifications.index'))
            ->assertOk();

        $adminResponse->assertInertia(function ($page) use ($colleagueOpdA, $colleagueOpdB) {
            $users = collect($page->toArray()['props']['users']);
            $userIds = $users->pluck('id')->all();

            // Super Admin sees users across all organizations
            $this->assertContains($this->userOpdA->id, $userIds);
            $this->assertContains($this->userOpdB->id, $userIds);
            $this->assertContains($colleagueOpdA->id, $userIds);
            $this->assertContains($colleagueOpdB->id, $userIds);
            $this->assertContains($this->superAdmin->id, $userIds);
        });
    }

    public function test_opd_cannot_send_notification_to_user_outside_organization(): void
    {
        $colleagueOpdA = User::factory()->create(['name' => 'Rekan Disdik A']);
        $colleagueOpdA->organizations()->attach($this->orgOpdA);

        // 1. OPD A tries to send notification to user in OPD B -> 403 Forbidden
        $this->actingAs($this->userOpdA)
            ->post(route('notifications.send'), [
                'user_id' => $this->userOpdB->id,
                'title' => 'Pesona Lintas OPD',
                'message' => 'Mencoba mengirim notifikasi ke OPD lain',
                'event' => 'announcement',
            ])
            ->assertForbidden();

        $this->assertDatabaseMissing('notifications', [
            'user_id' => $this->userOpdB->id,
            'title' => 'Pesona Lintas OPD',
        ]);

        // 2. OPD A tries to send notification to Super Admin -> 403 Forbidden
        $this->actingAs($this->userOpdA)
            ->post(route('notifications.send'), [
                'user_id' => $this->superAdmin->id,
                'title' => 'Pesona ke Super Admin',
                'message' => 'Mencoba mengirim notifikasi ke Provinsi',
                'event' => 'announcement',
            ])
            ->assertForbidden();

        // 3. OPD A sends notification to colleague in same OPD -> Allowed (302)
        $this->actingAs($this->userOpdA)
            ->post(route('notifications.send'), [
                'user_id' => $colleagueOpdA->id,
                'title' => 'Internal Disdik',
                'message' => 'Halo rekan satu OPD',
                'event' => 'announcement',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('notifications', [
            'user_id' => $colleagueOpdA->id,
            'title' => 'Internal Disdik',
        ]);

        // 4. Super Admin can send notification to anyone in any OPD
        $this->actingAs($this->superAdmin)
            ->post(route('notifications.send'), [
                'user_id' => $this->userOpdA->id,
                'title' => 'Surat Edaran Provinsi',
                'message' => 'Dari Super Admin ke OPD A',
                'event' => 'announcement',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('notifications', [
            'user_id' => $this->userOpdA->id,
            'title' => 'Surat Edaran Provinsi',
        ]);
    }
}
