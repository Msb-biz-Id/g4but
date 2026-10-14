import React, { useState } from 'react';
import { Link } from '@inertiajs/react';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent } from '@/Components/ui/card';
import {
    Activity,
    Coins,
    FileDown,
    FileSpreadsheet,
    Target,
    Building2,
    Info,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';

interface MeasurementNavProps {
    activeTab: 'opd' | 'output' | 'budget';
    userIsSuperAdmin?: boolean;
    canManageAllOpd?: boolean;
    exportPdfUrl?: string | null;
}

export default function MeasurementNav({ activeTab, userIsSuperAdmin, canManageAllOpd, exportPdfUrl }: MeasurementNavProps) {
    const [showGuide, setShowGuide] = useState(false);

    const tabs = [
        {
            id: 'opd',
            label: 'Realisasi Kinerja PD',
            role: 'Masing2 Unit',
            roleTitle: 'Pengampu Modul: OPD / Sekretariat / Bidang',
            href: route('measurement.realization.opd'),
            icon: Building2,
        },
        {
            id: 'output',
            label: 'Monitoring Fisik / Output',
            role: 'Masing2 PD',
            roleTitle: 'Pengampu Modul: Masing-masing Perangkat Daerah',
            href: route('measurement.monitoring.output'),
            icon: Activity,
        },
        {
            id: 'budget',
            label: 'Monitoring Anggaran',
            role: 'Masing2 PD',
            roleTitle: 'Pengampu Modul: Masing-masing Perangkat Daerah',
            href: route('measurement.monitoring.budget'),
            icon: Coins,
        },
    ];

    return (
        <div className="space-y-3 mb-6">
            {/* Top Navigation Tabs & Quick Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-3">
                {/* Horizontal Scrollable Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <Link
                                key={tab.id}
                                href={tab.href}
                                className={`flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
                                    isActive
                                        ? 'bg-primary text-primary-foreground shadow-sm ring-1 ring-primary'
                                        : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                                }`}
                            >
                                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                                <span>{tab.label}</span>
                                <span
                                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium ${
                                        isActive
                                            ? 'bg-primary-foreground/20 text-primary-foreground'
                                            : 'bg-background text-muted-foreground border'
                                    }`}
                                    title={tab.roleTitle}
                                >
                                    {tab.role}
                                </span>
                            </Link>
                        );
                    })}
                </div>

                {/* Right Controls: Panduan & Download PDF */}
                <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0 pt-0.5 sm:pt-0">
                    <button
                        type="button"
                        onClick={() => setShowGuide(!showGuide)}
                        className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md border border-border bg-background text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-1 sm:flex-initial"
                    >
                        <Info className="h-3.5 w-3.5 text-primary" />
                        <span>Panduan Kolom</span>
                        {showGuide ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                        )}
                    </button>

                    {exportPdfUrl && (
                        <a
                            href={exportPdfUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md border border-border bg-background text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors shrink-0 flex-1 sm:flex-initial"
                            title="Download PDF"
                        >
                            <FileDown className="h-3.5 w-3.5" />
                            <span>Download PDF</span>
                        </a>
                    )}
                </div>
            </div>

            {/* Collapsible Guidance & Kriteria Bar */}
            {showGuide && (
                <Card className="bg-muted/30 border border-border/80 shadow-none text-xs animate-in fade-in slide-in-from-top-1 duration-200">
                    <CardContent className="p-3.5 space-y-2.5">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            {/* Legend Blok Warna */}
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-foreground flex items-center gap-1">
                                    <span className="h-2 w-2 rounded-full bg-primary inline-block"></span>
                                    Panduan Pewarnaan Kolom:
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-50 border border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-900 font-medium">
                                    <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                                    <b>Blok Merah:</b> Input Data Master / Target Tahunan
                                </span>
                                {(activeTab === 'output' || activeTab === 'budget') && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 border border-slate-300 text-slate-900 dark:bg-slate-800/80 dark:text-slate-200 dark:border-slate-700 font-medium">
                                        <span className="h-2 w-2 rounded-full bg-slate-500"></span>
                                        <b>Blok Abu-Abu:</b> Target & Realisasi Triwulan (TW I–IV)
                                    </span>
                                )}
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-50 border border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900 font-medium">
                                    <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                                    <b>Blok Kuning:</b> Rumus Capaian (%) & Status Otomatis
                                </span>
                            </div>

                            {/* Legend Kriteria Status */}
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-semibold text-foreground">Kriteria:</span>
                                <Badge variant="outline" className="bg-emerald-100/90 text-emerald-800 border-emerald-300 text-[11px] font-semibold">
                                    🟢 Tercapai (≥ 100%)
                                </Badge>
                                <Badge variant="outline" className="bg-amber-100/90 text-amber-800 border-amber-300 text-[11px] font-semibold">
                                    🟡 Perlu Perhatian (50% - &lt;100%)
                                </Badge>
                                <Badge variant="outline" className="bg-rose-100/90 text-rose-800 border-rose-300 text-[11px] font-semibold">
                                    🔴 Kritis (&lt; 50%)
                                </Badge>
                                <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300 text-[11px] font-semibold">
                                    ⚪ Tidak Dinilai (0/0)
                                </Badge>
                            </div>
                        </div>

                        {/* Panduan Pola Pengukuran & Rumus */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1.5 border-t border-border/40 text-[11px]">
                            <div className="bg-background/80 p-2 rounded border border-border/60">
                                <span className="font-semibold text-foreground">🟢 Pola Positif (Standar):</span>
                                <p className="text-muted-foreground mt-0.5">
                                    Semakin tinggi realisasi semakin baik (cth: IPM, Pertumbuhan Ekonomi, Nilai SAKIP).<br />
                                    <span className="font-mono text-[10px] text-primary">Rumus: (Realisasi / Target) × 100%</span>
                                </p>
                            </div>
                            <div className="bg-background/80 p-2 rounded border border-border/60">
                                <span className="font-semibold text-foreground">🔴 Pola Negatif:</span>
                                <p className="text-muted-foreground mt-0.5">
                                    Semakin rendah realisasi semakin baik (cth: Angka Kemiskinan, Prevalensi Stunting, Pengangguran).<br />
                                    <span className="font-mono text-[10px] text-rose-600 dark:text-rose-400">Rumus: (2 - (Realisasi / Target)) × 100%</span>
                                </p>
                            </div>
                        </div>

                        <p className="text-[11px] text-muted-foreground border-t border-border/40 pt-1.5">
                            💡 <b>Petunjuk Penggunaan:</b> Kolom tabel sebelah kiri dikunci (<i>sticky</i>). Geser tabel secara horizontal untuk memeriksa rincian capaian tahunan atau operasional triwulanan. Gunakan tanda titik <code>.</code> untuk angka desimal (contoh: <code>85.50</code>).
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
