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

        $organizations = Organization::query()
            ->withCount('units')
            ->withCount('users')
            ->with('parent:id,code,name')
            ->when($request->filled('search'), function ($query) use ($request) {
                $query->where(fn ($q) => $q
                    ->where('name', 'like', "%{$request->string('search')}%")
                    ->orWhere('code', 'like', "%{$request->string('search')}%"));
            })
            ->when($request->filled('type'), function ($query) use ($request) {
                $query->where('type', $request->string('type'));
            })
            ->latest('id')
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
                ->where('type', '!=', 'unit')
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
            'type' => ['required', 'string', 'max:30', Rule::in(['province', 'opd', 'biro', 'inspektorat', 'unit'])],
            'parent_id' => ['nullable', 'integer', 'exists:organizations,id'],
            'address' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:100'],
            'is_active' => ['boolean'],
        ]);

        // Normalisasi tipe: Biro & Inspektorat setara OPD agar terintegrasi ke seluruh modul analitik & dashboard SAKIP
        if (in_array($validated['type'], ['biro', 'inspektorat'], true)) {
            $validated['type'] = 'opd';
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

    public function edit(Organization $organization): Response
    {
        $this->authorize('edit-organization-profile', $organization);

        $organization->load(['parent:id,code,name', 'units', 'users:id,name']);

        $user = request()->user();
        $isProvincialAdmin = $user->hasRole('Super Admin') || $user->hasRole('Admin Provinsi');

        return Inertia::render('Organizations/Edit', [
            'organization' => $organization,
            'isProvincialAdmin' => $isProvincialAdmin,
            'parents' => Organization::query()
                ->where('id', '!=', $organization->id)
                ->where('type', '!=', 'unit')
                ->orderBy('name')
                ->get(['id', 'code', 'name', 'short_name']),
        ]);
    }

    public function update(Request $request, Organization $organization): RedirectResponse
    {
        $this->authorize('edit-organization-profile', $organization);

        $user = $request->user();
        $isProvincialAdmin = $user->hasRole('Super Admin') || $user->hasRole('Admin Provinsi');

        if ($isProvincialAdmin) {
            $validated = $request->validate([
                'code' => ['required', 'string', 'max:50', Rule::unique('organizations', 'code')->ignore($organization->id)],
                'name' => ['required', 'string', 'max:200'],
                'short_name' => ['nullable', 'string', 'max:100'],
                'type' => ['required', 'string', 'max:30', Rule::in(['province', 'opd', 'biro', 'inspektorat', 'unit'])],
                'parent_id' => ['nullable', 'integer', 'exists:organizations,id'],
                'address' => ['nullable', 'string', 'max:255'],
                'phone' => ['nullable', 'string', 'max:30'],
                'email' => ['nullable', 'email', 'max:100'],
                'is_active' => ['boolean'],
            ]);

            // Normalisasi tipe: Biro & Inspektorat setara OPD agar terintegrasi ke seluruh modul analitik & dashboard SAKIP
            if (in_array($validated['type'], ['biro', 'inspektorat'], true)) {
                $validated['type'] = 'opd';
            }

            $parentId = ! empty($validated['parent_id']) ? (int) $validated['parent_id'] : null;
            if ($parentId && $organization->id === $parentId) {
                return back()->withErrors(['parent_id' => 'Organisasi tidak dapat menjadi induk dirinya sendiri.']);
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
            // Admin OPD: hanya boleh update kontak/profil OPD sendiri (tidak boleh ubah code, type, parent_id, is_active)
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

        return back()->with('success', 'Unit organisasi berhasil ditambahkan.');
    }

    public function destroyUnit(Organization $organization, OrganizationUnit $unit): RedirectResponse
    {
        $this->authorize('edit-organization-profile', $organization);

        if ($unit->organization_id !== $organization->id) {
            abort(404);
        }

        DB::transaction(function () use ($unit, $organization) {
            $unit->delete();
            $this->audit->log('delete', 'organization_unit', $unit->id, $organization->id);
        });

        return back()->with('success', 'Unit organisasi dihapus.');
    }

    public function destroy(Organization $organization): RedirectResponse
    {
        $this->authorize('manage-organizations');

        // Cegah penghapusan jika masih memiliki sub-organisasi
        if ($organization->children()->exists()) {
            return back()->withErrors(['error' => 'Tidak dapat menghapus organisasi yang masih memiliki sub-organisasi / unit turunan.']);
        }

        // Cegah penghapusan jika masih memiliki pengguna terdaftar
        if ($organization->users()->exists()) {
            return back()->withErrors(['error' => 'Tidak dapat menghapus organisasi yang masih memiliki pengguna terdaftar. Pindahkan atau hapus pengguna terlebih dahulu.']);
        }

        // Cegah penghapusan jika sudah memiliki dokumen perencanaan
        if ($organization->planningDocuments()->exists()) {
            return back()->withErrors(['error' => 'Tidak dapat menghapus organisasi yang sudah memiliki dokumen perencanaan terdaftar.']);
        }

        $orgName = $organization->name;
        $orgId = $organization->id;

        DB::transaction(function () use ($organization, $orgId) {
            $organization->units()->delete();
            $organization->delete();
            $this->audit->log('delete', 'organization', $orgId);
        });

        return redirect()
            ->route('organizations.index')
            ->with('success', "Organisasi \"{$orgName}\" berhasil dihapus.");
    }
}
