import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
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
import { Search } from 'lucide-react';
import { PageProps } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { Button } from '@/Components/ui/button';
import { cn } from '@/lib/utils';

interface Props extends PageProps {
 units: {
 data: Array<{
 id: number;
 code: string;
 name: string;
 symbol: string | null;
 description: string | null;
 is_active: boolean;
 indicators_count: number;
 }>;
 links: Array<{ url: string | null; label: string; active: boolean }>;
 from: number | null;
 to?: number | null;
 total?: number;
 per_page?: number;
 };
 filters: { search?: string; per_page?: number };
}

export default function UnitsIndex({ auth, units, filters }: Props) {
 const canManage = (auth.user?.permissions ?? []).includes('unit:manage');

 const [search, setSearch] = useState(filters.search ?? '');
 const [perPage, setPerPage] = useState<number>(Number((units as any).per_page ?? (filters as any).per_page ?? 25));
 const [editing, setEditing] = useState<number | null>(null);
 const [form, setForm] = useState({
 code: '',
 name: '',
 symbol: '',
 description: '',
 is_active: true,
 });
 const [errors, setErrors] = useState<Record<string, string>>({});

 const isMounted = useRef(false);
 useEffect(() => {
 if (!isMounted.current) { isMounted.current = true; return; }
 const timer = setTimeout(() => {
 router.get(route('units.index'), { search, per_page: perPage }, {
 preserveState: true,
 replace: true,
 });
 }, 300);
 return () => clearTimeout(timer);
 }, [search, perPage]);

 const startEdit = (unit: (typeof units.data)[number]) => {
 setEditing(unit.id);
 setForm({
 code: unit.code,
 name: unit.name,
 symbol: unit.symbol ?? '',
 description: unit.description ?? '',
 is_active: unit.is_active,
 });
 setErrors({});
 };

 const submit = (e: FormEvent) => {
 e.preventDefault();
 const endpoint =
 editing === null
 ? route('units.store')
 : route('units.update', editing);
 const method = editing === null ? 'post' : 'put';

 (router as unknown as {
 post: (
 u: string,
 d: object,
 o?: { onError?: (e: Record<string, string>) => void; onSuccess?: () => void },
 ) => void;
 put: (
 u: string,
 d: object,
 o?: { onError?: (e: Record<string, string>) => void; onSuccess?: () => void },
 ) => void;
 })[method](endpoint, form, {
 onError: (errs) => setErrors(errs),
 onSuccess: () => {
 setEditing(null);
 setForm({
 code: '',
 name: '',
 symbol: '',
 description: '',
 is_active: true,
 });
 setErrors({});
 },
 });
 };

    return (
        <AuthenticatedLayout>
            <Head title="Satuan Ukuran" />

            <div className="space-y-6 p-6">
                <PageHeader
                    title="Satuan Pengukuran"
                    description="Kelola master satuan ukuran untuk target dan realisasi indikator kinerja (persen, rupiah, dokumen, orang, dll)."
                    breadcrumbs={[
                        { label: 'Pengaturan', href: route('settings.index') },
                        { label: 'Satuan Pengukuran' },
                    ]}
                />

                <div className="space-y-6">
                    {canManage && (
                        <Card className="rounded-xl border border-slate-200/80 shadow-sm dark:border-slate-800">
 <CardHeader className="p-6 pb-0">
 <CardTitle className="text-lg">
 {editing === null
 ? 'Tambah Satuan'
 : 'Edit Satuan'}
 </CardTitle>
 </CardHeader>
 <CardContent className="p-6">
 <form autoComplete="off" noValidate onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-6">
 <div>
 <InputLabel htmlFor="code" value="Kode" />
 <TextInput
 id="code"
 placeholder="cth: PERSEN"
 value={form.code}
 onChange={(e) =>
 setForm({ ...form, code: e.target.value })
 }
 className="mt-1 block w-full"
 />
 <InputError message={errors.code} className="mt-1" />
 </div>
 <div>
 <InputLabel htmlFor="name" value="Nama" />
 <TextInput
 id="name"
 placeholder="cth: Persentase"
 value={form.name}
 onChange={(e) =>
 setForm({ ...form, name: e.target.value })
 }
 className="mt-1 block w-full"
 />
 <InputError message={errors.name} className="mt-1" />
 </div>
 <div>
 <InputLabel htmlFor="symbol" value="Simbol" />
 <TextInput
 id="symbol"
 placeholder="cth: %"
 value={form.symbol}
 onChange={(e) =>
 setForm({ ...form, symbol: e.target.value })
 }
 className="mt-1 block w-full"
 />
 </div>
 <div className="sm:col-span-2">
 <InputLabel htmlFor="description" value="Deskripsi" />
 <TextInput
 id="description"
 placeholder="Keterangan satuan pengukuran..."
 value={form.description}
 onChange={(e) =>
 setForm({ ...form, description: e.target.value })
 }
 className="mt-1 block w-full"
 />
 </div>
 <div className="flex items-end gap-2">
 <PrimaryButton disabled={false}>
 {editing === null ? 'Tambah' : 'Simpan'}
 </PrimaryButton>
 {editing !== null && (
 <button
 type="button"
 onClick={() => setEditing(null)}
 className="text-sm text-gray-600"
 >
 Batal
 </button>
 )}
 </div>
 </form>
 </CardContent>
 </Card>
 )}

 <Card className="overflow-hidden border-slate-200/80 shadow-xs dark:border-slate-800">
 <CardContent className="border-b border-gray-200 dark:border-gray-800 p-4">
 <div className="relative w-full sm:max-w-xs">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
 <Input
 type="text"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 placeholder="Cari satuan..."
 className="pl-9 w-full"
 />
 </div>
 </CardContent>
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead className="w-10">No</TableHead>
 <TableHead>Kode</TableHead>
 <TableHead>Nama</TableHead>
 <TableHead>Simbol</TableHead>
 <TableHead className="text-center">
 Indikator
 </TableHead>
 <TableHead className="text-right">
 Aksi
 </TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {units.data.length === 0 && (
  <TableEmptyRow
      colSpan={6}
      title="Belum Ada Satuan Pengukuran"
      description="Belum ada data satuan pengukuran yang dibuat atau cocok dengan pencarian."
  />
 )}
 {units.data.map((unit, index) => (
 <TableRow key={unit.id}>
 <TableCell className="text-sm text-gray-500 tabular-nums">
 {(units.from ?? 1) + index}
 </TableCell>
 <TableCell className="font-medium">
 {unit.code}
 </TableCell>
 <TableCell className="text-gray-700">
 {unit.name}
 </TableCell>
 <TableCell>
 {unit.symbol ?? '-'}
 </TableCell>
 <TableCell className="text-center">
 {unit.indicators_count}
 </TableCell>
 <TableCell className="text-right">
 {canManage && (
 <button
 onClick={() =>
 startEdit(unit)
 }
 className="text-blue-600 hover:text-blue-900"
 >
 Edit
 </button>
 )}
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
                    <TablePagination
                        pagination={units as any}
                        perPage={perPage}
                        onPerPageChange={(newPerPage) => {
                            setPerPage(newPerPage);
                            router.get(
                                route('units.index'),
                                { search, per_page: newPerPage },
                                { preserveState: true, replace: true }
                            );
                        }}
                        itemName="satuan"
                    />
 </Card>
 </div>
 </div>
 </AuthenticatedLayout>
 );
}