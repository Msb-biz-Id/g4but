import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Head, router, usePage } from '@inertiajs/react';
import PageHeader from '@/Components/Dashboard/PageHeader';
import { formatDateTime } from '@/lib/utils';

interface ReadinessItem {
    id: number;
    item_key: string;
    label: string;
    category: string;
    checked: boolean;
    checked_at: string | null;
    checked_by: { id: number; name: string } | null;
}

interface Props extends PageProps {
    items: ReadinessItem[];
    progress: {
        total: number;
        checked: number;
        percent: number;
        is_ready: boolean;
    };
}

export default function ReadinessIndex({ auth, items, progress }: Props) {
    const permissions = auth.user.permissions ?? [];
    const canManage = permissions.includes('config:manage');

    const flash = usePage().props.flash;

    const toggle = (item: ReadinessItem) => {
        if (!canManage) {
            return;
        }

        router.post(
            route('readiness.update', item.id),
            { checked: !item.checked },
            { preserveScroll: true },
        );
    };

    const grouped = items.reduce<Record<string, ReadinessItem[]>>((acc, item) => {
        (acc[item.category] ??= []).push(item);

        return acc;
    }, {});

    return (
        <AuthenticatedLayout>
            <Head title="Kesiapan Sistem" />

            <div className="space-y-6 p-6">
                <PageHeader
                    title="Kesiapan Sistem (Go-Live Readiness)"
                    description="Daftar periksa kesiapan operasional, integritas data, dan konfigurasi keamanan sebelum peluncuran sistem penuh."
                    breadcrumbs={[
                        { label: 'Pengaturan', href: route('settings.index') },
                        { label: 'Go-Live Readiness' },
                    ]}
                />

                <div className="mx-auto max-w-4xl space-y-6">
                    {flash?.success && (
                        <div className="mb-4 rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">
                            {flash.success}
                        </div>
                    )}

                    <Card>
                        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
                            <CardTitle>Checklist Pre-Go-Live (BRD §32.1)</CardTitle>
                            <Badge variant={progress.is_ready ? 'success' : 'warning'}>
                                {progress.is_ready
                                    ? 'SIAP GO-LIVE'
                                    : `${progress.checked}/${progress.total} selesai`}
                            </Badge>
                        </CardHeader>
                        <CardContent>
                            <div className="mt-4">
                                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                                    <div
                                        className={`h-2 rounded-full transition-all ${
                                            progress.is_ready ? 'bg-green-500' : 'bg-indigo-500'
                                        }`}
                                        style={{ width: `${progress.percent}%` }}
                                    />
                                </div>
                                <p className="mt-1 text-right text-xs text-gray-500">
                                    {progress.percent}%
                                </p>
                            </div>

                            {!canManage && (
                                <p className="mt-4 rounded-md bg-yellow-50 px-3 py-2 text-xs text-yellow-700">
                                    Anda memiliki akses baca. Hubungi administrator untuk memperbarui checklist.
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {Object.entries(grouped).map(([category, categoryItems]) => (
                        <Card key={category} className="mt-4">
                            <CardHeader>
                                <CardTitle className="text-sm">{category}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="divide-y divide-gray-100">
                                    {categoryItems.map((item) => (
                                        <li key={item.id} className="py-3">
                                            <button
                                                type="button"
                                                onClick={() => toggle(item)}
                                                disabled={!canManage}
                                                className={`flex w-full items-start gap-3 text-left ${
                                                    canManage ? 'cursor-pointer' : 'cursor-default'
                                                }`}
                                            >
                                                <span
                                                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs font-bold ${
                                                        item.checked
                                                            ? 'border-green-500 bg-green-500 text-white'
                                                            : 'border-gray-300 bg-white text-transparent'
                                                    }`}
                                                >
                                                    ✓
                                                </span>
                                                <span className="flex-1">
                                                    <span
                                                        className={`text-sm ${
                                                            item.checked
                                                                ? 'text-gray-400 line-through'
                                                                : 'text-gray-800'
                                                        }`}
                                                    >
                                                        {item.label}
                                                    </span>
                                                    {item.checked && item.checked_by && (
                                                        <span className="mt-0.5 block text-xs text-gray-400">
                                                            Oleh {item.checked_by.name} · {formatDateTime(item.checked_at)}
                                                        </span>
                                                    )}
                                                </span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}