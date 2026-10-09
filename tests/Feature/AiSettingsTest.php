<?php

namespace Tests\Feature;

use App\Enums\Role as RoleEnum;
use App\Models\AppConfig;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AiSettingsTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;

    protected function setUp(): void
    {
        parent::setUp();

        config(['ekasuari.ai.provider' => 'mock']);

        $role = Role::create(['name' => RoleEnum::SuperAdmin->value]);
        $perm = Permission::firstOrCreate(
            ['name' => 'config:manage'],
            ['resource' => 'config', 'action' => 'manage', 'module' => 'config', 'label' => 'Kelola Konfigurasi']
        );
        $role->permissions()->attach($perm);

        $this->superAdmin = User::factory()->create();
        $this->superAdmin->roles()->attach($role);
    }

    public function test_settings_page_lists_ai_configurations(): void
    {
        $response = $this->actingAs($this->superAdmin)->get(route('settings.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Settings/Index')
            ->has('configs')
            ->has('groups')
            ->where('canManage', true)
        );
    }

    public function test_admin_can_update_ai_configuration(): void
    {
        $config = AppConfig::where('key', 'ai.model')->firstOrFail();

        $response = $this->actingAs($this->superAdmin)
            ->put(route('settings.update', $config->id), [
                'value' => 'google/gemini-2.0-flash',
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertEquals('google/gemini-2.0-flash', $config->fresh()->value);
        $this->assertEquals('google/gemini-2.0-flash', AppConfig::value('ai.model'));
    }

    public function test_admin_can_reset_ai_configuration(): void
    {
        $config = AppConfig::where('key', 'ai.timeout')->firstOrFail();
        $config->update(['value' => '90']);

        $response = $this->actingAs($this->superAdmin)
            ->post(route('settings.reset', $config->id));

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertEquals($config->default_value, $config->fresh()->value);
    }
}
