import React, { useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Badge } from '@/Components/ui/badge';
import { SelectNative } from '@/Components/ui/select-native';
import { Card, CardContent } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { TableEmptyRow } from '@/Components/EmptyState';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/Components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/Components/ui/dialog';
import { Plus, Search, Download, FileSpreadsheet, FileText, MoreVertical, Eye, Edit, Send, CheckCircle, XCircle, Archive, Upload, Filter, X, History, Trash2, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import TablePagination from '@/Components/TablePagination';
import PageHeader from '@/Components/Dashboard/PageHeader';
import FilterToolbar from '@/Components/Dashboard/FilterToolbar';
import StatusBadge from '@/Components/Dashboard/StatusBadge';
import LevelBadge from '@/Components/Dashboard/LevelBadge';
import ActionMenuDropdown from '@/Components/Dashboard/ActionMenuDropdown';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Period { id: number; name: string; start_year: number; end_year: number; }
interface Organization { id: number; code: string; name: string; }
interface StatusOption { value: string; label: string; }
interface SelectOption { id: number; name: string; }

interface IkuTarget {
    id: number;
    year: number;
    target_value: string | number;
}

interface Iku {
    id: number;
    name: string;
    level: 'pemda' | 'perangkat_daerah';
    iku_status: string;
    polarization: string | null;
    baseline_year: number | null;
    baseline_value?: number | string | null;
    formatted_baseline?: string | null;
    targets?: IkuTarget[];
    planning_period?: { id: number; name: string; start_year: number; end_year: number };
    strategic_goal?: { id: number; name: string };
    strategic_objective?: { id: number; name: string };
    owner_organization?: { id: number; code: string; name: string };
    measurement_unit?: { id: number; symbol: string; name: string };
    responsible_officer?: { id: number; name: string };
}

interface PaginatedData<T> {
    data: T[];
    current_page: number;
    last_page: number;
    from: number;
    to: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface Props {
    ikuList: PaginatedData<Iku>;
    filters: { period_id?: string; level?: string; org_id?: string; goal_id?: string; objective_id?: string; iku_status?: string; search?: string; active_year?: string; per_page?: number | string };
    activeYear?: number;
    availableYears?: number[];
    periods: Period[];
    organizations: Organization[];
    statusOptions: StatusOption[];
    isAdminOpd?: boolean;
    isOpdAdmin?: boolean;
    accessibleOrgIds?: number[];
    userOpdId?: number | null;
}


// ── Component ─────────────────────────────────────────────────────────────────

export default function IkuIndex({
    ikuList,
    filters,
    periods,
    organizations,
    statusOptions,
    activeYear = 2025,
    availableYears = [],
    isAdminOpd = false,
    isOpdAdmin = false,
    accessibleOrgIds = [],
    userOpdId = null,
}: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // Cascaded dropdowns: Tujuan dan Sasaran
    const [goals, setGoals] = useState<SelectOption[]>([]);
    const [objectives, setObjectives] = useState<SelectOption[]>([]);

    // Fetch Tujuan saat Period berubah
    useEffect(() => {
        if (!filters.period_id) {
            setGoals([]);
            setObjectives([]);
            return;
        }
        fetch(`/api/v1/iku/goals?period_id=${filters.period_id}`)
            .then((r) => r.json())
            .then((data) => setGoals(data?.data ?? data ?? []))
            .catch(() => setGoals([]));
    }, [filters.period_id]);

    // Fetch Sasaran saat Tujuan berubah
    useEffect(() => {
        if (!filters.goal_id) {
            setObjectives([]);
            return;
        }
        fetch(`/api/v1/iku/objectives?goal_id=${filters.goal_id}`)
            .then((r) => r.json())
            .then((data) => setObjectives(data?.data ?? data ?? []))
            .catch(() => setObjectives([]));
    }, [filters.goal_id]);

    const currentActiveYear = Number(filters.active_year ?? activeYear);

    function applyFilter(partial: Record<string, string>) {
        router.get(route('planning.iku.index'), { ...filters, ...partial }, { preserveState: true, replace: true });
    }

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        applyFilter({ search });
    }

    const hasFilters = Boolean(filters.period_id || filters.active_year || filters.level || filters.org_id || filters.goal_id || filters.objective_id || filters.iku_status || filters.search);
    const resetFilters = () => {
        router.get(route('planning.iku.index'), {}, { preserveState: true, replace: true });
        setSearch('');
    };

    function handleUpload(e: React.FormEvent) {
        e.preventDefault();
        if (!importFile) return;
        setIsUploading(true);
        router.post(route('planning.iku.import.upload'), { file: importFile }, {
            forceFormData: true,
            onFinish: () => {
                setIsUploading(false);
                setIsImportOpen(false);
            },
        });
    }

    function workflowAction(ikuId: number, action: string, notes?: string) {
        const routeMap: Record<string, string> = {
            submit:     route('planning.iku.submit', ikuId),
            review:     route('planning.iku.review', ikuId),
            return:     route('planning.iku.return', ikuId),
            finalize:   route('planning.iku.finalize', ikuId),
            deactivate: route('planning.iku.deactivate', ikuId),
        };
        if (routeMap[action]) {
            router.post(routeMap[action], notes ? { notes } : {}, { preserveScroll: true });
        }
    }

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Indikator Kinerja Utama (IKU)</h2>}>
            <Head title="Indikator Kinerja Utama" />

            <div className="mx-auto max-w-7xl space-y-4">
                {/* ── Page Header ── */}
                <PageHeader
                    title="Indikator Kinerja Utama (IKU)"
                    description="Pengelolaan Indikator Kinerja Utama Pemerintah Daerah dan Perangkat Daerah beserta metadata, baseline dan target tahunan."
                    breadcrumbs={[
                        { label: 'Beranda', href: route('dashboard') },
                        { label: 'Perencanaan Kinerja' },
                        { label: 'Indikator Kinerja Utama', active: true },
                    ]}
                    actions={
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsImportOpen(true)}
                                className="h-9 font-medium border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                                <Upload className="mr-2 h-4 w-4 text-slate-500" /> Import Excel
                            </Button>
                            <a href={route('planning.iku.export.excel', { active_year: currentActiveYear, ...filters })}>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-9 font-medium border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                                >
                                    <FileSpreadsheet className="mr-2 h-4 w-4 text-slate-500" /> Export Excel
                                </Button>
                            </a>
                            <Button asChild size="sm" className="h-9 bg-primary text-primary-foreground font-semibold shadow-xs hover:bg-primary/90">
                                <Link href={route('planning.iku.create')}>
                                    <Plus className="mr-1.5 h-4 w-4" /> Tambah IKU
                                </Link>
                            </Button>
                        </>
                    }
                />

                {/* ── Filter Toolbar ── */}
                <FilterToolbar hasActiveFilters={hasFilters} onReset={resetFilters}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
                        {/* Periode */}
                        <div>
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                Periode
                            </label>
                            <SelectNative
                                value={filters.period_id ?? ''}
                                onChange={e => applyFilter({ period_id: e.target.value, goal_id: '', objective_id: '' })}
                                className="w-full h-9 text-xs rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                            >
                                <option value="">Semua Periode</option>
                                {periods.map(p => (
                                    <option key={p.id} value={p.id}>{p.name ?? `${p.start_year} - ${p.end_year}`}</option>
                                ))}
                            </SelectNative>
                        </div>

                        {/* Level IKU */}
                        <div>
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                Level IKU
                            </label>
                            <SelectNative
                                value={filters.level ?? ''}
                                onChange={e => applyFilter({ level: e.target.value, org_id: '' })}
                                className="w-full h-9 text-xs rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                            >
                                <option value="">Semua</option>
                                <option value="pemda">Pemerintah Daerah (Pemda)</option>
                                <option value="perangkat_daerah">Perangkat Daerah (OPD)</option>
                            </SelectNative>
                        </div>

                        {/* Perangkat Daerah */}
                        <div>
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                Perangkat Daerah
                            </label>
                            <SelectNative
                                value={filters.org_id ?? ''}
                                onChange={e => applyFilter({ org_id: e.target.value })}
                                className="w-full h-9 text-xs rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                            >
                                <option value="">Semua OPD</option>
                                {organizations.map(o => (
                                    <option key={o.id} value={o.id}>{o.name}</option>
                                ))}
                            </SelectNative>
                        </div>

                        {/* Sasaran */}
                        <div>
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                Sasaran
                            </label>
                            <SelectNative
                                value={filters.objective_id ?? ''}
                                onChange={e => applyFilter({ objective_id: e.target.value })}
                                className="w-full h-9 text-xs rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                            >
                                <option value="">Semua Sasaran</option>
                                {objectives.map(obj => (
                                    <option key={obj.id} value={obj.id}>{obj.name}</option>
                                ))}
                            </SelectNative>
                        </div>

                        {/* Status */}
                        <div>
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                Status
                            </label>
                            <SelectNative
                                value={filters.iku_status ?? ''}
                                onChange={e => applyFilter({ iku_status: e.target.value })}
                                className="w-full h-9 text-xs rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                            >
                                <option value="">Semua Status</option>
                                {statusOptions.map(s => (
                                    <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                            </SelectNative>
                        </div>

                        {/* Cari Indikator */}
                        <div>
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                Cari
                            </label>
                            <form onSubmit={handleSearch} className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                                <Input
                                    placeholder="Cari Indikator..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="pl-8 h-9 text-xs rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 w-full"
                                />
                            </form>
                        </div>
                    </div>
                </FilterToolbar>

                {/* ── Table Card ── */}
                <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50/80">
                                    <TableHead className="w-12 text-center text-xs font-semibold text-slate-700 dark:text-slate-300">No</TableHead>
                                    <TableHead className="text-xs font-semibold text-slate-700 dark:text-slate-300">Level</TableHead>
                                    <TableHead className="text-xs font-semibold text-slate-700 dark:text-slate-300 min-w-[220px]">Tujuan / Sasaran</TableHead>
                                    <TableHead className="text-xs font-semibold text-slate-700 dark:text-slate-300 min-w-[240px]">Indikator Kinerja Utama</TableHead>
                                    <TableHead className="text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">Satuan</TableHead>
                                    <TableHead className="text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">Baseline (Tahun)</TableHead>
                                    <TableHead className="text-xs font-semibold text-slate-700 dark:text-slate-300 text-right whitespace-nowrap">Target {currentActiveYear}</TableHead>
                                    <TableHead className="text-xs font-semibold text-slate-700 dark:text-slate-300 min-w-[150px]">Penanggung Jawab</TableHead>
                                    <TableHead className="text-xs font-semibold text-slate-700 dark:text-slate-300 text-center whitespace-nowrap">Status</TableHead>
                                    <TableHead className="w-12 text-center text-xs font-semibold text-slate-700 dark:text-slate-300">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {ikuList.data.length === 0 ? (
                                    <TableEmptyRow colSpan={10} description="Belum ada IKU. Klik '+ Tambah IKU' untuk mulai." />
                                ) : ikuList.data.map((iku, idx) => (
                                    <TableRow key={iku.id} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                                        <TableCell className="text-center text-xs text-slate-500 font-medium">
                                            {(ikuList.from ?? 0) + idx}
                                        </TableCell>
                                        <TableCell>
                                            <LevelBadge level={iku.level} />
                                        </TableCell>
                                        <TableCell className="max-w-[260px]">
                                            {iku.strategic_goal && (
                                                <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 leading-tight">
                                                    {iku.strategic_goal.name}
                                                </div>
                                            )}
                                            <div className="text-xs font-medium text-slate-800 dark:text-slate-200 line-clamp-2 mt-0.5 leading-snug">
                                                {iku.strategic_objective?.name || 'Meningkatnya akuntabilitas kinerja'}
                                            </div>
                                        </TableCell>
                                        <TableCell className="max-w-[280px]">
                                            <div className="font-semibold text-xs text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug">
                                                {iku.name}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                            {iku.measurement_unit?.symbol ?? iku.measurement_unit?.name ?? '-'}
                                        </TableCell>
                                        <TableCell className="text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                            {iku.formatted_baseline ?? (
                                                iku.baseline_value !== null && iku.baseline_value !== undefined ? (
                                                    <span>
                                                        <span className="font-medium">{Number(iku.baseline_value).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                        <span className="text-slate-400 text-[11px] ml-1">({iku.baseline_year ?? '-'})</span>
                                                    </span>
                                                ) : (
                                                    iku.baseline_year ? `(${iku.baseline_year})` : '-'
                                                )
                                            )}
                                        </TableCell>
                                        <TableCell className="text-xs font-bold text-right text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                            {(() => {
                                                const tgt = iku.targets?.find(t => Number(t.year) === currentActiveYear);
                                                if (tgt && tgt.target_value !== null && tgt.target_value !== undefined) {
                                                    return Number(tgt.target_value).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                                }
                                                return <span className="text-slate-400 font-normal italic">-</span>;
                                            })()}
                                        </TableCell>
                                        <TableCell className="text-xs text-slate-700 dark:text-slate-300">
                                            <span className="line-clamp-1 font-medium">
                                                {iku.owner_organization?.name || iku.responsible_officer?.name || '-'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center whitespace-nowrap">
                                            <StatusBadge status={iku.iku_status} />
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <ActionMenuDropdown
                                                items={[
                                                    {
                                                        label: 'Lihat Detail',
                                                        icon: <Eye className="h-3.5 w-3.5" />,
                                                        href: route('planning.iku.show', iku.id),
                                                    },
                                                    {
                                                        label: 'Edit',
                                                        icon: <Edit className="h-3.5 w-3.5" />,
                                                        href: route('planning.iku.edit', iku.id),
                                                    },
                                                    {
                                                        label: 'Kelola Target',
                                                        icon: <SlidersHorizontal className="h-3.5 w-3.5" />,
                                                        href: route('planning.iku.show', iku.id) + '?tab=target',
                                                    },
                                                    {
                                                        label: 'Cetak PDF',
                                                        icon: <FileText className="h-3.5 w-3.5" />,
                                                        href: route('planning.iku.export.pdf', iku.id),
                                                        isExternal: true,
                                                    },
                                                    {
                                                        label: 'Riwayat Perubahan',
                                                        icon: <History className="h-3.5 w-3.5" />,
                                                        href: route('planning.iku.show', iku.id) + '?tab=riwayat',
                                                        separatorBefore: true,
                                                    },
                                                    ...(iku.iku_status === 'final'
                                                        ? [
                                                              {
                                                                  label: 'Nonaktifkan',
                                                                  icon: <Archive className="h-3.5 w-3.5" />,
                                                                  onClick: () => workflowAction(iku.id, 'deactivate'),
                                                                  variant: 'warning' as const,
                                                              },
                                                          ]
                                                        : []),
                                                    ...(iku.iku_status === 'draft'
                                                        ? [
                                                              {
                                                                  label: 'Hapus (hanya Draft)',
                                                                  icon: <Trash2 className="h-3.5 w-3.5" />,
                                                                  onClick: () => {
                                                                      if (confirm('Yakin ingin menghapus IKU draft ini?')) {
                                                                          router.delete(route('planning.iku.destroy', iku.id), { preserveScroll: true });
                                                                      }
                                                                  },
                                                                  variant: 'danger' as const,
                                                              },
                                                          ]
                                                        : []),
                                                ]}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <TablePagination
                        pagination={ikuList}
                        itemLabel="IKU"
                        filters={filters}
                        baseUrl={route('planning.iku.index')}
                    />

                    {/* ── Import Modal ── */}
                    <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
                        <DialogContent className="max-h-[85vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Import Data IKU dari Excel</DialogTitle>
                                <DialogDescription>
                                    Unggah berkas Excel (.xlsx / .xls) sesuai dengan template resmi. Sistem akan memvalidasi dan menampilkan pratinjau sebelum data disimpan.
                                </DialogDescription>
                            </DialogHeader>

                            <form onSubmit={handleUpload} className="space-y-4 pt-2">
                                <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center">
                                    <FileSpreadsheet className="mx-auto h-10 w-10 text-gray-400" />
                                    <div className="mt-2">
                                        <input
                                            type="file"
                                            accept=".xlsx,.xls"
                                            onChange={e => setImportFile(e.target.files?.[0] ?? null)}
                                            className="text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                        />
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500">Maksimal 5 MB (.xlsx atau .xls)</p>
                                </div>

                                <div className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 p-3 rounded-md">
                                    <span>Belum memiliki template?</span>
                                    <a
                                        href={route('planning.iku.import.template')}
                                        className="font-medium text-blue-600 hover:underline flex items-center gap-1"
                                    >
                                        <Download className="h-3.5 w-3.5" /> Unduh Template IKU
                                    </a>
                                </div>

                                <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
                                    <Button type="button" variant="outline" onClick={() => setIsImportOpen(false)}>
                                        Batal
                                    </Button>
                                    <Button type="submit" disabled={!importFile || isUploading}>
                                        <Upload className="mr-2 h-4 w-4" />
                                        {isUploading ? 'Mengunggah...' : 'Unggah & Pratinjau'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>

                </div>
            </div>
        </AuthenticatedLayout>
    );
}
