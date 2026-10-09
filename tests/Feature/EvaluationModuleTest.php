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

class EvaluationModuleTest extends TestCase
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

    public function test_evaluation_index_is_accessible(): void
    {
        $this->actingAs($this->adminOpd)
            ->get(route('evaluations.index', ['year' => 2026]))
            ->assertOk();
    }

    public function test_can_save_sakip_evaluation_scores(): void
    {
        $this->actingAs($this->adminOpd)
            ->post(route('evaluations.sakip.save'), [
                'organization_id' => $this->opd->id,
                'year' => 2026,
                'perencanaan' => 25.0,
                'pengukuran' => 25.0,
                'pelaporan' => 12.0,
                'evaluasi_internal' => 20.0,
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect();
    }

    public function test_can_upload_lhe_document(): void
    {
        $file = UploadedFile::fake()->create('LHE-OPD-2026.pdf', 512, 'application/pdf');

        $this->actingAs($this->adminOpd)
            ->post(route('evaluations.sakip.upload-lhe'), [
                'organization_id' => $this->opd->id,
                'year' => 2026,
                'file' => $file,
                'nomor_lhe' => 'LHE/001/2026',
                'catatan' => 'Catatan evaluasi internal OPD',
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect();
    }

    public function test_can_export_sakip_pdf(): void
    {
        $this->actingAs($this->adminOpd)
            ->get(route('evaluations.export-sakip-pdf', ['year' => 2026]))
            ->assertOk();
    }
}
