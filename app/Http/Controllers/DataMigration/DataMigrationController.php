<?php

namespace App\Http\Controllers\DataMigration;

use App\Http\Controllers\Controller;
use App\Models\DataMigration;
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
use Symfony\Component\HttpFoundation\StreamedResponse;

class DataMigrationController extends Controller
{
    private const ENUMS = [
        'organizations' => [
            'type' => ['opd', 'provinsi', 'unit'],
        ],
        'indicators' => [
            'type' => ['input', 'process', 'output', 'outcome', 'impact'],
            'direction' => ['higher_is_better', 'lower_is_better', 'exact', 'binary', 'custom'],
            'frequency' => ['monthly', 'quarterly', 'semester', 'annual'],
        ],
    ];

    public function __construct(private readonly AuditService $audit) {}

    public function index(Request $request): Response
    {
        $this->authorize('run-migrations');

        $migrations = DataMigration::query()
            ->with('creator:id,name')
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 25))
            ->withQueryString();

        return Inertia::render('DataMigrations/Index', [
            'migrations' => $migrations,
            'filters' => $request->only(['per_page']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorize('run-migrations');

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:200'],
            'entity_type' => ['required', 'string', 'in:organizations,indicators'],
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:10240'],
        ]);

        $rows = $this->parseCsv($validated['file']->getRealPath());
        if ($rows === []) {
            return back()->withErrors(['file' => 'File CSV kosong atau tidak valid.']);
        }

        $entityType = $validated['entity_type'];
        $stored = $validated['file']->store('data_migrations');
        $sourceCount = count($rows);
        $profile = $this->profile($entityType, $rows);

        $migration = DataMigration::create([
            'name' => $validated['name'],
            'entity_type' => $entityType,
            'source_file' => $stored,
            'status' => 'staged',
            'source_count' => $sourceCount,
            'profile' => $profile,
            'staging' => $rows,
            'created_by' => $request->user()->id,
        ]);

        $this->audit->log('migration_create', 'data_migration', $migration->id, null, diff: [
            'entity_type' => $entityType,
            'source_count' => $sourceCount,
        ]);

        return redirect()->route('migrations.show', $migration->id)->with('success', 'Migrasi dibuat (inventaris & profiling selesai).');
    }

    public function show(DataMigration $migration): Response
    {
        $this->authorize('run-migrations');

        return Inertia::render('DataMigrations/Show', ['migration' => $migration]);
    }

    public function validateSteps(DataMigration $migration): RedirectResponse
    {
        $this->authorize('run-migrations');

        abort_if(! in_array($migration->status, ['staged', 'validated'], true), 422, 'Tahap tidak valid.');

        [$cleansed, $transformed] = $this->cleanseAndTransform($migration->entity_type, $migration->staging ?? []);

        $migration->update([
            'status' => 'validated',
            'mapped_count' => $migration->source_count,
            'cleansed_count' => $cleansed,
            'transformed_count' => $transformed,
        ]);

        $this->audit->log('migration_validate', 'data_migration', $migration->id, null, diff: [
            'cleansed' => $cleansed,
            'transformed' => $transformed,
        ]);

        return back()->with('success', 'Mapping, cleansing, dan transform selesai.');
    }

    public function reconcile(DataMigration $migration): RedirectResponse
    {
        $this->authorize('run-migrations');

        abort_if(! in_array($migration->status, ['validated', 'reconciled'], true), 422, 'Validasi data dulu sebelum rekonsiliasi.');

        $reconciliation = $this->buildReconciliation($migration);

        $migration->update([
            'status' => 'reconciled',
            'reconciliation' => $reconciliation,
        ]);

        $this->audit->log('migration_reconcile', 'data_migration', $migration->id, null, diff: $reconciliation);

        return back()->with('success', 'Rekonsiliasi selesai.');
    }

    public function approve(DataMigration $migration): RedirectResponse
    {
        $this->authorize('run-migrations');

        abort_if($migration->status !== 'reconciled', 422, 'Rekonsiliasi harus selesai sebelum sign-off.');

        $migration->update([
            'status' => 'signed_off',
            'signed_off_by' => request()->user()->id,
            'signed_off_at' => now(),
        ]);

        $this->audit->log('migration_approve', 'data_migration', $migration->id, null);

        return back()->with('success', 'Business sign-off dilakukan.');
    }

    public function load(DataMigration $migration): RedirectResponse
    {
        $this->authorize('run-migrations');

        abort_if($migration->status !== 'signed_off', 422, 'Sign-off wajib sebelum production load.');

        $loaded = 0;
        $skipped = 0;

        DB::transaction(function () use ($migration, &$loaded, &$skipped) {
            foreach ($migration->staging ?? [] as $row) {
                $row = $this->normalizeRow($migration->entity_type, $row);
                if (! $this->rowIsValid($migration->entity_type, $row)) {
                    continue;
                }

                $result = $this->insertRow($migration->entity_type, $row);
                if ($result === 'imported') {
                    $loaded++;
                } else {
                    $skipped++;
                }
            }
        });

        $migration->update([
            'status' => 'loaded',
            'loaded_count' => $loaded,
            'loaded_by' => request()->user()->id,
            'loaded_at' => now(),
        ]);

        $this->audit->log('migration_load', 'data_migration', $migration->id, null, diff: [
            'loaded' => $loaded,
            'skipped' => $skipped,
        ]);

        return back()->with('success', "Production load selesai: {$loaded} dimuat, {$skipped} sudah ada.");
    }

    public function report(DataMigration $migration): StreamedResponse
    {
        $this->authorize('run-migrations');

        $this->audit->log('migration_report', 'data_migration', $migration->id, null);

        return response()->streamDownload(function () use ($migration) {
            $handle = fopen('php://output', 'w');
            fwrite($handle, "\xEF\xBB\xBF");
            fputcsv($handle, ['Metrik', 'Nilai']);
            fputcsv($handle, ['Nama', $migration->name]);
            fputcsv($handle, ['Entitas', $migration->entity_type]);
            fputcsv($handle, ['Status', $migration->status]);
            fputcsv($handle, ['Sumber', $migration->source_count]);
            fputcsv($handle, ['Mapping', $migration->mapped_count]);
            fputcsv($handle, ['Cleansing', $migration->cleansed_count]);
            fputcsv($handle, ['Transform', $migration->transformed_count]);
            fputcsv($handle, ['Dimuat', $migration->loaded_count]);

            foreach ($migration->reconciliation ?? [] as $key => $value) {
                if (! is_array($value)) {
                    fputcsv($handle, [ucfirst((string) $key), $value]);
                }
            }

            fclose($handle);
        }, "rekonsiliasi-migrasi-{$migration->id}.csv", ['Content-Type' => 'text/csv']);
    }

    /**
     * Profiling sederhana: kelengkapan kolom, duplikasi kode, nilai enum tidak valid.
     *
     * @param  array<int, array<string, string>>  $rows
     * @return array<string, mixed>
     */
    private function profile(string $entityType, array $rows): array
    {
        $total = count($rows);
        $codes = [];
        $duplicates = 0;
        $enumInvalid = 0;

        foreach ($rows as $row) {
            $code = trim($row['code'] ?? '');
            if ($code !== '') {
                $codes[$code] = ($codes[$code] ?? 0) + 1;
            }

            foreach (self::ENUMS[$entityType] as $field => $allowed) {
                $value = trim($row[$field] ?? '');
                if ($value !== '' && ! in_array($value, $allowed, true)) {
                    $enumInvalid++;
                }
            }
        }

        foreach ($codes as $count) {
            if ($count > 1) {
                $duplicates += $count - 1;
            }
        }

        return [
            'columns' => array_keys($rows[0]),
            'missing_required' => count(array_filter($rows, fn ($r) => trim($r['code'] ?? '') === '' || trim($r['name'] ?? '') === '')),
            'duplicate_codes' => $duplicates,
            'invalid_enum_values' => $enumInvalid,
            'total' => $total,
        ];
    }

    /**
     * @param  array<int, array<string, string>>  $rows
     * @return array{0: int, 1: int}
     */
    private function cleanseAndTransform(string $entityType, array $rows): array
    {
        $cleansed = 0;
        $transformed = 0;

        foreach ($rows as $row) {
            $row = $this->normalizeRow($entityType, $row);
            if (trim($row['code'] ?? '') === '' || trim($row['name'] ?? '') === '') {
                continue;
            }
            $cleansed++;

            if ($this->rowIsValid($entityType, $row)) {
                $transformed++;
            }
        }

        return [$cleansed, $transformed];
    }

    /**
     * @return array<string, mixed>
     */
    private function buildReconciliation(DataMigration $migration): array
    {
        $codes = collect($migration->staging ?? [])
            ->map(fn ($row) => $this->normalizeRow($migration->entity_type, $row))
            ->filter(fn ($row) => $this->rowIsValid($migration->entity_type, $row))
            ->pluck('code')
            ->unique();

        $targetCodes = $migration->entity_type === 'organizations'
            ? Organization::query()->pluck('code')
            : Indicator::query()->pluck('code');

        $target = $targetCodes->map(fn ($code) => (string) $code);

        $matched = $codes->filter(fn ($code) => $target->contains($code))->count();
        $willLoad = $codes->count() - $matched;
        $unmatchedTarget = $target->diff($codes)->count();

        $invalid = collect($migration->staging ?? [])
            ->filter(fn ($row) => ! $this->rowIsValid($migration->entity_type, $this->normalizeRow($migration->entity_type, $row)))
            ->count();

        return [
            'source_valid' => $codes->count(),
            'invalid_rows' => $invalid,
            'target_total' => $target->count(),
            'matched' => $matched,
            'will_load' => $willLoad,
            'unmatched_source' => $codes->count() - $matched,
            'unmatched_target' => $unmatchedTarget,
            'reconciled' => $codes->count() > 0 && $invalid === 0,
        ];
    }

    /**
     * @param  array<string, string>  $row
     * @return array<string, string>
     */
    private function normalizeRow(string $entityType, array $row): array
    {
        if ($entityType === 'organizations') {
            return [
                'code' => trim($row['code'] ?? ''),
                'name' => trim($row['name'] ?? ''),
                'type' => trim($row['type'] ?? 'opd'),
            ];
        }

        return [
            'code' => trim($row['code'] ?? ''),
            'name' => trim($row['name'] ?? ''),
            'type' => trim($row['type'] ?? 'output'),
            'direction' => trim($row['direction'] ?? 'higher_is_better'),
            'frequency' => trim($row['frequency'] ?? 'annual'),
            'unit' => trim($row['unit'] ?? ''),
        ];
    }

    /**
     * @param  array<string, string>  $row
     */
    private function rowIsValid(string $entityType, array $row): bool
    {
        if ($row['code'] === '' || $row['name'] === '') {
            return false;
        }

        foreach (self::ENUMS[$entityType] as $field => $allowed) {
            $value = $row[$field] ?? '';
            if ($value !== '' && ! in_array($value, $allowed, true)) {
                return false;
            }
        }

        return true;
    }

    /**
     * @param  array<string, string>  $row
     */
    private function insertRow(string $entityType, array $row): string
    {
        if ($entityType === 'organizations') {
            if (Organization::where('code', $row['code'])->exists()) {
                return 'skipped';
            }

            Organization::create([
                'code' => $row['code'],
                'name' => $row['name'],
                'type' => $row['type'],
            ]);

            return 'imported';
        }

        if (Indicator::where('code', $row['code'])->exists()) {
            return 'skipped';
        }

        $unit = null;
        if ($row['unit'] !== '') {
            $unit = MeasurementUnit::firstOrCreate(['code' => $row['unit']], ['name' => $row['unit']]);
        }

        $indicator = Indicator::create([
            'code' => $row['code'],
            'name' => $row['name'],
            'type' => $row['type'],
            'direction' => $row['direction'],
            'frequency' => $row['frequency'],
            'measurement_unit_id' => $unit?->id,
            'status' => 'draft',
        ]);

        $version = IndicatorVersion::create([
            'indicator_id' => $indicator->id,
            'version_number' => 1,
            'name' => $row['name'],
            'type' => $row['type'],
            'direction' => $row['direction'],
            'measurement_unit_id' => $unit?->id,
            'frequency' => $row['frequency'],
        ]);

        $indicator->update(['current_version_id' => $version->id]);

        return 'imported';
    }

    /**
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
}
