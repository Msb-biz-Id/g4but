<?php

namespace App\Http\Controllers\Master;

use App\Http\Controllers\Controller;
use App\Models\Indicator;
use App\Models\IndicatorVersion;
use App\Models\MeasurementUnit;
use App\Models\Organization;
use App\Models\User;
use App\Services\AuditService;
use App\Services\AuthorizationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class IndicatorController extends Controller
{
    public function __construct(
        private readonly AuthorizationService $authorization,
        private readonly AuditService $audit,
    ) {}

    public function index(Request $request): Response
    {
        $this->authorize('view-indicators');

        $user = $request->user();
        $isProvincialAdmin = $user && $user->roles()->whereIn('name', ['Super Admin', 'Admin Provinsi'])->exists();
        $accessibleOrgIds = $this->authorization->accessibleOrganizationIds($user);

        $indicators = Indicator::query()
            ->with('currentVersion:id,indicator_id,version_number,name')
            ->with('measurementUnit:id,code,name,symbol')
            ->with('ownerOrganization:id,code,name')
            ->when(! $isProvincialAdmin, function ($query) use ($accessibleOrgIds) {
                $query->where(function ($q) use ($accessibleOrgIds) {
                    $q->whereIn('owner_organization_id', $accessibleOrgIds)
                        ->orWhereNull('owner_organization_id')
                        ->orWhere('owner_organization_id', 1);
                });
            })
            ->when($request->filled('search'), function ($query) use ($request) {
                $query->where(fn ($q) => $q
                    ->where('code', 'like', "%{$request->string('search')}%")
                    ->orWhere('name', 'like', "%{$request->string('search')}%"));
            })
            ->when($request->filled('status'), function ($query) use ($request) {
                $query->where('status', $request->string('status'));
            })
            ->when($request->filled('organization_id'), function ($query) use ($request) {
                $query->where('owner_organization_id', $request->integer('organization_id'));
            })
            ->latest('id')
            ->paginate($request->integer('per_page', 25))
            ->withQueryString();

        return Inertia::render('Indicators/Index', [
            'indicators' => $indicators,
            'filters' => $request->only(['search', 'status', 'organization_id']),
            'organizations' => Organization::query()
                ->whereIn('id', $accessibleOrgIds)
                ->orderBy('code')
                ->get(['id', 'code', 'name']),
            'isProvincialAdmin' => $isProvincialAdmin,
            'accessibleOrgIds' => $accessibleOrgIds,
        ]);
    }

    public function create(): Response
    {
        $this->authorize('create-indicators');

        $user = request()->user();
        $isProvincialAdmin = $user && $user->roles()->whereIn('name', ['Super Admin', 'Admin Provinsi'])->exists();
        $accessibleOrgIds = $this->authorization->accessibleOrganizationIds($user);

        return Inertia::render('Indicators/Create', [
            'units' => MeasurementUnit::query()->where('is_active', true)->orderBy('code')->get(),
            'organizations' => Organization::query()
                ->when(! $isProvincialAdmin, fn ($q) => $q->whereIn('id', $accessibleOrgIds))
                ->orderBy('code')->get(['id', 'code', 'name']),
        ]);
    }

    private function authorizeIndicatorMutation(?User $user, Indicator $indicator): void
    {
        $isProvincialAdmin = $user && $user->roles()->whereIn('name', ['Super Admin', 'Admin Provinsi'])->exists();
        if ($isProvincialAdmin) {
            return;
        }

        $accessibleOrgIds = $this->authorization->accessibleOrganizationIds($user);

        if (! $indicator->owner_organization_id || (int) $indicator->owner_organization_id === 1 || ! in_array((int) $indicator->owner_organization_id, $accessibleOrgIds, true)) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengubah indikator Pemda atau Perangkat Daerah lain.');
        }
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create-indicators');

        $user = $request->user();
        $isProvincialAdmin = $user && $user->roles()->whereIn('name', ['Super Admin', 'Admin Provinsi'])->exists();
        $accessibleOrgIds = $this->authorization->accessibleOrganizationIds($user);

        $validated = $request->validate($this->rules());

        if (! $isProvincialAdmin) {
            if (empty($validated['owner_organization_id']) || (int) $validated['owner_organization_id'] === 1 || ! in_array((int) $validated['owner_organization_id'], $accessibleOrgIds, true)) {
                abort(403, 'Indikator Perangkat Daerah harus memiliki OPD pemilik dalam lingkup Anda.');
            }
        } elseif (! empty($validated['owner_organization_id'])) {
            $this->authorization->canAccessOrganization($user, (int) $validated['owner_organization_id'])
                ?: abort(403, 'Di luar lingkup organisasi Anda.');
        }

        $indicator = DB::transaction(function () use ($validated) {
            $indicator = Indicator::create([
                ...collect($validated)->except(['baseline_value', 'valid_from', 'valid_to'])->all(),
                'status' => 'draft',
            ]);

            $version = IndicatorVersion::create([
                'indicator_id' => $indicator->id,
                'version_number' => 1,
                'name' => $validated['name'],
                'definition' => $validated['definition'] ?? null,
                'type' => $validated['type'],
                'direction' => $validated['direction'],
                'measurement_unit_id' => $validated['measurement_unit_id'] ?? null,
                'frequency' => $validated['frequency'],
                'data_source' => $validated['data_source'] ?? null,
                'formula_notes' => $validated['formula_notes'] ?? null,
                'baseline_value' => $validated['baseline_value'] ?? null,
                'valid_from' => $validated['valid_from'] ?? null,
                'valid_to' => $validated['valid_to'] ?? null,
            ]);

            $indicator->update(['current_version_id' => $version->id]);

            $this->audit->log('create', 'indicator', $indicator->id);

            return $indicator;
        });

        return redirect()
            ->route('indicators.index')
            ->with('success', "Indikator {$indicator->code} berhasil dibuat.");
    }

    public function edit(Indicator $indicator): Response
    {
        $this->authorize('update-indicators');

        $user = request()->user();
        $this->authorizeIndicatorMutation($user, $indicator);

        $isProvincialAdmin = $user && $user->roles()->whereIn('name', ['Super Admin', 'Admin Provinsi'])->exists();
        $accessibleOrgIds = $this->authorization->accessibleOrganizationIds($user);

        $indicator->load('currentVersion', 'versions');

        return Inertia::render('Indicators/Edit', [
            'indicator' => $indicator,
            'units' => MeasurementUnit::query()->where('is_active', true)->orderBy('code')->get(),
            'organizations' => Organization::query()
                ->when(! $isProvincialAdmin, fn ($q) => $q->whereIn('id', $accessibleOrgIds))
                ->orderBy('code')->get(['id', 'code', 'name']),
        ]);
    }

    public function update(Request $request, Indicator $indicator): RedirectResponse
    {
        $this->authorize('update-indicators');

        $user = $request->user();
        $this->authorizeIndicatorMutation($user, $indicator);

        $isProvincialAdmin = $user && $user->roles()->whereIn('name', ['Super Admin', 'Admin Provinsi'])->exists();
        $accessibleOrgIds = $this->authorization->accessibleOrganizationIds($user);

        $validated = $request->validate($this->rules($indicator->id));

        if (! $isProvincialAdmin) {
            $validated['owner_organization_id'] = $indicator->owner_organization_id;
        } elseif (! empty($validated['owner_organization_id'])) {
            $this->authorization->canAccessOrganization($user, (int) $validated['owner_organization_id'])
                ?: abort(403, 'Di luar lingkup organisasi Anda.');
        }

        DB::transaction(function () use ($validated, $indicator, $request) {
            $indicator->update([
                ...collect($validated)->except(['baseline_value', 'valid_from', 'valid_to'])->all(),
            ]);

            $current = $indicator->currentVersion;

            if ($current) {
                $changed = collect([
                    'name' => $validated['name'],
                    'definition' => $validated['definition'] ?? null,
                    'type' => $validated['type'],
                    'direction' => $validated['direction'],
                    'measurement_unit_id' => $validated['measurement_unit_id'] ?? null,
                    'frequency' => $validated['frequency'],
                    'data_source' => $validated['data_source'] ?? null,
                    'formula_notes' => $validated['formula_notes'] ?? null,
                ])->filter(fn ($value, $key) => (string) $current->{$key} !== (string) $value);

                if ($changed->isNotEmpty()) {
                    $version = IndicatorVersion::create([
                        ...$current->toArray(),
                        'id' => null,
                        'indicator_id' => $indicator->id,
                        'version_number' => $current->version_number + 1,
                        'name' => $validated['name'],
                        'definition' => $validated['definition'] ?? null,
                        'type' => $validated['type'],
                        'direction' => $validated['direction'],
                        'measurement_unit_id' => $validated['measurement_unit_id'] ?? null,
                        'frequency' => $validated['frequency'],
                        'data_source' => $validated['data_source'] ?? null,
                        'formula_notes' => $validated['formula_notes'] ?? null,
                        'baseline_value' => $validated['baseline_value'] ?? $current->baseline_value,
                        'valid_from' => $validated['valid_from'] ?? $current->valid_from,
                        'valid_to' => $validated['valid_to'] ?? $current->valid_to,
                        'change_reason' => $request->string('change_reason')->toString() ?: 'Pembaruan data indikator',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                    $indicator->update(['current_version_id' => $version->id]);
                }
            }

            $this->audit->log('update', 'indicator', $indicator->id);
        });

        return redirect()
            ->route('indicators.index')
            ->with('success', "Indikator {$indicator->code} diperbarui.");
    }

    public function activate(Request $request, Indicator $indicator): RedirectResponse
    {
        $this->authorize('update-indicators');

        $this->authorizeIndicatorMutation($request->user(), $indicator);

        DB::transaction(function () use ($indicator) {
            $indicator->update(['status' => 'active']);
            $this->audit->log('update', 'indicator', $indicator->id, null, ['status' => 'active']);
        });

        return back()->with('success', "Indikator {$indicator->code} diaktifkan.");
    }

    public function archive(Request $request, Indicator $indicator): RedirectResponse
    {
        $this->authorize('archive-indicators');

        $this->authorizeIndicatorMutation($request->user(), $indicator);

        if ($indicator->targets()->exists()) {
            return back()->with('error', 'Indikator telah dipakai pada target; arsipkan lewat versi, bukan hapus.');
        }

        DB::transaction(function () use ($indicator) {
            $indicator->update(['status' => 'archived']);
            $this->audit->log('update', 'indicator', $indicator->id, null, ['status' => 'archived']);
        });

        return back()->with('success', "Indikator {$indicator->code} diarsipkan.");
    }

    /** @return array<string, list<mixed>> */
    private function rules(?int $ignoreId = null): array
    {
        return [
            'code' => ['required', 'string', 'max:50', Rule::unique('indicators', 'code')->ignore($ignoreId)],
            // FR-MD-012: Duplicate detection — name harus unik agar tidak ada indikator ganda
            'name' => ['required', 'string', 'max:255', Rule::unique('indicators', 'name')->ignore($ignoreId)],
            'definition' => ['nullable', 'string'],
            'type' => ['required', 'string', 'max:30', Rule::in(['input', 'process', 'output', 'outcome', 'impact'])],
            'direction' => ['required', 'string', 'max:20', Rule::in(['higher_is_better', 'lower_is_better', 'exact', 'binary', 'custom'])],
            'measurement_unit_id' => ['nullable', 'integer', 'exists:measurement_units,id'],
            'frequency' => ['required', 'string', 'max:30', Rule::in(['monthly', 'quarterly', 'semester', 'annual'])],
            'data_source' => ['nullable', 'string', 'max:255'],
            'formula_notes' => ['nullable', 'string'],
            'owner_organization_id' => ['nullable', 'integer', 'exists:organizations,id'],
            'is_iku' => ['boolean'],
            'baseline_value' => ['nullable', 'numeric'],
            'valid_from' => ['nullable', 'date'],
            'valid_to' => ['nullable', 'date', 'after_or_equal:valid_from'],
            'change_reason' => ['nullable', 'string', 'max:255'],
        ];
    }
}
