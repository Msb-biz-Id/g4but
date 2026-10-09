<?php

namespace App\Services;

use App\Models\IkuHistory;
use App\Models\Indicator;
use App\Models\IndicatorTarget;
use App\Models\IndicatorVersion;
use App\Models\MeasurementUnit;
use App\Models\Organization;
use App\Models\PlanningPeriod;
use App\Models\StrategicGoal;
use App\Models\StrategicObjective;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class IkuImportService
{
    // Kolom wajib di template
    const REQUIRED_COLUMNS = [
        'Level', 'Nama OPD', 'Tujuan', 'Sasaran', 'Nama Indikator',
        'Satuan', 'Tahun Baseline', 'Definisi Operasional',
        'Formula', 'Polarisasi', 'Sumber Data', 'Frekuensi',
    ];

    /**
     * Baca file Excel, validasi tiap baris, kembalikan valid_rows + error_rows.
     */
    public function preview(UploadedFile $file, User|int $user): array
    {
        $userObj = $user instanceof User ? $user : User::find($user);
        $isProvincialAdmin = $userObj && $userObj->roles()->whereIn('name', ['Super Admin', 'Admin Provinsi'])->exists();

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

            $errors = $this->validateRow($row, $rowNum, $userObj, $isProvincialAdmin);

            if (empty($errors)) {
                $validRows[] = $this->mapRow($row, $userObj, $isProvincialAdmin);
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
        $isProvincialAdmin = $userObj && $userObj->roles()->whereIn('name', ['Super Admin', 'Admin Provinsi'])->exists();
        $userOrgId = $userObj?->organization_id ?? $userObj?->organizations()->value('organizations.id');

        $count = 0;
        $workflowService = app(IkuWorkflowService::class);

        DB::transaction(function () use ($validRows, $userId, &$count, $workflowService, $isProvincialAdmin, $userOrgId) {
            $baseSeq = Indicator::iku()->count() + 1;
            foreach ($validRows as $row) {
                // Keamanan isolasi: Pengguna OPD hanya boleh mengimpor untuk OPD-nya sendiri
                if (! $isProvincialAdmin) {
                    if (($row['level'] ?? '') === 'pemda' || (int) ($row['owner_organization_id'] ?? 0) !== (int) $userOrgId) {
                        continue;
                    }
                }

                try {
                    $prefix = ($row['level'] ?? '') === 'pemda' ? 'IKU-PEMDA' : 'IKU-PD';
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
                    // Log tapi jangan hentikan batch
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
            $years = [2025, 2026, 2027, 2028, 2029];
        }

        // Header
        $targetCols = array_map(fn ($y) => "Target {$y}", $years);
        $columns = array_merge([
            'Level', 'Nama OPD', 'Periode (RPJMD)', 'Tujuan', 'Sasaran', 'Nama Indikator',
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
        $periodName = $period ? $period->name : 'RPJMD Papua Barat 2025-2029';
        $example = array_merge([
            'perangkat_daerah', 'Dinas Pendidikan', $periodName,
            'Meningkatnya mutu pendidikan', 'Meningkatnya akses pendidikan',
            'Angka Partisipasi Kasar (APK) SMA',
            '%', (string) ($years[0] - 1), '85.5', '', 'Perbandingan jumlah siswa SMA dgn populasi usia 16-18',
            '(Jumlah siswa SMA / Populasi usia 16-18) × 100', 'positif',
            'Dapodik / Dinas Pendidikan', 'annual', 'Kepala Bidang Kurikulum',
        ], $exampleTargets);

        foreach ($example as $i => $val) {
            $colLetter = Coordinate::stringFromColumnIndex($i + 1);
            $sheet->setCellValue($colLetter.'2', $val);
        }

        // Petunjuk sheet
        $note = $spreadsheet->createSheet();
        $note->setTitle('Petunjuk');
        $note->setCellValue('A1', 'PETUNJUK PENGISIAN TEMPLATE IKU');
        $note->getStyle('A1')->getFont()->setBold(true)->setSize(13);

        $petunjuk = [
            ['Level',           'Isi dengan: pemda (untuk Pemerintah Daerah) atau perangkat_daerah'],
            ['Nama OPD',        'Kosongkan jika Level = pemda. Isi nama OPD jika Level = perangkat_daerah'],
            ['Periode (RPJMD)', 'Nama periode perencanaan. Contoh: RPJMD Papua Barat 2025-2029'],
            ['Tujuan',          'Nama tujuan strategis sesuai master Tujuan yang telah didaftarkan'],
            ['Sasaran',         'Nama sasaran di bawah tujuan yang dipilih'],
            ['Polarisasi',      'Isi dengan: positif, negatif, atau stabil'],
            ['Frekuensi',       'Isi dengan: monthly, quarterly, semester, atau annual'],
            ['Target Tahun',    'Isi nilai numerik saja (tanpa satuan)'],
        ];

        foreach ($petunjuk as $r => $row) {
            $note->setCellValue('A'.($r + 3), $row[0]);
            $note->setCellValue('B'.($r + 3), $row[1]);
        }

        $writer = new Xlsx($spreadsheet);
        $filename = 'Template-Import-IKU.xlsx';

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    // ── Private ───────────────────────────────────────────────────────────────

    private function validateRow(array $row, int $rowNum, ?User $user = null, bool $isProvincialAdmin = false): array
    {
        $errors = [];

        if (empty($row['Nama Indikator'])) {
            $errors[] = 'Nama Indikator wajib diisi';
        }

        $level = strtolower($row['Level'] ?? '');
        if (! in_array($level, ['pemda', 'perangkat_daerah'])) {
            $errors[] = 'Level tidak valid (gunakan: pemda / perangkat_daerah)';
        } elseif ($level === 'pemda' && ! $isProvincialAdmin) {
            $errors[] = 'Pengguna OPD tidak memiliki wewenang untuk mengimpor IKU tingkat Pemerintah Daerah.';
        }

        if ($level === 'perangkat_daerah' && ! $isProvincialAdmin && $user) {
            if (! empty($row['Nama OPD'])) {
                $org = Organization::where('name', 'like', '%'.$row['Nama OPD'].'%')->first();
                if ($org && (int) $org->id !== (int) $user->organization_id) {
                    $errors[] = 'Pengguna OPD hanya diizinkan mengimpor IKU untuk unit kerja sendiri ('.($user->organization?->name ?? 'OPD Anda').').';
                }
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

        // Cek duplikasi: nama + sasaran
        $exists = Indicator::where('name', $row['Nama Indikator'])
            ->where('is_iku', true)
            ->exists();

        if ($exists) {
            $errors[] = "IKU dengan nama '{$row['Nama Indikator']}' sudah ada";
        }

        return $errors;
    }

    private function mapRow(array $row, ?User $user = null, bool $isProvincialAdmin = false): array
    {
        $level = strtolower($row['Level'] ?? 'perangkat_daerah');
        if (! $isProvincialAdmin) {
            $level = 'perangkat_daerah';
        }

        // Resolve organization
        $org = null;
        if ($level === 'perangkat_daerah') {
            if ($isProvincialAdmin && ! empty($row['Nama OPD'])) {
                $org = Organization::where('name', 'like', '%'.$row['Nama OPD'].'%')->first();
            } else {
                $org = $user?->organization ?? ($user?->organization_id ? Organization::find($user->organization_id) : null);
            }
        }

        // Resolve measurement unit by symbol or name
        $unit = MeasurementUnit::where('symbol', $row['Satuan'])
            ->orWhere('name', $row['Satuan'])
            ->first();

        // Resolve planning period by name
        $period = null;
        if (! empty($row['Periode (RPJMD)'])) {
            $period = PlanningPeriod::where('name', 'like', '%'.$row['Periode (RPJMD)'].'%')->first();
        }
        // Fallback: ambil periode aktif terbaru jika tidak ditemukan
        if (! $period) {
            $period = PlanningPeriod::where('status', 'active')->orderByDesc('year')->first()
                ?? PlanningPeriod::orderByDesc('year')->first();
        }

        // Resolve strategic goal by name within the period
        $goal = null;
        if (! empty($row['Tujuan']) && $period) {
            $goal = StrategicGoal::where('planning_period_id', $period->id)
                ->where('name', 'like', '%'.$row['Tujuan'].'%')
                ->first();
        }

        // Resolve strategic objective by name under the goal
        $objective = null;
        if (! empty($row['Sasaran']) && $goal) {
            $objective = StrategicObjective::where('strategic_goal_id', $goal->id)
                ->where('name', 'like', '%'.$row['Sasaran'].'%')
                ->first();
        }

        // Collect yearly targets dynamically (Target YYYY)
        $targets = [];
        foreach ($row as $colKey => $val) {
            if (preg_match('/^Target\s+(\d{4})$/i', trim((string) $colKey), $m)) {
                $yr = (int) $m[1];
                if ($val !== null && $val !== '' && is_numeric($val)) {
                    $targets[] = ['year' => $yr, 'target_value' => (float) $val];
                }
            }
        }

        return [
            'name' => $row['Nama Indikator'],
            'level' => $level,
            'owner_organization_id' => $org?->id,
            'measurement_unit_id' => $unit?->id,
            'planning_period_id' => $period?->id,
            'strategic_goal_id' => $goal?->id,
            'strategic_objective_id' => $objective?->id,
            'definition' => $row['Definisi Operasional'] ?? null,
            'formula_notes' => $row['Formula'] ?? null,
            'polarization' => strtolower($row['Polarisasi'] ?? 'positif'),
            'baseline_year' => is_numeric($row['Tahun Baseline'] ?? null) ? (int) $row['Tahun Baseline'] : null,
            'baseline_value' => is_numeric($row['Nilai Baseline'] ?? null) ? (float) $row['Nilai Baseline'] : null,
            'baseline_note' => $row['Keterangan Baseline'] ?? null,
            'data_source' => $row['Sumber Data'] ?? null,
            'frequency' => strtolower($row['Frekuensi'] ?? 'annual'),
            '_targets' => $targets, // akan diproses di commit(), bukan disimpan ke DB langsung
        ];
    }

    /**
     * Simpan target tahunan ke indicator_targets setelah IKU dibuat.
     */
    private function saveTargets(Indicator $iku, array $targets, int $userId): void
    {
        // Buat/ambil version
        $version = $iku->currentVersion ?? IndicatorVersion::create([
            'indicator_id' => $iku->id,
            'version_number' => 1,
            'name' => $iku->name,
            'definition' => $iku->definition,
            'frequency' => $iku->frequency,
            'data_source' => $iku->data_source,
            'formula_notes' => $iku->formula_notes,
            'baseline_value' => $iku->baseline_value,
            'measurement_unit_id' => $iku->measurement_unit_id,
        ]);

        if (! $iku->current_version_id) {
            $iku->update(['current_version_id' => $version->id]);
        }

        $orgId = $iku->owner_organization_id ?? 1;

        foreach ($targets as $t) {
            // Pastikan tahun target dalam periode IKU
            IndicatorTarget::firstOrCreate(
                [
                    'indicator_version_id' => $version->id,
                    'year' => $t['year'],
                ],
                [
                    'organization_id' => $orgId,
                    'planning_period_id' => $iku->planning_period_id,
                    'target_value' => $t['target_value'],
                    'status' => 'draft',
                ]
            );
        }
    }
}
