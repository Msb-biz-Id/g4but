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
import { Plus, Search, Download, FileSpreadsheet, FileText, MoreVertical, Eye, Edit, Send, CheckCircle, XCircle, Archive, Upload, Filter, X, History } from 'lucide-react';
import TablePagination from '@/Components/TablePagination';

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
    isProvincialAdmin?: boolean;
    accessibleOrgIds?: number[];
    userOpdId?: number | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
    draft:      'bg-gray-100 text-gray-700',
    diajukan:   'bg-blue-100 text-blue-700',
    review:     'bg-yellow-100 text-yellow-700',
    perbaikan:  'bg-orange-100 text-orange-700',
    final:      'bg-green-100 text-green-700',
    nonaktif:   'bg-red-100 text-red-600',
};

function StatusBadge({ status }: { status: string }) {
    const label = status.charAt(0).toUpperCase() + status.slice(1);
    return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}>{label}</span>;
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
    isProvincialAdmin = false,
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
        router.post(routeMap[action], notes ? { notes } : {}, { preserveScroll: true });
    }

    const selectedLevel = filters.level ?? '';

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Indikator Kinerja Utama (IKU)</h2>}>
            <Head title="Indikator Kinerja Utama" />

            <div className="py-6">
                <div className="mx-auto max-w-7xl space-y-4 px-4 sm:px-6 lg:px-8">

                    {/* ── Breadcrumb ── */}
                    <nav className="text-sm text-gray-500">
                        <span>Beranda</span> <span className="mx-1">›</span>
                        <span>Perencanaan Kinerja</span> <span className="mx-1">›</span>
                        <span className="font-medium text-gray-800">Indikator Kinerja Utama</span>
                    </nav>

                    {/* ── Header Actions ── */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                                Indikator Kinerja Utama (IKU)
                            </h1>
                            <p className="text-xs text-muted-foreground sm:text-sm">
                                Penetapan target dan pemantauan capaian IKU Pemerintah Daerah & Perangkat Daerah.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button asChild className="w-full sm:w-auto justify-center">
                                <Link href={route('planning.iku.create')}>
                                    <Plus className="mr-2 h-4 w-4" /> Tambah IKU
                                </Link>
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setIsImportOpen(true)} className="w-full sm:w-auto justify-center">
                                <Upload className="mr-2 h-4 w-4" /> Import Excel
                            </Button>
                            <a href={route('planning.iku.export.excel', { active_year: currentActiveYear, ...filters })} className="w-full sm:w-auto">
                                <Button variant="outline" size="sm" className="w-full justify-center">
                                    <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Excel
                                </Button>
                            </a>
                            <a href={route('planning.iku.export.pdf-rekap', { active_year: currentActiveYear, ...filters })} target="_blank" className="w-full sm:w-auto">
                                <Button variant="outline" size="sm" className="w-full justify-center">
                                    <FileText className="mr-2 h-4 w-4" /> Cetak PDF
                                </Button>
                            </a>
                        </div>
                    </div>

                    {/* ── Filters ── */}
                    <Card>
                        <CardContent className="p-4 sm:p-5">
                            <div className="flex items-center justify-between gap-2 mb-3">
                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    <Filter className="h-4 w-4 text-primary" />
                                    <span>Filter Target IKU</span>
                                </div>
                                {hasFilters && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={resetFilters}
                                        className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive transition-colors"
                                    >
                                        <X className="mr-1 h-3.5 w-3.5" />
                                        Reset Filter
                                    </Button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
                                <div className="lg:col-span-3">
                                    <SelectNative
                                        value={filters.period_id ?? ''}
                                        onChange={e => applyFilter({ period_id: e.target.value, goal_id: '', objective_id: '' })}
                                        className="w-full"
                                    >
                                        <option value="">Semua Periode</option>
                                        {periods.map(p => (
                                            <option key={p.id} value={p.id}>{p.name ?? `${p.start_year}–${p.end_year}`}</option>
                                        ))}
                                    </SelectNative>
                                </div>

                                <div className="lg:col-span-2">
                                    <SelectNative
                                        value={String(currentActiveYear)}
                                        onChange={e => applyFilter({ active_year: e.target.value })}
                                        className="w-full"
                                    >
                                        {(availableYears.length > 0
                                            ? availableYears
                                            : [currentActiveYear]
                                        ).map(y => (
                                            <option key={y} value={y}>Target TA {y}</option>
                                        ))}
                                    </SelectNative>
                                </div>

                                <div className="lg:col-span-2">
                                    <SelectNative
                                        value={filters.level ?? ''}
                                        onChange={e => applyFilter({ level: e.target.value, org_id: '' })}
                                        className="w-full"
                                    >
                                        <option value="">Semua Level</option>
                                        <option value="pemda">Pemda</option>
                                        <option value="perangkat_daerah">Perangkat Daerah</option>
                                    </SelectNative>
                                </div>

                                {/* OPD filter — disembunyikan jika Admin OPD (otomatis ter-scope) */}
                                {isProvincialAdmin && filters.level === 'perangkat_daerah' && (
                                    <div className="lg:col-span-3">
                                        <SelectNative
                                            value={filters.org_id ?? ''}
                                            onChange={e => applyFilter({ org_id: e.target.value })}
                                            className="w-full"
                                        >
                                            <option value="">Semua OPD</option>
                                            {organizations.map(o => (
                                                <option key={o.id} value={o.id}>{o.code} — {o.name}</option>
                                            ))}
                                        </SelectNative>
                                    </div>
                                )}

                                {/* Filter Tujuan (cascaded dari Period) */}
                                {goals.length > 0 && (
                                    <div className="lg:col-span-3">
                                        <SelectNative
                                            value={filters.goal_id ?? ''}
                                            onChange={e => applyFilter({ goal_id: e.target.value, objective_id: '' })}
                                            className="w-full"
                                        >
                                            <option value="">Semua Tujuan</option>
                                            {goals.map(g => (
                                                <option key={g.id} value={g.id}>{g.name}</option>
                                            ))}
                                        </SelectNative>
                                    </div>
                                )}

                                {/* Filter Sasaran (cascaded dari Tujuan) */}
                                {objectives.length > 0 && (
                                    <div className="lg:col-span-3">
                                        <SelectNative
                                            value={filters.objective_id ?? ''}
                                            onChange={e => applyFilter({ objective_id: e.target.value })}
                                            className="w-full"
                                        >
                                            <option value="">Semua Sasaran</option>
                                            {objectives.map(obj => (
                                                <option key={obj.id} value={obj.id}>{obj.name}</option>
                                            ))}
                                        </SelectNative>
                                    </div>
                                )}

                                <div className="lg:col-span-2">
                                    <SelectNative
                                        value={filters.iku_status ?? ''}
                                        onChange={e => applyFilter({ iku_status: e.target.value })}
                                        className="w-full"
                                    >
                                        <option value="">Semua Status</option>
                                        {statusOptions.map(s => (
                                            <option key={s.value} value={s.value}>{s.label}</option>
                                        ))}
                                    </SelectNative>
                                </div>

                                <div className="sm:col-span-2 lg:col-span-3">
                                    <form onSubmit={handleSearch} className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                        <Input
                                            placeholder="Cari nama indikator..."
                                            value={search}
                                            onChange={e => setSearch(e.target.value)}
                                            className="pl-9 w-full"
                                        />
                                    </form>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* ── Table ── */}
                    <div className="rounded-lg border bg-white shadow-sm overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-8">No</TableHead>
                                    <TableHead>Level</TableHead>
                                    <TableHead>Tujuan / Sasaran</TableHead>
                                    <TableHead>Nama Indikator</TableHead>
                                    <TableHead>Satuan</TableHead>
                                    <TableHead>Baseline</TableHead>
                                    <TableHead className="text-right whitespace-nowrap">Target ({currentActiveYear})</TableHead>
                                    <TableHead>Penanggung Jawab</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="w-10">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {ikuList.data.length === 0 ? (
                                    <TableEmptyRow colSpan={10} description="Belum ada IKU. Klik '+ Tambah IKU' untuk mulai." />
                                ) : ikuList.data.map((iku, idx) => (
                                    <TableRow key={iku.id}>
                                        <TableCell className="text-gray-400 text-xs">
                                            {(ikuList.from ?? 0) + idx}
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-xs font-medium">
                                                {iku.level === 'pemda' ? 'Pemda' : 'PD'}
                                            </span>
                                            {iku.owner_organization && (
                                                <div className="text-xs text-gray-400">{iku.owner_organization.name}</div>
                                            )}
                                        </TableCell>
                                        <TableCell className="max-w-[200px]">
                                            {iku.strategic_goal && (
                                                <div className="text-xs text-gray-500 truncate">{iku.strategic_goal.name}</div>
                                            )}
                                            {iku.strategic_objective && (
                                                <div className="text-sm font-medium truncate">{iku.strategic_objective.name}</div>
                                            )}
                                        </TableCell>
                                        <TableCell className="max-w-[220px]">
                                            <div className="font-medium text-sm truncate">{iku.name}</div>
                                        </TableCell>
                                        <TableCell className="text-sm">{iku.measurement_unit?.symbol ?? iku.measurement_unit?.name ?? '-'}</TableCell>
                                        <TableCell className="text-sm font-medium whitespace-nowrap">
                                            {iku.formatted_baseline ?? (
                                                iku.baseline_value !== null && iku.baseline_value !== undefined ? (
                                                    `${Number(iku.baseline_value).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${iku.baseline_year ?? '-'})`
                                                ) : (
                                                    iku.baseline_year ? `(${iku.baseline_year})` : '-'
                                                )
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm font-semibold text-right text-blue-900 whitespace-nowrap">
                                            {(() => {
                                                const tgt = iku.targets?.find(t => Number(t.year) === currentActiveYear);
                                                if (tgt && tgt.target_value !== null && tgt.target_value !== undefined) {
                                                    return Number(tgt.target_value).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                                }
                                                return <span className="text-gray-400 font-normal italic">-</span>;
                                            })()}
                                        </TableCell>
                                        <TableCell className="text-sm">{iku.responsible_officer?.name ?? '-'}</TableCell>
                                        <TableCell><StatusBadge status={iku.iku_status} /></TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem asChild>
                                                        <Link href={route('planning.iku.show', iku.id)}>
                                                            <Eye className="mr-2 h-4 w-4" /> Lihat Detail
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    {['draft', 'perbaikan'].includes(iku.iku_status) && (isProvincialAdmin || (iku.level === 'perangkat_daerah' && (accessibleOrgIds.includes(iku.owner_organization?.id ?? 0) || iku.owner_organization?.id === userOpdId))) && (
                                                        <DropdownMenuItem asChild>
                                                            <Link href={route('planning.iku.edit', iku.id)}>
                                                                <Edit className="mr-2 h-4 w-4" /> Edit
                                                            </Link>
                                                        </DropdownMenuItem>
                                                    )}
                                                    {['draft', 'perbaikan'].includes(iku.iku_status) && (isProvincialAdmin || (iku.level === 'perangkat_daerah' && (accessibleOrgIds.includes(iku.owner_organization?.id ?? 0) || iku.owner_organization?.id === userOpdId))) && (
                                                        <DropdownMenuItem onClick={() => workflowAction(iku.id, 'submit')}>
                                                            <Send className="mr-2 h-4 w-4" /> Ajukan Review
                                                        </DropdownMenuItem>
                                                    )}
                                                    {isProvincialAdmin && iku.iku_status === 'diajukan' && (
                                                        <DropdownMenuItem onClick={() => workflowAction(iku.id, 'review')}>
                                                            <CheckCircle className="mr-2 h-4 w-4" /> Mulai Review
                                                        </DropdownMenuItem>
                                                    )}
                                                    {isProvincialAdmin && iku.iku_status === 'review' && (<>
                                                        <DropdownMenuItem onClick={() => workflowAction(iku.id, 'finalize')}>
                                                            <CheckCircle className="mr-2 h-4 w-4" /> Finalisasi
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => {
                                                            const notes = prompt('Catatan perbaikan (wajib):');
                                                            if (notes) workflowAction(iku.id, 'return', notes);
                                                        }}>
                                                            <XCircle className="mr-2 h-4 w-4" /> Kembalikan
                                                        </DropdownMenuItem>
                                                    </>)}
                                                    {isProvincialAdmin && iku.iku_status === 'final' && (
                                                        <DropdownMenuItem onClick={() => workflowAction(iku.id, 'deactivate')}>
                                                            <Archive className="mr-2 h-4 w-4" /> Nonaktifkan
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem asChild>
                                                        <Link href={route('planning.iku.show', iku.id) + '?tab=riwayat'}>
                                                            <History className="mr-2 h-4 w-4" /> Riwayat
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild>
                                                        <a href={route('planning.iku.export.pdf', iku.id)} target="_blank">
                                                            <FileText className="mr-2 h-4 w-4" /> Download PDF
                                                        </a>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
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
