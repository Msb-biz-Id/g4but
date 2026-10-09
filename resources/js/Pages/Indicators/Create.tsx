import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Card, CardContent } from '@/Components/ui/card';
import { SelectNative } from '@/Components/ui/select-native';
import { Textarea } from '@/Components/ui/textarea';
import { PageProps } from '@/types';
import {Head, Link, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';

interface Props extends PageProps {
 units: Array<{
 id: number;
 code: string;
 name: string;
 symbol: string | null;
 }>;
 organizations: Array<{ id: number; code: string; name: string }>;
}

export default function IndicatorsCreate({ units, organizations }: Props) {
 const { data, setData, errors, post, processing } = useForm({
 code: '',
 name: '',
 definition: '',
 type: 'output',
 direction: 'higher_is_better',
 measurement_unit_id: '' as number | string,
 frequency: 'monthly',
 data_source: '',
 formula_notes: '',
 owner_organization_id: '' as number | string,
 is_iku: false,
 baseline_value: '',
 valid_from: '',
 valid_to: '',
 });

 const submit = (e: FormEvent) => {
 e.preventDefault();
 post(route('indicators.store'));
 };

 return (
 <AuthenticatedLayout
 header="Tambah Indikator"
 >
 <Head title="Tambah Indikator" />
 <div className="py-12">
 <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
 <Card>
 <CardContent className="p-6">
 <form autoComplete="off" noValidate onSubmit={submit} className="space-y-4">
 <div className="grid gap-4 sm:grid-cols-2">
 <div>
 <InputLabel htmlFor="code" value="Kode" />
 <TextInput
 id="code"
 placeholder="cth: IND-001"
 value={data.code}
 onChange={(e) =>
 setData('code', e.target.value)
 }
 className="mt-1 block w-full"
 />
 <InputError message={errors.code} className="mt-2" />
 </div>
 <div>
 <InputLabel htmlFor="type" value="Jenis" />
 <SelectNative
 id="type"
 value={data.type}
 onChange={(e) =>
 setData('type', e.target.value)
 }
 className="mt-1 block w-full"
 >
 <option value="input">Input</option>
 <option value="process">Proses</option>
 <option value="output">Output</option>
 <option value="outcome">Outcome</option>
 <option value="impact">Impact</option>
 </SelectNative>
 </div>
 </div>

 <div>
 <InputLabel htmlFor="name" value="Nama Indikator" />
 <TextInput
 id="name"
 placeholder="cth: Indeks Kepuasan Masyarakat"
 value={data.name}
 onChange={(e) =>
 setData('name', e.target.value)
 }
 className="mt-1 block w-full"
 />
 <InputError message={errors.name} className="mt-2" />
 </div>

 <div>
 <InputLabel htmlFor="definition" value="Definisi" />
 <Textarea
 id="definition"
 placeholder="Uraikan definisi operasional indikator..."
 value={data.definition}
 onChange={(e) =>
 setData('definition', e.target.value)
 }
 rows={3}
 className="mt-1"
 />
 </div>

 <div className="grid gap-4 sm:grid-cols-3">
 <div>
 <InputLabel htmlFor="direction" value="Polaritas" />
 <SelectNative
 id="direction"
 value={data.direction}
 onChange={(e) =>
 setData('direction', e.target.value)
 }
 className="mt-1 block w-full"
 >
 <option value="higher_is_better">Semakin tinggi semakin baik</option>
 <option value="lower_is_better">Semakin rendah semakin baik</option>
 <option value="exact">Nilai pasti</option>
 <option value="binary">Ya/Tidak</option>
 <option value="custom">Kustom</option>
 </SelectNative>
 </div>
 <div>
 <InputLabel htmlFor="measurement_unit_id" value="Satuan" />
 <SelectNative
 id="measurement_unit_id"
 value={data.measurement_unit_id}
 onChange={(e) =>
 setData(
 'measurement_unit_id',
 e.target.value
 ? Number(e.target.value)
 : '',
 )
 }
 className="mt-1 block w-full"
 >
 <option value="">—</option>
 {units.map((unit) => (
 <option key={unit.id} value={unit.id}>
 {unit.code} - {unit.name}
 </option>
 ))}
 </SelectNative>
 </div>
 <div>
 <InputLabel htmlFor="frequency" value="Frekuensi" />
 <SelectNative
 id="frequency"
 value={data.frequency}
 onChange={(e) =>
 setData('frequency', e.target.value)
 }
 className="mt-1 block w-full"
 >
 <option value="monthly">Bulanan</option>
 <option value="quarterly">Triwulan</option>
 <option value="semester">Semesteran</option>
 <option value="annual">Tahunan</option>
 </SelectNative>
 </div>
 </div>

 <div className="grid gap-4 sm:grid-cols-2">
 <div>
 <InputLabel htmlFor="owner_organization_id" value="Pemilik (OPD)" />
 <SelectNative
 id="owner_organization_id"
 value={data.owner_organization_id}
 onChange={(e) =>
 setData(
 'owner_organization_id',
 e.target.value
 ? Number(e.target.value)
 : '',
 )
 }
 className="mt-1 block w-full"
 >
 <option value="">—</option>
 {organizations.map((org) => (
 <option key={org.id} value={org.id}>
 {org.code} - {org.name}
 </option>
 ))}
 </SelectNative>
 </div>
 <div>
 <InputLabel htmlFor="data_source" value="Sumber Data" />
 <TextInput
 id="data_source"
 placeholder="cth: Laporan Survei / Renja OPD"
 value={data.data_source}
 onChange={(e) =>
 setData('data_source', e.target.value)
 }
 className="mt-1 block w-full"
 />
 </div>
 </div>

 <div>
 <InputLabel htmlFor="formula_notes" value="Catatan Formula / Metode" />
 <Textarea
 id="formula_notes"
 placeholder="cth: (Jumlah responden puas / Total responden) * 100%"
 value={data.formula_notes}
 onChange={(e) =>
 setData('formula_notes', e.target.value)
 }
 rows={2}
 className="mt-1"
 />
 </div>

 <div className="grid gap-4 sm:grid-cols-3">
 <div>
 <InputLabel htmlFor="baseline_value" value="Nilai Baseline" />
 <TextInput
 id="baseline_value"
 type="number"
 step="any"
 placeholder="cth: 75.50"
 value={data.baseline_value}
 onChange={(e) =>
 setData('baseline_value', e.target.value)
 }
 className="mt-1 block w-full"
 />
 </div>
 <div>
 <InputLabel htmlFor="valid_from" value="Berlaku Dari" />
 <TextInput
 id="valid_from"
 type="date"
 placeholder="Pilih tanggal mulai"
 value={data.valid_from}
 onChange={(e) =>
 setData('valid_from', e.target.value)
 }
 className="mt-1 block w-full"
 />
 </div>
 <div>
 <InputLabel htmlFor="valid_to" value="Berlaku Sampai" />
 <TextInput
 id="valid_to"
 type="date"
 placeholder="Pilih tanggal selesai"
 value={data.valid_to}
 onChange={(e) =>
 setData('valid_to', e.target.value)
 }
 className="mt-1 block w-full"
 />
 <InputError message={errors.valid_to} className="mt-1" />
 </div>
 </div>

 <label className="flex items-center">
 <input
 type="checkbox"
 checked={data.is_iku}
 onChange={(e) =>
 setData('is_iku', e.target.checked)
 }
 className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
 />
 <span className="ms-2 text-sm text-gray-600">
 Merupakan IKU (Indikator Kinerja Utama)
 </span>
 </label>

 <div className="flex items-center gap-4">
 <PrimaryButton disabled={processing}>
 Simpan
 </PrimaryButton>
 <Link
 href={route('indicators.index')}
 className="text-sm text-gray-600 hover:text-gray-800"
 >
 Batal
 </Link>
 </div>
 </form>
 </CardContent>
 </Card>
 </div>
 </div>
 </AuthenticatedLayout>
 );
}