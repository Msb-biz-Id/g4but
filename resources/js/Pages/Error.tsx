import ApplicationLogo from '@/Components/ApplicationLogo';
import { Button } from '@/Components/ui/button';
import { Head, Link, usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import { applyServerTheme } from '@/lib/theme';
import { PageProps } from '@/types';
import {
    AlertOctagon,
    AlertTriangle,
    ArrowLeft,
    Clock,
    Home,
    Lock,
    RefreshCw,
    Search,
    ServerCrash,
    ShieldAlert,
    Wrench,
    ZapOff,
} from 'lucide-react';

interface ErrorProps {
    status: number;
    message?: string;
}

interface ErrorDetail {
    title: string;
    description: string;
    icon: typeof Search;
    color: string;
    bgBadge: string;
    textBadge: string;
    borderBadge: string;
    actionHint: string;
}

const errorDetails: Record<number, ErrorDetail> = {
    404: {
        title: 'Halaman Tidak Ditemukan',
        description:
            'Maaf, halaman yang Anda tuju tidak dapat ditemukan. Alamat tautan mungkin telah dipindahkan, diubah namanya, atau memang tidak pernah ada.',
        icon: Search,
        color: 'text-primary',
        bgBadge: 'bg-primary/10 dark:bg-primary/20',
        textBadge: 'text-primary',
        borderBadge: 'border-primary/20 dark:border-primary/30',
        actionHint: 'Periksa kembali ejaan URL atau gunakan tombol navigasi di bawah untuk kembali ke halaman yang aman.',
    },
    403: {
        title: 'Akses Ditolak',
        description:
            'Anda tidak memiliki izin atau hak akses yang cukup untuk membuka halaman atau data ini.',
        icon: Lock,
        color: 'text-rose-500',
        bgBadge: 'bg-rose-500/10 dark:bg-rose-500/20',
        textBadge: 'text-rose-600 dark:text-rose-400',
        borderBadge: 'border-rose-500/20 dark:border-rose-500/30',
        actionHint: 'Jika Anda merasa ini sebuah kekeliruan, silakan hubungi Administrator sistem SIPERFORMA PUPR.',
    },
    419: {
        title: 'Sesi Telah Berakhir',
        description:
            'Halaman telah kedaluwarsa karena tidak ada aktivitas dalam waktu yang lama atau token keamanan (CSRF) sudah tidak valid.',
        icon: Clock,
        color: 'text-sky-500',
        bgBadge: 'bg-sky-500/10 dark:bg-sky-500/20',
        textBadge: 'text-sky-600 dark:text-sky-400',
        borderBadge: 'border-sky-500/20 dark:border-sky-500/30',
        actionHint: 'Silakan muat ulang halaman ini untuk memperbarui sesi login Anda.',
    },
    429: {
        title: 'Terlalu Banyak Permintaan',
        description:
            'Sistem menerima terlalu banyak permintaan dari perangkat Anda dalam waktu singkat (Rate Limit Exceeded).',
        icon: ZapOff,
        color: 'text-purple-500',
        bgBadge: 'bg-purple-500/10 dark:bg-purple-500/20',
        textBadge: 'text-purple-600 dark:text-purple-400',
        borderBadge: 'border-purple-500/20 dark:border-purple-500/30',
        actionHint: 'Mohon tunggu beberapa saat sebelum mencoba melakukan tindakan ini kembali.',
    },
    500: {
        title: 'Terjadi Kesalahan Server',
        description:
            'Terjadi kendala internal pada server saat memproses permintaan Anda. Tim teknis kami telah mencatat peristiwa ini untuk ditindaklanjuti.',
        icon: ServerCrash,
        color: 'text-red-500',
        bgBadge: 'bg-red-500/10 dark:bg-red-500/20',
        textBadge: 'text-red-600 dark:text-red-400',
        borderBadge: 'border-red-500/20 dark:border-red-500/30',
        actionHint: 'Silakan muat ulang halaman atau coba kembali beberapa saat lagi.',
    },
    503: {
        title: 'Layanan Sedang Pemeliharaan',
        description:
            'Sistem SIPERFORMA PUPR sedang dalam proses pemeliharaan rutin atau peningkatan performa server.',
        icon: Wrench,
        color: 'text-primary',
        bgBadge: 'bg-primary/10 dark:bg-primary/20',
        textBadge: 'text-primary',
        borderBadge: 'border-primary/20 dark:border-primary/30',
        actionHint: 'Kami akan segera kembali dalam beberapa saat. Terima kasih atas kesabaran Anda.',
    },
};

export default function Error({ status, message }: ErrorProps) {
    const { theme, appConfig } = usePage<PageProps>().props;
    const appName = appConfig?.appName || 'SIPERFORMA PUPR';
    const instansiName = appConfig?.instansiName || 'Pemerintah Kabupaten Mimika';
    const orgName = appConfig?.organizationName || 'Dinas Pekerjaan Umum dan Penataan Ruang';
    const currentYear = appConfig?.currentYear || new Date().getFullYear();

    // Terapkan tema kustom dari database
    useEffect(() => {
        if (theme) applyServerTheme(theme);
    }, [theme]);

    const error = errorDetails[status] || {
        title: 'Terjadi Kesalahan',
        description: message || 'Terjadi kesalahan yang tidak terduga dalam sistem.',
        icon: AlertOctagon,
        color: 'text-slate-500',
        bgBadge: 'bg-slate-500/10 dark:bg-slate-500/20',
        textBadge: 'text-slate-600 dark:text-slate-400',
        borderBadge: 'border-slate-500/20 dark:border-slate-500/30',
        actionHint: 'Silakan coba kembali atau hubungi tim bantuan teknis.',
    };

    const Icon = error.icon;

    const handleReload = () => {
        if (typeof window !== 'undefined') {
            window.location.reload();
        }
    };

    const handleGoBack = () => {
        if (typeof window !== 'undefined') {
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.href = route('dashboard');
            }
        }
    };

    return (
        <>
            <Head title={`${status} - ${error.title} | ${appName}`} />

            <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-50 p-4 selection:bg-primary selection:text-primary-foreground dark:bg-slate-950">
                {/* Background Ambient Glows */}
                <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl dark:bg-primary/15" />
                <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl dark:bg-amber-500/15" />

                {/* Main Container Card */}
                <div className="relative z-10 w-full max-w-xl">
                    {/* Header Brand */}
                    <div className="mb-6 flex items-center justify-center gap-3">
                        <ApplicationLogo className="h-10 w-10 drop-shadow-sm" />
                        <div>
                            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                                {appName}
                            </span>
                            <span className="ml-2 rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary border border-primary/20">
                                {instansiName}
                            </span>
                        </div>
                    </div>

                    {/* Card Body */}
                    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 p-8 shadow-xl shadow-slate-200/50 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/80 dark:shadow-none sm:p-10">
                        {/* Status Number & Badge */}
                        <div className="mb-6 flex flex-col items-center text-center">
                            <div className="relative mb-4 flex items-center justify-center">
                                <span className="font-mono text-7xl font-extrabold tracking-tighter text-slate-200 select-none dark:text-slate-800 sm:text-8xl">
                                    {status}
                                </span>
                                <div
                                    className={`absolute inset-0 flex items-center justify-center ${error.color}`}
                                >
                                    <div className="rounded-2xl border border-white/60 bg-white/90 p-4 shadow-lg backdrop-blur dark:border-slate-700/60 dark:bg-slate-800/90">
                                        <Icon className="h-10 w-10 sm:h-12 sm:w-12 animate-pulse" />
                                    </div>
                                </div>
                            </div>

                            <span
                                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${error.bgBadge} ${error.textBadge} ${error.borderBadge}`}
                            >
                                Status Error {status}
                            </span>

                            <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                                {error.title}
                            </h1>

                            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
                                {error.description}
                            </p>
                        </div>

                        {/* Recommendation Box */}
                        <div className="mb-8 rounded-xl border border-slate-100 bg-slate-50/80 p-4 text-xs text-slate-600 dark:border-slate-800/60 dark:bg-slate-800/40 dark:text-slate-400">
                            <div className="flex items-start gap-2.5">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                                <div className="leading-relaxed">
                                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                                        Petunjuk:{' '}
                                    </span>
                                    {error.actionHint}
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                            <Link href={route('dashboard')}>
                                <Button className="w-full gap-2 bg-primary font-medium text-primary-foreground shadow-md hover:bg-primary/90 sm:w-auto">
                                    <Home className="h-4 w-4" />
                                    Ke Dashboard
                                </Button>
                            </Link>

                            <Button
                                variant="outline"
                                onClick={handleReload}
                                className="w-full gap-2 border-slate-200 font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 sm:w-auto"
                            >
                                <RefreshCw className="h-4 w-4" />
                                Muat Ulang
                            </Button>

                            <Button
                                variant="ghost"
                                onClick={handleGoBack}
                                className="w-full gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white sm:w-auto"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Kembali
                            </Button>
                        </div>
                    </div>

                    {/* Footer System Info */}
                    <div className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
                        &copy; {currentYear} {orgName} {instansiName}. Hak Cipta Dilindungi.
                    </div>
                </div>
            </div>
        </>
    );
}
