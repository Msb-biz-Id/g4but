import { Head, router, useForm } from '@inertiajs/react';
import { Monitor, LogIn, LogOut, ShieldAlert } from 'lucide-react';

import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatDateTime } from '@/lib/utils';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { TableEmptyRow } from '@/Components/EmptyState';
import TablePagination from '@/Components/TablePagination';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { PageProps } from '@/types';
import { useState } from 'react';

interface LoginHistoryEntry {
    id: number;
    user_id: number;
    ip_address: string;
    user_agent: string;
    status: 'success' | 'failed' | 'logout';
    logged_in_at: string;
}

interface TargetUser { id: number; name: string; email: string; }

interface Props extends PageProps {
    history: {
        data: LoginHistoryEntry[];
        current_page?: number;
        last_page?: number;
        total?: number;
        from?: number | null;
        to?: number | null;
        per_page?: number;
        links?: Array<{ url: string | null; label: string; active: boolean }>;
        meta?: { current_page: number; last_page: number; total: number; from?: number; to?: number; links?: any[] };
    };
    targetUser?: TargetUser;
    filters?: { per_page?: number };
}

const STATUS_ICON = {
    success: <LogIn className="h-4 w-4 text-green-600" />,
    logout:  <LogOut className="h-4 w-4 text-gray-500" />,
    failed:  <ShieldAlert className="h-4 w-4 text-destructive" />,
};

const STATUS_LABEL = {
    success: { label: 'Login',  variant: 'default'      as const },
    logout:  { label: 'Logout', variant: 'secondary'    as const },
    failed:  { label: 'Gagal',  variant: 'destructive'  as const },
};

function parseUA(ua: string) {
    if (!ua) return '-';
    if (ua.includes('Firefox'))  return 'Firefox';
    if (ua.includes('Chrome'))   return 'Chrome';
    if (ua.includes('Safari'))   return 'Safari';
    if (ua.includes('Edge'))     return 'Edge';
    if (ua.includes('curl'))     return 'curl/CLI';
    return ua.slice(0, 40) + '…';
}

export default function LoginHistory({ history, targetUser, filters, auth }: Props) {
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [perPage, setPerPage] = useState<number>(Number((history as any).per_page ?? filters?.per_page ?? 25));
    const { data, setData, post, processing, errors, reset } = useForm({ password: '' });

    const currentRoute = targetUser ? route('users.login-history', targetUser.id) : route('profile.login-history');

    const handlePerPageChange = (newPerPage: number) => {
        setPerPage(newPerPage);
        router.get(currentRoute, { per_page: newPerPage }, { preserveState: true, replace: true });
    };

    const handleRevoke = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('profile.revoke-sessions'), {
            onSuccess: () => { setConfirmOpen(false); reset(); },
        });
    };

    const isOwnHistory = !targetUser || targetUser.id === auth.user.id;

    return (
        <AuthenticatedLayout header="Riwayat Login">
            <Head title={targetUser ? `Riwayat Login - ${targetUser.name}` : 'Riwayat Login Saya'} />

            <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-semibold">
                            {targetUser ? `Riwayat Login: ${targetUser.name}` : 'Riwayat Login Saya'}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Total {history.meta?.total ?? history.total ?? 0} entri | Halaman {history.meta?.current_page ?? history.current_page ?? 1} dari {history.meta?.last_page ?? history.last_page ?? 1}
                        </p>
                    </div>
                    {isOwnHistory && (
                        <Button variant="outline" className="text-destructive" onClick={() => setConfirmOpen(true)}>
                            <ShieldAlert className="mr-2 h-4 w-4" />
                            Akhiri Semua Sesi Lain
                        </Button>
                    )}
                </div>

                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10 text-xs uppercase tracking-wider">No</TableHead>
                                    <TableHead>Waktu</TableHead>
                                    <TableHead>Aksi</TableHead>
                                    <TableHead>IP</TableHead>
                                    <TableHead>Browser</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {history.data.length === 0 && (
                                    <TableEmptyRow
                                        colSpan={5}
                                        icon={Monitor}
                                        title="Belum Ada Riwayat Login"
                                        description="Belum ada catatan aktivitas masuk ke akun ini."
                                    />
                                )}
                                {history.data.map((entry, index) => {
                                    const s = STATUS_LABEL[entry.status] ?? { label: entry.status, variant: 'outline' as const };
                                    return (
                                        <TableRow key={entry.id}>
                                            <TableCell className="text-sm text-gray-500 tabular-nums">
                                                {((history as any).from ?? (((history.meta?.current_page ?? history.current_page ?? 1) - 1) * 15 + 1)) + index}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {formatDateTime(entry.logged_in_at)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5">
                                                    {STATUS_ICON[entry.status]}
                                                    <Badge variant={s.variant} className="text-xs">{s.label}</Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">{entry.ip_address}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{parseUA(entry.user_agent)}</TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Pagination */}
                <TablePagination
                    pagination={history}
                    perPage={perPage}
                    onPerPageChange={handlePerPageChange}
                    itemName="riwayat login"
                />
            </div>

            {/* Revoke sessions dialog */}
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent className="max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Akhiri Semua Sesi Lain</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground mb-2">
                        Semua sesi aktif di perangkat lain akan diakhiri. Konfirmasi dengan password Anda.
                    </p>
                    <form onSubmit={handleRevoke} className="space-y-3">
                        <div className="space-y-1.5">
                            <Label>Password</Label>
                            <Input
                                type="password"
                                placeholder="Masukkan kata sandi akun Anda"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                autoFocus
                            />
                            {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                        </div>
                        <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
                            <Button type="button" variant="ghost" onClick={() => setConfirmOpen(false)}>Batal</Button>
                            <Button type="submit" variant="destructive" disabled={processing}>Akhiri Sesi</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
