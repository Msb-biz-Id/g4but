<?php

namespace App\Http\Controllers\Planning;

use App\Http\Controllers\Controller;
use App\Models\IkuHistory;
use App\Models\Indicator;
use App\Models\IndicatorTarget;
use App\Models\IndicatorVersion;
use App\Models\MeasurementUnit;
use App\Models\Organization;
use App\Models\PlanningPeriod;
use App\Models\StrategicGoal;
use App\Models\StrategicObjective;
use App\Models\User;
use App\Services\AuditService;
use App\Services\AuthorizationService;
use App\Services\IkuWorkflowService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class IkuController extends Controller
{
    public function __construct(
        private readonly IkuWorkflowService $workflow,
        private readonly AuditService $audit,
        private readonly AuthorizationService $authorization,
    ) {}

    // ── Index ──────────────────────────────────────────────────────────────

    public function index(Request $request): Response
    {
        $defaultYear = (int) (
            PlanningPeriod::where('status', 'active')->whereNotNull('year')->value('year')
            ?? PlanningPeriod::orderByDesc('year')->value('year')
            ?? (int) date('Y')
        );
        $activeYear = $request->integer('active_year') ?: $defaultYear;
        $availableYears = PlanningPeriod::getAvailableYears();
        if (! in_array($activeYear, $availableYears, true)) {
            $availableYears[] = $activeYear;
            sort($availableYears);
        }

        $user = $request->user();
        $isOpdAdmin = $user && $user->isOpdAdmin();
        $accessibleOrgIds = $this->authorization->accessibleOrganizationIds($user);
        $isAdminOpd = ! $isOpdAdmin;
        $userOpdId = $user->organization?->id ?? ($accessibleOrgIds[0] ?? null);

        $query = Indicator::query()
            ->iku()
            ->with([
                'planningPeriod:id,code,name,year,start_date,end_date',
                'strategicGoal:id,name',
                'strategicObjective:id,name',
                'ownerOrganization:id,code,name',
                'measurementUnit:id,symbol,name',
                'responsibleOfficer:id,name',
                'targets:id,indicator_version_id,year,target_value',
            ])
            // Scoping unit: Unit kerja hanya melihat IKU dalam lingkup organisasinya
            ->when(! $isOpdAdmin, fn ($q) => $q->whereIn('owner_organization_id', $accessibleOrgIds))
            ->when($request->filled('period_id'), fn ($q) => $q->byPeriod($request->integer('period_id')))
            ->when($request->filled('level'), fn ($q) => $q->byLevel($request->string('level')))
            ->when($request->filled('org_id') && $isOpdAdmin, fn ($q) => $q->where('owner_organization_id', $request->integer('org_id')))
            ->when($request->filled('goal_id'), fn ($q) => $q->where('strategic_goal_id', $request->integer('goal_id')))
            ->when($request->filled('objective_id'), fn ($q) => $q->where('strategic_objective_id', $request->integer('objective_id')))
            ->when($request->filled('iku_status'), fn ($q) => $q->byIkuStatus($request->string('iku_status')))
            ->when($request->filled('search'), fn ($q) => $q->where('name', 'like', '%'.$request->string('search').'%'))
            ->latest('id')
            ->paginate($request->integer('per_page', 25))
            ->withQueryString();

        $organizations = Organization::query()
            ->when(! $isOpdAdmin, fn ($q) => $q->whereIn('id', $accessibleOrgIds))
            ->orderBy('code')
            ->get(['id', 'code', 'name']);

        return Inertia::render('Planning/Iku/Index', [
            'ikuList' => $query,
            'filters' => array_merge($request->only(['period_id', 'level', 'org_id', 'goal_id', 'objective_id', 'iku_status', 'search', 'per_page']), ['active_year' => (string) $activeYear]),
            'activeYear' => $activeYear,
            'availableYears' => $availableYears,
            'available_years' => $availableYears,
            'periods' => PlanningPeriod::orderByDesc('year')->get(['id', 'code', 'name', 'year', 'start_date', 'end_date']),
            'organizations' => $organizations,
            'statusOptions' => $this->statusOptions(),
            'isAdminOpd' => $isAdminOpd,
            'isOpdAdmin' => $isOpdAdmin,
            'accessibleOrgIds' => $accessibleOrgIds,
            'userOpdId' => $userOpdId,
        ]);
    }

    // ── Create / Store ─────────────────────────────────────────────────────

    public function create(Request $request): Response
    {
        $user = $request->user();
        $isOpdAdmin = $user && $user->isOpdAdmin();
        $accessibleOrgIds = $this->authorization->accessibleOrganizationIds($user);
        $isAdminOpd = ! $isOpdAdmin;
        $userOpdId = $user->organization?->id ?? ($accessibleOrgIds[0] ?? null);

        $organizations = Organization::orderBy('code')
            ->when(! $isOpdAdmin, fn ($q) => $q->whereIn('id', $accessibleOrgIds))
            ->get(['id', 'code', 'name']);

        $officers = User::orderBy('name')
            ->when(! $isOpdAdmin, fn ($q) => $q->whereHas('organizations', fn ($oq) => $oq->whereIn('organizations.id', $accessibleOrgIds)))
            ->get(['id', 'name']);

        return Inertia::render('Planning/Iku/Create', [
            'periods' => PlanningPeriod::orderByDesc('year')->get(['id', 'code', 'name', 'year', 'start_date', 'end_date']),
            'organizations' => $organizations,
            'units' => MeasurementUnit::where('is_active', true)->orderBy('name')->get(['id', 'name', 'symbol']),
            'officers' => $officers,
            'levelOptions' => $this->levelOptions(),
            'polarizationOptions' => $this->polarizationOptions(),
            'frequencyOptions' => $this->frequencyOptions(),
            'isAdminOpd' => $isAdminOpd,
            'isOpdAdmin' => $isOpdAdmin,
            'accessibleOrgIds' => $accessibleOrgIds,
            'userOpdId' => $userOpdId,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        $isOpdAdmin = $user && $user->isOpdAdmin();
        $accessibleOrgIds = $this->authorization->accessibleOrganizationIds($user);
        $userOpdId = $user->organization_id ?? $user->organization?->id;

        // Jika level 'perangkat_daerah', normalisasi ke 'opd'
        if ($request->input('level') === 'perangkat_daerah') {
            $request->merge(['level' => 'opd']);
        }

        // Unit-scoped user: kunci owner_organization_id ke organisasi yang berhak
        if (! $isOpdAdmin && $userOpdId) {
            $request->merge([
                'owner_organization_id' => $userOpdId,
            ]);
        }

        $validated = $request->validate($this->rules(), $this->messages());

        $iku = DB::transaction(function () use ($validated, $request) {
            $level = $validated['level'] ?? 'opd';
            $iku = Indicator::create([
                ...$validated,
                'is_iku' => true,
                'iku_status' => Indicator::IKU_STATUS_DRAFT,
                'status' => 'draft',
                'code' => $this->generateCode($validated['owner_organization_id'] ?? null, $level),
            ]);

            // Catat history CREATE
            $this->workflow->recordHistory(
                $iku, IkuHistory::ACTION_CREATE,
                null, $this->workflow->snapshot($iku),
                'IKU baru dibuat', $request->user()->id
            );

            // Simpan target tahunan jika ada
            if (! empty($validated['targets'])) {
                $this->storeTargets($iku, $validated['targets']);
            }

            $this->audit->log('create', 'iku', $iku->id);

            return $iku;
        });

        return redirect()->route('planning.iku.show', $iku)
            ->with('success', "IKU '{$iku->name}' berhasil dibuat.");
    }

    // ── Show ───────────────────────────────────────────────────────────────

    public function show(Indicator $iku): Response
    {
        $user = request()->user();
        $canEdit = $user && $user->can('update', $iku);

        $iku->load([
            'planningPeriod', 'strategicGoal', 'strategicObjective',
            'ownerOrganization', 'measurementUnit', 'responsibleOfficer',
            'targets.planningPeriod',
            'ikuHistories.user:id,name',
        ]);

        $canVerify = $user ? ($user->isSuperAdmin() || $user->isOpdAdmin() || $user->hasRole('Kepala OPD')) : false;

        return Inertia::render('Planning/Iku/Show', [
            'iku' => $iku,
            'canEdit' => $canEdit,
            'canVerify' => $canVerify,
            'isReviewer' => $canVerify,
        ]);
    }

    // ── Edit / Update ──────────────────────────────────────────────────────

    public function edit(Request $request, Indicator $iku): Response
    {
        $this->authorize('update', $iku);

        $user = $request->user();
        $isOpdAdmin = $user && $user->isOpdAdmin();
        $accessibleOrgIds = $this->authorization->accessibleOrganizationIds($user);
        $isAdminOpd = ! $isOpdAdmin;
        $userOpdId = $user->organization?->id ?? ($accessibleOrgIds[0] ?? null);

        $iku->load(['targets', 'planningPeriod', 'strategicGoal', 'strategicObjective', 'ownerOrganization']);

        $organizations = Organization::orderBy('code')
            ->when(! $isOpdAdmin, fn ($q) => $q->whereIn('id', $accessibleOrgIds))
            ->get(['id', 'code', 'name']);

        $officers = User::orderBy('name')
            ->when(! $isOpdAdmin, fn ($q) => $q->whereHas('organizations', fn ($oq) => $oq->whereIn('organizations.id', $accessibleOrgIds)))
            ->get(['id', 'name']);

        return Inertia::render('Planning/Iku/Create', [
            'iku' => $iku,
            'periods' => PlanningPeriod::orderByDesc('year')->get(['id', 'code', 'name', 'year', 'start_date', 'end_date']),
            'organizations' => $organizations,
            'units' => MeasurementUnit::where('is_active', true)->orderBy('name')->get(['id', 'name', 'symbol']),
            'officers' => $officers,
            'goals' => StrategicGoal::where('planning_period_id', $iku->planning_period_id)->get(['id', 'name']),
            'objectives' => StrategicObjective::where('strategic_goal_id', $iku->strategic_goal_id)->get(['id', 'name']),
            'levelOptions' => $this->levelOptions(),
            'polarizationOptions' => $this->polarizationOptions(),
            'frequencyOptions' => $this->frequencyOptions(),
            'isAdminOpd' => $isAdminOpd,
            'isOpdAdmin' => $isOpdAdmin,
            'accessibleOrgIds' => $accessibleOrgIds,
            'userOpdId' => $userOpdId,
        ]);
    }

    public function update(Request $request, Indicator $iku): RedirectResponse
    {
        $this->authorize('update', $iku);

        $user = $request->user();
        $isOpdAdmin = $user && $user->isOpdAdmin();
        $userOpdId = $user->organization_id ?? $user->organization?->id;

        if ($request->input('level') === 'perangkat_daerah') {
            $request->merge(['level' => 'opd']);
        }

        if (! $isOpdAdmin && $userOpdId) {
            $request->merge([
                'owner_organization_id' => $userOpdId,
            ]);
        }

        $validated = $request->validate($this->rules($iku->id), $this->messages());

        DB::transaction(function () use ($validated, $iku, $request) {
            $prev = $this->workflow->snapshot($iku);
            $iku->update($validated);

            $this->workflow->recordHistory(
                $iku, IkuHistory::ACTION_UPDATE,
                $prev, $this->workflow->snapshot($iku->fresh()),
                $request->string('change_reason')->toString() ?: null,
                $request->user()->id
            );

            if (! empty($validated['targets'])) {
                $this->storeTargets($iku, $validated['targets']);
            }

            $this->audit->log('update', 'iku', $iku->id);
        });

        return redirect()->route('planning.iku.show', $iku)
            ->with('success', "IKU '{$iku->name}' berhasil diperbarui.");
    }

    // ── Workflow Actions ───────────────────────────────────────────────────

    public function submit(Request $request, Indicator $iku): RedirectResponse
    {
        $this->authorize('submit', $iku);

        try {
            $this->workflow->submit($iku, $request->user());
        } catch (\LogicException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', "IKU '{$iku->name}' berhasil diajukan untuk review.");
    }

    public function review(Request $request, Indicator $iku): RedirectResponse
    {
        $this->authorize('review', $iku);

        try {
            $this->workflow->startReview($iku, $request->user());
        } catch (\LogicException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', "Review IKU '{$iku->name}' dimulai.");
    }

    public function returnRevision(Request $request, Indicator $iku): RedirectResponse
    {
        $this->authorize('returnRevision', $iku);

        $request->validate(['notes' => ['required', 'string', 'max:1000']]);

        try {
            $this->workflow->returnForRevision($iku, $request->user(), $request->string('notes'));
        } catch (\LogicException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', "IKU '{$iku->name}' dikembalikan untuk perbaikan.");
    }

    public function finalize(Request $request, Indicator $iku): RedirectResponse
    {
        $this->authorize('finalize', $iku);

        try {
            $this->workflow->finalize($iku, $request->user());
        } catch (\LogicException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', "IKU '{$iku->name}' berhasil difinalisasi.");
    }

    public function deactivate(Request $request, Indicator $iku): RedirectResponse
    {
        $this->authorize('deactivate', $iku);

        try {
            $this->workflow->deactivate($iku, $request->user());
        } catch (\LogicException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', "IKU '{$iku->name}' telah dinonaktifkan.");
    }

    // ── Destroy (soft delete only, tidak boleh hard delete Final) ─────────

    public function destroy(Request $request, Indicator $iku): RedirectResponse
    {
        $this->authorize('delete', $iku);

        DB::transaction(function () use ($iku, $request) {
            $this->workflow->recordHistory(
                $iku, IkuHistory::ACTION_DEACTIVATE,
                $this->workflow->snapshot($iku), null,
                'Dihapus (soft delete)', $request->user()->id
            );
            $iku->delete();
        });

        $this->audit->log('delete', 'iku', $iku->id);

        return redirect()->route('planning.iku.index')
            ->with('success', "IKU '{$iku->name}' berhasil dihapus.");
    }

    // ── Export ─────────────────────────────────────────────────────────────

    public function exportExcel(Request $request): StreamedResponse
    {
        $user = $request->user();
        $isOpdAdmin = $user && $user->isOpdAdmin();
        $accessibleOrgIds = $this->authorization->accessibleOrganizationIds($user);

        $defaultYear = (int) (
            PlanningPeriod::where('status', 'active')->whereNotNull('year')->value('year')
            ?? PlanningPeriod::orderByDesc('year')->value('year')
            ?? (int) date('Y')
        );
        $activeYear = $request->integer('active_year') ?: $defaultYear;

        $period = $request->filled('period_id')
            ? PlanningPeriod::find($request->integer('period_id'))
            : (PlanningPeriod::where('status', 'active')->orderByDesc('year')->first() ?? PlanningPeriod::orderByDesc('year')->first());

        $years = ($period && $period->start_year && $period->end_year)
            ? range($period->start_year, $period->end_year)
            : PlanningPeriod::getAvailableYears();
        if (empty($years)) {
            $years = [$activeYear];
        }

        $query = Indicator::query()
            ->iku()
            ->with(['strategicObjective:id,name', 'ownerOrganization:id,name', 'measurementUnit:id,symbol', 'targets'])
            ->when(! $isOpdAdmin, fn ($q) => $q->whereIn('owner_organization_id', $accessibleOrgIds))
            ->when($request->filled('period_id'), fn ($q) => $q->byPeriod($request->integer('period_id')))
            ->when($request->filled('level'), fn ($q) => $q->byLevel($request->string('level')))
            ->when($request->filled('org_id') && $isOpdAdmin, fn ($q) => $q->where('owner_organization_id', $request->integer('org_id')))
            ->when($request->filled('iku_status'), fn ($q) => $q->byIkuStatus($request->string('iku_status')))
            ->orderBy('id');

        $ikus = $query->get();

        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Daftar IKU');

        $headers = ['No', 'Kode IKU', 'Level', 'Unit / OPD', 'Sasaran Strategis', 'Indikator Kinerja Utama', 'Satuan', 'Status'];
        foreach ($years as $y) {
            $headers[] = "Target {$y}";
        }

        foreach ($headers as $colIdx => $text) {
            $colLetter = Coordinate::stringFromColumnIndex($colIdx + 1);
            $sheet->setCellValue("{$colLetter}1", $text);
            $sheet->getStyle("{$colLetter}1")->getFont()->setBold(true);
            $sheet->getColumnDimensionByColumn($colIdx + 1)->setAutoSize(true);
        }

        $rowIdx = 2;
        foreach ($ikus as $i => $item) {
            $colIdx = 1;
            $sheet->setCellValue(Coordinate::stringFromColumnIndex($colIdx++)."{$rowIdx}", $i + 1);
            $sheet->setCellValue(Coordinate::stringFromColumnIndex($colIdx++)."{$rowIdx}", $item->code);
            $sheet->setCellValue(Coordinate::stringFromColumnIndex($colIdx++)."{$rowIdx}", strtoupper($item->level));
            $sheet->setCellValue(Coordinate::stringFromColumnIndex($colIdx++)."{$rowIdx}", $item->ownerOrganization?->name ?? '-');
            $sheet->setCellValue(Coordinate::stringFromColumnIndex($colIdx++)."{$rowIdx}", $item->strategicObjective?->name ?? '-');
            $sheet->setCellValue(Coordinate::stringFromColumnIndex($colIdx++)."{$rowIdx}", $item->name);
            $sheet->setCellValue(Coordinate::stringFromColumnIndex($colIdx++)."{$rowIdx}", $item->measurementUnit?->symbol ?? '-');
            $sheet->setCellValue(Coordinate::stringFromColumnIndex($colIdx++)."{$rowIdx}", ucfirst($item->iku_status));

            foreach ($years as $y) {
                $val = $item->targets?->firstWhere('year', $y)?->target_value;
                $sheet->setCellValue(Coordinate::stringFromColumnIndex($colIdx++)."{$rowIdx}", $val !== null ? (float) $val : '-');
            }
            $rowIdx++;
        }

        $writer = new Xlsx($spreadsheet);
        $filename = 'Export-IKU-'.date('YmdHis').'.xlsx';

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    public function exportPdfRekap(Request $request)
    {
        $defaultYear = (int) (
            PlanningPeriod::where('status', 'active')->whereNotNull('year')->value('year')
            ?? PlanningPeriod::orderByDesc('year')->value('year')
            ?? (int) date('Y')
        );
        $activeYear = $request->integer('active_year') ?: $defaultYear;

        $user = $request->user();
        $isOpdAdmin = $user && $user->isOpdAdmin();
        $accessibleOrgIds = $this->authorization->accessibleOrganizationIds($user);

        $ikus = Indicator::query()
            ->iku()
            ->with(['strategicObjective:id,name', 'measurementUnit:id,symbol', 'targets'])
            ->when(! $isOpdAdmin, fn ($q) => $q->whereIn('owner_organization_id', $accessibleOrgIds))
            ->when($request->filled('period_id'), fn ($q) => $q->byPeriod($request->integer('period_id')))
            ->when($request->filled('level'), fn ($q) => $q->byLevel($request->string('level')))
            ->when($request->filled('iku_status'), fn ($q) => $q->byIkuStatus($request->string('iku_status')))
            ->latest('id')
            ->get();

        $rows = $ikus->map(function ($item, $idx) use ($activeYear) {
            $tgt = $item->targets?->firstWhere('year', $activeYear)?->target_value;

            return [
                'no' => $idx + 1,
                'sasaran' => $item->strategicObjective?->name ?? '-',
                'indikator' => $item->name,
                'satuan' => $item->measurementUnit?->symbol ?? '-',
                'karakter' => ucfirst($item->polarization ?? 'Positif'),
                'target' => $tgt !== null ? number_format((float) $tgt, 2, ',', '.') : '-',
                'realisasi' => '-',
                'capaian' => null,
                'status' => ucfirst($item->iku_status),
            ];
        });

        $pdf = Pdf::loadView('pdf.analytics.iku', [
            'year' => $activeYear,
            'rows' => $rows,
            'generatedAt' => now()->translatedFormat('d F Y H:i'),
        ]);

        return $pdf->download("Rekap-IKU-{$activeYear}.pdf");
    }

    public function exportPdf(Indicator $iku)
    {
        $iku->load([
            'planningPeriod', 'strategicGoal', 'strategicObjective',
            'ownerOrganization', 'measurementUnit', 'responsibleOfficer', 'targets',
        ]);

        $rows = collect([[
            'no' => 1,
            'sasaran' => $iku->strategicObjective?->name ?? '-',
            'indikator' => $iku->name,
            'satuan' => $iku->measurementUnit?->symbol ?? '-',
            'karakter' => ucfirst($iku->polarization ?? 'Positif'),
            'target' => $iku->targets?->first()?->target_value ?? '-',
            'realisasi' => '-',
            'capaian' => null,
            'status' => ucfirst($iku->iku_status),
        ]]);

        $pdf = Pdf::loadView('pdf.analytics.iku', [
            'year' => (int) date('Y'),
            'rows' => $rows,
            'generatedAt' => now()->translatedFormat('d F Y H:i'),
        ]);

        return $pdf->download("IKU-{$iku->code}.pdf");
    }

    // ── Private Helpers ────────────────────────────────────────────────────

    private function rules(?int $ignoreId = null): array
    {
        $periodId = request()->input('planning_period_id');
        $level = request()->input('level') === 'perangkat_daerah' ? 'opd' : request()->input('level');
        $orgId = request()->input('owner_organization_id');
        $objectiveId = request()->input('strategic_objective_id');

        $duplicateCheck = Rule::unique('indicators', 'name')
            ->where('is_iku', true)
            ->where('planning_period_id', $periodId)
            ->where('level', $level)
            ->where('strategic_objective_id', $objectiveId)
            ->where('owner_organization_id', $orgId);

        if ($ignoreId) {
            $duplicateCheck->ignore($ignoreId);
        }

        return [
            // Step 1 — Identitas
            'level' => ['required', Rule::in(['opd', 'unit', 'perangkat_daerah'])],
            'planning_period_id' => ['required', 'integer', 'exists:planning_periods,id'],
            'owner_organization_id' => ['nullable', 'integer', 'exists:organizations,id'],
            'strategic_goal_id' => ['required', 'integer', 'exists:strategic_goals,id'],
            'strategic_objective_id' => ['required', 'integer', 'exists:strategic_objectives,id'],
            'name' => ['required', 'string', 'max:255', $duplicateCheck],
            'measurement_unit_id' => ['required', 'integer', 'exists:measurement_units,id'],

            // Step 2 — Metadata
            'definition' => ['required', 'string'],
            'formula_notes' => ['required', 'string'],
            'baseline_year' => ['required', 'integer', 'min:2000', 'max:2100'],
            'baseline_value' => ['nullable', 'numeric'],
            'baseline_note' => ['nullable', 'string', 'max:500'],
            'polarization' => ['required', Rule::in(['positif', 'negatif', 'stabil'])],
            'data_source' => ['required', 'string', 'max:255'],
            'frequency' => ['required', Rule::in(['monthly', 'quarterly', 'semester', 'annual'])],
            'responsible_officer_id' => ['nullable', 'integer', 'exists:users,id'],

            // Step 3 — Targets
            'targets' => ['nullable', 'array'],
            'targets.*.year' => ['required_with:targets', 'integer'],
            'targets.*.target_value' => ['required_with:targets', 'numeric'],

            // Optional
            'change_reason' => ['nullable', 'string', 'max:255'],
        ];
    }

    private function messages(): array
    {
        return [
            'name.required' => 'Nama IKU wajib diisi.',
            'name.unique' => 'IKU dengan nama ini sudah terdaftar pada sasaran dan periode yang sama.',
            'planning_period_id.required' => 'Periode perencanaan wajib dipilih.',
            'strategic_goal_id.required' => 'Tujuan strategis wajib dipilih.',
            'strategic_objective_id.required' => 'Sasaran strategis wajib dipilih.',
            'measurement_unit_id.required' => 'Satuan pengukuran wajib dipilih.',
            'definition.required' => 'Definisi operasional wajib diisi.',
            'formula_notes.required' => 'Formula / cara perhitungan wajib diisi.',
            'baseline_year.required' => 'Tahun baseline wajib diisi.',
            'polarization.required' => 'Polarisasi target wajib dipilih.',
            'data_source.required' => 'Sumber data wajib diisi.',
            'frequency.required' => 'Frekuensi pelaporan wajib dipilih.',
        ];
    }

    private function storeTargets(Indicator $iku, array $targets): void
    {
        $version = IndicatorVersion::firstOrCreate(
            ['indicator_id' => $iku->id, 'version_number' => 1],
            [
                'name' => $iku->name,
                'definition' => $iku->definition,
                'measurement_unit_id' => $iku->measurement_unit_id,
                'formula_notes' => $iku->formula_notes,
                'frequency' => $iku->frequency ?? 'annual',
                'data_source' => $iku->data_source,
                'created_by' => Auth::id() ?? $iku->responsible_officer_id,
            ]
        );

        if (! $iku->current_version_id) {
            $iku->update(['current_version_id' => $version->id]);
        }

        $orgId = $iku->owner_organization_id;

        foreach ($targets as $t) {
            IndicatorTarget::updateOrCreate(
                [
                    'indicator_version_id' => $version->id,
                    'organization_id' => $orgId,
                    'planning_period_id' => $iku->planning_period_id,
                    'year' => $t['year'],
                ],
                [
                    'target_value' => $t['target_value'],
                    'status' => 'draft',
                ]
            );
        }
    }

    private function generateCode(?int $orgId, string $level = 'opd'): string
    {
        $prefix = $level === 'unit' ? 'IKU-UNIT' : 'IKU-OPD';
        $seq = Indicator::iku()->count() + 1;

        return strtoupper($prefix.'-'.str_pad($seq, 4, '0', STR_PAD_LEFT));
    }

    private function statusOptions(): array
    {
        return [
            ['value' => 'draft',      'label' => 'Draft'],
            ['value' => 'diajukan',   'label' => 'Diajukan'],
            ['value' => 'review',     'label' => 'Review'],
            ['value' => 'perbaikan',  'label' => 'Perbaikan'],
            ['value' => 'final',      'label' => 'Final'],
            ['value' => 'nonaktif',   'label' => 'Nonaktif'],
        ];
    }

    private function levelOptions(): array
    {
        return [
            ['value' => 'opd',  'label' => 'OPD Induk'],
            ['value' => 'unit', 'label' => 'Unit (Sekretariat / Bidang)'],
        ];
    }

    private function polarizationOptions(): array
    {
        return [
            ['value' => 'positif', 'label' => 'Positif (semakin tinggi semakin baik)'],
            ['value' => 'negatif', 'label' => 'Negatif (semakin rendah semakin baik)'],
            ['value' => 'stabil',  'label' => 'Stabil (nilai target tetap)'],
        ];
    }

    private function frequencyOptions(): array
    {
        return [
            ['value' => 'monthly',   'label' => 'Bulanan'],
            ['value' => 'quarterly', 'label' => 'Triwulanan'],
            ['value' => 'semester',  'label' => 'Semesteran'],
            ['value' => 'annual',    'label' => 'Tahunan'],
        ];
    }
}
