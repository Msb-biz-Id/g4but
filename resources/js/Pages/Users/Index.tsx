import { useState, useEffect, useRef } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Checkbox } from '@/Components/ui/checkbox';
import { Input } from '@/Components/ui/input';
import { SelectNative } from '@/Components/ui/select-native';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/Components/ui/table';
import { TableEmptyRow } from '@/Components/EmptyState';
import TablePagination from '@/Components/TablePagination';
import { Head, Link, router } from '@inertiajs/react';
import { PageProps } from '@/types';
import {
    CheckCircle2, Download, Filter, Plus, Search, ShieldOff, Users, UserX, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import PageHeader from '@/Components/Dashboard/PageHeader';
import StatusBadge from '@/Components/Dashboard/StatusBadge';

interface UserRow {
    id: number;
    name: string;
    email: string;
    employee_number: string | null;
    job_title: string | null;
    is_active: boolean;
    roles: Array<{ id: number; name: string }>;
    organizations: Array<{ id: number; code: string; name: string }>;
}

interface Props extends PageProps {
    users: {
        data: UserRow[];
        links: Array<{ url: string | null; label: string; active: boolean }>;
        from: number;
        to: number;
        total: number;
        per_page?: number;
    };
    filters: { search?: string; organization_id?: string; role_id?: string; status?: string; per_page?: number };
    organizations: Array<{ id: number; code: string; name: string }>;
    roles: Array<{ id: number; name: string }>;
    stats: { total: number; active: number; inactive: number };
}

export default function UsersIndex({ auth, users, filters, organizations, roles = [], stats }: Props) {
    const [search, setSearch]             = useState(filters.search ?? '');
    const [organizationId, setOrgId]      = useState(filters.organization_id ?? '');
    const [roleId, setRoleId]             = useState(filters.role_id ?? '');
    const [status, setStatus]             = useState(filters.status ?? '');
    const [perPage, setPerPage]           = useState<number>(Number(users.per_page ?? filters.per_page ?? 25));
    const [selected, setSelected]         = useState<number[]>([]);
    const [bulkAction, setBulkAction]     = useState('');

    const permissions = auth.user?.permissions ?? [];
    const canManage   = permissions.includes('*') || permissions.includes('user:create') || permissions.includes('manage-users');

    // Debounce filter - skip first render to prevent double HTTP request on mount
    const isMounted = useRef(false);
    useEffect(() => {
        if (!isMounted.current) { isMounted.current = true; return; }
        const timer = setTimeout(() => {
            router.get(route('users.index'),
                { search, organization_id: organizationId, role_id: roleId, status, per_page: perPage },
                { preserveState: true, replace: true });
        }, 300);
        return () => clearTimeout(timer);
    }, [search, organizationId, roleId, status, perPage]);

    const hasFilters = Boolean(search || organizationId || roleId || status);
    const resetFilters = () => {
        setSearch('');
        setOrgId('');
        setRoleId('');
        setStatus('');
        setPerPage(25);
    };

    const allIds      = users.data.map((u) => u.id);
    const allChecked  = allIds.length > 0 && allIds.every((id) => selected.includes(id));
    const someChecked = selected.length > 0 && !allChecked;

    const toggleAll = () => setSelected(allChecked ? [] : allIds);
    const toggleOne = (id: number) =>
        setSelected((prev) => prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]);

    const submitBulk = () => {
        if (!bulkAction || selected.length === 0) return;
        router.post(route('users.bulk-action'), { action: bulkAction, user_ids: selected },
            { preserveScroll: true, onSuccess: () => { setSelected([]); setBulkAction(''); } });
    };

    const activateUser  = (id: number) => router.post(route('users.activate', id), {}, { preserveScroll: true });
    const deactivateUser = (id: number) => router.delete(route('users.destroy', id), { preserveScroll: true });

    // Active page badge
    const pageLabel = (label: string) => label.replace('&laquo;', '«').replace('&raquo;', '»');

    return (
        <AuthenticatedLayout
            header="Manajemen Pengguna"
        >
            <Head title="Manajemen Pengguna" />
            <div className="space-y-6">
                <PageHeader
                    breadcrumbs={[
                        { label: 'Master Data & Pengaturan' },
                        { label: 'Pengguna' },
                    ]}
                    title="Manajemen Pengguna"
                    description="Kelola akun aparatur, peran hak akses, dan penugasan organisasi perangkat daerah."
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                variant="outline"
                                asChild
                                className="w-full sm:w-auto justify-center bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                            >
                                <a href={route('users.export')} download>
                                    <Download className="mr-2 h-4 w-4 text-emerald-600" />
                                    Unduh Akun (Excel)
                                </a>
                            </Button>
                            {canManage && (
                                <Button asChild className="w-full sm:w-auto justify-center bg-primary text-primary-foreground hover:bg-primary/90">
                                    <Link href={route('users.create')}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Tambah Pengguna
                                    </Link>
                                </Button>
                            )}
                        </div>
                    }
                />

                {/* Stat cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        { label: 'Total Pengguna', value: stats?.total ?? users.total, icon: Users, color: 'text-primary' },
                        { label: 'Aktif',          value: stats?.active ?? '-',        icon: CheckCircle2, color: 'text-emerald-600' },
                        { label: 'Nonaktif',       value: stats?.inactive ?? '-',      icon: UserX, color: 'text-rose-500' },
                    ].map((s) => {
                        const Icon = s.icon;
                        return (
                            <Card key={s.label} className="border-border shadow-xs hover:shadow-sm transition-shadow">
                                <CardContent className="flex items-center gap-3 p-4 sm:p-5">
                                    <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                                        <Icon className={cn('h-6 w-6 shrink-0', s.color)} />
                                    </div>
                                    <div>
                                        <div className="text-xs text-muted-foreground font-medium">{s.label}</div>
                                        <div className="text-xl sm:text-2xl font-bold tracking-tight">{s.value}</div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                    <Card>
                        <CardContent className="p-4 sm:p-6 space-y-4">
                            {/* Filters Header */}
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    <Filter className="h-4 w-4 text-primary" />
                                    <span>Filter Pengguna</span>
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

                            {/* Filters Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
                                <div className="relative sm:col-span-2 lg:col-span-5">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                    <Input
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Cari nama, email, atau NIP..."
                                        className="pl-9 w-full"
                                    />
                                </div>
                                <div className="lg:col-span-3">
                                    <SelectNative
                                        value={organizationId}
                                        onChange={(e) => setOrgId(e.target.value)}
                                        className="w-full"
                                    >
                                        <option value="">Semua OPD</option>
                                        {organizations.map((o) => (
                                            <option key={o.id} value={o.id}>
                                                {o.code} - {o.name}
                                            </option>
                                        ))}
                                    </SelectNative>
                                </div>
                                <div className="lg:col-span-2">
                                    <SelectNative
                                        value={roleId}
                                        onChange={(e) => setRoleId(e.target.value)}
                                        className="w-full"
                                    >
                                        <option value="">Semua Role</option>
                                        {roles.map((r) => (
                                            <option key={r.id} value={r.id}>
                                                {r.name}
                                            </option>
                                        ))}
                                    </SelectNative>
                                </div>
                                <div className="lg:col-span-2">
                                    <SelectNative
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value)}
                                        className="w-full"
                                    >
                                        <option value="">Semua Status</option>
                                        <option value="active">Aktif</option>
                                        <option value="inactive">Nonaktif</option>
                                    </SelectNative>
                                </div>
                            </div>

                            {/* Bulk action bar */}
                            {canManage && selected.length > 0 && (
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-indigo-100 bg-indigo-50/50 p-3">
                                    <span className="text-sm font-medium text-indigo-700">{selected.length} dipilih</span>
                                    <SelectNative value={bulkAction} onChange={(e) => setBulkAction(e.target.value)} className="w-full sm:w-44 text-sm">
                                        <option value="">Pilih Aksi</option>
                                        <option value="activate">Aktifkan</option>
                                        <option value="deactivate">Nonaktifkan</option>
                                    </SelectNative>
                                    <Button size="sm" onClick={submitBulk} disabled={!bulkAction} className="w-full sm:w-auto gap-1 justify-center">
                                        Terapkan
                                    </Button>
                                    <button onClick={() => setSelected([])} className="text-xs text-gray-400 hover:text-gray-600 text-center sm:text-right sm:ml-auto">Batalkan pilihan</button>
                                </div>
                            )}

                            {/* Table */}
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            {canManage && (
                                                <TableHead className="w-10">
                                                    <Checkbox checked={allChecked} data-state={someChecked ? 'indeterminate' : allChecked ? 'checked' : 'unchecked'}
                                                        onCheckedChange={toggleAll} aria-label="Pilih semua" />
                                                </TableHead>
                                            )}
                                            <TableHead className="w-10 text-xs uppercase tracking-wider">No</TableHead>
                                            <TableHead className="text-xs uppercase tracking-wider">Nama</TableHead>
                                            <TableHead className="text-xs uppercase tracking-wider">Email / NIP</TableHead>
                                            <TableHead className="text-xs uppercase tracking-wider">Peran</TableHead>
                                            <TableHead className="text-xs uppercase tracking-wider">Organisasi</TableHead>
                                            <TableHead className="text-xs uppercase tracking-wider">Status</TableHead>
                                            {canManage && <TableHead className="text-right text-xs uppercase tracking-wider">Aksi</TableHead>}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {users.data.length === 0 && (
                                            <TableEmptyRow
                                                colSpan={canManage ? 8 : 7}
                                                title="Belum Ada Data Pengguna"
                                                description="Tidak ada data pengguna yang cocok dengan kriteria pencarian atau filter saat ini."
                                            />
                                        )}
                                        {users.data.map((user, index) => (
                                            <TableRow key={user.id} className={!user.is_active ? 'opacity-60' : ''}>
                                                {canManage && (
                                                    <TableCell>
                                                        <Checkbox checked={selected.includes(user.id)}
                                                            onCheckedChange={() => toggleOne(user.id)} aria-label={`Pilih ${user.name}`} />
                                                    </TableCell>
                                                )}
                                                <TableCell className="text-sm text-gray-500 tabular-nums">
                                                    {(users.from ?? 1) + index}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap">
                                                    <div className="font-medium text-sm">{user.name}</div>
                                                    {user.job_title && <div className="text-xs text-gray-400">{user.job_title}</div>}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap text-sm text-gray-500">
                                                    {user.email}
                                                    {user.employee_number && <div className="text-xs">{user.employee_number}</div>}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1">
                                                        {user.roles.map((r) => (
                                                            <Badge key={r.id} variant="info" className="text-xs">{r.name}</Badge>
                                                        ))}
                                                        {user.roles.length === 0 && <span className="text-xs text-muted-foreground">-</span>}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm text-gray-500">
                                                    {user.organizations.map((o) => o.code).join(', ') || '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <StatusBadge status={user.is_active ? 'active' : 'inactive'} />
                                                </TableCell>
                                                {canManage && (
                                                    <TableCell className="whitespace-nowrap text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
                                                                <Link href={route('users.edit', user.id)}>Edit</Link>
                                                            </Button>
                                                            {user.is_active ? (
                                                                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                                                                    onClick={() => deactivateUser(user.id)} title="Nonaktifkan">
                                                                    <ShieldOff className="h-3.5 w-3.5" />
                                                                </Button>
                                                            ) : (
                                                                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-green-600 hover:text-green-700"
                                                                    onClick={() => activateUser(user.id)} title="Aktifkan">
                                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))}
                                        {users.data.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={canManage ? 7 : 6} className="py-10 text-center text-sm text-gray-400">
                                                    <Users className="mx-auto mb-1.5 h-6 w-6 opacity-20" />
                                                    Tidak ada pengguna ditemukan.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            <TablePagination
                                pagination={users}
                                perPage={perPage}
                                onPerPageChange={(newPerPage) => {
                                    setPerPage(newPerPage);
                                    router.get(
                                        route('users.index'),
                                        { search, organization_id: organizationId, role_id: roleId, status, per_page: newPerPage },
                                        { preserveState: true, replace: true }
                                    );
                                }}
                                itemName="pengguna"
                            />
                        </CardContent>
                    </Card>
            </div>
        </AuthenticatedLayout>
    );
}