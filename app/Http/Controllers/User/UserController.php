<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\StoreUserRequest;
use App\Http\Requests\User\UpdateUserRequest;
use App\Models\Organization;
use App\Models\Role;
use App\Models\User;
use App\Services\AuditService;
use App\Services\AuthorizationService;
use App\Services\UserExportService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class UserController extends Controller
{
    public function __construct(
        private readonly AuthorizationService $authorization,
        private readonly AuditService $audit,
        private readonly UserExportService $exportService,
    ) {}

    private const OPD_LEVEL_ROLES = [
        'Operator OPD',
        'Validator OPD',
        'Kepala OPD',
        'Admin OPD',
    ];

    private function ensureCanManageUser(User $currentUser, User $targetUser): void
    {
        if ($currentUser->hasRole('Super Admin') || $currentUser->hasRole('Admin Provinsi')) {
            return;
        }

        $accessibleOrgIds = $this->authorization->accessibleOrganizationIds($currentUser);
        $inAccessibleOrg = $targetUser->organizations()->whereIn('organizations.id', $accessibleOrgIds)->exists();

        if (! $inAccessibleOrg) {
            abort(403, 'Anda tidak berwenang mengelola pengguna di luar organisasi Anda.');
        }

        $isProvincialOrSuper = $targetUser->roles()->whereIn('name', [
            'Super Admin', 'Admin Provinsi', 'Pimpinan Provinsi', 'Auditor', 'Evaluator Provinsi', 'Inspektorat',
        ])->exists();

        if ($isProvincialOrSuper) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengelola akun administrator tingkat provinsi.');
        }
    }

    /**
     * Ekspor daftar pengguna resmi ke format Excel (.xlsx) atau CSV.
     */
    public function export(Request $request): BinaryFileResponse
    {
        $this->authorize('view-users');

        $currentUser = $request->user();
        $format = $request->query('format', 'xlsx');

        if ($format === 'csv') {
            $tempPath = tempnam(sys_get_temp_dir(), 'ekasuari_users_') . '.csv';
            $this->exportService->exportToCsv($tempPath, $currentUser);

            return response()->download($tempPath, 'daftar_akun_ekasuari.csv', [
                'Content-Type' => 'text/csv',
            ])->deleteFileAfterSend(true);
        }

        $tempPath = tempnam(sys_get_temp_dir(), 'ekasuari_users_') . '.xlsx';
        $this->exportService->exportToXlsx($tempPath, $currentUser);

        return response()->download($tempPath, 'daftar_akun_ekasuari.xlsx', [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }

    public function index(Request $request): Response
    {
        $this->authorize('view-users');

        $currentUser = $request->user();
        $isProvincialAdmin = $currentUser->hasRole('Super Admin') || $currentUser->hasRole('Admin Provinsi');
        $accessibleOrgIds = $this->authorization->accessibleOrganizationIds($currentUser);

        $users = User::query()
            ->with([
                'roles:id,name',
                'organizations:id,code,name',
            ])
            ->when(! $isProvincialAdmin, function ($query) use ($accessibleOrgIds) {
                $query->whereHas('organizations', fn ($q) => $q->whereIn('organizations.id', $accessibleOrgIds));
            })
            ->when($request->filled('search'), function ($query) use ($request) {
                $query->where(fn ($q) => $q
                    ->where('name', 'like', "%{$request->string('search')}%")
                    ->orWhere('email', 'like', "%{$request->string('search')}%")
                    ->orWhere('employee_number', 'like', "%{$request->string('search')}%"));
            })
            ->when($request->filled('organization_id'), function ($query) use ($request) {
                $query->whereHas('organizations', fn ($q) => $q->whereKey($request->integer('organization_id')));
            })
            ->when($request->filled('role_id'), function ($query) use ($request) {
                $query->whereHas('roles', fn ($q) => $q->whereKey($request->integer('role_id')));
            })
            ->when($request->filled('status'), function ($query) use ($request) {
                $query->where('is_active', $request->string('status') === 'active');
            })
            ->latest('id')
            ->paginate($request->integer('per_page', 25))
            ->withQueryString();

        $statsQuery = User::query()->when(! $isProvincialAdmin, function ($query) use ($accessibleOrgIds) {
            $query->whereHas('organizations', fn ($q) => $q->whereIn('organizations.id', $accessibleOrgIds));
        });

        return Inertia::render('Users/Index', [
            'users' => $users,
            'filters' => $request->only(['search', 'organization_id', 'role_id', 'status']),
            'organizations' => Organization::query()
                ->whereIn('id', $accessibleOrgIds)
                ->orderBy('name')
                ->get(['id', 'code', 'name']),
            'roles' => Role::query()
                ->when(! $isProvincialAdmin, fn ($q) => $q->whereIn('name', self::OPD_LEVEL_ROLES))
                ->orderBy('name')
                ->get(['id', 'name']),
            'stats' => [
                'total' => (clone $statsQuery)->count(),
                'active' => (clone $statsQuery)->where('is_active', true)->count(),
                'inactive' => (clone $statsQuery)->where('is_active', false)->count(),
            ],
        ]);
    }

    public function create(): Response
    {
        $this->authorize('manage-users');

        $currentUser = request()->user();
        $isProvincialAdmin = $currentUser->hasRole('Super Admin') || $currentUser->hasRole('Admin Provinsi');
        $accessibleOrgIds = $this->authorization->accessibleOrganizationIds($currentUser);

        return Inertia::render('Users/Create', [
            'roles' => Role::query()
                ->when(! $isProvincialAdmin, fn ($q) => $q->whereIn('name', self::OPD_LEVEL_ROLES))
                ->orderBy('name')
                ->get(['id', 'name']),
            'organizations' => Organization::query()
                ->whereIn('id', $accessibleOrgIds)
                ->orderBy('name')
                ->get(['id', 'code', 'name']),
        ]);
    }

    public function store(StoreUserRequest $request): RedirectResponse
    {
        $currentUser = $request->user();
        $isProvincialAdmin = $currentUser->hasRole('Super Admin') || $currentUser->hasRole('Admin Provinsi');
        $accessibleOrgIds = $this->authorization->accessibleOrganizationIds($currentUser);

        $validated = $request->validated();

        if (! $isProvincialAdmin) {
            // Validasi: Admin OPD hanya boleh mendaftarkan ke organisasinya sendiri
            $requestedOrgs = $validated['organization_ids'] ?? [];
            if (array_diff($requestedOrgs, $accessibleOrgIds)) {
                abort(403, 'Anda hanya berhak menugaskan pengguna pada organisasi Anda.');
            }

            // Validasi: Admin OPD hanya boleh memberikan role level OPD
            $allowedRoleIds = Role::whereIn('name', self::OPD_LEVEL_ROLES)->pluck('id')->all();
            $requestedRoles = $validated['role_ids'] ?? [];
            if (array_diff($requestedRoles, $allowedRoleIds)) {
                abort(403, 'Anda tidak memiliki wewenang untuk menetapkan role tingkat provinsi.');
            }
        }

        $user = DB::transaction(function () use ($validated) {
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'employee_number' => $validated['employee_number'] ?? null,
                'job_title' => $validated['job_title'] ?? null,
                'password' => Hash::make($validated['password']),
                'is_active' => $validated['is_active'] ?? true,
                'must_change_password' => $validated['must_change_password'] ?? false,
            ]);

            $user->roles()->sync($validated['role_ids'] ?? []);

            if (! empty($validated['organization_ids'])) {
                $pivot = collect($validated['organization_ids'])->mapWithKeys(
                    fn ($id, $index) => [$id => ['is_default' => $index === 0]],
                );
                $user->organizations()->sync($pivot->all());
            }

            $this->audit->log('create', 'user', $user->id);

            return $user;
        });

        return redirect()
            ->route('users.index')
            ->with('success', "Pengguna {$user->name} berhasil dibuat.");
    }

    public function edit(User $user): Response
    {
        $this->authorize('manage-users');

        $currentUser = request()->user();
        $this->ensureCanManageUser($currentUser, $user);

        $isProvincialAdmin = $currentUser->hasRole('Super Admin') || $currentUser->hasRole('Admin Provinsi');
        $accessibleOrgIds = $this->authorization->accessibleOrganizationIds($currentUser);

        $user->load([
            'roles:id,name',
            'organizations:id,code,name',
        ]);

        return Inertia::render('Users/Edit', [
            'user' => $user,
            'roles' => Role::query()
                ->when(! $isProvincialAdmin, fn ($q) => $q->whereIn('name', self::OPD_LEVEL_ROLES))
                ->orderBy('name')
                ->get(['id', 'name']),
            'organizations' => Organization::query()
                ->whereIn('id', $accessibleOrgIds)
                ->orderBy('name')
                ->get(['id', 'code', 'name']),
        ]);
    }

    public function update(UpdateUserRequest $request, User $user): RedirectResponse
    {
        $currentUser = $request->user();
        $this->ensureCanManageUser($currentUser, $user);

        $isProvincialAdmin = $currentUser->hasRole('Super Admin') || $currentUser->hasRole('Admin Provinsi');
        $accessibleOrgIds = $this->authorization->accessibleOrganizationIds($currentUser);

        $validated = $request->validated();

        if (! $isProvincialAdmin) {
            // Validasi: Admin OPD hanya boleh menugaskan ke organisasinya sendiri
            if (array_key_exists('organization_ids', $validated)) {
                $requestedOrgs = $validated['organization_ids'] ?? [];
                if (array_diff($requestedOrgs, $accessibleOrgIds)) {
                    abort(403, 'Anda hanya berhak menugaskan pengguna pada organisasi Anda.');
                }
            }

            // Validasi: Admin OPD hanya boleh menetapkan role level OPD
            if (array_key_exists('role_ids', $validated)) {
                $allowedRoleIds = Role::whereIn('name', self::OPD_LEVEL_ROLES)->pluck('id')->all();
                $requestedRoles = $validated['role_ids'] ?? [];
                if (array_diff($requestedRoles, $allowedRoleIds)) {
                    abort(403, 'Anda tidak memiliki wewenang untuk menetapkan role tingkat provinsi.');
                }
            }
        }

        DB::transaction(function () use ($validated, $user) {
            $user->update([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'employee_number' => $validated['employee_number'] ?? null,
                'job_title' => $validated['job_title'] ?? null,
                'is_active' => $validated['is_active'] ?? false,
                'must_change_password' => $validated['must_change_password'] ?? false,
            ]);

            if (! empty($validated['password'])) {
                $user->update([
                    'password' => Hash::make($validated['password']),
                    'password_changed_at' => now(),
                ]);
            }

            if (array_key_exists('role_ids', $validated)) {
                $user->roles()->sync($validated['role_ids'] ?? []);
            }

            if (array_key_exists('organization_ids', $validated)) {
                $pivot = collect($validated['organization_ids'] ?? [])->mapWithKeys(
                    fn ($id, $index) => [$id => ['is_default' => $index === 0]],
                );
                $user->organizations()->sync($pivot->all());
            }

            $this->audit->log('update', 'user', $user->id);
        });

        return redirect()
            ->route('users.index')
            ->with('success', "Pengguna {$user->name} berhasil diperbarui.");
    }

    public function destroy(User $user): RedirectResponse
    {
        $this->authorize('deactivate-users');

        $this->ensureCanManageUser(request()->user(), $user);

        if ($user->is(auth()->user())) {
            return back()->with('error', 'Tidak dapat menonaktifkan akun sendiri.');
        }

        DB::transaction(function () use ($user) {
            $user->update(['is_active' => false]);
            $user->tokens()->delete();

            $this->audit->log('deactivate', 'user', $user->id);
        });

        return back()->with('success', "Pengguna {$user->name} dinonaktifkan.");
    }

    public function activate(User $user): RedirectResponse
    {
        $this->authorize('manage-users');

        $this->ensureCanManageUser(request()->user(), $user);

        DB::transaction(function () use ($user) {
            $user->update(['is_active' => true]);
            $this->audit->log('activate', 'user', $user->id);
        });

        return back()->with('success', "Pengguna {$user->name} diaktifkan kembali.");
    }

    public function resetPassword(Request $request, User $user): RedirectResponse
    {
        $this->authorize('manage-users');

        $this->ensureCanManageUser($request->user(), $user);

        $validated = $request->validate([
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        DB::transaction(function () use ($validated, $user) {
            $user->update([
                'password' => Hash::make($validated['password']),
                'must_change_password' => true,
                'password_changed_at' => null,
            ]);

            $this->audit->log('reset_password', 'user', $user->id);
        });

        return back()->with('success', "Password {$user->name} berhasil direset. Pengguna wajib ganti saat login.");
    }

    public function bulkAction(Request $request): RedirectResponse
    {
        $this->authorize('manage-users');

        $validated = $request->validate([
            'action' => ['required', 'in:activate,deactivate'],
            'user_ids' => ['required', 'array', 'min:1'],
            'user_ids.*' => ['integer', 'exists:users,id'],
        ]);

        $users = User::whereIn('id', $validated['user_ids'])
            ->where('id', '!=', auth()->id())
            ->get();

        $currentUser = $request->user();
        foreach ($users as $u) {
            $this->ensureCanManageUser($currentUser, $u);
        }

        $count = $users->count();

        DB::transaction(function () use ($validated, $users, $count) {
            if ($validated['action'] === 'activate') {
                $users->each(fn ($u) => $u->update(['is_active' => true]));
                $this->audit->log('bulk_activate', 'user', null, null, ['count' => $count]);
            } else {
                $users->each(function ($u) {
                    $u->update(['is_active' => false]);
                    $u->tokens()->delete();
                });
                $this->audit->log('bulk_deactivate', 'user', null, null, ['count' => $count]);
            }
        });

        $msg = $validated['action'] === 'activate'
            ? "{$count} pengguna berhasil diaktifkan."
            : "{$count} pengguna berhasil dinonaktifkan.";

        return back()->with('success', $msg);
    }
}
