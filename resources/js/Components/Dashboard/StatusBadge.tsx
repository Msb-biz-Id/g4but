import React from 'react';
import { cn } from '@/lib/utils';

export type StatusType =
    | 'final'
    | 'review'
    | 'diajukan'
    | 'draft'
    | 'rancangan'
    | 'perbaikan'
    | 'nonaktif'
    | 'selesai'
    | 'aktif'
    | string;

interface StatusBadgeProps {
    status?: StatusType | null;
    label?: string;
    className?: string;
}

const STATUS_CONFIG: Record<
    string,
    { label: string; className: string }
> = {
    final: {
        label: 'Final',
        className:
            'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    },
    selesai: {
        label: 'Selesai',
        className:
            'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    },
    aktif: {
        label: 'Aktif',
        className:
            'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    },
    review: {
        label: 'Review',
        className:
            'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    },
    diajukan: {
        label: 'Diajukan',
        className:
            'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800',
    },
    draft: {
        label: 'Draft',
        className:
            'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    },
    rancangan: {
        label: 'Rancangan',
        className:
            'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    },
    perbaikan: {
        label: 'Perbaikan',
        className:
            'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800',
    },
    nonaktif: {
        label: 'Nonaktif',
        className:
            'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    },
};

export default function StatusBadge({ status, label, className }: StatusBadgeProps) {
    if (!status) return <span className="text-slate-400 italic text-xs">-</span>;

    const normalized = String(status).toLowerCase().trim();
    const config = STATUS_CONFIG[normalized] || {
        label: label || status.charAt(0).toUpperCase() + status.slice(1),
        className:
            'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    };

    const displayLabel = label || config.label;

    return (
        <span
            className={cn(
                'inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold border select-none transition-colors shadow-2xs',
                config.className,
                className,
            )}
        >
            {displayLabel}
        </span>
    );
}

export { StatusBadge };
