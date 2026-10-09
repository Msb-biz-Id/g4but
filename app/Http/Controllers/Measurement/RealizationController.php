<?php

namespace App\Http\Controllers\Measurement;

use App\Http\Controllers\Controller;
use App\Http\Requests\Measurement\StoreRealizationRequest;
use App\Http\Requests\Measurement\UpdateRealizationRequest;
use App\Models\Indicator;
use App\Models\IndicatorTarget;
use App\Models\MeasurementPeriod;
use App\Models\Organization;
use App\Models\Realization;
use App\Models\RealizationValidation;
use App\Services\AchievementCalculator;
use App\Services\AuditService;
use App\Services\AuthorizationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class RealizationController extends Controller
{
    public function __construct(
        private readonly AuthorizationService $authorization,
        private readonly AchievementCalculator $calculator,
        private readonly AuditService $audit,
    ) {}

    public function index(Request $request): Response
    {
        $this->authorize('view-realizations');

        $orgIds = $this->authorization->accessibleOrganizationIds($request->user());

        // Eagerly load validations for revision reason (FR-MSR-010)
        $realizations = Realization::query()
            ->with([
                'indicatorVersion:id,indicator_id,name,version_number,direction,measurement_unit_id',
                'indicatorVersion.measurementUnit:id,code,name,symbol',
                'indicatorVersion.indicator:id,code',
                'organization:id,code,name',
                'measurementPeriod:id,code,name,type',
                'evidences:id,realization_id,file_name,status',
                'validations' => fn ($q) => $q->latest('validated_at')->limit(1)->select(['id', 'realization_id', 'action', 'comment', 'validator_id', 'validated_at']),
            ])
            ->whereIn('organization_id', $orgIds)
            ->when($request->filled('period_id'), fn ($q) => $q->where('measurement_period_id', $request->integer('period_id')))
            ->when($request->filled('organization_id'), fn ($q) => $q->where('organization_id', $request->integer('organization_id')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->latest('id')
            ->paginate($request->integer('per_page', 25))
            ->withQueryString();

        // Attach achievement percentage to each realization for listing (FR-MSR-005)
        $allTargets = IndicatorTarget::query()
            ->whereIn('organization_id', $orgIds)
            ->where('status', 'approved')
            ->get()
            ->keyBy(fn ($t) => $t->indicator_version_id.'|'.$t->organization_id);

        $realizations->getCollection()->transform(function (Realization $r) use ($allTargets) {
            $target = $allTargets->get($r->indicator_version_id.'|'.$r->organization_id);
            $pct = $this->calculator->calculate($r->value, $target?->target_value, $r->indicatorVersion?->direction);
            $status = $pct === null ? 'no_data' : ($pct >= config('ekasuari.ews.good_threshold', 80) ? 'good' : ($pct >= config('ekasuari.ews.warning_threshold', 60) ? 'warning' : 'critical'));

            $r->setAttribute('achievement', [
                'percentage' => $pct,
                'status' => $status,
                'target' => $target ? (float) $target->target_value : null,
            ]);

            // Last revision reason for operator notice (FR-MSR-010)
            $lastValidation = $r->validations->first();
            $r->setAttribute('last_revision_reason',
                ($r->status === 'revision_required' && $lastValidation?->action === 'revision_request')
                    ? $lastValidation->comment
                    : null
            );

            $r->setAttribute('evidences_count', $r->evidences->count());

            return $r;
        });

        $periods = MeasurementPeriod::query()->orderByDesc('end_date')->get(['id', 'code', 'name', 'type']);

        return Inertia::render('Realizations/Index', [
            'realizations' => $realizations,
            'filters' => $request->only(['period_id', 'organization_id', 'status', 'per_page']),
            'periods' => $periods,
            'organizations' => Organization::query()
                ->whereIn('id', $orgIds)
                ->orderBy('code')
                ->get(['id', 'code', 'name']),
            'good_threshold' => (int) config('ekasuari.ews.good_threshold', 80),
            'warning_threshold' => (int) config('ekasuari.ews.warning_threshold', 60),
        ]);
    }

    public function create(): Response
    {
        $this->authorize('create-realizations');

        $user = request()->user();
        $orgIds = $this->authorization->accessibleOrganizationIds($user);

        // Active measurement periods only (FR-MSR-001)
        $periods = MeasurementPeriod::query()
            ->where('status', 'active')
            ->orderByDesc('end_date')
            ->get(['id', 'code', 'name', 'type']);

        // Organizations accessible by the user
        $organizations = Organization::query()
            ->whereIn('id', $orgIds)
            ->orderBy('name')
            ->get(['id', 'code', 'name']);

        // Indicators with approved targets for accessible organizations
        $approvedTargetVersionIds = IndicatorTarget::query()
            ->whereIn('organization_id', $orgIds)
            ->where('status', 'approved')
            ->pluck('indicator_version_id')
            ->unique();

        $indicators = Indicator::query()
            ->with([
                'currentVersion:id,indicator_id,name,version_number,direction,measurement_unit_id',
                'currentVersion.measurementUnit:id,code,name,symbol',
                'organization:id,code,name',
            ])
            ->whereHas('currentVersion', fn ($q) => $q->whereIn('id', $approvedTargetVersionIds))
            ->orderBy('name')
            ->get(['id', 'code', 'name', 'organization_id']);

        return Inertia::render('Realizations/Create', [
            'periods' => $periods,
            'organizations' => $organizations,
            'indicators' => $indicators,
        ]);
    }

    public function store(StoreRealizationRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        $period = MeasurementPeriod::findOrFail($validated['measurement_period_id']);
        if (! $period->isOpen()) {
            return back()->withErrors(['measurement_period_id' => 'Periode pengukuran sudah ditutup.']);
        }

        $realization = DB::transaction(function () use ($validated) {
            $existing = Realization::withTrashed()
                ->where('indicator_version_id', $validated['indicator_version_id'])
                ->where('organization_id', $validated['organization_id'])
                ->where('measurement_period_id', $validated['measurement_period_id'])
                ->first();

            if ($existing && $existing->trashed()) {
                $existing->restore();
                $existing->update(['value' => $validated['value'], 'narrative' => $validated['narrative'] ?? null, 'status' => 'draft']);
                $record = $existing;
            } elseif ($existing) {
                return null;
            } else {
                $record = Realization::create([
                    ...collect($validated)->except(['save_and_submit'])->all(),
                    'status' => 'draft',
                ]);
            }

            $this->audit->log('create', 'realization', $record->id, (int) $validated['organization_id']);

            return $record;
        });

        if ($realization === null) {
            return back()->withErrors(['indicator_version_id' => 'Realisasi untuk indikator, OPD, dan periode ini sudah ada.']);
        }

        if (! empty($validated['save_and_submit']) && $validated['save_and_submit'] === true) {
            return $this->submitInternal($realization);
        }

        return redirect()->route('realizations.index')->with('success', 'Realisasi disimpan sebagai draft.');
    }

    public function edit(Realization $realization): Response
    {
        $this->authorize('update-realizations');

        $this->authorization->canAccessOrganization(request()->user(), $realization->organization_id)
            ?: abort(403);

        if (! in_array($realization->status, ['draft', 'revision_required'], true)) {
            abort(403, 'Realisasi tidak dapat diedit pada status saat ini.');
        }

        $realization->load([
            'indicatorVersion:id,indicator_id,name,version_number,direction,measurement_unit_id',
            'indicatorVersion.measurementUnit:id,code,name,symbol',
            'organization:id,code,name',
            'measurementPeriod:id,code,name,type,planning_period_id',
            'evidences:id,realization_id,file_name,size,mime_type,status,uploaded_at',
            // Full validation history for the timeline (FR-MSR-013)
            'validations' => fn ($q) => $q->with('validator:id,name')->orderByDesc('validated_at'),
        ]);

        $target = IndicatorTarget::where('indicator_version_id', $realization->indicator_version_id)
            ->where('organization_id', $realization->organization_id)
            ->where('planning_period_id', $realization->measurementPeriod->planning_period_id)
            ->first();

        $pct = $this->calculator->calculate(
            $realization->value,
            $target?->target_value,
            $realization->indicatorVersion->direction,
        );

        $goodThreshold = (int) config('ekasuari.ews.good_threshold', 80);
        $warningThreshold = (int) config('ekasuari.ews.warning_threshold', 60);

        $achievementStatus = $pct === null ? 'no_data'
            : ($pct >= $goodThreshold ? 'good' : ($pct >= $warningThreshold ? 'warning' : 'critical'));

        // Last revision reason shown prominently to operator (FR-MSR-010)
        $lastRevisionReason = null;
        if ($realization->status === 'revision_required') {
            $lastRevisionReason = $realization->validations
                ->where('action', 'revision_request')
                ->first()?->comment;
        }

        return Inertia::render('Realizations/Edit', [
            'realization' => array_merge($realization->toArray(), [
                'validations' => $realization->validations->map(fn ($v) => [
                    'id' => $v->id,
                    'action' => $v->action,
                    'comment' => $v->comment,
                    'validator' => $v->validator ? ['name' => $v->validator->name] : null,
                    'validated_at' => $v->validated_at?->toIso8601String(),
                ]),
            ]),
            'target' => $target ? ['target_value' => $target->target_value, 'status' => $target->status] : null,
            'achievement' => ['percentage' => $pct, 'status' => $achievementStatus],
            'last_revision_reason' => $lastRevisionReason,
            'good_threshold' => $goodThreshold,
            'warning_threshold' => $warningThreshold,
        ]);
    }

    public function update(UpdateRealizationRequest $request, Realization $realization): RedirectResponse
    {
        $this->authorize('edit-realizations');

        $this->authorization->canAccessOrganization($request->user(), $realization->organization_id)
            ?: abort(403, 'Di luar lingkup organisasi Anda.');

        if (! in_array($realization->status, ['draft', 'revision_required'], true)) {
            abort(403, 'Realisasi tidak dapat diedit pada status saat ini.');
        }

        $validated = $request->validated();

        DB::transaction(function () use ($validated, $realization) {
            $realization->update([
                'value' => $validated['value'],
                'narrative' => $validated['narrative'] ?? null,
                'row_version' => $realization->row_version + 1,
            ]);

            $this->audit->log('update', 'realization', $realization->id, $realization->organization_id);
        });

        if (! empty($validated['save_and_submit']) && $validated['save_and_submit'] === true) {
            return $this->submitInternal($realization);
        }

        return back()->with('success', 'Realisasi diperbarui.');
    }

    public function submit(Realization $realization): RedirectResponse
    {
        $this->authorize('submit-realizations');

        $this->authorization->canAccessOrganization(request()->user(), $realization->organization_id)
            ?: abort(403);

        return $this->submitInternal($realization);
    }

    private function submitInternal(Realization $realization): RedirectResponse
    {
        if (! in_array($realization->status, ['draft', 'revision_required', 'submitted', 'resubmitted'], true)) {
            return back()->with('error', 'Realisasi tidak dapat disubmit pada status saat ini.');
        }

        // FR-MSR-007: Cek evidence wajib (dikonfigurasi via EKASUARI_REQUIRE_EVIDENCE_ON_SUBMIT)
        if (config('ekasuari.measurement.require_evidence_on_submit', false)) {
            $hasEvidence = $realization->evidences()->exists();
            if (! $hasEvidence) {
                return back()->withErrors([
                    'evidence' => 'Minimal 1 bukti dukung (evidence) wajib diunggah sebelum submit realisasi.',
                ]);
            }
        }

        DB::transaction(function () use ($realization) {
            $newStatus = in_array($realization->status, ['revision_required'], true) ? 'resubmitted' : 'submitted';

            $realization->update([
                'status' => $newStatus,
                'submitted_by' => request()->user()->id,
                'submitted_at' => now(),
            ]);

            RealizationValidation::create([
                'realization_id' => $realization->id,
                'validator_id' => request()->user()->id,
                'action' => $newStatus === 'resubmitted' ? 'resubmitted' : 'submitted',
                'validated_at' => now(),
            ]);

            $this->audit->log('submit', 'realization', $realization->id, $realization->organization_id);
        });

        return redirect()->route('realizations.index')->with('success', 'Realisasi disubmit untuk direview.');
    }

    public function approve(Realization $realization): RedirectResponse
    {
        $this->authorize('approve-realizations');

        $this->authorization->canAccessOrganization(request()->user(), $realization->organization_id)
            ?: abort(403);

        if (! in_array($realization->status, ['submitted', 'resubmitted'], true)) {
            return back()->with('error', 'Hanya realisasi berstatus submitted yang dapat disetujui.');
        }

        DB::transaction(function () use ($realization) {
            $realization->update([
                'status' => 'approved',
                'approved_by' => request()->user()->id,
                'approved_at' => now(),
                'version' => $realization->version + 1,
            ]);

            RealizationValidation::create([
                'realization_id' => $realization->id,
                'validator_id' => request()->user()->id,
                'action' => 'approved',
                'comment' => request()->string('comment')->toString() ?: null,
                'request_id' => request()->header('X-Request-ID'),
                'validated_at' => now(),
            ]);

            $this->audit->log('approve', 'realization', $realization->id, $realization->organization_id);
        });

        return back()->with('success', 'Realisasi disetujui.');
    }

    public function requestRevision(Realization $realization): RedirectResponse
    {
        $this->authorize('reject-realizations');

        $this->authorization->canAccessOrganization(request()->user(), $realization->organization_id)
            ?: abort(403);

        if (! in_array($realization->status, ['submitted', 'resubmitted'], true)) {
            return back()->with('error', 'Hanya realisasi berstatus submitted yang dapat direvisi.');
        }

        $reason = request()->string('reason')->trim()->toString();
        if ($reason === '') {
            return back()->withErrors(['reason' => 'Alasan revisi wajib diisi.']);
        }

        DB::transaction(function () use ($realization, $reason) {
            $realization->update(['status' => 'revision_required']);

            RealizationValidation::create([
                'realization_id' => $realization->id,
                'validator_id' => request()->user()->id,
                'action' => 'revision_request',
                'comment' => $reason,
                'request_id' => request()->header('X-Request-ID'),
                'validated_at' => now(),
            ]);

            $this->audit->log('revision_request', 'realization', $realization->id, $realization->organization_id, reason: $reason);
        });

        return back()->with('success', 'Permintaan revisi diajukan.');
    }

    /**
     * FR-MSR-016: Reopen terkendali oleh verifikator/approver.
     * Hanya realization berstatus approved atau revision_required yang bisa dibuka kembali.
     * Dicatat dalam validation history dan audit trail.
     */
    public function reopen(Request $request, Realization $realization): RedirectResponse
    {
        $this->authorize('approve-realizations');

        if (! in_array($realization->status, ['approved', 'revision_required', 'submitted'])) {
            return back()->withErrors(['realization' => 'Realisasi tidak dapat dibuka kembali dari status saat ini.']);
        }

        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:10', 'max:1000'],
        ]);

        DB::transaction(function () use ($realization, $validated, $request) {
            $realization->update(['status' => 'draft']);

            RealizationValidation::create([
                'realization_id' => $realization->id,
                'validator_id' => $request->user()->id,
                'action' => 'reopen',
                'comment' => $validated['reason'],
                'request_id' => $request->header('X-Request-ID'),
                'validated_at' => now(),
            ]);

            $this->audit->log('reopen', 'realization', $realization->id, $realization->organization_id, reason: $validated['reason']);
        });

        return back()->with('success', 'Realisasi berhasil dibuka kembali. OPD dapat mengedit dan menyubmit ulang.');
    }
}
