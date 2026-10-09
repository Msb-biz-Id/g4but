<?php

namespace App\Http\Controllers\Import;

use App\Http\Controllers\Controller;
use App\Models\ImportBatch;
use App\Models\Indicator;
use App\Models\IndicatorVersion;
use App\Models\MeasurementUnit;
use App\Models\Organization;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ImportController extends Controller
{
    private const SCHEMAS = [
        'organizations' => [
            'required' => ['code', 'name'],
            'optional' => ['type'],
            'label' => 'OPD',
        ],
        'indicators' => [
            'required' => ['code', 'name'],
            'optional' => ['type', 'direction', 'frequency', 'unit'],
            'label' => 'Indikator',
        ],
    ];

    public function __construct(private readonly AuditService $audit) {}

    public function index(Request $request): Response
    {
        $this->authorize('run-imports');

        $batches = ImportBatch::query()
            ->with('creator:id,name')
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 10))
            ->withQueryString();

        return Inertia::render('Imports/Index', [
            'batches' => $batches,
            'filters' => $request->only(['per_page']),
        ]);
    }

    public function upload(Request $request): RedirectResponse
    {
        $this->authorize('run-imports');

        $validated = $request->validate([
            // FR-MD-010: terima CSV dan Excel
            'file' => ['required', 'file', 'mimes:csv,txt,xlsx,xls', 'max:10240'],
            'import_type' => ['required', 'string', 'in:organizations,indicators'],
        ]);

        $importType = $validated['import_type'];
        $schema = self::SCHEMAS[$importType];
        $ext = strtolower($validated['file']->getClientOriginalExtension());

        // Pilih parser berdasarkan ekstensi
        $rows = in_array($ext, ['xlsx', 'xls'])
            ? $this->parseXlsx($validated['file']->getRealPath())
            : $this->parseCsv($validated['file']->getRealPath());

        if ($rows === []) {
            return back()->withErrors(['file' => 'File kosong atau tidak valid. Pastikan format CSV/XLSX benar.']);
        }

        $missingHeaders = array_values(array_diff($schema['required'], array_keys($rows[0])));
        if ($missingHeaders !== []) {
            return back()->withErrors([
                'file' => 'Header wajib tidak ditemukan: '.implode(', ', $missingHeaders).'.',
            ]);
        }

        $normalized = [];
        $errors = [];
        $validRows = 0;
        $invalidRows = 0;

        foreach ($rows as $index => $row) {
            $rowErrors = $this->validateRow($importType, $row);
            $data = $this->normalizeRow($importType, $row);

            if ($rowErrors !== []) {
                $invalidRows++;
                foreach ($rowErrors as $message) {
                    $errors[] = 'Baris '.($index + 2).': '.$message;
                }
            } else {
                $validRows++;
            }

            $normalized[] = [
                'line' => $index + 2,
                'data' => $data,
                'valid' => $rowErrors === [],
                'errors' => $rowErrors,
            ];
        }

        $batch = ImportBatch::create([
            'import_type' => $importType,
            'file_name' => $validated['file']->getClientOriginalName(),
            'status' => 'preview',
            'total_rows' => count($normalized),
            'valid_rows' => $validRows,
            'invalid_rows' => $invalidRows,
            'rows' => $normalized,
            'errors' => $errors,
            'created_by' => $request->user()->id,
        ]);

        $this->audit->log('import_upload', 'import_batch', $batch->id, null, diff: [
            'type' => $importType,
            'total' => $batch->total_rows,
            'valid' => $validRows,
            'invalid' => $invalidRows,
        ]);

        return redirect()->route('imports.preview', $batch->id)->with('success', 'File dianalisis. Tinjau hasil sebelum commit.');
    }

    public function preview(ImportBatch $batch): Response
    {
        $this->authorize('run-imports');

        return Inertia::render('Imports/Preview', ['batch' => $batch]);
    }

    public function commit(ImportBatch $batch): RedirectResponse
    {
        $this->authorize('run-imports');

        abort_if($batch->status !== 'preview', 422, 'Batch sudah diproses.');

        $imported = 0;
        $skipped = 0;

        DB::transaction(function () use ($batch, &$imported, &$skipped) {
            foreach ($batch->rows ?? [] as $entry) {
                if (! $entry['valid']) {
                    continue;
                }

                $result = $this->insertRow($batch->import_type, $entry['data']);
                if ($result === 'imported') {
                    $imported++;
                } else {
                    $skipped++;
                }
            }
        });

        $batch->update([
            'status' => 'committed',
            'imported' => $imported,
            'skipped' => $skipped,
            'committed_by' => request()->user()->id,
            'committed_at' => now(),
        ]);

        $this->audit->log('import_commit', 'import_batch', $batch->id, null, diff: [
            'imported' => $imported,
            'skipped' => $skipped,
        ]);

        return redirect()->route('imports.preview', $batch->id)->with('success', "Import selesai: {$imported} diimpor, {$skipped} dilewati.");
    }

    public function cancel(ImportBatch $batch): RedirectResponse
    {
        $this->authorize('run-imports');

        abort_if($batch->status !== 'preview', 422, 'Batch sudah diproses.');

        $batch->update(['status' => 'cancelled']);

        $this->audit->log('import_cancel', 'import_batch', $batch->id, null);

        return redirect()->route('imports.preview', $batch->id)->with('success', 'Import dibatalkan.');
    }

    public function report(ImportBatch $batch): StreamedResponse
    {
        $this->authorize('run-imports');

        $rows = collect($batch->rows ?? [])->map(function (array $entry) {
            return [
                'baris' => $entry['line'],
                'status' => $entry['valid'] ? 'valid' : 'error',
                'pesan' => implode('; ', $entry['errors']),
            ];
        });

        $this->audit->log('import_report', 'import_batch', $batch->id, null);

        return response()->streamDownload(function () use ($rows) {
            $handle = fopen('php://output', 'w');
            fwrite($handle, "\xEF\xBB\xBF");
            fputcsv($handle, ['Baris', 'Status', 'Pesan']);

            foreach ($rows as $row) {
                fputcsv($handle, $row);
            }

            fclose($handle);
        }, "laporan-import-{$batch->id}.csv", ['Content-Type' => 'text/csv']);
    }

    private function validateRow(string $importType, array $row): array
    {
        $errors = [];

        if (trim($row['code'] ?? '') === '') {
            $errors[] = 'kolom code wajib diisi.';
        }

        if (trim($row['name'] ?? '') === '') {
            $errors[] = 'kolom name wajib diisi.';
        }

        if ($importType === 'organizations') {
            $type = trim($row['type'] ?? 'opd');
            if (! in_array($type, ['opd', 'provinsi', 'unit'], true)) {
                $errors[] = "type '$type' tidak valid (opd/provinsi/unit).";
            }
        }

        if ($importType === 'indicators') {
            $type = trim($row['type'] ?? 'output');
            if (! in_array($type, ['input', 'process', 'output', 'outcome', 'impact'], true)) {
                $errors[] = "type '$type' tidak valid.";
            }

            $direction = trim($row['direction'] ?? 'higher_is_better');
            if (! in_array($direction, ['higher_is_better', 'lower_is_better', 'exact', 'binary', 'custom'], true)) {
                $errors[] = "direction '$direction' tidak valid.";
            }

            $frequency = trim($row['frequency'] ?? 'annual');
            if (! in_array($frequency, ['monthly', 'quarterly', 'semester', 'annual'], true)) {
                $errors[] = "frequency '$frequency' tidak valid.";
            }
        }

        return $errors;
    }

    private function normalizeRow(string $importType, array $row): array
    {
        $data = [
            'code' => trim($row['code'] ?? ''),
            'name' => trim($row['name'] ?? ''),
        ];

        if ($importType === 'organizations') {
            $data['type'] = trim($row['type'] ?? 'opd');
        } else {
            $data['type'] = trim($row['type'] ?? 'output');
            $data['direction'] = trim($row['direction'] ?? 'higher_is_better');
            $data['frequency'] = trim($row['frequency'] ?? 'annual');
            $data['unit'] = trim($row['unit'] ?? '');
        }

        return $data;
    }

    private function insertRow(string $importType, array $data): string
    {
        if ($importType === 'organizations') {
            if (Organization::where('code', $data['code'])->exists()) {
                return 'skipped';
            }

            Organization::create([
                'code' => $data['code'],
                'name' => $data['name'],
                'type' => $data['type'],
            ]);

            return 'imported';
        }

        if (Indicator::where('code', $data['code'])->exists()) {
            return 'skipped';
        }

        $unit = null;
        if ($data['unit'] !== '') {
            $unit = MeasurementUnit::firstOrCreate(['code' => $data['unit']], ['name' => $data['unit']]);
        }

        $indicator = Indicator::create([
            'code' => $data['code'],
            'name' => $data['name'],
            'type' => $data['type'],
            'direction' => $data['direction'],
            'frequency' => $data['frequency'],
            'measurement_unit_id' => $unit?->id,
            'status' => 'draft',
        ]);

        $version = IndicatorVersion::create([
            'indicator_id' => $indicator->id,
            'version_number' => 1,
            'name' => $data['name'],
            'type' => $data['type'],
            'direction' => $data['direction'],
            'measurement_unit_id' => $unit?->id,
            'frequency' => $data['frequency'],
        ]);

        $indicator->update(['current_version_id' => $version->id]);

        return 'imported';
    }

    /**
     * Parse CSV ke array asosiatif menggunakan header baris pertama.
     *
     * @return array<int, array<string, string>>
     */
    private function parseCsv(string $path): array
    {
        $handle = fopen($path, 'r');
        if ($handle === false) {
            return [];
        }

        $headers = fgetcsv($handle);
        if ($headers === false) {
            fclose($handle);

            return [];
        }

        $headers = array_map(fn ($h) => strtolower(trim($h)), $headers);

        $rows = [];
        while (($line = fgetcsv($handle)) !== false) {
            $row = [];
            foreach ($headers as $i => $header) {
                $row[$header] = $line[$i] ?? '';
            }
            $rows[] = $row;
        }

        fclose($handle);

        return $rows;
    }

    /**
     * FR-MD-010: Parse file XLSX/XLS menggunakan PhpSpreadsheet.
     * Baris pertama dianggap header, baris berikutnya adalah data.
     *
     * @return array<int, array<string, string>>
     */
    private function parseXlsx(string $path): array
    {
        try {
            $spreadsheet = IOFactory::load($path);
            $sheet = $spreadsheet->getActiveSheet();
            $data = $sheet->toArray(null, true, true, false);
        } catch (\Throwable) {
            return [];
        }

        if (empty($data) || count($data) < 2) {
            return [];
        }

        // Baris pertama = header
        $headers = array_map(fn ($h) => strtolower(trim((string) ($h ?? ''))), $data[0]);
        array_shift($data);

        $rows = [];
        foreach ($data as $line) {
            // Skip baris kosong
            $hasValue = collect($line)->filter(fn ($v) => ! empty(trim((string) ($v ?? ''))))->isNotEmpty();
            if (! $hasValue) {
                continue;
            }

            $row = [];
            foreach ($headers as $i => $header) {
                $row[$header] = trim((string) ($line[$i] ?? ''));
            }
            $rows[] = $row;
        }

        return $rows;
    }

    /**
     * FR-MD-010: Download template Excel untuk tipe import tertentu.
     */
    public function downloadTemplate(Request $request): StreamedResponse
    {
        $this->authorize('run-imports');

        $type = $request->string('type', 'organizations')->value();
        if (! array_key_exists($type, self::SCHEMAS)) {
            abort(400, 'Tipe import tidak valid.');
        }

        $schema = self::SCHEMAS[$type];
        $headers = array_merge($schema['required'], $schema['optional']);

        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle(ucfirst($type));

        // Header row
        foreach ($headers as $col => $header) {
            $cell = Coordinate::stringFromColumnIndex($col + 1).'1';
            $sheet->setCellValue($cell, $header);
            $sheet->getStyle($cell)->getFont()->setBold(true);
            $sheet->getStyle($cell)->getFill()
                ->setFillType(Fill::FILL_SOLID)
                ->getStartColor()->setARGB('FF1A3A6B');
            $sheet->getStyle($cell)->getFont()->getColor()->setARGB('FFFFFFFF');
        }

        // Auto-size columns
        foreach (range(1, count($headers)) as $col) {
            $sheet->getColumnDimensionByColumn($col)->setAutoSize(true);
        }

        // Contoh data baris 2
        $examples = [
            'organizations' => ['OPD001', 'Dinas Kesehatan', 'opd'],
            'indicators' => ['IND001', 'Persentase Layanan Selesai Tepat Waktu', 'outcome', 'higher_is_better', 'quarterly', 'persen'],
        ];

        if (isset($examples[$type])) {
            foreach ($examples[$type] as $col => $val) {
                $cell = Coordinate::stringFromColumnIndex($col + 1).'2';
                $sheet->setCellValue($cell, $val);
                $sheet->getStyle($cell)->getFont()->setItalic(true)->getColor()->setARGB('FF888888');
            }
        }

        $filename = "template-import-{$type}.xlsx";

        return response()->stream(function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        }, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => "attachment; filename={$filename}",
            'Cache-Control' => 'max-age=0',
        ]);
    }
}
