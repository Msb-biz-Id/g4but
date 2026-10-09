import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { SelectNative } from '@/Components/ui/select-native';
import { PageProps } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import { cn } from '@/lib/utils';
import ConfirmDialog from '@/Components/ConfirmDialog';

interface OrganizationUnit {
 id: number;
 code: string;
 name: string;
 unit_type: string | null;
 is_active: boolean;
}

interface Props extends PageProps {
 organization: {
 id: number;
 code: string;
 name: string;
 short_name?: string | null;
 type: string;
 address: string | null;
 phone: string | null;
 email: string | null;
 is_active: boolean;
 parent: { id: number; code: string; name: string } | null;
 units: OrganizationUnit[];
 users: Array<{ id: number; name: string }>;
 };
 parents: Array<{ id: number; code: string; name: string; short_name?: string | null }>;
 isProvincialAdmin?: boolean;
}

export default function OrganizationsEdit({ organization, parents, isProvincialAdmin = true }: Props) {
 const { data, setData, errors, put, processing, transform } = useForm({
 code: organization.code,
 name: organization.name,
 short_name: organization.short_name ?? '',
 type: organization.type,
 parent_id: organization.parent?.id ?? ('' as number | string),
 address: organization.address ?? '',
 phone: organization.phone ?? '',
 email: organization.email ?? '',
 is_active: organization.is_active,
 });

 const [unitForm, setUnitForm] = useState({
 code: '',
 name: '',
 unit_type: '',
 });
 const [unitErrors, setUnitErrors] = useState<Record<string, string>>({});
 const [deleteUnitTarget, setDeleteUnitTarget] = useState<OrganizationUnit | null>(null);

 const submit = (e: FormEvent) => {
 e.preventDefault();
 transform((form) => ({
 ...form,
 parent_id: form.parent_id ? Number(form.parent_id) : null,
 short_name: form.short_name ? form.short_name.trim() : null,
 }));
 put(route('organizations.update', organization.id));
 };

 const addUnit = (e: FormEvent) => {
 e.preventDefault();
 router.post(
 route('organizations.units.store', organization.id),
 unitForm,
 {
 onError: (errs) => setUnitErrors(errs),
 onSuccess: () => {
 setUnitForm({ code: '', name: '', unit_type: '' });
 setUnitErrors({});
 },
 },
 );
 };

 const deleteUnit = (unit: OrganizationUnit) => {
 setDeleteUnitTarget(unit);
 };

 const confirmDeleteUnit = () => {
 if (!deleteUnitTarget) return;
 router.delete(
 route('organizations.units.destroy', [
 organization.id,
 deleteUnitTarget.id,
 ]),
 {
 onSuccess: () => setDeleteUnitTarget(null),
 },
 );
 };

 return (
 <AuthenticatedLayout
 header="Edit Organisasi"
 >
 <Head title="Edit Organisasi" />
 <div className="mx-auto max-w-4xl space-y-6">
 <Card>
 <CardContent className="p-4 sm:p-6">
 <form autoComplete="off" noValidate onSubmit={submit} className="space-y-4">
 {!isProvincialAdmin && (
 <div className="rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
 <p className="font-semibold mb-0.5">ℹ️ Mode Edit Profil Instansi (Admin OPD)</p>
 <p>Anda hanya dapat memperbarui informasi kontak dan unit kerja internal instansi Anda. Perubahan struktur master (kode, tipe, induk, status aktif) dikelola secara terpusat oleh Admin Provinsi / Biro Organisasi.</p>
 </div>
 )}

 <div className="grid gap-4 sm:grid-cols-2">
 <div>
 <InputLabel htmlFor="code" value="Kode" />
 <TextInput
 id="code"
 placeholder="cth: DISKOMINFO"
 value={data.code}
 disabled={!isProvincialAdmin}
 onChange={(e) =>
 setData('code', e.target.value)
 }
 className={cn("mt-1 block w-full", !isProvincialAdmin && "bg-slate-100 text-slate-500 cursor-not-allowed")}
 />
 <InputError message={errors.code} className="mt-2" />
 </div>
 <div>
 <InputLabel htmlFor="type" value="Tipe" />
 <SelectNative
 id="type"
 value={data.type}
 disabled={!isProvincialAdmin}
 onChange={(e) =>
 setData('type', e.target.value)
 }
 className={cn("mt-1 block w-full", !isProvincialAdmin && "bg-slate-100 text-slate-500 cursor-not-allowed")}
 >
 <option value="province">Provinsi</option>
 <option value="opd">OPD</option>
 <option value="biro">Biro</option>
 <option value="inspektorat">Inspektorat</option>
 <option value="unit">Unit</option>
 </SelectNative>
 </div>
 </div>

                            <div className="grid gap-4 sm:grid-cols-3">
                                <div className="sm:col-span-2">
                                    <InputLabel htmlFor="name" value="Nama Lengkap Organisasi" />
                                    <TextInput
                                        id="name"
                                        placeholder="cth: Dinas Komunikasi dan Informatika"
                                        value={data.name}
                                        disabled={!isProvincialAdmin}
                                        onChange={(e) => setData('name', e.target.value)}
                                        className={cn("mt-1 block w-full", !isProvincialAdmin && "bg-slate-100 text-slate-500 cursor-not-allowed")}
                                    />
                                    <InputError message={errors.name} className="mt-2" />
                                </div>
                                <div>
                                    <InputLabel htmlFor="short_name" value="Nama Singkat / Akronim" />
                                    <TextInput
                                        id="short_name"
                                        placeholder="cth: DISKOMINFO"
                                        value={data.short_name}
                                        disabled={!isProvincialAdmin}
                                        onChange={(e) => setData('short_name', e.target.value)}
                                        className={cn("mt-1 block w-full", !isProvincialAdmin && "bg-slate-100 text-slate-500 cursor-not-allowed")}
                                    />
                                    <InputError message={errors.short_name} className="mt-2" />
                                </div>
                            </div>

 <div>
 <InputLabel htmlFor="parent_id" value="Induk (opsional)" />
 <SelectNative
 id="parent_id"
 value={data.parent_id}
 disabled={!isProvincialAdmin}
 onChange={(e) =>
 setData(
 'parent_id',
 e.target.value
 ? Number(e.target.value)
 : '',
 )
 }
 className={cn("mt-1 block w-full", !isProvincialAdmin && "bg-slate-100 text-slate-500 cursor-not-allowed")}
 >
 <option value="">Tanpa induk</option>
 {parents.map((parent) => (
 <option key={parent.id} value={parent.id}>
 {parent.code} - {parent.name}
 </option>
 ))}
 </SelectNative>
 <InputError message={errors.parent_id} className="mt-2" />
 </div>

 <div className="grid gap-4 sm:grid-cols-3">
 <div>
 <InputLabel htmlFor="phone" value="Telepon" />
 <TextInput
 id="phone"
 placeholder="cth: 081234567890 / (0961) 12345"
 value={data.phone}
 onChange={(e) =>
 setData('phone', e.target.value)
 }
 className="mt-1 block w-full"
 />
 </div>
 <div>
 <InputLabel htmlFor="email" value="Email" />
 <TextInput
 id="email"
 type="email"
 placeholder="cth: diskominfo@papuabaratprov.go.id"
 value={data.email}
 onChange={(e) =>
 setData('email', e.target.value)
 }
 className="mt-1 block w-full"
 />
 <InputError message={errors.email} className="mt-2" />
 </div>
 <div>
 <InputLabel htmlFor="address" value="Alamat" />
 <TextInput
 id="address"
 placeholder="cth: Jl. Abraham Atururi, Manokwari"
 value={data.address}
 onChange={(e) =>
 setData('address', e.target.value)
 }
 className="mt-1 block w-full"
 />
 </div>
 </div>

 {isProvincialAdmin && (
 <label className="flex items-center">
 <input
 type="checkbox"
 checked={data.is_active}
 onChange={(e) =>
 setData('is_active', e.target.checked)
 }
 className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
 />
 <span className="ms-2 text-sm text-gray-600">Aktif</span>
 </label>
 )}

 <div className="flex items-center gap-4">
 <PrimaryButton disabled={processing}>
 Simpan Perubahan
 </PrimaryButton>
 <Link
 href={route('organizations.index')}
 className="text-sm text-gray-600 hover:text-gray-800"
 >
 Batal
 </Link>
 </div>
 </form>
 </CardContent>
 </Card>

 <Card>
 <CardHeader className="p-4 sm:p-6 pb-0">
 <CardTitle className="text-lg">
 Unit Organisasi
 </CardTitle>
 </CardHeader>
 <CardContent className="p-4 sm:p-6">
 <form autoComplete="off" noValidate onSubmit={addUnit} className="mt-4 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
 <div>
 <InputLabel htmlFor="unit_code" value="Kode" />
 <TextInput
 id="unit_code"
 placeholder="cth: BID-APT"
 value={unitForm.code}
 onChange={(e) =>
 setUnitForm({
 ...unitForm,
 code: e.target.value,
 })
 }
 className="mt-1 block w-full"

 />
 <InputError message={unitErrors.code} className="mt-1" />
 </div>
 <div>
 <InputLabel htmlFor="unit_name" value="Nama" />
 <TextInput
 id="unit_name"
 placeholder="cth: Bidang Aplikasi Informatika"
 value={unitForm.name}
 onChange={(e) =>
 setUnitForm({
 ...unitForm,
 name: e.target.value,
 })
 }
 className="mt-1 block w-full"

 />
 <InputError message={unitErrors.name} className="mt-1" />
 </div>
 <div>
 <InputLabel htmlFor="unit_type" value="Tipe" />
 <TextInput
 id="unit_type"
 placeholder="cth: Bidang / Seksi / Sub Bagian"
 value={unitForm.unit_type}
 onChange={(e) =>
 setUnitForm({
 ...unitForm,
 unit_type: e.target.value,
 })
 }
 className="mt-1 block w-full"
 />
 </div>
 <div className="flex items-end">
 <PrimaryButton disabled={processing} className="w-full sm:w-auto justify-center">
 Tambah Unit
 </PrimaryButton>
 </div>
 </form>

 <ul className="mt-4 divide-y divide-gray-200 dark:divide-slate-700">
 {organization.units.map((unit) => (
 <li
 key={unit.id}
 className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-2"
 >
 <div>
 <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
 {unit.code} - {unit.name}
 </span>
 {unit.unit_type && (
 <span className="ms-0 sm:ms-2 block sm:inline text-xs text-gray-500">
 ({unit.unit_type})
 </span>
 )}
 </div>
 <button
 type="button"
 onClick={() => deleteUnit(unit)}
 className="text-sm text-red-600 hover:text-red-800 text-left sm:text-right"
 >
 Hapus
 </button>
 </li>
 ))}
 {organization.units.length === 0 && (
 <li className="py-3 text-sm text-gray-500">
 Belum ada unit.
 </li>
 )}
 </ul>
 </CardContent>
 </Card>
 </div>
 <ConfirmDialog
     open={deleteUnitTarget !== null}
     onOpenChange={(open) => !open && setDeleteUnitTarget(null)}
     title="Hapus Unit Organisasi?"
     description={`Apakah Anda yakin ingin menghapus unit "${deleteUnitTarget?.name}"? Unit anak akan tetap dipertahankan.`}
     confirmText="Hapus Unit"
     cancelText="Batal"
     onConfirm={confirmDeleteUnit}
     onCancel={() => setDeleteUnitTarget(null)}
 />
 </AuthenticatedLayout>
 );
}