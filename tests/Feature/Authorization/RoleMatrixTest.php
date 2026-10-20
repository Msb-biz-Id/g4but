<?php

namespace Tests\Feature\Authorization;

use App\Models\User;
use Database\Seeders\OrganizationSeeder;
use Database\Seeders\PeriodSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\UserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Tests\TestCase;

class RoleMatrixTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            RolePermissionSeeder::class,
            OrganizationSeeder::class,
            UserSeeder::class,
            PeriodSeeder::class,
        ]);
    }

    public function test_super_admin_has_full_bypass(): void
    {
        $superAdmin = User::where('email', 'superadmin@siperforma.local')->firstOrFail();

        $this->actingAs($superAdmin);

        $this->assertTrue(Gate::allows('manage-users'));
        $this->assertTrue(Gate::allows('view-dashboard'));
        $this->assertTrue(Gate::allows('finalize-iku'));
        $this->assertTrue(Gate::allows('approve-realizations'));
        $this->assertTrue(Gate::allows('create-realizations'));
    }

    public function test_admin_opd_is_maker_and_cannot_approve_checker_gates(): void
    {
        $adminOpd = User::where('email', 'admin.pupr@siperforma.local')->firstOrFail();

        $this->actingAs($adminOpd);

        $this->assertTrue(Gate::allows('view-dashboard'));
        $this->assertTrue(Gate::allows('create-realizations'));
        $this->assertTrue(Gate::allows('submit-realizations'));
        $this->assertTrue(Gate::allows('create-iku'));

        // Admin OPD is maker, cannot approve realization or finalize IKU
        $this->assertFalse(Gate::allows('approve-realizations'));
        $this->assertFalse(Gate::allows('finalize-iku'));
    }

    public function test_kepala_opd_is_checker_and_cannot_input_technical_data(): void
    {
        $kepalaOpd = User::where('email', 'kepala.dinas@siperforma.local')->firstOrFail();

        $this->actingAs($kepalaOpd);

        $this->assertTrue(Gate::allows('view-dashboard'));
        $this->assertTrue(Gate::allows('finalize-iku'));
        $this->assertTrue(Gate::allows('approve-realizations'));
        $this->assertTrue(Gate::allows('approve-agreements'));

        // Kepala OPD is checker, does not create realizations or technical IKU
        $this->assertFalse(Gate::allows('create-realizations'));
    }

    public function test_admin_sekretariat_maker_checker_segregation(): void
    {
        $adminSekr = User::where('email', 'admin.sekretariat@siperforma.local')->firstOrFail();

        $this->actingAs($adminSekr);

        $this->assertTrue(Gate::allows('view-dashboard'));
        $this->assertTrue(Gate::allows('create-realizations'));
        $this->assertTrue(Gate::allows('submit-realizations'));

        $this->assertFalse(Gate::allows('approve-realizations'));
        $this->assertFalse(Gate::allows('finalize-iku'));
    }

    public function test_kepala_sekretariat_can_approve_unit_and_review(): void
    {
        $kepalaSekr = User::where('email', 'kepala.sekretariat@siperforma.local')->firstOrFail();

        $this->actingAs($kepalaSekr);

        $this->assertTrue(Gate::allows('view-dashboard'));
        $this->assertTrue(Gate::allows('review-iku'));
        $this->assertTrue(Gate::allows('approve-realizations'));
        $this->assertTrue(Gate::allows('approve-agreements'));

        // Cannot create technical realization
        $this->assertFalse(Gate::allows('create-realizations'));
    }

    public function test_admin_bidang_maker_checker_segregation(): void
    {
        $adminDikdas = User::where('email', 'admin.dikdas@siperforma.local')->firstOrFail();

        $this->actingAs($adminDikdas);

        $this->assertTrue(Gate::allows('view-dashboard'));
        $this->assertTrue(Gate::allows('create-realizations'));
        $this->assertTrue(Gate::allows('submit-realizations'));

        $this->assertFalse(Gate::allows('approve-realizations'));
        $this->assertFalse(Gate::allows('finalize-iku'));
    }

    public function test_kepala_bidang_can_approve_unit_realization(): void
    {
        $kabidDikdas = User::where('email', 'kabid.dikdas@siperforma.local')->firstOrFail();

        $this->actingAs($kabidDikdas);

        $this->assertTrue(Gate::allows('view-dashboard'));
        $this->assertTrue(Gate::allows('approve-realizations'));
        $this->assertTrue(Gate::allows('approve-agreements'));

        $this->assertFalse(Gate::allows('create-realizations'));
    }
}

