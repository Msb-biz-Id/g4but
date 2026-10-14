import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Filter, RotateCcw } from 'lucide-react';
import { Button } from '@/Components/ui/button';

interface FilterToolbarProps {
    children: ReactNode;
    title?: string;
    hasActiveFilters?: boolean;
    onReset?: () => void;
    className?: string;
}

export default function FilterToolbar({
    children,
    title,
    hasActiveFilters = false,
    onReset,
    className,
}: FilterToolbarProps) {
    return (
        <div
            className={cn(
                'rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 sm:p-4 shadow-2xs mb-4',
                className,
            )}
        >
            {(title || (hasActiveFilters && onReset)) && (
                <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <Filter className="h-3.5 w-3.5 text-primary" />
                        <span>{title || 'Filter Data'}</span>
                    </div>

                    {hasActiveFilters && onReset && (
                        <Button
                            variant="ghost"
                            size="sm"
                            type="button"
                            onClick={onReset}
                            className="h-7 px-2 text-xs text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                        >
                            <RotateCcw className="mr-1.5 h-3 w-3" />
                            Reset Filter
                        </Button>
                    )}
                </div>
            )}

            <div className="w-full">{children}</div>
        </div>
    );
}
