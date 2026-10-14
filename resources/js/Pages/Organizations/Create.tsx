import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Card, CardContent } from '@/Components/ui/card';
import { SelectNative } from '@/Components/ui/select-native';
import { PageProps } from '@/types';
import {Head, Link, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';

interface Props extends PageProps {
 parents: Array<{ id: number; code: string; name: string }>;
}

export default function OrganizationsCreate({ parents }: Props) {
    const { data, setData, errors, post, processing, transform } = useForm({
        code: '',
        name: '',
        short_name: '',
        type: 'opd',
        parent_id: '' as number | string,
        address: '',
        phone: '',
        email: '',
        is_active: true,
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        transform((form) => ({
            ...form,
            parent_id: form.parent_id ? Number(form.parent_id) : null,
            short_name: form.short_name ? form.short_name.trim() : null,
        }));
        post(route('organizations.store'));
    };

    return (
        <AuthenticatedLayout header="Tambah Organisasi">
            <Head title="Tambah Organisasi" />
            <div className="mx-auto max-w-2xl space-y-6">
                <Card>
                    <CardContent className="p-4 sm:p-6">
                        <form autoComplete="off" noValidate onSubmit={submit} className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <InputLabel htmlFor="code" value="Kode Organisasi *" />
                                    <TextInput
                                        id="code"
                                        placeholder="cth: DISKOMINFO-PB"
                                        value={data.code}
                                        onChange={(e) => setData('code', e.target.value)}
                                        className="mt-1 block w-full"
                                    />
                                    <InputError message={errors.code} className="mt-2" />
                                </div>
                                <div>
                                    <InputLabel htmlFor="type" value="Tipe Organisasi *" />
                                    <SelectNative
                                        id="type"
                                        value={data.type}
                                        onChange={(e) => setData('type', e.target.value)}
                                        className="mt-1 block w-full"
                                    >
                                        <option value="opd">OPD Induk (Dinas / Badan)</option>
                                        <option value="sekretariat">Sekretariat</option>
                                        <option value="bidang">Bidang / Bagian</option>
                                    </SelectNative>
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-3">
                                <div className="sm:col-span-2">
                                    <InputLabel htmlFor="name" value="Nama Lengkap Organisasi *" />
                                    <TextInput
                                        id="name"
                                        placeholder="cth: Dinas Komunikasi dan Informatika"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        className="mt-1 block w-full"
                                    />
                                    <InputError message={errors.name} className="mt-2" />
                                </div>
                                <div>
                                    <InputLabel htmlFor="short_name" value="Nama Singkat / Akronim" />
                                    <TextInput
                                        id="short_name"
                                        placeholder="cth: DISKOMINFO"
                                        value={data.short_name}
                                        onChange={(e) => setData('short_name', e.target.value)}
                                        className="mt-1 block w-full"
                                    />
                                    <InputError message={errors.short_name} className="mt-2" />
                                </div>
                            </div>

 <div>
 <InputLabel htmlFor="parent_id" value="Induk (opsional)" />
 <SelectNative
 id="parent_id"
 value={data.parent_id}
 onChange={(e) =>
 setData(
 'parent_id',
 e.target.value
 ? Number(e.target.value)
 : '',
 )
 }
 className="mt-1 block w-full"
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

 <div className="grid gap-4 sm:grid-cols-2">
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
 placeholder="cth: diskominfo@pemda.go.id"
 value={data.email}
 onChange={(e) =>
 setData('email', e.target.value)
 }
 className="mt-1 block w-full"
 />
 <InputError message={errors.email} className="mt-2" />
 </div>
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

 <div className="flex items-center gap-4">
 <PrimaryButton disabled={processing}>
 Simpan
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
 </div>
 </AuthenticatedLayout>
 );
}