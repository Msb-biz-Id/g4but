<?php

namespace Tests\Feature;

use App\Enums\Role as RoleEnum;
use App\Models\AiInsight;
use App\Models\AiPromptTemplate;
use App\Models\AiRequest;
use App\Models\AiUseLog;
use App\Models\Indicator;
use App\Models\IndicatorTarget;
use App\Models\IndicatorVersion;
use App\Models\MeasurementPeriod;
use App\Models\MeasurementUnit;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\PlanningPeriod;
use App\Models\Realization;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AiTest extends TestCase
{
    use RefreshDatabase;

    private Role $superAdminRole;

    private User $superAdmin;

    protected function setUp(): void
    {
        parent::setUp();

        // Override provider ke 'mock' agar test deterministik dan tidak hit API nyata.
        // Test integrasi OpenRouter dijalankan secara manual/terpisah.
        config(['ekasuari.ai.provider' => 'mock']);

        $this->superAdminRole = Role::create(['name' => RoleEnum::SuperAdmin->value]);
        $this->superAdmin = User::factory()->create();
        $this->superAdmin->roles()->attach($this->superAdminRole);
    }

    private function seedData(): void
    {
        $organization = Organization::create(['code' => 'OPD-AI', 'name' => 'OPD AI', 'type' => 'opd']);

        $planningPeriod = PlanningPeriod::create([
            'code' => 'PP-AI-2026',
            'name' => 'Periode 2026',
            'year' => 2026,
            'type' => 'annual',
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
            'status' => 'active',
        ]);

        $measurementPeriod = MeasurementPeriod::create([
            'planning_period_id' => $planningPeriod->id,
            'code' => 'MP-AI-Q1',
            'name' => 'Triwulan I 2026',
            'type' => 'quarterly',
            'start_date' => '2026-01-01',
            'end_date' => '2026-03-31',
            'status' => 'open',
        ]);

        $unit = MeasurementUnit::create(['code' => 'PCT', 'name' => 'Persen', 'symbol' => '%']);

        $indicator = Indicator::create([
            'code' => 'IKU-AI-1',
            'name' => 'Indikator AI',
            'type' => 'outcome',
            'direction' => 'higher_is_better',
            'measurement_unit_id' => $unit->id,
            'frequency' => 'quarterly',
            'is_iku' => true,
            'status' => 'active',
        ]);

        $version = IndicatorVersion::create([
            'indicator_id' => $indicator->id,
            'version_number' => 1,
            'name' => 'Indikator AI',
            'type' => 'outcome',
            'direction' => 'higher_is_better',
            'measurement_unit_id' => $unit->id,
            'frequency' => 'quarterly',
        ]);

        $indicator->update(['current_version_id' => $version->id]);

        IndicatorTarget::create([
            'indicator_version_id' => $version->id,
            'organization_id' => $organization->id,
            'planning_period_id' => $planningPeriod->id,
            'target_value' => 80,
            'status' => 'approved',
        ]);

        Realization::create([
            'indicator_version_id' => $version->id,
            'organization_id' => $organization->id,
            'measurement_period_id' => $measurementPeriod->id,
            'value' => 50,
            'status' => 'approved',
        ]);
    }

    public function test_ai_index_page_is_accessible(): void
    {
        $response = $this->actingAs($this->superAdmin)
            ->get(route('ai.index'))
            ->assertOk();

        $response->assertInertia(fn ($page) => $page
            ->component('Ai/Index')
            ->has('periods')
            ->has('logs'));
    }

    public function test_executive_summary_generates_rule_based_output_and_logs_usage(): void
    {
        $this->seedData();

        $this->actingAs($this->superAdmin)
            ->post(route('ai.executive-summary'))
            ->assertRedirect()
            ->assertSessionHas('ai_result');

        $result = session('ai_result');
        $this->assertSame('mock', $result['provider']);
        $this->assertSame('success', $result['status']);

        // Output sekarang berformat JSON (BR-AI-007): cek field output_parsed
        $this->assertNotNull($result['output_parsed'], 'output_parsed harus terisi dari JSON response MockAiProvider');
        $this->assertArrayHasKey('ringkasan', $result['output_parsed']);
        $this->assertArrayHasKey('perhatian', $result['output_parsed']);
        $this->assertArrayHasKey('rekomendasi', $result['output_parsed']);

        // Ringkasan harus mengandung informasi capaian
        $this->assertStringContainsString('62.50%', $result['output_parsed']['ringkasan']);
        // Label AI-generated content tetap ada di output
        $this->assertStringContainsString('Sumber: analisis otomatis e-KASUARI', $result['output']);

        $log = AiUseLog::query()->latest('id')->firstOrFail();
        $this->assertSame('executive_summary', $log->feature);
        $this->assertSame($this->superAdmin->id, $log->user_id);
        $this->assertStringContainsString('tmpl-executive_summary', (string) $log->prompt_template);
    }


    public function test_prompt_template_is_created_and_versioned(): void
    {
        $this->seedData();

        $this->actingAs($this->superAdmin)
            ->post(route('ai.executive-summary'))
            ->assertRedirect();

        $this->assertDatabaseHas('ai_prompt_templates', [
            'code' => 'tmpl-executive_summary',
            'version' => 1,
            'is_active' => true,
        ]);
    }

    public function test_user_without_permission_cannot_access_ai(): void
    {
        $regular = User::factory()->create();

        $this->actingAs($regular)
            ->get(route('ai.index'))
            ->assertForbidden();
    }

    public function test_insight_generates_trend_output(): void
    {
        $this->seedData();

        $response = $this->actingAs($this->superAdmin)
            ->post(route('ai.insight'))
            ->assertRedirect()
            ->assertSessionHas('ai_result');

        $result = session('ai_result');
        $this->assertStringContainsString('Indikator AI', $result['output']);
        $this->assertSame('insight', AiUseLog::query()->latest('id')->firstOrFail()->feature);
    }

    public function test_recommendation_generates_advisory_output(): void
    {
        $this->seedData();

        $this->actingAs($this->superAdmin)
            ->post(route('ai.recommendation'))
            ->assertRedirect()
            ->assertSessionHas('ai_result');

        $result = session('ai_result');
        $this->assertStringContainsString('Rekomendasi', $result['output']);
    }

    public function test_chat_answers_achievement_question_from_accessible_data(): void
    {
        $this->seedData();

        $response = $this->actingAs($this->superAdmin)
            ->post(route('ai.chat'), ['message' => 'Bagaimana capaian kita?'])
            ->assertRedirect()
            ->assertSessionHas('ai_result');

        $result = session('ai_result');
        $this->assertStringContainsString('Rata-rata capaian', $result['output']);
    }

    public function test_chat_answers_indicator_code_lookup(): void
    {
        $this->seedData();

        $response = $this->actingAs($this->superAdmin)
            ->post(route('ai.chat'), ['message' => 'Info IKU-AI-1'])
            ->assertRedirect()
            ->assertSessionHas('ai_result');

        $result = session('ai_result');
        $this->assertStringContainsString('IKU-AI-1', $result['output']);
    }

    public function test_chat_context_builder_retrieves_indicator_code_without_undefined_column(): void
    {
        $this->seedData();
        $builder = app(\App\Services\Ai\AiContextBuilder::class);
        $this->actingAs($this->superAdmin);
        $context = $builder->chatContext('Bagaimana capaian indikator kritis?');

        $this->assertIsArray($context);
        $this->assertArrayHasKey('facts', $context);
        $this->assertStringContainsString('Indikator AI', $context['critical_list']);
    }

    public function test_executive_brief_combines_summary_and_recommendation(): void
    {
        $this->seedData();

        $this->actingAs($this->superAdmin)
            ->post(route('ai.executive-brief'))
            ->assertRedirect()
            ->assertSessionHas('ai_result');

        $result = session('ai_result');
        $this->assertStringContainsString('EXECUTIVE BRIEF', $result['output']);
    }

    public function test_generated_output_is_persisted_as_reviewable_insight(): void
    {
        $this->seedData();

        $this->actingAs($this->superAdmin)
            ->post(route('ai.executive-summary'))
            ->assertRedirect();

        $insight = AiInsight::query()->latest('id')->firstOrFail();
        $this->assertSame('executive_summary', $insight->insight_type);
        $this->assertSame('generated', $insight->status);
        $this->assertSame($this->superAdmin->id, $insight->user_id);
        $this->assertIsArray($insight->content);
        $this->assertArrayHasKey('output', $insight->content);
        $this->assertArrayHasKey('generated_at', $insight->content);
        $this->assertStringContainsString('Provinsi Papua Barat', $insight->source_refs['scope']);
    }

    public function test_ai_request_metadata_is_logged(): void
    {
        $this->seedData();

        $this->actingAs($this->superAdmin)
            ->post(route('ai.insight'))
            ->assertRedirect();

        $request = AiRequest::query()->latest('id')->firstOrFail();
        $this->assertSame('insight', $request->feature);
        $this->assertSame('completed', $request->status);
        $this->assertSame($this->superAdmin->id, $request->user_id);
        $this->assertIsInt($request->latency_ms);
        $this->assertNull($request->failure_reason);
    }

    public function test_user_can_review_own_insight_with_rating(): void
    {
        $this->seedData();

        $this->actingAs($this->superAdmin)
            ->post(route('ai.executive-summary'))
            ->assertRedirect();

        $insight = AiInsight::query()->latest('id')->firstOrFail();

        $this->actingAs($this->superAdmin)
            ->post(route('ai.insights.review', $insight->id), [
                'decision' => 'accepted',
                'rating' => 5,
                'comment' => 'X',
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $insight->refresh();
        $this->assertSame('accepted', $insight->status);
        $this->assertSame(5, $insight->rating);
        $this->assertSame($this->superAdmin->id, $insight->reviewed_by);
        $this->assertNotNull($insight->reviewed_at);
    }

    public function test_user_cannot_review_others_insight(): void
    {
        $this->seedData();

        $this->actingAs($this->superAdmin)
            ->post(route('ai.executive-summary'))
            ->assertRedirect();

        $insight = AiInsight::query()->latest('id')->firstOrFail();

        $role = Role::create(['name' => 'AI User']);
        $permission = Permission::create(['name' => 'ai:use', 'resource' => 'ai', 'action' => 'use', 'module' => 'ai']);
        $role->permissions()->attach($permission);

        $other = User::factory()->create();
        $other->roles()->attach($role);

        $this->actingAs($other)
            ->post(route('ai.insights.review', $insight->id), ['decision' => 'rejected'])
            ->assertForbidden();

        $this->assertSame('generated', $insight->fresh()->status);
    }

    public function test_admin_can_create_new_template_version(): void
    {
        $this->seedData();

        $this->actingAs($this->superAdmin)
            ->post(route('ai.executive-summary'))
            ->assertRedirect();

        $this->actingAs($this->superAdmin)
            ->post(route('ai.templates.store'), [
                'feature' => 'executive_summary',
                'name' => 'Executive v2',
                'content' => 'Template versi dua: {scope} {period} {problems} {generated_at}',
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $active = AiPromptTemplate::query()
            ->where('feature', 'executive_summary')
            ->where('is_active', true)
            ->orderByDesc('version')
            ->first();

        $this->assertSame(2, $active->version);
        $this->assertDatabaseHas('ai_prompt_templates', [
            'feature' => 'executive_summary',
            'version' => 1,
            'is_active' => false,
        ]);
    }

    public function test_admin_can_activate_previous_template_version(): void
    {
        $this->seedData();

        $this->actingAs($this->superAdmin)
            ->post(route('ai.executive-summary'))
            ->assertRedirect();

        $v1 = AiPromptTemplate::query()
            ->where('feature', 'executive_summary')
            ->where('version', 1)
            ->firstOrFail();

        $this->actingAs($this->superAdmin)
            ->post(route('ai.templates.store'), [
                'feature' => 'executive_summary',
                'content' => 'Template versi dua: {scope} {period} {problems} {generated_at}',
            ])
            ->assertRedirect();

        $this->actingAs($this->superAdmin)
            ->post(route('ai.templates.activate', $v1->id))
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertTrue($v1->fresh()->is_active);
        $this->assertFalse(
            AiPromptTemplate::query()->where('feature', 'executive_summary')->where('version', 2)->firstOrFail()->is_active,
        );
    }

    public function test_templates_page_requires_config_permission(): void
    {
        $this->seedData();

        $this->actingAs($this->superAdmin)
            ->get(route('ai.templates'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Ai/Templates'));
    }
}
