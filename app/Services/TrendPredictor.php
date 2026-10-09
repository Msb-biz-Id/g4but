<?php

namespace App\Services;

use App\Models\Indicator;
use App\Models\IndicatorTarget;
use App\Models\MeasurementPeriod;
use App\Models\Organization;
use App\Models\Realization;

/**
 * Prediction service (FR-AI-013): model numerik tervalidasi (regresi linier), bukan LLM.
 * Kelayakan: minimal N titik historis (default 4) dengan data realisasi tervalidasi.
 */
class TrendPredictor
{
    public function __construct(
        private readonly AchievementCalculator $calculator,
        private readonly AuthorizationService $authorization,
    ) {}

    /**
     * Prediksi nilai periode berikutnya untuk satu indikator (+ organisasi).
     *
     * @return array<string, mixed>
     */
    public function predict(int $indicatorId, ?int $organizationId = null, int $periodsAhead = 1, int $minPoints = 4): array
    {
        $indicator = Indicator::query()->with('measurementUnit:id,code,name,symbol')->findOrFail($indicatorId);

        $orgId = $organizationId ?? $this->resolveDefaultOrg($indicatorId);
        $organization = $orgId ? Organization::query()->find($orgId) : null;

        $points = $this->historicalPoints($indicatorId, $orgId);

        $result = [
            'indicator' => [
                'id' => $indicator->id,
                'code' => $indicator->code,
                'name' => $indicator->name,
                'is_iku' => (bool) $indicator->is_iku,
                'direction' => $indicator->direction,
                'unit' => $indicator->measurementUnit?->symbol,
            ],
            'organization' => $organization ? ['id' => $organization->id, 'code' => $organization->code, 'name' => $organization->name] : null,
            'periods_ahead' => $periodsAhead,
            'min_points' => $minPoints,
            'feasible' => count($points) >= $minPoints,
            'reason' => null,
            'points' => $points,
            'n' => count($points),
            'slope' => null,
            'intercept' => null,
            'r2' => null,
            'forecast' => null,
            'projected_achievement' => null,
            'status' => 'no_data',
            'target' => null,
        ];

        if (! $result['feasible']) {
            $result['reason'] = 'Data historis tidak memadai (butuh minimal '.$minPoints.' titik realisasi tervalidasi, tersedia '.count($points).').';

            return $result;
        }

        $fit = $this->linearRegression($points);

        $result['slope'] = round($fit['slope'], 4);
        $result['intercept'] = round($fit['intercept'], 4);
        $result['r2'] = $fit['r2'] !== null ? round($fit['r2'], 4) : null;
        $result['forecast'] = round($fit['forecast'], 2);

        $target = $this->latestTarget($indicatorId, $orgId);
        $result['target'] = $target?->target_value;

        if ($target !== null) {
            $achievement = $this->calculator->calculate(
                $result['forecast'],
                (float) $target->target_value,
                $indicator->direction,
            );
            $result['projected_achievement'] = $achievement;
            $result['status'] = $this->calculator->categorize($achievement);
        }

        return $result;
    }

    /**
     * Fit regresi linier y = a + b*x pada titik berurutan x = 1..n.
     *
     * @param  list<array{x: int, y: float}>  $points
     * @return array{slope: float, intercept: float, r2: float|null, forecast: float}
     */
    private function linearRegression(array $points): array
    {
        $n = count($points);
        $sumX = $sumY = $sumX2 = $sumXY = 0.0;

        foreach ($points as $point) {
            $sumX += $point['x'];
            $sumY += $point['y'];
            $sumX2 += $point['x'] * $point['x'];
            $sumXY += $point['x'] * $point['y'];
        }

        $denominator = $n * $sumX2 - $sumX * $sumX;
        $slope = $denominator != 0 ? ($n * $sumXY - $sumX * $sumY) / $denominator : 0.0;
        $intercept = ($sumY - $slope * $sumX) / $n;

        $r2 = null;
        $yMean = $sumY / $n;
        $ssTot = $ssRes = 0.0;

        foreach ($points as $point) {
            $predicted = $intercept + $slope * $point['x'];
            $ssTot += ($point['y'] - $yMean) ** 2;
            $ssRes += ($point['y'] - $predicted) ** 2;
        }

        if ($ssTot > 0) {
            $r2 = 1 - $ssRes / $ssTot;
        }

        $nextX = $n + 1;

        return [
            'slope' => $slope,
            'intercept' => $intercept,
            'r2' => $r2,
            'forecast' => $intercept + $slope * $nextX,
        ];
    }

    /**
     * Ambil realisasi tervalidasi berurutan per periode pengukuran untuk indikator+org.
     *
     * @return list<array{x: int, y: float, period_id: int, period_code: string, period_name: string}>
     */
    private function historicalPoints(int $indicatorId, ?int $orgId): array
    {
        $periods = MeasurementPeriod::query()->orderBy('start_date')->get(['id', 'code', 'name', 'start_date']);

        $realizations = Realization::query()
            ->with('indicatorVersion:id,direction')
            ->where('status', 'approved')
            ->whereHas('indicatorVersion', fn ($q) => $q->where('indicator_id', $indicatorId))
            ->when($orgId, fn ($q) => $q->where('organization_id', $orgId))
            ->get();

        $targets = IndicatorTarget::query()
            ->with('indicatorVersion:id,direction')
            ->where('status', 'approved')
            ->whereHas('indicatorVersion', fn ($q) => $q->where('indicator_id', $indicatorId))
            ->when($orgId, fn ($q) => $q->where('organization_id', $orgId))
            ->get()
            ->keyBy(fn ($t) => $t->indicator_version_id.'|'.$t->organization_id);

        $points = [];
        $x = 0;

        foreach ($periods as $period) {
            $byPeriod = $realizations
                ->where('measurement_period_id', $period->id)
                ->values();

            if ($byPeriod->isEmpty()) {
                continue;
            }

            $values = $byPeriod->map(function (Realization $realization) use ($targets) {
                $target = $targets->get($realization->indicator_version_id.'|'.$realization->organization_id);

                return $this->calculator->calculate(
                    $realization->value,
                    $target?->target_value,
                    $realization->indicatorVersion->direction,
                );
            })->filter(fn ($value) => $value !== null);

            if ($values->isEmpty()) {
                continue;
            }

            $x++;

            $points[] = [
                'x' => $x,
                'y' => round((float) $values->avg(), 2),
                'period_id' => $period->id,
                'period_code' => $period->code,
                'period_name' => $period->name,
            ];
        }

        return $points;
    }

    private function resolveDefaultOrg(int $indicatorId): ?int
    {
        return Realization::query()
            ->whereHas('indicatorVersion', fn ($q) => $q->where('indicator_id', $indicatorId))
            ->where('status', 'approved')
            ->orderByDesc('id')
            ->value('organization_id');
    }

    private function latestTarget(int $indicatorId, ?int $orgId): ?IndicatorTarget
    {
        return IndicatorTarget::query()
            ->whereHas('indicatorVersion', fn ($q) => $q->where('indicator_id', $indicatorId))
            ->when($orgId, fn ($q) => $q->where('organization_id', $orgId))
            ->orderByDesc('planning_period_id')
            ->first();
    }

    /**
     * Daftar prediksi ringkas untuk setiap indikator aktif pada organisasi yang dapat diakses (Optimized: Batch Queries).
     *
     * @return list<array<string, mixed>>
     */
    public function dashboard(?int $indicatorId = null): array
    {
        $organizationIds = $this->authorization->accessibleOrganizationIds(request()->user());

        $indicators = Indicator::query()
            ->where('status', 'active')
            ->when($indicatorId, fn ($q) => $q->where('id', $indicatorId))
            ->with('measurementUnit:id,code,name,symbol')
            ->orderBy('code')
            ->limit(100)
            ->get(['id', 'code', 'name', 'is_iku', 'direction', 'measurement_unit_id']);

        if ($indicators->isEmpty()) {
            return [];
        }

        $indIds = $indicators->pluck('id');
        $versions = \App\Models\IndicatorVersion::whereIn('indicator_id', $indIds)->get(['id', 'indicator_id', 'direction']);
        $versionMap = $versions->keyBy('id');
        $versionsByInd = $versions->groupBy('indicator_id');
        $allVersionIds = $versions->pluck('id');

        $periods = MeasurementPeriod::query()->orderBy('start_date')->get(['id', 'code', 'name', 'start_date']);

        $realizations = Realization::query()
            ->whereIn('indicator_version_id', $allVersionIds)
            ->where('status', 'approved')
            ->orderByDesc('id')
            ->get(['id', 'indicator_version_id', 'organization_id', 'measurement_period_id', 'value']);

        $targets = IndicatorTarget::query()
            ->whereIn('indicator_version_id', $allVersionIds)
            ->where('status', 'approved')
            ->orderByDesc('planning_period_id')
            ->get(['id', 'indicator_version_id', 'organization_id', 'planning_period_id', 'target_value']);

        $targetsByKey = $targets->keyBy(fn ($t) => $t->indicator_version_id.'|'.$t->organization_id);

        $orgIds = $realizations->pluck('organization_id')->unique()->filter();
        $organizations = Organization::whereIn('id', $orgIds)->get(['id', 'code', 'name'])->keyBy('id');

        $results = [];

        foreach ($indicators as $indicator) {
            $indVers = $versionsByInd->get($indicator->id, collect());
            $vIds = $indVers->pluck('id');

            // Default org
            $indReals = $realizations->whereIn('indicator_version_id', $vIds);
            $orgId = $indReals->first()?->organization_id;
            $organization = $orgId ? $organizations->get($orgId) : null;

            // Historical points
            $points = [];
            $x = 0;
            foreach ($periods as $period) {
                $byPeriod = $indReals->where('measurement_period_id', $period->id);
                if ($byPeriod->isEmpty()) {
                    continue;
                }

                $values = $byPeriod->map(function ($realization) use ($targetsByKey, $versionMap) {
                    $target = $targetsByKey->get($realization->indicator_version_id.'|'.$realization->organization_id);
                    $direction = $versionMap->get($realization->indicator_version_id)?->direction ?? 'maximize';

                    return $this->calculator->calculate(
                        $realization->value,
                        $target?->target_value,
                        $direction,
                    );
                })->filter(fn ($value) => $value !== null);

                if ($values->isEmpty()) {
                    continue;
                }

                $x++;
                $points[] = [
                    'x' => $x,
                    'y' => round((float) $values->avg(), 2),
                    'period_id' => $period->id,
                    'period_code' => $period->code,
                    'period_name' => $period->name,
                ];
            }

            $minPoints = 4;
            $periodsAhead = 1;
            $result = [
                'indicator' => [
                    'id' => $indicator->id,
                    'code' => $indicator->code,
                    'name' => $indicator->name,
                    'is_iku' => (bool) $indicator->is_iku,
                    'direction' => $indicator->direction,
                    'unit' => $indicator->measurementUnit?->symbol,
                ],
                'organization' => $organization ? ['id' => $organization->id, 'code' => $organization->code, 'name' => $organization->name] : null,
                'periods_ahead' => $periodsAhead,
                'min_points' => $minPoints,
                'feasible' => count($points) >= $minPoints,
                'reason' => null,
                'points' => $points,
                'n' => count($points),
                'slope' => null,
                'intercept' => null,
                'r2' => null,
                'forecast' => null,
                'projected_achievement' => null,
                'status' => 'no_data',
                'target' => null,
            ];

            if (! $result['feasible']) {
                $result['reason'] = 'Data historis tidak memadai (butuh minimal '.$minPoints.' titik realisasi tervalidasi, tersedia '.count($points).').';
                $results[] = $result;
                continue;
            }

            $fit = $this->linearRegression($points);
            $result['slope'] = round($fit['slope'], 4);
            $result['intercept'] = round($fit['intercept'], 4);
            $result['r2'] = $fit['r2'] !== null ? round($fit['r2'], 4) : null;
            $result['forecast'] = round($fit['forecast'], 2);

            $target = $targets->whereIn('indicator_version_id', $vIds)
                ->when($orgId, fn ($q) => $q->where('organization_id', $orgId))
                ->first();
            $result['target'] = $target?->target_value;

            if ($target !== null) {
                $achievement = $this->calculator->calculate(
                    $result['forecast'],
                    (float) $target->target_value,
                    $indicator->direction,
                );
                $result['projected_achievement'] = $achievement;
                $result['status'] = $this->calculator->categorize($achievement);
            }

            $results[] = $result;
        }

        return $results;
    }
}
