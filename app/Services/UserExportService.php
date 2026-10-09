<?php

namespace App\Services;

use App\Models\Organization;
use App\Models\User;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Color;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Writer\Csv;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class UserExportService
{
    public function __construct(
        private readonly AuthorizationService $authorization,
    ) {}

    /**
     * Ambil data pengguna dengan grouping dan urutan yang rapi.
     *
     * @return array{provinsi: list<array<string, mixed>>, opd: list<array<string, mixed>>, all: list<array<string, mixed>>}
     */
    public function getExportData(?User $scopedUser = null): array
    {
        $isProvincialAdmin = ! $scopedUser || $scopedUser->hasRole('Super Admin') || $scopedUser->hasRole('Admin Provinsi');
        $accessibleOrgIds = $scopedUser ? $this->authorization->accessibleOrganizationIds($scopedUser) : null;

        $provincialRoles = [
            'Super Admin',
            'Admin Provinsi',
            'Pimpinan Provinsi',
            'Evaluator Provinsi',
            'Inspektorat',
            'Auditor',
        ];

        // 1. Akun Provinsi (hanya tampil untuk Super Admin / Admin Provinsi)
        $provincialRows = [];
        if ($isProvincialAdmin) {
            $provUsers = User::query()
                ->whereHas('roles', fn ($q) => $q->whereIn('name', $provincialRoles))
                ->with(['roles', 'organizations'])
                ->get()
                ->sortBy(function (User $u) use ($provincialRoles) {
                    $firstRole = $u->roles->first()?->name ?? '';
                    $idx = array_search($firstRole, $provincialRoles, true);

                    return $idx !== false ? $idx : 99;
                });

            $no = 1;
            foreach ($provUsers as $user) {
                $org = $user->organizations->first();
                $provincialRows[] = [
                    'no' => $no++,
                    'cluster' => 'Pemerintah Provinsi',
                    'code' => $org?->code ?? 'PROV-PAPBAR',
                    'org_name' => $org?->name ?? 'Pemerintah Provinsi Papua Barat',
                    'user_name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->roles->pluck('name')->join(', ') ?: 'Super Admin',
                    'nip' => $user->employee_number ?? '-',
                    'password' => 'password',
                    'status' => $user->is_active ? 'Aktif' : 'Nonaktif',
                ];
            }
        }

        // 2. Akun Perangkat Daerah & Biro
        $opdQuery = Organization::query()
            ->where('type', '!=', 'province')
            ->where('is_active', true)
            ->with(['users.roles'])
            ->orderBy('id');

        if (! $isProvincialAdmin && $accessibleOrgIds) {
            $opdQuery->whereIn('id', $accessibleOrgIds);
        }

        $opds = $opdQuery->get();

        $opdRows = [];
        $no = 1;
        $roleOrder = ['Admin OPD' => 1, 'Operator OPD' => 2, 'Validator OPD' => 3, 'Kepala OPD' => 4];

        foreach ($opds as $org) {
            $sortedUsers = $org->users->sortBy(function (User $u) use ($roleOrder) {
                $role = $u->roles->first()?->name ?? '';

                return $roleOrder[$role] ?? 99;
            });

            foreach ($sortedUsers as $user) {
                // Abaikan jika akun provinsi terasosiasi ganda agar tidak redundan
                if ($user->roles()->whereIn('name', $provincialRoles)->exists()) {
                    continue;
                }

                $roleName = $user->roles->first()?->name ?? 'Admin OPD';
                $opdRows[] = [
                    'no' => $no++,
                    'cluster' => $org->type === 'biro' ? 'Biro Setda' : 'Perangkat Daerah (OPD)',
                    'code' => $org->code,
                    'org_name' => $org->name,
                    'user_name' => $user->name,
                    'email' => $user->email,
                    'role' => $roleName,
                    'nip' => $user->employee_number ?? '-',
                    'password' => 'password',
                    'status' => $user->is_active ? 'Aktif' : 'Nonaktif',
                ];
            }
        }

        // 3. Gabungan Semua
        $allRows = [];
        $counter = 1;
        foreach (array_merge($provincialRows, $opdRows) as $row) {
            $row['no'] = $counter++;
            $allRows[] = $row;
        }

        return [
            'provinsi' => $provincialRows,
            'opd' => $opdRows,
            'all' => $allRows,
        ];
    }

    /**
     * Buat berkas Spreadsheet dengan tab / sheet profesional.
     */
    public function generateSpreadsheet(?User $scopedUser = null): Spreadsheet
    {
        $data = $this->getExportData($scopedUser);
        $spreadsheet = new Spreadsheet;

        // Sheet 1: Semua Pengguna
        $sheetAll = $spreadsheet->getActiveSheet();
        $sheetAll->setTitle('Semua Akun');
        $this->populateSheet($sheetAll, $data['all'], 'DAFTAR KREDENSIAL AKUN SISTEM E-KASUARI LITE', '1E3A8A');

        // Jika Provincial Admin, buat tab terpisah untuk Pemprov dan OPD
        if (! empty($data['provinsi'])) {
            // Sheet 2: Akun Pemprov
            $sheetProv = $spreadsheet->createSheet();
            $sheetProv->setTitle('Akun Pemprov');
            $this->populateSheet($sheetProv, $data['provinsi'], 'DAFTAR AKUN PEMBINA & PENGAWAS PEMERINTAH PROVINSI', '065F46');

            // Sheet 3: Akun OPD
            $sheetOpd = $spreadsheet->createSheet();
            $sheetOpd->setTitle('Akun OPD & Biro');
            $this->populateSheet($sheetOpd, $data['opd'], 'DAFTAR AKUN OPERASIONAL PERANGKAT DAERAH (OPD & BIRO)', '1E293B');
        }

        $spreadsheet->setActiveSheetIndex(0);

        return $spreadsheet;
    }

    /**
     * Isi baris data ke dalam sheet dengan styling header & kolom.
     *
     * @param  list<array<string, mixed>>  $rows
     */
    private function populateSheet(Worksheet $sheet, array $rows, string $title, string $headerColorHex): void
    {
        $headers = [
            'A' => 'No',
            'B' => 'Kategori / Tingkat',
            'C' => 'Kode Instansi',
            'D' => 'Nama Instansi / Perangkat Daerah',
            'E' => 'Nama Pengguna',
            'F' => 'Email Login',
            'G' => 'Peran (Role)',
            'H' => 'NIP / ID Pegawai',
            'I' => 'Password Awal',
            'J' => 'Status',
        ];

        // Judul Dokumen
        $sheet->setCellValue('A1', $title);
        $sheet->mergeCells('A1:J1');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14)->setColor(new Color('1E293B'));
        $sheet->getStyle('A1')->getAlignment()->setVertical(Alignment::VERTICAL_CENTER);
        $sheet->getRowDimension(1)->setRowHeight(28);

        // Subjudul Info
        $sheet->setCellValue('A2', 'Diekspor pada: '.date('d F Y H:i:s').' WIT | Password default bersifat sementara dan dapat diperbarui setelah login.');
        $sheet->mergeCells('A2:J2');
        $sheet->getStyle('A2')->getFont()->setItalic(true)->setSize(9)->setColor(new Color('64748B'));
        $sheet->getRowDimension(2)->setRowHeight(18);

        // Header Table
        $headerRow = 4;
        $sheet->getRowDimension($headerRow)->setRowHeight(26);

        foreach ($headers as $col => $label) {
            $cell = $col.$headerRow;
            $sheet->setCellValue($cell, $label);
            $sheet->getStyle($cell)->getFont()->setBold(true)->setColor(new Color('FFFFFF'));
            $sheet->getStyle($cell)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FF'.$headerColorHex);
            $sheet->getStyle($cell)->getAlignment()->setVertical(Alignment::VERTICAL_CENTER);

            if (in_array($col, ['A', 'C', 'H', 'I', 'J'], true)) {
                $sheet->getStyle($cell)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            }
        }

        // Data Rows
        $startRow = 5;
        $currentRow = $startRow;

        foreach ($rows as $item) {
            $sheet->setCellValue('A'.$currentRow, $item['no']);
            $sheet->setCellValue('B'.$currentRow, $item['cluster']);
            $sheet->setCellValue('C'.$currentRow, $item['code']);
            $sheet->setCellValue('D'.$currentRow, $item['org_name']);
            $sheet->setCellValue('E'.$currentRow, $item['user_name']);
            $sheet->setCellValue('F'.$currentRow, $item['email']);
            $sheet->setCellValue('G'.$currentRow, $item['role']);
            $sheet->setCellValueExplicit('H'.$currentRow, (string) $item['nip'], DataType::TYPE_STRING);
            $sheet->setCellValue('I'.$currentRow, $item['password']);
            $sheet->setCellValue('J'.$currentRow, $item['status']);

            // Styling per baris
            $sheet->getStyle('A'.$currentRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle('C'.$currentRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle('H'.$currentRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle('I'.$currentRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle('J'.$currentRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

            // Zebra striping
            if ($currentRow % 2 === 0) {
                $sheet->getStyle("A{$currentRow}:J{$currentRow}")->getFill()
                    ->setFillType(Fill::FILL_SOLID)
                    ->getStartColor()->setARGB('FFF8FAFC');
            }

            $currentRow++;
        }

        $lastRow = max($startRow, $currentRow - 1);

        // Border keliling
        $borderStyle = [
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['argb' => 'FFE2E8F0'],
                ],
            ],
        ];
        $sheet->getStyle("A{$headerRow}:J{$lastRow}")->applyFromArray($borderStyle);

        // Auto-width kolom
        foreach (range(1, count($headers)) as $colIdx) {
            $sheet->getColumnDimensionByColumn($colIdx)->setAutoSize(true);
        }
    }

    /**
     * Simpan langsung ke berkas XLSX di filesystem.
     */
    public function exportToXlsx(string $fullPath, ?User $scopedUser = null): string
    {
        $dir = dirname($fullPath);
        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $spreadsheet = $this->generateSpreadsheet($scopedUser);
        $writer = new Xlsx($spreadsheet);
        $writer->save($fullPath);

        return $fullPath;
    }

    /**
     * Simpan berkas CSV.
     */
    public function exportToCsv(string $fullPath, ?User $scopedUser = null): string
    {
        $dir = dirname($fullPath);
        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $data = $this->getExportData($scopedUser);
        $fp = fopen($fullPath, 'w');

        // Header CSV
        fputcsv($fp, ['No', 'Kategori', 'Kode Instansi', 'Nama Perangkat Daerah / Biro', 'Nama Pengguna', 'Email Login', 'Peran (Role)', 'NIP', 'Password Awal', 'Status']);

        foreach ($data['all'] as $row) {
            fputcsv($fp, [
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

        fclose($fp);

        return $fullPath;
    }
}
