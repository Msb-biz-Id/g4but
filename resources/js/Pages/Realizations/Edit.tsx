import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatDateTime } from '@/lib/utils';
import { PageProps } from '@/types';
import {Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import ConfirmDialog from '@/Components/ConfirmDialog';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Checkbox } from '@/Components/ui/checkbox';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Separator } from '@/Components/ui/separator';
import { Textarea } from '@/Components/ui/textarea';
import {
 AlertCircle,
 ArrowLeft,
 CheckCircle2,
 Clock,
 Download,
 FileText,
 Image as ImageIcon,
 MessageSquare,
 Paperclip,
 RefreshCw,
 RotateCcw,
 Send,
 Trash2,
 Upload,
 XCircle,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Evidence {
 id: number;
 file_name: string;
 mime_type?: string | null;
 size: number;
 status: string;
 uploaded_at: string | null;
}

interface ValidationRecord {
 id: number;
 action: string;
 comment: string | null;
 validator: { name: string } | null;
 validated_at: string | null;
}

interface Achievement {
 percentage: number | null;
 status: 'good' | 'warning' | 'critical' | 'no_data';
}

interface Props extends PageProps {
 realization: {
 id: number;
 value: string;
 status: string;
 narrative: string | null;
 indicator_version: {
 name: string;
 version_number: number;
 direction: string;
 measurement_unit: { code: string; name: string; symbol: string | null } | null;
 } | null;
 organization: { code: string; name: string } | null;
 measurement_period: { code: string; name: string; type: string } | null;
 evidences: Evidence[];
 validations: ValidationRecord[];
 };
 target: { target_value: string; status: string } | null;
 achievement: Achievement | null;
 last_revision_reason: string | null;
 good_threshold: number;
 warning_threshold: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const achievementConfig: Record<string, { text: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' }> = {
 good: { text: 'BAIK', variant: 'success' },
 warning: { text: 'WASPADA', variant: 'warning' },
 critical: { text: 'KRITIS', variant: 'destructive' },
 no_data: { text: 'TIDAK ADA DATA', variant: 'secondary' },
};

const validationActionConfig: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
 submitted: { label: 'Disubmit', icon: Send, cls: 'text-blue-600' },
 resubmitted: { label: 'Resubmit', icon: RefreshCw, cls: 'text-blue-500' },
 approved: { label: 'Disetujui', icon: CheckCircle2,cls: 'text-green-600' },
 revision_request: { label: 'Minta Revisi', icon: RotateCcw, cls: 'text-red-600' },
 rejected: { label: 'Ditolak', icon: XCircle, cls: 'text-red-700' },
};

function fileIcon(mime: string | null | undefined) {
 if (!mime) return <FileText className="h-4 w-4 text-gray-400" />;
 if (mime.startsWith('image/')) return <ImageIcon className="h-4 w-4 text-indigo-400" />;
 if (mime === 'application/pdf') return <FileText className="h-4 w-4 text-red-400" />;
 return <Paperclip className="h-4 w-4 text-gray-400" />;
}

function formatBytes(bytes: number): string {
 if (bytes < 1024) return `${bytes} B`;
 if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
 return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string | null): string {
    if (!iso) return '—';
    return formatDateTime(iso);
}

// ─── Validation History Timeline (FR-MSR-013) ─────────────────────────────────

function ValidationTimeline({ validations }: { validations: ValidationRecord[] }) {
 if (validations.length === 0) {
 return <p className="text-xs text-gray-400">Belum ada riwayat validasi.</p>;
 }

 return (
 <ol className="space-y-4">
 {validations.map((v, i) => {
 const cfg = validationActionConfig[v.action] ?? { label: v.action, icon: Clock, cls: 'text-gray-500' };
 const Icon = cfg.icon;
 return (
 <li key={v.id} className="flex gap-3">
 <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
 <Icon className={`h-3.5 w-3.5 ${cfg.cls}`} />
 </div>
 <div className="min-w-0 flex-1">
 <div className="flex flex-wrap items-baseline gap-2">
 <span className={`text-xs font-semibold ${cfg.cls}`}>{cfg.label}</span>
 <span className="text-xs text-gray-400">
 oleh {v.validator?.name ?? 'Sistem'} · {formatDate(v.validated_at)}
 </span>
 </div>
 {v.comment && (
 <p className="mt-1 rounded bg-gray-50 px-2 py-1 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
 "{v.comment}"
 </p>
 )}
 </div>
 </li>
 );
 })}
 </ol>
 );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RealizationsEdit({
 auth,
 realization,
 target,
 achievement,
 last_revision_reason,
 good_threshold,
 warning_threshold,
}: Props) {
 const { flash } = usePage().props as { flash: { success?: string | null; error?: string | null } };
 const permissions = auth.user?.permissions ?? [];
 const canSubmit = permissions.includes('realization:submit');
 const canUploadEvidence = permissions.includes('evidence:upload');
 const isEditable = ['draft', 'revision_required'].includes(realization.status);

 const form = useForm({
 value: String(Number(realization.value)),
 narrative: realization.narrative ?? '',
 save_and_submit: false,
 });

 const [deleteEvidenceTarget, setDeleteEvidenceTarget] = useState<Evidence | null>(null);

 const confirmDeleteEvidence = () => {
 if (!deleteEvidenceTarget) return;
 router.delete(route('evidences.destroy', [realization.id, deleteEvidenceTarget.id]), {
 preserveScroll: true,
 onSuccess: () => setDeleteEvidenceTarget(null),
 });
 };

 const evidenceForm = useForm({ file: null as File | null });

 const submit: FormEventHandler = (e) => {
 e.preventDefault();
 form.put(route('realizations.update', realization.id));
 };

 const submitEvidence: FormEventHandler = (e) => {
 e.preventDefault();
 evidenceForm.post(route('evidences.store', realization.id), {
 forceFormData: true,
 preserveScroll: true,
 onSuccess: () => evidenceForm.reset('file'),
 });
 };

 const achCfg = achievementConfig[achievement?.status ?? 'no_data'];
 const unit = realization.indicator_version?.measurement_unit?.symbol ?? '';

 return (
 <AuthenticatedLayout
 header="Edit Realisasi"
 >
 <Head title="Edit Realisasi" />
 <div className="py-8">
 <div className="mx-auto max-w-5xl space-y-6 px-4 sm:px-6 lg:px-8">

 {/* Flash */}
 {flash?.success && (
 <div className="flex items-center gap-2 rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">
 <CheckCircle2 className="h-4 w-4 shrink-0" /> {flash.success}
 </div>
 )}
 {flash?.error && (
 <div className="flex items-center gap-2 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
 <AlertCircle className="h-4 w-4 shrink-0" /> {flash.error}
 </div>
 )}

 {/* Revision Reason Banner (FR-MSR-010) */}
 {last_revision_reason && (
 <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
 <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
 <div>
 <p className="text-sm font-semibold text-red-800 dark:text-red-200">Revisi Diperlukan</p>
 <p className="mt-1 text-sm text-red-700 dark:text-red-300">{last_revision_reason}</p>
 </div>
 </div>
 )}

 {/* Metadata Card */}
 <Card>
 <CardContent className="pt-6">
 <div className="grid gap-4 sm:grid-cols-3">
 <div>
 <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Indikator</div>
 <div className="mt-1 text-sm font-medium">{realization.indicator_version?.name ?? '—'}</div>
 <div className="text-xs text-gray-400">v{realization.indicator_version?.version_number} · {realization.indicator_version?.direction}</div>
 </div>
 <div>
 <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">OPD</div>
 <div className="mt-1 text-sm font-medium">{realization.organization?.code ?? '—'}</div>
 <div className="text-xs text-gray-400">{realization.organization?.name}</div>
 </div>
 <div>
 <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Periode</div>
 <div className="mt-1 text-sm font-medium">{realization.measurement_period?.name ?? '—'}</div>
 <div className="text-xs text-gray-400">{realization.measurement_period?.type}</div>
 </div>
 </div>

 <Separator className="my-4" />

 {/* Metric Summary */}
 <div className="grid gap-4 sm:grid-cols-3">
 <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
 <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Realisasi</div>
 <div className="mt-1 text-2xl font-bold">
 {Number(realization.value).toLocaleString('id-ID')}
 {unit && <span className="ml-1 text-base font-normal text-gray-400">{unit}</span>}
 </div>
 </div>
 <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
 <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Target</div>
 <div className="mt-1 text-2xl font-bold">
 {target ? Number(target.target_value).toLocaleString('id-ID') : '—'}
 {unit && target && <span className="ml-1 text-base font-normal text-gray-400">{unit}</span>}
 </div>
 </div>
 <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
 <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Capaian</div>
 <div className="mt-1 flex items-center gap-2">
 <span className="text-2xl font-bold">
 {achievement?.percentage != null
 ? `${achievement.percentage.toLocaleString('id-ID')}%`
 : '—'}
 </span>
 <Badge variant={achCfg.variant}>{achCfg.text}</Badge>
 </div>
 </div>
 </div>
 </CardContent>
 </Card>

 <div className="grid gap-6 lg:grid-cols-5">
 {/* Edit Form — 3/5 */}
 <div className="space-y-4 lg:col-span-3">
 {/* Value + Narrative Form */}
 <Card>
 <CardHeader>
 <CardTitle className="text-sm">Input Nilai Realisasi</CardTitle>
 </CardHeader>
 <CardContent>
 <form autoComplete="off" noValidate onSubmit={submit} className="space-y-4">
 <div>
 <Label>Nilai Realisasi {unit && <span className="text-gray-400">({unit})</span>}</Label>
 <Input
 type="number"
 step="any"
 value={form.data.value}
 onChange={(e) => form.setData('value', e.target.value)}

 disabled={!isEditable}
 className="mt-1"
 placeholder="mis. 75.5"
 />
 {form.errors.value && <p className="mt-1 text-xs text-red-600">{form.errors.value}</p>}
 </div>

 <div>
 <Label>Narasi / Keterangan Capaian</Label>
 <Textarea
 value={form.data.narrative}
 onChange={(e) => form.setData('narrative', e.target.value)}
 rows={4}
 disabled={!isEditable}
 className="mt-1 resize-none"
 placeholder="Jelaskan pencapaian, hambatan, atau catatan terkait nilai ini..."
 />
 </div>

 {isEditable && (
 <>
 <Label className="flex cursor-pointer items-center gap-2 text-sm font-normal">
 <Checkbox
 checked={form.data.save_and_submit}
 onCheckedChange={(checked) => form.setData('save_and_submit', checked === true)}
 />
 Simpan &amp; submit untuk review
 </Label>

 <div className="flex items-center gap-3">
 <Button type="submit" disabled={form.processing}>
 {form.processing ? 'Menyimpan...' : 'Simpan'}
 </Button>
 {canSubmit && !form.data.save_and_submit && (
 <Button
 type="button"
 variant="secondary"
 disabled={form.processing}
 onClick={() => router.post(route('realizations.submit', realization.id))}
 >
 <Send className="mr-1.5 h-3.5 w-3.5" /> Submit
 </Button>
 )}
 </div>
 </>
 )}
 </form>
 </CardContent>
 </Card>

 {/* Evidence Upload (FR-MSR-006) */}
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-sm">
 <Paperclip className="h-4 w-4 text-indigo-500" />
 Evidence Pendukung
 <Badge variant="secondary">{realization.evidences.length}</Badge>
 </CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 {canUploadEvidence && (
 <form autoComplete="off" noValidate onSubmit={submitEvidence} className="space-y-3">
 <div>
 <Label className="mb-1 block text-xs text-gray-500">
 Format: PDF, JPG, PNG, XLSX, DOC, CSV · Maks 10 MB
 </Label>
 <Input
 type="file"
 accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx,.csv"
 onChange={(e) => evidenceForm.setData('file', e.target.files?.[0] ?? null)}
 className="file:mr-3 file:rounded file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
 />
 {evidenceForm.data.file && (
 <p className="mt-1 text-xs text-gray-500">
 {evidenceForm.data.file.name} · {formatBytes(evidenceForm.data.file.size)}
 </p>
 )}
 {evidenceForm.errors.file && (
 <p className="mt-1 text-xs text-red-600">{evidenceForm.errors.file}</p>
 )}
 </div>
 <Button
 type="submit"
 size="sm"
 disabled={evidenceForm.processing || !evidenceForm.data.file}
 className="gap-1.5"
 >
 <Upload className="h-3.5 w-3.5" />
 {evidenceForm.processing ? 'Mengupload...' : 'Upload'}
 </Button>
 </form>
 )}

 {/* Evidence list */}
 {realization.evidences.length > 0 ? (
 <ul className="divide-y divide-gray-100 dark:divide-gray-800">
 {realization.evidences.map((ev) => (
 <li key={ev.id} className="flex items-center gap-3 py-3">
 <div className="shrink-0">{fileIcon(ev.mime_type)}</div>
 <div className="min-w-0 flex-1">
 <p className="truncate text-sm font-medium">{ev.file_name}</p>
 <p className="text-xs text-gray-400">
 {formatBytes(ev.size)} · {ev.status} · {formatDate(ev.uploaded_at)}
 </p>
 </div>
 <div className="flex shrink-0 items-center gap-2">
 <a
 href={route('evidences.download', [realization.id, ev.id])}
 className="text-blue-600 hover:text-blue-800"
 title="Unduh"
 >
 <Download className="h-4 w-4" />
 </a>
 {canUploadEvidence && (
 <button
 onClick={() => setDeleteEvidenceTarget(ev)}
 className="text-red-400 hover:text-red-600"
 title="Hapus"
 >
 <Trash2 className="h-4 w-4" />
 </button>
 )}
 </div>
 </li>
 ))}
 </ul>
 ) : (
 <p className="py-3 text-center text-xs text-gray-400">Belum ada evidence diupload.</p>
 )}
 </CardContent>
 </Card>
 </div>

 {/* Validation History — 2/5 (FR-MSR-013) */}
 <div className="lg:col-span-2">
 <Card className="h-full">
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-sm">
 <MessageSquare className="h-4 w-4 text-indigo-500" />
 Riwayat Validasi
 </CardTitle>
 </CardHeader>
 <CardContent>
 <ValidationTimeline validations={realization.validations} />
 </CardContent>
 </Card>
 </div>
 </div>

 </div>
 </div>

 <ConfirmDialog
 open={deleteEvidenceTarget !== null}
 onOpenChange={(open) => !open && setDeleteEvidenceTarget(null)}
 title="Hapus Dokumen Evidence?"
 description="Apakah Anda yakin ingin menghapus evidence ini? Tindakan ini tidak dapat dibatalkan."
 confirmText="Hapus Evidence"
 cancelText="Batal"
 onConfirm={confirmDeleteEvidence}
 onCancel={() => setDeleteEvidenceTarget(null)}
 />
 </AuthenticatedLayout>
 );
}