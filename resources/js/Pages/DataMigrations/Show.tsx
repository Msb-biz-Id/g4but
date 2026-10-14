import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Head, Link, router, usePage } from '@inertiajs/react';
import PageHeader from '@/Components/Dashboard/PageHeader';
import { ArrowLeft } from 'lucide-react';

interface Profile {
    total: number;
    missing_required: number;
    duplicate_codes: number;
    invalid_enum_values: number;
    columns: string[];
}

interface Reconciliation {
    source_valid: number;
    target_total: number;
    matched: number;
    unmatched_source: number;
    unmatched_target: number;
    reconciled: boolean;
}

interface Migration {
    id: number;
    name: string;
    entity_type: string;
    status: string;
    source_count: number;
    mapped_count: number;
    cleansed_count: number;
    transformed_count: number;
    loaded_count: number;
    profile: Profile | null;
    reconciliation: Reconciliation | null;
    created_at: string | null;
}

interface Props extends PageProps {
    migration: Migration;
}

const steps = [
    { key: 'staged', label: 'Inventaris & Profiling' },
    { key: 'validated', label: 'Mapping, Cleansing, Transform' },
    { key: 'reconciled', label: 'Rekonsiliasi' },
    { key: 'signed_off', label: 'Business Sign-off' },
    { key: 'loaded', label: 'Production Load' },
];

const order = ['staged', 'validated', 'reconciled', 'signed_off', 'loaded'];

export default function DataMigrationsShow({ auth, migration }: Props) {
    const flash = usePage().props.flash as { success?: string | null };
    const currentIndex = order.indexOf(migration.status);

    const run = (url: string) => {
        router.post(url, undefined, { preserveScroll: true });
    };

    return (
        <AuthenticatedLayout>
            <Head title={`Detail Migrasi - ${migration.name}`} />

            <div className="space-y-6 p-6">
                <PageHeader
                    title={migration.name}
                    description={`Proses migrasi entitas ${migration.entity_type} dengan pelacakan status pipeline terintegrasi.`}
                    breadcrumbs={[
                        { label: 'Pengaturan', href: route('settings.index') },
                        { label: 'Migrasi Data', href: route('migrations.index') },
                        { label: migration.name },
                    ]}
                    actions={
                        <Button variant="outline" size="sm" asChild>
                            <Link href={route('migrations.index')} className="gap-1.5">
                                <ArrowLeft className="h-4 w-4" />
                                Kembali ke Daftar
                            </Link>
                        </Button>
                    }
                />

                <div className="mx-auto max-w-5xl space-y-6">
                    {flash?.success && (
                        <div className="mb-4 rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">
                            {flash.success}
                        </div>
                    )}

                    <Card className="mb-4">
                        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-6">
                            <div className="flex flex-wrap gap-4 text-sm">
                                <span className="text-gray-500">
                                    Entitas:{' '}
                                    <span className="font-medium capitalize text-gray-800">
                                        {migration.entity_type}
                                    </span>
                                </span>
                                <span className="text-gray-500">
                                    Sumber:{' '}
                                    <span className="font-medium text-gray-800">
                                        {migration.source_count}
                                    </span>
                                </span>
                                <span className="text-gray-500">
                                    Transform:{' '}
                                    <span className="font-medium text-gray-800">
                                        {migration.transformed_count}
                                    </span>
                                </span>
                                <span className="text-gray-500">
                                    Dimuat:{' '}
                                    <span className="font-medium text-gray-800">
                                        {migration.loaded_count}
                                    </span>
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Button variant="outline" asChild>
                                    <a href={route('migrations.report', migration.id)}>
                                        Unduh Rekonsiliasi
                                    </a>
                                </Button>
                                <Button variant="ghost" asChild>
                                    <Link href={route('migrations.index')}>
                                        &larr; Kembali
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="mb-4">
                        <CardHeader>
                            <CardTitle>Tahapan Migrasi (BRD §26.3)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ol className="grid gap-3 sm:grid-cols-5">
                                {steps.map((step, i) => {
                                    const done = i <= currentIndex;
                                    const isCurrent = i === currentIndex;
                                    return (
                                        <li
                                            key={step.key}
                                            className={`rounded-md border px-3 py-2 text-center text-xs ${
                                                done
                                                    ? 'border-green-200 bg-green-50 text-green-700'
                                                    : 'border-gray-200 bg-gray-50 text-gray-400'
                                            } ${isCurrent ? 'ring-2 ring-green-200' : ''}`}
                                        >
                                            <div className="font-semibold">
                                                {i + 1}. {step.label}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ol>

                            {migration.status !== 'loaded' && (
                                <div className="mt-4 flex flex-wrap items-center gap-3">
                                    {migration.status === 'staged' && (
                                        <Button
                                            onClick={() =>
                                                run(route('migrations.validate', migration.id))
                                            }
                                        >
                                            Jalankan Mapping, Cleansing, Transform
                                        </Button>
                                    )}
                                    {(migration.status === 'validated') && (
                                        <Button
                                            onClick={() =>
                                                run(route('migrations.reconcile', migration.id))
                                            }
                                        >
                                            Jalankan Rekonsiliasi
                                        </Button>
                                    )}
                                    {migration.status === 'reconciled' && (
                                        <Button
                                            onClick={() =>
                                                run(route('migrations.approve', migration.id))
                                            }
                                        >
                                            Business Sign-off
                                        </Button>
                                    )}
                                    {migration.status === 'signed_off' && (
                                        <Button
                                            onClick={() =>
                                                run(route('migrations.load', migration.id))
                                            }
                                        >
                                            Production Load
                                        </Button>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {migration.profile && (
                        <Card className="mb-4">
                            <CardHeader>
                                <CardTitle>Profiling Sumber</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                                    <div>
                                        <dt className="text-xs text-gray-500">Total Baris</dt>
                                        <dd className="font-medium text-gray-800">
                                            {migration.profile.total}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-gray-500">Wajib Kosong</dt>
                                        <dd className="font-medium text-red-600">
                                            {migration.profile.missing_required}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-gray-500">Kode Duplikat</dt>
                                        <dd className="font-medium text-yellow-600">
                                            {migration.profile.duplicate_codes}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-gray-500">Enum Tidak Valid</dt>
                                        <dd className="font-medium text-red-600">
                                            {migration.profile.invalid_enum_values}
                                        </dd>
                                    </div>
                                </dl>
                            </CardContent>
                        </Card>
                    )}

                    {migration.reconciliation && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Reconciliation Report</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                                    <div>
                                        <dt className="text-xs text-gray-500">Sumber Valid</dt>
                                        <dd className="font-medium text-gray-800">
                                            {migration.reconciliation.source_valid}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-gray-500">Di Target</dt>
                                        <dd className="font-medium text-gray-800">
                                            {migration.reconciliation.target_total}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-gray-500">Cocok</dt>
                                        <dd className="font-medium text-green-600">
                                            {migration.reconciliation.matched}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-gray-500">Belum di Target</dt>
                                        <dd className="font-medium text-yellow-600">
                                            {migration.reconciliation.unmatched_source}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-gray-500">Hanya di Target</dt>
                                        <dd className="font-medium text-yellow-600">
                                            {migration.reconciliation.unmatched_target}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-gray-500">Status</dt>
                                        <dd
                                            className={`font-medium ${
                                                migration.reconciliation.reconciled
                                                    ? 'text-green-600'
                                                    : 'text-red-600'
                                            }`}
                                        >
                                            {migration.reconciliation.reconciled
                                                ? 'Terkonsiliasi'
                                                : 'Belum terkonsiliasi'}
                                        </dd>
                                    </div>
                                </dl>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}