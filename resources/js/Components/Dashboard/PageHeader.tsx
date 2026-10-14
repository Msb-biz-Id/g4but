import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import PageBreadcrumb, { BreadcrumbItem } from './PageBreadcrumb';

interface PageHeaderProps {
    title: string;
    description?: string;
    breadcrumbs?: BreadcrumbItem[];
    actions?: ReactNode;
    action?: ReactNode;
    badge?: ReactNode;
    className?: string;
}

export default function PageHeader({
    title,
    description,
    breadcrumbs,
    actions,
    action,
    badge,
    className,
}: PageHeaderProps) {
    const actionSlot = actions ?? action;
    return (
        <div className={cn('space-y-2 mb-6', className)}>
            {breadcrumbs && breadcrumbs.length > 0 && (
                <PageBreadcrumb items={breadcrumbs} className="mb-2.5" />
            )}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                            {title}
                        </h1>
                        {badge && <div>{badge}</div>}
                    </div>
                    {description && (
                        <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">
                            {description}
                        </p>
                    )}
                </div>

                {actionSlot && (
                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        {actionSlot}
                    </div>
                )}
            </div>
        </div>
    );
}

export { PageHeader };

