import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Label } from '@/Components/ui/label';
import { Separator } from '@/Components/ui/separator';
import {
 Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/Components/ui/table';
import { SelectNative } from '@/Components/ui/select-native';
import {Head, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import TablePagination from '@/Components/TablePagination';
import PageHeader from '@/Components/Dashboard/PageHeader';
import { AlertTriangle, CheckCircle2, Info, TrendingUp } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Indicator { id: number; code: string; name: string; is_iku: boolean; }
interface Organization { id: number; code: string; name: string; }

interface Point { x: number; y: number; period_code: string; period_name: string; }

interface Prediction {
 indicator: Indicator;
 organization: { id: number; code: string; name: string } | null;
 periods_ahead: number;
 min_points: number;
 feasible: boolean;
 reason: string | null;
 points: Point[];
 n: number;
 slope: number | null;
 intercept: number | null;
 r2: number | null;
 forecast: number | null;
 projected_achievement: number | null;
 status: string;
 target: number | null;
}

interface Props extends PageProps {
 indicators: Indicator[];
 organizations: Organization[];
 predictions: Prediction[];
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
 const cfg: Record<string, { text: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' }> = {
 good: { text: 'Baik', variant: 'success' },
 warning: { text: 'Waspada', variant: 'warning' },
 critical:{ text: 'Kritis', variant: 'destructive' },
 no_data: { text: 'Tidak Ada Data',variant: 'secondary' },
 };
 const c = cfg[status] ?? { text: status, variant: 'secondary' as const };
 return <Badge variant={c.variant}>{c.text}</Badge>;
}

// ─── SVG Prediction Chart ─────────────────────────────────────────────────────

function PredictionChart({ result }: { result: Prediction }) {
 if (!result.feasible || result.points.length < 2) return null;

 const W = 560; const H = 200;
 const PAD = { t: 16, r: 24, b: 40, l: 48 };
 const iW = W - PAD.l - PAD.r;
 const iH = H - PAD.t - PAD.b;

 const allY = result.points.map((p) => p.y);
 if (result.forecast != null) allY.push(result.forecast);
 const minY = Math.max(0, Math.min(...allY) - 10);
 const maxY = Math.min(120, Math.max(...allY) + 10);
 const rangeY = maxY - minY || 1;

 // Historical points: x is the sequential index
 const n = result.points.length;
 const totalPts = n + result.periods_ahead;
 const xStep = iW / (totalPts - 1);
 const toX = (i: number) => PAD.l + i * xStep;
 const toY = (v: number) => PAD.t + iH - ((v - minY) / rangeY) * iH;

 // Regression line - extend across full chart
 const slope = result.slope ?? 0;
 const intercept = result.intercept ?? 0;
 const regY = (x: number) => intercept + slope * (x + 1); // x+1 since BRD uses 1-based index
 const regPath = `M${toX(0).toFixed(1)},${toY(regY(0)).toFixed(1)} L${toX(totalPts - 1).toFixed(1)},${toY(regY(totalPts - 1)).toFixed(1)}`;

 // Confidence band (±1 stderr approx from R²)
 const r2 = result.r2 ?? 0;
 const stderr = Math.sqrt(1 - r2) * (rangeY * 0.15);
 const confTop = `M${toX(n - 1).toFixed(1)},${toY(regY(n - 1) + stderr).toFixed(1)} L${toX(totalPts - 1).toFixed(1)},${toY(regY(totalPts - 1) + stderr).toFixed(1)}`;
 const confBot = `M${toX(n - 1).toFixed(1)},${toY(regY(n - 1) - stderr).toFixed(1)} L${toX(totalPts - 1).toFixed(1)},${toY(regY(totalPts - 1) - stderr).toFixed(1)}`;
 const confArea = `M${toX(n - 1).toFixed(1)},${toY(regY(n - 1) + stderr).toFixed(1)} L${toX(totalPts - 1).toFixed(1)},${toY(regY(totalPts - 1) + stderr).toFixed(1)} L${toX(totalPts - 1).toFixed(1)},${toY(regY(totalPts - 1) - stderr).toFixed(1)} L${toX(n - 1).toFixed(1)},${toY(regY(n - 1) - stderr).toFixed(1)} Z`;

 // Historical path
 const histPath = result.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(p.y).toFixed(1)}`).join(' ');

 // Y ticks
 const yTicks = [0, 25, 50, 75, 100].filter((v) => v >= minY - 5 && v <= maxY + 5);

 return (
 <div className="mt-4">
 <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-label="Grafik prediksi">
 <defs>
 <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
 <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.05" />
 </linearGradient>
 </defs>

 {/* Grid lines */}
 {yTicks.map((v) => (
 <g key={v}>
 <line x1={PAD.l} x2={PAD.l + iW} y1={toY(v)} y2={toY(v)} stroke="#f1f5f9" strokeWidth="1" />
 <text x={PAD.l - 6} y={toY(v) + 4} textAnchor="end" fontSize="9" fill="#94a3b8">{v}%</text>
 </g>
 ))}

 {/* Separator line: historical | projected */}
 <line x1={toX(n - 1)} x2={toX(n - 1)} y1={PAD.t} y2={PAD.t + iH}
 stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4,3" />
 <text x={toX(n - 1) + 3} y={PAD.t + 10} fontSize="8" fill="#94a3b8">Proyeksi →</text>

 {/* Confidence band (projected region) */}
 <path d={confArea} fill="url(#confGrad)" />
 <path d={confTop} fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3,3" opacity="0.7" />
 <path d={confBot} fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3,3" opacity="0.7" />

 {/* Regression line */}
 <path d={regPath} fill="none" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="5,3" opacity="0.5" />

 {/* Historical path */}
 <path d={histPath} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

 {/* Historical points */}
 {result.points.map((p, i) => (
 <g key={i}>
 <circle cx={toX(i)} cy={toY(p.y)} r="4" fill="#6366f1" stroke="white" strokeWidth="1.5" />
 <title>{p.period_name}: {p.y.toLocaleString('id-ID')}%</title>
 </g>
 ))}

 {/* Forecast point */}
 {result.forecast != null && (
 <g>
 <circle cx={toX(totalPts - 1)} cy={toY(result.forecast)} r="5"
 fill="#f59e0b" stroke="white" strokeWidth="2" />
 <text x={toX(totalPts - 1)} y={toY(result.forecast) - 8}
 textAnchor="middle" fontSize="9" fill="#92400e" fontWeight="600">
 {result.forecast.toLocaleString('id-ID')}
 </text>
 <title>Proyeksi: {result.forecast.toLocaleString('id-ID')}</title>
 </g>
 )}

 {/* X-axis labels */}
 {result.points.map((p, i) => (
 <text key={i} x={toX(i)} y={H - 6} textAnchor="middle" fontSize="8" fill="#94a3b8">
 {p.period_code.length > 6 ? p.period_code.slice(0, 6) : p.period_code}
 </text>
 ))}
 {result.forecast != null && (
 <text x={toX(totalPts - 1)} y={H - 6} textAnchor="middle" fontSize="8" fill="#f59e0b" fontWeight="600">
 P+{result.periods_ahead}
 </text>
 )}
 </svg>
 <p className="mt-1 text-center text-xs text-gray-400">
 - Historis &nbsp;·&nbsp; <span className="text-amber-500">�-� Proyeksi</span> &nbsp;·&nbsp; <span className="text-amber-300">░ Confidence band</span>
 </p>
 </div>
 );
}

// ─── R² Interpretation ────────────────────────────────────────────────────────

function R2Interpretation({ r2, slope }: { r2: number | null; slope: number | null }) {
 if (r2 === null) return null;

 const quality = r2 >= 0.85 ? { text: 'Sangat Baik', color: 'text-green-600' }
 : r2 >= 0.65 ? { text: 'Baik', color: 'text-blue-600' }
 : r2 >= 0.40 ? { text: 'Cukup', color: 'text-amber-600' }
 : { text: 'Lemah - gunakan dengan hati-hati', color: 'text-red-600' };

 const trend = slope === null ? null
 : slope > 0.5 ? 'Tren naik signifikan'
 : slope > 0 ? 'Tren naik moderat'
 : slope < -0.5? 'Tren turun signifikan'
 : 'Tren turun moderat';

 return (
 <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50/50 p-3 text-xs dark:border-gray-800 dark:bg-gray-900/30">
 <div className="flex flex-wrap gap-4">
 <div>
 <span className="text-gray-400">R² (goodness of fit): </span>
 <span className={`font-semibold ${quality.color}`}>{r2.toFixed(3)} - {quality.text}</span>
 </div>
 {slope !== null && (
 <div>
 <span className="text-gray-400">Kemiringan (slope): </span>
 <span className="font-semibold">{slope.toFixed(4)}</span>
 {trend && <span className="ml-1 text-gray-500">({trend})</span>}
 </div>
 )}
 </div>
 {r2 < 0.40 && (
 <div className="mt-2 flex items-start gap-1.5 text-amber-700 dark:text-amber-400">
 <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
 <span>Model linier lemah untuk data ini. Prediksi bersifat indikatif saja.</span>
 </div>
 )}
 </div>
 );
}

// ─── Mini Progress Bar (summary table) ───────────────────────────────────────

function MiniBar({ value, max = 120 }: { value: number | null; max?: number }) {
 if (value === null) return <span className="text-xs text-gray-300">-</span>;
 const pct = Math.min(Math.max(value, 0), max) / max * 100;
 const color = value >= 80 ? 'bg-green-500' : value >= 60 ? 'bg-amber-400' : 'bg-red-400';
 return (
 <div className="flex items-center gap-1.5">
 <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
 <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
 </div>
 <span className="text-xs tabular-nums">{value.toLocaleString('id-ID', { maximumFractionDigits: 1 })}%</span>
 </div>
 );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PredictionsIndex({ auth, indicators, organizations, predictions }: Props) {
 const page = usePage().props as { flash?: { prediction?: Prediction | null } };
 const result = page.flash?.prediction;

 const [currentPage, setCurrentPage] = useState(1);
 const [perPage, setPerPage] = useState(25);

 const total = predictions.length;
 const lastPage = Math.max(1, Math.ceil(total / perPage));
 const safeCurrentPage = Math.min(currentPage, lastPage);
 const from = total > 0 ? (safeCurrentPage - 1) * perPage + 1 : 0;
 const to = total > 0 ? Math.min(safeCurrentPage * perPage, total) : 0;
 const paginatedPredictions = predictions.slice((safeCurrentPage - 1) * perPage, safeCurrentPage * perPage);

 const form = useForm({
 indicator_id: '',
 organization_id: '',
 periods_ahead: '1',
 });

 const submit: FormEventHandler = (e) => {
 e.preventDefault();
 form.post(route('predictions.generate'), {
 preserveScroll: true,
 onSuccess: () => form.reset('indicator_id', 'organization_id'),
 });
 };

 return (
 <AuthenticatedLayout>
            <Head title="Prediksi Kinerja AI" />

            <div className="space-y-6 p-6">
                <PageHeader
                    title="Prediksi Kinerja AI"
                    description="Proyeksi capaian indikator periode berikutnya berbasis regresi linier data realisasi tervalidasi."
                    breadcrumbs={[
                        { label: 'Kecerdasan Buatan' },
                        { label: 'Prediksi Kinerja' },
                    ]}
                />

                <div className="mx-auto max-w-5xl space-y-6">

 {/* Info card */}
 <Card className="border-blue-100 bg-blue-50/50 dark:border-blue-900/40 dark:bg-blue-950/20">
 <CardContent className="flex items-start gap-3 pt-4 pb-3 text-xs text-blue-700 dark:text-blue-300">
 <Info className="mt-0.5 h-4 w-4 shrink-0" />
 <span>
 Prediksi menggunakan <strong>regresi linier</strong> atas data realisasi tervalidasi (approved).
 Minimal <strong>4 titik data</strong> diperlukan. R² mengukur kesesuaian model - semakin mendekati 1, semakin akurat.
 </span>
 </CardContent>
 </Card>

 {/* Form generate */}
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-sm">
 <TrendingUp className="h-4 w-4 text-indigo-500" />
 Generate Prediksi
 </CardTitle>
 <CardDescription>Proyeksi nilai periode berikutnya + capaian proyeksi vs target.</CardDescription>
 </CardHeader>
 <CardContent>
 <form autoComplete="off" noValidate onSubmit={submit} className="flex flex-wrap items-end gap-3">
 <div>
 <Label className="text-xs">Indikator <span className="text-red-500">*</span></Label>
 <SelectNative value={form.data.indicator_id}
 onChange={(e) => form.setData('indicator_id', e.target.value)}
 className="mt-0.5 w-56">
 <option value="">Pilih Indikator</option>
 {indicators.map((ind) => (
 <option key={ind.id} value={ind.id}>
 {ind.code}{ind.is_iku ? ' ⭐' : ''} - {ind.name}
 </option>
 ))}
 </SelectNative>
 </div>
 <div>
 <Label className="text-xs">Organisasi</Label>
 <SelectNative value={form.data.organization_id}
 onChange={(e) => form.setData('organization_id', e.target.value)}
 className="mt-0.5 w-52">
 <option value="">Otomatis (data terbaru)</option>
 {organizations.map((org) => (
 <option key={org.id} value={org.id}>{org.code} - {org.name}</option>
 ))}
 </SelectNative>
 </div>
 <div>
 <Label className="text-xs">Periode ke Depan</Label>
 <SelectNative value={form.data.periods_ahead}
 onChange={(e) => form.setData('periods_ahead', e.target.value)}
 className="mt-0.5 w-28">
 {[1, 2, 3, 4].map((p) => (
 <option key={p} value={p}>{p} periode</option>
 ))}
 </SelectNative>
 </div>
 <Button type="submit" disabled={form.processing || !form.data.indicator_id} className="gap-1.5">
 <TrendingUp className="h-3.5 w-3.5" /> Generate
 </Button>
 </form>
 </CardContent>
 </Card>

 {/* Result */}
 {result && (
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-sm">
 Hasil Prediksi
 <Badge variant="info">{result.indicator.code}</Badge>
 {result.organization && <Badge variant="secondary">{result.organization.code}</Badge>}
 <StatusBadge status={result.status} />
 </CardTitle>
 </CardHeader>
 <CardContent>
 {!result.feasible ? (
 <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
 <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
 <span>{result.reason}</span>
 </div>
 ) : (
 <>
 {/* Metric summary */}
 <div className="grid gap-3 sm:grid-cols-5">
 {[
 { label: 'Proyeksi Nilai', value: result.forecast?.toLocaleString('id-ID') ?? '-', highlight: true },
 { label: 'Target', value: result.target?.toLocaleString('id-ID') ?? '-', highlight: false },
 { label: 'Capaian Proyeksi', value: result.projected_achievement != null ? `${result.projected_achievement}%` : '-', highlight: false },
 { label: 'R²', value: result.r2?.toFixed(3) ?? '-', highlight: false },
 { label: 'Data Points', value: `${result.n} titik`, highlight: false },
 ].map((m) => (
 <div key={m.label} className={`rounded-lg p-3 ${m.highlight ? 'bg-indigo-50 dark:bg-indigo-950/30' : 'bg-gray-50 dark:bg-gray-900/30'}`}>
 <div className="text-xs text-gray-400">{m.label}</div>
 <div className={`mt-1 text-lg font-bold ${m.highlight ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-900 dark:text-gray-100'}`}>{m.value}</div>
 </div>
 ))}
 </div>

 <R2Interpretation r2={result.r2} slope={result.slope} />
 <PredictionChart result={result} />
 </>
 )}
 </CardContent>
 </Card>
 )}

 <Separator />

 {/* Summary table */}
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-sm">
 <CheckCircle2 className="h-4 w-4 text-green-500" />
 Ringkasan Prediksi - Semua Indikator Aktif
 <Badge variant="secondary">{predictions.length}</Badge>
 </CardTitle>
 <CardDescription>1 periode ke depan · data realisasi approved terbaru per OPD</CardDescription>
 </CardHeader>
 <CardContent className="overflow-x-auto">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead className="text-xs uppercase tracking-wider">Indikator</TableHead>
 <TableHead className="text-xs uppercase tracking-wider">OPD</TableHead>
 <TableHead className="text-xs uppercase tracking-wider">Data</TableHead>
 <TableHead className="text-xs uppercase tracking-wider">R²</TableHead>
 <TableHead className="text-xs uppercase tracking-wider">Proyeksi</TableHead>
 <TableHead className="text-xs uppercase tracking-wider">Capaian</TableHead>
 <TableHead className="text-xs uppercase tracking-wider">Status</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {paginatedPredictions.map((p) => (
 <TableRow key={p.indicator.id} className={!p.feasible ? 'opacity-50' : ''}>
 <TableCell className="text-sm font-medium">
 {p.indicator.code}
 {p.indicator.is_iku && <span className="ml-1 text-amber-500">⭐</span>}
 <div className="truncate text-xs text-gray-400 max-w-[160px]">{p.indicator.name}</div>
 </TableCell>
 <TableCell className="text-sm text-gray-500">{p.organization?.code ?? '-'}</TableCell>
 <TableCell className="text-sm text-gray-500">{p.n}</TableCell>
 <TableCell className="text-sm">
 {p.r2 !== null ? (
 <span className={p.r2 >= 0.65 ? 'text-green-600' : p.r2 >= 0.40 ? 'text-amber-600' : 'text-red-600'}>
 {p.r2.toFixed(2)}
 </span>
 ) : '-'}
 </TableCell>
 <TableCell className="text-sm">{p.forecast?.toLocaleString('id-ID') ?? '-'}</TableCell>
 <TableCell><MiniBar value={p.projected_achievement} /></TableCell>
 <TableCell><StatusBadge status={p.status} /></TableCell>
 </TableRow>
 ))}
 {predictions.length === 0 && (
 <TableRow>
 <TableCell colSpan={7} className="py-8 text-center text-sm text-gray-400">
 Belum ada indikator aktif dengan data realisasi.
 </TableCell>
 </TableRow>
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
 itemLabel="prediksi"
 onPerPageChange={(val) => {
 setPerPage(val);
 setCurrentPage(1);
 }}
 onClientPageChange={(p) => setCurrentPage(p)}
 />
 </CardContent>
 </Card>

 </div>
 </div>
 </AuthenticatedLayout>
 );
}