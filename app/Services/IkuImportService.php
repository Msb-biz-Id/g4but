<?php

namespace App\Services;

use App\Models\IkuHistory;
use App\Models\Indicator;
use App\Models\MeasurementUnit;
use App\Models\Organization;
use App\Models\PlanningPeriod;
use App\Models\StrategicGoal;
use App\Models\StrategicObjective;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class IkuImportService
{
    /** Kolom wajib ada di baris header Excel */
    public const REQUIRED_HEADERS = [
        'Level', 'Nama OPD', 'Periode (Renstra)', 'Tujuan', 'Sasaran', 'Nama Indikator', 'Satuan',
        'Tahun Baseline', 'Nilai Baseline', 'Keterangan Baseline', 'Definisi Operasional',
        'Formula', 'Polarisasi', 'Sumber Data', 'Frekuensi',
    ];

    /**
     * Baca file Excel, validasi tiap baris, kembalikan valid_rows + error_rows.
     */
    public function preview(UploadedFile $file, User|int $user): array
    {
        $userObj = $user instanceof User ? $user : User::find($user);
        $isOpdAdmin = $userObj && $userObj->isOpdAdmin();
        $accessibleOrgIds = $userObj ? app(AuthorizationService::class)->accessibleOrganizationIds($userObj) : [];

        $spreadsheet = IOFactory::load($file->getPathname());
        $sheet = $spreadsheet->getActiveSheet();
        $rows = $sheet->toArray(null, true, true, true);

        if (count($rows) < 2) {
            return ['valid_rows' => [], 'error_rows' => [], 'total_rows' => 0];
        }

        // Baris pertama = header
        $header = array_values($rows[1]);
        $dataRows = array_slice($rows, 1, null, true); // dari baris ke-2

        $validRows = [];
        $errorRows = [];

        foreach ($dataRows as $rowNum => $rawRow) {
            $row = array_combine($header, array_values($rawRow));
            if (! $row) {
                continue;
            }

            // Lewati baris kosong
            if (empty(trim($row['Nama Indikator'] ?? ''))) {
                continue;
            }

            $errors = $this->validateRow($row, $rowNum, $userObj, $isOpdAdmin, $accessibleOrgIds);

            if (empty($errors)) {
                $validRows[] = $this->mapRow($row, $userObj, $isOpdAdmin, $accessibleOrgIds);
            } else {
                $errorRows[] = [
                    'row' => $rowNum,
                    'data' => $row,
                    'errors' => $errors,
                ];
            }
        }

        return [
            'valid_rows' => $validRows,
            'error_rows' => $errorRows,
            'total_rows' => count($validRows) + count($errorRows),
        ];
    }

    /**
     * Commit baris valid ke database.
     * Returns jumlah baris yang berhasil diimpor.
     */
    public function commit(array $validRows, User|int $user): int
    {
        $userObj = $user instanceof User ? $user : User::find($user);
        $userId = $userObj?->id ?? (int) $user;
        $isOpdAdmin = $userObj && $userObj->isOpdAdmin();
        $accessibleOrgIds = $userObj ? app(AuthorizationService::class)->accessibleOrganizationIds($userObj) : [];

        $count = 0;
        $workflowService = app(IkuWorkflowService::class);

        DB::transaction(function () use ($validRows, $userId, &$count, $workflowService, $isOpdAdmin, $accessibleOrgIds) {
            $baseSeq = Indicator::iku()->count() + 1;
            foreach ($validRows as $row) {
                // Keamanan isolasi unit: Pengguna unit hanya boleh mengimpor untuk unit yang diizinkan
                $targetOrgId = (int) ($row['owner_organization_id'] ?? 0);
                if (! $isOpdAdmin && ! in_array($targetOrgId, $accessibleOrgIds, true)) {
                    continue;
                }

                try {
                    $prefix = ($row['level'] ?? '') === 'unit' ? 'IKU-UNIT' : 'IKU-OPD';
                    $code = strtoupper($prefix.'-'.str_pad($baseSeq + $count, 4, '0', STR_PAD_LEFT));

                    // Pisahkan targets dari field IKU utama
                    $targets = $row['_targets'] ?? [];
                    unset($row['_targets']);

                    $iku = Indicator::create([
                        ...$row,
                        'code' => $code,
                        'is_iku' => true,
                        'iku_status' => Indicator::IKU_STATUS_DRAFT,
                        'status' => 'draft',
                    ]);

                    $workflowService->recordHistory(
                        $iku, IkuHistory::ACTION_CREATE,
                        null, $workflowService->snapshot($iku),
                        'Import dari Excel', $userId
                    );

                    // Simpan target tahunan ke indicator_targets
                    if (! empty($targets) && $iku->planning_period_id) {
                        $this->saveTargets($iku, $targets, $userId);
                    }

                    $count++;
                } catch (\Exception $e) {
                    logger()->warning('IKU import row failed: '.$e->getMessage(), $row);
                }
            }
        });

        return $count;
    }

    /**
     * Generate template Excel untuk didownload.
     */
    public function generateTemplate(): StreamedResponse
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Template IKU');

        $period = PlanningPeriod::where('status', 'active')->orderByDesc('year')->first()
            ?? PlanningPeriod::orderByDesc('year')->first();
        $years = ($period && $period->start_year && $period->end_year)
            ? range($period->start_year, $period->end_year)
            : PlanningPeriod::getAvailableYears();
        if (empty($years)) {
            $nowYear = (int) date('Y');
            $years = range($nowYear, $nowYear + 4);
        }

        // Header
        $targetCols = array_map(fn ($y) => "Target {$y}", $years);
        $columns = array_merge([
            'Level', 'Nama OPD / Unit', 'Periode (Renstra)', 'Tujuan', 'Sasaran', 'Nama Indikator',
            'Satuan', 'Tahun Baseline', 'Nilai Baseline', 'Keterangan Baseline',
            'Definisi Operasional', 'Formula', 'Polarisasi',
            'Sumber Data', 'Frekuensi', 'Unit Penanggung Jawab',
        ], $targetCols);

        foreach ($columns as $i => $col) {
            $colLetter = Coordinate::stringFromColumnIndex($i + 1);
            $cell = $colLetter.'1';
            $sheet->setCellValue($cell, $col);
            $sheet->getStyle($cell)->getFont()->setBold(true);
            $sheet->getColumnDimensionByColumn($i + 1)->setAutoSize(true);
        }

        // Baris contoh
        $exampleTargets = array_map(fn ($idx) => (string) (86 + $idx), array_keys($years));
        $periodName = $period ? $period->name : ('Renstra '.min($years).'–'.max($years));
        $example = array_merge([
            'opd', 'Dinas Pendidikan', $periodName,
            'Meningkatnya mutu pendidikan', 'Meningkatnya akses pendidikan',
            'Angka Partisipasi Kasar (APK) SMA',
            '%', (string) ($years[0] - 1), '85.5', '', 'Perbandingan jumlah siswa SMA dgn populasi usia 16-18',
            '(Jumlah siswa SMA / Populasi usia 16-18) × 100', 'positif',
            'Dapodik / Dinas Pendidikan', 'annual', 'Kepala Bidang SMA',
        ], $exampleTargets);

        foreach ($example as $i => $val) {
            $colLetter = Coordinate::stringFromColumnIndex($i + 1);
            $sheet->setCellValue($colLetter.'2', $val);
        }

        // Petunjuk sheet
        $note = $spreadsheet->createSheet();
        $note->setTitle('Petunjuk');
        $note->setCellValue('A1', 'PETUNJUK PENGISIAN TEMPLATE IKU OPD');
        $note->getStyle('A1')->getFont()->setBold(true)->setSize(13);

        $petunjuk = [
            ['Level',           'Isi dengan: opd (untuk IKU Induk OPD) atau unit (untuk Sekretariat / Bidang)'],
            ['Nama OPD / Unit', 'Nama unit organisasi penanggung jawab'],
            ['Periode (Renstra)', 'Nama periode perencanaan'],
            ['Tujuan',          'Nama tujuan strategis'],
            ['Sasaran',         'Nama sasaran strategis'],
            ['Polarisasi',      'Isi dengan: positif, negatif, atau stabil'],
            ['Frekuensi',       'Isi dengan: monthly, quarterly, semester, atau annual'],
            ['Target Tahun',    'Isi nilai numerik saja (tanpa satuan)'],
        ];

        foreach ($petunjuk as $r => $row) {
            $note->setCellValue('A'.($r + 3), $row[0]);
            $note->setCellValue('B'.($r + 3), $row[1]);
        }

        $writer = new Xlsx($spreadsheet);
        $filename = 'Template-Import-IKU-OPD.xlsx';

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    // ── Private ───────────────────────────────────────────────────────────────

    private function validateRow(array $row, int $rowNum, ?User $user = null, bool $isOpdAdmin = false, array $accessibleOrgIds = []): array
    {
        $errors = [];

        if (empty($row['Nama Indikator'])) {
            $errors[] = 'Nama Indikator wajib diisi';
        }

        $rawLevel = strtolower(trim($row['Level'] ?? ''));
        if ($rawLevel === 'perangkat_daerah') {
            $rawLevel = 'opd';
        }

        if ($rawLevel === 'pemda') {
            $errors[] = 'Level pemda tidak lagi berlaku. Gunakan: opd atau unit.';
        } elseif (! in_array($rawLevel, ['opd', 'unit'], true)) {
            $errors[] = 'Level tidak valid (gunakan: opd / unit)';
        }

        $orgName = trim($row['Nama OPD / Unit'] ?? $row['Nama OPD'] ?? '');
        if (! empty($orgName)) {
            $org = Organization::where('name', 'like', '%'.$orgName.'%')->first();
            if ($org && ! $isOpdAdmin && ! in_array((int) $org->id, $accessibleOrgIds, true)) {
                $errors[] = "Anda tidak memiliki akses untuk mengimpor IKU pada unit '{$org->name}'.";
            }
        }

        if (! in_array(strtolower($row['Polarisasi'] ?? ''), ['positif', 'negatif', 'stabil'])) {
            $errors[] = 'Polarisasi tidak valid (gunakan: positif / negatif / stabil)';
        }

        if (! in_array(strtolower($row['Frekuensi'] ?? ''), ['monthly', 'quarterly', 'semester', 'annual'])) {
            $errors[] = 'Frekuensi tidak valid (gunakan: monthly / quarterly / semester / annual)';
        }

        if (empty($row['Sasaran'])) {
            $errors[] = 'Sasaran wajib diisi';
        }

        if (empty($row['Definisi Operasional'])) {
            $errors[] = 'Definisi Operasional wajib diisi';
        }

        if (empty($row['Satuan'])) {
            $errors[] = 'Satuan wajib diisi';
        }

        // Cek duplikasi: nama
        $exists = Indicator::where('name', $row['Nama Indikator'])
            ->where('is_iku', true)
            ->exists();

        if ($exists) {
            $errors[] = "IKU dengan nama '{$row['Nama Indikator']}' sudah ada";
        }

        return $errors;
    }

    private function mapRow(array $row, ?User $user = null, bool $isOpdAdmin = false, array $accessibleOrgIds = []): array
    {
        $level = strtolower(trim($row['Level'] ?? 'opd'));
        if ($level === 'perangkat_daerah') {
            $level = 'opd';
        }
        if (! in_array($level, ['opd', 'unit'], true)) {
            $level = 'opd';
        }

        // Resolve organization
        $orgName = trim($row['Nama OPD / Unit'] ?? $row['Nama OPD'] ?? '');
        $org = null;
        if (! empty($orgName)) {
            $org = Organization::where('name', 'like', '%'.$orgName.'%')->first();
        }

        if (! $org) {
            $org = $user?->unitOrganization() ?? $user?->defaultOrganization();
        }

        // Resolve measurement unit
        $unit = MeasurementUnit::where('symbol', $row['Satuan'])
            ->orWhere('name', $row['Satuan'])
            ->first();

        // Resolve planning period
        $periodName = trim($row['Periode (Renstra)']  ?? '');
        $period = null;
        if (! empty($periodName)) {
            $period = PlanningPeriod::where('name', 'like', '%'.$periodName.'%')->first();
        }
        if (! $period) {
            $period = PlanningPeriod::where('status', 'active')->orderByDesc('year')->first()
                ?? PlanningPeriod::orderByDesc('year')->first();
        }

        // Resolve Goal
        $goal = null;
        if (! empty($row['Tujuan'])) {
            $goal = StrategicGoal::where('name', 'like', '%'.$row['Tujuan'].'%')
                ->when($period, fn ($q) => $q->where('planning_period_id', $period->id))
                ->first();
        }
        if (! $goal && $period) {
            $goal = StrategicGoal::where('planning_period_id', $period->id)->first();
        }

        // Resolve Objective
        $objective = null;
        if (! empty($row['Sasaran'])) {
            $objective = StrategicObjective::where('name', 'like', '%'.$row['Sasaran'].'%')
                ->when($goal, fn ($q) => $q->where('strategic_goal_id', $goal->id))
                ->first();
        }
        if (! $objective && $goal) {
            $objective = StrategicObjective::where('strategic_goal_id', $goal->id)->first();
        }

        // Extra target tahunan
        $targets = [];
        foreach ($row as $colName => $val) {
            if (preg_match('/^Target\s+(\d{4})$/i', (string) $colName, $m) && is_numeric($val)) {
                $targets[(int) $m[1]] = (float) $val;
            }
        }

        return [
            'level' => $level,
            'owner_organization_id' => $org?->id,
            'planning_period_id' => $period?->id,
            'strategic_goal_id' => $goal?->id,
            'strategic_objective_id' => $objective?->id,
            'name' => trim($row['Nama Indikator']),
            'measurement_unit_id' => $unit?->id,
            'baseline_year' => ! empty($row['Tahun Baseline']) ? (int) $row['Tahun Baseline'] : null,
            'baseline_value' => ! empty($row['Nilai Baseline']) ? (float) $row['Nilai Baseline'] : null,
            'baseline_note' => $row['Keterangan Baseline'] ?? null,
            'definition' => $row['Definisi Operasional'] ?? '',
            'formula_notes' => $row['Formula'] ?? '',
            'polarization' => strtolower($row['Polarisasi'] ?? 'positif'),
            'data_source' => $row['Sumber Data'] ?? '',
            'frequency' => strtolower($row['Frekuensi'] ?? 'annual'),
            '_targets' => $targets,
        ];
    }

    private function saveTargets(Indicator $iku, array $targets, int $userId): void
    {
        foreach ($targets as $year => $value) {
            DB::table('indicator_targets')->updateOrInsert(
                [
                    'indicator_id' => $iku->id,
                    'year' => $year,
                ],
                [
                    'organization_id' => $iku->owner_organization_id,
                    'planning_period_id' => $iku->planning_period_id,
                    'target_value' => $value,
                    'status' => 'draft',
                    'created_by' => $userId,
                    'updated_by' => $userId,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }
    }
}
