import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Download, ChevronRight } from 'lucide-react';

import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { SelectNative } from '@/Components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Badge } from '@/Components/ui/badge';
import { PageProps } from '@/types';
import { cn } from '@/lib/utils';

interface DetailRow {
    id: number;
    indicator_code: string;
    indicator_name: string;
    unit: string;
    period: string;
    target_value: number | null;
    actual_value: number | null;
    achievement_pct: number | null;
    status: string;
    evidence_count: number;
    traffic_light: 'green' | 'yellow' | 'red' | 'gray';
}

interface Organization { id: number; code: string; name: string; }
interface Period { id: number; code: string; name: string; }

interface Summary {
    total: number;
    green: number;
    yellow: number;
    red: number;
    gray: number;
    avg_pct: number | null;
}

interface Props extends PageProps {
    organization: Organization;
    period: Period | null;
    periods: Period[];
    details: DetailRow[];
    summary: Summary;
}

const TL_STYLE = {
    green:  'bg-emerald-500',
    yellow: 'bg-amber-400',
    red:    'bg-rose-500',
    gray:   'bg-slate-300',
};

const TL_TEXT = {
    green:  'Tercapai',
    yellow: 'Perlu Perhatian',
    red:    'Kritis',
    gray:   'Tidak Dinilai',
};

function TrafficLight({ color }: { color: keyof typeof TL_STYLE }) {
    return (
        <span className={cn('inline-block h-3 w-3 rounded-full', TL_STYLE[color])} title={TL_TEXT[color]} />
    );
}

export default function DashboardDrilldown({ organization, period, periods, details, summary, auth }: Props) {
    return (
        <AuthenticatedLayout header="Detail OPD">
            <Head title={`Detail - ${organization.name}`} />

            <div className="space-y-4">
                {/* Breadcrumb */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
                            <Link href={route('dashboard')} className="hover:underline flex items-center gap-1">
                                <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
                            </Link>
                            <ChevronRight className="h-3.5 w-3.5" />
                            <span>{organization.code}</span>
                        </div>
                        <h1 className="text-xl font-semibold">{organization.name}</h1>
                        <p className="text-sm text-muted-foreground">
                            {period ? `Periode: ${period.name}` : 'Semua periode'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <SelectNative
                            value={period?.id.toString() ?? ''}
                            onChange={(e) => router.get(route('dashboard.drilldown', organization.id), { period_id: e.target.value || undefined })}
                            className="w-44"
                        >
                            <option value="">Semua Periode</option>
                            {periods.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </SelectNative>
                        <a
                            href={route('dashboard.export') + `?format=pdf&type=drilldown&period_id=${period?.id ?? ''}&organization_id=${organization.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                        >
                            <Download className="h-4 w-4" /> Download PDF
                        </a>
                    </div>
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    {[
                        { label: 'Total Indikator', value: summary.total, cls: '' },
                        { label: '🟢 Tercapai', value: summary.green, cls: 'text-emerald-700' },
                        { label: '🟡 Perlu Perhatian', value: summary.yellow, cls: 'text-amber-700' },
                        { label: '🔴 Kritis', value: summary.red, cls: 'text-rose-700' },
                        { label: 'Rata-rata Capaian', value: summary.avg_pct !== null ? `${summary.avg_pct.toFixed(1)}%` : '-', cls: '' },
                    ].map((card) => (
                        <Card key={card.label}>
                            <CardContent className="pt-4 text-center">
                                <p className={cn('text-2xl font-bold', card.cls)}>{card.value}</p>
                                <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Detail table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Detail Pencapaian per Indikator</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10">No</TableHead>
                                    <TableHead>Indikator</TableHead>
                                    <TableHead className="text-right">Benchmark</TableHead>
                                    <TableHead className="text-right">Realisasi</TableHead>
                                    <TableHead className="text-right">Capaian</TableHead>
                                    <TableHead className="text-center">Lampu</TableHead>
                                    <TableHead className="text-center">Evidence</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {details.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                                            Belum ada data realisasi untuk periode ini.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {details.map((row, index) => (
                                    <TableRow key={row.id}>
                                        <TableCell className="text-sm text-gray-500 tabular-nums">
                                            {index + 1}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-mono text-xs text-muted-foreground">{row.indicator_code}</div>
                                            <div className="font-medium text-sm">{row.indicator_name}</div>
                                        </TableCell>
                                        <TableCell className="text-right text-sm">
                                            {row.target_value !== null ? `${row.target_value} ${row.unit}` : '-'}
                                        </TableCell>
                                        <TableCell className="text-right text-sm">
                                            {row.actual_value !== null ? `${row.actual_value} ${row.unit}` : '-'}
                                        </TableCell>
                                        <TableCell className="text-right font-semibold">
                                            {row.achievement_pct !== null ? `${row.achievement_pct.toFixed(1)}%` : '-'}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <TrafficLight color={row.traffic_light} />
                                        </TableCell>
                                        <TableCell className="text-center text-sm">
                                            {row.evidence_count > 0
                                                ? <Badge variant="outline" className="text-xs">{row.evidence_count} file</Badge>
                                                : <span className="text-muted-foreground text-xs">-</span>
                                            }
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={row.status === 'approved' ? 'default' : 'outline'} className="text-xs capitalize">
                                                {row.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        {/* Status Kinerja Legend di bawah tabel */}
                        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-700 flex flex-wrap items-center gap-x-4 gap-y-1">
                            <span className="font-bold text-slate-900 flex items-center gap-1">
                                <span>💡</span> Kriteria Status Kinerja:
                            </span>
                            <span className="inline-flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                <strong>Tercapai:</strong> Capaian &ge; 100%
                            </span>
                            <span className="text-slate-300">|</span>
                            <span className="inline-flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                <strong>Perlu Perhatian:</strong> 50% &le; Capaian &lt; 100%
                            </span>
                            <span className="text-slate-300">|</span>
                            <span className="inline-flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                <strong>Kritis:</strong> Capaian &lt; 50% / Nilai Minus
                            </span>
                            <span className="text-slate-300">|</span>
                            <span className="inline-flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                                <strong>Tidak Dinilai:</strong> Target = 0 &amp; Realisasi = 0
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
