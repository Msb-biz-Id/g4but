<?php

namespace Tests\Feature;

use App\Enums\Role as RoleEnum;
use App\Models\Organization;
use App\Models\PerformancePeriod;
use App\Models\PlanningDocument;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PlanningDocumentPdfUploadTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Organization $organization;
    private PerformancePeriod $period;

    protected function setUp(): void
    {
        parent::setUp();

        $role = Role::create(['name' => RoleEnum::SuperAdmin->value]);
        $this->user = User::factory()->create();
        $this->user->roles()->attach($role);

        $this->organization = Organization::create([
            'code' => 'D-KOP',
            'name' => 'Dinas Koperasi dan UKM',
            'type' => 'opd',
        ]);

        $this->period = PerformancePeriod::create([
            'year' => 2026,
            'name' => 'Periode Kinerja 2026',
            'status' => 'open',
        ]);

        Storage::fake('local');
    }

    public function test_can_create_document_with_type_iku_and_upload_pdf(): void
    {
        $response = $this->actingAs($this->user)
            ->post(route('planning.documents.store'), [
                'organization_id' => $this->organization->id,
                'performance_period_id' => $this->period->id,
                'type' => 'iku',
                'title' => 'Indikator Kinerja Utama Dinas Koperasi dan UKM',
                'document_number' => 'IKU/2026/01',
                'description' => 'Tabel penetapan IKU formal',
            ]);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect();

        $document = PlanningDocument::where('type', 'iku')->first();
        $this->assertNotNull($document);
        $this->assertEquals('iku', $document->type);
        $this->assertEquals('draft', $document->status);

        $pdfFile = UploadedFile::fake()->create('iku-tabel-2026.pdf', 500, 'application/pdf');

        $uploadResponse = $this->actingAs($this->user)
            ->post(route('planning.documents.upload', $document), [
                'file' => $pdfFile,
            ]);

        $uploadResponse->assertSessionHasNoErrors();
        $document->refresh();

        $this->assertEquals('review', $document->status);
        $this->assertNotNull($document->file_path);
        Storage::disk('local')->assertExists($document->file_path);

        $downloadResponse = $this->actingAs($this->user)
            ->get(route('planning.documents.download', $document));

        $downloadResponse->assertOk();
    }

    public function test_can_create_document_with_type_pedoman_teknis_and_upload_pdf(): void
    {
        $response = $this->actingAs($this->user)
            ->post(route('planning.documents.store'), [
                'organization_id' => $this->organization->id,
                'performance_period_id' => $this->period->id,
                'type' => 'pedoman_teknis',
                'title' => 'Pedoman Teknis Perencanaan Kinerja',
                'document_number' => 'PEDOMAN/2026/01',
                'description' => 'Pedoman teknis format laporan perencanaan',
            ]);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect();

        $document = PlanningDocument::where('type', 'pedoman_teknis')->first();
        $this->assertNotNull($document);
        $this->assertEquals('pedoman_teknis', $document->type);

        $pdfFile = UploadedFile::fake()->create('pedoman-teknis.pdf', 300, 'application/pdf');

        $uploadResponse = $this->actingAs($this->user)
            ->post(route('planning.documents.upload', $document), [
                'file' => $pdfFile,
            ]);

        $uploadResponse->assertSessionHasNoErrors();
        $document->refresh();

        $this->assertNotNull($document->file_path);
        Storage::disk('local')->assertExists($document->file_path);
    }

    public function test_rejects_unwhitelisted_document_type(): void
    {
        $response = $this->actingAs($this->user)
            ->post(route('planning.documents.store'), [
                'organization_id' => $this->organization->id,
                'performance_period_id' => $this->period->id,
                'type' => 'tipe_tidak_valid_xyz',
                'title' => 'Dokumen Tidak Valid',
            ]);

        $response->assertSessionHasErrors('type');
    }

    public function test_planning_documents_index_renders_with_document_types_including_iku_and_pedoman_teknis(): void
    {
        $response = $this->actingAs($this->user)
            ->get(route('planning.documents.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Planning/Documents')
            ->has('documentTypes.iku')
            ->has('documentTypes.pedoman_teknis')
            ->has('documentTypes.pohon_kinerja')
            ->has('documentTypes.cascading')
            ->has('documentTypes.proses_bisnis')
            ->has('documentTypes.crosscutting')
            ->has('documentTypes.manajemen_risiko')
        );
    }

    public function test_planning_docs_index_renders_cleanly_without_conflicts(): void
    {
        $response = $this->actingAs($this->user)
            ->get(route('planning.docs.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Planning/Documents/Index')
            ->has('documents')
            ->has('types')
        );
    }

    public function test_can_create_document_with_single_year_text(): void
    {
        $response = $this->actingAs($this->user)
            ->post(route('planning.documents.store'), [
                'organization_id' => $this->organization->id,
                'performance_period_id' => $this->period->id,
                'type' => 'renja',
                'title' => 'Rencana Kerja Dinas Koperasi 2026',
                'document_year' => '2026',
            ]);

        $response->assertSessionHasNoErrors();
        $doc = PlanningDocument::where('title', 'Rencana Kerja Dinas Koperasi 2026')->first();
        $this->assertNotNull($doc);
        $this->assertEquals(2026, $doc->start_year);
        $this->assertEquals(2026, $doc->end_year);
    }

    public function test_can_create_and_update_document_with_year_range_text(): void
    {
        $response = $this->actingAs($this->user)
            ->post(route('planning.documents.store'), [
                'organization_id' => $this->organization->id,
                'performance_period_id' => $this->period->id,
                'type' => 'renstra',
                'title' => 'Renstra Dinas Koperasi 2025-2029',
                'document_year' => '2025-2029',
            ]);

        $response->assertSessionHasNoErrors();
        $doc = PlanningDocument::where('title', 'Renstra Dinas Koperasi 2025-2029')->first();
        $this->assertNotNull($doc);
        $this->assertEquals(2025, $doc->start_year);
        $this->assertEquals(2029, $doc->end_year);

        // Test update with new range
        $updateResponse = $this->actingAs($this->user)
            ->put(route('planning.documents.update', $doc), [
                'organization_id' => $this->organization->id,
                'performance_period_id' => $this->period->id,
                'type' => 'renstra',
                'title' => 'Renstra Dinas Koperasi 2026-2030 (Updated)',
                'document_year' => '2026-2030',
            ]);

        $updateResponse->assertSessionHasNoErrors();
        $doc->refresh();
        $this->assertEquals(2026, $doc->start_year);
        $this->assertEquals(2030, $doc->end_year);
    }

    public function test_rejects_invalid_document_year_format(): void
    {
        $response = $this->actingAs($this->user)
            ->post(route('planning.documents.store'), [
                'organization_id' => $this->organization->id,
                'performance_period_id' => $this->period->id,
                'type' => 'renja',
                'title' => 'Rencana Kerja Invalid Year',
                'document_year' => 'tahun-2026',
            ]);

        $response->assertSessionHasErrors('document_year');
    }
}
