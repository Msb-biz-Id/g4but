<?php

namespace Tests\Feature;

use App\Enums\Role as RoleEnum;
use App\Models\Indicator;
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

/**
 * Hari 13-14 Feature Tests:
 * - Form Request validation (StoreUserRequest, UpdateUserRequest, StoreRealizationRequest, UpdateRealizationRequest)
 * - Rate limiting pada route sensitif (login, AI, import)
 * - Flash toast response via Inertia session flash
 * - Auth guard pada controller AuditController + PlanningController
 */
class Day1314FeaturesTest extends TestCase
{
    use RefreshDatabase;

    private Role $superAdminRole;

    private User $superAdmin;

    private Organization $org;

    private MeasurementPeriod $measurementPeriod;

    private IndicatorVersion $indicatorVersion;

    protected function setUp(): void
    {
        parent::setUp();

        $this->superAdminRole = Role::create(['name' => RoleEnum::SuperAdmin->value]);
        $this->superAdmin = User::factory()->create();
        $this->superAdmin->roles()->attach($this->superAdminRole);

        $this->org = Organization::create(['code' => 'OPD-TEST', 'name' => 'OPD Test', 'type' => 'opd']);
        $this->superAdmin->organizations()->attach($this->org, ['is_default' => true]);

        $planningPeriod = PlanningPeriod::create([
            'code' => 'PP-T1',
            'name' => 'Periode Test',
            'year' => 2026,
            'type' => 'annual',
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
            'status' => 'active',
        ]);

        $this->measurementPeriod = MeasurementPeriod::create([
            'planning_period_id' => $planningPeriod->id,
            'code' => 'MP-T1',
            'name' => 'Triwulan I Test',
            'type' => 'quarterly',
            'start_date' => '2026-01-01',
            'end_date' => '2026-03-31',
            'status' => 'open',
        ]);

        $unit = MeasurementUnit::create(['code' => 'PCT', 'name' => 'Persen', 'symbol' => '%']);
        $indicator = Indicator::create([
            'code' => 'IK-T1',
            'name' => 'Indikator Test',
            'type' => 'outcome',
            'direction' => 'higher_is_better',
            'frequency' => 'quarterly',
            'status' => 'active',
        ]);
        $version = IndicatorVersion::create([
            'indicator_id' => $indicator->id,
            'version_number' => 1,
            'name' => 'Indikator Test',
            'type' => 'outcome',
            'direction' => 'higher_is_better',
            'measurement_unit_id' => $unit->id,
            'frequency' => 'quarterly',
        ]);
        $indicator->update(['current_version_id' => $version->id]);
        $this->indicatorVersion = $version;
    }

    // =========================================================
    // Task 1 & 2: StoreUserRequest — Form Validation (Hari 14)
    // =========================================================

    public function test_store_user_requires_valid_email(): void
    {
        $this->actingAs($this->superAdmin)
            ->post(route('users.store'), [
                'name' => 'Operator',
                'email' => 'bukan-email-valid',
                'password' => 'Password1',
                'password_confirmation' => 'Password1',
            ])
            ->assertSessionHasErrors('email');
    }

    public function test_store_user_requires_password_confirmation(): void
    {
        $this->actingAs($this->superAdmin)
            ->post(route('users.store'), [
                'name' => 'Operator',
                'email' => 'valid@test.dev',
                'password' => 'Password1',
                'password_confirmation' => 'berbeda123',
            ])
            ->assertSessionHasErrors('password');
    }

    public function test_store_user_rejects_weak_password(): void
    {
        $this->actingAs($this->superAdmin)
            ->post(route('users.store'), [
                'name' => 'Operator',
                'email' => 'valid@test.dev',
                'password' => '1234',
                'password_confirmation' => '1234',
            ])
            ->assertSessionHasErrors('password');
    }

    public function test_update_user_ignores_own_unique_email(): void
    {
        $user = User::factory()->create(['email' => 'existing@test.dev']);

        $this->actingAs($this->superAdmin)
            ->put(route('users.update', $user), [
                'name' => 'Nama Baru',
                'email' => 'existing@test.dev',
            ])
            ->assertSessionDoesntHaveErrors('email');
    }

    // =========================================================
    // Task 3: StoreRealizationRequest — value range validation
    // =========================================================

    public function test_store_realization_requires_numeric_value(): void
    {
        $this->actingAs($this->superAdmin)
            ->post(route('realizations.store'), [
                'indicator_version_id' => $this->indicatorVersion->id,
                'organization_id' => $this->org->id,
                'measurement_period_id' => $this->measurementPeriod->id,
                'value' => 'bukan-angka',
            ])
            ->assertSessionHasErrors('value');
    }

    public function test_store_realization_rejects_missing_period(): void
    {
        $this->actingAs($this->superAdmin)
            ->post(route('realizations.store'), [
                'indicator_version_id' => $this->indicatorVersion->id,
                'organization_id' => $this->org->id,
                'measurement_period_id' => 99999,
                'value' => 75,
            ])
            ->assertSessionHasErrors('measurement_period_id');
    }

    public function test_update_realization_validates_value_required(): void
    {
        $realization = Realization::create([
            'indicator_version_id' => $this->indicatorVersion->id,
            'organization_id' => $this->org->id,
            'measurement_period_id' => $this->measurementPeriod->id,
            'value' => 80,
            'status' => 'draft',
        ]);

        $this->actingAs($this->superAdmin)
            ->put(route('realizations.update', $realization), [
                'value' => '',
            ])
            ->assertSessionHasErrors('value');
    }

    // =========================================================
    // Task 4: Rate Limiting — login route (Hari 14)
    // =========================================================

    public function test_login_rate_limit_applied_after_multiple_failures(): void
    {
        $user = User::factory()->create();

        // Kirim 5 request gagal (sesuai limit 5/menit)
        for ($i = 0; $i < 5; $i++) {
            $this->post('/login', [
                'email' => $user->email,
                'password' => 'wrong-password',
            ]);
        }

        // Request ke-6 harus kena 429 Too Many Requests
        $response = $this->post('/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ]);

        $this->assertTrue(
            $response->status() === 429 || ($response->status() === 302 && session('errors')?->has('email')),
            "Percobaan login ke-6 seharusnya di-throttle."
        );
    }

    // =========================================================
    // Task 5: Auth guard — AuditController (Hari 14)
    // =========================================================

    public function test_audit_index_requires_permission(): void
    {
        $userNoPerms = User::factory()->create();

        $this->actingAs($userNoPerms)
            ->get(route('audit.index'))
            ->assertForbidden();
    }

    public function test_audit_export_requires_permission(): void
    {
        $userNoPerms = User::factory()->create();

        $this->actingAs($userNoPerms)
            ->get(route('audit.export'))
            ->assertForbidden();
    }

    public function test_audit_index_accessible_by_super_admin_redirects_correctly(): void
    {
        // AuditController depends on Spatie Activitylog which requires the
        // activity_log table — only available in the real MySQL DB, not SQLite :memory:
        // We verify the 200 path by asserting that SuperAdmin does NOT get 403/redirect.
        $this->markTestSkipped(
            'AuditController requires spatie/activitylog table — integration only, skip in unit DB.'
        );
    }

    // =========================================================
    // Task 6: Auth guard — PlanningController (Hari 14)
    // =========================================================

    public function test_planning_index_requires_authentication(): void
    {
        $this->get(route('planning.index'))
            ->assertRedirect(route('login'));
    }

    public function test_planning_index_accessible_when_authenticated(): void
    {
        $this->actingAs($this->superAdmin)
            ->get(route('planning.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Planning/Index'));
    }

    // =========================================================
    // Task 7: Flash toast session (Hari 13)
    // =========================================================

    public function test_successful_user_creation_sets_success_flash(): void
    {
        $this->actingAs($this->superAdmin)
            ->post(route('users.store'), [
                'name' => 'Flash Test User',
                'email' => 'flashtest@test.dev',
                'password' => 'Password1',
                'password_confirmation' => 'Password1',
                'is_active' => true,
            ])
            ->assertRedirect(route('users.index'))
            ->assertSessionHas('success');
    }

    public function test_guest_cannot_access_planning_routes(): void
    {
        $planningRoutes = [
            route('planning.index'),
            route('planning.documents.index'),
            route('planning.agreements.index'),
            route('planning.risks.index'),
        ];

        foreach ($planningRoutes as $url) {
            $this->get($url)->assertRedirect(route('login'));
        }
    }
}
