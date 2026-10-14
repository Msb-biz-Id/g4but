import React, { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { cn, formatDateTime } from '@/lib/utils';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { SelectNative } from '@/Components/ui/select-native';
import { Input } from '@/Components/ui/input';
import { Textarea } from '@/Components/ui/textarea';
import { Label } from '@/Components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/Components/ui/alert-dialog';
import { AlertTriangle, Plus, Zap, CheckCircle2, XCircle, Settings2, Trash2, CircleDot } from 'lucide-react';
import { EmptyState } from '@/Components/EmptyState';
import TablePagination from '@/Components/TablePagination';
import PageHeader from '@/Components/Dashboard/PageHeader';


interface AlertItem {
    id: number;
    alert_type: string;
    severity: string;
    title: string;
    message: string | null;
    status: string;
    acknowledged_at: string | null;
    resolved_at: string | null;
    created_at: string;
    rule: { code: string; name: string; rule_type: string } | null;
    organization: { code: string; name: string; short_name?: string } | null;
}

interface AlertRule {
    id: number;
    name: string;
    description?: string;
    type: string;
    operator: string;
    threshold: number;
    level: string;
    is_active: boolean;
    performance_period_id?: number;
    notify_roles?: string[];
}

interface AlertStats {
    open: number;
    critical: number;
    in_progress: number;
    resolved: number;
}

interface ComplianceData {
    report_rate: number;
    submitted: number;
    not_submitted: number;
    rows: { organization: string; submitted: string | boolean }[];
}

interface RulesCheckItem {
    indicator: string;
    organization: string;
    achievement: number;
}

interface Period { id: number; year: number; }

interface AlertsIndexProps extends PageProps {
    alerts: {
        data: AlertItem[];
        links?: { url: string | null; label: string; active: boolean }[];
        from?: number;
        to?: number;
        total?: number;
        current_page?: number;
        last_page?: number;
        meta?: { current_page: number; last_page: number; from: number; to: number; total: number; links?: { url: string | null; label: string; active: boolean }[] };
    };
    alertStats: AlertStats;
    rules: AlertRule[];
    rulesCheck: RulesCheckItem[];
    compliance: ComplianceData;
    filters: { severity?: string; status?: string; level?: string; per_page?: number | string };
 periods: Period[];
 canManage: boolean;
 canResolve: boolean;
 levelLabels: Record<string, string>;
 statusLabels: Record<string, string>;
 typeLabels: Record<string, string>;
}

const severityVariant: Record<string, 'destructive' | 'warning' | 'info' | 'secondary'> = {
 critical: 'destructive', high: 'destructive', warning: 'warning', medium: 'warning',
 low: 'info', info: 'info',
};
const statusVariant: Record<string, 'destructive' | 'warning' | 'info' | 'success' | 'secondary'> = {
 open: 'destructive', acknowledged: 'warning', in_progress: 'info',
 resolved: 'success', closed: 'secondary',
};
const lvlWeight: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };

const nextStatus = (s: string): string | null =>
 s === 'open' ? 'acknowledged' : s === 'acknowledged' ? 'in_progress' :
 s === 'in_progress' ? 'resolved' : null;

export default function AlertsIndex({
 alerts,
 alertStats,
 rules = [],
 rulesCheck = [],
 compliance = { report_rate: 0, submitted: 0, not_submitted: 0, rows: [] },
 filters,
 periods = [],
 canManage,
 canResolve,
 levelLabels = {},
 statusLabels = {},
 typeLabels = {},
}: AlertsIndexProps) {
 const [ruleModal, setRuleModal] = useState(false);
 const [deleteRuleTarget, setDeleteRuleTarget] = useState<number | null>(null);

 const { data, setData, post, processing, errors, reset } = useForm({
 name: '',
 description: '',
 type: 'performance_deviation',
 performance_period_id: '' as string | number,
 threshold: '' as string | number,
 operator: '<',
 level: 'high',
 notify_roles: [] as string[],
 is_active: true,
 });

 const triggerDetection = () => {
 router.post('/ews/generate', {}, { preserveScroll: true });
 };

 const deleteRule = (id: number) => setDeleteRuleTarget(id);

 const confirmDeleteRule = () => {
 if (deleteRuleTarget === null) return;
 router.delete(`/alert-rules/${deleteRuleTarget}`, {
 preserveScroll: true,
 onSuccess: () => setDeleteRuleTarget(null),
 });
 };

 const handleFilter = (key: string, value: string) => {
 router.get('/alerts', { ...filters, [key]: value }, { preserveState: true, preserveScroll: true });
 };

 const nextStateAction = (alert: AlertItem) => {
 const next = nextStatus(alert.status);
 if (!next) return;
 if (next === 'resolved') {
 router.post(`/alerts/${alert.id}/resolve`, {}, { preserveScroll: true });
 } else {
 router.post(`/alerts/${alert.id}/acknowledge`, {}, { preserveScroll: true });
 }
 };

 const resolveAlert = (id: number) => {
 router.post(`/alerts/${id}/resolve`, {}, { preserveScroll: true });
 };

 const submitRule = (e: React.FormEvent) => {
 e.preventDefault();
 post('/alert-rules', {
 onSuccess: () => {
 setRuleModal(false);
 reset();
 }
 });
 };

 const toggleRole = (role: string) => {
 setData('notify_roles', data.notify_roles.includes(role)
 ? data.notify_roles.filter(r => r !== role)
 : [...data.notify_roles, role]
 );
 };

 const availRoles = ['admin', 'kepala_opd', 'opd', 'inspectorate'];

 return (
 <AuthenticatedLayout header="Early Warning System">
            <Head title="Early Warning System" />

            <div className="space-y-6">
                <PageHeader
                    breadcrumbs={[
                        { label: 'Monitoring & Evaluasi' },
                        { label: 'Early Warning System (EWS)' },
                    ]}
                    title="Early Warning System (EWS)"
                    description="Sistem deteksi dini anomali capaian kinerja, deviasi target, dan keterlambatan pelaporan indikator."
                    badge="Deteksi Otomatis"
                    actions={
                        canManage ? (
                            <div className="flex flex-wrap items-center gap-2">
                                <Button onClick={triggerDetection} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                                    <Zap className="w-4 h-4" />
                                    Picu Deteksi
                                </Button>
                                <Button variant="outline" onClick={() => { reset(); setRuleModal(true); }} className="gap-2">
                                    <Plus className="w-4 h-4" />
                                    Tambah Aturan
                                </Button>
                            </div>
                        ) : undefined
                    }
                />

                {/* Section 2: StatCards Grid 4 kolom */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6 pb-2 space-y-0">
                            <CardTitle className="text-xs sm:text-sm font-medium">Peringatan Terbuka</CardTitle>
                            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                        </CardHeader>
                        <CardContent className="p-4 sm:p-6 pt-0">
                            <div className="text-xl sm:text-2xl font-bold text-rose-600">{alertStats?.open || 0}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6 pb-2 space-y-0">
                            <CardTitle className="text-xs sm:text-sm font-medium">Kritis Aktif</CardTitle>
                            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                        </CardHeader>
                        <CardContent className="p-4 sm:p-6 pt-0">
                            <div className="text-xl sm:text-2xl font-bold text-amber-600">{alertStats?.critical || 0}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6 pb-2 space-y-0">
                            <CardTitle className="text-xs sm:text-sm font-medium">Sedang Ditindak</CardTitle>
                            <Settings2 className="w-4 h-4 text-blue-500 shrink-0" />
                        </CardHeader>
                        <CardContent className="p-4 sm:p-6 pt-0">
                            <div className="text-xl sm:text-2xl font-bold text-blue-600">{alertStats?.in_progress || 0}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6 pb-2 space-y-0">
                            <CardTitle className="text-xs sm:text-sm font-medium">Selesai</CardTitle>
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        </CardHeader>
                        <CardContent className="p-4 sm:p-6 pt-0">
                            <div className="text-xl sm:text-2xl font-bold text-emerald-600">{alertStats?.resolved || 0}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Section 3: Main grid 2/3 + 1/3 */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Kolom kiri (2/3) */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Filter Bar */}
                        <Card>
                            <CardContent className="p-4 flex flex-col sm:flex-row gap-3 sm:gap-4">
                                <div className="flex-1">
                                    <Label className="text-xs mb-1 block">Severity</Label>
                                    <SelectNative
                                        value={filters?.severity || ''}
                                        onChange={(e) => handleFilter('severity', e.target.value)}
                                    >
                                        <option value="">Semua Severity</option>
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="critical">Critical</option>
                                    </SelectNative>
                                </div>
                                <div className="flex-1">
                                    <Label className="text-xs mb-1 block">Status</Label>
                                    <SelectNative
                                        value={filters?.status || ''}
                                        onChange={(e) => handleFilter('status', e.target.value)}
                                    >
                                        <option value="">Semua Status</option>
                                        <option value="open">Open</option>
                                        <option value="acknowledged">Acknowledged</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="resolved">Resolved</option>
                                        <option value="closed">Closed</option>
                                    </SelectNative>
                                </div>
                            </CardContent>
                        </Card>

 {/* Alert Cards */}
 {!alerts?.data || alerts.data.length === 0 ? (
 <Card>
 <EmptyState
 icon={CheckCircle2}
 title="Tidak Ada Peringatan Dini"
 description="Semua target kinerja dan jadwal pelaporan berjalan sesuai rencana tanpa anomali terdeteksi."
 />
 </Card>
 ) : (
 <div className="space-y-4">
 {alerts.data.map((alert) => (
 <Card key={alert.id}>
 <CardHeader className="flex flex-row items-start gap-4 space-y-0">
 <div className="mt-1">
 <CircleDot className={cn("w-4 h-4", (lvlWeight[alert.severity] || 0) >= 2 ? "text-rose-500 animate-pulse" : "text-amber-500")} />
 </div>
 <div className="flex-1">
 <CardTitle className="text-lg">{alert.title}</CardTitle>
 <div className="flex flex-wrap gap-2 mt-2">
 <Badge variant={severityVariant[alert.severity] || 'secondary'}>
 {levelLabels[alert.severity] || alert.severity}
 </Badge>
 <Badge variant={statusVariant[alert.status] || 'secondary'}>
 {statusLabels[alert.status] || alert.status}
 </Badge>
 <Badge variant="outline">
 {typeLabels[alert.alert_type] || alert.alert_type}
 </Badge>
 </div>
 </div>
 {canResolve && alert.status !== 'resolved' && alert.status !== 'closed' && (
 <div className="flex items-center gap-2">
 {nextStatus(alert.status) && (
 <Button variant="outline" size="sm" onClick={() => nextStateAction(alert)}>
 {nextStatus(alert.status) === 'resolved' ? 'Selesai' : 'Lanjutkan'}
 </Button>
 )}
 <Button variant="ghost" size="icon" onClick={() => resolveAlert(alert.id)}>
 <XCircle className="w-4 h-4 text-muted-foreground hover:text-rose-500" />
 </Button>
 </div>
 )}
 </CardHeader>
 <CardContent>
 <p className="text-sm text-foreground/80 whitespace-pre-wrap">{alert.message}</p>
 <div className="mt-4 text-xs text-muted-foreground">
 Dibuat pada: {formatDateTime(alert.created_at)}
 </div>
 </CardContent>
 </Card>
 ))}

                <TablePagination
                    pagination={alerts}
                    itemLabel="alert"
                    baseUrl="/alerts"
                    filters={filters}
                />
            </div>
            )}
        </div>

        {/* Kolom kanan (1/3) */}
        <div className="space-y-6">

            {/* Card 1: Aturan EWS */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-semibold">Aturan EWS</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {rules.length === 0 ? (
                        <div className="text-sm text-muted-foreground">Belum ada aturan aktif.</div>
                    ) : (
                        rules.map(r => (
                            <div key={r.id} className="flex items-start justify-between gap-2 border-b pb-3 last:border-0 last:pb-0">
                                <div>
                                    <div className="font-medium text-sm leading-tight">{r.name}</div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {r.operator} {r.threshold}% &middot; {r.level}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <Badge variant={r.is_active ? 'success' : 'secondary'} className="text-[10px] px-1.5 py-0">
                                        {r.is_active ? 'Aktif' : 'Non-aktif'}
                                    </Badge>
                                    {canManage && (
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteRule(r.id)}>
                                            <Trash2 className="w-3 h-3 text-rose-500" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>

            {/* Card 2: Kepatuhan Pelaporan */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-semibold">Kepatuhan Pelaporan (FR-EWS-004)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium">{compliance.report_rate}% Capaian</span>
                            <span className="text-muted-foreground">{compliance.submitted} lapor / {compliance.not_submitted} belum</span>
                        </div>
                        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                            <div
                                className="h-2 bg-emerald-500 rounded-full transition-all"
                                style={{ width: `${Math.min(compliance.report_rate, 100)}%` }}
                            />
                        </div>
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                        {compliance.rows.map((row, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                                <span className="truncate flex-1 text-xs" title={row.organization}>{row.organization}</span>
                                <Badge variant={row.submitted ? 'success' : 'destructive'} className="ml-2 text-[10px]">
                                    {row.submitted ? 'Ya' : 'Tidak'}
                                </Badge>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Card 3: Deteksi Ambang Batas */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-semibold">Deteksi Ambang Batas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {rulesCheck.length === 0 ? (
                        <div className="text-sm text-muted-foreground">Tidak ada anomali.</div>
                    ) : (
                        rulesCheck.map((r, i) => (
                            <div key={i} className="flex flex-col gap-1 border-b pb-3 last:border-0 last:pb-0">
                                <div className="text-xs font-medium leading-tight">{r.indicator}</div>
                                <div className="text-xs text-muted-foreground">{r.organization}</div>
                                <div className="mt-1">
                                    <Badge variant="destructive" className="text-[10px]">Capaian {r.achievement}%</Badge>
                                </div>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>

        </div>
    </div>
 </div>

 {/* Rule Modal Dialog */}
 <Dialog open={ruleModal} onOpenChange={(open) => { setRuleModal(open); if(!open) reset(); }}>
 <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle>Tambah Aturan EWS</DialogTitle>
 </DialogHeader>
 <form autoComplete="off" noValidate onSubmit={submitRule} className="space-y-4">
 <div className="space-y-2">
 <Label htmlFor="name">Nama Aturan</Label>
 <Input
 id="name"
 value={data.name}
 onChange={e => setData('name', e.target.value)}
 placeholder="Contoh: Capaian Anggaran Rendah"
 />
 {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label htmlFor="operator">Operator</Label>
 <SelectNative id="operator" value={data.operator} onChange={e => setData('operator', e.target.value)}>
 <option value="<">&lt; Kurang dari</option>
 <option value="<=">&lt;= Kurang dari / sama</option>
 <option value=">">&gt; Lebih dari</option>
 <option value=">=">&gt;= Lebih dari / sama</option>
 </SelectNative>
 </div>
 <div className="space-y-2">
 <Label htmlFor="threshold">Threshold (%)</Label>
 <Input
 id="threshold"
 type="number"
 placeholder="cth: 80"
 value={data.threshold}
 onChange={e => setData('threshold', e.target.value)}
 />
 {errors.threshold && <p className="text-sm text-destructive">{errors.threshold}</p>}
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label htmlFor="level">Level Warning</Label>
 <SelectNative id="level" value={data.level} onChange={e => setData('level', e.target.value)}>
 <option value="low">Low</option>
 <option value="medium">Medium</option>
 <option value="high">High</option>
 <option value="critical">Critical</option>
 </SelectNative>
 </div>
 <div className="space-y-2">
 <Label htmlFor="type">Tipe Aturan</Label>
 <SelectNative id="type" value={data.type} onChange={e => setData('type', e.target.value)}>
 <option value="performance_deviation">Deviasi Capaian Kinerja</option>
 <option value="late_report">Keterlambatan Pelaporan</option>
 <option value="missing_evidence">Realisasi Tanpa Bukti Dukung</option>
 <option value="document_overdue">Keterlambatan Dokumen SAKIP</option>
 <option value="pk_unsigned">Perjanjian Kinerja Belum Disahkan</option>
 <option value="revision_pending">Revisi Dokumen Tertunda</option>
 </SelectNative>
 </div>
 </div>

 <div className="space-y-2">
 <Label htmlFor="period">Periode (Opsional)</Label>
 <SelectNative id="period" value={data.performance_period_id} onChange={e => setData('performance_period_id', e.target.value)}>
 <option value="">Semua Periode</option>
 {periods.map(p => (
 <option key={p.id} value={p.id}>{p.year}</option>
 ))}
 </SelectNative>
 </div>

 <div className="space-y-2">
 <Label htmlFor="description">Deskripsi</Label>
 <Textarea
 id="description"
 placeholder="Deskripsi aturan peringatan dini..."
 value={data.description}
 onChange={e => setData('description', e.target.value)}
 rows={2}
 />
 </div>

 <div className="space-y-2">
 <Label>Penerima Notifikasi</Label>
 <div className="flex flex-wrap gap-2">
 {availRoles.map(role => (
 <Button
 key={role}
 type="button"
 variant={data.notify_roles.includes(role) ? 'default' : 'outline'}
 size="sm"
 onClick={() => toggleRole(role)}
 >
 {role}
 </Button>
 ))}
 </div>
 </div>

 <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0 mt-6">
 <Button type="button" variant="outline" onClick={() => setRuleModal(false)}>Batal</Button>
 <Button type="submit" disabled={processing}>Simpan Aturan</Button>
 </DialogFooter>
 </form>
 </DialogContent>
 </Dialog>

 <AlertDialog open={deleteRuleTarget !== null} onOpenChange={(open) => !open && setDeleteRuleTarget(null)}>
 <AlertDialogContent>
 <AlertDialogHeader>
 <AlertDialogTitle>Hapus Aturan Alert?</AlertDialogTitle>
 <AlertDialogDescription>
 Aturan alert ini akan dihapus permanen. Alert yang sudah terbentuk dari aturan ini tidak akan terpengaruh.
 </AlertDialogDescription>
 </AlertDialogHeader>
 <AlertDialogFooter>
 <AlertDialogCancel>Batal</AlertDialogCancel>
 <AlertDialogAction onClick={confirmDeleteRule} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
 Ya, Hapus
 </AlertDialogAction>
 </AlertDialogFooter>
 </AlertDialogContent>
 </AlertDialog>
 </AuthenticatedLayout>
 );
}