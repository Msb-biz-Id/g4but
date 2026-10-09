<?php

namespace Tests\Feature;

use App\Enums\Role as RoleEnum;
use App\Models\Organization;
use App\Models\PlanningPeriod;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ReportingModuleTest extends TestCase
{
    use RefreshDatabase;

    private User $adminOpd;

    private User $kepalaOpd;

    private Organization $opd;

    private PlanningPeriod $period;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');

        $this->seed(RolePermissionSeeder::class);

        $adminOpdRole = Role::where('name', RoleEnum::AdminOpd->value)->firstOrFail();
        $kepalaOpdRole = Role::where('name', RoleEnum::KepalaOpd->value)->firstOrFail();

        $this->opd = Organization::create([
            'code' => 'OPD-INDUK',
            'name' => 'Dinas Pendidikan dan Kebudayaan',
            'type' => 'opd',
            'is_active' => true,
        ]);

        $this->adminOpd = User::factory()->create();
        $this->adminOpd->roles()->attach($adminOpdRole);
        $this->adminOpd->organizations()->attach($this->opd, ['is_default' => true]);

        $this->kepalaOpd = User::factory()->create();
        $this->kepalaOpd->roles()->attach($kepalaOpdRole);
        $this->kepalaOpd->organizations()->attach($this->opd, ['is_default' => true]);

        $this->period = PlanningPeriod::create([
            'code' => 'TA-2026',
            'name' => 'Tahun Anggaran 2026',
            'year' => 2026,
            'type' => 'annual',
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
            'status' => 'active',
        ]);
    }

    public function test_reports_index_is_accessible(): void
    {
        $this->actingAs($this->adminOpd)
            ->get(route('reports.index', ['year' => 2026]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Reports/Index')
                ->has('matriks')
                ->has('selected_year')
            );
    }

    public function test_can_upload_opd_lkip_document(): void
    {
        $file = UploadedFile::fake()->create('LKIP-OPD-2026.pdf', 1024, 'application/pdf');

        $this->actingAs($this->adminOpd)
            ->post(route('reports.upload'), [
                'target_type' => 'opd',
                'organization_id' => $this->opd->id,
                'year' => 2026,
                'file' => $file,
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $this->assertDatabaseHas('planning_documents', [
            'organization_id' => $this->opd->id,
            'year' => 2026,
        ]);
    }

    public function test_upload_rejects_non_pdf_file(): void
    {
        $file = UploadedFile::fake()->create('LKIP-OPD-2026.txt', 100, 'text/plain');

        $this->actingAs($this->adminOpd)
            ->post(route('reports.upload'), [
                'target_type' => 'opd',
                'organization_id' => $this->opd->id,
                'year' => 2026,
                'file' => $file,
            ])
            ->assertSessionHasErrors('file');
    }
}
