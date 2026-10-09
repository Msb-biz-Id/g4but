import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatDate } from '@/lib/utils';
import { PageProps } from '@/types';
import {Head, Link, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { SelectNative } from '@/Components/ui/select-native';
import { Separator } from '@/Components/ui/separator';
import { Textarea } from '@/Components/ui/textarea';
import {
 AlertCircle,
 ArrowLeft,
 CheckCircle2,
 ChevronDown,
 ChevronRight,
 ClipboardList,
 ListChecks,
 PlusCircle,
 Star,
} from 'lucide-react';
import { router } from '@inertiajs/react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScoreItem {
 id: number;
 component: string;
 criterion: string | null;
 score: string;
 max_score: string;
 weight: string | null;
 evaluator_comment: string | null;
}

interface Followup {
 id: number;
 description: string;
 status: string;
 submitted_at: string | null;
 submitter: { name: string } | null;
}

interface RecommendationItem {
 id: number;
 title: string;
 description: string | null;
 priority: string;
 status: string;
 due_date: string | null;
 owner_organization: { code: string; name: string } | null;
 followups: Followup[];
}

interface Grade {
 label: string;
 desc: string;
 variant: 'success' | 'info' | 'warning' | 'destructive' | 'secondary';
}

interface RecStats {
 open: number;
 in_progress: number;
 submitted: number;
 verified: number;
 closed: number;
}

interface Props extends PageProps {
 evaluation: {
 id: number;
 code: string;
 title: string;
 type: string;
 status: string;
 organization_id: number | null;
 organization: { code: string; name: string } | null;
 planning_period: { code: string; name: string; year: number } | null;
 scores: ScoreItem[];
 recommendations: RecommendationItem[];
 };
 total_score: number;
 grade: Grade;
 rec_stats: RecStats;
 can_manage?: boolean;
 can_score?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const priorityConfig: Record<string, { text: string; variant: 'destructive' | 'warning' | 'info' | 'secondary' }> = {
 critical: { text: 'Kritis', variant: 'destructive' },
 high: { text: 'Tinggi', variant: 'warning' },
 medium: { text: 'Sedang', variant: 'info' },
 low: { text: 'Rendah', variant: 'secondary' },
};

const recStatusConfig: Record<string, { text: string; variant: 'secondary' | 'info' | 'warning' | 'success' | 'destructive' }> = {
 open: { text: 'Terbuka', variant: 'secondary' },
 in_progress: { text: 'Dalam Proses', variant: 'info' },
 submitted: { text: 'Disubmit', variant: 'warning' },
 verified: { text: 'Terverifikasi', variant: 'success' },
 closed: { text: 'Ditutup', variant: 'secondary' },
};

// ─── Score Progress Bar ───────────────────────────────────────────────────────

function ScoreBar({ score, maxScore }: { score: number; maxScore: number }) {
 const pct = maxScore > 0 ? Math.min((score / maxScore) * 100, 100) : 0;
 const color = pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-400' : 'bg-red-400';
 return (
 <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
 <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
 </div>
 );
}

// ─── Recommendation Row ───────────────────────────────────────────────────────

function RecommendationRow({
 rec,
 canManage,
 evaluationId,
}: {
 rec: RecommendationItem;
 canManage: boolean;
 evaluationId: number;
}) {
 const [expanded, setExpanded] = useState(false);
 const prCfg = priorityConfig[rec.priority] ?? { text: rec.priority, variant: 'secondary' as const };
 const stCfg = recStatusConfig[rec.status] ?? { text: rec.status, variant: 'secondary' as const };

 const followupForm = useForm({ description: '', submitted_at: '' });

 const submitFollowup: FormEventHandler = (e) => {
 e.preventDefault();
 followupForm.post(route('evaluations.followups.store', [evaluationId, rec.id]), {
 preserveScroll: true,
 onSuccess: () => followupForm.reset(),
 });
 };

 return (
 <li className="py-3">
 <div className="flex items-start justify-between gap-3">
 <div className="min-w-0 flex-1">
 <div className="flex flex-wrap items-center gap-2">
 <span className="text-sm font-medium">{rec.title}</span>
 <Badge variant={prCfg.variant}>{prCfg.text}</Badge>
 <Badge variant={stCfg.variant}>{stCfg.text}</Badge>
 </div>
 {rec.description && (
 <p className="mt-0.5 text-xs text-gray-500">{rec.description}</p>
 )}
 <div className="mt-0.5 text-xs text-gray-400">
 {rec.owner_organization?.code ?? '—'}
 {rec.due_date ? ` · jatuh tempo ${formatDate(rec.due_date)}` : ''}
 {` · ${rec.followups.length} tindak lanjut`}
 </div>
 </div>
 <div className="flex shrink-0 items-center gap-2">
 {canManage && (
 <SelectNative
 value={rec.status}
 onChange={(e) =>
 router.post(
 route('evaluations.recommendations.status', [evaluationId, rec.id]),
 { status: e.target.value },
 { preserveScroll: true },
 )
 }
 className="h-7 py-0 text-xs"
 >
 {Object.entries(recStatusConfig).map(([key, val]) => (
 <option key={key} value={key}>{val.text}</option>
 ))}
 </SelectNative>
 )}
 <button
 onClick={() => setExpanded((v) => !v)}
 className="text-gray-400 hover:text-gray-600"
 aria-label="Toggle followups"
 >
 {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
 </button>
 </div>
 </div>

 {/* Followup list + form */}
 {expanded && (
 <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50/50 p-3 dark:border-gray-800 dark:bg-gray-900/30">
 {rec.followups.length > 0 ? (
 <ul className="mb-3 space-y-2">
 {rec.followups.map((fu) => (
 <li key={fu.id} className="flex gap-2 text-xs">
 <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500" />
 <div>
 <p className="text-gray-700 dark:text-gray-300">{fu.description}</p>
 <p className="text-gray-400">
 {fu.submitter?.name ?? 'Sistem'} · {fu.submitted_at ? formatDate(fu.submitted_at) : '—'}
 </p>
 </div>
 </li>
 ))}
 </ul>
 ) : (
 <p className="mb-3 text-xs text-gray-400">Belum ada tindak lanjut.</p>
 )}

 <form autoComplete="off" noValidate onSubmit={submitFollowup} className="space-y-2">
 <Textarea
 value={followupForm.data.description}
 onChange={(e) => followupForm.setData('description', e.target.value)}
 placeholder="Deskripsikan tindak lanjut yang telah dilakukan..."
 rows={2}
 className="resize-none text-xs"

 />
 <div className="flex items-center gap-2">
 <Input
 type="date"
 placeholder="Pilih tanggal"
 value={followupForm.data.submitted_at}
 onChange={(e) => followupForm.setData('submitted_at', e.target.value)}
 className="h-7 w-36 text-xs"
 />
 <Button type="submit" size="sm" disabled={followupForm.processing} className="h-7 text-xs">
 <PlusCircle className="mr-1 h-3 w-3" /> Tambah
 </Button>
 </div>
 </form>
 </div>
 )}
 </li>
 );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EvaluationsShow({
 auth,
 evaluation,
 total_score,
 grade,
 rec_stats,
 can_manage,
 can_score,
}: Props) {
 const { flash } = usePage().props as { flash: { success?: string | null } };
 const permissions = auth.user?.permissions ?? [];
 const canScore = can_score !== undefined ? can_score : permissions.includes('evaluation:score');
 const canManage = can_manage !== undefined ? can_manage : permissions.includes('evaluation:manage');

 const scoreForm = useForm({
 component: '',
 criterion: '',
 score: '',
 max_score: '100',
 weight: '',
 evaluator_comment: '',
 });

 const recommendationForm = useForm({
 title: '',
 description: '',
 owner_organization_id: evaluation.organization_id ? String(evaluation.organization_id) : '',
 due_date: '',
 priority: 'medium',
 });

 const submitScore: FormEventHandler = (e) => {
 e.preventDefault();
 scoreForm.post(route('evaluations.scores.store', evaluation.id), {
 preserveScroll: true,
 onSuccess: () => scoreForm.reset('component', 'criterion', 'score', 'weight', 'evaluator_comment'),
 });
 };

 const submitRecommendation: FormEventHandler = (e) => {
 e.preventDefault();
 recommendationForm.post(route('evaluations.recommendations.store', evaluation.id), {
 preserveScroll: true,
 onSuccess: () => recommendationForm.reset(),
 });
 };

 const totalRecs = evaluation.recommendations.length;

 return (
 <AuthenticatedLayout
 header="Detail Evaluasi"
 >
 <Head title="Detail Evaluasi" />
 <div className="py-8">
 <div className="mx-auto max-w-6xl space-y-6 px-4 sm:px-6 lg:px-8">

 {flash?.success && (
 <div className="flex items-center gap-2 rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">
 <CheckCircle2 className="h-4 w-4 shrink-0" /> {flash.success}
 </div>
 )}

 {/* Metadata + Score Summary */}
 <Card>
 <CardContent className="pt-6">
 <div className="grid gap-4 sm:grid-cols-4">
 <div>
 <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">OPD</div>
 <div className="mt-1 text-sm font-medium">{evaluation.organization?.name ?? '—'}</div>
 <div className="text-xs text-gray-400">{evaluation.organization?.code}</div>
 </div>
 <div>
 <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Periode</div>
 <div className="mt-1 text-sm font-medium">{evaluation.planning_period?.name ?? '—'}</div>
 <div className="text-xs text-gray-400">{evaluation.planning_period?.year}</div>
 </div>
 <div>
 <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Nilai</div>
 <div className="mt-1 text-3xl font-bold">{total_score.toLocaleString('id-ID', { maximumFractionDigits: 2 })}</div>
 </div>
 <div className="flex flex-col items-start gap-1">
 <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Predikat</div>
 <Badge variant={grade.variant} className="mt-1 text-base px-3 py-1">
 <Star className="mr-1 h-3.5 w-3.5" /> {grade.label}
 </Badge>
 <span className="text-xs text-gray-500">{grade.desc}</span>
 </div>
 </div>

 {/* Recommendation status summary (FR-EVL-010) */}
 {totalRecs > 0 && (
 <>
 <Separator className="my-4" />
 <div className="flex flex-wrap gap-3 text-xs">
 <span className="font-semibold text-gray-500">{totalRecs} Rekomendasi:</span>
 {rec_stats.open > 0 && <span className="text-gray-500">{rec_stats.open} Terbuka</span>}
 {rec_stats.in_progress > 0 && <span className="text-blue-500">{rec_stats.in_progress} Proses</span>}
 {rec_stats.submitted > 0 && <span className="text-amber-500">{rec_stats.submitted} Disubmit</span>}
 {rec_stats.verified > 0 && <span className="text-green-500">{rec_stats.verified} Terverifikasi</span>}
 {rec_stats.closed > 0 && <span className="text-gray-400">{rec_stats.closed} Ditutup</span>}
 </div>
 </>
 )}
 </CardContent>
 </Card>

 <div className="grid gap-6 lg:grid-cols-2">
 {/* Scoring Panel (FR-EVL-003,005) */}
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-sm">
 <ListChecks className="h-4 w-4 text-indigo-500" />
 Komponen Penilaian
 <Badge variant="secondary">{evaluation.scores.length}</Badge>
 </CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 {canScore && (
 <form autoComplete="off" noValidate onSubmit={submitScore} className="space-y-3 rounded-lg border border-dashed p-3">
 <div className="grid gap-2 sm:grid-cols-2">
 <div>
 <Label className="text-xs">Komponen <span className="text-red-500">*</span></Label>
 <Input
 value={scoreForm.data.component}
 onChange={(e) => scoreForm.setData('component', e.target.value)}
 placeholder="mis. Perencanaan Kinerja"

 className="mt-0.5 h-8 text-sm"
 />
 </div>
 <div>
 <Label className="text-xs">Kriteria</Label>
 <Input
 value={scoreForm.data.criterion}
 onChange={(e) => scoreForm.setData('criterion', e.target.value)}
 placeholder="mis. Kelengkapan Dokumen"
 className="mt-0.5 h-8 text-sm"
 />
 </div>
 </div>
 <div className="grid grid-cols-3 gap-2">
 <div>
 <Label className="text-xs">Skor <span className="text-red-500">*</span></Label>
 <Input type="number" step="any" value={scoreForm.data.score}
 onChange={(e) => scoreForm.setData('score', e.target.value)}
 className="mt-0.5 h-8 text-sm" placeholder="0" />
 </div>
 <div>
 <Label className="text-xs">Maks <span className="text-red-500">*</span></Label>
 <Input type="number" step="any" value={scoreForm.data.max_score}
 onChange={(e) => scoreForm.setData('max_score', e.target.value)}
 className="mt-0.5 h-8 text-sm" placeholder="100" />
 </div>
 <div>
 <Label className="text-xs">Bobot (%)</Label>
 <Input type="number" step="any" value={scoreForm.data.weight}
 onChange={(e) => scoreForm.setData('weight', e.target.value)}
 className="mt-0.5 h-8 text-sm" placeholder="30" />
 </div>
 </div>
 <div>
 <Label className="text-xs">Catatan Evaluator</Label>
 <Textarea
 value={scoreForm.data.evaluator_comment}
 onChange={(e) => scoreForm.setData('evaluator_comment', e.target.value)}
 rows={2} className="mt-0.5 resize-none text-sm"
 placeholder="Catatan untuk komponen ini..."
 />
 </div>
 <Button type="submit" size="sm" disabled={scoreForm.processing} className="gap-1">
 <PlusCircle className="h-3.5 w-3.5" /> Tambah Skor
 </Button>
 </form>
 )}

 <ul className="divide-y divide-gray-100 dark:divide-gray-800">
 {evaluation.scores.map((score) => {
 const s = Number(score.score);
 const m = Number(score.max_score);
 const pct = m > 0 ? ((s / m) * 100).toFixed(1) : '0';
 return (
 <li key={score.id} className="py-3">
 <div className="flex items-start justify-between gap-3">
 <div className="min-w-0">
 <div className="text-sm font-medium">{score.component}</div>
 {score.criterion && (
 <div className="text-xs text-gray-400">{score.criterion}</div>
 )}
 {score.evaluator_comment && (
 <div className="mt-1 text-xs italic text-gray-500">"{score.evaluator_comment}"</div>
 )}
 </div>
 <div className="shrink-0 text-right">
 <div className="text-sm font-bold">
 {s.toLocaleString('id-ID')} / {m.toLocaleString('id-ID')}
 </div>
 <div className="text-xs text-gray-400">{pct}%</div>
 </div>
 </div>
 <ScoreBar score={s} maxScore={m} />
 </li>
 );
 })}
 {evaluation.scores.length === 0 && (
 <li className="py-6 text-center text-xs text-gray-400">
 <AlertCircle className="mx-auto mb-1 h-5 w-5 opacity-40" />
 Belum ada skor penilaian.
 </li>
 )}
 </ul>
 </CardContent>
 </Card>

 {/* Recommendations Panel (FR-EVL-007,008,010) */}
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-sm">
 <ClipboardList className="h-4 w-4 text-amber-500" />
 Rekomendasi & Tindak Lanjut
 <Badge variant="secondary">{totalRecs}</Badge>
 </CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 {canManage && (
 <form autoComplete="off" noValidate onSubmit={submitRecommendation} className="space-y-3 rounded-lg border border-dashed p-3">
 <div>
 <Label className="text-xs">Judul Rekomendasi <span className="text-red-500">*</span></Label>
 <Input
 value={recommendationForm.data.title}
 onChange={(e) => recommendationForm.setData('title', e.target.value)}
 placeholder="Judul rekomendasi..."
 className="mt-0.5 h-8 text-sm"
 />
 </div>
 <div>
 <Label className="text-xs">Deskripsi / Penjelasan</Label>
 <Textarea
 value={recommendationForm.data.description}
 onChange={(e) => recommendationForm.setData('description', e.target.value)}
 rows={2} className="mt-0.5 resize-none text-sm"
 placeholder="Uraikan detail rekomendasi..."
 />
 </div>
 <div className="grid grid-cols-3 gap-2">
 <div className="col-span-1">
 <Label className="text-xs">Jatuh Tempo</Label>
 <Input type="date" value={recommendationForm.data.due_date}
 placeholder="Pilih batas waktu"
 onChange={(e) => recommendationForm.setData('due_date', e.target.value)}
 className="mt-0.5 h-8 text-sm" />
 </div>
 <div className="col-span-2">
 <Label className="text-xs">Prioritas</Label>
 <SelectNative value={recommendationForm.data.priority}
 onChange={(e) => recommendationForm.setData('priority', e.target.value)}
 className="mt-0.5 h-8 text-sm">
 {Object.entries(priorityConfig).map(([k, v]) => (
 <option key={k} value={k}>{v.text}</option>
 ))}
 </SelectNative>
 </div>
 </div>
 <Button type="submit" size="sm" disabled={recommendationForm.processing} className="gap-1">
 <PlusCircle className="h-3.5 w-3.5" /> Tambah Rekomendasi
 </Button>
 </form>
 )}

 <ul className="divide-y divide-gray-100 dark:divide-gray-800">
 {evaluation.recommendations.map((rec) => (
 <RecommendationRow
 key={rec.id}
 rec={rec}
 canManage={canManage}
 evaluationId={evaluation.id}
 />
 ))}
 {evaluation.recommendations.length === 0 && (
 <li className="py-6 text-center text-xs text-gray-400">
 <AlertCircle className="mx-auto mb-1 h-5 w-5 opacity-40" />
 Belum ada rekomendasi.
 </li>
 )}
 </ul>
 </CardContent>
 </Card>
 </div>

 </div>
 </div>
 </AuthenticatedLayout>
 );
}