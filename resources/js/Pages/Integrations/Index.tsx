import { useState } from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { formatDateTime } from '@/lib/utils';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import TablePagination from '@/Components/TablePagination';
import PageHeader from '@/Components/Dashboard/PageHeader';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/Components/ui/table';
import { TableEmptyRow } from '@/Components/EmptyState';

interface IntegrationLog {
    id: number;
    integration_name: string;
    direction: string;
    endpoint: string | null;
    http_method: string | null;
    request_id: string | null;
    status: string;
    error_message: string | null;
    created_at: string | null;
}

interface Props extends PageProps {
    integrationsEnabled: boolean;
    logs: IntegrationLog[];
}

export default function IntegrationsIndex({ auth, integrationsEnabled, logs }: Props) {
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(25);

    const total = logs.length;
    const lastPage = Math.max(1, Math.ceil(total / perPage));
    const safeCurrentPage = Math.min(currentPage, lastPage);
    const from = total > 0 ? (safeCurrentPage - 1) * perPage + 1 : 0;
    const to = total > 0 ? Math.min(safeCurrentPage * perPage, total) : 0;
    const paginatedLogs = logs.slice((safeCurrentPage - 1) * perPage, safeCurrentPage * perPage);
    return (
        <AuthenticatedLayout>
            <Head title="Integrasi API" />

            <div className="space-y-6 p-6">
                <PageHeader
                    title="Integrasi Sistem & API"
                    description="Penerimaan data realisasi idempotent otomatis melalui Sanctum Bearer token ber-ability dan audit webhook log."
                    breadcrumbs={[
                        { label: 'Pengaturan', href: route('settings.index') },
                        { label: 'Integrasi Sistem' },
                    ]}
                />

                <div className="mx-auto max-w-5xl space-y-6">
                    <Card className="rounded-xl border border-slate-200/80 shadow-sm dark:border-slate-800">
                        <CardHeader>
                            <CardTitle>API Integrasi</CardTitle>
                            <CardDescription>
                                Penerimaan data realisasi idempotent (BRD §15.2, §15.5) via
                                Sanctum token ber-ability.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-500">Status:</span>
                                    <Badge variant={integrationsEnabled ? 'success' : 'secondary'}>
                                        {integrationsEnabled ? 'Aktif' : 'Nonaktif'}
                                    </Badge>
                                </div>
                                <div className="text-gray-600">
                                    Endpoint:{' '}
                                    <code className="text-xs">
                                        POST /api/v1/integrations/realizations
                                    </code>
                                </div>
                                <div className="text-gray-600">
                                    Auth: Bearer token (Sanctum, ability{' '}
                                    <code className="text-xs">integration:indicators</code>)
                                </div>
                            </div>
                            <p className="mt-4 rounded-md bg-gray-50 px-3 py-2 font-mono text-xs text-gray-600">
                                php artisan integration:token &quot;Nama Layanan&quot;
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="mt-8">
                        <CardHeader>
                            <CardTitle>Log Integrasi (BRD §14.2)</CardTitle>
                            <CardDescription>
                                Riwayat terakhir pertukaran data ke/dari sistem eksternal.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-10 text-xs uppercase tracking-wider">No</TableHead>
                                        <TableHead>Nama</TableHead>
                                        <TableHead>Arah</TableHead>
                                        <TableHead>Endpoint</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Request ID</TableHead>
                                        <TableHead>Waktu</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.length === 0 && (
                                        <TableEmptyRow
                                            colSpan={7}
                                            title="Belum Ada Log Integrasi"
                                            description="Belum ada riwayat transmisi pertukaran data webhook atau API ke sistem eksternal."
                                        />
                                    )}
                                    {paginatedLogs.map((log, index) => (
                                        <TableRow key={log.id}>
                                            <TableCell className="text-sm text-gray-500 tabular-nums">
                                                {from + index}
                                            </TableCell>
                                            <TableCell className="text-gray-800">
                                                {log.integration_name}
                                            </TableCell>
                                            <TableCell className="text-gray-600">
                                                {log.direction === 'in' ? 'Masuk' : 'Keluar'}
                                            </TableCell>
                                            <TableCell className="text-gray-600">
                                                {log.http_method}{' '}
                                                <span className="font-mono text-xs">{log.endpoint}</span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    title={log.error_message ?? undefined}
                                                    variant={
                                                        log.status === 'success'
                                                            ? 'success'
                                                            : log.status === 'retrying'
                                                              ? 'warning'
                                                              : 'destructive'
                                                    }
                                                >
                                                    {log.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs text-gray-600">
                                                {log.request_id ?? '-'}
                                            </TableCell>
                                            <TableCell className="text-gray-500">
                                                {log.created_at ? formatDateTime(log.created_at) : '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <TablePagination
                                clientSide={true}
                                from={from}
                                to={to}
                                totalItems={total}
                                perPage={perPage}
                                currentPage={safeCurrentPage}
                                lastPage={lastPage}
                                itemLabel="log"
                                onPerPageChange={(val) => { setPerPage(val); setCurrentPage(1); }}
                                onClientPageChange={(page) => setCurrentPage(page)}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}