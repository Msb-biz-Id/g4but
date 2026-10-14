import React, { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/Components/ui/button';
import { SelectNative } from '@/Components/ui/select-native';
import { Input } from '@/Components/ui/input';
import { Textarea } from '@/Components/ui/textarea';
import { Label } from '@/Components/ui/label';
import { Badge } from '@/Components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { TableEmptyRow } from '@/Components/EmptyState';
import TablePagination from '@/Components/TablePagination';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';
import { Card, CardContent } from '@/Components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import PageHeader from '@/Components/Dashboard/PageHeader';
import StatusBadge from '@/Components/Dashboard/StatusBadge';
import ActionMenuDropdown from '@/Components/Dashboard/ActionMenuDropdown';
import { Plus, Edit, Trash2, Upload, Check, Lock, Send, FileText, MoreVertical, Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import ConfirmDialog from '@/Components/ConfirmDialog';

interface Agreement {
 id: number;
 name: string;
 status: 'draft' | 'submitted' | 'approved' | 'locked' | 'revision';
 document_number?: string;
 description?: string;
 file_path?: string;
 is_locked: boolean;
 indicators_count: number;
 organization_id?: number;
 performance_period_id?: number;
 organization?: { id: number; name: string; short_name?: string };
 performancePeriod?: { year: number };
 indicators?: { id: number }[];
}

interface Indicator { id: number; code: string; name: string; organization_id: number; }
interface Organization { id: number; code: string; name: string; short_name?: string; }
interface Period { id: number; year: number; }
interface PaginatedData<T> {
    data: T[];
    current_page?: number;
    last_page?: number;
    from?: number;
    to?: number;
    total?: number;
    links?: { url: string | null; label: string; active: boolean }[];
    meta?: {
        current_page: number;
        last_page: number;
        from: number;
        to: number;
        total: number;
        links?: { url: string | null; label: string; active: boolean }[];
    };
}

interface Props {
 agreements: PaginatedData<Agreement>;
 organizations: Organization[];
 periods: Period[];
 indicators: Indicator[];
 filters: { organization?: string; period?: string; status?: string; per_page?: string | number };
 canApprove: boolean;
}

export default function Agreements({ agreements, organizations, periods, indicators, filters, canApprove }: Props) {
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [isUploadOpen, setIsUploadOpen] = useState(false);
 const [editingId, setEditingId] = useState<number | null>(null);
 const [uploadingId, setUploadingId] = useState<number | null>(null);
 const [deleteAgreementId, setDeleteAgreementId] = useState<number | null>(null);
 const [lockAgreementId, setLockAgreementId] = useState<number | null>(null);
 const [rejectAgreement, setRejectAgreement] = useState<{ id: number } | null>(null);
 const [rejectNotes, setRejectNotes] = useState('');
 const [rejectProcessing, setRejectProcessing] = useState(false);


 const { data, setData, post, put, delete: destroy, reset, errors, processing } = useForm({
 name: '',
 document_number: '',
 description: '',
 organization_id: '',
 performance_period_id: '',
 indicator_ids: [] as number[],
 });

 const { data: uploadData, setData: setUploadData, post: postUpload, reset: resetUpload, errors: uploadErrors, processing: uploadProcessing } = useForm({
 file: null as File | null,
 });

 const handleFilterChange = (key: string, value: string) => {
 router.get('/planning/agreements', { ...filters, [key]: value }, { preserveState: true, preserveScroll: true });
 };

 const hasFilters = Boolean(filters.organization || filters.period || filters.status);
 const resetFilters = () => {
 router.get('/planning/agreements', {}, { preserveState: true, preserveScroll: true });
 };

 const openCreateModal = () => {
 setEditingId(null);
 reset();
 setIsModalOpen(true);
 };

 const openEditModal = (agreement: Agreement) => {
 setEditingId(agreement.id);
 setData({
 name: agreement.name,
 document_number: agreement.document_number || '',
 description: agreement.description || '',
 organization_id: agreement.organization_id?.toString() || '',
 performance_period_id: agreement.performance_period_id?.toString() || '',
 indicator_ids: agreement.indicators?.map(i => i.id) || [],
 });
 setIsModalOpen(true);
 };

 const openUploadModal = (id: number) => {
 setUploadingId(id);
 resetUpload();
 setIsUploadOpen(true);
 };

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (editingId) {
 put(`/planning/agreements/${editingId}`, {
 onSuccess: () => setIsModalOpen(false),
 });
 } else {
 post('/planning/agreements', {
 onSuccess: () => setIsModalOpen(false),
 });
 }
 };

 const handleUpload = (e: React.FormEvent) => {
 e.preventDefault();
 if (uploadingId) {
 postUpload(`/planning/agreements/${uploadingId}/upload`, {
 onSuccess: () => setIsUploadOpen(false),
 });
 }
 };

    const handleDelete = (id: number) => {
        setDeleteAgreementId(id);
    };

    const handleConfirmDelete = () => {
        if (deleteAgreementId) {
            destroy(`/planning/agreements/${deleteAgreementId}`, {
                preserveScroll: true,
                onSuccess: () => setDeleteAgreementId(null),
            });
        }
    };

    const handleAction = (id: number, action: string) => {
        if (action === 'lock') {
            setLockAgreementId(id);
            return;
        }
        router.post(`/planning/agreements/${id}/${action}`, {}, { preserveScroll: true });
    };

    const handleConfirmLock = () => {
        if (lockAgreementId) {
            router.post(`/planning/agreements/${lockAgreementId}/lock`, {}, {
                preserveScroll: true,
                onSuccess: () => setLockAgreementId(null),
            });
        }
    };

    const handleRejectAgreementSubmit = () => {
        if (!rejectAgreement || !rejectNotes.trim()) return;
        setRejectProcessing(true);
        router.post(`/planning/agreements/${rejectAgreement.id}/reject`, { notes: rejectNotes }, {
            preserveScroll: true,
            onSuccess: () => { setRejectAgreement(null); setRejectNotes(''); },
            onFinish: () => setRejectProcessing(false),
        });
    };

 const filteredIndicators = indicators.filter(
 (ind) => !data.organization_id || ind.organization_id.toString() === data.organization_id
 );

 const handleIndicatorToggle = (id: number) => {
 const newIds = data.indicator_ids.includes(id)
 ? data.indicator_ids.filter((i) => i !== id)
 : [...data.indicator_ids, id];
 setData('indicator_ids', newIds);
 };

 const getStatusBadge = (status: string) => {
 switch (status) {
 case 'draft': return <Badge variant="secondary">Draft</Badge>;
 case 'submitted': return <Badge variant="warning">Menunggu Validasi</Badge>;
 case 'approved': return <Badge variant="success">Disetujui</Badge>;
 case 'locked': return <Badge variant="secondary">Terkunci</Badge>;
 case 'revision': return <Badge variant="destructive">Perlu Revisi</Badge>;
 default: return <Badge variant="secondary">{status}</Badge>;
 }
 };

 return (
 <AuthenticatedLayout header="Perjanjian Kinerja">
            <Head title="Perjanjian Kinerja" />

            <div className="space-y-6">
                <PageHeader
                    title="Perjanjian Kinerja (PK)"
                    description="Dokumen penetapan dan komitmen perjanjian kinerja tahunan instansi pemerintah dan kepala perangkat daerah."
                    breadcrumbs={[
                        { label: 'Perencanaan' },
                        { label: 'Perjanjian Kinerja' },
                    ]}
                    actions={(
                        <Button onClick={openCreateModal} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm w-full sm:w-auto justify-center">
                            <Plus className="mr-2 h-4 w-4" /> Tambah Perjanjian
                        </Button>
                    )}
                />

                {/* Filter Card */}
                <Card>
                    <CardContent className="p-4 sm:p-5">
                        <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                <Filter className="h-4 w-4 text-primary" />
                                <span>Filter Perjanjian Kinerja</span>
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
                                <option value="">Semua Organisasi</option>
                                {organizations.map((org) => (
                                    <option key={org.id} value={org.id.toString()}>{org.short_name || org.name}</option>
                                ))}
                            </SelectNative>
                            <SelectNative
                                value={filters.period || ''}
                                onChange={(e) => handleFilterChange('period', e.target.value)}
                                className="w-full"
                            >
                                <option value="">Semua Periode</option>
                                {periods.map((p) => (
                                    <option key={p.id} value={p.id.toString()}>{p.year}</option>
                                ))}
                            </SelectNative>
                            <SelectNative
                                value={filters.status || ''}
                                onChange={(e) => handleFilterChange('status', e.target.value)}
                                className="w-full"
                            >
                                <option value="">Semua Status</option>
                                <option value="draft">Draft</option>
                                <option value="submitted">Diajukan</option>
                                <option value="approved">Disetujui</option>
                                <option value="locked">Terkunci</option>
                            </SelectNative>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
 <TableHeader>
 <TableRow>
 <TableHead className="w-10">No</TableHead>
 <TableHead>Perjanjian</TableHead>
 <TableHead>Organisasi</TableHead>
 <TableHead>Nomor</TableHead>
 <TableHead>Indikator</TableHead>
 <TableHead>Status</TableHead>
 <TableHead>File</TableHead>
 <TableHead className="text-right">Aksi</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {agreements.data.length === 0 ? (
 <TableEmptyRow
 colSpan={8}
 title="Belum Ada Perjanjian Kinerja"
 description="Belum ada data perjanjian kinerja (PK) yang dibuat untuk filter yang dipilih."
 />
 ) : (
 agreements.data.map((agreement, index) => (
 <TableRow key={agreement.id}>
 <TableCell className="text-sm text-gray-500 tabular-nums">
 {((agreements as any).from ?? agreements.meta?.from ?? 1) + index}
 </TableCell>
 <TableCell className="font-medium">{agreement.name}</TableCell>
 <TableCell>{agreement.organization?.short_name || agreement.organization?.name || '-'}</TableCell>
 <TableCell>{agreement.document_number || '-'}</TableCell>
 <TableCell>{agreement.indicators_count}</TableCell>
 <TableCell><StatusBadge status={agreement.status} /></TableCell>
 <TableCell>
 {agreement.file_path ? (
 <a href={`/planning/agreements/${agreement.id}/download`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center">
 <FileText className="size-4 mr-1" /> Unduh
 </a>
 ) : '-'}
 </TableCell>
 <TableCell className="text-right">
 {(!agreement.is_locked || (agreement.status === 'approved' && canApprove)) ? (
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
 <span className="sr-only">Buka menu aksi</span>
 <MoreVertical className="size-4" />
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end" className="w-48">
 {agreement.status === 'draft' && (
 <DropdownMenuItem
 onClick={() => handleAction(agreement.id, 'submit')}
 className="cursor-pointer text-blue-600 focus:text-blue-600"
 >
 <Send className="mr-2 size-4" />
 <span>Ajukan</span>
 </DropdownMenuItem>
 )}
 {agreement.status === 'submitted' && canApprove && (
 <>
 <DropdownMenuItem
 onClick={() => handleAction(agreement.id, 'approve')}
 className="cursor-pointer text-green-600 focus:text-green-600"
 >
 <Check className="mr-2 size-4" />
 <span>Setujui & Validasi</span>
 </DropdownMenuItem>
 <DropdownMenuItem
 onClick={() => { setRejectAgreement({ id: agreement.id }); setRejectNotes(''); }}
 className="cursor-pointer text-red-600 focus:text-red-600"
 >
 <span className="mr-2 size-4 inline-flex items-center justify-center">✕</span>
 <span>Minta Revisi</span>
 </DropdownMenuItem>
 </>
 )}

 {agreement.status === 'approved' && canApprove && (
 <DropdownMenuItem
 onClick={() => handleAction(agreement.id, 'lock')}
 className="cursor-pointer text-amber-600 focus:text-amber-600"
 >
 <Lock className="mr-2 size-4" />
 <span>Kunci Perjanjian</span>
 </DropdownMenuItem>
 )}
 {!agreement.is_locked && (
 <>
 <DropdownMenuItem
 onClick={() => openUploadModal(agreement.id)}
 className="cursor-pointer"
 >
 <Upload className="mr-2 size-4" />
 <span>Unggah Berkas</span>
 </DropdownMenuItem>
 <DropdownMenuItem
 onClick={() => openEditModal(agreement)}
 className="cursor-pointer"
 >
 <Edit className="mr-2 size-4" />
 <span>Edit Perjanjian</span>
 </DropdownMenuItem>
 <DropdownMenuSeparator />
 <DropdownMenuItem
 onClick={() => handleDelete(agreement.id)}
 className="cursor-pointer text-destructive focus:text-destructive"
 >
 <Trash2 className="mr-2 size-4" />
 <span>Hapus</span>
 </DropdownMenuItem>
 </>
 )}
 </DropdownMenuContent>
 </DropdownMenu>
 ) : (
 <span className="text-muted-foreground text-xs">-</span>
 )}
 </TableCell>
 </TableRow>
 ))
 )}
 </TableBody>
 </Table>
                        </div>
                    </CardContent>
                </Card>
                <TablePagination
                    pagination={{
                        from: (agreements as any).from ?? agreements.meta?.from,
                        to: (agreements as any).to ?? agreements.meta?.to,
                        total: (agreements as any).total ?? agreements.meta?.total,
                        per_page: Number((agreements as any).per_page ?? (filters as any).per_page ?? 25),
                        links: agreements.meta?.links ?? agreements.links,
                    }}
                    perPage={Number((agreements as any).per_page ?? (filters as any).per_page ?? 25)}
                    onPerPageChange={(newPerPage) => {
                        router.get(
                            '/planning/agreements',
                            { ...filters, per_page: newPerPage },
                            { preserveState: true, replace: true }
                        );
                    }}
                    itemName="perjanjian"
                    className="mt-6 rounded-lg border border-border bg-white dark:bg-card"
                />
            </div>

 <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
 <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle>{editingId ? 'Edit Perjanjian' : 'Tambah Perjanjian'}</DialogTitle>
 </DialogHeader>
 <form autoComplete="off" noValidate onSubmit={handleSubmit} className="space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label htmlFor="organization_id">Organisasi</Label>
 <SelectNative
 id="organization_id"
 value={data.organization_id}
 onChange={(e) => setData('organization_id', e.target.value)}
 >
 <option value="">Pilih Organisasi</option>
 {organizations.map((org) => (
 <option key={org.id} value={org.id.toString()}>{org.name}</option>
 ))}
 </SelectNative>
 {errors.organization_id && <p className="text-sm text-red-600">{errors.organization_id}</p>}
 </div>
 <div className="space-y-2">
 <Label htmlFor="performance_period_id">Periode</Label>
 <SelectNative
 id="performance_period_id"
 value={data.performance_period_id}
 onChange={(e) => setData('performance_period_id', e.target.value)}
 >
 <option value="">Pilih Periode</option>
 {periods.map((p) => (
 <option key={p.id} value={p.id.toString()}>{p.year}</option>
 ))}
 </SelectNative>
 {errors.performance_period_id && <p className="text-sm text-red-600">{errors.performance_period_id}</p>}
 </div>
 </div>

 <div className="space-y-2">
 <Label htmlFor="name">Nama Perjanjian</Label>
 <Input
 id="name"
 placeholder="cth: Perjanjian Kinerja Tahun 2025"
 value={data.name}
 onChange={(e) => setData('name', e.target.value)}
 />
 {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
 </div>

 <div className="space-y-2">
 <Label htmlFor="document_number">Nomor Dokumen</Label>
 <Input
 id="document_number"
 placeholder="cth: 000.1/PK-DKI/2025"
 value={data.document_number}
 onChange={(e) => setData('document_number', e.target.value)}
 />
 {errors.document_number && <p className="text-sm text-red-600">{errors.document_number}</p>}
 </div>

 <div className="space-y-2">
 <Label htmlFor="description">Deskripsi</Label>
 <Textarea
 id="description"
 placeholder="Keterangan atau sasaran perjanjian kinerja..."
 value={data.description}
 onChange={(e) => setData('description', e.target.value)}
 />
 {errors.description && <p className="text-sm text-red-600">{errors.description}</p>}
 </div>

 <div className="space-y-2">
 <Label>Indikator</Label>
 {data.organization_id ? (
 <div className="space-y-2 border p-4 rounded-md max-h-60 overflow-y-auto">
 {filteredIndicators.length > 0 ? (
 filteredIndicators.map((ind) => (
 <div key={ind.id} className="flex items-center space-x-2">
 <input
 type="checkbox"
 id={`indicator-${ind.id}`}
 checked={data.indicator_ids.includes(ind.id)}
 onChange={() => handleIndicatorToggle(ind.id)}
 className="rounded border-gray-300 text-primary shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
 />
 <Label htmlFor={`indicator-${ind.id}`} className="font-normal cursor-pointer">
 {ind.code} - {ind.name}
 </Label>
 </div>
 ))
 ) : (
 <p className="text-sm text-muted-foreground">Tidak ada indikator untuk organisasi ini.</p>
 )}
 </div>
 ) : (
 <p className="text-sm text-muted-foreground italic">Pilih organisasi terlebih dahulu untuk melihat indikator.</p>
 )}
 {errors.indicator_ids && <p className="text-sm text-red-600">{errors.indicator_ids}</p>}
 </div>

 <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
 <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
 Batal
 </Button>
 <Button type="submit" disabled={processing}>
 Simpan
 </Button>
 </DialogFooter>
 </form>
 </DialogContent>
 </Dialog>

 <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
 <DialogContent className="max-h-[85vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle>Unggah File Perjanjian</DialogTitle>
 </DialogHeader>
 <form autoComplete="off" noValidate onSubmit={handleUpload} className="space-y-4">
 <div className="space-y-2">
 <Label htmlFor="file">File (PDF/Word)</Label>
 <Input
 id="file"
 type="file"
 onChange={(e) => setUploadData('file', e.target.files?.[0] || null)}
 accept=".pdf,.doc,.docx"
 />
 {uploadErrors.file && <p className="text-sm text-red-600">{uploadErrors.file}</p>}
 </div>
 <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
 <Button type="button" variant="outline" onClick={() => setIsUploadOpen(false)}>
 Batal
 </Button>
 <Button type="submit" disabled={uploadProcessing}>
 Unggah
 </Button>
 </DialogFooter>
 </form>
            </DialogContent>
        </Dialog>

        <ConfirmDialog
            open={deleteAgreementId !== null}
            onOpenChange={(open) => !open && setDeleteAgreementId(null)}
            title="Hapus Perjanjian Kinerja"
            description="Apakah Anda yakin ingin menghapus perjanjian ini? Tindakan ini tidak dapat dibatalkan."
            confirmText="Hapus"
            variant="destructive"
            onConfirm={handleConfirmDelete}
        />

        <ConfirmDialog
            open={lockAgreementId !== null}
            onOpenChange={(open) => !open && setLockAgreementId(null)}
            title="Kunci Perjanjian Kinerja"
            description="Apakah Anda yakin ingin mengunci perjanjian ini? Perjanjian yang terkunci tidak dapat diubah lagi."
            confirmText="Kunci Perjanjian"
            variant="default"
            onConfirm={handleConfirmLock}
        />

        {/* Modal: Minta Revisi Perjanjian */}
        <Dialog open={rejectAgreement !== null} onOpenChange={(open) => !open && setRejectAgreement(null)}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Minta Revisi Perjanjian Kinerja</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-2">
                    <Label htmlFor="reject-agreement-notes">Catatan Revisi <span className="text-destructive">*</span></Label>
                    <Textarea
                        id="reject-agreement-notes"
                        placeholder="Tuliskan catatan atau alasan revisi yang diperlukan..."
                        value={rejectNotes}
                        onChange={(e) => setRejectNotes(e.target.value)}
                        rows={4}
                    />
                    <p className="text-xs text-muted-foreground">Catatan ini akan dikirimkan sebagai notifikasi kepada Admin OPD.</p>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setRejectAgreement(null)}>Batal</Button>
                    <Button
                        variant="destructive"
                        onClick={handleRejectAgreementSubmit}
                        disabled={rejectProcessing || !rejectNotes.trim()}
                    >
                        {rejectProcessing ? 'Mengirim...' : 'Kirim Permintaan Revisi'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

    </AuthenticatedLayout>
 );
}
