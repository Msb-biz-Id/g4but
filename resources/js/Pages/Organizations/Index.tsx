import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import { Filter, MoreVertical, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { PageProps } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import ConfirmDialog from '@/Components/ConfirmDialog';
import { toast } from 'sonner';

interface Props extends PageProps {
    organizations: {
        data: Array<{
            id: number;
            code: string;
            name: string;
            short_name?: string | null;
            type: string;
            is_active: boolean;
            units_count: number;
            users_count: number;
            parent: { code: string; name: string } | null;
        }>;
        links: Array<{ url: string | null; label: string; active: boolean }>;
        from: number;
        to: number;
        total: number;
        per_page?: number;
    };
    filters: { search?: string; type?: string; per_page?: number };
}

const typeLabels: Record<string, string> = {
    opd: 'OPD Induk',
    sekretariat: 'Sekretariat',
    bidang: 'Bidang',
};

export default function OrganizationsIndex({ auth, organizations, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [type, setType] = useState(filters.type ?? '');
    const [perPage, setPerPage] = useState<number>(Number(organizations.per_page ?? filters.per_page ?? 25));
    const [deleteOrgTarget, setDeleteOrgTarget] = useState<{ id: number; name: string } | null>(null);

    const roles = auth.user?.roles ?? [];
    const isOpdAdmin = roles.some((r: any) => {
        const name = typeof r === 'string' ? r : r?.name;
        return name === 'Super Admin' || name === 'Admin OPD';
    });
    const userOrgIds = (auth.user?.organizations ?? []).map((o) => o.id);

    // Hanya Super Admin & Admin OPD atau yang memiliki permission create yang boleh menambah master organisasi baru
    const canCreate = isOpdAdmin || (auth.user?.permissions ?? []).includes('organization:create');

    // Edit boleh jika Admin OPD ATAU jika baris organisasi adalah unit milik user yang sedang login
    const canEdit = (orgId: number) => isOpdAdmin || userOrgIds.includes(orgId);

    const confirmDeleteOrg = () => {
        if (!deleteOrgTarget) return;
        router.delete(route('organizations.destroy', deleteOrgTarget.id), {
            onSuccess: () => {
                toast.success(`Organisasi "${deleteOrgTarget.name}" berhasil dihapus.`);
                setDeleteOrgTarget(null);
            },
            onError: (errs: any) => {
                toast.error(errs?.error || 'Gagal menghapus organisasi.');
            },
        });
    };

    const isMounted = useRef(false);
    useEffect(() => {
        if (!isMounted.current) { isMounted.current = true; return; }
        const timer = setTimeout(() => {
            router.get(
                route('organizations.index'),
                { search, type, per_page: perPage },
                { preserveState: true, replace: true },
            );
        }, 300);
        return () => clearTimeout(timer);
    }, [search, type, perPage]);

    const hasFilters = Boolean(search || type);
    const resetFilters = () => {
        setSearch('');
        setType('');
        setPerPage(25);
    };

    return (
        <AuthenticatedLayout
            header="Organisasi"
        >
            <Head title="Organisasi" />
            <div className="space-y-4">
                {/* Header Bar */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                            Perangkat Daerah & Organisasi
                        </h1>
                        <p className="text-xs text-muted-foreground sm:text-sm">
                            Kelola struktur perangkat daerah, dinas, badan, dan unit kerja.
                        </p>
                    </div>
                    {canCreate && (
                        <Button asChild className="w-full sm:w-auto justify-center">
                            <Link href={route('organizations.create')}>
                                <Plus className="mr-2 h-4 w-4" />
                                Tambah Organisasi
                            </Link>
                        </Button>
                    )}
                </div>

                {/* Filter Bar */}
                <Card>
                    <CardContent className="p-4 sm:p-5">
                        <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                <Filter className="h-4 w-4 text-primary" />
                                <span>Filter Organisasi</span>
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
                            <div className="relative sm:col-span-2 lg:col-span-8">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                <Input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Cari nama atau kode perangkat daerah..."
                                    className="pl-9 w-full"
                                />
                            </div>
                            <div className="lg:col-span-4">
                                <SelectNative
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                    className="w-full"
                                >
                                    <option value="">Semua Tipe Organisasi</option>
                                    {Object.entries(typeLabels).map(
                                        ([key, label]) => (
                                            <option key={key} value={key}>
                                                {label}
                                            </option>
                                        ),
                                    )}
                                </SelectNative>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Table Card */}
                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-10">No</TableHead>
                                            <TableHead>Kode</TableHead>
                                            <TableHead>Nama</TableHead>
                                            <TableHead>Tipe</TableHead>
                                            <TableHead className="text-center">
                                                Unit
                                            </TableHead>
                                            <TableHead className="text-center">
                                                Pengguna
                                            </TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="w-14 sm:w-16 text-right font-semibold">
                                                Aksi
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {organizations.data.length === 0 && (
                                            <TableEmptyRow
                                                colSpan={8}
                                                title="Belum Ada Organisasi / OPD"
                                                description="Tidak ada data organisasi yang sesuai dengan pencarian atau filter yang dipilih."
                                            />
                                        )}
                                        {organizations.data.map((org, index) => (
                                            <TableRow key={org.id}>
                                                <TableCell className="text-sm text-gray-500 tabular-nums">
                                                    {(organizations.from ?? 1) + index}
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    {org.code}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="font-medium text-gray-900 dark:text-gray-100">{org.name}</span>
                                                        {org.short_name && (
                                                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-slate-50 dark:bg-slate-800">
                                                                {org.short_name}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    {org.parent && (
                                                        <div className="text-xs text-gray-500 mt-0.5">
                                                            Induk: {org.parent.code} - {org.parent.name}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {typeLabels[org.type] ?? org.type}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {org.units_count}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {org.users_count}
                                                </TableCell>
                                                <TableCell>
                                                    {org.is_active ? (
                                                        <Badge variant="success">
                                                            Aktif
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="destructive">
                                                            Nonaktif
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {!canEdit(org.id) && !isOpdAdmin ? (
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
                                                                        <span className="sr-only">Buka menu aksi</span>
                                                                        <MoreVertical className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-40">
                                                                    {canEdit(org.id) && (
                                                                        <DropdownMenuItem asChild className="cursor-pointer">
                                                                            <Link href={route('organizations.edit', org.id)}>
                                                                                <Pencil className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                                                                                <span>Edit</span>
                                                                            </Link>
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                    {isOpdAdmin && (
                                                                        <>
                                                                            {canEdit(org.id) && <DropdownMenuSeparator />}
                                                                            <DropdownMenuItem
                                                                                onClick={() => setDeleteOrgTarget({ id: org.id, name: org.name })}
                                                                                className="cursor-pointer text-destructive focus:text-destructive"
                                                                            >
                                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                                <span>Hapus</span>
                                                                            </DropdownMenuItem>
                                                                        </>
                                                                    )}
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

                            {/* Pagination */}
                            <TablePagination
                                pagination={organizations}
                                perPage={perPage}
                                onPerPageChange={(newPerPage) => {
                                    setPerPage(newPerPage);
                                    router.get(
                                        route('organizations.index'),
                                        { search, type, per_page: newPerPage },
                                        { preserveState: true, replace: true }
                                    );
                                }}
                                itemName="organisasi"
                            />
                        </CardContent>
                    </Card>
                </div>

            <ConfirmDialog
                open={deleteOrgTarget !== null}
                onOpenChange={(open) => !open && setDeleteOrgTarget(null)}
                title="Hapus Organisasi?"
                description={
                    <span>
                        Apakah Anda yakin ingin menghapus organisasi <strong>&quot;{deleteOrgTarget?.name}&quot;</strong>?
                        Pastikan organisasi ini tidak lagi memiliki unit kerja turunan, pengguna aktif, atau dokumen perencanaan yang terdaftar.
                    </span>
                }
                confirmText="Hapus Organisasi"
                cancelText="Batal"
                onConfirm={confirmDeleteOrg}
                onCancel={() => setDeleteOrgTarget(null)}
            />
        </AuthenticatedLayout>
    );
}