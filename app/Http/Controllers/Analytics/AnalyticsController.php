<?php

namespace App\Http\Controllers\Analytics;

use App\Http\Controllers\Controller;
use App\Models\ActionPlan;
use App\Models\Evaluation;
use App\Models\EvaluationScore;
use App\Models\Indicator;
use App\Models\IndicatorTarget;
use App\Models\MeasurementPeriod;
use App\Models\Organization;
use App\Models\PlanningDocument;
use App\Models\PlanningPeriod;
use App\Models\Realization;
use App\Services\AchievementCalculator;
use App\Services\AuthorizationService;
use App\Services\EarlyWarningAnalyticsService;
use App\Services\OpdAnalyticsService;
use App\Services\RpjmdAnalyticsService;
use App\Services\SakipDocumentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Barryvdh\DomPDF\Facade\Pdf;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AnalyticsController extends Controller
{
    public function __construct(
        private readonly AuthorizationService $authorization,
        private readonly AchievementCalculator $calculator,
        private readonly SakipDocumentService $sakipDocService,
        private readonly RpjmdAnalyticsService $rpjmdService,
        private readonly OpdAnalyticsService $opdAnalytics,
        private readonly EarlyWarningAnalyticsService $ewsAnalytics,
    ) {}

    private function getDefaultYear(): int
    {
        return (int) (PlanningPeriod::where('status', 'active')->value('year')
            ?? PlanningPeriod::orderByDesc('year')->value('year')
            ?? (int) date('Y'));
    }

    public function index(Request $request): Response
    {
        $this->authorize('view-dashboard');

        $filters = $request->only(['indicator_id', 'organization_id', 'year', 'triwulan', 'status']);
        $filters['year'] = (int) ($request->get('year', $this->getDefaultYear()));
        $filters['triwulan'] = $request->get('triwulan', 'TW II');

        $cacheTtl = (int) config('ekasuari.cache.analytics_ttl', 300);
        $cacheKey = 'analytics.'.md5(json_encode($filters));

        $trend             = Cache::remember($cacheKey.'.trend', $cacheTtl, fn () => $this->buildTrend($filters));
        $deviation         = Cache::remember($cacheKey.'.deviation', $cacheTtl, fn () => $this->buildDeviation($filters));
        $opdComparison     = Cache::remember($cacheKey.'.opd', $cacheTtl, fn () => $this->buildOpdComparison($filters));
        $ikuAnalysis       = Cache::remember($cacheKey.'.iku', $cacheTtl, fn () => $this->buildIkuAnalysis($filters));
        $heatmap           = Cache::remember('analytics.heatmap', $cacheTtl, fn () => $this->buildHeatmap());
        $sakipDocs         = Cache::remember($cacheKey.'.sakip_docs', $cacheTtl, fn () => $this->buildSakipDocs($filters));
        $rpjmdAnalysis     = Cache::remember($cacheKey.'.rpjmd', $cacheTtl, fn () => $this->rpjmdService->getRpjmdMatrix($filters['year'], null, $filters['organization_id'] ?? null));

        // 6 Baris Dashboard Analitik Komprehensif (Sesuai Panduan DASHBOARD ANALITIK.docx)
        $ikuPemdaMatrix    = Cache::remember($cacheKey.'.iku_pemda', $cacheTtl, fn () => $this->opdAnalytics->getIkuPemdaMatrix($filters['year'], $filters['status'] ?? null));
        $opdRankingMatrix  = Cache::remember($cacheKey.'.opd_ranking', $cacheTtl, fn () => $this->opdAnalytics->getOpdPerformanceRanking($filters['year'], $filters['organization_id'] ?? null, $filters['status'] ?? null));
        $sakipPemdaMatrix  = Cache::remember($cacheKey.'.sakip_pemda', $cacheTtl, fn () => $this->opdAnalytics->getSakipPemdaMatrix($filters['year']));
        $sakipEvaluations  = Cache::remember($cacheKey.'.sakip_eval', $cacheTtl, fn () => $this->opdAnalytics->getSakipEvaluationMatrix($filters['year'], $filters['organization_id'] ?? null));
        $pkoAnalysis       = Cache::remember($cacheKey.'.pko', $cacheTtl, fn () => $this->opdAnalytics->getPkoMatrix($filters['year'], $filters['organization_id'] ?? null));
        $actionPlans       = Cache::remember($cacheKey.'.action_plans', $cacheTtl, fn () => $this->opdAnalytics->getActionPlansMatrix($filters['year'], $filters['triwulan'] ?? 'TW II', $filters['organization_id'] ?? null));
        $monitoringBudget  = Cache::remember($cacheKey.'.monitoring_budget', $cacheTtl, fn () => $this->opdAnalytics->getMonitoringBudgetMatrix($filters['year'], $filters['triwulan'] ?? 'TW II', $filters['organization_id'] ?? null));
        $riskMapMatrix     = Cache::remember($cacheKey.'.risk_map', $cacheTtl, fn () => $this->ewsAnalytics->getRiskMap($filters['year']));

        return Inertia::render('Analytics/Index', [
            'filters'                  => $filters,
            'trend'                    => $trend,
            'deviation'                => $deviation,
            'opd_comparison'           => $opdComparison,
            'iku_analysis'             => $ikuAnalysis,
            'heatmap'                  => $heatmap,
            'sakip_docs'               => $sakipDocs,
            'sakip_pemda_matrix'       => $sakipPemdaMatrix,
            'sakip_evaluations'        => $sakipEvaluations['rows'],
            'sakip_eval_matrix'        => $sakipEvaluations,
            'pko_analysis'             => $pkoAnalysis['opd_pko']['rows'],
            'pko_matrix'               => $pkoAnalysis,
            'action_plans'             => $actionPlans['rows'],
            'action_plans_matrix'      => $actionPlans,
            'monitoring_budget_matrix' => $monitoringBudget,
            'rpjmd_analysis'     => $rpjmdAnalysis,
            'iku_pemda_matrix'   => $ikuPemdaMatrix,
            'opd_ranking_matrix' => $opdRankingMatrix,
            'risk_map_matrix'    => $riskMapMatrix,
            'indicators'        => Indicator::query()
                ->where('status', 'active')
                ->with('currentVersion:id,indicator_id,name')
                ->orderBy('code')
                ->get(['id', 'code', 'is_iku']),
            'organizations'     => Organization::query()
                ->whereIn('id', $this->authorization->accessibleOrganizationIds($request->user()))
                ->orderBy('code')
                ->get(['id', 'code', 'name']),
            'available_years'   => (function () use ($rpjmdAnalysis, $filters) {
                $yrs = array_unique(array_merge(
                    PlanningPeriod::getAvailableYears(),
                    $rpjmdAnalysis['years'] ?? [],
                    [$filters['year']]
                ));
                sort($yrs);
                return array_values($yrs);
            })(),
        ]);
    }

    /**
     * Tren capaian rata-rata per periode pengukuran (FR-ANL-001).
     */
    private function buildTrend(array $filters): array
    {
        $periods = MeasurementPeriod::query()
            ->withCount([
                'realizations' => fn ($q) => $q
                    ->where('status', 'approved')
                    ->when($filters['organization_id'] ?? null, fn ($q, $orgId) => $q->where('organization_id', $orgId)),
            ])
            ->orderBy('start_date')
            ->get();

        $targets = IndicatorTarget::query()
            ->with('indicatorVersion:id,direction')
            ->where('status', 'approved')
            ->get()
            ->keyBy(fn ($t) => $t->indicator_version_id.'|'.$t->organization_id);

        $validPeriodIds = $periods->where('realizations_count', '>', 0)->pluck('id');
        $allRealizations = Realization::query()
            ->with('indicatorVersion:id,direction')
            ->whereIn('measurement_period_id', $validPeriodIds)
            ->where('status', 'approved')
            ->when($filters['organization_id'] ?? null, fn ($q, $orgId) => $q->where('organization_id', $orgId))
            ->when($filters['indicator_id'] ?? null, function ($q, $indicatorId) {
                $q->whereHas('indicatorVersion', fn ($sub) => $sub->where('indicator_id', $indicatorId));
            })
            ->get()
            ->groupBy('measurement_period_id');

        $points = [];

        foreach ($periods as $period) {
            if ($period->realizations_count === 0) {
                continue;
            }

            $realizations = $allRealizations->get($period->id, collect());

            if ($realizations->isEmpty()) {
                continue;
            }

            $achievements = $realizations->map(function (Realization $realization) use ($targets) {
                $target = $targets->get($realization->indicator_version_id.'|'.$realization->organization_id);

                return $this->calculator->calculate(
                    $realization->value,
                    $target?->target_value,
                    $realization->indicatorVersion->direction,
                );
            })->filter(fn ($value) => $value !== null);

            if ($achievements->isEmpty()) {
                continue;
            }

            $avg = round($achievements->avg(), 2);
            $points[] = [
                'period_id' => $period->id,
                'period' => $period->name,
                'start_date' => $period->start_date ? $period->start_date->format('d/m/Y') : '-',
                'end_date' => $period->end_date ? $period->end_date->format('d/m/Y') : '-',
                'evaluated_indicators' => $realizations->pluck('indicator_version_id')->unique()->count(),
                'realization_count' => $realizations->count(),
                'average_achievement' => $avg,
                'status' => $avg >= 80 ? 'Baik' : ($avg >= 60 ? 'Perlu Perhatian' : 'Kritis'),
            ];
        }

        return $points;
    }

    /**
     * Deviasi target vs realisasi, dihitung server-side (FR-ANL-002).
     */
    private function buildDeviation(array $filters): array
    {
        $rows = Realization::query()
            ->with([
                'indicatorVersion:id,indicator_id,name,direction,measurement_unit_id',
                'indicatorVersion.measurementUnit:id,code,name,symbol',
                'indicatorVersion.indicator:id,code',
                'organization:id,code,name',
                'measurementPeriod:id,name',
            ])
            ->where('status', 'approved')
            ->when($filters['indicator_id'] ?? null, function ($q, $indicatorId) {
                $q->whereHas('indicatorVersion', fn ($sub) => $sub->where('indicator_id', $indicatorId));
            })
            ->when($filters['organization_id'] ?? null, fn ($q, $orgId) => $q->where('organization_id', $orgId))
            ->when($filters['year'] ?? null, function ($q, $year) {
                $q->whereHas('measurementPeriod.planningPeriod', fn ($sub) => $sub->where('year', $year));
            })
            ->latest('id')
            ->limit(150)
            ->get();

        $targets = IndicatorTarget::query()
            ->with('indicatorVersion:id,direction')
            ->where('status', 'approved')
            ->get()
            ->keyBy(fn ($t) => $t->indicator_version_id.'|'.$t->organization_id);

        return $rows->map(function (Realization $realization) use ($targets) {
            $target = $targets->get($realization->indicator_version_id.'|'.$realization->organization_id);
            $targetValue = $target ? (float) $target->target_value : null;
            $value = (float) $realization->value;
            $direction = $realization->indicatorVersion->direction;
            $achievement = $this->calculator->calculate($value, $targetValue, $direction);

            $deviation = match ($direction) {
                'lower_is_better' => $targetValue !== null ? round($targetValue - $value, 2) : null,
                default => $targetValue !== null ? round($value - $targetValue, 2) : null,
            };

            $status = $achievement === null ? 'Tidak Dinilai' : ($achievement >= 80 ? 'Tercapai' : ($achievement >= 60 ? 'Perlu Perhatian' : 'Kritis'));

            return [
                'indicator_code' => $realization->indicatorVersion->indicator->code,
                'indicator_name' => $realization->indicatorVersion->name,
                'organization_code' => $realization->organization->code,
                'organization_name' => $realization->organization->name,
                'unit' => $realization->indicatorVersion->unit ?? '-',
                'period' => $realization->measurementPeriod->name,
                'value' => $value,
                'target' => $targetValue,
                'deviation' => $deviation,
                'achievement' => $achievement,
                'status' => $status,
            ];
        })->values()->all();
    }

    /**
     * Perbandingan OPD: rata-rata capaian per OPD untuk indikator comparable (FR-ANL-003).
     */
    private function buildOpdComparison(array $filters): array
    {
        $orgIds = $this->authorization->accessibleOrganizationIds(request()->user());

        $realizations = Realization::query()
            ->with(['indicatorVersion:id,direction', 'organization:id,code,name'])
            ->whereIn('organization_id', $orgIds)
            ->where('status', 'approved')
            ->when($filters['indicator_id'] ?? null, function ($q, $indicatorId) {
                $q->whereHas('indicatorVersion', fn ($sub) => $sub->where('indicator_id', $indicatorId));
            })
            ->when($filters['organization_id'] ?? null, fn ($q, $orgId) => $q->where('organization_id', $orgId))
            ->when($filters['year'] ?? null, function ($q, $year) {
                $q->whereHas('measurementPeriod.planningPeriod', fn ($sub) => $sub->where('year', $year));
            })
            ->get();

        if ($realizations->isEmpty()) {
            return [];
        }

        $targets = IndicatorTarget::query()
            ->with('indicatorVersion:id,direction')
            ->where('status', 'approved')
            ->whereIn('organization_id', $orgIds)
            ->get()
            ->keyBy(fn ($t) => $t->indicator_version_id.'|'.$t->organization_id);

        $byOrg = $realizations->groupBy('organization_id');

        $list = $byOrg->map(function ($group, $orgId) use ($targets) {
            $achievements = $group->map(function (Realization $realization) use ($targets) {
                $target = $targets->get($realization->indicator_version_id.'|'.$realization->organization_id);

                return $this->calculator->calculate(
                    $realization->value,
                    $target?->target_value,
                    $realization->indicatorVersion->direction,
                );
            })->filter(fn ($value) => $value !== null);

            $first = $group->first();
            $avg = $achievements->isEmpty() ? null : round($achievements->avg(), 2);
            $category = $avg === null ? 'Belum Ada Data' : ($avg >= 90 ? 'Sangat Tinggi' : ($avg >= 80 ? 'Tinggi' : ($avg >= 60 ? 'Sedang' : 'Rendah')));

            return [
                'organization_id' => (int) $orgId,
                'organization_code' => $first->organization->code,
                'organization_name' => $first->organization->name,
                'realization_count' => $group->count(),
                'average_achievement' => $avg,
                'category' => $category,
            ];
        })->sortByDesc('average_achievement')->values();

        return $list->map(function ($item, $index) {
            $item['rank'] = $index + 1;
            return $item;
        })->all();
    }

    /**
     * Analisis IKU: 21 Indikator Kinerja Utama Pemda & OPD (FR-ANL-004).
     */
    private function buildIkuAnalysis(array $filters): array
    {
        $orgIds = $this->authorization->accessibleOrganizationIds(request()->user());

        $indicators = Indicator::query()
            ->where('is_iku', true)
            ->where('status', 'active')
            ->with([
                'currentVersion:id,indicator_id,name,direction,measurement_unit_id',
                'currentVersion.measurementUnit:id,code,name,symbol',
                'organization:id,code,name',
            ])
            ->when($filters['indicator_id'] ?? null, fn ($q, $id) => $q->where('id', $id))
            ->when($filters['organization_id'] ?? null, fn ($q, $orgId) => $q->where('owner_organization_id', $orgId))
            ->orderBy('code')
            ->get();

        $latestRealizations = Realization::query()
            ->where('status', 'approved')
            ->whereIn('organization_id', $orgIds)
            ->with('measurementPeriod:id,name')
            ->orderByDesc('id')
            ->get()
            ->groupBy('indicator_version_id');

        $targets = IndicatorTarget::query()
            ->where('status', 'approved')
            ->whereIn('organization_id', $orgIds)
            ->get()
            ->groupBy('indicator_version_id');

        return $indicators->map(function (Indicator $ind) use ($latestRealizations, $targets) {
            $ver = $ind->currentVersion;
            $verId = $ver?->id;
            $rel = $verId ? $latestRealizations->get($verId)?->first() : null;
            $tgt = $verId ? $targets->get($verId)?->first() : null;

            $value = $rel ? (float) $rel->value : null;
            $targetValue = $tgt ? (float) $tgt->target_value : null;
            $direction = $ver?->direction ?? 'higher_is_better';
            $achievement = ($value !== null && $targetValue !== null)
                ? $this->calculator->calculate($value, $targetValue, $direction)
                : null;

            $status = 'Belum Ada Data';
            if ($achievement !== null) {
                if ($achievement >= 100) $status = 'Tercapai';
                elseif ($achievement >= 80) $status = 'Baik';
                elseif ($achievement >= 60) $status = 'Perlu Perhatian';
                else $status = 'Kritis';
            }

            return [
                'id' => $ind->id,
                'code' => $ind->code,
                'name' => $ver?->name ?? $ind->code,
                'organization_code' => $ind->organization?->code ?? '-',
                'organization_name' => $ind->organization?->name ?? 'Pemerintah Provinsi',
                'unit' => $ver?->unit ?? '-',
                'direction' => $direction,
                'period' => $rel?->measurementPeriod?->name ?? 'Tahunan',
                'target' => $targetValue,
                'realization' => $value,
                'achievement' => $achievement,
                'status' => $status,
            ];
        })->values()->all();
    }

    /**
     * Heatmap kinerja: indikator x periode, warna berdasar threshold terdokumentasi (FR-ANL-005).
     */
    private function buildHeatmap(): array
    {
        $indicators = Indicator::query()
            ->where('status', 'active')
            ->with('currentVersion:id,indicator_id,name')
            ->orderBy('code')
            ->limit(15)
            ->get();

        $periods = MeasurementPeriod::query()
            ->orderByDesc('end_date')
            ->limit(8)
            ->get();

        $targets = IndicatorTarget::query()
            ->with('indicatorVersion:id,direction')
            ->where('status', 'approved')
            ->get()
            ->keyBy(fn ($t) => $t->indicator_version_id.'|'.$t->organization_id);

        $cells = [];
        $byVersion = $indicators->mapWithKeys(fn ($ind) => [$ind->currentVersion?->id => $ind->code]);

        $allGridRealizations = Realization::query()
            ->with('indicatorVersion:id,direction')
            ->whereIn('measurement_period_id', $periods->pluck('id'))
            ->where('status', 'approved')
            ->get()
            ->groupBy('measurement_period_id');

        foreach ($periods as $period) {
            $realizations = $allGridRealizations->get($period->id, collect());

            foreach ($realizations as $realization) {
                $indicatorCode = $byVersion->get($realization->indicator_version_id);
                if ($indicatorCode === null) {
                    continue;
                }

                $target = $targets->get($realization->indicator_version_id.'|'.$realization->organization_id);
                $achievement = $this->calculator->calculate(
                    $realization->value,
                    $target?->target_value,
                    $realization->indicatorVersion->direction,
                );

                $key = $indicatorCode.'|'.$period->id;
                $cells[$key][] = $achievement;
            }
        }

        $goodThreshold = (int) config('ekasuari.ews.good_threshold', 80);
        $warningThreshold = (int) config('ekasuari.ews.warning_threshold', 60);

        $grid = [];
        foreach ($indicators as $indicator) {
            $row = [
                'indicator_code' => $indicator->code,
                'indicator_name' => $indicator->currentVersion?->name ?? $indicator->code,
                'cells' => [],
            ];

            foreach ($periods as $period) {
                $values = $cells[$indicator->code.'|'.$period->id] ?? [];
                $valid = array_filter($values, fn ($value) => $value !== null);

                if ($valid === []) {
                    $status = 'no_data';
                    $achievement = null;
                } else {
                    $achievement = round(array_sum($valid) / count($valid), 2);
                    $status = $achievement >= $goodThreshold
                        ? 'good'
                        : ($achievement >= $warningThreshold ? 'warning' : 'critical');
                }

                $row['cells'][] = [
                    'period_id' => $period->id,
                    'period_name' => $period->name,
                    'achievement' => $achievement,
                    'status' => $status,
                ];
            }

            $grid[] = $row;
        }

        return [
            'periods' => $periods->map(fn ($p) => ['id' => $p->id, 'name' => $p->name])->values(),
            'rows' => $grid,
        ];
    }

    /**
     * 1. Kelengkapan Dokumen SAKIP (Level Pemda 13 Dokumen & Level OPD 12 Dokumen).
     * Sesuai file panduan: guide/DASHBOARD ANALITIK.docx
     */
    private function buildSakipDocs(array $filters): array
    {
        $orgIds = $this->authorization->accessibleOrganizationIds(request()->user());
        $year = (int) ($filters['year'] ?? $this->getDefaultYear());
        $filterOpdId = !empty($filters['organization_id']) ? (int) $filters['organization_id'] : null;

        $pemdaMatrix = $this->sakipDocService->getSakipPemdaMatrix($year);
        $opdMatrix = $this->sakipDocService->getSakipOpdMatrix($year, $filterOpdId, $orgIds);

        return [
            'pemda_summary' => [
                'total_required'  => $pemdaMatrix['total_required'],
                'available'       => $pemdaMatrix['available'],
                'missing'         => $pemdaMatrix['missing'],
                'percentage'      => $pemdaMatrix['percentage'],
                'status'          => $pemdaMatrix['status'],
                'evaluation_year' => $year,
            ],
            'pemda_rows' => $pemdaMatrix['rows'],
            'opd_summary' => [
                'total_opd'         => $opdMatrix['total_opd'],
                'opd_lengkap'       => $opdMatrix['opd_lengkap'],
                'opd_belum_lengkap' => $opdMatrix['opd_belum_lengkap'],
                'pct_lengkap'       => $opdMatrix['pct_lengkap'],
                'missing_docs'      => $opdMatrix['missing_docs'],
            ],
            'opd_columns' => $opdMatrix['columns'],
            'opd_rows' => $opdMatrix['rows'],
            'opd_matrix' => $opdMatrix,
        ];
    }

    /**
     * 2. Nilai SAKIP OPD: 4 Komponen (Perencanaan 30, Pengukuran 30, Pelaporan 15, Evaluasi 25).
     * Sesuai file panduan: guide/DASHBOARD ANALITIK.docx
     */
    private function buildSakipEvaluations(array $filters): array
    {
        $orgIds = $this->authorization->accessibleOrganizationIds(request()->user());

        $evaluations = Evaluation::with('scores', 'organization')
            ->whereIn('organization_id', $orgIds)
            ->where('status', 'approved')
            ->when($filters['organization_id'] ?? null, fn ($q, $id) => $q->where('organization_id', $id))
            ->get();

        $rows = [];
        foreach ($evaluations as $idx => $ev) {
            $scores = $ev->scores;
            $p1 = (float) $scores->where('component', 'Perencanaan Kinerja')->sum('score');
            $p2 = (float) $scores->where('component', 'Pengukuran Kinerja')->sum('score');
            $p3 = (float) $scores->where('component', 'Pelaporan Kinerja')->sum('score');
            $p4 = (float) $scores->where('component', 'Evaluasi Internal')->sum('score');
            $total = round($p1 + $p2 + $p3 + $p4, 2);

            // Standar Evaluasi Rentang Skala AA - D (Opsi B):
            $predikat = match (true) {
                $total < 0  => 'D',
                $total > 90 => 'AA',
                $total > 80 => 'A',
                $total > 70 => 'BB',
                $total > 60 => 'B',
                $total > 50 => 'CC',
                $total > 30 => 'C',
                default     => 'D',
            };

            $rows[] = [
                'no' => $idx + 1,
                'organization_id' => $ev->organization_id,
                'organization_code' => $ev->organization?->code ?? '-',
                'organization_name' => $ev->organization?->name ?? '-',
                'perencanaan' => $p1,
                'pengukuran' => $p2,
                'pelaporan' => $p3,
                'evaluasi_internal' => $p4,
                'nilai' => $total,
                'predikat' => $total > 0 ? $predikat : 'BELUM DINILAI',
                'status_lhe' => $ev->report_file_path ? 'Tersedia' : 'Draft LHE',
            ];
        }

        // Urutkan nilai SAKIP tertinggi
        usort($rows, fn($a, $b) => $b['nilai'] <=> $a['nilai']);
        foreach ($rows as $i => &$r) {
            $r['no'] = $i + 1;
        }
        unset($r);

        return $rows;
    }

    /**
     * 3. Penilaian Kinerja Organisasi (PKO) Perangkat Daerah.
     * Sesuai file panduan: guide/DASHBOARD ANALITIK.docx
     */
    private function buildPkoAnalysis(array $filters): array
    {
        $orgIds = $this->authorization->accessibleOrganizationIds(request()->user());
        $allOpd = Organization::where('type', 'opd')
            ->whereIn('id', $orgIds)
            ->when($filters['organization_id'] ?? null, fn ($q, $id) => $q->where('id', $id))
            ->orderBy('code')
            ->get();

        $evaluations = Evaluation::with('scores')
            ->whereIn('organization_id', $orgIds)
            ->where('status', 'approved')
            ->get()
            ->keyBy('organization_id');

        $rows = [];
        foreach ($allOpd as $opd) {
            $ev = $evaluations->get($opd->id);
            $totalSakip = $ev ? (float) $ev->scores->sum('score') : 0.0;

            $predSakip = match (true) {
                $totalSakip <= 0 => 'BELUM DINILAI',
                $totalSakip > 90 => 'AA',
                $totalSakip > 80 => 'A',
                $totalSakip > 70 => 'BB',
                $totalSakip > 60 => 'B',
                $totalSakip > 50 => 'CC',
                $totalSakip > 30 => 'C',
                default          => 'D',
            };

            $koreksi = 0.00;

            $normalized = 0.0;
            $nilaiPko = round($normalized * (1.0 - $koreksi), 2);

            $predPko = match (true) {
                $nilaiPko <= 0   => 'BELUM DINILAI',
                $nilaiPko > 100  => 'ISTIMEWA',
                $nilaiPko > 80   => 'BAIK',
                $nilaiPko > 60   => 'BUTUH PERBAIKAN',
                $nilaiPko > 20   => 'KURANG',
                default          => 'SANGAT KURANG',
            };

            $rows[] = [
                'organization_id' => $opd->id,
                'organization_code' => $opd->code,
                'organization_name' => $opd->name,
                'nilai_pko' => $nilaiPko,
                'predikat' => $predPko,
            ];
        }

        usort($rows, fn($a, $b) => $b['nilai_pko'] <=> $a['nilai_pko']);
        $totalCount = count($rows);
        foreach ($rows as $idx => &$item) {
            $item['rank'] = $idx + 1;
            $item['category'] = $idx < 10 ? 'Top 10' : ($totalCount - $idx <= 10 ? '10 Terendah' : 'Menengah');
        }
        unset($item);

        return $rows;
    }

    /**
     * 4. Capaian Kinerja Rencana Aksi Triwulan.
     * Sesuai file panduan: guide/DASHBOARD ANALITIK.docx
     */
    private function buildActionPlansAnalysis(array $filters): array
    {
        $orgIds = $this->authorization->accessibleOrganizationIds(request()->user());

        $actionPlans = ActionPlan::with('organization')
            ->whereIn('organization_id', $orgIds)
            ->when($filters['organization_id'] ?? null, fn ($q, $id) => $q->where('organization_id', $id))
            ->orderBy('id')
            ->get();

        $rows = [];
        foreach ($actionPlans as $idx => $ap) {
            $prog = (float) $ap->progress;
            $st = match (true) {
                $prog >= 95 => 'Tercapai',
                $prog >= 75 => 'Perlu Perhatian',
                $prog >= 50 => 'Terlambat',
                default     => 'Kritis',
            };

            $rows[] = [
                'no' => $idx + 1,
                'id' => $ap->id,
                'title' => $ap->title,
                'organization_code' => $ap->organization?->code ?? '-',
                'organization_name' => $ap->organization?->name ?? '-',
                'target_tw' => (float) ($ap->target_value ?? 0),
                'realization_tw' => round($prog, 2),
                'achievement' => round($prog, 2),
                'status' => $st,
            ];
        }

        return $rows;
    }

    public function export(Request $request): StreamedResponse
    {
        $this->authorize('view-dashboard');

        $type = $request->input('type', 'deviation');
        $filters = $request->only(['indicator_id', 'organization_id']);

        $csv = fopen('php://temp', 'r+');
        // Prepend UTF-8 BOM so Excel opens indonesian characters properly
        fputs($csv, "\xEF\xBB\xBF");

        if ($type === 'rpjmd') {
            $year = (int) ($request->get('year', $this->getDefaultYear()));
            $filename = 'analitik-capaian-rpjmd-' . $year . '-' . now()->format('YmdHis') . '.csv';
            $matrix = $this->rpjmdService->getRpjmdMatrix($year, null, $filters['organization_id'] ?? null);
            $years = !empty($matrix['years']) ? $matrix['years'] : PlanningPeriod::getAvailableYears();
            $headers = ['No', 'Tujuan', 'Sasaran RPJMD', 'Indikator', 'Satuan', 'Target ' . $year, 'Realisasi ' . $year, 'Capaian ' . $year . ' (%)', 'Status', 'OPD Pengampu'];
            foreach ($years as $yr) {
                $headers[] = 'Target ' . $yr;
                $headers[] = 'Realisasi ' . $yr;
                $headers[] = 'Capaian ' . $yr . ' (%)';
            }
            fputcsv($csv, $headers);
            foreach ($matrix['rows'] as $row) {
                $line = [
                    $row['no'],
                    $row['tujuan'],
                    $row['sasaran'],
                    $row['indikator'],
                    $row['satuan'],
                    $row['target'] ?? '-',
                    $row['realisasi'] ?? '-',
                    $row['capaian'] !== null ? $row['capaian'] . '%' : '-',
                    $row['status'],
                    $row['opd_pengampu'],
                ];
                foreach ($years as $yr) {
                    $line[] = $row['yearly'][$yr]['target'] ?? '-';
                    $line[] = $row['yearly'][$yr]['realization'] ?? '-';
                    $line[] = $row['yearly'][$yr]['achievement'] !== null ? $row['yearly'][$yr]['achievement'] . '%' : '-';
                }
                fputcsv($csv, $line);
            }
        } elseif ($type === 'trend') {
            $filename = 'analitik-tren-capaian-'.now()->format('YmdHis').'.csv';
            $rows = $this->buildTrend($filters);
            fputcsv($csv, [
                'No', 'Periode Pengukuran', 'Mulai', 'Selesai',
                'Jumlah Indikator', 'Total Realisasi', 'Rata-rata Capaian (%)', 'Status',
            ]);
            foreach ($rows as $i => $row) {
                fputcsv($csv, [
                    $i + 1,
                    $row['period'],
                    $row['start_date'],
                    $row['end_date'],
                    $row['evaluated_indicators'],
                    $row['realization_count'],
                    $row['average_achievement'],
                    $row['status'],
                ]);
            }
        } elseif ($type === 'opd') {
            $filename = 'analitik-perbandingan-opd-'.now()->format('YmdHis').'.csv';
            $rows = $this->buildOpdComparison($filters);
            fputcsv($csv, [
                'Peringkat', 'Kode OPD', 'Perangkat Daerah', 'Jumlah Realisasi',
                'Rata-rata Capaian (%)', 'Kategori Kinerja',
            ]);
            foreach ($rows as $row) {
                fputcsv($csv, [
                    $row['rank'],
                    $row['organization_code'],
                    $row['organization_name'],
                    $row['realization_count'],
                    $row['average_achievement'] ?? '0',
                    $row['category'],
                ]);
            }
        } elseif ($type === 'iku' || $type === 'iku_pemda') {
            $year = (int) ($request->get('year', $this->getDefaultYear()));
            $filename = 'analitik-iku-pemda-' . $year . '-' . now()->format('YmdHis') . '.csv';
            $matrix = $this->opdAnalytics->getIkuPemdaMatrix($year);
            $years = !empty($matrix['years']) ? $matrix['years'] : PlanningPeriod::getAvailableYears();
            $headers = [
                'No', 'Sasaran Strategis', 'IKU Pemerintah Daerah', 'Satuan', 'Karakter Indikator',
                'Target ' . $year, 'Realisasi ' . $year, 'Capaian ' . $year . ' (%)', 'Status', 'Predikat', 'Tren', 'OPD Pengampu',
            ];
            foreach ($years as $yr) {
                $headers[] = 'Target ' . $yr;
                $headers[] = 'Realisasi ' . $yr;
                $headers[] = 'Capaian ' . $yr . ' (%)';
            }
            fputcsv($csv, $headers);
            foreach ($matrix['rows'] as $row) {
                $line = [
                    $row['no'],
                    $row['sasaran'],
                    $row['indikator'],
                    $row['satuan'],
                    $row['karakter'],
                    $row['target'] ?? '-',
                    $row['realisasi'] ?? '-',
                    $row['capaian'] !== null ? $row['capaian'] . '%' : '-',
                    $row['status'],
                    $row['predikat'],
                    $row['tren'],
                    $row['opd_pengampu'],
                ];
                foreach ($years as $yr) {
                    $line[] = $row['yearly'][$yr]['target'] ?? '-';
                    $line[] = $row['yearly'][$yr]['realization'] ?? '-';
                    $line[] = $row['yearly'][$yr]['achievement'] !== null ? $row['yearly'][$yr]['achievement'] . '%' : '-';
                }
                fputcsv($csv, $line);
            }
        } elseif ($type === 'opd_ranking') {
            $year = (int) ($request->get('year', $this->getDefaultYear()));
            $filename = 'analitik-ranking-kinerja-opd-' . $year . '-' . now()->format('YmdHis') . '.csv';
            $matrix = $this->opdAnalytics->getOpdPerformanceRanking($year, $filters['organization_id'] ?? null);
            $years = !empty($matrix['years']) ? $matrix['years'] : PlanningPeriod::getAvailableYears();
            $headers = [
                'Peringkat', 'Kode OPD', 'Perangkat Daerah', 'Jumlah Indikator',
                'Rata-rata Capaian (%)', 'Tercapai', 'Perlu Perhatian', 'Terlambat', 'Kritis', 'Status', 'Predikat',
            ];
            foreach ($years as $yr) {
                $headers[] = $yr . ' (%)';
            }
            $headers[] = 'Tren';
            fputcsv($csv, $headers);
            foreach ($matrix['rows'] as $row) {
                $line = [
                    $row['rank'],
                    $row['kode'],
                    $row['perangkat_daerah'],
                    $row['jumlah_indikator'],
                    $row['rata_capaian'] . '%',
                    $row['tercapai'],
                    $row['perhatian'],
                    $row['terlambat'],
                    $row['kritis'],
                    $row['status'],
                    $row['predikat'],
                ];
                foreach ($years as $yr) {
                    $line[] = isset($row['yearly'][$yr]['capaian']) ? $row['yearly'][$yr]['capaian'] . '%' : '-';
                }
                $line[] = $row['tren'] ?? '→';
                fputcsv($csv, $line);
            }
        } elseif ($type === 'sakip_docs_pemda') {
            $filename = 'analitik-dokumen-sakip-pemda-'.now()->format('YmdHis').'.csv';
            $docs = $this->buildSakipDocs($filters);
            fputcsv($csv, ['No', 'Dokumen Pemerintah Daerah', 'Tahun/Periode', 'Kelengkapan', 'Status']);
            foreach ($docs['pemda_rows'] as $row) {
                fputcsv($csv, [
                    $row['no'],
                    $row['name'],
                    $row['period'],
                    $row['is_available'] ? '✓' : '-',
                    $row['status'],
                ]);
            }
        } elseif ($type === 'sakip_docs_opd') {
            $filename = 'analitik-dokumen-sakip-opd-'.now()->format('YmdHis').'.csv';
            $docs = $this->buildSakipDocs($filters);
            $header = array_merge(['No', 'Kode OPD', 'Perangkat Daerah'], array_values($docs['opd_columns']), ['Tersedia', 'Total', 'Kelengkapan (%)', 'Status']);
            fputcsv($csv, $header);
            foreach ($docs['opd_rows'] as $row) {
                $line = [$row['no'], $row['organization_code'], $row['organization_name']];
                foreach ($docs['opd_columns'] as $k => $lbl) {
                    $line[] = !empty($row['checks'][$k]) ? '✓' : '-';
                }
                $line[] = $row['available_count'];
                $line[] = $row['total_required'];
                $line[] = $row['percentage'];
                $line[] = $row['status'];
                fputcsv($csv, $line);
            }
        } elseif ($type === 'sakip_pemda') {
            $year = (int) ($request->get('year', $this->getDefaultYear()));
            $filename = 'analitik-evaluasi-sakip-pemda-' . $year . '-' . now()->format('YmdHis') . '.csv';
            $matrix = $this->opdAnalytics->getSakipPemdaMatrix($year);
            $headers = ['No', 'Komponen Akuntabilitas', 'Bobot (%)', 'Nilai Capaian', 'Persentase Capaian (%)', 'Predikat Mutu', 'Deskripsi Komponen'];
            fputcsv($csv, $headers);
            foreach ($matrix['komponen'] as $k) {
                fputcsv($csv, [
                    $k['no'],
                    $k['komponen'],
                    $k['bobot'],
                    $k['nilai'],
                    $k['persen'] . '%',
                    $k['predikat'],
                    $k['deskripsi'],
                ]);
            }
            fputcsv($csv, []);
            fputcsv($csv, ['Total Nilai SAKIP Pemda', '', 100, $matrix['nilai'], $matrix['nilai'] . '%', $matrix['predikat'], 'Predikat Evaluasi Akuntabilitas Kinerja Instansi Pemerintah']);
            fputcsv($csv, ['Nomor LHE', $matrix['lhe']['nomor_lhe']]);
            fputcsv($csv, ['Evaluator', $matrix['lhe']['evaluator']]);
            fputcsv($csv, ['Catatan Evaluasi', $matrix['lhe']['catatan']]);
            fputcsv($csv, ['Rekomendasi', $matrix['lhe']['rekomendasi']]);
        } elseif ($type === 'sakip_eval') {
            $year = (int) ($request->get('year', $this->getDefaultYear()));
            $filename = 'analitik-evaluasi-sakip-opd-' . $year . '-' . now()->format('YmdHis') . '.csv';
            $matrix = $this->opdAnalytics->getSakipEvaluationMatrix($year, $filters['organization_id'] ?? null);
            $years = !empty($matrix['years']) ? $matrix['years'] : PlanningPeriod::getAvailableYears();
            $headers = [
                'No', 'Kode OPD', 'Perangkat Daerah',
                'Perencanaan Kinerja (30)', 'Pengukuran Kinerja (30)',
                'Pelaporan Kinerja (15)', 'Evaluasi Internal (25)',
                'Nilai SAKIP (' . $year . ')', 'Predikat (' . $year . ')',
            ];
            foreach ($years as $yr) {
                $headers[] = (string) $yr;
            }
            $headers[] = 'Tren';
            $headers[] = 'Status LHE';
            fputcsv($csv, $headers);
            foreach ($matrix['rows'] as $row) {
                $line = [
                    $row['no'],
                    $row['kode'],
                    $row['perangkat_daerah'],
                    $row['perencanaan'],
                    $row['pengukuran'],
                    $row['pelaporan'],
                    $row['evaluasi_internal'],
                    $row['nilai'],
                    $row['predikat'],
                ];
                foreach ($years as $yr) {
                    $line[] = $row['yearly'][$yr]['nilai'] ?? $row['nilai'];
                }
                $line[] = $row['tren'] ?? '→';
                $line[] = $row['lhe']['status_dokumen'] ?? 'LHE Tersedia';
                fputcsv($csv, $line);
            }
        } elseif ($type === 'pko' || $type === 'pko_opd') {
            $year = (int) ($request->get('year', $this->getDefaultYear()));
            $filename = 'analitik-pko-perangkat-daerah-' . $year . '-' . now()->format('YmdHis') . '.csv';
            $matrix = $this->opdAnalytics->getPkoMatrix($year, $filters['organization_id'] ?? null);
            $years = !empty($matrix['years']) ? $matrix['years'] : PlanningPeriod::getAvailableYears();
            $headers = [
                'No', 'Perangkat Daerah', 'Nilai PKO (' . $year . ')', 'Predikat', 'Peringkat',
            ];
            foreach ($years as $yr) {
                $headers[] = (string) $yr;
            }
            $headers[] = 'Tren';
            fputcsv($csv, $headers);
            $no = 1;
            foreach ($matrix['opd_pko']['rows'] as $row) {
                $line = [
                    $no++,
                    $row['perangkat_daerah'],
                    number_format((float) $row['nilai_pko'], 2, '.', ''),
                    $row['predikat'],
                    $row['peringkat'],
                ];
                foreach ($years as $yr) {
                    $val = $row['yearly'][$yr]['nilai'] ?? null;
                    $line[] = $val !== null ? number_format((float) $val, 2, '.', '') : '-';
                }
                $line[] = $row['tren'] ?? '→';
                fputcsv($csv, $line);
            }
        } elseif ($type === 'pko_pemda') {
            $year = (int) ($request->get('year', $this->getDefaultYear()));
            $filename = 'analitik-pko-pemda-papua-barat-' . $year . '-' . now()->format('YmdHis') . '.csv';
            $matrix = $this->opdAnalytics->getPkoMatrix($year);
            fputcsv($csv, ['Tahun', 'Nilai PKO Pemda', 'Predikat', 'Tren']);
            foreach ($matrix['pemda_pko']['trend'] as $row) {
                fputcsv($csv, [
                    $row['tahun'],
                    $row['nilai'] !== null ? number_format((float) $row['nilai'], 2, '.', '') : '-',
                    $row['predikat'] ?? '-',
                    $row['tren'] ?? '→',
                ]);
            }
        } elseif ($type === 'action_plans' || $type === 'action_plans_opd') {
            $year = (int) ($request->get('year', $this->getDefaultYear()));
            $tw = $request->get('triwulan', 'TW II');
            $filename = 'analitik-rencana-aksi-opd-' . str_replace(' ', '-', strtolower($tw)) . '-' . $year . '-' . now()->format('YmdHis') . '.csv';
            $matrix = $this->opdAnalytics->getActionPlansMatrix($year, $tw, $filters['organization_id'] ?? null);
            fputcsv($csv, [
                'No', 'Kode OPD', 'Perangkat Daerah', 'Target ' . $tw, 'Realisasi ' . $tw, 'Capaian ' . $tw . ' (%)', 'Status', 'Predikat',
                'TW I (%)', 'TW II (%)', 'TW III (%)', 'TW IV (%)', 'Tren', 'Jumlah Rencana Aksi'
            ]);
            foreach ($matrix['opd_rows'] as $row) {
                fputcsv($csv, [
                    $row['no'],
                    $row['kode'],
                    $row['opd'],
                    $row['target_tw'],
                    $row['realisasi_tw'],
                    $row['capaian'] . ($row['is_overachieved'] ? '%*' : '%'),
                    $row['status'],
                    $row['predikat'],
                    $row['quarterly']['TW I']['capaian'] . '%',
                    $row['quarterly']['TW II']['capaian'] . '%',
                    $row['quarterly']['TW III']['capaian'] . '%',
                    $row['quarterly']['TW IV']['capaian'] . '%',
                    $row['tren'],
                    $row['plans_count'],
                ]);
            }
        } elseif ($type === 'action_plans_detail') {
            $year = (int) ($request->get('year', 2026));
            $tw = $request->get('triwulan', 'TW II');
            $filename = 'analitik-rincian-rencana-aksi-' . str_replace(' ', '-', strtolower($tw)) . '-' . $year . '-' . now()->format('YmdHis') . '.csv';
            $matrix = $this->opdAnalytics->getActionPlansMatrix($year, $tw, $filters['organization_id'] ?? null);
            fputcsv($csv, ['No', 'Kode OPD', 'Perangkat Daerah', 'Rencana Aksi Kinerja', 'Target ' . $tw, 'Realisasi ' . $tw, 'Capaian (%)', 'Status', 'Predikat']);
            foreach ($matrix['rows'] as $row) {
                fputcsv($csv, [
                    $row['no'],
                    $row['kode'],
                    $row['perangkat_daerah'],
                    $row['rencana_aksi'],
                    $row['target_tw'],
                    $row['realisasi_tw'],
                    $row['capaian'] . '%',
                    $row['status'],
                    $row['predikat'],
                ]);
            }
        } elseif ($type === 'risk_map') {
            $year = (int) ($request->get('year', 2026));
            $filename = 'analitik-peta-risiko-kinerja-opd-' . $year . '-' . now()->format('YmdHis') . '.csv';
            $matrix = $this->ewsAnalytics->getRiskMap($year);
            fputcsv($csv, ['Peringkat Risiko', 'Kode OPD', 'Perangkat Daerah', 'Skor Risiko (0-100)', 'Level Risiko', 'Rata-rata Capaian (%)', 'Nilai SAKIP', 'Kelengkapan Dokumen (%)', 'Rekomendasi Tindak Lanjut']);
            foreach ($matrix['rows'] as $row) {
                fputcsv($csv, [
                    $row['rank'],
                    $row['kode'],
                    $row['perangkat_daerah'],
                    $row['risk_score'],
                    $row['risk_level'],
                    $row['rata_capaian'] . '%',
                    $row['sakip_nilai'],
                    $row['dokumen_persen'] . '%',
                    implode(' | ', $row['rekomendasi']),
                ]);
            }
        } else {
            // Default: deviasi
            $filename = 'analitik-deviasi-target-realisasi-'.now()->format('YmdHis').'.csv';
            $rows = $this->buildDeviation($filters);
            fputcsv($csv, [
                'No', 'Kode Indikator', 'Indikator Kinerja', 'Kode OPD', 'Perangkat Daerah',
                'Satuan', 'Periode', 'Target', 'Realisasi', 'Deviasi', 'Capaian (%)', 'Status',
            ]);
            foreach ($rows as $i => $row) {
                fputcsv($csv, [
                    $i + 1,
                    $row['indicator_code'],
                    $row['indicator_name'],
                    $row['organization_code'],
                    $row['organization_name'],
                    $row['unit'],
                    $row['period'],
                    $row['target'] ?? '',
                    $row['value'],
                    $row['deviation'] ?? '',
                    $row['achievement'] ?? '',
                    $row['status'],
                ]);
            }
        }

        rewind($csv);
        $content = stream_get_contents($csv);
        fclose($csv);

        Storage::disk('local')->put('analytics/'.$filename, $content);

        $response = response()->streamDownload(function () use ($content) {
            echo $content;
        }, $filename);

        $response->headers->set('Content-Type', 'text/csv; charset=UTF-8');

        return $response;
    }


    /**
     * Export analytics data as PDF using DomPDF.
     */
    public function exportPdf(Request $request): \Illuminate\Http\Response
    {
        $this->authorize('view-dashboard');

        $type    = $request->input('type', 'deviation');
        $filters = $request->only(['indicator_id', 'organization_id']);
        $year    = (int) ($request->get('year', $this->getDefaultYear()));
        $tw      = $request->get('triwulan', 'TW II');
        $filters['year'] = $year;
        $filters['triwulan'] = $tw;
        $generatedAt = now()->timezone('Asia/Jayapura')->format('d/m/Y H:i');

        $view = 'pdf.analytics.deviation';
        $data = ['generatedAt' => $generatedAt, 'year' => $year];
        $filename = 'analitik-' . $type . '-' . $year . '-' . now()->format('YmdHis') . '.pdf';

        if ($type === 'rpjmd') {
            $matrix = $this->rpjmdService->getRpjmdMatrix($year, null, $filters['organization_id'] ?? null);
            $data = array_merge($data, ['rows' => $matrix['rows'] ?? [], 'stats' => $matrix['stats'] ?? [], 'summary' => $matrix['summary'] ?? []]);
            $view = 'pdf.analytics.rpjmd';
            $filename = 'analitik-capaian-rpjmd-' . $year . '-' . now()->format('YmdHis') . '.pdf';
        } elseif ($type === 'trend') {
            $rows = $this->buildTrend($filters);
            $data = array_merge($data, ['rows' => $rows]);
            $view = 'pdf.analytics.trend';
            $filename = 'analitik-tren-capaian-' . $year . '-' . now()->format('YmdHis') . '.pdf';
        } elseif ($type === 'opd_comparison') {
            $rows = $this->buildOpdComparison($filters);
            $data = array_merge($data, ['rows' => $rows]);
            $view = 'pdf.analytics.opd';
            $filename = 'analitik-perbandingan-opd-' . $year . '-' . now()->format('YmdHis') . '.pdf';
        } elseif ($type === 'opd' || $type === 'opd_ranking') {
            $matrix = $this->opdAnalytics->getOpdPerformanceRanking($year, $filters['organization_id'] ?? null);
            $data = array_merge($data, ['rows' => $matrix['rows'] ?? [], 'stats' => $matrix['stats'] ?? []]);
            $view = 'pdf.analytics.opd-ranking';
            $filename = 'analitik-ranking-kinerja-opd-' . $year . '-' . now()->format('YmdHis') . '.pdf';
        } elseif ($type === 'iku' || $type === 'iku_pemda') {
            $matrix = $this->opdAnalytics->getIkuPemdaMatrix($year);
            $data = array_merge($data, ['rows' => $matrix['rows'] ?? [], 'stats' => $matrix['stats'] ?? []]);
            $view = 'pdf.analytics.iku';
            $filename = 'analitik-iku-pemda-' . $year . '-' . now()->format('YmdHis') . '.pdf';
        } elseif ($type === 'sakip_docs_pemda') {
            $docs = $this->buildSakipDocs($filters);
            $data = array_merge($data, ['rows' => $docs['pemda_rows'] ?? []]);
            $view = 'pdf.analytics.sakip-docs-pemda';
            $filename = 'analitik-dokumen-sakip-pemda-' . $year . '-' . now()->format('YmdHis') . '.pdf';
        } elseif ($type === 'sakip_docs_opd') {
            $docs = $this->buildSakipDocs($filters);
            $data = array_merge($data, [
                'rows'    => $docs['opd_rows'] ?? [],
                'columns' => $docs['opd_columns'] ?? [],
            ]);
            $view = 'pdf.analytics.sakip-docs-opd';
            $filename = 'analitik-dokumen-sakip-opd-' . $year . '-' . now()->format('YmdHis') . '.pdf';
        } elseif ($type === 'sakip_pemda') {
            $matrix = $this->opdAnalytics->getSakipPemdaMatrix($year);
            $data = array_merge($data, ['sakip_pemda' => $matrix]);
            $view = 'pdf.analytics.sakip-pemda';
            $filename = 'analitik-evaluasi-sakip-pemda-' . $year . '-' . now()->format('YmdHis') . '.pdf';
        } elseif ($type === 'sakip_eval') {
            $matrix = $this->opdAnalytics->getSakipEvaluationMatrix($year, $filters['organization_id'] ?? null);
            $data = array_merge($data, ['rows' => $matrix['rows'] ?? [], 'stats' => $matrix['stats'] ?? []]);
            $view = 'pdf.analytics.sakip-eval';
            $filename = 'analitik-evaluasi-sakip-opd-' . $year . '-' . now()->format('YmdHis') . '.pdf';
        } elseif ($type === 'pko_pemda') {
            $matrix = $this->opdAnalytics->getPkoMatrix($year);
            $data = array_merge($data, ['pemda_pko' => $matrix['pemda_pko'] ?? []]);
            $view = 'pdf.analytics.pko-pemda';
            $filename = 'analitik-pko-pemda-' . $year . '-' . now()->format('YmdHis') . '.pdf';
        } elseif ($type === 'pko' || $type === 'pko_opd') {
            $matrix = $this->opdAnalytics->getPkoMatrix($year, $filters['organization_id'] ?? null);
            $data = array_merge($data, ['rows' => $matrix['opd_pko']['rows'] ?? [], 'stats' => $matrix['opd_pko']['stats'] ?? []]);
            $view = 'pdf.analytics.pko-opd';
            $filename = 'analitik-pko-perangkat-daerah-' . $year . '-' . now()->format('YmdHis') . '.pdf';
        } elseif ($type === 'action_plans') {
            $matrix = $this->opdAnalytics->getActionPlansMatrix($year, $tw, $filters['organization_id'] ?? null);
            $data = array_merge($data, ['rows' => $matrix['opd_rows'] ?? [], 'tw' => $tw]);
            $view = 'pdf.analytics.action-plans';
            $filename = 'analitik-rencana-aksi-' . str_replace(' ', '-', strtolower($tw)) . '-' . $year . '-' . now()->format('YmdHis') . '.pdf';
        } elseif ($type === 'action_plans_detail') {
            $matrix = $this->opdAnalytics->getActionPlansMatrix($year, $tw, $filters['organization_id'] ?? null);
            $data = array_merge($data, ['rows' => $matrix['rows'] ?? [], 'tw' => $tw]);
            $view = 'pdf.analytics.action-plans-detail';
            $filename = 'analitik-rincian-rencana-aksi-' . str_replace(' ', '-', strtolower($tw)) . '-' . $year . '-' . now()->format('YmdHis') . '.pdf';
        } elseif ($type === 'risk_map') {
            $matrix = $this->ewsAnalytics->getRiskMap($year);
            $data = array_merge($data, ['rows' => $matrix['rows'] ?? []]);
            $view = 'pdf.analytics.risk-map';
            $filename = 'analitik-peta-risiko-' . $year . '-' . now()->format('YmdHis') . '.pdf';
        } else {
            // Default: deviasi
            $rows = $this->buildDeviation($filters);
            $data = array_merge($data, ['rows' => $rows]);
            $view = 'pdf.analytics.deviation';
            $filename = 'analitik-deviasi-' . $year . '-' . now()->format('YmdHis') . '.pdf';
        }

        $pdf = Pdf::loadView($view, $data)
            ->setPaper('a4', 'landscape')
            ->setOptions(['defaultFont' => 'DejaVu Sans', 'isHtml5ParserEnabled' => true, 'isRemoteEnabled' => false]);

        return $pdf->download($filename);
    }

    /**
     * FR-MSR-014: Data completeness monitoring per OPD.
     */
    public function completeness(Request $request): Response
    {
        $this->authorize('view-analytics');

        $periodId = $request->integer('measurement_period_id');
        $period = MeasurementPeriod::find($periodId);

        $organizations = Organization::query()
            ->whereIn('id', $this->authorization->accessibleOrganizationIds($request->user()))
            ->orderBy('code')
            ->get(['id', 'code', 'name']);

        $periods = MeasurementPeriod::query()
            ->orderByDesc('id')
            ->get(['id', 'code', 'name']);

        $completenessData = $organizations->map(function (Organization $org) use ($periodId) {
            $totalTargets = IndicatorTarget::where('organization_id', $org->id)
                ->where('status', 'approved')
                ->when($periodId, fn ($q) => $q->where('measurement_period_id', $periodId))
                ->count();

            $withRealization = Realization::query()
                ->where('organization_id', $org->id)
                ->when($periodId, fn ($q) => $q->where('measurement_period_id', $periodId))
                ->whereIn('status', ['submitted', 'approved'])
                ->count();

            $pct = $totalTargets > 0
                ? round(($withRealization / $totalTargets) * 100, 1)
                : null;

            return [
                'organization_id' => $org->id,
                'organization_code' => $org->code,
                'organization_name' => $org->name,
                'total_targets' => $totalTargets,
                'with_realization' => $withRealization,
                'missing' => max(0, $totalTargets - $withRealization),
                'completeness_pct' => $pct,
            ];
        })->sortBy('completeness_pct')->values();

        return Inertia::render('Analytics/Completeness', [
            'completenessData' => $completenessData,
            'periods' => $periods,
            'selectedPeriod' => $period,
            'filters' => ['measurement_period_id' => $periodId ?: null],
        ]);
    }

    /**
     * FR-MSR-015: Monitoring keterlambatan pengiriman realisasi.
     */
    public function lateSubmissions(Request $request): Response
    {
        $this->authorize('view-analytics');

        $periodId = $request->integer('measurement_period_id');

        $periods = MeasurementPeriod::query()->orderByDesc('id')->get(['id', 'code', 'name', 'submission_deadline', 'status']);

        $latePeriods = MeasurementPeriod::query()
            ->where('status', 'open')
            ->whereNotNull('submission_deadline')
            ->where('submission_deadline', '<', now()->toDateString())
            ->when($periodId, fn ($q) => $q->where('id', $periodId))
            ->get();

        $organizations = Organization::query()
            ->whereIn('id', $this->authorization->accessibleOrganizationIds($request->user()))
            ->get(['id', 'code', 'name']);

        $rows = [];
        foreach ($latePeriods as $period) {
            $submittedOrgIds = Realization::query()
                ->where('measurement_period_id', $period->id)
                ->whereIn('status', ['submitted', 'approved'])
                ->pluck('organization_id')
                ->unique();

            $targetOrgIds = IndicatorTarget::query()
                ->where('measurement_period_id', $period->id)
                ->where('status', 'approved')
                ->pluck('organization_id')
                ->unique();

            $lateOrgIds = $targetOrgIds->diff($submittedOrgIds);
            $daysLate = now()->diffInDays($period->submission_deadline);

            foreach ($lateOrgIds as $orgId) {
                $org = $organizations->firstWhere('id', $orgId);
                if (! $org) {
                    continue;
                }
                $rows[] = [
                    'organization_id' => $orgId,
                    'organization_code' => $org->code,
                    'organization_name' => $org->name,
                    'period_id' => $period->id,
                    'period_name' => $period->name,
                    'submission_deadline' => $period->submission_deadline,
                    'days_late' => (int) $daysLate,
                    'severity' => $daysLate >= 14 ? 'critical' : ($daysLate >= 7 ? 'warning' : 'info'),
                ];
            }
        }

        usort($rows, fn ($a, $b) => $b['days_late'] - $a['days_late']);

        return Inertia::render('Analytics/LateSubmissions', [
            'lateRows' => $rows,
            'periods' => $periods,
            'filters' => ['measurement_period_id' => $periodId ?: null],
            'totalLate' => count($rows),
        ]);
    }
}
