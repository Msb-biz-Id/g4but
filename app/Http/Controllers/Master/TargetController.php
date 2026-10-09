<?php

namespace App\Http\Controllers\Master;

use App\Http\Controllers\Controller;
use App\Models\Indicator;
use App\Models\IndicatorTarget;
use App\Models\Organization;
use App\Models\PlanningPeriod;
use App\Services\AuditService;
use App\Services\AuthorizationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class TargetController extends Controller
{
    public function __construct(
        private readonly AuthorizationService $authorization,
        private readonly AuditService $audit,
    ) {}

    public function index(Request $request): Response
    {
        $this->authorize('view-targets');

        $user = $request->user();
        $isProvincialAdmin = $user && $user->roles()->whereIn('name', ['Super Admin', 'Admin Provinsi'])->exists();
        $accessibleOrgIds = $this->authorization->accessibleOrganizationIds($user);

        if ($request->filled('organization_id') && ! $isProvincialAdmin && ! in_array($request->integer('organization_id'), $accessibleOrgIds, true)) {
            abort(403, 'Di luar lingkup organisasi Anda.');
        }

        $filters = $request->only(['period_id', 'organization_id']);

        $targets = IndicatorTarget::query()
            ->with([
                'indicatorVersion:id,indicator_id,name,version_number,measurement_unit_id,direction',
                'indicatorVersion.measurementUnit:id,code,name,symbol',
                'indicatorVersion.indicator:id,code,status',
                'organization:id,code,name',
                'planningPeriod:id,code,name,year',
            ])
            ->when(! $isProvincialAdmin, fn ($q) => $q->whereIn('organization_id', $accessibleOrgIds))
            ->when($request->filled('period_id'), fn ($q) => $q->where('planning_period_id', $request->integer('period_id')))
            ->when($request->filled('organization_id'), fn ($q) => $q->where('organization_id', $request->integer('organization_id')))
            ->latest('id')
            ->paginate($request->integer('per_page', 25))
            ->withQueryString();

        return Inertia::render('Targets/Index', [
            'targets' => $targets,
            'filters' => $filters,
            'periods' => PlanningPeriod::query()->orderByDesc('year')->get(['id', 'code', 'name', 'year']),
            'organizations' => Organization::query()
                ->whereIn('id', $accessibleOrgIds)
                ->orderBy('code')
                ->get(['id', 'code', 'name']),
        ]);
    }

    public function create(Request $request): Response
    {
        $this->authorize('manage-targets');

        $organizationId = $request->integer('organization_id');
        $periodId = $request->integer('period_id');

        $accessibleOrgIds = $this->authorization->accessibleOrganizationIds($request->user());
        $isProvincialAdmin = $this->authorization->isProvincialAdmin($request->user());

        $organizations = Organization::query()
            ->whereIn('id', $accessibleOrgIds)
            ->orderBy('code')
            ->get(['id', 'code', 'name']);

        $periods = PlanningPeriod::query()->orderByDesc('year')->get(['id', 'code', 'name', 'year']);

        $indicators = Indicator::query()
            ->where('status', 'active')
            ->when(! $isProvincialAdmin, function ($q) use ($accessibleOrgIds) {
                $q->where(function ($sub) use ($accessibleOrgIds) {
                    $sub->whereIn('owner_organization_id', $accessibleOrgIds)
                        ->orWhereNull('owner_organization_id');
                });
            })
            ->with('currentVersion:id,indicator_id,version_number,name,direction,measurement_unit_id')
            ->with('currentVersion.measurementUnit:id,code,name,symbol')
            ->orderBy('code')
            ->get(['id', 'code']);

        return Inertia::render('Targets/Create', [
            'organizations' => $organizations,
            'periods' => $periods,
            'indicators' => $indicators,
            'preselectedOrganizationId' => $organizationId ?: null,
            'preselectedPeriodId' => $periodId ?: null,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorize('manage-targets');

        $validated = $request->validate([
            'indicator_version_id' => ['required', 'integer', 'exists:indicator_versions,id'],
            'organization_id' => ['required', 'integer', 'exists:organizations,id'],
            'planning_period_id' => ['required', 'integer', 'exists:planning_periods,id'],
            'target_value' => ['required', 'numeric'],
        ]);

        $this->authorization->canAccessOrganization($request->user(), (int) $validated['organization_id'])
            ?: abort(403, 'Di luar lingkup organisasi Anda.');

        DB::transaction(function () use ($validated) {
            $target = IndicatorTarget::create($validated);
            $this->audit->log('create', 'indicator_target', $target->id, (int) $validated['organization_id']);
        });

        return redirect()
            ->route('targets.index', ['period_id' => $validated['planning_period_id']])
            ->with('success', 'Target indikator berhasil dibuat.');
    }

    public function update(Request $request, IndicatorTarget $target): RedirectResponse
    {
        $this->authorize('manage-targets');

        $user = $request->user();
        $isProvincialAdmin = $user && $user->roles()->whereIn('name', ['Super Admin', 'Admin Provinsi'])->exists();

        $this->authorization->canAccessOrganization($user, $target->organization_id)
            ?: abort(403, 'Di luar lingkup organisasi Anda.');

        if ($target->status === 'locked' && ! $isProvincialAdmin) {
            abort(403, 'Target yang sudah dikunci tidak dapat diubah.');
        }

        $validated = $request->validate([
            'target_value' => ['required', 'numeric'],
            'status' => ['required', 'string', 'max:20', Rule::in(['draft', 'approved', 'locked'])],
        ]);

        if ($validated['status'] === 'locked' && ! $isProvincialAdmin) {
            abort(403, 'Hanya Administrator Provinsi yang dapat mengunci target indikator.');
        }

        DB::transaction(function () use ($validated, $target, $request) {
            $target->update([
                ...$validated,
                'approved_by' => $validated['status'] === 'approved' ? $request->user()->id : null,
                'approved_at' => $validated['status'] === 'approved' ? now() : null,
            ]);

            $this->audit->log('update', 'indicator_target', $target->id, $target->organization_id);
        });

        return back()->with('success', 'Target diperbarui.');
    }
}
