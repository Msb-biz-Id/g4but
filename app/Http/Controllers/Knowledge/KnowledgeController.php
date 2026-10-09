<?php

namespace App\Http\Controllers\Knowledge;

use App\Http\Controllers\Controller;
use App\Models\KnowledgeDocument;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class KnowledgeController extends Controller
{
    public function __construct(private readonly AuditService $audit) {}

    public function index(Request $request): Response
    {
        $this->authorize('view-knowledge');

        $documents = KnowledgeDocument::query()
            ->with('publisher:id,name')
            ->when($request->filled('search'), function ($q) use ($request) {
                $search = $request->string('search');
                $q->where(function ($sub) use ($search) {
                    $sub->where('title', 'like', "%{$search}%")
                        ->orWhere('content', 'like', "%{$search}%")
                        ->orWhere('tags', 'like', "%{$search}%");
                });
            })
            ->when($request->filled('document_type'), fn ($q) => $q->where('document_type', $request->string('document_type')))
            ->when($request->filled('category'), fn ($q) => $q->where('category', $request->string('category')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 25))
            ->withQueryString();

        return Inertia::render('Knowledge/Index', [
            'documents' => $documents,
            'filters' => $request->only(['search', 'document_type', 'category', 'status', 'per_page']),
            'categories' => KnowledgeDocument::query()
                ->whereNotNull('category')
                ->distinct()
                ->orderBy('category')
                ->pluck('category'),
        ]);
    }

    public function create(): Response
    {
        $this->authorize('manage-knowledge');

        return Inertia::render('Knowledge/Create');
    }

    public const KATEGORI = [
        'regulasi' => [
            'label' => 'Dokumen Regulasi & SOP',
            'icon' => 'FileText',
            'description' => 'Mencakup Peraturan Daerah, Peraturan Gubernur, Pedoman Teknis SAKIP, dan Standar Operasional Prosedur (SOP)',
            'types' => ['regulation', 'guideline', 'sop'],
        ],
        'panduan' => [
            'label' => 'Panduan & Edukasi',
            'icon' => 'GraduationCap',
            'description' => 'Mencakup Video Tutorial Interaktif, Panduan Tata Cara Sistem, dan Tanya Jawab (FAQ) SAKIP',
            'types' => ['video_tutorial', 'tutorial', 'faq'],
        ],
        'publikasi' => [
            'label' => 'Publikasi & Layanan',
            'icon' => 'Newspaper',
            'description' => 'Mencakup Berita & Pengumuman Kinerja Daerah serta Tautan Aplikasi Pendukung',
            'types' => ['news', 'external_link'],
        ],
    ];

    public const TYPE_LABEL = [
        'regulation' => 'Regulasi',
        'guideline' => 'Pedoman',
        'sop' => 'SOP',
        'video_tutorial' => 'Video Tutorial',
        'tutorial' => 'Tutorial',
        'faq' => 'FAQ',
        'news' => 'Berita/Pengumuman',
        'external_link' => 'Tautan Aplikasi Pendukung',
    ];

    /**
     * Landing publik (guest): hanya dokumen published + access public (FR-KB-008).
     */
    public function publicIndex(Request $request): Response
    {
        $kategori = $request->string('kategori')->trim()->toString() ?: null;
        $documentType = $request->string('document_type')->trim()->toString() ?: null;
        $category = $request->string('category')->trim()->toString() ?: null;
        $search = $request->string('search')->trim()->toString() ?: null;

        // Auto-assign kategori jika document_type dipilih tapi kategori belum di-set
        if ($documentType && ! $kategori) {
            foreach (self::KATEGORI as $catKey => $catData) {
                if (in_array($documentType, $catData['types'], true)) {
                    $kategori = $catKey;
                    break;
                }
            }
        }

        // Validasi kategori
        if ($kategori && ! array_key_exists($kategori, self::KATEGORI) && $kategori !== 'semua') {
            $kategori = null;
        }

        // Jika kategori aktif dan document_type tidak cocok dengan kategori, reset document_type
        if ($kategori && $kategori !== 'semua' && $documentType) {
            if (! in_array($documentType, self::KATEGORI[$kategori]['types'], true)) {
                $documentType = null;
            }
        }

        // Tentukan filter jenis dokumen
        $filterTypes = null;
        if ($documentType) {
            $filterTypes = [$documentType];
        } elseif ($kategori && $kategori !== 'semua') {
            $filterTypes = self::KATEGORI[$kategori]['types'];
        }

        $documents = KnowledgeDocument::query()
            ->where('status', 'published')
            ->where('access', 'public')
            ->when($search, function ($q) use ($search) {
                $q->where(function ($sub) use ($search) {
                    $sub->where('title', 'like', "%{$search}%")
                        ->orWhere('content', 'like', "%{$search}%")
                        ->orWhere('tags', 'like', "%{$search}%");
                });
            })
            ->when($filterTypes, fn ($q) => $q->whereIn('document_type', $filterTypes))
            ->when($category, fn ($q) => $q->where('category', $category))
            ->orderByDesc('published_at')
            ->paginate($request->integer('per_page', 12))
            ->withQueryString();

        $kategoriList = collect(self::KATEGORI)->map(fn ($v, $k) => [
            'key' => $k,
            'label' => $v['label'],
            'icon' => $v['icon'],
            'description' => $v['description'] ?? '',
            'subItems' => collect($v['types'])->map(fn ($t) => [
                'key' => $t,
                'label' => self::TYPE_LABEL[$t] ?? ucfirst($t),
            ])->values()->all(),
        ])->values()->all();

        return Inertia::render('Knowledge/PublicIndex', [
            'documents' => $documents,
            'kategori' => $kategori,
            'activeType' => $documentType,
            'kategoriList' => $kategoriList,
            'filters' => [
                'search' => $search,
                'document_type' => $documentType,
                'category' => $category,
                'per_page' => $request->input('per_page'),
                'kategori' => $kategori,
            ],
            'categories' => KnowledgeDocument::query()
                ->where('status', 'published')
                ->where('access', 'public')
                ->whereNotNull('category')
                ->distinct()
                ->orderBy('category')
                ->pluck('category'),
        ]);
    }

    /**
     * Detail dokumen publik (guest). Dokumen internal tidak pernah tampil publik (FR-KB-008).
     */
    public function publicShow(KnowledgeDocument $document): Response
    {
        abort_unless($document->status === 'published' && $document->access === 'public', 404);

        return Inertia::render('Knowledge/PublicShow', [
            'document' => $document->load('publisher:id,name'),
        ]);
    }

    public function publicDownload(KnowledgeDocument $document): StreamedResponse
    {
        abort_unless($document->status === 'published' && $document->access === 'public', 404);

        if (! $document->file_path || ! Storage::disk('local')->exists($document->file_path)) {
            abort(404);
        }

        $this->audit->log('download_public', 'knowledge_document', $document->id, null);

        return Storage::disk('local')->download($document->file_path, $document->title);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorize('manage-knowledge');

        if ($request->filled('external_url')) {
            $request->merge([
                'external_url' => $this->normalizeExternalUrl($request->input('external_url')),
            ]);
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'document_type' => ['required', 'string', 'in:regulation,sop,faq,tutorial,news,guideline,video_tutorial,external_link'],
            'category' => ['nullable', 'string', 'max:50'],
            'content' => ['nullable', 'string'],
            'tags' => ['nullable', 'string'],
            'access' => ['required', 'string', 'in:internal,public'],
            'external_url' => ['nullable', 'url', 'max:500'],
            'file' => ['nullable', 'file', 'max:10240', 'mimes:pdf,doc,docx,xls,xlsx,pptx,jpg,jpeg,png'],
        ]);

        $filePath = $this->storeFile($request, 'file', 'knowledge');

        $document = KnowledgeDocument::create([
            ...collect($validated)->except(['file'])->all(),
            'tags' => $validated['tags'] ?? null,
            'file_path' => $filePath,
            'version' => 1,
            'status' => 'draft',
        ]);

        return redirect()
            ->route('knowledge.index')
            ->with('success', 'Dokumen berhasil ditambahkan sebagai draft.');
    }

    public function edit(KnowledgeDocument $document): Response
    {
        $this->authorize('manage-knowledge');

        return Inertia::render('Knowledge/Edit', [
            'document' => [
                'id' => $document->id,
                'title' => $document->title,
                'document_type' => $document->document_type,
                'category' => $document->category,
                'content' => $document->content,
                'tags' => $document->tags,
                'access' => $document->access,
                'version' => $document->version,
                'status' => $document->status,
                'file_path' => $document->file_path,
                'external_url' => $document->external_url,
            ],
        ]);
    }

    public function update(Request $request, KnowledgeDocument $document): RedirectResponse
    {
        $this->authorize('manage-knowledge');

        if ($request->filled('external_url')) {
            $request->merge([
                'external_url' => $this->normalizeExternalUrl($request->input('external_url')),
            ]);
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'document_type' => ['required', 'string', 'in:regulation,sop,faq,tutorial,news,guideline,video_tutorial,external_link'],
            'category' => ['nullable', 'string', 'max:50'],
            'content' => ['nullable', 'string'],
            'tags' => ['nullable', 'string'],
            'access' => ['required', 'string', 'in:internal,public'],
            'external_url' => ['nullable', 'url', 'max:500'],
            'file' => ['nullable', 'file', 'max:10240', 'mimes:pdf,doc,docx,xls,xlsx,pptx,jpg,jpeg,png'],
            'publish' => ['boolean'],
        ]);

        $filePath = $this->storeFile($request, 'file', 'knowledge');

        $document->update([
            ...collect($validated)->except(['file', 'publish'])->all(),
            'file_path' => $filePath ?? $document->file_path,
            'version' => $document->version + 1,
        ]);

        if (! empty($validated['publish'])) {
            $this->publishInternal($document);
        }

        $this->audit->log('update', 'knowledge_document', $document->id, null);

        return back()->with('success', 'Dokumen diperbarui.');
    }

    public function publish(KnowledgeDocument $document): RedirectResponse
    {
        $this->authorize('publish-knowledge');

        $this->publishInternal($document);

        $this->audit->log('publish', 'knowledge_document', $document->id, null);

        return back()->with('success', 'Dokumen dipublikasikan.');
    }

    public function unpublish(KnowledgeDocument $document): RedirectResponse
    {
        $this->authorize('publish-knowledge');

        $document->update(['status' => 'draft', 'published_at' => null]);

        $this->audit->log('unpublish', 'knowledge_document', $document->id, null);

        return back()->with('success', 'Dokumen diturunkan.');
    }

    public function destroy(KnowledgeDocument $document): RedirectResponse
    {
        $this->authorize('manage-knowledge');

        if ($document->file_path) {
            Storage::disk('local')->delete($document->file_path);
        }

        $document->delete();

        $this->audit->log('delete', 'knowledge_document', $document->id, null);

        return back()->with('success', 'Dokumen dihapus.');
    }

    public function download(KnowledgeDocument $document): StreamedResponse
    {
        $this->authorize('view-knowledge');

        if ($document->status !== 'published' && $document->access === 'internal') {
            abort(403);
        }

        if (! $document->file_path || ! Storage::disk('local')->exists($document->file_path)) {
            abort(404);
        }

        $this->audit->log('download', 'knowledge_document', $document->id, null);

        return Storage::disk('local')->download($document->file_path, $document->title);
    }

    private function publishInternal(KnowledgeDocument $document): void
    {
        $document->update([
            'status' => 'published',
            'published_by' => request()->user()->id,
            'published_at' => now(),
        ]);
    }

    private function storeFile(Request $request, string $field, string $directory): ?string
    {
        if (! $request->hasFile($field)) {
            return null;
        }

        $file = $request->file($field);
        $extension = $file->getClientOriginalExtension();
        $key = sprintf(
            '%s/%s_%s.%s',
            $directory,
            now()->format('YmdHis'),
            substr(md5(uniqid((string) mt_rand(), true)), 0, 12),
            $extension,
        );

        Storage::disk('local')->put($key, $file->get());

        return $key;
    }

    private function normalizeExternalUrl(?string $url): ?string
    {
        if (! $url) {
            return null;
        }

        $trimmed = trim($url);

        // If user pasted an iframe tag, extract the src attribute
        if (preg_match('/src=["\']([^"\']+)["\']/i', $trimmed, $m)) {
            $trimmed = $m[1];
        }

        // If user pasted without protocol (e.g. youtube.com/...), only prepend https:// if it contains a domain dot
        if (! preg_match('#^https?://#i', $trimmed) && str_contains($trimmed, '.')) {
            $trimmed = 'https://'.$trimmed;
        }

        return $trimmed;
    }
}
