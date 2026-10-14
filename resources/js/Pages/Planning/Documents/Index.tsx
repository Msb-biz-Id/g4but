import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { FileText, Plus, Pencil, Trash2, CheckCircle2, Filter, X } from 'lucide-react';

import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { SelectNative } from '@/Components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import TablePagination from '@/Components/TablePagination';
import { Textarea } from '@/Components/ui/textarea';
import { PageProps } from '@/types';
import { cn } from '@/lib/utils';

interface Document {
    id: number;
    code: string;
    type: string;
    periode_type: '5_tahunan' | 'tahunan'; // G-17
    title: string;
    year: number;
    start_date: string;
    end_date: string;
    status: string;
    description?: string;
    organization?: { id: number; code: string; name: string };
    creator?: { id: number; name: string };
    approved_at?: string;
}

interface Organization { id: number; code: string; name: string; }
interface Period { id: number; code: string; name: string; year: number; }
interface PaginatedData<T> {
    data: T[];
    meta: { current_page: number; last_page: number; total: number; from?: number; to?: number; links: { url: string | null; label: string; active: boolean }[] };
}

interface Props extends PageProps {
    documents: PaginatedData<Document>;
    organizations: Organization[];
    periods: Period[];
    types: { value: string; label: string }[];
    filters: { type?: string; organization_id?: string; year?: string; periode_type?: string; per_page?: number };
    canManage?: boolean; // true = Super Admin - bisa ubah periode_type
    isOpdAdmin?: boolean;
}

// G-17: label badge periode
const PERIODE_BADGE: Record<string, { label: string; className: string }> = {
    '5_tahunan': { label: '5 Thn', className: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300' },
    'tahunan':   { label: 'Tahunan', className: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300' },
};

export default function PlanningDocumentsIndex({ documents, organizations, periods, types, filters, auth, canManage = false, isOpdAdmin = false }: Props) {
    const [open, setOpen]           = useState(false);
    const [editing, setEditing]     = useState<Document | null>(null);
    const [deleting, setDeleting]   = useState<Document | null>(null);
    const [approving, setApproving] = useState<Document | null>(null);

    const form = useForm({
        code: '',
        type: 'renstra',
        periode_type: 'tahunan' as '5_tahunan' | 'tahunan', // G-17
        title: '',
        organization_id: !isOpdAdmin && organizations.length > 0 ? organizations[0].id.toString() : '',
        planning_period_id: '',
        year: new Date().getFullYear(),
        start_date: '',
        end_date: '',
        description: '',
    });

    const openCreate = () => {
        form.reset();
        if (!isOpdAdmin && organizations.length > 0) {
            form.setData('organization_id', organizations[0].id.toString());
        }
        setEditing(null);
        setOpen(true);
    };

    const openEdit = (doc: Document) => {
        form.setData({
            code: doc.code,
            type: doc.type,
            periode_type: doc.periode_type ?? 'tahunan', // G-17
            title: doc.title,
            organization_id: doc.organization?.id?.toString() ?? '',
            planning_period_id: '',
            year: doc.year,
            start_date: doc.start_date,
            end_date: doc.end_date,
            description: doc.description ?? '',
        });
        setEditing(doc);
        setOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editing) {
            form.put(route('planning.docs.update', editing.id), {
                onSuccess: () => setOpen(false),
            });
        } else {
            form.post(route('planning.docs.store'), {
                onSuccess: () => setOpen(false),
            });
        }
    };

    const handleDelete = () => {
        if (!deleting) return;
        router.delete(route('planning.docs.destroy', deleting.id), {
            onSuccess: () => setDeleting(null),
        });
    };

    const handleApprove = () => {
        if (!approving) return;
        router.post(route('planning.docs.approve', approving.id), {}, {
            onSuccess: () => setApproving(null),
        });
    };

    const applyFilter = (key: string, value: string) => {
        router.get(route('planning.docs.index'), { ...filters, [key]: value || undefined }, { preserveState: true });
    };

    const resetFilters = () => {
        router.get(route('planning.docs.index'), {}, { preserveState: true });
    };

    const hasFilters = Boolean(filters.type || filters.organization_id || filters.periode_type || filters.year);

    return (
        <AuthenticatedLayout header="Dokumen Perencanaan">
            <Head title="Dokumen Perencanaan - Renstra / Renja / PK" />

            <div className="space-y-4">
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Dokumen Perencanaan</h1>
                        <p className="text-sm text-muted-foreground">Renstra · Renja · Perjanjian Kinerja</p>
                    </div>
                    <Button onClick={openCreate} className="w-full sm:w-auto justify-center">
                        <Plus className="mr-2 h-4 w-4" /> Tambah Dokumen
                    </Button>
                </div>

                {/* Filters */}
                <Card>
                    <CardContent className="p-4 sm:p-5">
                        <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <Filter className="h-4 w-4 text-primary" />
                                <span>Filter Dokumen</span>
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
                                    value={filters.type ?? ''}
                                    onChange={(e) => applyFilter('type', e.target.value)}
                                    className="w-full"
                                >
                                    <option value="">Semua Tipe</option>
                                    {types.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </SelectNative>
                            </div>
                            <div className="lg:col-span-4">
                                <SelectNative
                                    value={filters.organization_id ?? ''}
                                    onChange={(e) => applyFilter('organization_id', e.target.value)}
                                    className="w-full"
                                >
                                    <option value="">Semua OPD</option>
                                    {organizations.map((o) => <option key={o.id} value={o.id}>{o.code} - {o.name}</option>)}
                                </SelectNative>
                            </div>
                            <div className="lg:col-span-3">
                                <SelectNative
                                    value={filters.periode_type ?? ''}
                                    onChange={(e) => applyFilter('periode_type', e.target.value)}
                                    className="w-full"
                                >
                                    <option value="">Semua Periode</option>
                                    <option value="5_tahunan">5 Tahunan</option>
                                    <option value="tahunan">Tahunan</option>
                                </SelectNative>
                            </div>
                            <div className="lg:col-span-2">
                                <Input
                                    type="number"
                                    placeholder="Tahun..."
                                    className="w-full"
                                    defaultValue={filters.year}
                                    onBlur={(e) => applyFilter('year', e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            applyFilter('year', (e.target as HTMLInputElement).value);
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Table */}
                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10">No</TableHead>
                                    <TableHead>Kode</TableHead>
                                    <TableHead>Tipe</TableHead>
                                    <TableHead>Periode</TableHead>{/* G-17 */}
                                    <TableHead>Judul</TableHead>
                                    <TableHead>OPD</TableHead>
                                    <TableHead>Tahun</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {documents.data.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">
                                            <FileText className="mx-auto mb-2 h-8 w-8 opacity-40" />
                                            Belum ada dokumen perencanaan
                                        </TableCell>
                                    </TableRow>
                                )}
                                {documents.data.map((doc, index) => {
                                    const statusBadge = doc.status === 'approved'
                                        ? { label: 'Disetujui', variant: 'default' as const }
                                        : { label: 'Draft',    variant: 'secondary' as const };
                                    const periodBadge = PERIODE_BADGE[doc.periode_type] ?? PERIODE_BADGE['tahunan'];
                                    return (
                                        <TableRow key={doc.id}>
                                            <TableCell className="text-sm text-gray-500 tabular-nums">
                                                {((documents as any).from ?? (((documents.meta?.current_page ?? 1) - 1) * 10 + 1)) + index}
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">{doc.code}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="uppercase">{doc.type}</Badge>
                                            </TableCell>
                                            {/* G-17: badge periode */}
                                            <TableCell>
                                                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${periodBadge.className}`}>
                                                    {periodBadge.label}
                                                </span>
                                            </TableCell>
                                            <TableCell className="max-w-xs truncate">{doc.title}</TableCell>
                                            <TableCell className="text-sm">{doc.organization?.name ?? '-'}</TableCell>
                                            <TableCell>{doc.year}</TableCell>
                                            <TableCell>
                                                <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    {doc.status === 'draft' && (
                                                        <>
                                                            {isOpdAdmin && (
                                                                <Button size="sm" variant="ghost" onClick={() => setApproving(doc)} title="Setujui Dokumen">
                                                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                                </Button>
                                                            )}
                                                            <Button size="sm" variant="ghost" onClick={() => openEdit(doc)} title="Edit Dokumen">
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button size="sm" variant="ghost" onClick={() => setDeleting(doc)} title="Hapus Dokumen">
                                                                <Trash2 className="h-4 w-4 text-destructive" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                        <TablePagination
                            pagination={{
                                from: (documents as any).from ?? documents.meta?.from,
                                to: (documents as any).to ?? documents.meta?.to,
                                total: (documents as any).total ?? documents.meta?.total,
                                per_page: Number((documents as any).per_page ?? (filters as any).per_page ?? 25),
                                links: (documents as any).links ?? documents.meta?.links,
                            }}
                            perPage={Number((documents as any).per_page ?? (filters as any).per_page ?? 25)}
                            onPerPageChange={(newPerPage) => applyFilter('per_page', String(newPerPage))}
                            itemName="dokumen"
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Form Dialog */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit Dokumen' : 'Tambah Dokumen Perencanaan'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Kode</Label>
                                <Input placeholder="RENSTRA-2025" value={form.data.code} onChange={(e) => form.setData('code', e.target.value)} />
                                {form.errors.code && <p className="text-xs text-destructive">{form.errors.code}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <Label>Tipe Dokumen</Label>
                                <SelectNative value={form.data.type} onChange={(e) => form.setData('type', e.target.value)}>
                                    {types.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </SelectNative>
                            </div>
                        </div>

                        {/* G-17: Periode Dokumen - hanya Super Admin */}
                        {canManage && (
                            <div className="space-y-1.5">
                                <Label>Periode Dokumen</Label>
                                <SelectNative
                                    value={form.data.periode_type}
                                    onChange={(e) => form.setData('periode_type', e.target.value as '5_tahunan' | 'tahunan')}
                                >
                                    <option value="tahunan">Tahunan (default)</option>
                                    <option value="5_tahunan">5 Tahunan (Renstra)</option>
                                </SelectNative>
                                <p className="text-xs text-muted-foreground">
                                    Sistem akan mengisi otomatis. Ubah hanya jika diperlukan.
                                </p>
                            </div>
                        )}
                        <div className="space-y-1.5">
                            <Label>Judul Dokumen</Label>
                            <Input placeholder="cth: Rencana Pembangunan Jangka Menengah Daerah" value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} />
                            {form.errors.title && <p className="text-xs text-destructive">{form.errors.title}</p>}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>OPD</Label>
                                <SelectNative
                                    value={form.data.organization_id}
                                    onChange={(e) => form.setData('organization_id', e.target.value)}
                                    disabled={!isOpdAdmin && organizations.length <= 1}
                                >
                                    {isOpdAdmin && <option value="">- Semua Unit -</option>}
                                    {organizations.map((o) => <option key={o.id} value={o.id}>{o.code} - {o.name}</option>)}
                                </SelectNative>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Tahun</Label>
                                <Input type="number" placeholder="cth: 2025" value={form.data.year} onChange={(e) => form.setData('year', Number(e.target.value))} />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Mulai</Label>
                                <Input type="date" placeholder="Pilih tanggal mulai" value={form.data.start_date} onChange={(e) => form.setData('start_date', e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Selesai</Label>
                                <Input type="date" placeholder="Pilih tanggal selesai" value={form.data.end_date} onChange={(e) => form.setData('end_date', e.target.value)} />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Deskripsi</Label>
                            <Textarea placeholder="Ringkasan atau catatan dokumen perencanaan..." value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} rows={3} />
                        </div>
                        <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Batal</Button>
                            <Button type="submit" disabled={form.processing}>{editing ? 'Simpan' : 'Tambah'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Approve Dialog */}
            <Dialog open={!!approving} onOpenChange={() => setApproving(null)}>
                <DialogContent className="max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Setujui Dokumen</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        Dokumen <strong>{approving?.title}</strong> akan disetujui dan tidak dapat diubah lagi. Lanjutkan?
                    </p>
                    <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setApproving(null)}>Batal</Button>
                        <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700">Setujui</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
                <DialogContent className="max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Hapus Dokumen</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        Dokumen <strong>{deleting?.title}</strong> akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
                    </p>
                    <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setDeleting(null)}>Batal</Button>
                        <Button variant="destructive" onClick={handleDelete}>Hapus</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
