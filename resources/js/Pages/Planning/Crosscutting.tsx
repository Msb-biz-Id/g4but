import { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { TableEmptyRow } from '@/Components/EmptyState';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { SelectNative } from '@/Components/ui/select-native';
import { Input } from '@/Components/ui/input';
import { Textarea } from '@/Components/ui/textarea';
import { Label } from '@/Components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/Components/ui/dialog';
import { Network, Plus, Trash2 } from 'lucide-react';
import ConfirmDialog from '@/Components/ConfirmDialog';
import TablePagination from '@/Components/TablePagination';

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
 organization_id: number;
}

interface CrosscuttingRelation {
 id: number;
 relation_type: string;
 description?: string;
 performance_period_id?: number;
 indicator_id?: number;
 organization_id?: number;
 related_organization_id?: number;
 indicator?: { id: number; code: string; name: string };
 organization?: { id: number; name: string; short_name?: string };
 related_organization?: { id: number; name: string; short_name?: string };
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

interface CrosscuttingProps {
    relations: PaginatedData<CrosscuttingRelation>;
    organizations: Organization[];
    periods: Period[];
    indicators: Indicator[];
    relationTypes: Record<string, string>;
    filters: { period?: string; per_page?: number | string };
}

export default function Crosscutting({ relations, organizations, periods, indicators, relationTypes, filters }: CrosscuttingProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [deleteCrosscuttingId, setDeleteCrosscuttingId] = useState<number | null>(null);

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        router.get('/planning/crosscutting', { ...filters, period: e.target.value, page: 1 }, { preserveState: true });
    };

 const handleDelete = (id: number) => {
 setDeleteCrosscuttingId(id);
 };

 const handleConfirmDelete = () => {
 if (deleteCrosscuttingId) {
 router.delete(`/planning/crosscutting/${deleteCrosscuttingId}`, {
 preserveScroll: true,
 onSuccess: () => setDeleteCrosscuttingId(null),
 });
 }
 };

 const getBadgeVariant = (type: string) => {
 if (type === 'support') return 'success';
 if (type === 'dependency') return 'warning';
 if (type === 'coordination') return 'info';
 return 'secondary';
 };

 return (
 <AuthenticatedLayout
 header="Crosscutting Kinerja"
 >
 <Head title="Crosscutting Kinerja" />

 <div className="space-y-6">
 <Card className="shadow-sm">
 <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
 <CardTitle className="flex items-center gap-2">
 <Network className="h-5 w-5" />
 Daftar Relasi Crosscutting
 </CardTitle>
 <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
 <SelectNative
 value={filters.period || ''}
 onChange={handleFilterChange}
 className="w-full sm:w-auto"
 >
 <option value="">Semua Periode</option>
 {periods.map(p => (
 <option key={p.id} value={p.id}>{p.year}</option>
 ))}
 </SelectNative>
 <Button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto justify-center">
 <Plus className="mr-2 h-4 w-4" />
 Tambah
 </Button>
 </div>
 </CardHeader>
 <CardContent>
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead className="w-10">No</TableHead>
 <TableHead>Indikator</TableHead>
 <TableHead>Organisasi</TableHead>
 <TableHead>Dengan</TableHead>
 <TableHead>Tipe</TableHead>
 <TableHead>Keterangan</TableHead>
 <TableHead className="w-[100px] text-right">Aksi</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {relations.data.length > 0 ? (
 relations.data.map((r, index) => (
 <TableRow key={r.id}>
 <TableCell className="text-sm text-gray-500 tabular-nums">
 {((relations as any).from ?? relations.meta?.from ?? 1) + index}
 </TableCell>
 <TableCell>
 <div className="font-medium">{r.indicator?.name || '—'}</div>
 <div className="text-xs text-muted-foreground">{r.indicator?.code}</div>
 </TableCell>
 <TableCell>{r.organization?.short_name || r.organization?.name}</TableCell>
 <TableCell>
 <div>{r.related_organization?.short_name || r.related_organization?.name}</div>
 <div className="text-xs text-muted-foreground">{r.related_organization?.name}</div>
 </TableCell>
 <TableCell>
 <Badge variant={getBadgeVariant(r.relation_type) as any}>
 {relationTypes[r.relation_type] || r.relation_type}
 </Badge>
 </TableCell>
 <TableCell>{r.description || '—'}</TableCell>
 <TableCell className="text-right">
 <Button
 variant="ghost"
 size="icon"
 onClick={() => handleDelete(r.id)}
 className="text-rose-500 hover:text-rose-700"
 >
 <Trash2 className="h-4 w-4" />
 </Button>
 </TableCell>
 </TableRow>
 ))
 ) : (
 <TableEmptyRow
 colSpan={7}
 title="Belum Ada Relasi Crosscutting"
 description="Belum ada data relasi lintas sektor (dukungan, ketergantungan, koordinasi) untuk periode yang dipilih."
 />
 )}
 </TableBody>
 </Table>
                    <TablePagination
                        pagination={relations}
                        itemLabel="relasi"
                        filters={filters}
                        baseUrl="/planning/crosscutting"
                    />
                </CardContent>
 </Card>
 </div>

 <CrosscuttingModal
 isOpen={isModalOpen}
 onClose={() => setIsModalOpen(false)}
 organizations={organizations}
 periods={periods}
 indicators={indicators}
 relationTypes={relationTypes}
 />

 <ConfirmDialog
 open={deleteCrosscuttingId !== null}
 onOpenChange={(open) => !open && setDeleteCrosscuttingId(null)}
 title="Hapus Relasi Crosscutting"
 description="Apakah Anda yakin ingin menghapus relasi crosscutting ini?"
 confirmText="Hapus"
 variant="destructive"
 onConfirm={handleConfirmDelete}
 />
 </AuthenticatedLayout>
 );
}

interface CrosscuttingModalProps {
 isOpen: boolean;
 onClose: () => void;
 organizations: Organization[];
 periods: Period[];
 indicators: Indicator[];
 relationTypes: Record<string, string>;
}

function CrosscuttingModal({ isOpen, onClose, organizations, periods, indicators, relationTypes }: CrosscuttingModalProps) {
 const { data, setData, post, reset, processing, errors } = useForm({
 performance_period_id: '',
 indicator_id: '',
 organization_id: '',
 related_organization_id: '',
 relation_type: 'coordination',
 description: ''
 });

 const orgIndicators = indicators.filter(i => i.organization_id === Number(data.organization_id));
 const filteredOrgs = organizations.filter(o => o.id !== Number(data.organization_id));

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 post('/planning/crosscutting', {
 onSuccess: () => {
 onClose();
 reset();
 }
 });
 };

 return (
 <Dialog open={isOpen} onOpenChange={(open) => {
 if (!open) {
 onClose();
 reset();
 }
 }}>
 <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
 <form autoComplete="off" noValidate onSubmit={handleSubmit}>
 <DialogHeader>
 <DialogTitle>Tambah Crosscutting</DialogTitle>
 <DialogDescription>
 Tambahkan relasi kinerja antar organisasi
 </DialogDescription>
 </DialogHeader>
 <div className="grid gap-4 py-4">
 <div className="grid gap-2">
 <Label htmlFor="performance_period_id">Periode</Label>
 <SelectNative
 id="performance_period_id"
 value={data.performance_period_id}
 onChange={(e) => setData('performance_period_id', e.target.value)}
 >
 <option value="">Pilih Periode</option>
 {periods.map(p => (
 <option key={p.id} value={p.id}>{p.year}</option>
 ))}
 </SelectNative>
 {errors.performance_period_id && <p className="text-sm text-destructive">{errors.performance_period_id}</p>}
 </div>

 <div className="grid gap-2">
 <Label htmlFor="organization_id">Organisasi</Label>
 <SelectNative
 id="organization_id"
 value={data.organization_id}
 onChange={(e) => {
 setData('organization_id', e.target.value);
 setData('indicator_id', '');
 }}
 >
 <option value="">Pilih Organisasi</option>
 {organizations.map(o => (
 <option key={o.id} value={o.id}>{o.name}</option>
 ))}
 </SelectNative>
 {errors.organization_id && <p className="text-sm text-destructive">{errors.organization_id}</p>}
 </div>

 <div className="grid gap-2">
 <Label htmlFor="indicator_id">Indikator</Label>
 <SelectNative
 id="indicator_id"
 value={data.indicator_id}
 onChange={(e) => setData('indicator_id', e.target.value)}
 disabled={!data.organization_id}
 >
 <option value="">Pilih Indikator</option>
 {orgIndicators.map(i => (
 <option key={i.id} value={i.id}>{i.name}</option>
 ))}
 </SelectNative>
 {errors.indicator_id && <p className="text-sm text-destructive">{errors.indicator_id}</p>}
 </div>

 <div className="grid gap-2">
 <Label htmlFor="related_organization_id">Bekerja Sama Dengan</Label>
 <SelectNative
 id="related_organization_id"
 value={data.related_organization_id}
 onChange={(e) => setData('related_organization_id', e.target.value)}
 >
 <option value="">Pilih Organisasi</option>
 {filteredOrgs.map(o => (
 <option key={o.id} value={o.id}>{o.name}</option>
 ))}
 </SelectNative>
 {errors.related_organization_id && <p className="text-sm text-destructive">{errors.related_organization_id}</p>}
 </div>

 <div className="grid gap-2">
 <Label htmlFor="relation_type">Tipe Relasi</Label>
 <SelectNative
 id="relation_type"
 value={data.relation_type}
 onChange={(e) => setData('relation_type', e.target.value)}
 >
 {Object.entries(relationTypes).map(([val, label]) => (
 <option key={val} value={val}>{label}</option>
 ))}
 </SelectNative>
 {errors.relation_type && <p className="text-sm text-destructive">{errors.relation_type}</p>}
 </div>

 <div className="grid gap-2">
 <Label htmlFor="description">Keterangan</Label>
 <Textarea
 id="description"
 placeholder="Keterangan atau uraian keterkaitan crosscutting program (opsional)..."
 value={data.description}
 onChange={(e) => setData('description', e.target.value)}
 rows={3}
 />
 {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
 </div>
 </div>
 <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
 <Button
 type="button"
 variant="outline"
 onClick={() => {
 onClose();
 reset();
 }}
 >
 Batal
 </Button>
 <Button type="submit" disabled={processing}>
 Simpan
 </Button>
 </DialogFooter>
 </form>
 </DialogContent>
 </Dialog>
 );
}
