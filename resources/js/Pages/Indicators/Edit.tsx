import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent } from '@/Components/ui/card';
import { SelectNative } from '@/Components/ui/select-native';
import { Textarea } from '@/Components/ui/textarea';
import { PageProps } from '@/types';
import {Head, Link, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import { formatDateTime } from '@/lib/utils';

interface Props extends PageProps {
 indicator: {
 id: number;
 code: string;
 status: string;
 current_version: {
 id: number;
 version_number: number;
 name: string;
 definition: string | null;
 type: string;
 direction: string;
 measurement_unit_id: number | null;
 frequency: string;
 data_source: string | null;
 formula_notes: string | null;
 baseline_value: string | null;
 valid_from: string | null;
 valid_to: string | null;
 } | null;
 versions: Array<{
 id: number;
 version_number: number;
 name: string;
 change_reason: string | null;
 created_at: string;
 }>;
 };
 units: Array<{
 id: number;
 code: string;
 name: string;
 symbol: string | null;
 }>;
 organizations: Array<{ id: number; code: string; name: string }>;
}

export default function IndicatorsEdit({
 indicator,
 units,
 organizations,
}: Props) {
 const version = indicator.current_version;

 const { data, setData, errors, put, processing } = useForm({
 code: indicator.code,
 name: version?.name ?? '',
 definition: version?.definition ?? '',
 type: version?.type ?? 'output',
 direction: version?.direction ?? 'higher_is_better',
 measurement_unit_id:
 version?.measurement_unit_id ?? ('' as number | string),
 frequency: version?.frequency ?? 'monthly',
 data_source: version?.data_source ?? '',
 formula_notes: version?.formula_notes ?? '',
 baseline_value: version?.baseline_value ?? '',
 valid_from: version?.valid_from ?? '',
 valid_to: version?.valid_to ?? '',
 change_reason: '',
 });

 const submit = (e: FormEvent) => {
 e.preventDefault();
 put(route('indicators.update', indicator.id));
 };

 return (
 <AuthenticatedLayout
 header="Edit Indikator"
 >
 <Head title="Edit Indikator" />
 <div className="py-12">
 <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
 <Card>
 <CardContent className="p-6">
 <div className="mb-4 flex items-center justify-between">
 <Badge variant="secondary">
 Versi saat ini: v{version?.version_number ?? 1}
 </Badge>
 {indicator.status === 'active' && (
 <Badge variant="success">
 Aktif - perubahan akan membuat versi baru
 </Badge>
 )}
 </div>

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

 <div>
 <InputLabel htmlFor="change_reason" value="Alasan Perubahan" />
 <TextInput
 id="change_reason"
 value={data.change_reason}
 onChange={(e) =>
 setData('change_reason', e.target.value)
 }
 placeholder="Wajib diisi jika indikator telah digunakan"
 className="mt-1 block w-full"
 />
 <InputError message={errors.change_reason} className="mt-1" />
 </div>

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

 {indicator.versions.length > 1 && (
 <div className="mt-8 border-t border-gray-200 pt-6">
 <h3 className="text-base font-semibold text-gray-900">
 Riwayat Versi
 </h3>
 <ul className="mt-3 space-y-2">
 {indicator.versions
 .slice()
 .reverse()
 .map((v) => (
 <li
 key={v.id}
 className="flex items-center justify-between rounded-md bg-gray-50 px-4 py-2 text-sm"
 >
 <span className="font-medium text-gray-900">
 v{v.version_number}
 </span>
 <span className="text-gray-600">
 {v.change_reason ?? '—'}
 </span>
 <span className="text-xs text-gray-400">
 {formatDateTime(v.created_at)}
 </span>
 </li>
 ))}
 </ul>
 </div>
 )}
 </CardContent>
 </Card>
 </div>
 </div>
 </AuthenticatedLayout>
 );
}