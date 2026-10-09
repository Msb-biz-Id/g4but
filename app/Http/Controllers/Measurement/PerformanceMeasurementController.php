<?php

namespace App\Http\Controllers\Measurement;

use App\Http\Controllers\Controller;
use App\Models\IkuRealization;
use App\Models\MonitoringActionPlanBudget;
use App\Models\MonitoringActionPlanOutput;
use App\Models\Organization;
use App\Models\PlanningPeriod;
use App\Models\RealizationIkuItem;
use App\Models\RealizationOpdItem;
use App\Models\RealizationRpjmdItem;
use App\Models\User;
use App\Services\AuthorizationService;
use App\Services\PerformanceMeasurementService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class PerformanceMeasurementController extends Controller
{
    private const DEFAULT_YEARS = [2025, 2026, 2027, 2028, 2029, 2030];

    /**
     * Dapatkan rentang tahun dinamis untuk Realisasi RPJMD, IKU, dan OPD.
     * Membaca dari data periode perencanaan bertipe 'rpjmd' (atau mengandung nama/kode RPJMD) yang aktif.
     *
     * @param int|null $periodId
     * @param PlanningPeriod|null &$selectedPeriod
     * @return int[]
     */
    private function getRpjmdYears(?int $periodId = null, ?PlanningPeriod &$selectedPeriod = null): array
    {
        if ($periodId) {
            $selectedPeriod = PlanningPeriod::find($periodId);
        } else {
            // 1. Cari periode RPJMD aktif
            $selectedPeriod = PlanningPeriod::where('status', 'active')
                ->where(function ($q) {
                    $q->where('type', 'rpjmd')
                      ->orWhere('name', 'like', '%RPJMD%')
                      ->orWhere('code', 'like', '%RPJMD%');
                })
                ->orderByDesc('id')
                ->first();

            // 2. Jika tidak ada RPJMD aktif, cari RPJMD terbaru apapun statusnya
            if (!$selectedPeriod) {
                $selectedPeriod = PlanningPeriod::where(function ($q) {
                        $q->where('type', 'rpjmd')
                          ->orWhere('name', 'like', '%RPJMD%')
                          ->orWhere('code', 'like', '%RPJMD%');
                    })
                    ->orderByDesc('id')
                    ->first();
            }

            // 3. Fallback ke periode perencanaan multi-tahun aktif lainnya (database-agnostic)
            if (!$selectedPeriod) {
                $selectedPeriod = PlanningPeriod::where('status', 'active')
                    ->orderByDesc('id')
                    ->get()
                    ->first(function ($p) {
                        return ($p->end_year - $p->start_year) >= 2;
                    });
            }
        }

        if ($selectedPeriod) {
            $startY = $selectedPeriod->start_year;
            $endY = $selectedPeriod->end_year;

            if ($startY > 0 && $endY >= $startY && ($endY - $startY) <= 20) {
                return range($startY, $endY);
            }
        }

        $available = PlanningPeriod::getAvailableYears();
        return !empty($available) ? $available : self::DEFAULT_YEARS;
    }

    /**
     * Daftar periode RPJMD yang tersedia di sistem untuk dipilih oleh pengguna.
     */
    private function getAvailableRpjmdPeriods()
    {
        return PlanningPeriod::where('type', 'rpjmd')
            ->orWhere('name', 'like', '%RPJMD%')
            ->orWhere('code', 'like', '%RPJMD%')
            ->orderByDesc('year')
            ->get(['id', 'code', 'name', 'start_date', 'end_date', 'status']);
    }

    public function __construct(
        private readonly AuthorizationService $authorization,
    ) {}

    /**
     * Parse and normalize integer ID from request input which might be integer, string, or array (e.g. from qs serializer).
     */
    private function parseIntegerInput(Request $request, string $key, ?int $default = null): ?int
    {
        $raw = $request->input($key);
        if (is_array($raw)) {
            $raw = $raw[0] ?? $raw['value'] ?? ($raw['target']['value'] ?? null);
        }
        if ($raw === null || $raw === '') {
            return $default;
        }
        return is_numeric($raw) ? (int) $raw : $default;
    }

    private function getActiveYear(): int
    {
        $rpjmdYears = $this->getRpjmdYears();
        $currentCalYear = (int) date('Y');

        if (in_array($currentCalYear, $rpjmdYears, true)) {
            return $currentCalYear;
        }

        $activeAnnualYear = PlanningPeriod::where('status', 'active')->where('type', '!=', 'rpjmd')->value('year');
        if ($activeAnnualYear && in_array((int) $activeAnnualYear, $rpjmdYears, true)) {
            return (int) $activeAnnualYear;
        }

        return $rpjmdYears[0] ?? $currentCalYear;
    }

    /**
     * Cek apakah user adalah Provincial-level Administrator (Super Admin / Admin Provinsi / Evaluator).
     */
    private function isProvincialAdmin(User $user): bool
    {
        return $user->hasRole('Super Admin')
            || $user->hasRole('Admin Provinsi')
            || $user->hasRole('Evaluator Provinsi');
    }

    /**
     * Cek apakah user adalah Bappeda (Organisasi Bappeda atau Role Bappeda).
     */
    private function isBappedaUser(User $user): bool
    {
        if ($user->hasRole('Bappeda') || $user->hasRole('Admin Bappeda') || $user->hasRole('Operator Bappeda')
            || $user->hasRole('Badan Perencanaan') || $user->hasRole('SP Bappeda')) {
            return true;
        }

        $org = $user->organization;
        if ($org) {
            $orgNameLower = strtolower($org->name ?? '');
            $orgCodeUpper = strtoupper($org->code ?? '');
            $isBappeda = $org->is_bappeda
                || strtolower($org->type ?? '') === 'bappeda'
                || str_contains($orgNameLower, 'bappeda')
                || str_contains($orgNameLower, 'bapppeda')
                || str_contains($orgNameLower, 'bappedalitbang')
                || str_contains($orgNameLower, 'badan perencanaan')
                || str_contains($orgCodeUpper, 'BAPPEDA')
                || str_contains($orgCodeUpper, 'BAPPPEDA')
                || str_contains($orgCodeUpper, 'BAPPEDALITBANG');
            if ($isBappeda) {
                return true;
            }
        }

        return $user->organizations()->where(function ($q) {
            $q->where('is_bappeda', true)
              ->orWhere('type', 'bappeda')
              ->orWhere('code', 'like', '%BAPPEDA%')
              ->orWhere('name', 'like', '%Bappeda%')
              ->orWhere('name', 'like', '%Badan Perencanaan%');
        })->exists();
    }

    /**
     * Cek apakah user adalah SP / Bappeda (Super Admin / Admin Provinsi / Evaluator / Bappeda)
     * yang berwenang mengampu RPJMD dan IKU PEMDA (Modul 4.1 & 4.2).
     */
    private function isSpBappeda(User $user): bool
    {
        return $this->isProvincialAdmin($user) || $this->isBappedaUser($user);
    }

    /**
     * Pastikan user berhak mengelola (mutate) data OPD tertentu (4.3, 4.4, 4.5).
     * Super Admin & Admin Provinsi memiliki hak akses kelola lintas OPD.
     * User OPD (termasuk Bappeda) hanya berhak mengelola data unit kerjanya sendiri.
     */
    private function checkOpdAccess(User $user, int $organizationId): void
    {
        if ($this->isProvincialAdmin($user)) {
            return;
        }

        $accessibleOrgIds = $this->authorization->accessibleOrganizationIds($user);
        if (!in_array($organizationId, $accessibleOrgIds, true)) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengelola data Perangkat Daerah ini.');
        }
    }

    /**
     * Pastikan user berhak melihat/export data OPD tertentu.
     */
    private function checkOpdViewAccess(User $user, int $organizationId): void
    {
        if ($this->isSpBappeda($user)) {
            return;
        }

        $accessibleOrgIds = $this->authorization->accessibleOrganizationIds($user);
        if (!in_array($organizationId, $accessibleOrgIds, true)) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat data Perangkat Daerah ini.');
        }
    }

    // =========================================================================
    // 4.1 REALISASI KINERJA (RPJMD) - PENGAMPU: SP / BAPPEDA
    // =========================================================================

    public function rpjmdIndex(Request $request): Response
    {
        $user = $request->user();
        $canManage = $this->isSpBappeda($user);
        $periodId = $this->parseIntegerInput($request, 'period_id');
        $selectedPeriod = null;
        $years = $this->getRpjmdYears($periodId, $selectedPeriod);

        // Fetch Goals with their Children
        $goals = RealizationRpjmdItem::goals()
            ->with(['children.creator:id,name', 'creator:id,name'])
            ->orderBy('id')
            ->get()
            ->map(function (RealizationRpjmdItem $goal) use ($years) {
                $goal->setAttribute('calculations', $this->buildCalculations($goal, $years));
                $goal->setAttribute('goal_indicators_list', $this->enrichIndicators($goal->goal_indicators_list, $years));
                $goal->children->each(function (RealizationRpjmdItem $child) use ($years) {
                    $child->setAttribute('calculations', $this->buildCalculations($child, $years));
                    $child->setAttribute('objective_indicators_list', $this->enrichIndicators($child->objective_indicators_list, $years));
                });
                return $goal;
            });

        // Also fetch all items (goals + objectives) for backwards compatibility
        $items = RealizationRpjmdItem::query()
            ->with('creator:id,name')
            ->orderBy('id')
            ->get()
            ->map(function (RealizationRpjmdItem $item) use ($years) {
                $item->setAttribute('calculations', $this->buildCalculations($item, $years));
                if ($item->level === 'goal') {
                    $item->setAttribute('goal_indicators_list', $this->enrichIndicators($item->goal_indicators_list, $years));
                } else {
                    $item->setAttribute('objective_indicators_list', $this->enrichIndicators($item->objective_indicators_list, $years));
                }
                return $item;
            });

        return Inertia::render('Measurement/RealizationRpjmd', [
            'goals' => $goals,
            'items' => $items,
            'years' => $years,
            'activeRpjmdPeriod' => $selectedPeriod,
            'availableRpjmdPeriods' => $this->getAvailableRpjmdPeriods(),
            'activeYear' => $this->getActiveYear(),
            'canManage' => $canManage,
            'userIsSpBappeda' => $this->isSpBappeda($user),
        ]);
    }

    public function rpjmdStore(Request $request): RedirectResponse
    {
        if (!$this->isSpBappeda($request->user())) {
            abort(403, 'Hanya SP / Bappeda yang memiliki kewenangan menginput Realisasi RPJMD.');
        }

        $validated = $request->validate([
            'mode' => 'nullable|string|in:both,objective,goal',
            'parent_id' => 'nullable|exists:realization_rpjmd_items,id',
            'mission' => 'nullable|string',
            'goal' => 'nullable|string',
            'goal_indicator' => 'nullable|string',
            'goal_indicator_unit' => 'nullable|string|max:100',
            'goal_measurement_pattern' => 'nullable|in:Positif,Negatif',
            'goal_targets' => 'nullable|array',
            'goal_realizations' => 'nullable|array',
            'goal_indicators' => 'nullable|array',
            'objective' => 'nullable|string',
            'objective_indicator' => 'nullable|string',
            'unit' => 'nullable|string|max:100',
            'measurement_pattern' => 'nullable|in:Positif,Negatif',
            'targets' => 'nullable|array',
            'realizations' => 'nullable|array',
            'indicators' => 'nullable|array',
            'objectives' => 'nullable|array',
            'objectives.*.objective' => 'nullable|string',
            'objectives.*.objective_indicator' => 'nullable|string',
            'objectives.*.unit' => 'nullable|string|max:100',
            'objectives.*.measurement_pattern' => 'nullable|in:Positif,Negatif',
            'objectives.*.targets' => 'nullable|array',
            'objectives.*.realizations' => 'nullable|array',
            'objectives.*.indicators' => 'nullable|array',
            'objectives.*.order_no' => 'nullable|integer',
            'goals' => 'nullable|array',
            'goals.*.goal' => 'nullable|string',
            'goals.*.goal_indicators' => 'nullable|array',
            'goals.*.objectives' => 'nullable|array',
        ]);

        $userId = $request->user()->id;
        $mode = $validated['mode'] ?? (!empty($validated['objectives']) ? 'both' : (!empty($validated['parent_id']) ? 'objective' : 'both'));

        // Helper to format indicators array
        $formatIndicators = function (?array $raw, string $fallbackName, string $fallbackUnit = '%', string $fallbackPattern = 'Positif', array $fallbackTargets = [], array $fallbackRealizations = []): array {
            $formatted = [];
            if (!empty($raw) && is_array($raw)) {
                foreach ($raw as $idx => $item) {
                    if (empty($item['indicator'])) continue;
                    $formatted[] = [
                        'id'                  => $item['id'] ?? ($idx + 1),
                        'indicator'           => (string) $item['indicator'],
                        'unit'                => (string) ($item['unit'] ?? '%'),
                        'measurement_pattern' => in_array($item['measurement_pattern'] ?? '', ['Positif', 'Negatif']) ? $item['measurement_pattern'] : 'Positif',
                        'targets'             => (array) ($item['targets'] ?? []),
                        'realizations'        => (array) ($item['realizations'] ?? []),
                    ];
                }
            }
            if (empty($formatted) && !empty($fallbackName)) {
                $formatted[] = [
                    'id'                  => 1,
                    'indicator'           => $fallbackName,
                    'unit'                => $fallbackUnit,
                    'measurement_pattern' => in_array($fallbackPattern, ['Positif', 'Negatif']) ? $fallbackPattern : 'Positif',
                    'targets'             => $fallbackTargets,
                    'realizations'        => $fallbackRealizations,
                ];
            }
            return $formatted;
        };

        if ($mode === 'objective' && !empty($validated['parent_id'])) {
            // Mode: Tambah sub-sasaran langsung di bawah Tujuan yang sudah ada
            $parentGoal = RealizationRpjmdItem::findOrFail($validated['parent_id']);
            if (!empty($validated['objectives']) && is_array($validated['objectives'])) {
                $maxOrder = (int) RealizationRpjmdItem::where('parent_id', $parentGoal->id)->max('order_no');
                foreach ($validated['objectives'] as $objData) {
                    if (empty($objData['objective']) && empty($objData['objective_indicator']) && empty($objData['indicators'])) {
                        continue;
                    }
                    $maxOrder++;
                    $inds = $formatIndicators(
                        $objData['indicators'] ?? null,
                        $objData['objective_indicator'] ?? '-',
                        $objData['unit'] ?? '%',
                        $objData['measurement_pattern'] ?? 'Positif',
                        $objData['targets'] ?? [],
                        $objData['realizations'] ?? []
                    );
                    $firstInd = $inds[0] ?? [
                        'indicator' => $objData['objective_indicator'] ?? '-',
                        'unit' => '%',
                        'measurement_pattern' => 'Positif',
                        'targets' => [],
                        'realizations' => [],
                    ];

                    RealizationRpjmdItem::create([
                        'parent_id'           => $parentGoal->id,
                        'level'               => 'objective',
                        'order_no'            => $objData['order_no'] ?? $maxOrder,
                        'mission'             => $parentGoal->mission,
                        'goal'                => $parentGoal->goal,
                        'goal_indicator'      => $parentGoal->goal_indicator,
                        'goal_indicator_unit' => $parentGoal->goal_indicator_unit,
                        'objective'           => $objData['objective'] ?? '-',
                        'objective_indicator' => $firstInd['indicator'],
                        'unit'                => $firstInd['unit'],
                        'measurement_pattern' => $firstInd['measurement_pattern'],
                        'targets'             => $firstInd['targets'],
                        'realizations'        => $firstInd['realizations'],
                        'indicators'          => $inds,
                        'created_by'          => $userId,
                    ]);
                }
            } else {
                $nextOrder = (int) RealizationRpjmdItem::where('parent_id', $parentGoal->id)->max('order_no') + 1;
                $inds = $formatIndicators(
                    $validated['indicators'] ?? null,
                    $validated['objective_indicator'] ?? '-',
                    $validated['unit'] ?? '%',
                    $validated['measurement_pattern'] ?? 'Positif',
                    $validated['targets'] ?? [],
                    $validated['realizations'] ?? []
                );
                $firstInd = $inds[0] ?? [
                    'indicator' => $validated['objective_indicator'] ?? '-',
                    'unit' => '%',
                    'measurement_pattern' => 'Positif',
                    'targets' => [],
                    'realizations' => [],
                ];

                RealizationRpjmdItem::create([
                    'parent_id'           => $parentGoal->id,
                    'level'               => 'objective',
                    'order_no'            => $nextOrder,
                    'mission'             => $parentGoal->mission,
                    'goal'                => $parentGoal->goal,
                    'goal_indicator'      => $parentGoal->goal_indicator,
                    'goal_indicator_unit' => $parentGoal->goal_indicator_unit,
                    'objective'           => $validated['objective'] ?? '-',
                    'objective_indicator' => $firstInd['indicator'],
                    'unit'                => $firstInd['unit'],
                    'measurement_pattern' => $firstInd['measurement_pattern'],
                    'targets'             => $firstInd['targets'],
                    'realizations'        => $firstInd['realizations'],
                    'indicators'          => $inds,
                    'created_by'          => $userId,
                ]);
            }
        } elseif (!empty($validated['goals']) && is_array($validated['goals'])) {
            // Mode: Buat Banyak Tujuan (+ Masing-masing Sub-Sasaran) di bawah Misi
            foreach ($validated['goals'] as $gData) {
                if (empty($gData['goal']) && empty($gData['goal_indicators'])) {
                    continue;
                }
                $goalInds = $formatIndicators(
                    $gData['goal_indicators'] ?? null,
                    $gData['goal'] ?? 'Indikator Tujuan',
                    '%',
                    'Positif'
                );
                $firstGoalInd = $goalInds[0] ?? [
                    'indicator' => $gData['goal'] ?? 'Indikator Tujuan',
                    'unit' => '%',
                    'measurement_pattern' => 'Positif',
                    'targets' => [],
                    'realizations' => [],
                ];

                $goalItem = RealizationRpjmdItem::create([
                    'parent_id'                => null,
                    'level'                    => 'goal',
                    'order_no'                 => 0,
                    'mission'                  => $validated['mission'] ?? 'Misi RPJMD',
                    'goal'                     => $gData['goal'] ?? 'Tujuan RPJMD',
                    'goal_indicator'           => $firstGoalInd['indicator'],
                    'goal_indicator_unit'      => $firstGoalInd['unit'],
                    'goal_measurement_pattern' => $firstGoalInd['measurement_pattern'],
                    'goal_targets'             => $firstGoalInd['targets'],
                    'goal_realizations'        => $firstGoalInd['realizations'],
                    'targets'                  => $firstGoalInd['targets'],
                    'realizations'             => $firstGoalInd['realizations'],
                    'measurement_pattern'      => $firstGoalInd['measurement_pattern'],
                    'goal_indicators'          => $goalInds,
                    'created_by'               => $userId,
                ]);

                if (!empty($gData['objectives']) && is_array($gData['objectives'])) {
                    $order = 1;
                    foreach ($gData['objectives'] as $objData) {
                        if (empty($objData['objective']) && empty($objData['indicators'])) {
                            continue;
                        }
                        $inds = $formatIndicators(
                            $objData['indicators'] ?? null,
                            $objData['objective'] ?? '-',
                            '%',
                            'Positif'
                        );
                        $firstInd = $inds[0] ?? [
                            'indicator' => $objData['objective'] ?? '-',
                            'unit' => '%',
                            'measurement_pattern' => 'Positif',
                            'targets' => [],
                            'realizations' => [],
                        ];

                        RealizationRpjmdItem::create([
                            'parent_id'           => $goalItem->id,
                            'level'               => 'objective',
                            'order_no'            => $objData['order_no'] ?? $order++,
                            'mission'             => $goalItem->mission,
                            'goal'                => $goalItem->goal,
                            'goal_indicator'      => $goalItem->goal_indicator,
                            'goal_indicator_unit' => $goalItem->goal_indicator_unit,
                            'objective'           => $objData['objective'] ?? '-',
                            'objective_indicator' => $firstInd['indicator'],
                            'unit'                => $firstInd['unit'],
                            'measurement_pattern' => $firstInd['measurement_pattern'],
                            'targets'             => $firstInd['targets'],
                            'realizations'        => $firstInd['realizations'],
                            'indicators'          => $inds,
                            'created_by'          => $userId,
                        ]);
                    }
                }
            }
        } elseif (!empty($validated['objectives']) && is_array($validated['objectives'])) {
            // Mode: Buat Tujuan + Banyak Sub-Sasaran
            $goalInds = $formatIndicators(
                $validated['goal_indicators'] ?? null,
                $validated['goal_indicator'] ?? $validated['goal'] ?? 'Indikator Tujuan',
                $validated['goal_indicator_unit'] ?? '%',
                $validated['goal_measurement_pattern'] ?? 'Positif',
                $validated['goal_targets'] ?? [],
                $validated['goal_realizations'] ?? []
            );
            $firstGoalInd = $goalInds[0] ?? [
                'indicator' => $validated['goal_indicator'] ?? $validated['goal'] ?? 'Indikator Tujuan',
                'unit' => '%',
                'measurement_pattern' => 'Positif',
                'targets' => [],
                'realizations' => [],
            ];

            $goalItem = RealizationRpjmdItem::create([
                'parent_id'                => null,
                'level'                    => 'goal',
                'order_no'                 => 0,
                'mission'                  => $validated['mission'] ?? 'Misi RPJMD',
                'goal'                     => $validated['goal'] ?? 'Tujuan RPJMD',
                'goal_indicator'           => $firstGoalInd['indicator'],
                'goal_indicator_unit'      => $firstGoalInd['unit'],
                'goal_measurement_pattern' => $firstGoalInd['measurement_pattern'],
                'goal_targets'             => $firstGoalInd['targets'],
                'goal_realizations'        => $firstGoalInd['realizations'],
                'targets'                  => $firstGoalInd['targets'],
                'realizations'             => $firstGoalInd['realizations'],
                'measurement_pattern'      => $firstGoalInd['measurement_pattern'],
                'goal_indicators'          => $goalInds,
                'created_by'               => $userId,
            ]);

            $order = 1;
            foreach ($validated['objectives'] as $objData) {
                if (empty($objData['objective']) && empty($objData['objective_indicator']) && empty($objData['indicators'])) {
                    continue;
                }
                $inds = $formatIndicators(
                    $objData['indicators'] ?? null,
                    $objData['objective_indicator'] ?? '-',
                    $objData['unit'] ?? '%',
                    $objData['measurement_pattern'] ?? 'Positif',
                    $objData['targets'] ?? [],
                    $objData['realizations'] ?? []
                );
                $firstInd = $inds[0] ?? [
                    'indicator' => $objData['objective_indicator'] ?? '-',
                    'unit' => '%',
                    'measurement_pattern' => 'Positif',
                    'targets' => [],
                    'realizations' => [],
                ];

                RealizationRpjmdItem::create([
                    'parent_id'           => $goalItem->id,
                    'level'               => 'objective',
                    'order_no'            => $objData['order_no'] ?? $order++,
                    'mission'             => $goalItem->mission,
                    'goal'                => $goalItem->goal,
                    'goal_indicator'      => $goalItem->goal_indicator,
                    'goal_indicator_unit' => $goalItem->goal_indicator_unit,
                    'objective'           => $objData['objective'] ?? '-',
                    'objective_indicator' => $firstInd['indicator'],
                    'unit'                => $firstInd['unit'],
                    'measurement_pattern' => $firstInd['measurement_pattern'],
                    'targets'             => $firstInd['targets'],
                    'realizations'        => $firstInd['realizations'],
                    'indicators'          => $inds,
                    'created_by'          => $userId,
                ]);
            }
        } else {
            // Fallback: simpan 1 tujuan dan 1 sasaran
            $goalInds = $formatIndicators(
                $validated['goal_indicators'] ?? null,
                $validated['goal_indicator'] ?? $validated['goal'] ?? 'Indikator Tujuan',
                $validated['goal_indicator_unit'] ?? '%',
                $validated['goal_measurement_pattern'] ?? 'Positif',
                $validated['goal_targets'] ?? [],
                $validated['goal_realizations'] ?? []
            );
            $firstGoalInd = $goalInds[0] ?? [
                'indicator' => $validated['goal_indicator'] ?? $validated['goal'] ?? 'Indikator Tujuan',
                'unit' => '%',
                'measurement_pattern' => 'Positif',
                'targets' => [],
                'realizations' => [],
            ];

            $goalItem = RealizationRpjmdItem::create([
                'parent_id'                => null,
                'level'                    => 'goal',
                'order_no'                 => 0,
                'mission'                  => $validated['mission'] ?? 'Misi RPJMD',
                'goal'                     => $validated['goal'] ?? 'Tujuan RPJMD',
                'goal_indicator'           => $firstGoalInd['indicator'],
                'goal_indicator_unit'      => $firstGoalInd['unit'],
                'goal_measurement_pattern' => $firstGoalInd['measurement_pattern'],
                'goal_targets'             => $firstGoalInd['targets'],
                'goal_realizations'        => $firstGoalInd['realizations'],
                'targets'                  => $firstGoalInd['targets'],
                'realizations'             => $firstGoalInd['realizations'],
                'measurement_pattern'      => $firstGoalInd['measurement_pattern'],
                'goal_indicators'          => $goalInds,
                'created_by'               => $userId,
            ]);

            if (!empty($validated['objective']) || !empty($validated['objective_indicator']) || !empty($validated['indicators'])) {
                $inds = $formatIndicators(
                    $validated['indicators'] ?? null,
                    $validated['objective_indicator'] ?? '-',
                    $validated['unit'] ?? '%',
                    $validated['measurement_pattern'] ?? 'Positif',
                    $validated['targets'] ?? [],
                    $validated['realizations'] ?? []
                );
                $firstInd = $inds[0] ?? [
                    'indicator' => $validated['objective_indicator'] ?? '-',
                    'unit' => '%',
                    'measurement_pattern' => 'Positif',
                    'targets' => [],
                    'realizations' => [],
                ];

                RealizationRpjmdItem::create([
                    'parent_id'           => $goalItem->id,
                    'level'               => 'objective',
                    'order_no'            => 1,
                    'mission'             => $goalItem->mission,
                    'goal'                => $goalItem->goal,
                    'goal_indicator'      => $goalItem->goal_indicator,
                    'goal_indicator_unit' => $goalItem->goal_indicator_unit,
                    'objective'           => $validated['objective'] ?? '-',
                    'objective_indicator' => $firstInd['indicator'],
                    'unit'                => $firstInd['unit'],
                    'measurement_pattern' => $firstInd['measurement_pattern'],
                    'targets'             => $firstInd['targets'],
                    'realizations'        => $firstInd['realizations'],
                    'indicators'          => $inds,
                    'created_by'          => $userId,
                ]);
            }
        }

        Cache::flush();

        return redirect()->back()->with('success', 'Data Realisasi RPJMD berhasil ditambahkan.');
    }

    public function rpjmdUpdate(Request $request, RealizationRpjmdItem $item): RedirectResponse
    {
        if (!$this->isSpBappeda($request->user())) {
            abort(403, 'Hanya SP / Bappeda yang memiliki kewenangan mengedit Realisasi RPJMD.');
        }

        $validated = $request->validate([
            'mission'                  => 'nullable|string',
            'goal'                     => 'nullable|string',
            'goal_indicator'           => 'nullable|string',
            'goal_indicator_unit'      => 'nullable|string|max:100',
            'goal_measurement_pattern' => 'nullable|in:Positif,Negatif',
            'goal_targets'             => 'nullable|array',
            'goal_realizations'        => 'nullable|array',
            'goal_indicators'          => 'nullable|array',
            'objective'                => 'nullable|string',
            'objective_indicator'      => 'nullable|string',
            'unit'                     => 'nullable|string|max:100',
            'measurement_pattern'      => 'nullable|in:Positif,Negatif',
            'targets'                  => 'nullable|array',
            'realizations'             => 'nullable|array',
            'indicators'               => 'nullable|array',
            'order_no'                 => 'nullable|integer',
        ]);

        if ($item->level === 'goal') {
            $updateData = [
                'mission' => $validated['mission'] ?? $item->mission,
                'goal'    => $validated['goal'] ?? $item->goal,
            ];

            if (isset($validated['goal_indicators']) && is_array($validated['goal_indicators'])) {
                $goalIndicators = [];
                foreach ($validated['goal_indicators'] as $idx => $gi) {
                    if (empty($gi['indicator'])) continue;
                    $goalIndicators[] = [
                        'id'                  => $gi['id'] ?? ($idx + 1),
                        'indicator'           => (string) $gi['indicator'],
                        'unit'                => (string) ($gi['unit'] ?? '%'),
                        'measurement_pattern' => in_array($gi['measurement_pattern'] ?? '', ['Positif', 'Negatif']) ? $gi['measurement_pattern'] : 'Positif',
                        'targets'             => (array) ($gi['targets'] ?? []),
                        'realizations'        => (array) ($gi['realizations'] ?? []),
                    ];
                }
                if (!empty($goalIndicators)) {
                    $updateData['goal_indicators'] = $goalIndicators;
                    $updateData['goal_indicator'] = $goalIndicators[0]['indicator'];
                    $updateData['goal_indicator_unit'] = $goalIndicators[0]['unit'];
                    $updateData['goal_measurement_pattern'] = $goalIndicators[0]['measurement_pattern'];
                    $updateData['goal_targets'] = $goalIndicators[0]['targets'];
                    $updateData['goal_realizations'] = $goalIndicators[0]['realizations'];
                    $updateData['targets'] = $goalIndicators[0]['targets'];
                    $updateData['realizations'] = $goalIndicators[0]['realizations'];
                    $updateData['measurement_pattern'] = $goalIndicators[0]['measurement_pattern'];
                }
            } else {
                if (isset($validated['goal_indicator'])) $updateData['goal_indicator'] = $validated['goal_indicator'];
                if (isset($validated['goal_indicator_unit'])) $updateData['goal_indicator_unit'] = $validated['goal_indicator_unit'];
                if (isset($validated['goal_measurement_pattern'])) $updateData['goal_measurement_pattern'] = $validated['goal_measurement_pattern'];
                if (isset($validated['goal_targets'])) {
                    $updateData['goal_targets'] = $validated['goal_targets'];
                    $updateData['targets'] = $validated['goal_targets'];
                }
                if (isset($validated['goal_realizations'])) {
                    $updateData['goal_realizations'] = $validated['goal_realizations'];
                    $updateData['realizations'] = $validated['goal_realizations'];
                }
            }

            $item->update($updateData);

            // Propagate changes to children objectives
            $item->children()->update([
                'mission'             => $item->mission,
                'goal'                => $item->goal,
                'goal_indicator'      => $item->goal_indicator,
                'goal_indicator_unit' => $item->goal_indicator_unit,
            ]);
        } else {
            // Update Objective
            $updateData = [
                'objective' => $validated['objective'] ?? $item->objective,
                'order_no'  => $validated['order_no'] ?? $item->order_no,
            ];

            if (isset($validated['indicators']) && is_array($validated['indicators'])) {
                $indicators = [];
                foreach ($validated['indicators'] as $idx => $ind) {
                    if (empty($ind['indicator'])) continue;
                    $indicators[] = [
                        'id'                  => $ind['id'] ?? ($idx + 1),
                        'indicator'           => (string) $ind['indicator'],
                        'unit'                => (string) ($ind['unit'] ?? '%'),
                        'measurement_pattern' => in_array($ind['measurement_pattern'] ?? '', ['Positif', 'Negatif']) ? $ind['measurement_pattern'] : 'Positif',
                        'targets'             => (array) ($ind['targets'] ?? []),
                        'realizations'        => (array) ($ind['realizations'] ?? []),
                    ];
                }
                if (!empty($indicators)) {
                    $updateData['indicators'] = $indicators;
                    $updateData['objective_indicator'] = $indicators[0]['indicator'];
                    $updateData['unit'] = $indicators[0]['unit'];
                    $updateData['measurement_pattern'] = $indicators[0]['measurement_pattern'];
                    $updateData['targets'] = $indicators[0]['targets'];
                    $updateData['realizations'] = $indicators[0]['realizations'];
                }
            } else {
                if (isset($validated['objective_indicator'])) $updateData['objective_indicator'] = $validated['objective_indicator'];
                if (isset($validated['unit'])) $updateData['unit'] = $validated['unit'];
                if (isset($validated['measurement_pattern'])) $updateData['measurement_pattern'] = $validated['measurement_pattern'];
                if (isset($validated['targets'])) $updateData['targets'] = $validated['targets'];
                if (isset($validated['realizations'])) $updateData['realizations'] = $validated['realizations'];
            }

            $item->update($updateData);
        }

        Cache::flush();

        return redirect()->back()->with('success', 'Data Realisasi RPJMD berhasil diperbarui.');
    }

    public function rpjmdDestroy(Request $request, RealizationRpjmdItem $item): RedirectResponse
    {
        if (!$this->isSpBappeda($request->user())) {
            abort(403, 'Hanya SP / Bappeda yang memiliki kewenangan menghapus Realisasi RPJMD.');
        }

        $item->delete();
        Cache::flush();

        return redirect()->back()->with('success', 'Data Realisasi RPJMD berhasil dihapus.');
    }

    public function rpjmdUpdateMission(Request $request): RedirectResponse
    {
        if (!$this->isSpBappeda($request->user())) {
            abort(403, 'Hanya SP / Bappeda yang memiliki kewenangan mengedit Misi RPJMD.');
        }

        $validated = $request->validate([
            'old_mission' => 'required|string',
            'new_mission' => 'required|string|max:500',
        ]);

        $old = trim($validated['old_mission']);
        $new = trim($validated['new_mission']);

        RealizationRpjmdItem::where('mission', $old)
            ->update(['mission' => $new]);

        Cache::flush();

        return redirect()->back()->with('success', "Misi RPJMD berhasil diperbarui menjadi: \"{$new}\"");
    }

    public function rpjmdBatch(Request $request): RedirectResponse
    {
        if (!$this->isSpBappeda($request->user())) {
            abort(403, 'Hanya SP / Bappeda yang memiliki kewenangan mengupdate Realisasi RPJMD.');
        }

        $itemsData = $request->input('items', []);

        foreach ($itemsData as $data) {
            if (!empty($data['id'])) {
                $item = RealizationRpjmdItem::find($data['id']);
                if ($item) {
                    $item->update([
                        'mission'                  => $data['mission'] ?? $item->mission,
                        'goal'                     => $data['goal'] ?? $item->goal,
                        'goal_indicator'           => $data['goal_indicator'] ?? $item->goal_indicator,
                        'goal_indicator_unit'      => $data['goal_indicator_unit'] ?? $item->goal_indicator_unit,
                        'goal_measurement_pattern' => $data['goal_measurement_pattern'] ?? $item->goal_measurement_pattern,
                        'goal_targets'             => $data['goal_targets'] ?? $item->goal_targets,
                        'goal_realizations'        => $data['goal_realizations'] ?? $item->goal_realizations,
                        'objective'                => $data['objective'] ?? $item->objective,
                        'objective_indicator'      => $data['objective_indicator'] ?? $item->objective_indicator,
                        'unit'                     => $data['unit'] ?? $item->unit,
                        'measurement_pattern'      => $data['measurement_pattern'] ?? $item->measurement_pattern,
                        'targets'                  => $data['targets'] ?? $item->targets,
                        'realizations'             => $data['realizations'] ?? $item->realizations,
                    ]);
                }
            }
        }

        Cache::flush();

        return redirect()->back()->with('success', 'Tabel Realisasi RPJMD berhasil disimpan.');
    }

    // =========================================================================
    // 4.2 REALISASI KINERJA (IKU PEMDA) - PENGAMPU: SP / BAPPEDA
    // =========================================================================

    public function ikuIndex(Request $request): Response
    {
        $user = $request->user();
        $canManage = $this->isSpBappeda($user);
        $periodId = $this->parseIntegerInput($request, 'period_id');
        $selectedPeriod = null;
        $years = $this->getRpjmdYears($periodId, $selectedPeriod);

        $items = RealizationIkuItem::query()
            ->with('creator:id,name')
            ->orderBy('id')
            ->get()
            ->map(function (RealizationIkuItem $item) use ($years) {
                $item->setAttribute('calculations', $this->buildCalculations($item, $years));
                return $item;
            });

        return Inertia::render('Measurement/RealizationIku', [
            'items' => $items,
            'years' => $years,
            'activeRpjmdPeriod' => $selectedPeriod,
            'availableRpjmdPeriods' => $this->getAvailableRpjmdPeriods(),
            'activeYear' => $this->getActiveYear(),
            'canManage' => $canManage,
            'userIsSpBappeda' => $this->isSpBappeda($user),
        ]);
    }

    public function ikuStore(Request $request): RedirectResponse
    {
        if (!$this->isSpBappeda($request->user())) {
            abort(403, 'Hanya SP / Bappeda yang memiliki kewenangan menginput Realisasi IKU.');
        }

        $validated = $request->validate([
            'indicator_name' => 'required|string',
            'unit' => 'nullable|string',
            'measurement_pattern' => 'required|in:Positif,Negatif',
            'targets' => 'nullable|array',
            'realizations' => 'nullable|array',
        ]);

        $validated['created_by'] = $request->user()->id;

        RealizationIkuItem::create($validated);
        Cache::flush();

        return redirect()->back()->with('success', 'Data Realisasi IKU Pemda berhasil ditambahkan.');
    }

    public function ikuUpdate(Request $request, RealizationIkuItem $item): RedirectResponse
    {
        if (!$this->isSpBappeda($request->user())) {
            abort(403, 'Hanya SP / Bappeda yang memiliki kewenangan mengedit Realisasi IKU.');
        }

        $validated = $request->validate([
            'indicator_name' => 'required|string',
            'unit' => 'nullable|string',
            'measurement_pattern' => 'required|in:Positif,Negatif',
            'targets' => 'nullable|array',
            'realizations' => 'nullable|array',
        ]);

        $item->update($validated);
        Cache::flush();

        return redirect()->back()->with('success', 'Data Realisasi IKU Pemda berhasil diperbarui.');
    }

    public function ikuDestroy(Request $request, RealizationIkuItem $item): RedirectResponse
    {
        if (!$this->isSpBappeda($request->user())) {
            abort(403, 'Hanya SP / Bappeda yang memiliki kewenangan menghapus Realisasi IKU.');
        }

        $item->delete();
        Cache::flush();

        return redirect()->back()->with('success', 'Data Realisasi IKU Pemda berhasil dihapus.');
    }

    public function ikuBatch(Request $request): RedirectResponse
    {
        if (!$this->isSpBappeda($request->user())) {
            abort(403, 'Hanya SP / Bappeda yang memiliki kewenangan mengupdate Realisasi IKU.');
        }

        $itemsData = $request->input('items', []);

        foreach ($itemsData as $data) {
            if (!empty($data['id'])) {
                $item = RealizationIkuItem::find($data['id']);
                if ($item) {
                    $item->update([
                        'indicator_name' => $data['indicator_name'] ?? $item->indicator_name,
                        'unit' => $data['unit'] ?? $item->unit,
                        'measurement_pattern' => $data['measurement_pattern'] ?? $item->measurement_pattern,
                        'targets' => $data['targets'] ?? $item->targets,
                        'realizations' => $data['realizations'] ?? $item->realizations,
                    ]);
                }
            }
        }
        Cache::flush();

        return redirect()->back()->with('success', 'Tabel Realisasi IKU Pemda berhasil disimpan.');
    }

    // =========================================================================
    // 4.3 REALISASI KINERJA (PD / PERANGKAT DAERAH) - PENGAMPU: MASING2 PD
    // =========================================================================

    public function opdIndex(Request $request): Response
    {
        $user = $request->user();
        $isSpBappeda = $this->isSpBappeda($user);
        $accessibleOrgIds = $this->authorization->accessibleOrganizationIds($user);

        $organizations = Organization::query()
            ->when(!$isSpBappeda, fn ($q) => $q->whereIn('id', $accessibleOrgIds))
            ->orderBy('name')
            ->get(['id', 'code', 'name']);

        $selectedOrgId = $this->parseIntegerInput($request, 'organization_id', $organizations->first()?->id ?? null);

        if ($selectedOrgId && ! $isSpBappeda && ! in_array($selectedOrgId, $accessibleOrgIds, true)) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat data Perangkat Daerah ini.');
        }

        $periodId = $this->parseIntegerInput($request, 'period_id');
        $selectedPeriod = null;
        $years = $this->getRpjmdYears($periodId, $selectedPeriod);

        $goals = collect();
        $items = collect();
        $canManage = false;

        if ($selectedOrgId) {
            $canManage = $this->isProvincialAdmin($user) || in_array($selectedOrgId, $accessibleOrgIds, true);

            // Fetch Goals with their child Objectives for hierarchical tree view
            $goals = RealizationOpdItem::goals()
                ->where('organization_id', $selectedOrgId)
                ->with(['organization:id,name,code', 'children.creator:id,name', 'creator:id,name'])
                ->orderBy('id')
                ->get()
                ->map(function (RealizationOpdItem $goal) use ($years) {
                    $goal->setAttribute('calculations', $this->buildCalculations($goal, $years));
                    $goal->setAttribute('goal_indicators_list', $this->enrichIndicators($goal->goal_indicators_list, $years));
                    $goal->children->each(function (RealizationOpdItem $child) use ($years) {
                        $child->setAttribute('calculations', $this->buildCalculations($child, $years));
                        $child->setAttribute('objective_indicators_list', $this->enrichIndicators($child->objective_indicators_list, $years));
                    });
                    return $goal;
                });

            // Also fetch all items for backwards compatibility and flattened operations
            $items = RealizationOpdItem::query()
                ->where('organization_id', $selectedOrgId)
                ->with(['organization:id,name,code', 'creator:id,name'])
                ->orderBy('id')
                ->get()
                ->map(function (RealizationOpdItem $item) use ($years) {
                    $item->setAttribute('calculations', $this->buildCalculations($item, $years));
                    if ($item->level === 'goal') {
                        $item->setAttribute('goal_indicators_list', $this->enrichIndicators($item->goal_indicators_list, $years));
                    } else {
                        $item->setAttribute('objective_indicators_list', $this->enrichIndicators($item->objective_indicators_list, $years));
                    }
                    return $item;
                });
        }

        return Inertia::render('Measurement/RealizationOpd', [
            'goals' => $goals,
            'items' => $items,
            'organizations' => $organizations,
            'selectedOrgId' => $selectedOrgId,
            'years' => $years,
            'activeRpjmdPeriod' => $selectedPeriod,
            'availableRpjmdPeriods' => $this->getAvailableRpjmdPeriods(),
            'activeYear' => $this->getActiveYear(),
            'canManage' => $canManage,
            'userIsSpBappeda' => $isSpBappeda,
        ]);
    }

    public function opdStore(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'organization_id'          => 'required|exists:organizations,id',
            'mode'                     => 'nullable|string|in:both,objective,goal',
            'parent_id'                => 'nullable|exists:realization_opd_items,id',
            'goal'                     => 'nullable|string',
            'goal_indicators'          => 'nullable|array',
            'goal_indicator'           => 'nullable|string',
            'goal_indicator_unit'      => 'nullable|string|max:100',
            'goal_measurement_pattern' => 'nullable|in:Positif,Negatif',
            'goal_targets'             => 'nullable|array',
            'goal_realizations'        => 'nullable|array',
            'objective'                => 'nullable|string',
            'objective_indicator'      => 'nullable|string',
            'unit'                     => 'nullable|string|max:100',
            'measurement_pattern'      => 'nullable|in:Positif,Negatif',
            'targets'                  => 'nullable|array',
            'realizations'             => 'nullable|array',
            'indicators'               => 'nullable|array',
            'goals'                    => 'nullable|array',
            'objectives'               => 'nullable|array',
            'objectives.*.objective'           => 'nullable|string',
            'objectives.*.objective_indicator' => 'nullable|string',
            'objectives.*.unit'                => 'nullable|string|max:100',
            'objectives.*.measurement_pattern' => 'nullable|in:Positif,Negatif',
            'objectives.*.targets'             => 'nullable|array',
            'objectives.*.realizations'        => 'nullable|array',
            'objectives.*.indicators'          => 'nullable|array',
            'objectives.*.order_no'            => 'nullable|integer',
        ]);

        $orgId = (int) $validated['organization_id'];
        $this->checkOpdAccess($request->user(), $orgId);
        $userId = $request->user()->id;

        $mode = $validated['mode'] ?? (!empty($validated['objectives']) || !empty($validated['goals']) ? 'both' : (!empty($validated['parent_id']) ? 'objective' : 'both'));

        $formatIndicators = function (?array $raw, string $fallbackName, string $fallbackUnit = '%', string $fallbackPattern = 'Positif', array $fallbackTargets = [], array $fallbackRealizations = []): array {
            $formatted = [];
            if (!empty($raw) && is_array($raw)) {
                foreach ($raw as $idx => $item) {
                    if (empty($item['indicator'])) continue;
                    $formatted[] = [
                        'id'                  => $item['id'] ?? ($idx + 1),
                        'indicator'           => (string) $item['indicator'],
                        'unit'                => (string) ($item['unit'] ?? '%'),
                        'measurement_pattern' => in_array($item['measurement_pattern'] ?? '', ['Positif', 'Negatif']) ? $item['measurement_pattern'] : 'Positif',
                        'targets'             => (array) ($item['targets'] ?? []),
                        'realizations'        => (array) ($item['realizations'] ?? []),
                    ];
                }
            }
            if (empty($formatted) && !empty($fallbackName)) {
                $formatted[] = [
                    'id'                  => 1,
                    'indicator'           => $fallbackName,
                    'unit'                => $fallbackUnit,
                    'measurement_pattern' => in_array($fallbackPattern, ['Positif', 'Negatif']) ? $fallbackPattern : 'Positif',
                    'targets'             => $fallbackTargets,
                    'realizations'        => $fallbackRealizations,
                ];
            }
            return $formatted;
        };

        if ($mode === 'objective' && !empty($validated['parent_id'])) {
            // Mode: Tambah sub-sasaran langsung di bawah Tujuan yang sudah ada
            $parentGoal = RealizationOpdItem::findOrFail($validated['parent_id']);
            $this->checkOpdAccess($request->user(), $parentGoal->organization_id);
            if (!empty($validated['objectives']) && is_array($validated['objectives'])) {
                $maxOrder = (int) RealizationOpdItem::where('parent_id', $parentGoal->id)->max('order_no');
                foreach ($validated['objectives'] as $objData) {
                    if (empty($objData['objective']) && empty($objData['objective_indicator']) && empty($objData['indicators'])) {
                        continue;
                    }
                    $maxOrder++;
                    $inds = $formatIndicators(
                        $objData['indicators'] ?? null,
                        $objData['objective_indicator'] ?? '-',
                        $objData['unit'] ?? '%',
                        $objData['measurement_pattern'] ?? 'Positif',
                        $objData['targets'] ?? [],
                        $objData['realizations'] ?? []
                    );
                    $firstInd = $inds[0] ?? [
                        'indicator' => $objData['objective_indicator'] ?? '-',
                        'unit' => '%',
                        'measurement_pattern' => 'Positif',
                        'targets' => [],
                        'realizations' => [],
                    ];

                    RealizationOpdItem::create([
                        'organization_id'     => $parentGoal->organization_id,
                        'parent_id'           => $parentGoal->id,
                        'level'               => 'objective',
                        'order_no'            => $objData['order_no'] ?? $maxOrder,
                        'goal'                => $parentGoal->goal,
                        'goal_indicator'      => $parentGoal->goal_indicator,
                        'goal_indicator_unit' => $parentGoal->goal_indicator_unit,
                        'objective'           => $objData['objective'] ?? '-',
                        'objective_indicator' => $firstInd['indicator'],
                        'unit'                => $firstInd['unit'],
                        'measurement_pattern' => $firstInd['measurement_pattern'],
                        'targets'             => $firstInd['targets'],
                        'realizations'        => $firstInd['realizations'],
                        'indicators'          => $inds,
                        'created_by'          => $userId,
                    ]);
                }
            } else {
                $nextOrder = (int) RealizationOpdItem::where('parent_id', $parentGoal->id)->max('order_no') + 1;
                $inds = $formatIndicators(
                    $validated['indicators'] ?? null,
                    $validated['objective_indicator'] ?? '-',
                    $validated['unit'] ?? '%',
                    $validated['measurement_pattern'] ?? 'Positif',
                    $validated['targets'] ?? [],
                    $validated['realizations'] ?? []
                );
                $firstInd = $inds[0] ?? [
                    'indicator' => $validated['objective_indicator'] ?? '-',
                    'unit' => '%',
                    'measurement_pattern' => 'Positif',
                    'targets' => [],
                    'realizations' => [],
                ];

                RealizationOpdItem::create([
                    'organization_id'     => $parentGoal->organization_id,
                    'parent_id'           => $parentGoal->id,
                    'level'               => 'objective',
                    'order_no'            => $nextOrder,
                    'goal'                => $parentGoal->goal,
                    'goal_indicator'      => $parentGoal->goal_indicator,
                    'goal_indicator_unit' => $parentGoal->goal_indicator_unit,
                    'objective'           => $validated['objective'] ?? '-',
                    'objective_indicator' => $firstInd['indicator'],
                    'unit'                => $firstInd['unit'],
                    'measurement_pattern' => $firstInd['measurement_pattern'],
                    'targets'             => $firstInd['targets'],
                    'realizations'        => $firstInd['realizations'],
                    'indicators'          => $inds,
                    'created_by'          => $userId,
                ]);
            }
        } elseif (!empty($validated['goals']) && is_array($validated['goals'])) {
            // Mode: Buat Banyak Tujuan + Sasaran
            foreach ($validated['goals'] as $gData) {
                if (empty($gData['goal']) && empty($gData['goal_indicators'])) {
                    continue;
                }
                $goalInds = $formatIndicators(
                    $gData['goal_indicators'] ?? null,
                    $gData['goal'] ?? 'Indikator Tujuan',
                    '%',
                    'Positif'
                );
                $firstGoalInd = $goalInds[0] ?? [
                    'indicator' => $gData['goal'] ?? 'Indikator Tujuan',
                    'unit' => '%',
                    'measurement_pattern' => 'Positif',
                    'targets' => [],
                    'realizations' => [],
                ];

                $goalItem = RealizationOpdItem::create([
                    'organization_id'          => $orgId,
                    'parent_id'                => null,
                    'level'                    => 'goal',
                    'order_no'                 => 0,
                    'goal'                     => $gData['goal'] ?? 'Tujuan Renstra',
                    'goal_indicator'           => $firstGoalInd['indicator'],
                    'goal_indicator_unit'      => $firstGoalInd['unit'],
                    'goal_measurement_pattern' => $firstGoalInd['measurement_pattern'],
                    'goal_targets'             => $firstGoalInd['targets'],
                    'goal_realizations'        => $firstGoalInd['realizations'],
                    'targets'                  => $firstGoalInd['targets'],
                    'realizations'             => $firstGoalInd['realizations'],
                    'measurement_pattern'      => $firstGoalInd['measurement_pattern'],
                    'goal_indicators'          => $goalInds,
                    'created_by'               => $userId,
                ]);

                if (!empty($gData['objectives']) && is_array($gData['objectives'])) {
                    $order = 1;
                    foreach ($gData['objectives'] as $objData) {
                        if (empty($objData['objective']) && empty($objData['indicators']) && empty($objData['objective_indicator'])) {
                            continue;
                        }
                        $inds = $formatIndicators(
                            $objData['indicators'] ?? null,
                            $objData['objective_indicator'] ?? ($objData['objective'] ?? '-'),
                            $objData['unit'] ?? '%',
                            $objData['measurement_pattern'] ?? 'Positif',
                            $objData['targets'] ?? [],
                            $objData['realizations'] ?? []
                        );
                        $firstInd = $inds[0] ?? [
                            'indicator' => $objData['objective_indicator'] ?? ($objData['objective'] ?? '-'),
                            'unit' => '%',
                            'measurement_pattern' => 'Positif',
                            'targets' => [],
                            'realizations' => [],
                        ];

                        RealizationOpdItem::create([
                            'organization_id'     => $orgId,
                            'parent_id'           => $goalItem->id,
                            'level'               => 'objective',
                            'order_no'            => $objData['order_no'] ?? $order++,
                            'goal'                => $goalItem->goal,
                            'goal_indicator'      => $goalItem->goal_indicator,
                            'goal_indicator_unit' => $goalItem->goal_indicator_unit,
                            'objective'           => $objData['objective'] ?? '-',
                            'objective_indicator' => $firstInd['indicator'],
                            'unit'                => $firstInd['unit'],
                            'measurement_pattern' => $firstInd['measurement_pattern'],
                            'targets'             => $firstInd['targets'],
                            'realizations'        => $firstInd['realizations'],
                            'indicators'          => $inds,
                            'created_by'          => $userId,
                        ]);
                    }
                }
            }
        } elseif (!empty($validated['objectives']) && is_array($validated['objectives'])) {
            // Mode: Buat Tujuan + Banyak Sub-Sasaran
            $goalInds = $formatIndicators(
                $validated['goal_indicators'] ?? null,
                $validated['goal_indicator'] ?? $validated['goal'] ?? 'Indikator Tujuan',
                $validated['goal_indicator_unit'] ?? '%',
                $validated['goal_measurement_pattern'] ?? 'Positif',
                $validated['goal_targets'] ?? [],
                $validated['goal_realizations'] ?? []
            );
            $firstGoalInd = $goalInds[0] ?? [
                'indicator' => $validated['goal_indicator'] ?? $validated['goal'] ?? 'Indikator Tujuan',
                'unit' => '%',
                'measurement_pattern' => 'Positif',
                'targets' => [],
                'realizations' => [],
            ];

            $goalItem = RealizationOpdItem::create([
                'organization_id'          => $orgId,
                'parent_id'                => null,
                'level'                    => 'goal',
                'order_no'                 => 0,
                'goal'                     => $validated['goal'] ?? 'Tujuan Renstra',
                'goal_indicator'           => $firstGoalInd['indicator'],
                'goal_indicator_unit'      => $firstGoalInd['unit'],
                'goal_measurement_pattern' => $firstGoalInd['measurement_pattern'],
                'goal_targets'             => $firstGoalInd['targets'],
                'goal_realizations'        => $firstGoalInd['realizations'],
                'targets'                  => $firstGoalInd['targets'],
                'realizations'             => $firstGoalInd['realizations'],
                'measurement_pattern'      => $firstGoalInd['measurement_pattern'],
                'goal_indicators'          => $goalInds,
                'created_by'               => $userId,
            ]);

            $order = 1;
            foreach ($validated['objectives'] as $objData) {
                if (empty($objData['objective']) && empty($objData['objective_indicator']) && empty($objData['indicators'])) {
                    continue;
                }
                $inds = $formatIndicators(
                    $objData['indicators'] ?? null,
                    $objData['objective_indicator'] ?? '-',
                    $objData['unit'] ?? '%',
                    $objData['measurement_pattern'] ?? 'Positif',
                    $objData['targets'] ?? [],
                    $objData['realizations'] ?? []
                );
                $firstInd = $inds[0] ?? [
                    'indicator' => $objData['objective_indicator'] ?? '-',
                    'unit' => '%',
                    'measurement_pattern' => 'Positif',
                    'targets' => [],
                    'realizations' => [],
                ];

                RealizationOpdItem::create([
                    'organization_id'     => $orgId,
                    'parent_id'           => $goalItem->id,
                    'level'               => 'objective',
                    'order_no'            => $objData['order_no'] ?? $order++,
                    'goal'                => $goalItem->goal,
                    'goal_indicator'      => $goalItem->goal_indicator,
                    'goal_indicator_unit' => $goalItem->goal_indicator_unit,
                    'objective'           => $objData['objective'] ?? '-',
                    'objective_indicator' => $firstInd['indicator'],
                    'unit'                => $firstInd['unit'],
                    'measurement_pattern' => $firstInd['measurement_pattern'],
                    'targets'             => $firstInd['targets'],
                    'realizations'        => $firstInd['realizations'],
                    'indicators'          => $inds,
                    'created_by'          => $userId,
                ]);
            }
        } else {
            // Fallback: simpan 1 tujuan dan 1 sasaran (kompatibilitas mundur penuh)
            $goalInds = $formatIndicators(
                $validated['goal_indicators'] ?? null,
                $validated['goal_indicator'] ?? $validated['goal'] ?? 'Indikator Tujuan',
                $validated['goal_indicator_unit'] ?? '%',
                $validated['goal_measurement_pattern'] ?? 'Positif',
                $validated['goal_targets'] ?? [],
                $validated['goal_realizations'] ?? []
            );
            $firstGoalInd = $goalInds[0] ?? [
                'indicator' => $validated['goal_indicator'] ?? $validated['goal'] ?? 'Indikator Tujuan',
                'unit' => '%',
                'measurement_pattern' => 'Positif',
                'targets' => [],
                'realizations' => [],
            ];

            $goalItem = RealizationOpdItem::create([
                'organization_id'          => $orgId,
                'parent_id'                => null,
                'level'                    => 'goal',
                'order_no'                 => 0,
                'goal'                     => $validated['goal'] ?? 'Tujuan Renstra',
                'goal_indicator'           => $firstGoalInd['indicator'],
                'goal_indicator_unit'      => $firstGoalInd['unit'],
                'goal_measurement_pattern' => $firstGoalInd['measurement_pattern'],
                'goal_targets'             => $firstGoalInd['targets'],
                'goal_realizations'        => $firstGoalInd['realizations'],
                'targets'                  => $firstGoalInd['targets'],
                'realizations'             => $firstGoalInd['realizations'],
                'measurement_pattern'      => $firstGoalInd['measurement_pattern'],
                'goal_indicators'          => $goalInds,
                'created_by'               => $userId,
            ]);

            if (!empty($validated['objective']) || !empty($validated['objective_indicator']) || !empty($validated['indicators'])) {
                $inds = $formatIndicators(
                    $validated['indicators'] ?? null,
                    $validated['objective_indicator'] ?? '-',
                    $validated['unit'] ?? '%',
                    $validated['measurement_pattern'] ?? 'Positif',
                    $validated['targets'] ?? [],
                    $validated['realizations'] ?? []
                );
                $firstInd = $inds[0] ?? [
                    'indicator' => $validated['objective_indicator'] ?? '-',
                    'unit' => '%',
                    'measurement_pattern' => 'Positif',
                    'targets' => [],
                    'realizations' => [],
                ];

                RealizationOpdItem::create([
                    'organization_id'     => $orgId,
                    'parent_id'           => $goalItem->id,
                    'level'               => 'objective',
                    'order_no'            => 1,
                    'goal'                => $goalItem->goal,
                    'goal_indicator'      => $goalItem->goal_indicator,
                    'goal_indicator_unit' => $goalItem->goal_indicator_unit,
                    'objective'           => $validated['objective'] ?? '-',
                    'objective_indicator' => $firstInd['indicator'],
                    'unit'                => $firstInd['unit'],
                    'measurement_pattern' => $firstInd['measurement_pattern'],
                    'targets'             => $firstInd['targets'],
                    'realizations'        => $firstInd['realizations'],
                    'indicators'          => $inds,
                    'created_by'          => $userId,
                ]);
            }
        }

        Cache::flush();

        return redirect()->back()->with('success', 'Data Realisasi Kinerja PD berhasil ditambahkan.');
    }

    public function opdUpdate(Request $request, RealizationOpdItem $item): RedirectResponse
    {
        $this->checkOpdAccess($request->user(), $item->organization_id);

        $validated = $request->validate([
            'goal'                     => 'nullable|string',
            'goal_indicators'          => 'nullable|array',
            'goal_indicator'           => 'nullable|string',
            'goal_indicator_unit'      => 'nullable|string|max:100',
            'goal_measurement_pattern' => 'nullable|in:Positif,Negatif',
            'goal_targets'             => 'nullable|array',
            'goal_realizations'        => 'nullable|array',
            'objective'                => 'nullable|string',
            'objective_indicator'      => 'nullable|string',
            'unit'                     => 'nullable|string|max:100',
            'measurement_pattern'      => 'nullable|in:Positif,Negatif',
            'targets'                  => 'nullable|array',
            'realizations'             => 'nullable|array',
            'indicators'               => 'nullable|array',
            'order_no'                 => 'nullable|integer',
        ]);

        if ($item->level === 'goal') {
            $updateData = [
                'goal' => $validated['goal'] ?? $item->goal,
            ];

            if (isset($validated['goal_indicators']) && is_array($validated['goal_indicators'])) {
                $goalIndicators = [];
                foreach ($validated['goal_indicators'] as $idx => $gi) {
                    if (empty($gi['indicator'])) continue;
                    $goalIndicators[] = [
                        'id'                  => $gi['id'] ?? ($idx + 1),
                        'indicator'           => (string) $gi['indicator'],
                        'unit'                => (string) ($gi['unit'] ?? '%'),
                        'measurement_pattern' => in_array($gi['measurement_pattern'] ?? '', ['Positif', 'Negatif']) ? $gi['measurement_pattern'] : 'Positif',
                        'targets'             => (array) ($gi['targets'] ?? []),
                        'realizations'        => (array) ($gi['realizations'] ?? []),
                    ];
                }
                if (!empty($goalIndicators)) {
                    $updateData['goal_indicators'] = $goalIndicators;
                    $updateData['goal_indicator'] = $goalIndicators[0]['indicator'];
                    $updateData['goal_indicator_unit'] = $goalIndicators[0]['unit'];
                    $updateData['goal_measurement_pattern'] = $goalIndicators[0]['measurement_pattern'];
                    $updateData['goal_targets'] = $goalIndicators[0]['targets'];
                    $updateData['goal_realizations'] = $goalIndicators[0]['realizations'];
                    $updateData['targets'] = $goalIndicators[0]['targets'];
                    $updateData['realizations'] = $goalIndicators[0]['realizations'];
                    $updateData['measurement_pattern'] = $goalIndicators[0]['measurement_pattern'];
                }
            } else {
                if (isset($validated['goal_indicator'])) $updateData['goal_indicator'] = $validated['goal_indicator'];
                if (isset($validated['goal_indicator_unit'])) $updateData['goal_indicator_unit'] = $validated['goal_indicator_unit'];
                if (isset($validated['goal_measurement_pattern'])) $updateData['goal_measurement_pattern'] = $validated['goal_measurement_pattern'];
                if (isset($validated['goal_targets'])) {
                    $updateData['goal_targets'] = $validated['goal_targets'];
                    $updateData['targets'] = $validated['goal_targets'];
                }
                if (isset($validated['goal_realizations'])) {
                    $updateData['goal_realizations'] = $validated['goal_realizations'];
                    $updateData['realizations'] = $validated['goal_realizations'];
                }
            }

            $item->update($updateData);

            // Propagate changes to children objectives
            $item->children()->update([
                'goal'                => $item->goal,
                'goal_indicator'      => $item->goal_indicator,
                'goal_indicator_unit' => $item->goal_indicator_unit,
            ]);
        } else {
            // Update Objective
            $updateData = [
                'objective' => $validated['objective'] ?? $item->objective,
                'order_no'  => $validated['order_no'] ?? $item->order_no,
            ];

            if (isset($validated['indicators']) && is_array($validated['indicators'])) {
                $indicators = [];
                foreach ($validated['indicators'] as $idx => $ind) {
                    if (empty($ind['indicator'])) continue;
                    $indicators[] = [
                        'id'                  => $ind['id'] ?? ($idx + 1),
                        'indicator'           => (string) $ind['indicator'],
                        'unit'                => (string) ($ind['unit'] ?? '%'),
                        'measurement_pattern' => in_array($ind['measurement_pattern'] ?? '', ['Positif', 'Negatif']) ? $ind['measurement_pattern'] : 'Positif',
                        'targets'             => (array) ($ind['targets'] ?? []),
                        'realizations'        => (array) ($ind['realizations'] ?? []),
                    ];
                }
                if (!empty($indicators)) {
                    $updateData['indicators'] = $indicators;
                    $updateData['objective_indicator'] = $indicators[0]['indicator'];
                    $updateData['unit'] = $indicators[0]['unit'];
                    $updateData['measurement_pattern'] = $indicators[0]['measurement_pattern'];
                    $updateData['targets'] = $indicators[0]['targets'];
                    $updateData['realizations'] = $indicators[0]['realizations'];
                }
            } else {
                if (isset($validated['objective_indicator'])) $updateData['objective_indicator'] = $validated['objective_indicator'];
                if (isset($validated['unit'])) $updateData['unit'] = $validated['unit'];
                if (isset($validated['measurement_pattern'])) $updateData['measurement_pattern'] = $validated['measurement_pattern'];
                if (isset($validated['targets'])) $updateData['targets'] = $validated['targets'];
                if (isset($validated['realizations'])) $updateData['realizations'] = $validated['realizations'];
            }

            $item->update($updateData);
        }

        Cache::flush();

        return redirect()->back()->with('success', 'Data Realisasi Kinerja PD berhasil diperbarui.');
    }

    public function opdDestroy(Request $request, RealizationOpdItem $item): RedirectResponse
    {
        $this->checkOpdAccess($request->user(), $item->organization_id);

        $item->delete();
        Cache::flush();

        return redirect()->back()->with('success', 'Data Realisasi Kinerja PD berhasil dihapus.');
    }

    public function opdBatch(Request $request): RedirectResponse
    {
        $orgId = (int) $request->input('organization_id');
        $this->checkOpdAccess($request->user(), $orgId);

        $itemsData = $request->input('items', []);

        foreach ($itemsData as $data) {
            if (!empty($data['id'])) {
                $item = RealizationOpdItem::find($data['id']);
                if ($item && $item->organization_id === $orgId) {
                    $item->update([
                        'goal'                     => $data['goal'] ?? $item->goal,
                        'goal_indicators'          => $data['goal_indicators'] ?? $item->goal_indicators,
                        'goal_indicator'           => $data['goal_indicator'] ?? $item->goal_indicator,
                        'goal_indicator_unit'      => $data['goal_indicator_unit'] ?? $item->goal_indicator_unit,
                        'goal_measurement_pattern' => $data['goal_measurement_pattern'] ?? $item->goal_measurement_pattern,
                        'goal_targets'             => $data['goal_targets'] ?? $item->goal_targets,
                        'goal_realizations'        => $data['goal_realizations'] ?? $item->goal_realizations,
                        'objective'                => $data['objective'] ?? $item->objective,
                        'objective_indicator'      => $data['objective_indicator'] ?? $item->objective_indicator,
                        'indicators'               => $data['indicators'] ?? $item->indicators,
                        'unit'                     => $data['unit'] ?? $item->unit,
                        'measurement_pattern'      => $data['measurement_pattern'] ?? $item->measurement_pattern,
                        'targets'                  => $data['targets'] ?? $item->targets,
                        'realizations'             => $data['realizations'] ?? $item->realizations,
                        'order_no'                 => $data['order_no'] ?? $item->order_no,
                    ]);
                }
            }
        }

        Cache::flush();

        return redirect()->back()->with('success', 'Tabel Realisasi Kinerja PD berhasil disimpan.');
    }

    // =========================================================================
    // 4.4 MONITORING RENCANA AKSI: KINERJA FISIK / OUTPUT - PENGAMPU: MASING2 PD
    // =========================================================================

    public function outputIndex(Request $request): Response
    {
        $user = $request->user();
        $isSpBappeda = $this->isSpBappeda($user);
        $accessibleOrgIds = $this->authorization->accessibleOrganizationIds($user);

        $organizations = Organization::query()
            ->when(!$isSpBappeda, fn ($q) => $q->whereIn('id', $accessibleOrgIds))
            ->orderBy('name')
            ->get(['id', 'code', 'name']);

        $selectedOrgId = $this->parseIntegerInput($request, 'organization_id', $organizations->first()?->id ?? null);

        if ($selectedOrgId && ! $isSpBappeda && ! in_array($selectedOrgId, $accessibleOrgIds, true)) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat data Perangkat Daerah ini.');
        }

        $year = $this->parseIntegerInput($request, 'year', $this->getActiveYear());

        $items = collect();
        $canManage = false;

        if ($selectedOrgId) {
            $canManage = $this->isProvincialAdmin($user) || in_array($selectedOrgId, $accessibleOrgIds, true);

            $items = MonitoringActionPlanOutput::query()
                ->where('organization_id', $selectedOrgId)
                ->where('year', $year)
                ->with(['organization:id,name,code', 'creator:id,name'])
                ->orderBy('order_no')
                ->orderBy('id')
                ->get()
                ->map(function (MonitoringActionPlanOutput $item) {
                    $twCalculations = [];

                    for ($i = 1; $i <= 4; $i++) {
                        $twTarget = $item->{"target_tw{$i}"};
                        $twReal = $item->{"realisasi_tw{$i}"};

                        $ach = PerformanceMeasurementService::calculateAchievement(
                            $twTarget !== null ? (float) $twTarget : null,
                            $twReal !== null ? (float) $twReal : null,
                            $item->measurement_pattern ?? 'Positif'
                        );

                        $status = PerformanceMeasurementService::determineStatus(
                            $ach,
                            $twTarget !== null ? (float) $twTarget : null,
                            $twReal !== null ? (float) $twReal : null
                        );

                        $twCalculations["tw{$i}"] = [
                            'achievement' => $ach,
                            'status' => $status['status'],
                            'badge' => $status['badge'],
                            'bgClass' => $status['bgClass'],
                        ];
                    }

                    $item->setAttribute('tw_calculations', $twCalculations);
                    return $item;
                });
        }

        return Inertia::render('Measurement/MonitoringOutput', [
            'items' => $items,
            'organizations' => $organizations,
            'selectedOrgId' => $selectedOrgId,
            'year' => $year,
            'availableYears' => $this->getRpjmdYears(),
            'canManage' => $canManage,
            'userIsSpBappeda' => $isSpBappeda,
        ]);
    }

    public function outputStore(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'organization_id' => 'required|exists:organizations,id',
            'year' => 'required|integer',
            'order_no' => 'nullable|integer',
            'sasaran_strategis' => 'nullable|string',
            'indikator_sasaran' => 'nullable|string',
            'target_sasaran_tahunan' => 'nullable|numeric',
            'program' => 'nullable|string',
            'kegiatan' => 'nullable|string',
            'subkegiatan' => 'nullable|string',
            'indikator_subkegiatan' => 'nullable|string',
            'satuan' => 'nullable|string',
            'measurement_pattern' => 'required|in:Positif,Negatif',
            'target_output_tahunan' => 'nullable|numeric',
            'target_tw1' => 'nullable|numeric',
            'target_tw2' => 'nullable|numeric',
            'target_tw3' => 'nullable|numeric',
            'target_tw4' => 'nullable|numeric',
            'realisasi_tw1' => 'nullable|numeric',
            'realisasi_tw2' => 'nullable|numeric',
            'realisasi_tw3' => 'nullable|numeric',
            'realisasi_tw4' => 'nullable|numeric',
            'person_in_charge' => 'nullable|string',
        ]);

        $this->checkOpdAccess($request->user(), (int) $validated['organization_id']);
        $validated['created_by'] = $request->user()->id;

        MonitoringActionPlanOutput::create($validated);
        Cache::flush();

        return redirect()->back()->with('success', 'Data Kinerja Fisik / Output berhasil ditambahkan.');
    }

    public function outputUpdate(Request $request, MonitoringActionPlanOutput $item): RedirectResponse
    {
        $this->checkOpdAccess($request->user(), $item->organization_id);

        $validated = $request->validate([
            'order_no' => 'nullable|integer',
            'sasaran_strategis' => 'nullable|string',
            'indikator_sasaran' => 'nullable|string',
            'target_sasaran_tahunan' => 'nullable|numeric',
            'program' => 'nullable|string',
            'kegiatan' => 'nullable|string',
            'subkegiatan' => 'nullable|string',
            'indikator_subkegiatan' => 'nullable|string',
            'satuan' => 'nullable|string',
            'measurement_pattern' => 'required|in:Positif,Negatif',
            'target_output_tahunan' => 'nullable|numeric',
            'target_tw1' => 'nullable|numeric',
            'target_tw2' => 'nullable|numeric',
            'target_tw3' => 'nullable|numeric',
            'target_tw4' => 'nullable|numeric',
            'realisasi_tw1' => 'nullable|numeric',
            'realisasi_tw2' => 'nullable|numeric',
            'realisasi_tw3' => 'nullable|numeric',
            'realisasi_tw4' => 'nullable|numeric',
            'person_in_charge' => 'nullable|string',
        ]);

        $item->update($validated);
        Cache::flush();

        return redirect()->back()->with('success', 'Data Kinerja Fisik / Output berhasil diperbarui.');
    }

    public function outputDestroy(Request $request, MonitoringActionPlanOutput $item): RedirectResponse
    {
        $this->checkOpdAccess($request->user(), $item->organization_id);

        $item->delete();
        Cache::flush();

        return redirect()->back()->with('success', 'Data Kinerja Fisik / Output berhasil dihapus.');
    }

    public function outputBatch(Request $request): RedirectResponse
    {
        $orgId = (int) $request->input('organization_id');
        $this->checkOpdAccess($request->user(), $orgId);

        $itemsData = $request->input('items', []);

        foreach ($itemsData as $data) {
            if (!empty($data['id'])) {
                $item = MonitoringActionPlanOutput::find($data['id']);
                if ($item && $item->organization_id === $orgId) {
                    $item->update($data);
                }
            }
        }

        Cache::flush();

        return redirect()->back()->with('success', 'Tabel Monitoring Kinerja Fisik / Output berhasil disimpan.');
    }

    // =========================================================================
    // 4.5 MONITORING RENCANA AKSI: KINERJA ANGGARAN - PENGAMPU: MASING2 PD
    // =========================================================================

    public function budgetIndex(Request $request): Response
    {
        $user = $request->user();
        $isSpBappeda = $this->isSpBappeda($user);
        $accessibleOrgIds = $this->authorization->accessibleOrganizationIds($user);

        $organizations = Organization::query()
            ->when(!$isSpBappeda, fn ($q) => $q->whereIn('id', $accessibleOrgIds))
            ->orderBy('name')
            ->get(['id', 'code', 'name']);

        $selectedOrgId = $this->parseIntegerInput($request, 'organization_id', $organizations->first()?->id ?? null);

        if ($selectedOrgId && ! $isSpBappeda && ! in_array($selectedOrgId, $accessibleOrgIds, true)) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat data Perangkat Daerah ini.');
        }

        $year = $this->parseIntegerInput($request, 'year', $this->getActiveYear());

        $items = collect();
        $canManage = false;

        if ($selectedOrgId) {
            $canManage = $this->isProvincialAdmin($user) || in_array($selectedOrgId, $accessibleOrgIds, true);

            $items = MonitoringActionPlanBudget::query()
                ->where('organization_id', $selectedOrgId)
                ->where('year', $year)
                ->with(['organization:id,name,code', 'creator:id,name'])
                ->orderBy('order_no')
                ->orderBy('id')
                ->get()
                ->map(function (MonitoringActionPlanBudget $item) {
                    $twCalculations = [];

                    for ($i = 1; $i <= 4; $i++) {
                        $paguTw = $item->{"pagu_tw{$i}"};
                        $realTw = $item->{"realisasi_tw{$i}"};

                        $ach = PerformanceMeasurementService::calculateAchievement(
                            $paguTw !== null ? (float) $paguTw : null,
                            $realTw !== null ? (float) $realTw : null,
                            'Positif'
                        );

                        $status = PerformanceMeasurementService::determineStatus(
                            $ach,
                            $paguTw !== null ? (float) $paguTw : null,
                            $realTw !== null ? (float) $realTw : null
                        );

                        $twCalculations["tw{$i}"] = [
                            'achievement' => $ach,
                            'status' => $status['status'],
                            'badge' => $status['badge'],
                            'bgClass' => $status['bgClass'],
                        ];
                    }

                    $item->setAttribute('tw_calculations', $twCalculations);
                    return $item;
                });
        }

        return Inertia::render('Measurement/MonitoringBudget', [
            'items' => $items,
            'organizations' => $organizations,
            'selectedOrgId' => $selectedOrgId,
            'year' => $year,
            'availableYears' => $this->getRpjmdYears(),
            'canManage' => $canManage,
            'userIsSpBappeda' => $isSpBappeda,
        ]);
    }

    public function budgetStore(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'organization_id' => 'required|exists:organizations,id',
            'year' => 'required|integer',
            'order_no' => 'nullable|integer',
            'sasaran_strategis' => 'nullable|string',
            'indikator_sasaran' => 'nullable|string',
            'target_sasaran_tahunan' => 'nullable|numeric',
            'program' => 'nullable|string',
            'kegiatan' => 'nullable|string',
            'subkegiatan' => 'nullable|string',
            'indikator_subkegiatan' => 'nullable|string',
            'satuan' => 'nullable|string',
            'pagu_tahunan' => 'nullable|numeric',
            'pagu_tw1' => 'nullable|numeric',
            'pagu_tw2' => 'nullable|numeric',
            'pagu_tw3' => 'nullable|numeric',
            'pagu_tw4' => 'nullable|numeric',
            'realisasi_tw1' => 'nullable|numeric',
            'realisasi_tw2' => 'nullable|numeric',
            'realisasi_tw3' => 'nullable|numeric',
            'realisasi_tw4' => 'nullable|numeric',
            'penanggung_jawab_utama' => 'nullable|string',
            'pengampu_teknis' => 'nullable|string',
        ]);

        $this->checkOpdAccess($request->user(), (int) $validated['organization_id']);
        $validated['created_by'] = $request->user()->id;

        MonitoringActionPlanBudget::create($validated);
        Cache::flush();

        return redirect()->back()->with('success', 'Data Kinerja Anggaran berhasil ditambahkan.');
    }

    public function budgetUpdate(Request $request, MonitoringActionPlanBudget $item): RedirectResponse
    {
        $this->checkOpdAccess($request->user(), $item->organization_id);

        $validated = $request->validate([
            'order_no' => 'nullable|integer',
            'sasaran_strategis' => 'nullable|string',
            'indikator_sasaran' => 'nullable|string',
            'target_sasaran_tahunan' => 'nullable|numeric',
            'program' => 'nullable|string',
            'kegiatan' => 'nullable|string',
            'subkegiatan' => 'nullable|string',
            'indikator_subkegiatan' => 'nullable|string',
            'satuan' => 'nullable|string',
            'pagu_tahunan' => 'nullable|numeric',
            'pagu_tw1' => 'nullable|numeric',
            'pagu_tw2' => 'nullable|numeric',
            'pagu_tw3' => 'nullable|numeric',
            'pagu_tw4' => 'nullable|numeric',
            'realisasi_tw1' => 'nullable|numeric',
            'realisasi_tw2' => 'nullable|numeric',
            'realisasi_tw3' => 'nullable|numeric',
            'realisasi_tw4' => 'nullable|numeric',
            'penanggung_jawab_utama' => 'nullable|string',
            'pengampu_teknis' => 'nullable|string',
        ]);

        $item->update($validated);
        Cache::flush();

        return redirect()->back()->with('success', 'Data Kinerja Anggaran berhasil diperbarui.');
    }

    public function budgetDestroy(Request $request, MonitoringActionPlanBudget $item): RedirectResponse
    {
        $this->checkOpdAccess($request->user(), $item->organization_id);

        $item->delete();
        Cache::flush();

        return redirect()->back()->with('success', 'Data Kinerja Anggaran berhasil dihapus.');
    }

    public function budgetBatch(Request $request): RedirectResponse
    {
        $orgId = (int) $request->input('organization_id');
        $this->checkOpdAccess($request->user(), $orgId);

        $itemsData = $request->input('items', []);

        foreach ($itemsData as $data) {
            if (!empty($data['id'])) {
                $item = MonitoringActionPlanBudget::find($data['id']);
                if ($item && $item->organization_id === $orgId) {
                    $item->update($data);
                }
            }
        }

        Cache::flush();

        return redirect()->back()->with('success', 'Tabel Monitoring Kinerja Anggaran berhasil disimpan.');
    }

    // =========================================================================
    // EXPORT PDF
    // =========================================================================

    private function enrichIndicators(array $indicators, array $years): array
    {
        return array_map(function ($ind) use ($years) {
            $targets = (array) ($ind['targets'] ?? []);
            $realizations = (array) ($ind['realizations'] ?? []);
            $pattern = (string) ($ind['measurement_pattern'] ?? 'Positif');
            $ind['calculations'] = $this->buildIndicatorCalculations($targets, $realizations, $pattern, $years);
            return $ind;
        }, $indicators);
    }

    private function buildIndicatorCalculations(array $targets, array $realizations, string $pattern, array $years): array
    {
        $calculations = [];
        foreach ($years as $yr) {
            $t = isset($targets[$yr]) && $targets[$yr] !== '' && $targets[$yr] !== null ? (float) $targets[$yr] : null;
            $r = isset($realizations[$yr]) && $realizations[$yr] !== '' && $realizations[$yr] !== null ? (float) $realizations[$yr] : null;
            $ach = PerformanceMeasurementService::calculateAchievement($t, $r, $pattern);
            $status = PerformanceMeasurementService::determineStatus($ach, $t, $r);
            $calculations[$yr] = [
                'target'      => $t,
                'realization' => $r,
                'achievement' => $ach,
                'status'      => $status['status'],
                'badge'       => $status['badge'] ?? '',
                'bgClass'     => $status['bgClass'] ?? '',
            ];
        }
        return $calculations;
    }

    private function buildCalculations(object $item, array $years): array
    {
        $isGoal = ($item->level ?? '') === 'goal';
        $targets = (array) ($isGoal && !empty($item->goal_targets) ? $item->goal_targets : ($item->targets ?? []));
        $realizations = (array) ($isGoal && !empty($item->goal_realizations) ? $item->goal_realizations : ($item->realizations ?? []));
        $pattern = $isGoal && !empty($item->goal_measurement_pattern) ? $item->goal_measurement_pattern : ($item->measurement_pattern ?? 'Positif');

        $calculations = [];
        foreach ($years as $yr) {
            $t = isset($targets[$yr]) && $targets[$yr] !== '' && $targets[$yr] !== null ? (float) $targets[$yr] : null;
            $r = isset($realizations[$yr]) && $realizations[$yr] !== '' && $realizations[$yr] !== null ? (float) $realizations[$yr] : null;
            $ach = PerformanceMeasurementService::calculateAchievement($t, $r, $pattern);
            $status = PerformanceMeasurementService::determineStatus($ach, $t, $r);
            $calculations[$yr] = [
                'target' => $t,
                'realization' => $r,
                'achievement' => $ach,
                'status' => $status['status'],
                'badge' => $status['badge'] ?? '',
                'bgClass' => $status['bgClass'] ?? '',
            ];
        }
        return $calculations;
    }

    private function buildStats(array $items, int $year): array
    {
        $total = 0;
        $tercapai = $perhatian = $kritis = $tidakDinilai = 0;
        $sumAch = 0.0;
        $countAch = 0;
        foreach ($items as $item) {
            $isGoal = ($item->level ?? '') === 'goal';
            $indList = $isGoal
                ? (!empty($item->goal_indicators_list) ? $item->goal_indicators_list : (!empty($item->objective_indicators_list) ? $item->objective_indicators_list : []))
                : (!empty($item->objective_indicators_list) ? $item->objective_indicators_list : (!empty($item->goal_indicators_list) ? $item->goal_indicators_list : []));

            if (empty($indList)) {
                $indList = [
                    [
                        'targets' => $isGoal ? ($item->goal_targets ?? $item->targets ?? []) : ($item->targets ?? []),
                        'realizations' => $isGoal ? ($item->goal_realizations ?? $item->realizations ?? []) : ($item->realizations ?? []),
                        'measurement_pattern' => $isGoal ? ($item->goal_measurement_pattern ?? $item->measurement_pattern ?? 'Positif') : ($item->measurement_pattern ?? 'Positif'),
                        'calculations' => $item->calculations ?? [],
                    ]
                ];
            }

            foreach ($indList as $ind) {
                $total++;
                $calc = $ind['calculations'][$year] ?? ($item->calculations[$year] ?? null);
                $a = $calc['achievement'] ?? null;
                $s = $calc['status'] ?? null;

                if ($a === null || $s === null || $s === 'Tidak Dinilai') {
                    $targets = (array) ($ind['targets'] ?? ($item->targets ?? []));
                    $realizations = (array) ($ind['realizations'] ?? ($item->realizations ?? []));
                    $pattern = (string) ($ind['measurement_pattern'] ?? ($item->measurement_pattern ?? 'Positif'));
                    $tRaw = $targets[$year] ?? null;
                    $rRaw = $realizations[$year] ?? null;
                    if ($tRaw !== null && $tRaw !== '' && $rRaw !== null && $rRaw !== '') {
                        $a = PerformanceMeasurementService::calculateAchievement((float)$tRaw, (float)$rRaw, $pattern);
                        $statusObj = PerformanceMeasurementService::determineStatus($a, (float)$tRaw, (float)$rRaw);
                        $s = $statusObj['status'];
                    }
                }

                if ($a !== null) { $sumAch += $a; $countAch++; }
                if ($s === 'Tercapai') $tercapai++;
                elseif ($s === 'Perlu Perhatian') $perhatian++;
                elseif ($s === 'Kritis') $kritis++;
                elseif ($s === 'Tidak Dinilai') $tidakDinilai++;
                elseif ($s !== null) $kritis++;
                else $tidakDinilai++;
            }
        }
        return [
            'total' => $total,
            'tercapai' => $tercapai,
            'perhatian' => $perhatian,
            'kritis' => $kritis,
            'tidak_dinilai' => $tidakDinilai,
            'avg' => $countAch > 0 ? round($sumAch / $countAch, 1) : 0,
        ];
    }

    public function rpjmdExportPdf(Request $request): \Symfony\Component\HttpFoundation\Response
    {
        $currentYear = (int) ($request->input('year', date('Y')));
        $periodId = $request->filled('period_id') ? (int) $request->input('period_id') : null;
        $selectedPeriod = null;
        $years = $this->getRpjmdYears($periodId, $selectedPeriod);

        $goals = RealizationRpjmdItem::goals()
            ->with(['children' => fn($q) => $q->orderBy('order_no')->orderBy('id')])
            ->orderBy('id')
            ->get()
            ->map(function ($goal) use ($years) {
                $goal->setAttribute('calculations', $this->buildCalculations($goal, $years));
                $goal->setAttribute('goal_indicators_list', $this->enrichIndicators($goal->goal_indicators_list, $years));
                $goal->children->each(function ($child) use ($years) {
                    $child->setAttribute('calculations', $this->buildCalculations($child, $years));
                    $child->setAttribute('objective_indicators_list', $this->enrichIndicators($child->objective_indicators_list, $years));
                });
                return $goal;
            });

        // Group into hierarchical array with number_code restarting per mission
        $items = [];
        $goalsByMission = [];
        foreach ($goals as $goal) {
            $mKey = trim($goal->mission ?: 'Misi RPJMD');
            $goalsByMission[$mKey][] = $goal;
        }

        foreach ($goalsByMission as $missionName => $missionGoals) {
            $gIdx = 1;
            foreach ($missionGoals as $goal) {
                $goal->number_code = "({$gIdx})";
                $items[] = $goal;
                $oIdx = 1;
                foreach ($goal->children as $child) {
                    $child->number_code = "({$gIdx}.{$oIdx})";
                    $items[] = $child;
                    $oIdx++;
                }
                $gIdx++;
            }
        }

        // If no goals found (fallback), load all items
        if (empty($items)) {
            $items = RealizationRpjmdItem::orderBy('id')->get()
                ->map(function ($item, $idx) use ($years) {
                    $item->number_code = '(' . ($idx + 1) . ')';
                    $item->setAttribute('calculations', $this->buildCalculations($item, $years));
                    return $item;
                })->all();
        }

        // For summary stats, evaluate child objectives, or goal if no children
        $statsItems = [];
        foreach ($goals as $goal) {
            if ($goal->children && count($goal->children) > 0) {
                foreach ($goal->children as $child) {
                    $statsItems[] = $child;
                }
            } else {
                $statsItems[] = $goal;
            }
        }
        if (empty($statsItems)) {
            $statsItems = $items;
        }

        $stats = $this->buildStats($statsItems, $currentYear);
        $pdf = Pdf::loadView('pdf.measurement-rpjmd', [
            'goals'       => $goals,
            'items'       => $items,
            'currentYear' => $currentYear,
            'stats'       => $stats,
            'years'       => $years,
            'generatedAt' => now()->format('d/m/Y H:i'),
        ])->setPaper('a4', 'landscape');
        return $pdf->download("realisasi-rpjmd-{$currentYear}.pdf");
    }

    public function ikuExportPdf(Request $request): \Symfony\Component\HttpFoundation\Response
    {
        $currentYear = (int) ($request->input('year', date('Y')));
        $periodId = $request->filled('period_id') ? (int) $request->input('period_id') : null;
        $selectedPeriod = null;
        $years = $this->getRpjmdYears($periodId, $selectedPeriod);

        $ikuFinals = \App\Models\Indicator::query()
            ->iku()
            ->final()
            ->with(['measurementUnit:id,symbol,name', 'targets:id,indicator_version_id,year,target_value'])
            ->when($periodId, fn ($q) => $q->byPeriod($periodId))
            ->orderBy('level')
            ->orderBy('name')
            ->get();

        if ($ikuFinals->isNotEmpty()) {
            $existingRealizations = Schema::hasTable('iku_realizations')
                ? IkuRealization::query()
                    ->whereIn('indicator_id', $ikuFinals->pluck('id'))
                    ->whereIn('year', $years)
                    ->get()
                    ->groupBy('indicator_id')
                    ->map(fn ($items) => $items->keyBy('year'))
                : collect();

            $items = $ikuFinals->map(function ($iku) use ($years, $existingRealizations) {
                $realizationsForIku = $existingRealizations->get($iku->id, collect());
                $calculations = [];
                foreach ($years as $yr) {
                    $target = (float) ($iku->targets->firstWhere('year', $yr)?->target_value ?? 0);
                    $real = $realizationsForIku->get($yr);
                    $realVal = $real?->realization_value !== null ? (float) $real->realization_value : null;
                    $ach = $real?->capaian;
                    if ($ach === null && $realVal !== null) {
                        $ach = PerformanceMeasurementService::calculateAchievement($target, $realVal, $iku->polarization ?? 'positif');
                    }
                    $status = 'Tidak Dinilai';
                    if ($ach !== null) {
                        if ($ach >= 100) $status = 'Tercapai';
                        elseif ($ach >= 50) $status = 'Perlu Perhatian';
                        else $status = 'Kritis';
                    }
                    $calculations[$yr] = [
                        'target' => $target ?: null,
                        'realization' => $realVal,
                        'achievement' => $ach,
                        'status' => $status,
                    ];
                }

                $obj = new \stdClass();
                $obj->indicator_name = $iku->name;
                $obj->unit = $iku->measurementUnit?->symbol ?? $iku->measurementUnit?->name ?? '-';
                $obj->measurement_pattern = ucfirst($iku->polarization ?? 'positif');
                $obj->calculations = $calculations;
                return $obj;
            })->all();
        } else {
            $items = RealizationIkuItem::orderBy('id')->get()
                ->map(function ($item) use ($years) {
                    $item->setAttribute('calculations', $this->buildCalculations($item, $years));
                    return $item;
                })->all();
        }

        $stats = $this->buildStats($items, $currentYear);
        $pdf = Pdf::loadView('pdf.measurement-iku', [
            'items' => $items, 'currentYear' => $currentYear,
            'stats' => $stats, 'years' => $years,
            'generatedAt' => now()->format('d/m/Y H:i'),
        ])->setPaper('a4', 'landscape');
        return $pdf->download("realisasi-iku-pemda-{$currentYear}.pdf");
    }

    public function opdExportPdf(Request $request): \Symfony\Component\HttpFoundation\Response
    {
        $currentYear = (int) ($request->input('year', date('Y')));
        $periodId = $this->parseIntegerInput($request, 'period_id');
        $selectedPeriod = null;
        $years = $this->getRpjmdYears($periodId, $selectedPeriod);

        $user = $request->user();
        $orgId = $this->parseIntegerInput($request, 'organization_id');
        $organization = $orgId ? Organization::find($orgId) : null;

        $goalsQuery = RealizationOpdItem::goals()
            ->with([
                'organization:id,name,code',
                'children' => fn ($q) => $q->orderBy('order_no')->orderBy('id'),
            ])
            ->orderBy('organization_id')
            ->orderBy('id');

        if ($orgId) {
            $this->checkOpdViewAccess($user, $orgId);
            $goalsQuery->where('organization_id', $orgId);
        } elseif (!$this->isSpBappeda($user)) {
            $accessibleIds = $this->authorization->accessibleOrganizationIds($user);
            $goalsQuery->whereIn('organization_id', $accessibleIds);
        }

        $goals = $goalsQuery->get()->map(function ($goal) use ($years) {
            $goal->setAttribute('calculations', $this->buildCalculations($goal, $years));
            $goal->setAttribute('goal_indicators_list', $this->enrichIndicators($goal->goal_indicators_list, $years));
            $goal->children->each(function ($child) use ($years) {
                $child->setAttribute('calculations', $this->buildCalculations($child, $years));
                $child->setAttribute('objective_indicators_list', $this->enrichIndicators($child->objective_indicators_list, $years));
            });
            return $goal;
        });

        // Group into hierarchical array with number_code
        $items = [];
        $gIdx = 1;
        foreach ($goals as $goal) {
            $goal->number_code = "({$gIdx})";
            $items[] = $goal;
            $oIdx = 1;
            foreach ($goal->children as $child) {
                $child->number_code = "({$gIdx}.{$oIdx})";
                $items[] = $child;
                $oIdx++;
            }
            $gIdx++;
        }

        // If no goals found (fallback), load all items
        if (empty($items)) {
            $query = RealizationOpdItem::with('organization:id,name,code')->orderBy('organization_id')->orderBy('id');
            if ($orgId) {
                $query->where('organization_id', (int) $orgId);
            } elseif (!$this->isSpBappeda($user)) {
                $accessibleIds = $this->authorization->accessibleOrganizationIds($user);
                $query->whereIn('organization_id', $accessibleIds);
            }
            $items = $query->get()
                ->map(function ($item, $idx) use ($years) {
                    $item->number_code = '(' . ($idx + 1) . ')';
                    $item->setAttribute('calculations', $this->buildCalculations($item, $years));
                    return $item;
                })->all();
        }

        // For summary stats, evaluate child objectives, or goal if no children
        $statsItems = [];
        foreach ($goals as $goal) {
            if ($goal->children && count($goal->children) > 0) {
                foreach ($goal->children as $child) {
                    $statsItems[] = $child;
                }
            } else {
                $statsItems[] = $goal;
            }
        }
        if (empty($statsItems)) {
            $statsItems = $items;
        }

        $stats = $this->buildStats($statsItems, $currentYear);
        $pdf = Pdf::loadView('pdf.measurement-opd', [
            'goals'        => $goals,
            'items'        => $items,
            'currentYear'  => $currentYear,
            'organization' => $organization,
            'stats'        => $stats,
            'years'        => $years,
            'generatedAt'  => now()->format('d/m/Y H:i'),
        ])->setPaper('a4', 'landscape');
        $slug = $organization ? '-' . str()->slug($organization->code ?? 'opd') : '';
        return $pdf->download("realisasi-kinerja-opd{$slug}-{$currentYear}.pdf");
    }

    public function outputExportPdf(Request $request): \Symfony\Component\HttpFoundation\Response
    {
        $currentYear = (int) ($request->input('year', date('Y')));
        $user = $request->user();
        $orgId = $this->parseIntegerInput($request, 'organization_id');
        $query = MonitoringActionPlanOutput::orderBy('organization_id')->orderBy('id')
            ->where('year', $currentYear);
        if ($orgId) {
            $this->checkOpdViewAccess($user, $orgId);
            $query->where('organization_id', $orgId);
        } elseif (!$this->isSpBappeda($user)) {
            $accessibleIds = $this->authorization->accessibleOrganizationIds($user);
            $query->whereIn('organization_id', $accessibleIds);
        }
        $organization = $orgId ? Organization::find($orgId) : null;
        $items = $query->get()->all();
        $totalCapaian = 0; $countC = 0;
        foreach ($items as $item) {
            $t4 = $item->target_tw4 ?? null;
            $r4 = $item->realisasi_tw4 ?? $item->realization_tw4 ?? null;
            if ($t4 !== null && $t4 > 0 && $r4 !== null) {
                $c = $item->measurement_pattern === 'Negatif' ? (2 - $r4/$t4)*100 : $r4/$t4*100;
                $totalCapaian += $c; $countC++;
            }
        }
        $stats = ['avg' => $countC > 0 ? round($totalCapaian/$countC, 1) : 0];
        $pdf = Pdf::loadView('pdf.measurement-output', [
            'items' => $items, 'currentYear' => $currentYear, 'organization' => $organization,
            'stats' => $stats, 'generatedAt' => now()->format('d/m/Y H:i'),
        ])->setPaper('a4', 'landscape');
        $slug = $organization ? '-' . str()->slug($organization->code ?? 'opd') : '';
        return $pdf->download("monitoring-output{$slug}-{$currentYear}.pdf");
    }

    public function budgetExportPdf(Request $request): \Symfony\Component\HttpFoundation\Response
    {
        $currentYear = (int) ($request->input('year', date('Y')));
        $user = $request->user();
        $orgId = $this->parseIntegerInput($request, 'organization_id');
        $query = MonitoringActionPlanBudget::orderBy('organization_id')->orderBy('id')
            ->where('year', $currentYear);
        if ($orgId) {
            $this->checkOpdViewAccess($user, $orgId);
            $query->where('organization_id', $orgId);
        } elseif (!$this->isSpBappeda($user)) {
            $accessibleIds = $this->authorization->accessibleOrganizationIds($user);
            $query->whereIn('organization_id', $accessibleIds);
        }
        $organization = $orgId ? Organization::find($orgId) : null;
        $items = $query->get()->all();
        $totalSerapan = 0; $countS = 0;
        foreach ($items as $item) {
            $pagu = $item->pagu_tahunan ?? $item->annual_budget ?? null;
            $r4 = $item->realisasi_tw4 ?? $item->realization_tw4 ?? null;
            if ($pagu && $pagu > 0 && $r4 !== null) { $totalSerapan += $r4/$pagu*100; $countS++; }
        }
        $stats = ['avg' => $countS > 0 ? round($totalSerapan/$countS, 1) : 0];
        $pdf = Pdf::loadView('pdf.measurement-budget', [
            'items' => $items, 'currentYear' => $currentYear, 'organization' => $organization,
            'stats' => $stats, 'generatedAt' => now()->format('d/m/Y H:i'),
        ])->setPaper('a4', 'landscape');
        $slug = $organization ? '-' . str()->slug($organization->code ?? 'opd') : '';
        return $pdf->download("monitoring-anggaran{$slug}-{$currentYear}.pdf");
    }
}
