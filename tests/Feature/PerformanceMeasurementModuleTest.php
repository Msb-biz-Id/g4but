<?php

namespace Tests\Feature;

use App\Enums\Role as RoleEnum;
use App\Models\MonitoringActionPlanBudget;
use App\Models\MonitoringActionPlanOutput;
use App\Models\Organization;
use App\Models\RealizationIkuItem;
use App\Models\RealizationOpdItem;
use App\Models\RealizationRpjmdItem;
use App\Models\Role;
use App\Models\User;
use App\Services\PerformanceMeasurementService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PerformanceMeasurementModuleTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;
    private Organization $organization;

    protected function setUp(): void
    {
        parent::setUp();

        $superAdminRole = Role::create(['name' => RoleEnum::SuperAdmin->value]);
        $this->superAdmin = User::factory()->create();
        $this->superAdmin->roles()->attach($superAdminRole);

        $this->organization = Organization::create([
            'code' => 'OPD-PU',
            'name' => 'Dinas Pekerjaan Umum',
            'type' => 'opd',
        ]);
    }

    public function test_achievement_calculation_positive_pattern(): void
    {
        // Target 1000, Realisasi 1000 -> 100%
        $capaian = PerformanceMeasurementService::calculateAchievement(1000.0, 1000.0, 'Positif');
        $this->assertEquals(100.0, $capaian);
        $status = PerformanceMeasurementService::determineStatus($capaian, 1000.0, 1000.0);
        $this->assertEquals('Tercapai', $status['status']);

        // Target 1000, Realisasi 750 -> 75%
        $capaian2 = PerformanceMeasurementService::calculateAchievement(1000.0, 750.0, 'Positif');
        $this->assertEquals(75.0, $capaian2);
        $status2 = PerformanceMeasurementService::determineStatus($capaian2, 1000.0, 750.0);
        $this->assertEquals('Perlu Perhatian', $status2['status']);

        // Target 1000, Realisasi 250 -> 25%
        $capaian3 = PerformanceMeasurementService::calculateAchievement(1000.0, 250.0, 'Positif');
        $this->assertEquals(25.0, $capaian3);
        $status3 = PerformanceMeasurementService::determineStatus($capaian3, 1000.0, 250.0);
        $this->assertEquals('Kritis', $status3['status']);
    }

    public function test_achievement_calculation_negative_pattern(): void
    {
        // Pola Negatif (Stunting/Kemiskinan): (2 - (Realisasi/Target)) * 100%
        // Target 10%, Realisasi 8% -> (2 - 0.8) * 100 = 120%
        $capaian = PerformanceMeasurementService::calculateAchievement(10.0, 8.0, 'Negatif');
        $this->assertEquals(120.0, $capaian);
        $status = PerformanceMeasurementService::determineStatus($capaian, 10.0, 8.0);
        $this->assertEquals('Tercapai', $status['status']);

        // Target 10%, Realisasi 12% -> (2 - 1.2) * 100 = 80%
        $capaian2 = PerformanceMeasurementService::calculateAchievement(10.0, 12.0, 'Negatif');
        $this->assertEquals(80.0, $capaian2);
        $status2 = PerformanceMeasurementService::determineStatus($capaian2, 10.0, 12.0);
        $this->assertEquals('Perlu Perhatian', $status2['status']);
    }

    public function test_achievement_calculation_zero_zero_is_tidak_dinilai(): void
    {
        // Target = 0 dan Realisasi = 0 -> Tidak Dinilai
        $capaian = PerformanceMeasurementService::calculateAchievement(0.0, 0.0, 'Positif');
        $this->assertNull($capaian);
        $status = PerformanceMeasurementService::determineStatus($capaian, 0.0, 0.0);
        $this->assertEquals('Tidak Dinilai', $status['status']);
    }

    public function test_super_admin_can_access_all_measurement_submodules(): void
    {
        $this->actingAs($this->superAdmin);

        // 4.1 RPJMD
        $res41 = $this->get(route('measurement.realization.rpjmd'));
        $res41->assertStatus(200);

        // 4.2 IKU
        $res42 = $this->get(route('measurement.realization.iku'));
        $res42->assertStatus(200);

        // 4.3 OPD
        $res43 = $this->get(route('measurement.realization.opd'));
        $res43->assertStatus(200);

        // 4.4 Fisik / Output
        $res44 = $this->get(route('measurement.monitoring.output'));
        $res44->assertStatus(200);

        // 4.5 Anggaran
        $res45 = $this->get(route('measurement.monitoring.budget'));
        $res45->assertStatus(200);
    }

    public function test_opd_user_cannot_store_rpjmd_or_iku(): void
    {
        $user = User::factory()->create();
        $user->organizations()->attach($this->organization->id);

        $this->actingAs($user);

        // Attempt store RPJMD (4.1)
        $res1 = $this->post(route('measurement.realization.rpjmd.store'), [
            'mission' => 'Test',
            'goal' => 'Test Goal',
            'measurement_pattern' => 'Positif',
        ]);
        $res1->assertStatus(403);

        // Attempt store IKU (4.2)
        $res2 = $this->post(route('measurement.realization.iku.store'), [
            'indicator_name' => 'Test IKU',
            'measurement_pattern' => 'Positif',
        ]);
        $res2->assertStatus(403);
    }

    public function test_opd_user_can_store_and_update_their_own_pd_monitoring(): void
    {
        $user = User::factory()->create();
        $user->organizations()->attach($this->organization->id);

        $this->actingAs($user);

        // 4.3 Realisasi OPD
        $resOpd = $this->post(route('measurement.realization.opd.store'), [
            'organization_id' => $this->organization->id,
            'goal' => 'Goal OPD Test',
            'objective' => 'Objective OPD Test',
            'measurement_pattern' => 'Positif',
            'targets' => ['2025' => 100, '2026' => 200],
            'realizations' => ['2025' => 100, '2026' => 180],
        ]);
        $resOpd->assertRedirect();
        $this->assertDatabaseHas('realization_opd_items', [
            'organization_id' => $this->organization->id,
            'goal' => 'Goal OPD Test',
        ]);

        // 4.4 Monitoring Fisik / Output
        $resOut = $this->post(route('measurement.monitoring.output.store'), [
            'organization_id' => $this->organization->id,
            'year' => 2026,
            'program' => 'Program Test',
            'kegiatan' => 'Kegiatan Test',
            'subkegiatan' => 'Subkegiatan Test',
            'measurement_pattern' => 'Positif',
            'target_output_tahunan' => 1000,
            'target_tw1' => 0,
            'target_tw2' => 250,
            'target_tw3' => 700,
            'target_tw4' => 1000,
            'realisasi_tw1' => 0,
            'realisasi_tw2' => 250,
            'realisasi_tw3' => 680,
            'realisasi_tw4' => 1000,
            'person_in_charge' => 'Bidang Pengampu Test',
        ]);
        $resOut->assertRedirect();
        $this->assertDatabaseHas('monitoring_action_plan_outputs', [
            'organization_id' => $this->organization->id,
            'subkegiatan' => 'Subkegiatan Test',
        ]);

        // 4.5 Monitoring Anggaran
        $resBud = $this->post(route('measurement.monitoring.budget.store'), [
            'organization_id' => $this->organization->id,
            'year' => 2026,
            'subkegiatan' => 'Subkegiatan Anggaran Test',
            'pagu_tahunan' => 1000000000,
            'pagu_tw4' => 1000000000,
            'realisasi_tw4' => 1000000000,
            'penanggung_jawab_utama' => 'Bidang Utama',
            'pengampu_teknis' => 'Seksi Teknis',
        ]);
        $resBud->assertRedirect();
        $this->assertDatabaseHas('monitoring_action_plan_budgets', [
            'organization_id' => $this->organization->id,
            'subkegiatan' => 'Subkegiatan Anggaran Test',
        ]);
    }

    public function test_rpjmd_years_dynamically_follow_admin_planning_period(): void
    {
        // Create an active RPJMD planning period for 2030 - 2035
        \App\Models\PlanningPeriod::create([
            'code' => 'RPJMD-2030-2035',
            'name' => 'Periode RPJMD 2030-2035',
            'year' => 2030,
            'type' => 'rpjmd',
            'start_date' => '2030-01-01',
            'end_date' => '2035-12-31',
            'status' => 'active',
        ]);

        $this->actingAs($this->superAdmin);

        $response = $this->get(route('measurement.realization.rpjmd'));
        $response->assertStatus(200);
        $response->assertInertia(fn (\Inertia\Testing\AssertableInertia $page) => $page
            ->component('Measurement/RealizationRpjmd')
            ->has('years', 6)
            ->where('years', [2030, 2031, 2032, 2033, 2034, 2035])
            ->has('activeRpjmdPeriod')
            ->where('activeRpjmdPeriod.code', 'RPJMD-2030-2035')
        );
    }

    public function test_iku_final_realization_can_be_saved_and_calculated(): void
    {
        $period = \App\Models\PlanningPeriod::create([
            'code' => 'RPJMD-2025-2029',
            'name' => 'RPJMD 2025-2029',
            'year' => 2025,
            'type' => 'rpjmd',
            'start_date' => '2025-01-01',
            'end_date' => '2029-12-31',
            'status' => 'active',
        ]);

        $this->actingAs($this->superAdmin);

        // Store Realization via 4.2 store
        $res = $this->post(route('measurement.realization.iku.store'), [
            'indicator_name' => 'Indeks Pembangunan Manusia',
            'unit' => 'Poin',
            'measurement_pattern' => 'Positif',
            'targets' => ['2025' => 80.0],
            'realizations' => ['2025' => 88.0],
        ]);
        $res->assertRedirect();

        // Verify saved in realization_iku_items
        $realization = \App\Models\RealizationIkuItem::where('indicator_name', 'Indeks Pembangunan Manusia')->first();
        $this->assertNotNull($realization);
        $this->assertEquals(88.0, (float) $realization->realizations['2025']);

        // Index returns the item with calculated year data
        $indexRes = $this->get(route('measurement.realization.iku'));
        $indexRes->assertStatus(200);
        $indexRes->assertInertia(fn (\Inertia\Testing\AssertableInertia $page) => $page
            ->component('Measurement/RealizationIku')
            ->has('items', 1)
            ->where('items.0.indicator_name', 'Indeks Pembangunan Manusia')
            ->where('items.0.calculations.2025.realization', 88)
            ->where('items.0.calculations.2025.achievement', 110)
        );
    }

    public function test_opd_realization_filter_maintains_selected_opd(): void
    {
        $this->actingAs($this->superAdmin);

        $opd = \App\Models\Organization::where('type', 'opd')->first()
            ?? \App\Models\Organization::create([
                'name' => 'Dinas Pendidikan Test',
                'code' => 'DISDIK-TEST',
                'type' => 'opd',
                'is_active' => true,
            ]);

        $response = $this->get(route('measurement.realization.opd', [
            'organization_id' => $opd->id,
        ]));

        $response->assertStatus(200);
        $response->assertInertia(fn (\Inertia\Testing\AssertableInertia $page) => $page
            ->component('Measurement/RealizationOpd')
            ->where('selectedOrgId', $opd->id)
        );
    }

    public function test_opd_realization_filter_handles_array_serialized_organization_id(): void
    {
        $this->actingAs($this->superAdmin);

        $opd = \App\Models\Organization::where('type', 'opd')->first();

        $response = $this->get(route('measurement.realization.opd', [
            'organization_id' => [
                '0' => (string) $opd->id,
                'target' => ['value' => (string) $opd->id],
            ],
        ]));

        $response->assertStatus(200);
        $response->assertInertia(fn (\Inertia\Testing\AssertableInertia $page) => $page
            ->component('Measurement/RealizationOpd')
            ->where('selectedOrgId', $opd->id)
        );
    }

    public function test_rpjmd_export_pdf_displays_calculated_achievements_and_statuses(): void
    {
        $goal = \App\Models\RealizationRpjmdItem::create([
            'mission' => 'Misi 1',
            'level' => 'goal',
            'parent_id' => null,
            'goal' => 'Tujuan RPJMD 1',
            'goal_indicators' => [
                ['indicator' => 'Indikator Tujuan RPJMD', 'unit' => '%', 'measurement_pattern' => 'Positif', 'targets' => [2026 => 100], 'realizations' => [2026 => 80]],
            ],
            'created_by' => $this->superAdmin->id,
        ]);

        $child = \App\Models\RealizationRpjmdItem::create([
            'mission' => 'Misi 1',
            'level' => 'objective',
            'parent_id' => $goal->id,
            'order_no' => 1,
            'goal' => $goal->goal,
            'objective' => 'Sasaran RPJMD 1',
            'indicators' => [
                ['indicator' => 'Indikator Sasaran RPJMD 1', 'unit' => '%', 'measurement_pattern' => 'Positif', 'targets' => [2026 => 100], 'realizations' => [2026 => 0]],
                ['indicator' => 'Indikator Sasaran RPJMD 2', 'unit' => '%', 'measurement_pattern' => 'Positif', 'targets' => [2026 => 600], 'realizations' => [2026 => 300]],
            ],
            'created_by' => $this->superAdmin->id,
        ]);

        $this->actingAs($this->superAdmin);

        $response = $this->get(route('measurement.realization.rpjmd.export-pdf', [
            'year' => 2026,
        ]));

        $response->assertOk();
        $this->assertEquals('application/pdf', $response->headers->get('content-type'));
        $this->assertNotEmpty($response->getContent());

        $child->refresh();
        $this->assertCount(2, $child->objective_indicators_list);

        $years = [2025, 2026, 2027, 2028, 2029];
        $goal->setRelation('children', collect([$child]));
        $viewHtml = view('pdf.measurement-rpjmd', [
            'goals' => collect([$goal]),
            'items' => [$goal, $child],
            'currentYear' => 2026,
            'stats' => [
                'total' => 2, 'tercapai' => 0, 'perhatian' => 1, 'kritis' => 1, 'tidak_dinilai' => 0, 'avg' => 25.0,
            ],
            'years' => $years,
            'generatedAt' => '08/10/2026 01:00',
        ])->render();

        $this->assertStringContainsString('0,0%', $viewHtml);
        $this->assertStringContainsString('50,0%', $viewHtml);
        $this->assertStringContainsString('status-kritis">Kritis</span>', $viewHtml);
        $this->assertStringContainsString('status-perhatian">Perhatian</span>', $viewHtml);
    }
}
