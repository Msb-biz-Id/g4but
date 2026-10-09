<?php

namespace App\Http\Controllers\Ews;

use App\Http\Controllers\Controller;
use App\Models\Alert;
use App\Models\AlertRule;
use App\Models\IndicatorTarget;
use App\Models\MeasurementPeriod;
use App\Models\Organization;
use App\Models\PerformancePeriod;
use App\Models\PlanningPeriod;
use App\Models\Realization;
use App\Services\AuditService;
use App\Services\AuthorizationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AlertController extends Controller
{
    public function __construct(
        private readonly AuthorizationService $authorization,
        private readonly AuditService $audit,
    ) {}

    public function index(Request $request): Response
    {
        $this->authorize('view-alerts');

        $accessibleOrgIds = $this->authorization->accessibleOrganizationIds($request->user());

        $alerts = Alert::query()
            ->with(['rule:id,code,name,rule_type', 'organization:id,code,name'])
            ->whereIn('organization_id', $accessibleOrgIds)
            ->when($request->filled('severity'), fn ($q) => $q->where('severity', $request->string('severity')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 25))
            ->withQueryString();

        // 1. Statistik Alert
        $statsQuery = Alert::query()->whereIn('organization_id', $accessibleOrgIds);
        $alertStats = [
            'open'        => (clone $statsQuery)->where('status', 'open')->count(),
            'critical'    => (clone $statsQuery)->where('severity', 'critical')->whereIn('status', ['open', 'in_progress', 'acknowledged'])->count(),
            'in_progress' => (clone $statsQuery)->whereIn('status', ['in_progress', 'acknowledged'])->count(),
            'resolved'    => (clone $statsQuery)->where('status', 'resolved')->count(),
        ];

        // 2. Daftar Aturan EWS Terformat
        $rules = AlertRule::query()->orderBy('name')->get()->map(fn ($r) => [
            'id'                    => $r->id,
            'name'                  => $r->name,
            'description'           => $r->config['description'] ?? null,
            'type'                  => $r->rule_type,
            'operator'              => $r->config['operator'] ?? '<',
            'threshold'             => (float) ($r->config['threshold'] ?? ($r->config['threshold_days'] ?? 80)),
            'level'                 => $r->severity,
            'is_active'             => (bool) $r->is_active,
            'performance_period_id' => $r->config['performance_period_id'] ?? null,
            'notify_roles'          => (array) ($r->config['notify_roles'] ?? []),
        ]);

        // 3. Deteksi Ambang Batas (Indikator di bawah target secara real-time)
        $realizations = Realization::query()
            ->whereIn('organization_id', $accessibleOrgIds)
            ->where('status', 'approved')
            ->with(['indicatorVersion:id,indicator_id,name', 'organization:id,name'])
            ->latest('id')
            ->limit(15)
            ->get();

        $rulesCheck = [];
        foreach ($realizations as $r) {
            $target = IndicatorTarget::where('indicator_version_id', $r->indicator_version_id)
                ->where('organization_id', $r->organization_id)
                ->where('status', 'approved')
                ->first();

            if ($target && $target->target_value > 0) {
                $ach = round(($r->value / $target->target_value) * 100, 1);
                if ($ach < 80) {
                    $rulesCheck[] = [
                        'indicator'    => $r->indicatorVersion?->name ?? 'Indikator',
                        'organization' => $r->organization?->name ?? '-',
                        'achievement'  => $ach,
                    ];
                }
            }
        }

        // 4. Kepatuhan Pelaporan (FR-EWS-004)
        $currentPeriod = MeasurementPeriod::query()
            ->where('status', 'open')
            ->orderByDesc('id')
            ->first();

        $orgs = Organization::query()
            ->where('type', 'opd')
            ->where('is_active', true)
            ->whereIn('id', $accessibleOrgIds)
            ->orderBy('name')
            ->get();

        $complianceRows = [];
        $submittedCount = 0;
        $notSubmittedCount = 0;

        if ($currentPeriod) {
            $submittedOrgIds = Realization::query()
                ->where('measurement_period_id', $currentPeriod->id)
                ->whereIn('status', ['submitted', 'approved'])
                ->pluck('organization_id')
                ->unique()
                ->toArray();

            foreach ($orgs as $o) {
                $isSubmitted = in_array($o->id, $submittedOrgIds);
                if ($isSubmitted) {
                    $submittedCount++;
                } else {
                    $notSubmittedCount++;
                }
                $complianceRows[] = [
                    'organization' => $o->name,
                    'submitted'    => $isSubmitted,
                ];
            }
        } else {
            // Fallback periksa realisasi tahun berjalan
            $currentYear = (int) date('Y');
            $submittedOrgIds = Realization::query()
                ->whereYear('created_at', $currentYear)
                ->whereIn('status', ['submitted', 'approved'])
                ->pluck('organization_id')
                ->unique()
                ->toArray();

            foreach ($orgs as $o) {
                $isSubmitted = in_array($o->id, $submittedOrgIds);
                if ($isSubmitted) {
                    $submittedCount++;
                } else {
                    $notSubmittedCount++;
                }
                $complianceRows[] = [
                    'organization' => $o->name,
                    'submitted'    => $isSubmitted,
                ];
            }
        }

        $totalOrgs = count($complianceRows);
        $reportRate = $totalOrgs > 0 ? round(($submittedCount / $totalOrgs) * 100, 1) : 0;

        $compliance = [
            'report_rate'   => $reportRate,
            'submitted'     => $submittedCount,
            'not_submitted' => $notSubmittedCount,
            'rows'          => $complianceRows,
        ];

        // 5. Periode untuk dropdown
        $periods = PerformancePeriod::query()
            ->orderByDesc('year')
            ->get()
            ->map(fn ($p) => ['id' => $p->id, 'year' => (int) ($p->start_year ?? $p->year ?? date('Y'))]);

        if ($periods->isEmpty()) {
            $periods = PlanningPeriod::query()
                ->orderByDesc('year')
                ->get()
                ->map(fn ($p) => ['id' => $p->id, 'year' => (int) ($p->start_year ?? date('Y'))]);
        }

        return Inertia::render('Alerts/Index', [
            'alerts'        => $alerts,
            'alertStats'    => $alertStats,
            'rules'         => $rules,
            'rulesCheck'    => $rulesCheck,
            'compliance'    => $compliance,
            'periods'       => $periods,
            'canManage'     => $request->user()->can('manage-alert-rules'),
            'canResolve'    => $request->user()->can('resolve-alerts'),
            'filters'       => $request->only(['severity', 'status', 'per_page']),
            'organizations' => Organization::query()
                ->whereIn('id', $accessibleOrgIds)
                ->orderBy('code')
                ->get(['id', 'code', 'name']),
            'levelLabels'   => [
                'info'     => 'Info',
                'low'      => 'Rendah',
                'warning'  => 'Peringatan',
                'medium'   => 'Sedang',
                'high'     => 'Tinggi',
                'critical' => 'Kritis',
            ],
            'statusLabels'  => [
                'open'         => 'Terbuka',
                'acknowledged' => 'Diakui',
                'in_progress'  => 'Sedang Ditindak',
                'resolved'     => 'Selesai',
                'closed'       => 'Ditutup',
            ],
            'typeLabels'    => [
                'performance_deviation' => 'Deviasi Capaian',
                'achievement'           => 'Deviasi Capaian',
                'late_report'           => 'Keterlambatan Laporan',
                'submission_overdue'    => 'Keterlambatan Laporan',
                'evidence_empty'        => 'Tanpa Bukti Dukung',
                'missing_evidence'      => 'Tanpa Bukti Dukung',
                'document_overdue'      => 'Dokumen SAKIP Terlambat',
                'pk_unsigned'           => 'PK Belum Disahkan',
                'revision_pending'      => 'Revisi Tertunda',
            ],
        ]);
    }

    public function acknowledge(Alert $alert): RedirectResponse
    {
        $this->authorize('acknowledge-alerts');

        $this->authorization->canAccessOrganization(request()->user(), (int) $alert->organization_id)
            ?: abort(403, 'Di luar lingkup organisasi Anda.');

        $alert->update([
            'status' => 'acknowledged',
            'acknowledged_by' => request()->user()->id,
            'acknowledged_at' => now(),
        ]);

        $this->audit->log('acknowledge', 'alert', $alert->id, $alert->organization_id);

        return back()->with('success', 'Peringatan dini (alert) berhasil diakui.');
    }

    public function resolve(Alert $alert): RedirectResponse
    {
        $this->authorize('resolve-alerts');

        $this->authorization->canAccessOrganization(request()->user(), (int) $alert->organization_id)
            ?: abort(403, 'Di luar lingkup organisasi Anda.');

        $alert->update([
            'status' => 'resolved',
            'resolved_by' => request()->user()->id,
            'resolved_at' => now(),
        ]);

        $this->audit->log('resolve', 'alert', $alert->id, $alert->organization_id);

        return back()->with('success', 'Peringatan dini (alert) berhasil diselesaikan.');
    }
}
