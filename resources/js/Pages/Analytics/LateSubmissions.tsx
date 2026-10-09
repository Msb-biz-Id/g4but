import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { AlertTriangle, Clock, AlertOctagon, Info } from 'lucide-react';

import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { SelectNative } from '@/Components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Badge } from '@/Components/ui/badge';
import TablePagination from '@/Components/TablePagination';
import { PageProps } from '@/types';
import { cn, formatDate } from '@/lib/utils';

interface LateRow {
    organization_id: number;
    organization_code: string;
    organization_name: string;
    period_id: number;
    period_name: string;
    submission_deadline: string;
    days_late: number;
    severity: 'critical' | 'warning' | 'info';
}

interface Period { id: number; code: string; name: string; submission_deadline?: string; status: string; }

interface Props extends PageProps {
    lateRows: LateRow[];
    periods: Period[];
    totalLate: number;
    filters: { measurement_period_id?: number | null };
}

const SEVERITY_STYLE = {
    critical: { badge: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60',   icon: <AlertOctagon className="h-4 w-4 text-rose-500" />,    label: 'Kritis' },
    warning:  { badge: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60', icon: <AlertTriangle className="h-4 w-4 text-amber-500" />, label: 'Peringatan' },
    info:     { badge: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60',  icon: <Info className="h-4 w-4 text-blue-500" />,         label: 'Perhatian' },
};

export default function LateSubmissions({ lateRows, periods, totalLate, filters, auth }: Props) {
    const criticalCount = lateRows.filter((r) => r.severity === 'critical').length;
    const warningCount  = lateRows.filter((r) => r.severity === 'warning').length;

    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(25);

    const total = lateRows.length;
    const lastPage = Math.max(1, Math.ceil(total / perPage));
    const safeCurrentPage = Math.min(currentPage, lastPage);
    const from = total > 0 ? (safeCurrentPage - 1) * perPage + 1 : 0;
    const to = total > 0 ? Math.min(safeCurrentPage * perPage, total) : 0;
    const paginatedRows = lateRows.slice((safeCurrentPage - 1) * perPage, safeCurrentPage * perPage);

    return (
        <AuthenticatedLayout header="Monitoring Keterlambatan">
            <Head title="Monitoring Keterlambatan Realisasi" />

            <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Monitoring Keterlambatan Pengiriman Realisasi</h1>
                        <p className="text-sm text-muted-foreground">OPD yang melewati batas waktu pengiriman realisasi (FR-MSR-015)</p>
                    </div>
                    <SelectNative
                        value={filters.measurement_period_id?.toString() ?? ''}
                        onChange={(e) => router.get(route('analytics.late-submissions'), { measurement_period_id: e.target.value || undefined }, { preserveState: true })}
                        className="w-full sm:w-52"
                    >
                        <option value="">Semua Periode Terlambat</option>
                        {periods.filter((p) => p.status === 'open' && p.submission_deadline).map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </SelectNative>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-3 gap-4">
                    <Card className="border-rose-200 dark:border-rose-900/60">
                        <CardContent className="pt-4">
                            <div className="flex items-center gap-3">
                                <AlertOctagon className="h-8 w-8 text-rose-500" />
                                <div>
                                    <p className="text-2xl font-bold text-rose-700 dark:text-rose-400">{criticalCount}</p>
                                    <p className="text-xs text-muted-foreground">Kritis (≥14 hari)</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-amber-200 dark:border-amber-900/60">
                        <CardContent className="pt-4">
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="h-8 w-8 text-amber-500" />
                                <div>
                                    <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{warningCount}</p>
                                    <p className="text-xs text-muted-foreground">Peringatan (7–13 hari)</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4">
                            <div className="flex items-center gap-3">
                                <Clock className="h-8 w-8 text-blue-500" />
                                <div>
                                    <p className="text-2xl font-bold">{totalLate}</p>
                                    <p className="text-xs text-muted-foreground">Total OPD terlambat</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Daftar OPD Terlambat</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10">No</TableHead>
                                    <TableHead>OPD</TableHead>
                                    <TableHead>Periode</TableHead>
                                    <TableHead>Batas Waktu</TableHead>
                                    <TableHead className="text-right">Hari Terlambat</TableHead>
                                    <TableHead>Tingkat</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {lateRows.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                                            ✅ Tidak ada OPD yang terlambat menyerahkan realisasi.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {paginatedRows.map((row, i) => {
                                    const s = SEVERITY_STYLE[row.severity];
                                    return (
                                        <TableRow key={`${row.organization_id}-${row.period_id}-${i}`}>
                                            <TableCell className="text-sm text-gray-500 tabular-nums">
                                                {from + i}
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">{row.organization_code}</div>
                                                <div className="text-xs text-muted-foreground">{row.organization_name}</div>
                                            </TableCell>
                                            <TableCell className="text-sm">{row.period_name}</TableCell>
                                            <TableCell className="text-sm">{formatDate(row.submission_deadline)}</TableCell>
                                            <TableCell className="text-right font-bold text-destructive">{row.days_late} hari</TableCell>
                                            <TableCell>
                                                <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium', s.badge)}>
                                                    {s.icon}
                                                    {s.label}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                        <TablePagination
                            clientSide={true}
                            from={from}
                            to={to}
                            totalItems={total}
                            perPage={perPage}
                            currentPage={safeCurrentPage}
                            lastPage={lastPage}
                            itemLabel="OPD terlambat"
                            onPerPageChange={(val) => { setPerPage(val); setCurrentPage(1); }}
                            onClientPageChange={(page) => setCurrentPage(page)}
                        />
                    </CardContent>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
