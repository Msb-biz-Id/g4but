import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { TableEmptyRow } from '@/Components/EmptyState';
import TablePagination from '@/Components/TablePagination';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { SelectNative } from '@/Components/ui/select-native';
import { Input } from '@/Components/ui/input';
import { Textarea } from '@/Components/ui/textarea';
import { Label } from '@/Components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from '@/Components/ui/alert-dialog';
import { cn, formatDate } from '@/lib/utils';
import { Pencil, Trash2, TrendingUp, Plus, Filter, X } from 'lucide-react';
import PageHeader from '@/Components/Dashboard/PageHeader';
import StatusBadge from '@/Components/Dashboard/StatusBadge';

interface ActionPlan {
 id: number;
 activity: string;
 description?: string;
 status: string;
 progress: number;
 target_value?: number | null;
 start_date?: string;
 end_date?: string;
 organization_id?: number;
 performance_period_id?: number;
 indicator_id?: number;
 organization?: { short_name?: string; name: string };
 indicator?: { code: string; name: string };
}

interface Indicator {
 id: number;
 code: string;
 name: string;
}

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

interface PaginatedData<T> {
 data: T[];
 meta: {
 current_page: number;
 last_page: number;
 from: number;
 to: number;
 total: number;
 links: { url: string | null; label: string; active: boolean }[];
 };
}

interface ActionPlansProps {
 plans: PaginatedData<ActionPlan>;
 organizations: Organization[];
 periods: Period[];
 indicators: Indicator[];
 filters: { organization?: string; period?: string; status?: string; per_page?: string | number };
 statuses: Record<string, string>;
}

export default function ActionPlans({ plans, organizations, periods, indicators, filters, statuses }: ActionPlansProps) {
 const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
 const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
 const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
 const [editingPlan, setEditingPlan] = useState<ActionPlan | null>(null);
 const [planToDelete, setPlanToDelete] = useState<number | null>(null);

 const { data, setData, post, put, delete: destroy, processing, errors, reset } = useForm({
 activity: '',
 description: '',
 status: 'not_started',
 progress: 0,
 target_value: '' as number | string,
 start_date: '',
 end_date: '',
 organization_id: '',
 performance_period_id: '',
 indicator_id: '',
 });

 const progressForm = useForm({
 progress: 0,
 });

 const handleFilterChange = (key: string, value: string) => {
 router.get(route('planning.action-plans.index'), { ...filters, [key]: value }, { preserveState: true, replace: true });
 };

 const hasFilters = Boolean(filters.organization || filters.period || filters.status);
 const resetFilters = () => {
 router.get(route('planning.action-plans.index'), {}, { preserveState: true, replace: true });
 };

 const openCreateModal = () => {
 setEditingPlan(null);
 reset();
 setIsPlanModalOpen(true);
 };

 const openEditModal = (plan: ActionPlan) => {
 setEditingPlan(plan);
 setData({
 activity: plan.activity,
 description: plan.description || '',
 status: plan.status,
 progress: plan.progress,
 target_value: plan.target_value ?? '',
 start_date: plan.start_date || '',
 end_date: plan.end_date || '',
 organization_id: plan.organization_id?.toString() || '',
 performance_period_id: plan.performance_period_id?.toString() || '',
 indicator_id: plan.indicator_id?.toString() || '',
 });
 setIsPlanModalOpen(true);
 };

 const openProgressModal = (plan: ActionPlan) => {
 setEditingPlan(plan);
 progressForm.setData('progress', plan.progress);
 setIsProgressModalOpen(true);
 };

 const confirmDelete = (id: number) => {
 setPlanToDelete(id);
 setIsDeleteDialogOpen(true);
 };

 const handlePlanSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (editingPlan) {
 put(route('planning.action-plans.update', editingPlan.id), {
 onSuccess: () => setIsPlanModalOpen(false),
 });
 } else {
 post(route('planning.action-plans.store'), {
 onSuccess: () => setIsPlanModalOpen(false),
 });
 }
 };

 const handleProgressSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (editingPlan) {
 progressForm.put(route('planning.action-plans.progress', editingPlan.id), {
 onSuccess: () => setIsProgressModalOpen(false),
 });
 }
 };

 const handleDelete = () => {
 if (planToDelete) {
 router.delete(route('planning.action-plans.destroy', planToDelete), {
 onSuccess: () => setIsDeleteDialogOpen(false),
 });
 }
 };

 const getStatusBadgeVariant = (status: string) => {
 switch (status) {
 case 'on_track': return 'success';
 case 'delayed': return 'destructive';
 case 'done': return 'info';
 case 'not_started':
 default: return 'secondary';
 }
 };

 const getProgressBarColor = (progress: number) => {
 if (progress >= 100) return 'bg-emerald-500';
 if (progress >= 50) return 'bg-teal-500';
 return 'bg-sky-500';
 };

 return (
 <AuthenticatedLayout
 header="Rencana Aksi"
 >
 <Head title="Rencana Aksi" />

            <div className="py-6">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-6">
                    <PageHeader
                        title="Rencana Aksi Kinerja"
                        description="Pemantauan pelaksanaan aktivitas, jadwal kerja, dan progres capaian rencana aksi kinerja perangkat daerah Pemerintah Provinsi Papua Barat."
                        breadcrumbs={[
                            { label: 'Perencanaan' },
                            { label: 'Rencana Aksi' },
                        ]}
                        actions={(
                            <Button onClick={openCreateModal} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm w-full sm:w-auto justify-center">
                                <Plus className="mr-2 h-4 w-4" /> Tambah Rencana Aksi
                            </Button>
                        )}
                    />

                    {/* Filter Card */}
                    <Card>
                        <CardContent className="p-4 sm:p-5">
                            <div className="flex items-center justify-between gap-2 mb-3">
                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    <Filter className="h-4 w-4 text-primary" />
                                    <span>Filter Rencana Aksi</span>
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

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <SelectNative
                                    value={filters.organization || ''}
                                    onChange={(e) => handleFilterChange('organization', e.target.value)}
                                    className="w-full"
                                >
                                    <option value="">Semua Perangkat Daerah</option>
                                    {organizations.map(org => (
                                        <option key={org.id} value={org.id}>{org.short_name || org.name}</option>
                                    ))}
                                </SelectNative>
                                <SelectNative
                                    value={filters.period || ''}
                                    onChange={(e) => handleFilterChange('period', e.target.value)}
                                    className="w-full"
                                >
                                    <option value="">Semua Periode</option>
                                    {periods.map(p => (
                                        <option key={p.id} value={p.id}>{p.year}</option>
                                    ))}
                                </SelectNative>
                                <SelectNative
                                    value={filters.status || ''}
                                    onChange={(e) => handleFilterChange('status', e.target.value)}
                                    className="w-full"
                                >
                                    <option value="">Semua Status</option>
                                    {Object.entries(statuses).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </SelectNative>
                            </div>
                        </CardContent>
                    </Card>

 <Card>
 <CardContent className="p-0">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead className="w-10">No</TableHead>
 <TableHead>Aktivitas</TableHead>
 <TableHead>Indikator</TableHead>
 <TableHead>Jadwal</TableHead>
 <TableHead className="w-48">Progres</TableHead>
 <TableHead>Status</TableHead>
 <TableHead className="text-right">Aksi</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {plans.data.length > 0 ? (
 plans.data.map((plan, index) => (
 <TableRow key={plan.id}>
 <TableCell className="text-sm text-gray-500 tabular-nums">
 {((plans as any).from ?? plans.meta?.from ?? 1) + index}
 </TableCell>
 <TableCell>
 <div className="font-medium">{plan.activity || (plan as any).title || '-'}</div>
 <div className="text-sm text-muted-foreground">{plan.organization?.short_name || plan.organization?.name}</div>
 </TableCell>
 <TableCell>{plan.indicator?.name || '-'}</TableCell>
 <TableCell>
 <div className="text-sm">
 {formatDate(plan.start_date)} - {formatDate(plan.end_date)}
 </div>
 </TableCell>
 <TableCell>
 <div className="flex items-center gap-2">
 <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
 <div
 className={cn("h-full", getProgressBarColor(plan.progress))}
 style={{ width: `${Math.max(0, Math.min(100, plan.progress))}%` }}
 />
 </div>
 <span className="text-sm">{plan.progress}%</span>
 </div>
 </TableCell>
 <TableCell>
 <Badge variant={getStatusBadgeVariant(plan.status) as any}>
 {statuses[plan.status] || plan.status}
 </Badge>
 </TableCell>
 <TableCell className="text-right">
 <div className="flex justify-end gap-2">
 <Button variant="outline" size="icon" onClick={() => openProgressModal(plan)}>
 <TrendingUp className="h-4 w-4" />
 </Button>
 <Button variant="outline" size="icon" onClick={() => openEditModal(plan)}>
 <Pencil className="h-4 w-4" />
 </Button>
 <Button variant="destructive" size="icon" onClick={() => confirmDelete(plan.id)}>
 <Trash2 className="h-4 w-4" />
 </Button>
 </div>
 </TableCell>
 </TableRow>
 ))
 ) : (
 <TableEmptyRow
 colSpan={7}
 title="Belum Ada Rencana Aksi"
 description="Belum ada data rencana aksi untuk kriteria perangkat daerah atau filter yang dipilih."
 />
 )}
 </TableBody>
 </Table>
					<TablePagination
						pagination={{
							from: (plans as any).from ?? plans.meta?.from,
							to: (plans as any).to ?? plans.meta?.to,
							total: (plans as any).total ?? plans.meta?.total,
							per_page: Number((plans as any).per_page ?? (filters as any).per_page ?? 25),
							links: plans.meta?.links ?? (plans as any).links,
						}}
						perPage={Number((plans as any).per_page ?? (filters as any).per_page ?? 25)}
						onPerPageChange={(newPerPage) => {
							router.get(
								'/planning/action-plans',
								{ ...filters, per_page: newPerPage },
								{ preserveState: true, replace: true }
							);
						}}
						itemName="rencana aksi"
					/>
 </CardContent>
 </Card>
 </div>
 </div>

 <Dialog open={isPlanModalOpen} onOpenChange={setIsPlanModalOpen}>
 <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle>{editingPlan ? 'Edit Rencana Aksi' : 'Tambah Rencana Aksi'}</DialogTitle>
 </DialogHeader>
 <form autoComplete="off" noValidate onSubmit={handlePlanSubmit}>
 <div className="grid gap-4 py-4">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label htmlFor="organization_id">Perangkat Daerah</Label>
 <SelectNative id="organization_id" value={data.organization_id} onChange={e => setData('organization_id', e.target.value)}>
 <option value="">Pilih Perangkat Daerah</option>
 {organizations.map(org => (
 <option key={org.id} value={org.id}>{org.name}</option>
 ))}
 </SelectNative>
 {errors.organization_id && <p className="text-sm text-destructive">{errors.organization_id}</p>}
 </div>
 <div className="space-y-2">
 <Label htmlFor="performance_period_id">Periode</Label>
 <SelectNative id="performance_period_id" value={data.performance_period_id} onChange={e => setData('performance_period_id', e.target.value)}>
 <option value="">Pilih Periode</option>
 {periods.map(p => (
 <option key={p.id} value={p.id}>{p.year}</option>
 ))}
 </SelectNative>
 {errors.performance_period_id && <p className="text-sm text-destructive">{errors.performance_period_id}</p>}
 </div>
 </div>
 <div className="space-y-2">
 <Label htmlFor="indicator_id">Indikator</Label>
 <SelectNative id="indicator_id" value={data.indicator_id} onChange={e => setData('indicator_id', e.target.value)}>
 <option value="">Pilih Indikator</option>
 {indicators.map(ind => (
 <option key={ind.id} value={ind.id}>{ind.code} - {ind.name}</option>
 ))}
 </SelectNative>
 {errors.indicator_id && <p className="text-sm text-destructive">{errors.indicator_id}</p>}
 </div>
 <div className="space-y-2">
 <Label htmlFor="activity">Aktivitas</Label>
 <Input id="activity" placeholder="Nama rencana aksi kegiatan..." value={data.activity} onChange={e => setData('activity', e.target.value)} />
 {errors.activity && <p className="text-sm text-destructive">{errors.activity}</p>}
 </div>
 <div className="space-y-2">
 <Label htmlFor="description">Deskripsi</Label>
 <Textarea id="description" placeholder="Rincian uraian tahapan kegiatan..." value={data.description} onChange={e => setData('description', e.target.value)} rows={3} />
 {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 <div className="space-y-2">
 <Label htmlFor="target_value">Target</Label>
 <Input id="target_value" type="number" placeholder="cth: 100" value={data.target_value} onChange={e => setData('target_value', e.target.value)} />
 {errors.target_value && <p className="text-sm text-destructive">{errors.target_value}</p>}
 </div>
 <div className="space-y-2">
 <Label htmlFor="start_date">Mulai</Label>
 <Input id="start_date" type="date" placeholder="Pilih tanggal mulai" value={data.start_date} onChange={e => setData('start_date', e.target.value)} />
 {errors.start_date && <p className="text-sm text-destructive">{errors.start_date}</p>}
 </div>
 <div className="space-y-2">
 <Label htmlFor="end_date">Selesai</Label>
 <Input id="end_date" type="date" placeholder="Pilih tanggal selesai" value={data.end_date} onChange={e => setData('end_date', e.target.value)} />
 {errors.end_date && <p className="text-sm text-destructive">{errors.end_date}</p>}
 </div>
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label htmlFor="progress">Progres (%)</Label>
 <Input id="progress" type="number" min="0" max="100" placeholder="0-100" value={data.progress} onChange={e => setData('progress', parseInt(e.target.value) || 0)} />
 {errors.progress && <p className="text-sm text-destructive">{errors.progress}</p>}
 </div>
 <div className="space-y-2">
 <Label htmlFor="status">Status</Label>
 <SelectNative id="status" value={data.status} onChange={e => setData('status', e.target.value)}>
 {Object.entries(statuses).map(([key, label]) => (
 <option key={key} value={key}>{label}</option>
 ))}
 </SelectNative>
 {errors.status && <p className="text-sm text-destructive">{errors.status}</p>}
 </div>
 </div>
 </div>
 <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
 <Button type="button" variant="outline" onClick={() => setIsPlanModalOpen(false)}>Batal</Button>
 <Button type="submit" disabled={processing}>Simpan</Button>
 </DialogFooter>
 </form>
 </DialogContent>
 </Dialog>

 <Dialog open={isProgressModalOpen} onOpenChange={setIsProgressModalOpen}>
 <DialogContent className="max-h-[85vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle>Update Progres</DialogTitle>
 </DialogHeader>
 <form autoComplete="off" noValidate onSubmit={handleProgressSubmit}>
 <div className="grid gap-4 py-4">
 <div className="space-y-2">
 <Label htmlFor="progressUpdate">Progres (%)</Label>
 <Input
 id="progressUpdate"
 type="number"
 min="0"
 max="100"
 placeholder="0-100"
 value={progressForm.data.progress}
 onChange={e => progressForm.setData('progress', parseInt(e.target.value) || 0)}
 />
 {progressForm.errors.progress && <p className="text-sm text-destructive">{progressForm.errors.progress}</p>}
 </div>
 </div>
 <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
 <Button type="button" variant="outline" onClick={() => setIsProgressModalOpen(false)}>Batal</Button>
 <Button type="submit" disabled={progressForm.processing}>Simpan</Button>
 </DialogFooter>
 </form>
 </DialogContent>
 </Dialog>

 <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
 <AlertDialogContent>
 <AlertDialogHeader>
 <AlertDialogTitle>Hapus Rencana Aksi?</AlertDialogTitle>
 <AlertDialogDescription>
 Apakah Anda yakin ingin menghapus rencana aksi ini? Tindakan ini tidak dapat dibatalkan.
 </AlertDialogDescription>
 </AlertDialogHeader>
 <AlertDialogFooter>
 <AlertDialogCancel>Batal</AlertDialogCancel>
 <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
 Hapus
 </AlertDialogAction>
 </AlertDialogFooter>
 </AlertDialogContent>
 </AlertDialog>
 </AuthenticatedLayout>
 );
}
