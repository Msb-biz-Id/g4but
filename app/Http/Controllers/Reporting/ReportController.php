<?php

namespace App\Http\Controllers\Reporting;

use App\Http\Controllers\Controller;
use App\Jobs\GenerateReportJob;
use App\Models\IndicatorTarget;
use App\Models\Organization;
use App\Models\PerformancePeriod;
use App\Models\PlanningDocument;
use App\Models\PlanningPeriod;
use App\Models\Realization;
use App\Models\Report;
use App\Services\AchievementCalculator;
use App\Services\AuditService;
use App\Services\AuthorizationService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    public function __construct(
        private readonly AuthorizationService $authorization,
        private readonly AuditService $audit,
        private readonly AchievementCalculator $calculator,
    ) {}

    public function index(Request $request): Response
    {
        $this->authorize('view-reports');

        $defaultYear = (int) (PlanningPeriod::where('status', 'active')->value('year')
            ?? PlanningPeriod::orderByDesc('year')->value('year')
            ?? (int) date('Y'));

        $selectedYear = $request->integer('year', $defaultYear);
        if ($selectedYear < 2000 || $selectedYear > 2099) {
            $selectedYear = $defaultYear;
        }

        // Available years for dropdown
        $planningYears = PlanningPeriod::getAvailableYears();

        $extraYears = PlanningDocument::whereIn('type', ['lkip', 'lkjip', 'laporan_kinerja'])
            ->distinct()
            ->pluck('year')
            ->toArray();
        $availableYears = array_values(array_unique(array_filter(array_merge([$defaultYear], $planningYears, $extraYears))));
        rsort($availableYears);

        // Province / Pemda Org
        $provinsi = Organization::where('type', 'province')->first();
        $provId = $provinsi?->id;

        // LKIP Pemda dihapus (Rumah Besar OPD)
        $pemdaDocuments = [];

        // B. LKIP Perangkat Daerah (Seluruh OPD untuk tahun terpilih)
        $opds = Organization::query()
            ->where('is_active', true)
            ->when($provId, fn ($q) => $q->where('id', '!=', $provId))
            ->orderBy('id')
            ->get(['id', 'code', 'name', 'type']);

        $opdDocs = PlanningDocument::query()
            ->whereIn('type', ['lkip', 'lkjip', 'laporan_kinerja'])
            ->where('year', $selectedYear)
            ->whereIn('organization_id', $opds->pluck('id'))
            ->get()
            ->keyBy('organization_id');

        $matriks = [];
        foreach ($opds as $idx => $opd) {
            $doc = $opdDocs->get($opd->id);
            $fullPath = $doc ? $this->resolveFilePath($doc->file_path) : null;
            $hasFile = (bool) ($doc && ! empty($doc->file_path) && $fullPath);

            $matriks[] = [
                'no' => $idx + 1,
                'organization_id' => $opd->id,
                'perangkat_daerah' => $opd->name,
                'tahun' => $selectedYear,
                'file_lkip' => $hasFile
                    ? ($doc->title ?: "LKIP {$opd->name} {$selectedYear}.pdf")
                    : ($doc && ! empty($doc->file_path) ? basename($doc->file_path) : '-'),
                'status' => $hasFile ? 'Tersedia' : 'Belum Tersedia',
                'has_file' => $hasFile,
                'tanggal_upload' => $doc ? ($doc->updated_at?->format('d-m-Y') ?? $doc->created_at?->format('d-m-Y')) : '-',
                'doc_id' => $doc?->id,
            ];
        }

        // Kartu Utama
        $totalOpd = $opds->count();
        $lkipTersedia = collect($matriks)->where('status', 'Tersedia')->count();
        $belumTersedia = $totalOpd - $lkipTersedia;
        $persentase = $totalOpd > 0 ? round(($lkipTersedia / $totalOpd) * 100) : 0;

        $kartuUtama = [
            'total_opd' => $totalOpd,
            'lkip_tersedia' => $lkipTersedia,
            'belum_tersedia' => $belumTersedia,
            'persentase_kelengkapan' => $persentase,
        ];

        $user = $request->user();
        $isProvincialAdmin = $this->authorization->isProvincialAdmin($user);
        $accessibleOrgIds = $this->authorization->accessibleOrganizationIds($user);
        $canUpload = $isProvincialAdmin
            || $user->hasPermission('report:generate')
            || $user->hasPermission('planning:submit')
            || $user->can('generate-reports')
            || $user->can('report:generate');

        return Inertia::render('Reports/Index', [
            'selected_year' => $selectedYear,
            'available_years' => $availableYears,
            'pemda_documents' => $pemdaDocuments,
            'kartu_utama' => $kartuUtama,
            'matriks' => $matriks,
            'can_upload' => $canUpload,
            'is_provincial_admin' => $isProvincialAdmin,
            'accessible_organization_ids' => $accessibleOrgIds,
            'user_organization_id' => $user->organization_id,
        ]);
    }

    public function upload(Request $request): RedirectResponse
    {
        $this->authorize('view-reports');

        $validated = $request->validate([
            'target_type' => ['nullable', 'string', 'in:opd'],
            'organization_id' => ['required', 'integer', 'exists:organizations,id'],
            'year' => ['required', 'integer', 'min:2000', 'max:2099'],
            'file' => ['required', 'file', 'mimes:pdf', 'max:25600'],
        ], [
            'file.required' => 'File dokumen LKIP wajib dipilih.',
            'file.mimes' => 'Format file harus PDF.',
            'file.max' => 'Ukuran file PDF maksimal 25 MB.',
            'organization_id.required' => 'Perangkat Daerah wajib dipilih.',
        ]);

        $year = (int) $validated['year'];
        $orgId = (int) $validated['organization_id'];
        $file = $request->file('file');
        $originalName = $file->getClientOriginalName();

        $this->authorization->canAccessOrganization($request->user(), $orgId)
            ?: abort(403, 'Di luar lingkup organisasi Anda.');
        $org = Organization::findOrFail($orgId);
        $title = $originalName ?: "LKIP {$org->name} {$year}.pdf";
        $code = "LKIP-OPD-{$orgId}-{$year}";

        // Store file in local storage
        $storedPath = $file->store("planning-documents/{$year}/lkip", 'local');

        $doc = PlanningDocument::query()
            ->whereIn('type', ['lkip', 'lkjip', 'laporan_kinerja'])
            ->where('year', $year)
            ->where('organization_id', $orgId)
            ->first();

        $perfPeriod = PerformancePeriod::where('year', $year)->first()
            ?? PerformancePeriod::orderByDesc('year')->first();

        if ($doc) {
            $oldPath = $this->resolveFilePath($doc->file_path);
            if ($oldPath && file_exists($oldPath)) {
                @unlink($oldPath);
            }
            if (! $doc->performance_period_id && $perfPeriod) {
                $doc->performance_period_id = $perfPeriod->id;
            }
            if (! $doc->periode_type) {
                $doc->periode_type = 'tahunan';
            }
            if (! $doc->start_year) {
                $doc->start_year = $year;
            }
            if (! $doc->end_year) {
                $doc->end_year = $year;
            }
        } else {
            $doc = new PlanningDocument;
            $doc->code = $code;
            $doc->type = 'lkjip';
            $doc->organization_id = $orgId;
            $doc->performance_period_id = $perfPeriod?->id;
            $doc->year = $year;
            $doc->start_year = $year;
            $doc->end_year = $year;
            $doc->periode_type = 'tahunan';
            $doc->created_by = $request->user()->id;
        }

        if (Schema::hasColumn('planning_documents', 'start_date')) {
            $doc->start_date = "{$year}-01-01";
        }
        if (Schema::hasColumn('planning_documents', 'end_date')) {
            $doc->end_date = "{$year}-12-31";
        }

        $doc->title = $title;
        $doc->file_path = $storedPath;
        $doc->status = 'approved';
        $doc->updated_by = $request->user()->id;
        $doc->save();

        $this->audit->log('upload', 'planning_document', $doc->id, $doc->organization_id);

        return back()->with('success', 'Dokumen LKIP berhasil diunggah.');
    }

    public function preview(int $id)
    {
        $this->authorize('view-reports');

        $doc = PlanningDocument::findOrFail($id);
        $fullPath = $this->resolveFilePath($doc->file_path);

        if (! $fullPath || ! file_exists($fullPath)) {
            abort(404, 'File dokumen tidak ditemukan.');
        }

        return response()->file($fullPath, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.($doc->title ?: basename($fullPath)).'"',
        ]);
    }

    public function downloadFile(int $id)
    {
        $this->authorize('view-reports');

        $doc = PlanningDocument::findOrFail($id);
        $fullPath = $this->resolveFilePath($doc->file_path);

        if (! $fullPath || ! file_exists($fullPath)) {
            abort(404, 'File dokumen tidak ditemukan.');
        }

        $downloadName = $doc->title ?: basename($fullPath);
        if (! str_ends_with(strtolower($downloadName), '.pdf')) {
            $downloadName .= '.pdf';
        }

        return response()->download($fullPath, $downloadName);
    }

    public function destroy(Request $request, int $id): RedirectResponse
    {
        $this->authorize('view-reports');

        $doc = PlanningDocument::findOrFail($id);
        $this->authorization->canAccessOrganization($request->user(), (int) $doc->organization_id)
            ?: abort(403, 'Di luar lingkup organisasi Anda.');

        $fullPath = $this->resolveFilePath($doc->file_path);
        if ($fullPath && file_exists($fullPath)) {
            @unlink($fullPath);
        }

        $orgId = $doc->organization_id;
        $doc->delete();

        $this->audit->log('delete', 'planning_document', $id, $orgId);

        return back()->with('success', 'Dokumen LKIP berhasil dihapus.');
    }

    private function resolveFilePath(?string $path): ?string
    {
        if (! $path) {
            return null;
        }
        if (Storage::disk('local')->exists($path)) {
            return Storage::disk('local')->path($path);
        }
        if (Storage::disk('public')->exists($path)) {
            return Storage::disk('public')->path($path);
        }
        if (file_exists(storage_path('app/'.$path))) {
            return storage_path('app/'.$path);
        }
        if (file_exists(storage_path('app/public/'.$path))) {
            return storage_path('app/public/'.$path);
        }

        return null;
    }

    public function generate(Request $request): RedirectResponse
    {
        $this->authorize('generate-reports');

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'type' => ['required', 'string', 'in:recap,lkjip,aggregate,custom'],
            'organization_id' => ['nullable', 'integer', 'exists:organizations,id'],
            'planning_period_id' => ['nullable', 'integer', 'exists:planning_periods,id'],
            'format' => ['required', 'string', 'in:pdf,xlsx,csv'],
        ]);

        if (! empty($validated['organization_id'])) {
            $this->authorization->canAccessOrganization($request->user(), (int) $validated['organization_id'])
                ?: abort(403, 'Di luar lingkup organisasi Anda.');
        }

        // Create report record in 'pending' status first (NFR-PERF-004)
        $report = Report::create([
            'code' => 'RPT-'.now()->format('YmdHis').'-'.substr(md5((string) mt_rand()), 0, 6),
            'title' => $validated['title'],
            'type' => $validated['type'],
            'organization_id' => $validated['organization_id'] ?? null,
            'planning_period_id' => $validated['planning_period_id'] ?? null,
            'format' => $validated['format'],
            'status' => 'pending',
            'parameters' => $validated,
            'generated_by' => $request->user()->id,
            'generated_at' => null,
        ]);

        // Dispatch background job — non-blocking (BRD NFR-PERF-004)
        GenerateReportJob::dispatch($report->id);

        $this->audit->log('generate_requested', 'report', $report->id, $validated['organization_id'] ?? null);

        return redirect()->route('reports.index')
            ->with('success', 'Laporan sedang diproses. Refresh halaman untuk melihat status terkini.');
    }

    /**
     * AJAX status endpoint — frontend polls this while status = pending/generating
     */
    public function status(Report $report): JsonResponse
    {
        $this->authorize('view-reports');

        return response()->json([
            'id' => $report->id,
            'status' => $report->status,
            'generated_at' => $report->generated_at?->toIso8601String(),
            'file_path' => $report->file_path ? route('reports.download', $report->id) : null,
        ]);
    }

    public function download(Report $report): StreamedResponse
    {
        $this->authorize('view-reports');

        if ($report->status !== 'generated' || ! $report->file_path || ! Storage::disk('local')->exists($report->file_path)) {
            abort(404, 'File laporan tidak tersedia.');
        }

        $this->audit->log('download', 'report', $report->id, $report->organization_id);

        $ext = pathinfo($report->file_path, PATHINFO_EXTENSION);
        $filename = str($report->title)->slug().'.'.$ext;

        return Storage::disk('local')->download($report->file_path, $filename);
    }

    /**
     * Generate and stream a PDF for a report on-the-fly from live data.
     * FR-RPT-PDF: Allows downloading a PDF regardless of the stored format.
     */
    public function downloadPdf(Report $report): HttpResponse
    {
        $this->authorize('view-reports');

        abort_unless($report->status === 'generated', 404, 'Laporan belum siap.');

        $params = $report->parameters ?? [];

        // Re-build rows from live approved data (mirrors GenerateReportJob logic)
        $realizations = Realization::query()
            ->with([
                'indicatorVersion:id,indicator_id,name,direction,measurement_unit_id',
                'indicatorVersion.measurementUnit:id,code,name,symbol',
                'indicatorVersion.indicator:id,code',
                'organization:id,code,name',
                'measurementPeriod:id,name,type',
            ])
            ->where('status', 'approved')
            ->when($params['organization_id'] ?? null, fn ($q, $orgId) => $q->where('organization_id', $orgId))
            ->when($params['planning_period_id'] ?? null, function ($q, $periodId) {
                $q->whereHas('measurementPeriod', fn ($sub) => $sub->where('planning_period_id', $periodId));
            })
            ->get();

        $targets = IndicatorTarget::query()
            ->with('indicatorVersion:id,direction')
            ->where('status', 'approved')
            ->get()
            ->keyBy(fn ($t) => $t->indicator_version_id.'|'.$t->organization_id);

        $rows = $realizations->map(function (Realization $realization) use ($targets): array {
            $target = $targets->get($realization->indicator_version_id.'|'.$realization->organization_id);

            return [
                'indicator_code' => $realization->indicatorVersion->indicator->code ?? '',
                'indicator_name' => $realization->indicatorVersion->name,
                'organization' => ($realization->organization->code ?? '').' – '.($realization->organization->name ?? ''),
                'target_value' => $target ? (float) $target->target_value : '-',
                'realization_value' => (float) $realization->value,
                'achievement' => $this->calculator->calculate(
                    $realization->value,
                    $target?->target_value,
                    $realization->indicatorVersion->direction,
                ),
            ];
        })->values()->all();

        $this->audit->log('download_pdf', 'report', $report->id, $report->organization_id);

        $pdf = Pdf::loadView('reports.pdf', [
            'report' => $report,
            'rows' => $rows,
        ])->setPaper('a4', 'landscape');

        $filename = str($report->title)->slug().'.pdf';

        return $pdf->download($filename);
    }
}
