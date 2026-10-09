<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Models\Role;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class RoleController extends Controller
{
    public function __construct(private readonly AuditService $audit) {}

    public function index(): Response
    {
        $this->authorize('view-roles');

        $roles = Role::withCount(['permissions', 'users'])
            ->orderBy('name')
            ->get();

        return Inertia::render('Roles/Index', [
            'roles' => $roles,
        ]);
    }

    public function edit(Role $role): Response
    {
        $this->authorize('manage-roles');

        $role->load('permissions');

        $permissions = Permission::query()
            ->orderBy('module')
            ->orderBy('resource')
            ->orderBy('action')
            ->get()
            ->groupBy('module');

        return Inertia::render('Roles/Edit', [
            'role' => $role,
            'permissions' => $permissions,
        ]);
    }

    public function update(Request $request, Role $role): RedirectResponse
    {
        $this->authorize('manage-roles');

        if ($role->name === 'Super Admin') {
            return back()->with('error', 'Hak akses untuk peran Super Admin bersifat permanen dan tidak dapat diubah.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100', Rule::unique('roles', 'name')->ignore($role->id)],
            'description' => ['nullable', 'string', 'max:255'],
            'permission_ids' => ['array'],
            'permission_ids.*' => ['integer', 'exists:permissions,id'],
        ], [
            'name.required' => 'Nama peran wajib diisi.',
            'name.unique' => 'Nama peran ini sudah digunakan oleh peran lain.',
            'name.max' => 'Nama peran maksimal 100 karakter.',
            'description.max' => 'Deskripsi peran maksimal 255 karakter.',
            'permission_ids.array' => 'Format daftar hak akses tidak valid.',
            'permission_ids.*.exists' => 'Salah satu hak akses yang dipilih tidak ditemukan di sistem.',
        ]);

        DB::transaction(function () use ($validated, $role) {
            $role->update([
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
            ]);

            $role->permissions()->sync($validated['permission_ids'] ?? []);

            $this->audit->log('update', 'role', $role->id);
        });

        return back()->with('success', "Hak akses untuk peran '{$role->name}' berhasil diperbarui.");
    }
}
