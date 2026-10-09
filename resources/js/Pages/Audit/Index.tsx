import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { TableEmptyRow } from '@/Components/EmptyState';
import { 
    Shield, 
    Search, 
    FileSpreadsheet, 
    User as UserIcon, 
    ChevronDown, 
    ChevronUp, 
    RotateCcw,
    Download
} from 'lucide-react';
import { PageProps } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import TablePagination from '@/Components/TablePagination';
import { Select2 } from '@/Components/ui/select2';

interface AuditLogItem {
    id: number;
    created_at: string;
    formatted_date: string;
    action: string;
    module: string;
    resource_type: string | null;
    resource_id: number | string | null;
    description: string;
    ip_address: string;
    user: {
        id?: number | null;
        name: string;
        role: string;
        org_code?: string | null;
    };
    diff?: Record<string, any> | null;
}

interface AuditIndexProps extends PageProps {
    logs: {
        data: AuditLogItem[];
        current_page: number;
        last_page: number;
        from: number;
        to: number;
        total: number;
        per_page?: number;
        prev_page_url: string | null;
        next_page_url: string | null;
        links: { url: string | null; label: string; active: boolean }[];
    };
    filters: {
        q?: string;
        module?: string;
        activity?: string;
        date_from?: string;
        date_to?: string;
        per_page?: number;
    };
    defaultDateFrom: string;
    defaultDateTo: string;
    modules: string[];
    activities: string[];
    totalEntries: number;
}

export default function AuditIndex({ 
    auth, 
    logs, 
    filters, 
    defaultDateFrom,
    defaultDateTo,
    modules, 
    activities, 
    totalEntries 
}: AuditIndexProps) {
    const [search, setSearch] = useState(filters.q || '');
    const [selectedModule, setSelectedModule] = useState(filters.module || '');
    const [selectedActivity, setSelectedActivity] = useState(filters.activity || '');
    const [dateFrom, setDateFrom] = useState(filters.date_from || defaultDateFrom || '');
    const [dateTo, setDateTo] = useState(filters.date_to || defaultDateTo || '');
    const [perPage, setPerPage] = useState<number>(filters.per_page || 25);
    const [expandedRow, setExpandedRow] = useState<number | null>(null);

    const handleApplyFilters = () => {
        router.get(
            route('audit.index'),
            {
                q: search || undefined,
                module: selectedModule && selectedModule !== 'Semua' ? selectedModule : undefined,
                activity: selectedActivity && selectedActivity !== 'Semua' ? selectedActivity : undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
                per_page: perPage !== 25 ? perPage : undefined,
            },
            { preserveState: true, replace: true }
        );
    };

    const handlePerPageChange = (newPerPage: number) => {
        setPerPage(newPerPage);
        router.get(
            route('audit.index'),
            {
                q: search || undefined,
                module: selectedModule && selectedModule !== 'Semua' ? selectedModule : undefined,
                activity: selectedActivity && selectedActivity !== 'Semua' ? selectedActivity : undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
                per_page: newPerPage,
            },
            { preserveState: true, replace: true }
        );
    };

    const handleResetFilters = () => {
        setSearch('');
        setSelectedModule('');
        setSelectedActivity('');
        setDateFrom(defaultDateFrom);
        setDateTo(defaultDateTo);
        setPerPage(25);
        router.get(route('audit.index'), {}, { preserveState: true, replace: true });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleApplyFilters();
        }
    };

    const copyForExcel = () => {
        if (!logs.data || logs.data.length === 0) {
            toast.error('Tidak ada data log pada halaman ini untuk disalin.');
            return;
        }

        const header = ['NO', 'WAKTU', 'USER', 'ROLE / OPD', 'MODUL', 'AKTIVITAS', 'DESKRIPSI', 'IP'].join('\t');
        const rows = logs.data.map((item, index) => [
            String((logs.from ?? 1) + index),
            item.formatted_date,
            item.user.name,
            item.user.org_code || item.user.role,
            item.module,
            item.action,
            item.description.replace(/\r?\n|\r/g, ' '),
            item.ip_address,
        ].join('\t')).join('\n');

        const fullTsv = `${header}\n${rows}`;

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(fullTsv).then(() => {
                toast.success('Data log pada halaman ini berhasil disalin! Siap di-paste ke Excel.');
            }).catch(() => {
                fallbackCopyText(fullTsv);
            });
        } else {
            fallbackCopyText(fullTsv);
        }
    };

    const fallbackCopyText = (text: string) => {
        try {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            textArea.remove();
            toast.success('Data log pada halaman ini berhasil disalin! Siap di-paste ke Excel.');
        } catch {
            toast.error('Gagal menyalin data ke clipboard.');
        }
    };

    const getActivityBadgeClass = (action: string) => {
        const act = action.toLowerCase();
        if (act === 'create' || act.includes('approve') || act === 'publish') {
            return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
        }
        if (act === 'login') {
            return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800';
        }
        if (act === 'delete' || act === 'reject') {
            return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';
        }
        if (act === 'update' || act.includes('revision') || act === 'reopen') {
            return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
        }
        if (act === 'upload' || act === 'download' || act === 'export') {
            return 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800';
        }
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    };

    const hasActiveFilters = Boolean(
        filters.q || 
        (filters.module && filters.module !== 'Semua') || 
        (filters.activity && filters.activity !== 'Semua') || 
        (filters.date_from && filters.date_from !== defaultDateFrom) || 
        (filters.date_to && filters.date_to !== defaultDateTo)
    );

    return (
        <AuthenticatedLayout header="Audit Log">
            <Head title="Audit Log" />

            <div className="space-y-4 max-w-[1400px] mx-auto">
                {/* Header Card */}
                <div className="bg-white dark:bg-slate-900 border border-border/80 rounded-xl p-5 shadow-xs">
                    <div className="flex items-center gap-2.5">
                        <div className="text-primary">
                            <Shield className="h-5 w-5" strokeWidth={2.2} />
                        </div>
                        <h2 className="text-lg font-bold tracking-tight text-foreground">
                            Audit Log
                        </h2>
                    </div>
                    <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        Riwayat aktivitas user di sistem. Data disimpan selama{' '}
                        <span className="font-semibold text-foreground">30 hari</span> & dibersihkan otomatis. Total{' '}
                        <span className="font-semibold text-foreground">{totalEntries.toLocaleString('id-ID')}</span> entri.
                    </p>
                </div>

                {/* Filter Controls Card */}
                <div className="bg-white dark:bg-slate-900 border border-border/80 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
                    {/* Top Row Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-12 gap-2.5">
                        {/* Search Input */}
                        <div className="relative lg:col-span-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Cari di deskripsi..."
                                className="pl-9 h-9 text-xs sm:text-sm rounded-lg bg-background"
                            />
                        </div>

                        {/* Modul Select */}
                        <div className="relative lg:col-span-2">
                            <Select2
                                value={selectedModule}
                                onChange={(val) => setSelectedModule(val)}
                                options={[
                                    { value: '', label: 'Modul: Semua' },
                                    ...modules.filter(m => m !== 'Semua').map((m) => ({
                                        value: m,
                                        label: m,
                                    })),
                                ]}
                                placeholder="Modul: Semua"
                                searchPlaceholder="Cari modul..."
                            />
                        </div>

                        {/* Aktivitas Select */}
                        <div className="relative lg:col-span-2">
                            <Select2
                                value={selectedActivity}
                                onChange={(val) => setSelectedActivity(val)}
                                options={[
                                    { value: '', label: 'Aktivitas: Semua' },
                                    ...activities.filter(a => a !== 'Semua').map((a) => ({
                                        value: a,
                                        label: a,
                                    })),
                                ]}
                                placeholder="Aktivitas: Semua"
                                searchPlaceholder="Cari aktivitas..."
                            />
                        </div>

                        {/* Date From */}
                        <div className="relative lg:col-span-2">
                            <Input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                title="Tanggal Dari"
                                className="h-9 text-xs sm:text-sm rounded-lg bg-background text-muted-foreground focus:text-foreground cursor-pointer"
                            />
                        </div>

                        {/* Date To */}
                        <div className="relative lg:col-span-2">
                            <Input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                title="Tanggal Sampai"
                                className="h-9 text-xs sm:text-sm rounded-lg bg-background text-muted-foreground focus:text-foreground cursor-pointer"
                            />
                        </div>
                    </div>

                    {/* Bottom Row Action Buttons */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                        <span className="text-[11px] sm:text-xs text-muted-foreground italic select-none">
                            *Menyalin data log pada halaman aktif ini
                        </span>

                        <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
                            {hasActiveFilters && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleResetFilters}
                                    className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                                >
                                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                                    Reset
                                </Button>
                            )}

                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={copyForExcel}
                                className="h-8 px-3 text-xs font-medium border-border/80 shadow-2xs hover:bg-accent cursor-pointer"
                            >
                                <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                                Salin untuk Excel
                            </Button>

                            <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="h-8 px-2.5 text-xs font-medium border-border/80 shadow-2xs hover:bg-accent hidden sm:inline-flex"
                                title="Download Seluruh Hasil Filter (CSV)"
                            >
                                <a href={`/audit/export?${new URLSearchParams({
                                    q: search,
                                    module: selectedModule,
                                    activity: selectedActivity,
                                    date_from: dateFrom,
                                    date_to: dateTo
                                } as Record<string, string>).toString()}`}>
                                    <Download className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                                    Export CSV
                                </a>
                            </Button>

                            <Button
                                type="button"
                                size="sm"
                                onClick={handleApplyFilters}
                                className="h-8 px-4 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xs cursor-pointer"
                            >
                                Terapkan
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Table Card */}
                <div className="bg-white dark:bg-slate-900 border border-border/80 rounded-xl overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead>
                                <tr className="border-b border-border/70 bg-slate-50/70 dark:bg-slate-800/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider select-none">
                                    <th scope="col" className="py-3 px-3 w-[55px] text-center">
                                        NO
                                    </th>
                                    <th scope="col" className="py-3 px-4 w-[160px]">
                                        WAKTU
                                    </th>
                                    <th scope="col" className="py-3 px-4 w-[220px]">
                                        USER
                                    </th>
                                    <th scope="col" className="py-3 px-4 w-[140px]">
                                        MODUL
                                    </th>
                                    <th scope="col" className="py-3 px-4 w-[130px]">
                                        AKTIVITAS
                                    </th>
                                    <th scope="col" className="py-3 px-4 min-w-[260px]">
                                        DESKRIPSI
                                    </th>
                                    <th scope="col" className="py-3 px-4 w-[130px]">
                                        IP
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {logs.data && logs.data.length > 0 ? (
                                    logs.data.map((item, index) => (
                                        <React.Fragment key={item.id}>
                                            <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                                                {/* No */}
                                                <td className="py-3.5 px-3 text-center text-xs font-medium text-muted-foreground tabular-nums">
                                                    {(logs.from ?? 1) + index}
                                                </td>

                                                {/* Waktu */}
                                                <td className="py-3.5 px-4 text-xs sm:text-sm text-foreground whitespace-nowrap font-normal">
                                                    {item.formatted_date}
                                                </td>

                                                {/* User */}
                                                <td className="py-3.5 px-4">
                                                    <div className="flex items-center gap-1.5 leading-tight">
                                                        <UserIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                        <span className="font-medium text-xs sm:text-sm text-foreground truncate">
                                                            {item.user.name}
                                                        </span>
                                                    </div>
                                                    <div className="text-[10px] sm:text-[11px] text-muted-foreground uppercase font-mono mt-0.5 tracking-wide">
                                                        {item.user.org_code || item.user.role}
                                                    </div>
                                                </td>

                                                {/* Modul */}
                                                <td className="py-3.5 px-4 whitespace-nowrap">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80">
                                                        {item.module}
                                                    </span>
                                                </td>

                                                {/* Aktivitas */}
                                                <td className="py-3.5 px-4 whitespace-nowrap">
                                                    <span
                                                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getActivityBadgeClass(
                                                            item.action
                                                        )}`}
                                                    >
                                                        {item.action}
                                                    </span>
                                                </td>

                                                {/* Deskripsi */}
                                                <td className="py-3.5 px-4">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <span className="text-xs sm:text-sm text-foreground/90 leading-snug break-words">
                                                            {item.description}
                                                        </span>
                                                        {item.diff && Object.keys(item.diff).length > 0 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setExpandedRow(expandedRow === item.id ? null : item.id)}
                                                                className="shrink-0 text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 bg-muted/60 hover:bg-muted px-1.5 py-0.5 rounded border border-border/80"
                                                                title="Lihat rincian perubahan"
                                                            >
                                                                Diff
                                                                {expandedRow === item.id ? (
                                                                    <ChevronUp className="h-3 w-3" />
                                                                ) : (
                                                                    <ChevronDown className="h-3 w-3" />
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* IP Address */}
                                                <td className="py-3.5 px-4 text-xs font-mono text-muted-foreground whitespace-nowrap">
                                                    {item.ip_address}
                                                </td>
                                            </tr>

                                            {/* Expandable diff viewer */}
                                            {expandedRow === item.id && item.diff && (
                                                <tr className="bg-slate-50/90 dark:bg-slate-900/80">
                                                    <td colSpan={7} className="px-6 py-3 border-b border-border/70">
                                                        <div className="text-xs font-semibold text-muted-foreground mb-1.5">
                                                            Perubahan Data (Diff):
                                                        </div>
                                                        <pre className="text-[11px] font-mono bg-background p-3 rounded-lg border border-border/80 overflow-x-auto max-h-48 text-foreground/80">
                                                            {JSON.stringify(item.diff, null, 2)}
                                                        </pre>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))
                                ) : (
                                    <TableEmptyRow
                                        colSpan={7}
                                        title="Belum Ada Log Aktivitas"
                                        description="Tidak ada riwayat aktivitas yang sesuai dengan kriteria filter pencarian."
                                    />
                                )}
                            </tbody>
                        </table>
                    </div>

                    <TablePagination
                        pagination={logs}
                        itemLabel="aktivitas"
                        perPage={perPage}
                        onPerPageChange={handlePerPageChange}
                        baseUrl={route('audit.index')}
                        filters={{
                            q: search || undefined,
                            module: selectedModule && selectedModule !== 'Semua' ? selectedModule : undefined,
                            activity: selectedActivity && selectedActivity !== 'Semua' ? selectedActivity : undefined,
                            date_from: dateFrom || undefined,
                            date_to: dateTo || undefined,
                            per_page: perPage,
                        }}
                    />
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
