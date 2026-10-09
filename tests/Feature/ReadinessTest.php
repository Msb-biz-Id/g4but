<?php

namespace Tests\Feature;

use App\Models\GoLiveReadiness;
use App\Models\Permission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReadinessTest extends TestCase
{
    use RefreshDatabase;

    private function permissionUser(string $action = 'view'): User
    {
        $permission = Permission::create([
            'name' => "config:{$action}",
            'resource' => 'config',
            'action' => $action,
            'module' => 'configuration',
        ]);

        $user = User::factory()->create();
        $user->permissions()->attach($permission);

        return $user;
    }

    public function test_readiness_page_requires_permission(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('readiness.index'))
            ->assertForbidden();
    }

    public function test_readiness_page_syncs_checklist_items(): void
    {
        $user = $this->permissionUser('view');

        $this->actingAs($user)
            ->get(route('readiness.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Readiness/Index')
                ->has('items', 17)
                ->where('progress.total', 17));
    }

    public function test_readiness_item_can_be_checked(): void
    {
        $user = $this->permissionUser('manage');
        $item = GoLiveReadiness::create([
            'item_key' => 'uat_sign_off',
            'label' => 'UAT sign-off',
            'category' => 'Dokumen',
        ]);

        $this->actingAs($user)
            ->post(route('readiness.update', $item->id), ['checked' => true])
            ->assertRedirect();

        $this->assertDatabaseHas('go_live_readiness', [
            'id' => $item->id,
            'checked' => 1,
            'checked_by' => $user->id,
        ]);
    }

    public function test_readiness_item_can_be_unchecked(): void
    {
        $user = $this->permissionUser('manage');
        $item = GoLiveReadiness::create([
            'item_key' => 'backup_success',
            'label' => 'Backup berhasil',
            'category' => 'Infrastruktur',
            'checked' => true,
            'checked_by' => $user->id,
            'checked_at' => now(),
        ]);

        $this->actingAs($user)
            ->post(route('readiness.update', $item->id), ['checked' => false])
            ->assertRedirect();

        $this->assertDatabaseHas('go_live_readiness', [
            'id' => $item->id,
            'checked' => 0,
            'checked_by' => null,
        ]);
    }

    public function test_readiness_update_requires_manage_permission(): void
    {
        $user = $this->permissionUser('view');
        $item = GoLiveReadiness::create([
            'item_key' => 'brd_baseline_approved',
            'label' => 'BRD baseline approved',
            'category' => 'Dokumen',
        ]);

        $this->actingAs($user)
            ->post(route('readiness.update', $item->id), ['checked' => true])
            ->assertForbidden();
    }

    public function test_readiness_update_validates_checked(): void
    {
        $user = $this->permissionUser('manage');
        $item = GoLiveReadiness::create([
            'item_key' => 'srs_approved',
            'label' => 'SRS approved',
            'category' => 'Dokumen',
        ]);

        $this->actingAs($user)
            ->post(route('readiness.update', $item->id), ['checked' => 'yes'])
            ->assertSessionHasErrors('checked');
    }
}
