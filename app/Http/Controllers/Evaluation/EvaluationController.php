<?php

namespace App\Http\Controllers\Evaluation;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Evaluation;
use App\Models\EvaluationScore;
use App\Models\Followup as RecommendationFollowup;
use App\Models\Organization;
use App\Models\PkoEvaluation;
use App\Models\PkoIndicator;
use App\Models\PlanningPeriod;
use App\Models\Recommendation;
use App\Models\User;
use App\Services\AuditService;
use App\Services\AuthorizationService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class EvaluationController extends Controller
{
    public function __construct(
        private readonly AuthorizationService $authorization,
        private readonly AuditService $audit,
    ) {}

    public function canManageProvincialEvaluations(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        if ($user->hasRole('Super Admin')) {
            return true;
        }

        $isProvincialManager = $user->hasRole('Admin Provinsi')
            || $user->hasRole('Inspektorat')
            || $user->hasRole('Evaluator Provinsi');

        return $isProvincialManager || ($user->isProvincialLevel() && $user->can('manage-evaluations'));
    }

    public function isProvinceOrganization(Organization|int|null $org): bool
    {
        if (! $org) {
            return false;
        }

        if (is_numeric($org)) {
            $org = Organization::find((int) $org);
        }

        if (! $org) {
            return false;
        }

        if ($org->type === 'opd') {
            return false;
        }

        return $org->type === 'province' || $org->code === 'PROV-PAPBAR' || (int) $org->id === 1;
    }

    public function index(Request $request): Response
    {
        $this->authorize('view-evaluations');

        $user = $request->user();
        $isProvincialAuditor = $user->hasRole('Super Admin') || $user->hasRole('Admin Provinsi') || $user->hasRole('Inspektorat') || $user->hasRole('Evaluator Provinsi') || $user->hasRole('Pimpinan Provinsi') || $user->hasRole('Auditor');
        $canManagePemda = $this->canManageProvincialEvaluations($user);
        $canManage = $canManagePemda || $user->can('manage-evaluations');

        $defaultYear = (int) (PlanningPeriod::where('status', 'active')->value('year')
            ?? PlanningPeriod::orderByDesc('year')->value('year')
            ?? (int) date('Y'));
        $year = (int) $request->get('year', $defaultYear);
        $period = PlanningPeriod::firstOrCreate(
            ['year' => $year],
            [
                'code' => 'TA-'.$year,
                'name' => 'Tahun Anggaran '.$year,
                'start_year' => $year,
                'end_year' => $year,
                'start_date' => $year.'-01-01',
                'end_date' => $year.'-12-31',
                'status' => 'active',
            ]
        );

        $availableYears = PlanningPeriod::getAvailableYears();
        if (! in_array($year, $availableYears, true)) {
            $availableYears[] = $year;
        }
        rsort($availableYears);
        $availableYears = array_values(array_unique($availableYears));

        $sakipPemdaData = null;

        // 2. SAKIP OPD
        $opdList = Organization::query()
            ->where(function ($q) {
                $q->where('type', 'opd')->orWhere('type', '!=', 'province');
            })
            ->when(! $isProvincialAuditor, function ($q) use ($user) {
                $q->whereIn('id', $this->authorization->accessibleOrganizationIds($user));
            })
            ->orderBy('id')
            ->get(['id', 'code', 'name']);

        $evaluationsOpd = Evaluation::with('scores')
            ->whereIn('organization_id', $opdList->pluck('id'))
            ->where('planning_period_id', $period->id)
            ->get()
            ->keyBy('organization_id');

        $sakipOpdData = [];
        foreach ($opdList as $idx => $opd) {
            $ev = $evaluationsOpd->get($opd->id);
            $sakipOpdData[] = $this->formatSakipItem($opd, $ev, $idx + 1);
        }

        // 3. PKO Pemda dihapus
        $pkoPemda = null;

        // 4. PKO Perangkat Daerah (OPD)
        if ($isProvincialAuditor) {
            $defaultOpd = Organization::where('code', 'DPMPTSP-PB')->first() ?? $opdList->first();
            $selectedOpdId = (int) $request->get('opd_id', $defaultOpd?->id ?? 0);
        } else {
            $defaultOpd = $opdList->first();
            $requestedOpdId = (int) $request->get('opd_id', $defaultOpd?->id ?? 0);
            $selectedOpdId = in_array($requestedOpdId, $this->authorization->accessibleOrganizationIds($user), true)
                ? $requestedOpdId
                : ($defaultOpd?->id ?? 0);
        }
        $pkoOpd = PkoEvaluation::with('indicators')
            ->where('year', $year)
            ->where('organization_id', $selectedOpdId)
            ->first();

        // Legacy evaluations list for backwards compatibility with existing tests
        $evaluations = Evaluation::query()
            ->with(['organization:id,code,name', 'planningPeriod:id,code,name,year'])
            ->withCount('scores', 'recommendations')
            ->when(! $isProvincialAuditor, function ($q) use ($user) {
                $q->whereIn('organization_id', $this->authorization->accessibleOrganizationIds($user));
            })
            ->when($request->filled('organization_id'), fn ($q) => $q->where('organization_id', $request->integer('organization_id')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 25))
            ->withQueryString();

        return Inertia::render('Evaluations/Index', [
            'year' => $year,
            'available_years' => $availableYears,
            'sakip_pemda' => $sakipPemdaData,
            'sakip_opd' => $sakipOpdData,
            'pko_pemda' => $pkoPemda,
            'pko_opd' => $pkoOpd,
            'selected_opd_id' => $selectedOpdId,
            'evaluations' => $evaluations,
            'filters' => $request->only(['organization_id', 'status', 'year', 'opd_id']),
            'periods' => PlanningPeriod::query()->orderByDesc('year')->get(['id', 'code', 'name', 'year']),
            'organizations' => $opdList,
            'can_manage' => $canManage,
            'can_manage_pemda' => $canManagePemda,
        ]);
    }

    private function formatSakipItem(?Organization $org, ?Evaluation $eval, int $no): array
    {
        if (! $org) {
            return [];
        }

        $scores = $eval?->scores;
        $perencanaan = (float) ($scores?->where('component', 'Perencanaan Kinerja')->first()?->score ?? 0);
        $pengukuran = (float) ($scores?->where('component', 'Pengukuran Kinerja')->first()?->score ?? 0);
        $pelaporan = (float) ($scores?->where('component', 'Pelaporan Kinerja')->first()?->score ?? 0);
        $evaluasi = (float) ($scores?->where('component', 'Evaluasi Internal')->first()?->score ?? 0);
        $total = round($perencanaan + $pengukuran + $pelaporan + $evaluasi, 2);

        $hasScores = $eval && $scores && $scores->isNotEmpty() && ($perencanaan > 0 || $pengukuran > 0 || $pelaporan > 0 || $evaluasi > 0);

        $predikat = match (true) {
            ! $hasScores || $total <= 0 => 'BELUM DINILAI',
            $total > 90 => 'AA',
            $total > 80 => 'A',
            $total > 70 => 'BB',
            $total > 60 => 'B',
            $total > 50 => 'CC',
            $total > 30 => 'C',
            default => 'D',
        };

        return [
            'no' => $no,
            'evaluation_id' => $eval?->id,
            'organization_id' => $org->id,
            'organization_code' => $org->code,
            'organization_name' => $org->type === 'province' ? 'Pemerintah Provinsi' : $org->name,
            'perencanaan' => $perencanaan,
            'pengukuran' => $pengukuran,
            'pelaporan' => $pelaporan,
            'evaluasi_internal' => $evaluasi,
            'nilai' => $hasScores ? $total : 0.0,
            'predikat' => $predikat,
            'status_evaluasi' => $hasScores ? ($eval?->evaluation_status ?? 'Final') : 'Belum Dievaluasi',
            'lhe_file_path' => $eval?->lhe_file_path,
            'lhe_file_url' => $eval?->lhe_file_path ? Storage::disk('public')->url($eval->lhe_file_path) : null,
        ];
    }

    public function saveSakip(Request $request): RedirectResponse
    {
        $this->authorize('manage-evaluations');

        $validated = $request->validate([
            'organization_id' => ['required', 'integer', 'exists:organizations,id'],
            'year' => ['required', 'integer'],
            'perencanaan' => ['required', 'numeric', 'min:0', 'max:30'],
            'pengukuran' => ['required', 'numeric', 'min:0', 'max:30'],
            'pelaporan' => ['required', 'numeric', 'min:0', 'max:15'],
            'evaluasi_internal' => ['required', 'numeric', 'min:0', 'max:25'],
            'status_evaluasi' => ['nullable', 'string', 'max:50'],
        ]);

        $period = PlanningPeriod::firstOrCreate(
            ['year' => $validated['year']],
            [
                'code' => 'TA-'.$validated['year'],
                'name' => 'Tahun Anggaran '.$validated['year'],
                'start_year' => $validated['year'],
                'end_year' => $validated['year'],
                'start_date' => $validated['year'].'-01-01',
                'end_date' => $validated['year'].'-12-31',
                'status' => 'active',
            ]
        );

        $org = Organization::findOrFail($validated['organization_id']);
        $user = $request->user();

        if ($this->isProvinceOrganization($org)) {
            if (! $this->canManageProvincialEvaluations($user)) {
                abort(403, 'Anda tidak memiliki hak akses untuk mengelola nilai SAKIP Pemerintah Provinsi.');
            }
        } elseif (! $this->canManageProvincialEvaluations($user) && ! $this->authorization->canAccessOrganization($user, $org->id)) {
            abort(403, 'Di luar lingkup organisasi Anda.');
        }

        DB::transaction(function () use ($validated, $period, $org) {
            $evaluation = Evaluation::firstOrCreate(
                [
                    'organization_id' => $org->id,
                    'planning_period_id' => $period->id,
                    'type' => 'annual',
                ],
                [
                    'code' => 'EVAL-'.$org->code.'-'.$validated['year'],
                    'title' => 'Evaluasi SAKIP '.$org->name.' TA '.$validated['year'],
                    'status' => 'approved',
                    'evaluation_status' => $validated['status_evaluasi'] ?? 'Final',
                ]
            );

            $evaluation->update([
                'evaluation_status' => $validated['status_evaluasi'] ?? 'Final',
            ]);

            $components = [
                ['name' => 'Perencanaan Kinerja', 'score' => $validated['perencanaan'], 'max' => 30, 'weight' => 0.30],
                ['name' => 'Pengukuran Kinerja',  'score' => $validated['pengukuran'],  'max' => 30, 'weight' => 0.30],
                ['name' => 'Pelaporan Kinerja',   'score' => $validated['pelaporan'],   'max' => 15, 'weight' => 0.15],
                ['name' => 'Evaluasi Internal',   'score' => $validated['evaluasi_internal'], 'max' => 25, 'weight' => 0.25],
            ];

            foreach ($components as $c) {
                EvaluationScore::updateOrCreate(
                    ['evaluation_id' => $evaluation->id, 'component' => $c['name']],
                    [
                        'criterion' => $c['name'],
                        'score' => $c['score'],
                        'max_score' => $c['max'],
                        'weight' => $c['weight'],
                        'evaluator_comment' => 'Penilaian evaluasi SAKIP',
                    ]
                );
            }
        });

        return back()->with('success', 'Nilai SAKIP berhasil disimpan.');
    }

    public function uploadLhe(Request $request): RedirectResponse
    {
        $this->authorize('manage-evaluations');

        $validated = $request->validate([
            'organization_id' => ['required', 'integer', 'exists:organizations,id'],
            'year' => ['required', 'integer'],
            'file' => ['required', 'file', 'mimes:pdf,doc,docx', 'max:20480'],
        ]);

        $period = PlanningPeriod::firstOrCreate(
            ['year' => $validated['year']],
            [
                'code' => 'TA-'.$validated['year'],
                'name' => 'Tahun Anggaran '.$validated['year'],
                'start_year' => $validated['year'],
                'end_year' => $validated['year'],
                'start_date' => $validated['year'].'-01-01',
                'end_date' => $validated['year'].'-12-31',
                'status' => 'active',
            ]
        );

        $org = Organization::findOrFail($validated['organization_id']);
        $user = $request->user();

        if ($this->isProvinceOrganization($org)) {
            if (! $this->canManageProvincialEvaluations($user)) {
                abort(403, 'Anda tidak memiliki hak akses untuk mengunggah dokumen LHE Pemerintah Provinsi.');
            }
        } elseif (! $this->canManageProvincialEvaluations($user) && ! $this->authorization->canAccessOrganization($user, $org->id)) {
            abort(403, 'Di luar lingkup organisasi Anda.');
        }

        $path = $request->file('file')->store('lhe', 'public');

        $evaluation = Evaluation::firstOrCreate(
            [
                'organization_id' => $org->id,
                'planning_period_id' => $period->id,
                'type' => 'annual',
            ],
            [
                'code' => 'EVAL-'.$org->code.'-'.$validated['year'],
                'title' => 'Evaluasi SAKIP '.$org->name.' TA '.$validated['year'],
                'status' => 'approved',
                'evaluation_status' => 'Final',
            ]
        );

        $evaluation->update(['lhe_file_path' => $path]);

        return back()->with('success', 'Dokumen LHE berhasil diunggah.');
    }

    public function savePkoIndicator(Request $request): RedirectResponse
    {
        $this->authorize('manage-evaluations');

        $validated = $request->validate([
            'id' => ['nullable', 'integer', 'exists:pko_indicators,id'],
            'organization_id' => ['required', 'integer', 'exists:organizations,id'],
            'year' => ['required', 'integer'],
            'sasaran' => ['required', 'string'],
            'indikator' => ['required', 'string'],
            'satuan' => ['required', 'string', 'max:100'],
            'target' => ['required', 'numeric'],
            'realisasi' => ['required', 'numeric'],
            'koreksi_akip' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ]);

        $org = Organization::findOrFail($validated['organization_id']);
        $user = $request->user();

        if ($this->isProvinceOrganization($org)) {
            if (! $this->canManageProvincialEvaluations($user)) {
                abort(403, 'Anda tidak memiliki hak akses untuk mengelola indikator PKO Pemerintah Provinsi.');
            }
        } elseif (! $this->canManageProvincialEvaluations($user) && ! $this->authorization->canAccessOrganization($user, $org->id)) {
            abort(403, 'Di luar lingkup organisasi Anda.');
        }

        $pkoEval = PkoEvaluation::firstOrCreate(
            [
                'year' => $validated['year'],
                'organization_id' => $validated['organization_id'],
            ],
            [
                'status' => 'Final',
            ]
        );

        $target = (float) $validated['target'];
        $realisasi = (float) $validated['realisasi'];

        // Formula 1: Capaian PK (%) = (Realisasi / Target) * 100%
        $capaian = $target != 0.0 ? round(($realisasi / $target) * 100, 2) : 0.0;

        // Formula 2: Normalisasi Capaian PK (1) = min(Capaian, 110%) sesuai PermenPANRB No. 22/2024
        $normalisasi = min($capaian, 110.00);

        // Formula 3: Koreksi AKIP (2)
        if (isset($validated['koreksi_akip']) && $validated['koreksi_akip'] !== null && $validated['koreksi_akip'] !== '') {
            $koreksi = (float) $validated['koreksi_akip'];
        } else {
            $period = PlanningPeriod::where('year', $validated['year'])->first();
            $ev = $period ? Evaluation::with('scores')->where('organization_id', $validated['organization_id'])->where('planning_period_id', $period->id)->first() : null;
            $totalSakip = $ev ? (float) $ev->scores->sum('score') : 0.0;
            $predikatSakip = match (true) {
                $totalSakip < 0 => 'D',
                $totalSakip > 90 => 'AA',
                $totalSakip > 80 => 'A',
                $totalSakip > 70 => 'BB',
                $totalSakip > 60 => 'B',
                $totalSakip > 50 => 'CC',
                $totalSakip > 30 => 'C',
                default => 'D',
            };

            $koreksi = match ($predikatSakip) {
                'AA', 'A' => 0.00,
                'BB' => 10.00,
                'B' => 15.00,
                'CC' => 20.00,
                'C', 'D' => 30.00,
                default => 0.00,
            };
        }

        // Formula 4: Nilai Akhir Capaian PK (3) = Normalisasi * (1 - Koreksi / 100)
        $nilaiAkhir = round($normalisasi * (1.0 - ($koreksi / 100.0)), 2);

        $indicatorData = [
            'pko_evaluation_id' => $pkoEval->id,
            'sasaran' => $validated['sasaran'],
            'indikator' => $validated['indikator'],
            'satuan' => $validated['satuan'],
            'target' => $target,
            'realisasi' => $realisasi,
            'capaian_pk' => $capaian,
            'normalisasi_capaian' => $normalisasi,
            'koreksi_akip' => $koreksi,
            'nilai_akhir' => $nilaiAkhir,
        ];

        if (! empty($validated['id'])) {
            $indicator = PkoIndicator::findOrFail($validated['id']);
            $indicator->update($indicatorData);
        } else {
            $maxOrder = (int) $pkoEval->indicators()->max('order');
            $indicatorData['order'] = $maxOrder + 1;
            PkoIndicator::create($indicatorData);
        }

        $pkoEval->recalculateSummary();

        return back()->with('success', 'Indikator PKO berhasil disimpan.');
    }

    public function deletePkoIndicator(PkoIndicator $indicator): RedirectResponse
    {
        $this->authorize('manage-evaluations');

        $user = request()->user();
        $pkoEval = $indicator->pkoEvaluation;
        $org = $pkoEval?->organization ?? ($pkoEval?->organization_id ? Organization::find($pkoEval->organization_id) : null);

        if ($this->isProvinceOrganization($org)) {
            if (! $this->canManageProvincialEvaluations($user)) {
                abort(403, 'Anda tidak memiliki hak akses untuk menghapus indikator PKO Pemerintah Provinsi.');
            }
        } elseif (! $this->canManageProvincialEvaluations($user) && $pkoEval && ! $this->authorization->canAccessOrganization($user, $pkoEval->organization_id)) {
            abort(403, 'Di luar lingkup organisasi Anda.');
        }

        $indicator->delete();
        $pkoEval->recalculateSummary();

        return back()->with('success', 'Indikator PKO berhasil dihapus.');
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorize('manage-evaluations');

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'type' => ['required', 'string', 'in:periodic,external,internal'],
            'organization_id' => ['required', 'integer', 'exists:organizations,id'],
            'planning_period_id' => ['required', 'integer', 'exists:planning_periods,id'],
            'evaluator_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $user = $request->user();
        if ($this->isProvinceOrganization((int) $validated['organization_id'])) {
            if (! $this->canManageProvincialEvaluations($user)) {
                abort(403, 'Anda tidak memiliki hak akses untuk membuat evaluasi Pemerintah Provinsi.');
            }
        } elseif (! $this->canManageProvincialEvaluations($user) && ! $this->authorization->canAccessOrganization($user, (int) $validated['organization_id'])) {
            abort(403, 'Di luar lingkup organisasi Anda.');
        }

        DB::transaction(function () use ($validated) {
            $evaluation = Evaluation::create([
                ...$validated,
                'code' => 'EVL-'.now()->format('YmdHis').'-'.substr(md5((string) mt_rand()), 0, 6),
                'status' => 'draft',
            ]);

            $this->audit->log('create', 'evaluation', $evaluation->id, (int) $validated['organization_id']);
        });

        return back()->with('success', 'Evaluasi berhasil dibuat.');
    }

    public function destroy(Evaluation $evaluation): RedirectResponse
    {
        $this->authorize('manage-evaluations');

        $user = request()->user();
        $org = $evaluation->organization ?? Organization::find($evaluation->organization_id);

        if ($this->isProvinceOrganization($org)) {
            if (! $this->canManageProvincialEvaluations($user)) {
                abort(403, 'Anda tidak memiliki hak akses untuk menghapus evaluasi Pemerintah Provinsi.');
            }
        } elseif (! $this->canManageProvincialEvaluations($user) && ! $this->authorization->canAccessOrganization($user, (int) $evaluation->organization_id)) {
            abort(403, 'Di luar lingkup organisasi Anda.');
        }

        $orgId = $evaluation->organization_id;
        $evaluationId = $evaluation->id;

        DB::transaction(function () use ($evaluation) {
            $evaluation->scores()->delete();
            $evaluation->delete();
        });

        $this->audit->log('delete', 'evaluation', $evaluationId, $orgId);

        return back()->with('success', 'Evaluasi SAKIP berhasil dihapus.');
    }

    public function show(Evaluation $evaluation): Response
    {
        $this->authorize('view-evaluations');

        $user = request()->user();
        $isProvincialAuditor = $user && ($user->hasRole('Super Admin') || $user->hasRole('Admin Provinsi') || $user->hasRole('Inspektorat') || $user->hasRole('Evaluator Provinsi') || $user->hasRole('Pimpinan Provinsi') || $user->hasRole('Auditor'));
        $isPemda = $this->isProvinceOrganization($evaluation->organization ?? (int) $evaluation->organization_id);

        if (! $isProvincialAuditor && ! $isPemda) {
            $accessibleOrgIds = $this->authorization->accessibleOrganizationIds($user);
            if (! in_array((int) $evaluation->organization_id, $accessibleOrgIds, true)) {
                abort(403, 'Di luar lingkup organisasi Anda.');
            }
        }

        $evaluation->load([
            'organization:id,code,name',
            'planningPeriod:id,code,name,year',
            'scores',
            'recommendations.ownerOrganization:id,code,name',
            'recommendations.followups' => fn ($q) => $q->with('submitter:id,name')->orderBy('submitted_at'),
        ]);

        $weightedTotal = $evaluation->scores->sum(
            fn ($score) => (float) $score->score
        );

        $grade = match (true) {
            $weightedTotal > 90 => ['label' => 'AA', 'desc' => 'Sangat Memuaskan', 'variant' => 'default'],
            $weightedTotal > 80 => ['label' => 'A',  'desc' => 'Memuaskan',        'variant' => 'success'],
            $weightedTotal > 70 => ['label' => 'BB', 'desc' => 'Sangat Baik',       'variant' => 'info'],
            $weightedTotal > 60 => ['label' => 'B',  'desc' => 'Baik',              'variant' => 'info'],
            $weightedTotal > 50 => ['label' => 'CC', 'desc' => 'Cukup / Memadai',   'variant' => 'warning'],
            $weightedTotal > 30 => ['label' => 'C',  'desc' => 'Kurang',            'variant' => 'warning'],
            default => ['label' => 'D',  'desc' => 'Sangat Kurang',     'variant' => 'destructive'],
        };

        $recs = $evaluation->recommendations;
        $recStats = [
            'open' => $recs->where('status', 'open')->count(),
            'in_progress' => $recs->where('status', 'in_progress')->count(),
            'submitted' => $recs->where('status', 'submitted')->count(),
            'verified' => $recs->where('status', 'verified')->count(),
            'closed' => $recs->where('status', 'closed')->count(),
        ];

        $isProvincialEvaluator = $this->canManageProvincialEvaluations($user);

        return Inertia::render('Evaluations/Show', [
            'evaluation' => $evaluation,
            'total_score' => round($weightedTotal, 2),
            'grade' => $grade,
            'rec_stats' => $recStats,
            'can_manage' => $isProvincialEvaluator || (! $isPemda && $user->can('manage-evaluations') && $this->authorization->canAccessOrganization($user, (int) $evaluation->organization_id)),
            'can_score' => $isProvincialEvaluator || (! $isPemda && $user->can('score-evaluations') && $this->authorization->canAccessOrganization($user, (int) $evaluation->organization_id)),
        ]);
    }

    public function storeScore(Request $request, Evaluation $evaluation): RedirectResponse
    {
        $this->authorize('score-evaluations');

        $user = $request->user();
        $org = $evaluation->organization ?? Organization::find($evaluation->organization_id);

        if ($this->isProvinceOrganization($org)) {
            if (! $this->canManageProvincialEvaluations($user)) {
                abort(403, 'Anda tidak memiliki hak akses untuk memberi skor evaluasi Pemerintah Provinsi.');
            }
        } elseif (! $this->canManageProvincialEvaluations($user) && ! $this->authorization->canAccessOrganization($user, (int) $evaluation->organization_id)) {
            abort(403, 'Di luar lingkup organisasi Anda.');
        }

        $validated = $request->validate([
            'component' => ['required', 'string', 'max:100'],
            'criterion' => ['nullable', 'string'],
            'score' => ['required', 'numeric', 'min:0'],
            'max_score' => ['required', 'numeric', 'min:0.01'],
            'weight' => ['nullable', 'numeric', 'min:0', 'max:1'],
            'evaluator_comment' => ['nullable', 'string'],
        ]);

        EvaluationScore::updateOrCreate(
            [
                'evaluation_id' => $evaluation->id,
                'component' => $validated['component'],
            ],
            $validated
        );

        $this->audit->log('score', 'evaluation', $evaluation->id, $evaluation->organization_id);

        return back()->with('success', 'Skor komponen berhasil disimpan.');
    }

    public function storeRecommendation(Request $request, Evaluation $evaluation): RedirectResponse
    {
        $this->authorize('manage-evaluations');

        $user = $request->user();
        $org = $evaluation->organization ?? Organization::find($evaluation->organization_id);

        if ($this->isProvinceOrganization($org)) {
            if (! $this->canManageProvincialEvaluations($user)) {
                abort(403, 'Anda tidak memiliki hak akses untuk menambah rekomendasi Pemerintah Provinsi.');
            }
        } elseif (! $this->canManageProvincialEvaluations($user) && ! $this->authorization->canAccessOrganization($user, (int) $evaluation->organization_id)) {
            abort(403, 'Di luar lingkup organisasi Anda.');
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'owner_organization_id' => ['nullable', 'integer', 'exists:organizations,id'],
            'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
            'due_date' => ['nullable', 'date'],
            'priority' => ['required', 'string', 'in:low,medium,high,critical'],
        ]);

        // Default owner_organization_id ke OPD yang dievaluasi jika tidak diisi
        $ownerOrgId = $validated['owner_organization_id'] ?? $evaluation->organization_id;

        $rec = Recommendation::create([
            ...$validated,
            'owner_organization_id' => $ownerOrgId,
            'evaluation_id' => $evaluation->id,
            'status' => 'open',
        ]);

        $this->audit->log('create', 'recommendation', $rec->id, $ownerOrgId);

        return back()->with('success', 'Rekomendasi berhasil ditambahkan.');
    }

    public function storeFollowup(Request $request, Evaluation $evaluation, Recommendation $recommendation): RedirectResponse
    {
        $user = $request->user();
        $this->authorization->canAccessOrganization($user, $recommendation->owner_organization_id)
            ?: abort(403, 'Di luar lingkup organisasi Anda.');

        $validated = $request->validate([
            'description' => ['required', 'string', 'max:2000'],
            'submitted_at' => ['nullable', 'date'],
        ]);

        RecommendationFollowup::create([
            'recommendation_id' => $recommendation->id,
            'submitted_by' => $user->id,
            'description' => $validated['description'],
            'submitted_at' => ! empty($validated['submitted_at']) ? $validated['submitted_at'] : now(),
            'status' => 'submitted',
        ]);

        if ($recommendation->status === 'open') {
            $recommendation->update(['status' => 'in_progress']);
        }

        $this->audit->log('create', 'followup', $recommendation->id, $recommendation->owner_organization_id);

        return back()->with('success', 'Tindak lanjut berhasil dikirim.');
    }

    public function verifyFollowup(
        Request $request,
        Evaluation $evaluation,
        Recommendation $recommendation,
        RecommendationFollowup $followup
    ): RedirectResponse {
        $this->authorize('manage-evaluations');

        $user = $request->user();
        $org = $evaluation->organization ?? Organization::find($evaluation->organization_id);

        if ($this->isProvinceOrganization($org)) {
            if (! $this->canManageProvincialEvaluations($user)) {
                abort(403, 'Anda tidak memiliki hak akses untuk memverifikasi tindak lanjut Pemerintah Provinsi.');
            }
        } elseif (! $this->canManageProvincialEvaluations($user) && ! $this->authorization->canAccessOrganization($user, (int) $evaluation->organization_id)) {
            abort(403, 'Di luar lingkup organisasi Anda.');
        }

        $validated = $request->validate([
            'verified' => ['required', 'boolean'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $followup->update([
            'status' => $validated['verified'] ? 'verified' : 'rejected',
            'verified_by' => $request->user()->id,
            'verified_at' => now(),
            'notes' => $validated['notes'] ?? null,
        ]);

        if ($validated['verified']) {
            $allVerified = $recommendation->followups()->where('status', '!=', 'verified')->doesntExist();
            if ($allVerified) {
                $recommendation->update(['status' => 'verified']);
            }
        }

        $this->audit->log('verify_followup', 'followup', $followup->id, $recommendation->owner_organization_id);

        return back()->with('success', $validated['verified'] ? 'Tindak lanjut diverifikasi.' : 'Tindak lanjut ditolak.');
    }

    public function updateRecommendationStatus(
        Request $request,
        Evaluation $evaluation,
        Recommendation $recommendation
    ): RedirectResponse {
        $this->authorize('manage-evaluations');

        $user = $request->user();
        $org = $evaluation->organization ?? Organization::find($evaluation->organization_id);

        if ($this->isProvinceOrganization($org)) {
            if (! $this->canManageProvincialEvaluations($user)) {
                abort(403, 'Anda tidak memiliki hak akses untuk memperbarui rekomendasi Pemerintah Provinsi.');
            }
        } elseif (! $this->canManageProvincialEvaluations($user) && ! $this->authorization->canAccessOrganization($user, (int) $evaluation->organization_id)) {
            abort(403, 'Di luar lingkup organisasi Anda.');
        }

        $validated = $request->validate([
            'status' => ['required', 'string', 'in:open,in_progress,submitted,verified,closed,rejected'],
        ]);

        $recommendation->update(['status' => $validated['status']]);

        $this->audit->log('update_status', 'recommendation', $recommendation->id, $recommendation->owner_organization_id);

        return back()->with('success', 'Status rekomendasi diperbarui.');
    }

    public function reviewEvidence(Request $request, Evaluation $evaluation): RedirectResponse
    {
        $this->authorize('score-evaluations');

        $user = $request->user();
        $org = $evaluation->organization ?? Organization::find($evaluation->organization_id);

        if ($this->isProvinceOrganization($org)) {
            if (! $this->canManageProvincialEvaluations($user)) {
                abort(403, 'Anda tidak memiliki hak akses untuk mereview evidence Pemerintah Provinsi.');
            }
        } elseif (! $this->canManageProvincialEvaluations($user) && ! $this->authorization->canAccessOrganization($user, (int) $evaluation->organization_id)) {
            abort(403, 'Di luar lingkup organisasi Anda.');
        }

        $validated = $request->validate([
            'evidence_id' => ['required', 'integer', 'exists:evidences,id'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'status' => ['required', 'string', 'in:accepted,rejected,revision_needed'],
        ]);

        $this->audit->log('evidence_review', 'evaluation', $evaluation->id, $evaluation->organization_id);

        return back()->with('success', 'Review evidence berhasil disimpan.');
    }

    public function history(Evaluation $evaluation): Response
    {
        $this->authorize('view-evaluations');

        $evaluation->load([
            'organization:id,code,name',
            'planningPeriod:id,code,name,year',
            'recommendations.followups',
        ]);

        $auditLogs = AuditLog::query()
            ->where(function ($q) use ($evaluation) {
                $q->where('subject_type', 'evaluation')
                    ->where('subject_id', $evaluation->id);
            })
            ->orWhere(function ($q) use ($evaluation) {
                $q->where('subject_type', 'recommendation')
                    ->whereIn('subject_id', $evaluation->recommendations->pluck('id'));
            })
            ->latest()
            ->get();

        return Inertia::render('Evaluations/History', [
            'evaluation' => $evaluation,
            'auditLogs' => $auditLogs,
        ]);
    }

    public function exportPdf(Evaluation $evaluation): \Symfony\Component\HttpFoundation\Response
    {
        $this->authorize('view-evaluations');

        $evaluation->load([
            'organization:id,code,name',
            'planningPeriod:id,code,name,year',
            'scores',
            'recommendations.followups',
        ]);

        $totalScore = $evaluation->scores->sum('score');
        $totalMaxScore = $evaluation->scores->sum('max_score');
        $percentage = $totalMaxScore > 0 ? round(($totalScore / $totalMaxScore) * 100, 2) : 0;

        $grade = match (true) {
            $percentage > 90 => 'AA',
            $percentage > 80 => 'A',
            $percentage > 70 => 'BB',
            $percentage > 60 => 'B',
            $percentage > 50 => 'CC',
            $percentage > 30 => 'C',
            default => 'D',
        };

        $pdf = Pdf::loadView('reports.evaluation-pdf', [
            'evaluation' => $evaluation,
            'percentage' => $percentage,
            'grade' => $grade,
            'generatedAt' => now()->format('d-m-Y H:i'),
        ])->setPaper('a4', 'portrait');

        $filename = sprintf(
            'evaluasi-%s-%s.pdf',
            str()->slug($evaluation->organization->code ?? 'opd'),
            now()->format('Ymd'),
        );

        return $pdf->download($filename);
    }

    public function exportSakipPdf(Request $request): \Symfony\Component\HttpFoundation\Response
    {
        $this->authorize('view-evaluations');

        $year = (int) ($request->input('year', 2025));
        $period = PlanningPeriod::where('year', $year)->first();

        $rows = [];
        $stats = ['sangat_baik' => 0, 'baik' => 0, 'rendah' => 0];

        if ($period) {
            $orgs = Organization::orderBy('id')->get(['id', 'code', 'name']);
            $evaluations = Evaluation::with('scores')
                ->where('planning_period_id', $period->id)
                ->get()
                ->keyBy('organization_id');

            foreach ($orgs as $org) {
                $ev = $evaluations->get($org->id);
                $scores = $ev ? $ev->scores->keyBy('component') : collect();

                $komponen = ['perencanaan', 'pengukuran', 'pelaporan', 'evaluasi_internal', 'pencapaian_kinerja'];
                $total = 0.0;
                $hasData = false;
                $row = ['organization' => $org->name];
                foreach ($komponen as $k) {
                    $sc = $scores->get($k);
                    $val = $sc ? (float) $sc->score : null;
                    $row[$k] = $val;
                    if ($val !== null) {
                        $total += $val;
                        $hasData = true;
                    }
                }
                $row['total'] = $hasData ? round($total, 2) : null;
                $predikat = match (true) {
                    $total > 90 => 'AA',
                    $total > 80 => 'A',
                    $total > 70 => 'BB',
                    $total > 60 => 'B',
                    $total > 50 => 'CC',
                    $total > 30 => 'C',
                    $hasData => 'D',
                    default => '-'
                };
                $row['predikat'] = $predikat;
                if (in_array($predikat, ['AA', 'A', 'ISTIMEWA', 'BAIK'])) {
                    $stats['sangat_baik']++;
                } elseif (in_array($predikat, ['BB', 'B', 'BUTUH PERBAIKAN'])) {
                    $stats['baik']++;
                } elseif ($hasData) {
                    $stats['rendah']++;
                }
                $rows[] = $row;
            }
        }

        $pdf = Pdf::loadView('pdf.measurement-sakip', [
            'rows' => $rows, 'year' => $year, 'stats' => $stats,
            'generatedAt' => now()->format('d/m/Y H:i'),
        ])->setPaper('a4', 'portrait');

        return $pdf->download("evaluasi-sakip-{$year}.pdf");
    }

    public function exportPkoPdf(Request $request): \Symfony\Component\HttpFoundation\Response
    {
        $this->authorize('view-evaluations');

        $year = (int) ($request->input('year', 2025));
        $targetType = $request->input('target_type', 'opd');
        $orgId = $request->input('organization_id');

        $period = PlanningPeriod::where('year', $year)->first();
        $organization = $orgId ? Organization::find((int) $orgId) : Organization::where('type', 'opd')->first();

        $pkoQuery = PkoEvaluation::where('year', $year);
        if ($organization) {
            $pkoQuery->where('organization_id', $organization->id);
        }
        $pkoEval = $pkoQuery->first();

        // PkoIndicator terhubung via pko_evaluation_id (bukan year/target_type langsung)
        $indicators = $pkoEval
            ? PkoIndicator::where('pko_evaluation_id', $pkoEval->id)
                ->orderBy('order')
                ->get()
            : collect();

        $pdf = Pdf::loadView('pdf.measurement-pko', [
            'indicators' => $indicators,
            'pkoSummary' => $pkoEval,
            'year' => $year,
            'targetType' => $targetType,
            'organization' => $organization,
            'generatedAt' => now()->format('d/m/Y H:i'),
        ])->setPaper('a4', 'portrait');

        return $pdf->download("evaluasi-pko-{$targetType}-{$year}.pdf");
    }
}
