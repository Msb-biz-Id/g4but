import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { SelectNative } from '@/Components/ui/select-native';
import { EmptyState } from '@/Components/EmptyState';
import TablePagination from '@/Components/TablePagination';
import PageHeader from '@/Components/Dashboard/PageHeader';
import InputError from '@/Components/InputError';
import { Building2, Calendar, ChevronDown, ChevronRight, Filter, Layers, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { PageProps } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ConfirmDialog from '@/Components/ConfirmDialog';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/Components/ui/dialog';
import { Textarea } from '@/Components/ui/textarea';

interface Goal {
    id: number;
    code: string;
    name: string;
    description: string | null;
    status: string;
    objectives_count: number;
    planning_period: { id: number; code: string; name: string; year: number } | null;
    organization: { id: number; code: string; name: string } | null;
    objectives?: Array<{
        id: number;
        code: string;
        name: string;
        description: string | null;
        status: string;
    }>;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface Props extends PageProps {
    goals: {
        data: Goal[];
        links: PaginationLink[];
        from: number | null;
        to: number | null;
        total: number;
        per_page?: number;
    };
    filters: { period_id?: string; organization_id?: string; per_page?: number };
    periods: Array<{ id: number; code: string; name: string; year: number }>;
    organizations: Array<{ id: number; code: string; name: string }>;
}

export default function GoalsIndex({
    auth,
    goals,
    filters,
    periods,
    organizations,
}: Props) {
    const { flash } = usePage().props as { flash: { success?: string | null; error?: string | null } };
    const [periodId, setPeriodId] = useState(filters.period_id ?? '');
    const [organizationId, setOrganizationId] = useState(
        filters.organization_id ?? '',
    );
    const [perPage, setPerPage] = useState<number>(Number((goals as any).per_page ?? (filters as any).per_page ?? 25));
    const [expandedGoal, setExpandedGoal] = useState<number | null>(null);

    const permissions = auth.user?.permissions ?? [];
    const canManage = permissions.includes('goal:manage');

    const goalForm = useForm({
        code: '',
        name: '',
        description: '',
        planning_period_id: '',
        organization_id: '',
    });

    const objectiveForm = useForm({
        code: '',
        name: '',
        description: '',
    });

    const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
    const [deleteGoalTarget, setDeleteGoalTarget] = useState<Goal | null>(null);
    const [isDeletingGoal, setIsDeletingGoal] = useState(false);

    const editGoalForm = useForm({
        code: '',
        name: '',
        description: '',
    });

    const isMounted = useRef(false);
    useEffect(() => {
        if (!isMounted.current) { isMounted.current = true; return; }
        const timer = setTimeout(() => {
            router.get(
                route('goals.index'),
                { period_id: periodId, organization_id: organizationId, per_page: perPage },
                { preserveState: true, replace: true },
            );
        }, 300);
        return () => clearTimeout(timer);
    }, [periodId, organizationId, perPage]);

    const submitGoal: FormEventHandler = (e) => {
        e.preventDefault();

        const errors: Record<string, string> = {};
        if (!goalForm.data.planning_period_id) {
            errors.planning_period_id = 'Periode perencanaan wajib dipilih.';
        }
        if (!goalForm.data.organization_id) {
            errors.organization_id = 'Perangkat Daerah (OPD) wajib dipilih.';
        }
        if (!goalForm.data.code.trim()) {
            errors.code = 'Kode tujuan wajib diisi.';
        }
        if (!goalForm.data.name.trim()) {
            errors.name = 'Nama tujuan wajib diisi.';
        }

        if (Object.keys(errors).length > 0) {
            (Object.keys(errors) as Array<keyof typeof errors>).forEach((key) => {
                goalForm.setError(key as any, errors[key]);
            });
            toast.error('Mohon lengkapi semua data tujuan yang wajib diisi.');
            return;
        }

        goalForm.post(route('goals.store'), {
            preserveScroll: true,
            onSuccess: () => {
                goalForm.reset('code', 'name', 'description', 'planning_period_id', 'organization_id');
                goalForm.clearErrors();
                toast.success('Tujuan strategis berhasil ditambahkan.');
            },
            onError: (errs) => {
                const firstError = Object.values(errs)[0];
                if (firstError) {
                    toast.error(firstError as string);
                }
            },
        });
    };

    const submitObjective: FormEventHandler = (e) => {
        e.preventDefault();
        if (expandedGoal === null) return;

        const errors: Record<string, string> = {};
        if (!objectiveForm.data.code.trim()) {
            errors.code = 'Kode sasaran wajib diisi.';
        }
        if (!objectiveForm.data.name.trim()) {
            errors.name = 'Nama sasaran wajib diisi.';
        }

        if (Object.keys(errors).length > 0) {
            (Object.keys(errors) as Array<keyof typeof errors>).forEach((key) => {
                objectiveForm.setError(key as any, errors[key]);
            });
            toast.error('Mohon lengkapi kode dan nama sasaran.');
            return;
        }

        objectiveForm.post(route('goals.objectives.store', expandedGoal), {
            preserveScroll: true,
            onSuccess: () => {
                objectiveForm.reset('code', 'name', 'description');
                objectiveForm.clearErrors();
                toast.success('Sasaran strategis berhasil ditambahkan.');
            },
            onError: (errs) => {
                const firstError = Object.values(errs)[0];
                if (firstError) {
                    toast.error(firstError as string);
                }
            },
        });
    };

    const deleteObjective = (goalId: number, objectiveId: number, objectiveName: string) => {
        if (!confirm(`Apakah Anda yakin ingin menghapus sasaran "${objectiveName}"?`)) return;
        router.delete(route('goals.objectives.destroy', [goalId, objectiveId]), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Sasaran strategis berhasil dihapus.');
            },
            onError: (errs) => {
                const firstError = Object.values(errs)[0];
                toast.error(typeof firstError === 'string' ? firstError : 'Gagal menghapus sasaran.');
            },
        });
    };

    const toggleExpand = (goalId: number) => {
        setExpandedGoal((prev) => (prev === goalId ? null : goalId));
        objectiveForm.reset('code', 'name', 'description');
        objectiveForm.clearErrors();
    };

    const handleOpenEditGoal = (goal: Goal, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingGoal(goal);
        editGoalForm.setData({
            code: goal.code,
            name: goal.name,
            description: goal.description ?? '',
        });
        editGoalForm.clearErrors();
    };

    const handleUpdateGoal: FormEventHandler = (e) => {
        e.preventDefault();
        if (!editingGoal) return;

        const errors: Record<string, string> = {};
        if (!editGoalForm.data.code.trim()) {
            errors.code = 'Kode tujuan wajib diisi.';
        }
        if (!editGoalForm.data.name.trim()) {
            errors.name = 'Nama tujuan wajib diisi.';
        }

        if (Object.keys(errors).length > 0) {
            (Object.keys(errors) as Array<keyof typeof errors>).forEach((key) => {
                editGoalForm.setError(key as any, errors[key]);
            });
            toast.error('Mohon lengkapi kode dan nama tujuan.');
            return;
        }

        editGoalForm.put(route('goals.update', editingGoal.id), {
            preserveScroll: true,
            onSuccess: () => {
                setEditingGoal(null);
                editGoalForm.reset();
                toast.success('Tujuan strategis berhasil diperbarui.');
            },
            onError: (errs) => {
                const firstError = Object.values(errs)[0];
                if (firstError) {
                    toast.error(firstError as string);
                }
            },
        });
    };

    const handleConfirmDeleteGoal = () => {
        if (!deleteGoalTarget) return;
        setIsDeletingGoal(true);
        router.delete(route('goals.destroy', deleteGoalTarget.id), {
            preserveScroll: true,
            onSuccess: () => {
                const deletedId = deleteGoalTarget.id;
                setDeleteGoalTarget(null);
                setIsDeletingGoal(false);
                setExpandedGoal((prev) => (prev === deletedId ? null : prev));
                toast.success('Tujuan strategis berhasil dihapus.');
            },
            onError: (errs) => {
                setIsDeletingGoal(false);
                const firstError = Object.values(errs)[0];
                toast.error(typeof firstError === 'string' ? firstError : 'Gagal menghapus tujuan.');
            },
        });
    };

    const hasFilters = Boolean(periodId || organizationId);
    const resetFilters = () => {
        setPeriodId('');
        setOrganizationId('');
    };

    return (
        <AuthenticatedLayout>
            <Head title="Tujuan & Sasaran Strategis" />

            <div className="space-y-6 p-6">
                <PageHeader
                    title="Tujuan & Sasaran Strategis"
                    description="Kelola tujuan dan sasaran strategis Pemda dan Perangkat Daerah sesuai RPJMD dan Renstra."
                    breadcrumbs={[
                        { label: 'Perencanaan' },
                        { label: 'Tujuan & Sasaran' },
                    ]}
                />
                    {flash?.success && (
                        <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">
                            {flash.success}
                        </div>
                    )}
                    {flash?.error && (
                        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                            {flash.error}
                        </div>
                    )}

                    {/* Filter Card */}
                    <Card className="border-slate-200/80 shadow-xs dark:border-slate-800">
                        <CardContent className="p-4 sm:p-5">
                            <div className="flex items-center justify-between gap-2 mb-3">
                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    <Filter className="h-4 w-4 text-primary" />
                                    <span>Filter Tujuan & Sasaran</span>
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <SelectNative
                                    value={periodId}
                                    onChange={(e) => setPeriodId(e.target.value)}
                                    className="w-full"
                                >
                                    <option value="">Semua Periode</option>
                                    {periods.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} ({p.year})
                                        </option>
                                    ))}
                                </SelectNative>
                                <SelectNative
                                    value={organizationId}
                                    onChange={(e) => setOrganizationId(e.target.value)}
                                    className="w-full"
                                >
                                    <option value="">Semua OPD</option>
                                    {organizations.map((org) => (
                                        <option key={org.id} value={org.id}>
                                            {org.code} - {org.name}
                                        </option>
                                    ))}
                                </SelectNative>
                            </div>
                        </CardContent>
                    </Card>

                    {canManage && (
                        <Card className="border-slate-200/80 shadow-xs dark:border-slate-800">
                            <CardContent className="p-4 sm:p-5">
                                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                                    Tambah Tujuan Strategis
                                </div>
                                <form autoComplete="off" onSubmit={submitGoal} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-start">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                            Periode <span className="text-destructive">*</span>
                                        </label>
                                        <SelectNative
                                            value={goalForm.data.planning_period_id}
                                            onChange={(e) => {
                                                goalForm.setData('planning_period_id', e.target.value);
                                                if (goalForm.errors.planning_period_id) goalForm.clearErrors('planning_period_id');
                                            }}
                                            className={cn(
                                                'w-full',
                                                goalForm.errors.planning_period_id && 'border-destructive focus-visible:ring-destructive focus:border-destructive'
                                            )}
                                        >
                                            <option value="">Pilih Periode...</option>
                                            {periods.map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name} ({p.year})
                                                </option>
                                            ))}
                                        </SelectNative>
                                        <InputError message={goalForm.errors.planning_period_id} className="mt-1 text-xs" />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                            Perangkat Daerah (OPD) <span className="text-destructive">*</span>
                                        </label>
                                        <SelectNative
                                            value={goalForm.data.organization_id}
                                            onChange={(e) => {
                                                goalForm.setData('organization_id', e.target.value);
                                                if (goalForm.errors.organization_id) goalForm.clearErrors('organization_id');
                                            }}
                                            className={cn(
                                                'w-full',
                                                goalForm.errors.organization_id && 'border-destructive focus-visible:ring-destructive focus:border-destructive'
                                            )}
                                        >
                                            <option value="">Pilih OPD...</option>
                                            {organizations.map((org) => (
                                                <option key={org.id} value={org.id}>
                                                    {org.code} - {org.name}
                                                </option>
                                            ))}
                                        </SelectNative>
                                        <InputError message={goalForm.errors.organization_id} className="mt-1 text-xs" />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                            Kode Tujuan <span className="text-destructive">*</span>
                                        </label>
                                        <Input
                                            type="text"
                                            value={goalForm.data.code}
                                            onChange={(e) => {
                                                goalForm.setData('code', e.target.value);
                                                if (goalForm.errors.code) goalForm.clearErrors('code');
                                            }}
                                            placeholder="mis. G1"
                                            className={cn(
                                                'w-full',
                                                goalForm.errors.code && 'border-destructive focus-visible:ring-destructive focus:border-destructive'
                                            )}
                                        />
                                        <InputError message={goalForm.errors.code} className="mt-1 text-xs" />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                            Nama Tujuan <span className="text-destructive">*</span>
                                        </label>
                                        <Input
                                            type="text"
                                            value={goalForm.data.name}
                                            onChange={(e) => {
                                                goalForm.setData('name', e.target.value);
                                                if (goalForm.errors.name) goalForm.clearErrors('name');
                                            }}
                                            placeholder="Nama tujuan strategis"
                                            className={cn(
                                                'w-full',
                                                goalForm.errors.name && 'border-destructive focus-visible:ring-destructive focus:border-destructive'
                                            )}
                                        />
                                        <InputError message={goalForm.errors.name} className="mt-1 text-xs" />
                                    </div>

                                    <div className="space-y-1 flex flex-col justify-end">
                                        <label className="text-xs font-medium invisible hidden sm:block select-none">
                                            Aksi
                                        </label>
                                        <Button
                                            type="submit"
                                            disabled={goalForm.processing}
                                            className="w-full justify-center h-9"
                                        >
                                            {goalForm.processing ? (
                                                <>
                                                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                                    Menyimpan...
                                                </>
                                            ) : (
                                                '+ Tambah Tujuan'
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    )}

                    <div className="space-y-3">
                        {goals.data.map((goal) => {
                            const isExpanded = expandedGoal === goal.id;
                            return (
                                <Card
                                    key={goal.id}
                                    className={cn(
                                        'overflow-hidden transition-all duration-200 border bg-card',
                                        isExpanded
                                            ? 'border-primary/40 shadow-sm ring-1 ring-primary/20'
                                            : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs hover:shadow-xs'
                                    )}
                                >
                                    {/* Card Header */}
                                    <div
                                        className={cn(
                                            'w-full p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3.5 transition-colors',
                                            isExpanded
                                                ? 'bg-slate-50/70 dark:bg-slate-800/40'
                                                : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/20'
                                        )}
                                    >
                                        {/* Clickable Area for Accordion Toggle */}
                                        <div
                                            onClick={() => toggleExpand(goal.id)}
                                            className="flex-1 min-w-0 space-y-1.5 cursor-pointer select-none"
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    toggleExpand(goal.id);
                                                }
                                            }}
                                        >
                                            {/* Metadata chips */}
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800">
                                                    Tujuan {goal.code}
                                                </span>
                                                {goal.planning_period && (
                                                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md font-medium">
                                                        <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                                                        <span>{goal.planning_period.name} ({goal.planning_period.year})</span>
                                                    </span>
                                                )}
                                                {goal.organization && (
                                                    <span
                                                        className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md truncate max-w-[280px] font-medium"
                                                        title={`${goal.organization.code} - ${goal.organization.name}`}
                                                    >
                                                        <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                                                        <span className="truncate">{goal.organization.code} · {goal.organization.name}</span>
                                                    </span>
                                                )}
                                            </div>

                                            {/* Goal Title */}
                                            <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 leading-snug tracking-tight">
                                                {goal.name}
                                            </h3>

                                            {/* Goal Description (if present) */}
                                            {goal.description && (
                                                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                                    {goal.description}
                                                </p>
                                            )}
                                        </div>

                                        {/* Right actions: Sasaran count pill, Edit icon, Delete icon, Expand Chevron */}
                                        <div className="flex items-center justify-between md:justify-end gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                                            <Badge
                                                variant={goal.objectives_count > 0 ? 'secondary' : 'outline'}
                                                className={cn(
                                                    'gap-1.5 text-xs font-semibold px-2.5 py-1 cursor-pointer select-none',
                                                    goal.objectives_count > 0
                                                        ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                                        : 'text-muted-foreground'
                                                )}
                                                onClick={() => toggleExpand(goal.id)}
                                            >
                                                <Layers className="h-3.5 w-3.5 text-primary" />
                                                <span>{goal.objectives_count} Sasaran</span>
                                            </Badge>

                                            {canManage && (
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={(e) => handleOpenEditGoal(goal, e)}
                                                        className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                                                        title="Edit Tujuan"
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                        <span className="sr-only">Edit Tujuan</span>
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setDeleteGoalTarget(goal);
                                                        }}
                                                        className="h-8 w-8 text-slate-500 hover:text-destructive hover:bg-destructive/10 transition-colors"
                                                        title="Hapus Tujuan"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                        <span className="sr-only">Hapus Tujuan</span>
                                                    </Button>
                                                </div>
                                            )}

                                            <button
                                                type="button"
                                                onClick={() => toggleExpand(goal.id)}
                                                className={cn(
                                                    'flex items-center justify-center h-8 w-8 rounded-full border transition-all duration-200 cursor-pointer',
                                                    isExpanded
                                                        ? 'bg-primary text-primary-foreground border-primary rotate-180 shadow-xs'
                                                        : 'bg-muted/50 text-muted-foreground border-slate-200 dark:border-slate-700 hover:bg-muted'
                                                )}
                                                title={isExpanded ? 'Tutup Sasaran' : 'Buka Sasaran'}
                                            >
                                                <ChevronDown className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Accordion Expanded Content */}
                                    {isExpanded && (
                                        <div className="border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-4 sm:p-5 space-y-4">
                                            {/* Section Header */}
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <Layers className="h-4 w-4 text-primary" />
                                                    <h4 className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                                                        Sasaran Strategis
                                                    </h4>
                                                    <Badge variant="outline" className="text-[11px] px-1.5 py-0 h-5 font-bold">
                                                        {goal.objectives?.length ?? 0}
                                                    </Badge>
                                                </div>
                                                <span className="text-[11px] text-muted-foreground hidden sm:inline">
                                                    Sasaran turunan dari tujuan {goal.code}
                                                </span>
                                            </div>

                                            {/* Objectives List */}
                                            {goal.objectives && goal.objectives.length > 0 ? (
                                                <div className="grid grid-cols-1 gap-2.5">
                                                    {goal.objectives.map((obj) => (
                                                        <div
                                                            key={obj.id}
                                                            className="flex items-start justify-between gap-3 rounded-lg border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 p-3 sm:p-3.5 shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                                                        >
                                                            <div className="flex items-start gap-3 min-w-0">
                                                                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 shrink-0 mt-0.5">
                                                                    {obj.code}
                                                                </span>
                                                                <div className="min-w-0">
                                                                    <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 leading-snug">
                                                                        {obj.name}
                                                                    </p>
                                                                    {obj.description && (
                                                                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                                                            {obj.description}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {canManage && (
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        deleteObjective(goal.id, obj.id, obj.name);
                                                                    }}
                                                                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 transition-colors"
                                                                    title="Hapus Sasaran"
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="py-6 px-4 text-center rounded-lg border border-dashed border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/40">
                                                    <Layers className="h-7 w-7 mx-auto text-slate-300 dark:text-slate-600 mb-1.5" />
                                                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                                        Belum ada sasaran untuk tujuan ini
                                                    </p>
                                                    {canManage && (
                                                        <p className="text-[11px] text-muted-foreground mt-0.5">
                                                            Gunakan formulir di bawah untuk menambahkan sasaran strategis baru.
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            {/* Add Objective form inside subtle card */}
                                            {canManage && (
                                                <div className="rounded-lg border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 p-3.5 sm:p-4 shadow-2xs">
                                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3">
                                                        <Plus className="h-3.5 w-3.5 text-primary" />
                                                        <span>Tambah Sasaran Baru untuk Tujuan {goal.code}</span>
                                                    </div>
                                                    <form
                                                        autoComplete="off"
                                                        onSubmit={submitObjective}
                                                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-start"
                                                    >
                                                        <div className="space-y-1">
                                                            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                                                Kode Sasaran <span className="text-destructive">*</span>
                                                            </label>
                                                            <Input
                                                                type="text"
                                                                value={objectiveForm.data.code}
                                                                onChange={(e) => {
                                                                    objectiveForm.setData('code', e.target.value);
                                                                    if (objectiveForm.errors.code) objectiveForm.clearErrors('code');
                                                                }}
                                                                placeholder="mis. S1"
                                                                className={cn(
                                                                    'w-full h-9',
                                                                    objectiveForm.errors.code && 'border-destructive focus-visible:ring-destructive focus:border-destructive'
                                                                )}
                                                            />
                                                            <InputError message={objectiveForm.errors.code} className="mt-1 text-xs" />
                                                        </div>

                                                        <div className="space-y-1 lg:col-span-2">
                                                            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                                                Nama Sasaran <span className="text-destructive">*</span>
                                                            </label>
                                                            <Input
                                                                type="text"
                                                                value={objectiveForm.data.name}
                                                                onChange={(e) => {
                                                                    objectiveForm.setData('name', e.target.value);
                                                                    if (objectiveForm.errors.name) objectiveForm.clearErrors('name');
                                                                }}
                                                                placeholder="Nama sasaran strategis"
                                                                className={cn(
                                                                    'w-full h-9',
                                                                    objectiveForm.errors.name && 'border-destructive focus-visible:ring-destructive focus:border-destructive'
                                                                )}
                                                            />
                                                            <InputError message={objectiveForm.errors.name} className="mt-1 text-xs" />
                                                        </div>

                                                        <div className="space-y-1 flex flex-col justify-end">
                                                            <label className="text-xs font-medium invisible hidden sm:block select-none">
                                                                Aksi
                                                            </label>
                                                            <Button
                                                                type="submit"
                                                                disabled={objectiveForm.processing}
                                                                className="w-full justify-center h-9 gap-1.5"
                                                            >
                                                                {objectiveForm.processing ? (
                                                                    <>
                                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                        Menyimpan...
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Plus className="h-3.5 w-3.5" />
                                                                        Simpan Sasaran
                                                                    </>
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </form>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </Card>
                            );
                        })}
                        {goals.data.length === 0 && (
                            <Card className="p-8">
                                <EmptyState
                                    title="Belum Ada Tujuan Strategis"
                                    description="Belum ada data tujuan strategis untuk periode atau OPD yang dipilih."
                                />
                            </Card>
                        )}
                    </div>

                    {goals.data.length > 0 && (
                        <TablePagination
                            pagination={goals as any}
                            perPage={perPage}
                            onPerPageChange={(newPerPage) => {
                                setPerPage(newPerPage);
                                router.get(
                                    route('goals.index'),
                                    { period_id: periodId, organization_id: organizationId, per_page: newPerPage },
                                    { preserveState: true, replace: true }
                                );
                            }}
                            itemName="tujuan"
                            className="mt-4 rounded-lg border border-border bg-white dark:bg-card"
                        />
                    )}
            </div>

            {/* Edit Goal Modal */}
            <Dialog open={editingGoal !== null} onOpenChange={(open) => { if (!open) setEditingGoal(null); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Tujuan Strategis</DialogTitle>
                        <DialogDescription>
                            Perbarui kode, nama, atau deskripsi tujuan strategis.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpdateGoal} className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                Kode Tujuan <span className="text-destructive">*</span>
                            </label>
                            <Input
                                type="text"
                                value={editGoalForm.data.code}
                                onChange={(e) => {
                                    editGoalForm.setData('code', e.target.value);
                                    if (editGoalForm.errors.code) editGoalForm.clearErrors('code');
                                }}
                                placeholder="mis. G1"
                                className={cn(
                                    'w-full',
                                    editGoalForm.errors.code && 'border-destructive focus-visible:ring-destructive'
                                )}
                            />
                            <InputError message={editGoalForm.errors.code} className="text-xs" />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                Nama Tujuan <span className="text-destructive">*</span>
                            </label>
                            <Input
                                type="text"
                                value={editGoalForm.data.name}
                                onChange={(e) => {
                                    editGoalForm.setData('name', e.target.value);
                                    if (editGoalForm.errors.name) editGoalForm.clearErrors('name');
                                }}
                                placeholder="Nama tujuan strategis"
                                className={cn(
                                    'w-full',
                                    editGoalForm.errors.name && 'border-destructive focus-visible:ring-destructive'
                                )}
                            />
                            <InputError message={editGoalForm.errors.name} className="text-xs" />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                Deskripsi <span className="text-muted-foreground font-normal">(opsional)</span>
                            </label>
                            <Textarea
                                value={editGoalForm.data.description}
                                onChange={(e) => editGoalForm.setData('description', e.target.value)}
                                placeholder="Deskripsi atau penjelasan tujuan strategis"
                                rows={3}
                                className="w-full text-xs"
                            />
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditingGoal(null)}
                                disabled={editGoalForm.processing}
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={editGoalForm.processing}
                                className="gap-1.5"
                            >
                                {editGoalForm.processing ? (
                                    <>
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        Menyimpan...
                                    </>
                                ) : (
                                    'Simpan Perubahan'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Confirm Delete Goal Dialog */}
            <ConfirmDialog
                open={deleteGoalTarget !== null}
                onOpenChange={(open) => { if (!open) setDeleteGoalTarget(null); }}
                title="Hapus Tujuan Strategis"
                description={
                    deleteGoalTarget ? (
                        <div className="space-y-2">
                            <p>
                                Apakah Anda yakin ingin menghapus tujuan <strong>Tujuan {deleteGoalTarget.code} &mdash; {deleteGoalTarget.name}</strong>?
                            </p>
                            {deleteGoalTarget.objectives_count > 0 && (
                                <p className="text-destructive font-medium text-xs">
                                    ⚠️ Peringatan: Tujuan ini masih memiliki {deleteGoalTarget.objectives_count} sasaran turunan. Anda harus menghapus seluruh sasaran turunan terlebih dahulu sebelum dapat menghapus tujuan ini.
                                </p>
                            )}
                        </div>
                    ) : null
                }
                confirmText="Ya, Hapus"
                cancelText="Batal"
                variant="destructive"
                loading={isDeletingGoal}
                onConfirm={handleConfirmDeleteGoal}
                onCancel={() => setDeleteGoalTarget(null)}
            />
        </AuthenticatedLayout>
    );
}