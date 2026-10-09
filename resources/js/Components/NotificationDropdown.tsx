import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { AppNotification, PageProps } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { AlertTriangle, Bell, BellRing, Check, CheckCheck, CheckCircle2, ChevronRight, FileText, Info, Inbox } from 'lucide-react';
import { useState } from 'react';

// ── Helper: resolve notification icon by event ──────────────────────────────
function NotifIcon({ event }: { event: string }) {
    switch (event) {
        case 'alert.created':
            return <AlertTriangle className="h-4 w-4 text-rose-500" />;
        case 'submission':
            return <FileText className="h-4 w-4 text-blue-500" />;
        case 'approval':
            return <Check className="h-4 w-4 text-green-500" />;
        case 'revision':
        case 'rejection':
            return <BellRing className="h-4 w-4 text-red-500" />;
        default:
            return <Info className="h-4 w-4 text-muted-foreground" />;
    }
}

// ── Helper: resolve destination URL based on notification resource ──────────
function getNotificationDestination(notif: AppNotification): string {
    switch (notif.resource_type) {
        case 'alert':
            return route('alerts.index');
        case 'planning_document':
            return route('planning.documents.index');
        case 'agreement':
            return route('planning.agreements.index');
        case 'iku':
            return route('planning.iku.index');
        case 'action_plan':
            return route('planning.action-plans.index');
        case 'realization':
            return '/measurement/realizations';
        default:
            return route('notifications.index');
    }
}

// ── Single notification row ───────────────────────────────────────────────────
function NotifRow({
    notif,
    onClickNotif,
}: {
    notif: AppNotification;
    onClickNotif: (notif: AppNotification) => void;
}) {
    const isUnread = !notif.read_at;

    return (
        <DropdownMenuItem
            className={cn(
                'flex items-start gap-3 px-4 py-3 cursor-pointer rounded-md focus:outline-none transition-colors group',
                isUnread
                    ? 'bg-red-50/70 hover:bg-red-100/70 dark:bg-red-950/20 dark:hover:bg-red-950/30'
                    : 'hover:bg-muted/60 opacity-80 hover:opacity-100',
            )}
            onClick={() => onClickNotif(notif)}
            asChild={false}
        >
            {/* Unread indicator dot */}
            <span
                className={cn(
                    'mt-1.5 h-2 w-2 flex-shrink-0 rounded-full',
                    isUnread ? 'bg-red-500 shadow-sm shadow-red-500/50' : 'bg-transparent',
                )}
            />

            {/* Icon */}
            <span className="mt-0.5 flex-shrink-0 p-1.5 rounded-md bg-background border shadow-xs">
                <NotifIcon event={notif.event} />
            </span>

            {/* Content */}
            <span className="flex flex-1 flex-col gap-0.5 min-w-0">
                <span className={cn('text-sm leading-snug', isUnread ? 'font-semibold text-foreground' : 'font-medium text-foreground/85')}>
                    {notif.title}
                </span>
                {notif.message && (
                    <span className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {notif.message}
                    </span>
                )}
                <span className="text-[11px] text-muted-foreground/70 mt-1 flex items-center justify-between">
                    <span>{notif.time_ago}</span>
                    <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </span>
            </span>
        </DropdownMenuItem>
    );
}

// ── Main NotificationDropdown component ──────────────────────────────────────
export default function NotificationDropdown() {
    const { systemNotifications } = usePage<PageProps>().props;
    const [activeTab, setActiveTab] = useState<'unread' | 'all'>('unread');

    const unreadCount = systemNotifications?.unreadCount ?? 0;
    const recent = systemNotifications?.recent ?? [];

    const unreadList = recent.filter((n) => !n.read_at);
    const displayedList = activeTab === 'unread' ? unreadList : recent;

    // Handle clicking a notification: mark as read AND redirect to target menu
    const handleNotificationClick = (notif: AppNotification) => {
        const destination = getNotificationDestination(notif);
        const isUnread = !notif.read_at;

        if (isUnread) {
            router.post(
                route('notifications.read', notif.id),
                { redirect: destination },
                { preserveScroll: false },
            );
        } else {
            router.visit(destination);
        }
    };

    const handleMarkAllRead = () => {
        router.post(
            route('notifications.read-all'),
            {},
            { preserveScroll: true, preserveState: true },
        );
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    className="relative flex items-center justify-center rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Notifikasi"
                >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none shadow-xs">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                align="end"
                className="w-84 sm:w-96 max-h-[520px] overflow-hidden flex flex-col p-0 shadow-xl"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b bg-background sticky top-0 z-10">
                    <DropdownMenuLabel className="p-0 text-sm font-semibold flex items-center gap-2">
                        <Bell className="h-4 w-4 text-primary" />
                        Notifikasi Sistem
                        {unreadCount > 0 && (
                            <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                                {unreadCount}
                            </span>
                        )}
                    </DropdownMenuLabel>
                    {unreadCount > 0 && (
                        <button
                            onClick={handleMarkAllRead}
                            className="text-xs text-primary hover:underline font-medium focus:outline-none flex items-center gap-1"
                        >
                            <CheckCheck className="h-3.5 w-3.5" />
                            Tandai semua dibaca
                        </button>
                    )}
                </div>

                {/* Tabs: Belum Dibaca vs Semua */}
                <div className="flex items-center border-b px-2 py-1.5 bg-muted/40 gap-1 text-xs">
                    <button
                        type="button"
                        onClick={() => setActiveTab('unread')}
                        className={cn(
                            'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md font-medium transition-colors',
                            activeTab === 'unread'
                                ? 'bg-background text-foreground shadow-xs'
                                : 'text-muted-foreground hover:text-foreground hover:bg-background/50',
                        )}
                    >
                        <span>Belum Dibaca</span>
                        {unreadCount > 0 && (
                            <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-red-500 text-[9px] font-bold text-white">
                                {unreadCount}
                            </span>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('all')}
                        className={cn(
                            'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md font-medium transition-colors',
                            activeTab === 'all'
                                ? 'bg-background text-foreground shadow-xs'
                                : 'text-muted-foreground hover:text-foreground hover:bg-background/50',
                        )}
                    >
                        <span>Semua</span>
                        <span className="text-[11px] text-muted-foreground">({recent.length})</span>
                    </button>
                </div>

                {/* Notification list */}
                <div className="overflow-y-auto flex-1 max-h-[340px]">
                    {displayedList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 px-4 gap-2 text-center text-muted-foreground">
                            {activeTab === 'unread' ? (
                                <>
                                    <div className="p-3 rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600">
                                        <CheckCircle2 className="h-6 w-6" />
                                    </div>
                                    <span className="text-sm font-medium text-foreground">Semua sudah dibaca</span>
                                    <span className="text-xs text-muted-foreground max-w-[220px]">
                                        Tidak ada notifikasi baru yang perlu tindakan Anda.
                                    </span>
                                </>
                            ) : (
                                <>
                                    <Inbox className="h-8 w-8 opacity-30" />
                                    <span className="text-sm font-medium">Belum ada notifikasi</span>
                                    <span className="text-xs text-muted-foreground">
                                        Riwayat notifikasi akan muncul di sini.
                                    </span>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-0.5 p-1">
                            {displayedList.map((notif: AppNotification) => (
                                <NotifRow
                                    key={notif.id}
                                    notif={notif}
                                    onClickNotif={handleNotificationClick}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <DropdownMenuSeparator className="my-0" />
                <div className="px-4 py-2.5 bg-background sticky bottom-0 border-t">
                    <Link
                        href="/notifications"
                        className="block text-center text-xs text-primary hover:underline font-medium focus:outline-none"
                    >
                        Lihat Semua Riwayat Notifikasi →
                    </Link>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
