<?php

namespace App\Http\Controllers\Master;

use App\Http\Controllers\Controller;
use App\Models\Indicator;
use App\Models\Organization;
use App\Models\PlanningPeriod;
use App\Models\StrategicGoal;
use App\Models\StrategicObjective;
use App\Services\AuditService;
use App\Services\AuthorizationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class GoalController extends Controller
{
    public function __construct(
        private readonly AuthorizationService $authorization,
        private readonly AuditService $audit,
    ) {}

    public function index(Request $request): Response
    {
        $this->authorize('view-goals');

        $user = $request->user();
        $isProvincialAdmin = $user && $user->roles()->whereIn('name', ['Super Admin', 'Admin Provinsi'])->exists();
        $accessibleOrgIds = $this->authorization->accessibleOrganizationIds($user);

        if ($request->filled('organization_id') && ! $isProvincialAdmin && ! in_array($request->integer('organization_id'), $accessibleOrgIds, true)) {
            abort(403, 'Di luar lingkup organisasi Anda.');
        }

        $goals = StrategicGoal::query()
            ->withCount('objectives')
            ->with(['objectives', 'planningPeriod:id,code,name,year', 'organization:id,code,name'])
            ->when(! $isProvincialAdmin, fn ($query) => $query->whereIn('organization_id', $accessibleOrgIds))
            ->when($request->filled('period_id'), function ($query) use ($request) {
                $query->where('planning_period_id', $request->integer('period_id'));
            })
            ->when($request->filled('organization_id'), function ($query) use ($request) {
                $query->where('organization_id', $request->integer('organization_id'));
            })
            ->latest('id')
            ->paginate($request->integer('per_page', 25))
            ->withQueryString();

        return Inertia::render('Goals/Index', [
            'goals' => $goals,
            'filters' => $request->only(['period_id', 'organization_id']),
            'periods' => PlanningPeriod::query()->orderByDesc('year')->get(['id', 'code', 'name', 'year']),
            'organizations' => Organization::query()
                ->whereIn('id', $accessibleOrgIds)
                ->orderBy('code')
                ->get(['id', 'code', 'name']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorize('manage-goals');

        $validated = $request->validate([
            'planning_period_id' => ['required', 'integer', 'exists:planning_periods,id'],
            'organization_id' => ['required', 'integer', 'exists:organizations,id'],
            'code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('strategic_goals', 'code')
                    ->where(fn ($query) => $query
                        ->where('planning_period_id', $request->input('planning_period_id'))
                        ->where('organization_id', $request->input('organization_id'))
                    ),
            ],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ], [
            'planning_period_id.required' => 'Periode perencanaan wajib dipilih.',
            'planning_period_id.exists' => 'Periode perencanaan yang dipilih tidak valid.',
            'organization_id.required' => 'Perangkat Daerah (OPD) wajib dipilih.',
            'organization_id.exists' => 'Perangkat Daerah (OPD) yang dipilih tidak valid.',
            'code.required' => 'Kode tujuan wajib diisi.',
            'code.unique' => 'Kode tujuan sudah digunakan pada periode dan OPD ini.',
            'name.required' => 'Nama tujuan wajib diisi.',
        ]);

        $this->authorization->canAccessOrganization($request->user(), (int) $validated['organization_id'])
            ?: abort(403, 'Di luar lingkup organisasi Anda.');

        DB::transaction(function () use ($validated) {
            $goal = StrategicGoal::create($validated);
            $this->audit->log('create', 'strategic_goal', $goal->id, (int) $validated['organization_id']);
        });

        return redirect()->route('goals.index')->with('success', 'Tujuan berhasil dibuat.');
    }

    public function update(Request $request, StrategicGoal $goal): RedirectResponse
    {
        $this->authorize('manage-goals');

        $this->authorization->canAccessOrganization($request->user(), (int) $goal->organization_id)
            ?: abort(403, 'Di luar lingkup organisasi Anda.');

        $validated = $request->validate([
            'code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('strategic_goals', 'code')
                    ->where(fn ($query) => $query
                        ->where('planning_period_id', $goal->planning_period_id)
                        ->where('organization_id', $goal->organization_id)
                    )
                    ->ignore($goal->id),
            ],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ], [
            'code.required' => 'Kode tujuan wajib diisi.',
            'code.unique' => 'Kode tujuan sudah digunakan pada periode dan OPD ini.',
            'name.required' => 'Nama tujuan wajib diisi.',
        ]);

        DB::transaction(function () use ($validated, $goal) {
            $goal->update($validated);
            $this->audit->log('update', 'strategic_goal', $goal->id, $goal->organization_id);
        });

        return back()->with('success', 'Tujuan diperbarui.');
    }

    public function destroy(Request $request, StrategicGoal $goal): RedirectResponse
    {
        $this->authorize('manage-goals');

        $this->authorization->canAccessOrganization($request->user(), (int) $goal->organization_id)
            ?: abort(403, 'Di luar lingkup organisasi Anda.');

        if ($goal->objectives()->exists()) {
            return back()->with('error', 'Tujuan tidak dapat dihapus karena masih memiliki sasaran strategis. Hapus sasaran terlebih dahulu.');
        }

        if (Indicator::where('strategic_goal_id', $goal->id)->exists()) {
            return back()->with('error', 'Tujuan tidak dapat dihapus karena masih terhubung dengan indikator kinerja (IKU).');
        }

        DB::transaction(function () use ($goal) {
            $goalId = $goal->id;
            $orgId = $goal->organization_id;
            $goal->delete();
            $this->audit->log('delete', 'strategic_goal', $goalId, $orgId);
        });

        return back()->with('success', 'Tujuan berhasil dihapus.');
    }

    public function storeObjective(Request $request, StrategicGoal $goal): RedirectResponse
    {
        $this->authorize('manage-goals');

        $this->authorization->canAccessOrganization($request->user(), (int) $goal->organization_id)
            ?: abort(403, 'Di luar lingkup organisasi Anda.');

        $validated = $request->validate([
            'code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('strategic_objectives', 'code')
                    ->where(fn ($query) => $query->where('strategic_goal_id', $goal->id)),
            ],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ], [
            'code.required' => 'Kode sasaran wajib diisi.',
            'code.unique' => 'Kode sasaran sudah digunakan pada tujuan ini.',
            'name.required' => 'Nama sasaran wajib diisi.',
        ]);

        DB::transaction(function () use ($validated, $goal) {
            $objective = StrategicObjective::create([
                ...$validated,
                'strategic_goal_id' => $goal->id,
            ]);

            $this->audit->log('create', 'strategic_objective', $objective->id, $goal->organization_id);
        });

        return redirect()->route('goals.index')->with('success', 'Sasaran berhasil ditambahkan.');
    }

    public function updateObjective(Request $request, StrategicGoal $goal, StrategicObjective $objective): RedirectResponse
    {
        $this->authorize('manage-goals');

        $this->authorization->canAccessOrganization($request->user(), (int) $goal->organization_id)
            ?: abort(403, 'Di luar lingkup organisasi Anda.');

        if ($objective->strategic_goal_id !== $goal->id) {
            abort(404);
        }

        $validated = $request->validate([
            'code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('strategic_objectives', 'code')
                    ->where(fn ($query) => $query->where('strategic_goal_id', $goal->id))
                    ->ignore($objective->id),
            ],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ], [
            'code.required' => 'Kode sasaran wajib diisi.',
            'code.unique' => 'Kode sasaran sudah digunakan pada tujuan ini.',
            'name.required' => 'Nama sasaran wajib diisi.',
        ]);

        DB::transaction(function () use ($validated, $objective, $goal) {
            $objective->update($validated);
            $this->audit->log('update', 'strategic_objective', $objective->id, $goal->organization_id);
        });

        return back()->with('success', 'Sasaran diperbarui.');
    }

    public function destroyObjective(Request $request, StrategicGoal $goal, StrategicObjective $objective): RedirectResponse
    {
        $this->authorize('manage-goals');

        $this->authorization->canAccessOrganization($request->user(), (int) $goal->organization_id)
            ?: abort(403, 'Di luar lingkup organisasi Anda.');

        if ($objective->strategic_goal_id !== $goal->id) {
            abort(404);
        }

        DB::transaction(function () use ($objective, $goal) {
            $objective->delete();
            $this->audit->log('delete', 'strategic_objective', $objective->id, $goal->organization_id);
        });

        return back()->with('success', 'Sasaran dihapus.');
    }
}
