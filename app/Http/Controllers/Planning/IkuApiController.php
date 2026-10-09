<?php

namespace App\Http\Controllers\Planning;

use App\Http\Controllers\Controller;
use App\Models\PlanningPeriod;
use App\Models\StrategicGoal;
use App\Models\StrategicObjective;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * API endpoints untuk cascaded dropdown di form IKU.
 * Digunakan oleh frontend React untuk filter berjenjang:
 *   Periode → Level → OPD → Tujuan → Sasaran
 */
class IkuApiController extends Controller
{
    /**
     * GET /api/iku/goals
     * Param: period_id (required), level, org_id
     *
     * Mengembalikan daftar Tujuan (StrategicGoal) yang sesuai konteks.
     */
    public function goals(Request $request): JsonResponse
    {
        $request->validate([
            'period_id' => ['required', 'integer', 'exists:planning_periods,id'],
            'level' => ['nullable', 'string'],
            'org_id' => ['nullable', 'integer'],
        ]);

        $periodId = $request->integer('period_id');
        $periodIds = [$periodId];

        // Jika periode adalah tahunan (start_year == end_year), sertakan juga periode RPJMD yang mencakup tahun tersebut
        $period = PlanningPeriod::find($periodId);
        if ($period) {
            $targetYear = (int) ($period->start_year ?? $period->year);
            $parentPeriodIds = PlanningPeriod::whereYear('start_date', '<=', $targetYear)
                ->whereYear('end_date', '>=', $targetYear)
                ->where('id', '!=', $periodId)
                ->pluck('id')
                ->toArray();
            $periodIds = array_unique(array_merge($periodIds, $parentPeriodIds));
        }

        $goals = StrategicGoal::query()
            ->whereIn('planning_period_id', $periodIds)
            ->when(
                $request->filled('org_id') && $request->input('level') === 'perangkat_daerah',
                fn ($q) => $q->where(function ($sub) use ($request) {
                    $sub->where('organization_id', $request->integer('org_id'))
                        ->orWhere('organization_id', 1); // Tujuan RPJMD Pemerintah Provinsi yang diacu oleh OPD
                })
            )
            ->orderBy('name')
            ->get(['id', 'name', 'code']);

        return response()->json(['data' => $goals]);
    }

    /**
     * GET /api/iku/objectives
     * Param: goal_id (required)
     *
     * Mengembalikan daftar Sasaran (StrategicObjective) di bawah Tujuan terpilih.
     */
    public function objectives(Request $request): JsonResponse
    {
        $request->validate([
            'goal_id' => ['required', 'integer', 'exists:strategic_goals,id'],
        ]);

        $objectives = StrategicObjective::query()
            ->where('strategic_goal_id', $request->integer('goal_id'))
            ->orderBy('name')
            ->get(['id', 'name', 'code']);

        return response()->json(['data' => $objectives]);
    }

    /**
     * GET /api/iku/period-years
     * Param: period_id (required)
     *
     * Mengembalikan array tahun dalam periode untuk Step 3 (Target).
     * Contoh: period 2025-2029 → [2025, 2026, 2027, 2028, 2029]
     */
    public function periodYears(Request $request): JsonResponse
    {
        $request->validate([
            'period_id' => ['required', 'integer', 'exists:planning_periods,id'],
        ]);

        $period = PlanningPeriod::findOrFail($request->integer('period_id'));

        // Coba ambil start_year / end_year, atau year jika kolom berbeda
        $startYear = $period->start_year ?? $period->year ?? null;
        $endYear = $period->end_year ?? $period->year ?? null;

        if (! $startYear || ! $endYear) {
            return response()->json(['data' => []]);
        }

        $years = range((int) $startYear, (int) $endYear);

        return response()->json(['data' => $years]);
    }
}
