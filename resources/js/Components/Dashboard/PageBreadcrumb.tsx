import React from 'react';
import { Link } from '@inertiajs/react';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
    label: string;
    href?: string;
    active?: boolean;
}

interface PageBreadcrumbProps {
    items: BreadcrumbItem[];
    className?: string;
    showHomeIcon?: boolean;
}

export default function PageBreadcrumb({
    items,
    className,
    showHomeIcon = false,
}: PageBreadcrumbProps) {
    if (!items || items.length === 0) return null;

    return (
        <nav
            aria-label="Breadcrumb"
            className={cn(
                'flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 select-none',
                className,
            )}
        >
            {showHomeIcon && (
                <Link
                    href={route('dashboard')}
                    className="flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                    <Home className="h-3.5 w-3.5 mr-1" />
                    <span>Beranda</span>
                </Link>
            )}

            {items.map((item, index) => {
                const isLast = index === items.length - 1;
                const isActive = item.active || isLast;

                return (
                    <React.Fragment key={index}>
                        {(showHomeIcon || index > 0) && (
                            <ChevronRight className="h-3 w-3 text-slate-400 shrink-0 mx-0.5" />
                        )}
                        {item.href && !isActive ? (
                            <Link
                                href={item.href}
                                className="text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary font-medium transition-colors"
                            >
                                {item.label}
                            </Link>
                        ) : (
                            <span
                                className={cn(
                                    isActive
                                        ? 'font-semibold text-slate-900 dark:text-white'
                                        : 'text-slate-500 dark:text-slate-400',
                                )}
                            >
                                {item.label}
                            </span>
                        )}
                    </React.Fragment>
                );
            })}
        </nav>
    );
}

export { PageBreadcrumb };
