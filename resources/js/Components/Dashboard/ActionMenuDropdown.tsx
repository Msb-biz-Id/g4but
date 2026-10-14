import React, { ReactNode } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import { Button } from '@/Components/ui/button';
import { MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ActionMenuItem {
    label: string;
    icon?: ReactNode;
    onClick?: () => void;
    href?: string;
    isExternal?: boolean;
    variant?: 'default' | 'danger' | 'warning' | 'destructive';
    disabled?: boolean;
    separatorBefore?: boolean;
    separator?: boolean;
}

interface ActionMenuDropdownProps {
    items?: ActionMenuItem[];
    children?: ReactNode;
    align?: 'end' | 'start' | 'center';
    className?: string;
    buttonClassName?: string;
}

export default function ActionMenuDropdown({
    items,
    children,
    align = 'end',
    className,
    buttonClassName,
}: ActionMenuDropdownProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        'h-8 w-8 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors',
                        buttonClassName,
                    )}
                    aria-label="Menu Aksi"
                >
                    <MoreVertical className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align={align}
                className={cn('w-48 shadow-lg rounded-xl p-1 border-slate-200 dark:border-slate-800', className)}
            >
                {children}

                {items &&
                    items.map((item, index) => {
                        const showSeparator = item.separatorBefore || item.separator;
                        const isDestructive = item.variant === 'danger' || item.variant === 'destructive';
                        return (
                            <React.Fragment key={index}>
                                {showSeparator && <DropdownMenuSeparator />}
                                {item.href ? (
                                    <DropdownMenuItem asChild disabled={item.disabled}>
                                        <a
                                            href={item.href}
                                            target={item.isExternal ? '_blank' : undefined}
                                            rel={item.isExternal ? 'noopener noreferrer' : undefined}
                                            className={cn(
                                                'flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium cursor-pointer rounded-md transition-colors',
                                                isDestructive &&
                                                    'text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/30',
                                                item.variant === 'warning' &&
                                                    'text-amber-600 focus:text-amber-600 focus:bg-amber-50 dark:focus:bg-amber-950/30',
                                            )}
                                        >
                                            {item.icon && <span className="h-3.5 w-3.5 shrink-0">{item.icon}</span>}
                                            <span>{item.label}</span>
                                        </a>
                                    </DropdownMenuItem>
                                ) : (
                                    <DropdownMenuItem
                                        onClick={item.onClick}
                                        disabled={item.disabled}
                                        className={cn(
                                            'flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium cursor-pointer rounded-md transition-colors',
                                            isDestructive &&
                                                'text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/30',
                                            item.variant === 'warning' &&
                                                'text-amber-600 focus:text-amber-600 focus:bg-amber-50 dark:focus:bg-amber-950/30',
                                        )}
                                    >
                                        {item.icon && <span className="h-3.5 w-3.5 shrink-0">{item.icon}</span>}
                                        <span>{item.label}</span>
                                    </DropdownMenuItem>
                                )}
                            </React.Fragment>
                        );
                    })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export { ActionMenuDropdown };

