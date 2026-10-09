import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import TablePagination from '@/Components/TablePagination';
import { SelectNative } from '@/Components/ui/select-native';
import { Card, CardContent } from '@/Components/ui/card';
import {
    AlertCircle, AlertTriangle, ArrowRightLeft, Building2,
    CheckCircle2, ClipboardList, TrendingUp,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Cell {
    status: 'approved' | 'draft' | 'missing';
    id: number | null;
    approved_at: string | null;
}

interface OrgRow {
    organization: {
        id: number; code: string; name: string;
        type: string | null; is_bappeda: boolean;
    };
    cells: Record<string, Cell>;
    score: {
        approved: number; draft: number; missing: number;
        total: number; pct: number;
    };
}

interface DocType { key: string; label: string; }

interface Props {
    matrix: OrgRow[];
    types: DocType[];
    year: number;
    years: number[];
    summary: {
        total_org: number;
        fully_complete: number;
        avg_completion_pct: number;
    };
}

// ─── Cell component ───────────────────────────────────────────────────────────
function MatrixCell({ cell }: { cell: Cell }) {
    if (cell.status === 'approved') {
        return (
            <td className="p-0 text-center">
                <div className="flex items-center justify-center" title={`Disetujui ${cell.approved_at ? formatDate(cell.approved_at) : ''}`}>
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                </div>
            </td>
        );
    }
    if (cell.status === 'draft') {
        return (
            <td className="p-0 text-center">
                <div className="flex items-center justify-center" title="Draft — belum disetujui">
                    <AlertTriangle className="h-5 w-5 text-amber-400" />
                </div>
            </td>
        );
    }
    return (
        <td className="p-0 text-center">
            <div className="flex items-center justify-center" title="Belum ada dokumen">
                <span className="h-5 w-5 rounded-full border-2 border-dashed border-slate-200 dark:border-border block" />
            </div>
        </td>
    );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ScoreBar({ score }: { score: OrgRow['score'] }) {
    const pct = score.pct;
    const color = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-rose-400';
    return (
        <td className="px-3 py-2 text-center">
            <div className="flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-muted overflow-hidden">
                    <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
                </div>
                <span className={`text-xs font-bold tabular-nums w-9 text-right ${
                    pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-rose-500'
                }`}>{pct}%</span>
            </div>
        </td>
    );
}

// ─── Summary cards ────────────────────────────────────────────────────────────
function SummaryCard({ icon: Icon, label, value, color }: {
    icon: React.ElementType; label: string; value: string | number; color: string;
}) {
    return (
        <Card className="shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${color}`}>
                    <Icon className="h-6 w-6 text-white" />
                </div>
                <div>
                    <p className="text-xs text-gray-500 dark:text-muted-foreground">{label}</p>
                    <p className="text-2xl font-extrabold text-gray-900 dark:text-foreground">{value}</p>
                </div>
            </CardContent>
        </Card>
    );
}

// ─── Halaman utama ────────────────────────────────────────────────────────────
export default function MonitoringMatrix({ matrix, types, year, years, summary }: Props) {
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(25);

    const total = matrix.length;
    const lastPage = Math.max(1, Math.ceil(total / perPage));
    const safeCurrentPage = Math.min(currentPage, lastPage);
    const from = total > 0 ? (safeCurrentPage - 1) * perPage + 1 : 0;
    const to = total > 0 ? Math.min(safeCurrentPage * perPage, total) : 0;
    const paginatedMatrix = matrix.slice((safeCurrentPage - 1) * perPage, safeCurrentPage * perPage);

    const changeYear = (y: string) =>
        router.get(route('planning.monitoring-matrix'), { year: y }, { preserveState: true, replace: true });

    return (
        <AuthenticatedLayout header="Monitoring Kelengkapan Dokumen OPD">
            <Head title="Monitoring Matrix OPD" />

            <div className="space-y-6">

                    {/* ── Header toolbar ──────────────────────────────────── */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 dark:bg-primary/20">
                                <ClipboardList className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-foreground">
                                    Monitoring Matrix Kelengkapan Dokumen
                                </h1>
                                <p className="text-xs text-gray-500 dark:text-muted-foreground">
                                    Status upload dokumen perencanaan per OPD — Tahun {year}
                                </p>
                            </div>
                        </div>
                        <SelectNative value={year} onChange={(e) => changeYear(e.target.value)} className="w-full sm:w-28 h-9 text-sm">
                            {years.map((y) => <option key={y} value={y}>{y}</option>)}
                        </SelectNative>
                    </div>

                    {/* ── Summary cards ────────────────────────────────────── */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <SummaryCard icon={Building2} label="Total OPD" value={summary.total_org} color="bg-primary" />
                        <SummaryCard icon={CheckCircle2} label="OPD Lengkap (semua approved)" value={summary.fully_complete} color="bg-emerald-500" />
                        <SummaryCard icon={TrendingUp} label="Rata-rata Kelengkapan" value={`${summary.avg_completion_pct}%`} color="bg-amber-500" />
                    </div>

                    {/* ── Legend ───────────────────────────────────────────── */}
                    <div className="flex flex-wrap items-center gap-5 text-sm text-gray-600 dark:text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            <span>Disetujui (Approved)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-400" />
                            <span>Draft (belum disetujui)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="h-4 w-4 rounded-full border-2 border-dashed border-slate-300 dark:border-border block" />
                            <span>Belum ada dokumen</span>
                        </div>
                    </div>

                    {/* ── Matrix table ─────────────────────────────────────── */}
                    <Card className="shadow-sm">
                        {/* Mobile horizontal scroll hint */}
                        <div className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground bg-slate-50/80 dark:bg-muted/40 border-b border-border md:hidden">
                            <ArrowRightLeft className="h-3.5 w-3.5 text-primary shrink-0 animate-pulse" />
                            <span>Geser tabel ke samping untuk melihat seluruh status dokumen</span>
                        </div>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-muted/50">
                                            <th className="md:sticky md:left-0 z-20 bg-slate-50 dark:bg-muted/50 border-b border-r border-slate-200 dark:border-border px-3 py-3 text-center font-semibold text-gray-700 dark:text-foreground whitespace-nowrap w-12">
                                                No
                                            </th>
                                            <th className="md:sticky md:left-12 z-10 bg-slate-50 dark:bg-muted/50 border-b border-r border-slate-200 dark:border-border px-4 py-3 text-left font-semibold text-gray-700 dark:text-foreground whitespace-nowrap min-w-[200px] md:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                                OPD
                                            </th>
                                            {types.map((t) => (
                                                <th key={t.key} className="border-b border-slate-200 dark:border-border px-3 py-3 text-center font-semibold text-gray-700 dark:text-foreground whitespace-nowrap">
                                                    {t.label}
                                                </th>
                                            ))}
                                            <th className="border-b border-slate-200 dark:border-border px-3 py-3 text-center font-semibold text-gray-700 dark:text-foreground whitespace-nowrap min-w-[140px]">
                                                Kelengkapan
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {matrix.length === 0 ? (
                                            <tr>
                                                <td colSpan={types.length + 3} className="py-16 text-center">
                                                    <div className="flex flex-col items-center gap-2 text-gray-400">
                                                        <AlertCircle className="h-10 w-10 text-slate-200" />
                                                        <p className="text-sm">Tidak ada data OPD untuk tahun {year}</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : paginatedMatrix.map((row, i) => (
                                            <tr
                                                key={row.organization.id}
                                                className={`border-b border-slate-100 dark:border-border transition-colors hover:bg-slate-50 dark:hover:bg-muted/30 ${
                                                    i % 2 === 0 ? '' : 'bg-slate-50/50 dark:bg-muted/10'
                                                }`}
                                            >
                                                {/* No column — sticky on desktop */}
                                                <td className={`md:sticky md:left-0 z-20 border-r border-slate-100 dark:border-border px-3 py-2.5 text-center text-sm text-gray-500 tabular-nums w-12 ${
                                                    i % 2 === 0 ? 'bg-white dark:bg-card' : 'bg-slate-50 dark:bg-card'
                                                }`}>
                                                    {from + i}
                                                </td>
                                                {/* OPD name column — sticky on desktop */}
                                                <td className={`md:sticky md:left-12 z-10 border-r border-slate-100 dark:border-border px-4 py-2.5 whitespace-nowrap md:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] ${
                                                    i % 2 === 0 ? 'bg-white dark:bg-card' : 'bg-slate-50 dark:bg-card'
                                                }`}>
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-gray-800 dark:text-foreground text-sm">
                                                            {row.organization.name}
                                                        </span>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span className="font-mono text-[10px] text-gray-400">{row.organization.code}</span>
                                                            {row.organization.is_bappeda && (
                                                                <span className="rounded-full bg-blue-100 px-1.5 py-0 text-[10px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">Bappeda</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Document cells */}
                                                {types.map((t) => (
                                                    <MatrixCell key={t.key} cell={row.cells[t.key] ?? { status: 'missing', id: null, approved_at: null }} />
                                                ))}

                                                {/* Score bar */}
                                                <ScoreBar score={row.score} />
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <TablePagination
                                clientSide={true}
                                from={from}
                                to={to}
                                totalItems={total}
                                perPage={perPage}
                                currentPage={safeCurrentPage}
                                lastPage={lastPage}
                                itemLabel="OPD"
                                onPerPageChange={(val) => {
                                    setPerPage(val);
                                    setCurrentPage(1);
                                }}
                                onClientPageChange={(p) => setCurrentPage(p)}
                            />
                        </CardContent>
                    </Card>

                    {/* ── Footer note ──────────────────────────────────────── */}
                    <p className="text-xs text-gray-400 dark:text-muted-foreground text-center">
                        Hanya dokumen dengan status <strong>Disetujui</strong> yang dihitung sebagai lengkap dan dapat diakses publik.
                        Klik tombol Approve pada halaman Dokumen Perencanaan untuk mengubah status dokumen.
                    </p>

            </div>
        </AuthenticatedLayout>
    );
}
