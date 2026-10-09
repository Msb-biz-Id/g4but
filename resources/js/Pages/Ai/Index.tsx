import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Label } from '@/Components/ui/label';
import { SelectNative } from '@/Components/ui/select-native';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { FormEventHandler, useEffect, useState } from 'react';
import {
    AlertTriangle, BarChart3, Bot, Building2, Check, CheckCircle2,
    Copy, Download, FileDown, FileSearch, FileText, Lightbulb, Loader2,
    Printer, Shield, Sparkles, TrendingUp, Zap,
} from 'lucide-react';
import { cn, formatDateTime } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Period { id: number; code: string; name: string; type: string; }
interface Indicator { id: number; code: string; is_iku: boolean; name?: string; }
interface OrgItem { id: number; name: string; short_name: string; code: string; }

interface PerhatianItem { indikator_id: number | null; catatan: string; }
interface RekomendasiItem { indikator_id: number | null; tindakan: string; }

interface OutputParsed {
    ringkasan: string;
    perhatian: PerhatianItem[];
    rekomendasi: RekomendasiItem[];
}

interface AiResult {
    output: string;
    output_parsed?: OutputParsed | null;
    provider: string;
    status: string;
    sources: Record<string, any> | null;
    generated_at?: string | null;
    log_id?: number;
    insight_id?: number | null;
}

interface AiLog {
    id: number;
    feature: string;
    provider: string;
    status: string;
    created_at: string | null;
    user: { id: number; name: string } | null;
}

interface KuotaHarian {
    terpakai: number;
    kuota_maksimal: number;
    sisa: number | null;
    unlimited: boolean;
}

interface Props extends PageProps {
    periods: Period[];
    indicators: Indicator[];
    provider: string;
    logs: AiLog[];
    canManage: boolean;
    kuotaHarian: KuotaHarian | null;
    isLintasOpd: boolean;
    organizations: OrgItem[];
    aiResult?: AiResult | null;
}

type AiTab = 'executive_summary' | 'insight' | 'prediction' | 'recommendation' | 'opd_status';

const AI_TABS: { id: AiTab; label: string; icon: React.ElementType; desc: string }[] = [
    { id: 'executive_summary', label: 'Executive Summary',            icon: FileText,   desc: 'Ringkasan komprehensif capaian SAKIP, APBD, dan IKU' },
    { id: 'insight',           label: 'Analisis Insight Kinerja',     icon: BarChart3,  desc: 'Deteksi deviasi fisik vs serapan keuangan' },
    { id: 'prediction',        label: 'Prediksi Capaian Akhir Tahun', icon: TrendingUp, desc: 'Proyeksi probabilitas target kinerja akhir tahun' },
    { id: 'recommendation',    label: 'Rekomendasi Tindak Lanjut',    icon: Lightbulb,  desc: 'Saran perbaikan 4 pilar penguatan akuntabilitas' },
    { id: 'opd_status',        label: 'Status Kinerja per OPD',       icon: Building2,  desc: 'Matriks rekapitulasi capaian 10 Perangkat Daerah' },
];

function convertObjectToNarrative(obj: any, level: number = 0): string {
    if (typeof obj !== 'object' || obj === null) return String(obj);
    let out = '';
    for (const [k, v] of Object.entries(obj)) {
        const title = k.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        if (Array.isArray(v)) {
            out += (level === 0 ? `### ${title}\n` : `${title}:\n`);
            for (const item of v) {
                if (typeof item === 'object' && item !== null) {
                    const line = Object.values(item).filter(x => typeof x === 'string' || typeof x === 'number').join(' — ');
                    if (line) out += `- ${line}\n`;
                } else {
                    out += `- ${item}\n`;
                }
            }
            out += '\n';
        } else if (typeof v === 'object' && v !== null) {
            out += (level === 0 ? `### ${title}\n\n` : `${title}:\n`);
            out += convertObjectToNarrative(v, level + 1) + '\n';
        } else if (v !== undefined && v !== null && v !== '') {
            out += (level === 0 ? `### ${title}\n${v}\n\n` : `${title}: ${v}\n\n`);
        }
    }
    return out.trim();
}

function resolveParsedResult(result: AiResult | null): OutputParsed | null {
    if (!result) return null;
    if (result.output_parsed && typeof result.output_parsed === 'object' && result.output_parsed.ringkasan) {
        return result.output_parsed;
    }
    if (result.output && typeof result.output === 'string') {
        const trimmed = result.output.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('```')) {
            try {
                let cleaned = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
                const match = cleaned.match(/(\{.*\})/s);
                if (match) cleaned = match[1];
                const parsed = JSON.parse(cleaned);

                // Cek variasi struktur seperti { ringkasanEksekutif: { kinerjaOPD: ... } }
                const wrapper = parsed.ringkasanEksekutif || parsed.ringkasan_eksekutif;
                if (wrapper && typeof wrapper === 'object') {
                    const opd = wrapper.kinerjaOPD || wrapper.kinerja_opd || wrapper;
                    const periode = wrapper.periode ? ` (${wrapper.periode})` : '';
                    const capaian = opd.capaianUtama || opd.capaian_utama || opd.capaian || [];
                    const kendala = opd.kendalaSignifikan || opd.kendala_signifikan || opd.kendala || opd.perhatian || [];
                    const saran = opd.rekomendasiStrategis || opd.rekomendasi_strategis || opd.rekomendasi || [];

                    const ringkasanText = Array.isArray(capaian) ? capaian.join(' ') : String(capaian || '');
                    return {
                        ringkasan: `Laporan Hasil Analisis Kinerja Eksekutif${periode}:\n${ringkasanText}`,
                        perhatian: Array.isArray(kendala) ? kendala.map((k: any) => ({ indikator_id: null, catatan: typeof k === 'object' ? (k.catatan || Object.values(k)[0]) : String(k) })) : [],
                        rekomendasi: Array.isArray(saran) ? saran.map((s: any) => ({ indikator_id: null, tindakan: typeof s === 'object' ? (s.tindakan || Object.values(s)[0]) : String(s) })) : [],
                    };
                }

                // Cek skema 3 field standar
                if (parsed.ringkasan || parsed.perhatian || parsed.rekomendasi) {
                    return {
                        ringkasan: typeof parsed.ringkasan === 'string' ? parsed.ringkasan : convertObjectToNarrative(parsed.ringkasan),
                        perhatian: Array.isArray(parsed.perhatian) ? parsed.perhatian : [],
                        rekomendasi: Array.isArray(parsed.rekomendasi) ? parsed.rekomendasi : [],
                    };
                }
            } catch {}
        }
    }
    return null;
}

function formatNarrativeText(text: string): string {
    if (!text) return '';
    const trimmed = text.trim();
    if (trimmed.startsWith('{') || (trimmed.startsWith('```') && trimmed.includes('{'))) {
        try {
            let cleaned = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
            const match = cleaned.match(/(\{.*\})/s);
            if (match) cleaned = match[1];
            const parsed = JSON.parse(cleaned);
            return convertObjectToNarrative(parsed);
        } catch {
            return text;
        }
    }
    return text;
}

export default function AiIndex({
    auth, periods, indicators, provider, logs, canManage, kuotaHarian, isLintasOpd, organizations, aiResult: initialAiResult,
}: Props) {
    const pageProps = usePage<Props & { flash: { ai_result?: AiResult; error?: string; success?: string } }>().props;
    const incomingResult = pageProps.aiResult || pageProps.flash?.ai_result || initialAiResult;

    const [activeTab, setActiveTab] = useState<AiTab>('executive_summary');
    const [selectedPeriodId, setSelectedPeriodId] = useState<string>(() => {
        const tw2 = periods.find((p) => p.code === 'TW2-2026' || p.name.includes('Triwulan II'));
        return tw2 ? String(tw2.id) : (periods[0] ? String(periods[0].id) : '');
    });
    const [selectedOrgId, setSelectedOrgId] = useState<string>('');
    const [selectedIndicatorId, setSelectedIndicatorId] = useState<string>('');
    const [copied, setCopied] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isExportingPdf, setIsExportingPdf] = useState(false);

    // State penyimpan hasil analisis (agar tetap tampil dan tersimpan)
    const [currentResult, setCurrentResult] = useState<AiResult | null>(() => {
        if (incomingResult) return incomingResult;
        try {
            const saved = sessionStorage.getItem('ekasuari_active_ai_result');
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });

    useEffect(() => {
        if (incomingResult) {
            setCurrentResult(incomingResult);
            try {
                sessionStorage.setItem('ekasuari_active_ai_result', JSON.stringify(incomingResult));
            } catch {}
        }
    }, [incomingResult]);

    const handleGenerate: FormEventHandler = (e) => {
        e.preventDefault();
        setIsProcessing(true);

        const routesMap: Record<AiTab, string> = {
            executive_summary: route('ai.executive-summary'),
            insight:           route('ai.insight'),
            prediction:        route('ai.prediction'),
            recommendation:    route('ai.recommendation'),
            opd_status:        route('ai.opd-status'),
        };

        router.post(
            routesMap[activeTab],
            {
                organization_id: selectedOrgId || undefined,
                indicator_id: selectedIndicatorId || undefined,
                period_id: selectedPeriodId ? Number(selectedPeriodId) : undefined,
            },
            {
                preserveScroll: true,
                onFinish: () => setIsProcessing(false),
            }
        );
    };

    const displayParsed = resolveParsedResult(currentResult);

    const getFormattedOutputText = () => {
        if (!currentResult) return '';
        if (displayParsed) {
            let txt = displayParsed.ringkasan + '\n\n';
            if (displayParsed.perhatian?.length > 0) {
                txt += 'Catatan Perhatian Khusus:\n' + displayParsed.perhatian.map((p) => `- ${p.catatan}`).join('\n') + '\n\n';
            }
            if (displayParsed.rekomendasi?.length > 0) {
                txt += 'Rekomendasi Tindak Lanjut:\n' + displayParsed.rekomendasi.map((r) => `- ${r.tindakan}`).join('\n') + '\n\n';
            }
            txt += 'Sumber: analisis otomatis e-KASUARI';
            return txt.trim();
        }
        return formatNarrativeText(currentResult.output || '');
    };

    const handleCopy = (text?: string) => {
        const textToCopy = (typeof text === 'string' && text) ? (displayParsed ? getFormattedOutputText() : formatNarrativeText(text)) : getFormattedOutputText();
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownloadTxt = (content: string) => {
        const tabInfo = AI_TABS.find((t) => t.id === activeTab);
        const filename = `laporan-${activeTab}-${Date.now()}.txt`;
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleDownloadPdf = () => {
        if (!currentResult?.output) return;
        setIsExportingPdf(true);

        const form = document.createElement('form');
        form.method = 'POST';
        form.action = route('ai.export-pdf');
        form.target = '_blank';

        const csrfMeta = document.querySelector('meta[name="csrf-token"]');
        const csrfToken = csrfMeta?.getAttribute('content') || '';

        const tabTitle = AI_TABS.find((t) => t.id === activeTab)?.label || 'Laporan Analisis Eksekutif AI';
        const targetOrgName = selectedOrgId
            ? organizations.find((o) => String(o.id) === String(selectedOrgId))?.name || 'Perangkat Daerah'
            : 'Perangkat Daerah (Seluruh Unit Kerja)';

        const payload: Record<string, string> = {
            _token: csrfToken,
            title: tabTitle,
            feature: activeTab,
            scope: targetOrgName,
            output: getFormattedOutputText(),
            parsed_json: displayParsed ? JSON.stringify(displayParsed) : '',
            raw_output: currentResult.output || '',
        };

        for (const [k, v] of Object.entries(payload)) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = k;
            input.value = v;
            form.appendChild(input);
        }

        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
        setTimeout(() => setIsExportingPdf(false), 1500);
    };

    const handlePrint = () => {
        window.print();
    };

    const currentTabInfo = AI_TABS.find((t) => t.id === activeTab) || AI_TABS[0];

    return (
        <AuthenticatedLayout>
            <Head title="Pusat Analisis & Asisten AI" />

            <div className="space-y-6 pb-12">
                {/* Header Formal Eksekutif */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-5">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center justify-center p-2 rounded-lg bg-primary/10 text-primary">
                                <Bot className="w-6 h-6" />
                            </span>
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">Pusat Analisis & Asisten AI</h1>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                            Sistem pendukung keputusan analitik berbasis data kinerja dan akuntabilitas Perangkat Daerah (OPD Induk, Sekretariat, dan Bidang).
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {kuotaHarian && (
                            <div className="text-right border border-border rounded-lg px-3 py-1.5 bg-card">
                                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Kuota Analisis Hari Ini</div>
                                <div className="text-sm font-bold text-foreground">
                                    {kuotaHarian.unlimited ? 'Akses Tanpa Batas' : `${kuotaHarian.terpakai} / ${kuotaHarian.kuota_maksimal} kali`}
                                </div>
                            </div>
                        )}
                        {canManage && (
                            <Link href={route('ai.templates')}>
                                <Button variant="outline" size="sm" className="gap-1.5">
                                    <Zap className="w-4 h-4" />
                                    Kelola Template
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>

                {/* TATA LETAK 2 KOLOM (Kiri: Hasil Analisis & Export | Kanan: Tab & Form Eksekusi) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* ═══ KOLOM KIRI (OUTPUT / HASIL ANALISIS) ═══ */}
                    <div className="lg:col-span-7 xl:col-span-8 space-y-4">
                        <Card className="border-border shadow-xs overflow-hidden min-h-[560px] flex flex-col justify-between">
                            {/* Header Panel Hasil */}
                            <div className="bg-muted/40 border-b border-border px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5">
                                    <span className="p-1.5 rounded-md bg-primary text-primary-foreground">
                                        <FileSearch className="w-4 h-4" />
                                    </span>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h2 className="font-bold text-sm text-foreground">
                                                Laporan Hasil Analisis: {currentTabInfo.label}
                                            </h2>
                                            {currentResult && (
                                                <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300 border-green-200">
                                                    Resmi SAKIP
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {currentResult?.generated_at
                                                ? `Diterbitkan: ${formatDateTime(currentResult.generated_at)}`
                                                : 'Menunggu eksekusi analisis data'}
                                        </p>
                                    </div>
                                </div>

                                {/* Action Buttons (Salin & Download PDF) */}
                                {currentResult && (
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleCopy(currentResult.output)}
                                            className="gap-1.5 h-8 text-xs font-medium"
                                            title="Salin isi laporan ke clipboard"
                                        >
                                            {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                                            {copied ? 'Tersalin' : 'Salin Teks'}
                                        </Button>

                                        <Button
                                            variant="default"
                                            size="sm"
                                            onClick={handleDownloadPdf}
                                            disabled={isExportingPdf}
                                            className="gap-1.5 h-8 text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground"
                                            title="Download dokumen PDF resmi"
                                        >
                                            {isExportingPdf ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <FileDown className="w-3.5 h-3.5" />
                                            )}
                                            {isExportingPdf ? 'Menyiapkan...' : 'Download PDF'}
                                        </Button>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handlePrint}
                                            className="gap-1.5 h-8 text-xs hidden sm:inline-flex"
                                            title="Cetak langsung dokumen"
                                        >
                                            <Printer className="w-3.5 h-3.5" />
                                            Cetak
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Isi Konten Hasil Analisis */}
                            <CardContent className="p-6 flex-1 flex flex-col justify-start">
                                {isProcessing ? (
                                    /* State Loading saat AI sedang memproses */
                                    <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                                        <div className="relative">
                                            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                                <Loader2 className="w-7 h-7 animate-spin text-primary" />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5 max-w-sm">
                                            <h3 className="text-base font-semibold text-foreground">Sedang Mengolah Analisis Data Kinerja</h3>
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                Sistem sedang mengagregasi data capaian fisik, serapan anggaran, indikator IKU OPD, dan dokumen perencanaan SAKIP dari database resmi...
                                            </p>
                                        </div>
                                    </div>
                                ) : currentResult ? (
                                    /* Tampilan Dokumen Eksekutif Resmi (Bebas JSON & Bebas Emoji) */
                                    <div className="space-y-6">
                                        {/* Banner Ringkasan Dokumen */}
                                        <div className="border-b border-border pb-4">
                                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground mb-1">
                                                <span>Perangkat Daerah</span>
                                                <span>Sistem e-KASUARI SAKIP</span>
                                            </div>
                                            <h3 className="text-lg font-bold text-foreground">
                                                {currentTabInfo.label}
                                            </h3>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                Lingkup Analisis: {selectedOrgId ? organizations.find((o) => String(o.id) === String(selectedOrgId))?.name : 'Seluruh Unit Kerja (OPD Induk, Sekretariat, dan Bidang)'}
                                            </p>
                                        </div>

                                        {/* Jika memiliki output_parsed terstruktur (dari server atau hasil fallback parse lokal) */}
                                        {displayParsed ? (
                                            <div className="space-y-5">
                                                {/* Ringkasan Narasi */}
                                                <div className="rounded-lg border border-border p-4 bg-muted/20">
                                                    <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                        <FileText className="w-3.5 h-3.5" />
                                                        Ringkasan Eksekutif
                                                    </h4>
                                                    <p className="text-sm leading-relaxed text-foreground whitespace-pre-line font-medium">
                                                        {displayParsed.ringkasan}
                                                    </p>
                                                </div>

                                                {/* Catatan Perhatian Khusus */}
                                                {displayParsed.perhatian?.length > 0 && (
                                                    <div className="rounded-lg border border-amber-200 dark:border-amber-900/60 p-4 bg-amber-50/40 dark:bg-amber-950/20">
                                                        <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                                            Catatan Perhatian Khusus
                                                        </h4>
                                                        <div className="space-y-1.5">
                                                            {displayParsed.perhatian.map((p, idx) => (
                                                                <div key={idx} className="flex items-start gap-2 text-xs text-foreground">
                                                                    <span className="font-bold text-amber-600 mt-0.5">•</span>
                                                                    <span>{p.catatan}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Rekomendasi Tindak Lanjut */}
                                                {displayParsed.rekomendasi?.length > 0 && (
                                                    <div className="rounded-lg border border-primary/20 p-4 bg-primary/5">
                                                        <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                            <Lightbulb className="w-3.5 h-3.5" />
                                                            Rekomendasi Tindak Lanjut Strategis
                                                        </h4>
                                                        <div className="space-y-1.5">
                                                            {displayParsed.rekomendasi.map((r, idx) => (
                                                                <div key={idx} className="flex items-start gap-2 text-xs text-foreground">
                                                                    <span className="font-bold text-primary mt-0.5">✓</span>
                                                                    <span>{r.tindakan}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            /* Teks Naratif Terstruktur Eksekutif */
                                            <div className="rounded-xl border border-border/70 p-5 bg-card text-foreground font-sans text-xs leading-relaxed whitespace-pre-line shadow-2xs">
                                                {formatNarrativeText(currentResult.output)}
                                            </div>
                                        )}

                                        {/* Footer Legalitas & Verifikasi Dokumen */}
                                        <div className="pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[11px] text-muted-foreground">
                                            <span>Dokumen resmi hasil audit analitik data SAKIP e-KASUARI.</span>
                                            <span>Sifat Dokumen: Rahasia &amp; Terbatas (Aparatur Terverifikasi)</span>
                                        </div>
                                    </div>
                                ) : (
                                    /* State Awal saat Belum Ada Analisis */
                                    <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                                        <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground border border-border">
                                            <FileText className="w-8 h-8 stroke-[1.5]" />
                                        </div>
                                        <div className="space-y-1.5 max-w-md">
                                            <h3 className="text-base font-bold text-foreground">Panel Hasil Laporan Eksekutif</h3>
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                Silakan pilih modul analisis pada tab di sebelah kanan, tentukan parameter lingkup Perangkat Daerah (OPD), lalu klik tombol <span className="font-semibold text-foreground">"Jalankan Analisis AI"</span>.
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-left max-w-lg w-full">
                                            <div className="border border-border/80 rounded-lg p-3 bg-muted/20">
                                                <div className="font-semibold text-xs text-foreground flex items-center gap-1.5 mb-1">
                                                    <Shield className="w-3.5 h-3.5 text-primary" />
                                                    Data Resmi
                                                </div>
                                                <p className="text-[11px] text-muted-foreground">Terhubung dengan database fisik, anggaran, & IKU OPD.</p>
                                            </div>
                                            <div className="border border-border/80 rounded-lg p-3 bg-muted/20">
                                                <div className="font-semibold text-xs text-foreground flex items-center gap-1.5 mb-1">
                                                    <FileDown className="w-3.5 h-3.5 text-primary" />
                                                    Ekspor PDF
                                                </div>
                                                <p className="text-[11px] text-muted-foreground">Hasil dapat langsung diunduh menjadi dokumen PDF resmi.</p>
                                            </div>
                                            <div className="border border-border/80 rounded-lg p-3 bg-muted/20">
                                                <div className="font-semibold text-xs text-foreground flex items-center gap-1.5 mb-1">
                                                    <Copy className="w-3.5 h-3.5 text-primary" />
                                                    Mudah Disalin
                                                </div>
                                                <p className="text-[11px] text-muted-foreground">Format narasi formal yang siap disalin ke lembar dinas.</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* ═══ KOLOM KANAN (TAB PILIHAN & FORM PARAMETER EKSEKUSI) ═══ */}
                    <div className="lg:col-span-5 xl:col-span-4 space-y-4">
                        
                        {/* 5 Tab Navigasi Fitur */}
                        <Card className="border-border shadow-xs">
                            <CardHeader className="py-3 px-4 border-b border-border">
                                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Pilih Modul Analisis
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-3 space-y-2">
                                {AI_TABS.map((tab) => {
                                    const Icon = tab.icon;
                                    const isActive = activeTab === tab.id;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={cn(
                                                'w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all duration-150 select-none',
                                                isActive
                                                    ? 'bg-primary text-primary-foreground border-primary shadow-xs ring-1 ring-primary'
                                                    : 'bg-card text-foreground border-border hover:border-primary/50 hover:bg-muted/40'
                                            )}
                                        >
                                            <span className={cn(
                                                'p-2 rounded-lg shrink-0 mt-0.5',
                                                isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                                            )}>
                                                <Icon className="w-4 h-4" />
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-xs leading-snug">{tab.label}</span>
                                                    {isActive && (
                                                        <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
                                                    )}
                                                </div>
                                                <p className={cn(
                                                    'text-[11px] mt-0.5 line-clamp-2',
                                                    isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'
                                                )}>
                                                    {tab.desc}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </CardContent>
                        </Card>

                        {/* Formulir Parameter & Tombol Eksekusi */}
                        <Card className="border-border shadow-xs">
                            <CardHeader className="pb-3 pt-4 px-4 border-b border-border">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-primary" />
                                    <CardTitle className="text-sm font-bold text-foreground">
                                        Parameter: {currentTabInfo.label}
                                    </CardTitle>
                                </div>
                                <CardDescription className="text-xs">
                                    Tentukan batasan data yang akan diolah oleh modul AI.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-4">
                                <form onSubmit={handleGenerate} className="space-y-4">
                                    {/* Pemilihan Periode Evaluasi / Triwulan */}
                                    <div>
                                        <Label htmlFor="period_select" className="text-xs font-semibold text-foreground mb-1 block">
                                            Periode Evaluasi / Triwulan
                                        </Label>
                                        <SelectNative
                                            id="period_select"
                                            value={selectedPeriodId}
                                            onChange={(e) => setSelectedPeriodId(e.target.value)}
                                            className="w-full text-xs"
                                        >
                                            {periods.map((p) => (
                                                <option key={p.id} value={String(p.id)}>
                                                    {p.name} ({p.code})
                                                </option>
                                            ))}
                                        </SelectNative>
                                    </div>

                                    {/* Pemilihan OPD */}
                                    <div>
                                        <Label htmlFor="org_select" className="text-xs font-semibold text-foreground mb-1 block">
                                            Lingkup Perangkat Daerah (OPD)
                                        </Label>
                                        <SelectNative
                                            id="org_select"
                                            value={selectedOrgId}
                                            onChange={(e) => setSelectedOrgId(e.target.value)}
                                            className="w-full text-xs"
                                        >
                                            <option value="">Semua Unit Kerja (OPD Induk, Sekretariat, dan Bidang)</option>
                                            {organizations.map((org) => (
                                                <option key={org.id} value={String(org.id)}>
                                                    {org.name} ({org.code})
                                                </option>
                                            ))}
                                        </SelectNative>
                                    </div>

                                    {/* Pemilihan Indikator Khusus (Insight / Prediksi) */}
                                    {(activeTab === 'insight' || activeTab === 'prediction') && (
                                        <div>
                                            <Label htmlFor="ind_select" className="text-xs font-semibold text-foreground mb-1 block">
                                                Indikator Kinerja Spesifik (Opsional)
                                            </Label>
                                            <SelectNative
                                                id="ind_select"
                                                value={selectedIndicatorId}
                                                onChange={(e) => setSelectedIndicatorId(e.target.value)}
                                                className="w-full text-xs"
                                            >
                                                <option value="">Seluruh Indikator Kinerja Utama</option>
                                                {indicators.map((ind) => (
                                                    <option key={ind.id} value={String(ind.id)}>
                                                        {ind.code} - {ind.name ?? 'Indikator'}
                                                    </option>
                                                ))}
                                            </SelectNative>
                                        </div>
                                    )}

                                    {/* Tombol Eksekusi Analisis */}
                                    <div className="pt-2">
                                        <Button
                                            type="submit"
                                            disabled={isProcessing}
                                            className="w-full gap-2 text-xs font-bold py-2.5 h-auto bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                                        >
                                            {isProcessing ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Sedang Menganalisis...
                                                </>
                                            ) : (
                                                <>
                                                    <Zap className="w-4 h-4" />
                                                    Jalankan Analisis AI
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>

                        {/* Riwayat Log Aktivitas Analisis AI */}
                        <Card className="border-border shadow-xs">
                            <CardHeader className="py-2.5 px-4 border-b border-border flex flex-row items-center justify-between">
                                <CardTitle className="text-xs font-bold text-foreground">
                                    Riwayat Analisis Terkini
                                </CardTitle>
                                <Badge variant="outline" className="text-[10px]">
                                    {logs.length} Log
                                </Badge>
                            </CardHeader>
                            <div className="divide-y divide-border max-h-56 overflow-y-auto">
                                {logs.length === 0 ? (
                                    <div className="p-4 text-center text-xs text-muted-foreground">
                                        Belum ada riwayat analisis.
                                    </div>
                                ) : (
                                    logs.slice(0, 6).map((log) => (
                                        <div key={log.id} className="p-2.5 text-xs flex items-center justify-between hover:bg-muted/20">
                                            <div className="min-w-0 pr-2">
                                                <div className="font-semibold text-foreground truncate">
                                                    {AI_TABS.find((t) => t.id === log.feature)?.label ?? log.feature}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground">
                                                    {log.created_at ? formatDateTime(log.created_at) : '—'} • {log.user?.name ?? 'Sistem'}
                                                </div>
                                            </div>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    'text-[9px] shrink-0 font-semibold px-1.5 py-0',
                                                    log.status === 'success' || log.status === 'completed'
                                                        ? 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300 border-green-200'
                                                        : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200'
                                                )}
                                            >
                                                {log.status === 'success' || log.status === 'completed' ? 'Berhasil' : 'Gagal'}
                                            </Badge>
                                        </div>
                                    ))
                                )}
                            </div>
                        </Card>

                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
