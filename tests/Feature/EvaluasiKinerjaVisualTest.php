<?php

namespace Tests\Feature;

use App\Models\Evaluation;
use App\Models\Organization;
use App\Models\PkoEvaluation;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class EvaluasiKinerjaVisualTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;

    private Organization $pemda;

    private Organization $opd;

    protected function setUp(): void
    {
        parent::setUp();

        $this->pemda = Organization::firstOrCreate(
            ['type' => 'province'],
            ['code' => 'PROV-TEST', 'name' => 'Pemerintah Provinsi Test']
        );

        $this->opd = Organization::firstOrCreate(
            ['code' => 'OPD-TEST'],
            ['name' => 'Dinas Test', 'type' => 'opd']
        );

        $role = Role::firstOrCreate(['name' => 'Super Admin'], ['guard_name' => 'web']);
        $this->superAdmin = User::factory()->create();
        $this->superAdmin->roles()->attach($role);
    }

    public function test_can_view_evaluasi_kinerja_page(): void
    {
        $response = $this->actingAs($this->superAdmin)
            ->get(route('evaluations.index', ['year' => 2025]));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Evaluations/Index')
            ->has('sakip_pemda')
            ->has('sakip_opd')
            ->where('year', 2025)
        );
    }

    public function test_can_save_sakip_scores(): void
    {
        $response = $this->actingAs($this->superAdmin)
            ->post(route('evaluations.sakip.save'), [
                'organization_id' => $this->pemda->id,
                'year' => 2025,
                'perencanaan' => 26.50,
                'pengukuran' => 25.50,
                'pelaporan' => 13.00,
                'evaluasi_internal' => 21.00,
                'status_evaluasi' => 'Final',
            ]);

        $response->assertRedirect();

        $eval = Evaluation::with('scores')
            ->where('organization_id', $this->pemda->id)
            ->firstOrFail();

        $this->assertEquals('Final', $eval->evaluation_status);
        $this->assertEquals(86.00, $eval->scores->sum('score'));
    }

    public function test_can_upload_lhe_document(): void
    {
        Storage::fake('public');

        $file = UploadedFile::fake()->create('lhe_document_2025.pdf', 500, 'application/pdf');

        $response = $this->actingAs($this->superAdmin)
            ->post(route('evaluations.sakip.upload-lhe'), [
                'organization_id' => $this->pemda->id,
                'year' => 2025,
                'file' => $file,
            ]);

        $response->assertRedirect();

        $eval = Evaluation::where('organization_id', $this->pemda->id)->firstOrFail();
        $this->assertNotNull($eval->lhe_file_path);
        Storage::disk('public')->assertExists($eval->lhe_file_path);
    }

    public function test_can_save_and_recalculate_pko_indicators(): void
    {
        // 1. Tambah indikator pertama (dengan target 5, realisasi -11.86 -> minus)
        $this->actingAs($this->superAdmin)
            ->post(route('evaluations.pko.indicators.save'), [
                'organization_id' => $this->pemda->id,
                'year' => 2025,
                'sasaran' => 'Meningkatnya nilai investasi daerah',
                'indikator' => 'Persentase peningkatan investasi di Kabupaten Mimika',
                'satuan' => 'Persen',
                'target' => 5.00,
                'realisasi' => -11.86,
                'koreksi_akip' => 20.00,
            ])
            ->assertRedirect();

        // 2. Tambah indikator kedua (dengan target 2.46, realisasi 28.32 -> 1151% normalisasi ke 110%)
        $this->actingAs($this->superAdmin)
            ->post(route('evaluations.pko.indicators.save'), [
                'organization_id' => $this->pemda->id,
                'year' => 2025,
                'sasaran' => 'Meningkatnya kinerja tata kelola penanaman modal',
                'indikator' => 'Nilai Realisasi Investasi PMA dan PMDN',
                'satuan' => 'Rp Triliun',
                'target' => 2.46,
                'realisasi' => 28.32,
                'koreksi_akip' => 20.00,
            ])
            ->assertRedirect();

        $pkoEval = PkoEvaluation::with('indicators')
            ->where('organization_id', $this->pemda->id)
            ->where('year', 2025)
            ->firstOrFail();

        $this->assertCount(2, $pkoEval->indicators);

        $ind1 = $pkoEval->indicators->first();
        $this->assertEquals(-237.20, (float) $ind1->capaian_pk);
        $this->assertEquals(-237.20, (float) $ind1->normalisasi_capaian);
        $this->assertEquals(-189.76, (float) $ind1->nilai_akhir);

        $ind2 = $pkoEval->indicators->last();
        $this->assertEquals(1151.22, (float) $ind2->capaian_pk);
        $this->assertEquals(110.00, (float) $ind2->normalisasi_capaian);
        $this->assertEquals(88.00, (float) $ind2->nilai_akhir);

        // Delete indicator
        $this->actingAs($this->superAdmin)
            ->delete(route('evaluations.pko.indicators.destroy', $ind1->id))
            ->assertRedirect();

        $this->assertDatabaseMissing('pko_indicators', ['id' => $ind1->id]);
    }
}
