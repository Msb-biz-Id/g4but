import React, { useState, useEffect } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Textarea } from '@/Components/ui/textarea';
import { Label } from '@/Components/ui/label';
import { SelectNative } from '@/Components/ui/select-native';
import { cn } from '@/lib/utils';
import { getSurabayaLevelConfig } from '@/types/kinerjaTree';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/Components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/Components/ui/table';
import TablePagination from '@/Components/TablePagination';
import {
    Building2,
    Calendar,
    FolderTree,
    GitBranch,
    Layers,
    Pencil,
    Plus,
    Printer,
    RotateCcw,
    Search,
    Trash2,
} from 'lucide-react';

interface Organization {
    id: number;
    code: string;
    name: string;
    short_name?: string;
}

interface Period {
    id: number;
    year: number;
}

interface Indicator {
    id: number;
    code: string;
    name: string;
}

interface TreeItem {
    id: number;
    code: string;
    name: string;
    description: string | null;
    level: string;
    level_label: string;
    is_active: boolean;
    total_nodes: number;
    max_depth: number;
    organization: Organization | null;
    performance_period: Period | null;
    indicator: Indicator | null;
    created_at: string;
    updated_at: string;
    can_manage: boolean;
}

interface Stats {
    total_trees: number;
    total_nodes: number;
    total_opd: number;
    active_period: string | number;
}

interface Props {
    trees: TreeItem[];
    stats: Stats;
    organizations: Organization[];
    periods: Period[];
    indicators: Indicator[];
    treeLevels: Record<string, string>;
    filters: { organization?: string; period?: string; search?: string };
    canCreate: boolean;
    isProvincialAdmin: boolean;
}

export default function TreesIndex({
    trees,
    stats,
    organizations,
    periods,
    indicators,
    treeLevels,
    filters,
    canCreate,
    isProvincialAdmin,
}: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [selectedOrg, setSelectedOrg] = useState(filters.organization ?? '');
    const [selectedPeriod, setSelectedPeriod] = useState(filters.period ?? '');

    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(25);

    const total = trees.length;
    const lastPage = Math.max(1, Math.ceil(total / perPage));
    const safeCurrentPage = Math.min(currentPage, lastPage);
    const from = total > 0 ? (safeCurrentPage - 1) * perPage + 1 : 0;
    const to = total > 0 ? Math.min(safeCurrentPage * perPage, total) : 0;
    const paginatedTrees = trees.slice((safeCurrentPage - 1) * perPage, safeCurrentPage * perPage);

    // Modal Create State
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const createForm = useForm({
        organization_id: organizations[0]?.id ? String(organizations[0].id) : '',
        performance_period_id: periods[0]?.id ? String(periods[0].id) : '',
        level: 'outcome',
        code: '',
        name: '',
        description: '',
        indicator_id: '',
        is_active: true,
    });

    // Modal Edit State
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [activeTree, setActiveTree] = useState<TreeItem | null>(null);
    const editForm = useForm({
        organization_id: '',
        performance_period_id: '',
        level: 'outcome',
        code: '',
        name: '',
        description: '',
        indicator_id: '',
        is_active: true,
    });

    // Modal Delete State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [treeToDelete, setTreeToDelete] = useState<TreeItem | null>(null);
    const [deleteCascade, setDeleteCascade] = useState(true);

    // Search debounce
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (search !== (filters.search ?? '')) {
                applyFilters({ search });
            }
        }, 400);
        return () => clearTimeout(timeout);
    }, [search]);

    const applyFilters = (newFilters: Partial<typeof filters>) => {
        const query = {
            search: search || undefined,
            organization: selectedOrg || undefined,
            period: selectedPeriod || undefined,
            ...newFilters,
        };

        // Remove undefined keys
        Object.keys(query).forEach(
            (k) => (query as any)[k] === undefined && delete (query as any)[k]
        );

        router.get(route('planning.trees.index'), query, {
            preserveState: true,
            replace: true,
        });
    };

    const handleOrgChange = (orgCode: string) => {
        setSelectedOrg(orgCode);
        applyFilters({ organization: orgCode || undefined });
    };

    const handlePeriodChange = (periodId: string) => {
        setSelectedPeriod(periodId);
        applyFilters({ period: periodId || undefined });
    };

    const handleResetFilters = () => {
        setSearch('');
        setSelectedOrg('');
        setSelectedPeriod('');
        router.get(route('planning.trees.index'), {}, { replace: true });
    };

    const openCreateModal = () => {
        createForm.reset();
        if (organizations.length > 0) {
            createForm.setData('organization_id', String(organizations[0].id));
        }
        if (periods.length > 0) {
            createForm.setData('performance_period_id', String(periods[0].id));
        }
        createForm.setData('level', 'outcome');
        createForm.setData('code', `PK-${new Date().getFullYear()}-01`);
        setCreateModalOpen(true);
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post(route('planning.trees.store'), {
            onSuccess: () => {
                setCreateModalOpen(false);
                createForm.reset();
            },
        });
    };

    const openEditModal = (tree: TreeItem) => {
        setActiveTree(tree);
        editForm.setData({
            organization_id: String(tree.organization?.id ?? ''),
            performance_period_id: String(tree.performance_period?.id ?? ''),
            level: tree.level,
            code: tree.code,
            name: tree.name,
            description: tree.description ?? '',
            indicator_id: tree.indicator?.id ? String(tree.indicator.id) : '',
            is_active: tree.is_active,
        });
        setEditModalOpen(true);
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeTree) return;
        editForm.put(route('planning.trees.update', activeTree.id), {
            onSuccess: () => {
                setEditModalOpen(false);
                setActiveTree(null);
            },
        });
    };

    const openDeleteModal = (tree: TreeItem) => {
        setTreeToDelete(tree);
        setDeleteCascade(true);
        setDeleteModalOpen(true);
    };

    const handleDeleteSubmit = () => {
        if (!treeToDelete) return;
        router.delete(route('planning.trees.destroy', treeToDelete.id), {
            data: { cascade: deleteCascade },
            onSuccess: () => {
                setDeleteModalOpen(false);
                setTreeToDelete(null);
            },
        });
    };

    return (
        <AuthenticatedLayout header="Pohon Kinerja & Cascading SAKIP">
            <Head title="Pohon Kinerja & Penjenjangan" />

            <div className="space-y-6 pb-12">
                {/* ── HEADER & ACTIONS ────────────────────────────────────────── */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-foreground">
                                Pohon Kinerja Instansi Pemerintah
                            </h1>
                            <Badge variant="outline" className="text-xs bg-primary/10 border-primary/20 text-primary dark:bg-primary/20 dark:text-primary-foreground">
                                PermenPAN-RB 89/2021
                            </Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Kelola daftar pohon kinerja daerah dan penjenjangan sasaran strategis (*cascading*) per perangkat daerah.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* Tombol Visualisasi Makro Provinsi */}
                        <Button
                            variant="outline"
                            asChild
                            className="h-9 gap-1.5 text-xs font-semibold border-slate-300 hover:bg-slate-100 dark:border-border dark:hover:bg-accent"
                        >
                            <Link href={route('planning.trees.builder.macro')}>
                                <Layers className="h-4 w-4 text-primary" />
                                <span>Visualisasi Makro Provinsi</span>
                            </Link>
                        </Button>

                        {/* Tombol Tambah Pohon Kinerja Baru */}
                        {canCreate && (
                            <Button
                                onClick={openCreateModal}
                                className="h-9 gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Tambah Pohon Kinerja</span>
                            </Button>
                        )}
                    </div>
                </div>

                {/* ── STATS CARDS ──────────────────────────────────────────────── */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Card className="shadow-sm border-slate-200 dark:border-border">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Pohon Kinerja</p>
                                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-foreground">{stats.total_trees}</p>
                            </div>
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20">
                                <FolderTree className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-slate-200 dark:border-border">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Simpul Kinerja</p>
                                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-foreground">{stats.total_nodes}</p>
                            </div>
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                                <GitBranch className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-slate-200 dark:border-border">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Perangkat Daerah</p>
                                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-foreground">{stats.total_opd}</p>
                            </div>
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                                <Building2 className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-slate-200 dark:border-border">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Periode Kinerja</p>
                                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-foreground">{stats.active_period}</p>
                            </div>
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
                                <Calendar className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* ── FILTER & PENCARIAN ────────────────────────────────────────── */}
                <Card className="border-slate-200 dark:border-border shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    type="text"
                                    placeholder="Cari nama pohon kinerja atau kode..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9 text-xs"
                                />
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <div className="w-48 sm:w-56">
                                    <SelectNative
                                        value={selectedOrg}
                                        onChange={(e) => handleOrgChange(e.target.value)}
                                        className="text-xs"
                                    >
                                        <option value="">Semua Perangkat Daerah</option>
                                        {organizations.map((org) => (
                                            <option key={org.id} value={org.code}>
                                                {org.short_name || org.name}
                                            </option>
                                        ))}
                                    </SelectNative>
                                </div>

                                <div className="w-36">
                                    <SelectNative
                                        value={selectedPeriod}
                                        onChange={(e) => handlePeriodChange(e.target.value)}
                                        className="text-xs"
                                    >
                                        <option value="">Semua Periode</option>
                                        {periods.map((p) => (
                                            <option key={p.id} value={String(p.id)}>
                                                Tahun {p.year}
                                            </option>
                                        ))}
                                    </SelectNative>
                                </div>

                                {(search || selectedOrg || selectedPeriod) && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleResetFilters}
                                        className="h-9 px-2 text-xs text-slate-500 hover:text-slate-800"
                                        title="Reset Filter"
                                    >
                                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                                        Reset
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* ── TABEL MASTER POHON KINERJA ────────────────────────────────── */}
                <Card className="border-slate-200 dark:border-border shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                                <TableRow>
                                    <TableHead className="w-12 text-center text-xs">No</TableHead>
                                    <TableHead className="min-w-[280px] text-xs font-semibold">Pohon Kinerja / Sasaran Utama</TableHead>
                                    <TableHead className="min-w-[200px] text-xs font-semibold">Perangkat Daerah (OPD)</TableHead>
                                    <TableHead className="w-24 text-xs font-semibold text-center">Periode</TableHead>
                                    <TableHead className="w-32 text-xs font-semibold">Tingkat</TableHead>
                                    <TableHead className="w-28 text-xs font-semibold text-center">Simpul</TableHead>
                                    <TableHead className="w-24 text-xs font-semibold text-center">Status</TableHead>
                                    <TableHead className="w-56 text-xs font-semibold text-center">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {trees.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-44 text-center">
                                            <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                                                <FolderTree className="h-8 w-8 text-slate-300" />
                                                <p className="font-semibold text-sm">Belum ada pohon kinerja yang terdaftar</p>
                                                <p className="text-xs max-w-sm">
                                                    Klik tombol <strong>+ Tambah Pohon Kinerja</strong> di atas untuk membuat dokumen pohon kinerja baru.
                                                </p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedTrees.map((tree, idx) => (
                                        <TableRow key={tree.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition">
                                            <TableCell className="text-center text-xs text-slate-500 font-mono">
                                                {from + idx}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-0.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                                            {tree.code}
                                                        </span>
                                                        <span className="font-semibold text-sm text-slate-900 dark:text-foreground line-clamp-1">
                                                            {tree.name}
                                                        </span>
                                                    </div>
                                                    {tree.description && (
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 pl-0.5">
                                                            {tree.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5">
                                                    <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                                        {tree.organization?.name ?? 'Pemerintah Provinsi'}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="secondary" className="text-[11px] font-mono">
                                                    {tree.performance_period?.year ?? '-'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {(() => {
                                                    const lvlCfg = getSurabayaLevelConfig(tree.level);
                                                    return (
                                                        <span className={cn('inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full border', lvlCfg.badgeBg, lvlCfg.badgeText)}>
                                                            {tree.level_label || lvlCfg.label}
                                                        </span>
                                                    );
                                                })()}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="inline-flex items-center gap-1 text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
                                                    <GitBranch className="h-3 w-3 text-emerald-600" />
                                                    <span>{tree.total_nodes}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {tree.is_active ? (
                                                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] dark:bg-emerald-950/60 dark:text-emerald-300">
                                                        Aktif
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="text-[10px]">
                                                        Nonaktif
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    {/* TOMBOL UTAMA: KELOLA / EDIT VISUAL POHON */}
                                                    <Button
                                                        size="sm"
                                                        asChild
                                                        className="h-8 gap-1 px-2.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
                                                        title="Buka visualisasi dan kelola struktur pohon kinerja ini"
                                                    >
                                                        <Link href={route('planning.trees.builder', tree.id)}>
                                                            <GitBranch className="h-3.5 w-3.5" />
                                                            <span>{tree.can_manage ? 'Kelola Pohon' : 'Lihat Pohon'}</span>
                                                        </Link>
                                                    </Button>

                                                    {/* EDIT INFO METADATA */}
                                                    {tree.can_manage && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => openEditModal(tree)}
                                                            className="h-8 w-8 p-0 text-slate-600 hover:text-primary dark:text-slate-300"
                                                            title="Edit Informasi Pohon"
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}

                                                    {/* CETAK PDF */}
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        asChild
                                                        className="h-8 w-8 p-0 text-slate-600 hover:text-emerald-600 dark:text-slate-300"
                                                        title="Cetak Pohon Kinerja (PDF)"
                                                    >
                                                        <a
                                                            href={route('planning.trees.print', {
                                                                organization: tree.organization?.id,
                                                                period: tree.performance_period?.id,
                                                            })}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            <Printer className="h-3.5 w-3.5" />
                                                        </a>
                                                    </Button>

                                                    {/* HAPUS POHON */}
                                                    {tree.can_manage && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => openDeleteModal(tree)}
                                                            className="h-8 w-8 p-0 text-slate-500 hover:text-rose-600 dark:text-slate-400"
                                                            title="Hapus Pohon Kinerja"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <TablePagination
                        clientSide={true}
                        from={from}
                        to={to}
                        totalItems={total}
                        perPage={perPage}
                        currentPage={safeCurrentPage}
                        lastPage={lastPage}
                        itemLabel="pohon kinerja"
                        onPerPageChange={(val) => {
                            setPerPage(val);
                            setCurrentPage(1);
                        }}
                        onClientPageChange={(p) => setCurrentPage(p)}
                    />
                </Card>
            </div>

            {/* ── MODAL: TAMBAH POHON KINERJA BARU ─────────────────────────────── */}
            <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
                <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-bold">
                            <FolderTree className="h-5 w-5 text-primary" />
                            Tambah Pohon Kinerja Baru
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
                        {/* Organisasi Pengampu */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Perangkat Daerah (OPD) *</Label>
                            {isProvincialAdmin ? (
                                <SelectNative
                                    value={createForm.data.organization_id}
                                    onChange={(e) => createForm.setData('organization_id', e.target.value)}
                                    className="text-xs"
                                    required
                                >
                                    {organizations.map((org) => (
                                        <option key={org.id} value={org.id}>
                                            {org.name} ({org.code})
                                        </option>
                                    ))}
                                </SelectNative>
                            ) : (
                                <Input
                                    value={organizations[0]?.name ?? 'Perangkat Daerah Anda'}
                                    disabled
                                    className="text-xs bg-slate-50 dark:bg-slate-800"
                                />
                            )}
                            {createForm.errors.organization_id && (
                                <p className="text-xs text-destructive">{createForm.errors.organization_id}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Periode */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Periode *</Label>
                                <SelectNative
                                    value={createForm.data.performance_period_id}
                                    onChange={(e) => createForm.setData('performance_period_id', e.target.value)}
                                    className="text-xs"
                                    required
                                >
                                    {periods.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            Tahun {p.year}
                                        </option>
                                    ))}
                                </SelectNative>
                            </div>

                            {/* Tingkat / Level */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Tingkat Penjenjangan *</Label>
                                <SelectNative
                                    value={createForm.data.level}
                                    onChange={(e) => createForm.setData('level', e.target.value)}
                                    className="text-xs"
                                    required
                                >
                                    <option value="visi">Visi / Tujuan Pemda</option>
                                    <option value="outcome">Sasaran Strategis</option>
                                    <option value="csf">Strategic Outcome (CSF)</option>
                                </SelectNative>
                            </div>
                        </div>

                        {/* Kode Pohon */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Kode Pohon / Simpul *</Label>
                            <Input
                                placeholder="Contoh: PK-BAPPEDA-01"
                                value={createForm.data.code}
                                onChange={(e) => createForm.setData('code', e.target.value)}
                                className="text-xs font-mono"
                                required
                            />
                            {createForm.errors.code && (
                                <p className="text-xs text-destructive">{createForm.errors.code}</p>
                            )}
                        </div>

                        {/* Nama Sasaran / Pohon */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Nama Pohon Kinerja / Sasaran Utama *</Label>
                            <Input
                                placeholder="Contoh: Meningkatnya Kualitas dan Keterpaduan Perencanaan Daerah"
                                value={createForm.data.name}
                                onChange={(e) => createForm.setData('name', e.target.value)}
                                className="text-xs"
                                required
                            />
                            {createForm.errors.name && (
                                <p className="text-xs text-destructive">{createForm.errors.name}</p>
                            )}
                        </div>

                        {/* Deskripsi */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Deskripsi / Ruang Lingkup</Label>
                            <Textarea
                                placeholder="Keterangan sasaran, target fokus, atau catatan penjenjangan..."
                                value={createForm.data.description}
                                onChange={(e) => createForm.setData('description', e.target.value)}
                                className="text-xs min-h-[60px]"
                            />
                        </div>

                        <DialogFooter className="pt-3 flex-col-reverse sm:flex-row gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setCreateModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={createForm.processing}
                                className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
                            >
                                {createForm.processing ? 'Menyimpan...' : 'Simpan Pohon Kinerja'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ── MODAL: EDIT INFORMASI POHON KINERJA ─────────────────────────── */}
            <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
                <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-bold">
                            <Pencil className="h-5 w-5 text-primary" />
                            Edit Informasi Pohon Kinerja
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Kode *</Label>
                            <Input
                                value={editForm.data.code}
                                onChange={(e) => editForm.setData('code', e.target.value)}
                                className="text-xs font-mono"
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Nama Sasaran Utama / Pohon *</Label>
                            <Input
                                value={editForm.data.name}
                                onChange={(e) => editForm.setData('name', e.target.value)}
                                className="text-xs"
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Periode *</Label>
                            <SelectNative
                                value={editForm.data.performance_period_id}
                                onChange={(e) => editForm.setData('performance_period_id', e.target.value)}
                                className="text-xs"
                                required
                            >
                                {periods.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        Tahun {p.year}
                                    </option>
                                ))}
                            </SelectNative>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Deskripsi</Label>
                            <Textarea
                                value={editForm.data.description}
                                onChange={(e) => editForm.setData('description', e.target.value)}
                                className="text-xs min-h-[60px]"
                            />
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                            <input
                                type="checkbox"
                                id="edit-is-active"
                                checked={editForm.data.is_active}
                                onChange={(e) => editForm.setData('is_active', e.target.checked)}
                                className="rounded text-primary focus:ring-primary h-4 w-4"
                            />
                            <Label htmlFor="edit-is-active" className="text-xs font-medium cursor-pointer">
                                Status Pohon Kinerja Aktif
                            </Label>
                        </div>

                        <DialogFooter className="pt-3 flex-col-reverse sm:flex-row gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditModalOpen(false)}
                                className="text-xs"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={editForm.processing}
                                className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
                            >
                                {editForm.processing ? 'Menyimpan...' : 'Perbarui'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ── MODAL: KONFIRMASI HAPUS POHON KINERJA ────────────────────────── */}
            <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
                <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-bold text-rose-600">
                            <Trash2 className="h-5 w-5" />
                            Konfirmasi Hapus Pohon Kinerja
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-3 pt-2 text-xs text-slate-600 dark:text-slate-300">
                        <p>
                            Apakah Anda yakin ingin menghapus pohon kinerja berikut?
                        </p>
                        <div className="rounded-lg bg-slate-100 p-3 dark:bg-slate-800">
                            <p className="font-bold text-slate-800 dark:text-foreground">
                                {treeToDelete?.code} — {treeToDelete?.name}
                            </p>
                            <p className="text-slate-500 mt-1">
                                Instansi: {treeToDelete?.organization?.name ?? 'Provinsi'}
                            </p>
                            <p className="text-slate-500">
                                Total simpul turunan: <strong>{treeToDelete?.total_nodes} simpul</strong>
                            </p>
                        </div>

                        <label className="flex items-center gap-2 text-xs font-medium text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded border border-rose-200 dark:border-rose-900 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={deleteCascade}
                                onChange={(e) => setDeleteCascade(e.target.checked)}
                                className="rounded text-rose-600 focus:ring-rose-500 h-4 w-4"
                            />
                            <span>Hapus sekaligus seluruh cabang simpul di dalam pohon ini (Cascade Delete)</span>
                        </label>
                    </div>

                    <DialogFooter className="pt-3 flex-col-reverse sm:flex-row gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDeleteModalOpen(false)}
                            className="text-xs"
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            onClick={handleDeleteSubmit}
                            className="text-xs bg-rose-600 hover:bg-rose-700 text-white"
                        >
                            Ya, Hapus Sekarang
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
