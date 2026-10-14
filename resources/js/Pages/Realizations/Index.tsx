import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import {Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent } from '@/Components/ui/card';
import { SelectNative } from '@/Components/ui/select-native';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/Components/ui/table';
import { TableEmptyRow } from '@/Components/EmptyState';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/Components/ui/dialog';
import { Textarea } from '@/Components/ui/textarea';
import { Label } from '@/Components/ui/label';
import {
    AlertCircle,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    FileText,
    Paperclip,
    PlusCircle,
    Filter,
    X,
} from 'lucide-react';
import TablePagination from '@/Components/TablePagination';
import PageHeader from '@/Components/Dashboard/PageHeader';
import StatusBadge from '@/Components/Dashboard/StatusBadge';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Achievement {
    percentage: number | null;
    status: 'good' | 'warning' | 'critical' | 'no_data';
    target: number | null;
}

interface Realization {
    id: number;
    value: string;
    status: string;
    version: number;
    submitted_at: string | null;
    approved_at: string | null;
    indicator_version: {
        name: string;
        version_number: number;
        direction: string;
        measurement_unit: { code: string; name: string; symbol: string | null } | null;
        indicator: { id: number; code: string } | null;
    } | null;
    organization: { id: number; code: string; name: string } | null;
    measurement_period: { id: number; code: string; name: string; type: string } | null;
    evidences_count?: number;
    achievement?: Achievement;
    last_revision_reason?: string | null;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface Props extends PageProps {
    realizations: {
        data: Realization[];
        links: PaginationLink[];
        from: number | null;
        to: number | null;
        total: number;
        current_page: number;
        last_page: number;
    };
    filters: { period_id?: string; organization_id?: string; status?: string; per_page?: number | string };
    periods: Array<{ id: number; code: string; name: string; type: string }>;
    organizations: Array<{ id: number; code: string; name: string }>;
    good_threshold: number;
    warning_threshold: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const statusConfig: Record<string, { text: string; variant: 'success' | 'warning' | 'info' | 'secondary' | 'destructive' }> = {
    draft:             { text: 'Draft',        variant: 'secondary' },
    submitted:         { text: 'Disubmit',     variant: 'info' },
    under_review:      { text: 'Review',       variant: 'warning' },
    revision_required: { text: 'Perlu Revisi', variant: 'destructive' },
    resubmitted:       { text: 'Resubmit',     variant: 'info' },
    approved:          { text: 'Disetujui',    variant: 'success' },
    locked:            { text: 'Terkunci',     variant: 'secondary' },
};

const achievementConfig: Record<string, { text: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' }> = {
    good:     { text: 'Baik',    variant: 'success' },
    warning:  { text: 'Waspada', variant: 'warning' },
    critical: { text: 'Kritis',  variant: 'destructive' },
    no_data:  { text: '-',       variant: 'secondary' },
};

// ─── Revision Dialog ──────────────────────────────────────────────────────────

function RevisionDialog({
    open,
    onClose,
    onConfirm,
    processing,
}: {
    open: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => void;
    processing: boolean;
}) {
    const [reason, setReason] = useState('');

    useEffect(() => {
        if (!open) setReason('');
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Minta Revisi</DialogTitle>
                    <DialogDescription>
                        Berikan alasan yang jelas agar operator dapat memperbaiki realisasi ini.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                    <Label htmlFor="revision-reason">Alasan Revisi <span className="text-red-500">*</span></Label>
                    <Textarea
                        id="revision-reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={4}
                        placeholder="mis. Nilai tidak sesuai dengan dokumen pendukung..."
                        className="resize-none"
                    />
                    {reason.trim().length === 0 && reason.length > 0 && (
                        <p className="text-xs text-red-500">Alasan tidak boleh kosong.</p>
                    )}
                </div>
                <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
                    <Button variant="ghost" onClick={onClose} disabled={processing}>Batal</Button>
                    <Button
                        variant="destructive"
                        onClick={() => reason.trim() && onConfirm(reason.trim())}
                        disabled={!reason.trim() || processing}
                    >
                        {processing ? 'Memproses...' : 'Minta Revisi'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RealizationsIndex({
    auth,
    realizations,
    filters,
    periods,
    organizations,
    good_threshold,
    warning_threshold,
}: Props) {
    const { flash } = usePage().props as { flash: { success?: string | null; error?: string | null } };

    const [periodId, setPeriodId]       = useState(filters.period_id ?? '');
    const [organizationId, setOrgId]    = useState(filters.organization_id ?? '');
    const [status, setStatus]           = useState(filters.status ?? '');
    const [perPage, setPerPage]         = useState(Number(filters.per_page) || 25);
    const [revisionOpen, setRevisionOpen] = useState(false);
    const [revisionTarget, setRevisionTarget] = useState<number | null>(null);
    const [revisionProcessing, setRevisionProcessing] = useState(false);
    const filterTimer = useRef<ReturnType<typeof setTimeout>>();
    const isMounted = useRef(false);

    const permissions   = auth.user?.permissions ?? [];
    const canCreate     = permissions.includes('realization:create');
    const canUpdate     = permissions.includes('realization:update');
    const canSubmit     = permissions.includes('realization:submit');
    const canApprove    = permissions.includes('realization:approve');
    const canReject     = permissions.includes('realization:reject');

    // Debounced filter navigation - isMounted guard prevents double request on mount
    useEffect(() => {
        if (!isMounted.current) { isMounted.current = true; return; }
        clearTimeout(filterTimer.current);
        filterTimer.current = setTimeout(() => {
            router.get(
                route('realizations.index'),
                { period_id: periodId, organization_id: organizationId, status, per_page: perPage },
                { preserveState: true, replace: true },
            );
        }, 350);
        return () => clearTimeout(filterTimer.current);
    }, [periodId, organizationId, status, perPage]);

    const hasFilters = Boolean(periodId || organizationId || status);
    const resetFilters = () => {
        setPeriodId('');
        setOrgId('');
        setStatus('');
    };

    const handleRevisionConfirm = (reason: string) => {
        if (!revisionTarget) return;
        setRevisionProcessing(true);
        router.post(
            route('realizations.revision', revisionTarget),
            { reason },
            {
                onFinish: () => {
                    setRevisionProcessing(false);
                    setRevisionOpen(false);
                    setRevisionTarget(null);
                },
            },
        );
    };

    return (
        <AuthenticatedLayout header="Realisasi Kinerja">
            <Head title="Realisasi Kinerja" />
            <div className="py-6">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <PageHeader
                        breadcrumbs={[
                            { label: 'Pengukuran' },
                            { label: 'Realisasi Kinerja' },
                        ]}
                        title="Realisasi Kinerja Indikator"
                        description="Pengelolaan dan verifikasi capaian realisasi indikator kinerja berkala instansi pemerintah."
                        actions={
                            canCreate ? (
                                <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
                                    <Link href={route('realizations.create')}>
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Input Realisasi
                                    </Link>
                                </Button>
                            ) : undefined
                        }
                    />

                    {/* Flash messages */}
                    {flash?.success && (
                        <div className="flex items-center gap-2 rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            {flash.success}
                        </div>
                    )}
                    {flash?.error && (
                        <div className="flex items-center gap-2 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            {flash.error}
                        </div>
                    )}

                    {/* Filters */}
                    <Card>
                        <CardContent className="p-4 sm:p-5">
                            <div className="flex items-center justify-between gap-2 mb-3">
                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    <Filter className="h-4 w-4 text-primary" />
                                    <span>Filter Realisasi Kinerja</span>
                                </div>
                                {hasFilters && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={resetFilters}
                                        className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive transition-colors"
                                    >
                                        <X className="mr-1 h-3.5 w-3.5" />
                                        Reset Filter
                                    </Button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <SelectNative value={periodId} onChange={(e) => setPeriodId(e.target.value)} className="w-full">
                                    <option value="">Semua Periode</option>
                                    {periods.map((p) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </SelectNative>
                                <SelectNative value={organizationId} onChange={(e) => setOrgId(e.target.value)} className="w-full">
                                    <option value="">Semua OPD</option>
                                    {organizations.map((org) => (
                                        <option key={org.id} value={org.id}>{org.code} - {org.name}</option>
                                    ))}
                                </SelectNative>
                                <SelectNative value={status} onChange={(e) => setStatus(e.target.value)} className="w-full">
                                    <option value="">Semua Status</option>
                                    {Object.entries(statusConfig).map(([key, val]) => (
                                        <option key={key} value={key}>{val.text}</option>
                                    ))}
                                </SelectNative>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Table */}
                    <Card className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-10 text-xs uppercase tracking-wider">No</TableHead>
                                        <TableHead className="text-xs uppercase tracking-wider">Indikator</TableHead>
                                        <TableHead className="text-xs uppercase tracking-wider">OPD</TableHead>
                                        <TableHead className="text-xs uppercase tracking-wider">Periode</TableHead>
                                        <TableHead className="text-right text-xs uppercase tracking-wider">Nilai</TableHead>
                                        <TableHead className="text-right text-xs uppercase tracking-wider">Capaian</TableHead>
                                        <TableHead className="text-xs uppercase tracking-wider">Status</TableHead>
                                        <TableHead className="text-xs uppercase tracking-wider">Evidence</TableHead>
                                        <TableHead className="text-right text-xs uppercase tracking-wider">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {realizations.data.length === 0 && (
                                        <TableEmptyRow
                                            colSpan={9}
                                            title="Belum Ada Data Realisasi"
                                            description="Tidak ada data realisasi yang ditemukan untuk periode, OPD, atau status yang dipilih."
                                        />
                                    )}
                                    {realizations.data.map((real, index) => {
                                        const sConf     = statusConfig[real.status] ?? { text: real.status, variant: 'secondary' as const };
                                        const ach       = real.achievement;
                                        const achConf   = achievementConfig[ach?.status ?? 'no_data'];
                                        const editable  = canUpdate && (real.status === 'draft' || real.status === 'revision_required');
                                        const submittable = canSubmit && (real.status === 'draft' || real.status === 'revision_required');
                                        const approvable  = canApprove && (real.status === 'submitted' || real.status === 'resubmitted');
                                        const rejectable  = canReject && (real.status === 'submitted' || real.status === 'resubmitted');

                                        return (
                                            <TableRow key={real.id} className={real.status === 'revision_required' ? 'bg-red-50/40 dark:bg-red-950/20' : ''}>
                                                <TableCell className="text-sm text-gray-500 tabular-nums">
                                                    {(realizations.from ?? 1) + index}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm font-medium">
                                                        {real.indicator_version?.indicator?.code ?? '-'} - {real.indicator_version?.name ?? '-'}
                                                    </div>
                                                    <div className="mt-0.5 text-xs text-gray-400">v{real.indicator_version?.version_number}</div>
                                                    {/* Show revision reason as inline notice (FR-MSR-010) */}
                                                    {real.last_revision_reason && (
                                                        <div className="mt-1 flex items-start gap-1 rounded bg-red-50 px-2 py-1 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
                                                            <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                                                            <span className="line-clamp-2">{real.last_revision_reason}</span>
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap text-sm text-gray-500">
                                                    {real.organization?.code ?? '-'}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap text-sm text-gray-500">
                                                    {real.measurement_period?.name ?? '-'}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap text-right font-semibold">
                                                    {Number(real.value).toLocaleString('id-ID')}
                                                    {real.indicator_version?.measurement_unit?.symbol
                                                        ? ` ${real.indicator_version.measurement_unit.symbol}`
                                                        : ''}
                                                </TableCell>
                                                {/* Achievement % column (FR-MSR-005) */}
                                                <TableCell className="whitespace-nowrap text-right">
                                                    {ach?.percentage != null ? (
                                                        <div className="flex flex-col items-end gap-0.5">
                                                            <Badge variant={achConf.variant}>
                                                                {ach.percentage.toLocaleString('id-ID')}%
                                                            </Badge>
                                                            <span className="text-xs text-gray-400">{achConf.text}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap">
                                                    <Badge variant={sConf.variant}>{sConf.text}</Badge>
                                                </TableCell>
                                                {/* Evidence count (FR-MSR-006) */}
                                                <TableCell className="whitespace-nowrap text-center">
                                                    <span className={`inline-flex items-center gap-1 text-xs ${(real.evidences_count ?? 0) > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                                        <Paperclip className="h-3.5 w-3.5" />
                                                        {real.evidences_count ?? 0}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap text-right text-sm">
                                                    <div className="flex justify-end gap-2">
                                                        {editable && (
                                                            <Button asChild variant="outline" size="sm">
                                                                <Link href={route('realizations.edit', real.id)}>Edit</Link>
                                                            </Button>
                                                        )}
                                                        {submittable && (
                                                            <Button
                                                                size="sm"
                                                                variant="secondary"
                                                                onClick={() => router.post(route('realizations.submit', real.id))}
                                                            >
                                                                Submit
                                                            </Button>
                                                        )}
                                                        {approvable && (
                                                            <Button
                                                                size="sm"
                                                                onClick={() => router.post(route('realizations.approve', real.id))}
                                                            >
                                                                Setujui
                                                            </Button>
                                                        )}
                                                        {rejectable && (
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                onClick={() => {
                                                                    setRevisionTarget(real.id);
                                                                    setRevisionOpen(true);
                                                                }}
                                                            >
                                                                Revisi
                                                            </Button>
                                                        )}
                                                        {!editable && !submittable && !approvable && !rejectable && (
                                                            <Button asChild variant="ghost" size="sm">
                                                                <Link href={route('realizations.edit', real.id)}>
                                                                    <FileText className="h-3.5 w-3.5" />
                                                                </Link>
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {realizations.data.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={8} className="py-12 text-center text-gray-400">
                                                <FileText className="mx-auto mb-2 h-8 w-8 opacity-30" />
                                                Belum ada realisasi yang sesuai filter.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination (FR-COM-003) */}
                        <TablePagination
                            pagination={realizations}
                            itemLabel="realisasi"
                            perPage={perPage}
                            onPerPageChange={(val) => setPerPage(val)}
                            baseUrl={route('realizations.index')}
                            filters={{ period_id: periodId, organization_id: organizationId, status, per_page: perPage }}
                        />
                    </Card>
                </div>
            </div>

            {/* Revision Dialog (FR-MSR-010) - replaces window.prompt */}
            <RevisionDialog
                open={revisionOpen}
                onClose={() => { setRevisionOpen(false); setRevisionTarget(null); }}
                onConfirm={handleRevisionConfirm}
                processing={revisionProcessing}
            />
        </AuthenticatedLayout>
    );
}