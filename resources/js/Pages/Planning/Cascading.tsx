import { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/Components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { TableEmptyRow } from '@/Components/EmptyState';
import { Badge } from '@/Components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { SelectNative } from '@/Components/ui/select-native';
import { Textarea } from '@/Components/ui/textarea';
import { Label } from '@/Components/ui/label';
import { Share2, Plus, Trash2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
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

interface TreeOption {
 id: number;
 name: string;
 level: string;
 organization?: {
 short_name?: string;
 };
}

interface CascadingRelation {
 id: number;
 type: 'vertical' | 'horizontal';
 description?: string;
 performance_period_id?: number;
 from_tree?: {
 id: number;
 name: string;
 level: string;
 organization?: {
 short_name?: string;
 };
 };
 to_tree?: {
 id: number;
 name: string;
 level: string;
 organization?: {
 short_name?: string;
 };
 };
}

interface PaginatedData<T> {
 data: T[];
 meta: {
 current_page: number;
 last_page: number;
 from: number;
 to: number;
 total: number;
 links: {
 url: string | null;
 label: string;
 active: boolean;
 }[];
 };
}

interface CascadingProps {
 relations: PaginatedData<CascadingRelation>;
 organizations: Organization[];
 periods: Period[];
 trees: TreeOption[];
 treeLevels: Record<string, string>;
 filters: {
 period?: string;
 per_page?: number | string;
 };
}

function CascadingModal({ isOpen, onClose, periods, trees, treeLevels }: { isOpen: boolean; onClose: () => void; periods: Period[]; trees: TreeOption[]; treeLevels: Record<string, string> }) {
 const { data, setData, post, processing, errors, reset } = useForm({
 performance_period_id: '',
 from_tree_id: '',
 to_tree_id: '',
 type: 'vertical',
 description: '',
 });

 const submit = (e: React.FormEvent) => {
 e.preventDefault();
 post('/planning/cascading', {
 onSuccess: () => {
 onClose();
 reset();
 },
 });
 };

 return (
 <Dialog open={isOpen} onOpenChange={onClose}>
 <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle>Tambah Cascading</DialogTitle>
 </DialogHeader>
 <form autoComplete="off" noValidate onSubmit={submit} className="space-y-4">
 <div className="space-y-2">
 <Label>Periode</Label>
 <SelectNative
 value={data.performance_period_id}
 onChange={(e) => setData('performance_period_id', e.target.value)}
 >
 <option value="">Pilih Periode...</option>
 {periods.map((p) => (
 <option key={p.id} value={p.id}>{p.year}</option>
 ))}
 </SelectNative>
 {errors.performance_period_id && <p className="text-sm text-red-500">{errors.performance_period_id}</p>}
 </div>

 <div className="space-y-2">
 <Label>Dari Simpul</Label>
 <SelectNative
 value={data.from_tree_id}
 onChange={(e) => setData('from_tree_id', e.target.value)}
 >
 <option value="">Pilih Simpul Asal...</option>
 {trees.map((t) => (
 <option key={t.id} value={t.id}>
 {t.organization?.short_name} · {treeLevels[t.level] || t.level} · {t.name}
 </option>
 ))}
 </SelectNative>
 {errors.from_tree_id && <p className="text-sm text-red-500">{errors.from_tree_id}</p>}
 </div>

 <div className="space-y-2">
 <Label>Ke Simpul</Label>
 <SelectNative
 value={data.to_tree_id}
 onChange={(e) => setData('to_tree_id', e.target.value)}
 >
 <option value="">Pilih Simpul Tujuan...</option>
 {trees.map((t) => (
 <option key={t.id} value={t.id}>
 {t.organization?.short_name} · {treeLevels[t.level] || t.level} · {t.name}
 </option>
 ))}
 </SelectNative>
 {errors.to_tree_id && <p className="text-sm text-red-500">{errors.to_tree_id}</p>}
 </div>

 <div className="space-y-2">
 <Label>Tipe</Label>
 <SelectNative
 value={data.type}
 onChange={(e) => setData('type', e.target.value as 'vertical' | 'horizontal')}
 >
 <option value="vertical">Vertikal (antar level organisasi)</option>
 <option value="horizontal">Horizontal (lintas unit)</option>
 </SelectNative>
 {errors.type && <p className="text-sm text-red-500">{errors.type}</p>}
 </div>

 <div className="space-y-2">
 <Label>Keterangan</Label>
 <Textarea
 value={data.description}
 onChange={(e) => setData('description', e.target.value)}
 rows={3}
 placeholder="Keterangan atau deskripsi cascading kinerja (opsional)..."
 />
 {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
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

export default function Cascading({ relations, organizations, periods, trees, treeLevels, filters }: CascadingProps) {
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [deleteCascadingId, setDeleteCascadingId] = useState<number | null>(null);

 const handleDelete = (id: number) => {
 setDeleteCascadingId(id);
 };

 const confirmDeleteCascading = () => {
 if (deleteCascadingId === null) return;
 router.delete(`/planning/cascading/${deleteCascadingId}`, {
 onSuccess: () => setDeleteCascadingId(null),
 });
 };

 return (
 <AuthenticatedLayout
 header="Cascading Kinerja"
 >
 <Head title="Cascading Kinerja" />

 <div className="space-y-6">
 <Card className="shadow-sm">
 <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
 <CardTitle className="flex items-center gap-2">
 <Share2 className="h-5 w-5 text-muted-foreground" />
 <span>Relasi Kinerja</span>
 </CardTitle>

 <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
 <SelectNative
 value={filters.period || ''}
 onChange={(e) => {
 router.get('/planning/cascading', { ...filters, period: e.target.value, page: 1 }, { preserveState: true });
 }}
 className="w-full sm:w-40"
 >
 <option value="">Semua Periode</option>
 {periods.map((p) => (
 <option key={p.id} value={p.id}>{p.year}</option>
 ))}
 </SelectNative>

 <Button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto justify-center">
 <Plus className="size-4 mr-2" />
 Tambah
 </Button>
 </div>
 </CardHeader>

 <CardContent>
 <div className="overflow-x-auto">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead className="w-10">No</TableHead>
 <TableHead>Dari</TableHead>
 <TableHead className="w-10 text-center"></TableHead>
 <TableHead>Ke</TableHead>
 <TableHead>Tipe</TableHead>
 <TableHead>Keterangan</TableHead>
 <TableHead className="text-right">Aksi</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {relations.data.length > 0 ? (
 relations.data.map((relation, index) => (
 <TableRow key={relation.id}>
 <TableCell className="text-sm text-gray-500 tabular-nums">
 {((relations as any).from ?? relations.meta?.from ?? 1) + index}
 </TableCell>
 <TableCell>
 <div className="font-medium">{relation.from_tree?.name}</div>
 <div className="text-sm text-gray-500">
 {relation.from_tree?.organization?.short_name} · {treeLevels[relation.from_tree?.level || ''] || relation.from_tree?.level}
 </div>
 </TableCell>
 <TableCell className="text-center">
 <ArrowRight className="size-4 text-emerald-500 mx-auto" />
 </TableCell>
 <TableCell>
 <div className="font-medium">{relation.to_tree?.name}</div>
 <div className="text-sm text-gray-500">
 {relation.to_tree?.organization?.short_name} · {treeLevels[relation.to_tree?.level || ''] || relation.to_tree?.level}
 </div>
 </TableCell>
 <TableCell>
 {relation.type === 'vertical' ? (
 <Badge variant="default">Vertikal</Badge>
 ) : (
 <Badge variant="info">Horizontal</Badge>
 )}
 </TableCell>
 <TableCell className="text-gray-500">
 {relation.description || '—'}
 </TableCell>
 <TableCell className="text-right">
 <Button
 variant="ghost"
 size="icon"
 onClick={() => handleDelete(relation.id)}
 >
 <Trash2 className="size-4 text-rose-500" />
 </Button>
 </TableCell>
 </TableRow>
 ))
 ) : (
 <TableEmptyRow
 colSpan={7}
 title="Belum Ada Relasi Cascading"
 description="Belum ada relasi vertikal/horizontal pohon kinerja untuk periode yang dipilih."
 />
 )}
 </TableBody>
 </Table>
 </div>

 <TablePagination
 pagination={relations}
 itemLabel="relasi"
 filters={filters}
 baseUrl="/planning/cascading"
 />
 </CardContent>
 </Card>
 </div>

 <CascadingModal
 isOpen={isModalOpen}
 onClose={() => setIsModalOpen(false)}
 periods={periods}
 trees={trees}
 treeLevels={treeLevels}
 />

 <ConfirmDialog
 open={deleteCascadingId !== null}
 onOpenChange={(open) => !open && setDeleteCascadingId(null)}
 title="Hapus Relasi Cascading?"
 description="Apakah Anda yakin ingin menghapus relasi cascading ini?"
 confirmText="Hapus Relasi"
 cancelText="Batal"
 onConfirm={confirmDeleteCascading}
 onCancel={() => setDeleteCascadingId(null)}
 />
 </AuthenticatedLayout>
 );
}
