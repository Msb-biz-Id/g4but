import React from 'react';
import { cn } from '@/lib/utils';

interface LevelBadgeProps {
    level?: 'pemda' | 'perangkat_daerah' | 'unit_kerja' | string | null;
    className?: string;
}

export default function LevelBadge({ level, className }: LevelBadgeProps) {
    if (!level) return null;

    const normalized = String(level).toLowerCase().trim();

    if (normalized === 'pemda' || normalized === 'pemerintah_daerah') {
        return (
            <span
                className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-500 text-white dark:bg-blue-600 shadow-2xs select-none',
                    className,
                )}
            >
                Pemda
            </span>
        );
    }

    if (normalized === 'perangkat_daerah' || normalized === 'opd' || normalized === 'pd') {
        return (
            <span
                className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-600 text-white dark:bg-emerald-700 shadow-2xs select-none',
                    className,
                )}
            >
                OPD
            </span>
        );
    }

    return (
        <span
            className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-500 text-white dark:bg-slate-600 shadow-2xs select-none',
                className,
            )}
        >
            Unit Kerja
        </span>
    );
}

export { LevelBadge };
