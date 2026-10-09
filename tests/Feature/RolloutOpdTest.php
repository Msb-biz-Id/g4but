<?php

namespace Tests\Feature;

use App\Enums\Role as RoleEnum;
use App\Models\Organization;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RolloutOpdTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::create(['name' => RoleEnum::AdminOpd->value]);
    }

    public function test_command_creates_opd_and_local_admin(): void
    {
        $this->artisan('opd:rollout', [
            'code' => 'OPD-ROLLOUT-01',
            'name' => 'Dinas Rollout Satu',
            '--admin-email' => 'admin.rollout@ekasuari.test',
            '--admin-name' => 'Admin Rollout',
        ])->assertSuccessful();

        $organization = Organization::where('code', 'OPD-ROLLOUT-01')->firstOrFail();
        $this->assertSame('opd', $organization->type);

        $user = User::where('email', 'admin.rollout@ekasuari.test')->firstOrFail();
        $this->assertTrue($user->hasRole(RoleEnum::AdminOpd->value));
        $this->assertTrue($user->organizations->contains($organization->id));
    }

    public function test_command_rejects_duplicate_code(): void
    {
        Organization::create(['code' => 'OPD-DUP', 'name' => 'Sudah Ada', 'type' => 'opd']);

        $this->artisan('opd:rollout', [
            'code' => 'OPD-DUP',
            'name' => 'Duplikat',
        ])->assertFailed();

        $this->assertSame(1, Organization::where('code', 'OPD-DUP')->count());
    }

    public function test_command_can_run_without_admin(): void
    {
        $this->artisan('opd:rollout', [
            'code' => 'OPD-NOADMIN',
            'name' => 'Dinas Tanpa Admin',
        ])->assertSuccessful();

        $this->assertDatabaseHas('organizations', ['code' => 'OPD-NOADMIN']);
        $this->assertSame(0, User::count());
    }
}
