import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Badge } from '@/Components/ui/badge';
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
import { Button } from '@/Components/ui/button';
import { Filter, Plus, Search, X } from 'lucide-react';
import { PageProps } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import PageHeader from '@/Components/Dashboard/PageHeader';
import StatusBadge from '@/Components/Dashboard/StatusBadge';

interface Props extends PageProps {
    indicators: {
        data: Array<{
            id: number;
            code: string;
            name: string;
            type: string;
            direction: string;
            frequency: string;
            is_iku: boolean;
            status: string;
            current_version: {
                version_number: number;
                name: string;
            } | null;
            measurement_unit: {
                code: string;
                name: string;
                symbol: string | null;
            } | null;
            owner_organization: { id?: number; code: string; name: string } | null;
        }>;
        links: Array<{ url: string | null; label: string; active: boolean }>;
        from: number | null;
        to?: number | null;
        total?: number;
        per_page?: number;
    };
    filters: { search?: string; status?: string; organization_id?: string; per_page?: number };
    organizations: Array<{ id: number; code: string; name: string }>;
    isOpdAdmin?: boolean;
    accessibleOrgIds?: number[];
}

const directionLabels: Record<string, string> = {
    higher_is_better: 'Semakin tinggi semakin baik',
    lower_is_better: 'Semakin rendah semakin baik',
    exact: 'Nilai pasti',
    binary: 'Ya/Tidak',
    custom: 'Kustom',
};

const statusLabels: Record<string, { text: string; variant: 'secondary' | 'success' | 'warning' }> = {
    draft: { text: 'Draft', variant: 'secondary' },
    active: { text: 'Aktif', variant: 'success' },
    archived: { text: 'Arsip', variant: 'warning' },
};

export default function IndicatorsIndex({
    auth,
    indicators,
    filters,
    organizations,
    isOpdAdmin = false,
    accessibleOrgIds = [],
}: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status ?? '');
    const [organizationId, setOrganizationId] = useState(
        filters.organization_id ?? '',
    );
    const [perPage, setPerPage] = useState<number>(Number((indicators as any).per_page ?? filters.per_page ?? 25));

    const permissions = auth.user?.permissions ?? [];
    const canCreate = permissions.includes('indicator:create');
    const canUpdate = permissions.includes('indicator:update');
    const canArchive = permissions.includes('indicator:archive');

    const isMounted = useRef(false);
    useEffect(() => {
        if (!isMounted.current) { isMounted.current = true; return; }
        const timer = setTimeout(() => {
            router.get(
                route('indicators.index'),
                { search, status, organization_id: organizationId, per_page: perPage },
                { preserveState: true, replace: true },
            );
        }, 300);
        return () => clearTimeout(timer);
    }, [search, status, organizationId, perPage]);

    const hasFilters = Boolean(search || status || organizationId);
    const resetFilters = () => {
        setSearch('');
        setStatus('');
        setOrganizationId('');
        setPerPage(25);
    };

    return (
        <AuthenticatedLayout
            header="Indikator Kinerja"
        >
            <Head title="Indikator Kinerja" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-4">
                    {/* Header Bar */}
                    <PageHeader
                        breadcrumbs={[
                            { label: 'Master Data & Pengaturan' },
                            { label: 'Indikator Kinerja' },
                        ]}
                        title="Indikator Kinerja"
                        description="Kelola master data indikator kinerja daerah dan perangkat daerah beserta formulasi dan polarisasi."
                        actions={
                            canCreate ? (
                                <Button asChild className="w-full sm:w-auto justify-center bg-primary text-primary-foreground hover:bg-primary/90">
                                    <Link href={route('indicators.create')}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Tambah Indikator
                                    </Link>
                                </Button>
                            ) : undefined
                        }
                    />

                    {/* Filter Bar */}
                    <Card>
                        <CardContent className="p-4 sm:p-5">
                            <div className="flex items-center justify-between gap-2 mb-3">
                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    <Filter className="h-4 w-4 text-primary" />
                                    <span>Filter Indikator</span>
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
                                <div className="relative sm:col-span-2 lg:col-span-6">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                    <Input
                                        type="text"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Cari kode atau nama indikator..."
                                        className="pl-9 w-full"
                                    />
                                </div>
                                <div className="lg:col-span-3">
                                    <SelectNative
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value)}
                                        className="w-full"
                                    >
                                        <option value="">Semua Status</option>
                                        <option value="draft">Draft</option>
                                        <option value="active">Aktif</option>
                                        <option value="archived">Arsip</option>
                                    </SelectNative>
                                </div>
                                <div className="lg:col-span-3">
                                    <SelectNative
                                        value={organizationId}
                                        onChange={(e) =>
                                            setOrganizationId(e.target.value)
                                        }
                                        className="w-full"
                                    >
                                        <option value="">Semua OPD</option>
                                        {organizations.map((org) => (
                                            <option key={org.id} value={org.id}>
                                                {org.code} - {org.name}
                                            </option>
                                        ))}
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
                                            <TableHead>Indikator</TableHead>
                                            <TableHead>Satuan</TableHead>
                                            <TableHead>Pemilik</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">
                                                Aksi
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {indicators.data.length === 0 && (
                                            <TableEmptyRow
                                                colSpan={7}
                                                title="Belum Ada Indikator Kinerja"
                                                description="Tidak ada data indikator yang cocok dengan kata kunci atau filter status/OPD saat ini."
                                            />
                                        )}
                                        {indicators.data.map((ind, index) => (
                                            <TableRow key={ind.id}>
                                                <TableCell className="text-sm text-gray-500 tabular-nums">
                                                    {(indicators.from ?? 1) + index}
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    {ind.code}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {ind.current_version?.name ?? ind.name}
                                                    </div>
                                                    <div className="mt-1 flex flex-wrap gap-1">
                                                        <Badge variant="secondary">
                                                            {ind.type}
                                                        </Badge>
                                                        <Badge variant="secondary">
                                                            {directionLabels[ind.direction] ?? ind.direction}
                                                        </Badge>
                                                        <Badge variant="secondary">
                                                            {ind.frequency}
                                                        </Badge>
                                                        {ind.is_iku && (
                                                            <Badge variant="info">
                                                                IKU
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {ind.measurement_unit?.symbol ??
                                                        ind.measurement_unit?.code ??
                                                        '-'}
                                                </TableCell>
                                                <TableCell>
                                                    {ind.owner_organization?.code ?? '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={statusLabels[ind.status]?.variant}>
                                                        {statusLabels[ind.status]?.text}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {(() => {
                                                        const canManageItem =
                                                            isOpdAdmin ||
                                                            Boolean(
                                                                ind.owner_organization?.id &&
                                                                    accessibleOrgIds.includes(ind.owner_organization.id)
                                                            );

                                                        if (!canManageItem) {
                                                            return <span className="text-xs text-muted-foreground">-</span>;
                                                        }

                                                        return (
                                                            <div className="flex justify-end gap-3">
                                                                {canUpdate && ind.status !== 'archived' && (
                                                                    <Link
                                                                        href={route('indicators.edit', ind.id)}
                                                                        className="text-blue-600 hover:text-blue-900"
                                                                    >
                                                                        Edit
                                                                    </Link>
                                                                )}
                                                                {canUpdate && ind.status === 'draft' && (
                                                                    <button
                                                                        onClick={() =>
                                                                            router.post(route('indicators.activate', ind.id))
                                                                        }
                                                                        className="text-green-600 hover:text-green-800"
                                                                    >
                                                                        Aktifkan
                                                                    </button>
                                                                )}
                                                                {canArchive && ind.status === 'active' && (
                                                                    <button
                                                                        onClick={() =>
                                                                            router.post(route('indicators.archive', ind.id))
                                                                        }
                                                                        className="text-yellow-600 hover:text-yellow-800"
                                                                    >
                                                                        Arsip
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {indicators.data.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={6} className="py-8 text-center text-gray-500">
                                                    Tidak ada indikator.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            <TablePagination
                                pagination={indicators as any}
                                perPage={perPage}
                                onPerPageChange={(newPerPage) => {
                                    setPerPage(newPerPage);
                                    router.get(
                                        route('indicators.index'),
                                        { search, status, organization_id: organizationId, per_page: newPerPage },
                                        { preserveState: true, replace: true }
                                    );
                                }}
                                itemName="indikator"
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}