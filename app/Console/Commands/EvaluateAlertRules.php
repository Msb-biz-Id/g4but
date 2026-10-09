<?php

namespace App\Console\Commands;

use App\Models\Agreement;
use App\Models\Alert;
use App\Models\AlertRule;
use App\Models\IndicatorTarget;
use App\Models\MeasurementPeriod;
use App\Models\Organization;
use App\Models\PlanningDocument;
use App\Models\Realization;
use App\Services\AuditService;
use App\Services\NotificationService;
use App\Services\SakipDocumentService;
use Illuminate\Console\Command;

/**
 * Evaluasi semua alert rule aktif dan generate alert jika ter-trigger (FR-EWS).
 * Dijadwalkan hourly via console.php.
 */
class EvaluateAlertRules extends Command
{
    protected $signature = 'ews:evaluate {--dry-run : Preview tanpa simpan ke database}';

    protected $description = 'Evaluasi semua alert rule aktif dan generate alert jika kondisi terpenuhi';

    public function __construct(
        private readonly AuditService $audit,
        private readonly NotificationService $notifications,
        private readonly SakipDocumentService $sakipDocService,
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $isDryRun = (bool) $this->option('dry-run');
        $rules = AlertRule::where('is_active', true)->get();

        if ($rules->isEmpty()) {
            $this->info('Tidak ada alert rule aktif.');

            return Command::SUCCESS;
        }

        $generated = 0;
        $skipped = 0;

        foreach ($rules as $rule) {
            $triggered = $this->evaluateRule($rule);

            foreach ($triggered as $item) {
                // Cegah duplikat: skip jika sudah ada alert open untuk kombinasi rule+org+indicator
                $exists = Alert::where('rule_id', $rule->id)
                    ->where('organization_id', $item['organization_id'])
                    ->where('indicator_version_id', $item['indicator_version_id'] ?? null)
                    ->where('status', 'open')
                    ->exists();

                if ($exists) {
                    $skipped++;

                    continue;
                }

                if (! $isDryRun) {
                    $alert = Alert::create([
                        'rule_id' => $rule->id,
                        'organization_id' => $item['organization_id'],
                        'indicator_version_id' => $item['indicator_version_id'] ?? null,
                        'alert_type' => $rule->rule_type,
                        'severity' => $rule->severity,
                        'title' => $item['title'],
                        'message' => $item['message'] ?? $item['description'] ?? null,
                        'status' => 'open',
                    ]);

                    $this->audit->log('alert_generated', 'alert_rule', $rule->id, $item['organization_id']);

                    // Dispatch notifikasi ke pengguna / pimpinan terkait (navbar bell)
                    $this->notifications->notifyAlertTriggered($alert);
                }

                $generated++;
                $this->line(($isDryRun ? '[DRY-RUN] ' : '')."[{$rule->rule_type}] {$item['title']}");
            }
        }

        $mode = $isDryRun ? ' (dry-run, tidak disimpan)' : '';
        $this->info("Selesai{$mode}: {$generated} alert dibuat, {$skipped} sudah ada (skip).");

        return Command::SUCCESS;
    }

    /** @return array<int, array<string, mixed>> */
    private function evaluateRule(AlertRule $rule): array
    {
        return match ($rule->rule_type) {
            'performance_deviation', 'achievement' => $this->checkPerformanceDeviation($rule),
            'late_report', 'submission_overdue'    => $this->checkLateReport($rule),
            'evidence_empty', 'missing_evidence'   => $this->checkEvidenceEmpty($rule),
            'document_overdue'                     => $this->checkDocumentOverdue($rule),
            'pk_unsigned'                          => $this->checkPkUnsigned($rule),
            'revision_pending'                     => $this->checkRevisionPending($rule),
            default                                => [],
        };
    }

    /** @return array<int, array<string, mixed>> */
    private function checkPerformanceDeviation(AlertRule $rule): array
    {
        $threshold = (float) ($rule->config['threshold'] ?? config('ekasuari.ews.warning_threshold', 60));
        $operator = $rule->config['operator'] ?? '<';
        $results = [];

        $realizations = Realization::query()
            ->where('status', 'approved')
            ->with(['indicatorVersion:id,indicator_id,name', 'organization:id,name'])
            ->get();

        foreach ($realizations as $r) {
            $target = IndicatorTarget::where('indicator_version_id', $r->indicator_version_id)
                ->where('organization_id', $r->organization_id)
                ->where('status', 'approved')
                ->first();

            if (! $target || ! $target->target_value || $target->target_value <= 0) {
                continue;
            }

            $pct = ($r->value / $target->target_value) * 100;

            $isTriggered = match ($operator) {
                '<='    => $pct <= $threshold,
                '>'     => $pct > $threshold,
                '>='    => $pct >= $threshold,
                default => $pct < $threshold,
            };

            if (! $isTriggered) {
                continue;
            }

            $results[] = [
                'organization_id' => $r->organization_id,
                'indicator_version_id' => $r->indicator_version_id,
                'title' => sprintf(
                    'Capaian %s di %s di bawah %.0f%%',
                    $r->indicatorVersion?->name ?? 'Indikator',
                    $r->organization?->name ?? '-',
                    $threshold,
                ),
                'message' => sprintf(
                    'Capaian saat ini: %.2f%% (Target: %s | Realisasi: %s). Diperlukan evaluasi teknis dan akselerasi pelaksanaan program/indikator terkait.',
                    $pct,
                    $target->target_value,
                    $r->value,
                ),
            ];
        }

        return $results;
    }

    /** @return array<int, array<string, mixed>> */
    private function checkLateReport(AlertRule $rule): array
    {
        $graceDays = (int) ($rule->config['grace_days'] ?? 0);
        $results = [];

        // Ambil semua measurement period yang sudah melewati deadline (+ grace days)
        $latePeriods = MeasurementPeriod::query()
            ->where('status', 'open')
            ->whereNotNull('submission_deadline')
            ->where('submission_deadline', '<', now()->subDays($graceDays)->toDateString())
            ->get();

        foreach ($latePeriods as $period) {
            // Ambil semua organisasi yang punya target di periode ini
            $targetOrgIds = IndicatorTarget::query()
                ->where('measurement_period_id', $period->id)
                ->where('status', 'approved')
                ->pluck('organization_id')
                ->unique();

            // Organisasi yang sudah submit setidaknya 1 realisasi
            $submittedOrgIds = Realization::query()
                ->where('measurement_period_id', $period->id)
                ->whereIn('status', ['submitted', 'approved'])
                ->pluck('organization_id')
                ->unique();

            // Yang belum submit = target - submitted
            $lateOrgIds = $targetOrgIds->diff($submittedOrgIds);

            foreach ($lateOrgIds as $orgId) {
                $org = Organization::find($orgId);
                if (! $org) {
                    continue;
                }

                $results[] = [
                    'organization_id' => $orgId,
                    'indicator_version_id' => null,
                    'title' => sprintf(
                        'Keterlambatan laporan: %s — %s',
                        $org->name,
                        $period->name,
                    ),
                    'message' => sprintf(
                        'Batas akhir pelaporan: %s. Belum ada realisasi yang disubmit untuk periode ini.',
                        $period->submission_deadline,
                    ),
                ];
            }
        }

        return $results;
    }

    /**
     * FR-EWS-003: Alert jika realisasi disubmit tanpa evidence pendukung.
     *
     * @return array<int, array<string, mixed>>
     */
    private function checkEvidenceEmpty(AlertRule $rule): array
    {
        $results = [];

        $realizations = Realization::query()
            ->whereIn('status', ['submitted', 'approved'])
            ->doesntHave('evidences')
            ->with(['organization:id,name', 'indicatorVersion:id,indicator_id,name'])
            ->get();

        foreach ($realizations as $r) {
            $results[] = [
                'organization_id' => $r->organization_id,
                'indicator_version_id' => $r->indicator_version_id,
                'title' => sprintf(
                    'Realisasi tanpa evidence: %s — %s',
                    $r->indicatorVersion?->name ?? 'Indikator',
                    $r->organization?->name ?? '-',
                ),
                'message' => 'Realisasi telah disubmit tetapi tidak memiliki bukti dukung (evidence). Mohon segera unggah dokumen pendukung.',
            ];
        }

        return $results;
    }

    /**
     * Peringatan dokumen SAKIP wajib yang belum diunggah.
     *
     * @return array<int, array<string, mixed>>
     */
    private function checkDocumentOverdue(AlertRule $rule): array
    {
        $results = [];
        $year = (int) date('Y');

        try {
            $matrix = $this->sakipDocService->getSakipOpdMatrix($year);

            foreach ($matrix['rows'] as $row) {
                $missing = (int) ($row['missing_count'] ?? 0);
                if ($missing > 0) {
                    $org = Organization::find($row['organization_id']);
                    if (! $org) {
                        continue;
                    }

                    $missingNames = array_slice($row['missing_docs'] ?? [], 0, 3);
                    $missingStr = !empty($missingNames) ? implode(', ', $missingNames) : "{$missing} dokumen";

                    $results[] = [
                        'organization_id' => (int) $row['organization_id'],
                        'indicator_version_id' => null,
                        'title' => sprintf('%s: %d Dokumen SAKIP Belum Lengkap', $org->name, $missing),
                        'message' => sprintf(
                            'Perangkat daerah belum mengunggah %d dokumen SAKIP TA %d (antara lain: %s). Batas waktu pemenuhan dokumen perencanaan/pengukuran telah terlampaui.',
                            $missing,
                            $year,
                            $missingStr
                        ),
                    ];
                }
            }
        } catch (\Throwable) {
            // Fallback gracefully jika data SAKIP belum terinisialisasi
        }

        return $results;
    }

    /**
     * Peringatan Perjanjian Kinerja (PK) yang belum ditandatangani/disahkan.
     *
     * @return array<int, array<string, mixed>>
     */
    private function checkPkUnsigned(AlertRule $rule): array
    {
        $thresholdDays = (int) ($rule->config['threshold_days'] ?? 14);
        $cutoff = now()->subDays($thresholdDays);
        $results = [];

        $agreements = Agreement::query()
            ->whereIn('status', ['draft', 'submitted', 'pending'])
            ->where('created_at', '<=', $cutoff)
            ->with('organization:id,name')
            ->get();

        foreach ($agreements as $ag) {
            $results[] = [
                'organization_id' => $ag->organization_id,
                'indicator_version_id' => null,
                'title' => sprintf('%s: Perjanjian Kinerja Belum Disahkan', $ag->organization?->name ?? 'OPD'),
                'message' => sprintf(
                    'Perjanjian Kinerja "%s" masih berstatus %s sejak %s dan belum divalidasi/disahkan.',
                    $ag->title ?? $ag->name ?? 'PK Tahunan',
                    strtoupper($ag->status),
                    $ag->created_at?->format('d-m-Y') ?? '-'
                ),
            ];
        }

        return $results;
    }

    /**
     * Peringatan dokumen perencanaan dalam status revisi yang tertunda perbaikannya.
     *
     * @return array<int, array<string, mixed>>
     */
    private function checkRevisionPending(AlertRule $rule): array
    {
        $thresholdDays = (int) ($rule->config['threshold_days'] ?? 7);
        $cutoff = now()->subDays($thresholdDays);
        $results = [];

        $docs = PlanningDocument::query()
            ->where('status', 'revision')
            ->where('updated_at', '<=', $cutoff)
            ->with('organization:id,name')
            ->get();

        foreach ($docs as $doc) {
            $results[] = [
                'organization_id' => $doc->organization_id,
                'indicator_version_id' => null,
                'title' => sprintf('%s: Revisi Dokumen %s Tertunda', $doc->organization?->name ?? 'OPD', strtoupper($doc->type)),
                'message' => sprintf(
                    'Dokumen "%s" berstatus revisi sejak %s (melewati batas %d hari) dan belum diunggah ulang.',
                    $doc->title,
                    $doc->updated_at?->format('d-m-Y') ?? '-',
                    $thresholdDays
                ),
            ];
        }

        return $results;
    }
}
