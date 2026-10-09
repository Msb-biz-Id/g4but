import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import {Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { Button } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';
import { Checkbox } from '@/Components/ui/checkbox';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { SelectNative } from '@/Components/ui/select-native';
import { Textarea } from '@/Components/ui/textarea';

interface IndicatorOption {
 id: number;
 code: string;
 current_version: {
 id: number;
 name: string;
 direction: string;
 measurement_unit: { code: string; name: string; symbol: string | null } | null;
 } | null;
}

interface Props extends PageProps {
 periods: Array<{ id: number; code: string; name: string; type: string }>;
 organizations: Array<{ id: number; code: string; name: string }>;
 indicators: IndicatorOption[];
 preselectedPeriodId: number | null;
 preselectedOrganizationId: number | null;
}

export default function RealizationsCreate({
 auth,
 periods,
 organizations,
 indicators,
 preselectedPeriodId,
 preselectedOrganizationId,
}: Props) {
 const { data, setData, post, processing, errors } = useForm({
 indicator_version_id: '',
 organization_id: preselectedOrganizationId?.toString() ?? '',
 measurement_period_id: preselectedPeriodId?.toString() ?? '',
 value: '',
 narrative: '',
 save_and_submit: false,
 });

 const submit: FormEventHandler = (e) => {
 e.preventDefault();
 post(route('realizations.store'));
 };

 return (
 <AuthenticatedLayout
 header="Tambah Realisasi"
 >
 <Head title="Tambah Realisasi" />
 <div className="py-12">
 <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
 <Card className="p-6">
 <form autoComplete="off" noValidate onSubmit={submit} className="space-y-6">
 <div>
 <Label className="block">Indikator</Label>
 <SelectNative
 value={data.indicator_version_id}
 onChange={(e) =>
 setData('indicator_version_id', e.target.value)
 }

 className="mt-1"
 >
 <option value="">Pilih indikator...</option>
 {indicators.map((ind) => (
 <option
 key={ind.id}
 value={ind.current_version?.id ?? ''}
 >
 {ind.code} - {ind.current_version?.name ?? ind.code}
 </option>
 ))}
 </SelectNative>
 {errors.indicator_version_id && (
 <p className="mt-1 text-xs text-red-600">
 {errors.indicator_version_id}
 </p>
 )}
 </div>

 <div className="grid gap-4 sm:grid-cols-2">
 <div>
 <Label className="block">OPD</Label>
 <SelectNative
 value={data.organization_id}
 onChange={(e) =>
 setData('organization_id', e.target.value)
 }

 className="mt-1"
 >
 <option value="">Pilih OPD...</option>
 {organizations.map((org) => (
 <option key={org.id} value={org.id}>
 {org.code} - {org.name}
 </option>
 ))}
 </SelectNative>
 {errors.organization_id && (
 <p className="mt-1 text-xs text-red-600">
 {errors.organization_id}
 </p>
 )}
 </div>

 <div>
 <Label className="block">Periode Pengukuran</Label>
 <SelectNative
 value={data.measurement_period_id}
 onChange={(e) =>
 setData('measurement_period_id', e.target.value)
 }

 className="mt-1"
 >
 <option value="">Pilih periode...</option>
 {periods.map((p) => (
 <option key={p.id} value={p.id}>
 {p.name}
 </option>
 ))}
 </SelectNative>
 {errors.measurement_period_id && (
 <p className="mt-1 text-xs text-red-600">
 {errors.measurement_period_id}
 </p>
 )}
 </div>
 </div>

 <div>
 <Label className="block">Nilai Realisasi</Label>
 <Input
 type="number"
 step="any"
 value={data.value}
 onChange={(e) => setData('value', e.target.value)}

 placeholder="mis. 75.5"
 className="mt-1"
 />
 {errors.value && (
 <p className="mt-1 text-xs text-red-600">
 {errors.value}
 </p>
 )}
 </div>

 <div>
 <Label className="block">Narasi / Keterangan</Label>
 <Textarea
 placeholder="Penjelasan capaian, kendala, dan faktor pendukung..."
 value={data.narrative}
 onChange={(e) =>
 setData('narrative', e.target.value)
 }
 rows={4}
 className="mt-1"
 />
 </div>

 <div>
 <Label className="flex items-center gap-2 text-sm font-normal">
 <Checkbox
 checked={data.save_and_submit}
 onCheckedChange={(checked) =>
 setData('save_and_submit', checked === true)
 }
 />
 Langsung submit untuk review setelah simpan
 </Label>
 </div>

 <div className="flex items-center justify-end gap-3">
 <Button asChild variant="ghost">
 <Link href={route('realizations.index')}>
 Batal
 </Link>
 </Button>
 <Button type="submit" disabled={processing}>
 Simpan Realisasi
 </Button>
 </div>
 </form>
 </Card>
 </div>
 </div>
 </AuthenticatedLayout>
 );
}