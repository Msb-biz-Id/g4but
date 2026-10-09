<?php

namespace Tests\Feature;

use App\Enums\Role as RoleEnum;
use App\Models\Organization;
use App\Models\Role;
use App\Models\User;
use App\Services\PerformanceMeasurementService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
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

    public function test_opd_realization_filter_maintains_selected_opd(): void
    {
        $this->actingAs($this->superAdmin);

        $opd = Organization::where('type', 'opd')->first()
            ?? Organization::create([
                'name' => 'Dinas Pendidikan Test',
                'code' => 'DISDIK-TEST',
                'type' => 'opd',
                'is_active' => true,
            ]);

        $response = $this->get(route('measurement.realization.opd', [
            'organization_id' => $opd->id,
        ]));

        $response->assertStatus(200);
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Measurement/RealizationOpd')
            ->where('selectedOrgId', $opd->id)
        );
    }

    public function test_opd_realization_filter_handles_array_serialized_organization_id(): void
    {
        $this->actingAs($this->superAdmin);

        $opd = Organization::where('type', 'opd')->first();

        $response = $this->get(route('measurement.realization.opd', [
            'organization_id' => [
                '0' => (string) $opd->id,
                'target' => ['value' => (string) $opd->id],
            ],
        ]));

        $response->assertStatus(200);
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Measurement/RealizationOpd')
            ->where('selectedOrgId', $opd->id)
        );
    }
}
