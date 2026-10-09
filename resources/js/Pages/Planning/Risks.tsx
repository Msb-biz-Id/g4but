import React, { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import { ShieldAlert, Plus, Pencil, Trash2, Filter, X } from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { TableEmptyRow } from '@/Components/EmptyState';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { SelectNative } from '@/Components/ui/select-native';
import { Input } from '@/Components/ui/input';
import { Textarea } from '@/Components/ui/textarea';
import { Label } from '@/Components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/Components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import TablePagination from '@/Components/TablePagination';


interface Organization { id: number; code: string; name: string; short_name?: string; }
interface Period { id: number; year: number; }
interface Indicator { id: number; code: string; name: string; }

interface Risk {
 id: number;
 risk_event: string;
 cause?: string;
 impact?: string;
 likelihood: number;
 impact_level: number;
 risk_level: string;
 mitigation?: string;
 owner?: string;
 status: string;
 organization_id?: number;
 performance_period_id?: number;
 indicator_id?: number | null;
 organization?: { id: number; name: string; short_name?: string };
 indicator?: { id: number; code: string; name: string };
}

interface PaginatedData<T> {
 data: T[];
 meta: { current_page: number; last_page: number; from: number; to: number; total: number; links: { url: string | null; label: string; active: boolean }[] };
}

interface RisksProps {
 risks: PaginatedData<Risk>;
 organizations: Organization[];
 periods: Period[];
 indicators: Indicator[];
 filters: { organization?: string; period?: string; level?: string; status?: string; per_page?: number | string };
 riskLevels: Record<string, number>;
 riskLevelOptions: Record<string, string>;
 riskStatuses: Record<string, string>;
}

export default function Risks({ risks, organizations, periods, indicators, filters, riskLevels, riskLevelOptions, riskStatuses }: RisksProps) {
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
 const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

 const applyFilter = (key: string, value: string) => {
 router.get('/planning/risks', { ...filters, [key]: value }, { preserveState: true, preserveScroll: true });
 };

 const hasFilters = Boolean(filters.organization || filters.period || filters.level || filters.status);
 const resetFilters = () => {
 router.get('/planning/risks', {}, { preserveState: true, preserveScroll: true });
 };

 const confirmDelete = (id: number) => setDeleteTarget(id);

 const handleDelete = () => {
 if (deleteTarget === null) return;
 router.delete(`/planning/risks/${deleteTarget}`, {
 preserveScroll: true,
 onSuccess: () => setDeleteTarget(null),
 });
 };

 const openModal = (risk: Risk | null = null) => {
 setEditingRisk(risk);
 setIsModalOpen(true);
 };


 const getBadgeVariant = (level: string) => {
 switch (level) {
 case 'critical': return 'destructive';
 case 'high': return 'warning';
 case 'medium': return 'info';
 case 'low': return 'secondary';
 default: return 'secondary';
 }
 };

 const getStatusVariant = (status: string) => {
 switch (status) {
 case 'open': return 'info';
 case 'monitored': return 'secondary';
 default: return 'secondary';
 }
 };

 return (
 <AuthenticatedLayout header="Manajemen Risiko">
 <Head title="Manajemen Risiko" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-4">
                    {/* Header Bar */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                                Manajemen Risiko
                            </h1>
                            <p className="text-xs text-muted-foreground sm:text-sm">
                                Pemetaan, mitigasi, dan pengendalian risiko pencapaian kinerja organisasi.
                            </p>
                        </div>
                        <Button onClick={() => openModal()} className="w-full sm:w-auto justify-center">
                            <Plus className="mr-2 h-4 w-4" /> Catat Risiko
                        </Button>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card>
                            <CardContent className="p-5 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Kritis</p>
                                    <h3 className="text-2xl font-bold text-destructive">{riskLevels.critical || 0}</h3>
                                </div>
                                <ShieldAlert className="h-8 w-8 text-destructive opacity-75" />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-5 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Tinggi</p>
                                    <h3 className="text-2xl font-bold text-amber-500">{riskLevels.high || 0}</h3>
                                </div>
                                <ShieldAlert className="h-8 w-8 text-amber-500 opacity-75" />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-5 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Sedang</p>
                                    <h3 className="text-2xl font-bold text-blue-500">{riskLevels.medium || 0}</h3>
                                </div>
                                <ShieldAlert className="h-8 w-8 text-blue-500 opacity-75" />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-5 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Rendah</p>
                                    <h3 className="text-2xl font-bold text-gray-500">{riskLevels.low || 0}</h3>
                                </div>
                                <ShieldAlert className="h-8 w-8 text-gray-500 opacity-75" />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Filter Card */}
                    <Card>
                        <CardContent className="p-4 sm:p-5">
                            <div className="flex items-center justify-between gap-2 mb-3">
                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    <Filter className="h-4 w-4 text-primary" />
                                    <span>Filter Manajemen Risiko</span>
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

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                <SelectNative value={filters.organization || ''} onChange={(e) => applyFilter('organization', e.target.value)} className="w-full">
                                    <option value="">Semua Organisasi</option>
                                    {organizations.map((org) => (
                                        <option key={org.id} value={org.id}>{org.short_name || org.name}</option>
                                    ))}
                                </SelectNative>
                                <SelectNative value={filters.period || ''} onChange={(e) => applyFilter('period', e.target.value)} className="w-full">
                                    <option value="">Semua Periode</option>
                                    {periods.map((p) => (
                                        <option key={p.id} value={p.id}>{p.year}</option>
                                    ))}
                                </SelectNative>
                                <SelectNative value={filters.level || ''} onChange={(e) => applyFilter('level', e.target.value)} className="w-full">
                                    <option value="">Semua Level</option>
                                    {Object.entries(riskLevelOptions).map(([val, label]) => (
                                        <option key={val} value={val}>{label}</option>
                                    ))}
                                </SelectNative>
                                <SelectNative value={filters.status || ''} onChange={(e) => applyFilter('status', e.target.value)} className="w-full">
                                    <option value="">Semua Status</option>
                                    {Object.entries(riskStatuses).map(([val, label]) => (
                                        <option key={val} value={val}>{label}</option>
                                    ))}
                                </SelectNative>
                            </div>
                        </CardContent>
                    </Card>

 <Card>
 <div className="overflow-x-auto">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead className="w-10">No</TableHead>
 <TableHead>Risiko</TableHead>
 <TableHead>Organisasi</TableHead>
 <TableHead>Penyebab</TableHead>
 <TableHead>Skor</TableHead>
 <TableHead>Level</TableHead>
 <TableHead>Status</TableHead>
 <TableHead className="text-right">Aksi</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {risks.data.length === 0 ? (
 <TableEmptyRow
 colSpan={8}
 title="Belum Ada Data Manajemen Risiko"
 description="Tidak ada catatan risiko yang sesuai dengan OPD, level, atau status yang dipilih."
 />
 ) : (
 risks.data.map((r, index) => (
 <TableRow key={r.id}>
 <TableCell className="text-sm text-gray-500 tabular-nums">
 {((risks as any).from ?? risks.meta?.from ?? 1) + index}
 </TableCell>
 <TableCell>
 <p className="font-medium">{r.risk_event}</p>
 <p className="text-sm text-muted-foreground">{r.indicator ? `${r.indicator.code} · ${r.indicator.name}` : 'Tanpa indikator'}</p>
 </TableCell>
 <TableCell>{r.organization?.short_name}</TableCell>
 <TableCell><p className="truncate max-w-[200px]">{r.cause || '—'}</p></TableCell>
 <TableCell className="font-bold">{r.likelihood} &times; {r.impact_level} = {r.likelihood * r.impact_level}</TableCell>
 <TableCell>
 <Badge variant={getBadgeVariant(r.risk_level) as any} className="capitalize">
 <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-50" />
 {riskLevelOptions[r.risk_level] || r.risk_level}
 </Badge>
 </TableCell>
 <TableCell>
 <Badge variant={getStatusVariant(r.status) as any} className="capitalize">
 {riskStatuses[r.status] || r.status}
 </Badge>
 </TableCell>
 <TableCell className="text-right">
 <Button variant="ghost" size="icon" onClick={() => openModal(r)}>
 <Pencil className="h-4 w-4" />
 </Button>
 <Button variant="ghost" size="icon" className="text-rose-500 hover:text-rose-600 hover:bg-rose-50" onClick={() => confirmDelete(r.id)}>
 <Trash2 className="h-4 w-4" />
 </Button>
 </TableCell>
 </TableRow>
 ))
 )}
 </TableBody>
 </Table>
					</div>
					<TablePagination
						pagination={risks}
						itemLabel="risiko"
						filters={filters}
						baseUrl="/planning/risks"
					/>
				</Card>

 {isModalOpen && (
 <RiskModal
 isOpen={isModalOpen}
 onClose={() => setIsModalOpen(false)}
 risk={editingRisk}
 organizations={organizations}
 periods={periods}
 indicators={indicators}
 riskLevelOptions={riskLevelOptions}
 riskStatuses={riskStatuses}
 />
 )}
 </div>
 </div>

 <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
 <AlertDialogContent>
 <AlertDialogHeader>
 <AlertDialogTitle>Hapus Risiko?</AlertDialogTitle>
 <AlertDialogDescription>
 Tindakan ini tidak dapat dibatalkan. Data risiko ini akan dihapus permanen dari sistem.
 </AlertDialogDescription>
 </AlertDialogHeader>
 <AlertDialogFooter>
 <AlertDialogCancel>Batal</AlertDialogCancel>
 <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
 Ya, Hapus
 </AlertDialogAction>
 </AlertDialogFooter>
 </AlertDialogContent>
 </AlertDialog>
 </AuthenticatedLayout>
 );
}


function RiskModal({ isOpen, onClose, risk, organizations, periods, indicators, riskLevelOptions, riskStatuses }: {
 isOpen: boolean; onClose: () => void; risk: Risk | null;
 organizations: Organization[]; periods: Period[]; indicators: Indicator[];
 riskLevelOptions: Record<string, string>; riskStatuses: Record<string, string>;
}) {
 const { data, setData, post, put, processing, errors, reset } = useForm({
 organization_id: risk?.organization_id || '',
 performance_period_id: risk?.performance_period_id || '',
 indicator_id: risk?.indicator_id || '',
 risk_event: risk?.risk_event || '',
 cause: risk?.cause || '',
 impact: risk?.impact || '',
 likelihood: risk?.likelihood || 3,
 impact_level: risk?.impact_level || 3,
 mitigation: risk?.mitigation || '',
 owner: risk?.owner || '',
 status: risk?.status || 'open',
 });

 const score = (Number(data.likelihood) || 0) * (Number(data.impact_level) || 0);
 const level = score >= 20 ? 'critical' : score >= 12 ? 'high' : score >= 6 ? 'medium' : 'low';

 const getBadgeVariant = (l: string) => {
 switch (l) {
 case 'critical': return 'destructive';
 case 'high': return 'warning';
 case 'medium': return 'info';
 case 'low': return 'secondary';
 default: return 'secondary';
 }
 };

 const submit = (e: React.FormEvent) => {
 e.preventDefault();
 const opts = { onSuccess: () => { onClose(); reset(); } };
 if (risk) {
 put(`/planning/risks/${risk.id}`, opts);
 } else {
 post('/planning/risks', opts);
 }
 };

 return (
 <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
 <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle>{risk ? 'Edit Risiko' : 'Catat Risiko'}</DialogTitle>
 </DialogHeader>

 <form autoComplete="off" noValidate onSubmit={submit} className="space-y-4">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label>Organisasi</Label>
 <SelectNative value={data.organization_id} onChange={(e) => setData('organization_id', e.target.value)}>
 <option value="">Pilih Organisasi</option>
 {organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
 </SelectNative>
 {errors.organization_id && <p className="text-sm text-destructive">{errors.organization_id}</p>}
 </div>
 <div className="space-y-2">
 <Label>Periode</Label>
 <SelectNative value={data.performance_period_id} onChange={(e) => setData('performance_period_id', e.target.value)}>
 <option value="">Pilih Periode</option>
 {periods.map((p) => <option key={p.id} value={p.id}>{p.year}</option>)}
 </SelectNative>
 {errors.performance_period_id && <p className="text-sm text-destructive">{errors.performance_period_id}</p>}
 </div>
 </div>

 <div className="space-y-2">
 <Label>Indikator (Opsional)</Label>
 <SelectNative value={data.indicator_id || ''} onChange={(e) => setData('indicator_id', e.target.value)}>
 <option value="">Pilih Indikator</option>
 {indicators.map((ind) => <option key={ind.id} value={ind.id}>{ind.code} - {ind.name}</option>)}
 </SelectNative>
 {errors.indicator_id && <p className="text-sm text-destructive">{errors.indicator_id}</p>}
 </div>

 <div className="space-y-2">
 <Label>Peristiwa Risiko</Label>
 <Input placeholder="cth: Keterlambatan pengadaan barang/jasa" value={data.risk_event} onChange={(e) => setData('risk_event', e.target.value)} />
 {errors.risk_event && <p className="text-sm text-destructive">{errors.risk_event}</p>}
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label>Penyebab</Label>
 <Textarea rows={3} placeholder="Penyebab timbulnya risiko..." value={data.cause} onChange={(e) => setData('cause', e.target.value)} />
 {errors.cause && <p className="text-sm text-destructive">{errors.cause}</p>}
 </div>
 <div className="space-y-2">
 <Label>Dampak</Label>
 <Textarea rows={3} placeholder="Dampak negatif terhadap pencapaian target..." value={data.impact} onChange={(e) => setData('impact', e.target.value)} />
 {errors.impact && <p className="text-sm text-destructive">{errors.impact}</p>}
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label>Kemungkinan (1-5)</Label>
 <SelectNative value={data.likelihood} onChange={(e) => setData('likelihood', Number(e.target.value))}>
 {[1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{v}</option>)}
 </SelectNative>
 {errors.likelihood && <p className="text-sm text-destructive">{errors.likelihood}</p>}
 </div>
 <div className="space-y-2">
 <Label>Level Dampak (1-5)</Label>
 <SelectNative value={data.impact_level} onChange={(e) => setData('impact_level', Number(e.target.value))}>
 {[1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{v}</option>)}
 </SelectNative>
 {errors.impact_level && <p className="text-sm text-destructive">{errors.impact_level}</p>}
 </div>
 </div>

 <div className="bg-muted p-4 rounded-lg flex items-center justify-between">
 <span className="font-medium">Preview Skor: {data.likelihood} &times; {data.impact_level} = {score}</span>
 <Badge variant={getBadgeVariant(level) as any}>{riskLevelOptions[level] || level}</Badge>
 </div>

 <div className="space-y-2">
 <Label>Mitigasi</Label>
 <Textarea rows={3} placeholder="Langkah-langkah pengendalian dan mitigasi risiko..." value={data.mitigation} onChange={(e) => setData('mitigation', e.target.value)} />
 {errors.mitigation && <p className="text-sm text-destructive">{errors.mitigation}</p>}
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label>Pemilik Risiko</Label>
 <Input placeholder="cth: Kasubag Program / PPTK" value={data.owner} onChange={(e) => setData('owner', e.target.value)} />
 {errors.owner && <p className="text-sm text-destructive">{errors.owner}</p>}
 </div>
 <div className="space-y-2">
 <Label>Status</Label>
 <SelectNative value={data.status} onChange={(e) => setData('status', e.target.value)}>
 {Object.entries(riskStatuses).map(([val, label]) => (
 <option key={val} value={val}>{label}</option>
 ))}
 </SelectNative>
 {errors.status && <p className="text-sm text-destructive">{errors.status}</p>}
 </div>
 </div>

 <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
 <Button type="button" variant="outline" onClick={onClose} disabled={processing}>Batal</Button>
 <Button type="submit" disabled={processing}>Simpan</Button>
 </DialogFooter>
 </form>
 </DialogContent>
 </Dialog>
 );
}
