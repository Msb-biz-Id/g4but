import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatDateTime } from '@/lib/utils';
import { PageProps } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';

import { FormEventHandler } from 'react';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Textarea } from '@/Components/ui/textarea';
import { SelectNative } from '@/Components/ui/select-native';
import TablePagination from '@/Components/TablePagination';
import { ChevronRight, Bell, CheckCheck, Megaphone } from 'lucide-react';
import PageHeader from '@/Components/Dashboard/PageHeader';

function getDestinationUrl(notif: NotificationItem): string | null {
    if (!notif.resource_type) return null;
    switch (notif.resource_type) {
        case 'planning_document':
            return route('planning.documents.index');
        case 'agreement':
            return route('planning.agreements.index');
        case 'iku':
            return route('planning.iku.index');
        case 'action_plan':
            return route('planning.action-plans.index');
        default:
            return null;
    }
}


interface NotificationItem {
    id: number;
    event: string;
    channel: string;
    title: string;
    message: string | null;
    resource_type?: string | null;
    resource_id?: number | null;
    read_at: string | null;
    created_at: string | null;
}


interface Props extends PageProps {
    notifications: {

        data: NotificationItem[];
        links: Array<{ url: string | null; label: string; active: boolean }>;
        from?: number;
        to?: number;
        total?: number;
    };
    users: Array<{ id: number; name: string; email: string }>;
    unread_count: number;
    filters?: { per_page?: number | string };
}

const eventLabels: Record<string, string> = {
 assignment: 'Penugasan',
 submission: 'Pengiriman',
 revision: 'Revisi',
 approval: 'Persetujuan',
 rejection: 'Penolakan',
 deadline: 'Tenggat',
 announcement: 'Pengumuman',
};

export default function NotificationsIndex({
    auth,
    notifications,
    users,
    unread_count,
    filters,
}: Props) {
 const { flash } = usePage().props as { flash: { success?: string | null } };
 const permissions = auth.user?.permissions ?? [];
 const canSend = permissions.includes('notification:send');

 const form = useForm({
 user_id: '',
 event: 'announcement',
 title: '',
 message: '',
 });

 const submit: FormEventHandler = (e) => {
 e.preventDefault();
 form.post(route('notifications.send'), {
 preserveScroll: true,
 onSuccess: () => form.reset('title', 'message', 'user_id'),
 });
 };

 return (
 <AuthenticatedLayout
 header="Notifikasi"
 >
 <Head title="Pusat Notifikasi" />
 <div className="mx-auto max-w-5xl space-y-6">
 <PageHeader
 breadcrumbs={[
 { label: 'Notifikasi' },
 ]}
 title="Pusat Notifikasi & Pengumuman"
 description={`Daftar pemberitahuan resmi sistem, pengumuman, dan riwayat tenggat kerja.${unread_count > 0 ? ` Terdapat ${unread_count} notifikasi belum dibaca.` : ''}`}
 badge={unread_count > 0 ? `${unread_count} Belum Dibaca` : undefined}
 actions={
 unread_count > 0 ? (
 <Button
 variant="outline"
 size="sm"
 onClick={() => router.post(route('notifications.read-all'))}
 className="h-8 text-xs gap-1.5"
 >
 <CheckCheck className="h-4 w-4 text-primary" />
 <span>Tandai Semua Dibaca</span>
 </Button>
 ) : undefined
 }
 />

 {flash?.success && (
 <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300">
 {flash.success}
 </div>
 )}

                {canSend && (
                    <Card className="p-4 sm:p-6">
                        <form autoComplete="off" noValidate onSubmit={submit} className="space-y-4">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                Kirim Pengumuman
                            </h3>
                            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                                <SelectNative
                                    value={form.data.user_id}
                                    onChange={(e) =>
                                        form.setData('user_id', e.target.value)
                                    }
                                >
                                    <option value="">Penerima...</option>
                                    {users.map((user) => (
                                        <option key={user.id} value={user.id}>
                                            {user.name}
                                        </option>
                                    ))}
                                </SelectNative>
                                <SelectNative
                                    value={form.data.event}
                                    onChange={(e) =>
                                        form.setData('event', e.target.value)
                                    }
                                >
                                    {Object.entries(eventLabels).map(([key, value]) => (
                                        <option key={key} value={key}>
                                            {value}
                                        </option>
                                    ))}
                                </SelectNative>
                                <Input
                                    type="text"
                                    value={form.data.title}
                                    onChange={(e) =>
                                        form.setData('title', e.target.value)
                                    }
                                    placeholder="Judul notifikasi..."
                                    className="sm:col-span-2 lg:col-span-1"
                                />
                            </div>
                            <Textarea
                                value={form.data.message}
                                onChange={(e) =>
                                    form.setData('message', e.target.value)
                                }
                                rows={2}
                                placeholder="Isi pesan notifikasi..."
                            />
                            <Button type="submit" disabled={form.processing} className="w-full sm:w-auto">
                                Kirim
                            </Button>
                        </form>
                    </Card>
                )}

                {unread_count > 0 && (
                    <Button
                        variant="link"
                        className="px-0"
                        onClick={() =>
                            router.post(route('notifications.read-all'))
                        }
                    >
                        Tandai semua sudah dibaca
                    </Button>
                )}

                <Card className="overflow-hidden">
                    <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                        {notifications.data.map((notification) => (
                            <li
                                key={notification.id}
                                className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 p-4 sm:p-6"
                            >
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        {!notification.read_at && (
                                            <span className="h-2 w-2 shrink-0 rounded-full bg-primary animate-pulse" />
                                        )}
                                        <Badge variant="secondary" className="px-1.5">
                                            {eventLabels[notification.event] ?? notification.event}
                                        </Badge>
                                    </div>
                                    <div className={`mt-1 text-sm font-medium text-gray-900 dark:text-gray-100 ${notification.read_at ? '' : ''}`}>
                                        {notification.title}
                                    </div>
                                    {notification.message && (
                                        <div className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
                                            {notification.message}
                                        </div>
                                    )}
                                    <div className="mt-1 text-xs text-gray-400">
                                        {notification.created_at
                                            ? formatDateTime(notification.created_at)
                                            : ''}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                    {getDestinationUrl(notification) && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                const url = getDestinationUrl(notification)!;
                                                if (!notification.read_at) {
                                                    router.post(route('notifications.read', notification.id), { redirect: url });
                                                } else {
                                                    router.visit(url);
                                                }
                                            }}
                                            className="h-8 text-xs gap-1"
                                        >
                                            <span>Buka Data</span>
                                            <ChevronRight className="h-3.5 w-3.5" />
                                        </Button>
                                    )}
                                    {!notification.read_at && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                                router.post(
                                                    route('notifications.read', notification.id),
                                                )
                                            }
                                            className="h-8 text-xs text-blue-600 hover:text-blue-900"
                                        >
                                            Tandai dibaca
                                        </Button>
                                    )}
                                </div>
                            </li>

                        ))}
                        {notifications.data.length === 0 && (
                            <li className="p-6 text-center text-sm text-gray-500 italic">
                                Belum ada notifikasi.
                            </li>
                        )}
                    </ul>
                    <TablePagination
                        pagination={notifications}
                        itemLabel="notifikasi"
                        filters={filters}
                        baseUrl={route('notifications.index')}
                    />
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}