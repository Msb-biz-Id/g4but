import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent } from '@/Components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/Components/ui/table';
import {Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import ConfirmDialog from '@/Components/ConfirmDialog';

interface RowEntry {
    line: number;
    data: Record<string, string>;
    valid: boolean;
    errors: string[];
}

interface Batch {
    id: number;
    import_type: string;
    file_name: string;
    status: string;
    total_rows: number;
    valid_rows: number;
    invalid_rows: number;
    imported: number;
    skipped: number;
    rows: RowEntry[];
}

interface Props extends PageProps {
    batch: Batch;
}

export default function ImportsPreview({ auth, batch }: Props) {
    const flash = usePage().props.flash as {
        success?: string | null;
        error?: string | null;
    };

    const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);

    const canCommit = batch.status === 'preview';

    const commit = () => {
        router.post(route('imports.commit', batch.id), undefined, {
            preserveScroll: true,
        });
    };

    const cancel = () => {
        setIsCancelConfirmOpen(true);
    };

    const handleConfirmCancel = () => {
        router.post(route('imports.cancel', batch.id), undefined, {
            preserveScroll: true,
            onSuccess: () => setIsCancelConfirmOpen(false),
        });
    };

    return (
        <AuthenticatedLayout
            header="Preview Import"
        >
            <Head title="Pratinjau Impor" />
            <div className="py-12">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                    {flash?.success && (
                        <div className="mb-4 rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">
                            {flash.success}
                        </div>
                    )}

                    <Card className="mb-4">
                        <CardContent className="flex flex-wrap items-center gap-4 p-6 text-sm">
                            <div>
                                <span className="text-gray-500">Tipe:</span>{' '}
                                <span className="font-medium capitalize text-gray-800">
                                    {batch.import_type}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-500">Status:</span>{' '}
                                <Badge
                                    variant={
                                        batch.status === 'committed'
                                            ? 'success'
                                            : batch.status === 'cancelled'
                                              ? 'secondary'
                                              : 'warning'
                                    }
                                >
                                    {batch.status}
                                </Badge>
                            </div>
                            <div>
                                <span className="text-gray-500">Valid:</span>{' '}
                                <span className="font-medium text-green-700">
                                    {batch.valid_rows}
                                </span>{' '}
                                / {batch.total_rows}
                            </div>
                            {batch.invalid_rows > 0 && (
                                <div>
                                    <span className="text-gray-500">Error:</span>{' '}
                                    <span className="font-medium text-red-700">
                                        {batch.invalid_rows}
                                    </span>
                                </div>
                            )}
                            {batch.status === 'committed' && (
                                <>
                                    <div>
                                        <span className="text-gray-500">Diimpor:</span>{' '}
                                        <span className="font-medium text-gray-800">
                                            {batch.imported}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Dilewati:</span>{' '}
                                        <span className="font-medium text-gray-800">
                                            {batch.skipped}
                                        </span>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    <div className="mb-4 flex items-center justify-between">
                        <Button variant="ghost" asChild>
                            <Link href={route('imports.index')}>
                                &larr; Kembali ke Import
                            </Link>
                        </Button>
                        <div className="flex items-center gap-3">
                            <Button variant="outline" asChild>
                                <a href={route('imports.report', batch.id)}>
                                    Unduh Laporan
                                </a>
                            </Button>
                            {canCommit && (
                                <>
                                    <Button variant="outline" onClick={cancel}>
                                        Batal
                                    </Button>
                                    <Button
                                        onClick={commit}
                                        disabled={batch.valid_rows === 0}
                                    >
                                        Commit {batch.valid_rows} Baris
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>

                    <Card>
                        <CardContent className="pt-6">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-10 text-xs uppercase tracking-wider">No</TableHead>
                                        <TableHead>Baris File</TableHead>
                                        <TableHead>Data</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {batch.rows.map((row, index) => (
                                        <TableRow key={row.line}>
                                            <TableCell className="text-sm text-gray-500 tabular-nums">
                                                {index + 1}
                                            </TableCell>
                                            <TableCell className="text-gray-500">
                                                {row.line}
                                            </TableCell>
                                            <TableCell>
                                                <code className="text-xs text-gray-700">
                                                    {JSON.stringify(row.data)}
                                                </code>
                                                {row.errors.length > 0 && (
                                                    <ul className="mt-1 space-y-0.5 text-xs text-red-600">
                                                        {row.errors.map((err, i) => (
                                                            <li key={i}>{err}</li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={row.valid ? 'success' : 'destructive'}>
                                                    {row.valid ? 'Valid' : 'Error'}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <ConfirmDialog
                open={isCancelConfirmOpen}
                onOpenChange={setIsCancelConfirmOpen}
                title="Batalkan Import?"
                description="Apakah Anda yakin ingin membatalkan import data ini? Data yang belum di-commit akan dihapus."
                confirmText="Ya, Batalkan"
                cancelText="Kembali"
                onConfirm={handleConfirmCancel}
                onCancel={() => setIsCancelConfirmOpen(false)}
            />
        </AuthenticatedLayout>
    );
}