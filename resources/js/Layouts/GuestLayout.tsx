import { Link, usePage } from '@inertiajs/react';
import { PropsWithChildren, useEffect } from 'react';
import ThemeToggle from '@/Components/ThemeToggle';
import ApplicationLogo from '@/Components/ApplicationLogo';
import { cn } from '@/lib/utils';
import { applyServerTheme } from '@/lib/theme';
import type { PageProps } from '@/types';

interface GuestProps extends PropsWithChildren {
    className?: string;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
}

const maxWidthMap: Record<string, string> = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
    '2xl': 'sm:max-w-2xl',
    '3xl': 'sm:max-w-3xl',
    '4xl': 'sm:max-w-4xl',
    '5xl': 'sm:max-w-5xl',
};

export default function Guest({ children, className, maxWidth = 'md' }: GuestProps) {
    const { theme, appConfig } = usePage<PageProps>().props;
    const appName = appConfig?.appName || 'e-SAKIP';
    const instansiName = appConfig?.instansiName || 'Pemerintah Daerah';

    useEffect(() => {
        if (theme) {
            applyServerTheme(theme);
        }
    }, [theme]);

    return (
        <div className="relative flex min-h-screen flex-col items-center bg-gray-50 px-4 py-8 sm:justify-center sm:px-6 dark:bg-muted/40">
            <div className="absolute right-4 top-4">
                <ThemeToggle />
            </div>
            <Link href={route('home')} className="flex items-center gap-3 transition-opacity hover:opacity-90">
                <ApplicationLogo className="h-12 w-12 shrink-0 drop-shadow-md" />
                <div className="flex flex-col">
                    <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-foreground">
                        {appName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        Sistem Akuntabilitas Kinerja • {instansiName}
                    </span>
                </div>
            </Link>

            <div
                className={cn(
                    'mt-6 w-full rounded-2xl bg-white p-6 shadow-xl border border-gray-100/80 transition-all duration-300 dark:border-border/60 dark:bg-card',
                    maxWidthMap[maxWidth] ?? 'sm:max-w-md',
                    className,
                )}
            >
                {children}
            </div>
        </div>
    );
}