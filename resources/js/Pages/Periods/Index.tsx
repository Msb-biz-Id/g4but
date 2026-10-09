import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent } from '@/Components/ui/card';
import { SelectNative } from '@/Components/ui/select-native';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/Components/ui/table';
import { TableEmptyRow } from '@/Components/EmptyState';
import TablePagination from '@/Components/TablePagination';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/Components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import ConfirmDialog from '@/Components/ConfirmDialog';
import { PageProps } from '@/types';
import { Head, router } from '@inertiajs/react';
import { FormEvent, Fragment, useMemo, useState } from 'react';
import { formatDate } from '@/lib/utils';
import {
    Calendar,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Filter,
    Info,
    Layers,
    Loader2,
    Lock,
    MoreVertical,
    Pencil,
    Plus,
    Search,
    Sparkles,
    Trash2,
    X,
} from 'lucide-react';
import { toast } from 'sonner';

interface MeasurementPeriod {
    id: number;
    planning_period_id: number;
    code?: string;
    name: string;
    type: string;
    start_date: string;
    end_date: string;
    submission_deadline?: string | null;
    status: string;
}

interface PlanningPeriodItem {
    id: number;
    code: string;
    name: string;
    year: number;
    type: string;
    start_date: string;
    end_date: string;
    status: string;
    measurement_periods_count: number;
    measurement_periods: MeasurementPeriod[];
}

interface Props extends PageProps {
    planningPeriods: PlanningPeriodItem[];
}

const periodTypeLabels: Record<string, string> = {
    rpjmd: 'RPJMD / Jangka Menengah',
    annual: 'Tahunan',
    semester: 'Semesteran',
    quarterly: 'Triwulan',
    monthly: 'Bulanan',
};

const statusLabels: Record<string, { text: string; variant: 'secondary' | 'success' | 'destructive' | 'warning' }> = {
    draft: { text: 'Draft', variant: 'secondary' },
    active: { text: 'Aktif', variant: 'success' },
    closed: { text: 'Tutup', variant: 'destructive' },
    archived: { text: 'Arsip', variant: 'warning' },
    open: { text: 'Terbuka', variant: 'success' },
};

export default function PeriodsIndex({ auth, planningPeriods }: Props) {
    const roles = auth.user?.roles ?? [];
    const isProvincialAdmin = roles.some((r: any) => {
        const name = typeof r === 'string' ? r : r?.name;
        return name === 'Super Admin' || name === 'Admin Provinsi';
    });
    const canManage = isProvincialAdmin || (auth.user?.permissions ?? []).includes('planning_period:manage');
    const canManageMeasurement = isProvincialAdmin || (auth.user?.permissions ?? []).includes('measurement_period:manage');

    const currentYear = new Date().getFullYear();

    // ── Search & Filter State ────────────────────────────────────────────────
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    // ── Expand/Collapse Rows State ───────────────────────────────────────────
    const [expandedPeriods, setExpandedPeriods] = useState<Record<number, boolean>>(() => {
        // Expand the active periods by default
        const initial: Record<number, boolean> = {};
        planningPeriods.forEach((p) => {
            if (p.status === 'active') {
                initial[p.id] = true;
            }
        });
        return initial;
    });

    const toggleExpand = (periodId: number) => {
        setExpandedPeriods((prev) => ({
            ...prev,
            [periodId]: !prev[periodId],
        }));
    };

    // Filtered data
    const filteredPeriods = useMemo(() => {
        return planningPeriods.filter((item) => {
            const matchesSearch =
                !search.trim() ||
                item.name.toLowerCase().includes(search.toLowerCase()) ||
                item.code.toLowerCase().includes(search.toLowerCase()) ||
                String(item.year).includes(search);

            const matchesType = !typeFilter || item.type === typeFilter;
            const matchesStatus = !statusFilter || item.status === statusFilter;

            return matchesSearch && matchesType && matchesStatus;
        });
    }, [planningPeriods, search, typeFilter, statusFilter]);

    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(25);

    const total = filteredPeriods.length;
    const lastPage = Math.max(1, Math.ceil(total / perPage));
    const safeCurrentPage = Math.min(currentPage, lastPage);
    const from = total > 0 ? (safeCurrentPage - 1) * perPage + 1 : 0;
    const to = total > 0 ? Math.min(safeCurrentPage * perPage, total) : 0;
    const paginatedPeriods = filteredPeriods.slice((safeCurrentPage - 1) * perPage, safeCurrentPage * perPage);

    const hasFilters = Boolean(search || typeFilter || statusFilter);
    const resetFilters = () => {
        setSearch('');
        setTypeFilter('');
        setStatusFilter('');
        setCurrentPage(1);
    };

    // ── Create Planning Period State & Modal ─────────────────────────────────
    const [isCreatePlanningOpen, setIsCreatePlanningOpen] = useState(false);
    const [planningForm, setPlanningForm] = useState({
        code: `PP-${currentYear}`,
        name: `Tahun Anggaran ${currentYear}`,
        year: String(currentYear),
        type: 'annual',
        start_date: `${currentYear}-01-01`,
        end_date: `${currentYear}-12-31`,
        status: 'active',
    });
    const [planningErrors, setPlanningErrors] = useState<Record<string, string>>({});
    const [submittingPlanning, setSubmittingPlanning] = useState(false);

    const openCreatePlanningModal = () => {
        setPlanningForm({
            code: `PP-${currentYear}`,
            name: `Tahun Anggaran ${currentYear}`,
            year: String(currentYear),
            type: 'annual',
            start_date: `${currentYear}-01-01`,
            end_date: `${currentYear}-12-31`,
            status: 'active',
        });
        setPlanningErrors({});
        setIsCreatePlanningOpen(true);
    };

    const handleYearChange = (newYearStr: string) => {
        const y = parseInt(newYearStr, 10);
        if (isNaN(y)) {
            setPlanningForm((prev) => ({ ...prev, year: newYearStr }));
            return;
        }

        setPlanningForm((prev) => {
            const isRPJMD = prev.type === 'rpjmd';
            return {
                ...prev,
                year: String(y),
                start_date: `${y}-01-01`,
                end_date: isRPJMD ? `${y + 4}-12-31` : `${y}-12-31`,
                code: isRPJMD ? `RPJMD-${y}-${y + 4}` : `PP-${y}`,
                name: isRPJMD ? `RPJMD Provinsi Papua Barat ${y}-${y + 4}` : `Tahun Anggaran ${y}`,
            };
        });
    };

    const handleTypeChange = (newType: string) => {
        setPlanningForm((prev) => {
            const y = parseInt(prev.year, 10) || currentYear;
            const isRPJMD = newType === 'rpjmd';
            const end_date = isRPJMD ? `${y + 4}-12-31` : `${y}-12-31`;
            const code = isRPJMD ? `RPJMD-${y}-${y + 4}` : `PP-${y}`;
            const name = isRPJMD ? `RPJMD Provinsi Papua Barat ${y}-${y + 4}` : `Tahun Anggaran ${y}`;

            return {
                ...prev,
                type: newType,
                start_date: `${y}-01-01`,
                end_date,
                code,
                name,
            };
        });
    };

    const handleStartDateChange = (newStartDate: string) => {
        setPlanningForm((prev) => {
            const yearMatch = newStartDate.match(/^(\d{4})/);
            if (yearMatch) {
                const y = parseInt(yearMatch[1], 10);
                const isRPJMD = prev.type === 'rpjmd';
                return {
                    ...prev,
                    start_date: newStartDate,
                    year: String(y),
                    end_date: isRPJMD ? `${y + 4}-12-31` : `${y}-12-31`,
                    code: isRPJMD ? `RPJMD-${y}-${y + 4}` : `PP-${y}`,
                    name: isRPJMD ? `RPJMD Provinsi Papua Barat ${y}-${y + 4}` : `Tahun Anggaran ${y}`,
                };
            }
            return { ...prev, start_date: newStartDate };
        });
    };

    const applyYearPreset = (y: number, isRpjmd = false) => {
        if (isRpjmd) {
            setPlanningForm({
                code: `RPJMD-${y}-${y + 4}`,
                name: `RPJMD Provinsi Papua Barat ${y}-${y + 4}`,
                year: String(y),
                type: 'rpjmd',
                start_date: `${y}-01-01`,
                end_date: `${y + 4}-12-31`,
                status: 'draft',
            });
        } else {
            setPlanningForm({
                code: `PP-${y}`,
                name: `Tahun Anggaran ${y}`,
                year: String(y),
                type: 'annual',
                start_date: `${y}-01-01`,
                end_date: `${y}-12-31`,
                status: 'active',
            });
        }
        setPlanningErrors({});
    };

    const createPlanningSubmit = (e: FormEvent) => {
        e.preventDefault();
        setSubmittingPlanning(true);
        router.post(route('periods.store'), planningForm, {
            onError: (errs) => {
                setPlanningErrors(errs);
                setSubmittingPlanning(false);
            },
            onSuccess: () => {
                setIsCreatePlanningOpen(false);
                setSubmittingPlanning(false);
                toast.success('Periode perencanaan berhasil dibuat.');
            },
        });
    };

    // ── Edit Planning Period State & Modal ───────────────────────────────────
    const [editingPlanningPeriod, setEditingPlanningPeriod] = useState<{
        id: number;
        code: string;
        name: string;
        year: string;
        type: string;
        start_date: string;
        end_date: string;
        status: string;
    } | null>(null);
    const [editPlanningErrors, setEditPlanningErrors] = useState<Record<string, string>>({});
    const [submittingEditPlanning, setSubmittingEditPlanning] = useState(false);
    const [deletePlanningTarget, setDeletePlanningTarget] = useState<{ id: number; name: string } | null>(null);

    const openEditPlanning = (period: PlanningPeriodItem) => {
        setEditingPlanningPeriod({
            id: period.id,
            code: period.code,
            name: period.name,
            year: String(period.year),
            type: period.type,
            start_date: period.start_date ? period.start_date.substring(0, 10) : '',
            end_date: period.end_date ? period.end_date.substring(0, 10) : '',
            status: period.status,
        });
        setEditPlanningErrors({});
    };

    const handleEditYearChange = (newYearStr: string) => {
        const y = parseInt(newYearStr, 10);
        if (isNaN(y)) {
            setEditingPlanningPeriod((prev) => (prev ? { ...prev, year: newYearStr } : null));
            return;
        }

        setEditingPlanningPeriod((prev) => {
            if (!prev) return null;
            const isRPJMD = prev.type === 'rpjmd';
            return {
                ...prev,
                year: newYearStr,
                start_date: `${y}-01-01`,
                end_date: isRPJMD ? `${y + 4}-12-31` : `${y}-12-31`,
                code: isRPJMD ? `RPJMD-${y}-${y + 4}` : `PP-${y}`,
                name: isRPJMD ? `RPJMD Provinsi Papua Barat ${y}-${y + 4}` : `Tahun Anggaran ${y}`,
            };
        });
    };

    const handleEditTypeChange = (newType: string) => {
        setEditingPlanningPeriod((prev) => {
            if (!prev) return null;
            const y = parseInt(prev.year, 10) || currentYear;
            const isRPJMD = newType === 'rpjmd';
            return {
                ...prev,
                type: newType,
                start_date: `${y}-01-01`,
                end_date: isRPJMD ? `${y + 4}-12-31` : `${y}-12-31`,
                code: isRPJMD ? `RPJMD-${y}-${y + 4}` : `PP-${y}`,
                name: isRPJMD ? `RPJMD Provinsi Papua Barat ${y}-${y + 4}` : `Tahun Anggaran ${y}`,
            };
        });
    };

    const updatePlanningPeriodSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!editingPlanningPeriod) return;
        setSubmittingEditPlanning(true);
        router.put(route('periods.update', editingPlanningPeriod.id), editingPlanningPeriod, {
            onError: (errs) => {
                setEditPlanningErrors(errs);
                setSubmittingEditPlanning(false);
            },
            onSuccess: () => {
                setEditingPlanningPeriod(null);
                setSubmittingEditPlanning(false);
                toast.success('Periode perencanaan berhasil diperbarui.');
            },
        });
    };

    const confirmDeletePlanningPeriod = () => {
        if (!deletePlanningTarget) return;
        router.delete(route('periods.destroy', deletePlanningTarget.id), {
            onSuccess: () => {
                toast.success(`Periode perencanaan "${deletePlanningTarget.name}" berhasil dihapus.`);
                setDeletePlanningTarget(null);
            },
            onError: (errs) => {
                const msg = (errs as any)?.error || 'Gagal menghapus periode perencanaan.';
                toast.error(msg);
            },
        });
    };

    const updatePlanningStatus = (period: PlanningPeriodItem, status: string) => {
        router.put(
            route('periods.update', period.id),
            {
                code: period.code,
                name: period.name,
                year: String(period.year),
                type: period.type,
                start_date: period.start_date,
                end_date: period.end_date,
                status,
            },
            {
                onSuccess: () => toast.success(`Status periode berhasil diubah menjadi ${status}.`),
                onError: () => toast.error('Gagal memperbarui status periode.'),
            },
        );
    };

    // ── Generate 4 Triwulan ──────────────────────────────────────────────────
    const [generatingQuartersId, setGeneratingQuartersId] = useState<number | null>(null);

    const generateQuarters = (periodId: number, year: number) => {
        setGeneratingQuartersId(periodId);
        router.post(
            route('periods.generate-quarters', periodId),
            {},
            {
                onSuccess: () => {
                    toast.success(`4 Triwulan untuk tahun ${year} berhasil digenerate.`);
                    setExpandedPeriods((prev) => ({ ...prev, [periodId]: true }));
                },
                onError: (errs) => {
                    toast.error((errs as any)?.error || 'Gagal generate 4 triwulan.');
                },
                onFinish: () => {
                    setGeneratingQuartersId(null);
                },
            },
        );
    };

    // ── Create Measurement Period Modal ("Tambah Sub") ──────────────────────
    const [targetPlanningForSub, setTargetPlanningForSub] = useState<PlanningPeriodItem | null>(null);
    const [subForm, setSubForm] = useState({
        code: '',
        name: '',
        type: 'quarterly',
        start_date: '',
        end_date: '',
        submission_deadline: '',
        status: 'open',
    });
    const [subErrors, setSubErrors] = useState<Record<string, string>>({});
    const [submittingSub, setSubmittingSub] = useState(false);

    const openCreateSubModal = (period: PlanningPeriodItem, preset?: 'TW1' | 'TW2' | 'TW3' | 'TW4' | 'SM1' | 'SM2') => {
        setTargetPlanningForSub(period);
        // Expand the parent row so the user sees the newly added item immediately
        setExpandedPeriods((prev) => ({ ...prev, [period.id]: true }));

        const year = period.year || currentYear;
        if (preset) {
            applyPresetToSubForm(year, preset);
        } else {
            // Default preset TW1
            setSubForm({
                code: `TW1-${year}`,
                name: `Triwulan I ${year}`,
                type: 'quarterly',
                start_date: `${year}-01-01`,
                end_date: `${year}-03-31`,
                submission_deadline: '',
                status: 'open',
            });
        }
        setSubErrors({});
    };

    const applyPresetToSubForm = (year: number, preset: 'TW1' | 'TW2' | 'TW3' | 'TW4' | 'SM1' | 'SM2') => {
        const presets: Record<
            string,
            { code: string; name: string; type: string; start_date: string; end_date: string }
        > = {
            TW1: {
                code: `TW1-${year}`,
                name: `Triwulan I ${year}`,
                type: 'quarterly',
                start_date: `${year}-01-01`,
                end_date: `${year}-03-31`,
            },
            TW2: {
                code: `TW2-${year}`,
                name: `Triwulan II ${year}`,
                type: 'quarterly',
                start_date: `${year}-04-01`,
                end_date: `${year}-06-30`,
            },
            TW3: {
                code: `TW3-${year}`,
                name: `Triwulan III ${year}`,
                type: 'quarterly',
                start_date: `${year}-07-01`,
                end_date: `${year}-09-30`,
            },
            TW4: {
                code: `TW4-${year}`,
                name: `Triwulan IV ${year}`,
                type: 'quarterly',
                start_date: `${year}-10-01`,
                end_date: `${year}-12-31`,
            },
            SM1: {
                code: `SM1-${year}`,
                name: `Semester I ${year}`,
                type: 'semester',
                start_date: `${year}-01-01`,
                end_date: `${year}-06-30`,
            },
            SM2: {
                code: `SM2-${year}`,
                name: `Semester II ${year}`,
                type: 'semester',
                start_date: `${year}-07-01`,
                end_date: `${year}-12-31`,
            },
        };

        const target = presets[preset];
        if (!target) return;

        setSubForm((prev) => ({
            ...prev,
            ...target,
        }));
        setSubErrors({});
    };

    const createSubSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!targetPlanningForSub) return;

        const errs: Record<string, string> = {};
        if (!subForm.code.trim()) errs.code = 'Kode periode wajib diisi.';
        if (!subForm.name.trim()) errs.name = 'Nama periode wajib diisi.';
        if (!subForm.start_date) errs.start_date = 'Tanggal mulai wajib dipilih.';
        if (!subForm.end_date) {
            errs.end_date = 'Tanggal selesai wajib dipilih.';
        } else if (subForm.start_date && subForm.end_date < subForm.start_date) {
            errs.end_date = 'Tanggal selesai tidak boleh sebelum tanggal mulai.';
        }

        if (Object.keys(errs).length > 0) {
            setSubErrors(errs);
            return;
        }

        setSubmittingSub(true);
        router.post(
            route('periods.measurement-periods.store', targetPlanningForSub.id),
            subForm,
            {
                onSuccess: () => {
                    setTargetPlanningForSub(null);
                    setSubmittingSub(false);
                    toast.success('Sub periode pengukuran berhasil ditambahkan.');
                },
                onError: (serverErrs) => {
                    setSubErrors(serverErrs);
                    setSubmittingSub(false);
                },
            },
        );
    };

    // ── Edit Measurement Period Modal ────────────────────────────────────────
    const [editingMeasurementPeriod, setEditingMeasurementPeriod] = useState<MeasurementPeriod | null>(null);
    const [editSubErrors, setEditSubErrors] = useState<Record<string, string>>({});
    const [submittingEditSub, setSubmittingEditSub] = useState(false);

    const openEditSubModal = (mp: MeasurementPeriod) => {
        setEditingMeasurementPeriod({
            ...mp,
            code: mp.code || `MP-${mp.id}`,
            start_date: mp.start_date ? mp.start_date.substring(0, 10) : '',
            end_date: mp.end_date ? mp.end_date.substring(0, 10) : '',
            submission_deadline: mp.submission_deadline ? mp.submission_deadline.substring(0, 10) : '',
        });
        setEditSubErrors({});
    };

    const updateSubSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!editingMeasurementPeriod) return;

        const errs: Record<string, string> = {};
        if (!editingMeasurementPeriod.code?.trim()) errs.code = 'Kode periode wajib diisi.';
        if (!editingMeasurementPeriod.name.trim()) errs.name = 'Nama periode wajib diisi.';
        if (!editingMeasurementPeriod.start_date) errs.start_date = 'Tanggal mulai wajib dipilih.';
        if (!editingMeasurementPeriod.end_date) {
            errs.end_date = 'Tanggal selesai wajib dipilih.';
        } else if (editingMeasurementPeriod.start_date && editingMeasurementPeriod.end_date < editingMeasurementPeriod.start_date) {
            errs.end_date = 'Tanggal selesai tidak boleh sebelum tanggal mulai.';
        }

        if (Object.keys(errs).length > 0) {
            setEditSubErrors(errs);
            return;
        }

        setSubmittingEditSub(true);
        router.put(
            route('measurement-periods.update', editingMeasurementPeriod.id),
            {
                code: editingMeasurementPeriod.code,
                name: editingMeasurementPeriod.name,
                type: editingMeasurementPeriod.type,
                start_date: editingMeasurementPeriod.start_date,
                end_date: editingMeasurementPeriod.end_date,
                submission_deadline: editingMeasurementPeriod.submission_deadline || null,
                status: editingMeasurementPeriod.status,
            },
            {
                onSuccess: () => {
                    setEditingMeasurementPeriod(null);
                    setSubmittingEditSub(false);
                    toast.success('Sub periode pengukuran berhasil diperbarui.');
                },
                onError: (serverErrs) => {
                    setEditSubErrors(serverErrs);
                    setSubmittingEditSub(false);
                },
            },
        );
    };

    // ── Toggle Measurement Status & Delete ───────────────────────────────────
    const toggleMeasurementStatus = (mp: MeasurementPeriod) => {
        const newStatus = mp.status === 'open' ? 'closed' : 'open';
        router.put(
            route('measurement-periods.update', mp.id),
            {
                code: mp.code || `MP-${mp.id}`,
                name: mp.name,
                type: mp.type,
                start_date: mp.start_date,
                end_date: mp.end_date,
                submission_deadline: mp.submission_deadline || null,
                status: newStatus,
            },
            {
                onSuccess: () => toast.success(`Status "${mp.name}" diubah menjadi ${newStatus === 'open' ? 'Terbuka' : 'Tutup'}.`),
                onError: () => toast.error('Gagal memperbarui status periode pengukuran.'),
            },
        );
    };

    const [deleteMeasurementTarget, setDeleteMeasurementTarget] = useState<MeasurementPeriod | null>(null);

    const confirmDeleteMeasurementPeriod = () => {
        if (!deleteMeasurementTarget) return;
        router.delete(route('measurement-periods.destroy', deleteMeasurementTarget.id), {
            onSuccess: () => {
                toast.success(`Sub periode "${deleteMeasurementTarget.name}" berhasil dihapus.`);
                setDeleteMeasurementTarget(null);
            },
            onError: (errs) => {
                const msg = (errs as any)?.error || 'Gagal menghapus sub periode pengukuran.';
                toast.error(msg);
            },
        });
    };

    return (
        <AuthenticatedLayout header="Periode Perencanaan">
            <Head title="Periode Perencanaan" />

            <div className="space-y-4">
                {/* ── Header Title Bar ────────────────────────────────────────────── */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                            Periode Perencanaan & Pengukuran
                        </h1>
                        <p className="text-xs text-muted-foreground sm:text-sm">
                            Kelola tahun anggaran, rentang perencanaan RPJMD, serta sub periode pengukuran kinerja (triwulan / semester / bulanan).
                        </p>
                    </div>
                    {canManage && (
                        <Button onClick={openCreatePlanningModal} className="w-full sm:w-auto justify-center gap-1.5 shadow-sm">
                            <Plus className="h-4 w-4" />
                            Tambah Periode
                        </Button>
                    )}
                </div>

                {/* ── Info Box ────────────────────────────────────────────────────── */}
                <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-xs text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200 flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <p className="font-semibold text-sm">Informasi Rentang Evaluasi Realisasi (RPJMD / IKU / Renstra OPD)</p>
                        <p className="leading-relaxed">
                            Modul Realisasi Kinerja (RPJMD, IKU Pemda, dan OPD) menghitung rentang tahun evaluasi multi-tahun secara dinamis berdasarkan <b>Periode Perencanaan tipe RPJMD</b> yang berstatus <b>Aktif</b>. Klik tombol <b>+ Tambah Sub</b> pada baris tabel untuk menambahkan sub periode pengukuran kinerja (Triwulan / Semester).
                        </p>
                    </div>
                </div>

                {/* ── Search & Filter Card ────────────────────────────────────────── */}
                <Card className="border-slate-200/80 shadow-xs dark:border-slate-800">
                    <CardContent className="p-4 sm:p-5">
                        <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                <Filter className="h-4 w-4 text-primary" />
                                <span>Filter Periode</span>
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
                            <div className="relative sm:col-span-2 lg:col-span-6">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                <TextInput
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Cari kode, nama, atau tahun periode..."
                                    className="pl-9 w-full"
                                />
                            </div>
                            <div className="lg:col-span-3">
                                <SelectNative
                                    value={typeFilter}
                                    onChange={(e) => setTypeFilter(e.target.value)}
                                    className="w-full"
                                >
                                    <option value="">Semua Tipe Periode</option>
                                    <option value="annual">Tahunan</option>
                                    <option value="rpjmd">RPJMD / Jangka Menengah</option>
                                </SelectNative>
                            </div>
                            <div className="lg:col-span-3">
                                <SelectNative
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full"
                                >
                                    <option value="">Semua Status</option>
                                    <option value="active">Aktif</option>
                                    <option value="closed">Tutup</option>
                                    <option value="draft">Draft</option>
                                </SelectNative>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* ── Main Table Card ─────────────────────────────────────────────── */}
                <Card className="border-slate-200/80 shadow-xs dark:border-slate-800">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/50 dark:bg-slate-900/40">
                                        <TableHead className="w-10 text-center"></TableHead>
                                        <TableHead className="w-12 text-center font-semibold">No</TableHead>
                                        <TableHead className="w-36 font-semibold">Kode</TableHead>
                                        <TableHead className="min-w-[240px] font-semibold">Nama Periode Perencanaan</TableHead>
                                        <TableHead className="w-24 text-center font-semibold">Tahun</TableHead>
                                        <TableHead className="w-32 font-semibold">Tipe</TableHead>
                                        <TableHead className="min-w-[190px] font-semibold">Rentang Waktu</TableHead>
                                        <TableHead className="w-32 text-center font-semibold">Sub Periode</TableHead>
                                        <TableHead className="w-24 text-center font-semibold">Status</TableHead>
                                        <TableHead className="w-14 sm:w-16 text-right font-semibold">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredPeriods.length === 0 && (
                                        <TableEmptyRow
                                            colSpan={10}
                                            title="Tidak Ada Periode Perencanaan"
                                            description="Tidak ditemukan periode perencanaan yang sesuai dengan pencarian atau filter yang dipilih."
                                        />
                                    )}

                                    {paginatedPeriods.map((period, index) => {
                                        const isExpanded = Boolean(expandedPeriods[period.id]);
                                        const subCount = period.measurement_periods?.length ?? 0;

                                        return (
                                            <Fragment key={period.id}>
                                                {/* Parent Row */}
                                                <TableRow
                                                    className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                                                        isExpanded ? 'bg-slate-50/60 dark:bg-slate-900/30' : ''
                                                    }`}
                                                >
                                                    {/* Expand Toggle Button */}
                                                    <TableCell className="p-2 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleExpand(period.id)}
                                                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 transition-colors"
                                                            title={isExpanded ? 'Sembunyikan sub periode' : 'Lihat sub periode'}
                                                        >
                                                            {isExpanded ? (
                                                                <ChevronDown className="h-4 w-4" />
                                                            ) : (
                                                                <ChevronRight className="h-4 w-4" />
                                                            )}
                                                        </button>
                                                    </TableCell>

                                                    {/* Index */}
                                                    <TableCell className="text-center text-xs text-gray-500 tabular-nums">
                                                        {from + index}
                                                    </TableCell>

                                                    {/* Code */}
                                                    <TableCell className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                                                        {period.code}
                                                    </TableCell>

                                                    {/* Name */}
                                                    <TableCell>
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                                                    {period.name}
                                                                </span>
                                                                {period.type === 'rpjmd' && (
                                                                    <Badge variant="outline" className="border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-950/40 text-[10px] py-0 px-1.5">
                                                                        Basis Evaluasi RPJMD
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </TableCell>

                                                    {/* Year */}
                                                    <TableCell className="text-center font-medium tabular-nums">
                                                        {period.year}
                                                    </TableCell>

                                                    {/* Type */}
                                                    <TableCell className="text-xs text-slate-600 dark:text-slate-300">
                                                        {periodTypeLabels[period.type] || period.type}
                                                    </TableCell>

                                                    {/* Date Range */}
                                                    <TableCell className="text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                                        {formatDate(period.start_date)} <span className="text-slate-400">s.d.</span> {formatDate(period.end_date)}
                                                    </TableCell>

                                                    {/* Sub Period Badge (Clickable to Expand) */}
                                                    <TableCell className="text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleExpand(period.id)}
                                                            className="group inline-flex items-center gap-1.5 focus:outline-hidden"
                                                            title="Klik untuk melihat / menyembunyikan sub periode"
                                                        >
                                                            <Badge
                                                                variant={subCount > 0 ? 'info' : 'outline'}
                                                                className="cursor-pointer transition-transform group-hover:scale-105 text-xs"
                                                            >
                                                                <Layers className="mr-1 h-3 w-3" />
                                                                {subCount} Sub
                                                            </Badge>
                                                        </button>
                                                    </TableCell>

                                                    {/* Status Badge */}
                                                    <TableCell className="text-center">
                                                        {statusLabels[period.status] && (
                                                            <Badge variant={statusLabels[period.status].variant}>
                                                                {statusLabels[period.status].text}
                                                            </Badge>
                                                        )}
                                                    </TableCell>

                                                    {/* Action Buttons */}
                                                    <TableCell className="text-right">
                                                        {!canManage && !canManageMeasurement ? (
                                                            <span className="text-gray-300 dark:text-gray-600 text-xs select-none">
                                                                —
                                                            </span>
                                                        ) : (
                                                            <div className="flex items-center justify-end">
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                                                                        >
                                                                            <span className="sr-only">Buka menu aksi periode</span>
                                                                            <MoreVertical className="h-4 w-4" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end" className="w-52">
                                                                        {canManageMeasurement && (
                                                                            <DropdownMenuItem
                                                                                onClick={() => openCreateSubModal(period)}
                                                                                className="cursor-pointer"
                                                                            >
                                                                                <Plus className="mr-2 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                                                                <span>Tambah Sub Periode</span>
                                                                            </DropdownMenuItem>
                                                                        )}
                                                                        {canManage && (
                                                                            <DropdownMenuItem
                                                                                onClick={() => openEditPlanning(period)}
                                                                                className="cursor-pointer"
                                                                            >
                                                                                <Pencil className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                                                                                <span>Edit Periode</span>
                                                                            </DropdownMenuItem>
                                                                        )}
                                                                        {canManage && period.status === 'draft' && (
                                                                            <DropdownMenuItem
                                                                                onClick={() => updatePlanningStatus(period, 'active')}
                                                                                className="cursor-pointer text-emerald-600 focus:text-emerald-600 dark:text-emerald-400"
                                                                            >
                                                                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                                                                <span>Aktifkan Periode</span>
                                                                            </DropdownMenuItem>
                                                                        )}
                                                                        {canManage && period.status === 'active' && (
                                                                            <DropdownMenuItem
                                                                                onClick={() => updatePlanningStatus(period, 'closed')}
                                                                                className="cursor-pointer text-amber-600 focus:text-amber-600 dark:text-amber-400"
                                                                            >
                                                                                <Lock className="mr-2 h-4 w-4" />
                                                                                <span>Tutup Periode</span>
                                                                            </DropdownMenuItem>
                                                                        )}
                                                                        {canManage && period.status === 'closed' && (
                                                                            <DropdownMenuItem
                                                                                onClick={() => updatePlanningStatus(period, 'active')}
                                                                                className="cursor-pointer text-blue-600 focus:text-blue-600 dark:text-blue-400"
                                                                            >
                                                                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                                                                <span>Buka Kembali</span>
                                                                            </DropdownMenuItem>
                                                                        )}
                                                                        {canManage && (
                                                                            <>
                                                                                <DropdownMenuSeparator />
                                                                                <DropdownMenuItem
                                                                                    onClick={() => setDeletePlanningTarget({ id: period.id, name: period.name })}
                                                                                    className="cursor-pointer text-destructive focus:text-destructive"
                                                                                >
                                                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                                                    <span>Hapus Periode</span>
                                                                                </DropdownMenuItem>
                                                                            </>
                                                                        )}
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                </TableRow>

                                                {/* ── Expandable Nested Sub-Table Row ──────────────────────────── */}
                                                {isExpanded && (
                                                    <TableRow className="bg-slate-50/80 dark:bg-slate-900/50 hover:bg-slate-50/90">
                                                        <TableCell colSpan={10} className="p-0 border-y border-dashed border-slate-300 dark:border-slate-700">
                                                            <div className="px-6 py-4 space-y-3">
                                                                {/* Sub Section Header Bar */}
                                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
                                                                    <div className="flex items-center gap-2">
                                                                        <Layers className="h-4 w-4 text-primary shrink-0" />
                                                                        <div>
                                                                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                                                                                Sub Periode Pengukuran:
                                                                            </span>{' '}
                                                                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                                                                {period.code} — {period.name}
                                                                            </span>
                                                                            <span className="text-xs text-muted-foreground ml-2">
                                                                                ({subCount} sub terdaftar)
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        {/* Generate 4 Triwulan Button */}
                                                                        {canManageMeasurement && period.type === 'annual' && (
                                                                            <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                disabled={generatingQuartersId === period.id}
                                                                                onClick={() => generateQuarters(period.id, period.year)}
                                                                                className="w-full sm:w-auto h-7 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 shadow-2xs"
                                                                                title={`Generate otomatis 4 triwulan (TW1 s.d TW4) untuk tahun ${period.year}`}
                                                                            >
                                                                                {generatingQuartersId === period.id ? (
                                                                                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                                                                                ) : (
                                                                                    <Sparkles className="mr-1 h-3.5 w-3.5 text-amber-500" />
                                                                                )}
                                                                                Generate 4 Triwulan (TW1–TW4)
                                                                            </Button>
                                                                        )}

                                                                        {/* Quick Preset Buttons */}
                                                                        {canManageMeasurement && (
                                                                            <div className="hidden lg:flex items-center gap-1 text-xs">
                                                                                <span className="text-slate-400 mr-1 text-[11px]">Preset:</span>
                                                                                {(['TW1', 'TW2', 'TW3', 'TW4', 'SM1', 'SM2'] as const).map((pst) => (
                                                                                    <button
                                                                                        key={pst}
                                                                                        type="button"
                                                                                        onClick={() => openCreateSubModal(period, pst)}
                                                                                        className="rounded bg-white px-1.5 py-0.5 text-[11px] font-medium text-gray-700 shadow-2xs border border-gray-300 hover:bg-gray-100 hover:border-blue-400 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 transition-colors"
                                                                                    >
                                                                                        +{pst}
                                                                                    </button>
                                                                                ))}
                                                                            </div>
                                                                        )}

                                                                        {/* Tombol Tambah Sub Periode */}
                                                                        {canManageMeasurement && (
                                                                            <Button
                                                                                size="sm"
                                                                                onClick={() => openCreateSubModal(period)}
                                                                                className="w-full sm:w-auto h-7 text-xs font-semibold gap-1 shadow-2xs"
                                                                            >
                                                                                <Plus className="h-3.5 w-3.5" />
                                                                                Tambah Sub Periode
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Sub Table Container */}
                                                                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
                                                                    <Table>
                                                                        <TableHeader>
                                                                            <TableRow className="bg-slate-100/70 dark:bg-slate-800/60 text-[11px]">
                                                                                <TableHead className="w-10 text-center font-bold">No</TableHead>
                                                                                <TableHead className="w-32 font-bold">Kode Sub</TableHead>
                                                                                <TableHead className="font-bold">Nama Sub Periode Pengukuran</TableHead>
                                                                                <TableHead className="w-28 font-bold">Tipe</TableHead>
                                                                                <TableHead className="w-48 font-bold">Rentang Waktu</TableHead>
                                                                                <TableHead className="w-36 font-bold">Batas Pengisian</TableHead>
                                                                                <TableHead className="w-24 text-center font-bold">Status</TableHead>
                                                                                <TableHead className="w-14 sm:w-16 text-right font-bold">Aksi</TableHead>
                                                                            </TableRow>
                                                                        </TableHeader>
                                                                        <TableBody>
                                                                            {period.measurement_periods?.length === 0 && (
                                                                                <TableRow>
                                                                                    <TableCell colSpan={8} className="py-6 text-center text-xs text-muted-foreground italic">
                                                                                        <div className="flex flex-col items-center justify-center gap-1.5">
                                                                                            <span>Belum ada sub periode pengukuran untuk periode ini.</span>
                                                                                            {canManageMeasurement && (
                                                                                                <div className="flex items-center gap-2 mt-1">
                                                                                                    <Button
                                                                                                        variant="outline"
                                                                                                        size="sm"
                                                                                                        onClick={() => openCreateSubModal(period)}
                                                                                                        className="h-6 text-[11px] gap-1"
                                                                                                    >
                                                                                                        <Plus className="h-3 w-3" />
                                                                                                        Tambah Sub Manual
                                                                                                    </Button>
                                                                                                    {period.type === 'annual' && (
                                                                                                        <Button
                                                                                                            variant="secondary"
                                                                                                            size="sm"
                                                                                                            onClick={() => generateQuarters(period.id, period.year)}
                                                                                                            className="h-6 text-[11px] gap-1"
                                                                                                        >
                                                                                                            <Sparkles className="h-3 w-3 text-amber-500" />
                                                                                                            Generate Otomatis 4 Triwulan
                                                                                                        </Button>
                                                                                                    )}
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    </TableCell>
                                                                                </TableRow>
                                                                            )}

                                                                            {period.measurement_periods?.map((mp, subIdx) => (
                                                                                <TableRow key={mp.id} className="text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                                                                    <TableCell className="text-center text-slate-500 tabular-nums">
                                                                                        {subIdx + 1}
                                                                                    </TableCell>
                                                                                    <TableCell className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                                                                                        {mp.code || `MP-${mp.id}`}
                                                                                    </TableCell>
                                                                                    <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                                                                                        {mp.name}
                                                                                    </TableCell>
                                                                                    <TableCell className="text-slate-600 dark:text-slate-400">
                                                                                        {periodTypeLabels[mp.type] || mp.type}
                                                                                    </TableCell>
                                                                                    <TableCell className="text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                                                                        {formatDate(mp.start_date)} s.d. {formatDate(mp.end_date)}
                                                                                    </TableCell>
                                                                                    <TableCell className="text-slate-500 whitespace-nowrap">
                                                                                        {mp.submission_deadline ? formatDate(mp.submission_deadline) : '—'}
                                                                                    </TableCell>
                                                                                    <TableCell className="text-center">
                                                                                        {statusLabels[mp.status] && (
                                                                                            <Badge variant={statusLabels[mp.status].variant} className="text-[10px] py-0 px-1.5">
                                                                                                {statusLabels[mp.status].text}
                                                                                            </Badge>
                                                                                        )}
                                                                                    </TableCell>
                                                                                    <TableCell className="text-right">
                                                                                        {!canManageMeasurement ? (
                                                                                            <span className="text-gray-300 dark:text-gray-600 text-xs select-none">
                                                                                                —
                                                                                            </span>
                                                                                        ) : (
                                                                                            <div className="flex items-center justify-end">
                                                                                                <DropdownMenu>
                                                                                                    <DropdownMenuTrigger asChild>
                                                                                                        <Button
                                                                                                            variant="ghost"
                                                                                                            size="icon"
                                                                                                            className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                                                                                                        >
                                                                                                            <span className="sr-only">Buka menu aksi sub periode</span>
                                                                                                            <MoreVertical className="h-3.5 w-3.5" />
                                                                                                        </Button>
                                                                                                    </DropdownMenuTrigger>
                                                                                                    <DropdownMenuContent align="end" className="w-48">
                                                                                                        <DropdownMenuItem
                                                                                                            onClick={() => toggleMeasurementStatus(mp)}
                                                                                                            className={`cursor-pointer ${
                                                                                                                mp.status === 'open'
                                                                                                                    ? 'text-amber-600 focus:text-amber-600 dark:text-amber-400'
                                                                                                                    : 'text-emerald-600 focus:text-emerald-600 dark:text-emerald-400'
                                                                                                            }`}
                                                                                                        >
                                                                                                            {mp.status === 'open' ? (
                                                                                                                <>
                                                                                                                    <Lock className="mr-2 h-4 w-4" />
                                                                                                                    <span>Tutup Sub Periode</span>
                                                                                                                </>
                                                                                                            ) : (
                                                                                                                <>
                                                                                                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                                                                                                    <span>Buka Sub Periode</span>
                                                                                                                </>
                                                                                                            )}
                                                                                                        </DropdownMenuItem>
                                                                                                        <DropdownMenuItem
                                                                                                            onClick={() => openEditSubModal(mp)}
                                                                                                            className="cursor-pointer"
                                                                                                        >
                                                                                                            <Pencil className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                                                                                                            <span>Edit Sub Periode</span>
                                                                                                        </DropdownMenuItem>
                                                                                                        <DropdownMenuSeparator />
                                                                                                        <DropdownMenuItem
                                                                                                            onClick={() => setDeleteMeasurementTarget(mp)}
                                                                                                            className="cursor-pointer text-destructive focus:text-destructive"
                                                                                                        >
                                                                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                                                                            <span>Hapus Sub Periode</span>
                                                                                                        </DropdownMenuItem>
                                                                                                    </DropdownMenuContent>
                                                                                                </DropdownMenu>
                                                                                            </div>
                                                                                        )}
                                                                                    </TableCell>
                                                                                </TableRow>
                                                                            ))}
                                                                        </TableBody>
                                                                    </Table>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </Fragment>
                                        );
                                    })}
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
                            itemLabel="periode"
                            onPerPageChange={(val) => {
                                setPerPage(val);
                                setCurrentPage(1);
                            }}
                            onClientPageChange={(p) => setCurrentPage(p)}
                        />
                    </CardContent>
                </Card>
            </div>

            {/* ── Dialog Modal: Tambah Periode Perencanaan ───────────────────────── */}
            <Dialog open={isCreatePlanningOpen} onOpenChange={(open) => !open && setIsCreatePlanningOpen(false)}>
                <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-primary" />
                            Tambah Periode Perencanaan
                        </DialogTitle>
                        <DialogDescription>
                            Pilih template cepat atau atur tanggal mulai dan selesai untuk periode perencanaan baru.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Template Cepat */}
                    <div className="flex flex-wrap items-center gap-1.5 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                        <span className="text-gray-500 flex items-center gap-1 font-medium">
                            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                            Template Cepat:
                        </span>
                        <button
                            type="button"
                            onClick={() => applyYearPreset(currentYear)}
                            className="rounded bg-white px-2.5 py-1 font-semibold text-gray-700 shadow-2xs border border-gray-300 hover:bg-gray-100 hover:border-blue-400 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 transition-colors"
                        >
                            +{currentYear}
                        </button>
                        <button
                            type="button"
                            onClick={() => applyYearPreset(currentYear + 1)}
                            className="rounded bg-white px-2.5 py-1 font-semibold text-gray-700 shadow-2xs border border-gray-300 hover:bg-gray-100 hover:border-blue-400 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 transition-colors"
                        >
                            +{currentYear + 1}
                        </button>
                        <button
                            type="button"
                            onClick={() => applyYearPreset(2025, true)}
                            className="rounded bg-blue-50 px-2.5 py-1 font-semibold text-blue-700 shadow-2xs border border-blue-200 hover:bg-blue-100 dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-300 transition-colors"
                        >
                            +RPJMD 2025–2029
                        </button>
                    </div>

                    <form onSubmit={createPlanningSubmit} className="space-y-3 pt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <InputLabel htmlFor="create-code" value="Kode Periode *" />
                                <TextInput
                                    id="create-code"
                                    placeholder="cth: PP-2026 atau RPJMD-2025-2029"
                                    value={planningForm.code}
                                    onChange={(e) => setPlanningForm({ ...planningForm, code: e.target.value })}
                                    className="mt-1 block w-full text-sm"
                                />
                                <InputError message={planningErrors.code} className="mt-1 text-xs" />
                            </div>

                            <div>
                                <InputLabel htmlFor="create-year" value="Tahun Utama *" />
                                <TextInput
                                    id="create-year"
                                    type="number"
                                    placeholder="cth: 2026"
                                    value={planningForm.year}
                                    onChange={(e) => handleYearChange(e.target.value)}
                                    className="mt-1 block w-full text-sm"
                                />
                                <InputError message={planningErrors.year} className="mt-1 text-xs" />
                            </div>
                        </div>

                        <div>
                            <InputLabel htmlFor="create-name" value="Nama Periode *" />
                            <TextInput
                                id="create-name"
                                placeholder="cth: Tahun Anggaran 2026 atau Periode RPJMD 2025-2029"
                                value={planningForm.name}
                                onChange={(e) => setPlanningForm({ ...planningForm, name: e.target.value })}
                                className="mt-1 block w-full text-sm"
                            />
                            <InputError message={planningErrors.name} className="mt-1 text-xs" />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <InputLabel htmlFor="create-type" value="Tipe Periode *" />
                                <SelectNative
                                    id="create-type"
                                    value={planningForm.type}
                                    onChange={(e) => handleTypeChange(e.target.value)}
                                    className="mt-1 block w-full text-sm"
                                >
                                    <option value="annual">Tahunan</option>
                                    <option value="rpjmd">RPJMD / Jangka Menengah (5 Tahunan)</option>
                                </SelectNative>
                                <InputError message={planningErrors.type} className="mt-1 text-xs" />
                            </div>

                            <div>
                                <InputLabel htmlFor="create-status" value="Status *" />
                                <SelectNative
                                    id="create-status"
                                    value={planningForm.status}
                                    onChange={(e) => setPlanningForm({ ...planningForm, status: e.target.value })}
                                    className="mt-1 block w-full text-sm"
                                >
                                    <option value="active">Aktif</option>
                                    <option value="draft">Draft</option>
                                    <option value="closed">Tutup</option>
                                </SelectNative>
                                <InputError message={planningErrors.status} className="mt-1 text-xs" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <InputLabel htmlFor="create-start" value="Tanggal Mulai *" />
                                <TextInput
                                    id="create-start"
                                    type="date"
                                    value={planningForm.start_date}
                                    onChange={(e) => handleStartDateChange(e.target.value)}
                                    className="mt-1 block w-full text-sm"
                                />
                                <InputError message={planningErrors.start_date} className="mt-1 text-xs" />
                            </div>

                            <div>
                                <InputLabel htmlFor="create-end" value="Tanggal Selesai *" />
                                <TextInput
                                    id="create-end"
                                    type="date"
                                    value={planningForm.end_date}
                                    onChange={(e) => setPlanningForm({ ...planningForm, end_date: e.target.value })}
                                    className="mt-1 block w-full text-sm"
                                />
                                <InputError message={planningErrors.end_date} className="mt-1 text-xs" />
                            </div>
                        </div>

                        <DialogFooter className="pt-3 flex-col-reverse sm:flex-row gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsCreatePlanningOpen(false)}
                            >
                                Batal
                            </Button>
                            <PrimaryButton type="submit" disabled={submittingPlanning}>
                                {submittingPlanning ? 'Menyimpan...' : 'Simpan Periode'}
                            </PrimaryButton>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ── Dialog Modal: Edit Periode Perencanaan ─────────────────────────── */}
            <Dialog open={editingPlanningPeriod !== null} onOpenChange={(open) => !open && setEditingPlanningPeriod(null)}>
                <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Pencil className="h-5 w-5 text-primary" />
                            Edit Periode Perencanaan
                        </DialogTitle>
                        <DialogDescription>
                            Perbarui data periode perencanaan dan rentang tahun berlakunya. Modul Realisasi RPJMD, IKU, dan Renstra OPD akan mengikuti rentang ini jika bertipe RPJMD dan Aktif.
                        </DialogDescription>
                    </DialogHeader>
                    {editingPlanningPeriod && (
                        <form onSubmit={updatePlanningPeriodSubmit} className="space-y-3 py-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <InputLabel htmlFor="edit-code" value="Kode *" />
                                    <TextInput
                                        id="edit-code"
                                        value={editingPlanningPeriod.code}
                                        onChange={(e) => setEditingPlanningPeriod({ ...editingPlanningPeriod, code: e.target.value })}
                                        className="mt-1 block w-full text-sm"
                                    />
                                    <InputError message={editPlanningErrors.code} className="mt-1 text-xs" />
                                </div>
                                <div>
                                    <InputLabel htmlFor="edit-year" value="Tahun Utama *" />
                                    <TextInput
                                        id="edit-year"
                                        type="number"
                                        value={editingPlanningPeriod.year}
                                        onChange={(e) => handleEditYearChange(e.target.value)}
                                        className="mt-1 block w-full text-sm"
                                    />
                                    <InputError message={editPlanningErrors.year} className="mt-1 text-xs" />
                                </div>
                            </div>

                            <div>
                                <InputLabel htmlFor="edit-name" value="Nama Periode *" />
                                <TextInput
                                    id="edit-name"
                                    value={editingPlanningPeriod.name}
                                    onChange={(e) => setEditingPlanningPeriod({ ...editingPlanningPeriod, name: e.target.value })}
                                    className="mt-1 block w-full text-sm"
                                />
                                <InputError message={editPlanningErrors.name} className="mt-1 text-xs" />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <InputLabel htmlFor="edit-type" value="Tipe *" />
                                    <SelectNative
                                        id="edit-type"
                                        value={editingPlanningPeriod.type}
                                        onChange={(e) => handleEditTypeChange(e.target.value)}
                                        className="mt-1 block w-full text-sm"
                                    >
                                        <option value="annual">Tahunan</option>
                                        <option value="rpjmd">RPJMD / Jangka Menengah (5 Tahunan)</option>
                                    </SelectNative>
                                    <InputError message={editPlanningErrors.type} className="mt-1 text-xs" />
                                </div>
                                <div>
                                    <InputLabel htmlFor="edit-status" value="Status *" />
                                    <SelectNative
                                        id="edit-status"
                                        value={editingPlanningPeriod.status}
                                        onChange={(e) => setEditingPlanningPeriod({ ...editingPlanningPeriod, status: e.target.value })}
                                        className="mt-1 block w-full text-sm"
                                    >
                                        <option value="active">Aktif</option>
                                        <option value="draft">Draft</option>
                                        <option value="closed">Tutup</option>
                                    </SelectNative>
                                    <InputError message={editPlanningErrors.status} className="mt-1 text-xs" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <InputLabel htmlFor="edit-start" value="Tanggal Mulai *" />
                                    <TextInput
                                        id="edit-start"
                                        type="date"
                                        value={editingPlanningPeriod.start_date}
                                        onChange={(e) => setEditingPlanningPeriod({ ...editingPlanningPeriod, start_date: e.target.value })}
                                        className="mt-1 block w-full text-sm"
                                    />
                                    <InputError message={editPlanningErrors.start_date} className="mt-1 text-xs" />
                                </div>
                                <div>
                                    <InputLabel htmlFor="edit-end" value="Tanggal Selesai *" />
                                    <TextInput
                                        id="edit-end"
                                        type="date"
                                        value={editingPlanningPeriod.end_date}
                                        onChange={(e) => setEditingPlanningPeriod({ ...editingPlanningPeriod, end_date: e.target.value })}
                                        className="mt-1 block w-full text-sm"
                                    />
                                    <InputError message={editPlanningErrors.end_date} className="mt-1 text-xs" />
                                </div>
                            </div>

                            <DialogFooter className="pt-3 flex-col-reverse sm:flex-row gap-2 sm:gap-0">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setEditingPlanningPeriod(null)}
                                >
                                    Batal
                                </Button>
                                <PrimaryButton type="submit" disabled={submittingEditPlanning}>
                                    {submittingEditPlanning ? 'Menyimpan...' : 'Simpan Perubahan'}
                                </PrimaryButton>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* ── Dialog Modal: Tambah Sub Periode Pengukuran ───────────────────── */}
            <Dialog open={targetPlanningForSub !== null} onOpenChange={(open) => !open && setTargetPlanningForSub(null)}>
                <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="h-5 w-5 text-emerald-600" />
                            Tambah Sub Periode Pengukuran
                        </DialogTitle>
                        <DialogDescription>
                            Menambahkan sub periode pengukuran untuk{' '}
                            <strong>
                                {targetPlanningForSub?.code} — {targetPlanningForSub?.name}
                            </strong>
                            .
                        </DialogDescription>
                    </DialogHeader>

                    {/* Quick Preset Buttons for Sub Period */}
                    {targetPlanningForSub && (
                        <div className="flex flex-wrap items-center gap-1.5 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                            <span className="text-gray-500 font-medium mr-1 flex items-center gap-1">
                                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                                Template Cepat:
                            </span>
                            {(['TW1', 'TW2', 'TW3', 'TW4', 'SM1', 'SM2'] as const).map((pst) => (
                                <button
                                    key={pst}
                                    type="button"
                                    onClick={() => applyPresetToSubForm(targetPlanningForSub.year, pst)}
                                    className="rounded bg-white px-2 py-0.5 text-xs font-semibold text-gray-700 shadow-2xs border border-gray-300 hover:bg-emerald-50 hover:border-emerald-400 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 transition-colors"
                                >
                                    +{pst}
                                </button>
                            ))}
                        </div>
                    )}

                    <form onSubmit={createSubSubmit} className="space-y-3 pt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <InputLabel htmlFor="sub-code" value="Kode Sub *" />
                                <TextInput
                                    id="sub-code"
                                    placeholder="cth: TW1-2026"
                                    value={subForm.code}
                                    onChange={(e) => setSubForm({ ...subForm, code: e.target.value })}
                                    className="mt-1 block w-full text-sm"
                                />
                                <InputError message={subErrors.code} className="mt-1 text-xs" />
                            </div>

                            <div className="sm:col-span-2">
                                <InputLabel htmlFor="sub-name" value="Nama Sub Periode *" />
                                <TextInput
                                    id="sub-name"
                                    placeholder="cth: Triwulan I 2026"
                                    value={subForm.name}
                                    onChange={(e) => setSubForm({ ...subForm, name: e.target.value })}
                                    className="mt-1 block w-full text-sm"
                                />
                                <InputError message={subErrors.name} className="mt-1 text-xs" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <InputLabel htmlFor="sub-type" value="Tipe Sub *" />
                                <SelectNative
                                    id="sub-type"
                                    value={subForm.type}
                                    onChange={(e) => setSubForm({ ...subForm, type: e.target.value })}
                                    className="mt-1 block w-full text-sm"
                                >
                                    <option value="quarterly">Triwulan</option>
                                    <option value="semester">Semesteran</option>
                                    <option value="monthly">Bulanan</option>
                                    <option value="annual">Tahunan</option>
                                </SelectNative>
                                <InputError message={subErrors.type} className="mt-1 text-xs" />
                            </div>

                            <div>
                                <InputLabel htmlFor="sub-status" value="Status *" />
                                <SelectNative
                                    id="sub-status"
                                    value={subForm.status}
                                    onChange={(e) => setSubForm({ ...subForm, status: e.target.value })}
                                    className="mt-1 block w-full text-sm"
                                >
                                    <option value="open">Terbuka</option>
                                    <option value="closed">Tutup</option>
                                </SelectNative>
                                <InputError message={subErrors.status} className="mt-1 text-xs" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <InputLabel htmlFor="sub-start" value="Tanggal Mulai *" />
                                <TextInput
                                    id="sub-start"
                                    type="date"
                                    value={subForm.start_date}
                                    onChange={(e) => setSubForm({ ...subForm, start_date: e.target.value })}
                                    className="mt-1 block w-full text-sm"
                                />
                                <InputError message={subErrors.start_date} className="mt-1 text-xs" />
                            </div>

                            <div>
                                <InputLabel htmlFor="sub-end" value="Tanggal Selesai *" />
                                <TextInput
                                    id="sub-end"
                                    type="date"
                                    value={subForm.end_date}
                                    onChange={(e) => setSubForm({ ...subForm, end_date: e.target.value })}
                                    className="mt-1 block w-full text-sm"
                                />
                                <InputError message={subErrors.end_date} className="mt-1 text-xs" />
                            </div>
                        </div>

                        <div>
                            <InputLabel htmlFor="sub-deadline" value="Batas Akhir Pengisian (Deadline Opsional)" />
                            <TextInput
                                id="sub-deadline"
                                type="date"
                                value={subForm.submission_deadline}
                                onChange={(e) => setSubForm({ ...subForm, submission_deadline: e.target.value })}
                                className="mt-1 block w-full text-sm"
                            />
                            <InputError message={subErrors.submission_deadline} className="mt-1 text-xs" />
                        </div>

                        <DialogFooter className="pt-3 flex-col-reverse sm:flex-row gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setTargetPlanningForSub(null)}
                            >
                                Batal
                            </Button>
                            <PrimaryButton type="submit" disabled={submittingSub}>
                                {submittingSub ? 'Menyimpan...' : 'Simpan Sub Periode'}
                            </PrimaryButton>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ── Dialog Modal: Edit Sub Periode Pengukuran ─────────────────────── */}
            <Dialog open={editingMeasurementPeriod !== null} onOpenChange={(open) => !open && setEditingMeasurementPeriod(null)}>
                <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Pencil className="h-5 w-5 text-primary" />
                            Edit Sub Periode Pengukuran
                        </DialogTitle>
                        <DialogDescription>
                            Perbarui rincian sub periode pengukuran.
                        </DialogDescription>
                    </DialogHeader>

                    {editingMeasurementPeriod && (
                        <form onSubmit={updateSubSubmit} className="space-y-3 pt-2">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <InputLabel htmlFor="edit-sub-code" value="Kode Sub *" />
                                    <TextInput
                                        id="edit-sub-code"
                                        value={editingMeasurementPeriod.code}
                                        onChange={(e) => setEditingMeasurementPeriod({ ...editingMeasurementPeriod, code: e.target.value })}
                                        className="mt-1 block w-full text-sm"
                                    />
                                    <InputError message={editSubErrors.code} className="mt-1 text-xs" />
                                </div>

                                <div className="sm:col-span-2">
                                    <InputLabel htmlFor="edit-sub-name" value="Nama Sub Periode *" />
                                    <TextInput
                                        id="edit-sub-name"
                                        value={editingMeasurementPeriod.name}
                                        onChange={(e) => setEditingMeasurementPeriod({ ...editingMeasurementPeriod, name: e.target.value })}
                                        className="mt-1 block w-full text-sm"
                                    />
                                    <InputError message={editSubErrors.name} className="mt-1 text-xs" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <InputLabel htmlFor="edit-sub-type" value="Tipe Sub *" />
                                    <SelectNative
                                        id="edit-sub-type"
                                        value={editingMeasurementPeriod.type}
                                        onChange={(e) => setEditingMeasurementPeriod({ ...editingMeasurementPeriod, type: e.target.value })}
                                        className="mt-1 block w-full text-sm"
                                    >
                                        <option value="quarterly">Triwulan</option>
                                        <option value="semester">Semesteran</option>
                                        <option value="monthly">Bulanan</option>
                                        <option value="annual">Tahunan</option>
                                    </SelectNative>
                                    <InputError message={editSubErrors.type} className="mt-1 text-xs" />
                                </div>

                                <div>
                                    <InputLabel htmlFor="edit-sub-status" value="Status *" />
                                    <SelectNative
                                        id="edit-sub-status"
                                        value={editingMeasurementPeriod.status}
                                        onChange={(e) => setEditingMeasurementPeriod({ ...editingMeasurementPeriod, status: e.target.value })}
                                        className="mt-1 block w-full text-sm"
                                    >
                                        <option value="open">Terbuka</option>
                                        <option value="closed">Tutup</option>
                                    </SelectNative>
                                    <InputError message={editSubErrors.status} className="mt-1 text-xs" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <InputLabel htmlFor="edit-sub-start" value="Tanggal Mulai *" />
                                    <TextInput
                                        id="edit-sub-start"
                                        type="date"
                                        value={editingMeasurementPeriod.start_date}
                                        onChange={(e) => setEditingMeasurementPeriod({ ...editingMeasurementPeriod, start_date: e.target.value })}
                                        className="mt-1 block w-full text-sm"
                                    />
                                    <InputError message={editSubErrors.start_date} className="mt-1 text-xs" />
                                </div>

                                <div>
                                    <InputLabel htmlFor="edit-sub-end" value="Tanggal Selesai *" />
                                    <TextInput
                                        id="edit-sub-end"
                                        type="date"
                                        value={editingMeasurementPeriod.end_date}
                                        onChange={(e) => setEditingMeasurementPeriod({ ...editingMeasurementPeriod, end_date: e.target.value })}
                                        className="mt-1 block w-full text-sm"
                                    />
                                    <InputError message={editSubErrors.end_date} className="mt-1 text-xs" />
                                </div>
                            </div>

                            <div>
                                <InputLabel htmlFor="edit-sub-deadline" value="Batas Akhir Pengisian (Deadline Opsional)" />
                                <TextInput
                                    id="edit-sub-deadline"
                                    type="date"
                                    value={editingMeasurementPeriod.submission_deadline || ''}
                                    onChange={(e) => setEditingMeasurementPeriod({ ...editingMeasurementPeriod, submission_deadline: e.target.value })}
                                    className="mt-1 block w-full text-sm"
                                />
                                <InputError message={editSubErrors.submission_deadline} className="mt-1 text-xs" />
                            </div>

                            <DialogFooter className="pt-3 flex-col-reverse sm:flex-row gap-2 sm:gap-0">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setEditingMeasurementPeriod(null)}
                                >
                                    Batal
                                </Button>
                                <PrimaryButton type="submit" disabled={submittingEditSub}>
                                    {submittingEditSub ? 'Menyimpan...' : 'Simpan Perubahan'}
                                </PrimaryButton>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* ── Dialog Confirm Delete Planning Period ─────────────────────────── */}
            <ConfirmDialog
                open={deletePlanningTarget !== null}
                onOpenChange={(open) => !open && setDeletePlanningTarget(null)}
                title="Hapus Periode Perencanaan?"
                description={
                    <span>
                        Apakah Anda yakin ingin menghapus periode perencanaan <strong>&quot;{deletePlanningTarget?.name}&quot;</strong>? Semua sub periode pengukuran di dalamnya juga akan terhapus jika belum ada data realisasi. Tindakan ini tidak dapat dibatalkan.
                    </span>
                }
                confirmText="Hapus Periode"
                cancelText="Batal"
                onConfirm={confirmDeletePlanningPeriod}
                onCancel={() => setDeletePlanningTarget(null)}
            />

            {/* ── Dialog Confirm Delete Measurement Period ──────────────────────── */}
            <ConfirmDialog
                open={deleteMeasurementTarget !== null}
                onOpenChange={(open) => !open && setDeleteMeasurementTarget(null)}
                title="Hapus Sub Periode Pengukuran?"
                description={
                    <span>
                        Apakah Anda yakin ingin menghapus sub periode pengukuran <strong>&quot;{deleteMeasurementTarget?.name}&quot;</strong>? Tindakan ini tidak dapat dibatalkan.
                    </span>
                }
                confirmText="Hapus Sub Periode"
                cancelText="Batal"
                onConfirm={confirmDeleteMeasurementPeriod}
                onCancel={() => setDeleteMeasurementTarget(null)}
            />
        </AuthenticatedLayout>
    );
}