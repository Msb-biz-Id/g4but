import { ReactNode } from 'react';
import { LucideIcon, Inbox } from 'lucide-react';
import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import { Button } from '@/Components/ui/button';
import { TableCell, TableRow } from '@/Components/ui/table';

interface EmptyStateProps {
    icon?: LucideIcon;
    title?: string;
    description?: string;
    action?: {
        label: string;
        onClick?: () => void;
        href?: string;
        icon?: LucideIcon;
    };
    className?: string;
    children?: ReactNode;
}

export function EmptyState({
    icon: Icon = Inbox,
    title = 'Data Masih Kosong',
    description = 'Belum ada data yang tersedia untuk ditampilkan saat ini.',
    action,
    className,
    children,
}: EmptyStateProps) {
    const ActionIcon = action?.icon;

    return (
        <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center select-none', className)}>
            <div className="mb-3.5 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50/80 shadow-2xs dark:border-border dark:bg-muted/50">
                <Icon className="h-7 w-7 text-primary/80 dark:text-primary" />
            </div>
            <p className="text-sm font-bold text-gray-900 dark:text-foreground">{title}</p>
            {description && (
                <p className="mt-1 text-xs text-gray-500 dark:text-muted-foreground max-w-sm leading-relaxed">
                    {description}
                </p>
            )}
            {children}
            {action && (
                action.href ? (
                    <Link
                        href={action.href}
                        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 transition active:scale-95"
                    >
                        {ActionIcon && <ActionIcon className="h-3.5 w-3.5 shrink-0" />}
                        <span>{action.label}</span>
                    </Link>
                ) : action.onClick ? (
                    <Button onClick={action.onClick} variant="outline" size="sm" className="mt-4 rounded-xl">
                        {ActionIcon && <ActionIcon className="h-3.5 w-3.5 shrink-0 mr-1.5" />}
                        {action.label}
                    </Button>
                ) : null
            )}
        </div>
    );
}

interface TableEmptyRowProps extends EmptyStateProps {
    colSpan: number;
}

export function TableEmptyRow({
    colSpan,
    ...props
}: TableEmptyRowProps) {
    return (
        <TableRow className="hover:bg-transparent">
            <TableCell colSpan={colSpan} className="p-0">
                <EmptyState {...props} />
            </TableCell>
        </TableRow>
    );
}

export default EmptyState;
