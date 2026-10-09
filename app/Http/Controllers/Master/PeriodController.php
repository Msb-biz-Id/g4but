<?php

namespace App\Http\Controllers\Master;

use App\Http\Controllers\Controller;
use App\Models\MeasurementPeriod;
use App\Models\PlanningPeriod;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PeriodController extends Controller
{
    public function __construct(private readonly AuditService $audit) {}

    public function index(): Response
    {
        $this->authorize('view-planning-periods');

        $planningPeriods = PlanningPeriod::withCount('measurementPeriods')
            ->with(['measurementPeriods' => fn ($q) => $q->orderBy('start_date')->orderBy('id')])
            ->orderByDesc('year')
            ->orderByDesc('id')
            ->get();

        return Inertia::render('Periods/Index', [
            'planningPeriods' => $planningPeriods,
        ]);
    }

    public function storePlanningPeriod(Request $request): RedirectResponse
    {
        $this->authorize('manage-planning-periods');

        // Normalisasi & auto-fill fallback untuk mempermudah input master tahun
        $input = $request->all();
        $type = $input['type'] ?? 'annual';
        $year = ! empty($input['year']) ? (int) $input['year'] : (int) date('Y');

        if (empty($input['start_date'])) {
            $input['start_date'] = "{$year}-01-01";
        }
        if (empty($input['end_date'])) {
            $input['end_date'] = $type === 'rpjmd' ? ($year + 4).'-12-31' : "{$year}-12-31";
        }
        if (empty($input['code'])) {
            $input['code'] = $type === 'rpjmd' ? "RPJMD-{$year}-".($year + 4) : "PP-{$year}";
        }
        if (empty($input['name'])) {
            $input['name'] = $type === 'rpjmd' ? "RPJMD Provinsi Papua Barat {$year}-".($year + 4) : "Tahun Anggaran {$year}";
        }

        $validated = validator($input, [
            'code' => ['required', 'string', 'max:50', Rule::unique('planning_periods', 'code')],
            'name' => ['required', 'string', 'max:200'],
            'year' => ['required', 'integer', 'min:2000', 'max:2100'],
            'type' => ['required', 'string', 'max:20', Rule::in(['annual', 'rpjmd'])],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'status' => ['required', 'string', 'max:20', Rule::in(['draft', 'active', 'closed', 'archived'])],
        ])->validate();

        // Pastikan tahun sinkron dengan tahun start_date untuk periode tahunan
        $startDateYear = (int) date('Y', strtotime($validated['start_date']));
        if ($validated['type'] === 'annual' && $validated['year'] !== $startDateYear) {
            $validated['year'] = $startDateYear;
        }

        $period = DB::transaction(function () use ($validated) {
            // Jika mengaktifkan periode, tutup periode aktif lain yang bertipe sama agar tidak ada konflik data
            if ($validated['status'] === 'active' && in_array($validated['type'], ['annual', 'rpjmd'])) {
                PlanningPeriod::where('type', $validated['type'])
                    ->where('status', 'active')
                    ->update(['status' => 'closed']);
            }

            $period = PlanningPeriod::create($validated);
            $this->audit->log('create', 'planning_period', $period->id);

            return $period;
        });

        return back()->with('success', "Periode perencanaan {$period->name} berhasil dibuat.");
    }

    public function updatePlanningPeriod(Request $request, PlanningPeriod $period): RedirectResponse
    {
        $this->authorize('manage-planning-periods');

        $validated = $request->validate([
            'code' => ['required', 'string', 'max:50', Rule::unique('planning_periods', 'code')->ignore($period->id)],
            'name' => ['required', 'string', 'max:200'],
            'year' => ['required', 'integer', 'min:2000', 'max:2100'],
            'type' => ['required', 'string', 'max:20', Rule::in(['annual', 'rpjmd'])],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'status' => ['required', 'string', 'max:20', Rule::in(['draft', 'active', 'closed', 'archived'])],
        ]);

        // Pastikan tahun sinkron dengan tahun start_date untuk periode tahunan
        $startDateYear = (int) date('Y', strtotime($validated['start_date']));
        if ($validated['type'] === 'annual' && $validated['year'] !== $startDateYear) {
            $validated['year'] = $startDateYear;
        }

        DB::transaction(function () use ($validated, $period) {
            // Jika mengaktifkan periode, tutup periode aktif lain bertipe sama
            if ($validated['status'] === 'active' && in_array($validated['type'], ['annual', 'rpjmd'])) {
                PlanningPeriod::where('type', $validated['type'])
                    ->where('status', 'active')
                    ->where('id', '!=', $period->id)
                    ->update(['status' => 'closed']);
            }

            $period->update($validated);
            $this->audit->log('update', 'planning_period', $period->id);
        });

        return back()->with('success', "Periode perencanaan {$period->name} diperbarui.");
    }

    public function destroyPlanningPeriod(PlanningPeriod $period): RedirectResponse
    {
        $this->authorize('manage-planning-periods');

        if ($period->measurementPeriods()->whereHas('realizations')->exists()) {
            return back()->withErrors(['error' => 'Tidak dapat menghapus periode perencanaan karena sudah memiliki data realisasi pengukuran kinerja.']);
        }

        DB::transaction(function () use ($period) {
            $id = $period->id;
            $period->measurementPeriods()->delete();
            $period->delete();
            $this->audit->log('delete', 'planning_period', $id);
        });

        return back()->with('success', 'Periode perencanaan berhasil dihapus.');
    }

    /**
     * Generate otomatis 4 Triwulan (TW1 s.d TW4) untuk periode tahunan.
     */
    public function generateQuarterlyPeriods(PlanningPeriod $period): RedirectResponse
    {
        $this->authorize('manage-measurement-periods');

        $year = $period->year;
        $quarters = [
            ['code' => "TW1-{$year}", 'name' => "Triwulan I {$year}", 'type' => 'quarterly', 'start_date' => "{$year}-01-01", 'end_date' => "{$year}-03-31", 'status' => 'open'],
            ['code' => "TW2-{$year}", 'name' => "Triwulan II {$year}", 'type' => 'quarterly', 'start_date' => "{$year}-04-01", 'end_date' => "{$year}-06-30", 'status' => 'open'],
            ['code' => "TW3-{$year}", 'name' => "Triwulan III {$year}", 'type' => 'quarterly', 'start_date' => "{$year}-07-01", 'end_date' => "{$year}-09-30", 'status' => 'open'],
            ['code' => "TW4-{$year}", 'name' => "Triwulan IV {$year}", 'type' => 'quarterly', 'start_date' => "{$year}-10-01", 'end_date' => "{$year}-12-31", 'status' => 'open'],
        ];

        DB::transaction(function () use ($period, $quarters) {
            foreach ($quarters as $q) {
                $existing = MeasurementPeriod::where('code', $q['code'])->first();
                if ($existing) {
                    if (! $existing->planning_period_id) {
                        $existing->update(['planning_period_id' => $period->id]);
                    }
                } else {
                    MeasurementPeriod::create([
                        ...$q,
                        'planning_period_id' => $period->id,
                    ]);
                }
            }
            $this->audit->log('generate_quarters', 'planning_period', $period->id);
        });

        return back()->with('success', "4 Triwulan (TW1 s.d TW4) untuk tahun {$year} berhasil digenerate.");
    }

    public function storeMeasurementPeriod(Request $request, PlanningPeriod $period): RedirectResponse
    {
        $this->authorize('manage-measurement-periods');

        $validated = $request->validate([
            'code' => ['required', 'string', 'max:50', Rule::unique('measurement_periods', 'code')],
            'name' => ['required', 'string', 'max:200'],
            'type' => ['required', 'string', 'max:20', Rule::in(['monthly', 'quarterly', 'semester', 'annual'])],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'submission_deadline' => ['nullable', 'date', 'after_or_equal:start_date'],
            'status' => ['required', 'string', 'max:20', Rule::in(['open', 'closed'])],
        ]);

        DB::transaction(function () use ($validated, $period) {
            $measPeriod = MeasurementPeriod::create([...$validated, 'planning_period_id' => $period->id]);
            $this->audit->log('create', 'measurement_period', $measPeriod->id, null);
        });

        return back()->with('success', 'Periode pengukuran berhasil dibuat.');
    }

    public function updateMeasurementPeriod(Request $request, MeasurementPeriod $period): RedirectResponse
    {
        $this->authorize('manage-measurement-periods');

        $validated = $request->validate([
            'code' => ['required', 'string', 'max:50', Rule::unique('measurement_periods', 'code')->ignore($period->id)],
            'name' => ['required', 'string', 'max:200'],
            'type' => ['required', 'string', 'max:20', Rule::in(['monthly', 'quarterly', 'semester', 'annual'])],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'submission_deadline' => ['nullable', 'date', 'after_or_equal:start_date'],
            'status' => ['required', 'string', 'max:20', Rule::in(['open', 'closed'])],
        ]);

        DB::transaction(function () use ($validated, $period) {
            $period->update($validated);
            $this->audit->log('update', 'measurement_period', $period->id);
        });

        return back()->with('success', 'Periode pengukuran diperbarui.');
    }

    public function destroyMeasurementPeriod(MeasurementPeriod $period): RedirectResponse
    {
        $this->authorize('manage-measurement-periods');

        if ($period->realizations()->exists()) {
            return back()->withErrors(['error' => 'Tidak dapat menghapus periode pengukuran yang sudah memiliki data realisasi.']);
        }

        DB::transaction(function () use ($period) {
            $id = $period->id;
            $period->delete();
            $this->audit->log('delete', 'measurement_period', $id);
        });

        return back()->with('success', 'Periode pengukuran berhasil dihapus.');
    }
}
