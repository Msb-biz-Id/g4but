import { Head, Link } from '@inertiajs/react';
import { Clock, CheckCircle2, XCircle, FileText, ChevronRight } from 'lucide-react';

import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatDate, formatDateTime } from '@/lib/utils';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { PageProps } from '@/types';

interface AuditEntry {
    id: number;
    action: string;
    subject_type: string;
    subject_id: number;
    user_id: number;
    created_at: string;
    changes?: Record<string, unknown>;
}

interface Followup {
    id: number;
    description: string;
    status: string;
    submitted_at: string;
    verified_at?: string;
}

interface Recommendation {
    id: number;
    title: string;
    status: string;
    priority: string;
    due_date?: string;
    followups: Followup[];
}

interface Evaluation {
    id: number;
    title: string;
    type: string;
    status: string;
    organization: { id: number; code: string; name: string };
    planningPeriod: { id: number; code: string; name: string; year: number };
    recommendations: Recommendation[];
}

interface Props extends PageProps {
    evaluation: Evaluation;
    auditLogs: AuditEntry[];
}

const ACTION_ICON: Record<string, React.ReactNode> = {
    create:          <CheckCircle2 className="h-4 w-4 text-green-500" />,
    update_status:   <Clock className="h-4 w-4 text-blue-500" />,
    verify_followup: <CheckCircle2 className="h-4 w-4 text-indigo-500" />,
    evidence_review: <FileText className="h-4 w-4 text-purple-500" />,
    submit:          <ChevronRight className="h-4 w-4 text-orange-500" />,
};

const ACTION_LABEL: Record<string, string> = {
    create:             'Dibuat',
    update_status:      'Status diperbarui',
    verify_followup:    'Tindak lanjut diverifikasi',
    evidence_review:    'Evidence direview',
    score:              'Skor ditambah',
    submit:             'Disubmit',
    approve:            'Disetujui',
    reject:             'Ditolak',
};

const STATUS_COLOR: Record<string, string> = {
    open:         'bg-gray-100 text-gray-700',
    in_progress:  'bg-blue-100 text-blue-700',
    submitted:    'bg-yellow-100 text-yellow-700',
    verified:     'bg-green-100 text-green-700',
    closed:       'bg-purple-100 text-purple-700',
    rejected:     'bg-red-100 text-red-700',
};

export default function EvaluationHistory({ evaluation, auditLogs, auth }: Props) {
    return (
        <AuthenticatedLayout header="Histori Evaluasi">
            <Head title={`Histori — ${evaluation.title}`} />

            <div className="space-y-4">
                {/* Breadcrumb + header */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
                            <Link href={route('evaluations.index')} className="hover:underline">Evaluasi</Link>
                            <ChevronRight className="h-3.5 w-3.5" />
                            <Link href={route('evaluations.show', evaluation.id)} className="hover:underline">{evaluation.title}</Link>
                            <ChevronRight className="h-3.5 w-3.5" />
                            <span>Histori</span>
                        </div>
                        <h1 className="text-xl font-semibold">{evaluation.title}</h1>
                        <p className="text-sm text-muted-foreground">
                            {evaluation.organization.name} · {evaluation.planningPeriod.name}
                        </p>
                    </div>
                    <a
                        href={route('evaluations.export-pdf', evaluation.id)}
                        target="_blank"
                        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                        <FileText className="h-4 w-4" />
                        Download PDF
                    </a>
                </div>

                {/* Tindak Lanjut Rekomendasi */}
                {evaluation.recommendations.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Progress Tindak Lanjut Rekomendasi</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {evaluation.recommendations.map((rec) => (
                                <div key={rec.id} className="border rounded-lg p-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="font-medium text-sm">{rec.title}</p>
                                            {rec.due_date && (
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    Tenggat: {formatDate(rec.due_date)}
                                                </p>
                                            )}
                                        </div>
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[rec.status] ?? 'bg-gray-100 text-gray-700'}`}>
                                            {rec.status}
                                        </span>
                                    </div>

                                    {rec.followups.length > 0 && (
                                        <div className="mt-2 space-y-1.5 pl-3 border-l-2 border-gray-200">
                                            {rec.followups.map((fu) => (
                                                <div key={fu.id} className="flex items-start gap-2 text-xs">
                                                    {fu.status === 'verified'
                                                        ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                                                        : <Clock className="h-3.5 w-3.5 text-yellow-500 shrink-0 mt-0.5" />
                                                    }
                                                    <span className="text-muted-foreground">{fu.description}</span>
                                                    <Badge variant="outline" className="text-[10px] ml-auto">{fu.status}</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {rec.followups.length === 0 && (
                                        <p className="text-xs text-muted-foreground mt-1.5 pl-2">Belum ada tindak lanjut.</p>
                                    )}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                {/* Audit log timeline */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Timeline Aktivitas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {auditLogs.length === 0 && (
                            <p className="text-sm text-muted-foreground py-4 text-center">Belum ada histori aktivitas.</p>
                        )}
                        <div className="relative space-y-4">
                            {auditLogs.map((log, i) => (
                                <div key={log.id} className="flex gap-3">
                                    <div className="flex flex-col items-center">
                                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
                                            {ACTION_ICON[log.action] ?? <Clock className="h-4 w-4 text-gray-400" />}
                                        </div>
                                        {i < auditLogs.length - 1 && <div className="mt-1 h-full w-px bg-border" />}
                                    </div>
                                    <div className="pb-4">
                                        <p className="text-sm font-medium">
                                            {ACTION_LABEL[log.action] ?? log.action}
                                            <span className="ml-1.5 text-xs text-muted-foreground font-normal capitalize">
                                                ({log.subject_type.replace('_', ' ')} #{log.subject_id})
                                            </span>
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatDateTime(log.created_at)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
