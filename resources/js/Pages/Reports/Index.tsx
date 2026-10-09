import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/Components/ui/dialog';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { SelectNative } from '@/Components/ui/select-native';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/Components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import TablePagination from '@/Components/TablePagination';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import React, { useState, useMemo } from 'react';
import {
    AlertCircle,
    Building2,
    Calendar,
    CheckCircle2,
    Download,
    Eye,
    FileCheck2,
    FileText,
    Filter,
    Loader2,
    Pencil,
    Plus,
    Search,
    Trash2,
    TrendingUp,
    Upload,
    XCircle,
} from 'lucide-react';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface PemdaDocItem {
    no: number;
    id: number | null;
    year: number;
    jenis_dokumen: string;
    file_name: string;
    status: 'Tersedia' | 'Belum Tersedia';
    has_file: boolean;
    file_path: string | null;
    tanggal_upload: string;
}

interface KartuUtama {
    total_opd: number;
    lkip_tersedia: number;
    belum_tersedia: number;
    persentase_kelengkapan: number;
}

interface OpdMatriksItem {
    no: number;
    organization_id: number;
    perangkat_daerah: string;
    tahun: number;
    file_lkip: string;
    status: 'Tersedia' | 'Belum Tersedia';
    has_file: boolean;
    tanggal_upload: string;
    doc_id: number | null;
}

interface Props extends PageProps {
    selected_year: number;
    available_years: number[];
    pemda_documents: PemdaDocItem[];
    kartu_utama: KartuUtama;
    matriks: OpdMatriksItem[];
    can_upload: boolean;
    is_provincial_admin?: boolean;
    accessible_organization_ids?: number[];
    user_organization_id?: number | null;
}

interface UploadModalState {
    target_type: 'pemda' | 'opd';
    organization_id?: number | null;
    target_name: string;
    year: number;
    existing_file?: string | null;
}

interface DeleteModalState {
    id: number;
    title: string;
    target_name: string;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ReportsIndex({
    selected_year,
    available_years,
    pemda_documents,
    kartu_utama,
    matriks,
    can_upload,
    is_provincial_admin = false,
    accessible_organization_ids = [],
}: Props) {
    const { flash } = usePage().props as { flash: { success?: string | null; error?: string | null } };

    // State Filter & Search
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'Tersedia' | 'Belum Tersedia'>('all');
    const [activeTab, setActiveTab] = useState<'opd' | 'pemda'>('opd');

    // Modals State
    const [uploadModal, setUploadModal] = useState<UploadModalState | null>(null);
    const [deleteModal, setDeleteModal] = useState<DeleteModalState | null>(null);

    const uploadForm = useForm<{
        target_type: 'pemda' | 'opd';
        organization_id: string | number;
        year: number;
        file: File | null;
    }>({
        target_type: 'pemda',
        organization_id: '',
        year: selected_year,
        file: null,
    });

    const deleteForm = useForm();

    const handleYearChange = (newYear: number) => {
        router.get(
            route('reports.index'),
            { year: newYear },
            { preserveState: true, replace: true }
        );
    };

    // Filter Matriks OPD berdasarkan search query dan status
    const filteredMatriks = useMemo(() => {
        return matriks.filter((item) => {
            const matchesSearch = item.perangkat_daerah.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [matriks, searchQuery, statusFilter]);

    const [opdPage, setOpdPage] = useState(1);
    const [opdPerPage, setOpdPerPage] = useState(25);
    const totalOpd = filteredMatriks.length;
    const lastOpdPage = Math.max(1, Math.ceil(totalOpd / opdPerPage));
    const safeOpdPage = Math.min(opdPage, lastOpdPage);
    const fromOpd = totalOpd > 0 ? (safeOpdPage - 1) * opdPerPage + 1 : 0;
    const toOpd = totalOpd > 0 ? Math.min(safeOpdPage * opdPerPage, totalOpd) : 0;
    const paginatedMatriks = filteredMatriks.slice((safeOpdPage - 1) * opdPerPage, safeOpdPage * opdPerPage);

    const [pemdaPage, setPemdaPage] = useState(1);
    const [pemdaPerPage, setPemdaPerPage] = useState(25);
    const totalPemda = pemda_documents.length;
    const lastPemdaPage = Math.max(1, Math.ceil(totalPemda / pemdaPerPage));
    const safePemdaPage = Math.min(pemdaPage, lastPemdaPage);
    const fromPemda = totalPemda > 0 ? (safePemdaPage - 1) * pemdaPerPage + 1 : 0;
    const toPemda = totalPemda > 0 ? Math.min(safePemdaPage * pemdaPerPage, totalPemda) : 0;
    const paginatedPemda = pemda_documents.slice((safePemdaPage - 1) * pemdaPerPage, safePemdaPage * pemdaPerPage);

    const openUploadModal = (
        target_type: 'pemda' | 'opd',
        organization_id: number | null,
        target_name: string,
        year: number,
        existing_file?: string | null
    ) => {
        uploadForm.reset();
        uploadForm.setData({
            target_type,
            organization_id: organization_id || '',
            year,
            file: null,
        });
        setUploadModal({
            target_type,
            organization_id,
            target_name,
            year,
            existing_file,
        });
    };

    const handleUploadSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        uploadForm.post(route('reports.upload'), {
            forceFormData: true,
            onSuccess: () => {
                setUploadModal(null);
                uploadForm.reset();
            },
        });
    };

    const handleDeleteSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!deleteModal) return;

        deleteForm.delete(route('reports.destroy', deleteModal.id), {
            onSuccess: () => {
                setDeleteModal(null);
            },
        });
    };

    return (
        <AuthenticatedLayout header="Pelaporan Kinerja">
            <Head title="Pelaporan Kinerja (LKIP)" />

            <div className="py-6 space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Flash Messages */}
                {flash?.success && (
                    <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 text-sm text-emerald-800 dark:text-emerald-300 shadow-xs">
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                        <span className="font-medium">{flash.success}</span>
                    </div>
                )}
                {flash?.error && (
                    <div className="flex items-center gap-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-4 text-sm text-rose-800 dark:text-rose-300 shadow-xs">
                        <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
                        <span className="font-medium">{flash.error}</span>
                    </div>
                )}

                {/* ─── Header Toolbar ────────────────────────────────────────── */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-card p-5 rounded-xl border shadow-xs">
                    <div className="flex items-center gap-3.5">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <FileCheck2 className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-foreground">
                                Pelaporan Kinerja (LKIP)
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Menyediakan, mengelola, dan memantau dokumen Laporan Kinerja Instansi Pemerintah tahun {selected_year}.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-lg border">
                            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Tahun:</span>
                            <SelectNative
                                value={selected_year}
                                onChange={(e) => handleYearChange(Number(e.target.value))}
                                className="h-8 py-0 px-2 font-bold text-sm bg-background border-none shadow-none w-24"
                            >
                                {available_years.map((yr) => (
                                    <option key={yr} value={yr}>
                                        {yr}
                                    </option>
                                ))}
                            </SelectNative>
                        </div>

                        {can_upload && is_provincial_admin && (
                            <Button
                                onClick={() => openUploadModal('pemda', null, 'Pemerintah Daerah (Provinsi Papua Barat)', selected_year)}
                                className="gap-2 shadow-xs"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Upload LKIP Pemda</span>
                            </Button>
                        )}
                    </div>
                </div>

                {/* ─── Tabs Navigation ───────────────────────────────────────── */}
                <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'opd' | 'pemda')} className="space-y-6">
                    <TabsList className="bg-muted/80 p-1 rounded-xl h-auto gap-1">
                        <TabsTrigger
                            value="opd"
                            className="rounded-lg px-4 py-2 text-sm font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all gap-2"
                        >
                            <Building2 className="h-4 w-4" />
                            <span>LKIP Perangkat Daerah (OPD)</span>
                            <Badge variant="secondary" className="ml-1 text-xs">
                                {kartu_utama.persentase_kelengkapan}% Lengkap
                            </Badge>
                        </TabsTrigger>
                        <TabsTrigger
                            value="pemda"
                            className="rounded-lg px-4 py-2 text-sm font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all gap-2"
                        >
                            <FileText className="h-4 w-4" />
                            <span>LKIP Pemerintah Daerah</span>
                            <Badge variant="secondary" className="ml-1 text-xs">
                                {pemda_documents.filter((d) => d.has_file).length} Tersedia
                            </Badge>
                        </TabsTrigger>
                    </TabsList>

                    {/* ═════════════════════════════════════════════════════════════
                        TAB 1: LKIP PERANGKAT DAERAH (OPD)
                    ═════════════════════════════════════════════════════════════ */}
                    <TabsContent value="opd" className="space-y-6 mt-0">

                        {/* Kartu Utama (KPI Ringkasan Statistik) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Card className="shadow-xs border hover:border-primary/40 transition-colors">
                                <CardContent className="p-5 flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 flex items-center justify-center shrink-0">
                                        <Building2 className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            Total Perangkat Daerah
                                        </p>
                                        <h3 className="text-2xl font-black text-foreground mt-0.5">
                                            {kartu_utama.total_opd} <span className="text-sm font-medium text-muted-foreground">OPD</span>
                                        </h3>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="shadow-xs border hover:border-emerald-500/40 transition-colors">
                                <CardContent className="p-5 flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                        <CheckCircle2 className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            LKIP Tersedia
                                        </p>
                                        <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                                            {kartu_utama.lkip_tersedia} <span className="text-sm font-medium text-muted-foreground">OPD</span>
                                        </h3>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="shadow-xs border hover:border-rose-500/40 transition-colors">
                                <CardContent className="p-5 flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 flex items-center justify-center shrink-0">
                                        <XCircle className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            Belum Tersedia
                                        </p>
                                        <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
                                            {kartu_utama.belum_tersedia} <span className="text-sm font-medium text-muted-foreground">OPD</span>
                                        </h3>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="shadow-xs border hover:border-primary/40 transition-colors">
                                <CardContent className="p-5 flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                        <TrendingUp className="h-6 w-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            Persentase Kelengkapan
                                        </p>
                                        <h3 className="text-2xl font-black text-foreground mt-0.5">
                                            {kartu_utama.persentase_kelengkapan}%
                                        </h3>
                                        <div className="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
                                            <div
                                                className="bg-primary h-full rounded-full transition-all"
                                                style={{ width: `${kartu_utama.persentase_kelengkapan}%` }}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Matriks Dokumen LKIP OPD */}
                        <Card className="shadow-xs border">
                            <CardHeader className="pb-4">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                    <div>
                                        <CardTitle className="text-base font-bold flex items-center gap-2">
                                            <span>Matriks Kelengkapan LKIP Perangkat Daerah</span>
                                            <Badge variant="outline" className="font-normal text-xs">
                                                Tahun {selected_year}
                                            </Badge>
                                        </CardTitle>
                                        <CardDescription className="text-xs mt-1">
                                            Menampilkan status berkas LKIP untuk seluruh OPD pada tahun {selected_year}.
                                        </CardDescription>
                                    </div>

                                    {/* Search & Filter Toolbar */}
                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className="relative w-full sm:w-64">
                                            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                            <Input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="Cari Perangkat Daerah..."
                                                className="h-9 pl-9 text-xs"
                                            />
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                                            <SelectNative
                                                value={statusFilter}
                                                onChange={(e) => setStatusFilter(e.target.value as any)}
                                                className="h-9 text-xs w-36"
                                            >
                                                <option value="all">Semua Status</option>
                                                <option value="Tersedia">Tersedia</option>
                                                <option value="Belum Tersedia">Belum Tersedia</option>
                                            </SelectNative>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="p-0 border-t">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-muted/40">
                                            <TableRow>
                                                <TableHead className="w-12 text-center text-xs font-bold uppercase tracking-wider">No</TableHead>
                                                <TableHead className="text-xs font-bold uppercase tracking-wider">Perangkat Daerah</TableHead>
                                                <TableHead className="w-20 text-center text-xs font-bold uppercase tracking-wider">Tahun</TableHead>
                                                <TableHead className="text-xs font-bold uppercase tracking-wider">File LKIP</TableHead>
                                                <TableHead className="w-28 text-center text-xs font-bold uppercase tracking-wider">Status</TableHead>
                                                <TableHead className="w-32 text-center text-xs font-bold uppercase tracking-wider">Tanggal Upload</TableHead>
                                                <TableHead className="w-44 text-center text-xs font-bold uppercase tracking-wider">Aksi</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paginatedMatriks.map((row, index) => (
                                                <TableRow key={row.organization_id} className="hover:bg-muted/30">
                                                    <TableCell className="text-center font-medium text-xs text-muted-foreground">
                                                        {fromOpd + index}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-semibold text-sm text-foreground">
                                                            {row.perangkat_daerah}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center font-medium text-xs">
                                                        {row.tahun}
                                                    </TableCell>
                                                    <TableCell>
                                                        {row.has_file ? (
                                                            <div className="flex items-center gap-1.5 font-mono text-xs text-foreground/90 max-w-xs truncate" title={row.file_lkip}>
                                                                <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                                                                <span className="truncate">{row.file_lkip}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground text-xs font-mono">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {row.status === 'Tersedia' ? (
                                                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-300 dark:border-emerald-800 gap-1 font-semibold text-xs">
                                                                <CheckCircle2 className="h-3 w-3" />
                                                                Tersedia
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 font-medium text-xs">
                                                                Belum Tersedia
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center text-xs text-muted-foreground">
                                                        {row.tanggal_upload}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            {/* Tombol Lihat Preview */}
                                                            {row.has_file && row.doc_id ? (
                                                                <Button
                                                                    asChild
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 px-2 text-xs gap-1 text-primary hover:text-primary hover:bg-primary/10"
                                                                    title="Lihat Dokumen PDF"
                                                                >
                                                                    <a href={route('reports.preview', row.doc_id)} target="_blank" rel="noopener noreferrer">
                                                                        <Eye className="h-3.5 w-3.5" />
                                                                        <span>Lihat</span>
                                                                    </a>
                                                                </Button>
                                                            ) : null}

                                                            {/* Tombol Upload / Ganti */}
                                                            {can_upload && (is_provincial_admin || accessible_organization_ids.includes(row.organization_id)) && (
                                                                <Button
                                                                    type="button"
                                                                    variant={row.has_file ? 'outline' : 'default'}
                                                                    size="sm"
                                                                    onClick={() => openUploadModal(
                                                                        'opd',
                                                                        row.organization_id,
                                                                        row.perangkat_daerah,
                                                                        row.tahun,
                                                                        row.has_file ? row.file_lkip : null
                                                                    )}
                                                                    className="h-8 px-2.5 text-xs gap-1 shadow-2xs"
                                                                >
                                                                    {row.has_file ? (
                                                                        <>
                                                                            <Pencil className="h-3 w-3" />
                                                                            <span>Ganti</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Upload className="h-3 w-3" />
                                                                            <span>Upload</span>
                                                                        </>
                                                                    )}
                                                                </Button>
                                                            )}

                                                            {/* Tombol Unduh */}
                                                            {row.has_file && row.doc_id && (
                                                                <Button
                                                                    asChild
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-8 px-2 text-xs gap-1"
                                                                    title="Unduh Berkas LKIP"
                                                                >
                                                                    <a href={route('reports.file-download', row.doc_id)}>
                                                                        <Download className="h-3.5 w-3.5 text-muted-foreground" />
                                                                        <span>Unduh</span>
                                                                    </a>
                                                                </Button>
                                                            )}

                                                            {/* Tombol Hapus */}
                                                            {row.has_file && row.doc_id && can_upload && (is_provincial_admin || accessible_organization_ids.includes(row.organization_id)) && (
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => setDeleteModal({
                                                                        id: row.doc_id!,
                                                                        title: row.file_lkip,
                                                                        target_name: row.perangkat_daerah,
                                                                    })}
                                                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                                    title="Hapus Dokumen LKIP"
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}

                                            {filteredMatriks.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                                                        Tidak ada perangkat daerah yang sesuai dengan filter pencarian.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                                <TablePagination
                                    clientSide={true}
                                    from={fromOpd}
                                    to={toOpd}
                                    totalItems={totalOpd}
                                    perPage={opdPerPage}
                                    currentPage={safeOpdPage}
                                    lastPage={lastOpdPage}
                                    itemLabel="perangkat daerah"
                                    onPerPageChange={(val) => {
                                        setOpdPerPage(val);
                                        setOpdPage(1);
                                    }}
                                    onClientPageChange={(p) => setOpdPage(p)}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ═════════════════════════════════════════════════════════════
                        TAB 2: LKIP PEMERINTAH DAERAH
                    ═════════════════════════════════════════════════════════════ */}
                    <TabsContent value="pemda" className="space-y-6 mt-0">
                        <Card className="shadow-xs border">
                            <CardHeader className="pb-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <div>
                                        <CardTitle className="text-base font-bold flex items-center gap-2">
                                            <span>Dokumen LKIP Pemerintah Daerah (Provinsi Papua Barat)</span>
                                        </CardTitle>
                                        <CardDescription className="text-xs mt-1">
                                            Pengelolaan berkas LKIP tingkat Pemerintah Daerah lintas tahun anggaran.
                                        </CardDescription>
                                    </div>

                                    {can_upload && is_provincial_admin && (
                                        <Button
                                            size="sm"
                                            onClick={() => openUploadModal('pemda', null, 'Pemerintah Daerah (Provinsi Papua Barat)', selected_year)}
                                            className="gap-1.5 text-xs shadow-xs"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            <span>Upload LKIP Tahun {selected_year}</span>
                                        </Button>
                                    )}
                                </div>
                            </CardHeader>

                            <CardContent className="p-0 border-t">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-muted/40">
                                            <TableRow>
                                                <TableHead className="w-12 text-center text-xs font-bold uppercase tracking-wider">No</TableHead>
                                                <TableHead className="w-24 text-center text-xs font-bold uppercase tracking-wider">Tahun</TableHead>
                                                <TableHead className="text-xs font-bold uppercase tracking-wider">Jenis Dokumen</TableHead>
                                                <TableHead className="text-xs font-bold uppercase tracking-wider">File Dokumen</TableHead>
                                                <TableHead className="w-28 text-center text-xs font-bold uppercase tracking-wider">Status</TableHead>
                                                <TableHead className="w-32 text-center text-xs font-bold uppercase tracking-wider">Tanggal Upload</TableHead>
                                                <TableHead className="w-44 text-center text-xs font-bold uppercase tracking-wider">Aksi</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paginatedPemda.map((row, index) => (
                                                <TableRow key={row.year} className="hover:bg-muted/30">
                                                    <TableCell className="text-center font-medium text-xs text-muted-foreground">
                                                        {fromPemda + index}
                                                    </TableCell>
                                                    <TableCell className="text-center font-bold text-sm text-foreground">
                                                        {row.year}
                                                    </TableCell>
                                                    <TableCell className="font-semibold text-sm text-foreground">
                                                        {row.jenis_dokumen}
                                                    </TableCell>
                                                    <TableCell>
                                                        {row.has_file ? (
                                                            <div className="flex items-center gap-1.5 font-mono text-xs text-foreground/90 max-w-sm truncate" title={row.file_name}>
                                                                <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                                                                <span className="truncate">{row.file_name}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground text-xs font-mono">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {row.status === 'Tersedia' ? (
                                                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-300 dark:border-emerald-800 gap-1 font-semibold text-xs">
                                                                <CheckCircle2 className="h-3 w-3" />
                                                                Tersedia
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 font-medium text-xs">
                                                                Belum Tersedia
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center text-xs text-muted-foreground">
                                                        {row.tanggal_upload}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            {/* Tombol Lihat Preview */}
                                                            {row.has_file && row.id ? (
                                                                <Button
                                                                    asChild
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 px-2 text-xs gap-1 text-primary hover:text-primary hover:bg-primary/10"
                                                                    title="Lihat Dokumen PDF"
                                                                >
                                                                    <a href={route('reports.preview', row.id)} target="_blank" rel="noopener noreferrer">
                                                                        <Eye className="h-3.5 w-3.5" />
                                                                        <span>Lihat</span>
                                                                    </a>
                                                                </Button>
                                                            ) : null}

                                                            {/* Tombol Upload / Ganti */}
                                                            {can_upload && is_provincial_admin && (
                                                                <Button
                                                                    type="button"
                                                                    variant={row.has_file ? 'outline' : 'default'}
                                                                    size="sm"
                                                                    onClick={() => openUploadModal(
                                                                        'pemda',
                                                                        null,
                                                                        'Pemerintah Daerah (Provinsi Papua Barat)',
                                                                        row.year,
                                                                        row.has_file ? row.file_name : null
                                                                    )}
                                                                    className="h-8 px-2.5 text-xs gap-1 shadow-2xs"
                                                                >
                                                                    {row.has_file ? (
                                                                        <>
                                                                            <Pencil className="h-3 w-3" />
                                                                            <span>Ganti</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Upload className="h-3 w-3" />
                                                                            <span>Upload</span>
                                                                        </>
                                                                    )}
                                                                </Button>
                                                            )}

                                                            {/* Tombol Unduh */}
                                                            {row.has_file && row.id && (
                                                                <Button
                                                                    asChild
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-8 px-2 text-xs gap-1"
                                                                    title="Unduh Berkas LKIP"
                                                                >
                                                                    <a href={route('reports.file-download', row.id)}>
                                                                        <Download className="h-3.5 w-3.5 text-muted-foreground" />
                                                                        <span>Unduh</span>
                                                                    </a>
                                                                </Button>
                                                            )}

                                                            {/* Tombol Hapus */}
                                                            {row.has_file && row.id && can_upload && is_provincial_admin && (
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => setDeleteModal({
                                                                        id: row.id!,
                                                                        title: row.file_name,
                                                                        target_name: `Pemerintah Daerah Tahun ${row.year}`,
                                                                    })}
                                                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                                    title="Hapus Dokumen LKIP"
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                <TablePagination
                                    clientSide={true}
                                    from={fromPemda}
                                    to={toPemda}
                                    totalItems={totalPemda}
                                    perPage={pemdaPerPage}
                                    currentPage={safePemdaPage}
                                    lastPage={lastPemdaPage}
                                    itemLabel="dokumen"
                                    onPerPageChange={(val) => {
                                        setPemdaPerPage(val);
                                        setPemdaPage(1);
                                    }}
                                    onClientPageChange={(p) => setPemdaPage(p)}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* ─── Modal Upload / Ganti Berkas LKIP ──────────────────────── */}
                <Dialog open={!!uploadModal} onOpenChange={(open) => !open && setUploadModal(null)}>
                    <DialogContent className="sm:max-w-xl max-w-xl w-full overflow-x-hidden">
                        <DialogHeader className="min-w-0">
                            <DialogTitle className="flex items-center gap-2 text-base font-bold">
                                <Upload className="h-5 w-5 text-primary shrink-0" />
                                <span>{uploadModal?.existing_file ? 'Ganti Berkas LKIP' : 'Upload Berkas LKIP'}</span>
                            </DialogTitle>
                            <DialogDescription className="text-xs leading-relaxed break-words">
                                Unggah berkas dokumen Laporan Kinerja Instansi Pemerintah (LKIP) dalam format PDF.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleUploadSubmit} className="space-y-4 pt-2 min-w-0 w-full">
                            <div className="space-y-2 text-xs bg-muted/60 p-3.5 rounded-lg border text-foreground min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2 min-w-0">
                                    <span className="text-muted-foreground shrink-0 w-28">Instansi:</span>
                                    <strong className="font-semibold text-foreground break-words flex-1">{uploadModal?.target_name}</strong>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
                                    <span className="text-muted-foreground shrink-0 w-28">Tahun Anggaran:</span>
                                    <strong className="font-semibold text-foreground">{uploadModal?.year}</strong>
                                </div>
                                {uploadModal?.existing_file && (
                                    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2 min-w-0 pt-2 border-t border-border/60">
                                        <span className="text-muted-foreground shrink-0 w-28">Berkas Saat Ini:</span>
                                        <span className="font-mono text-foreground/90 break-all font-medium flex-1">{uploadModal.existing_file}</span>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1.5 min-w-0">
                                <Label htmlFor="lkip-file" className="text-xs font-semibold">
                                    Pilih Berkas PDF LKIP <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="lkip-file"
                                    type="file"
                                    accept=".pdf,application/pdf"
                                    onChange={(e) => uploadForm.setData('file', e.target.files?.[0] || null)}
                                    required
                                    className="text-xs file:cursor-pointer cursor-pointer w-full"
                                />
                                <p className="text-[11px] text-muted-foreground">
                                    Format berkas harus PDF dengan ukuran maksimal 25 MB.
                                </p>
                                {uploadForm.errors.file && (
                                    <p className="text-xs text-destructive font-medium">{uploadForm.errors.file}</p>
                                )}
                            </div>

                            <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-3 border-t sm:justify-end">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setUploadModal(null)}
                                    disabled={uploadForm.processing}
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={uploadForm.processing || !uploadForm.data.file}
                                    className="gap-1.5"
                                >
                                    {uploadForm.processing ? (
                                        <>
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            <span>Menyimpan...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="h-3.5 w-3.5" />
                                            <span>Simpan Dokumen</span>
                                        </>
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* ─── Modal Konfirmasi Hapus Berkas LKIP ──────────────────────── */}
                <Dialog open={!!deleteModal} onOpenChange={(open) => !open && setDeleteModal(null)}>
                    <DialogContent className="sm:max-w-md max-w-md w-full overflow-x-hidden">
                        <DialogHeader className="min-w-0">
                            <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-base">
                                <Trash2 className="h-5 w-5 shrink-0" />
                                <span>Hapus Berkas LKIP?</span>
                            </DialogTitle>
                            <DialogDescription className="text-xs pt-1 break-words">
                                Dokumen <strong className="text-foreground break-all">{deleteModal?.title}</strong> untuk <strong className="text-foreground">{deleteModal?.target_name}</strong> akan dihapus permanen dari sistem penyimpanan.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleDeleteSubmit} className="min-w-0 w-full">
                            <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-4 border-t sm:justify-end">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setDeleteModal(null)}
                                    disabled={deleteForm.processing}
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    variant="destructive"
                                    size="sm"
                                    disabled={deleteForm.processing}
                                    className="gap-1.5"
                                >
                                    {deleteForm.processing ? (
                                        <>
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            <span>Menghapus...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="h-3.5 w-3.5" />
                                            <span>Hapus Berkas</span>
                                        </>
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

            </div>
        </AuthenticatedLayout>
    );
}