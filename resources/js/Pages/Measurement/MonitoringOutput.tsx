import React, { useState, useMemo } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import MeasurementNav from '@/Pages/Measurement/MeasurementNav';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import TablePagination from '@/Components/TablePagination';
import { Badge } from '@/Components/ui/badge';
import { Input } from '@/Components/ui/input';
import { Textarea } from '@/Components/ui/textarea';
import { Label } from '@/Components/ui/label';
import { Select2 } from '@/Components/ui/select2';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/Components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/Components/ui/alert-dialog';
import {
    Plus,
    Edit2,
    Trash2,
    Save,
    Activity,
    FileDown,
    Filter,
    Calendar,
    Search,
    TrendingUp,
    CheckCircle2,
    AlertCircle,
    XCircle,
    Lock as LockIcon,
} from 'lucide-react';

interface TwCalculation {
    achievement: number | null;
    status: string;
    badge: string;
    bgClass: string;
}

interface OutputItem {
    id: number;
    organization_id: number;
    organization?: { id: number; name: string; code: string };
    year: number;
    order_no: number;
    sasaran_strategis: string | null;
    indikator_sasaran: string | null;
    target_sasaran_tahunan: number | null;
    program: string | null;
    kegiatan: string | null;
    subkegiatan: string | null;
    indikator_subkegiatan: string | null;
    satuan: string | null;
    measurement_pattern: 'Positif' | 'Negatif';
    target_output_tahunan: number | null;
    target_tw1: number | null;
    target_tw2: number | null;
    target_tw3: number | null;
    target_tw4: number | null;
    realisasi_tw1: number | null;
    realisasi_tw2: number | null;
    realisasi_tw3: number | null;
    realisasi_tw4: number | null;
    person_in_charge: string | null;
    tw_calculations: {
        tw1: TwCalculation;
        tw2: TwCalculation;
        tw3: TwCalculation;
        tw4: TwCalculation;
    };
}

interface OrganizationOption {
    id: number;
    code: string;
    name: string;
}

interface Props {
    items: OutputItem[];
    organizations: OrganizationOption[];
    selectedOrgId: number | null;
    year: number;
    availableYears: number[];
    canManage: boolean;
    userIsSpBappeda: boolean;
}

export default function MonitoringOutput({
    items,
    organizations,
    selectedOrgId,
    year,
    availableYears,
    canManage,
    userIsSpBappeda,
}: Props) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editItem, setEditItem] = useState<OutputItem | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTw, setSelectedTw] = useState<'tw1' | 'tw2' | 'tw3' | 'tw4' | 'all'>('tw1');
    const [statusFilter, setStatusFilter] = useState<'Semua' | 'Tercapai' | 'Perlu Perhatian' | 'Kritis' | 'Tidak Dinilai'>('Semua');
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    const { data, setData, post, put, processing, reset } = useForm({
        organization_id: selectedOrgId || (organizations[0]?.id ?? 0),
        year: year,
        order_no: items.length + 1,
        sasaran_strategis: '',
        indikator_sasaran: '',
        target_sasaran_tahunan: '' as any,
        program: '',
        kegiatan: '',
        subkegiatan: '',
        indikator_subkegiatan: '',
        satuan: '',
        measurement_pattern: 'Positif',
        target_output_tahunan: '' as any,
        target_tw1: '' as any,
        target_tw2: '' as any,
        target_tw3: '' as any,
        target_tw4: '' as any,
        realisasi_tw1: '' as any,
        realisasi_tw2: '' as any,
        realisasi_tw3: '' as any,
        realisasi_tw4: '' as any,
        person_in_charge: '',
    });

    const twLabel = useMemo(() => {
        switch (selectedTw) {
            case 'tw1': return 'TW I';
            case 'tw2': return 'TW II';
            case 'tw3': return 'TW III';
            case 'tw4': return 'TW IV';
            case 'all': return 'Kumulatif';
        }
    }, [selectedTw]);

    // Statistics based on selected Triwulan / Kumulatif
    const stats = useMemo(() => {
        let tercapai = 0;
        let perhatian = 0;
        let kritis = 0;
        let tidakDinilai = 0;
        let totalAchievements: number[] = [];

        items.forEach((it) => {
            if (selectedTw === 'all') {
                const targetThn = Number(it.target_output_tahunan || 0);
                const rTotal = Number(it.realisasi_tw4 || it.realisasi_tw3 || it.realisasi_tw2 || it.realisasi_tw1 || 0);
                if (targetThn > 0) {
                    const ach = (rTotal / targetThn) * 100;
                    totalAchievements.push(ach);
                    if (ach >= 100) tercapai++;
                    else if (ach >= 50) perhatian++;
                    else kritis++;
                } else {
                    tidakDinilai++;
                }
            } else {
                const calc = it.tw_calculations?.[selectedTw];
                if (calc && calc.achievement !== null) {
                    totalAchievements.push(calc.achievement);
                    if (calc.status === 'Tercapai') tercapai++;
                    else if (calc.status === 'Perlu Perhatian') perhatian++;
                    else if (calc.status === 'Kritis') kritis++;
                    else tidakDinilai++;
                } else {
                    tidakDinilai++;
                }
            }
        });

        const avg = totalAchievements.length
            ? (totalAchievements.reduce((a, b) => a + b, 0) / totalAchievements.length).toFixed(1)
            : '0.0';

        return {
            total: items.length,
            avgAchievement: avg,
            tercapai,
            perhatian,
            kritis,
            tidakDinilai,
        };
    }, [items, selectedTw]);

    const filteredItems = useMemo(() => {
        let result = items;
        if (!searchQuery.trim() && statusFilter === 'Semua') return result;

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(
                (it) =>
                    (it.subkegiatan && it.subkegiatan.toLowerCase().includes(q)) ||
                    (it.kegiatan && it.kegiatan.toLowerCase().includes(q)) ||
                    (it.program && it.program.toLowerCase().includes(q)) ||
                    (it.sasaran_strategis && it.sasaran_strategis.toLowerCase().includes(q)) ||
                    (it.indikator_subkegiatan && it.indikator_subkegiatan.toLowerCase().includes(q)) ||
                    (it.person_in_charge && it.person_in_charge.toLowerCase().includes(q))
            );
        }

        if (statusFilter !== 'Semua') {
            result = result.filter((it) => {
                if (selectedTw === 'all') {
                    const targetThn = Number(it.target_output_tahunan || 0);
                    const rTotal = Number(it.realisasi_tw4 || it.realisasi_tw3 || it.realisasi_tw2 || it.realisasi_tw1 || 0);
                    const ach = targetThn > 0 ? (rTotal / targetThn) * 100 : null;
                    if (statusFilter === 'Tercapai') return ach !== null && ach >= 100;
                    if (statusFilter === 'Perlu Perhatian') return ach !== null && ach >= 50 && ach < 100;
                    if (statusFilter === 'Kritis') return ach !== null && ach < 50;
                    if (statusFilter === 'Tidak Dinilai') return ach === null;
                    return true;
                } else {
                    const calc = it.tw_calculations?.[selectedTw];
                    const st = calc?.status || 'Tidak Dinilai';
                    return st === statusFilter;
                }
            });
        }

        return result;
    }, [items, searchQuery, statusFilter, selectedTw]);

    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(25);

    const total = filteredItems.length;
    const lastPage = Math.max(1, Math.ceil(total / perPage));
    const safeCurrentPage = Math.min(currentPage, lastPage);
    const from = total > 0 ? (safeCurrentPage - 1) * perPage + 1 : 0;
    const to = total > 0 ? Math.min(safeCurrentPage * perPage, total) : 0;
    const paginatedItems = filteredItems.slice((safeCurrentPage - 1) * perPage, safeCurrentPage * perPage);

    const handleFilterChange = (newOrgId?: number, newYear?: number) => {
        router.get(
            route('measurement.monitoring.output'),
            {
                organization_id: newOrgId ?? selectedOrgId,
                year: newYear ?? year,
            },
            { preserveState: true }
        );
    };

    const openCreateModal = () => {
        reset();
        setData({
            organization_id: selectedOrgId || (organizations[0]?.id ?? 0),
            year: year,
            order_no: items.length + 1,
            sasaran_strategis: '',
            indikator_sasaran: '',
            target_sasaran_tahunan: '',
            program: '',
            kegiatan: '',
            subkegiatan: '',
            indikator_subkegiatan: '',
            satuan: '',
            measurement_pattern: 'Positif',
            target_output_tahunan: '',
            target_tw1: '',
            target_tw2: '',
            target_tw3: '',
            target_tw4: '',
            realisasi_tw1: '',
            realisasi_tw2: '',
            realisasi_tw3: '',
            realisasi_tw4: '',
            person_in_charge: '',
        });
        setIsCreateOpen(true);
    };

    const openEditModal = (item: OutputItem) => {
        setEditItem(item);
        setData({
            organization_id: item.organization_id,
            year: item.year,
            order_no: item.order_no,
            sasaran_strategis: item.sasaran_strategis || '',
            indikator_sasaran: item.indikator_sasaran || '',
            target_sasaran_tahunan: item.target_sasaran_tahunan ?? '',
            program: item.program || '',
            kegiatan: item.kegiatan || '',
            subkegiatan: item.subkegiatan || '',
            indikator_subkegiatan: item.indikator_subkegiatan || '',
            satuan: item.satuan || '',
            measurement_pattern: item.measurement_pattern || 'Positif',
            target_output_tahunan: item.target_output_tahunan ?? '',
            target_tw1: item.target_tw1 ?? '',
            target_tw2: item.target_tw2 ?? '',
            target_tw3: item.target_tw3 ?? '',
            target_tw4: item.target_tw4 ?? '',
            realisasi_tw1: item.realisasi_tw1 ?? '',
            realisasi_tw2: item.realisasi_tw2 ?? '',
            realisasi_tw3: item.realisasi_tw3 ?? '',
            realisasi_tw4: item.realisasi_tw4 ?? '',
            person_in_charge: item.person_in_charge || '',
        });
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('measurement.monitoring.output.store'), {
            onSuccess: () => {
                setIsCreateOpen(false);
                reset();
            },
        });
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editItem) return;
        put(route('measurement.monitoring.output.update', editItem.id), {
            onSuccess: () => {
                setEditItem(null);
                reset();
            },
        });
    };

    const handleDelete = (id: number) => {
        setDeleteId(id);
        setIsDeleteOpen(true);
    };

    const confirmDelete = () => {
        if (deleteId) {
            router.delete(route('measurement.monitoring.output.destroy', deleteId), {
                onSuccess: () => {
                    setIsDeleteOpen(false);
                    setDeleteId(null);
                },
            });
        }
    };

    const exportPdfUrl = route('measurement.monitoring.output.export-pdf', { organization_id: selectedOrgId ?? undefined, year: year });

    const selectedOrgName = organizations.find((o) => o.id === selectedOrgId)?.name || 'Pilih Perangkat Daerah';

    return (
        <AuthenticatedLayout>
            <Head title="Monitoring Kinerja Rencana Aksi (Fisik / Output)" />

            <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-full print:p-0">
                <div className="print:hidden">
                    <MeasurementNav activeTab="output" userIsSpBappeda={userIsSpBappeda} exportPdfUrl={exportPdfUrl} />
                </div>

                {/* Triwulan Selection Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3 p-2.5 rounded-xl bg-card border border-border/80 shadow-xs print:hidden">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 ml-1">
                            <Calendar className="h-3.5 w-3.5 text-primary" />
                            Fokus Evaluasi:
                        </span>
                        <div className="inline-flex flex-wrap items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/60">
                            {(['tw1', 'tw2', 'tw3', 'tw4'] as const).map((tw, index) => {
                                const names = ['TW I', 'TW II', 'TW III', 'TW IV'];
                                const isSelected = selectedTw === tw;
                                return (
                                    <button
                                        key={tw}
                                        type="button"
                                        onClick={() => setSelectedTw(tw)}
                                        className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                                            isSelected
                                                ? 'bg-primary text-primary-foreground shadow-xs'
                                                : 'text-muted-foreground hover:text-foreground hover:bg-background/80'
                                        }`}
                                    >
                                        {names[index]}
                                    </button>
                                );
                            })}
                            <button
                                type="button"
                                onClick={() => setSelectedTw('all')}
                                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                                    selectedTw === 'all'
                                        ? 'bg-primary text-primary-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-background/80'
                                }`}
                            >
                                Kumulatif Tahunan
                            </button>
                        </div>
                    </div>
                    <div className="text-xs text-muted-foreground px-2">
                        Status kartu merekap data: <span className="text-primary font-bold">{selectedTw === 'all' ? 'Kumulatif Seluruh Triwulan' : `Triwulan ${selectedTw.replace('tw', '').toUpperCase()}`}</span>
                        {statusFilter !== 'Semua' && (
                            <span className="ml-2 inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300 font-medium">
                                (Filter: {statusFilter})
                                <button
                                    type="button"
                                    onClick={() => setStatusFilter('Semua')}
                                    className="underline ml-1 hover:text-foreground"
                                >
                                    Reset
                                </button>
                            </span>
                        )}
                    </div>
                </div>

                {/* Executive Summary Stats Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 mb-5 print:hidden">
                    <Card className="border border-border/70 shadow-none bg-card">
                        <CardContent className="p-3.5 flex items-center justify-between">
                            <div>
                                <p className="text-[11px] font-medium text-muted-foreground">Total Subkegiatan</p>
                                <p className="text-xl font-bold tracking-tight text-foreground">{stats.total}</p>
                            </div>
                            <Activity className="h-7 w-7 text-primary/70" />
                        </CardContent>
                    </Card>

                    <Card className="border border-border/70 shadow-none bg-card">
                        <CardContent className="p-3.5 flex items-center justify-between">
                            <div>
                                <p className="text-[11px] font-medium text-muted-foreground">Rata-rata Capaian ({twLabel})</p>
                                <p className="text-xl font-bold tracking-tight text-foreground">{stats.avgAchievement}%</p>
                            </div>
                            <TrendingUp className="h-7 w-7 text-blue-500/70" />
                        </CardContent>
                    </Card>

                    <button
                        type="button"
                        onClick={() => setStatusFilter(statusFilter === 'Tercapai' ? 'Semua' : 'Tercapai')}
                        className={`border rounded-xl shadow-none p-3.5 flex items-center justify-between text-left transition cursor-pointer ${
                            statusFilter === 'Tercapai'
                                ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-100/60 dark:bg-emerald-950/40'
                                : 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-100/30'
                        }`}
                        title="Klik untuk filter data Tercapai"
                    >
                        <div>
                            <p className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300">
                                Tercapai (≥ 100%) • {twLabel}
                            </p>
                            <p className="text-xl font-bold tracking-tight text-emerald-700 dark:text-emerald-300">{stats.tercapai}</p>
                        </div>
                        <CheckCircle2 className="h-7 w-7 text-emerald-600/70" />
                    </button>

                    <button
                        type="button"
                        onClick={() => setStatusFilter(statusFilter === 'Perlu Perhatian' ? 'Semua' : 'Perlu Perhatian')}
                        className={`border rounded-xl shadow-none p-3.5 flex items-center justify-between text-left transition cursor-pointer ${
                            statusFilter === 'Perlu Perhatian'
                                ? 'border-amber-500 ring-2 ring-amber-500/30 bg-amber-100/60 dark:bg-amber-950/40'
                                : 'border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-100/30'
                        }`}
                        title="Klik untuk filter data Perlu Perhatian"
                    >
                        <div>
                            <p className="text-[11px] font-medium text-amber-800 dark:text-amber-300">
                                Perlu Perhatian • {twLabel}
                            </p>
                            <p className="text-xl font-bold tracking-tight text-amber-700 dark:text-amber-300">{stats.perhatian}</p>
                        </div>
                        <AlertCircle className="h-7 w-7 text-amber-600/70" />
                    </button>

                    <button
                        type="button"
                        onClick={() => setStatusFilter(statusFilter === 'Kritis' ? 'Semua' : 'Kritis')}
                        className={`border rounded-xl shadow-none p-3.5 flex items-center justify-between text-left transition cursor-pointer col-span-2 sm:col-span-1 ${
                            statusFilter === 'Kritis'
                                ? 'border-rose-500 ring-2 ring-rose-500/30 bg-rose-100/60 dark:bg-rose-950/40'
                                : 'border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-100/30'
                        }`}
                        title="Klik untuk filter data Kritis"
                    >
                        <div>
                            <p className="text-[11px] font-medium text-rose-800 dark:text-rose-300">
                                Kritis (&lt; 50%) • {twLabel}
                            </p>
                            <p className="text-xl font-bold tracking-tight text-rose-700 dark:text-rose-300">{stats.kritis}</p>
                        </div>
                        <XCircle className="h-7 w-7 text-rose-600/70" />
                    </button>
                </div>

                {/* Main Card */}
                <Card className="border border-border shadow-sm overflow-hidden">
                    <CardHeader className="p-4 bg-card border-b space-y-3.5">
                        {/* Row 1: Judul, Badges, Deskripsi & Tombol Aksi Utama */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
                            <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2 text-foreground">
                                        <Activity className="h-5 w-5 text-primary shrink-0" />
                                        <span>Monitoring Kinerja Fisik / Output Triwulan</span>
                                    </CardTitle>
                                    <Badge variant="secondary" className="font-mono text-xs">
                                        Pengampu: Masing2 PD
                                    </Badge>
                                    <Badge variant="outline" className="border-blue-500/60 bg-blue-50/50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300 text-xs font-normal">
                                        Tahun Anggaran: {year}
                                    </Badge>
                                </div>
                                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                                    Pemantauan realisasi kinerja output dan capaian fisik per subkegiatan berbasis triwulan.
                                </CardDescription>
                            </div>

                            {/* Tombol Aksi Tambah / Mode Baca */}
                            <div className="flex items-center gap-2 shrink-0 print:hidden">
                                {canManage ? (
                                    <Button onClick={openCreateModal} size="sm" className="h-8 gap-1.5 text-xs font-medium shrink-0 whitespace-nowrap">
                                        <Plus className="h-3.5 w-3.5" />
                                        <span>Tambah Subkegiatan</span>
                                    </Button>
                                ) : (
                                    <Badge variant="outline" className="h-8 text-xs text-muted-foreground gap-1.5 px-2.5 shrink-0 whitespace-nowrap">
                                        <LockIcon className="h-3.5 w-3.5" />
                                        <span>Mode Baca</span>
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {/* Row 2: Toolbar Filter (OPD, Tahun, Quick Status Tabs, & Search) */}
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 print:hidden">
                            {/* Left: Filter OPD & Tahun */}
                            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                                {/* OPD Selector */}
                                <div className="w-full sm:w-80 md:w-96">
                                    <Select2
                                        value={selectedOrgId ?? ''}
                                        onChange={(val) => handleFilterChange(Number(val), year)}
                                        options={organizations.map((org) => ({
                                            value: org.id,
                                            label: org.name,
                                        }))}
                                        placeholder="Pilih OPD..."
                                        searchPlaceholder="Cari OPD..."
                                    />
                                </div>

                                {/* Year Selector */}
                                <div className="w-32 shrink-0">
                                    <Select2
                                        value={year}
                                        onChange={(val) => handleFilterChange(selectedOrgId ?? undefined, Number(val))}
                                        options={availableYears.map((yr) => ({
                                            value: yr,
                                            label: `Tahun ${yr}`,
                                        }))}
                                        placeholder="Pilih Tahun"
                                    />
                                </div>
                            </div>

                            {/* Right: Quick Status Tabs & Search Input */}
                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                                {/* Quick Status Filter Tabs */}
                                <div className="flex flex-wrap items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/60">
                                    {(['Semua', 'Tercapai', 'Perlu Perhatian', 'Kritis', 'Tidak Dinilai'] as const).map((st) => (
                                        <button
                                            key={st}
                                            type="button"
                                            onClick={() => setStatusFilter(st)}
                                            className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${
                                                statusFilter === st
                                                    ? st === 'Tercapai'
                                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-semibold'
                                                        : st === 'Perlu Perhatian'
                                                        ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs font-semibold'
                                                        : st === 'Kritis'
                                                        ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs font-semibold'
                                                        : st === 'Tidak Dinilai'
                                                        ? 'bg-slate-600 hover:bg-slate-700 text-white shadow-xs font-semibold'
                                                        : 'bg-primary text-primary-foreground shadow-xs font-semibold'
                                                    : 'text-muted-foreground hover:text-foreground hover:bg-background/80'
                                            }`}
                                        >
                                            {st === 'Semua' && `Semua (${stats.total})`}
                                            {st === 'Tercapai' && `🟢 Tercapai (${stats.tercapai})`}
                                            {st === 'Perlu Perhatian' && `🟡 Perhatian (${stats.perhatian})`}
                                            {st === 'Kritis' && `🔴 Kritis (${stats.kritis})`}
                                            {st === 'Tidak Dinilai' && `⚪ Tidak Dinilai (${stats.tidakDinilai})`}
                                        </button>
                                    ))}
                                </div>

                                {/* Search Input */}
                                <div className="relative w-full sm:w-56">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Cari subkegiatan..."
                                        className="h-8 pl-8 text-xs w-full bg-background"
                                    />
                                </div>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        <div className="overflow-x-auto max-h-[72vh] relative scrollbar-thin border-b">
                            <table className="w-full text-xs border-separate border-spacing-0 text-left">
                                <thead>
                                    {/* Header Baris 1: Sticky Top */}
                                    <tr className="font-bold text-center select-none">
                                        <th
                                            rowSpan={2}
                                            className="sticky top-0 md:left-0 z-40 px-2 py-2.5 border-b border-r border-border bg-rose-100 text-rose-950 dark:bg-rose-950 dark:text-rose-100 w-[50px] min-w-[50px] max-w-[50px] text-center font-bold md:shadow-[1px_0_0_0_rgba(0,0,0,0.1)] select-none"
                                        >
                                            No
                                        </th>
                                        <th
                                            rowSpan={2}
                                            className="sticky top-0 md:left-[50px] z-40 px-3 py-2.5 border-b border-r border-border bg-rose-100 text-rose-950 dark:bg-rose-950 dark:text-rose-100 w-[220px] min-w-[220px] max-w-[220px] text-left font-bold md:shadow-[3px_0_6px_-2px_rgba(0,0,0,0.15)] select-none"
                                        >
                                            Sasaran Strategis
                                        </th>
                                        <th rowSpan={2} className="sticky top-0 z-30 px-3 py-2 border-b border-r border-border bg-rose-100 text-rose-950 dark:bg-rose-950 dark:text-rose-100 min-w-[140px]">
                                            Indikator Sasaran
                                        </th>
                                        <th rowSpan={2} className="sticky top-0 z-30 px-2 py-2 border-b border-r border-border bg-rose-100 text-rose-950 dark:bg-rose-950 dark:text-rose-100 min-w-[70px]">
                                            Target Sasaran Tahunan
                                        </th>
                                        <th rowSpan={2} className="sticky top-0 z-30 px-3 py-2 border-b border-r border-border bg-rose-100 text-rose-950 dark:bg-rose-950 dark:text-rose-100 min-w-[130px]">
                                            Program
                                        </th>
                                        <th rowSpan={2} className="sticky top-0 z-30 px-3 py-2 border-b border-r border-border bg-rose-100 text-rose-950 dark:bg-rose-950 dark:text-rose-100 min-w-[130px]">
                                            Kegiatan
                                        </th>
                                        <th rowSpan={2} className="sticky top-0 z-30 px-3 py-2 border-b border-r border-border bg-rose-100 text-rose-950 dark:bg-rose-950 dark:text-rose-100 min-w-[180px]">
                                            Subkegiatan
                                        </th>
                                        <th rowSpan={2} className="sticky top-0 z-30 px-3 py-2 border-b border-r border-border bg-rose-100 text-rose-950 dark:bg-rose-950 dark:text-rose-100 min-w-[150px]">
                                            Indikator Subkegiatan
                                        </th>
                                        <th rowSpan={2} className="sticky top-0 z-30 px-2 py-2 border-b border-r border-border bg-rose-100 text-rose-950 dark:bg-rose-950 dark:text-rose-100 min-w-[65px]">
                                            SATUAN
                                        </th>
                                        <th rowSpan={2} className="sticky top-0 z-30 px-2 py-2 border-b border-r border-border bg-rose-100 text-rose-950 dark:bg-rose-950 dark:text-rose-100 min-w-[75px]">
                                            Pola Pengukuran
                                        </th>
                                        <th rowSpan={2} className="sticky top-0 z-30 px-2 py-2 border-b border-r border-border bg-rose-100 text-rose-950 dark:bg-rose-950 dark:text-rose-100 min-w-[80px]">
                                            Target Output Thn
                                        </th>

                                        {/* Blok Abu-Abu: Triwulan */}
                                        <th colSpan={4} className="sticky top-0 z-30 px-3 py-1.5 border-b border-r border-border bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100">
                                            TARGET OUTPUT TRIWULAN
                                        </th>
                                        <th colSpan={4} className="sticky top-0 z-30 px-3 py-1.5 border-b border-r border-border bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100">
                                            REALISASI OUTPUT TRIWULAN
                                        </th>
                                        <th colSpan={4} className="sticky top-0 z-30 px-3 py-1.5 border-b border-r border-border bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100">
                                            PERSENTASE CAPAIAN OUTPUT (%)
                                        </th>

                                        {/* Blok Kuning: Status & Penanggung Jawab */}
                                        <th colSpan={4} className="sticky top-0 z-30 px-3 py-1.5 border-b border-r border-border bg-amber-200 text-amber-950 dark:bg-amber-900 dark:text-amber-100">
                                            STATUS
                                        </th>
                                        <th rowSpan={2} className="sticky top-0 z-30 px-3 py-2 border-b border-r border-border bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-100 min-w-[160px]">
                                            Penanggung Jawab (OPD Pengampu)
                                        </th>

                                        {canManage && (
                                            <th rowSpan={2} className="sticky top-0 z-30 px-3 py-2 border-b border-border bg-muted text-foreground min-w-[75px] print:hidden">
                                                AKSI
                                            </th>
                                        )}
                                    </tr>

                                    {/* Header Baris 2: Sub-Kolom TW I s/d TW IV */}
                                    <tr className="text-[11px] font-semibold text-center select-none">
                                        {/* Target TW I-IV */}
                                        <th className="sticky top-[32px] z-20 px-2 py-1.5 border-b border-r border-border bg-slate-100 text-slate-800 dark:bg-slate-800/80 dark:text-slate-200 min-w-[60px]">TW I</th>
                                        <th className="sticky top-[32px] z-20 px-2 py-1.5 border-b border-r border-border bg-slate-100 text-slate-800 dark:bg-slate-800/80 dark:text-slate-200 min-w-[60px]">TW II</th>
                                        <th className="sticky top-[32px] z-20 px-2 py-1.5 border-b border-r border-border bg-slate-100 text-slate-800 dark:bg-slate-800/80 dark:text-slate-200 min-w-[60px]">TW III</th>
                                        <th className="sticky top-[32px] z-20 px-2 py-1.5 border-b border-r border-border bg-slate-100 text-slate-800 dark:bg-slate-800/80 dark:text-slate-200 min-w-[60px]">TW IV</th>

                                        {/* Realisasi TW I-IV */}
                                        <th className="sticky top-[32px] z-20 px-2 py-1.5 border-b border-r border-border bg-slate-100 text-slate-800 dark:bg-slate-800/80 dark:text-slate-200 min-w-[60px]">TW I</th>
                                        <th className="sticky top-[32px] z-20 px-2 py-1.5 border-b border-r border-border bg-slate-100 text-slate-800 dark:bg-slate-800/80 dark:text-slate-200 min-w-[60px]">TW II</th>
                                        <th className="sticky top-[32px] z-20 px-2 py-1.5 border-b border-r border-border bg-slate-100 text-slate-800 dark:bg-slate-800/80 dark:text-slate-200 min-w-[60px]">TW III</th>
                                        <th className="sticky top-[32px] z-20 px-2 py-1.5 border-b border-r border-border bg-slate-100 text-slate-800 dark:bg-slate-800/80 dark:text-slate-200 min-w-[60px]">TW IV</th>

                                        {/* Capaian TW I-IV */}
                                        <th className={`sticky top-[32px] z-20 px-2 py-1.5 border-b border-r border-border min-w-[65px] ${selectedTw === 'tw1' ? 'bg-primary/20 text-primary font-bold ring-1 ring-inset ring-primary' : 'bg-slate-100 text-slate-800 dark:bg-slate-800/80 dark:text-slate-200'}`}>TW I</th>
                                        <th className={`sticky top-[32px] z-20 px-2 py-1.5 border-b border-r border-border min-w-[65px] ${selectedTw === 'tw2' ? 'bg-primary/20 text-primary font-bold ring-1 ring-inset ring-primary' : 'bg-slate-100 text-slate-800 dark:bg-slate-800/80 dark:text-slate-200'}`}>TW II</th>
                                        <th className={`sticky top-[32px] z-20 px-2 py-1.5 border-b border-r border-border min-w-[65px] ${selectedTw === 'tw3' ? 'bg-primary/20 text-primary font-bold ring-1 ring-inset ring-primary' : 'bg-slate-100 text-slate-800 dark:bg-slate-800/80 dark:text-slate-200'}`}>TW III</th>
                                        <th className={`sticky top-[32px] z-20 px-2 py-1.5 border-b border-r border-border min-w-[65px] ${selectedTw === 'tw4' ? 'bg-primary/20 text-primary font-bold ring-1 ring-inset ring-primary' : 'bg-slate-100 text-slate-800 dark:bg-slate-800/80 dark:text-slate-200'}`}>TW IV</th>

                                        {/* Status TW I-IV */}
                                        <th className={`sticky top-[32px] z-20 px-1.5 py-1.5 border-b border-r border-border min-w-[85px] ${selectedTw === 'tw1' ? 'bg-amber-200 text-amber-950 font-bold ring-1 ring-inset ring-amber-500' : 'bg-amber-50 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200'}`}>TW I</th>
                                        <th className={`sticky top-[32px] z-20 px-1.5 py-1.5 border-b border-r border-border min-w-[85px] ${selectedTw === 'tw2' ? 'bg-amber-200 text-amber-950 font-bold ring-1 ring-inset ring-amber-500' : 'bg-amber-50 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200'}`}>TW II</th>
                                        <th className={`sticky top-[32px] z-20 px-1.5 py-1.5 border-b border-r border-border min-w-[85px] ${selectedTw === 'tw3' ? 'bg-amber-200 text-amber-950 font-bold ring-1 ring-inset ring-amber-500' : 'bg-amber-50 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200'}`}>TW III</th>
                                        <th className={`sticky top-[32px] z-20 px-1.5 py-1.5 border-b border-r border-border min-w-[85px] ${selectedTw === 'tw4' ? 'bg-amber-200 text-amber-950 font-bold ring-1 ring-inset ring-amber-500' : 'bg-amber-50 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200'}`}>TW IV</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-border/60 font-sans">
                                    {filteredItems.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={canManage ? 11 + 16 + 1 + 1 : 11 + 16 + 1}
                                                className="p-12 text-center"
                                            >
                                                <div className="max-w-md mx-auto flex flex-col items-center justify-center space-y-3">
                                                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                                                        <Search className="h-6 w-6" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="font-semibold text-sm text-foreground">
                                                            {searchQuery ? 'Subkegiatan Tidak Ditemukan' : 'Belum Ada Data Monitoring Fisik / Output'}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {searchQuery
                                                                ? `Tidak ada subkegiatan yang cocok dengan kata kunci "${searchQuery}". Silakan coba kata kunci lain.`
                                                                : `Belum ada rincian kegiatan dan output fisik untuk ${selectedOrgName} pada tahun ${year}.`}
                                                        </p>
                                                    </div>
                                                    {!searchQuery && canManage && (
                                                        <Button onClick={openCreateModal} size="sm" className="h-8 gap-1.5 text-xs mt-1">
                                                            <Plus className="h-3.5 w-3.5" />
                                                            <span>Tambah Subkegiatan Pertama</span>
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedItems.map((item, idx) => (
                                            <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group">
                                                {/* Sticky No */}
                                                <td className="md:sticky md:left-0 z-10 px-2 py-2.5 border-b border-r border-border text-center align-top font-mono text-muted-foreground w-[50px] min-w-[50px] max-w-[50px] bg-white dark:bg-slate-900 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 md:shadow-[1px_0_0_0_rgba(0,0,0,0.1)]">
                                                    {from + idx}
                                                </td>

                                                {/* Sticky Sasaran Strategis */}
                                                <td className="md:sticky md:left-[50px] z-10 px-3 py-2.5 border-b border-r border-border align-top font-medium text-foreground w-[220px] min-w-[220px] max-w-[220px] break-words leading-relaxed bg-white dark:bg-slate-900 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 md:shadow-[3px_0_6px_-2px_rgba(0,0,0,0.15)]">
                                                    {item.sasaran_strategis || '-'}
                                                </td>
                                                <td className="px-3 py-2 border-b border-r border-border align-top text-muted-foreground leading-relaxed">
                                                    {item.indikator_sasaran || '-'}
                                                </td>
                                                <td className="px-2 py-2 border-b border-r border-border text-right align-top font-mono tabular-nums">
                                                    {item.target_sasaran_tahunan !== null ? Number(item.target_sasaran_tahunan).toLocaleString('id-ID') : '-'}
                                                </td>
                                                <td className="px-3 py-2 border-b border-r border-border align-top text-foreground leading-relaxed">
                                                    {item.program || '-'}
                                                </td>
                                                <td className="px-3 py-2 border-b border-r border-border align-top text-foreground leading-relaxed">
                                                    {item.kegiatan || '-'}
                                                </td>
                                                <td className="px-3 py-2 border-b border-r border-border align-top font-semibold text-foreground break-words leading-relaxed">
                                                    {item.subkegiatan || '-'}
                                                </td>
                                                <td className="px-3 py-2 border-b border-r border-border align-top text-muted-foreground leading-relaxed">
                                                    {item.indikator_subkegiatan || '-'}
                                                </td>
                                                <td className="px-2 py-2 border-b border-r border-border text-center align-top font-mono text-muted-foreground">
                                                    {item.satuan || '-'}
                                                </td>
                                                <td className="px-2 py-2 border-b border-r border-border text-center align-top">
                                                    <span
                                                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                                            item.measurement_pattern === 'Negatif'
                                                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                                                                : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                                                        }`}
                                                    >
                                                        {item.measurement_pattern}
                                                    </span>
                                                </td>
                                                <td className="px-2 py-2 border-b border-r border-border text-right align-top font-mono tabular-nums font-bold text-foreground">
                                                    {item.target_output_tahunan !== null ? Number(item.target_output_tahunan).toLocaleString('id-ID') : '-'}
                                                </td>

                                                {/* Target TW I - IV */}
                                                <td className="px-2 py-2 border-b border-r border-border text-right align-top font-mono tabular-nums bg-slate-50/50 dark:bg-slate-900/30">
                                                    {item.target_tw1 !== null ? Number(item.target_tw1).toLocaleString('id-ID') : '-'}
                                                </td>
                                                <td className="px-2 py-2 border-b border-r border-border text-right align-top font-mono tabular-nums bg-slate-50/50 dark:bg-slate-900/30">
                                                    {item.target_tw2 !== null ? Number(item.target_tw2).toLocaleString('id-ID') : '-'}
                                                </td>
                                                <td className="px-2 py-2 border-b border-r border-border text-right align-top font-mono tabular-nums bg-slate-50/50 dark:bg-slate-900/30">
                                                    {item.target_tw3 !== null ? Number(item.target_tw3).toLocaleString('id-ID') : '-'}
                                                </td>
                                                <td className="px-2 py-2 border-b border-r border-border text-right align-top font-mono tabular-nums bg-slate-50/50 dark:bg-slate-900/30">
                                                    {item.target_tw4 !== null ? Number(item.target_tw4).toLocaleString('id-ID') : '-'}
                                                </td>

                                                {/* Realisasi TW I - IV */}
                                                <td className="px-2 py-2 border-b border-r border-border text-right align-top font-mono tabular-nums bg-slate-50/50 dark:bg-slate-900/30">
                                                    {item.realisasi_tw1 !== null ? Number(item.realisasi_tw1).toLocaleString('id-ID') : '-'}
                                                </td>
                                                <td className="px-2 py-2 border-b border-r border-border text-right align-top font-mono tabular-nums bg-slate-50/50 dark:bg-slate-900/30">
                                                    {item.realisasi_tw2 !== null ? Number(item.realisasi_tw2).toLocaleString('id-ID') : '-'}
                                                </td>
                                                <td className="px-2 py-2 border-b border-r border-border text-right align-top font-mono tabular-nums bg-slate-50/50 dark:bg-slate-900/30">
                                                    {item.realisasi_tw3 !== null ? Number(item.realisasi_tw3).toLocaleString('id-ID') : '-'}
                                                </td>
                                                <td className="px-2 py-2 border-b border-r border-border text-right align-top font-mono tabular-nums bg-slate-50/50 dark:bg-slate-900/30">
                                                    {item.realisasi_tw4 !== null ? Number(item.realisasi_tw4).toLocaleString('id-ID') : '-'}
                                                </td>

                                                {/* Capaian TW I - IV */}
                                                {(['tw1', 'tw2', 'tw3', 'tw4'] as const).map((tw) => {
                                                    const calc = item.tw_calculations?.[tw];
                                                    const isSelected = selectedTw === tw;
                                                    return (
                                                        <td
                                                            key={`cap-${tw}`}
                                                            className={`px-2 py-2 border-b border-r border-border text-right align-top font-mono tabular-nums font-bold ${
                                                                isSelected ? 'bg-primary/10 text-primary' : 'bg-slate-50/50 dark:bg-slate-900/30'
                                                            }`}
                                                        >
                                                            {calc && calc.achievement !== null
                                                                ? `${calc.achievement.toFixed(2)}%`
                                                                : '-'}
                                                        </td>
                                                    );
                                                })}

                                                {/* Status TW I - IV */}
                                                {(['tw1', 'tw2', 'tw3', 'tw4'] as const).map((tw) => {
                                                    const calc = item.tw_calculations?.[tw];
                                                    const isSelected = selectedTw === tw;
                                                    return (
                                                        <td
                                                            key={`stat-${tw}`}
                                                            className={`px-1 py-2 border-b border-r border-border text-center align-top ${
                                                                isSelected ? 'bg-amber-100/40 dark:bg-amber-900/30' : 'bg-amber-50/20 dark:bg-amber-950/10'
                                                            }`}
                                                        >
                                                            {calc ? (
                                                                <span
                                                                    className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold border ${calc.bgClass} whitespace-nowrap ${
                                                                        isSelected ? 'shadow-xs ring-1 ring-amber-400/50' : ''
                                                                    }`}
                                                                >
                                                                    {calc.status}
                                                                </span>
                                                            ) : (
                                                                '-'
                                                            )}
                                                        </td>
                                                    );
                                                })}

                                                {/* Penanggung Jawab */}
                                                <td className="px-3 py-2 border-b border-r border-border align-top text-xs bg-amber-50/20 dark:bg-amber-950/10 leading-relaxed">
                                                    {item.person_in_charge || '-'}
                                                </td>

                                                {/* Actions */}
                                                {canManage && (
                                                    <td className="px-2 py-2 border-b border-border text-center align-top whitespace-nowrap print:hidden">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                                                onClick={() => openEditModal(item)}
                                                                title="Edit Subkegiatan"
                                                            >
                                                                <Edit2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                                onClick={() => handleDelete(item.id)}
                                                                title="Hapus Subkegiatan"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer Helper */}
                        <TablePagination
                            clientSide={true}
                            from={from}
                            to={to}
                            totalItems={total}
                            perPage={perPage}
                            currentPage={safeCurrentPage}
                            lastPage={lastPage}
                            itemLabel="subkegiatan"
                            onPerPageChange={(val) => {
                                setPerPage(val);
                                setCurrentPage(1);
                            }}
                            onClientPageChange={(p) => setCurrentPage(p)}
                        />
                    </CardContent>
                </Card>

                {/* MODAL CREATE / EDIT */}
                <Dialog
                    open={isCreateOpen || !!editItem}
                    onOpenChange={(open) => {
                        if (!open) {
                            setIsCreateOpen(false);
                            setEditItem(null);
                        }
                    }}
                >
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Activity className="h-5 w-5 text-primary" />
                                {editItem ? 'Edit Subkegiatan Kinerja Fisik' : 'Tambah Subkegiatan Kinerja Fisik'}
                            </DialogTitle>
                            <DialogDescription>
                                Lengkapi rincian sasaran, program, kegiatan, subkegiatan serta rencana output per triwulan.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={editItem ? handleEditSubmit : handleCreateSubmit} className="space-y-4 pt-1">
                            {/* Input Blok Merah */}
                            <div className="p-3.5 bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-lg space-y-3">
                                <span className="text-xs font-bold text-rose-950 dark:text-rose-200 flex items-center gap-1.5 border-b border-rose-200 dark:border-rose-900 pb-1.5">
                                    <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                                    DATA MASTER & TARGET TAHUNAN
                                </span>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs font-semibold">Sasaran Strategis</Label>
                                        <Textarea
                                            rows={2}
                                            value={data.sasaran_strategis}
                                            onChange={(e) => setData('sasaran_strategis', e.target.value)}
                                            placeholder="Sasaran strategis..."
                                            className="text-xs bg-background resize-y"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs font-semibold">Indikator Sasaran</Label>
                                        <Input
                                            value={data.indikator_sasaran}
                                            onChange={(e) => setData('indikator_sasaran', e.target.value)}
                                            placeholder="Indikator sasaran..."
                                            className="h-8 text-xs bg-background"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs font-semibold">Program</Label>
                                        <Input
                                            value={data.program}
                                            onChange={(e) => setData('program', e.target.value)}
                                            placeholder="Program..."
                                            className="h-8 text-xs bg-background"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs font-semibold">Kegiatan</Label>
                                        <Textarea
                                            rows={2}
                                            value={data.kegiatan}
                                            onChange={(e) => setData('kegiatan', e.target.value)}
                                            placeholder="Kegiatan..."
                                            className="text-xs bg-background resize-y"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs font-semibold">Subkegiatan</Label>
                                        <Textarea
                                            rows={2}
                                            value={data.subkegiatan}
                                            onChange={(e) => setData('subkegiatan', e.target.value)}
                                            placeholder="Subkegiatan..."
                                            className="text-xs bg-background resize-y"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs font-semibold">Indikator Subkegiatan</Label>
                                        <Input
                                            value={data.indikator_subkegiatan}
                                            onChange={(e) => setData('indikator_subkegiatan', e.target.value)}
                                            placeholder="Indikator output..."
                                            className="h-8 text-xs bg-background"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                                    <div className="space-y-1">
                                        <Label className="text-xs font-semibold">Satuan</Label>
                                        <Input
                                            value={data.satuan}
                                            onChange={(e) => setData('satuan', e.target.value)}
                                            placeholder="cth: meter, unit"
                                            className="h-8 text-xs bg-background"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs font-semibold">Pola Pengukuran</Label>
                                        <Select2
                                            value={data.measurement_pattern}
                                            onChange={(val) => setData('measurement_pattern', val as 'Positif' | 'Negatif')}
                                            options={[
                                                { value: 'Positif', label: 'Positif (Makin tinggi makin baik)' },
                                                { value: 'Negatif', label: 'Negatif (Makin rendah makin baik)' },
                                            ]}
                                            placeholder="Pilih Pola"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs font-semibold">Target Sasaran Thn</Label>
                                        <Input
                                            type="number"
                                            step="any"
                                            value={data.target_sasaran_tahunan}
                                            onChange={(e) => setData('target_sasaran_tahunan', e.target.value)}
                                            placeholder="75.00"
                                            className="h-8 text-xs font-mono bg-background text-right"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs font-semibold">Target Output Thn</Label>
                                        <Input
                                            type="number"
                                            step="any"
                                            value={data.target_output_tahunan}
                                            onChange={(e) => setData('target_output_tahunan', e.target.value)}
                                            placeholder="1000"
                                            className="h-8 text-xs font-mono font-bold bg-background text-right"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Input Blok Abu-Abu: Target TW */}
                            <div className="p-3 bg-slate-100/80 dark:bg-slate-900/40 border border-slate-300 dark:border-slate-800 rounded-lg space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                        <span className="h-2 w-2 rounded-full bg-slate-500"></span>
                                        TARGET OUTPUT TRIWULAN (RENCANA KAS/PERIODIK)
                                    </span>
                                    <span className="text-[10px] text-muted-foreground font-normal">
                                        Gunakan titik (.) untuk desimal, cth: 25.50
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-[11px] text-muted-foreground font-medium">Target TW I</Label>
                                        <Input
                                            type="number"
                                            step="any"
                                            value={data.target_tw1}
                                            onChange={(e) => setData('target_tw1', e.target.value)}
                                            className="h-8 text-xs font-mono bg-background text-right"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[11px] text-muted-foreground font-medium">Target TW II</Label>
                                        <Input
                                            type="number"
                                            step="any"
                                            value={data.target_tw2}
                                            onChange={(e) => setData('target_tw2', e.target.value)}
                                            className="h-8 text-xs font-mono bg-background text-right"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[11px] text-muted-foreground font-medium">Target TW III</Label>
                                        <Input
                                            type="number"
                                            step="any"
                                            value={data.target_tw3}
                                            onChange={(e) => setData('target_tw3', e.target.value)}
                                            className="h-8 text-xs font-mono bg-background text-right"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[11px] text-muted-foreground font-medium">Target TW IV</Label>
                                        <Input
                                            type="number"
                                            step="any"
                                            value={data.target_tw4}
                                            onChange={(e) => setData('target_tw4', e.target.value)}
                                            className="h-8 text-xs font-mono bg-background text-right"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Input Blok Abu-Abu: Realisasi TW */}
                            <div className="p-3 bg-slate-100/80 dark:bg-slate-900/40 border border-slate-300 dark:border-slate-800 rounded-lg space-y-2">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-slate-500"></span>
                                    REALISASI OUTPUT TRIWULAN (CAPAIAN AKTUAL)
                                </span>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-[11px] text-muted-foreground font-medium">Realisasi TW I</Label>
                                        <Input
                                            type="number"
                                            step="any"
                                            value={data.realisasi_tw1}
                                            onChange={(e) => setData('realisasi_tw1', e.target.value)}
                                            className="h-8 text-xs font-mono bg-background text-right"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[11px] text-muted-foreground font-medium">Realisasi TW II</Label>
                                        <Input
                                            type="number"
                                            step="any"
                                            value={data.realisasi_tw2}
                                            onChange={(e) => setData('realisasi_tw2', e.target.value)}
                                            className="h-8 text-xs font-mono bg-background text-right"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[11px] text-muted-foreground font-medium">Realisasi TW III</Label>
                                        <Input
                                            type="number"
                                            step="any"
                                            value={data.realisasi_tw3}
                                            onChange={(e) => setData('realisasi_tw3', e.target.value)}
                                            className="h-8 text-xs font-mono bg-background text-right"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[11px] text-muted-foreground font-medium">Realisasi TW IV</Label>
                                        <Input
                                            type="number"
                                            step="any"
                                            value={data.realisasi_tw4}
                                            onChange={(e) => setData('realisasi_tw4', e.target.value)}
                                            className="h-8 text-xs font-mono bg-background text-right"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Blok Kuning: Penanggung Jawab */}
                            <div className="p-3.5 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg space-y-1">
                                <Label className="text-xs font-semibold text-amber-950 dark:text-amber-200">
                                    Penanggung Jawab (SESUAI OPD PENGAMPU)
                                </Label>
                                <Input
                                    value={data.person_in_charge}
                                    onChange={(e) => setData('person_in_charge', e.target.value)}
                                    placeholder="cth: Bidang Cipta Karya / Seksi Penyehatan Prasarana Permukiman"
                                    className="h-8 text-xs bg-background"
                                />
                            </div>

                            <DialogFooter className="pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setIsCreateOpen(false);
                                        setEditItem(null);
                                    }}
                                >
                                    Batal
                                </Button>
                                <Button type="submit" size="sm" disabled={processing} className="gap-1.5 font-medium">
                                    <Save className="h-4 w-4" />
                                    Simpan Data Fisik
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Data Monitoring Output?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Apakah Anda yakin ingin menghapus baris monitoring fisik/output ini? Tindakan ini tidak dapat dibatalkan.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Hapus
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AuthenticatedLayout>
    );
}

