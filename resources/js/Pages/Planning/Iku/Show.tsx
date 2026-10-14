import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Edit, Send, CheckCircle, XCircle, Archive, FileText, ArrowLeft, Calendar, Building2, Target, Info, ShieldCheck, History, Award } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import { StatusBadge } from '@/Components/Dashboard/StatusBadge';
import { LevelBadge } from '@/Components/Dashboard/LevelBadge';
import { PageBreadcrumb } from '@/Components/Dashboard/PageBreadcrumb';

// ── Types ──────────────────────────────────────────────────────────────────────

interface IkuHistory {
    id: number;
    action: string;
    notes: string | null;
    created_at: string;
    user?: { id: number; name: string };
    previous_data: Record<string, unknown> | null;
    new_data: Record<string, unknown> | null;
}

interface IkuTarget {
    id: number;
    year?: number;
    target_value: string | number;
    status: string;
    planning_period?: { id: number; name: string };
}

interface Iku {
    id: number;
    name: string;
    code: string;
    level: string;
    iku_status: string;
    definition: string | null;
    formula_notes: string | null;
    polarization: string | null;
    baseline_year: number | null;
    baseline_value?: number | string | null;
    formatted_baseline?: string | null;
    baseline_note: string | null;
    data_source: string | null;
    frequency: string | null;
    planning_period?: { id: number; name: string; start_year: number; end_year: number };
    strategic_goal?: { id: number; name: string };
    strategic_objective?: { id: number; name: string };
    owner_organization?: { id: number; name: string; code: string };
    measurement_unit?: { id: number; name: string; symbol: string };
    responsible_officer?: { id: number; name: string };
    targets: IkuTarget[];
    iku_histories: IkuHistory[];
}

interface Props {
    iku: Iku;
    canEdit: boolean;
    canVerify?: boolean;
    isReviewer?: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
    create:     'Dibuat',
    update:     'Diperbarui',
    submit:     'Diajukan',
    review:     'Mulai Review',
    return:     'Dikembalikan',
    finalize:   'Difinalisasi',
    deactivate: 'Dinonaktifkan',
};

const POLARIZATION_LABELS: Record<string, string> = {
    positif: 'Positif (semakin tinggi semakin baik)',
    negatif: 'Negatif (semakin rendah semakin baik)',
    stabil:  'Stabil (nilai target tetap)',
};

const FREQUENCY_LABELS: Record<string, string> = {
    monthly:   'Bulanan',
    quarterly: 'Triwulanan',
    semester:  'Semesteran',
    annual:    'Tahunan',
};

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 py-2.5 border-b border-border/60 last:border-0">
            <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
            <dd className="sm:col-span-2 text-sm font-medium text-foreground">{value ?? <span className="text-muted-foreground italic">-</span>}</dd>
        </div>
    );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function IkuShow({ iku, canEdit, canVerify, isReviewer }: Props) {
    const canReview = Boolean(canVerify || isReviewer);
    const [tab, setTab] = useState<'ringkasan' | 'metadata' | 'target' | 'riwayat'>('ringkasan');

    const tabs = [
        { key: 'ringkasan', label: 'Ringkasan', icon: Info },
        { key: 'metadata',  label: 'Metadata & Formula', icon: FileText },
        { key: 'target',    label: 'Target Tahunan', icon: Target },
        { key: 'riwayat',  label: 'Riwayat Audit', icon: History },
    ] as const;

    function workflowAction(action: string, notes?: string) {
        const routeMap: Record<string, string> = {
            submit:     route('planning.iku.submit',     iku.id),
            review:     route('planning.iku.review',     iku.id),
            return:     route('planning.iku.return',     iku.id),
            finalize:   route('planning.iku.finalize',   iku.id),
            deactivate: route('planning.iku.deactivate', iku.id),
        };
        router.post(routeMap[action], notes ? { notes } : {}, { preserveScroll: true });
    }

    const period = iku.planning_period;

    return (
        <AuthenticatedLayout header={
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Link href={route('planning.iku.index')}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate max-w-xl">
                                {iku.name}
                            </h1>
                            <LevelBadge level={iku.level} />
                            <StatusBadge status={iku.iku_status} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Kode Indikator: <span className="font-mono font-medium text-foreground">{iku.code || '-'}</span> | Periode: {period ? (period.name ?? `${period.start_year}-${period.end_year}`) : '-'}
                        </p>
                    </div>
                </div>

                {/* Right Top Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                    <a href={route('planning.iku.export.pdf', iku.id)} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline" className="border-border text-foreground hover:bg-muted">
                            <FileText className="mr-1.5 h-4 w-4 text-primary" /> Cetak PDF
                        </Button>
                    </a>
                    {canEdit && (
                        <Link href={route('planning.iku.edit', iku.id)}>
                            <Button variant="outline" size="sm">
                                <Edit className="mr-1.5 h-4 w-4" /> Edit
                            </Button>
                        </Link>
                    )}
                    {canEdit && ['draft', 'perbaikan'].includes(iku.iku_status) && (
                        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm" onClick={() => workflowAction('submit')}>
                            <Send className="mr-1.5 h-4 w-4" /> Ajukan Review
                        </Button>
                    )}
                    {canReview && iku.iku_status === 'diajukan' && (
                        <Button size="sm" variant="outline" onClick={() => workflowAction('review')}>
                            <CheckCircle className="mr-1.5 h-4 w-4 text-amber-600" /> Mulai Review
                        </Button>
                    )}
                    {canReview && iku.iku_status === 'review' && (
                        <>
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm" onClick={() => workflowAction('finalize')}>
                                <CheckCircle className="mr-1.5 h-4 w-4" /> Finalisasi
                            </Button>
                            <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => {
                                const notes = prompt('Catatan perbaikan (wajib):');
                                if (notes) workflowAction('return', notes);
                            }}>
                                <XCircle className="mr-1.5 h-4 w-4" /> Kembalikan
                            </Button>
                        </>
                    )}
                    {canReview && iku.iku_status === 'final' && (
                        <Button size="sm" variant="outline" className="text-muted-foreground" onClick={() => workflowAction('deactivate')}>
                            <Archive className="mr-1.5 h-4 w-4" /> Nonaktifkan
                        </Button>
                    )}
                </div>
            </div>
        }>
            <Head title={`IKU - ${iku.name}`} />

            <div className="py-6 space-y-6">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
                    {/* Breadcrumbs */}
                    <PageBreadcrumb items={[
                        { label: 'Perencanaan', href: route('planning.iku.index') },
                        { label: 'Indikator Kinerja Utama', href: route('planning.iku.index') },
                        { label: iku.code || iku.name },
                    ]} />

                    {/* Navigation Tabs */}
                    <div className="border-b border-border flex gap-1 overflow-x-auto">
                        {tabs.map(t => {
                            const IconComponent = t.icon;
                            const isActive = tab === t.key;
                            return (
                                <button
                                    key={t.key}
                                    onClick={() => setTab(t.key)}
                                    className={`px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap
                                        ${isActive
                                            ? 'border-primary text-primary bg-primary/5'
                                            : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}
                                >
                                    <IconComponent className={`h-4 w-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                                    {t.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* ── Tab: Ringkasan (2 Kolom Modern Sesuai Referensi) ── */}
                    {tab === 'ringkasan' && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                            {/* Kolom Kiri: Informasi Utama (7 Kolom) */}
                            <div className="lg:col-span-7 space-y-6">
                                <Card className="border border-border/80 shadow-sm bg-card rounded-xl">
                                    <CardHeader className="border-b border-border/60 pb-4">
                                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                                            <Info className="h-4 w-4 text-primary" /> Informasi Utama Indikator
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-4">
                                        <dl>
                                            <InfoRow label="Nama Indikator" value={<span className="font-semibold text-foreground">{iku.name}</span>} />
                                            <InfoRow label="Periode"       value={period ? (period.name ?? `${period.start_year}-${period.end_year}`) : null} />
                                            <InfoRow label="Level"         value={<LevelBadge level={iku.level} />} />
                                            <InfoRow label="Perangkat Daerah" value={iku.owner_organization?.name ? `${iku.owner_organization.name} (${iku.owner_organization.code})` : '-'} />
                                            <InfoRow label="Tujuan Strategis"        value={iku.strategic_goal?.name} />
                                            <InfoRow label="Sasaran Strategis"       value={iku.strategic_objective?.name} />
                                            <InfoRow label="Satuan Ukur"        value={iku.measurement_unit ? `${iku.measurement_unit.name} (${iku.measurement_unit.symbol})` : null} />
                                            <InfoRow label="Polarisasi"    value={iku.polarization ? POLARIZATION_LABELS[iku.polarization] : null} />
                                            <InfoRow label="Definisi Operasional" value={iku.definition || '-'} />
                                            <InfoRow label="Formula Perhitungan"  value={iku.formula_notes || '-'} />
                                        </dl>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Kolom Kanan: Target Capaian Tahunan & Baseline (5 Kolom) */}
                            <div className="lg:col-span-5 space-y-6">
                                <Card className="border border-border/80 shadow-sm bg-card rounded-xl">
                                    <CardHeader className="border-b border-border/60 pb-4">
                                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                                            <Target className="h-4 w-4 text-primary" /> Target Capaian Tahunan
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-4">
                                        {iku.targets.length === 0 ? (
                                            <p className="text-center text-xs text-muted-foreground py-6">Belum ada target tahunan yang terdaftar.</p>
                                        ) : (
                                            <div className="rounded-lg border border-border overflow-hidden">
                                                <table className="w-full text-xs">
                                                    <thead className="bg-muted/50 border-b border-border">
                                                        <tr>
                                                            <th className="px-3 py-2 text-left font-semibold text-foreground uppercase tracking-wider">Tahun</th>
                                                            <th className="px-3 py-2 text-right font-semibold text-foreground uppercase tracking-wider">Target</th>
                                                            <th className="px-3 py-2 text-center font-semibold text-foreground uppercase tracking-wider">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-border">
                                                        {iku.targets.map(t => (
                                                            <tr key={t.id} className="hover:bg-muted/20">
                                                                <td className="px-3 py-2.5 font-semibold text-foreground">{t.planning_period?.name ?? t.year ?? '-'}</td>
                                                                <td className="px-3 py-2.5 text-right font-bold text-primary">
                                                                    {t.target_value} {iku.measurement_unit?.symbol}
                                                                </td>
                                                                <td className="px-3 py-2.5 text-center">
                                                                    <StatusBadge status={t.status || 'draft'} />
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card className="border border-border/80 shadow-sm bg-card rounded-xl">
                                    <CardHeader className="border-b border-border/60 pb-4">
                                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                                            <Award className="h-4 w-4 text-primary" /> Baseline & Tata Kelola
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-4">
                                        <dl>
                                            <InfoRow label="Tahun Baseline" value={iku.baseline_year ? String(iku.baseline_year) : '-'} />
                                            <InfoRow label="Nilai Baseline" value={iku.baseline_value !== null && iku.baseline_value !== undefined ? `${Number(iku.baseline_value).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${iku.measurement_unit?.symbol ?? ''}` : '-'} />
                                            <InfoRow label="Sumber Data" value={iku.data_source || '-'} />
                                            <InfoRow label="Frekuensi" value={iku.frequency ? FREQUENCY_LABELS[iku.frequency] : '-'} />
                                            <InfoRow label="Penanggung Jawab" value={iku.responsible_officer?.name || '-'} />
                                        </dl>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}

                    {/* ── Tab: Metadata ── */}
                    {tab === 'metadata' && (
                        <Card className="border border-border/80 shadow-sm bg-card rounded-xl">
                            <CardHeader className="border-b border-border/60 pb-4">
                                <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-primary" /> Rincian Teknis & Formula Pengukuran
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <dl>
                                    <InfoRow label="Definisi Operasional" value={iku.definition || '-'} />
                                    <InfoRow label="Formula / Rumus"      value={iku.formula_notes || '-'} />
                                    <InfoRow label="Polarisasi"           value={iku.polarization ? POLARIZATION_LABELS[iku.polarization] : '-'} />
                                    <InfoRow label="Sumber Data"          value={iku.data_source || '-'} />
                                    <InfoRow label="Frekuensi Pengukuran" value={iku.frequency ? FREQUENCY_LABELS[iku.frequency] : '-'} />
                                    <InfoRow label="Unit Penanggung Jawab" value={iku.responsible_officer?.name || '-'} />
                                    <InfoRow label="Keterangan Baseline"  value={iku.baseline_note || '-'} />
                                </dl>
                            </CardContent>
                        </Card>
                    )}

                    {/* ── Tab: Target ── */}
                    {tab === 'target' && (
                        <Card className="border border-border/80 shadow-sm bg-card rounded-xl">
                            <CardHeader className="border-b border-border/60 pb-4">
                                <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                                    <Target className="h-4 w-4 text-primary" /> Rincian Target Kinerja Seluruh Tahun
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                                {iku.targets.length === 0 ? (
                                    <p className="text-center text-xs text-muted-foreground py-8">Belum ada target yang diinput untuk periode ini.</p>
                                ) : (
                                    <div className="rounded-lg border border-border overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-muted/50 border-b border-border">
                                                <tr>
                                                    <th className="px-4 py-3 text-left font-semibold text-foreground text-xs uppercase tracking-wider">Tahun / Periode</th>
                                                    <th className="px-4 py-3 text-left font-semibold text-foreground text-xs uppercase tracking-wider">Nilai Target</th>
                                                    <th className="px-4 py-3 text-left font-semibold text-foreground text-xs uppercase tracking-wider">Satuan</th>
                                                    <th className="px-4 py-3 text-center font-semibold text-foreground text-xs uppercase tracking-wider">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {iku.targets.map(t => (
                                                    <tr key={t.id} className="hover:bg-muted/20">
                                                        <td className="px-4 py-3 font-semibold text-foreground">{t.planning_period?.name ?? t.year ?? '-'}</td>
                                                        <td className="px-4 py-3 font-bold text-primary">{t.target_value}</td>
                                                        <td className="px-4 py-3 text-muted-foreground">{iku.measurement_unit?.symbol ?? '-'}</td>
                                                        <td className="px-4 py-3 text-center">
                                                            <StatusBadge status={t.status || 'draft'} />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* ── Tab: Riwayat ── */}
                    {tab === 'riwayat' && (
                        <Card className="border border-border/80 shadow-sm bg-card rounded-xl">
                            <CardHeader className="border-b border-border/60 pb-4">
                                <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                                    <History className="h-4 w-4 text-primary" /> Riwayat Audit & Siklus Hidup Dokumen
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                {iku.iku_histories.length === 0 ? (
                                    <p className="text-center text-xs text-muted-foreground py-8">Belum ada catatan riwayat perubahan pada indikator ini.</p>
                                ) : (
                                    <div className="relative pl-2">
                                        <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-border" />
                                        <div className="space-y-6">
                                            {iku.iku_histories.map(h => (
                                                <div key={h.id} className="relative pl-9 group">
                                                    <div className="absolute left-2.5 top-1.5 h-4 w-4 rounded-full border-2 border-background bg-primary ring-4 ring-primary/20 shadow-xs" />
                                                    <div className="rounded-xl border border-border bg-card p-4 shadow-2xs hover:shadow-xs transition-shadow">
                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                                            <span className="font-semibold text-sm text-foreground flex items-center gap-2">
                                                                {ACTION_LABELS[h.action] ?? h.action}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground font-mono">{formatDateTime(h.created_at)}</span>
                                                        </div>
                                                        {h.user && (
                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                Dilakukan oleh: <span className="font-medium text-foreground">{h.user.name}</span>
                                                            </p>
                                                        )}
                                                        {h.notes && (
                                                            <p className="mt-2 text-xs text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 rounded-lg p-2.5 border border-amber-200 dark:border-amber-800/50">
                                                                <span className="font-semibold">Catatan:</span> {h.notes}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                </div>
            </div>
        </AuthenticatedLayout>
    );
}
