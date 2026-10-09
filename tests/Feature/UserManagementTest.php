<?php

namespace Tests\Feature;

use App\Enums\Role as RoleEnum;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    private Role $superAdminRole;

    private User $superAdmin;

    private Organization $org;

    protected function setUp(): void
    {
        parent::setUp();

        $permissions = [];
        foreach (['user:view', 'user:create', 'user:update', 'user:deactivate', 'user:reset_password'] as $name) {
            [$resource, $action] = explode(':', $name);
            $permissions[$name] = Permission::create([
                'name' => $name,
                'resource' => $resource,
                'action' => $action,
                'module' => 'iam',
            ]);
        }

        $this->superAdminRole = Role::create(['name' => RoleEnum::SuperAdmin->value]);
        $this->superAdminRole->permissions()->sync(collect($permissions)->pluck('id'));

        $this->org = Organization::create([
            'code' => 'OPD-001',
            'name' => 'Dinas Contoh',
            'type' => 'opd',
        ]);

        $this->superAdmin = User::factory()->create();
        $this->superAdmin->roles()->attach($this->superAdminRole);
        $this->superAdmin->organizations()->attach($this->org, ['is_default' => true]);
    }

    public function test_super_admin_can_view_user_list(): void
    {
        $this->actingAs($this->superAdmin)
            ->get(route('users.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Users/Index')
                ->has('users.data'));
    }

    public function test_super_admin_can_create_user(): void
    {
        $this->actingAs($this->superAdmin)
            ->post(route('users.store'), [
                'name' => 'Operator Baru',
                'email' => 'operator@test.dev',
                'employee_number' => '199001012025001',
                'job_title' => 'Staf',
                'password' => 'Password123',
                'password_confirmation' => 'Password123',
                'is_active' => true,
                'role_ids' => [$this->superAdminRole->id],
                'organization_ids' => [$this->org->id],
            ])
            ->assertRedirect(route('users.index'));

        $this->assertDatabaseHas('users', ['email' => 'operator@test.dev']);

        $user = User::where('email', 'operator@test.dev')->first();
        $this->assertTrue($user->roles()->where('id', $this->superAdminRole->id)->exists());
        $this->assertTrue($user->organizations()->where('id', $this->org->id)->exists());
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'create',
            'resource_type' => 'user',
            'resource_id' => $user->id,
        ]);
    }

    public function test_validation_rejects_duplicate_email(): void
    {
        User::factory()->create(['email' => 'duplicate@test.dev']);

        $this->actingAs($this->superAdmin)
            ->post(route('users.store'), [
                'name' => 'Duplikat',
                'email' => 'duplicate@test.dev',
                'password' => 'Password123',
                'password_confirmation' => 'Password123',
            ])
            ->assertSessionHasErrors('email');
    }

    public function test_user_without_permission_cannot_access_user_list(): void
    {
        $regular = User::factory()->create();
        $regular->organizations()->attach($this->org, ['is_default' => true]);

        $this->actingAs($regular)
            ->get(route('users.index'))
            ->assertForbidden();
    }

    public function test_super_admin_can_deactivate_user(): void
    {
        $target = User::factory()->create(['is_active' => true]);

        $this->actingAs($this->superAdmin)
            ->delete(route('users.destroy', $target))
            ->assertRedirect();

        $this->assertDatabaseHas('users', [
            'id' => $target->id,
            'is_active' => false,
        ]);
    }

    public function test_cannot_deactivate_self(): void
    {
        $this->actingAs($this->superAdmin)
            ->delete(route('users.destroy', $this->superAdmin))
            ->assertSessionHas('error');
    }

    public function test_super_admin_can_export_users_to_excel(): void
    {
        $response = $this->actingAs($this->superAdmin)
            ->get(route('users.export', ['format' => 'xlsx']));

        $response->assertOk();
        $this->assertStringContainsString('daftar_akun_ekasuari.xlsx', (string) $response->headers->get('content-disposition'));
    }

    public function test_super_admin_can_export_users_to_csv(): void
    {
        $response = $this->actingAs($this->superAdmin)
            ->get(route('users.export', ['format' => 'csv']));

        $response->assertOk();
        $this->assertStringContainsString('daftar_akun_ekasuari.csv', (string) $response->headers->get('content-disposition'));
    }
}

