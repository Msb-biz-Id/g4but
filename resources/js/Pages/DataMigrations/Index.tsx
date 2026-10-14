import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from '@/Components/ui/table';
import { TableEmptyRow } from '@/Components/EmptyState';
import { SelectNative } from '@/Components/ui/select-native';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { cn } from '@/lib/utils';
import TablePagination from '@/Components/TablePagination';
import PageHeader from '@/Components/Dashboard/PageHeader';

interface MigrationRow {
    id: number;
    name: string;
    entity_type: string;
    status: string;
    source_count: number;
    transformed_count: number;
    loaded_count: number;
    created_at: string | null;
}

interface Props extends PageProps {
    migrations: {
        data: MigrationRow[];
        links: Array<{ url: string | null; label: string; active: boolean }>;
        from?: number;
        to?: number;
        total?: number;
        current_page?: number;
        last_page?: number;
        per_page?: number;
    };
    filters?: { per_page?: number | string };
}

const statusLabel: Record<string, string> = {
    staged: 'Inventaris',
    validated: 'Validasi',
    reconciled: 'Rekonsiliasi',
    signed_off: 'Sign-off',
    loaded: 'Selesai Dimuat',
};

export default function DataMigrationsIndex({ auth, migrations, filters }: Props) {
 const flash = usePage().props.flash as { success?: string | null };
 const form = useForm({
 name: '',
 entity_type: 'organizations',
 file: null as File | null,
 });

 const submit: FormEventHandler = (e) => {
 e.preventDefault();
 form.post(route('migrations.store'), {
 forceFormData: true,
 preserveScroll: true,
 onSuccess: () => form.reset('file'),
 });
 };

    return (
        <AuthenticatedLayout>
            <Head title="Migrasi Data" />

            <div className="space-y-6 p-6">
                <PageHeader
                    title="Migrasi Data Master"
                    description="Inventarisasi, profiling, transformasi, validasi, rekonsiliasi, dan pemuatan data organisasi dan indikator ke sistem produksi."
                    breadcrumbs={[
                        { label: 'Pengaturan', href: route('settings.index') },
                        { label: 'Migrasi Data' },
                    ]}
                />

                <div className="mx-auto max-w-5xl space-y-6">
                    {flash?.success && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                            {flash.success}
                        </div>
                    )}

 <Card>
 <CardHeader>
 <CardTitle>Mulai Migrasi Data</CardTitle>
 </CardHeader>
 <CardContent>
 <p className="text-xs text-gray-500">
 Inventaris sumber → profiling → mapping → cleansing →
 transform → staging → validasi → rekonsiliasi →
 sign-off → production load (BRD §26.3).
 </p>
 <form autoComplete="off" noValidate onSubmit={submit} className="mt-4 space-y-4">
 <div className="grid gap-4 sm:grid-cols-3">
 <div className="sm:col-span-1">
 <Label>Nama Migrasi</Label>
 <Input
 type="text"
 value={form.data.name}
 onChange={(e) =>
 form.setData('name', e.target.value)
 }

 placeholder="mis. Migrasi OPD 2026"
 className="mt-1"
 />
 {form.errors.name && (
 <p className="mt-1 text-xs text-red-600">
 {form.errors.name}
 </p>
 )}
 </div>
 <div>
 <Label>Entitas</Label>
 <SelectNative
 value={form.data.entity_type}
 onChange={(e) =>
 form.setData('entity_type', e.target.value)
 }
 className="mt-1"
 >
 <option value="organizations">Organisasi</option>
 <option value="indicators">Indikator</option>
 </SelectNative>
 </div>
 <div>
 <Label>File Sumber (CSV)</Label>
 <input
 type="file"
 accept=".csv,.txt"
 onChange={(e) =>
 form.setData('file', e.target.files?.[0] ?? null)
 }
 className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
 />
 {form.errors.file && (
 <p className="mt-1 text-xs text-red-600">
 {form.errors.file}
 </p>
 )}
 </div>
 </div>
 <Button
 type="submit"
 disabled={form.processing || !form.data.file}
 >
 Buat Migrasi (Inventaris)
 </Button>
 </form>
 </CardContent>
 </Card>

 <Card className="mt-8">
 <CardHeader>
 <CardTitle>Riwayat Migrasi</CardTitle>
 </CardHeader>
 <CardContent>
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead className="w-10">No</TableHead>
 <TableHead>Nama</TableHead>
 <TableHead>Entitas</TableHead>
 <TableHead>Status</TableHead>
 <TableHead>Sumber/Transform</TableHead>
 <TableHead>Dimuat</TableHead>
 <TableHead />
 </TableRow>
 </TableHeader>
 <TableBody>
 {migrations.data.length === 0 && (
      <TableEmptyRow
          colSpan={7}
          title="Belum Ada Riwayat Migrasi"
          description="Belum ada proses migrasi data yang tercatat. Gunakan form di atas untuk memulai migrasi data."
      />
  )}
  {migrations.data.map((m: MigrationRow, index: number) => (
 <TableRow key={m.id}>
 <TableCell className="text-sm text-gray-500 tabular-nums">
 {(migrations.from ?? 1) + index}
 </TableCell>
 <TableCell className="text-gray-800">
 {m.name}
 </TableCell>
 <TableCell className="capitalize text-gray-600">
 {m.entity_type}
 </TableCell>
 <TableCell>
 <Badge
 variant={
 m.status === 'loaded'
 ? 'success'
 : m.status === 'signed_off'
 ? 'info'
 : 'warning'
 }
 >
 {statusLabel[m.status] ?? m.status}
 </Badge>
 </TableCell>
 <TableCell className="text-gray-600">
 {m.transformed_count}/{m.source_count}
 </TableCell>
 <TableCell className="text-gray-600">
 {m.loaded_count}
 </TableCell>
 <TableCell className="text-right">
 <Link
 href={route('migrations.show', m.id)}
 className="font-medium text-blue-600 hover:text-blue-500"
 >
 Buka
 </Link>
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
                    <TablePagination
                        pagination={migrations}
                        itemLabel="migrasi"
                        filters={filters}
                        baseUrl={route('migrations.index')}
                    />
 </CardContent>
 </Card>
 </div>
 </div>
 </AuthenticatedLayout>
 );
}