import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/Components/ui/button';
import { Card, CardContent } from '@/Components/ui/card';
import { Edit, Send, CheckCircle, XCircle, Archive, FileText, ArrowLeft } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

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
    isBappeda: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
    draft:     'bg-gray-100 text-gray-700',
    diajukan:  'bg-blue-100 text-blue-700',
    review:    'bg-yellow-100 text-yellow-800',
    perbaikan: 'bg-orange-100 text-orange-700',
    final:     'bg-green-100 text-green-700',
    nonaktif:  'bg-red-100 text-red-600',
};

const ACTION_LABELS: Record<string, string> = {
    create:     '✨ Dibuat',
    update:     '✏️ Diperbarui',
    submit:     '📤 Diajukan',
    review:     '🔍 Mulai Review',
    return:     '↩️ Dikembalikan',
    finalize:   '✅ Difinalisasi',
    deactivate: '🔒 Dinonaktifkan',
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

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
    return (
        <div className="grid grid-cols-5 gap-2 py-2 border-b last:border-0">
            <dt className="col-span-2 text-sm font-medium text-gray-600">{label}</dt>
            <dd className="col-span-3 text-sm text-gray-900">{value ?? <span className="text-gray-400 italic">—</span>}</dd>
        </div>
    );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function IkuShow({ iku, canEdit, isBappeda }: Props) {
    const [tab, setTab] = useState<'ringkasan' | 'metadata' | 'target' | 'riwayat'>('ringkasan');

    const tabs = [
        { key: 'ringkasan', label: 'Ringkasan' },
        { key: 'metadata',  label: 'Metadata' },
        { key: 'target',    label: 'Target' },
        { key: 'riwayat',  label: 'Riwayat' },
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
            <div className="flex items-center gap-3">
                <Link href={route('planning.iku.index')}>
                    <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
                </Link>
                <h2 className="text-xl font-semibold text-gray-800 truncate max-w-xl">{iku.name}</h2>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[iku.iku_status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {iku.iku_status.charAt(0).toUpperCase() + iku.iku_status.slice(1)}
                </span>
            </div>
        }>
            <Head title={`IKU — ${iku.name}`} />

            <div className="py-6">
                <div className="mx-auto max-w-5xl space-y-4 px-4 sm:px-6 lg:px-8">

                    {/* ── Action Buttons ── */}
                    <div className="flex flex-wrap gap-2">
                        {canEdit && (
                            <Link href={route('planning.iku.edit', iku.id)}>
                                <Button variant="outline" size="sm"><Edit className="mr-2 h-4 w-4" /> Edit</Button>
                            </Link>
                        )}
                        {canEdit && ['draft', 'perbaikan'].includes(iku.iku_status) && (
                            <Button size="sm" onClick={() => workflowAction('submit')}>
                                <Send className="mr-2 h-4 w-4" /> Ajukan Review
                            </Button>
                        )}
                        {isBappeda && iku.iku_status === 'diajukan' && (
                            <Button size="sm" variant="outline" onClick={() => workflowAction('review')}>
                                <CheckCircle className="mr-2 h-4 w-4" /> Mulai Review
                            </Button>
                        )}
                        {isBappeda && iku.iku_status === 'review' && (<>
                            <Button size="sm" onClick={() => workflowAction('finalize')}>
                                <CheckCircle className="mr-2 h-4 w-4" /> Finalisasi
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => {
                                const notes = prompt('Catatan perbaikan (wajib):');
                                if (notes) workflowAction('return', notes);
                            }}>
                                <XCircle className="mr-2 h-4 w-4" /> Kembalikan
                            </Button>
                        </>)}
                        {isBappeda && iku.iku_status === 'final' && (
                            <Button size="sm" variant="outline" onClick={() => workflowAction('deactivate')}>
                                <Archive className="mr-2 h-4 w-4" /> Nonaktifkan
                            </Button>
                        )}
                        <a href={route('planning.iku.export.pdf', iku.id)} target="_blank">
                            <Button size="sm" variant="outline"><FileText className="mr-2 h-4 w-4" /> Download PDF</Button>
                        </a>
                    </div>

                    {/* ── Tabs ── */}
                    <div className="border-b flex gap-0">
                        {tabs.map(t => (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors
                                    ${tab === t.key
                                        ? 'border-blue-600 text-blue-700'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* ── Tab: Ringkasan ── */}
                    {tab === 'ringkasan' && (
                        <Card>
                            <CardContent className="pt-5">
                                <dl>
                                    <InfoRow label="Periode"       value={period ? (period.name ?? `${period.start_year}–${period.end_year}`) : null} />
                                    <InfoRow label="Level"         value={iku.level === 'pemda' ? 'Pemerintah Daerah' : 'Perangkat Daerah'} />
                                    <InfoRow label="Perangkat Daerah" value={iku.owner_organization?.name} />
                                    <InfoRow label="Tujuan"        value={iku.strategic_goal?.name} />
                                    <InfoRow label="Sasaran"       value={iku.strategic_objective?.name} />
                                    <InfoRow label="Nama Indikator" value={iku.name} />
                                    <InfoRow label="Satuan"        value={iku.measurement_unit ? `${iku.measurement_unit.name} (${iku.measurement_unit.symbol})` : null} />
                                    <InfoRow label="Baseline (Dokumen)" value={iku.formatted_baseline ?? (iku.baseline_value ? `${Number(iku.baseline_value).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${iku.baseline_year})` : iku.baseline_year)} />
                                    <InfoRow label="Nilai Baseline" value={iku.baseline_value !== null && iku.baseline_value !== undefined ? Number(iku.baseline_value).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'} />
                                    <InfoRow label="Tahun Baseline" value={iku.baseline_year} />
                                    <InfoRow label="Polarisasi"    value={iku.polarization ? POLARIZATION_LABELS[iku.polarization] : null} />
                                    <InfoRow label="Status"        value={iku.iku_status.charAt(0).toUpperCase() + iku.iku_status.slice(1)} />
                                </dl>
                            </CardContent>
                        </Card>
                    )}

                    {/* ── Tab: Metadata ── */}
                    {tab === 'metadata' && (
                        <Card>
                            <CardContent className="pt-5">
                                <dl>
                                    <InfoRow label="Definisi Operasional" value={iku.definition} />
                                    <InfoRow label="Formula / Rumus"      value={iku.formula_notes} />
                                    <InfoRow label="Polarisasi"           value={iku.polarization ? POLARIZATION_LABELS[iku.polarization] : null} />
                                    <InfoRow label="Sumber Data"          value={iku.data_source} />
                                    <InfoRow label="Frekuensi Pengukuran" value={iku.frequency ? FREQUENCY_LABELS[iku.frequency] : null} />
                                    <InfoRow label="Unit Penanggung Jawab" value={iku.responsible_officer?.name} />
                                    <InfoRow label="Keterangan Baseline"  value={iku.baseline_note} />
                                </dl>
                            </CardContent>
                        </Card>
                    )}

                    {/* ── Tab: Target ── */}
                    {tab === 'target' && (
                        <Card>
                            <CardContent className="pt-5">
                                {iku.targets.length === 0 ? (
                                    <p className="text-center text-gray-400 py-8">Belum ada target yang diinput.</p>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left py-2 font-medium text-gray-700">Tahun</th>
                                                <th className="text-left py-2 font-medium text-gray-700">Target</th>
                                                <th className="text-left py-2 font-medium text-gray-700">Satuan</th>
                                                <th className="text-left py-2 font-medium text-gray-700">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {iku.targets.map(t => (
                                                <tr key={t.id}>
                                                    <td className="py-2">{t.planning_period?.name ?? t.year ?? '-'}</td>
                                                    <td className="py-2 font-medium">{t.target_value}</td>
                                                    <td className="py-2 text-gray-500">{iku.measurement_unit?.symbol ?? '-'}</td>
                                                    <td className="py-2">
                                                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[t.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                                            {t.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* ── Tab: Riwayat ── */}
                    {tab === 'riwayat' && (
                        <Card>
                            <CardContent className="pt-5">
                                {iku.iku_histories.length === 0 ? (
                                    <p className="text-center text-gray-400 py-8">Belum ada riwayat perubahan.</p>
                                ) : (
                                    <div className="relative">
                                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                                        <div className="space-y-4">
                                            {iku.iku_histories.map(h => (
                                                <div key={h.id} className="relative pl-10">
                                                    <div className="absolute left-2 top-1.5 h-4 w-4 rounded-full border-2 border-white bg-blue-500 ring-2 ring-blue-100" />
                                                    <div className="rounded-lg border bg-gray-50 p-3">
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-medium text-sm">
                                                                {ACTION_LABELS[h.action] ?? h.action}
                                                            </span>
                                                            <span className="text-xs text-gray-400">{formatDateTime(h.created_at)}</span>
                                                        </div>
                                                        {h.user && (
                                                            <p className="text-xs text-gray-500 mt-0.5">oleh {h.user.name}</p>
                                                        )}
                                                        {h.notes && (
                                                            <p className="mt-1.5 text-sm text-orange-700 bg-orange-50 rounded px-2 py-1 border border-orange-200">
                                                                📝 {h.notes}
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
