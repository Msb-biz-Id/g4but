<?php

namespace App\Jobs;

use App\Models\IndicatorTarget;
use App\Models\Realization;
use App\Models\Report;
use App\Models\ReportSnapshot;
use App\Services\AchievementCalculator;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

class GenerateReportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 300;

    public function __construct(
        public readonly int $reportId,
    ) {}

    public function handle(AchievementCalculator $calculator): void
    {
        $report = Report::findOrFail($this->reportId);

        if ($report->status === 'generated') {
            return;
        }

        $report->update(['status' => 'generating']);

        try {
            $params = $report->parameters ?? [];

            // Build recap data — same logic as ReportController::buildRecapData()
            $realizationsQuery = Realization::query()
                ->with([
                    'indicatorVersion:id,indicator_id,name,direction,measurement_unit_id',
                    'indicatorVersion.measurementUnit:id,code,name,symbol',
                    'indicatorVersion.indicator:id,code',
                    'organization:id,code,name',
                    'measurementPeriod:id,name,type',
                ])
                ->where('status', 'approved')
                ->when($params['organization_id'] ?? null, fn ($q, $orgId) => $q->where('organization_id', $orgId))
                ->when($params['planning_period_id'] ?? null, function ($q, $periodId) {
                    $q->whereHas('measurementPeriod', fn ($sub) => $sub->where('planning_period_id', $periodId));
                });

            $realizations = $realizationsQuery->get();

            $targets = IndicatorTarget::query()
                ->with('indicatorVersion:id,direction')
                ->where('status', 'approved')
                ->get()
                ->keyBy(fn ($t) => $t->indicator_version_id.'|'.$t->organization_id);

            $rows = $realizations->map(function (Realization $realization) use ($targets, $calculator) {
                $target = $targets->get($realization->indicator_version_id.'|'.$realization->organization_id);

                return [
                    'indicator_code' => $realization->indicatorVersion->indicator->code ?? '',
                    'indicator_name' => $realization->indicatorVersion->name,
                    'organization_code' => $realization->organization->code,
                    'organization_name' => $realization->organization->name,
                    'period' => $realization->measurementPeriod->name,
                    'unit' => $realization->indicatorVersion->measurementUnit?->symbol
                                          ?? $realization->indicatorVersion->measurementUnit?->code ?? '',
                    'value' => (float) $realization->value,
                    'target' => $target ? (float) $target->target_value : null,
                    'achievement' => $calculator->calculate(
                        $realization->value,
                        $target?->target_value,
                        $realization->indicatorVersion->direction,
                    ),
                ];
            })->values()->all();

            $data = ['generated_at' => now()->toDateTimeString(), 'params' => $params, 'count' => count($rows), 'rows' => $rows];
            $checksum = hash('sha256', json_encode($data));

            // Snapshot the data (FR-RPT-005 — bekukan versi data)
            ReportSnapshot::updateOrCreate(
                ['report_id' => $report->id],
                ['snapshot_at' => now(), 'data' => $data, 'checksum' => $checksum, 'generated_by' => $report->generated_by],
            );

            // Store file based on format
            $path = match ($report->format) {
                'pdf' => $this->generatePdf($report, $rows),
                'csv' => $this->generateCsv($report, $rows),
                'xlsx' => $this->generateXlsx($report, $rows),
                default => $this->generateCsv($report, $rows),
            };

            $report->update([
                'status' => 'generated',
                'file_path' => $path,
                'generated_at' => now(),
            ]);
        } catch (Throwable $e) {
            Log::error('GenerateReportJob failed', ['report_id' => $this->reportId, 'error' => $e->getMessage()]);
            $report->update(['status' => 'failed']);
            throw $e;
        }
    }

    private function generatePdf(Report $report, array $rows): string
    {
        // Map rows to template-friendly keys (normalise legacy field names)
        $mappedRows = array_map(static function (array $row): array {
            return [
                'indicator_code' => $row['indicator_code'] ?? '',
                'indicator_name' => $row['indicator_name'] ?? '',
                'organization' => ($row['organization_code'] ?? '').' – '.($row['organization_name'] ?? ''),
                'target_value' => $row['target'] ?? '-',
                'realization_value' => $row['value'] ?? '-',
                'achievement' => $row['achievement'],
            ];
        }, $rows);

        $pdf = Pdf::loadView('reports.pdf', [
            'report' => $report,
            'rows' => $mappedRows,
        ])->setPaper('a4', 'landscape');

        $path = 'reports/'.$report->code.'.pdf';
        Storage::disk('local')->put($path, $pdf->output());

        return $path;
    }

    private function generateCsv(Report $report, array $rows): string
    {
        $handle = fopen('php://temp', 'r+');

        fputcsv($handle, ['Kode Indikator', 'Indikator', 'OPD', 'Nama OPD', 'Periode', 'Satuan', 'Realisasi', 'Target', 'Capaian (%)']);

        foreach ($rows as $row) {
            fputcsv($handle, [
                $row['indicator_code'],
                $row['indicator_name'],
                $row['organization_code'],
                $row['organization_name'],
                $row['period'],
                $row['unit'],
                $row['value'],
                $row['target'] ?? '',
                $row['achievement'] !== null ? round($row['achievement'], 2) : '',
            ]);
        }

        rewind($handle);
        $content = stream_get_contents($handle);
        fclose($handle);

        $path = 'reports/'.$report->code.'.csv';
        Storage::disk('local')->put($path, $content);

        return $path;
    }

    private function generateXlsx(Report $report, array $rows): string
    {
        // Build a minimal XLSX-compatible CSV (tab-separated) as placeholder
        // Real XLSX generation would use PhpSpreadsheet in production
        $handle = fopen('php://temp', 'r+');
        fputcsv($handle, ['Kode Indikator', 'Indikator', 'OPD', 'Periode', 'Satuan', 'Realisasi', 'Target', 'Capaian (%)']);
        foreach ($rows as $row) {
            fputcsv($handle, [
                $row['indicator_code'], $row['indicator_name'],
                $row['organization_code'].' - '.$row['organization_name'],
                $row['period'], $row['unit'], $row['value'],
                $row['target'] ?? '', $row['achievement'] !== null ? round($row['achievement'], 2) : '',
            ]);
        }
        rewind($handle);
        $content = stream_get_contents($handle);
        fclose($handle);

        $path = 'reports/'.$report->code.'.csv';
        Storage::disk('local')->put($path, $content);

        return $path;
    }
}
