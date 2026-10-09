<?php

namespace Tests\Feature;

use App\Enums\Role as RoleEnum;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoleManagementTest extends TestCase
{
    use RefreshDatabase;

    private Role $superAdminRole;

    private User $superAdmin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->superAdminRole = Role::create(['name' => RoleEnum::SuperAdmin->value]);
        $this->superAdmin = User::factory()->create();
        $this->superAdmin->roles()->attach($this->superAdminRole);

        $org = Organization::create([
            'code' => 'PROV-TEST',
            'name' => 'Provinsi Test',
            'type' => 'province',
        ]);
        $this->superAdmin->organizations()->attach($org, ['is_default' => true]);
    }

    public function test_super_admin_can_view_roles(): void
    {
        $this->actingAs($this->superAdmin)
            ->get(route('roles.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Roles/Index')
                ->has('roles', 1));
    }

    public function test_super_admin_can_edit_role_permissions(): void
    {
        $permission = Permission::create([
            'name' => 'dashboard:view',
            'resource' => 'dashboard',
            'action' => 'view',
            'module' => 'reporting',
        ]);

        $operator = Role::create(['name' => RoleEnum::OperatorOpd->value]);

        $this->actingAs($this->superAdmin)
            ->get(route('roles.edit', $operator))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Roles/Edit')
                ->where('role.id', $operator->id));

        $this->actingAs($this->superAdmin)
            ->put(route('roles.update', $operator), [
                'name' => $operator->name,
                'description' => 'Operator OPD',
                'permission_ids' => [$permission->id],
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertTrue(
            $operator->permissions()->whereKey($permission->id)->exists(),
        );

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'update',
            'resource_type' => 'role',
            'resource_id' => $operator->id,
        ]);
    }

    public function test_super_admin_role_permissions_cannot_be_changed(): void
    {
        $this->actingAs($this->superAdmin)
            ->put(route('roles.update', $this->superAdminRole), [
                'name' => $this->superAdminRole->name,
                'permission_ids' => [],
            ])
            ->assertSessionHas('error');
    }

    public function test_user_without_permission_cannot_view_roles(): void
    {
        $regular = User::factory()->create();

        $this->actingAs($regular)
            ->get(route('roles.index'))
            ->assertForbidden();
    }
}
