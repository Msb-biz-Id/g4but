<?php

namespace App\Services;

use App\Models\AppConfig;
use App\Models\User;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Color;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class UserExportService
{
    public function __construct(
        private readonly AuthorizationService $authorization,
    ) {}

    /**
     * Ambil data pengguna dengan grouping dan urutan yang rapi.
     *
     * @return array{opd: list<array<string, mixed>>, sekretariat: list<array<string, mixed>>, bidang: list<array<string, mixed>>, all: list<array<string, mixed>>}
     */
    public function getExportData(?User $scopedUser = null): array
    {
        $isOpdAdmin = ! $scopedUser || $scopedUser->isOpdAdmin();
        $accessibleOrgIds = $scopedUser ? $this->authorization->accessibleOrganizationIds($scopedUser) : null;

        $roleOrder = [
            'Super Admin' => 1,
            'Admin OPD' => 2,
            'Kepala OPD' => 3,
            'Admin Sekretariat' => 4,
            'Kepala Sekretariat' => 5,
            'Admin Bidang' => 6,
            'Kepala Bidang' => 7,
        ];

        $usersQuery = User::query()
            ->with(['roles', 'organizations'])
            ->orderBy('id');

        if (! $isOpdAdmin && $accessibleOrgIds) {
            $usersQuery->whereHas('organizations', fn ($q) => $q->whereIn('organizations.id', $accessibleOrgIds));
        }

        $allUsers = $usersQuery->get()->sortBy(function (User $u) use ($roleOrder) {
            $firstRole = $u->roles->first()?->name ?? '';

            return $roleOrder[$firstRole] ?? 99;
        });

        $opdRows = [];
        $sekretariatRows = [];
        $bidangRows = [];
        $allRows = [];

        $counter = 1;
        foreach ($allUsers as $user) {
            $org = $user->organizations->first();
            $roleName = $user->roles->first()?->name ?? 'User';
            $orgType = $org?->type ?? 'opd';

            $cluster = match ($orgType) {
                'sekretariat' => 'Sekretariat',
                'bidang' => 'Bidang',
                default => 'OPD Induk',
            };

            $row = [
                'no' => $counter++,
                'cluster' => $cluster,
                'code' => $org?->code ?? 'OPD',
                'org_name' => $org?->name ?? 'Induk Organisasi',
                'user_name' => $user->name,
                'email' => $user->email,
                'role' => $roleName,
                'nip' => $user->employee_number ?? '-',
                'password' => 'password',
                'status' => $user->is_active ? 'Aktif' : 'Nonaktif',
            ];

            $allRows[] = $row;

            if ($orgType === 'sekretariat') {
                $rowSek = $row;
                $rowSek['no'] = count($sekretariatRows) + 1;
                $sekretariatRows[] = $rowSek;
            } elseif ($orgType === 'bidang') {
                $rowBid = $row;
                $rowBid['no'] = count($bidangRows) + 1;
                $bidangRows[] = $rowBid;
            } else {
                $rowOpd = $row;
                $rowOpd['no'] = count($opdRows) + 1;
                $opdRows[] = $rowOpd;
            }
        }

        return [
            'opd' => $opdRows,
            'sekretariat' => $sekretariatRows,
            'bidang' => $bidangRows,
            'all' => $allRows,
        ];
    }

    /**
     * Download Excel dengan tab per unit: OPD Induk, Sekretariat, Bidang, dan Semua Akun.
     */
    public function downloadExcel(?User $scopedUser = null): StreamedResponse
    {
        $data = $this->getExportData($scopedUser);

        $spreadsheet = new Spreadsheet;
        $spreadsheet->removeSheetByIndex(0);

        $sheetConfigs = [
            ['title' => 'Semua Akun', 'color' => '1E293B', 'rows' => $data['all']],
            ['title' => 'OPD Induk', 'color' => '1D4ED8', 'rows' => $data['opd']],
            ['title' => 'Sekretariat', 'color' => '047857', 'rows' => $data['sekretariat']],
            ['title' => 'Bidang', 'color' => 'B45309', 'rows' => $data['bidang']],
        ];

        foreach ($sheetConfigs as $config) {
            $sheet = new Worksheet($spreadsheet, $config['title']);
            $spreadsheet->addSheet($sheet);
            $this->populateSheet($sheet, $config['title'], $config['rows'], $config['color']);
        }

        $spreadsheet->setActiveSheetIndex(0);

        $filename = 'Daftar-Akun-OPD-'.date('YmdHis').'.xlsx';
        $writer = new Xlsx($spreadsheet);

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    public function exportToXlsx(string $filePath, ?User $scopedUser = null): void
    {
        $data = $this->getExportData($scopedUser);

        $spreadsheet = new Spreadsheet;
        $spreadsheet->removeSheetByIndex(0);

        $sheetConfigs = [
            ['title' => 'Semua Akun', 'color' => '1E293B', 'rows' => $data['all']],
            ['title' => 'OPD Induk', 'color' => '1D4ED8', 'rows' => $data['opd']],
            ['title' => 'Sekretariat', 'color' => '047857', 'rows' => $data['sekretariat']],
            ['title' => 'Bidang', 'color' => 'B45309', 'rows' => $data['bidang']],
        ];

        foreach ($sheetConfigs as $config) {
            $sheet = new Worksheet($spreadsheet, $config['title']);
            $spreadsheet->addSheet($sheet);
            $this->populateSheet($sheet, $config['title'], $config['rows'], $config['color']);
        }

        $spreadsheet->setActiveSheetIndex(0);
        $writer = new Xlsx($spreadsheet);
        $writer->save($filePath);
    }

    public function exportToCsv(string $filePath, ?User $scopedUser = null): void
    {
        $data = $this->getExportData($scopedUser);
        $handle = fopen($filePath, 'w');

        // Header CSV
        fputcsv($handle, [
            'No', 'Kluster', 'Kode Unit', 'Nama Unit', 'Nama Pegawai',
            'Email (Login)', 'Role / Peran', 'NIP', 'Default Password', 'Status Akun',
        ]);

        foreach ($data['all'] as $row) {
            fputcsv($handle, [
                $row['no'],
                $row['cluster'],
                $row['code'],
                $row['org_name'],
                $row['user_name'],
                $row['email'],
                $row['role'],
                $row['nip'],
                $row['password'],
                $row['status'],
            ]);
        }

        fclose($handle);
    }

    private function populateSheet(Worksheet $sheet, string $title, array $rows, string $headerColor): void
    {
        $headers = [
            'No', 'Kluster', 'Kode Unit', 'Nama Unit', 'Nama Pegawai',
            'Email (Login)', 'Role / Peran', 'NIP', 'Default Password', 'Status Akun',
        ];

        // Title row
        $sheet->mergeCells('A1:J1');
        $sheet->setCellValue('A1', "DAFTAR AKUN PENGGUNA — {$title}");
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(13)->setColor(new Color('FFFFFFFF'));
        $sheet->getStyle('A1')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FF'.$headerColor);
        $sheet->getStyle('A1')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER)->setVertical(Alignment::VERTICAL_CENTER);
        $sheet->getRowDimension(1)->setRowHeight(32);

        // Subtitle row
        $appName = AppConfig::where('key', 'app_name')->value('value') ?: config('app.name', 'SIPERFORMA PUPR');
        $instansiName = AppConfig::where('key', 'instansi_name')->value('value') ?: 'Pemerintah Daerah';
        $sheet->mergeCells('A2:J2');
        $sheet->setCellValue('A2', "{$appName} — Sistem Akuntabilitas Kinerja {$instansiName} | Diekspor: ".now()->translatedFormat('d F Y H:i'));
        $sheet->getStyle('A2')->getFont()->setSize(9)->setItalic(true)->setColor(new Color('FF64748B'));
        $sheet->getRowDimension(2)->setRowHeight(18);

        // Header row
        $rowNum = 3;
        foreach ($headers as $colIdx => $header) {
            $colLetter = Coordinate::stringFromColumnIndex($colIdx + 1);
            $sheet->setCellValue("{$colLetter}{$rowNum}", $header);
        }

        $headerRange = "A{$rowNum}:J{$rowNum}";
        $sheet->getStyle($headerRange)->getFont()->setBold(true)->setColor(new Color('FFFFFFFF'));
        $sheet->getStyle($headerRange)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FF334155');
        $sheet->getStyle($headerRange)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER)->setVertical(Alignment::VERTICAL_CENTER);
        $sheet->getRowDimension($rowNum)->setRowHeight(24);

        // Data rows
        $rowNum = 4;
        foreach ($rows as $r) {
            $sheet->setCellValue("A{$rowNum}", $r['no']);
            $sheet->setCellValue("B{$rowNum}", $r['cluster']);
            $sheet->setCellValue("C{$rowNum}", $r['code']);
            $sheet->setCellValue("D{$rowNum}", $r['org_name']);
            $sheet->setCellValue("E{$rowNum}", $r['user_name']);
            $sheet->setCellValue("F{$rowNum}", $r['email']);
            $sheet->setCellValue("G{$rowNum}", $r['role']);
            $sheet->setCellValueExplicit("H{$rowNum}", (string) $r['nip'], DataType::TYPE_STRING);
            $sheet->setCellValue("I{$rowNum}", $r['password']);
            $sheet->setCellValue("J{$rowNum}", $r['status']);

            $rowRange = "A{$rowNum}:J{$rowNum}";
            $bgColor = $rowNum % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF';
            $sheet->getStyle($rowRange)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB($bgColor);

            $statusColor = $r['status'] === 'Aktif' ? 'FF16A34A' : 'FFDC2626';
            $sheet->getStyle("J{$rowNum}")->getFont()->setBold(true)->setColor(new Color($statusColor));
            $sheet->getStyle("A{$rowNum}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle("C{$rowNum}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle("H{$rowNum}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle("I{$rowNum}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle("J{$rowNum}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

            $sheet->getRowDimension($rowNum)->setRowHeight(20);
            $rowNum++;
        }

        $lastRow = max($rowNum - 1, 3);
        $fullRange = "A3:J{$lastRow}";
        $sheet->getStyle($fullRange)->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN)->getColor()->setARGB('FFE2E8F0');

        foreach (range(1, 10) as $colIdx) {
            $sheet->getColumnDimensionByColumn($colIdx)->setAutoSize(true);
        }
    }
}
