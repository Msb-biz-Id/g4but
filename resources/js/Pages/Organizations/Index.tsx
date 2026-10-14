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
import PageHeader from '@/Components/Dashboard/PageHeader';
import StatusBadge from '@/Components/Dashboard/StatusBadge';
import ActionMenuDropdown from '@/Components/Dashboard/ActionMenuDropdown';
import { Building2, Filter, MoreVertical, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
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
            <div className="space-y-6">
                {/* Standard Page Header */}
                <PageHeader
                    title="Perangkat Daerah & Organisasi"
                    description="Kelola struktur perangkat daerah, dinas, badan, dan unit kerja Pemerintah Provinsi Papua Barat."
                    breadcrumbs={[
                        { label: 'Master Data' },
                        { label: 'Organisasi' },
                    ]}
                    action={canCreate ? (
                        <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm">
                            <Link href={route('organizations.create')}>
                                <Plus className="mr-2 h-4 w-4" />
                                Tambah Organisasi
                            </Link>
                        </Button>
                    ) : undefined}
                />

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
                                                    <StatusBadge status={org.is_active ? 'aktif' : 'nonaktif'} />
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {!canEdit(org.id) && !isOpdAdmin ? (
                                                        <span className="text-muted-foreground text-xs select-none">
                                                            -
                                                        </span>
                                                    ) : (
                                                        <ActionMenuDropdown
                                                            align="end"
                                                            items={[
                                                                ...(canEdit(org.id) ? [{
                                                                    label: 'Edit',
                                                                    href: route('organizations.edit', org.id),
                                                                    icon: <Pencil className="h-3.5 w-3.5 text-primary" />,
                                                                }] : []),
                                                                ...(isOpdAdmin ? [{
                                                                    label: 'Hapus',
                                                                    onClick: () => setDeleteOrgTarget({ id: org.id, name: org.name }),
                                                                    icon: <Trash2 className="h-3.5 w-3.5 text-destructive" />,
                                                                    variant: 'destructive' as const,
                                                                    separator: canEdit(org.id),
                                                                }] : []),
                                                            ]}
                                                        />
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