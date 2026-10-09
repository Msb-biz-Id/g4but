import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent } from '@/Components/ui/card';
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
import { Filter, Plus, X } from 'lucide-react';
import { PageProps } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

interface Target {
    id: number;
    target_value: string;
    status: string;
    indicator_version: {
        id: number;
        name: string;
        version_number: number;
        direction: string;
        measurement_unit: { code: string; name: string; symbol: string | null } | null;
        indicator: { id: number; code: string; status: string } | null;
    } | null;
    organization: { id: number; code: string; name: string } | null;
    planning_period: { id: number; code: string; name: string; year: number } | null;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface Props extends PageProps {
    targets: {
        data: Target[];
        links: PaginationLink[];
        from: number | null;
        to: number | null;
        total: number;
        per_page?: number;
    };
    filters: { period_id?: string; organization_id?: string; per_page?: number };
    periods: Array<{ id: number; code: string; name: string; year: number }>;
    organizations: Array<{ id: number; code: string; name: string }>;
}

export default function TargetsIndex({
    auth,
    targets,
    filters,
    periods,
    organizations,
}: Props) {
    const { flash } = usePage().props as { flash: { success?: string | null } };
    const [periodId, setPeriodId] = useState(filters.period_id ?? '');
    const [organizationId, setOrganizationId] = useState(
        filters.organization_id ?? '',
    );
    const [perPage, setPerPage] = useState<number>(Number((targets as any).per_page ?? (filters as any).per_page ?? 25));

    const permissions = auth.user?.permissions ?? [];
    const canCreate = permissions.includes('target:manage');
    const canUpdate = permissions.includes('target:manage');

    const isMounted = useRef(false);
    useEffect(() => {
        if (!isMounted.current) { isMounted.current = true; return; }
        const timer = setTimeout(() => {
            router.get(
                route('targets.index'),
                { period_id: periodId, organization_id: organizationId, per_page: perPage },
                { preserveState: true, replace: true },
            );
        }, 300);
        return () => clearTimeout(timer);
    }, [periodId, organizationId, perPage]);

    const hasFilters = Boolean(periodId || organizationId);
    const resetFilters = () => {
        setPeriodId('');
        setOrganizationId('');
        setPerPage(25);
    };

    return (
        <AuthenticatedLayout
            header="Target Indikator"
        >
            <Head title="Target Indikator" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-4">
                    {flash?.success && (
                        <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">
                            {flash.success}
                        </div>
                    )}

                    {/* Header Bar */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                                Target Indikator
                            </h1>
                            <p className="text-xs text-muted-foreground sm:text-sm">
                                Penetapan target kinerja indikator per periode dan perangkat daerah.
                            </p>
                        </div>
                        {canCreate && (
                            <Button asChild className="w-full sm:w-auto justify-center">
                                <Link href={route('targets.create')}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Tambah Target
                                </Link>
                            </Button>
                        )}
                    </div>

                    {/* Filter Card */}
                    <Card>
                        <CardContent className="p-4 sm:p-5">
                            <div className="flex items-center justify-between gap-2 mb-3">
                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    <Filter className="h-4 w-4 text-primary" />
                                    <span>Filter Target</span>
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

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <SelectNative
                                    value={periodId}
                                    onChange={(e) => setPeriodId(e.target.value)}
                                    className="w-full"
                                >
                                    <option value="">Semua Periode</option>
                                    {periods.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} ({p.year})
                                        </option>
                                    ))}
                                </SelectNative>
                                <SelectNative
                                    value={organizationId}
                                    onChange={(e) => setOrganizationId(e.target.value)}
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
                        </CardContent>
                    </Card>

                    <Card className="overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10">No</TableHead>
                                    <TableHead>Indikator</TableHead>
                                    <TableHead>OPD</TableHead>
                                    <TableHead>Periode</TableHead>
                                    <TableHead className="text-right">
                                        Target
                                    </TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {targets.data.length === 0 && (
                                    <TableEmptyRow
                                        colSpan={6}
                                        title="Belum Ada Target Indikator"
                                        description="Belum ada target indikator yang ditetapkan untuk periode atau OPD yang dipilih."
                                    />
                                )}
                                {targets.data.map((target, index) => (
                                    <TableRow key={target.id}>
                                        <TableCell className="text-sm text-gray-500 tabular-nums">
                                            {(targets.from ?? 1) + index}
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm font-medium text-gray-900">
                                                {target.indicator_version?.indicator?.code ?? '—'}{' '}
                                                -{' '}
                                                {target.indicator_version?.name ?? '—'}
                                            </div>
                                            <div className="mt-1 text-xs text-gray-500">
                                                v{target.indicator_version?.version_number} ·{' '}
                                                {target.indicator_version?.measurement_unit?.symbol ??
                                                    target.indicator_version?.measurement_unit?.code}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {target.organization?.code ?? '—'}
                                        </TableCell>
                                        <TableCell>
                                            {target.planning_period?.name ?? '—'}
                                        </TableCell>
                                        <TableCell className="text-right font-semibold">
                                            {Number(target.target_value).toLocaleString('id-ID')}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">
                                                {target.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {targets.data.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="py-8 text-center text-gray-500">
                                            Belum ada target. {canCreate && (
                                                <Link
                                                    href={route('targets.create')}
                                                    className="text-blue-600 hover:text-blue-900"
                                                >
                                                    Buat target pertama
                                                </Link>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Card>

                    <TablePagination
                        pagination={targets as any}
                        perPage={perPage}
                        onPerPageChange={(newPerPage) => {
                            setPerPage(newPerPage);
                            router.get(
                                route('targets.index'),
                                { period_id: periodId, organization_id: organizationId, per_page: newPerPage },
                                { preserveState: true, replace: true }
                            );
                        }}
                        itemName="target"
                        className="mt-4 rounded-lg border border-border bg-white dark:bg-card"
                    />
                </div>
            </div>
        </AuthenticatedLayout>
    );
}