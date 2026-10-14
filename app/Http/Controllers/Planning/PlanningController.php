<?php

namespace App\Http\Controllers\Planning;

use App\Http\Controllers\Controller;
use App\Models\ActionPlan;
use App\Models\Agreement;
use App\Models\AppConfig;
use App\Models\CascadingRelation;
use App\Models\CrosscuttingRelation;
use App\Models\Indicator;
use App\Models\Organization;
use App\Models\PerformancePeriod;
use App\Models\PlanningDocument;
use App\Models\PlanningTree;
use App\Models\Risk;
use App\Models\User;
use App\Services\AuthorizationService;
use App\Services\NotificationService;
use App\Services\SakipDocumentService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PlanningController extends Controller
{
    public function __construct(
        private readonly NotificationService $notifications,
        private readonly AuthorizationService $authorization,
    ) {}

    public function index(Request $request): Response
    {
        $stats = [
            'documents' => $this->safeCount(PlanningDocument::class),
            'treeCount' => $this->safeCount(PlanningTree::class),
            'rootTrees' => $this->safeCount(PlanningTree::class, fn ($q) => $q->whereNull('parent_id')),
            'agreements' => $this->safeCount(Agreement::class),
            'actionPlans' => $this->safeCount(ActionPlan::class),
            'crosscutting' => 0,
            'risks' => $this->safeCount(Risk::class),
            'cascading' => 0,
        ];

        $recentDocuments = $this->safeQuery(
            fn () => PlanningDocument::with(['organization', 'performancePeriod'])
                ->latest()
                ->limit(5)
                ->get()
        );

        $recentRisks = $this->safeQuery(
            fn () => Risk::with('organization')
                ->latest()
                ->limit(5)
                ->get()
        );

        return Inertia::render('Planning/Index', compact('stats', 'recentDocuments', 'recentRisks'));
    }

    public function documents(Request $request): Response
    {
        $user = $request->user();
        $isOpdAdmin = $user && $user->isOpdAdmin();
        $accessibleOrgIds = $this->authorization->accessibleOrganizationIds($user);

        $query = PlanningDocument::with(['organization', 'performancePeriod'])->latest();

        if (! $isOpdAdmin) {
            $query->whereIn('organization_id', $accessibleOrgIds);
        }

        if ($request->type) {
            $query->where('type', $request->type);
        }
        if ($request->status) {
            $query->where('status', $request->status);
        }
        if ($request->organization) {
            $query->where(function ($sub) use ($request) {
                if (is_numeric($request->organization)) {
                    $sub->where('organization_id', (int) $request->organization);
                } else {
                    $sub->whereHas('organization', fn ($q) => $q->where('code', $request->organization));
                }
            });
        }
        if ($request->period) {
            $query->where(function ($sub) use ($request) {
                if (is_numeric($request->period)) {
                    $sub->where('performance_period_id', (int) $request->period)
                        ->orWhere('year', (int) $request->period);
                }
            });
        }

        $documents = $query->paginate($request->integer('per_page', 25))->withQueryString();
        $organizations = Organization::query()
            ->when(! $isOpdAdmin, fn ($q) => $q->whereIn('id', $accessibleOrgIds))
            ->orderBy('name')
            ->get(['id', 'code', 'name', 'short_name']);
        $periods = PerformancePeriod::orderByDesc('year')->get(['id', 'year']);
        $documentTypes = [
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
            'pedoman_teknis' => 'Pedoman Teknis Perencanaan',
        ];
        $filters = $request->only(['type', 'status', 'organization', 'period']);
        $canApprove = $user->hasRole('Super Admin')
            || $user->hasRole('Kepala OPD')
            || $user->hasPermission('planning:review')
            || $user->hasPermission('planning:approve')
            || $user->hasPermission('agreement:approve');
        $canLock = $user->hasRole('Super Admin')
            || $user->isOpdAdmin()
            || $user->hasPermission('planning:review')
            || $user->hasPermission('planning:approve')
            || $user->hasPermission('agreement:approve');

        return Inertia::render('Planning/Documents', compact(
            'documents', 'organizations', 'periods', 'documentTypes', 'filters', 'canApprove', 'canLock'
        ));
    }

    public function storeDocument(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'organization_id' => 'required|exists:organizations,id',
            'performance_period_id' => 'required|exists:performance_periods,id',
            'type' => 'required|in:renstra,rkpd,renja,rkt,perjanjian_kinerja,pk,dpa,rencana_aksi,pohon_kinerja,cascading,proses_bisnis,manajemen_risiko,crosscutting,iku,pedoman_teknis',
            'title' => 'required|string|max:300',
            'description' => 'nullable|string|max:1000',
            'document_number' => 'nullable|string|max:100',
            'issued_at' => 'nullable|date',
            'document_year' => ['nullable', 'string', 'max:25', 'regex:/^(\d{4})(\s*-\s*\d{4})?$/'],
            'start_year' => 'nullable|integer|min:1990|max:2100',
            'end_year' => 'nullable|integer|min:1990|max:2100',
            'file' => 'nullable|file|mimes:pdf|max:20480',
        ], [
            'document_year.regex' => 'Format tahun tidak valid. Gunakan angka tahun (cth: 2025) atau rentang tahun tanpa spasi (cth: 2025-2029).',
        ]);

        $this->authorization->canAccessOrganization($request->user(), (int) $data['organization_id'])
            ?: abort(403, 'Di luar lingkup organisasi Anda.');

        $docYear = trim((string) ($data['document_year'] ?? ''));
        unset($data['document_year']);

        $isLimaTahunan = $data['type'] === 'renstra' || ($data['periode_type'] ?? '') === '5_tahunan';

        if ($docYear !== '') {
            if (preg_match('/^(\d{4})\s*-\s*(\d{4})$/', $docYear, $matches)) {
                $start = (int) $matches[1];
                $end = (int) $matches[2];
                if ($start > $end) {
                    [$start, $end] = [$end, $start];
                }
                $data['start_year'] = $start;
                $data['end_year'] = $end;
            } elseif (preg_match('/^(\d{4})$/', $docYear, $matches)) {
                $yearVal = (int) $matches[1];
                $data['start_year'] = $yearVal;
                if (! $isLimaTahunan) {
                    $data['end_year'] = $yearVal;
                }
            }
        }

        $filePath = null;
        if ($request->hasFile('file')) {
            $filePath = $request->file('file')->store('planning/documents', 'local');
        }

        try {
            $doc = null;
            DB::transaction(function () use ($data, $filePath, $isLimaTahunan, &$doc) {
                unset($data['file']);
                $period = PerformancePeriod::find($data['performance_period_id']);
                $year = $period?->year ?? ($data['start_year'] ?? (int) date('Y'));
                $startYear = (int) ($data['start_year'] ?? $year);
                $endYear = (int) ($data['end_year'] ?? ($isLimaTahunan ? $startYear + 4 : $startYear));
                if ($isLimaTahunan && $endYear <= $startYear && ! isset($data['end_year'])) {
                    $endYear = $startYear + 4;
                }

                $doc = PlanningDocument::create($data + [
                    'year' => $year,
                    'start_year' => $startYear,
                    'end_year' => $endYear,
                    'periode_type' => ($endYear > $startYear || $isLimaTahunan) ? '5_tahunan' : 'tahunan',
                    'status' => $filePath ? 'review' : 'draft',
                    'created_by' => Auth::id(),
                    'file_path' => $filePath,
                ]);
            });
            // Send notification to Admin Pemprov/Super Admin
            if ($doc) {
                $doc->load('organization');
                $this->notifications->notifyDocumentSubmitted($doc);
            }
        } catch (\Throwable $e) {
            if ($filePath) {
                Storage::disk('local')->delete($filePath);
            }
            throw $e;
        }

        SakipDocumentService::clearDashboardCache();

        return back()->with('success', 'Dokumen berhasil ditambahkan.');
    }

    public function updateDocument(Request $request, PlanningDocument $document): RedirectResponse
    {
        $document->ensureNotLocked();

        $data = $request->validate([
            'organization_id' => 'required|exists:organizations,id',
            'performance_period_id' => 'required|exists:performance_periods,id',
            'type' => 'required|in:renstra,rkpd,renja,rkt,perjanjian_kinerja,pk,dpa,rencana_aksi,pohon_kinerja,cascading,proses_bisnis,manajemen_risiko,crosscutting,iku,pedoman_teknis',
            'title' => 'required|string|max:300',
            'description' => 'nullable|string|max:1000',
            'document_number' => 'nullable|string|max:100',
            'issued_at' => 'nullable|date',
            'document_year' => ['nullable', 'string', 'max:25', 'regex:/^(\d{4})(\s*-\s*\d{4})?$/'],
            'start_year' => 'nullable|integer|min:1990|max:2100',
            'end_year' => 'nullable|integer|min:1990|max:2100',
            'file' => 'nullable|file|mimes:pdf|max:20480',
        ], [
            'document_year.regex' => 'Format tahun tidak valid. Gunakan angka tahun (cth: 2025) atau rentang tahun tanpa spasi (cth: 2025-2029).',
        ]);

        $this->authorization->canAccessOrganization($request->user(), (int) $document->organization_id)
            ?: abort(403, 'Di luar lingkup organisasi Anda.');
        $this->authorization->canAccessOrganization($request->user(), (int) $data['organization_id'])
            ?: abort(403, 'Di luar lingkup organisasi Anda.');

        $docYear = trim((string) ($data['document_year'] ?? ''));
        unset($data['document_year']);

        $isLimaTahunan = $data['type'] === 'renstra' || ($data['periode_type'] ?? '') === '5_tahunan';

        if ($docYear !== '') {
            if (preg_match('/^(\d{4})\s*-\s*(\d{4})$/', $docYear, $matches)) {
                $start = (int) $matches[1];
                $end = (int) $matches[2];
                if ($start > $end) {
                    [$start, $end] = [$end, $start];
                }
                $data['start_year'] = $start;
                $data['end_year'] = $end;
            } elseif (preg_match('/^(\d{4})$/', $docYear, $matches)) {
                $yearVal = (int) $matches[1];
                $data['start_year'] = $yearVal;
                if (! $isLimaTahunan) {
                    $data['end_year'] = $yearVal;
                }
            }
        }

        $period = PerformancePeriod::find($data['performance_period_id']);
        if ($period) {
            $data['year'] = $period->year;
        }

        if (isset($data['start_year'])) {
            $startYear = (int) $data['start_year'];
            $endYear = (int) ($data['end_year'] ?? ($isLimaTahunan ? $startYear + 4 : $startYear));
            if ($isLimaTahunan && $endYear <= $startYear && ! isset($data['end_year'])) {
                $endYear = $startYear + 4;
            }
            $data['start_year'] = $startYear;
            $data['end_year'] = $endYear;
            $data['periode_type'] = ($endYear > $startYear || $isLimaTahunan) ? '5_tahunan' : 'tahunan';
        } elseif ($isLimaTahunan) {
            $startYear = (int) ($document->start_year ?? ($data['year'] ?? $document->year));
            $endYear = (int) ($document->end_year ?? ($startYear + 4));
            if ($endYear <= $startYear) {
                $endYear = $startYear + 4;
            }
            $data['start_year'] = $startYear;
            $data['end_year'] = $endYear;
            $data['periode_type'] = '5_tahunan';
        }

        if ($request->hasFile('file')) {
            $oldPath = $document->file_path;
            $newPath = $request->file('file')->store('planning/documents', 'local');
            $data['file_path'] = $newPath;
            if ($oldPath && Storage::disk('local')->exists($oldPath)) {
                Storage::disk('local')->delete($oldPath);
            }
        } else {
            unset($data['file']);
        }

        DB::transaction(function () use ($document, $data) {
            $document->update($data + ['updated_by' => Auth::id()]);
        });

        SakipDocumentService::clearDashboardCache();

        return back()->with('success', 'Dokumen berhasil diperbarui.');
    }

    public function uploadDocument(Request $request, PlanningDocument $document): RedirectResponse
    {
        $document->ensureNotLocked();
        $this->authorization->canAccessOrganization($request->user(), (int) $document->organization_id)
            ?: abort(403, 'Di luar lingkup organisasi Anda.');

        $request->validate(['file' => 'required|file|mimes:pdf|max:20480']);

        $oldPath = $document->file_path;
        $path = $request->file('file')->store('planning/documents', 'local');

        try {
            DB::transaction(function () use ($document, $path) {
                $document->update([
                    'file_path' => $path,
                    'status' => 'review',
                ]);
            });
        } catch (\Throwable $e) {
            Storage::disk('local')->delete($path);
            throw $e;
        }

        if ($oldPath && Storage::disk('local')->exists($oldPath)) {
            Storage::disk('local')->delete($oldPath);
        }

        SakipDocumentService::clearDashboardCache();

        $document->load('organization');
        $this->notifications->notifyDocumentSubmitted($document);

        return back()->with('success', 'File berhasil diunggah dan menunggu validasi.');
    }

    public function submitDocument(PlanningDocument $document): RedirectResponse
    {
        $document->ensureNotLocked();
        $this->authorization->canAccessOrganization(Auth::user(), (int) $document->organization_id)
            ?: abort(403, 'Di luar lingkup organisasi Anda.');

        DB::transaction(function () use ($document) {
            $document->update(['status' => 'review', 'updated_by' => Auth::id()]);
        });

        $document->load('organization');
        $this->notifications->notifyDocumentSubmitted($document);

        return back()->with('success', 'Dokumen diajukan untuk review.');
    }

    public function approveDocument(PlanningDocument $document): RedirectResponse
    {
        /** @var User|null $reviewer */
        $reviewer = Auth::user();
        $canApprove = $reviewer && (
            $reviewer->hasRole('Super Admin')
            || $reviewer->hasRole('Kepala OPD')
            || $reviewer->hasPermission('planning:review')
            || $reviewer->hasPermission('planning:approve')
            || $reviewer->hasPermission('agreement:approve')
        );
        if (! $canApprove) {
            abort(403, 'Anda tidak memiliki hak akses untuk menyetujui dokumen perencanaan.');
        }

        $isProvincial = $reviewer->hasRole('Super Admin')
            || $reviewer->hasRole('Kepala OPD');

        if (! $isProvincial && ! $this->authorization->canAccessOrganization($reviewer, (int) $document->organization_id)) {
            abort(403, 'Di luar lingkup organisasi Anda.');
        }

        DB::transaction(function () use ($document, $reviewer) {
            $document->update([
                'status' => 'approved',
                'approved_by' => $reviewer->id,
                'approved_at' => now(),
                'updated_by' => $reviewer->id,
            ]);
        });

        $document->load('organization');
        $this->notifications->notifyDocumentApproved($document, $reviewer);
        SakipDocumentService::clearDashboardCache();

        return back()->with('success', 'Dokumen berhasil divalidasi dan disetujui.');
    }

    public function rejectDocument(Request $request, PlanningDocument $document): RedirectResponse
    {
        $request->validate(['notes' => 'required|string|max:1000']);
        /** @var User|null $reviewer */
        $reviewer = Auth::user();
        $canApprove = $reviewer && (
            $reviewer->hasRole('Super Admin')
            || $reviewer->hasRole('Kepala OPD')
            || $reviewer->hasPermission('planning:review')
            || $reviewer->hasPermission('planning:approve')
            || $reviewer->hasPermission('agreement:approve')
        );
        if (! $canApprove) {
            abort(403, 'Anda tidak memiliki hak akses untuk meminta revisi dokumen perencanaan.');
        }

        $isProvincial = $reviewer->hasRole('Super Admin')
            || $reviewer->hasRole('Kepala OPD');

        if (! $isProvincial && ! $this->authorization->canAccessOrganization($reviewer, (int) $document->organization_id)) {
            abort(403, 'Di luar lingkup organisasi Anda.');
        }

        DB::transaction(function () use ($document, $reviewer) {
            $document->update([
                'status' => 'revision',
                'updated_by' => $reviewer->id,
            ]);
        });

        $document->load('organization');
        $this->notifications->notifyDocumentRevision($document, $request->notes, $reviewer);
        SakipDocumentService::clearDashboardCache();

        return back()->with('success', 'Permintaan revisi telah dikirim ke OPD.');
    }

    public function lockDocument(PlanningDocument $document): RedirectResponse
    {
        /** @var User|null $user */
        $user = Auth::user();
        $canLock = $user && (
            $user->hasRole('Super Admin')
            || $user->hasRole('Kepala OPD')
            || $user->hasPermission('planning:review')
            || $user->hasPermission('planning:approve')
            || $user->hasPermission('agreement:approve')
        );
        if (! $canLock) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengunci dokumen.');
        }

        $isProvincial = $user->hasRole('Super Admin')
            || $user->hasRole('Kepala OPD');

        if (! $isProvincial && ! $this->authorization->canAccessOrganization($user, (int) $document->organization_id)) {
            abort(403, 'Di luar lingkup organisasi Anda.');
        }

        DB::transaction(function () use ($document) {
            $document->update(['status' => 'locked', 'locked_at' => now(), 'updated_by' => Auth::id()]);
        });

        SakipDocumentService::clearDashboardCache();

        return back()->with('success', 'Dokumen dikunci.');
    }

    public function previewDocument(PlanningDocument $document)
    {
        $path = $document->file_path;
        if (! $path) {
            abort(404, 'Berkas fisik untuk dokumen ini belum diunggah.');
        }

        if (Storage::disk('local')->exists($path)) {
            return response()->file(Storage::disk('local')->path($path));
        }

        if (Storage::disk('public')->exists($path)) {
            return response()->file(Storage::disk('public')->path($path));
        }

        if (file_exists(storage_path('app/private/'.$path))) {
            return response()->file(storage_path('app/private/'.$path));
        }

        if (file_exists(storage_path('app/'.$path))) {
            return response()->file(storage_path('app/'.$path));
        }

        if (file_exists(storage_path('app/public/'.$path))) {
            return response()->file(storage_path('app/public/'.$path));
        }

        abort(404, 'Berkas fisik untuk dokumen ini tidak ditemukan di server.');
    }

    public function downloadDocument(PlanningDocument $document)
    {
        $path = $document->file_path;
        if (! $path) {
            abort(404, 'Berkas fisik untuk dokumen ini belum diunggah.');
        }

        // 1. Cek berkas fisik di storage local
        if (Storage::disk('local')->exists($path)) {
            return response()->download(Storage::disk('local')->path($path), basename($path));
        }

        // 2. Cek berkas fisik di storage public
        if (Storage::disk('public')->exists($path)) {
            return response()->download(Storage::disk('public')->path($path), basename($path));
        }

        // 3. Cek berkas fisik langsung di storage_path private
        if (file_exists(storage_path('app/private/'.$path))) {
            return response()->download(storage_path('app/private/'.$path), basename($path));
        }

        // 4. Cek berkas fisik langsung di storage_path app
        if (file_exists(storage_path('app/'.$path))) {
            return response()->download(storage_path('app/'.$path), basename($path));
        }

        // 5. Cek berkas fisik langsung di storage_path public
        if (file_exists(storage_path('app/public/'.$path))) {
            return response()->download(storage_path('app/public/'.$path), basename($path));
        }

        // Jika tidak ada berkas fisik yang terunggah
        abort(404, 'Berkas fisik untuk dokumen ini tidak ditemukan di server.');
    }

    public function destroyDocument(PlanningDocument $document): RedirectResponse
    {
        $document->ensureNotLocked();
        $this->authorization->canAccessOrganization(Auth::user(), (int) $document->organization_id)
            ?: abort(403, 'Di luar lingkup organisasi Anda.');

        $oldPath = $document->file_path;

        DB::transaction(function () use ($document) {
            $document->delete();
        });

        if ($oldPath) {
            Storage::disk('local')->delete($oldPath);
        }

        SakipDocumentService::clearDashboardCache();

        return back()->with('success', 'Dokumen berhasil dihapus.');
    }

    public function agreements(Request $request): Response
    {
        $user = $request->user();
        $isOpdAdmin = $user && $user->isOpdAdmin();
        $accessibleOrgIds = $this->authorization->accessibleOrganizationIds($user);

        $query = Agreement::with(['organization', 'performancePeriod'])->withCount('indicators')->latest();

        if (! $isOpdAdmin) {
            $query->whereIn('organization_id', $accessibleOrgIds);
        }

        if ($request->organization) {
            $query->whereHas('organization', fn ($q) => $q->where('code', $request->organization));
        }
        if ($request->period) {
            $query->where('performance_period_id', $request->period);
        }
        if ($request->status) {
            $query->where('status', $request->status);
        }

        $agreements = $query->paginate($request->integer('per_page', 25))->withQueryString();
        $organizations = Organization::query()
            ->when(! $isOpdAdmin, fn ($q) => $q->whereIn('id', $accessibleOrgIds))
            ->orderBy('name')
            ->get(['id', 'code', 'name', 'short_name']);
        $periods = PerformancePeriod::orderByDesc('year')->get(['id', 'year']);
        $indicators = Indicator::where('status', 'active')
            ->when(! $isOpdAdmin, fn ($q) => $q->whereIn('owner_organization_id', $accessibleOrgIds))
            ->get(['id', 'code', 'name', 'owner_organization_id']);
        $filters = $request->only(['organization', 'period', 'status']);
        $canApprove = $user->hasRole('Super Admin')
            || $user->hasRole('Kepala OPD')
            || $user->hasPermission('planning:review')
            || $user->hasPermission('planning:approve')
            || $user->hasPermission('agreement:approve');

        return Inertia::render('Planning/Agreements', compact(
            'agreements', 'organizations', 'periods', 'indicators', 'filters', 'canApprove'
        ));
    }

    public function storeAgreement(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'organization_id' => 'required|exists:organizations,id',
            'performance_period_id' => 'required|exists:performance_periods,id',
            'name' => 'required|string|max:300',
            'document_number' => 'nullable|string|max:100',
            'description' => 'nullable|string|max:1000',
            'indicator_ids' => 'nullable|array',
            'indicator_ids.*' => 'exists:indicators,id',
        ]);

        $this->authorization->canAccessOrganization($request->user(), (int) $data['organization_id'])
            ?: abort(403, 'Di luar lingkup organisasi Anda.');

        $agreement = null;
        DB::transaction(function () use ($data, &$agreement) {
            $agreement = Agreement::create([
                ...$data,
                'status' => 'submitted',
                'created_by' => Auth::id(),
            ]);

            if (! empty($data['indicator_ids'])) {
                $agreement->indicators()->sync($data['indicator_ids']);
            }
        });

        if ($agreement) {
            $agreement->load('organization');
            $this->notifications->notifyAgreementSubmitted($agreement);
        }

        return back()->with('success', 'Perjanjian kinerja berhasil ditambahkan dan menunggu validasi.');
    }

    public function updateAgreement(Request $request, Agreement $agreement): RedirectResponse
    {
        $agreement->ensureNotLocked();

        $this->authorization->canAccessOrganization($request->user(), (int) $agreement->organization_id)
            ?: abort(403, 'Di luar lingkup organisasi Anda.');

        $data = $request->validate([
            'organization_id' => 'required|exists:organizations,id',
            'performance_period_id' => 'required|exists:performance_periods,id',
            'name' => 'required|string|max:300',
            'document_number' => 'nullable|string|max:100',
            'description' => 'nullable|string|max:1000',
            'indicator_ids' => 'nullable|array',
            'indicator_ids.*' => 'exists:indicators,id',
        ]);

        $this->authorization->canAccessOrganization($request->user(), (int) $data['organization_id'])
            ?: abort(403, 'Di luar lingkup organisasi Anda.');

        DB::transaction(function () use ($agreement, $data) {
            $agreement->update($data + ['updated_by' => Auth::id()]);

            if (isset($data['indicator_ids'])) {
                $agreement->indicators()->sync($data['indicator_ids']);
            }
        });

        return back()->with('success', 'Perjanjian kinerja berhasil diperbarui.');
    }

    public function submitAgreement(Agreement $agreement): RedirectResponse
    {
        $agreement->ensureNotLocked();
        $this->authorization->canAccessOrganization(Auth::user(), (int) $agreement->organization_id)
            ?: abort(403, 'Di luar lingkup organisasi Anda.');

        DB::transaction(function () use ($agreement) {
            $agreement->update(['status' => 'submitted', 'updated_by' => Auth::id()]);
        });

        $agreement->load('organization');
        $this->notifications->notifyAgreementSubmitted($agreement);

        return back()->with('success', 'Perjanjian diajukan untuk review.');
    }

    public function approveAgreement(Agreement $agreement): RedirectResponse
    {
        /** @var User|null $reviewer */
        $reviewer = Auth::user();
        $canApprove = $reviewer && (
            $reviewer->hasRole('Super Admin')
            || $reviewer->hasRole('Kepala OPD')
            || $reviewer->hasPermission('planning:review')
            || $reviewer->hasPermission('planning:approve')
            || $reviewer->hasPermission('agreement:approve')
        );
        if (! $canApprove) {
            abort(403, 'Anda tidak memiliki hak akses untuk memvalidasi perjanjian kinerja.');
        }

        $isProvincial = $reviewer->hasRole('Super Admin')
            || $reviewer->hasRole('Kepala OPD');

        if (! $isProvincial && ! $this->authorization->canAccessOrganization($reviewer, (int) $agreement->organization_id)) {
            abort(403, 'Di luar lingkup organisasi Anda.');
        }

        DB::transaction(function () use ($agreement, $reviewer) {
            $agreement->update([
                'status' => 'approved',
                'approved_by' => $reviewer->id,
                'approved_at' => now(),
                'updated_by' => $reviewer->id,
            ]);
        });

        $agreement->load('organization');
        $this->notifications->notifyAgreementApproved($agreement, $reviewer);

        return back()->with('success', 'Perjanjian kinerja berhasil divalidasi dan disetujui.');
    }

    public function rejectAgreement(Request $request, Agreement $agreement): RedirectResponse
    {
        $request->validate(['notes' => 'required|string|max:1000']);
        /** @var User|null $reviewer */
        $reviewer = Auth::user();
        $canApprove = $reviewer && (
            $reviewer->hasRole('Super Admin')
            || $reviewer->hasRole('Kepala OPD')
            || $reviewer->hasPermission('planning:review')
            || $reviewer->hasPermission('planning:approve')
            || $reviewer->hasPermission('agreement:approve')
        );
        if (! $canApprove) {
            abort(403, 'Anda tidak memiliki hak akses untuk meminta revisi perjanjian kinerja.');
        }

        $isProvincial = $reviewer->hasRole('Super Admin')
            || $reviewer->hasRole('Kepala OPD');

        if (! $isProvincial && ! $this->authorization->canAccessOrganization($reviewer, (int) $agreement->organization_id)) {
            abort(403, 'Di luar lingkup organisasi Anda.');
        }

        DB::transaction(function () use ($agreement, $reviewer) {
            $agreement->update([
                'status' => 'revision',
                'updated_by' => $reviewer->id,
            ]);
        });

        $agreement->load('organization');
        $this->notifications->notifyAgreementRevision($agreement, $request->notes, $reviewer);

        return back()->with('success', 'Permintaan revisi perjanjian telah dikirim ke OPD.');
    }

    public function lockAgreement(Agreement $agreement): RedirectResponse
    {
        /** @var User|null $user */
        $user = Auth::user();
        $canLock = $user && (
            $user->hasRole('Super Admin')
            || $user->hasRole('Kepala OPD')
            || $user->hasPermission('planning:review')
            || $user->hasPermission('planning:approve')
            || $user->hasPermission('agreement:approve')
        );
        if (! $canLock) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengunci perjanjian kinerja.');
        }

        $isProvincial = $user->hasRole('Super Admin')
            || $user->hasRole('Kepala OPD');

        if (! $isProvincial && ! $this->authorization->canAccessOrganization($user, (int) $agreement->organization_id)) {
            abort(403, 'Di luar lingkup organisasi Anda.');
        }

        DB::transaction(function () use ($agreement) {
            $agreement->update(['status' => 'locked', 'locked_at' => now(), 'updated_by' => Auth::id()]);
        });

        return back()->with('success', 'Perjanjian dikunci.');
    }

    public function uploadAgreement(Request $request, Agreement $agreement): RedirectResponse
    {
        $agreement->ensureNotLocked();
        $this->authorization->canAccessOrganization($request->user(), (int) $agreement->organization_id)
            ?: abort(403, 'Di luar lingkup organisasi Anda.');

        $request->validate(['file' => 'required|file|mimes:pdf,doc,docx|max:20480']);

        $oldPath = $agreement->file_path;
        $path = $request->file('file')->store('planning/agreements', 'local');

        try {
            DB::transaction(function () use ($agreement, $path) {
                $agreement->update([
                    'file_path' => $path,
                    'status' => 'submitted',
                ]);
            });
        } catch (\Throwable $e) {
            Storage::disk('local')->delete($path);
            throw $e;
        }

        if ($oldPath && Storage::disk('local')->exists($oldPath)) {
            Storage::disk('local')->delete($oldPath);
        }

        $agreement->load('organization');
        $this->notifications->notifyAgreementSubmitted($agreement);

        return back()->with('success', 'File berhasil diunggah dan menunggu validasi.');
    }

    public function downloadAgreement(Agreement $agreement)
    {
        $this->authorization->canAccessOrganization(Auth::user(), (int) $agreement->organization_id)
            ?: abort(403, 'Di luar lingkup organisasi Anda.');

        abort_unless($agreement->file_path && Storage::disk('local')->exists($agreement->file_path), 404);

        return response()->download(Storage::disk('local')->path($agreement->file_path), basename($agreement->file_path));
    }

    public function destroyAgreement(Agreement $agreement): RedirectResponse
    {
        $agreement->ensureNotLocked();
        $this->authorization->canAccessOrganization(Auth::user(), (int) $agreement->organization_id)
            ?: abort(403, 'Di luar lingkup organisasi Anda.');

        DB::transaction(function () use ($agreement) {
            $agreement->delete();
        });

        return back()->with('success', 'Perjanjian berhasil dihapus.');
    }

    public function actionPlans(Request $request): Response
    {
        $user = $request->user();
        $isOpdAdmin = $user && $user->isOpdAdmin();
        $accessibleOrgIds = $this->authorization->accessibleOrganizationIds($user);

        $query = ActionPlan::with(['organization', 'indicator', 'performancePeriod'])->latest();

        if (! $isOpdAdmin) {
            $query->whereIn('organization_id', $accessibleOrgIds);
        }

        if ($request->organization) {
            $query->where(function ($q) use ($request) {
                $q->where('organization_id', $request->organization)
                    ->orWhereHas('organization', fn ($sub) => $sub->where('code', $request->organization));
            });
        }
        if ($request->period) {
            $query->where(function ($q) use ($request) {
                $q->where('performance_period_id', $request->period)
                    ->orWhere('planning_period_id', $request->period);
            });
        }
        if ($request->status) {
            $query->where('status', $request->status);
        }

        $plans = $query->paginate($request->integer('per_page', 25))->withQueryString();
        $organizations = Organization::query()
            ->when(! $isOpdAdmin, fn ($q) => $q->whereIn('id', $accessibleOrgIds))
            ->orderBy('name')
            ->get(['id', 'code', 'name', 'short_name']);
        $periods = PerformancePeriod::orderByDesc('year')->get(['id', 'year']);
        $indicators = Indicator::where('status', 'active')
            ->when(! $isOpdAdmin, fn ($q) => $q->whereIn('owner_organization_id', $accessibleOrgIds))
            ->get(['id', 'code', 'name']);
        $filters = $request->only(['organization', 'period', 'status']);
        $statuses = [
            'not_started' => 'Belum Mulai',
            'on_track' => 'On Track',
            'delayed' => 'Terlambat',
            'done' => 'Selesai',
        ];

        return Inertia::render('Planning/ActionPlans', compact(
            'plans', 'organizations', 'periods', 'indicators', 'filters', 'statuses'
        ));
    }

    public function storeActionPlan(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'organization_id' => 'required|exists:organizations,id',
            'performance_period_id' => 'required|exists:performance_periods,id',
            'indicator_id' => 'nullable|exists:indicators,id',
            'activity' => 'required|string|max:300',
            'description' => 'nullable|string|max:1000',
            'target_value' => 'nullable|numeric',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'progress' => 'nullable|integer|min:0|max:100',
            'status' => 'required|in:not_started,on_track,delayed,done',
        ]);

        $this->authorization->canAccessOrganization($request->user(), (int) $data['organization_id'])
            ?: abort(403, 'Di luar lingkup organisasi Anda.');

        DB::transaction(function () use ($data) {
            ActionPlan::create($data + [
                'title' => $data['activity'],
                'planning_period_id' => $data['performance_period_id'],
                'created_by' => Auth::id(),
            ]);
        });

        return back()->with('success', 'Rencana aksi berhasil ditambahkan.');
    }

    public function updateActionPlan(Request $request, ActionPlan $plan): RedirectResponse
    {
        $this->authorization->canAccessOrganization($request->user(), (int) $plan->organization_id)
            ?: abort(403, 'Di luar lingkup organisasi Anda.');

        $data = $request->validate([
            'organization_id' => 'required|exists:organizations,id',
            'performance_period_id' => 'required|exists:performance_periods,id',
            'indicator_id' => 'nullable|exists:indicators,id',
            'activity' => 'required|string|max:300',
            'description' => 'nullable|string|max:1000',
            'target_value' => 'nullable|numeric',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'progress' => 'nullable|integer|min:0|max:100',
            'status' => 'required|in:not_started,on_track,delayed,done',
        ]);

        $this->authorization->canAccessOrganization($request->user(), (int) $data['organization_id'])
            ?: abort(403, 'Di luar lingkup organisasi Anda.');

        DB::transaction(function () use ($plan, $data) {
            $plan->update($data + [
                'title' => $data['activity'],
                'planning_period_id' => $data['performance_period_id'],
                'updated_by' => Auth::id(),
            ]);
        });

        return back()->with('success', 'Rencana aksi berhasil diperbarui.');
    }

    public function advanceActionPlan(Request $request, ActionPlan $plan): RedirectResponse
    {
        $this->authorization->canAccessOrganization(Auth::user(), (int) $plan->organization_id)
            ?: abort(403, 'Di luar lingkup organisasi Anda.');

        $request->validate(['progress' => 'required|integer|min:0|max:100']);

        DB::transaction(function () use ($plan, $request) {
            $plan->update([
                'progress' => $request->progress,
                'status' => $request->progress >= 100 ? 'done' : ($plan->status === 'not_started' ? 'on_track' : $plan->status),
                'updated_by' => Auth::id(),
            ]);
        });

        return back()->with('success', 'Progres berhasil diperbarui.');
    }

    public function destroyActionPlan(ActionPlan $plan): RedirectResponse
    {
        $this->authorization->canAccessOrganization(Auth::user(), (int) $plan->organization_id)
            ?: abort(403, 'Di luar lingkup organisasi Anda.');

        DB::transaction(function () use ($plan) {
            $plan->delete();
        });

        return back()->with('success', 'Rencana aksi berhasil dihapus.');
    }

    private function safeCount(string $model, ?callable $scope = null): int
    {
        try {
            $query = $model::query();
            if ($scope) {
                $scope($query);
            }

            return $query->count();
        } catch (\Throwable) {
            return 0;
        }
    }

    private function safeQuery(callable $fn): mixed
    {
        try {
            return $fn();
        } catch (\Throwable) {
            return collect();
        }
    }

    public function trees(Request $request): Response
    {
        $user = $request->user();
        $isOpdAdmin = $user && $user->isOpdAdmin();
        $accessibleOrgIds = $user ? $this->authorization->accessibleOrganizationIds($user) : [];

        $organizations = Organization::query()
            ->when(! $isOpdAdmin, fn ($q) => $q->whereIn('id', $accessibleOrgIds))
            ->orderBy('name')
            ->get(['id', 'code', 'name', 'short_name']);
        $periods = PerformancePeriod::orderByDesc('year')->get(['id', 'year']);
        $indicators = Indicator::where('status', 'active')
            ->when(! $isOpdAdmin, fn ($q) => $q->whereIn('owner_organization_id', $accessibleOrgIds))
            ->get(['id', 'code', 'name', 'measurement_unit_id']);
        $filters = $request->only(['organization', 'period', 'search']);

        // Tree Levels sesuai model Penjenjangan Kinerja PermenPAN-RB 89/2021
        $treeLevels = [
            'visi' => 'Visi / Tujuan',
            'outcome' => 'Sasaran Strategis',
            'csf' => 'Strategic Outcome',
            'kondisi_antara' => 'Tactical Outcome',
            'kondisi_operasional' => 'Operational Outcome',
            'output' => 'Output / Kegiatan',
        ];

        // Query simpul akar (Pohon Kinerja Utama)
        $query = PlanningTree::with([
            'indicator',
            'organization:id,code,name,short_name',
            'performancePeriod:id,year',
            'children.children.children.children',
        ])->whereNull('parent_id');

        // Scoping hak akses: Admin OPD melihat pohon OPD-nya + pohon makro provinsi (Org ID 1)
        if (! $isOpdAdmin && ! empty($accessibleOrgIds)) {
            $query->where(function ($q) use ($accessibleOrgIds) {
                $q->whereIn('organization_id', $accessibleOrgIds)
                    ->orWhere('organization_id', 1);
            });
        }

        if ($request->filled('organization')) {
            $query->whereHas('organization', function ($q) use ($request) {
                $q->where('code', $request->organization)
                    ->orWhere('id', $request->organization);
            });
        }

        if ($request->filled('period')) {
            $query->where('performance_period_id', $request->period);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $trees = $query->orderBy('sort_order')->orderByDesc('id')->get()->map(function (PlanningTree $item) use ($isOpdAdmin, $accessibleOrgIds, $treeLevels) {
            $totalDescendants = $this->countDescendants($item);
            $maxDepth = $this->getMaxDepth($item);
            $canManage = $isOpdAdmin || in_array((int) $item->organization_id, $accessibleOrgIds, true);

            return [
                'id' => $item->id,
                'code' => $item->code,
                'name' => $item->name,
                'description' => $item->description,
                'level' => $item->level,
                'level_label' => $treeLevels[$item->level] ?? ucfirst($item->level),
                'is_active' => (bool) $item->is_active,
                'total_nodes' => $totalDescendants + 1,
                'max_depth' => $maxDepth,
                'organization' => $item->organization,
                'performance_period' => $item->performancePeriod,
                'indicator' => $item->indicator,
                'created_at' => $item->created_at?->format('d-m-Y') ?? '-',
                'updated_at' => $item->updated_at?->diffForHumans() ?? '-',
                'can_manage' => $canManage,
            ];
        });

        $stats = [
            'total_trees' => $trees->count(),
            'total_nodes' => PlanningTree::count(),
            'total_opd' => PlanningTree::distinct('organization_id')->count('organization_id'),
            'active_period' => $periods->first()?->year ?? date('Y'),
        ];

        $canCreate = $isOpdAdmin || ($user && $user->roles()->whereIn('name', ['Admin OPD', 'Kepala OPD'])->exists());

        return Inertia::render('Planning/TreesIndex', compact(
            'trees', 'stats', 'organizations', 'periods', 'indicators', 'treeLevels', 'filters', 'canCreate', 'isOpdAdmin'
        ));
    }

    public function treeBuilder(Request $request, PlanningTree $tree): Response
    {
        $user = $request->user();
        $isOpdAdmin = $user && $user->isOpdAdmin();
        $accessibleOrgIds = $user ? $this->authorization->accessibleOrganizationIds($user) : [];

        if (! $isOpdAdmin && (int) $tree->organization_id !== 1 && ! in_array((int) $tree->organization_id, $accessibleOrgIds, true)) {
            abort(403, 'Anda tidak memiliki akses ke pohon kinerja organisasi ini.');
        }

        $tree->load([
            'indicator',
            'organization:id,code,name,short_name',
            'performancePeriod:id,year',
            'allChildren',
        ]);

        $organizations = Organization::query()
            ->when(! $isOpdAdmin, fn ($q) => $q->whereIn('id', $accessibleOrgIds))
            ->orderBy('name')
            ->get(['id', 'code', 'name', 'short_name']);
        $periods = PerformancePeriod::orderByDesc('year')->get(['id', 'year']);
        $indicators = Indicator::where('status', 'active')
            ->when(! $isOpdAdmin, fn ($q) => $q->whereIn('owner_organization_id', $accessibleOrgIds))
            ->get(['id', 'code', 'name', 'measurement_unit_id']);
        $filters = $request->only(['organization', 'period']);

        $treeLevels = [
            'visi' => 'Visi / Tujuan',
            'outcome' => 'Sasaran Strategis',
            'csf' => 'Strategic Outcome',
            'kondisi_antara' => 'Tactical Outcome',
            'kondisi_operasional' => 'Operational Outcome',
            'output' => 'Output / Kegiatan',
        ];

        $descendantIds = $this->getDescendantIds($tree);
        $allNodeIds = array_merge([$tree->id], $descendantIds);
        $allNodes = PlanningTree::whereIn('id', $allNodeIds)->orderBy('level')->get(['id', 'level', 'name']);

        $canManage = $isOpdAdmin || in_array((int) $tree->organization_id, $accessibleOrgIds, true);

        $activeRootTree = [
            'id' => $tree->id,
            'code' => $tree->code,
            'name' => $tree->name,
            'organization' => $tree->organization,
            'performance_period' => $tree->performancePeriod,
            'level' => $tree->level,
            'total_nodes' => count($allNodeIds),
        ];

        return Inertia::render('Planning/Trees', [
            'tree' => collect([$tree]),
            'activeRootTree' => $activeRootTree,
            'organizations' => $organizations,
            'periods' => $periods,
            'indicators' => $indicators,
            'allNodes' => $allNodes,
            'treeLevels' => $treeLevels,
            'filters' => $filters,
            'canManage' => $canManage,
            'isMacroView' => false,
        ]);
    }

    public function treeMacroBuilder(Request $request): Response
    {
        $user = $request->user();
        $isOpdAdmin = $user && $this->authorization->isOpdAdmin($user);
        $accessibleOrgIds = $this->authorization->accessibleOrganizationIds($user);

        $organizations = Organization::query()
            ->when(! $isOpdAdmin, fn ($q) => $q->whereIn('id', $accessibleOrgIds))
            ->orderBy('name')
            ->get(['id', 'code', 'name', 'short_name']);
        $periods = PerformancePeriod::orderByDesc('year')->get(['id', 'year']);
        $indicators = Indicator::query()
            ->where('status', 'active')
            ->when(! $isOpdAdmin, function ($q) use ($accessibleOrgIds) {
                $q->where(function ($sub) use ($accessibleOrgIds) {
                    $sub->whereIn('owner_organization_id', $accessibleOrgIds)
                        ->orWhereNull('owner_organization_id');
                });
            })
            ->get(['id', 'code', 'name', 'measurement_unit_id']);
        $filters = $request->only(['organization', 'period']);

        $treeLevels = [
            'visi' => 'Visi / Tujuan',
            'outcome' => 'Sasaran Strategis',
            'csf' => 'Strategic Outcome',
            'kondisi_antara' => 'Tactical Outcome',
            'kondisi_operasional' => 'Operational Outcome',
            'output' => 'Output / Kegiatan',
        ];

        $query = PlanningTree::with(['indicator', 'organization:id,code,name,short_name', 'allChildren'])
            ->whereNull('parent_id')
            ->when(! $isOpdAdmin, function ($q) use ($accessibleOrgIds) {
                $q->where(function ($sub) use ($accessibleOrgIds) {
                    $sub->whereIn('organization_id', $accessibleOrgIds)
                        ->orWhereNull('organization_id');
                });
            });

        if ($request->organization) {
            $query->whereHas('organization', fn ($q) => $q->where('code', $request->organization)->orWhere('id', $request->organization));
        }
        if ($request->period) {
            $query->where('performance_period_id', $request->period);
        }

        $tree = $query->orderBy('sort_order')->get();
        $allNodes = PlanningTree::query()
            ->when(! $isOpdAdmin, function ($q) use ($accessibleOrgIds) {
                $q->where(function ($sub) use ($accessibleOrgIds) {
                    $sub->whereIn('organization_id', $accessibleOrgIds)
                        ->orWhereNull('organization_id');
                });
            })
            ->orderBy('level')
            ->get(['id', 'level', 'name']);

        return Inertia::render('Planning/Trees', [
            'tree' => $tree,
            'activeRootTree' => [
                'id' => 0,
                'code' => 'MAKRO',
                'name' => 'Visualisasi Makro Seluruh Perangkat Daerah',
                'organization' => ['name' => AppConfig::where('key', 'instansi_name')->value('value') ?: 'Pemerintah Daerah'],
                'total_nodes' => $allNodes->count(),
            ],
            'organizations' => $organizations,
            'periods' => $periods,
            'indicators' => $indicators,
            'allNodes' => $allNodes,
            'treeLevels' => $treeLevels,
            'filters' => $filters,
            'canManage' => $isOpdAdmin,
            'isMacroView' => true,
        ]);
    }

    public function storeTree(Request $request): RedirectResponse
    {
        $user = $request->user();
        $isOpdAdmin = $user && $user->isOpdAdmin();
        $accessibleOrgIds = $user ? $this->authorization->accessibleOrganizationIds($user) : [];

        $data = $request->validate([
            'organization_id' => 'required|exists:organizations,id',
            'performance_period_id' => 'required|exists:performance_periods,id',
            'parent_id' => 'nullable|exists:planning_trees,id',
            'level' => 'required|in:visi,outcome,csf,kondisi_antara,kondisi_operasional,output,1,2,3,4,5',
            'code' => 'required|string|max:50',
            'name' => 'required|string|max:300',
            'description' => 'nullable|string|max:1000',
            'indicator_id' => 'nullable|exists:indicators,id',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
        ]);

        // Jika bukan admin OPD, verifikasi organization_id
        if (! $isOpdAdmin) {
            $this->authorization->canAccessOrganization($user, (int) $data['organization_id'])
                ?: abort(403, 'Di luar lingkup organisasi Anda.');
        }

        if (! empty($data['parent_id'])) {
            $parent = PlanningTree::find($data['parent_id']);
            if ($parent && ! $isOpdAdmin && (int) $parent->organization_id !== 1 && ! in_array((int) $parent->organization_id, $accessibleOrgIds, true)) {
                abort(403, 'Parent tree bukan milik organisasi Anda atau Provinsi.');
            }
            if ($parent && $this->wouldCreateCircular($data['parent_id'], null)) {
                return back()->withErrors(['parent_id' => 'Relasi ini akan membuat circular reference.']);
            }
        }

        DB::transaction(function () use ($data) {
            PlanningTree::create($data + [
                'created_by' => Auth::id(),
                'is_active' => $data['is_active'] ?? true,
            ]);
        });

        return back()->with('success', 'Pohon kinerja / simpul berhasil ditambahkan.');
    }

    public function updateTree(Request $request, PlanningTree $tree): RedirectResponse
    {
        $user = $request->user();
        $isOpdAdmin = $user && $user->isOpdAdmin();
        $accessibleOrgIds = $user ? $this->authorization->accessibleOrganizationIds($user) : [];

        if (! $isOpdAdmin && ! in_array((int) $tree->organization_id, $accessibleOrgIds, true)) {
            abort(403, 'Anda tidak berhak memperbarui pohon kinerja instansi lain.');
        }

        $data = $request->validate([
            'organization_id' => 'required|exists:organizations,id',
            'performance_period_id' => 'required|exists:performance_periods,id',
            'level' => 'required|in:visi,outcome,csf,kondisi_antara,kondisi_operasional,output,1,2,3,4,5',
            'code' => 'required|string|max:50',
            'name' => 'required|string|max:300',
            'description' => 'nullable|string|max:1000',
            'indicator_id' => 'nullable|exists:indicators,id',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
        ]);

        if (! $isOpdAdmin) {
            $this->authorization->canAccessOrganization($user, (int) $data['organization_id'])
                ?: abort(403, 'Di luar lingkup organisasi Anda.');
        }

        DB::transaction(function () use ($tree, $data) {
            $tree->update($data + ['updated_by' => Auth::id()]);
        });

        return back()->with('success', 'Pohon kinerja / simpul berhasil diperbarui.');
    }

    public function destroyTree(Request $request, PlanningTree $tree): RedirectResponse
    {
        $user = $request->user();
        $isOpdAdmin = $user && $user->isOpdAdmin();
        $accessibleOrgIds = $user ? $this->authorization->accessibleOrganizationIds($user) : [];

        if (! $isOpdAdmin && ! in_array((int) $tree->organization_id, $accessibleOrgIds, true)) {
            abort(403, 'Anda tidak memiliki wewenang untuk menghapus pohon kinerja instansi lain.');
        }

        // Hapus kaskade jika simpul akar (pohon utama) atau dikonfirmasi cascade
        if ($tree->parent_id === null || $request->boolean('cascade') || $request->input('force')) {
            DB::transaction(function () use ($tree) {
                $this->deleteNodeAndDescendants($tree);
            });

            return back()->with('success', 'Pohon kinerja beserta seluruh simpul turunannya berhasil dihapus.');
        }

        if ($tree->children()->count() > 0) {
            return back()->withErrors(['tree' => 'Simpul ini masih memiliki anak. Hapus anak terlebih dahulu atau pilih hapus pohon secara utuh.']);
        }

        DB::transaction(function () use ($tree) {
            $tree->delete();
        });

        return back()->with('success', 'Simpul pohon kinerja berhasil dihapus.');
    }

    /**
     * G-14: Upload berkas statis pohon kinerja (AC-015 fallback).
     *
     * Memungkinkan upload gambar/PDF pohon kinerja dari OPD yang belum dapat
     * menyusun pohon kinerja secara dinamis. File disimpan di node root OPD+Periode.
     * Format: jpg, png, pdf — maks 10MB.
     */
    public function uploadStaticTree(Request $request): RedirectResponse
    {
        $this->authorize('manage-planning-docs');

        $validated = $request->validate([
            'file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
            'organization_id' => ['required', 'integer', 'exists:organizations,id'],
            'performance_period_id' => ['nullable', 'integer', 'exists:planning_periods,id'],
            'label' => ['nullable', 'string', 'max:255'],
        ], [
            'file.mimes' => 'Format tidak diizinkan. Gunakan PDF, JPG, atau PNG.',
            'file.max' => 'Ukuran file maksimal 10 MB.',
        ]);

        $this->authorization->canAccessOrganization($request->user(), (int) $validated['organization_id'])
            ?: abort(403, 'Di luar lingkup organisasi Anda.');

        $path = $request->file('file')->store('planning-trees/static', 'local');
        $label = $validated['label'] ?? $request->file('file')->getClientOriginalName();

        // Simpan ke node root OPD (atau buat jika belum ada) — cari node level pertama untuk OPD ini
        $node = PlanningTree::query()
            ->where('organization_id', $validated['organization_id'])
            ->whereNull('parent_id')
            ->when($validated['performance_period_id'] ?? null, fn ($q, $pid) => $q->where('performance_period_id', $pid))
            ->first();

        if ($node) {
            // Hapus file lama jika ada
            if ($node->static_file_path) {
                Storage::delete($node->static_file_path);
            }
            $node->update(['static_file_path' => $path, 'static_file_label' => $label]);
        } else {
            // Tidak ada node root — simpan sebagai node placeholder
            PlanningTree::create([
                'organization_id' => $validated['organization_id'],
                'performance_period_id' => $validated['performance_period_id'] ?? null,
                'level' => 'tujuan',
                'code' => 'STATIC',
                'name' => 'Pohon Kinerja (Berkas Statis)',
                'static_file_path' => $path,
                'static_file_label' => $label,
                'created_by' => $request->user()->id,
            ]);
        }

        return back()->with('success', "Berkas pohon kinerja \"{$label}\" berhasil diunggah.");
    }

    public function cascading(Request $request): Response
    {
        $user = $request->user();
        $isOpdAdmin = $user && $user->isOpdAdmin();
        $accessibleOrgIds = $user ? $this->authorization->accessibleOrganizationIds($user) : [];

        $query = CascadingRelation::with([
            'fromTree.organization',
            'toTree.organization',
            'performancePeriod',
        ])
            ->when(! $isOpdAdmin, function ($q) use ($accessibleOrgIds) {
                $q->where(function ($sub) use ($accessibleOrgIds) {
                    $sub->whereHas('fromTree', fn ($t) => $t->whereIn('organization_id', $accessibleOrgIds)->orWhere('organization_id', 1))
                        ->orWhereHas('toTree', fn ($t) => $t->whereIn('organization_id', $accessibleOrgIds)->orWhere('organization_id', 1));
                });
            })
            ->latest();

        if ($request->period) {
            $query->where('performance_period_id', $request->period);
        }

        $relations = $query->paginate($request->integer('per_page', 25))->withQueryString();
        $organizations = Organization::query()
            ->when(! $isOpdAdmin, fn ($q) => $q->whereIn('id', array_unique(array_merge($accessibleOrgIds, [1]))))
            ->orderBy('name')
            ->get(['id', 'code', 'name', 'short_name']);
        $periods = PerformancePeriod::orderByDesc('year')->get(['id', 'year']);
        $trees = PlanningTree::with('organization')
            ->when(! $isOpdAdmin, fn ($q) => $q->whereIn('organization_id', array_unique(array_merge($accessibleOrgIds, [1]))))
            ->orderBy('level')->get(['id', 'name', 'level', 'organization_id']);
        $treeLevels = ['tujuan' => 'Tujuan', 'sasaran' => 'Sasaran', 'program' => 'Program', 'kegiatan' => 'Kegiatan'];
        $filters = $request->only(['period', 'per_page']);

        return Inertia::render('Planning/Cascading', compact(
            'relations', 'organizations', 'periods', 'trees', 'treeLevels', 'filters'
        ));
    }

    public function storeCascading(Request $request): RedirectResponse
    {
        $user = $request->user();
        $isOpdAdmin = $user && $user->isOpdAdmin();
        $accessibleOrgIds = $user ? $this->authorization->accessibleOrganizationIds($user) : [];

        $data = $request->validate([
            'performance_period_id' => 'required|exists:performance_periods,id',
            'from_tree_id' => 'required|exists:planning_trees,id',
            'to_tree_id' => 'required|exists:planning_trees,id|different:from_tree_id',
            'type' => 'required|in:vertical,horizontal',
            'description' => 'nullable|string|max:500',
        ]);

        if (! $isOpdAdmin) {
            $fromTree = PlanningTree::find($data['from_tree_id']);
            $toTree = PlanningTree::find($data['to_tree_id']);
            $canFrom = $fromTree && in_array((int) $fromTree->organization_id, $accessibleOrgIds, true);
            $canTo = $toTree && in_array((int) $toTree->organization_id, $accessibleOrgIds, true);
            if (! $canFrom && ! $canTo) {
                abort(403, 'Di luar lingkup organisasi Anda.');
            }
        }

        DB::transaction(function () use ($data) {
            CascadingRelation::create($data + ['created_by' => Auth::id()]);
        });

        return back()->with('success', 'Relasi cascading berhasil ditambahkan.');
    }

    public function destroyCascading(CascadingRelation $cascading): RedirectResponse
    {
        /** @var User|null $user */
        $user = Auth::user();
        $isOpdAdmin = $user && $user->isOpdAdmin();
        $accessibleOrgIds = $user ? $this->authorization->accessibleOrganizationIds($user) : [];

        if (! $isOpdAdmin) {
            $cascading->loadMissing(['fromTree', 'toTree']);
            $canFrom = $cascading->fromTree && in_array((int) $cascading->fromTree->organization_id, $accessibleOrgIds, true);
            $canTo = $cascading->toTree && in_array((int) $cascading->toTree->organization_id, $accessibleOrgIds, true);
            if (! $canFrom && ! $canTo) {
                abort(403, 'Di luar lingkup organisasi Anda.');
            }
        }

        DB::transaction(function () use ($cascading) {
            $cascading->delete();
        });

        return back()->with('success', 'Relasi cascading berhasil dihapus.');
    }

    public function crosscutting(Request $request): Response
    {
        $user = $request->user();
        $isOpdAdmin = $user && $user->isOpdAdmin();
        $accessibleOrgIds = $user ? $this->authorization->accessibleOrganizationIds($user) : [];

        $query = CrosscuttingRelation::with([
            'indicator',
            'organization',
            'relatedOrganization',
        ])
            ->when(! $isOpdAdmin, fn ($q) => $q->where(fn ($sub) => $sub->whereIn('organization_id', $accessibleOrgIds)->orWhereIn('related_organization_id', $accessibleOrgIds)))
            ->latest();

        if ($request->period) {
            $query->where('performance_period_id', $request->period);
        }

        $relations = $query->paginate($request->integer('per_page', 25))->withQueryString();
        $organizations = Organization::query()
            ->when(! $isOpdAdmin, fn ($q) => $q->whereIn('id', $accessibleOrgIds))
            ->orderBy('name')
            ->get(['id', 'code', 'name', 'short_name']);
        $periods = PerformancePeriod::orderByDesc('year')->get(['id', 'year']);
        $indicators = Indicator::where('status', 'active')
            ->when(! $isOpdAdmin, fn ($q) => $q->whereIn('owner_organization_id', $accessibleOrgIds))
            ->get(['id', 'code', 'name', 'owner_organization_id']);
        $relationTypes = ['support' => 'Dukungan', 'dependency' => 'Ketergantungan', 'coordination' => 'Koordinasi'];
        $filters = $request->only(['period', 'per_page']);

        return Inertia::render('Planning/Crosscutting', compact(
            'relations', 'organizations', 'periods', 'indicators', 'relationTypes', 'filters'
        ));
    }

    public function storeCrosscutting(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'performance_period_id' => 'required|exists:performance_periods,id',
            'indicator_id' => 'required|exists:indicators,id',
            'organization_id' => 'required|exists:organizations,id',
            'related_organization_id' => 'required|exists:organizations,id|different:organization_id',
            'relation_type' => 'required|in:support,dependency,coordination',
            'description' => 'nullable|string|max:500',
        ]);

        $this->authorization->canAccessOrganization($request->user(), (int) $data['organization_id'])
            ?: abort(403, 'Di luar lingkup organisasi Anda.');

        DB::transaction(function () use ($data) {
            CrosscuttingRelation::create($data + ['created_by' => Auth::id()]);
        });

        return back()->with('success', 'Relasi crosscutting berhasil ditambahkan.');
    }

    public function destroyCrosscutting(CrosscuttingRelation $crosscutting): RedirectResponse
    {
        /** @var User|null $user */
        $user = Auth::user();
        $isOpdAdmin = $user && $user->isOpdAdmin();
        $accessibleOrgIds = $user ? $this->authorization->accessibleOrganizationIds($user) : [];

        if (! $isOpdAdmin && ! in_array((int) $crosscutting->organization_id, $accessibleOrgIds, true) && ! in_array((int) $crosscutting->related_organization_id, $accessibleOrgIds, true)) {
            abort(403, 'Di luar lingkup organisasi Anda.');
        }

        DB::transaction(function () use ($crosscutting) {
            $crosscutting->delete();
        });

        return back()->with('success', 'Relasi crosscutting berhasil dihapus.');
    }

    public function risks(Request $request): Response
    {
        $user = $request->user();
        $isOpdAdmin = $user && $user->isOpdAdmin();
        $accessibleOrgIds = $user ? $this->authorization->accessibleOrganizationIds($user) : [];

        $query = Risk::with(['organization', 'indicator'])
            ->when(! $isOpdAdmin, fn ($q) => $q->whereIn('organization_id', $accessibleOrgIds))
            ->latest();

        if ($request->organization) {
            $query->whereHas('organization', fn ($q) => $q->where('code', $request->organization));
        }
        if ($request->period) {
            $query->where('performance_period_id', $request->period);
        }
        if ($request->level) {
            $query->where('risk_level', $request->level);
        }
        if ($request->status) {
            $query->where('status', $request->status);
        }

        $risks = $query->paginate($request->integer('per_page', 25))->withQueryString();
        $organizations = Organization::query()
            ->when(! $isOpdAdmin, fn ($q) => $q->whereIn('id', $accessibleOrgIds))
            ->orderBy('name')
            ->get(['id', 'code', 'name', 'short_name']);
        $periods = PerformancePeriod::orderByDesc('year')->get(['id', 'year']);
        $indicators = Indicator::where('status', 'active')
            ->when(! $isOpdAdmin, fn ($q) => $q->whereIn('owner_organization_id', $accessibleOrgIds))
            ->get(['id', 'code', 'name']);
        $filters = $request->only(['organization', 'period', 'level', 'status', 'per_page']);
        $riskLevels = [
            'critical' => Risk::where('risk_level', 'critical')->when(! $isOpdAdmin, fn ($q) => $q->whereIn('organization_id', $accessibleOrgIds))->count(),
            'high' => Risk::where('risk_level', 'high')->when(! $isOpdAdmin, fn ($q) => $q->whereIn('organization_id', $accessibleOrgIds))->count(),
            'medium' => Risk::where('risk_level', 'medium')->when(! $isOpdAdmin, fn ($q) => $q->whereIn('organization_id', $accessibleOrgIds))->count(),
            'low' => Risk::where('risk_level', 'low')->when(! $isOpdAdmin, fn ($q) => $q->whereIn('organization_id', $accessibleOrgIds))->count(),
        ];
        $riskLevelOptions = ['low' => 'Rendah', 'medium' => 'Sedang', 'high' => 'Tinggi', 'critical' => 'Kritis'];
        $riskStatuses = ['open' => 'Open', 'monitored' => 'Monitored', 'mitigated' => 'Dimitigasi', 'closed' => 'Closed'];

        return Inertia::render('Planning/Risks', compact(
            'risks', 'organizations', 'periods', 'indicators', 'filters',
            'riskLevels', 'riskLevelOptions', 'riskStatuses'
        ));
    }

    public function storeRisk(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'organization_id' => 'required|exists:organizations,id',
            'performance_period_id' => 'required|exists:performance_periods,id',
            'indicator_id' => 'nullable|exists:indicators,id',
            'risk_event' => 'required|string|max:300',
            'cause' => 'nullable|string|max:1000',
            'impact' => 'nullable|string|max:1000',
            'likelihood' => 'required|integer|min:1|max:5',
            'impact_level' => 'required|integer|min:1|max:5',
            'mitigation' => 'nullable|string|max:1000',
            'owner' => 'nullable|string|max:100',
            'status' => 'required|in:open,monitored,mitigated,closed',
        ]);

        $this->authorization->canAccessOrganization($request->user(), (int) $data['organization_id'])
            ?: abort(403, 'Di luar lingkup organisasi Anda.');

        $score = $data['likelihood'] * $data['impact_level'];
        $risk_level = $score >= 20 ? 'critical' : ($score >= 12 ? 'high' : ($score >= 6 ? 'medium' : 'low'));

        DB::transaction(function () use ($data, $risk_level) {
            Risk::create($data + [
                'title' => $data['risk_event'],
                'description' => $data['cause'] ?? $data['impact'] ?? null,
                'risk_level' => $risk_level,
                'created_by' => Auth::id(),
            ]);
        });

        return back()->with('success', 'Risiko berhasil dicatat.');
    }

    public function updateRisk(Request $request, Risk $risk): RedirectResponse
    {
        $this->authorization->canAccessOrganization($request->user(), (int) $risk->organization_id)
            ?: abort(403, 'Di luar lingkup organisasi Anda.');

        $data = $request->validate([
            'organization_id' => 'required|exists:organizations,id',
            'performance_period_id' => 'required|exists:performance_periods,id',
            'indicator_id' => 'nullable|exists:indicators,id',
            'risk_event' => 'required|string|max:300',
            'cause' => 'nullable|string|max:1000',
            'impact' => 'nullable|string|max:1000',
            'likelihood' => 'required|integer|min:1|max:5',
            'impact_level' => 'required|integer|min:1|max:5',
            'mitigation' => 'nullable|string|max:1000',
            'owner' => 'nullable|string|max:100',
            'status' => 'required|in:open,monitored,mitigated,closed',
        ]);

        $this->authorization->canAccessOrganization($request->user(), (int) $data['organization_id'])
            ?: abort(403, 'Di luar lingkup organisasi Anda.');

        $score = $data['likelihood'] * $data['impact_level'];
        $risk_level = $score >= 20 ? 'critical' : ($score >= 12 ? 'high' : ($score >= 6 ? 'medium' : 'low'));

        DB::transaction(function () use ($risk, $data, $risk_level) {
            $risk->update($data + [
                'title' => $data['risk_event'],
                'description' => $data['cause'] ?? $data['impact'] ?? $risk->description,
                'risk_level' => $risk_level,
                'updated_by' => Auth::id(),
            ]);
        });

        return back()->with('success', 'Risiko berhasil diperbarui.');
    }

    public function destroyRisk(Risk $risk): RedirectResponse
    {
        $this->authorization->canAccessOrganization(Auth::user(), (int) $risk->organization_id)
            ?: abort(403, 'Di luar lingkup organisasi Anda.');

        DB::transaction(function () use ($risk) {
            $risk->delete();
        });

        return back()->with('success', 'Risiko berhasil dihapus.');
    }

    private function wouldCreateCircular(int $parentId, ?int $nodeId): bool
    {
        $visited = [];
        $current = $parentId;
        while ($current !== null) {
            if (in_array($current, $visited)) {
                return true;
            }
            if ($nodeId && $current === $nodeId) {
                return true;
            }
            $visited[] = $current;
            $node = PlanningTree::find($current);
            $current = $node?->parent_id;
        }

        return false;
    }

    /**
     * FR-PLN-021: Export pohon kinerja (cascading) ke PDF atau CSV.
     */
    public function exportTree(Request $request): \Symfony\Component\HttpFoundation\Response
    {
        $this->authorize('view-planning-docs');
        $user = $request->user();
        $isOpdAdmin = $user && $user->isOpdAdmin();
        $accessibleOrgIds = $user ? $this->authorization->accessibleOrganizationIds($user) : [];

        $format = $request->string('format', 'pdf')->lower();
        $orgId = $request->integer('organization_id');
        $periodId = $request->integer('performance_period_id') ?: $request->integer('planning_period_id') ?: $request->integer('period');

        if (! $isOpdAdmin && $orgId && ! in_array($orgId, $accessibleOrgIds, true)) {
            abort(403, 'Di luar lingkup organisasi Anda.');
        }
        if (! $isOpdAdmin && ! $orgId && ! empty($accessibleOrgIds)) {
            $orgId = $accessibleOrgIds[0] ?? null;
        }

        $trees = PlanningTree::query()
            ->when($orgId, fn ($q) => $q->where('organization_id', $orgId))
            ->when(! $isOpdAdmin && ! $orgId && ! empty($accessibleOrgIds), fn ($q) => $q->whereIn('organization_id', $accessibleOrgIds))
            ->when($periodId, fn ($q) => $q->where('performance_period_id', $periodId))
            ->with(['organization:id,code,name', 'children', 'parent'])
            ->orderBy('level')
            ->orderBy('sort_order')
            ->get();

        $org = $orgId ? Organization::find($orgId) : null;

        if ($format === 'csv') {
            $filename = 'pohon-kinerja-'.now()->format('Ymd').'.csv';
            $headers = [
                'Content-Type' => 'text/csv; charset=UTF-8',
                'Content-Disposition' => "attachment; filename={$filename}",
            ];

            return response()->stream(function () use ($trees) {
                $out = fopen('php://output', 'w');
                fputs($out, "\xEF\xBB\xBF");
                fputcsv($out, ['Level', 'Nama', 'Kode', 'Organisasi', 'Status', 'Parent']);
                foreach ($trees as $tree) {
                    fputcsv($out, [
                        $tree->level ?? '-',
                        $tree->name ?? '',
                        $tree->code ?? '',
                        $tree->organization?->name ?? '',
                        $tree->is_active ? 'Aktif' : 'Non-Aktif',
                        $tree->parent?->name ?? '',
                    ]);
                }
                fclose($out);
            }, 200, $headers);
        }

        // Default: PDF
        $pdf = Pdf::loadView('reports.tree-pdf', [
            'trees' => $trees,
            'org' => $org,
            'generatedAt' => now()->format('d-m-Y H:i'),
        ])->setPaper('a4', 'landscape');

        $filename = 'pohon-kinerja-'.now()->format('Ymd').'.pdf';

        return $pdf->download($filename);
    }

    /**
     * G-18: Halaman cetak pohon kinerja — visual horizontal.
     *
     * Route: GET /planning/trees/print
     * Tanpa sidebar, siap window.print() → Save as PDF.
     * Header instansi: nama OPD, periode, nama provinsi, logo (jika tersedia).
     */
    public function printTree(Request $request): Response
    {
        $this->authorize('view-planning-docs');
        $user = $request->user();
        $isOpdAdmin = $user && $user->isOpdAdmin();
        $accessibleOrgIds = $user ? $this->authorization->accessibleOrganizationIds($user) : [];

        if (! $isOpdAdmin && $request->organization && ! in_array((int) $request->organization, $accessibleOrgIds, true)) {
            abort(403, 'Di luar lingkup organisasi Anda.');
        }
        if (! $isOpdAdmin && ! $request->organization) {
            $request->merge(['organization' => $accessibleOrgIds[0] ?? null]);
        }

        $treeLevels = [
            'visi' => 'Visi / Tujuan',
            'outcome' => 'Sasaran Strategis',
            'csf' => 'Strategic Outcome',
            'kondisi_antara' => 'Tactical Outcome',
            'kondisi_operasional' => 'Operational Outcome',
            'output' => 'Output / Kegiatan',
        ];

        $organizations = Organization::query()
            ->when(! $isOpdAdmin, fn ($q) => $q->whereIn('id', $accessibleOrgIds))
            ->orderBy('name')
            ->get(['id', 'code', 'name', 'short_name']);
        $periods = PerformancePeriod::orderByDesc('year')->get(['id', 'year']);
        $filters = $request->only(['organization', 'period']);

        $query = PlanningTree::with([
            'indicator',
            'organization:id,code,name,short_name',
            'allChildren',
        ])->whereNull('parent_id');

        if ($request->organization) {
            $query->where('organization_id', $request->organization);
        }
        if ($request->period) {
            $query->where('performance_period_id', $request->period);
        }

        $tree = $query->orderBy('sort_order')->get();
        $org = $request->organization ? Organization::find($request->organization) : null;
        $period = $request->period ? PerformancePeriod::find($request->period) : null;

        return Inertia::render('Planning/TreesPrint', compact(
            'tree', 'organizations', 'periods', 'treeLevels', 'filters', 'org', 'period'
        ));
    }

    private function countDescendants(PlanningTree $node): int
    {
        $count = 0;
        foreach ($node->children as $child) {
            $count += 1 + $this->countDescendants($child);
        }

        return $count;
    }

    private function getMaxDepth(PlanningTree $node, int $currentDepth = 1): int
    {
        if ($node->children->isEmpty()) {
            return $currentDepth;
        }
        $max = $currentDepth;
        foreach ($node->children as $child) {
            $max = max($max, $this->getMaxDepth($child, $currentDepth + 1));
        }

        return $max;
    }

    private function getDescendantIds(PlanningTree $node): array
    {
        $ids = [];
        foreach ($node->children as $child) {
            $ids[] = $child->id;
            $ids = array_merge($ids, $this->getDescendantIds($child));
        }

        return $ids;
    }

    private function deleteNodeAndDescendants(PlanningTree $node): void
    {
        foreach ($node->children as $child) {
            $this->deleteNodeAndDescendants($child);
        }
        $node->delete();
    }
}
