import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from '@/Components/ui/table';
import { TableEmptyRow } from '@/Components/EmptyState';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import TablePagination from '@/Components/TablePagination';
import PageHeader from '@/Components/Dashboard/PageHeader';

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
    created_at: string | null;
}

interface Props extends PageProps {
    batches: any;
    filters?: { per_page?: number | string };
}

const statusLabel: Record<string, string> = {
    preview: 'Tinjauan',
    committed: 'Terkirim',
    cancelled: 'Dibatalkan',
};

export default function ImportsIndex({ auth, batches, filters }: Props) {
    const flash = usePage().props.flash as {
        success?: string | null;
        error?: string | null;
    };

    const batchList: Batch[] = Array.isArray(batches) ? batches : (batches?.data || []);
    const fromIndex = Number((batches as any)?.from) || 1;

    const orgForm = useForm({ file: null as File | null, import_type: 'organizations' });
 const indicatorForm = useForm({ file: null as File | null, import_type: 'indicators' });

 const submitOrgs: FormEventHandler = (e) => {
 e.preventDefault();
 orgForm.post(route('imports.upload'), {
 forceFormData: true,
 preserveScroll: true,
 onSuccess: () => orgForm.reset('file'),
 });
 };

 const submitIndicators: FormEventHandler = (e) => {
 e.preventDefault();
 indicatorForm.post(route('imports.upload'), {
 forceFormData: true,
 preserveScroll: true,
 onSuccess: () => indicatorForm.reset('file'),
 });
 };

 const fileInput = (
 file: File | null,
 setFile: (f: File | null) => void,
 error?: string,
 ) => (
 <div>
 <input
 type="file"
 accept=".csv,.txt"
 onChange={(e) => setFile(e.target.files?.[0] ?? null)}
 className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
 />
 {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
 </div>
 );

    return (
        <AuthenticatedLayout>
            <Head title="Impor Data" />

            <div className="space-y-6 p-6">
                <PageHeader
                    title="Impor Data Masal (CSV)"
                    description="Unggah file data CSV untuk mengimpor OPD dan Indikator Kinerja secara massal dengan validasi skema otomatis."
                    breadcrumbs={[
                        { label: 'Pengaturan', href: route('settings.index') },
                        { label: 'Impor Data' },
                    ]}
                />

                <div className="mx-auto max-w-5xl space-y-6">
 {(flash?.success || flash?.error) && (
 <div
 className={`mb-4 rounded-md px-4 py-3 text-sm ${
 flash?.error
 ? 'bg-red-50 text-red-700'
 : 'bg-green-50 text-green-700'
 }`}
 >
 {flash?.error ?? flash?.success}
 </div>
 )}

 <div className="grid gap-6 lg:grid-cols-2">
 <Card>
 <CardHeader>
 <CardTitle>Import Organisasi / Unit Kerja</CardTitle>
 <CardDescription>
 Kolom: code, name, type (opd/sekretariat/bidang/seksi/subbag/uptd)
 </CardDescription>
 </CardHeader>
 <CardContent>
 <form autoComplete="off" noValidate onSubmit={submitOrgs} className="space-y-4">
 {fileInput(
 orgForm.data.file,
 (f) => orgForm.setData('file', f),
 orgForm.errors.file,
 )}
 <Button
 type="submit"
 disabled={orgForm.processing || !orgForm.data.file}
 >
 Analisis &amp; Preview
 </Button>
 </form>
 </CardContent>
 </Card>

 <Card>
 <CardHeader>
 <CardTitle>Import Indikator</CardTitle>
 <CardDescription>
 Kolom: code, name, type, direction, frequency, unit
 </CardDescription>
 </CardHeader>
 <CardContent>
 <form autoComplete="off" noValidate onSubmit={submitIndicators} className="space-y-4">
 {fileInput(
 indicatorForm.data.file,
 (f) => indicatorForm.setData('file', f),
 indicatorForm.errors.file,
 )}
 <Button
 type="submit"
 disabled={indicatorForm.processing || !indicatorForm.data.file}
 >
 Analisis &amp; Preview
 </Button>
 </form>
 </CardContent>
 </Card>
 </div>

 <Card className="mt-8">
 <CardHeader>
 <CardTitle>Riwayat Import</CardTitle>
 </CardHeader>
 <CardContent>
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead className="w-10 text-xs uppercase tracking-wider">No</TableHead>
 <TableHead>File</TableHead>
 <TableHead>Tipe</TableHead>
 <TableHead>Status</TableHead>
 <TableHead>Valid/Total</TableHead>
 <TableHead>Impor/Dilewati</TableHead>
 <TableHead />
 </TableRow>
 </TableHeader>
 <TableBody>
            {batchList.length === 0 && (
              <TableEmptyRow
                colSpan={7}
                title="Belum Ada Riwayat Impor"
                description="Belum ada riwayat batch impor data CSV/Excel yang pernah dijalankan."
              />
            )}
            {batchList.map((batch, index) => (
              <TableRow key={batch.id}>
                <TableCell className="text-sm text-gray-500 tabular-nums">
                  {fromIndex + index}
                </TableCell>
                <TableCell className="text-gray-800">
                  {batch.file_name}
                </TableCell>
                <TableCell className="capitalize text-gray-600">
                  {batch.import_type}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      batch.status === 'committed'
                        ? 'success'
                        : batch.status === 'cancelled'
                        ? 'secondary'
                        : 'warning'
                    }
                  >
                    {statusLabel[batch.status] ?? batch.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-600">
                  {batch.valid_rows}/{batch.total_rows}
                </TableCell>
                <TableCell className="text-gray-600">
                  {batch.imported}/{batch.skipped}
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    href={route('imports.preview', batch.id)}
                    className="font-medium text-blue-600 hover:text-blue-500"
                  >
                    Lihat
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          pagination={batches}
          itemLabel="batch"
          filters={filters}
          baseUrl={route('imports.index')}
        />
      </CardContent>
    </Card>
 </div>
 </div>
 </AuthenticatedLayout>
 );
}