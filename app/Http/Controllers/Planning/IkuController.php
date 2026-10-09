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
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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
        $isBappeda = $this->userIsBappeda($user);
        $isProvincialAdmin = $isBappeda || $this->authorization->isProvincialAdmin($user);
        $accessibleOrgIds = $this->authorization->accessibleOrganizationIds($user);
        $isAdminOpd = ! $isProvincialAdmin;
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
            // Scope OPD: user OPD hanya melihat IKU OPD-nya sendiri dan IKU Pemda
            ->when(! $isProvincialAdmin, fn ($q) => $q->where(function ($sub) use ($accessibleOrgIds) {
                $sub->whereIn('owner_organization_id', $accessibleOrgIds)
                    ->orWhere('level', 'pemda');
            }))
            ->when($request->filled('period_id'), fn ($q) => $q->byPeriod($request->integer('period_id')))
            ->when($request->filled('level'), fn ($q) => $q->byLevel($request->string('level')))
            ->when($request->filled('org_id') && $isProvincialAdmin, fn ($q) => $q->where('owner_organization_id', $request->integer('org_id')))
            ->when($request->filled('goal_id'), fn ($q) => $q->where('strategic_goal_id', $request->integer('goal_id')))
            ->when($request->filled('objective_id'), fn ($q) => $q->where('strategic_objective_id', $request->integer('objective_id')))
            ->when($request->filled('iku_status'), fn ($q) => $q->byIkuStatus($request->string('iku_status')))
            ->when($request->filled('search'), fn ($q) => $q->where('name', 'like', '%'.$request->string('search').'%'))
            ->latest('id')
            ->paginate($request->integer('per_page', 25))
            ->withQueryString();

        $organizations = Organization::query()
            ->when(! $isProvincialAdmin, fn ($q) => $q->whereIn('id', $accessibleOrgIds))
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
            'isProvincialAdmin' => $isProvincialAdmin,
            'accessibleOrgIds' => $accessibleOrgIds,
            'userOpdId' => $userOpdId,
        ]);
    }

    // ── Create / Store ─────────────────────────────────────────────────────

    public function create(Request $request): Response
    {
        $user = $request->user();
        $isBappeda = $this->userIsBappeda($user);
        $isProvincialAdmin = $isBappeda || $this->authorization->isProvincialAdmin($user);
        $accessibleOrgIds = $this->authorization->accessibleOrganizationIds($user);
        $isAdminOpd = ! $isProvincialAdmin;
        $userOpdId = $user->organization?->id ?? ($accessibleOrgIds[0] ?? null);

        $organizations = Organization::orderBy('code')
            ->when(! $isProvincialAdmin, fn ($q) => $q->whereIn('id', $accessibleOrgIds))
            ->get(['id', 'code', 'name']);

        $officers = User::orderBy('name')
            ->when(! $isProvincialAdmin, fn ($q) => $q->whereHas('organizations', fn ($oq) => $oq->whereIn('organizations.id', $accessibleOrgIds)))
            ->get(['id', 'name']);

        $levelOptions = $isAdminOpd
            ? [['value' => 'perangkat_daerah', 'label' => 'Perangkat Daerah']]
            : $this->levelOptions();

        return Inertia::render('Planning/Iku/Create', [
            'periods' => PlanningPeriod::orderByDesc('year')->get(['id', 'code', 'name', 'year', 'start_date', 'end_date']),
            'organizations' => $organizations,
            'units' => MeasurementUnit::where('is_active', true)->orderBy('name')->get(['id', 'name', 'symbol']),
            'officers' => $officers,
            'levelOptions' => $levelOptions,
            'polarizationOptions' => $this->polarizationOptions(),
            'frequencyOptions' => $this->frequencyOptions(),
            'isAdminOpd' => $isAdminOpd,
            'isProvincialAdmin' => $isProvincialAdmin,
            'accessibleOrgIds' => $accessibleOrgIds,
            'userOpdId' => $userOpdId,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        $isAdminOpd = $this->userIsAdminOpd($user);
        $userOpdId = $user->organization_id ?? $user->organization?->id;

        // Admin OPD: cegah manipulasi ke level pemda dan kunci owner_organization_id
        if ($isAdminOpd) {
            if ($request->input('level') === 'pemda') {
                abort(403, 'Hanya Administrator / Evaluator Provinsi yang berwenang membuat IKU Pemda.');
            }
            if ($userOpdId) {
                $request->merge([
                    'level' => 'perangkat_daerah',
                    'owner_organization_id' => $userOpdId,
                ]);
            }
        }

        $validated = $request->validate($this->rules(), $this->messages());

        $iku = DB::transaction(function () use ($validated, $request) {
            $iku = Indicator::create([
                ...$validated,
                'is_iku' => true,
                'iku_status' => Indicator::IKU_STATUS_DRAFT,
                'status' => 'draft',
                'code' => $this->generateCode($validated['owner_organization_id'] ?? null),
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
        $isAdminOpd = $this->userIsAdminOpd($user);
        $userOpdId = $user?->organization_id ?? $user?->organization?->id;

        $canEdit = $iku->canBeEdited() && (
            ! $isAdminOpd || ($iku->level === 'perangkat_daerah' && (int) $iku->owner_organization_id === (int) $userOpdId)
        );

        $iku->load([
            'planningPeriod', 'strategicGoal', 'strategicObjective',
            'ownerOrganization', 'measurementUnit', 'responsibleOfficer',
            'targets.planningPeriod',
            'ikuHistories.user:id,name',
        ]);

        return Inertia::render('Planning/Iku/Show', [
            'iku' => $iku,
            'canEdit' => $canEdit,
            'isBappeda' => $this->userIsBappeda($user),
        ]);
    }

    // ── Edit / Update ──────────────────────────────────────────────────────

    public function edit(Request $request, Indicator $iku): Response
    {
        abort_unless($iku->canBeEdited(), 403, 'IKU dengan status ini tidak dapat diedit.');

        $user = $request->user();
        $isBappeda = $this->userIsBappeda($user);
        $isProvincialAdmin = $isBappeda || $this->authorization->isProvincialAdmin($user);
        $accessibleOrgIds = $this->authorization->accessibleOrganizationIds($user);
        $isAdminOpd = ! $isProvincialAdmin;
        $userOpdId = $user->organization?->id ?? ($accessibleOrgIds[0] ?? null);

        // Batasan OPD: Admin OPD hanya dapat mengedit IKU milik OPD-nya (bukan IKU Pemda atau OPD lain)
        if ($isAdminOpd) {
            if ($iku->level === 'pemda' || ! $iku->owner_organization_id) {
                abort(403, 'Anda tidak memiliki hak untuk mengedit IKU Pemerintah Daerah.');
            }
            if (! in_array((int) $iku->owner_organization_id, $accessibleOrgIds, true)) {
                abort(403, 'Anda tidak memiliki akses untuk mengedit IKU ini.');
            }
        }

        $iku->load(['targets', 'planningPeriod', 'strategicGoal', 'strategicObjective', 'ownerOrganization']);

        $organizations = Organization::orderBy('code')
            ->when(! $isProvincialAdmin, fn ($q) => $q->whereIn('id', $accessibleOrgIds))
            ->get(['id', 'code', 'name']);

        $officers = User::orderBy('name')
            ->when(! $isProvincialAdmin, fn ($q) => $q->whereHas('organizations', fn ($oq) => $oq->whereIn('organizations.id', $accessibleOrgIds)))
            ->get(['id', 'name']);

        $levelOptions = $isAdminOpd
            ? [['value' => 'perangkat_daerah', 'label' => 'Perangkat Daerah']]
            : $this->levelOptions();

        return Inertia::render('Planning/Iku/Create', [
            'iku' => $iku,
            'periods' => PlanningPeriod::orderByDesc('year')->get(['id', 'code', 'name', 'year', 'start_date', 'end_date']),
            'organizations' => $organizations,
            'units' => MeasurementUnit::where('is_active', true)->orderBy('name')->get(['id', 'name', 'symbol']),
            'officers' => $officers,
            'goals' => StrategicGoal::where('planning_period_id', $iku->planning_period_id)->get(['id', 'name']),
            'objectives' => StrategicObjective::where('strategic_goal_id', $iku->strategic_goal_id)->get(['id', 'name']),
            'levelOptions' => $levelOptions,
            'polarizationOptions' => $this->polarizationOptions(),
            'frequencyOptions' => $this->frequencyOptions(),
            'isAdminOpd' => $isAdminOpd,
            'isProvincialAdmin' => $isProvincialAdmin,
            'accessibleOrgIds' => $accessibleOrgIds,
            'userOpdId' => $userOpdId,
        ]);
    }

    public function update(Request $request, Indicator $iku): RedirectResponse
    {
        abort_unless($iku->canBeEdited(), 403, 'IKU dengan status ini tidak dapat diedit.');

        $user = $request->user();
        $isAdminOpd = $this->userIsAdminOpd($user);
        $userOpdId = $user->organization_id ?? $user->organization?->id;

        // Batasan OPD: Admin OPD hanya dapat mengedit IKU milik OPD-nya (bukan IKU Pemda atau OPD lain)
        if ($isAdminOpd) {
            if ($iku->level === 'pemda' || ! $iku->owner_organization_id) {
                abort(403, 'Anda tidak memiliki hak untuk mengedit IKU Pemerintah Daerah.');
            }
            if ((int) $iku->owner_organization_id !== (int) $userOpdId) {
                abort(403, 'Anda tidak memiliki akses untuk mengedit IKU ini.');
            }

            // Kunci level dan owner_organization_id ke OPD milik user
            $request->merge([
                'level' => 'perangkat_daerah',
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
        abort_unless($iku->canBeSubmitted(), 403, 'IKU tidak dapat diajukan.');

        $user = $request->user();
        $isAdminOpd = $this->userIsAdminOpd($user);
        $userOpdId = $user->organization_id ?? $user->organization?->id;

        if ($isAdminOpd) {
            if ($iku->level === 'pemda' || ! $iku->owner_organization_id) {
                abort(403, 'Anda tidak memiliki hak untuk mengajukan review IKU Pemerintah Daerah.');
            }
            if ((int) $iku->owner_organization_id !== (int) $userOpdId) {
                abort(403, 'Anda tidak memiliki wewenang untuk mengajukan review IKU ini.');
            }
        }

        try {
            $this->workflow->submit($iku, $request->user());
        } catch (\LogicException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', "IKU '{$iku->name}' berhasil diajukan untuk review.");
    }

    public function review(Request $request, Indicator $iku): RedirectResponse
    {
        abort_unless($this->userIsBappeda($request->user()), 403, 'Hanya Admin Bappeda yang dapat memulai review.');

        try {
            $this->workflow->startReview($iku, $request->user());
        } catch (\LogicException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', "Review IKU '{$iku->name}' dimulai.");
    }

    public function returnRevision(Request $request, Indicator $iku): RedirectResponse
    {
        abort_unless($this->userIsBappeda($request->user()), 403, 'Hanya Admin Bappeda yang dapat mengembalikan IKU.');

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
        abort_unless($this->userIsBappeda($request->user()), 403, 'Hanya Admin Bappeda yang dapat memfinalisasi IKU.');

        try {
            $this->workflow->finalize($iku, $request->user());
        } catch (\LogicException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', "IKU '{$iku->name}' berhasil difinalisasi.");
    }

    public function deactivate(Request $request, Indicator $iku): RedirectResponse
    {
        abort_unless($this->userIsBappeda($request->user()), 403, 'Hanya Admin Bappeda yang dapat menonaktifkan IKU.');

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
        if ($iku->isFinal()) {
            return back()->with('error', 'IKU berstatus Final tidak dapat dihapus.');
        }

        if ($iku->iku_status === Indicator::IKU_STATUS_NONAKTIF) {
            return back()->with('error', 'IKU berstatus Nonaktif tidak dapat dihapus.');
        }

        abort_unless(
            in_array($iku->iku_status, [Indicator::IKU_STATUS_DRAFT, Indicator::IKU_STATUS_PERBAIKAN]),
            403,
            'Hanya IKU berstatus Draft atau Perbaikan yang dapat dihapus.'
        );

        $user = $request->user();
        if ($this->userIsAdminOpd($user)) {
            $userOpdId = $user->organization_id ?? $user->organization?->id;
            if ($iku->level === 'pemda' || ! $iku->owner_organization_id || (int) $iku->owner_organization_id !== (int) $userOpdId) {
                abort(403, 'Anda tidak memiliki akses untuk menghapus IKU ini.');
            }
        } elseif (! $this->userIsBappeda($user)) {
            abort(403, 'Anda tidak memiliki wewenang untuk menghapus IKU.');
        }

        DB::transaction(function () use ($iku, $request) {
            $this->workflow->recordHistory(
                $iku, IkuHistory::ACTION_DEACTIVATE,
                $this->workflow->snapshot($iku), null,
                'Dihapus (soft delete)', $request->user()->id
            );
            $iku->delete();
            $this->audit->log('delete', 'iku', $iku->id);
        });

        return redirect()->route('planning.iku.index')
            ->with('success', "IKU '{$iku->name}' berhasil dihapus.");
    }

    // ── Export ─────────────────────────────────────────────────────────────

    public function exportExcel(Request $request): StreamedResponse
    {
        $activeYear = $request->integer('active_year') ?: 2025;

        $ikus = Indicator::query()
            ->iku()
            ->with([
                'planningPeriod',
                'strategicGoal:id,name',
                'strategicObjective:id,name',
                'ownerOrganization:id,code,name',
                'measurementUnit:id,symbol,name',
                'responsibleOfficer:id,name',
                'targets:id,indicator_version_id,year,target_value',
            ])
            ->when($request->filled('period_id'), fn ($q) => $q->byPeriod($request->integer('period_id')))
            ->when($request->filled('level'), fn ($q) => $q->byLevel($request->string('level')))
            ->when($request->filled('org_id'), fn ($q) => $q->where('owner_organization_id', $request->integer('org_id')))
            ->when($request->filled('objective_id'), fn ($q) => $q->where('strategic_objective_id', $request->integer('objective_id')))
            ->when($request->filled('iku_status'), fn ($q) => $q->byIkuStatus($request->string('iku_status')))
            ->when($request->filled('search'), fn ($q) => $q->where('name', 'like', '%'.$request->string('search').'%'))
            ->latest('id')
            ->get();

        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Daftar IKU');

        $headers = [
            'No', 'Kode', 'Level', 'Perangkat Daerah', 'Tujuan', 'Sasaran',
            'Nama Indikator', 'Satuan', 'Baseline', 'Target '.$activeYear, 'Polarisasi',
            'Definisi Operasional', 'Formula', 'Sumber Data', 'Frekuensi',
            'Penanggung Jawab', 'Status',
        ];

        foreach ($headers as $idx => $h) {
            $colLetter = Coordinate::stringFromColumnIndex($idx + 1);
            $cell = $colLetter.'1';
            $sheet->setCellValue($cell, $h);
            $sheet->getStyle($cell)->getFont()->setBold(true);
            $sheet->getColumnDimension($colLetter)->setAutoSize(true);
        }

        $row = 2;
        foreach ($ikus as $i => $item) {
            $targetVal = $item->targets->firstWhere('year', $activeYear)?->target_value;
            $targetStr = $targetVal !== null ? number_format((float) $targetVal, 2, ',', '.') : '-';

            $sheet->setCellValue('A'.$row, $i + 1);
            $sheet->setCellValue('B'.$row, $item->code);
            $sheet->setCellValue('C'.$row, $item->level === 'pemda' ? 'Pemerintah Daerah' : 'Perangkat Daerah');
            $sheet->setCellValue('D'.$row, $item->ownerOrganization?->name ?? 'Pemerintah Provinsi');
            $sheet->setCellValue('E'.$row, $item->strategicGoal?->name ?? '-');
            $sheet->setCellValue('F'.$row, $item->strategicObjective?->name ?? '-');
            $sheet->setCellValue('G'.$row, $item->name);
            $sheet->setCellValue('H'.$row, $item->measurementUnit?->symbol ?? '-');
            $sheet->setCellValue('I'.$row, $item->formatted_baseline);
            $sheet->setCellValue('J'.$row, $targetStr);
            $sheet->setCellValue('K'.$row, ucfirst($item->polarization ?? '-'));
            $sheet->setCellValue('L'.$row, $item->definition ?? '-');
            $sheet->setCellValue('M'.$row, $item->formula_notes ?? '-');
            $sheet->setCellValue('N'.$row, $item->data_source ?? '-');
            $sheet->setCellValue('O'.$row, ucfirst($item->frequency ?? '-'));
            $sheet->setCellValue('P'.$row, $item->responsibleOfficer?->name ?? '-');
            $sheet->setCellValue('Q'.$row, ucfirst($item->iku_status));
            $row++;
        }

        $writer = new Xlsx($spreadsheet);
        $filename = 'Export-IKU-'.date('Ymd-His').'.xlsx';

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    public function exportPdfRekap(Request $request)
    {
        $activeYear = (int) $request->input('active_year', date('Y'));
        $ikus = Indicator::query()
            ->iku()
            ->with([
                'planningPeriod', 'strategicGoal', 'strategicObjective',
                'ownerOrganization', 'measurementUnit', 'responsibleOfficer', 'targets',
            ])
            ->when($request->filled('period_id'), fn ($q) => $q->byPeriod($request->integer('period_id')))
            ->when($request->filled('level'), fn ($q) => $q->byLevel($request->string('level')))
            ->when($request->filled('org_id'), fn ($q) => $q->where('owner_organization_id', $request->integer('org_id')))
            ->when($request->filled('objective_id'), fn ($q) => $q->where('strategic_objective_id', $request->integer('objective_id')))
            ->when($request->filled('iku_status'), fn ($q) => $q->byIkuStatus($request->string('iku_status')))
            ->when($request->filled('search'), fn ($q) => $q->where('name', 'like', '%'.$request->string('search').'%'))
            ->orderBy('level')
            ->orderBy('name')
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

        $pdf = Pdf::loadView('pdf.iku-detail', ['iku' => $iku]);

        return $pdf->download("IKU-{$iku->code}.pdf");
    }

    // ── Private Helpers ────────────────────────────────────────────────────

    private function rules(?int $ignoreId = null): array
    {
        $periodId = request()->input('planning_period_id');
        $level = request()->input('level');
        $orgId = request()->input('owner_organization_id');
        $objectiveId = request()->input('strategic_objective_id');
        $name = request()->input('name');

        // Validasi duplikasi: kombinasi periode + level + OPD + sasaran + nama harus unik
        $duplicateCheck = Rule::unique('indicators', 'name')
            ->where('is_iku', true)
            ->where('planning_period_id', $periodId)
            ->where('level', $level)
            ->where('strategic_objective_id', $objectiveId)
            ->where(function ($q) use ($level, $orgId) {
                if ($level === 'pemda') {
                    $q->whereNull('owner_organization_id');
                } else {
                    $q->where('owner_organization_id', $orgId);
                }
            });

        if ($ignoreId) {
            $duplicateCheck->ignore($ignoreId);
        }

        return [
            // Step 1 — Identitas
            'level' => ['required', Rule::in(['pemda', 'perangkat_daerah'])],
            'planning_period_id' => ['required', 'integer', 'exists:planning_periods,id'],
            'owner_organization_id' => ['nullable', 'integer', 'exists:organizations,id',
                Rule::requiredIf(fn () => request()->input('level') === 'perangkat_daerah')],
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

    /**
     * Pesan validasi kustom yang ramah pengguna.
     */
    private function messages(): array
    {
        return [
            'name.unique' => 'Indikator dengan nama yang sama sudah tersedia pada sasaran tersebut untuk periode ini. Mohon gunakan nama indikator yang berbeda.',
        ];
    }

    private function storeTargets(Indicator $iku, array $targets): void
    {
        // Hapus target lama (jika edit), lalu insert baru
        if ($iku->current_version_id) {
            IndicatorTarget::where('indicator_version_id', $iku->current_version_id)->delete();
        }

        // Buat/ambil version jika belum ada
        $version = $iku->currentVersion ?? IndicatorVersion::create([
            'indicator_id' => $iku->id,
            'version_number' => 1,
            'name' => $iku->name,
            'definition' => $iku->definition,
            'frequency' => $iku->frequency,
            'data_source' => $iku->data_source,
            'formula_notes' => $iku->formula_notes,
            'baseline_value' => $iku->baseline_value,
            'measurement_unit_id' => $iku->measurement_unit_id,
        ]);

        if (! $iku->current_version_id) {
            $iku->update(['current_version_id' => $version->id]);
        }

        $orgId = $iku->owner_organization_id ?? 1; // Fallback to 1 (Pemerintah Provinsi Papua Barat) if null

        foreach ($targets as $t) {
            IndicatorTarget::create([
                'indicator_version_id' => $version->id,
                'organization_id' => $orgId,
                'planning_period_id' => $iku->planning_period_id,
                'year' => $t['year'],
                'target_value' => $t['target_value'],
                'status' => 'draft',
            ]);
        }
    }

    private function generateCode(?int $orgId): string
    {
        $prefix = $orgId ? 'IKU-PD' : 'IKU-PEMDA';
        $seq = Indicator::iku()->count() + 1;

        return strtoupper($prefix.'-'.str_pad($seq, 4, '0', STR_PAD_LEFT));
    }

    private function userIsBappeda(?Authenticatable $user): bool
    {
        if (! $user) {
            return false;
        }

        return $user->hasRole('Super Admin')
            || $user->hasRole('super_admin')
            || $user->hasRole('Admin Provinsi')
            || $user->hasRole('admin_provinsi')
            || $user->hasRole('Evaluator Provinsi');
    }

    private function userIsAdminOpd(?Authenticatable $user): bool
    {
        if (! $user) {
            return false;
        }
        // User yang punya role Provinsi bukan Admin OPD
        if ($this->userIsBappeda($user)) {
            return false;
        }

        return $user->hasRole('Admin OPD')
            || $user->hasRole('admin_opd')
            || $user->hasRole('Operator OPD')
            || $user->hasRole('operator_opd')
            || $user->hasRole('Validator OPD')
            || $user->hasRole('Kepala OPD');
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
            ['value' => 'pemda',            'label' => 'Pemerintah Daerah'],
            ['value' => 'perangkat_daerah', 'label' => 'Perangkat Daerah'],
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
