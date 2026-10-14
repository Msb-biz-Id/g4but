import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { BarChart3, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { SelectNative } from '@/Components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import TablePagination from '@/Components/TablePagination';
import { PageProps } from '@/types';
import { cn } from '@/lib/utils';
import PageHeader from '@/Components/Dashboard/PageHeader';

interface CompletenessEntry {
    organization_id: number;
    organization_code: string;
    organization_name: string;
    total_targets: number;
    with_realization: number;
    missing: number;
    completeness_pct: number | null;
}

interface Period { id: number; code: string; name: string; }

interface Props extends PageProps {
    completenessData: CompletenessEntry[];
    periods: Period[];
    selectedPeriod?: Period;
    filters: { measurement_period_id?: number | null };
}

function PctBar({ pct }: { pct: number | null }) {
    if (pct === null) return <span className="text-muted-foreground text-sm">-</span>;
    const color = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500';
    return (
        <div className="flex items-center gap-2">
            <div className="h-2 w-32 rounded-full bg-slate-200 dark:bg-slate-700">
                <div className={cn('h-2 rounded-full', color)} style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <span className="text-sm font-medium">{pct}%</span>
        </div>
    );
}

function statusBadge(pct: number | null) {
    if (pct === null) return <Badge variant="outline">Tidak ada target</Badge>;
    if (pct >= 80)   return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60 border hover:bg-emerald-100 font-semibold">Lengkap</Badge>;
    if (pct >= 50)   return <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60 border hover:bg-amber-100 font-semibold">Sebagian</Badge>;
    return <Badge className="bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60 border hover:bg-rose-100 font-semibold">Kurang</Badge>;
}

export default function AnalyticsCompleteness({ completenessData, periods, filters, auth }: Props) {
    const totalOPD         = completenessData.length;
    const completedOPD     = completenessData.filter((d) => (d.completeness_pct ?? 0) >= 80).length;
    const totalMissing     = completenessData.reduce((sum, d) => sum + d.missing, 0);
    const avgPct           = completenessData.filter((d) => d.completeness_pct !== null).length > 0
        ? Math.round(completenessData.filter((d) => d.completeness_pct !== null)
            .reduce((sum, d) => sum + (d.completeness_pct ?? 0), 0)
            / completenessData.filter((d) => d.completeness_pct !== null).length)
        : null;

    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(25);

    const total = completenessData.length;
    const lastPage = Math.max(1, Math.ceil(total / perPage));
    const safeCurrentPage = Math.min(currentPage, lastPage);
    const from = total > 0 ? (safeCurrentPage - 1) * perPage + 1 : 0;
    const to = total > 0 ? Math.min(safeCurrentPage * perPage, total) : 0;
    const paginatedData = completenessData.slice((safeCurrentPage - 1) * perPage, safeCurrentPage * perPage);

    return (
        <AuthenticatedLayout header="Kelengkapan Data Realisasi">
            <Head title="Kelengkapan Data Realisasi" />

            <div className="space-y-6">
                <PageHeader
                    breadcrumbs={[
                        { label: 'Analitik & Evaluasi', href: route('analytics.index') },
                        { label: 'Kelengkapan Data Realisasi' },
                    ]}
                    title="Kelengkapan Data Realisasi per OPD"
                    description="Monitoring kepatuhan pengisian data realisasi kinerja organisasi perangkat daerah."
                    actions={
                        <SelectNative
                            value={filters.measurement_period_id?.toString() ?? ''}
                            onChange={(e) => router.get(route('analytics.completeness'), { measurement_period_id: e.target.value || undefined }, { preserveState: true })}
                            className="w-full sm:w-52"
                        >
                            <option value="">Semua Periode</option>
                            {periods.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </SelectNative>
                    }
                />

                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <Card className="border-border shadow-xs">
                        <CardContent className="p-4 sm:p-5">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                                    <BarChart3 className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{avgPct !== null ? `${avgPct}%` : '-'}</p>
                                    <p className="text-xs text-muted-foreground">Rata-rata kelengkapan</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4">
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                                <div>
                                    <p className="text-2xl font-bold">{completedOPD}<span className="text-sm text-muted-foreground">/{totalOPD}</span></p>
                                    <p className="text-xs text-muted-foreground">OPD ≥80% lengkap</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4">
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="h-8 w-8 text-rose-500" />
                                <div>
                                    <p className="text-2xl font-bold">{totalMissing}</p>
                                    <p className="text-xs text-muted-foreground">Total realisasi kurang</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4">
                            <div className="flex items-center gap-3">
                                <Clock className="h-8 w-8 text-yellow-500" />
                                <div>
                                    <p className="text-2xl font-bold">{totalOPD - completedOPD}</p>
                                    <p className="text-xs text-muted-foreground">OPD belum lengkap</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Detail Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Detail per OPD</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10 text-xs uppercase tracking-wider">No</TableHead>
                                    <TableHead>OPD</TableHead>
                                    <TableHead className="text-right">Target</TableHead>
                                    <TableHead className="text-right">Sudah Isi</TableHead>
                                    <TableHead className="text-right">Kurang</TableHead>
                                    <TableHead>Kelengkapan</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {completenessData.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                                            Belum ada data untuk periode ini
                                        </TableCell>
                                    </TableRow>
                                )}
                                {paginatedData.map((row, index) => (
                                    <TableRow key={row.organization_id}>
                                        <TableCell className="text-sm text-gray-500 tabular-nums">
                                            {from + index}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{row.organization_code}</div>
                                            <div className="text-xs text-muted-foreground">{row.organization_name}</div>
                                        </TableCell>
                                        <TableCell className="text-right">{row.total_targets}</TableCell>
                                        <TableCell className="text-right text-green-700">{row.with_realization}</TableCell>
                                        <TableCell className="text-right text-destructive font-medium">{row.missing > 0 ? row.missing : '-'}</TableCell>
                                        <TableCell><PctBar pct={row.completeness_pct} /></TableCell>
                                        <TableCell>{statusBadge(row.completeness_pct)}</TableCell>
                                    </TableRow>
                                ))}
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
                            itemLabel="OPD"
                            onPerPageChange={(val) => { setPerPage(val); setCurrentPage(1); }}
                            onClientPageChange={(page) => setCurrentPage(page)}
                        />
                    </CardContent>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
