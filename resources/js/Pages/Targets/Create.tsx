import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/Components/ui/button';
import { Card, CardContent } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { SelectNative } from '@/Components/ui/select-native';
import { PageProps } from '@/types';
import {Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

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
 organizations: Array<{ id: number; code: string; name: string }>;
 periods: Array<{ id: number; code: string; name: string; year: number }>;
 indicators: IndicatorOption[];
 preselectedOrganizationId: number | null;
 preselectedPeriodId: number | null;
}

export default function TargetsCreate({
 auth,
 organizations,
 periods,
 indicators,
 preselectedOrganizationId,
 preselectedPeriodId,
}: Props) {
 const { data, setData, post, processing, errors } = useForm({
 indicator_version_id: '',
 organization_id: preselectedOrganizationId?.toString() ?? '',
 planning_period_id: preselectedPeriodId?.toString() ?? '',
 target_value: '',
 });

 const submit: FormEventHandler = (e) => {
 e.preventDefault();
 post(route('targets.store'));
 };

 return (
 <AuthenticatedLayout
 header="Tambah Target"
 >
 <Head title="Tambah Target" />
 <div className="py-12">
 <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
 <Card>
 <CardContent className="p-6">
 <form autoComplete="off" noValidate
 onSubmit={submit}
 className="space-y-6"
 >
 <div>
 <Label className="block">
 Indikator
 </Label>
 <SelectNative
 value={data.indicator_version_id}
 onChange={(e) =>
 setData(
 'indicator_version_id',
 e.target.value,
 )
 }

 className="mt-1 block w-full"
 >
 <option value="">Pilih indikator...</option>
 {indicators.map((ind) => (
 <option
 key={ind.id}
 value={ind.current_version?.id ?? ''}
 >
 {ind.code} -{' '}
 {ind.current_version?.name ?? ind.code}
 </option>
 ))}
 </SelectNative>
 {errors.indicator_version_id && (
 <p className="mt-1 text-xs text-red-600">
 {errors.indicator_version_id}
 </p>
 )}
 </div>

 <div>
 <Label className="block">
 OPD
 </Label>
 <SelectNative
 value={data.organization_id}
 onChange={(e) =>
 setData('organization_id', e.target.value)
 }

 className="mt-1 block w-full"
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
 <Label className="block">
 Periode Perencanaan
 </Label>
 <SelectNative
 value={data.planning_period_id}
 onChange={(e) =>
 setData('planning_period_id', e.target.value)
 }

 className="mt-1 block w-full"
 >
 <option value="">Pilih periode...</option>
 {periods.map((p) => (
 <option key={p.id} value={p.id}>
 {p.name} ({p.year})
 </option>
 ))}
 </SelectNative>
 {errors.planning_period_id && (
 <p className="mt-1 text-xs text-red-600">
 {errors.planning_period_id}
 </p>
 )}
 </div>

 <div>
 <Label className="block">
 Nilai Target
 </Label>
 <Input
 type="number"
 step="any"
 value={data.target_value}
 onChange={(e) =>
 setData('target_value', e.target.value)
 }

 placeholder="mis. 80"
 className="mt-1 block w-full"
 />
 {errors.target_value && (
 <p className="mt-1 text-xs text-red-600">
 {errors.target_value}
 </p>
 )}
 </div>

 <div className="flex items-center justify-end gap-3">
 <Button asChild variant="outline">
 <Link
 href={route('targets.index')}
 >
 Batal
 </Link>
 </Button>
 <Button
 type="submit"
 disabled={processing}
 >
 Simpan Target
 </Button>
 </div>
 </form>
 </CardContent>
 </Card>
 </div>
 </div>
 </AuthenticatedLayout>
 );
}