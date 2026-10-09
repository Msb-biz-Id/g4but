<?php

namespace App\Http\Controllers\Planning;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\PerformancePeriod;
use App\Models\PlanningDocument;
use App\Services\AuditService;
use App\Services\AuthorizationService;
use App\Services\NotificationService;
use App\Services\SakipDocumentService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PlanningDocumentController extends Controller
{
    // ── BR-004: Whitelist tipe dokumen (baseline MOD-001 & MOD-003) ─────────
    private const ALLOWED_TYPES = [
        'rpjmd', 'renstra', 'rkpd', 'renja', 'rkt',
        'perjanjian_kinerja', 'pk',
        'dpa', 'rencana_aksi',
        'pohon_kinerja', 'cascading', 'proses_bisnis',
        'manajemen_risiko', 'crosscutting',
        'iku', 'target_indikator',
        'laporan_kinerja', 'lkjip', 'laporan_realisasi',
        'evaluasi_sakip', 'lhe',
        'pedoman_teknis',
    ];

    // BR-003: Tipe yang hanya boleh diupload oleh Bappeda Provinsi
    private const BAPPEDA_ONLY_TYPES = ['rpjmd', 'rkpd'];

    // BR-004: Format file dan ukuran maksimum
    private const ALLOWED_MIMES = 'pdf,xlsx,xls,docx,doc,pptx,ppt,zip';

    private const MAX_FILE_KB = 20480; // 20 MB

    // Label tampilan frontend
    public const TYPE_LABELS = [
        'rpjmd' => 'RPJMD',
        'renstra' => 'Renstra',
        'rkpd' => 'RKPD',
        'renja' => 'Renja',
        'rkt' => 'Rencana Kinerja Tahunan (RKT)',
        'perjanjian_kinerja' => 'Perjanjian Kinerja (PK)',
        'dpa' => 'DPA',
        'rencana_aksi' => 'Rencana Aksi',
        'pohon_kinerja' => 'Pohon Kinerja',
        'cascading' => 'Cascading Kinerja',
        'proses_bisnis' => 'Proses Bisnis (Probis)',
        'manajemen_risiko' => 'Manajemen Risiko',
        'crosscutting' => 'Cross-cutting Kinerja',
        'iku' => 'IKU',
        'target_indikator' => 'Target Indikator',
        'laporan_kinerja' => 'Laporan Kinerja (LKjIP)',
        'laporan_realisasi' => 'Laporan Realisasi',
        'evaluasi_sakip' => 'Evaluasi SAKIP (LHE)',
        'pk' => 'Perjanjian Kinerja (PK)',
        'lkjip' => 'Laporan Kinerja (LKjIP)',
        'lhe' => 'Evaluasi SAKIP (LHE)',
        'pedoman_teknis' => 'Pedoman Teknis Perencanaan',
    ];

    public function __construct(
        private readonly AuthorizationService $authorization,
        private readonly AuditService $audit,
        private readonly NotificationService $notifications,
    ) {}

    public function index(Request $request): Response
    {
        $this->authorize('view-planning-docs');

        $accessibleOrgIds = $this->authorization->accessibleOrganizationIds($request->user());

        $docs = PlanningDocument::query()
            ->with(['organization:id,code,name,type', 'createdBy:id,name'])
            ->when($request->filled('type'), function ($q) use ($request) {
                $type = $request->string('type')->toString();
                if ($type === 'perjanjian_kinerja') {
                    $q->whereIn('type', ['perjanjian_kinerja', 'pk']);
                } elseif ($type === 'laporan_kinerja') {
                    $q->whereIn('type', ['laporan_kinerja', 'lkjip']);
                } elseif ($type === 'evaluasi_sakip') {
                    $q->whereIn('type', ['evaluasi_sakip', 'lhe']);
                } else {
                    $q->where('type', $type);
                }
            })
            ->when($request->filled('organization_id'), fn ($q) => $q->where('organization_id', $request->integer('organization_id')))
            ->when($request->filled('year'), fn ($q) => $q->where('year', $request->integer('year')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            // G-17: filter periode_type
            ->when($request->filled('periode_type'), fn ($q) => $q->where('periode_type', $request->string('periode_type')))
            ->whereIn('organization_id', $accessibleOrgIds)
            ->orderByDesc('year')
            ->orderBy('type')
            ->paginate($request->integer('per_page', 25))
            ->withQueryString();

        return Inertia::render('Planning/Documents/Index', [
            'documents' => $docs,
            'filters' => $request->only(['type', 'organization_id', 'year', 'status', 'periode_type']),
            'organizations' => Organization::query()
                ->whereIn('id', $accessibleOrgIds)
                ->orderBy('code')
                ->get(['id', 'code', 'name', 'type']),
            'types' => collect(self::TYPE_LABELS)
                ->except(['pk', 'lkjip', 'lhe'])
                ->map(fn ($label, $value) => compact('value', 'label'))
                ->values(),
            'statuses' => [
                ['value' => 'draft',    'label' => 'Draft'],
                ['value' => 'approved', 'label' => 'Disetujui'],
            ],
            // G-17: Super Admin bisa ubah periode_type
            'canManage' => $request->user()->hasRole('Super Admin'),
            'isProvincialAdmin' => $request->user()->hasRole('Super Admin')
                || $request->user()->hasRole('Admin Provinsi')
                || $request->user()->hasRole('Evaluator Provinsi')
                || $request->user()->hasPermission('planning:review')
                || $request->user()->hasPermission('planning:approve')
                || $request->user()->hasPermission('agreement:approve'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorize('manage-planning-docs');

        $validated = $this->validateDocument($request);

        if (! $this->authorization->canAccessOrganization($request->user(), (int) $validated['organization_id'])) {
            abort(403, 'Di luar lingkup organisasi Anda.');
        }

        // BR-003: Hanya org type=bappeda yang boleh upload RPJMD / RKPD
        $this->checkBappedaRestriction($request, $validated['type'], $validated['organization_id'] ?? null);

        // Upload file (BR-004)
        $filePath = $this->handleFileUpload($request);

        $perfPeriod = PerformancePeriod::where('year', $validated['year'])->first()
            ?? PerformancePeriod::orderByDesc('year')->first();

        $isLimaTahunan = in_array($validated['type'], ['rpjmd', 'renstra'], true)
            || ($validated['periode_type'] ?? '') === '5_tahunan'
            || ($validated['periode_type'] ?? '') === 'lima_tahunan';

        $startYear = (int) ($validated['start_year'] ?? $validated['year']);
        $endYear = (int) ($validated['end_year'] ?? ($isLimaTahunan ? $startYear + 4 : $startYear));
        if ($isLimaTahunan && $endYear <= $startYear) {
            $endYear = $startYear + 4;
        }

        $doc = PlanningDocument::create([
            ...$validated,
            'performance_period_id' => $perfPeriod?->id,
            'start_year' => $startYear,
            'end_year' => $endYear,
            'file_path' => $filePath,
            'status' => 'review',
            'created_by' => $request->user()->id,
        ]);

        $this->audit->log('create', 'planning_document', $doc->id, $validated['organization_id'] ?? null);
        $doc->load('organization');
        $this->notifications->notifyDocumentSubmitted($doc);

        return redirect()->route('planning.docs.index')
            ->with('success', "Dokumen {$validated['type']} berhasil diunggah dan menunggu validasi.");
    }

    public function update(Request $request, PlanningDocument $document): RedirectResponse
    {
        $this->authorize('manage-planning-docs');

        if (! $this->authorization->canAccessOrganization($request->user(), (int) $document->organization_id)) {
            abort(403, 'Di luar lingkup organisasi Anda.');
        }

        if ($document->status === 'approved') {
            return back()->withErrors(['status' => 'Dokumen yang sudah disetujui tidak dapat diubah.']);
        }

        $validated = $this->validateDocument($request, $document->id);

        if (! $this->authorization->canAccessOrganization($request->user(), (int) $validated['organization_id'])) {
            abort(403, 'Di luar lingkup organisasi Anda.');
        }

        // BR-003: Cek Bappeda saat update
        $this->checkBappedaRestriction($request, $validated['type'], $validated['organization_id'] ?? null);

        // Ganti file jika ada upload baru (BR-004)
        if ($request->hasFile('file')) {
            if ($document->file_path) {
                Storage::delete($document->file_path);
            }
            $validated['file_path'] = $this->handleFileUpload($request);
        }

        $isLimaTahunan = in_array($validated['type'], ['rpjmd', 'renstra'], true)
            || ($validated['periode_type'] ?? '') === '5_tahunan'
            || ($validated['periode_type'] ?? '') === 'lima_tahunan';

        if ($isLimaTahunan) {
            $startYear = (int) ($validated['start_year'] ?? $validated['year']);
            $endYear = (int) ($validated['end_year'] ?? ($startYear + 4));
            if ($endYear <= $startYear) {
                $endYear = $startYear + 4;
            }
            $validated['start_year'] = $startYear;
            $validated['end_year'] = $endYear;
        }

        $document->update($validated);
        SakipDocumentService::clearDashboardCache();

        $this->audit->log('update', 'planning_document', $document->id, $document->organization_id);

        return redirect()->route('planning.docs.index')->with('success', 'Dokumen perencanaan diperbarui.');
    }

    public function approve(PlanningDocument $document): RedirectResponse
    {
        $this->authorize('manage-planning-docs');

        $reviewer = request()->user();
        $canApprove = $reviewer && (
            $reviewer->hasRole('Super Admin')
            || $reviewer->hasRole('Admin Provinsi')
            || $reviewer->hasRole('Evaluator Provinsi')
            || $reviewer->hasPermission('planning:review')
            || $reviewer->hasPermission('planning:approve')
            || $reviewer->hasPermission('agreement:approve')
        );

        if (! $canApprove) {
            abort(403, 'Anda tidak memiliki hak akses untuk menyetujui dokumen perencanaan.');
        }

        $isProvincial = $reviewer->hasRole('Super Admin')
            || $reviewer->hasRole('Admin Provinsi')
            || $reviewer->hasRole('Evaluator Provinsi');

        if (! $isProvincial && ! $this->authorization->canAccessOrganization($reviewer, (int) $document->organization_id)) {
            abort(403, 'Di luar lingkup organisasi Anda.');
        }

        if (! in_array($document->status, ['draft', 'review'], true)) {
            return back()->withErrors(['status' => 'Hanya dokumen draft atau menunggu review yang dapat disetujui.']);
        }

        $document->update([
            'status' => 'approved',
            'approved_by' => $reviewer->id,
            'approved_at' => now(),
        ]);

        SakipDocumentService::clearDashboardCache();

        $this->audit->log('approve', 'planning_document', $document->id, $document->organization_id);
        $document->load('organization');
        $this->notifications->notifyDocumentApproved($document, $reviewer);

        return back()->with('success', 'Dokumen disetujui dan dapat diakses publik.');
    }

    public function destroy(PlanningDocument $document): RedirectResponse
    {
        $this->authorize('manage-planning-docs');

        if (! $this->authorization->canAccessOrganization(request()->user(), (int) $document->organization_id)) {
            abort(403, 'Di luar lingkup organisasi Anda.');
        }

        if ($document->status === 'approved') {
            return back()->withErrors(['status' => 'Dokumen yang sudah disetujui tidak dapat dihapus.']);
        }

        if ($document->file_path) {
            Storage::delete($document->file_path);
        }

        $this->audit->log('delete', 'planning_document', $document->id, $document->organization_id);
        $document->delete();

        SakipDocumentService::clearDashboardCache();

        return redirect()->route('planning.docs.index')->with('success', 'Dokumen perencanaan dihapus.');
    }

    // ── Private Helpers ────────────────────────────────────────────────────────

    /**
     * Validasi input dokumen dengan BR-004 (whitelist tipe + format file).
     */
    private function validateDocument(Request $request, ?int $ignoreId = null): array
    {
        $validated = $request->validate([
            'type' => ['required', 'string', Rule::in(self::ALLOWED_TYPES)],
            'title' => ['required', 'string', 'max:255'],
            'organization_id' => ['required', 'integer', 'exists:organizations,id'],
            'year' => ['required', 'integer', 'min:2000', 'max:2099'],
            'description' => ['nullable', 'string', 'max:2000'],
            // G-17: Super Admin bisa set manual, otherwise otomatis
            'periode_type' => ['nullable', 'string', Rule::in(['5_tahunan', 'tahunan'])],
            // File wajib saat create, opsional saat update — BR-004
            'file' => [
                $ignoreId ? 'nullable' : 'required',
                'file',
                'mimes:'.self::ALLOWED_MIMES,
                'max:'.self::MAX_FILE_KB,
            ],
        ], [
            'type.in' => 'Tipe dokumen tidak valid. Pilih dari 12 jenis yang tersedia.',
            'file.mimes' => 'Format tidak diizinkan. Gunakan PDF, Excel, Word, PowerPoint, atau ZIP.',
            'file.max' => 'Ukuran file maksimal 20 MB.',
            'file.required' => 'File dokumen wajib diunggah.',
        ]);

        // G-17: Otomatis set periode_type berdasarkan tipe dokumen (jika tidak diisi manual)
        if (empty($validated['periode_type'])) {
            $validated['periode_type'] = in_array($validated['type'], ['rpjmd', 'renstra'], true)
                ? '5_tahunan'
                : 'tahunan';
        }

        return $validated;
    }

    /**
     * BR-003: RPJMD & RKPD hanya boleh diupload oleh org bertipe 'bappeda'.
     * Super Admin dikecualikan dari pembatasan ini.
     */
    private function checkBappedaRestriction(Request $request, string $type, ?int $organizationId): void
    {
        if (! in_array($type, self::BAPPEDA_ONLY_TYPES, true)) {
            return;
        }

        if ($request->user()->hasRole('Super Admin')) {
            return;
        }

        if (! $organizationId) {
            abort(403, 'RPJMD dan RKPD hanya dapat diunggah oleh Bappeda Provinsi.');
        }

        $org = Organization::select('id', 'type', 'is_bappeda', 'name', 'code')->find($organizationId);

        $isBappeda = $org && (
            $org->is_bappeda ||
            strtolower($org->type ?? '') === 'bappeda' ||
            str_contains(strtolower($org->name), 'bappeda') ||
            str_contains(strtoupper($org->code), 'BAPPEDA')
        );

        if (! $isBappeda) {
            abort(403, 'RPJMD dan RKPD hanya dapat diunggah oleh Bappeda Provinsi (BR-003).');
        }
    }

    /**
     * Upload file ke storage/planning-documents/{year}/{type}/
     * Kembalikan path relatif untuk disimpan di DB.
     */
    private function handleFileUpload(Request $request): ?string
    {
        if (! $request->hasFile('file')) {
            return null;
        }

        $year = $request->integer('year', now()->year);
        $type = $request->string('type', 'doc')->toString();
        $path = $request->file('file')->store("planning-documents/{$year}/{$type}", 'local');

        return $path ?: null;
    }
}
