<?php

namespace Tests\Feature;

use App\Enums\Role as RoleEnum;
use App\Models\KnowledgeDocument;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class KnowledgeTest extends TestCase
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
    }

    private function makeDocument(array $overrides = []): KnowledgeDocument
    {
        return KnowledgeDocument::create([
            'title' => 'Pedoman SAKIP 2026',
            'document_type' => 'guideline',
            'category' => 'Pedoman',
            'content' => 'Dokumen pedoman penyusunan SAKIP.',
            'tags' => 'SAKIP, pedoman',
            'access' => 'internal',
            'version' => 1,
            'status' => 'draft',
            ...$overrides,
        ]);
    }

    public function test_knowledge_index_lists_and_filters_documents(): void
    {
        $this->makeDocument();
        $this->makeDocument([
            'title' => 'SOP Pengukuran Kinerja',
            'document_type' => 'sop',
            'category' => 'SOP',
            'status' => 'published',
        ]);

        $response = $this->actingAs($this->superAdmin)
            ->get(route('knowledge.index', ['search' => 'SOP']))
            ->assertOk();

        $response->assertInertia(fn ($page) => $page
            ->component('Knowledge/Index')
            ->has('documents.data', 1)
            ->where('documents.data.0.title', 'SOP Pengukuran Kinerja')
            ->where('filters.search', 'SOP'));

        $filtered = $this->actingAs($this->superAdmin)
            ->get(route('knowledge.index', ['document_type' => 'guideline']))
            ->assertOk();

        $filtered->assertInertia(fn ($page) => $page
            ->component('Knowledge/Index')
            ->has('documents.data', 1));
    }

    public function test_store_creates_document_as_draft_with_file(): void
    {
        Storage::fake('local');

        $response = $this->actingAs($this->superAdmin)
            ->post(route('knowledge.store'), [
                'title' => 'FAQ E-SAKIP',
                'document_type' => 'faq',
                'category' => 'FAQ',
                'content' => 'Pertanyaan umum.',
                'tags' => 'FAQ, umum',
                'access' => 'public',
                'file' => UploadedFile::fake()->create('faq.pdf', 100),
            ]);

        $response->assertRedirect(route('knowledge.index'));

        $this->assertDatabaseHas('knowledge_documents', [
            'title' => 'FAQ E-SAKIP',
            'document_type' => 'faq',
            'version' => 1,
            'status' => 'draft',
        ]);

        $document = KnowledgeDocument::where('title', 'FAQ E-SAKIP')->first();
        $this->assertNotNull($document->file_path);
        Storage::disk('local')->assertExists($document->file_path);
    }

    public function test_store_validates_document_type(): void
    {
        $response = $this->actingAs($this->superAdmin)
            ->post(route('knowledge.store'), [
                'title' => 'Dokumen',
                'document_type' => 'invalid-type',
            ]);

        $response->assertSessionHasErrors('document_type');
    }

    public function test_update_increments_version_and_can_publish(): void
    {
        $document = $this->makeDocument();

        $response = $this->actingAs($this->superAdmin)
            ->put(route('knowledge.update', $document->id), [
                'title' => 'Pedoman SAKIP 2026 (Revisi)',
                'document_type' => 'guideline',
                'category' => 'Pedoman',
                'content' => 'Revisi pedoman.',
                'tags' => 'SAKIP',
                'access' => 'internal',
                'publish' => true,
            ]);

        $response->assertRedirect();

        $document->refresh();
        $this->assertSame(2, $document->version);
        $this->assertSame('published', $document->status);
        $this->assertSame($this->superAdmin->id, $document->published_by);
        $this->assertNotNull($document->published_at);
    }

    public function test_publish_and_unpublish_toggles_status(): void
    {
        $document = $this->makeDocument();

        $this->actingAs($this->superAdmin)
            ->post(route('knowledge.publish', $document->id))
            ->assertRedirect();

        $document->refresh();
        $this->assertSame('published', $document->status);
        $this->assertSame($this->superAdmin->id, $document->published_by);

        $this->actingAs($this->superAdmin)
            ->post(route('knowledge.unpublish', $document->id))
            ->assertRedirect();

        $document->refresh();
        $this->assertSame('draft', $document->status);
        $this->assertNull($document->published_at);
    }

    public function test_download_serves_published_document(): void
    {
        Storage::fake('local');
        $filePath = 'knowledge/pedoman.pdf';
        Storage::disk('local')->put($filePath, 'file-content');

        $document = $this->makeDocument([
            'file_path' => $filePath,
            'status' => 'published',
        ]);

        $response = $this->actingAs($this->superAdmin)
            ->get(route('knowledge.download', $document->id))
            ->assertOk();

        $this->assertStringContainsString(
            'attachment',
            $response->headers->get('Content-Disposition'),
        );
    }

    public function test_download_of_internal_draft_is_forbidden(): void
    {
        Storage::fake('local');
        $filePath = 'knowledge/rahasia.pdf';
        Storage::disk('local')->put($filePath, 'secret');

        $document = $this->makeDocument(['file_path' => $filePath]);

        $this->actingAs($this->superAdmin)
            ->get(route('knowledge.download', $document->id))
            ->assertForbidden();
    }

    public function test_destroy_deletes_document_and_file(): void
    {
        Storage::fake('local');
        $filePath = 'knowledge/hapus.pdf';
        Storage::disk('local')->put($filePath, 'content');

        $document = $this->makeDocument(['file_path' => $filePath]);

        $response = $this->actingAs($this->superAdmin)
            ->delete(route('knowledge.destroy', $document->id));

        $response->assertRedirect();
        $this->assertSoftDeleted('knowledge_documents', ['id' => $document->id]);
        Storage::disk('local')->assertMissing($filePath);
    }

    public function test_user_without_permission_cannot_access_knowledge(): void
    {
        $regular = User::factory()->create();

        $this->actingAs($regular)
            ->get(route('knowledge.index'))
            ->assertForbidden();
    }

    public function test_public_landing_shows_only_published_public_documents(): void
    {
        $this->makeDocument(['status' => 'published', 'access' => 'public', 'title' => 'Regulasi Publik']);
        $this->makeDocument(['status' => 'draft', 'access' => 'public', 'title' => 'Draft Belum Terbit']);
        $this->makeDocument(['status' => 'published', 'access' => 'internal', 'title' => 'SOP Internal']);

        $response = $this->get(route('knowledge.public.index'))->assertOk();

        $response->assertInertia(fn ($page) => $page
            ->component('Knowledge/PublicIndex')
            ->where('documents.total', 1)
            ->where('documents.data.0.title', 'Regulasi Publik'));
    }

    public function test_public_show_is_available_for_published_public_document(): void
    {
        $document = $this->makeDocument([
            'status' => 'published',
            'access' => 'public',
            'published_at' => now(),
        ]);

        $this->get(route('knowledge.public.show', $document->id))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Knowledge/PublicShow'));
    }

    public function test_public_show_hides_internal_document(): void
    {
        $document = $this->makeDocument(['status' => 'published', 'access' => 'internal']);

        $this->get(route('knowledge.public.show', $document->id))->assertNotFound();
    }

    public function test_public_download_allows_guest_for_public_document(): void
    {
        Storage::fake('local');
        $filePath = 'knowledge/publik.pdf';
        Storage::disk('local')->put($filePath, 'public-content');

        $document = $this->makeDocument([
            'status' => 'published',
            'access' => 'public',
            'file_path' => $filePath,
        ]);

        $this->get(route('knowledge.public.download', $document->id))
            ->assertOk()
            ->assertDownload('Pedoman SAKIP 2026');
    }

    public function test_public_download_rejects_internal_document(): void
    {
        Storage::fake('local');
        $filePath = 'knowledge/rahasia.pdf';
        Storage::disk('local')->put($filePath, 'secret');

        $document = $this->makeDocument([
            'status' => 'published',
            'access' => 'internal',
            'file_path' => $filePath,
        ]);

        $this->get(route('knowledge.public.download', $document->id))->assertNotFound();
    }

    public function test_store_accepts_external_url(): void
    {
        $this->actingAs($this->superAdmin)
            ->post(route('knowledge.store'), [
                'title' => 'Tutorial dengan Link',
                'document_type' => 'tutorial',
                'access' => 'public',
                'external_url' => 'https://example.com/panduan',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('knowledge_documents', [
            'title' => 'Tutorial dengan Link',
            'external_url' => 'https://example.com/panduan',
        ]);
    }

    public function test_store_rejects_invalid_external_url(): void
    {
        $this->actingAs($this->superAdmin)
            ->post(route('knowledge.store'), [
                'title' => 'Tautan Salah',
                'document_type' => 'tutorial',
                'access' => 'public',
                'external_url' => 'bukan-url',
            ])
            ->assertSessionHasErrors('external_url');
    }
}
