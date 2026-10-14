import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import { Button } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { SelectNative } from '@/Components/ui/select-native';
import TablePagination from '@/Components/TablePagination';
import PageHeader from '@/Components/Dashboard/PageHeader';
import { ArrowLeft, Plus, ShieldAlert } from 'lucide-react';
import { Badge } from '@/Components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/Components/ui/table';
import { TableEmptyRow } from '@/Components/EmptyState';

interface RuleItem {
    id: number;
    code: string;
    name: string;
    rule_type: string;
    severity: string;
    is_active: boolean;
    alerts_count: number;
}

interface Props extends PageProps {
    rules: RuleItem[];
}

const ruleTypeLabels: Record<string, string> = {
    submission_overdue: 'Keterlambatan Submit',
    performance_deviation: 'Deviasi Kinerja',
    missing_evidence: 'Evidence Hilang',
    stale_data: 'Data Kedaluwarsa',
    recommendation_overdue: 'Rekomendasi Lewat',
};

export default function AlertsRules({ auth, rules }: Props) {
    const { flash } = usePage().props as { flash: { success?: string | null } };
    const permissions = auth.user?.permissions ?? [];
    const canManage = permissions.includes('alert_rule:manage');

    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(25);

    const total = rules.length;
    const lastPage = Math.max(1, Math.ceil(total / perPage));
    const safeCurrentPage = Math.min(currentPage, lastPage);
    const from = total > 0 ? (safeCurrentPage - 1) * perPage + 1 : 0;
    const to = total > 0 ? Math.min(safeCurrentPage * perPage, total) : 0;
    const paginatedRules = rules.slice((safeCurrentPage - 1) * perPage, safeCurrentPage * perPage);

    const form = useForm({
 code: '',
 name: '',
 rule_type: 'performance_deviation',
 severity: 'warning',
 config: '',
 is_active: true,
 });

 const submit: FormEventHandler = (e) => {
 e.preventDefault();
 form.post(route('alert-rules.store'), {
 preserveScroll: true,
 onSuccess: () => form.reset('code', 'name', 'config'),
 });
 };

    return (
        <AuthenticatedLayout>
            <Head title="Aturan EWS" />

            <div className="space-y-6 p-6">
                <PageHeader
                    title="Aturan Deteksi Dini (EWS)"
                    description="Kelola formula pemicu peringatan deviasi kinerja, keterlambatan submit, dan data anomali."
                    breadcrumbs={[
                        { label: 'Sistem & Otomasi' },
                        { label: 'Deteksi Dini', href: route('alerts.index') },
                        { label: 'Aturan Peringatan' },
                    ]}
                    actions={
                        <Button variant="outline" size="sm" asChild>
                            <Link href={route('alerts.index')} className="gap-1.5">
                                <ArrowLeft className="h-4 w-4" />
                                Kembali ke Peringatan
                            </Link>
                        </Button>
                    }
                />

                {flash?.success && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                        {flash.success}
                    </div>
                )}

                {canManage && (
                    <Card className="rounded-xl border border-slate-200/80 p-5 shadow-sm dark:border-slate-800">
                        <form autoComplete="off" noValidate onSubmit={submit} className="space-y-4">
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                                Tambah Aturan Baru
                            </h3>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                <Input
                                    type="text"
                                    value={form.data.code}
                                    onChange={(e) => form.setData('code', e.target.value)}
                                    placeholder="Kode (mis. EWS-PD-01)"
                                    className="h-9"
                                />
                                <Input
                                    type="text"
                                    value={form.data.name}
                                    onChange={(e) => form.setData('name', e.target.value)}
                                    placeholder="Nama aturan"
                                    className="h-9"
                                />
                                <SelectNative
                                    value={form.data.rule_type}
                                    onChange={(e) => form.setData('rule_type', e.target.value)}
                                    className="h-9"
                                >
                                    {Object.entries(ruleTypeLabels).map(([key, value]) => (
                                        <option key={key} value={key}>
                                            {value}
                                        </option>
                                    ))}
                                </SelectNative>
                                <SelectNative
                                    value={form.data.severity}
                                    onChange={(e) => form.setData('severity', e.target.value)}
                                    className="h-9"
                                >
                                    <option value="info">Info</option>
                                    <option value="warning">Warning</option>
                                    <option value="critical">Kritis</option>
                                </SelectNative>
                                <Input
                                    type="text"
                                    value={form.data.config}
                                    onChange={(e) => form.setData('config', e.target.value)}
                                    placeholder='Config JSON (mis. {"threshold": 60})'
                                    className="h-9 sm:col-span-2 lg:col-span-4"
                                />
                            </div>
                            {form.errors.code && (
                                <p className="text-xs text-red-600">
                                    {form.errors.code}
                                </p>
                            )}
                            <div className="flex justify-end">
                                <Button type="submit" size="sm" disabled={form.processing} className="gap-1.5">
                                    <Plus className="h-4 w-4" />
                                    Simpan Aturan
                                </Button>
                            </div>
                        </form>
                    </Card>
                )}

                <Card className="overflow-hidden rounded-xl border border-slate-200/80 shadow-sm dark:border-slate-800">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12 text-xs font-semibold uppercase tracking-wider text-slate-500">No</TableHead>
                                <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Aturan</TableHead>
                                <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tipe</TableHead>
                                <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tingkat</TableHead>
                                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Peringatan</TableHead>
                                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedRules.map((rule, index) => (
                                <TableRow key={rule.id}>
                                    <TableCell className="text-xs font-medium text-slate-500 tabular-nums">
                                        {from + index}
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm font-semibold text-slate-900 dark:text-white">
                                            {rule.name}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {rule.code}
                                        </div>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">
                                        {ruleTypeLabels[rule.rule_type] ?? rule.rule_type}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap text-xs">
                                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                                            rule.severity === 'critical'
                                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400'
                                                : rule.severity === 'warning'
                                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
                                                : 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400'
                                        }`}>
                                            {rule.severity.toUpperCase()}
                                        </span>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap text-right text-sm font-semibold text-slate-900 dark:text-white">
                                        {rule.alerts_count}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap text-right text-xs">
                                        {canManage ? (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    router.post(
                                                        route('alert-rules.toggle', rule.id),
                                                    )
                                                }
                                                className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                                                    rule.is_active
                                                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300'
                                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                                                }`}
                                            >
                                                {rule.is_active ? 'Aktif' : 'Nonaktif'}
                                            </button>
                                        ) : (
                                            <span className={`text-xs font-medium ${rule.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                {rule.is_active ? 'Aktif' : 'Nonaktif'}
                                            </span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {rules.length === 0 && (
                                <TableEmptyRow
                                    colSpan={6}
                                    title="Belum Ada Aturan Alert"
                                    description="Belum ada konfigurasi aturan deteksi dini (EWS) yang dibuat."
                                />
                            )}
                        </TableBody>
                    </Table>
                    <TablePagination
                        clientSide={true}
                        from={from}
                        to={to}
                        totalItems={total}
                        perPage={perPage}
                        currentPage={safeCurrentPage}
                        lastPage={lastPage}
                        itemLabel="aturan"
                        onPerPageChange={(val) => { setPerPage(val); setCurrentPage(1); }}
                        onClientPageChange={(page) => setCurrentPage(page)}
                    />
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}