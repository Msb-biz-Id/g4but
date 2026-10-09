<?php

namespace App\Http\Controllers\Master;

use App\Http\Controllers\Controller;
use App\Models\MeasurementUnit;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class MeasurementUnitController extends Controller
{
    public function __construct(private readonly AuditService $audit) {}

    public function index(Request $request): Response
    {
        $this->authorize('view-units');

        $units = MeasurementUnit::query()
            ->withCount('indicators')
            ->when($request->filled('search'), function ($query) use ($request) {
                $query->where(fn ($q) => $q
                    ->where('name', 'like', "%{$request->string('search')}%")
                    ->orWhere('code', 'like', "%{$request->string('search')}%"));
            })
            ->latest('id')
            ->paginate($request->integer('per_page', 25))
            ->withQueryString();

        return Inertia::render('Units/Index', [
            'units' => $units,
            'filters' => $request->only(['search']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorize('manage-units');

        $validated = $request->validate([
            'code' => ['required', 'string', 'max:30', Rule::unique('measurement_units', 'code')],
            'name' => ['required', 'string', 'max:100'],
            'symbol' => ['nullable', 'string', 'max:20'],
            'description' => ['nullable', 'string', 'max:255'],
            'is_active' => ['boolean'],
        ]);

        $unit = DB::transaction(function () use ($validated) {
            $unit = MeasurementUnit::create([
                ...$validated,
                'is_active' => $validated['is_active'] ?? true,
            ]);

            $this->audit->log('create', 'measurement_unit', $unit->id);

            return $unit;
        });

        return back()->with('success', "Satuan {$unit->name} berhasil dibuat.");
    }

    public function update(Request $request, MeasurementUnit $unit): RedirectResponse
    {
        $this->authorize('manage-units');

        $validated = $request->validate([
            'code' => ['required', 'string', 'max:30', Rule::unique('measurement_units', 'code')->ignore($unit->id)],
            'name' => ['required', 'string', 'max:100'],
            'symbol' => ['nullable', 'string', 'max:20'],
            'description' => ['nullable', 'string', 'max:255'],
            'is_active' => ['boolean'],
        ]);

        DB::transaction(function () use ($validated, $unit) {
            $unit->update($validated);
            $this->audit->log('update', 'measurement_unit', $unit->id);
        });

        return back()->with('success', "Satuan {$unit->name} diperbarui.");
    }
}
