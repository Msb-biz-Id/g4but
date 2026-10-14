import { Head, router, useForm } from '@inertiajs/react';
import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { TableEmptyRow } from '@/Components/EmptyState';
import TablePagination from '@/Components/TablePagination';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog';
import { Input } from '@/Components/ui/input';
import { Textarea } from '@/Components/ui/textarea';
import { Label } from '@/Components/ui/label';
import { SelectNative } from '@/Components/ui/select-native';
import { cn } from '@/lib/utils';
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
import { FileText, Plus, Pencil, Trash2, Upload, CheckCircle2, LockKeyhole, Download, MoreVertical, Eye } from 'lucide-react';
import { PageProps } from '@/types';
import ConfirmDialog from '@/Components/ConfirmDialog';

interface PlanningDocument {
 id: number;
 title: string;
 type: string;
 status: string;
 document_number?: string;
 description?: string;
 issued_at?: string;
 year?: number;
 start_year?: number;
 end_year?: number;
 file_path?: string;
 is_locked: boolean;
 organization?: { id: number; name: string; short_name?: string };
 performancePeriod?: { id: number; year: number };
 organization_id?: number;
 performance_period_id?: number;
}

interface Period { id: number; year: number; }
interface Organization { id: number; code: string; name: string; short_name?: string; }
interface PaginatedData<T> {
    data: T[];
    current_page?: number;
    last_page?: number;
    from?: number;
    to?: number;
    total?: number;
    prev_page_url?: string | null;
    next_page_url?: string | null;
    meta?: {
        current_page: number;
        last_page: number;
        from: number;
        to: number;
        total: number;
        links?: { url: string | null; label: string; active: boolean }[];
    };
    links?: { first?: string; last?: string; prev?: string | null; next?: string | null } | { url: string | null; label: string; active: boolean }[];
}

interface DocumentsProps extends PageProps {
 documents: PaginatedData<PlanningDocument>;
 organizations: Organization[];
 periods: Period[];
 documentTypes: Record<string, string>;
 filters: { type?: string; status?: string; organization?: string; period?: string; per_page?: string | number };
 canApprove: boolean;
 canLock: boolean;
}

interface DocumentFormData {
 title: string;
 type: string;
 organization_id: string;
 performance_period_id: string;
 document_number: string;
 description: string;
 issued_at: string;
 document_year: string;
 start_year?: string;
 end_year?: string;
 file?: File | null;
}

export default function Documents({
 documents,
 organizations,
 periods,
 documentTypes,
 filters,
 canApprove,
 canLock,
}: DocumentsProps) {
 const [isFormOpen, setIsFormOpen] = useState(false);
 const [editingId, setEditingId] = useState<number | null>(null);
 const [editingDoc, setEditingDoc] = useState<PlanningDocument | null>(null);
 const [isUploadMode, setIsUploadMode] = useState(false);
 const [deleteDocId, setDeleteDocId] = useState<number | null>(null);
 const [actionDocConfirm, setActionDocConfirm] = useState<{ id: number; action: string; label: string } | null>(null);

 const { data, setData, post, put, processing, errors, reset } = useForm<DocumentFormData>({
 title: '',
 type: '',
 organization_id: '',
 performance_period_id: '',
 document_number: '',
 description: '',
 issued_at: '',
 document_year: '',
 start_year: '',
 end_year: '',
 file: null,
 });

 const handleFilterChange = (key: string, value: string) => {
 router.get(
 '/planning/documents',
 { ...filters, [key]: value },
 { preserveState: true, replace: true }
 );
 };

    const openCreate = () => {
        setEditingId(null);
        setEditingDoc(null);
        setIsUploadMode(false);
        reset();
        setIsFormOpen(true);
    };

    const openEdit = (doc: PlanningDocument) => {
        setEditingId(doc.id);
        setEditingDoc(doc);
        setIsUploadMode(false);

        let docYear = '';
        if (doc.start_year && doc.end_year && doc.start_year !== doc.end_year) {
            docYear = `${doc.start_year}-${doc.end_year}`;
        } else if (doc.start_year) {
            docYear = doc.start_year.toString();
        } else if (doc.year) {
            docYear = doc.year.toString();
        } else if (doc.performancePeriod?.year) {
            docYear = doc.performancePeriod.year.toString();
        }

        setData({
            title: doc.title,
            type: doc.type,
            organization_id: doc.organization_id?.toString() || '',
            performance_period_id: doc.performance_period_id?.toString() || '',
            document_number: doc.document_number || '',
            description: doc.description || '',
            issued_at: doc.issued_at ? doc.issued_at.substring(0, 10) : '',
            document_year: docYear,
            start_year: doc.start_year?.toString() || '',
            end_year: doc.end_year?.toString() || '',
            file: null,
        });
        setIsFormOpen(true);
    };

    const openUpload = (doc: PlanningDocument) => {
        setEditingId(doc.id);
        setEditingDoc(doc);
        setIsUploadMode(true);
        reset();
        setIsFormOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (isUploadMode && editingId) {
            post(`/planning/documents/${editingId}/upload`, {
                forceFormData: true,
                onSuccess: () => {
                    setIsFormOpen(false);
                    setEditingDoc(null);
                },
            });
            return;
        }

        if (editingId) {
            if (data.file) {
                router.post(`/planning/documents/${editingId}`, {
                    ...data,
                    _method: 'PUT',
                }, {
                    forceFormData: true,
                    onSuccess: () => {
                        setIsFormOpen(false);
                        setEditingDoc(null);
                    },
                });
            } else {
                put(`/planning/documents/${editingId}`, {
                    onSuccess: () => {
                        setIsFormOpen(false);
                        setEditingDoc(null);
                    },
                });
            }
        } else {
            post('/planning/documents', {
                forceFormData: true,
                onSuccess: () => {
                    setIsFormOpen(false);
                    setEditingDoc(null);
                },
            });
        }
    };

    const handleDelete = (id: number) => {
        setDeleteDocId(id);
    };

    const handleConfirmDelete = () => {
        if (deleteDocId) {
            router.delete(`/planning/documents/${deleteDocId}`, {
                preserveScroll: true,
                onSuccess: () => setDeleteDocId(null),
            });
        }
    };

    const handleAction = (id: number, action: string) => {
        const actionLabels: Record<string, string> = {
            submit: 'mengajukan',
            approve: 'menyetujui',
            lock: 'mengunci',
        };
        setActionDocConfirm({
            id,
            action,
            label: actionLabels[action] || action,
        });
    };

    const handleConfirmAction = () => {
        if (actionDocConfirm) {
            router.post(`/planning/documents/${actionDocConfirm.id}/${actionDocConfirm.action}`, {}, {
                preserveScroll: true,
                onSuccess: () => setActionDocConfirm(null),
            });
        }
    };

 const getStatusBadgeVariant = (status: string) => {
 switch (status) {
 case 'draft': return 'secondary';
 case 'review': return 'warning';
 case 'approved': return 'success';
 case 'locked': return 'secondary';
 default: return 'outline';
 }
 };

 const getTypeBadgeVariant = (type: string) => {
 switch (type) {
 case 'renstra': return 'default';
 case 'renja': return 'info';
 case 'perjanjian_kinerja':
 case 'pk': return 'secondary';
 case 'proses_bisnis': return 'outline';
 default: return 'outline';
 }
 };

 return (
 <AuthenticatedLayout
 header="Dokumen Perencanaan"
 >
 <Head title="Dokumen Perencanaan Kinerja" />

 <div className="space-y-6">
    <PageHeader
        title="Dokumen Perencanaan Kinerja"
        description="Pusat integrasi tata kelola dokumen perencanaan: Renstra, Renja, Pohon Kinerja, Manajemen Risiko, dan Perjanjian Kinerja terpadu Dinas PUPR Kabupaten Mimika."
        breadcrumbs={[
            { label: 'Perencanaan' },
            { label: 'Dokumen Perencanaan' },
        ]}
        action={(
            <Button onClick={openCreate} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm w-full sm:w-auto shrink-0 justify-center">
                <Plus className="mr-2 size-4" />
                Tambah Dokumen
            </Button>
        )}
    />

    <Card className="border border-border/80 shadow-sm bg-card rounded-xl">
        <CardContent className="p-4 sm:p-6">
 <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
 <SelectNative
 value={filters.type || ''}
 onChange={(e) => handleFilterChange('type', e.target.value)}
 >
 <option value="">Semua Jenis</option>
 {Object.entries(documentTypes).map(([key, value]) => (
 <option key={key} value={key}>{value}</option>
 ))}
 </SelectNative>
 <SelectNative
 value={filters.status || ''}
 onChange={(e) => handleFilterChange('status', e.target.value)}
 >
 <option value="">Semua Status</option>
 <option value="draft">Draft</option>
 <option value="review">Review</option>
 <option value="approved">Approved</option>
 <option value="locked">Locked</option>
 </SelectNative>
 <SelectNative
 value={filters.organization || ''}
 onChange={(e) => handleFilterChange('organization', e.target.value)}
 >
 <option value="">Semua Organisasi</option>
 {organizations.map((org) => (
 <option key={org.id} value={org.id.toString()}>
 {org.short_name || org.name}
 </option>
 ))}
 </SelectNative>
 <SelectNative
 value={filters.period || ''}
 onChange={(e) => handleFilterChange('period', e.target.value)}
 >
 <option value="">Semua Periode</option>
 {periods.map((p) => (
 <option key={p.id} value={p.id.toString()}>
 {p.year}
 </option>
 ))}
 </SelectNative>
 </div>

 <div className="overflow-x-auto">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead className="w-10">No</TableHead>
 <TableHead>No. Dokumen</TableHead>
 <TableHead>Judul</TableHead>
 <TableHead>Jenis</TableHead>
 <TableHead>Organisasi</TableHead>
 <TableHead>Periode</TableHead>
 <TableHead>Berkas</TableHead>
 <TableHead>Status</TableHead>
 <TableHead className="text-right">Aksi</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {documents.data.length > 0 ? (
 documents.data.map((doc, index) => (
 <TableRow key={doc.id}>
 <TableCell className="text-sm text-gray-500 tabular-nums">
 {((documents as any).from ?? documents.meta?.from ?? 1) + index}
 </TableCell>
 <TableCell className="font-medium">{doc.document_number || '-'}</TableCell>
 <TableCell>
 <div className="flex flex-col">
 <span className="font-semibold">{doc.title}</span>
 {doc.is_locked && <LockKeyhole className="mt-1 size-3 text-muted-foreground" />}
 </div>
 </TableCell>
 <TableCell>
 <Badge variant={getTypeBadgeVariant(doc.type) as any}>
 {documentTypes[doc.type] || doc.type}
 </Badge>
 </TableCell>
 <TableCell>{doc.organization?.short_name || doc.organization?.name || '-'}</TableCell>
 <TableCell>
 {doc.start_year && doc.end_year
 ? (doc.start_year === doc.end_year ? doc.start_year : `${doc.start_year}-${doc.end_year}`)
 : (doc.start_year || doc.year || doc.performancePeriod?.year || '-')}
 </TableCell>
 <TableCell>
 {doc.file_path ? (
 <div className="flex items-center gap-1.5">
 <a
 href={`/planning/documents/${doc.id}/preview`}
 target="_blank"
 rel="noreferrer"
 className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 px-2.5 py-1 rounded-md transition border border-emerald-200 dark:border-emerald-800"
 title="Lihat berkas naskah dokumen"
 >
 <Eye className="size-3.5" />
 <span>Lihat</span>
 </a>
 <a
 href={`/planning/documents/${doc.id}/download`}
 target="_blank"
 rel="noreferrer"
 className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground p-1 hover:bg-muted rounded transition"
 title="Unduh berkas"
 >
 <Download className="size-3.5" />
 </a>
 </div>
 ) : (
 <button
 type="button"
 onClick={() => openUpload(doc)}
 className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 px-2.5 py-1 rounded-md transition border border-amber-200 dark:border-amber-800 cursor-pointer"
 title="Belum ada berkas fisik. Klik untuk mengunggah."
 >
 <Upload className="size-3.5" />
 <span>Unggah</span>
 </button>
 )}
 </TableCell>
 <TableCell>
     <StatusBadge status={doc.status} />
 </TableCell>
 <TableCell className="text-right">
 {(doc.file_path || !doc.is_locked) ? (
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
 <span className="sr-only">Buka menu aksi</span>
 <MoreVertical className="size-4" />
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end" className="w-48">
 {doc.file_path && (
 <>
 <DropdownMenuItem asChild className="cursor-pointer">
 <a href={`/planning/documents/${doc.id}/preview`} target="_blank" rel="noreferrer">
 <Eye className="mr-2 size-4" />
 <span>Lihat Berkas</span>
 </a>
 </DropdownMenuItem>
 <DropdownMenuItem asChild className="cursor-pointer">
 <a href={`/planning/documents/${doc.id}/download`} target="_blank" rel="noreferrer">
 <Download className="mr-2 size-4" />
 <span>Unduh Berkas</span>
 </a>
 </DropdownMenuItem>
 </>
 )}
 {!doc.is_locked && (
 <>
 <DropdownMenuItem onClick={() => openUpload(doc)} className="cursor-pointer">
 <Upload className="mr-2 size-4" />
 <span>{doc.file_path ? 'Ganti Berkas' : 'Unggah Berkas'}</span>
 </DropdownMenuItem>
 {doc.status === 'draft' && (
 <DropdownMenuItem onClick={() => handleAction(doc.id, 'submit')} className="cursor-pointer text-blue-600 focus:text-blue-600">
 <CheckCircle2 className="mr-2 size-4" />
 <span>Ajukan</span>
 </DropdownMenuItem>
 )}
 {canApprove && (doc.status === 'review' || doc.status === 'draft') && (
 <DropdownMenuItem onClick={() => handleAction(doc.id, 'approve')} className="cursor-pointer text-green-600 focus:text-green-600">
 <CheckCircle2 className="mr-2 size-4 text-success" />
 <span>Setujui</span>
 </DropdownMenuItem>
 )}
 {canLock && doc.status === 'approved' && (
 <DropdownMenuItem onClick={() => handleAction(doc.id, 'lock')} className="cursor-pointer text-amber-600 focus:text-amber-600">
 <LockKeyhole className="mr-2 size-4 text-warning" />
 <span>Kunci Dokumen</span>
 </DropdownMenuItem>
 )}
 <DropdownMenuItem onClick={() => openEdit(doc)} className="cursor-pointer">
 <Pencil className="mr-2 size-4" />
 <span>Edit Dokumen</span>
 </DropdownMenuItem>
 <DropdownMenuSeparator />
 <DropdownMenuItem onClick={() => handleDelete(doc.id)} className="cursor-pointer text-destructive focus:text-destructive">
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
 ) : (
 <TableEmptyRow
 colSpan={9}
 title="Belum Ada Dokumen Perencanaan"
 description="Belum ada dokumen perencanaan (Renstra / Renja / Perjanjian Kinerja) untuk filter yang dipilih."
 />
 )}
 </TableBody>
 </Table>
 </div>

                    <TablePagination
                        pagination={{
                            from: documents.meta?.from ?? documents.from,
                            to: documents.meta?.to ?? documents.to,
                            total: documents.meta?.total ?? documents.total ?? documents.data.length,
                            per_page: Number((documents as any).per_page ?? (filters as any).per_page ?? 25),
                            links: Array.isArray(documents.links) ? documents.links : documents.meta?.links,
                        }}
                        perPage={Number((documents as any).per_page ?? (filters as any).per_page ?? 25)}
                        onPerPageChange={(newPerPage) => handleFilterChange('per_page', String(newPerPage))}
                        itemName="dokumen"
                        className="mt-6 rounded-lg border border-border bg-white dark:bg-card"
                    />
 </CardContent>
 </Card>
 </div>

 <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
 <DialogContent className={cn('w-full', isUploadMode ? 'sm:max-w-md' : 'sm:max-w-4xl')}>
 <form autoComplete="off" noValidate onSubmit={handleSubmit}>
 <DialogHeader>
 <DialogTitle>
 {isUploadMode
 ? 'Upload Dokumen'
 : editingId ? 'Edit Dokumen' : 'Tambah Dokumen'}
 </DialogTitle>
 </DialogHeader>

 				{isUploadMode ? (
					<div className="grid gap-4 py-4">
						{editingDoc?.file_path && (
							<div className="flex items-center justify-between p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 text-xs">
								<div className="flex items-center gap-2 truncate">
									<FileText className="size-4 text-emerald-600 shrink-0" />
									<span className="truncate font-medium text-emerald-900 dark:text-emerald-200">
										{editingDoc.file_path.split('/').pop()}
									</span>
								</div>
								<a
									href={`/planning/documents/${editingDoc.id}/preview`}
									target="_blank"
									rel="noreferrer"
									className="text-emerald-700 dark:text-emerald-300 hover:underline flex items-center gap-1 font-medium"
								>
									<Eye className="size-3.5" /> Lihat Berkas
								</a>
							</div>
						)}
						<div className="grid gap-2">
							<Label htmlFor="file">Berkas Fisik (Format PDF - Maks. 20MB)</Label>
							<Input
								id="file"
								type="file"
								accept=".pdf"
								onChange={(e) => setData('file', e.target.files?.[0] || null)}
							/>
							<p className="text-xs text-muted-foreground">
								{editingDoc?.file_path
									? 'Pilih berkas PDF baru untuk mengganti berkas fisik yang tersimpan.'
									: 'Pilih naskah dokumen resmi berformat PDF (Maks. 20MB).'}
							</p>
							{errors.file && <p className="text-sm text-destructive">{errors.file}</p>}
						</div>
					</div>
				) : (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
 <div className="grid gap-2 md:col-span-2">
 <Label htmlFor="title">Judul</Label>
 <Input
 id="title"
 placeholder="cth: Rencana Strategis (Renstra) Dinas 2025-2029"
 value={data.title}
 onChange={(e) => setData('title', e.target.value)}
 />
 {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
 </div>

 <div className="grid gap-2">
 <Label htmlFor="type">Jenis Dokumen</Label>
 <SelectNative
 id="type"
 value={data.type}
 onChange={(e) => setData('type', e.target.value)}
 >
 <option value="">Pilih Jenis</option>
 {Object.entries(documentTypes).map(([key, value]) => (
 <option key={key} value={key}>{value}</option>
 ))}
 </SelectNative>
 {errors.type && <p className="text-sm text-destructive">{errors.type}</p>}
 </div>

 <div className="grid gap-2">
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
 {errors.organization_id && <p className="text-sm text-destructive">{errors.organization_id}</p>}
 </div>

 <div className="grid gap-2">
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
 {errors.performance_period_id && <p className="text-sm text-destructive">{errors.performance_period_id}</p>}
 </div>

 <div className="grid gap-2">
 <Label htmlFor="issued_at">Tanggal Terbit</Label>
 <Input
 id="issued_at"
 type="date"
 placeholder="Pilih tanggal terbit"
 value={data.issued_at}
 onChange={(e) => setData('issued_at', e.target.value)}
 />
 {errors.issued_at && <p className="text-sm text-destructive">{errors.issued_at}</p>}
 </div>

 <div className="grid gap-2">
 <Label htmlFor="document_number">No. Dokumen</Label>
 <Input
 id="document_number"
 placeholder="cth: PERDA No. 1 Tahun 2025"
 value={data.document_number}
 onChange={(e) => setData('document_number', e.target.value)}
 />
 {errors.document_number && <p className="text-sm text-destructive">{errors.document_number}</p>}
 </div>

 <div className="grid gap-2">
 <Label htmlFor="document_year">Tahun Dokumen</Label>
 <Input
 id="document_year"
 type="text"
 placeholder="cth: 2025 atau 2025-2029"
 value={data.document_year}
 onChange={(e) => setData('document_year', e.target.value)}
 />
 <p className="text-xs text-muted-foreground">
 Gunakan angka tahun (cth: 2025). Jika memakai rentang tahun gunakan tanda - tanpa spasi (cth: 2025-2029).
 </p>
 {errors.document_year && <p className="text-sm text-destructive">{errors.document_year}</p>}
 {errors.start_year && <p className="text-sm text-destructive">{errors.start_year}</p>}
 {errors.end_year && <p className="text-sm text-destructive">{errors.end_year}</p>}
 </div>

 <div className="grid gap-2 md:col-span-2">
 <Label htmlFor="description">Deskripsi</Label>
 <Textarea
 id="description"
 placeholder="Keterangan atau uraian dokumen perencanaan..."
 value={data.description}
 onChange={(e) => setData('description', e.target.value)}
 rows={2}
 />
 {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
 </div>

 <div className="grid gap-2 md:col-span-2 border-t pt-4 mt-2">
 <Label htmlFor="doc-file" className="font-semibold flex items-center justify-between">
 <span>Berkas Fisik Dokumen (Format PDF - Maks. 20MB)</span>
 {editingDoc?.file_path && (
 <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
 <CheckCircle2 className="size-3.5" /> Berkas telah terunggah
 </span>
 )}
 </Label>

 {editingDoc?.file_path && (
 <div className="flex items-center justify-between p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 text-xs">
 <div className="flex items-center gap-2 truncate">
 <FileText className="size-4 text-emerald-600 shrink-0" />
 <span className="truncate font-medium text-emerald-900 dark:text-emerald-200">
 {editingDoc.file_path.split('/').pop()}
 </span>
 </div>
 <div className="flex items-center gap-3 shrink-0">
 <a
 href={`/planning/documents/${editingDoc.id}/preview`}
 target="_blank"
 rel="noreferrer"
 className="text-emerald-700 dark:text-emerald-300 hover:underline flex items-center gap-1 font-medium"
 >
 <Eye className="size-3.5" /> Lihat Berkas
 </a>
 <a
 href={`/planning/documents/${editingDoc.id}/download`}
 target="_blank"
 rel="noreferrer"
 className="text-emerald-700 dark:text-emerald-300 hover:underline flex items-center gap-1 font-medium"
 >
 <Download className="size-3.5" /> Unduh
 </a>
 </div>
 </div>
 )}

 <Input
 id="doc-file"
 type="file"
 accept=".pdf"
 onChange={(e) => setData('file', e.target.files?.[0] || null)}
 />
 <p className="text-xs text-muted-foreground">
 {editingDoc?.file_path
 ? 'Pilih berkas PDF baru jika Anda ingin mengganti dokumen fisik yang tersimpan. Kosongkan jika berkas tetap sama.'
 : 'Unggah naskah dokumen resmi dalam format PDF (Maks. 20MB).'}
 </p>
 {errors.file && <p className="text-sm text-destructive">{errors.file}</p>}
 </div>
 </div>
 )}

 <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
 <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
 Batal
 </Button>
 <Button type="submit" disabled={processing}>
 Simpan
 </Button>
 </DialogFooter>
 </form>
 </DialogContent>
 </Dialog>

 <ConfirmDialog
 open={deleteDocId !== null}
 onOpenChange={(open) => !open && setDeleteDocId(null)}
 title="Hapus Dokumen Perencanaan"
 description="Apakah Anda yakin ingin menghapus dokumen ini? Tindakan ini tidak dapat dibatalkan."
 confirmText="Hapus"
 variant="destructive"
 onConfirm={handleConfirmDelete}
 />

 <ConfirmDialog
 open={actionDocConfirm !== null}
 onOpenChange={(open) => !open && setActionDocConfirm(null)}
 title="Konfirmasi Tindakan Dokumen"
 description={`Apakah Anda yakin ingin ${actionDocConfirm?.label} dokumen ini?`}
 confirmText="Lanjutkan"
 variant="default"
 onConfirm={handleConfirmAction}
 />
 </AuthenticatedLayout>
 );
}
