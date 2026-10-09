import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import {Head, router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import { Button } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { SelectNative } from '@/Components/ui/select-native';
import TablePagination from '@/Components/TablePagination';
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
 <AuthenticatedLayout
 header="Aturan Peringatan"
 >
 <Head title="Aturan EWS" />
 <div className="py-12">
 <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
 {flash?.success && (
 <div className="mb-4 rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">
 {flash.success}
 </div>
 )}

 {canManage && (
 <Card className="mb-6 p-6">
 <form autoComplete="off" noValidate onSubmit={submit} className="space-y-4">
 <h3 className="text-sm font-semibold text-gray-900">
 Aturan Baru
 </h3>
 <div className="grid gap-4 lg:grid-cols-2">
 <Input
 type="text"
 value={form.data.code}
 onChange={(e) =>
 form.setData('code', e.target.value)
 }
 placeholder="Kode (mis. EWS-PD-01)"

 />
 <Input
 type="text"
 value={form.data.name}
 onChange={(e) =>
 form.setData('name', e.target.value)
 }
 placeholder="Nama aturan"

 />
 <SelectNative
 value={form.data.rule_type}
 onChange={(e) =>
 form.setData('rule_type', e.target.value)
 }
 >
 {Object.entries(ruleTypeLabels).map(([key, value]) => (
 <option key={key} value={key}>
 {value}
 </option>
 ))}
 </SelectNative>
 <SelectNative
 value={form.data.severity}
 onChange={(e) =>
 form.setData('severity', e.target.value)
 }
 >
 <option value="info">Info</option>
 <option value="warning">Warning</option>
 <option value="critical">Kritis</option>
 </SelectNative>
 <Input
 type="text"
 value={form.data.config}
 onChange={(e) =>
 form.setData('config', e.target.value)
 }
 placeholder='Config JSON (mis. {"threshold": 60})'
 className="lg:col-span-2"
 />
 </div>
 {form.errors.code && (
 <p className="text-xs text-red-600">
 {form.errors.code}
 </p>
 )}
 <Button type="submit" disabled={form.processing}>
 + Aturan
 </Button>
 </form>
 </Card>
 )}

 <Card className="overflow-hidden">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead className="w-10 uppercase tracking-wider text-xs">No</TableHead>
 <TableHead className="uppercase tracking-wider text-xs">Aturan</TableHead>
 <TableHead className="uppercase tracking-wider text-xs">Tipe</TableHead>
 <TableHead className="uppercase tracking-wider text-xs">Severity</TableHead>
 <TableHead className="text-right uppercase tracking-wider text-xs">Alert</TableHead>
 <TableHead className="text-right uppercase tracking-wider text-xs">Status</TableHead>
 </TableRow>
 </TableHeader>
                    <TableBody>
                        {paginatedRules.map((rule, index) => (
                            <TableRow key={rule.id}>
                                <TableCell className="text-sm text-gray-500 tabular-nums">
                                    {from + index}
                                </TableCell>
                                <TableCell>
                                    <div className="text-sm font-medium text-gray-900">
                                        {rule.code} - {rule.name}
                                    </div>
                                </TableCell>
                                <TableCell className="whitespace-nowrap text-gray-500">
                                    {ruleTypeLabels[rule.rule_type] ?? rule.rule_type}
                                </TableCell>
                                <TableCell className="whitespace-nowrap text-sm uppercase text-gray-500">
                                    {rule.severity}
                                </TableCell>
                                <TableCell className="whitespace-nowrap text-right text-gray-900">
                                    {rule.alerts_count}
                                </TableCell>
                                <TableCell className="whitespace-nowrap text-right text-sm">
                                    {canManage && (
                                        <button
                                            onClick={() =>
                                                router.post(
                                                    route('alert-rules.toggle', rule.id),
                                                )
                                            }
                                            className={
                                                rule.is_active
                                                    ? 'text-green-600 hover:text-green-800'
                                                    : 'text-gray-400 hover:text-gray-600'
                                            }
                                        >
                                            {rule.is_active ? 'Aktif' : 'Nonaktif'}
                                        </button>
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
 </div>
 </AuthenticatedLayout>
 );
}