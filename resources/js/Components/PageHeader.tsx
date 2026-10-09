import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface PageHeaderProps {
    title: string;
    description?: string;
    actions?: ReactNode;
    className?: string;
}

/**
 * Komponen header dalam konten halaman.
 * Gunakan ini sebagai pengganti menaruh judul besar di dalam prop `header` AuthenticatedLayout.
 *
 * AuthenticatedLayout `header` prop hanya untuk judul singkat di topbar.
 * PageHeader digunakan di dalam <main> untuk judul halaman + deskripsi + tombol aksi.
 */
export default function PageHeader({ title, description, actions, className }: PageHeaderProps) {
    return (
        <div className={cn('mb-4 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4', className)}>
            <div className="min-w-0">
                <h1 className="text-lg font-semibold leading-tight text-foreground sm:text-xl">
                    {title}
                </h1>
                {description && (
                    <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                        {description}
                    </p>
                )}
            </div>
            {actions && (
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {actions}
                </div>
            )}
        </div>
    );
}
