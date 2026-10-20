import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Input } from '@/Components/ui/input';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Shield, ShieldCheck, Users, KeyRound, Search, ArrowRight, Lock, CheckCircle2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import TablePagination from '@/Components/TablePagination';
import PageHeader from '@/Components/Dashboard/PageHeader';

interface Props extends PageProps {
    roles: Array<{
        id: number;
        name: string;
        description: string | null;
        permissions_count: number;
        users_count: number;
    }>;
}

export default function RolesIndex({ roles }: Props) {
    const { auth } = usePage().props;
    const canManage = (auth.user?.permissions ?? []).includes('role:manage');

    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(25);

    // Filter roles based on search query
    const filteredRoles = useMemo(() => {
        if (!search.trim()) return roles;
        const q = search.toLowerCase();
        return roles.filter(
            (r) =>
                r.name.toLowerCase().includes(q) ||
                (r.description && r.description.toLowerCase().includes(q))
        );
    }, [roles, search]);

    const total = filteredRoles.length;
    const lastPage = Math.max(1, Math.ceil(total / perPage));
    const safeCurrentPage = Math.min(currentPage, lastPage);
    const from = total > 0 ? (safeCurrentPage - 1) * perPage + 1 : 0;
    const to = total > 0 ? Math.min(safeCurrentPage * perPage, total) : 0;
    const paginatedRoles = filteredRoles.slice((safeCurrentPage - 1) * perPage, safeCurrentPage * perPage);

    // Summary metrics
    const totalUsersInRoles = useMemo(() => roles.reduce((acc, r) => acc + (r.users_count || 0), 0), [roles]);
    const maxPermissions = useMemo(() => Math.max(...roles.map((r) => r.permissions_count || 0), 0), [roles]);

    const { appConfig } = usePage<PageProps>().props;
    const appName = appConfig?.appName || 'SIPERFORMA PUPR';
    const instansiName = appConfig?.instansiName || 'Dinas PUPR Kabupaten Mimika';

    return (
        <AuthenticatedLayout header="Manajemen Peran & Hak Akses (RBAC)">
            <Head title="Manajemen Peran & Hak Akses (RBAC)" />

            <div className="space-y-6">
                <PageHeader
                    breadcrumbs={[
                        { label: 'Master Data & Pengaturan' },
                        { label: 'Peran & Hak Akses' },
                    ]}
                    title="Manajemen Peran & Hak Akses (RBAC)"
                    description={`Pengaturan matriks kewenangan berbasis peran (Role-Based Access Control) per modul sistem ${appName} ${instansiName}.`}
                    badge="Terlindungi Guardrail"
                />

                {/* Summary Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="shadow-2xs border-border">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Total Peran (Role)
                                </p>
                                <p className="text-2xl font-bold text-foreground mt-1">
                                    {roles.length} <span className="text-xs font-normal text-muted-foreground">Peran</span>
                                </p>
                            </div>
                            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                <Shield className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-2xs border-border">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Maksimal Hak Akses
                                </p>
                                <p className="text-2xl font-bold text-foreground mt-1">
                                    {maxPermissions} <span className="text-xs font-normal text-muted-foreground">Izin Akses</span>
                                </p>
                            </div>
                            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                <KeyRound className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-2xs border-border">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Pengguna Terdistribusi
                                </p>
                                <p className="text-2xl font-bold text-foreground mt-1">
                                    {totalUsersInRoles} <span className="text-xs font-normal text-muted-foreground">Akun</span>
                                </p>
                            </div>
                            <div className="h-10 w-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                                <Users className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-2xs border-border">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Integritas Keamanan
                                </p>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                        RBAC Terisolasi
                                    </span>
                                </div>
                            </div>
                            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                <ShieldCheck className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Table Card */}
                <Card className="shadow-sm">
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
                        <div>
                            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                                <Shield className="h-5 w-5 text-primary" />
                                <span>Daftar Peran & Matriks Hak Akses</span>
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm mt-0.5">
                                Klik tombol kelola untuk menentukan izin akses modul bagi setiap peran.
                            </CardDescription>
                        </div>

                        {/* Search Filter */}
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Cari nama peran / deskripsi..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="pl-9 text-xs sm:text-sm"
                            />
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/40">
                                        <TableHead className="w-12 text-center">No</TableHead>
                                        <TableHead className="min-w-[180px]">Nama Peran (Role)</TableHead>
                                        <TableHead className="min-w-[240px]">Deskripsi & Ruang Lingkup Wewenang</TableHead>
                                        <TableHead className="text-center min-w-[140px]">Jumlah Hak Akses</TableHead>
                                        <TableHead className="text-center min-w-[120px]">Pengguna Aktif</TableHead>
                                        <TableHead className="text-right min-w-[160px] pr-4">Tindakan</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedRoles.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <Shield className="h-8 w-8 text-muted-foreground/50" />
                                                    <p className="text-sm font-medium">Tidak ada peran yang cocok dengan pencarian.</p>
                                                    {search && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setSearch('')}
                                                            className="text-xs mt-1"
                                                        >
                                                            Reset Pencarian
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        paginatedRoles.map((role, index) => {
                                            const isSuperAdmin = role.name === 'Super Admin';
                                            return (
                                                <TableRow key={role.id} className="hover:bg-muted/30 transition-colors">
                                                    <TableCell className="text-center text-xs text-muted-foreground font-mono">
                                                        {from + index}
                                                    </TableCell>
                                                    <TableCell className="font-semibold text-foreground">
                                                        <div className="flex items-center gap-2">
                                                            <span>{role.name}</span>
                                                            {isSuperAdmin && (
                                                                <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 text-[10px] font-bold">
                                                                    Akses Penuh (Root)
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground max-w-md leading-relaxed">
                                                        {role.description ? (
                                                            <span>{role.description}</span>
                                                        ) : (
                                                            <span className="text-slate-400 italic">Belum ada keterangan wewenang</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant="outline" className="font-mono text-xs px-2.5 py-0.5">
                                                            {role.permissions_count} Izin
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant="secondary" className="font-mono text-xs px-2 py-0.5">
                                                            {role.users_count} Akun
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right pr-4">
                                                        {isSuperAdmin ? (
                                                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                                                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                                                                Permanen
                                                            </span>
                                                        ) : canManage ? (
                                                            <Button asChild size="sm" variant="outline" className="h-8 gap-1.5 text-xs text-primary hover:text-primary hover:bg-primary/10 border-primary/30">
                                                                <Link href={route('roles.edit', role.id)}>
                                                                    <span>Atur Hak Akses</span>
                                                                    <ArrowRight className="h-3 w-3" />
                                                                </Link>
                                                            </Button>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">-</span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        <TablePagination
                            clientSide={true}
                            from={from}
                            to={to}
                            totalItems={total}
                            perPage={perPage}
                            currentPage={safeCurrentPage}
                            lastPage={lastPage}
                            itemLabel="peran"
                            onPerPageChange={(val) => {
                                setPerPage(val);
                                setCurrentPage(1);
                            }}
                            onClientPageChange={(p) => setCurrentPage(p)}
                        />
                    </CardContent>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}