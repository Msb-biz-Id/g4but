<?php

namespace App\Http\Controllers\Master;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\OrganizationUnit;
use App\Services\AuditService;
use App\Services\AuthorizationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class OrganizationController extends Controller
{
    public function __construct(
        private readonly AuthorizationService $authorization,
        private readonly AuditService $audit,
    ) {}

    public function index(Request $request): Response
    {
        $this->authorize('view-organizations');

        $user = $request->user();
        $isOpdAdmin = $user && $user->isOpdAdmin();
        $accessibleOrgIds = $this->authorization->accessibleOrganizationIds($user);

        $organizations = Organization::query()
            ->withCount('units')
            ->withCount('users')
            ->with('parent:id,code,name')
            ->when(! $isOpdAdmin, fn ($q) => $q->whereIn('id', $accessibleOrgIds))
            ->when($request->filled('search'), function ($query) use ($request) {
                $query->where(fn ($q) => $q
                    ->where('name', 'like', "%{$request->string('search')}%")
                    ->orWhere('code', 'like', "%{$request->string('search')}%"));
            })
            ->when($request->filled('type'), function ($query) use ($request) {
                $query->where('type', $request->string('type'));
            })
            ->orderByRaw("CASE type WHEN 'opd' THEN 1 WHEN 'sekretariat' THEN 2 WHEN 'bidang' THEN 3 ELSE 4 END")
            ->orderBy('name')
            ->paginate($request->integer('per_page', 25))
            ->withQueryString();

        return Inertia::render('Organizations/Index', [
            'organizations' => $organizations,
            'filters' => $request->only(['search', 'type']),
        ]);
    }

    public function create(): Response
    {
        $this->authorize('manage-organizations');

        return Inertia::render('Organizations/Create', [
            'parents' => Organization::query()
                ->where('type', 'opd')
                ->orderBy('name')
                ->get(['id', 'code', 'name', 'short_name']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorize('manage-organizations');

        $validated = $request->validate([
            'code' => ['required', 'string', 'max:50', Rule::unique('organizations', 'code')],
            'name' => ['required', 'string', 'max:200'],
            'short_name' => ['nullable', 'string', 'max:100'],
            'type' => ['required', 'string', 'max:30', Rule::in(['opd', 'sekretariat', 'bidang'])],
            'parent_id' => ['nullable', 'integer', 'exists:organizations,id'],
            'address' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:100'],
            'is_active' => ['boolean'],
        ]);

        // Aturan hirarki: Kedalaman maksimum 2, hanya root (opd) yang boleh jadi parent sekretariat/bidang
        if ($validated['type'] === 'opd') {
            $validated['parent_id'] = null;
        } else {
            if (empty($validated['parent_id'])) {
                return back()->withErrors(['parent_id' => 'Unit Sekretariat / Bidang wajib memilih OPD Induk sebagai induk.']);
            }
            $parent = Organization::find($validated['parent_id']);
            if (! $parent || $parent->type !== 'opd') {
                return back()->withErrors(['parent_id' => 'Induk organisasi harus bertipe OPD Induk.']);
            }
        }

        $organization = DB::transaction(function () use ($validated) {
            $organization = Organization::create([
                ...collect($validated)->except(['is_active', 'parent_id', 'short_name'])->all(),
                'parent_id' => ! empty($validated['parent_id']) ? (int) $validated['parent_id'] : null,
                'short_name' => ! empty($validated['short_name']) ? trim($validated['short_name']) : null,
                'is_active' => $validated['is_active'] ?? true,
            ]);

            $this->audit->log('create', 'organization', $organization->id);

            return $organization;
        });

        return redirect()
            ->route('organizations.index')
            ->with('success', "Organisasi {$organization->name} berhasil dibuat.");
    }

    public function show(Organization $organization): Response
    {
        $this->authorize('view-organizations');

        $organization->load([
            'parent:id,code,name',
            'children:id,code,name,type,parent_id',
            'units' => fn ($q) => $q->orderBy('code'),
            'users' => fn ($q) => $q->select(['users.id', 'users.name', 'users.email', 'users.employee_number'])->with('roles:id,name'),
        ]);

        return Inertia::render('Organizations/Show', [
            'organization' => $organization,
        ]);
    }

    public function edit(Request $request, Organization $organization): Response
    {
        $user = $request->user();
        $isManager = $user && $user->can('manage-organizations');

        if (! $isManager) {
            $this->authorize('edit-organization-profile', $organization);
        }

        return Inertia::render('Organizations/Edit', [
            'organization' => $organization->load('parent'),
            'parents' => Organization::query()
                ->where('type', 'opd')
                ->where('id', '!=', $organization->id)
                ->orderBy('name')
                ->get(['id', 'code', 'name', 'short_name']),
            'isProvincialAdmin' => $isManager,
        ]);
    }

    public function update(Request $request, Organization $organization): RedirectResponse
    {
        $user = $request->user();
        $isManager = $user && $user->can('manage-organizations');

        if ($isManager) {
            $validated = $request->validate([
                'code' => ['required', 'string', 'max:50', Rule::unique('organizations', 'code')->ignore($organization->id)],
                'name' => ['required', 'string', 'max:200'],
                'short_name' => ['nullable', 'string', 'max:100'],
                'type' => ['required', 'string', 'max:30', Rule::in(['opd', 'sekretariat', 'bidang'])],
                'parent_id' => ['nullable', 'integer', 'exists:organizations,id'],
                'address' => ['nullable', 'string', 'max:255'],
                'phone' => ['nullable', 'string', 'max:30'],
                'email' => ['nullable', 'email', 'max:100'],
                'is_active' => ['boolean'],
            ]);

            $parentId = ! empty($validated['parent_id']) ? (int) $validated['parent_id'] : null;
            if ($parentId && $organization->id === $parentId) {
                return back()->withErrors(['parent_id' => 'Organisasi tidak dapat menjadi induk dirinya sendiri.']);
            }

            if ($validated['type'] === 'opd') {
                $parentId = null;
            } else {
                if (empty($parentId)) {
                    return back()->withErrors(['parent_id' => 'Unit Sekretariat / Bidang wajib memilih OPD Induk sebagai induk.']);
                }
                $parent = Organization::find($parentId);
                if (! $parent || $parent->type !== 'opd') {
                    return back()->withErrors(['parent_id' => 'Induk organisasi harus bertipe OPD Induk.']);
                }
            }

            DB::transaction(function () use ($validated, $organization, $parentId) {
                $organization->update([
                    ...collect($validated)->except(['is_active', 'parent_id', 'short_name'])->all(),
                    'parent_id' => $parentId,
                    'short_name' => ! empty($validated['short_name']) ? trim($validated['short_name']) : null,
                    'is_active' => $validated['is_active'] ?? false,
                ]);

                $this->audit->log('update', 'organization', $organization->id);
            });
        } else {
            $this->authorize('edit-organization-profile', $organization);

            $validated = $request->validate([
                'address' => ['nullable', 'string', 'max:255'],
                'phone' => ['nullable', 'string', 'max:30'],
                'email' => ['nullable', 'email', 'max:100'],
            ]);

            DB::transaction(function () use ($validated, $organization) {
                $organization->update($validated);
                $this->audit->log('update_profile', 'organization', $organization->id);
            });
        }

        return redirect()
            ->route('organizations.index')
            ->with('success', "Organisasi {$organization->name} berhasil diperbarui.");
    }

    public function storeUnit(Request $request, Organization $organization): RedirectResponse
    {
        $this->authorize('edit-organization-profile', $organization);

        $validated = $request->validate([
            'code' => ['required', 'string', 'max:50', Rule::unique('organization_units', 'code')->where('organization_id', $organization->id)],
            'name' => ['required', 'string', 'max:200'],
            'parent_id' => ['nullable', 'integer', 'exists:organization_units,id'],
            'unit_type' => ['nullable', 'string', 'max:30'],
            'is_active' => ['boolean'],
        ]);

        DB::transaction(function () use ($validated, $organization) {
            OrganizationUnit::create([
                ...$validated,
                'organization_id' => $organization->id,
                'is_active' => $validated['is_active'] ?? true,
            ]);

            $this->audit->log('create', 'organization_unit', null, $organization->id);
        });

        return back()->with('success', 'Unit kerja berhasil ditambahkan.');
    }

    public function updateUnit(Request $request, Organization $organization, OrganizationUnit $unit): RedirectResponse
    {
        $this->authorize('edit-organization-profile', $organization);

        $validated = $request->validate([
            'code' => ['required', 'string', 'max:50', Rule::unique('organization_units', 'code')->where('organization_id', $organization->id)->ignore($unit->id)],
            'name' => ['required', 'string', 'max:200'],
            'parent_id' => ['nullable', 'integer', 'exists:organization_units,id'],
            'unit_type' => ['nullable', 'string', 'max:30'],
            'is_active' => ['boolean'],
        ]);

        DB::transaction(function () use ($validated, $unit, $organization) {
            $unit->update($validated);
            $this->audit->log('update', 'organization_unit', $unit->id, $organization->id);
        });

        return back()->with('success', 'Unit kerja berhasil diperbarui.');
    }

    public function destroyUnit(Organization $organization, OrganizationUnit $unit): RedirectResponse
    {
        $this->authorize('edit-organization-profile', $organization);

        DB::transaction(function () use ($unit, $organization) {
            $unitId = $unit->id;
            $unit->delete();
            $this->audit->log('delete', 'organization_unit', $unitId, $organization->id);
        });

        return back()->with('success', 'Unit kerja berhasil dihapus.');
    }

    public function destroy(Organization $organization): RedirectResponse
    {
        $this->authorize('manage-organizations');

        if ($organization->children()->exists()) {
            return back()->withErrors(['delete' => 'Organisasi tidak dapat dihapus karena masih memiliki unit di bawahnya.']);
        }

        DB::transaction(function () use ($organization) {
            $orgId = $organization->id;
            $name = $organization->name;
            $organization->delete();
            $this->audit->log('delete', 'organization', $orgId);
        });

        return redirect()
            ->route('organizations.index')
            ->with('success', "Organisasi {$organization->name} berhasil dihapus.");
    }
}
