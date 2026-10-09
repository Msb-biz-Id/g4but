import React from 'react';
import { router } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { cn } from '@/lib/utils';

export interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

export interface PaginatorMeta {
    from?: number | null;
    to?: number | null;
    total?: number;
    per_page?: number;
    current_page?: number;
    last_page?: number;
    links?: PaginationLink[];
    data?: any[];
    meta?: {
        from?: number | null;
        to?: number | null;
        total?: number;
        per_page?: number;
        current_page?: number;
        last_page?: number;
        links?: PaginationLink[];
    };
}

export interface TablePaginationProps {
    /** Data paginator Laravel */
    pagination?: PaginatorMeta | any;
    from?: number | null;
    to?: number | null;
    total?: number;
    perPage?: number;
    links?: PaginationLink[];
    /** Filter object aktif yang akan dipertahankan saat ganti per_page */
    filters?: Record<string, any>;
    /** URL tujuan untuk navigasi filter jika onPerPageChange tidak diberikan */
    baseUrl?: string;
    /** Callback saat angka baris per halaman diubah */
    onPerPageChange?: (perPage: number) => void;
    /** Callback khusus navigasi halaman link. Jika tidak diberikan, default menggunakan router.get(url) */
    onPageChange?: (url: string) => void;
    /** Nama entitas yang ditampilkan, mis. 'organisasi', 'pengguna', 'indikator', dll. */
    itemName?: string;
    /** Alias untuk itemName */
    itemLabel?: string;
    /** Tampilkan dropdown baris per hal (default: true) */
    showPerPageSelector?: boolean;
    /** Pilihan angka baris per halaman, default: [10, 25, 50, 100] */
    perPageOptions?: number[];
    className?: string;

    /** Mode client-side untuk array data lokal */
    clientSide?: boolean;
    currentPage?: number;
    lastPage?: number;
    totalItems?: number;
    onClientPageChange?: (page: number) => void;
}

export function TablePagination({
    pagination,
    from,
    to,
    total,
    perPage,
    links,
    filters,
    baseUrl,
    onPerPageChange,
    onPageChange,
    itemName = 'data',
    itemLabel,
    showPerPageSelector = true,
    perPageOptions = [10, 25, 50, 100],
    className,
    clientSide = false,
    currentPage = 1,
    lastPage = 1,
    totalItems,
    onClientPageChange,
}: TablePaginationProps) {
    const labelText = itemLabel || itemName;
    const finalFrom = from ?? pagination?.from ?? pagination?.meta?.from ?? (pagination?.data?.length > 0 ? 1 : 0);
    const finalTo = to ?? pagination?.to ?? pagination?.meta?.to ?? (pagination?.data?.length ?? 0);
    const finalTotal = total ?? totalItems ?? pagination?.total ?? pagination?.meta?.total ?? (pagination?.data?.length ?? 0);
    const finalPerPage = perPage ?? pagination?.per_page ?? pagination?.meta?.per_page ?? (filters?.per_page ? Number(filters.per_page) : 25);
    const finalLinks: PaginationLink[] = links ?? pagination?.links ?? pagination?.meta?.links ?? [];

    const handlePerPage = (newPerPage: number) => {
        if (onPerPageChange) {
            onPerPageChange(newPerPage);
            return;
        }

        const targetUrl = baseUrl || (typeof window !== 'undefined' ? window.location.pathname : '');
        if (targetUrl) {
            router.get(
                targetUrl,
                { ...filters, per_page: newPerPage, page: 1 },
                { preserveState: true, preserveScroll: true, replace: true }
            );
        }
    };

    const handleLinkClick = (url: string | null) => {
        if (!url) return;
        if (onPageChange) {
            onPageChange(url);
        } else {
            router.get(url, {}, { preserveState: true, preserveScroll: true, replace: true });
        }
    };

    const cleanLabel = (rawLabel: string) => {
        let label = rawLabel;
        if (label.includes('Previous') || label.includes('&laquo;')) label = '‹';
        if (label.includes('Next') || label.includes('&raquo;')) label = '›';
        return label;
    };

    if (finalTotal === 0 && !clientSide) {
        return null;
    }

    return (
        <div
            className={cn(
                'flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-border bg-slate-50/40 dark:bg-slate-900/30 text-xs text-muted-foreground',
                className
            )}
        >
            {/* Info total & filter angka show 10, 25, 50, 100 */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <div>
                    Menampilkan <span className="font-semibold text-foreground">{finalFrom}</span>–
                    <span className="font-semibold text-foreground">{finalTo}</span> dari{' '}
                    <span className="font-semibold text-foreground">{finalTotal}</span> {labelText}
                </div>

                {showPerPageSelector && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span>Tampilkan:</span>
                        <select
                            value={finalPerPage}
                            onChange={(e) => handlePerPage(Number(e.target.value))}
                            className="h-7 w-[4.5rem] pl-2.5 pr-7 py-0 text-xs rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-medium"
                        >
                            {perPageOptions.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                        <span>per hal</span>
                    </div>
                )}
            </div>

            {/* Tombol navigasi halaman */}
            {clientSide ? (
                lastPage > 1 && (
                    <div className="flex items-center gap-1">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={currentPage <= 1}
                            onClick={() => onClientPageChange?.(currentPage - 1)}
                            className="h-7 min-w-7 px-2 text-xs"
                        >
                            ‹
                        </Button>
                        <span className="px-2 font-medium text-foreground">
                            {currentPage} / {lastPage}
                        </span>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={currentPage >= lastPage}
                            onClick={() => onClientPageChange?.(currentPage + 1)}
                            className="h-7 min-w-7 px-2 text-xs"
                        >
                            ›
                        </Button>
                    </div>
                )
            ) : (
                finalLinks.length > 0 && (
                    <div className="flex flex-wrap items-center justify-center gap-1">
                        {finalLinks.map((link, i) => (
                            <Button
                                key={i}
                                type="button"
                                variant={link.active ? 'default' : 'outline'}
                                size="sm"
                                disabled={!link.url}
                                onClick={() => handleLinkClick(link.url)}
                                className={cn(
                                    'h-7 min-w-7 px-2 text-xs cursor-pointer',
                                    link.active
                                        ? 'bg-primary text-primary-foreground font-semibold shadow-2xs'
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                                dangerouslySetInnerHTML={{ __html: cleanLabel(link.label) }}
                            />
                        ))}
                    </div>
                )
            )}
        </div>
    );
}

export default TablePagination;
