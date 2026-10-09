import React, { useState, useMemo } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import MeasurementNav from '@/Pages/Measurement/MeasurementNav';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import TablePagination from '@/Components/TablePagination';
import { Badge } from '@/Components/ui/badge';
import { Input } from '@/Components/ui/input';
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
    Target,
    FileDown,
    Lock,
    Search,
    Calendar,
    TrendingUp,
    CheckCircle2,
    AlertCircle,
    XCircle,
    HelpCircle,
} from 'lucide-react';

interface CalculationYear {
    target: number | null;
    realization: number | null;
    achievement: number | null;
    status: string;
    badge: string;
    bgClass: string;
}

interface IkuItem {
    id: number;
    indicator_name: string;
    unit: string | null;
    measurement_pattern: 'Positif' | 'Negatif';
    targets: Record<string, number | string | null> | null;
    realizations: Record<string, number | string | null> | null;
    calculations: Record<string, CalculationYear>;
}

interface RpjmdPeriodInfo {
    id: number;
    code: string;
    name: string;
    start_date?: string;
    end_date?: string;
}

interface Props {
    items: IkuItem[];
    years: number[];
    activeYear?: number;
    activeRpjmdPeriod?: RpjmdPeriodInfo | null;
    availableRpjmdPeriods?: RpjmdPeriodInfo[];
    canManage: boolean;
    userIsSpBappeda: boolean;
}

export default function RealizationIku({
    items,
    years,
    activeYear,
    activeRpjmdPeriod,
    availableRpjmdPeriods = [],
    canManage,
    userIsSpBappeda,
}: Props) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editItem, setEditItem] = useState<IkuItem | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'Semua' | 'Tercapai' | 'Perlu Perhatian' | 'Kritis' | 'Tidak Dinilai'>('Semua');
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    const { data, setData, post, put, processing, reset } = useForm({
        indicator_name: '',
        unit: '',
        measurement_pattern: 'Positif',
        targets: {} as Record<string, any>,
        realizations: {} as Record<string, any>,
    });

    const [evalYear, setEvalYear] = useState<number>(() => {
        return activeYear ?? (years?.includes(new Date().getFullYear()) ? new Date().getFullYear() : (years?.[1] ?? years?.[0] ?? 2026));
    });

    const filteredItems = useMemo(() => {
        let result = items;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(
                (it) =>
                    (it.indicator_name && it.indicator_name.toLowerCase().includes(q)) ||
                    (it.unit && it.unit.toLowerCase().includes(q))
            );
        }
        if (statusFilter !== 'Semua') {
            result = result.filter((it) => {
                const calc = it.calculations?.[evalYear];
                const status = calc?.status ?? 'Tidak Dinilai';
                return status === statusFilter;
            });
        }
        return result;
    }, [items, searchQuery, statusFilter, evalYear]);

    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(25);

    const total = filteredItems.length;
    const lastPage = Math.max(1, Math.ceil(total / perPage));
    const safeCurrentPage = Math.min(currentPage, lastPage);
    const from = total > 0 ? (safeCurrentPage - 1) * perPage + 1 : 0;
    const to = total > 0 ? Math.min(safeCurrentPage * perPage, total) : 0;
    const paginatedItems = filteredItems.slice((safeCurrentPage - 1) * perPage, safeCurrentPage * perPage);

    const stats = useMemo(() => {
        let tercapai = 0;
        let perhatian = 0;
        let kritis = 0;
        let tidakDinilai = 0;
        const totalAchievements: number[] = [];

        items.forEach((it) => {
            const calc = it.calculations?.[evalYear];
            const status = calc?.status ?? 'Tidak Dinilai';
            if (status === 'Tercapai') {
                tercapai++;
                if (calc?.achievement !== null && calc?.achievement !== undefined) {
                    totalAchievements.push(calc.achievement);
                }
            } else if (status === 'Perlu Perhatian') {
                perhatian++;
                if (calc?.achievement !== null && calc?.achievement !== undefined) {
                    totalAchievements.push(calc.achievement);
                }
            } else if (status === 'Kritis') {
                kritis++;
                if (calc?.achievement !== null && calc?.achievement !== undefined) {
                    totalAchievements.push(calc.achievement);
                }
            } else {
                tidakDinilai++;
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
    }, [items, evalYear]);

    const openCreateModal = () => {
        reset();
        const initialTargets: Record<string, any> = {};
        const initialReals: Record<string, any> = {};
        years.forEach((y) => {
            initialTargets[y] = '';
            initialReals[y] = '';
        });
        setData({
            indicator_name: '',
            unit: '',
            measurement_pattern: 'Positif',
            targets: initialTargets,
            realizations: initialReals,
        });
        setIsCreateOpen(true);
    };

    const openEditModal = (item: IkuItem) => {
        setEditItem(item);
        const currentTargets: Record<string, any> = {};
        const currentReals: Record<string, any> = {};
        years.forEach((y) => {
            currentTargets[y] = item.targets?.[y] ?? '';
            currentReals[y] = item.realizations?.[y] ?? '';
        });
        setData({
            indicator_name: item.indicator_name,
            unit: item.unit || '',
            measurement_pattern: item.measurement_pattern || 'Positif',
            targets: currentTargets,
            realizations: currentReals,
        });
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('measurement.realization.iku.store'), {
            onSuccess: () => {
                setIsCreateOpen(false);
                reset();
            },
        });
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editItem) return;
        put(route('measurement.realization.iku.update', editItem.id), {
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
            router.delete(route('measurement.realization.iku.destroy', deleteId), {
                onSuccess: () => {
                    setIsDeleteOpen(false);
                    setDeleteId(null);
                },
            });
        }
    };

    const exportPdfUrl = route('measurement.realization.iku.export-pdf', activeRpjmdPeriod?.id ? { period_id: activeRpjmdPeriod.id } : {});

    return (
        <AuthenticatedLayout>
            <Head title="Capaian IKU PEMDA" />

            <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-full print:p-0">
                <div className="print:hidden">
                    <MeasurementNav activeTab="iku" userIsSpBappeda={userIsSpBappeda} exportPdfUrl={exportPdfUrl} />
                </div>

                {/* Tahun Evaluasi Selector Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3 p-2.5 rounded-xl bg-card border border-border/80 shadow-xs print:hidden">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 ml-1">
                            <Calendar className="h-3.5 w-3.5 text-primary" />
                            Tahun Evaluasi:
                        </span>
                        <div className="inline-flex flex-wrap items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/60">
                            {years.map((yr) => (
                                <button key={yr} type="button" onClick={() => setEvalYear(yr)}
                                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${evalYear === yr ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground hover:bg-background/80'}`}>
                                    {yr}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="text-xs text-muted-foreground px-2">Status kartu &amp; filter tabel merekap indikator untuk tahun: <span className="text-primary font-bold">{evalYear}</span></div>
                </div>

                {/* Executive Summary Stats Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5 print:hidden">
                    <button
                        type="button"
                        onClick={() => {
                            setStatusFilter('Semua');
                            setCurrentPage(1);
                        }}
                        className={`border rounded-xl shadow-none p-3.5 flex items-center justify-between text-left transition cursor-pointer ${
                            statusFilter === 'Semua' ? 'border-primary ring-2 ring-primary/30 bg-primary/5' : 'border-border/70 bg-card hover:bg-muted/40'
                        }`}
                    >
                        <div>
                            <p className="text-[11px] font-medium text-muted-foreground">Total IKU PEMDA</p>
                            <p className="text-xl font-bold tracking-tight text-foreground">{stats.total}</p>
                        </div>
                        <Target className="h-7 w-7 text-primary/70" />
                    </button>

                    <div className="border border-border/70 rounded-xl shadow-none bg-card p-3.5 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-medium text-muted-foreground">Rata-rata Capaian • {evalYear}</p>
                            <p className="text-xl font-bold tracking-tight text-foreground">{stats.avgAchievement}%</p>
                        </div>
                        <TrendingUp className="h-7 w-7 text-blue-500/70" />
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            setStatusFilter(statusFilter === 'Tercapai' ? 'Semua' : 'Tercapai');
                            setCurrentPage(1);
                        }}
                        className={`border rounded-xl shadow-none p-3.5 flex items-center justify-between text-left transition cursor-pointer ${
                            statusFilter === 'Tercapai'
                                ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-100/60 dark:bg-emerald-950/40'
                                : 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-100/30'
                        }`}
                    >
                        <div>
                            <p className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300">Tercapai (≥ 100%)</p>
                            <p className="text-xl font-bold tracking-tight text-emerald-700 dark:text-emerald-300">{stats.tercapai}</p>
                        </div>
                        <CheckCircle2 className="h-7 w-7 text-emerald-600/70" />
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setStatusFilter(statusFilter === 'Perlu Perhatian' ? 'Semua' : 'Perlu Perhatian');
                            setCurrentPage(1);
                        }}
                        className={`border rounded-xl shadow-none p-3.5 flex items-center justify-between text-left transition cursor-pointer ${
                            statusFilter === 'Perlu Perhatian'
                                ? 'border-amber-500 ring-2 ring-amber-500/30 bg-amber-100/60 dark:bg-amber-950/40'
                                : 'border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-100/30'
                        }`}
                    >
                        <div>
                            <p className="text-[11px] font-medium text-amber-800 dark:text-amber-300">Perlu Perhatian (50%–&lt;100%)</p>
                            <p className="text-xl font-bold tracking-tight text-amber-700 dark:text-amber-300">{stats.perhatian}</p>
                        </div>
                        <AlertCircle className="h-7 w-7 text-amber-600/70" />
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setStatusFilter(statusFilter === 'Kritis' ? 'Semua' : 'Kritis');
                            setCurrentPage(1);
                        }}
                        className={`border rounded-xl shadow-none p-3.5 flex items-center justify-between text-left transition cursor-pointer ${
                            statusFilter === 'Kritis'
                                ? 'border-rose-500 ring-2 ring-rose-500/30 bg-rose-100/60 dark:bg-rose-950/40'
                                : 'border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-100/30'
                        }`}
                    >
                        <div>
                            <p className="text-[11px] font-medium text-rose-800 dark:text-rose-300">Kritis (&lt; 50%)</p>
                            <p className="text-xl font-bold tracking-tight text-rose-700 dark:text-rose-300">{stats.kritis}</p>
                        </div>
                        <XCircle className="h-7 w-7 text-rose-600/70" />
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setStatusFilter(statusFilter === 'Tidak Dinilai' ? 'Semua' : 'Tidak Dinilai');
                            setCurrentPage(1);
                        }}
                        className={`border rounded-xl shadow-none p-3.5 flex items-center justify-between text-left transition cursor-pointer ${
                            statusFilter === 'Tidak Dinilai'
                                ? 'border-slate-500 ring-2 ring-slate-500/30 bg-slate-100/70 dark:bg-slate-800/80'
                                : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30 hover:bg-slate-100/40'
                        }`}
                        title="Target = 0 & Realisasi = 0 / Belum Ada Data"
                    >
                        <div>
                            <p className="text-[11px] font-medium text-slate-700 dark:text-slate-300">Tidak Dinilai (T=0, R=0)</p>
                            <p className="text-xl font-bold tracking-tight text-slate-700 dark:text-slate-300">{stats.tidakDinilai}</p>
                        </div>
                        <HelpCircle className="h-7 w-7 text-slate-500/70" />
                    </button>
                </div>

                {/* Main Card */}
                <Card className="border border-border shadow-sm overflow-hidden">
                    <CardHeader className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 bg-card border-b">
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                                    <Target className="h-5 w-5 text-primary shrink-0" />
                                    <span>Capaian IKU PEMDA</span>
                                </CardTitle>
                                <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 text-[11px] font-semibold">
                                    Pengampu: Bappeda & Admin Provinsi
                                </Badge>
                                {activeRpjmdPeriod && (
                                    <Badge variant="outline" className="border-blue-500/60 bg-blue-50/50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300 text-xs font-normal">
                                        Periode: {activeRpjmdPeriod.name}
                                    </Badge>
                                )}
                            </div>
                            <CardDescription className="text-xs text-muted-foreground mt-0.5">
                                Matriks capaian dan evaluasi Indikator Kinerja Utama (IKU) PEMDA multi-tahun ({years.length > 0 ? `${years[0]}–${years[years.length - 1]}` : '2025–2030'}).
                            </CardDescription>

                            {/* Quick Status Filter Tabs */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-2.5 print:hidden">
                                <span className="text-xs font-semibold text-muted-foreground mr-1">Status:</span>
                                <Button
                                    type="button"
                                    variant={statusFilter === 'Semua' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => {
                                        setStatusFilter('Semua');
                                        setCurrentPage(1);
                                    }}
                                    className="h-7 text-xs px-2.5"
                                >
                                    Semua ({stats.total})
                                </Button>
                                <Button
                                    type="button"
                                    variant={statusFilter === 'Tercapai' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => {
                                        setStatusFilter('Tercapai');
                                        setCurrentPage(1);
                                    }}
                                    className={`h-7 text-xs px-2.5 ${
                                        statusFilter === 'Tercapai'
                                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                            : 'text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-300 dark:border-emerald-800'
                                    }`}
                                >
                                    🟢 Tercapai ({stats.tercapai})
                                </Button>
                                <Button
                                    type="button"
                                    variant={statusFilter === 'Perlu Perhatian' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => {
                                        setStatusFilter('Perlu Perhatian');
                                        setCurrentPage(1);
                                    }}
                                    className={`h-7 text-xs px-2.5 ${
                                        statusFilter === 'Perlu Perhatian'
                                            ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                            : 'text-amber-700 border-amber-300 hover:bg-amber-50 dark:text-amber-300 dark:border-amber-800'
                                    }`}
                                >
                                    🟡 Perlu Perhatian ({stats.perhatian})
                                </Button>
                                <Button
                                    type="button"
                                    variant={statusFilter === 'Kritis' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => {
                                        setStatusFilter('Kritis');
                                        setCurrentPage(1);
                                    }}
                                    className={`h-7 text-xs px-2.5 ${
                                        statusFilter === 'Kritis'
                                            ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                            : 'text-rose-700 border-rose-300 hover:bg-rose-50 dark:text-rose-300 dark:border-rose-800'
                                    }`}
                                >
                                    🔴 Kritis ({stats.kritis})
                                </Button>
                                <Button
                                    type="button"
                                    variant={statusFilter === 'Tidak Dinilai' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => {
                                        setStatusFilter('Tidak Dinilai');
                                        setCurrentPage(1);
                                    }}
                                    className={`h-7 text-xs px-2.5 ${
                                        statusFilter === 'Tidak Dinilai'
                                            ? 'bg-slate-600 hover:bg-slate-700 text-white'
                                            : 'text-slate-700 border-slate-300 hover:bg-slate-100 dark:text-slate-300 dark:border-slate-700'
                                    }`}
                                >
                                    ⚪ Tidak Dinilai ({stats.tidakDinilai})
                                </Button>
                            </div>
                        </div>

                        {/* Search, Filter & Action Controls */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full lg:w-auto print:hidden">
                            {availableRpjmdPeriods.length > 1 && (
                                <div className="w-48 sm:w-56">
                                    <Select2
                                        value={activeRpjmdPeriod?.id ?? ''}
                                        onChange={(val) => {
                                            const cleanPeriodId = typeof val === 'object' && val !== null
                                                ? String((val as any)?.target?.value ?? (val as any)?.[0] ?? val)
                                                : String(val);
                                            router.get(
                                                route('measurement.realization.iku'),
                                                { period_id: cleanPeriodId },
                                                { preserveState: true, preserveScroll: true }
                                            );
                                        }}
                                        options={availableRpjmdPeriods.map((p) => ({
                                            value: p.id,
                                            label: p.name,
                                        }))}
                                        placeholder="Pilih Periode..."
                                    />
                                </div>
                            )}

                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <div className="relative flex-1 sm:w-56">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Cari indikator IKU..."
                                        className="h-8 pl-8 text-xs w-full bg-background"
                                    />
                                </div>

                                {canManage ? (
                                    <Button onClick={openCreateModal} size="sm" className="h-8 gap-1.5 text-xs font-medium shrink-0 whitespace-nowrap">
                                        <Plus className="h-3.5 w-3.5" />
                                        <span>Tambah Indikator</span>
                                    </Button>
                                ) : (
                                    <Badge
                                        variant="outline"
                                        className="h-8 text-xs text-muted-foreground gap-1.5 px-2.5 shrink-0 whitespace-nowrap bg-muted/30 border-dashed"
                                        title="Modul ini diampu oleh Bappeda & Admin Provinsi. Akun OPD lain hanya memiliki hak akses Mode Baca."
                                    >
                                        <Lock className="h-3.5 w-3.5" />
                                        <span>Mode Baca (Pengampu: Bappeda / Provinsi)</span>
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        <div className="overflow-x-auto max-h-[72vh] relative scrollbar-thin border-b">
                            <table className="w-full text-xs border-separate border-spacing-0 text-left">
                                <thead>
                                    {/* Header Baris 1 */}
                                    <tr className="font-bold text-center select-none">
                                        <th
                                            rowSpan={2}
                                            className="sticky top-0 md:left-0 z-40 w-[50px] min-w-[50px] max-w-[50px] px-2 py-2 border-b border-r border-border bg-rose-100 text-rose-950 dark:bg-rose-950 dark:text-rose-100 text-center select-none md:shadow-[1px_0_0_0_rgba(0,0,0,0.1)]"
                                        >
                                            NO
                                        </th>
                                        <th
                                            rowSpan={2}
                                            className="sticky top-0 md:left-[50px] z-40 w-[240px] min-w-[240px] max-w-[240px] px-3 py-2 border-b border-r border-border bg-rose-100 text-rose-950 dark:bg-rose-950 dark:text-rose-100 text-center select-none md:shadow-[3px_0_6px_-2px_rgba(0,0,0,0.15)]"
                                        >
                                            INDIKATOR IKU PEMDA
                                        </th>
                                        <th rowSpan={2} className="sticky top-0 z-30 px-3 py-2 border-b border-r border-border bg-rose-100/90 text-rose-950 dark:bg-rose-950/80 dark:text-rose-100 min-w-[75px] text-center select-none">
                                            SATUAN
                                        </th>
                                        <th rowSpan={2} className="sticky top-0 z-30 px-2 py-2 border-b border-r border-border bg-rose-100/90 text-rose-950 dark:bg-rose-950/80 dark:text-rose-100 min-w-[80px] text-center select-none">
                                            POLA
                                        </th>
                                        <th colSpan={years.length} className="sticky top-0 z-30 px-3 py-1.5 border-b border-r border-border bg-rose-200/90 text-rose-950 dark:bg-rose-900/60 dark:text-rose-100 text-center select-none">
                                            TARGET
                                        </th>
                                        <th colSpan={years.length} className="sticky top-0 z-30 px-3 py-1.5 border-b border-r border-border bg-rose-200/90 text-rose-950 dark:bg-rose-900/60 dark:text-rose-100 text-center select-none">
                                            REALISASI
                                        </th>
                                        <th colSpan={years.length} className="sticky top-0 z-30 px-3 py-1.5 border-b border-r border-border bg-amber-200/90 text-amber-950 dark:bg-amber-900/60 dark:text-amber-100 text-center select-none">
                                            PERSENTASE CAPAIAN (%)
                                        </th>
                                        <th colSpan={years.length} className="sticky top-0 z-30 px-3 py-1.5 border-b border-r border-border bg-amber-200/90 text-amber-950 dark:bg-amber-900/60 dark:text-amber-100 text-center select-none">
                                            STATUS CAPAIAN
                                        </th>
                                        {canManage && (
                                            <th rowSpan={2} className="sticky top-0 z-30 px-3 py-2 border-b border-border bg-muted/90 text-foreground min-w-[80px] text-center select-none print:hidden">
                                                AKSI
                                            </th>
                                        )}
                                    </tr>

                                    {/* Header Baris 2: Sub-Kolom Tahun */}
                                    <tr className="font-semibold text-center select-none">
                                        {years.map((y) => (
                                            <th key={`t-${y}`} className="sticky top-[32px] z-20 px-2 py-1 border-b border-r border-border bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200 min-w-[65px]">
                                                {y}
                                            </th>
                                        ))}
                                        {years.map((y) => (
                                            <th key={`r-${y}`} className="sticky top-[32px] z-20 px-2 py-1 border-b border-r border-border bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200 min-w-[65px]">
                                                {y}
                                            </th>
                                        ))}
                                        {years.map((y) => (
                                            <th key={`c-${y}`} className={`sticky top-[32px] z-20 px-2 py-1 border-b border-r border-border min-w-[75px] ${evalYear === y ? 'bg-amber-200 text-amber-950 font-bold ring-1 ring-inset ring-amber-500' : 'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200'}`}>
                                                {y}
                                            </th>
                                        ))}
                                        {years.map((y) => (
                                            <th key={`s-${y}`} className={`sticky top-[32px] z-20 px-2 py-1 border-b border-r border-border min-w-[95px] ${evalYear === y ? 'bg-amber-200 text-amber-950 font-bold ring-1 ring-inset ring-amber-500' : 'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200'}`}>
                                                {y}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-border/60 font-sans">
                                    {filteredItems.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={canManage ? 4 + years.length * 4 + 1 : 4 + years.length * 4}
                                                className="p-12 text-center"
                                            >
                                                <div className="max-w-md mx-auto flex flex-col items-center justify-center space-y-3">
                                                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                                                        <Search className="h-6 w-6" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="font-semibold text-sm text-foreground">
                                                            {searchQuery || statusFilter !== 'Semua' ? 'Indikator IKU Tidak Ditemukan' : 'Belum Ada Data Realisasi IKU'}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {searchQuery || statusFilter !== 'Semua'
                                                                ? `Tidak ada indikator IKU yang cocok dengan filter "${searchQuery ? `${searchQuery} / ` : ''}${statusFilter}". Silakan pilih status atau kata kunci lain.`
                                                                : `Belum ada Indikator Kinerja Utama (IKU) Pemda yang diinputkan untuk periode ${years.length > 0 ? `${years[0]}–${years[years.length - 1]}` : 'evaluasi'}.`}
                                                        </p>
                                                    </div>
                                                    {!searchQuery && canManage && (
                                                        <Button onClick={openCreateModal} size="sm" className="h-8 gap-1.5 text-xs mt-1">
                                                            <Plus className="h-3.5 w-3.5" />
                                                            <span>Tambah Indikator IKU Pertama</span>
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedItems.map((item, idx) => (
                                            <tr key={item.id} className="hover:bg-accent/40 transition-colors group">
                                                {/* Sticky No */}
                                                <td className="md:sticky md:left-0 z-10 w-[50px] min-w-[50px] max-w-[50px] px-2 py-2 border-b border-r border-border text-center align-top font-mono text-muted-foreground bg-white dark:bg-slate-900 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 md:shadow-[1px_0_0_0_rgba(0,0,0,0.1)]">
                                                    {from + idx}
                                                </td>

                                                {/* Sticky Indikator IKU */}
                                                <td className="md:sticky md:left-[50px] z-10 w-[240px] min-w-[240px] max-w-[240px] px-3 py-2 border-b border-r border-border align-top font-semibold text-foreground bg-white dark:bg-slate-900 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 md:shadow-[3px_0_6px_-2px_rgba(0,0,0,0.15)] leading-relaxed break-words">
                                                    {item.indicator_name}
                                                </td>

                                                <td className="px-3 py-2 border-b border-r border-border text-center align-top font-mono text-muted-foreground">
                                                    {item.unit || '-'}
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

                                                {/* Targets */}
                                                {years.map((yr) => (
                                                    <td
                                                        key={`t-val-${yr}`}
                                                        className="px-2 py-2 border-b border-r border-border text-right align-top font-mono tabular-nums text-foreground bg-rose-50/20 dark:bg-rose-950/10"
                                                    >
                                                        {item.targets?.[yr] !== undefined && item.targets?.[yr] !== null && item.targets?.[yr] !== ''
                                                            ? Number(item.targets[yr]).toLocaleString('id-ID')
                                                            : '-'}
                                                    </td>
                                                ))}

                                                {/* Realizations */}
                                                {years.map((yr) => (
                                                    <td
                                                        key={`r-val-${yr}`}
                                                        className="px-2 py-2 border-b border-r border-border text-right align-top font-mono tabular-nums text-foreground bg-rose-50/20 dark:bg-rose-950/10"
                                                    >
                                                        {item.realizations?.[yr] !== undefined && item.realizations?.[yr] !== null && item.realizations?.[yr] !== ''
                                                            ? Number(item.realizations[yr]).toLocaleString('id-ID')
                                                            : '-'}
                                                    </td>
                                                ))}

                                                {/* Capaian */}
                                                {years.map((yr) => {
                                                    const calc = item.calculations?.[yr];
                                                    return (
                                                        <td
                                                            key={`c-val-${yr}`}
                                                            className={`px-2 py-2 border-b border-r border-border text-right align-top font-mono tabular-nums font-bold text-foreground ${evalYear === yr ? 'bg-amber-100/60 dark:bg-amber-900/30 ring-1 ring-inset ring-amber-400/50' : 'bg-amber-50/20 dark:bg-amber-950/10'}`}
                                                        >
                                                            {calc && calc.achievement !== null
                                                                ? `${calc.achievement.toFixed(2)}%`
                                                                : '-'}
                                                        </td>
                                                    );
                                                })}

                                                {/* Status */}
                                                {years.map((yr) => {
                                                    const calc = item.calculations?.[yr];
                                                    return (
                                                        <td
                                                            key={`s-val-${yr}`}
                                                            className={`px-1.5 py-2 border-b border-r border-border text-center align-top ${evalYear === yr ? 'bg-amber-100/60 dark:bg-amber-900/30 ring-1 ring-inset ring-amber-400/50' : 'bg-amber-50/20 dark:bg-amber-950/10'}`}
                                                        >
                                                            {calc ? (
                                                                <span
                                                                    className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold border ${calc.bgClass} whitespace-nowrap`}
                                                                >
                                                                    {calc.status}
                                                                </span>
                                                            ) : (
                                                                '-'
                                                            )}
                                                        </td>
                                                    );
                                                })}

                                                {/* Actions */}
                                                {canManage && (
                                                    <td className="px-2 py-2 border-b border-border text-center align-top whitespace-nowrap print:hidden">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                                                onClick={() => openEditModal(item)}
                                                                title="Edit IKU"
                                                            >
                                                                <Edit2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                                onClick={() => handleDelete(item.id)}
                                                                title="Hapus IKU"
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

                        {/* Kriteria Status Kinerja Legend */}
                        <div className="p-3 bg-muted/20 border-b flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground print:hidden">
                            <span className="font-semibold text-foreground">Kriteria Status Kinerja:</span>
                            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                <strong>Tercapai:</strong> Capaian &ge; 100%
                            </span>
                            <span className="text-muted-foreground/40">|</span>
                            <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                <strong>Perlu Perhatian:</strong> 50% &le; Capaian &lt; 100%
                            </span>
                            <span className="text-muted-foreground/40">|</span>
                            <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-400">
                                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                <strong>Kritis:</strong> Capaian &lt; 50% / Nilai Minus
                            </span>
                            <span className="text-muted-foreground/40">|</span>
                            <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-400">
                                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                                <strong>Tidak Dinilai:</strong> Target = 0 &amp; Realisasi = 0 / Belum Ada Data
                            </span>
                        </div>

                        <TablePagination
                            clientSide={true}
                            from={from}
                            to={to}
                            totalItems={total}
                            perPage={perPage}
                            currentPage={safeCurrentPage}
                            lastPage={lastPage}
                            itemLabel="IKU PEMDA"
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
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Target className="h-5 w-5 text-primary" />
                                {editItem ? 'Edit Indikator IKU PEMDA' : 'Tambah Indikator IKU PEMDA'}
                            </DialogTitle>
                            <DialogDescription>
                                Masukkan nama indikator, satuan, pola pengukuran, serta target dan realisasi 2025–2030.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={editItem ? handleEditSubmit : handleCreateSubmit} className="space-y-4 pt-1">
                            <div className="p-3.5 bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-lg space-y-3">
                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold">INDIKATOR IKU PEMDA</Label>
                                    <Input
                                        value={data.indicator_name}
                                        onChange={(e) => setData('indicator_name', e.target.value)}
                                        placeholder="cth: Indeks Reformasi Birokrasi / Pertumbuhan Ekonomi..."
                                        className="h-8 text-xs bg-background"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs font-semibold">SATUAN</Label>
                                        <Input
                                            value={data.unit}
                                            onChange={(e) => setData('unit', e.target.value)}
                                            placeholder="cth: %, Indeks, Poin"
                                            className="h-8 text-xs bg-background"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold">POLA PENGUKURAN</Label>
                                        <Select2
                                            value={data.measurement_pattern}
                                            onChange={(val) => setData('measurement_pattern', val as 'Positif' | 'Negatif')}
                                            options={[
                                                { value: 'Positif', label: 'Positif (Semakin tinggi realisasi semakin baik)' },
                                                { value: 'Negatif', label: 'Negatif (Semakin rendah realisasi semakin baik)' },
                                            ]}
                                            placeholder="Pilih Pola"
                                        />
                                        <div className="text-[11px] bg-muted/60 p-2 rounded border border-border/70 space-y-1">
                                            <p className="text-muted-foreground">
                                                <b>🟢 Positif:</b> Cth: IPM, Pertumbuhan Ekonomi. <span className="italic">(Realisasi/Target × 100%)</span>
                                            </p>
                                            <p className="text-muted-foreground">
                                                <b>🔴 Negatif:</b> Cth: Angka Kemiskinan, Inflasi. <span className="italic">((2 - Realisasi/Target) × 100%)</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Target Multi-Tahun */}
                            <div className="p-3 bg-muted/40 border rounded-lg space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                        <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                                        TARGET TAHUNAN ({years.length > 0 ? `${years[0]}–${years[years.length - 1]}` : ''})
                                    </Label>
                                    <span className="text-[10px] text-muted-foreground font-normal">
                                        Gunakan tanda titik (.) untuk desimal, cth: 85.50
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                                    {years.map((y) => (
                                        <div key={`target-${y}`} className="space-y-1">
                                            <span className="text-[11px] font-medium text-muted-foreground">{y}</span>
                                            <Input
                                                type="number"
                                                step="any"
                                                value={data.targets[y] ?? ''}
                                                onChange={(e) => setData('targets', { ...data.targets, [y]: e.target.value })}
                                                placeholder="Target..."
                                                className="h-8 text-xs font-mono bg-background text-right"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Realisasi Multi-Tahun */}
                            <div className="p-3 bg-muted/40 border rounded-lg space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                        <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                                        REALISASI TAHUNAN ({years.length > 0 ? `${years[0]}–${years[years.length - 1]}` : ''})
                                    </Label>
                                    <span className="text-[10px] text-muted-foreground font-normal">
                                        Gunakan tanda titik (.) untuk desimal, cth: 82.30
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                                    {years.map((y) => (
                                        <div key={`real-${y}`} className="space-y-1">
                                            <span className="text-[11px] font-medium text-muted-foreground">{y}</span>
                                            <Input
                                                type="number"
                                                step="any"
                                                value={data.realizations[y] ?? ''}
                                                onChange={(e) => setData('realizations', { ...data.realizations, [y]: e.target.value })}
                                                placeholder="Realisasi..."
                                                className="h-8 text-xs font-mono bg-background text-right"
                                            />
                                        </div>
                                    ))}
                                </div>
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
                                    Simpan Data IKU PEMDA
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Data Capaian IKU PEMDA?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Apakah Anda yakin ingin menghapus data capaian IKU PEMDA ini? Tindakan ini tidak dapat dibatalkan.
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

