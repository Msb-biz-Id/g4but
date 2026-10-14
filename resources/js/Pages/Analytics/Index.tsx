import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import React, { useMemo, useState } from 'react';
import {
    AlertCircle,
    AlertTriangle,
    ArrowRight,
    ArrowUpDown,
    BarChart3,
    Building2,
    Calendar,
    Check,
    CheckCircle2,
    ClipboardCheck,
    Coins,
    Copy,
    Download,
    FileDown,
    Eye,
    ExternalLink,
    FileCheck2,
    FileSpreadsheet,
    FileText,
    Filter,
    Flame,
    GitFork,
    HelpCircle,
    Layers,
    ListFilter,
    Medal,
    Search,
    ShieldAlert,
    Sparkles,
    Target,
    TrendingUp,
    Trophy,
    X,
} from 'lucide-react';
import { toast } from 'sonner';
import ReactECharts from 'echarts-for-react';
import { formatDate, formatRupiah, formatRupiahCompact } from '@/lib/utils';
import { Select2 } from '@/Components/ui/select2';
import PageHeader from '@/Components/Dashboard/PageHeader';

// --- ECharts Sub-components ---------------------------------------------------

function SakipPemdaDonutChart({ available, missing, percentage }: { available: number; missing: number; percentage: number }) {
    const option = {
        tooltip: {
            trigger: 'item',
            formatter: '{b}: <b>{c}</b> Dokumen ({d}%)',
        },
        legend: {
            bottom: 0,
            itemWidth: 10,
            itemHeight: 10,
            textStyle: { fontSize: 11, color: '#64748b' },
        },
        series: [
            {
                name: 'Kelengkapan SAKIP',
                type: 'pie',
                radius: ['58%', '82%'],
                center: ['50%', '42%'],
                avoidLabelOverlap: false,
                label: {
                    show: true,
                    position: 'center',
                    formatter: () => `{val|${percentage.toFixed(1)}%}\n{lbl|Kelengkapan}`,
                    rich: {
                        val: { fontSize: 17, fontWeight: 800, color: '#1e293b', lineHeight: 21 },
                        lbl: { fontSize: 10, color: '#64748b', lineHeight: 14 },
                    },
                },
                data: [
                    { name: 'Tersedia', value: available, itemStyle: { color: '#10b981' } },
                    { name: 'Belum Tersedia', value: missing, itemStyle: { color: '#f43f5e' } },
                ],
            },
        ],
    };

    return (
        <div className="w-full h-44">
            <ReactECharts option={option} style={{ width: '100%', height: '100%' }} opts={{ renderer: 'svg' }} />
        </div>
    );
}

function SakipOpdDonutChart({
    lengkap,
    belumLengkap,
    percentage,
}: {
    lengkap: number;
    belumLengkap: number;
    percentage: number;
}) {
    const option = {
        tooltip: {
            trigger: 'item',
            formatter: '{b}: <b>{c}</b> OPD ({d}%)',
        },
        legend: {
            bottom: 0,
            itemWidth: 10,
            itemHeight: 10,
            textStyle: { fontSize: 11, color: '#64748b' },
        },
        series: [
            {
                name: 'Kelengkapan SAKIP OPD',
                type: 'pie',
                radius: ['58%', '82%'],
                center: ['50%', '42%'],
                avoidLabelOverlap: false,
                label: {
                    show: true,
                    position: 'center',
                    formatter: () => `{val|${percentage.toFixed(1)}%}\n{lbl|OPD Lengkap}`,
                    rich: {
                        val: { fontSize: 17, fontWeight: 800, color: '#1e293b', lineHeight: 21 },
                        lbl: { fontSize: 10, color: '#64748b', lineHeight: 14 },
                    },
                },
                data: [
                    { name: 'OPD Lengkap', value: lengkap, itemStyle: { color: '#10b981' } },
                    { name: 'Belum Lengkap', value: belumLengkap, itemStyle: { color: '#f59e0b' } },
                ],
            },
        ],
    };

    return (
        <div className="w-full h-44">
            <ReactECharts option={option} style={{ width: '100%', height: '100%' }} opts={{ renderer: 'svg' }} />
        </div>
    );
}

function IkuAnalyticsTrendChart({ trend }: { trend: Array<{ tahun: number; target?: number; capaian: number | null; status: string; tercapai?: number; perhatian?: number; kritis?: number }> }) {
    const years = trend.map((t) => t.tahun);
    const capaian = trend.map((t) => t.capaian);

    const option = {
        tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            borderColor: '#334155',
            textStyle: { color: '#ffffff', fontSize: 11 },
            formatter: (params: any) => {
                const item = params[0];
                if (!item) return '';
                const d = trend[item.dataIndex];
                const val = item.value !== null && item.value !== undefined ? `${item.value}%` : '-';
                return `
                    <div style="font-weight: bold; margin-bottom: 4px; border-bottom: 1px solid #475569; padding-bottom: 2px;">Tahun ${item.name}</div>
                    <div style="display:flex; justify-content:space-between; gap:12px;"><span>Rata-rata Capaian:</span><b>${val}</b></div>
                    <div style="display:flex; justify-content:space-between; gap:12px;"><span>Status:</span><b>${d?.status ?? '-'}</b></div>
                    <div style="margin-top: 4px; padding-top: 4px; border-top: 1px dashed #475569; font-size: 10px;">
                        <div>🟢 Tercapai: <b>${d?.tercapai ?? 0}</b></div>
                        <div>🟡 Perlu Perhatian: <b>${d?.perhatian ?? 0}</b></div>
                        <div>🔴 Kritis: <b>${d?.kritis ?? 0}</b></div>
                    </div>
                `;
            },
        },
        legend: { bottom: 0, textStyle: { fontSize: 11, color: '#64748b' } },
        grid: { top: 20, bottom: 28, left: 10, right: 20, containLabel: true },
        xAxis: { type: 'category', data: years, axisLabel: { fontWeight: 'bold' } },
        yAxis: { type: 'value', min: 0, max: 120, splitLine: { lineStyle: { type: 'dashed' } }, axisLabel: { formatter: '{value}%' } },
        series: [
            {
                name: 'Rata-rata Capaian Kinerja Unit Kerja (%)',
                type: 'line',
                data: capaian,
                lineStyle: { color: '#2563eb', width: 3 },
                itemStyle: { color: '#1d4ed8' },
                symbolSize: 7,
                areaStyle: { color: 'rgba(37, 99, 235, 0.15)' },
                smooth: true,
            },
        ],
    };

    return (
        <div className="w-full h-48">
            <ReactECharts option={option} style={{ width: '100%', height: '100%' }} opts={{ renderer: 'svg' }} />
        </div>
    );
}

function OpdPerformanceTrendChart({ trend }: { trend: Array<{ tahun: number; rata_capaian: number; target: number }> }) {
    const years = trend.map((t) => t.tahun);
    const capaian = trend.map((t) => t.rata_capaian);

    const option = {
        tooltip: { trigger: 'axis', backgroundColor: 'rgba(15, 23, 42, 0.95)', textStyle: { color: '#ffffff', fontSize: 11 } },
        grid: { top: 20, bottom: 25, left: 10, right: 20, containLabel: true },
        xAxis: { type: 'category', data: years, axisLabel: { fontWeight: 'bold' } },
        yAxis: { type: 'value', min: 70, max: 110, splitLine: { lineStyle: { type: 'dashed' } }, axisLabel: { formatter: '{value}%' } },
        series: [
            { name: 'Rata-rata Capaian OPD (%)', type: 'bar', barWidth: 32, data: capaian, itemStyle: { color: '#0ea5e9', borderRadius: [4, 4, 0, 0] } },
        ],
    };

    return (
        <div className="w-full h-44">
            <ReactECharts option={option} style={{ width: '100%', height: '100%' }} opts={{ renderer: 'svg' }} />
        </div>
    );
}

function SakipPemdaTrendChart({
    trend,
    evalYear = 2026,
}: {
    trend: Array<{ tahun: number; nilai: number; predikat: string }>;
    evalYear?: number;
}) {
    const { appConfig } = usePage<PageProps>().props;
    const instansiName = appConfig?.instansiName || 'Pemerintah Daerah';
    const years = trend.map((t) => t.tahun);
    const nilai = trend.map((t) => t.nilai);

    const option = {
        tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            borderColor: '#334155',
            textStyle: { color: '#ffffff', fontSize: 11 },
            formatter: (params: any) => {
                const yr = params[0]?.axisValue;
                const point = trend.find((t) => t.tahun === Number(yr));
                let html = `<div style="font-weight:700;margin-bottom:4px;border-bottom:1px solid #334155;padding-bottom:3px">SAKIP ${instansiName} - Tahun ${yr}</div>`;
                if (point) {
                    html += `<div style="display:flex;justify-content:space-between;gap:12px"><span>Nilai SAKIP:</span><b style="color:#10b981">${point.nilai.toFixed(2)}</b></div>`;
                    html += `<div style="display:flex;justify-content:space-between;gap:12px"><span>Predikat:</span><b>${point.predikat}</b></div>`;
                }
                return html;
            },
        },
        grid: { top: 25, bottom: 25, left: 10, right: 20, containLabel: true },
        xAxis: { type: 'category', data: years, axisLabel: { fontWeight: 'bold' } },
        yAxis: { type: 'value', min: 70, max: 100, splitLine: { lineStyle: { type: 'dashed' } } },
        series: [
            {
                name: 'Nilai SAKIP OPD',
                type: 'line',
                data: nilai,
                lineStyle: { color: '#10b981', width: 3 },
                itemStyle: { color: '#059669' },
                symbolSize: 8,
                areaStyle: { color: 'rgba(16, 185, 129, 0.15)' },
                markLine: {
                    symbol: 'none',
                    data: [{ yAxis: 80, lineStyle: { color: '#10b981', type: 'dotted' }, label: { formatter: 'Batas BAIK (80)', position: 'insideEndTop' } }],
                },
            },
        ],
    };

    return (
        <div className="w-full h-44">
            <ReactECharts option={option} style={{ width: '100%', height: '100%' }} opts={{ renderer: 'svg' }} />
        </div>
    );
}

function SakipEvalTrendChart({ trend }: { trend: Array<{ tahun: number; nilai: number; predikat: string }> }) {
    const years = trend.map((t) => t.tahun);
    const nilai = trend.map((t) => t.nilai);

    const option = {
        tooltip: { trigger: 'axis', backgroundColor: 'rgba(15, 23, 42, 0.95)', textStyle: { color: '#ffffff', fontSize: 11 } },
        grid: { top: 20, bottom: 25, left: 10, right: 20, containLabel: true },
        xAxis: { type: 'category', data: years, axisLabel: { fontWeight: 'bold' } },
        yAxis: { type: 'value', min: 60, max: 100, splitLine: { lineStyle: { type: 'dashed' } } },
        series: [
            { name: 'Nilai Rata-rata SAKIP', type: 'line', data: nilai, lineStyle: { color: '#8b5cf6', width: 3 }, itemStyle: { color: '#6d28d9' }, symbolSize: 7, areaStyle: { color: 'rgba(139, 92, 246, 0.15)' } },
        ],
    };

    return (
        <div className="w-full h-44">
            <ReactECharts option={option} style={{ width: '100%', height: '100%' }} opts={{ renderer: 'svg' }} />
        </div>
    );
}

function PkoPemdaTrendChart({
    trend,
    evalYear = new Date().getFullYear(),
}: {
    trend: Array<{ tahun: number; nilai: number | null; predikat: string; tren?: string }>;
    evalYear?: number;
}) {
    const { appConfig } = usePage<PageProps>().props;
    const instansiName = appConfig?.instansiName || 'Pemerintah Daerah';
    // Hanya tampilkan tahun yang memiliki data riil (tahun masa depan yang belum ada tidak diplot)
    const validTrend = trend.filter((t) => t.nilai !== null && t.nilai !== undefined);
    const years = validTrend.map((t) => t.tahun);
    const nilai = validTrend.map((t) => t.nilai);

    const option = {
        tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            borderColor: '#334155',
            textStyle: { color: '#ffffff', fontSize: 11 },
            formatter: (params: any) => {
                const yr = params[0]?.axisValue;
                const point = trend.find((t) => t.tahun === Number(yr));
                let html = `<div style="font-weight:700;margin-bottom:4px;border-bottom:1px solid #334155;padding-bottom:3px">PKO ${instansiName} - Tahun ${yr}</div>`;
                if (point && point.nilai !== null && point.nilai !== undefined) {
                    html += `<div style="display:flex;justify-content:space-between;gap:12px"><span>Nilai PKO:</span><b>${point.nilai.toFixed(2)}</b></div>`;
                    html += `<div style="display:flex;justify-content:space-between;gap:12px"><span>Predikat:</span><b>${point.predikat}</b></div>`;
                    if (point.tren && point.tren !== '-') html += `<div style="display:flex;justify-content:space-between;gap:12px"><span>Tren:</span><b>${point.tren}</b></div>`;
                }
                return html;
            },
        },
        grid: { top: 32, bottom: 25, left: 15, right: 25, containLabel: true },
        xAxis: {
            type: 'category',
            data: years,
            axisLabel: { fontWeight: 'bold', fontSize: 12, color: '#334155' },
            axisTick: { alignWithLabel: true },
        },
        yAxis: {
            type: 'value',
            min: (val: any) => Math.max(0, Math.floor((val.min || 70) / 10) * 10 - 10),
            max: 110,
            splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } },
            axisLabel: { formatter: '{value}' },
        },
        series: [
            {
                name: 'Nilai PKO OPD',
                type: 'bar',
                barWidth: 38,
                data: nilai,
                itemStyle: {
                    color: (params: any) => {
                        const yr = years[params.dataIndex];
                        return yr === evalYear ? '#d97706' : '#f59e0b';
                    },
                    borderRadius: [6, 6, 0, 0],
                },
                label: {
                    show: true,
                    position: 'top',
                    formatter: (p: any) => (p.value !== null && p.value !== undefined ? Number(p.value).toFixed(2) : ''),
                    fontWeight: 'bold',
                    fontSize: 11,
                    color: '#92400e',
                },
            },
            {
                name: 'Garis Tren',
                type: 'line',
                data: nilai,
                smooth: true,
                lineStyle: { color: '#b45309', width: 2.5 },
                symbol: 'circle',
                symbolSize: 8,
                itemStyle: { color: '#92400e', borderColor: '#ffffff', borderWidth: 2 },
            },
        ],
    };

    return (
        <div className="w-full h-56">
            <ReactECharts option={option} style={{ width: '100%', height: '100%' }} opts={{ renderer: 'svg' }} />
        </div>
    );
}

function PkoOpdRankingBarChart({
    rows,
}: {
    rows: Array<{
        peringkat: number;
        perangkat_daerah: string;
        nilai_pko: number;
        predikat: string;
    }>;
}) {
    const sorted = [...rows].sort((a, b) => a.peringkat - b.peringkat);
    const reversed = [...sorted].reverse();
    const names = reversed.map((r) => {
        const shortName = r.perangkat_daerah.length > 26 ? r.perangkat_daerah.substring(0, 24) + '...' : r.perangkat_daerah;
        return `#${r.peringkat} ${shortName}`;
    });

    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            borderColor: '#334155',
            textStyle: { color: '#ffffff', fontSize: 11 },
            formatter: (params: any) => {
                const idx = params[0]?.dataIndex;
                const item = reversed[idx];
                if (!item) return '';
                return `
                    <div style="font-weight:700;margin-bottom:4px;border-bottom:1px solid #334155;padding-bottom:3px">${item.perangkat_daerah}</div>
                    <div style="display:flex;justify-content:space-between;gap:14px"><span>Peringkat:</span><b>Peringkat #${item.peringkat}</b></div>
                    <div style="display:flex;justify-content:space-between;gap:14px"><span>Nilai PKO:</span><b>${item.nilai_pko.toFixed(2)}</b></div>
                    <div style="display:flex;justify-content:space-between;gap:14px"><span>Predikat:</span><b>${item.predikat}</b></div>
                `;
            },
        },
        grid: { top: 20, bottom: 20, left: 10, right: 40, containLabel: true },
        xAxis: {
            type: 'value',
            min: 0,
            max: 110,
            splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } },
            axisLabel: { fontSize: 10 },
        },
        yAxis: {
            type: 'category',
            data: names,
            axisLabel: { fontSize: 11, fontWeight: 'bold', color: '#334155' },
        },
        series: [
            {
                name: 'Nilai PKO',
                type: 'bar',
                barWidth: 16,
                data: reversed.map((r) => ({
                    value: r.nilai_pko,
                    itemStyle: {
                        color:
                            r.nilai_pko > 100
                                ? '#2563eb' // ISTIMEWA (Biru)
                                : r.nilai_pko > 80
                                ? '#16a34a' // BAIK (Hijau)
                                : r.nilai_pko > 60
                                ? '#eab308' // BUTUH PERBAIKAN (Kuning/Amber)
                                : r.nilai_pko > 20
                                ? '#f97316' // KURANG (Oranye)
                                : '#dc2626', // SANGAT KURANG (Merah)
                        borderRadius: [0, 4, 4, 0],
                    },
                })),
                label: {
                    show: true,
                    position: 'right',
                    formatter: '{c}',
                    fontWeight: 'bold',
                    fontSize: 11,
                    color: '#334155',
                },
            },
        ],
    };

    const chartHeight = Math.max(220, Math.min(reversed.length * 28 + 40, 480));

    return (
        <div className="w-full" style={{ height: `${chartHeight}px` }}>
            <ReactECharts option={option} style={{ width: '100%', height: '100%' }} opts={{ renderer: 'svg' }} />
        </div>
    );
}

function KeteranganPenilaianPkoAkip({ title = 'Keterangan Penilaian Predikat Kinerja Organisasi (PKO / NKO)' }: { title?: string }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                        <Trophy className="h-4 w-4" />
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                            {title}
                        </h4>
                        <p className="text-[11px] text-slate-500">
                            Pedoman Klasifikasi Predikat Nilai Kinerja Organisasi (NKO / PKO) Berdasarkan Standar PermenPANRB No. 22/2024
                        </p>
                    </div>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    Standar Resmi KemenPAN-RB
                </span>
            </div>

            {/* TABEL PREDIKAT PKO SESUAI GAMBAR */}
            <div className="rounded-lg border border-slate-200 dark:border-slate-700/80 overflow-hidden bg-slate-50/40 dark:bg-slate-800/40">
                <div className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-800 dark:text-white flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                        Tabel Klasifikasi Predikat Nilai Kinerja Organisasi (NKO)
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Skala Evaluasi Kinerja</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/80 text-[11px] text-slate-600 dark:text-slate-300 font-bold">
                                <th className="px-4 py-2.5 text-center w-52 border-r border-slate-200 dark:border-slate-700">Rentang Nilai Kinerja (NKO)</th>
                                <th className="px-4 py-2.5 text-center w-36 border-r border-slate-200 dark:border-slate-700">Predikat PKO</th>
                                <th className="px-4 py-2.5 text-left">Keterangan Evaluasi Capaian Kinerja</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-[11.5px]">
                            <tr className="bg-white dark:bg-slate-900 hover:bg-blue-50/30 transition">
                                <td className="px-4 py-2 text-center font-mono font-bold text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-700">
                                    X &gt; 100% (hingga 110%)
                                </td>
                                <td className="px-4 py-2 text-center border-r border-slate-200 dark:border-slate-700">
                                    <span className="inline-flex items-center justify-center w-full max-w-[190px] py-1 rounded text-xs font-black bg-blue-600 text-white tracking-wider shadow-xs">
                                        ISTIMEWA
                                    </span>
                                </td>
                                <td className="px-4 py-2 text-slate-600 dark:text-slate-400 font-medium">
                                    Istimewa (Pencapaian kinerja melampaui target yang telah diperjanjikan)
                                </td>
                            </tr>
                            <tr className="bg-white dark:bg-slate-900 hover:bg-emerald-50/30 transition">
                                <td className="px-4 py-2 text-center font-mono font-bold text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-700">
                                    80% &lt; X &le; 100%
                                </td>
                                <td className="px-4 py-2 text-center border-r border-slate-200 dark:border-slate-700">
                                    <span className="inline-flex items-center justify-center w-full max-w-[190px] py-1 rounded text-xs font-black bg-emerald-600 text-white tracking-wider shadow-xs">
                                        BAIK
                                    </span>
                                </td>
                                <td className="px-4 py-2 text-slate-600 dark:text-slate-400 font-medium">
                                    Baik (Pencapaian kinerja memenuhi target perjanjian kinerja secara optimal)
                                </td>
                            </tr>
                            <tr className="bg-white dark:bg-slate-900 hover:bg-yellow-50/40 transition">
                                <td className="px-4 py-2 text-center font-mono font-bold text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-700">
                                    60% &lt; X &le; 80%
                                </td>
                                <td className="px-4 py-2 text-center border-r border-slate-200 dark:border-slate-700">
                                    <span className="inline-flex items-center justify-center w-full max-w-[190px] py-1 rounded text-xs font-black bg-amber-400 text-slate-950 tracking-wider shadow-xs">
                                        BUTUH PERBAIKAN
                                    </span>
                                </td>
                                <td className="px-4 py-2 text-slate-600 dark:text-slate-400 font-medium">
                                    Butuh Perbaikan (Pencapaian kinerja memerlukan langkah akselerasi dan perbaikan)
                                </td>
                            </tr>
                            <tr className="bg-white dark:bg-slate-900 hover:bg-orange-50/30 transition">
                                <td className="px-4 py-2 text-center font-mono font-bold text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-700">
                                    20% &lt; X &le; 60%
                                </td>
                                <td className="px-4 py-2 text-center border-r border-slate-200 dark:border-slate-700">
                                    <span className="inline-flex items-center justify-center w-full max-w-[190px] py-1 rounded text-xs font-black bg-orange-500 text-white tracking-wider shadow-xs">
                                        KURANG
                                    </span>
                                </td>
                                <td className="px-4 py-2 text-slate-600 dark:text-slate-400 font-medium">
                                    Kurang (Pencapaian di bawah standar target minimal dan perlu pembinaan intensif)
                                </td>
                            </tr>
                            <tr className="bg-white dark:bg-slate-900 hover:bg-rose-50/30 transition">
                                <td className="px-4 py-2 text-center font-mono font-bold text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-700">
                                    0% &le; X &le; 20% <span className="text-[10px] text-slate-400 font-sans block">atau Capaian Minus (&lt;0)</span>
                                </td>
                                <td className="px-4 py-2 text-center border-r border-slate-200 dark:border-slate-700">
                                    <span className="inline-flex items-center justify-center w-full max-w-[190px] py-1 rounded text-xs font-black bg-rose-700 text-white tracking-wider shadow-xs">
                                        SANGAT KURANG
                                    </span>
                                </td>
                                <td className="px-4 py-2 text-slate-600 dark:text-slate-400 font-medium">
                                    Sangat Kurang (Pencapaian kinerja sangat rendah atau realisasi tidak tercapai)
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* FORMULA & ATURAN TEKNIS PERHITUNGAN PKO */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 space-y-1.5">
                <p className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-blue-600" />
                    <span>Alur Rumus Perhitungan Nilai Kinerja Organisasi (NKO):</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[10.5px]">
                    <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                        <span className="text-blue-600 font-bold block">1. Capaian PK &amp; Normalisasi</span>
                        <span className="text-slate-700 dark:text-slate-300">Normalisasi = min(Capaian PK, 110%)</span>
                    </div>
                    <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                        <span className="text-emerald-600 font-bold block">2. NKO / Nilai PKO</span>
                        <span className="text-slate-700 dark:text-slate-300">NKO = &Sigma; Nilai Capaian &divide; Jumlah Indikator</span>
                    </div>
                    <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                        <span className="text-purple-600 font-bold block">3. Penetapan Predikat</span>
                        <span className="text-slate-700 dark:text-slate-300">Dikelompokkan ke 5 Predikat PKO (ISTIMEWA, BAIK, BUTUH PERBAIKAN, KURANG, SANGAT KURANG) di atas</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function KeteranganPenilaianSakip({ title = 'Keterangan Klasifikasi Predikat & Rentang Nilai SAKIP' }: { title?: string }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
                        <Medal className="h-4 w-4" />
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                            {title}
                        </h4>
                        <p className="text-[11px] text-slate-500">
                            Pedoman Klasifikasi Predikat Nilai Akuntabilitas Kinerja Instansi Pemerintah (SAKIP) Berdasarkan Standar PermenPANRB No. 88/2021
                        </p>
                    </div>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    Standar Resmi KemenPAN-RB
                </span>
            </div>

            <div className="rounded-lg border border-slate-200 dark:border-slate-700/80 overflow-hidden bg-slate-50/40 dark:bg-slate-800/40">
                <div className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-800 dark:text-white flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                        Tabel Klasifikasi Predikat Mutu Akuntabilitas Kinerja (SAKIP)
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Skala Evaluasi SAKIP (0–100 Poin)</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/80 text-[11px] text-slate-600 dark:text-slate-300 font-bold">
                                <th className="px-4 py-2.5 text-center w-52 border-r border-slate-200 dark:border-slate-700">Rentang Nilai SAKIP</th>
                                <th className="px-4 py-2.5 text-center w-36 border-r border-slate-200 dark:border-slate-700">Predikat SAKIP</th>
                                <th className="px-4 py-2.5 text-left">Kategori / Keterangan Mutu Akuntabilitas</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-[11.5px]">
                            <tr className="bg-white dark:bg-slate-900 hover:bg-emerald-50/30 transition">
                                <td className="px-4 py-2 text-center font-mono font-bold text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-700">
                                    Nilai &gt; 90 hingga 100
                                </td>
                                <td className="px-4 py-2 text-center border-r border-slate-200 dark:border-slate-700">
                                    <span className="inline-flex items-center justify-center w-full max-w-[190px] py-1 rounded text-xs font-black bg-emerald-700 text-white tracking-wider shadow-xs">
                                        AA
                                    </span>
                                </td>
                                <td className="px-4 py-2 text-slate-600 dark:text-slate-400 font-medium">
                                    Sangat Memuaskan (Implementasi SAKIP berkinerja unggul dan menjadi rujukan nasional)
                                </td>
                            </tr>
                            <tr className="bg-white dark:bg-slate-900 hover:bg-emerald-50/30 transition">
                                <td className="px-4 py-2 text-center font-mono font-bold text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-700">
                                    Nilai &gt; 80 hingga 90
                                </td>
                                <td className="px-4 py-2 text-center border-r border-slate-200 dark:border-slate-700">
                                    <span className="inline-flex items-center justify-center w-full max-w-[190px] py-1 rounded text-xs font-black bg-emerald-600 text-white tracking-wider shadow-xs">
                                        A
                                    </span>
                                </td>
                                <td className="px-4 py-2 text-slate-600 dark:text-slate-400 font-medium">
                                    Memuaskan (Implementasi SAKIP sangat baik dan memiliki sistem manajemen kinerja andal)
                                </td>
                            </tr>
                            <tr className="bg-white dark:bg-slate-900 hover:bg-blue-50/30 transition">
                                <td className="px-4 py-2 text-center font-mono font-bold text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-700">
                                    Nilai &gt; 70 hingga 80
                                </td>
                                <td className="px-4 py-2 text-center border-r border-slate-200 dark:border-slate-700">
                                    <span className="inline-flex items-center justify-center w-full max-w-[190px] py-1 rounded text-xs font-black bg-blue-600 text-white tracking-wider shadow-xs">
                                        BB
                                    </span>
                                </td>
                                <td className="px-4 py-2 text-slate-600 dark:text-slate-400 font-medium">
                                    Sangat Baik (Implementasi SAKIP baik dan telah akuntabel dalam pengelolaan kinerja)
                                </td>
                            </tr>
                            <tr className="bg-white dark:bg-slate-900 hover:bg-sky-50/30 transition">
                                <td className="px-4 py-2 text-center font-mono font-bold text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-700">
                                    Nilai &gt; 60 hingga 70
                                </td>
                                <td className="px-4 py-2 text-center border-r border-slate-200 dark:border-slate-700">
                                    <span className="inline-flex items-center justify-center w-full max-w-[190px] py-1 rounded text-xs font-black bg-sky-600 text-white tracking-wider shadow-xs">
                                        B
                                    </span>
                                </td>
                                <td className="px-4 py-2 text-slate-600 dark:text-slate-400 font-medium">
                                    Baik (Implementasi SAKIP memadai dan memerlukan perbaikan bertahap)
                                </td>
                            </tr>
                            <tr className="bg-white dark:bg-slate-900 hover:bg-yellow-50/40 transition">
                                <td className="px-4 py-2 text-center font-mono font-bold text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-700">
                                    Nilai &gt; 50 hingga 60
                                </td>
                                <td className="px-4 py-2 text-center border-r border-slate-200 dark:border-slate-700">
                                    <span className="inline-flex items-center justify-center w-full max-w-[190px] py-1 rounded text-xs font-black bg-amber-400 text-slate-950 tracking-wider shadow-xs">
                                        CC
                                    </span>
                                </td>
                                <td className="px-4 py-2 text-slate-600 dark:text-slate-400 font-medium">
                                    Cukup / Memadai (Implementasi SAKIP cukup namun perlu banyak perbaikan sistemik)
                                </td>
                            </tr>
                            <tr className="bg-white dark:bg-slate-900 hover:bg-orange-50/30 transition">
                                <td className="px-4 py-2 text-center font-mono font-bold text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-700">
                                    Nilai &gt; 30 hingga 50
                                </td>
                                <td className="px-4 py-2 text-center border-r border-slate-200 dark:border-slate-700">
                                    <span className="inline-flex items-center justify-center w-full max-w-[190px] py-1 rounded text-xs font-black bg-orange-500 text-white tracking-wider shadow-xs">
                                        C
                                    </span>
                                </td>
                                <td className="px-4 py-2 text-slate-600 dark:text-slate-400 font-medium">
                                    Kurang (Implementasi SAKIP belum memadai dan perlu pendampingan mendalam)
                                </td>
                            </tr>
                            <tr className="bg-white dark:bg-slate-900 hover:bg-rose-50/30 transition">
                                <td className="px-4 py-2 text-center font-mono font-bold text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-700">
                                    Nilai 0 hingga 30 <span className="text-[10px] text-slate-400 font-sans block">atau Capaian Minus (&lt;0)</span>
                                </td>
                                <td className="px-4 py-2 text-center border-r border-slate-200 dark:border-slate-700">
                                    <span className="inline-flex items-center justify-center w-full max-w-[190px] py-1 rounded text-xs font-black bg-rose-700 text-white tracking-wider shadow-xs">
                                        D
                                    </span>
                                </td>
                                <td className="px-4 py-2 text-slate-600 dark:text-slate-400 font-medium">
                                    Sangat Kurang (Implementasi SAKIP sangat minim dan memerlukan reformasi menyeluruh)
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 space-y-1.5">
                <p className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-purple-600" />
                    <span>Komponen &amp; Bobot Penilaian SAKIP (PermenPANRB No. 88/2021):</span>
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[10.5px]">
                    <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                        <span className="text-purple-600 font-bold block">1. Perencanaan</span>
                        <span className="text-slate-700 dark:text-slate-300">Bobot: 30 Poin</span>
                    </div>
                    <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                        <span className="text-blue-600 font-bold block">2. Pengukuran</span>
                        <span className="text-slate-700 dark:text-slate-300">Bobot: 30 Poin</span>
                    </div>
                    <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                        <span className="text-emerald-600 font-bold block">3. Pelaporan</span>
                        <span className="text-slate-700 dark:text-slate-300">Bobot: 15 Poin</span>
                    </div>
                    <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                        <span className="text-amber-600 font-bold block">4. Evaluasi Internal</span>
                        <span className="text-slate-700 dark:text-slate-300">Bobot: 25 Poin</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ActionPlansQuarterChart({ trend }: { trend: Array<{ triwulan: string; capaian: number | null; status: string }> }) {
    const tws = trend.map((t) => t.triwulan);
    const capaian = trend.map((t) => t.capaian ?? null);

    const option = {
        tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            textStyle: { color: '#ffffff', fontSize: 11 },
            formatter: (params: any) => {
                const item = trend[params[0]?.dataIndex];
                if (!item) return '';
                return `
                    <div style="font-weight:700;margin-bottom:4px;">${item.triwulan}</div>
                    <div>Capaian: <b>${item.capaian != null ? item.capaian.toFixed(1) + '%' : '-'}</b></div>
                    <div>Status: <b>${item.status}</b></div>
                `;
            },
        },
        grid: { top: 20, bottom: 25, left: 10, right: 20, containLabel: true },
        xAxis: { type: 'category', data: tws, axisLabel: { fontWeight: 'bold' } },
        yAxis: { type: 'value', min: 0, max: 120, splitLine: { lineStyle: { type: 'dashed' } }, axisLabel: { formatter: '{value}%' } },
        series: [
            { name: 'Capaian TW (%)', type: 'line', data: capaian, lineStyle: { color: '#10b981', width: 3 }, itemStyle: { color: '#047857' }, symbolSize: 7, areaStyle: { color: 'rgba(16, 185, 129, 0.15)' } },
        ],
    };

    return (
        <div className="w-full h-44">
            <ReactECharts option={option} style={{ width: '100%', height: '100%' }} opts={{ renderer: 'svg' }} />
        </div>
    );
}

function ActionPlansOpdRankingBarChart({
    rows,
    triwulan,
}: {
    rows: Array<{ opd: string; capaian: number | null; status: string; target_tw: number | null; realisasi_tw: number | null; is_overachieved?: boolean }>;
    triwulan: string;
}) {
    // Reverse rows so highest rank is at top in category yAxis
    const reversed = [...rows].reverse();
    const opdNames = reversed.map((r) => (r.opd.length > 28 ? r.opd.substring(0, 26) + '...' : r.opd));
    const capaian = reversed.map((r) => r.capaian ?? 0);
    const statusColors = reversed.map((r) => {
        if (r.capaian === null || r.capaian === undefined) return '#94a3b8'; // Tidak Dinilai (Slate)
        if (r.capaian < 50) return '#f43f5e'; // Kritis / Sangat Kurang (Rose)
        if (r.capaian < 80) return '#f97316'; // Terlambat (Orange)
        if (r.capaian < 100) return '#f59e0b'; // Perlu Perhatian (Amber)
        return '#10b981'; // Tercapai (Emerald)
    });

    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            borderColor: '#334155',
            textStyle: { color: '#ffffff', fontSize: 11 },
            formatter: (params: any) => {
                const idx = params[0]?.dataIndex;
                const item = reversed[idx];
                if (!item) return '';
                const targetStr = item.target_tw != null ? item.target_tw.toFixed(2) : '-';
                const realStr = item.realisasi_tw != null ? item.realisasi_tw.toFixed(2) : '-';
                const capStr = item.capaian != null ? `${item.capaian.toFixed(2)}%${item.is_overachieved ? '*' : ''}` : '-';
                return `
                    <div style="font-weight:700;margin-bottom:4px;border-bottom:1px solid #334155;padding-bottom:3px">${item.opd}</div>
                    <div style="display:flex;justify-content:space-between;gap:16px;margin:2px 0;"><span>Target ${triwulan}:</span><b>${targetStr}</b></div>
                    <div style="display:flex;justify-content:space-between;gap:16px;margin:2px 0;"><span>Realisasi ${triwulan}:</span><b>${realStr}</b></div>
                    <div style="display:flex;justify-content:space-between;gap:16px;margin:2px 0;"><span>Capaian ${triwulan}:</span><b style="color:${statusColors[idx]}">${capStr}</b></div>
                    <div style="display:flex;justify-content:space-between;gap:16px;margin:2px 0;"><span>Status:</span><b>${item.status}</b></div>
                `;
            },
        },
        grid: { top: 15, bottom: 20, left: 10, right: 45, containLabel: true },
        xAxis: {
            type: 'value',
            max: 120,
            axisLabel: { formatter: '{value}%', fontSize: 10 },
            splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } },
        },
        yAxis: {
            type: 'category',
            data: opdNames,
            axisLabel: { fontSize: 10, color: '#334155' },
        },
        series: [
            {
                name: 'Capaian ' + triwulan,
                type: 'bar',
                barWidth: 16,
                data: capaian.map((val, idx) => ({
                    value: val,
                    itemStyle: { color: statusColors[idx], borderRadius: [0, 4, 4, 0] },
                })),
                label: {
                    show: true,
                    position: 'right',
                    formatter: (p: any) => {
                        const itm = reversed[p.dataIndex];
                        if (itm?.capaian == null) return '-';
                        return `${itm.capaian.toFixed(1)}%${itm?.is_overachieved ? '*' : ''}`;
                    },
                    fontSize: 10,
                    fontWeight: 600,
                    color: '#475569',
                },
                markLine: {
                    data: [{ xAxis: 100, name: 'Target 100%' }],
                    lineStyle: { color: '#059669', type: 'dashed', width: 1.5 },
                    label: { formatter: 'Target 100%', position: 'end', fontSize: 9, color: '#059669' },
                },
            },
        ],
    };

    return (
        <div className="w-full h-80">
            <ReactECharts option={option} style={{ width: '100%', height: '100%' }} opts={{ renderer: 'svg' }} />
        </div>
    );
}

function BudgetQuarterChart({ trend }: { trend: Array<{ triwulan: string; serapan: number | null; capaian?: number | null; pagu?: number; realisasi?: number; status?: string }> }) {
    const tws = trend.map((t) => t.triwulan);
    const serapan = trend.map((t) => t.serapan ?? t.capaian ?? null);

    const option = {
        tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            textStyle: { color: '#ffffff', fontSize: 11 },
            formatter: (params: any) => {
                const item = trend[params[0]?.dataIndex];
                if (!item) return '';
                const valStr = item.serapan != null ? `${item.serapan.toFixed(1)}%` : (item.capaian != null ? `${item.capaian.toFixed(1)}%` : '-');
                const paguStr = item.pagu != null && item.pagu > 0 ? formatRupiahCompact(item.pagu) : '-';
                const realStr = item.realisasi != null && item.realisasi > 0 ? formatRupiahCompact(item.realisasi) : '-';
                return `
                    <div style="font-weight:700;margin-bottom:4px;">${item.triwulan}</div>
                    <div style="display:flex;justify-content:space-between;gap:16px;margin:2px 0;"><span>Pagu:</span><b>${paguStr}</b></div>
                    <div style="display:flex;justify-content:space-between;gap:16px;margin:2px 0;"><span>Realisasi:</span><b>${realStr}</b></div>
                    <div style="display:flex;justify-content:space-between;gap:16px;margin:2px 0;"><span>Serapan:</span><b>${valStr}</b></div>
                    <div>Status: <b>${item.status ?? '-'}</b></div>
                `;
            },
        },
        grid: { top: 20, bottom: 25, left: 10, right: 20, containLabel: true },
        xAxis: { type: 'category', data: tws, axisLabel: { fontWeight: 'bold' } },
        yAxis: { type: 'value', min: 0, max: 120, splitLine: { lineStyle: { type: 'dashed' } }, axisLabel: { formatter: '{value}%' } },
        series: [
            { name: 'Serapan TW (%)', type: 'line', data: serapan, lineStyle: { color: '#059669', width: 3 }, itemStyle: { color: '#047857' }, symbolSize: 7, areaStyle: { color: 'rgba(5, 150, 105, 0.15)' } },
        ],
    };

    return (
        <div className="w-full h-44">
            <ReactECharts option={option} style={{ width: '100%', height: '100%' }} opts={{ renderer: 'svg' }} />
        </div>
    );
}

function BudgetOpdRankingBarChart({
    rows,
    triwulan,
}: {
    rows: Array<{ opd: string; serapan: number | null; capaian?: number | null; status?: string; pagu_tw: number; realisasi_tw: number; is_overachieved?: boolean }>;
    triwulan: string;
}) {
    const reversed = [...rows].reverse();
    const opdNames = reversed.map((r) => (r.opd.length > 28 ? r.opd.substring(0, 26) + '...' : r.opd));
    const serapan = reversed.map((r) => r.serapan ?? r.capaian ?? 0);
    const statusColors = reversed.map((r) => {
        const val = r.serapan ?? r.capaian;
        if (val === null || val === undefined) return '#94a3b8';
        if (val < 50) return '#f43f5e';
        if (val < 80) return '#f97316';
        if (val < 100) return '#f59e0b';
        return '#10b981';
    });

    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            borderColor: '#334155',
            textStyle: { color: '#ffffff', fontSize: 11 },
            formatter: (params: any) => {
                const idx = params[0]?.dataIndex;
                const item = reversed[idx];
                if (!item) return '';
                const val = item.serapan ?? item.capaian;
                const paguStr = item.pagu_tw > 0 ? formatRupiahCompact(item.pagu_tw) : '-';
                const realStr = item.realisasi_tw > 0 ? formatRupiahCompact(item.realisasi_tw) : '-';
                const serapanStr = val != null ? `${val.toFixed(2)}%${item.is_overachieved ? '*' : ''}` : '-';
                return `
                    <div style="font-weight:700;margin-bottom:4px;border-bottom:1px solid #334155;padding-bottom:3px">${item.opd}</div>
                    <div style="display:flex;justify-content:space-between;gap:16px;margin:2px 0;"><span>Pagu ${triwulan}:</span><b>${paguStr}</b></div>
                    <div style="display:flex;justify-content:space-between;gap:16px;margin:2px 0;"><span>Realisasi ${triwulan}:</span><b>${realStr}</b></div>
                    <div style="display:flex;justify-content:space-between;gap:16px;margin:2px 0;"><span>Serapan ${triwulan}:</span><b style="color:${statusColors[idx]}">${serapanStr}</b></div>
                    <div style="display:flex;justify-content:space-between;gap:16px;margin:2px 0;"><span>Status:</span><b>${item.status ?? '-'}</b></div>
                `;
            },
        },
        grid: { top: 15, bottom: 20, left: 10, right: 45, containLabel: true },
        xAxis: {
            type: 'value',
            max: 120,
            axisLabel: { formatter: '{value}%', fontSize: 10 },
            splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } },
        },
        yAxis: {
            type: 'category',
            data: opdNames,
            axisLabel: { fontSize: 10, color: '#334155' },
        },
        series: [
            {
                name: 'Serapan ' + triwulan,
                type: 'bar',
                barWidth: 16,
                data: serapan.map((val, idx) => ({
                    value: val,
                    itemStyle: { color: statusColors[idx], borderRadius: [0, 4, 4, 0] },
                })),
                label: {
                    show: true,
                    position: 'right',
                    formatter: (p: any) => {
                        const itm = reversed[p.dataIndex];
                        const val = itm?.serapan ?? itm?.capaian;
                        if (val == null) return '-';
                        return `${val.toFixed(1)}%${itm?.is_overachieved ? '*' : ''}`;
                    },
                    fontSize: 10,
                    fontWeight: 600,
                    color: '#475569',
                },
                markLine: {
                    data: [{ xAxis: 100, name: 'Target 100%' }],
                    lineStyle: { color: '#059669', type: 'dashed', width: 1.5 },
                    label: { formatter: 'Target 100%', position: 'end', fontSize: 9, color: '#059669' },
                },
            },
        ],
    };

    return (
        <div className="w-full h-80">
            <ReactECharts option={option} style={{ width: '100%', height: '100%' }} opts={{ renderer: 'svg' }} />
        </div>
    );
}

function RiskDistributionDonutChart({ tinggi, sedang, rendah }: { tinggi: number; sedang: number; rendah: number }) {
    const option = {
        tooltip: { trigger: 'item', formatter: '{b}: <b>{c}</b> OPD ({d}%)' },
        legend: { bottom: 0, textStyle: { fontSize: 11, color: '#64748b' } },
        series: [
            {
                name: 'Peta Risiko OPD',
                type: 'pie',
                radius: ['52%', '78%'],
                center: ['50%', '42%'],
                data: [
                    { name: 'Risiko Tinggi', value: tinggi, itemStyle: { color: '#f43f5e' } },
                    { name: 'Risiko Sedang', value: sedang, itemStyle: { color: '#f59e0b' } },
                    { name: 'Risiko Rendah', value: rendah, itemStyle: { color: '#10b981' } },
                ],
            },
        ],
    };

    return (
        <div className="w-full h-44">
            <ReactECharts option={option} style={{ width: '100%', height: '100%' }} opts={{ renderer: 'svg' }} />
        </div>
    );
}

// --- Komponen Pencarian Langsung di Atas Tabel --------------------------------
interface TableSearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    inputClassName?: string;
}

function TableSearchInput({
    value,
    onChange,
    placeholder = 'Pencarian dalam tabel...',
    className = 'w-48 sm:w-64',
    inputClassName = '',
}: TableSearchInputProps) {
    return (
        <div className={`relative ${className}`}>
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={`w-full pl-8 pr-7 py-1 text-xs rounded-lg border border-slate-300 bg-white shadow-2xs focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-white placeholder:text-slate-400 transition ${inputClassName}`}
            />
            {value && (
                <button
                    type="button"
                    onClick={() => onChange('')}
                    className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                    title="Hapus pencarian"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            )}
        </div>
    );
}

// --- TypeScript Interfaces ---------------------------------------------------

export interface IkuPemdaRow {
    no: number;
    id: number;
    code: string;
    sasaran: string;
    indikator: string;
    satuan: string;
    karakter: string;
    polarization: string;
    target: number | null;
    realisasi: number | null;
    capaian: number | null;
    status: string;
    predikat: string;
    badge: string;
    color: string;
    bgClass: string;
    tren: string;
    opd_pengampu: string;
    yearly: Record<number, {
        year: number;
        target: number | null;
        realization: number | null;
        achievement: number | null;
        status: string;
        predikat: string;
        badge: string;
    }>;
}

export interface IkuPemdaMatrixData {
    summary: {
        total_iku: number;
        tercapai: number;
        perlu_perhatian: number;
        terlambat?: number;
        kritis: number;
        tidak_dinilai?: number;
        rata_capaian: number;
        evaluation_year: number;
    };
    rows: IkuPemdaRow[];
    trend: Array<{
        tahun: number;
        capaian: number | null;
        tercapai: number;
        perhatian: number;
        kritis?: number;
        status: string;
    }>;
    years: number[];
}

export interface OpdRankingRow {
    id: number;
    kode: string;
    perangkat_daerah: string;
    jumlah_indikator: number;
    rata_capaian: number;
    tercapai: number;
    perhatian: number;
    terlambat?: number;
    kritis: number;
    tidak_dinilai?: number;
    status: string;
    predikat: string;
    badge: string;
    bgClass: string;
    rank: number;
    yearly?: Record<number, {
        year: number;
        capaian: number;
        status: string;
        predikat: string;
        badge: string;
        bgClass: string;
    }>;
    tren?: string;
    drilldown: {
        opd: string;
        kode: string;
        indikator: Array<{
            id: number;
            code: string;
            nama: string;
            sasaran: string;
            satuan: string;
            polarization: string;
            target: number | null;
            realisasi: number | null;
            capaian: number | null;
            status: string;
            predikat?: string;
            badge: string;
            bgClass: string;
            penyebab_merah?: string | null;
        }>;
        programs: Array<{
            kode: string;
            nama: string;
            kegiatan: Array<{
                kode: string;
                nama: string;
                subkegiatan: Array<{
                    kode: string;
                    nama: string;
                    deskripsi?: string;
                }>;
            }>;
        }>;
        sasaran_hierarki?: Array<{
            sasaran: string;
            indikator: Array<{
                id: number;
                code: string;
                nama: string;
                sasaran: string;
                satuan: string;
                polarization: string;
                target: number | null;
                realisasi: number | null;
                capaian: number | null;
                status: string;
                predikat?: string;
                badge: string;
                bgClass: string;
                penyebab_merah?: string | null;
            }>;
            programs: Array<{
                kode: string;
                nama: string;
                kegiatan: Array<{
                    kode: string;
                    nama: string;
                    subkegiatan: Array<{
                        kode: string;
                        nama: string;
                        deskripsi?: string;
                    }>;
                }>;
            }>;
        }>;
    };
}

export interface OpdRankingMatrixData {
    summary: {
        total_opd: number;
        rata_capaian: number;
        tercapai: number;
        perlu_perhatian: number;
        terlambat?: number;
        kritis: number;
        tidak_dinilai?: number;
    };
    rows: OpdRankingRow[];
    trend: Array<{ tahun: number; rata_capaian: number; target: number }>;
    years: number[];
}

export interface SakipPemdaData {
    tahun: number;
    organization_id?: number;
    organization_code?: string;
    organization_name?: string;
    perencanaan: number;
    pengukuran: number;
    pelaporan: number;
    evaluasi_internal: number;
    nilai: number;
    predikat: string;
    status_evaluasi?: string;
    lhe_file_path?: string | null;
    lhe_file_url?: string | null;
    lhe: {
        nomor_lhe: string;
        tanggal: string;
        evaluator: string;
        catatan: string;
        rekomendasi: string;
        status_dokumen: string;
    };
    komponen: Array<{
        no: number;
        komponen: string;
        bobot: number;
        nilai: number;
        persen: number;
        predikat: string;
        deskripsi: string;
    }>;
    trend: Array<{
        tahun: number;
        nilai: number;
        predikat: string;
    }>;
    years?: number[];
}

export interface SakipEvalMatrixData {
    summary: {
        opd_dievaluasi: number;
        rata_rata_nilai: number;
        predikat_AA?: number;
        predikat_A?: number;
        predikat_BB?: number;
        predikat_B?: number;
        predikat_CC?: number;
        predikat_C?: number;
        predikat_D?: number;
        predikat_ISTIMEWA?: number;
        predikat_BAIK?: number;
        predikat_BUTUH_PERBAIKAN?: number;
        predikat_KURANG?: number;
        predikat_SANGAT_KURANG?: number;
        predikat_CC_bawah?: number;
    };
    rows: Array<{
        no: number;
        organization_id: number;
        kode: string;
        perangkat_daerah: string;
        perencanaan: number;
        pengukuran: number;
        pelaporan: number;
        evaluasi_internal: number;
        nilai: number;
        predikat: string;
        lhe: {
            nomor_lhe: string;
            tanggal: string;
            evaluator: string;
            catatan: string;
            rekomendasi: string;
            status_dokumen: string;
        };
        yearly?: Record<number, {
            year: number;
            nilai: number;
            predikat: string;
        }>;
        tren?: string;
    }>;
    trend: Array<{ tahun: number; nilai: number; predikat: string }>;
    years?: number[];
    pemda?: SakipPemdaData;
}

export interface PkoMatrixData {
    years?: number[];
    pemda_pko: {
        tahun: number;
        nilai: number | null;
        predikat: string;
        trend: Array<{ tahun: number; nilai: number | null; predikat: string; tren?: string; keterangan?: string }>;
    };
    opd_pko: {
        total_opd: number;
        attention_count?: number;
        rows: Array<{
            organization_id: number;
            kode: string;
            perangkat_daerah: string;
            capaian_kinerja: number;
            predikat_sakip: string;
            koreksi_akip: string;
            nilai_pko: number;
            predikat: string;
            peringkat: number;
            kategori: string;
            yearly?: Record<number, {
                year: number;
                nilai: number | null;
                predikat: string;
            }>;
            tren?: string;
        }>;
        top_10: any[];
        attention_10: any[];
    };
}

export interface MonitoringBudgetMatrixData {
    summary: {
        tahun: number;
        triwulan: string;
        total_opd: number;
        total_items: number;
        total_pagu: number;
        total_realisasi: number;
        serapan_persen: number;
        rata_capaian?: number;
        opd_summary?: {
            tercapai: number;
            perlu_perhatian: number;
            kritis: number;
            tidak_dinilai: number;
            rata_capaian: number;
        };
        status_counts?: {
            tercapai: number;
            perlu_perhatian: number;
            kritis: number;
            tidak_dinilai: number;
        };
    };
    opd_rows: Array<{
        no: number;
        organization_id: number;
        kode: string;
        opd: string;
        items_count: number;
        pagu_tw: number;
        realisasi_tw: number;
        serapan: number | null;
        capaian?: number | null;
        status?: string;
        predikat?: string;
        badge?: string;
        bgClass?: string;
        is_overachieved?: boolean;
        tren?: string;
        quarterly?: Record<string, { pagu?: number; realisasi?: number; serapan: number | null; capaian?: number | null; status: string }>;
        items?: Array<{
            id: number;
            kode: string;
            program?: string;
            kegiatan?: string;
            subkegiatan: string;
            indikator_subkegiatan: string;
            pagu_tw: number;
            realisasi_tw: number;
            serapan: number | null;
            status?: string;
            predikat?: string;
            badge?: string;
        }>;
        plans?: Array<any>;
    }>;
    rows: Array<{
        no: number;
        id: number;
        organization_id: number;
        kode: string;
        perangkat_daerah: string;
        program: string;
        kegiatan: string;
        subkegiatan: string;
        indikator_subkegiatan: string;
        pagu_tw: number;
        realisasi_tw: number;
        serapan: number | null;
        capaian?: number | null;
        status?: string;
        predikat?: string;
        badge?: string;
        bgClass?: string;
    }>;
    trend: Array<{ triwulan: string; pagu: number; realisasi: number; serapan: number | null; capaian?: number | null; status?: string }>;
    quarters?: string[];
}

export interface ActionPlansMatrixData {
    summary: {
        tahun: number;
        triwulan: string;
        total_opd?: number;
        total_renaksi: number;
        tercapai: number;
        perlu_perhatian: number;
        terlambat?: number;
        kritis: number;
        tidak_dinilai?: number;
        rata_capaian: number;
        opd_summary?: {
            tercapai: number;
            perlu_perhatian: number;
            terlambat?: number;
            kritis: number;
            tidak_dinilai?: number;
            rata_capaian: number;
        };
    };
    opd_rows?: Array<{
        no: number;
        organization_id: number;
        kode: string;
        opd: string;
        target_tw: number;
        realisasi_tw: number;
        capaian: number;
        status: string;
        predikat: string;
        badge: string;
        bgClass: string;
        is_overachieved: boolean;
        tren: string;
        quarterly: Record<string, { capaian: number; status: string }>;
        plans_count: number;
        plans: Array<{
            id: number;
            kode: string;
            judul: string;
            target: number;
            realisasi: number;
            capaian: number;
            status: string;
            predikat: string;
            badge: string;
        }>;
    }>;
    rows: Array<{
        no: number;
        id: number;
        kode: string;
        perangkat_daerah: string;
        organization_id: number;
        rencana_aksi: string;
        target_tw: number;
        realisasi_tw: number;
        capaian: number;
        status: string;
        predikat: string;
        badge: string;
        bgClass: string;
    }>;
    trend: Array<{ triwulan: string; target: number; realisasi: number; capaian: number; status: string }>;
    quarters?: string[];
}

export interface RiskMapMatrixData {
    summary: {
        total_opd: number;
        risiko_tinggi: number;
        risiko_sedang: number;
        risiko_rendah: number;
        critical_iku_count: number;
        low_cap_opd_count: number;
        late_renaksi_count: number;
        incomplete_docs_count: number;
        low_sakip_count: number;
    };
    rows: Array<{
        rank: number;
        organization_id: number;
        kode: string;
        perangkat_daerah: string;
        risk_score: number;
        risk_level: string;
        rata_capaian: number;
        sakip_nilai: number;
        sakip_predikat: string;
        dokumen_persen: number;
        risk_factors: Array<{
            category: string;
            detail: string;
            severity: string;
        }>;
        rekomendasi: string[];
    }>;
}

interface TrendPoint {
    period_id?: number;
    period: string;
    start_date?: string;
    end_date?: string;
    evaluated_indicators?: number;
    average_achievement: number;
    realization_count: number;
    status?: string;
}

interface DeviationRow {
    indicator_code: string;
    indicator_name: string;
    organization_code: string;
    organization_name?: string;
    unit?: string;
    period: string;
    value: number;
    target: number | null;
    deviation: number | null;
    achievement: number | null;
    status: string;
}

interface OpdComparison {
    rank: number;
    organization_id: number;
    organization_code: string;
    organization_name: string;
    realization_count: number;
    average_achievement: number | null;
    category: string;
}

interface IkuRow {
    id: number;
    code: string;
    name: string;
    organization_code: string;
    organization_name: string;
    unit: string;
    direction: string;
    period: string;
    target: number | null;
    realization: number | null;
    achievement: number | null;
    status: string;
}

interface HeatmapCell {
    period_id: number;
    period_name: string;
    achievement: number | null;
    status: string;
}

interface HeatmapRow {
    indicator_code: string;
    indicator_name: string;
    cells: HeatmapCell[];
}

interface PemdaDocRow {
    no: number;
    name: string;
    period: string;
    is_available: boolean;
    status: string;
    document_id?: number | null;
    document_title?: string | null;
    document_number?: string | null;
    approved_at?: string | null;
    file_path?: string | null;
    has_file?: boolean;
    download_url?: string | null;
}

interface OpdDocDetail {
    is_available: boolean;
    document_id?: number | null;
    has_file?: boolean;
    file_path?: string | null;
    title?: string | null;
    download_url?: string | null;
}

interface OpdDocRow {
    no: number;
    organization_id: number;
    organization_code: string;
    organization_name: string;
    checks: Record<string, boolean>;
    doc_details?: Record<string, OpdDocDetail>;
    available_count: number;
    missing_count: number;
    total_required: number;
    percentage: number;
    status: string;
}

interface SakipDocsData {
    pemda_summary: {
        total_required: number;
        available: number;
        missing: number;
        percentage: number;
        status: string;
        evaluation_year?: number;
    };
    pemda_rows: PemdaDocRow[];
    opd_summary: {
        total_opd: number;
        opd_lengkap: number;
        opd_belum_lengkap: number;
        pct_lengkap: number;
        missing_docs: number;
    };
    opd_columns: Record<string, string>;
    opd_rows: OpdDocRow[];
}

interface SakipEvalRow {
    no: number;
    organization_id: number;
    organization_code: string;
    organization_name: string;
    perencanaan: number;
    pengukuran: number;
    pelaporan: number;
    evaluasi_internal: number;
    nilai: number;
    predikat: string;
    status_lhe: string;
}

interface PkoRow {
    rank: number;
    organization_id: number;
    organization_code: string;
    organization_name: string;
    nilai_pko: number;
    predikat: string;
    category: string;
}

interface ActionPlanRow {
    no: number;
    id: number;
    title: string;
    organization_code: string;
    organization_name: string;
    target_tw: number;
    realization_tw: number;
    achievement: number;
    status: string;
}

interface Props extends PageProps {
    filters: { indicator_id?: string; organization_id?: string; year?: number; triwulan?: string; status?: string };
    trend: TrendPoint[];
    deviation: DeviationRow[];
    opd_comparison: OpdComparison[];
    iku_analysis: IkuRow[];
    heatmap: { periods: Array<{ id: number; name: string }>; rows: HeatmapRow[] };
    sakip_docs: SakipDocsData;
    sakip_pemda_matrix?: SakipPemdaData;
    sakip_evaluations: SakipEvalRow[];
    sakip_eval_matrix?: SakipEvalMatrixData;
    pko_analysis: PkoRow[];
    pko_matrix?: PkoMatrixData;
    action_plans: ActionPlanRow[];
    action_plans_matrix?: ActionPlansMatrixData;
    monitoring_budget_matrix?: MonitoringBudgetMatrixData;
    iku_pemda_matrix?: IkuPemdaMatrixData;
    opd_ranking_matrix?: OpdRankingMatrixData;
    risk_map_matrix?: RiskMapMatrixData;
    indicators: Array<{ id: number; code: string; is_iku: boolean; current_version: { name: string } | null }>;
    organizations: Array<{ id: number; code: string; name: string }>;
    available_years?: number[];
}

// --- Submodule Tabs (Lengkap sesuai file DASHBOARD ANALITIK.docx Baris 1 s/d 6) -
type Tab =
    | 'sakip_docs'
    | 'iku'
    | 'opd'
    | 'sakip_pemda'
    | 'sakip_eval'
    | 'pko'
    | 'action_plans'
    | 'monitoring_budget'
    | 'risk_map'
    | 'trend'
    | 'deviation'
    | 'heatmap';

const TABS: { id: Tab; label: string; subLabel: string; icon: React.ElementType; rowBadge?: string }[] = [
    { id: 'sakip_docs',        label: 'Kelengkapan SAKIP',     subLabel: '12 Dokumen SAKIP',           icon: FileCheck2,    rowBadge: 'Baris 1' },
    { id: 'opd',               label: 'Capaian Kinerja Unit',  subLabel: 'Ranking & Pohon Kinerja',    icon: BarChart3,     rowBadge: 'Baris 2' },
    { id: 'sakip_pemda',       label: 'Nilai SAKIP Dinas',     subLabel: '4 Komponen Akuntabilitas',   icon: Building2,     rowBadge: 'Baris 3' },
    { id: 'sakip_eval',        label: 'Nilai SAKIP Detail',    subLabel: '4 Komponen & Detail LHE',    icon: Medal,         rowBadge: 'Baris 3' },
    { id: 'pko',               label: 'Capaian PKO',           subLabel: 'PKO Dinas & Unit Kerja',     icon: Trophy,        rowBadge: 'Baris 4' },
    { id: 'action_plans',      label: 'Rencana Aksi TW',          subLabel: 'Realisasi Fisik Triwulanan', icon: Target,        rowBadge: 'Baris 5' },
    { id: 'monitoring_budget', label: 'Rencana Aksi Anggaran TW', subLabel: 'Serapan Keuangan Triwulan',  icon: Coins,         rowBadge: 'Baris 5' },
    { id: 'risk_map',          label: 'Peta Risiko / EWS',        subLabel: 'Peringatan Dini Terpadu',    icon: ShieldAlert,   rowBadge: 'Baris 6' },
    { id: 'trend',             label: 'Analisis Tren',         subLabel: 'Capaian Deret Waktu',        icon: TrendingUp },
    { id: 'deviation',         label: 'Analisis Deviasi',      subLabel: 'Target vs Realisasi',        icon: ArrowUpDown },
    { id: 'heatmap',           label: 'Heatmap Kinerja',       subLabel: 'Matriks Visualisasi',        icon: Flame },
];

export default function AnalyticsIndex({
    filters,
    trend,
    deviation,
    opd_comparison,
    iku_analysis,
    heatmap,
    sakip_docs,
    sakip_pemda_matrix,
    sakip_evaluations,
    sakip_eval_matrix,
    pko_analysis,
    pko_matrix,
    action_plans,
    action_plans_matrix,
    monitoring_budget_matrix,
    iku_pemda_matrix,
    opd_ranking_matrix,
    risk_map_matrix,
    indicators,
    organizations,
    available_years,
}: Props) {
    const { appConfig } = usePage<PageProps>().props;
    const appName = appConfig?.appName || 'e-SAKIP';
    const instansiName = appConfig?.instansiName || 'Pemerintah Daerah';
    const orgName = appConfig?.organizationName || 'Biro Organisasi Sekretariat Daerah';
    const currentYear = appConfig?.currentYear || 2026;
    const activePeriodRange = appConfig?.activePeriodRange || '2025–2029';

    const [activeTab, setActiveTab] = useState<Tab>(() => {
        if (typeof window !== 'undefined') {
            const tabParam = new URLSearchParams(window.location.search).get('tab') as Tab | null;
            if (tabParam && TABS.map((t) => t.id).includes(tabParam)) {
                return tabParam;
            }
        }
        return 'sakip_docs';
    });

    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            const tabParam = new URLSearchParams(window.location.search).get('tab') as Tab | null;
            if (tabParam && TABS.map((t) => t.id).includes(tabParam)) {
                setActiveTab(tabParam);
            }
        }
    }, []);

    const [evalYear, setEvalYear] = useState<number>(() => {
        return sakip_docs.pemda_summary.evaluation_year ?? (filters.year ? Number(filters.year) : 2026);
    });
    const [indicatorId, setIndicatorId] = useState(filters.indicator_id ?? '');
    const [organizationId, setOrganizationId] = useState(filters.organization_id ?? '');
    const [searchQuery, setSearchQuery] = useState('');
    const [copied, setCopied] = useState(false);

    // View toggles
    const [sakipDocView, setSakipDocView] = useState<'pemda' | 'opd'>('opd');

    const [ikuMatrixView, setIkuMatrixView] = useState<'eval_year' | 'trend_5yr'>('eval_year');
    const [ikuFilterStatus, setIkuFilterStatus] = useState<string>('Semua');

    const [opdMatrixView, setOpdMatrixView] = useState<'ranking' | 'trend_5yr'>('ranking');
    const [opdFilterStatus, setOpdFilterStatus] = useState<string>('Semua');

    const [sakipMatrixView, setSakipMatrixView] = useState<'components' | 'trend_5yr'>('components');
    const [sakipFilterPredikat, setSakipFilterPredikat] = useState<string>('Semua');

    const [pkoSubView, setPkoSubView] = useState<'pemda' | 'opd'>('opd');
    const [pkoOpdMatrixView, setPkoOpdMatrixView] = useState<'ranking' | 'trend_5yr'>('ranking');
    const [pkoFilterView, setPkoFilterView] = useState<'all' | 'top' | 'bottom'>('all');

    const [actionPlansTw, setActionPlansTw] = useState<string>(filters.triwulan ?? 'TW II');
    const [actionPlansViewMode, setActionPlansViewMode] = useState<'opd_summary' | 'quarterly_trend' | 'plan_detail'>('opd_summary');
    const [actionPlansStatusFilter, setActionPlansStatusFilter] = useState<string>('Semua');
    const [budgetViewMode, setBudgetViewMode] = useState<'opd_summary' | 'quarterly_trend' | 'plan_detail'>('opd_summary');
    const [budgetFilterStatus, setBudgetFilterStatus] = useState<string>('Semua');
    const [riskFilterLevel, setRiskFilterLevel] = useState<string>('Semua');

    // Modals
    const [selectedOpdForDrilldown, setSelectedOpdForDrilldown] = useState<OpdRankingRow | null>(null);
    const [selectedLhe, setSelectedLhe] = useState<{ opd: string; kode: string; lhe: any; nilai: number; predikat: string } | null>(null);
    const [selectedOpdForPlansModal, setSelectedOpdForPlansModal] = useState<any | null>(null);
    const [selectedOpdForBudgetModal, setSelectedOpdForBudgetModal] = useState<any | null>(null);

    const applyFilter = (newIndicator: string, newOrg: string, newYear?: number) => {
        const y = newYear !== undefined ? newYear : evalYear;
        router.get(
            route('analytics.index'),
            {
                indicator_id: newIndicator || undefined,
                organization_id: newOrg || undefined,
                year: y,
                triwulan: actionPlansTw !== 'TW II' ? actionPlansTw : undefined,
                tab: activeTab,
            },
            { preserveState: true, replace: true, preserveScroll: true }
        );
    };

    const handleYearChange = (newYear: number) => {
        setEvalYear(newYear);
        applyFilter(indicatorId, organizationId, newYear);
    };

    const sakipPemdaData = sakip_pemda_matrix ?? sakip_eval_matrix?.pemda;

    const defaultDynamicYears = useMemo(() => {
        if (available_years && available_years.length > 0) return available_years;
        return [evalYear - 2, evalYear - 1, evalYear, evalYear + 1, evalYear + 2];
    }, [available_years, evalYear]);

    
    const ikuPemdaYears = useMemo(() => {
        return iku_pemda_matrix?.years ?? defaultDynamicYears;
    }, [iku_pemda_matrix?.years, defaultDynamicYears]);

    const opdTrendYears = useMemo(() => {
        return opd_ranking_matrix?.years ?? defaultDynamicYears;
    }, [opd_ranking_matrix?.years, defaultDynamicYears]);

    const sakipTrendYears = useMemo(() => {
        return sakip_eval_matrix?.years ?? defaultDynamicYears;
    }, [sakip_eval_matrix?.years, defaultDynamicYears]);

    const pkoYears = useMemo(() => {
        return pko_matrix?.years ?? defaultDynamicYears;
    }, [pko_matrix?.years, defaultDynamicYears]);

    // -- Filter Data Berdasarkan Pencarian Real-Time ----------------------------

    const filteredTrend = useMemo(() => {
        if (!searchQuery.trim()) return trend;
        const q = searchQuery.toLowerCase();
        return trend.filter((r) => r.period.toLowerCase().includes(q) || (r.status && r.status.toLowerCase().includes(q)));
    }, [trend, searchQuery]);

    const filteredDeviation = useMemo(() => {
        if (!searchQuery.trim()) return deviation;
        const q = searchQuery.toLowerCase();
        return deviation.filter(
            (r) =>
                r.indicator_code.toLowerCase().includes(q) ||
                r.indicator_name.toLowerCase().includes(q) ||
                r.organization_code.toLowerCase().includes(q) ||
                (r.organization_name && r.organization_name.toLowerCase().includes(q)) ||
                r.period.toLowerCase().includes(q) ||
                r.status.toLowerCase().includes(q)
        );
    }, [deviation, searchQuery]);

    const filteredPemdaDocs = useMemo(() => {
        if (!searchQuery.trim()) return sakip_docs.pemda_rows;
        const q = searchQuery.toLowerCase();
        return sakip_docs.pemda_rows.filter((r) => r.name.toLowerCase().includes(q) || r.period.toLowerCase().includes(q) || r.status.toLowerCase().includes(q));
    }, [sakip_docs.pemda_rows, searchQuery]);

    const filteredOpdDocs = useMemo(() => {
        if (!searchQuery.trim()) return sakip_docs.opd_rows;
        const q = searchQuery.toLowerCase();
        return sakip_docs.opd_rows.filter((r) => r.organization_code.toLowerCase().includes(q) || r.organization_name.toLowerCase().includes(q) || r.status.toLowerCase().includes(q));
    }, [sakip_docs.opd_rows, searchQuery]);

    
    
    const filteredIkuPemda = useMemo(() => {
        const source = iku_pemda_matrix?.rows ?? [];
        return source.filter((r) => {
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const match =
                    r.code.toLowerCase().includes(q) ||
                    r.sasaran.toLowerCase().includes(q) ||
                    r.indikator.toLowerCase().includes(q) ||
                    r.opd_pengampu.toLowerCase().includes(q) ||
                    r.karakter.toLowerCase().includes(q);
                if (!match) return false;
            }
            if (ikuFilterStatus && ikuFilterStatus !== 'Semua' && r.status !== ikuFilterStatus) {
                return false;
            }
            return true;
        });
    }, [iku_pemda_matrix?.rows, searchQuery, ikuFilterStatus]);

    const filteredOpdRanking = useMemo(() => {
        const source = opd_ranking_matrix?.rows ?? [];
        return source.filter((r) => {
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const match = r.kode.toLowerCase().includes(q) || r.perangkat_daerah.toLowerCase().includes(q) || r.status.toLowerCase().includes(q);
                if (!match) return false;
            }
            if (opdFilterStatus && opdFilterStatus !== 'Semua' && r.status !== opdFilterStatus) {
                return false;
            }
            return true;
        });
    }, [opd_ranking_matrix?.rows, searchQuery, opdFilterStatus]);

    const filteredSakipEval = useMemo(() => {
        const source = sakip_eval_matrix?.rows ?? [];
        return source.filter((r) => {
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const match = r.kode.toLowerCase().includes(q) || r.perangkat_daerah.toLowerCase().includes(q) || r.predikat.toLowerCase().includes(q);
                if (!match) return false;
            }
            if (sakipFilterPredikat && sakipFilterPredikat !== 'Semua') {
                const sf = sakipFilterPredikat.trim().toUpperCase();
                const rp = (r.predikat || '').trim().toUpperCase();
                if (sf === 'AA') {
                    if (!['AA', 'ISTIMEWA'].includes(rp)) return false;
                } else if (sf === 'A') {
                    if (!['A', 'BAIK'].includes(rp)) return false;
                } else if (sf === 'BB') {
                    if (!['BB', 'BUTUH PERBAIKAN'].includes(rp)) return false;
                } else if (sf === 'B') {
                    if (!['B'].includes(rp)) return false;
                } else if (sf === 'CC') {
                    if (!['CC'].includes(rp)) return false;
                } else if (sf === 'C') {
                    if (!['C', 'KURANG'].includes(rp)) return false;
                } else if (sf === 'D') {
                    if (!['D', 'SANGAT KURANG'].includes(rp)) return false;
                } else if (sf === 'CC_BAWAH') {
                    if (!['CC', 'C', 'D', 'SANGAT KURANG'].includes(rp)) return false;
                } else {
                    if (rp !== sf) return false;
                }
            }
            return true;
        });
    }, [sakip_eval_matrix?.rows, searchQuery, sakipFilterPredikat]);

    const filteredPkoOpd = useMemo(() => {
        const source = pko_matrix?.opd_pko?.rows ?? [];
        let base = source;
        if (pkoFilterView === 'top') {
            base = source.slice(0, 10);
        } else if (pkoFilterView === 'bottom') {
            base = source.slice(-10);
        }
        if (!searchQuery.trim()) return base;
        const q = searchQuery.toLowerCase();
        return base.filter((r) => r.kode.toLowerCase().includes(q) || r.perangkat_daerah.toLowerCase().includes(q) || r.predikat.toLowerCase().includes(q));
    }, [pko_matrix?.opd_pko?.rows, pkoFilterView, searchQuery]);

    const filteredActionPlansOpd = useMemo(() => {
        const source = action_plans_matrix?.opd_rows ?? [];
        return source.filter((r) => {
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const match = r.kode.toLowerCase().includes(q) || r.opd.toLowerCase().includes(q) || r.status.toLowerCase().includes(q) || r.predikat.toLowerCase().includes(q);
                if (!match) return false;
            }
            if (actionPlansStatusFilter && actionPlansStatusFilter !== 'Semua' && r.status !== actionPlansStatusFilter) {
                return false;
            }
            return true;
        });
    }, [action_plans_matrix?.opd_rows, searchQuery, actionPlansStatusFilter]);

    const filteredActionPlans = useMemo(() => {
        const source = action_plans_matrix?.rows ?? [];
        return source.filter((r) => {
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const match = r.kode.toLowerCase().includes(q) || r.perangkat_daerah.toLowerCase().includes(q) || r.rencana_aksi.toLowerCase().includes(q) || r.status.toLowerCase().includes(q);
                if (!match) return false;
            }
            if (actionPlansStatusFilter && actionPlansStatusFilter !== 'Semua' && r.status !== actionPlansStatusFilter) {
                return false;
            }
            return true;
        });
    }, [action_plans_matrix?.rows, searchQuery, actionPlansStatusFilter]);

    const filteredRiskMap = useMemo(() => {
        const source = risk_map_matrix?.rows ?? [];
        return source.filter((r) => {
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const match = r.kode.toLowerCase().includes(q) || r.perangkat_daerah.toLowerCase().includes(q) || r.risk_level.toLowerCase().includes(q);
                if (!match) return false;
            }
            if (riskFilterLevel && riskFilterLevel !== 'Semua' && r.risk_level !== riskFilterLevel) {
                return false;
            }
            return true;
        });
    }, [risk_map_matrix?.rows, searchQuery, riskFilterLevel]);

    const filteredMonitoringBudgetOpd = useMemo(() => {
        let rows = monitoring_budget_matrix?.opd_rows ?? [];
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            rows = rows.filter((r) => r.opd.toLowerCase().includes(q) || r.kode.toLowerCase().includes(q) || (r.status && r.status.toLowerCase().includes(q)));
        }
        if (budgetFilterStatus && budgetFilterStatus !== 'Semua') {
            rows = rows.filter((r) => r.status === budgetFilterStatus);
        }
        return rows;
    }, [monitoring_budget_matrix?.opd_rows, searchQuery, budgetFilterStatus]);

    const filteredMonitoringBudgetRows = useMemo(() => {
        let rows = monitoring_budget_matrix?.rows ?? [];
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            rows = rows.filter(
                (r) =>
                    r.perangkat_daerah.toLowerCase().includes(q) ||
                    r.kode.toLowerCase().includes(q) ||
                    r.subkegiatan.toLowerCase().includes(q) ||
                    r.indikator_subkegiatan.toLowerCase().includes(q) ||
                    (r.status && r.status.toLowerCase().includes(q))
            );
        }
        if (budgetFilterStatus && budgetFilterStatus !== 'Semua') {
            rows = rows.filter((r) => r.status === budgetFilterStatus);
        }
        return rows;
    }, [monitoring_budget_matrix?.rows, searchQuery, budgetFilterStatus]);

    
    // -- Fungsi Salin Data ke Clipboard (Format TSV untuk Excel / Spreadsheet) -
    const handleCopyToClipboard = async () => {
        let tsv = '';

        if (activeTab === 'sakip_docs') {
            if (sakipDocView === 'pemda') {
                const headers = ['No', 'Dokumen Pemerintah Daerah', 'Tahun/Periode', 'Kelengkapan', 'Status'];
                const lines = filteredPemdaDocs.map((r) => [r.no, r.name, r.period, r.is_available ? '✓' : '-', r.status].join('\t'));
                tsv = [headers.join('\t'), ...lines].join('\n');
            } else {
                const colKeys = Object.keys(sakip_docs.opd_columns);
                const colLabels = Object.values(sakip_docs.opd_columns);
                const headers = ['No', 'Kode OPD', 'Perangkat Daerah', ...colLabels, 'Tersedia', 'Total', 'Kelengkapan (%)', 'Status'];
                const lines = filteredOpdDocs.map((r) => {
                    const rowChecks = colKeys.map((k) => (r.checks[k] ? '✓' : '-'));
                    return [r.no, r.organization_code, r.organization_name, ...rowChecks, r.available_count, r.total_required, `${r.percentage}%`, r.status].join('\t');
                });
                tsv = [headers.join('\t'), ...lines].join('\n');
            }
        } else if (activeTab === 'iku') {
            const headers = ['No', 'Sasaran Strategis', 'Indikator IKU OPD', 'Satuan', 'Karakter', `Target (${evalYear})`, `Realisasi (${evalYear})`, `Capaian (%)`, 'Status', 'Predikat', 'OPD Pengampu'];
            const lines = filteredIkuPemda.map((r) => [r.no, r.sasaran, r.indikator, r.satuan, r.karakter, r.target ?? '-', r.realisasi ?? '-', r.capaian !== null ? `${r.capaian}%` : '-', r.status, r.predikat, r.opd_pengampu].join('\t'));
            tsv = [headers.join('\t'), ...lines].join('\n');
        } else if (activeTab === 'opd') {
            if (opdMatrixView === 'ranking') {
                const headers = ['Rank', 'Perangkat Daerah', 'Jumlah Indikator Kinerja', 'Rata-rata Capaian', 'Tercapai', 'Perlu Perhatian', 'Kritis', 'Status'];
                const lines = filteredOpdRanking.map((r) => [r.rank, r.perangkat_daerah, r.jumlah_indikator, `${r.rata_capaian.toFixed(2)}%`, r.tercapai, r.perhatian, r.kritis, r.status].join('\t'));
                tsv = [headers.join('\t'), ...lines].join('\n');
            } else {
                const years = opd_ranking_matrix?.years ?? available_years ?? [evalYear];
                const yearHeaders = years.map((y) => `Capaian ${y} (%)`).join('\t');
                const headers = ['Rank', 'Perangkat Daerah', 'Jumlah Indikator Kinerja', yearHeaders, 'Tren', `Status (${evalYear})`];
                const lines = filteredOpdRanking.map((r) => {
                    const yCols = years.map((y) => (r.yearly && r.yearly[y] ? `${r.yearly[y].capaian.toFixed(2)}%` : '-')).join('\t');
                    return [r.rank, r.perangkat_daerah, r.jumlah_indikator, yCols, r.tren ?? '→', r.status].join('\t');
                });
                tsv = [headers.join('\t'), ...lines].join('\n');
            }
        } else if (activeTab === 'sakip_pemda') {
            const dataPemda = sakipPemdaData;
            const headers = ['No', 'Komponen Akuntabilitas', 'Bobot (%)', 'Nilai Capaian', 'Persentase Capaian (%)', 'Predikat Mutu', 'Deskripsi Komponen'];
            const lines = (dataPemda?.komponen ?? []).map((k) => [
                k.no,
                k.komponen,
                k.bobot.toFixed(1),
                k.nilai.toFixed(2),
                `${k.persen.toFixed(2)}%`,
                k.predikat,
                k.deskripsi,
            ].join('\t'));
            const totalLine = ['', 'TOTAL NILAI SAKIP OPD', '100.0', (dataPemda?.nilai ?? 0.0).toFixed(2), `${(dataPemda?.nilai ?? 0.0).toFixed(2)}%`, dataPemda?.predikat ?? 'BELUM DINILAI', 'Evaluasi Akuntabilitas Kinerja OPD (PermenPANRB 88/2021)'].join('\t');
            tsv = [headers.join('\t'), ...lines, totalLine].join('\n');
        } else if (activeTab === 'sakip_eval') {
            if (sakipMatrixView === 'components') {
                const headers = ['No', 'Kode OPD', 'Perangkat Daerah', 'Perencanaan (30)', 'Pengukuran (30)', 'Pelaporan (15)', 'Evaluasi Internal (25)', 'Nilai SAKIP', 'Predikat', 'Status LHE'];
                const lines = filteredSakipEval.map((r) => [r.no, r.kode, r.perangkat_daerah, r.perencanaan.toFixed(2), r.pengukuran.toFixed(2), r.pelaporan.toFixed(2), r.evaluasi_internal.toFixed(2), r.nilai.toFixed(2), r.predikat, r.lhe?.status_dokumen ?? 'LHE Tersedia'].join('\t'));
                tsv = [headers.join('\t'), ...lines].join('\n');
            } else {
                const years = sakip_eval_matrix?.years ?? available_years ?? [evalYear];
                const yearHeaders = years.map((y) => `Nilai SAKIP ${y}`).join('\t');
                const headers = ['No', 'Kode OPD', 'Perangkat Daerah', yearHeaders, 'Tren', `Nilai (${evalYear})`, `Predikat (${evalYear})`, 'Status LHE'];
                const lines = filteredSakipEval.map((r) => {
                    const yCols = years.map((y) => (r.yearly && r.yearly[y] ? `${r.yearly[y].nilai.toFixed(2)} (${r.yearly[y].predikat})` : '-')).join('\t');
                    return [r.no, r.kode, r.perangkat_daerah, yCols, r.tren ?? '→', r.nilai.toFixed(2), r.predikat, r.lhe?.status_dokumen ?? 'LHE Tersedia'].join('\t');
                });
                tsv = [headers.join('\t'), ...lines].join('\n');
            }
        } else if (activeTab === 'pko') {
            if (pkoSubView === 'pemda') {
                const headers = ['Tahun', 'Nilai', 'Predikat', 'Tren'];
                const lines = (pko_matrix?.pemda_pko?.trend ?? []).map((r) => [
                    r.tahun,
                    r.nilai != null ? r.nilai.toFixed(2) : '-',
                    r.predikat,
                    r.tren ?? '→',
                ].join('\t'));
                tsv = [headers.join('\t'), ...lines].join('\n');
            } else {
                if (pkoOpdMatrixView === 'trend_5yr') {
                    const headers = ['No', 'Perangkat Daerah', ...pkoYears.map(String), 'Tren', `Nilai PKO (${evalYear})`, 'Predikat', 'Peringkat'];
                    const lines = filteredPkoOpd.map((r, i) => [
                        i + 1,
                        r.perangkat_daerah,
                        ...pkoYears.map((yr) => r.yearly?.[yr]?.nilai != null ? r.yearly[yr].nilai.toFixed(2) : '-'),
                        r.tren ?? '→',
                        r.nilai_pko.toFixed(2),
                        r.predikat,
                        r.peringkat,
                    ].join('\t'));
                    tsv = [headers.join('\t'), ...lines].join('\n');
                } else {
                    const headers = ['No', 'Perangkat Daerah', 'Nilai PKO', 'Predikat', 'Peringkat'];
                    const lines = filteredPkoOpd.map((r, i) => [
                        i + 1,
                        r.perangkat_daerah,
                        r.nilai_pko.toFixed(2),
                        r.predikat,
                        r.peringkat,
                    ].join('\t'));
                    tsv = [headers.join('\t'), ...lines].join('\n');
                }
            }
        } else if (activeTab === 'action_plans') {
            if (actionPlansViewMode === 'opd_summary') {
                const headers = ['No', 'Perangkat Daerah', `Target ${actionPlansTw}`, `Realisasi ${actionPlansTw}`, 'Capaian', 'Status', 'Predikat', 'Jml Renaksi'];
                const lines = filteredActionPlansOpd.map((r) => [
                    r.no,
                    r.opd,
                    r.target_tw != null ? r.target_tw.toFixed(2) : '-',
                    r.realisasi_tw != null ? r.realisasi_tw.toFixed(2) : '-',
                    r.capaian != null ? `${r.capaian.toFixed(2)}%${r.is_overachieved ? '*' : ''}` : '-',
                    r.status,
                    r.predikat,
                    r.plans_count,
                ].join('\t'));
                tsv = [headers.join('\t'), ...lines].join('\n');
            } else if (actionPlansViewMode === 'quarterly_trend') {
                const headers = ['No', 'Perangkat Daerah', 'TW I (%)', 'TW II (%)', 'TW III (%)', 'TW IV (%)', 'Tren', `Status (${actionPlansTw})`];
                const lines = filteredActionPlansOpd.map((r) => [
                    r.no,
                    r.opd,
                    r.quarterly?.['TW I']?.capaian != null ? `${r.quarterly['TW I'].capaian.toFixed(1)}%` : '-',
                    r.quarterly?.['TW II']?.capaian != null ? `${r.quarterly['TW II'].capaian.toFixed(1)}%` : '-',
                    r.quarterly?.['TW III']?.capaian != null ? `${r.quarterly['TW III'].capaian.toFixed(1)}%` : '-',
                    r.quarterly?.['TW IV']?.capaian != null ? `${r.quarterly['TW IV'].capaian.toFixed(1)}%` : '-',
                    r.tren ?? '→',
                    r.status,
                ].join('\t'));
                tsv = [headers.join('\t'), ...lines].join('\n');
            } else {
                const headers = ['No', 'Kode OPD', 'Perangkat Daerah', 'Rencana Aksi Kinerja', `Target ${actionPlansTw}`, `Realisasi ${actionPlansTw}`, 'Capaian (%)', 'Status', 'Predikat'];
                const lines = filteredActionPlans.map((r) => [r.no, r.kode, r.perangkat_daerah, r.rencana_aksi, r.target_tw != null ? r.target_tw.toFixed(2) : '-', r.realisasi_tw != null ? r.realisasi_tw.toFixed(2) : '-', r.capaian != null ? `${r.capaian.toFixed(2)}%` : '-', r.status, r.predikat].join('\t'));
                tsv = [headers.join('\t'), ...lines].join('\n');
            }
        } else if (activeTab === 'monitoring_budget') {
            if (budgetViewMode === 'opd_summary') {
                const headers = ['No', 'Perangkat Daerah', `Pagu ${actionPlansTw}`, `Realisasi ${actionPlansTw}`, 'Serapan (%)', 'Status', 'Predikat', 'Jml Subkegiatan'];
                const lines = filteredMonitoringBudgetOpd.map((r) => [
                    r.no,
                    r.opd,
                    r.pagu_tw > 0 ? formatRupiahCompact(r.pagu_tw) : '-',
                    r.realisasi_tw > 0 ? formatRupiahCompact(r.realisasi_tw) : '-',
                    r.serapan != null ? `${r.serapan.toFixed(2)}%${r.is_overachieved ? '*' : ''}` : '-',
                    r.status ?? '-',
                    r.predikat ?? '-',
                    r.items_count,
                ].join('\t'));
                tsv = [headers.join('\t'), ...lines].join('\n');
            } else if (budgetViewMode === 'quarterly_trend') {
                const headers = ['No', 'Perangkat Daerah', 'TW I (%)', 'TW II (%)', 'TW III (%)', 'TW IV (%)', 'Tren', `Status (${actionPlansTw})`];
                const lines = filteredMonitoringBudgetOpd.map((r) => [
                    r.no,
                    r.opd,
                    r.quarterly?.['TW I']?.serapan != null ? `${r.quarterly['TW I'].serapan.toFixed(1)}%` : '-',
                    r.quarterly?.['TW II']?.serapan != null ? `${r.quarterly['TW II'].serapan.toFixed(1)}%` : '-',
                    r.quarterly?.['TW III']?.serapan != null ? `${r.quarterly['TW III'].serapan.toFixed(1)}%` : '-',
                    r.quarterly?.['TW IV']?.serapan != null ? `${r.quarterly['TW IV'].serapan.toFixed(1)}%` : '-',
                    r.tren ?? '→',
                    r.status ?? '-',
                ].join('\t'));
                tsv = [headers.join('\t'), ...lines].join('\n');
            } else {
                const headers = ['No', 'Kode OPD', 'Perangkat Daerah', 'Subkegiatan', 'Indikator Subkegiatan', `Pagu ${actionPlansTw}`, `Realisasi ${actionPlansTw}`, 'Serapan (%)', 'Status', 'Predikat'];
                const lines = filteredMonitoringBudgetRows.map((r) => [
                    r.no,
                    r.kode,
                    r.perangkat_daerah,
                    r.subkegiatan,
                    r.indikator_subkegiatan,
                    r.pagu_tw > 0 ? formatRupiahCompact(r.pagu_tw) : '-',
                    r.realisasi_tw > 0 ? formatRupiahCompact(r.realisasi_tw) : '-',
                    r.serapan != null ? `${r.serapan.toFixed(2)}%` : '-',
                    r.status ?? '-',
                    r.predikat ?? '-',
                ].join('\t'));
                tsv = [headers.join('\t'), ...lines].join('\n');
            }
        } else if (activeTab === 'risk_map') {
            const headers = ['Peringkat Risiko', 'Kode OPD', 'Perangkat Daerah', 'Skor Risiko (0-100)', 'Level Risiko', 'Rata-rata Capaian (%)', 'Nilai SAKIP', 'Kelengkapan Dokumen (%)', 'Rekomendasi Tindak Lanjut'];
            const lines = filteredRiskMap.map((r) => [r.rank, r.kode, r.perangkat_daerah, r.risk_score, r.risk_level, `${r.rata_capaian}%`, r.sakip_nilai, `${r.dokumen_persen}%`, r.rekomendasi.join(' | ')].join('\t'));
            tsv = [headers.join('\t'), ...lines].join('\n');
        } else if (activeTab === 'trend') {
            const headers = ['No', 'Periode', 'Mulai', 'Selesai', 'Jml Indikator', 'Total Realisasi', 'Rata-rata Capaian (%)', 'Status'];
            const lines = filteredTrend.map((r, i) => [i + 1, r.period, formatDate(r.start_date), formatDate(r.end_date), r.evaluated_indicators ?? 0, r.realization_count, `${r.average_achievement}%`, r.status ?? '-'].join('\t'));
            tsv = [headers.join('\t'), ...lines].join('\n');
        } else if (activeTab === 'deviation') {
            const headers = ['No', 'Kode Indikator', 'Nama Indikator', 'Kode OPD', 'Perangkat Daerah', 'Satuan', 'Periode', 'Target', 'Realisasi', 'Deviasi', 'Capaian (%)', 'Status'];
            const lines = filteredDeviation.map((r, i) => [i + 1, r.indicator_code, r.indicator_name, r.organization_code, r.organization_name ?? '-', r.unit ?? '-', r.period, r.target ?? '-', r.value, r.deviation ?? '-', r.achievement !== null ? `${r.achievement}%` : '-', r.status].join('\t'));
            tsv = [headers.join('\t'), ...lines].join('\n');
        } else if (activeTab === 'heatmap') {
            const periodHeaders = heatmap.periods.map((p) => p.name);
            const headers = ['No', 'Kode Indikator', 'Indikator Kinerja', ...periodHeaders];
            const lines = heatmap.rows.map((r, i) => {
                const cellValues = r.cells.map((c) => (c.achievement !== null ? `${c.achievement}%` : '-'));
                return [i + 1, r.indicator_code, r.indicator_name, ...cellValues].join('\t');
            });
            tsv = [headers.join('\t'), ...lines].join('\n');
        }

        try {
            await navigator.clipboard.writeText(tsv);
            setCopied(true);
            toast.success('Data berhasil disalin ke clipboard! Siap di-paste (Ctrl + V) ke Excel.');
            setTimeout(() => setCopied(false), 2500);
        } catch {
            toast.error('Gagal menyalin ke clipboard. Silakan gunakan tombol Download PDF.');
        }
    };

    // -- URL Download PDF ------------------------------------------------------
    const getExportUrl = (customType?: string, customYear?: number) => {
        let exportType = customType ?? activeTab;
        if (!customType) {
            if (activeTab === 'sakip_docs') {
                exportType = sakipDocView === 'pemda' ? ('sakip_docs_pemda' as any) : ('sakip_docs_opd' as any);
            } else if (activeTab === 'pko') {
                exportType = pkoSubView === 'pemda' ? ('pko_pemda' as any) : ('pko_opd' as any);
            } else if (activeTab === 'opd') {
                exportType = 'opd_ranking' as any;
            } else if (activeTab === 'action_plans') {
                exportType = actionPlansViewMode === 'plan_detail' ? ('action_plans_detail' as any) : ('action_plans' as any);
            } else if (activeTab === 'monitoring_budget') {
                exportType = budgetViewMode === 'plan_detail' ? ('monitoring_budget_detail' as any) : ('monitoring_budget' as any);
            }
        }
        const y = customYear !== undefined ? customYear : evalYear;
        const params = new URLSearchParams();
        params.set('type', exportType);
        if (indicatorId) params.set('indicator_id', indicatorId);
        if (organizationId) params.set('organization_id', organizationId);
        params.set('year', String(y));
        if (actionPlansTw) params.set('triwulan', actionPlansTw);
        return `${route('analytics.export-pdf')}?${params.toString()}`;
    };

    const statusBadgeCls = (status?: string | null) => {
        const s = (status || '').toLowerCase().trim();
        // 1. Kritis / Belum Tersedia / Sangat Kurang
        if (s.includes('belum tersedia') || s.includes('kritis') || s.includes('sangat kurang')) {
            return 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60';
        }
        // 2. Belum Lengkap / Perlu Perhatian / Sebagian
        if (s.includes('belum lengkap') || s.includes('perhatian') || s.includes('sebagian')) {
            return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60';
        }
        // 3. Terlambat / Di Bawah Target
        if (s.includes('terlambat') || s.includes('di bawah target')) {
            return 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/60';
        }
        // 4. Tercapai / Lengkap / Tersedia / On Track / Baik / Sangat Baik / Sangat Tinggi
        if ((s.includes('lengkap') && !s.includes('belum')) || s.includes('tercapai') || s.includes('tersedia') || s.includes('on track') || s.includes('sangat baik') || s.includes('baik') || s.includes('sangat tinggi')) {
            return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60';
        }
        // Khusus level risiko (Tinggi -> Rose, Sedang -> Amber, Rendah -> Emerald)
        if (s === 'tinggi' || s === 'risiko tinggi') {
            return 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60';
        }
        if (s === 'sedang' || s === 'risiko sedang') {
            return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60';
        }
        if (s === 'rendah' || s === 'risiko rendah') {
            return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60';
        }
        if (s.includes('kurang')) {
            return 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/60';
        }
        return 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    };

    const predikatBadgeCls = (predikat?: string | null) => {
        const p = (predikat || '').trim().toUpperCase();
        if (p === 'ISTIMEWA') return 'bg-blue-600 text-white border-blue-700 font-bold dark:bg-blue-600 dark:text-white dark:border-blue-500';
        if (p === 'AA') return 'bg-emerald-700 text-white border-emerald-800 font-bold dark:bg-emerald-700 dark:text-white dark:border-emerald-600';
        if (p === 'BAIK' || p === 'A') return 'bg-emerald-600 text-white border-emerald-700 font-bold dark:bg-emerald-600 dark:text-white dark:border-emerald-500';
        if (p === 'BB') return 'bg-blue-600 text-white border-blue-700 font-bold dark:bg-blue-600 dark:text-white dark:border-blue-500';
        if (p === 'B') return 'bg-sky-600 text-white border-sky-700 font-bold dark:bg-sky-600 dark:text-white dark:border-sky-500';
        if (p === 'BUTUH PERBAIKAN') return 'bg-amber-400 text-slate-950 border-amber-500 font-bold dark:bg-amber-400 dark:text-slate-950 dark:border-yellow-300';
        if (p === 'CC' || p === 'CUKUP') return 'bg-amber-400 text-slate-950 border-amber-500 font-bold dark:bg-amber-400 dark:text-slate-950 dark:border-yellow-300';
        if (p === 'KURANG' || p === 'C') return 'bg-orange-500 text-white border-orange-600 font-bold dark:bg-orange-500 dark:text-white dark:border-orange-400';
        if (p === 'SANGAT KURANG' || p === 'D') return 'bg-rose-700 text-white border-rose-800 font-bold dark:bg-rose-700 dark:text-white dark:border-rose-500';
        return 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    };

    return (
        <AuthenticatedLayout>
            <Head title="Dashboard Analitik - Data Real & Workbench Kinerja" />

            <div className="space-y-6">
                {/* --- HEADER UTAMA ---------------------------------------------- */}
                <PageHeader
                    breadcrumbs={[
                        { label: 'Analitik & Evaluasi' },
                        { label: 'Workbench Analitik' },
                    ]}
                    title="Dashboard Analitik Kinerja"
                    description={`Modul Analitik Kinerja ${instansiName} sesuai panduan teknis SAKIP. Salin langsung ke Excel atau unduh berkas laporan PDF.`}
                    badge="Data Real Dinamis SAKIP"
                    actions={
                        <div className="flex flex-wrap items-center gap-2.5">
                            {/* Filter Tahun Utama */}
                            <div className="w-36">
                                <Select2
                                    value={evalYear}
                                    onChange={(val) => handleYearChange(Number(val))}
                                    options={(available_years && available_years.length > 0 ? available_years : [evalYear]).map((y) => ({
                                        value: y,
                                        label: `Tahun ${y}`,
                                    }))}
                                    placeholder="Pilih Tahun"
                                />
                            </div>

                            <button
                                type="button"
                                onClick={handleCopyToClipboard}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer transition"
                            >
                                {copied ? (
                                     <>
                                        <ClipboardCheck className="h-4 w-4 text-emerald-600" />
                                        <span className="text-emerald-600 font-bold">Tersalin!</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="h-4 w-4 text-slate-500" />
                                        <span>Salin Data (Excel)</span>
                                    </>
                                )}
                            </button>

                            <a
                                href={getExportUrl()}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 focus:outline-hidden focus:ring-2 focus:ring-primary cursor-pointer transition"
                                title={`Download PDF Laporan ${activeTab.toUpperCase()} Tahun ${evalYear}`}
                            >
                                <FileDown className="h-4 w-4" />
                                <span>Download PDF</span>
                                <span className="rounded bg-white/20 px-1.5 py-0.2 text-[10px] font-bold tracking-wide">
                                    {evalYear}
                                </span>
                            </a>
                        </div>
                    }
                />

                {/* --- TAB NAVIGATION BAR ---------------------------------------- */}
                <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-t-xl px-2 pt-2 shadow-xs">
                    <div className="flex space-x-1 overflow-x-auto pb-2 scrollbar-thin">
                        {TABS.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        setActiveTab(tab.id);
                                        setSearchQuery('');
                                    }}
                                    className={`group relative flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                                        isActive
                                            ? 'bg-primary text-white shadow-sm'
                                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                                    }`}
                                >
                                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
                                    <div className="text-left">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-semibold">{tab.label}</span>
                                            {tab.rowBadge && (
                                                <span className={`text-[9px] px-1 rounded font-mono ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                                                    {tab.rowBadge}
                                                </span>
                                            )}
                                        </div>
                                        <span className={`block text-[10px] ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>{tab.subLabel}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* --- WORKBENCH CONTENT CONTAINER ------------------------------- */}
                <div className="rounded-b-xl border border-t-0 border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
                    {/* TOOLBAR FILTER & KONTROL EVALUASI */}
                    <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30">
                        {/* Periode Evaluasi Controls */}
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Periode Evaluasi:</span>
                            {/* Year Filter */}
                            <div className="w-36">
                                <Select2
                                    value={evalYear}
                                    onChange={(val) => handleYearChange(Number(val))}
                                    options={(available_years && available_years.length > 0 ? available_years : [evalYear]).map((y) => ({
                                        value: y,
                                        label: `Tahun ${y}`,
                                    }))}
                                    placeholder="Pilih Tahun"
                                />
                            </div>

                            {/* Triwulan selector (khusus tab action_plans) */}
                            {activeTab === 'action_plans' && (
                                <div className="w-32">
                                    <Select2
                                        value={actionPlansTw}
                                        onChange={(val) => setActionPlansTw(val)}
                                        options={[
                                            { value: 'TW I', label: 'TW I' },
                                            { value: 'TW II', label: 'TW II' },
                                            { value: 'TW III', label: 'TW III' },
                                            { value: 'TW IV', label: 'TW IV' },
                                        ]}
                                        placeholder="Pilih TW"
                                    />
                                </div>
                            )}

                            {/* View Switchers based on active tab */}
                            {activeTab === 'sakip_docs' && (
                                <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-800 shadow-2xs">
                                    <button
                                        onClick={() => setSakipDocView('pemda')}
                                        className={`px-3 py-1 text-xs font-semibold rounded-md transition ${sakipDocView === 'pemda' ? 'bg-primary text-white' : 'text-slate-600 hover:text-slate-900'}`}
                                    >
                                        Induk Dinas (13 Dok)
                                    </button>
                                    <button
                                        onClick={() => setSakipDocView('opd')}
                                        className={`px-3 py-1 text-xs font-semibold rounded-md transition ${sakipDocView === 'opd' ? 'bg-primary text-white' : 'text-slate-600 hover:text-slate-900'}`}
                                    >
                                        Unit Kerja (12 Dok)
                                    </button>
                                </div>
                            )}

                            
                            {activeTab === 'opd' && (
                                <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-800 shadow-2xs">
                                    <button
                                        onClick={() => setOpdMatrixView('ranking')}
                                        className={`px-3 py-1 text-xs font-semibold rounded-md transition ${opdMatrixView === 'ranking' ? 'bg-primary text-white' : 'text-slate-600 hover:text-slate-900'}`}
                                    >
                                        Ranking OPD ({evalYear})
                                    </button>
                                    <button
                                        onClick={() => setOpdMatrixView('trend_5yr')}
                                        className={`px-3 py-1 text-xs font-semibold rounded-md transition ${opdMatrixView === 'trend_5yr' ? 'bg-primary text-white' : 'text-slate-600 hover:text-slate-900'}`}
                                    >
                                        Tren 5 Tahun
                                    </button>
                                </div>
                            )}

                            {activeTab === 'pko' && (
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-800 shadow-2xs">
                                        <button
                                            onClick={() => setPkoSubView('pemda')}
                                            className={`px-3 py-1 text-xs font-semibold rounded-md transition ${pkoSubView === 'pemda' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                                        >
                                            <Building2 className="w-3.5 h-3.5 inline mr-1.5" />PKO Dinas PUPR
                                        </button>
                                        <button
                                            onClick={() => setPkoSubView('opd')}
                                            className={`px-3 py-1 text-xs font-semibold rounded-md transition ${pkoSubView === 'opd' ? 'bg-primary text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                                        >
                                            <Layers className="w-3.5 h-3.5 inline mr-1.5" />PKO Bidang &amp; Seksi
                                        </button>
                                    </div>
                                    {pkoSubView === 'opd' && (
                                        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-800 shadow-2xs">
                                            <button
                                                onClick={() => setPkoOpdMatrixView('ranking')}
                                                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${pkoOpdMatrixView === 'ranking' ? 'bg-primary text-white' : 'text-slate-600 hover:text-slate-900'}`}
                                            >
                                                Ranking ({evalYear})
                                            </button>
                                            <button
                                                onClick={() => setPkoOpdMatrixView('trend_5yr')}
                                                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${pkoOpdMatrixView === 'trend_5yr' ? 'bg-primary text-white' : 'text-slate-600 hover:text-slate-900'}`}
                                            >
                                                Tren PKO
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ===============================================================
                        TAB 1: KELENGKAPAN DOKUMEN SAKIP (Baris 1 Panduan)
                    =============================================================== */}
                    {activeTab === 'sakip_docs' && (
                        <div className="p-4 space-y-4">
                            {sakipDocView === 'pemda' ? (
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                                    <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                                        <div className="rounded-lg border border-slate-200 bg-white p-3 text-center dark:border-slate-800 dark:bg-slate-800 shadow-2xs">
                                            <p className="text-[10px] font-semibold text-slate-500 uppercase">Total Dokumen</p>
                                            <p className="text-xl font-black text-slate-800 dark:text-white">{sakip_docs.pemda_summary.total_required}</p>
                                        </div>
                                        <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-center shadow-2xs">
                                            <p className="text-[10px] font-semibold text-emerald-700 uppercase">Dokumen Tersedia</p>
                                            <p className="text-xl font-black text-emerald-800">{sakip_docs.pemda_summary.available}</p>
                                        </div>
                                        <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-3 text-center shadow-2xs">
                                            <p className="text-[10px] font-semibold text-rose-700 uppercase">Belum Tersedia</p>
                                            <p className="text-xl font-black text-rose-800">{sakip_docs.pemda_summary.missing}</p>
                                        </div>
                                        <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 text-center shadow-2xs">
                                            <p className="text-[10px] font-semibold text-blue-700 uppercase">Kelengkapan</p>
                                            <p className="text-xl font-black text-blue-800">{sakip_docs.pemda_summary.percentage}%</p>
                                        </div>
                                        <div className="rounded-lg border border-slate-200 bg-white p-3 text-center dark:border-slate-800 dark:bg-slate-800 shadow-2xs col-span-2 sm:col-span-1">
                                            <p className="text-[10px] font-semibold text-slate-500 uppercase">Status</p>
                                            <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${statusBadgeCls(sakip_docs.pemda_summary.status)}`}>
                                                {sakip_docs.pemda_summary.status}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="md:col-span-4 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-800 p-3 flex flex-col items-center justify-center shadow-2xs">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">Grafik Proporsi Dokumen</p>
                                        <SakipPemdaDonutChart
                                            available={sakip_docs.pemda_summary.available}
                                            missing={sakip_docs.pemda_summary.missing}
                                            percentage={sakip_docs.pemda_summary.percentage}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                                    <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                                        <div className="rounded-lg border border-slate-200 bg-white p-3 text-center dark:border-slate-800 dark:bg-slate-800 shadow-2xs">
                                            <p className="text-[10px] font-semibold text-slate-500 uppercase">Total Perangkat Daerah</p>
                                            <p className="text-xl font-black text-slate-800 dark:text-white">{sakip_docs.opd_summary.total_opd} OPD</p>
                                        </div>
                                        <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-center shadow-2xs">
                                            <p className="text-[10px] font-semibold text-emerald-700 uppercase">OPD Lengkap</p>
                                            <p className="text-xl font-black text-emerald-800">{sakip_docs.opd_summary.opd_lengkap} OPD</p>
                                        </div>
                                        <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-center shadow-2xs">
                                            <p className="text-[10px] font-semibold text-amber-700 uppercase">OPD Belum Lengkap</p>
                                            <p className="text-xl font-black text-amber-800">{sakip_docs.opd_summary.opd_belum_lengkap} OPD</p>
                                        </div>
                                        <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 text-center shadow-2xs">
                                            <p className="text-[10px] font-semibold text-blue-700 uppercase">Persentase Lengkap</p>
                                            <p className="text-xl font-black text-blue-800">{sakip_docs.opd_summary.pct_lengkap}%</p>
                                        </div>
                                        <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-3 text-center shadow-2xs col-span-2 sm:col-span-1">
                                            <p className="text-[10px] font-semibold text-rose-700 uppercase">Dokumen Belum Ada</p>
                                            <p className="text-xl font-black text-rose-800">{sakip_docs.opd_summary.missing_docs} Dokumen</p>
                                        </div>
                                        <div className="col-span-2 sm:col-span-5 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-800 p-2.5 flex items-center justify-between px-3.5 shadow-2xs text-xs text-slate-600 dark:text-slate-300">
                                            <span>
                                                <strong>Rumus:</strong> Persentase OPD Lengkap = Jumlah OPD Lengkap (100%) / Total OPD × 100% = {sakip_docs.opd_summary.opd_lengkap} / {sakip_docs.opd_summary.total_opd} × 100% = <strong className="text-blue-600 dark:text-blue-400">{sakip_docs.opd_summary.pct_lengkap}%</strong>
                                            </span>
                                        </div>
                                    </div>

                                    <div className="md:col-span-4 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-800 p-3 flex flex-col items-center justify-center shadow-2xs">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">Grafik Proporsi OPD</p>
                                        <SakipOpdDonutChart
                                            lengkap={sakip_docs.opd_summary.opd_lengkap}
                                            belumLengkap={sakip_docs.opd_summary.opd_belum_lengkap}
                                            percentage={sakip_docs.opd_summary.pct_lengkap}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Tables */}
                            {sakipDocView === 'pemda' ? (
                                <div className="space-y-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                                        <div className="flex items-center gap-2">
                                            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                Daftar Kelengkapan Dokumen SAKIP OPD ({evalYear})
                                            </h4>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <TableSearchInput
                                                value={searchQuery}
                                                onChange={setSearchQuery}
                                                placeholder="Cari dokumen..."
                                            />
                                            <a
                                                href={getExportUrl('sakip_docs_pemda')}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 shadow-2xs cursor-pointer transition"
                                                title={`Download PDF Dokumen SAKIP OPD Tahun ${evalYear}`}
                                            >
                                                <FileDown className="h-3.5 w-3.5" />
                                                <span>Download PDF</span>
                                                <span className="rounded bg-white/20 px-1.5 py-0.2 text-[10px] font-bold">
                                                    {evalYear}
                                                </span>
                                            </a>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                                <tr>
                                                    <th className="px-4 py-3 font-semibold text-center w-12">No</th>
                                                    <th className="px-4 py-3 font-semibold">Nama Dokumen SAKIP Induk Dinas</th>
                                                    <th className="px-4 py-3 font-semibold text-center w-36">Tahun / Periode</th>
                                                    <th className="px-4 py-3 font-semibold text-center w-28">Kelengkapan</th>
                                                    <th className="px-4 py-3 font-semibold text-center w-36">Status</th>
                                                    <th className="px-4 py-3 font-semibold text-center w-28">Aksi</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                                {filteredPemdaDocs.map((row) => {
                                                    const canDownload = Boolean(row.is_available && row.has_file && row.download_url);
                                                    const downloadHref = row.download_url || '#';

                                                    return (
                                                        <tr key={row.no} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                                                            <td className="px-4 py-3 text-center font-medium text-slate-500">{row.no}</td>
                                                            <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{row.name}</td>
                                                            <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400">{row.period}</td>
                                                            <td className="px-4 py-3 text-center">
                                                                {row.is_available ? (
                                                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 font-bold text-sm"><Check className="h-3.5 w-3.5 stroke-[2.5]" /></span>
                                                                ) : (
                                                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-400 font-bold text-sm">-</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusBadgeCls(row.status)}`}>
                                                                    {row.status}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {canDownload ? (
                                                                    <a
                                                                        href={downloadHref}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 transition shadow-2xs"
                                                                        title={`Unduh Dokumen ${row.name}`}
                                                                    >
                                                                        <Download className="h-3.5 w-3.5" />
                                                                        <span>Unduh</span>
                                                                    </a>
                                                                ) : (
                                                                    <span className="text-slate-300 dark:text-slate-600 font-bold text-xs">-</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                                        <p className="font-bold text-slate-700 dark:text-slate-200">Keterangan:</p>
                                        <p className="flex items-center gap-1.5"><span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"><Check className="h-2.5 w-2.5 stroke-[2.5]" /></span><span>= Dokumen tersedia dan sesuai periode/tahun yang berlaku.</span></p>
                                        <p className="flex items-center gap-1.5"><span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-semibold"><Download className="h-2.5 w-2.5" /> Unduh</span><span>= Dokumen memiliki berkas fisik terunggah dan dapat diunduh langsung pada kolom Aksi.</span></p>
                                        <p className="flex items-center gap-1.5"><span className="font-bold text-slate-400">-</span><span>= Dokumen belum tersedia atau berkas fisik belum diunggah.</span></p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                                        <div className="flex items-center gap-2">
                                            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                Matriks Kelengkapan 12 Dokumen SAKIP per Perangkat Daerah ({evalYear})
                                            </h4>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <TableSearchInput
                                                value={searchQuery}
                                                onChange={setSearchQuery}
                                                placeholder="Cari perangkat daerah..."
                                            />
                                            <a
                                                href={getExportUrl('sakip_docs_opd')}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 shadow-2xs cursor-pointer transition"
                                                title={`Download PDF Dokumen SAKIP OPD Tahun ${evalYear}`}
                                            >
                                                <FileDown className="h-3.5 w-3.5" />
                                                <span>Download PDF</span>
                                                <span className="rounded bg-white/20 px-1.5 py-0.2 text-[10px] font-bold">
                                                    {evalYear}
                                                </span>
                                            </a>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                                        <table className="w-full text-left text-xs whitespace-nowrap">
                                            <thead className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                                <tr>
                                                    <th className="px-3 py-3 font-semibold text-center w-10">No</th>
                                                    <th className="px-3 py-3 font-semibold min-w-[200px]">Perangkat Daerah</th>
                                                    {Object.entries(sakip_docs.opd_columns).map(([k, label]) => (
                                                        <th key={k} className="px-2 py-3 font-semibold text-center text-[11px]" title={label}>
                                                            {label}
                                                        </th>
                                                    ))}
                                                    <th className="px-3 py-3 font-semibold text-center w-20">Tersedia</th>
                                                    <th className="px-3 py-3 font-semibold text-center w-24">Kelengkapan</th>
                                                    <th className="px-3 py-3 font-semibold text-center w-28">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                                {filteredOpdDocs.map((row) => (
                                                    <tr key={row.organization_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                                                        <td className="px-3 py-2.5 text-center font-medium text-slate-500">{row.no}</td>
                                                        <td className="px-3 py-2.5 font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]" title={row.organization_name}>{row.organization_name}</td>
                                                        {Object.keys(sakip_docs.opd_columns).map((k) => {
                                                            const isAvail = Boolean(row.checks[k]);
                                                            const docDetail = row.doc_details?.[k];
                                                            const canDownload = Boolean(isAvail && docDetail?.has_file && docDetail?.download_url);
                                                            const downloadHref = docDetail?.download_url || '#';

                                                            return (
                                                                <td key={k} className="px-2 py-2.5 text-center">
                                                                    {isAvail ? (
                                                                        <div className="inline-flex items-center justify-center gap-1">
                                                                            <span
                                                                                className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 font-bold text-[10px]"
                                                                                title="Dokumen Tersedia"
                                                                            >
                                                                                <Check className="h-2.5 w-2.5 stroke-[3]" />
                                                                            </span>
                                                                            {canDownload && (
                                                                                <a
                                                                                    href={downloadHref}
                                                                                    target="_blank"
                                                                                    rel="noreferrer"
                                                                                    title={`Unduh ${sakip_docs.opd_columns[k]} (${row.organization_name})`}
                                                                                    className="inline-flex items-center justify-center w-4.5 h-4.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                                                                                >
                                                                                    <Download className="h-3 w-3" />
                                                                                </a>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-100 text-slate-400 font-bold text-xs">-</span>
                                                                    )}
                                                                </td>
                                                            );
                                                        })}
                                                        <td className="px-3 py-2.5 text-center font-semibold text-slate-700 dark:text-slate-300">{row.available_count} / {row.total_required}</td>
                                                        <td className="px-3 py-2.5 text-center font-bold text-blue-700 dark:text-blue-400">{row.percentage}%</td>
                                                        <td className="px-3 py-2.5 text-center">
                                                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold border ${statusBadgeCls(row.status)}`}>{row.status}</span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                                        <p className="font-bold text-slate-700 dark:text-slate-200">Keterangan:</p>
                                        <p className="flex items-center gap-1.5"><span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"><Check className="h-2.5 w-2.5 stroke-[2.5]" /></span><span>= Dokumen tersedia dan sesuai tahun/periode yang berlaku.</span></p>
                                        <p className="flex items-center gap-1.5"><span className="inline-flex items-center justify-center w-4.5 h-4.5 text-blue-600"><Download className="h-3 w-3" /></span><span>= Ikon unduh berkas (hanya tampil jika berkas dokumen telah diunggah).</span></p>
                                        <p className="flex items-center gap-1.5"><span className="font-bold text-slate-400">-</span><span>= Dokumen belum tersedia pada tahun evaluasi {evalYear}.</span></p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 3: CAPAIAN IKU OPD (DISEMBUNYIKAN TOTAL) */}
                    {false && activeTab === 'iku' && (
                        <div className="p-4 space-y-4">
                            {/* 6 KARTU UTAMA STATISTIK */}
                            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
                                <div
                                    onClick={() => setIkuFilterStatus('Semua')}
                                    className={`rounded-lg border p-3 text-center shadow-2xs cursor-pointer transition ${
                                        ikuFilterStatus === 'Semua'
                                            ? 'ring-2 ring-primary bg-blue-50/70 dark:bg-blue-950/40 border-primary'
                                            : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-800 hover:bg-slate-50'
                                    }`}
                                >
                                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Jumlah IKU</p>
                                    <p className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">{iku_pemda_matrix?.summary.total_iku ?? 0}</p>
                                    <span className="text-[10px] text-slate-500">Semua Indikator</span>
                                </div>
                                <div
                                    onClick={() => setIkuFilterStatus(ikuFilterStatus === 'Tercapai' ? 'Semua' : 'Tercapai')}
                                    className={`rounded-lg border p-3 text-center shadow-2xs cursor-pointer transition ${
                                        ikuFilterStatus === 'Tercapai'
                                            ? 'ring-2 ring-emerald-500 bg-emerald-100/70 border-emerald-400'
                                            : 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/40'
                                    }`}
                                >
                                    <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide">Tercapai</p>
                                    <p className="text-2xl font-black text-emerald-800 mt-0.5">{iku_pemda_matrix?.summary.tercapai ?? 0}</p>
                                    <span className="text-[10px] text-emerald-600 font-medium">Capaian &ge; 100%</span>
                                </div>
                                <div
                                    onClick={() => setIkuFilterStatus(ikuFilterStatus === 'Perlu Perhatian' ? 'Semua' : 'Perlu Perhatian')}
                                    className={`rounded-lg border p-3 text-center shadow-2xs cursor-pointer transition ${
                                        ikuFilterStatus === 'Perlu Perhatian'
                                            ? 'ring-2 ring-amber-500 bg-amber-100/70 border-amber-400'
                                            : 'border-amber-200 bg-amber-50/50 hover:bg-amber-100/40'
                                    }`}
                                >
                                    <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide">Perlu Perhatian</p>
                                    <p className="text-2xl font-black text-amber-800 mt-0.5">{iku_pemda_matrix?.summary.perlu_perhatian ?? 0}</p>
                                    <span className="text-[10px] text-amber-600 font-medium">50% &le; Capaian &lt; 100%</span>
                                </div>
                                <div
                                    onClick={() => setIkuFilterStatus(ikuFilterStatus === 'Kritis' ? 'Semua' : 'Kritis')}
                                    className={`rounded-lg border p-3 text-center shadow-2xs cursor-pointer transition ${
                                        ikuFilterStatus === 'Kritis'
                                            ? 'ring-2 ring-rose-500 bg-rose-100/70 border-rose-400'
                                            : 'border-rose-200 bg-rose-50/50 hover:bg-rose-100/40'
                                    }`}
                                >
                                    <p className="text-[10px] font-semibold text-rose-700 uppercase tracking-wide">Kritis</p>
                                    <p className="text-2xl font-black text-rose-800 mt-0.5">{iku_pemda_matrix?.summary.kritis ?? 0}</p>
                                    <span className="text-[10px] text-rose-600 font-medium">Capaian &lt; 50%</span>
                                </div>
                                <div
                                    onClick={() => setIkuFilterStatus(ikuFilterStatus === 'Tidak Dinilai' ? 'Semua' : 'Tidak Dinilai')}
                                    className={`rounded-lg border p-3 text-center shadow-2xs cursor-pointer transition ${
                                        ikuFilterStatus === 'Tidak Dinilai'
                                            ? 'ring-2 ring-slate-500 bg-slate-200/70 border-slate-400'
                                            : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/40 dark:border-slate-700 dark:bg-slate-800/40'
                                    }`}
                                >
                                    <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Tidak Dinilai</p>
                                    <p className="text-2xl font-black text-slate-700 dark:text-slate-300 mt-0.5">{iku_pemda_matrix?.summary.tidak_dinilai ?? 0}</p>
                                    <span className="text-[10px] text-slate-500">Target = 0 & Real = 0</span>
                                </div>
                                <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 text-center shadow-2xs col-span-2 sm:col-span-1">
                                    <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide">Rata Capaian</p>
                                    <p className="text-2xl font-black text-blue-800 mt-0.5">{(iku_pemda_matrix?.summary.rata_capaian ?? 0).toFixed(2)}%</p>
                                    <span className="text-[10px] text-blue-600 font-medium">Rata-rata Realisasi</span>
                                </div>
                            </div>

                            {/* GRAFIK TREN 5 TAHUN IKU OPD */}
                            <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-800 shadow-2xs">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-700 gap-2">
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                            <TrendingUp className="h-4 w-4 text-primary" />
                                            Grafik Capaian IKU OPD per Tahun ({activePeriodRange})
                                        </h3>
                                        <p className="text-xs text-slate-500">Pimpinan dapat memantau pergerakan tren multi-tahun capaian IKU OPD.</p>
                                    </div>
                                    <span className="text-xs font-mono font-bold text-primary bg-blue-50 dark:bg-blue-950/50 px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-800">
                                        Benchmark
                                    </span>
                                </div>
                                <IkuAnalyticsTrendChart trend={iku_pemda_matrix?.trend ?? []} />
                            </div>

                            {/* FILTER STATUS TABS & MATRIKS IKU OPD CONTROLS */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-xs font-semibold text-slate-500 mr-1">Status:</span>
                                    <button
                                        type="button"
                                        onClick={() => setIkuFilterStatus('Semua')}
                                        className={`px-2.5 py-1 text-xs rounded-md font-medium transition ${
                                            ikuFilterStatus === 'Semua'
                                                ? 'bg-primary text-white shadow-xs'
                                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                                        }`}
                                    >
                                        Semua ({iku_pemda_matrix?.summary.total_iku ?? 0})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIkuFilterStatus('Tercapai')}
                                        className={`px-2.5 py-1 text-xs rounded-md font-medium transition ${
                                            ikuFilterStatus === 'Tercapai'
                                                ? 'bg-emerald-600 text-white shadow-xs'
                                                : 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50'
                                        }`}
                                    >
                                        🟢 Tercapai ({iku_pemda_matrix?.summary.tercapai ?? 0})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIkuFilterStatus('Perlu Perhatian')}
                                        className={`px-2.5 py-1 text-xs rounded-md font-medium transition ${
                                            ikuFilterStatus === 'Perlu Perhatian'
                                                ? 'bg-amber-600 text-white shadow-xs'
                                                : 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700 hover:bg-amber-50'
                                        }`}
                                    >
                                        🟡 Perlu Perhatian ({iku_pemda_matrix?.summary.perlu_perhatian ?? 0})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIkuFilterStatus('Kritis')}
                                        className={`px-2.5 py-1 text-xs rounded-md font-medium transition ${
                                            ikuFilterStatus === 'Kritis'
                                                ? 'bg-rose-600 text-white shadow-xs'
                                                : 'bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-700 hover:bg-rose-50'
                                        }`}
                                    >
                                        🔴 Kritis ({iku_pemda_matrix?.summary.kritis ?? 0})
                                    </button>
                                    {(iku_pemda_matrix?.summary.tidak_dinilai ?? 0) > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setIkuFilterStatus('Tidak Dinilai')}
                                            className={`px-2.5 py-1 text-xs rounded-md font-medium transition ${
                                                ikuFilterStatus === 'Tidak Dinilai'
                                                    ? 'bg-slate-600 text-white shadow-xs'
                                                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50'
                                            }`}
                                        >
                                            ⚪ Tidak Dinilai ({iku_pemda_matrix?.summary.tidak_dinilai ?? 0})
                                        </button>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <TableSearchInput
                                        value={searchQuery}
                                        onChange={setSearchQuery}
                                        placeholder="Cari indikator IKU..."
                                    />
                                    <a
                                        href={getExportUrl('iku_pemda')}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 shadow-2xs cursor-pointer transition"
                                        title={`Download PDF Capaian IKU OPD Tahun ${evalYear}`}
                                    >
                                        <FileDown className="h-3.5 w-3.5" />
                                        <span>Download PDF</span>
                                        <span className="rounded bg-white/20 px-1.5 py-0.2 text-[10px] font-bold">
                                            {evalYear}
                                        </span>
                                    </a>
                                </div>
                            </div>

                            {ikuMatrixView === 'eval_year' ? (
                                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                                    <table className="w-full text-left text-xs min-w-[950px]">
                                        <thead className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                            <tr>
                                                <th className="px-3 py-3 font-semibold text-center w-10">No</th>
                                                <th className="px-4 py-3 font-semibold w-52">Sasaran Strategis</th>
                                                <th className="px-4 py-3 font-semibold">Indikator IKU OPD</th>
                                                <th className="px-2 py-3 font-semibold text-center w-20">Satuan</th>
                                                <th className="px-3 py-3 font-semibold text-center w-36">Karakter Indikator</th>
                                                <th className="px-3 py-3 font-semibold text-right w-24">Target</th>
                                                <th className="px-3 py-3 font-semibold text-right w-24">Realisasi</th>
                                                <th className="px-3 py-3 font-semibold text-right w-28">Capaian</th>
                                                <th className="px-3 py-3 font-semibold text-center w-28">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                            {filteredIkuPemda.length === 0 ? (
                                                <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">Tidak ada IKU OPD yang sesuai pencarian.</td></tr>
                                            ) : (
                                                filteredIkuPemda.map((row) => (
                                                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                                                        <td className="px-3 py-2.5 text-center text-slate-500 font-medium">{row.no}</td>
                                                        <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400 font-medium line-clamp-2" title={row.sasaran}>{row.sasaran}</td>
                                                        <td className="px-4 py-2.5">
                                                            <div className="font-semibold text-slate-900 dark:text-white">{row.indikator}</div>
                                                            <div className="text-[10px] text-slate-400 font-mono">{row.code}</div>
                                                        </td>
                                                        <td className="px-2 py-2.5 text-center text-slate-600 dark:text-slate-400">{row.satuan}</td>
                                                        <td className="px-3 py-2.5 text-center">
                                                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${row.polarization === 'negatif' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-blue-50 text-blue-800 border border-blue-200'}`}>
                                                                {row.karakter}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2.5 text-right font-mono text-slate-600 dark:text-slate-400">{row.target !== null ? row.target.toLocaleString('id-ID') : '-'}</td>
                                                        <td className="px-3 py-2.5 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">{row.realisasi !== null ? row.realisasi.toLocaleString('id-ID') : '-'}</td>
                                                        <td className="px-3 py-2.5 text-right font-mono font-bold text-sm">
                                                            {row.capaian !== null ? (
                                                                <span className={row.capaian < 0 || row.capaian < 50 ? 'text-rose-700 font-black' : row.capaian >= 100 ? 'text-emerald-700' : 'text-amber-700'}>
                                                                    {row.capaian.toFixed(2)}%
                                                                </span>
                                                            ) : '-'}
                                                        </td>
                                                        <td className="px-3 py-2.5 text-center">
                                                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold border ${statusBadgeCls(row.status)}`}>
                                                                {row.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                                    <table className="w-full text-left text-xs min-w-[1100px] border-collapse">
                                        <thead className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                                            <tr>
                                                <th rowSpan={2} className="px-2.5 py-2 font-bold text-center w-10 border-r border-slate-200">No</th>
                                                <th rowSpan={2} className="px-3 py-2 font-bold w-48 border-r border-slate-200">Sasaran Strategis</th>
                                                <th rowSpan={2} className="px-3 py-2 font-bold w-52 border-r border-slate-200">IKU OPD</th>
                                                {ikuPemdaYears.map((y) => (
                                                    <th key={y} colSpan={3} className={`px-2 py-1 font-bold text-center border-r border-slate-200 ${y === Number(evalYear) ? 'bg-blue-100 text-blue-900 font-black' : ''}`}>
                                                        {y}
                                                    </th>
                                                ))}
                                                <th rowSpan={2} className="px-3 py-2 font-bold text-center w-24">Status</th>
                                            </tr>
                                            <tr className="bg-slate-50 dark:bg-slate-800 text-[10px] border-b border-slate-200">
                                                {ikuPemdaYears.map((y) => (
                                                    <React.Fragment key={`iku-sub-${y}`}>
                                                        <th className="px-1.5 py-1 text-right text-slate-500 font-medium">Tgt</th>
                                                        <th className="px-1.5 py-1 text-right text-slate-500 font-medium">Real</th>
                                                        <th className="px-1.5 py-1 text-right text-slate-700 font-bold border-r border-slate-200">Cap%</th>
                                                    </React.Fragment>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {filteredIkuPemda.map((row) => (
                                                <tr key={`iku-tr-${row.id}`} className="hover:bg-slate-50 transition">
                                                    <td className="px-2.5 py-2 text-center text-slate-500 font-medium border-r border-slate-100">{row.no}</td>
                                                    <td className="px-3 py-2 text-slate-700 border-r border-slate-100 line-clamp-2" title={row.sasaran}>{row.sasaran}</td>
                                                    <td className="px-3 py-2 border-r border-slate-100 font-semibold">{row.indikator}</td>
                                                    {ikuPemdaYears.map((y) => {
                                                        const yd = row.yearly[y];
                                                        return (
                                                            <React.Fragment key={`td-iku-${row.id}-${y}`}>
                                                                <td className="px-1.5 py-2 text-right font-mono text-[11px] text-slate-500">{yd?.target ?? '-'}</td>
                                                                <td className="px-1.5 py-2 text-right font-mono text-[11px] text-slate-700">{yd?.realization ?? '-'}</td>
                                                                <td className="px-1.5 py-2 text-right font-mono text-[11px] font-bold border-r border-slate-100">
                                                                    {yd?.achievement !== null && yd?.achievement !== undefined ? (
                                                                        <span className={yd.achievement < 0 || yd.achievement < 50 ? 'text-rose-700 font-black' : yd.achievement >= 100 ? 'text-emerald-700' : 'text-amber-700'}>
                                                                            {yd.achievement.toFixed(1)}%
                                                                        </span>
                                                                    ) : '-'}
                                                                </td>
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                    <td className="px-3 py-2 text-center">
                                                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold border ${statusBadgeCls(row.status)}`}>{row.status}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
                                💡 <strong>Kriteria Status Capaian IKU OPD:</strong> 🟢 <strong>Tercapai:</strong> Capaian &ge; 100% &nbsp;|&nbsp; 🟡 <strong>Perlu Perhatian:</strong> 50% &le; Capaian &lt; 100% &nbsp;|&nbsp; 🔴 <strong>Kritis:</strong> Capaian &lt; 50% atau nilai minus &nbsp;|&nbsp; ⚪ <strong>Tidak Dinilai:</strong> Target = 0 dan Realisasi = 0.
                            </div>
                        </div>
                    )}

                    {/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = 
                        TAB 4: CAPAIAN KINERJA OPD (Baris 3 Panduan)
                    =============================================================== */}
                    {activeTab === 'opd' && (
                        <div className="p-4 space-y-4">
                            {/* 6 KARTU UTAMA STATISTIK */}
                            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
                                <div
                                    onClick={() => setOpdFilterStatus('Semua')}
                                    className={`rounded-lg border p-3 text-center shadow-2xs cursor-pointer transition ${
                                        opdFilterStatus === 'Semua'
                                            ? 'ring-2 ring-primary bg-blue-50/70 dark:bg-blue-950/40 border-primary'
                                            : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-800 hover:bg-slate-50'
                                    }`}
                                >
                                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Total OPD</p>
                                    <p className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">{opd_ranking_matrix?.summary.total_opd ?? 0}</p>
                                    <span className="text-[10px] text-slate-500">Semua Perangkat Daerah</span>
                                </div>
                                <div
                                    onClick={() => setOpdFilterStatus(opdFilterStatus === 'Tercapai' ? 'Semua' : 'Tercapai')}
                                    className={`rounded-lg border p-3 text-center shadow-2xs cursor-pointer transition ${
                                        opdFilterStatus === 'Tercapai'
                                            ? 'ring-2 ring-emerald-500 bg-emerald-100/70 border-emerald-400'
                                            : 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/40'
                                    }`}
                                >
                                    <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide">Tercapai</p>
                                    <p className="text-2xl font-black text-emerald-800 mt-0.5">{opd_ranking_matrix?.summary.tercapai ?? 0}</p>
                                    <span className="text-[10px] text-emerald-600 font-medium">Capaian &ge; 100%</span>
                                </div>
                                <div
                                    onClick={() => setOpdFilterStatus(opdFilterStatus === 'Perlu Perhatian' ? 'Semua' : 'Perlu Perhatian')}
                                    className={`rounded-lg border p-3 text-center shadow-2xs cursor-pointer transition ${
                                        opdFilterStatus === 'Perlu Perhatian'
                                            ? 'ring-2 ring-amber-500 bg-amber-100/70 border-amber-400'
                                            : 'border-amber-200 bg-amber-50/50 hover:bg-amber-100/40'
                                    }`}
                                >
                                    <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide">Perlu Perhatian</p>
                                    <p className="text-2xl font-black text-amber-800 mt-0.5">{opd_ranking_matrix?.summary.perlu_perhatian ?? 0}</p>
                                    <span className="text-[10px] text-amber-600 font-medium">50% &le; Capaian &lt; 100%</span>
                                </div>
                                <div
                                    onClick={() => setOpdFilterStatus(opdFilterStatus === 'Kritis' ? 'Semua' : 'Kritis')}
                                    className={`rounded-lg border p-3 text-center shadow-2xs cursor-pointer transition ${
                                        opdFilterStatus === 'Kritis'
                                            ? 'ring-2 ring-rose-500 bg-rose-100/70 border-rose-400'
                                            : 'border-rose-200 bg-rose-50/50 hover:bg-rose-100/40'
                                    }`}
                                >
                                    <p className="text-[10px] font-semibold text-rose-700 uppercase tracking-wide">Kritis</p>
                                    <p className="text-2xl font-black text-rose-800 mt-0.5">{opd_ranking_matrix?.summary.kritis ?? 0}</p>
                                    <span className="text-[10px] text-rose-600 font-medium">Capaian &lt; 50%</span>
                                </div>
                                <div
                                    onClick={() => setOpdFilterStatus(opdFilterStatus === 'Tidak Dinilai' ? 'Semua' : 'Tidak Dinilai')}
                                    className={`rounded-lg border p-3 text-center shadow-2xs cursor-pointer transition ${
                                        opdFilterStatus === 'Tidak Dinilai'
                                            ? 'ring-2 ring-slate-500 bg-slate-200/70 border-slate-400'
                                            : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/40 dark:border-slate-700 dark:bg-slate-800/40'
                                    }`}
                                >
                                    <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Tidak Dinilai</p>
                                    <p className="text-2xl font-black text-slate-700 dark:text-slate-300 mt-0.5">{opd_ranking_matrix?.summary.tidak_dinilai ?? 0}</p>
                                    <span className="text-[10px] text-slate-500">Target = 0 & Real = 0</span>
                                </div>
                                <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 text-center shadow-2xs col-span-2 sm:col-span-1">
                                    <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide">Rata-rata Capaian</p>
                                    <p className="text-2xl font-black text-blue-800 mt-0.5">{(opd_ranking_matrix?.summary.rata_capaian ?? 0).toFixed(2)}%</p>
                                    <span className="text-[10px] text-blue-600 font-medium">Rata-rata Realisasi</span>
                                </div>
                            </div>

                            {/* GRAFIK TREN 5 TAHUN KINERJA OPD */}
                            <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-800 shadow-2xs">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-700 gap-2">
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                            <BarChart3 className="h-4 w-4 text-sky-600" />
                                            Grafik Rata-rata Capaian Kinerja Perangkat Daerah per Tahun ({activePeriodRange})
                                        </h3>
                                        <p className="text-xs text-slate-500">Pimpinan dapat memantau pergerakan tren rata-rata capaian kinerja OPD.</p>
                                    </div>
                                    <span className="text-xs font-mono font-bold text-sky-700 bg-sky-50 dark:bg-sky-950/50 dark:text-sky-300 px-2.5 py-1 rounded-md border border-sky-200 dark:border-sky-800">
                                        Benchmark
                                    </span>
                                </div>
                                <OpdPerformanceTrendChart trend={opd_ranking_matrix?.trend ?? []} />
                            </div>

                            {/* FILTER STATUS TABS & MATRIKS OPD CONTROLS */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-xs font-semibold text-slate-500 mr-1">Status:</span>
                                    <button
                                        type="button"
                                        onClick={() => setOpdFilterStatus('Semua')}
                                        className={`px-2.5 py-1 text-xs rounded-md font-medium transition ${
                                            opdFilterStatus === 'Semua'
                                                ? 'bg-primary text-white shadow-xs'
                                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                                        }`}
                                    >
                                        Semua ({opd_ranking_matrix?.summary.total_opd ?? 0})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setOpdFilterStatus('Tercapai')}
                                        className={`px-2.5 py-1 text-xs rounded-md font-medium transition ${
                                            opdFilterStatus === 'Tercapai'
                                                ? 'bg-emerald-600 text-white shadow-xs'
                                                : 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50'
                                        }`}
                                    >
                                        🟢 Tercapai ({opd_ranking_matrix?.summary.tercapai ?? 0})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setOpdFilterStatus('Perlu Perhatian')}
                                        className={`px-2.5 py-1 text-xs rounded-md font-medium transition ${
                                            opdFilterStatus === 'Perlu Perhatian'
                                                ? 'bg-amber-600 text-white shadow-xs'
                                                : 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700 hover:bg-amber-50'
                                        }`}
                                    >
                                        🟡 Perlu Perhatian ({opd_ranking_matrix?.summary.perlu_perhatian ?? 0})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setOpdFilterStatus('Kritis')}
                                        className={`px-2.5 py-1 text-xs rounded-md font-medium transition ${
                                            opdFilterStatus === 'Kritis'
                                                ? 'bg-rose-600 text-white shadow-xs'
                                                : 'bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-700 hover:bg-rose-50'
                                        }`}
                                    >
                                        🔴 Kritis ({opd_ranking_matrix?.summary.kritis ?? 0})
                                    </button>
                                    {(opd_ranking_matrix?.summary.tidak_dinilai ?? 0) > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setOpdFilterStatus('Tidak Dinilai')}
                                            className={`px-2.5 py-1 text-xs rounded-md font-medium transition ${
                                                opdFilterStatus === 'Tidak Dinilai'
                                                    ? 'bg-slate-600 text-white shadow-xs'
                                                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50'
                                            }`}
                                        >
                                            ⚪ Tidak Dinilai ({opd_ranking_matrix?.summary.tidak_dinilai ?? 0})
                                        </button>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <TableSearchInput
                                        value={searchQuery}
                                        onChange={setSearchQuery}
                                        placeholder="Cari perangkat daerah..."
                                    />
                                    <a
                                        href={getExportUrl('opd_ranking')}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 shadow-2xs cursor-pointer transition"
                                        title={`Download PDF Ranking OPD Tahun ${evalYear}`}
                                    >
                                        <FileDown className="h-3.5 w-3.5" />
                                        <span>Download PDF</span>
                                        <span className="rounded bg-white/20 px-1.5 py-0.2 text-[10px] font-bold">
                                            {evalYear}
                                        </span>
                                    </a>
                                </div>
                            </div>

                            {opdMatrixView === 'ranking' ? (
                                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                                    <table className="w-full text-left text-xs min-w-[900px]">
                                        <thead className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                            <tr>
                                                <th className="px-3 py-3 font-semibold text-center w-12">Rank</th>
                                                <th className="px-4 py-3 font-semibold">Perangkat Daerah</th>
                                                <th className="px-3 py-3 font-semibold text-center w-36">Jumlah Indikator Kinerja</th>
                                                <th className="px-3 py-3 font-semibold text-right w-32">Rata-rata Capaian</th>
                                                <th className="px-3 py-3 font-semibold text-center w-20">Tercapai</th>
                                                <th className="px-3 py-3 font-semibold text-center w-20">Perhatian</th>
                                                <th className="px-3 py-3 font-semibold text-center w-20">Kritis</th>
                                                <th className="px-3 py-3 font-semibold text-center w-28">Status</th>
                                                <th className="px-3 py-3 font-semibold text-center w-28">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                            {filteredOpdRanking.length === 0 ? (
                                                <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">Tidak ada data OPD yang sesuai.</td></tr>
                                            ) : (
                                                filteredOpdRanking.map((row) => (
                                                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer" onClick={() => setSelectedOpdForDrilldown(row)}>
                                                        <td className="px-3 py-2.5 text-center font-bold text-slate-700 dark:text-slate-300">
                                                            {row.rank <= 3 ? (
                                                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-black text-xs">
                                                                    {row.rank}
                                                                </span>
                                                            ) : (
                                                                row.rank
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <p className="font-semibold text-slate-800 dark:text-slate-200">{row.perangkat_daerah}</p>
                                                            <p className="text-[10px] text-slate-400 font-mono">{row.kode}</p>
                                                        </td>
                                                        <td className="px-3 py-2.5 text-center font-mono text-slate-600 dark:text-slate-400 font-semibold">{row.jumlah_indikator}</td>
                                                        <td className="px-3 py-2.5 text-right font-mono font-bold text-sm text-blue-700 dark:text-blue-400">
                                                            <span className={row.rata_capaian < 0 || row.rata_capaian < 50 ? 'text-rose-700 font-black' : ''}>
                                                                {row.rata_capaian.toFixed(2)}%
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2.5 text-center font-mono text-emerald-700 font-semibold">{row.tercapai}</td>
                                                        <td className="px-3 py-2.5 text-center font-mono text-amber-700 font-semibold">{row.perhatian}</td>
                                                        <td className="px-3 py-2.5 text-center font-mono text-rose-700 font-semibold">{row.kritis}</td>
                                                        <td className="px-3 py-2.5 text-center">
                                                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold border ${statusBadgeCls(row.status)}`}>
                                                                {row.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2.5 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedOpdForDrilldown(row);
                                                                }}
                                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-semibold border border-blue-200 transition"
                                                            >
                                                                <GitFork className="h-3 w-3" />
                                                                <span>Drill-down</span>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                                    <table className="w-full text-left text-xs min-w-[950px] border-collapse">
                                        <thead className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                                            <tr>
                                                <th className="px-3 py-3 font-semibold text-center w-12 border-r border-slate-200 dark:border-slate-700">Rank</th>
                                                <th className="px-4 py-3 font-semibold border-r border-slate-200 dark:border-slate-700">Perangkat Daerah</th>
                                                <th className="px-3 py-3 font-semibold text-center w-24 border-r border-slate-200 dark:border-slate-700">Jml Indikator</th>
                                                {opdTrendYears.map((y) => (
                                                    <th key={y} className={`px-3 py-3 font-bold text-center border-r border-slate-200 dark:border-slate-700 ${y === Number(evalYear) ? 'bg-blue-100/80 text-blue-900 dark:bg-blue-950/70 dark:text-blue-200 font-black' : ''}`}>
                                                        {y} {y === Number(evalYear) && '(Aktif)'}
                                                    </th>
                                                ))}
                                                <th className="px-2 py-3 font-semibold text-center w-16 border-r border-slate-200 dark:border-slate-700">Tren</th>
                                                <th className="px-3 py-3 font-semibold text-center w-28 border-r border-slate-200 dark:border-slate-700">Status ({evalYear})</th>
                                                <th className="px-3 py-3 font-semibold text-center w-28">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {filteredOpdRanking.length === 0 ? (
                                                <tr><td colSpan={11} className="px-4 py-8 text-center text-slate-400">Tidak ada data tren OPD yang cocok.</td></tr>
                                            ) : (
                                                filteredOpdRanking.map((row) => (
                                                    <tr key={`trend-opd-${row.id}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer" onClick={() => setSelectedOpdForDrilldown(row)}>
                                                        <td className="px-3 py-2.5 text-center font-bold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800">
                                                            {row.rank}
                                                        </td>
                                                        <td className="px-4 py-2.5 border-r border-slate-100 dark:border-slate-800">
                                                            <p className="font-semibold text-slate-800 dark:text-slate-200">{row.perangkat_daerah}</p>
                                                            <p className="text-[10px] text-slate-400 font-mono">{row.kode}</p>
                                                        </td>
                                                        <td className="px-3 py-2.5 text-center font-mono text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800">
                                                            {row.jumlah_indikator}
                                                        </td>
                                                        {opdTrendYears.map((y) => {
                                                            const yd = row.yearly?.[y];
                                                            const isCurrent = y === Number(evalYear);
                                                            const cap = yd ? yd.capaian : null;
                                                            return (
                                                                <td key={`yr-${row.id}-${y}`} className={`px-3 py-2.5 text-center font-mono text-xs font-bold border-r border-slate-100 dark:border-slate-800 ${isCurrent ? 'bg-blue-50/50 dark:bg-blue-950/40' : ''}`}>
                                                                    {cap !== null && cap !== undefined ? (
                                                                        <span className={cap < 0 ? 'text-rose-700 font-black' : cap >= 100 ? 'text-emerald-700' : cap >= 80 ? 'text-amber-700' : 'text-indigo-700'}>
                                                                            {cap.toFixed(1)}%
                                                                        </span>
                                                                    ) : '-'}
                                                                </td>
                                                            );
                                                        })}
                                                        <td className="px-2 py-2.5 text-center font-bold text-sm border-r border-slate-100 dark:border-slate-800">
                                                            <span className={(row.tren === '↑' || row.tren === '↑') ? 'text-emerald-600 font-black' : (row.tren === '↓' || row.tren === '↓') ? 'text-rose-600 font-black' : 'text-slate-400'}>
                                                                {row.tren ?? '→'}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2.5 text-center border-r border-slate-100 dark:border-slate-800">
                                                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold border ${statusBadgeCls(row.status)}`}>
                                                                {row.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2.5 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedOpdForDrilldown(row);
                                                                }}
                                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-semibold border border-blue-200 transition"
                                                            >
                                                                <GitFork className="h-3 w-3" />
                                                                <span>Drill-down</span>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Kotak Legenda Status Kinerja Bawah Tabel OPD */}
                            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <span>💡</span> Kriteria Status Kinerja:
                                </span>
                                <span className="inline-flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                    <strong>Tercapai:</strong> Capaian &ge; 100%
                                </span>
                                <span className="text-slate-300 dark:text-slate-600">|</span>
                                <span className="inline-flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                    <strong>Perlu Perhatian:</strong> 50% &le; Capaian &lt; 100%
                                </span>
                                <span className="text-slate-300 dark:text-slate-600">|</span>
                                <span className="inline-flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                    <strong>Kritis:</strong> Capaian &lt; 50% / Nilai Minus
                                </span>
                                <span className="text-slate-300 dark:text-slate-600">|</span>
                                <span className="inline-flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                                    <strong>Tidak Dinilai:</strong> Target = 0 &amp; Realisasi = 0
                                </span>
                            </div>

                            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                <GitFork className="h-4 w-4 text-blue-600 shrink-0" />
                                <span>
                                    <strong>Drill-down Kinerja:</strong> Klik salah satu baris OPD untuk meninjau cascading pohon kinerja: <em>OPD &rarr; Sasaran &rarr; Indikator &rarr; Target &rarr; Realisasi &rarr; Program &rarr; Kegiatan &rarr; Subkegiatan</em>.
                                </span>
                            </div>
                        </div>
                    )}

                    {/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = 
                        TAB: NILAI SAKIP OPD (Baris 3 Panduan - Modul Evaluasi)
                    = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =  */}
                    {activeTab === 'sakip_pemda' && (
                        <div className="p-4 space-y-4">
                            {/* PENJELASAN EVALUASI SAKIP OPD */}
                            <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-900/60 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
                                <Building2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold text-[13px] text-emerald-950 dark:text-emerald-100">
                                        Evaluasi SAKIP Perangkat Daerah (Tingkat OPD):
                                    </p>
                                    <p className="mt-0.5 text-emerald-800 dark:text-emerald-300 leading-relaxed text-[11.5px]">
                                        Nilai SAKIP OPD bersumber dari <strong>Modul Evaluasi</strong> yang mengacu pada <strong>PermenPANRB No. 88/2021</strong>. Evaluasi dilakukan terhadap 4 pilar utama akuntabilitas: <strong>Perencanaan Kinerja (30%)</strong>, <strong>Pengukuran Kinerja (30%)</strong>, <strong>Pelaporan Kinerja (15%)</strong>, dan <strong>Evaluasi Internal (25%)</strong>.
                                    </p>
                                </div>
                            </div>

                            {/* 5 KARTU UTAMA SAKIP OPD */}
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                                <div className="rounded-lg border border-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/40 p-3.5 text-center shadow-2xs col-span-2 sm:col-span-1">
                                    <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide">Nilai Akhir SAKIP OPD</p>
                                    <p className="text-2xl font-black text-emerald-900 dark:text-emerald-100 mt-0.5">
                                        {(sakipPemdaData?.nilai ?? 0.0).toFixed(2)}
                                    </p>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 mt-1 rounded text-xs font-black shadow-xs border ${predikatBadgeCls(sakipPemdaData?.predikat ?? 'BELUM DINILAI')}`}>
                                        Predikat {sakipPemdaData?.predikat ?? 'BELUM DINILAI'}
                                    </span>
                                </div>
                                <div className="rounded-lg border border-slate-200 bg-white dark:bg-slate-800 p-3 text-center shadow-2xs">
                                    <p className="text-[10px] font-semibold text-slate-500 uppercase">1. Perencanaan Kinerja</p>
                                    <p className="text-xl font-black text-slate-800 dark:text-white mt-0.5">
                                        {(sakipPemdaData?.perencanaan ?? 0.0).toFixed(2)} <span className="text-xs font-normal text-slate-400">/ 30</span>
                                    </p>
                                    <span className="text-[10px] font-semibold text-emerald-600 mt-0.5 block">
                                        {(((sakipPemdaData?.perencanaan ?? 0.0) / 30) * 100).toFixed(2)}% (Predikat {sakipPemdaData?.komponen?.[0]?.predikat ?? 'BELUM DINILAI'})
                                    </span>
                                </div>
                                <div className="rounded-lg border border-slate-200 bg-white dark:bg-slate-800 p-3 text-center shadow-2xs">
                                    <p className="text-[10px] font-semibold text-slate-500 uppercase">2. Pengukuran Kinerja</p>
                                    <p className="text-xl font-black text-slate-800 dark:text-white mt-0.5">
                                        {(sakipPemdaData?.pengukuran ?? 0.0).toFixed(2)} <span className="text-xs font-normal text-slate-400">/ 30</span>
                                    </p>
                                    <span className="text-[10px] font-semibold text-emerald-600 mt-0.5 block">
                                        {(((sakipPemdaData?.pengukuran ?? 0.0) / 30) * 100).toFixed(2)}% (Predikat {sakipPemdaData?.komponen?.[1]?.predikat ?? 'BELUM DINILAI'})
                                    </span>
                                </div>
                                <div className="rounded-lg border border-slate-200 bg-white dark:bg-slate-800 p-3 text-center shadow-2xs">
                                    <p className="text-[10px] font-semibold text-slate-500 uppercase">3. Pelaporan Kinerja</p>
                                    <p className="text-xl font-black text-slate-800 dark:text-white mt-0.5">
                                        {(sakipPemdaData?.pelaporan ?? 0.0).toFixed(2)} <span className="text-xs font-normal text-slate-400">/ 15</span>
                                    </p>
                                    <span className="text-[10px] font-semibold text-emerald-600 mt-0.5 block">
                                        {(((sakipPemdaData?.pelaporan ?? 0.0) / 15) * 100).toFixed(2)}% (Predikat {sakipPemdaData?.komponen?.[2]?.predikat ?? 'BELUM DINILAI'})
                                    </span>
                                </div>
                                <div className="rounded-lg border border-slate-200 bg-white dark:bg-slate-800 p-3 text-center shadow-2xs">
                                    <p className="text-[10px] font-semibold text-slate-500 uppercase">4. Evaluasi Internal</p>
                                    <p className="text-xl font-black text-slate-800 dark:text-white mt-0.5">
                                        {(sakipPemdaData?.evaluasi_internal ?? 0.0).toFixed(2)} <span className="text-xs font-normal text-slate-400">/ 25</span>
                                    </p>
                                    <span className="text-[10px] font-semibold text-emerald-600 mt-0.5 block">
                                        {(((sakipPemdaData?.evaluasi_internal ?? 0.0) / 25) * 100).toFixed(2)}% (Predikat {sakipPemdaData?.komponen?.[3]?.predikat ?? 'BELUM DINILAI'})
                                    </span>
                                </div>
                            </div>

                            {/* TREN DERET WAKTU SAKIP OPD 5 TAHUN */}
                            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="font-bold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                                        <span>Tren Deret Waktu Nilai SAKIP OPD (Periode Perencanaan {activePeriodRange})</span>
                                    </p>
                                    <span className="text-[11px] text-slate-500">
                                        Periode Perencanaan {activePeriodRange}
                                    </span>
                                </div>
                                <SakipPemdaTrendChart trend={sakipPemdaData?.trend ?? []} evalYear={evalYear} />
                            </div>

                            {/* MATRIKS TABEL 4 KOMPONEN SAKIP OPD */}
                            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
                                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
                                    <div>
                                        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                                            <span>Matriks Evaluasi 4 Komponen SAKIP Perangkat Daerah</span>
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                Tahun {evalYear}
                                            </span>
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Rincian bobot, perolehan nilai, persentase ketercapaian, dan predikat mutu komponen
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={handleCopyToClipboard}
                                            className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition flex items-center gap-1 cursor-pointer"
                                        >
                                            <Copy className="w-3.5 h-3.5" />
                                            <span>{copied ? 'Tersalin!' : 'Salin Tabel'}</span>
                                        </button>
                                        <a
                                            href={getExportUrl('sakip_pemda')}
                                            target="_blank"
                                            rel="noreferrer"
                                            title={`Download PDF Evaluasi SAKIP OPD Tahun ${evalYear}`}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 rounded hover:bg-emerald-700 transition"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                            <span>Download PDF LHE</span>
                                            <span className="rounded bg-white/20 px-1.5 py-0.2 text-[10px] font-bold">
                                                {evalYear}
                                            </span>
                                        </a>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                                            <tr>
                                                <th className="px-3 py-2.5 text-center font-bold w-12">No</th>
                                                <th className="px-3 py-2.5 text-left font-bold">Komponen Akuntabilitas</th>
                                                <th className="px-3 py-2.5 text-center font-bold w-24">Bobot (%)</th>
                                                <th className="px-3 py-2.5 text-center font-bold w-28">Nilai Capaian</th>
                                                <th className="px-3 py-2.5 text-center font-bold w-28">Persentase</th>
                                                <th className="px-3 py-2.5 text-center font-bold w-24">Predikat</th>
                                                <th className="px-3 py-2.5 text-left font-bold">Deskripsi &amp; Ruang Lingkup Evaluasi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {(sakipPemdaData?.komponen ?? []).map((k) => (
                                                <tr key={k.no} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                                                    <td className="px-3 py-2.5 text-center font-bold text-slate-500">{k.no}</td>
                                                    <td className="px-3 py-2.5 font-bold text-slate-800 dark:text-slate-200">{k.komponen}</td>
                                                    <td className="px-3 py-2.5 text-center font-semibold text-slate-600 dark:text-slate-400">{k.bobot.toFixed(1)}%</td>
                                                    <td className="px-3 py-2.5 text-center font-black text-emerald-700 dark:text-emerald-400 text-[13px]">{k.nilai.toFixed(2)}</td>
                                                    <td className="px-3 py-2.5 text-center font-bold text-slate-700 dark:text-slate-300">{k.persen.toFixed(1)}%</td>
                                                    <td className="px-3 py-2.5 text-center">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${predikatBadgeCls(k.predikat)}`}>
                                                            {k.predikat}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400 leading-relaxed text-[11.5px]">{k.deskripsi}</td>
                                                </tr>
                                            ))}
                                            {/* BARIS TOTAL */}
                                            <tr className="bg-emerald-50/70 dark:bg-emerald-950/40 border-t-2 border-emerald-300 dark:border-emerald-700 font-bold">
                                                <td colSpan={2} className="px-3 py-2.5 text-center text-emerald-950 dark:text-emerald-100 font-black">
                                                    TOTAL NILAI SAKIP OPD
                                                </td>
                                                <td className="px-3 py-2.5 text-center text-emerald-900 dark:text-emerald-200">100.0%</td>
                                                <td className="px-3 py-2.5 text-center text-emerald-900 dark:text-emerald-100 text-sm font-black">
                                                    {(sakipPemdaData?.nilai ?? 0.0).toFixed(2)}
                                                </td>
                                                <td className="px-3 py-2.5 text-center text-emerald-900 dark:text-emerald-200">
                                                    {(sakipPemdaData?.nilai ?? 0.0).toFixed(1)}%
                                                </td>
                                                <td className="px-3 py-2.5 text-center">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-black border ${predikatBadgeCls(sakipPemdaData?.predikat ?? 'BELUM DINILAI')}`}>
                                                        {sakipPemdaData?.predikat ?? 'BELUM DINILAI'}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2.5 text-emerald-800 dark:text-emerald-300 font-medium">
                                                    Hasil Akhir Evaluasi Akuntabilitas Kinerja Instansi Pemerintah (KemenPANRB)
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* KETERANGAN PENILAIAN PREDIKAT PKO / NKO */}
                            <KeteranganPenilaianPkoAkip title="Keterangan Penilaian Predikat Kinerja Organisasi (Pemerintah Daerah)" />

                            {/* CARD LHE KEMENPANRB */}
                            <div className="p-4 rounded-lg border border-purple-200 bg-purple-50/40 dark:bg-purple-950/20 dark:border-purple-900/60 shadow-2xs">
                                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                                    <div className="flex items-center gap-2">
                                        <FileCheck2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                        <h4 className="font-bold text-sm text-purple-950 dark:text-purple-100">
                                            Laporan Hasil Evaluasi (LHE) Resmi KemenPANRB
                                        </h4>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200">
                                            {sakipPemdaData?.lhe?.status_dokumen ?? 'LHE Resmi KemenPANRB'}
                                        </span>
                                        {sakipPemdaData?.lhe_file_url && (
                                            <a
                                                href={sakipPemdaData.lhe_file_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="px-2.5 py-1 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded transition flex items-center gap-1"
                                            >
                                                <Download className="w-3.5 h-3.5" />
                                                <span>Unduh File LHE</span>
                                            </a>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                    <div className="space-y-1.5 p-3 bg-white dark:bg-slate-900 rounded border border-purple-100 dark:border-purple-900/40">
                                        <p className="text-slate-500 font-medium">Nomor LHE &amp; Tanggal:</p>
                                        <p className="font-bold text-slate-800 dark:text-slate-200">
                                            {sakipPemdaData?.lhe?.nomor_lhe ? `${sakipPemdaData.lhe.nomor_lhe} • Tanggal: ${sakipPemdaData.lhe.tanggal ?? '-'}` : 'Belum Ada LHE'}
                                        </p>
                                        <p className="text-slate-500 font-medium mt-2">Evaluator:</p>
                                        <p className="font-semibold text-slate-700 dark:text-slate-300">
                                            {sakipPemdaData?.lhe?.evaluator ?? 'Kementerian PANRB'}
                                        </p>
                                    </div>
                                    <div className="space-y-1.5 p-3 bg-white dark:bg-slate-900 rounded border border-purple-100 dark:border-purple-900/40">
                                        <p className="text-slate-500 font-medium">Catatan Evaluator:</p>
                                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                                            {sakipPemdaData?.lhe?.catatan ?? (sakipPemdaData?.nilai ? `${instansiName} telah menunjukkan implementasi akuntabilitas kinerja dengan predikat mutu ${sakipPemdaData?.predikat || 'BELUM DINILAI'}.` : 'Belum ada catatan evaluasi LHE untuk tahun ini.')}
                                        </p>
                                        <p className="text-slate-500 font-medium mt-2">Rekomendasi Tindak Lanjut:</p>
                                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                                            {sakipPemdaData?.lhe?.rekomendasi ?? (sakipPemdaData?.nilai ? 'Tingkatkan kualitas efektivitas evaluasi internal terhadap seluruh perangkat daerah.' : 'Belum ada rekomendasi evaluasi LHE untuk tahun ini.')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = 
                        TAB 5: NILAI SAKIP OPD (Baris 3 Panduan)
                    = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =  */}
                    {activeTab === 'sakip_eval' && (
                        <div className="p-4 space-y-4">
                            {/* PENJELASAN KONSEP SAKIP VS CAPAIAN KINERJA */}
                            <div className="p-3.5 rounded-lg border border-purple-200 bg-purple-50/50 dark:bg-purple-950/20 dark:border-purple-900/60 text-xs text-purple-900 dark:text-purple-200 flex items-start gap-2.5">
                                <Medal className="h-5 w-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold text-[13px] text-purple-950 dark:text-purple-100">
                                        Perbedaan Nilai SAKIP OPD vs Capaian Kinerja OPD:
                                    </p>
                                    <p className="mt-0.5 text-purple-800 dark:text-purple-300 leading-relaxed text-[11.5px]">
                                        <strong>Capaian Kinerja OPD</strong> mengukur tingkat pemenuhan target output/outcome indikator. Sedangkan <strong>Nilai SAKIP OPD</strong> mengukur <em>kualitas penerapan sistem akuntabilitas kinerjanya</em> berdasarkan evaluasi akuntabilitas 4 komponen: <strong>Perencanaan Kinerja (30)</strong>, <strong>Pengukuran Kinerja (30)</strong>, <strong>Pelaporan Kinerja (15)</strong>, dan <strong>Evaluasi Internal (25)</strong> sesuai PermenPANRB 88/2021.
                                    </p>
                                </div>
                            </div>

                            {/* ACUAN SAKIP OPD */}
                            <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20 dark:border-emerald-900/60 flex items-center justify-between flex-wrap gap-2 text-xs text-emerald-900 dark:text-emerald-200">
                                <div className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                    <span>
                                        <strong>Acuan Evaluasi OPD:</strong> Nilai SAKIP OPD = <strong>{(sakipPemdaData?.nilai ?? 0.0).toFixed(2)}</strong> (Predikat <strong>{sakipPemdaData?.predikat ?? 'BELUM DINILAI'}</strong>) &bull; Rata-rata Nilai OPD: <strong>{(sakip_eval_matrix?.summary.rata_rata_nilai ?? 0.0).toFixed(2)}</strong>
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('sakip_pemda')}
                                    className="text-emerald-700 dark:text-emerald-300 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                    <span>Lihat Rincian SAKIP OPD</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {/* 9 KARTU UTAMA SAKIP OPD (7 TIER PREDIKAT BARU) */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSakipFilterPredikat('Semua')}
                                    className={`rounded-lg border p-2.5 text-center transition cursor-pointer shadow-2xs ${
                                        sakipFilterPredikat === 'Semua'
                                            ? 'border-purple-600 bg-purple-50/80 dark:bg-purple-950/40 ring-2 ring-purple-400'
                                            : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800'
                                    }`}
                                >
                                    <p className="text-[10px] font-semibold text-slate-500 uppercase">Total OPD</p>
                                    <p className="text-xl font-black text-slate-800 dark:text-white mt-0.5">{sakip_eval_matrix?.summary.opd_dievaluasi ?? 0}</p>
                                    <span className="text-[9px] text-slate-400 mt-0.5 block">Semua OPD</span>
                                </button>
                                <div className="rounded-lg border border-purple-200 bg-purple-50/60 p-2.5 text-center shadow-2xs">
                                    <p className="text-[10px] font-semibold text-purple-700 uppercase">Rata-rata Nilai</p>
                                    <p className="text-xl font-black text-purple-800 mt-0.5">{(sakip_eval_matrix?.summary.rata_rata_nilai ?? 0.0).toFixed(2)}</p>
                                    <span className="text-[9px] text-purple-600 font-semibold mt-0.5 block">Skala 100 Poin</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSakipFilterPredikat('AA')}
                                    className={`rounded-lg border p-2.5 text-center transition cursor-pointer shadow-2xs ${
                                        sakipFilterPredikat === 'AA'
                                            ? 'border-emerald-700 bg-emerald-100/90 ring-2 ring-emerald-500'
                                            : 'border-emerald-300 bg-emerald-50/70 hover:bg-emerald-100/50'
                                    }`}
                                >
                                    <p className="text-[10px] font-semibold text-emerald-800 uppercase">AA (&gt;90-100)</p>
                                    <p className="text-xl font-black text-emerald-900 mt-0.5">{sakip_eval_matrix?.summary.predikat_AA ?? sakip_eval_matrix?.summary.predikat_ISTIMEWA ?? 0}</p>
                                    <span className="text-[9px] text-emerald-700 mt-0.5 block">Sgt Memuaskan</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSakipFilterPredikat('A')}
                                    className={`rounded-lg border p-2.5 text-center transition cursor-pointer shadow-2xs ${
                                        sakipFilterPredikat === 'A'
                                            ? 'border-emerald-600 bg-emerald-100/80 ring-2 ring-emerald-400'
                                            : 'border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/50'
                                    }`}
                                >
                                    <p className="text-[10px] font-semibold text-emerald-700 uppercase">A (&gt;80-90)</p>
                                    <p className="text-xl font-black text-emerald-800 mt-0.5">{sakip_eval_matrix?.summary.predikat_A ?? sakip_eval_matrix?.summary.predikat_BAIK ?? 0}</p>
                                    <span className="text-[9px] text-emerald-600 mt-0.5 block">Memuaskan</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSakipFilterPredikat('BB')}
                                    className={`rounded-lg border p-2.5 text-center transition cursor-pointer shadow-2xs ${
                                        sakipFilterPredikat === 'BB'
                                            ? 'border-blue-600 bg-blue-100/80 ring-2 ring-blue-400'
                                            : 'border-blue-200 bg-blue-50/60 hover:bg-blue-100/50'
                                    }`}
                                >
                                    <p className="text-[10px] font-semibold text-blue-700 uppercase">BB (&gt;70-80)</p>
                                    <p className="text-xl font-black text-blue-800 mt-0.5">{sakip_eval_matrix?.summary.predikat_BB ?? sakip_eval_matrix?.summary.predikat_BUTUH_PERBAIKAN ?? 0}</p>
                                    <span className="text-[9px] text-blue-600 mt-0.5 block">Sangat Baik</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSakipFilterPredikat('B')}
                                    className={`rounded-lg border p-2.5 text-center transition cursor-pointer shadow-2xs ${
                                        sakipFilterPredikat === 'B'
                                            ? 'border-sky-600 bg-sky-100/80 ring-2 ring-sky-400'
                                            : 'border-sky-200 bg-sky-50/60 hover:bg-sky-100/50'
                                    }`}
                                >
                                    <p className="text-[10px] font-semibold text-sky-700 uppercase">B (&gt;60-70)</p>
                                    <p className="text-xl font-black text-sky-800 mt-0.5">{sakip_eval_matrix?.summary.predikat_B ?? 0}</p>
                                    <span className="text-[9px] text-sky-600 mt-0.5 block">Baik</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSakipFilterPredikat('CC')}
                                    className={`rounded-lg border p-2.5 text-center transition cursor-pointer shadow-2xs ${
                                        sakipFilterPredikat === 'CC'
                                            ? 'border-amber-500 bg-amber-100/80 ring-2 ring-amber-400'
                                            : 'border-amber-300 bg-amber-50/60 hover:bg-amber-100/50'
                                    }`}
                                >
                                    <p className="text-[10px] font-semibold text-amber-800 uppercase">CC (&gt;50-60)</p>
                                    <p className="text-xl font-black text-amber-900 mt-0.5">{sakip_eval_matrix?.summary.predikat_CC ?? 0}</p>
                                    <span className="text-[9px] text-amber-700 mt-0.5 block">Cukup</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSakipFilterPredikat('C')}
                                    className={`rounded-lg border p-2.5 text-center transition cursor-pointer shadow-2xs ${
                                        sakipFilterPredikat === 'C'
                                            ? 'border-orange-600 bg-orange-100/80 ring-2 ring-orange-400'
                                            : 'border-orange-200 bg-orange-50/60 hover:bg-orange-100/50'
                                    }`}
                                >
                                    <p className="text-[10px] font-semibold text-orange-700 uppercase">C (&gt;30-50)</p>
                                    <p className="text-xl font-black text-orange-800 mt-0.5">{sakip_eval_matrix?.summary.predikat_C ?? sakip_eval_matrix?.summary.predikat_KURANG ?? 0}</p>
                                    <span className="text-[9px] text-orange-600 mt-0.5 block">Kurang</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSakipFilterPredikat('D')}
                                    className={`rounded-lg border p-2.5 text-center transition cursor-pointer shadow-2xs ${
                                        sakipFilterPredikat === 'D'
                                            ? 'border-rose-600 bg-rose-100/80 ring-2 ring-rose-400'
                                            : 'border-rose-200 bg-rose-50/60 hover:bg-rose-100/50'
                                    }`}
                                >
                                    <p className="text-[10px] font-semibold text-rose-700 uppercase">D (0-30)</p>
                                    <p className="text-xl font-black text-rose-800 mt-0.5">{sakip_eval_matrix?.summary.predikat_D ?? sakip_eval_matrix?.summary.predikat_SANGAT_KURANG ?? sakip_eval_matrix?.summary.predikat_CC_bawah ?? 0}</p>
                                    <span className="text-[9px] text-rose-600 mt-0.5 block">Sangat Kurang</span>
                                </button>
                            </div>

                            {/* GRAFIK TREN 5 TAHUN NILAI SAKIP */}
                            <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-800 shadow-2xs">
                                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-100 dark:border-slate-700">
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                            <Medal className="h-4 w-4 text-purple-600" />
                                            Grafik Perkembangan Rata-rata Nilai SAKIP OPD ({activePeriodRange})
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Pemantauan tren mutu akuntabilitas kinerja perangkat daerah selama 5 tahun periode perencanaan
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                                            Target Standar BAIK (&ge; 80.00)
                                        </span>
                                    </div>
                                </div>
                                <SakipEvalTrendChart trend={sakip_eval_matrix?.trend ?? []} />
                            </div>

                            {/* TOOLBAR SWITCHER & FILTER */}
                            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Pilih Tampilan:</span>
                                    <button
                                        type="button"
                                        onClick={() => setSakipMatrixView('components')}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                                            sakipMatrixView === 'components'
                                                ? 'bg-purple-700 text-white shadow-xs'
                                                : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-100'
                                        }`}
                                    >
                                        <Layers className="h-3.5 w-3.5" />
                                        <span>Rincian Komponen SAKIP (1 Tahun)</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSakipMatrixView('trend_5yr')}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                                            sakipMatrixView === 'trend_5yr'
                                                ? 'bg-purple-700 text-white shadow-xs'
                                                : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-100'
                                        }`}
                                    >
                                        <TrendingUp className="h-3.5 w-3.5" />
                                        <span>Matriks Tren 5 Tahun ({activePeriodRange})</span>
                                    </button>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="w-56">
                                        <Select2
                                            value={sakipFilterPredikat}
                                            onChange={(val) => setSakipFilterPredikat(val)}
                                            options={[
                                                { value: 'Semua', label: `Semua Predikat (${sakip_eval_matrix?.rows?.length ?? 0})` },
                                                { value: 'AA', label: 'Predikat AA - Sangat Memuaskan (> 90)' },
                                                { value: 'A', label: 'Predikat A - Memuaskan (> 80 - 90)' },
                                                { value: 'BB', label: 'Predikat BB - Sangat Baik (> 70 - 80)' },
                                                { value: 'B', label: 'Predikat B - Baik (> 60 - 70)' },
                                                { value: 'CC', label: 'Predikat CC - Cukup/Memadai (> 50 - 60)' },
                                                { value: 'C', label: 'Predikat C - Kurang (> 30 - 50)' },
                                                { value: 'D', label: 'Predikat D - Sangat Kurang (0 - 30)' },
                                            ]}
                                            placeholder="Pilih Predikat"
                                            searchPlaceholder="Cari predikat..."
                                        />
                                    </div>
                                    {sakipFilterPredikat !== 'Semua' && (
                                        <button
                                            type="button"
                                            onClick={() => setSakipFilterPredikat('Semua')}
                                            className="text-xs text-purple-700 dark:text-purple-400 hover:underline font-semibold cursor-pointer"
                                        >
                                            Reset Filter
                                        </button>
                                    )}

                                    <TableSearchInput
                                        value={searchQuery}
                                        onChange={setSearchQuery}
                                        placeholder="Cari perangkat daerah..."
                                        className="w-44 sm:w-56"
                                    />

                                    <a
                                        href={getExportUrl('sakip_eval')}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md bg-purple-700 text-white hover:bg-purple-800 shadow-2xs cursor-pointer transition"
                                        title={`Download PDF Evaluasi SAKIP Tahun ${evalYear}`}
                                    >
                                        <FileDown className="h-3.5 w-3.5" />
                                        <span>Download PDF</span>
                                        <span className="rounded bg-white/20 px-1.5 py-0.2 text-[10px] font-bold">
                                            {evalYear}
                                        </span>
                                    </a>
                                </div>
                            </div>

                            {/* TABEL MATRIKS SAKIP OPD: VIEW 1 ATAU VIEW 2 */}
                            {sakipMatrixView === 'components' ? (
                                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                                    <table className="w-full text-left text-xs min-w-[860px]">
                                        <thead className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                            <tr>
                                                <th className="px-3 py-3 font-semibold text-center w-12">No</th>
                                                <th className="px-4 py-3 font-semibold">Perangkat Daerah</th>
                                                <th className="px-3 py-3 font-semibold text-right w-32">Perencanaan (30)</th>
                                                <th className="px-3 py-3 font-semibold text-right w-32">Pengukuran (30)</th>
                                                <th className="px-3 py-3 font-semibold text-right w-32">Pelaporan (15)</th>
                                                <th className="px-3 py-3 font-semibold text-right w-32">Evaluasi Internal (25)</th>
                                                <th className="px-3 py-3 font-semibold text-right w-28 font-bold text-slate-900 dark:text-white">Nilai SAKIP</th>
                                                <th className="px-3 py-3 font-semibold text-center w-24">Predikat</th>
                                                <th className="px-3 py-3 font-semibold text-center w-24">LHE</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                            {filteredSakipEval.length === 0 ? (
                                                <tr><td colSpan={9} className="py-8 text-center text-slate-400">Tidak ada data evaluasi SAKIP sesuai filter.</td></tr>
                                            ) : (
                                                filteredSakipEval.map((row) => (
                                                    <tr key={row.organization_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                                                        <td className="px-3 py-2.5 text-center text-slate-500 font-medium">{row.no}</td>
                                                        <td className="px-4 py-2.5">
                                                            <p className="font-semibold text-slate-800 dark:text-slate-200">{row.perangkat_daerah}</p>
                                                            <p className="text-[10px] text-slate-400 font-mono">{row.kode}</p>
                                                        </td>
                                                        <td className="px-3 py-2.5 text-right font-mono text-slate-600 dark:text-slate-300">{row.perencanaan.toFixed(2)}</td>
                                                        <td className="px-3 py-2.5 text-right font-mono text-slate-600 dark:text-slate-300">{row.pengukuran.toFixed(2)}</td>
                                                        <td className="px-3 py-2.5 text-right font-mono text-slate-600 dark:text-slate-300">{row.pelaporan.toFixed(2)}</td>
                                                        <td className="px-3 py-2.5 text-right font-mono text-slate-600 dark:text-slate-300">{row.evaluasi_internal.toFixed(2)}</td>
                                                        <td className="px-3 py-2.5 text-right font-mono font-extrabold text-purple-700 dark:text-purple-400 text-sm">{row.nilai.toFixed(2)}</td>
                                                        <td className="px-3 py-2.5 text-center">
                                                            <span className={`inline-flex px-2.5 py-0.5 rounded text-xs font-bold border ${predikatBadgeCls(row.predikat)}`}>
                                                                {row.predikat}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2.5 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => setSelectedLhe({ opd: row.perangkat_daerah, kode: row.kode, lhe: row.lhe, nilai: row.nilai, predikat: row.predikat })}
                                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-purple-50 text-purple-700 hover:bg-purple-100 text-[11px] font-semibold border border-purple-200 transition cursor-pointer"
                                                            >
                                                                <Eye className="h-3 w-3" />
                                                                <span>Lihat</span>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                /* VIEW 2: MATRIKS TREN 5 TAHUN (2025-2029) SAKIP OPD */
                                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                                    <table className="w-full text-left text-xs min-w-[980px]">
                                        <thead className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                            <tr>
                                                <th className="px-3 py-3 font-semibold text-center w-12">No</th>
                                                <th className="px-4 py-3 font-semibold">Perangkat Daerah</th>
                                                {sakipTrendYears.map((yr) => (
                                                    <th
                                                        key={yr}
                                                        className={`px-3 py-3 font-semibold text-center w-28 ${
                                                            yr === evalYear
                                                                ? 'bg-purple-200/80 text-purple-950 font-bold dark:bg-purple-900/60 dark:text-purple-100'
                                                                : ''
                                                        }`}
                                                    >
                                                        {yr} {yr === evalYear && <span className="text-[10px] font-normal block">(Aktif)</span>}
                                                    </th>
                                                ))}
                                                <th className="px-3 py-3 font-semibold text-center w-16">Tren</th>
                                                <th className="px-3 py-3 font-semibold text-right w-28 font-bold text-slate-900 dark:text-white">
                                                    Nilai ({evalYear})
                                                </th>
                                                <th className="px-3 py-3 font-semibold text-center w-24">Predikat</th>
                                                <th className="px-3 py-3 font-semibold text-center w-20">LHE</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                            {filteredSakipEval.length === 0 ? (
                                                <tr><td colSpan={11} className="py-8 text-center text-slate-400">Tidak ada data evaluasi SAKIP sesuai filter.</td></tr>
                                            ) : (
                                                filteredSakipEval.map((row) => (
                                                    <tr key={row.organization_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                                                        <td className="px-3 py-2.5 text-center text-slate-500 font-medium">{row.no}</td>
                                                        <td className="px-4 py-2.5">
                                                            <p className="font-semibold text-slate-800 dark:text-slate-200">{row.perangkat_daerah}</p>
                                                            <p className="text-[10px] text-slate-400 font-mono">{row.kode}</p>
                                                        </td>
                                                        {sakipTrendYears.map((yr) => {
                                                            const yData = row.yearly?.[yr];
                                                            const isCurrent = yr === evalYear;
                                                            return (
                                                                <td
                                                                    key={yr}
                                                                    className={`px-3 py-2.5 text-center font-mono ${
                                                                        isCurrent ? 'bg-purple-50/50 dark:bg-purple-950/20 font-bold' : ''
                                                                    }`}
                                                                >
                                                                    {yData ? (
                                                                        <div className="flex flex-col items-center">
                                                                            <span className={`text-xs ${isCurrent ? 'text-purple-800 dark:text-purple-300 font-extrabold' : 'text-slate-700 dark:text-slate-300'}`}>
                                                                                {yData.nilai.toFixed(2)}
                                                                            </span>
                                                                            <span className="text-[9px] font-semibold text-slate-400">
                                                                                {yData.predikat}
                                                                            </span>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-slate-400">-</span>
                                                                    )}
                                                                </td>
                                                            );
                                                        })}
                                                        <td className="px-3 py-2.5 text-center">
                                                            <span
                                                                className={`inline-flex items-center justify-center h-6 w-6 rounded-full font-bold text-xs ${
                                                                    (row.tren === '↑' || row.tren === '↑')
                                                                        ? 'bg-emerald-100 text-emerald-800'
                                                                        : (row.tren === '↓' || row.tren === '↓')
                                                                        ? 'bg-rose-100 text-rose-800'
                                                                        : 'bg-slate-100 text-slate-600'
                                                                }`}
                                                                title={`Tren dibandingkan 2025: ${row.tren}`}
                                                            >
                                                                {row.tren ?? '→'}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2.5 text-right font-mono font-extrabold text-purple-700 dark:text-purple-400 text-sm">
                                                            {row.nilai.toFixed(2)}
                                                        </td>
                                                        <td className="px-3 py-2.5 text-center">
                                                            <span className={`inline-flex px-2.5 py-0.5 rounded text-xs font-bold border ${predikatBadgeCls(row.predikat)}`}>
                                                                {row.predikat}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2.5 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => setSelectedLhe({ opd: row.perangkat_daerah, kode: row.kode, lhe: row.lhe, nilai: row.nilai, predikat: row.predikat })}
                                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-purple-50 text-purple-700 hover:bg-purple-100 text-[11px] font-semibold border border-purple-200 transition cursor-pointer"
                                                            >
                                                                <Eye className="h-3 w-3" />
                                                                <span>Lihat</span>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* KETERANGAN PENILAIAN PREDIKAT SAKIP */}
                            <KeteranganPenilaianSakip title="Keterangan Klasifikasi Predikat & Rentang Nilai SAKIP" />

                            {/* CATATAN FORMULA / REGULASI */}
                            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Medal className="h-4 w-4 text-purple-600 shrink-0" />
                                    <span>
                                        <strong>Bobot Komponen SAKIP (PermenPANRB 88/2021):</strong> Perencanaan Kinerja (30%), Pengukuran Kinerja (30%), Pelaporan Kinerja (15%), Evaluasi Akuntabilitas Kinerja Internal (25%).
                                    </span>
                                </div>
                                <span className="font-mono text-xs text-purple-700 font-semibold shrink-0">
                                    Total: 100 Poin
                                </span>
                            </div>
                        </div>
                    )}

                    {/* ===============================================================
                        TAB 6: CAPAIAN PKO OPD (Baris 4 Panduan)
                    =============================================================== */}
                    {activeTab === 'pko' && (
                        <div className="p-4 space-y-4">
                            {/* Sub-tab Navigation: Item 6 vs Item 7 */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setPkoSubView('pemda')}
                                        className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all flex items-center gap-2 cursor-pointer ${
                                            pkoSubView === 'pemda'
                                                ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                                        }`}
                                    >
                                        <Building2 className="h-4 w-4" />
                                        <span>PKO Dinas PUPR (Tingkat Dinas)</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPkoSubView('opd')}
                                        className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all flex items-center gap-2 cursor-pointer ${
                                            pkoSubView === 'opd'
                                                ? 'bg-primary text-white border-primary-dark shadow-xs'
                                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                                        }`}
                                    >
                                        <Trophy className="h-4 w-4" />
                                        <span>PKO Bidang &amp; Seksi (Seluruh Unit Kerja)</span>
                                    </button>
                                </div>

                                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono hidden sm:inline">
                                    Panduan Teknis: Evaluasi Capaian Kinerja Unit Kerja Dinas PUPR
                                </span>
                            </div>

                            {pkoSubView === 'pemda' ? (
                                <div className="space-y-4">
                                    {/* Callout Penjelasan Tingkat Dinas */}
                                    <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
                                        <Building2 className="h-5 w-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                                        <div className="space-y-1">
                                            <p className="font-bold text-sm">
                                                Capaian Penilaian Kinerja Organisasi (PKO) Dinas PUPR Kabupaten Mimika
                                            </p>
                                            <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
                                                Ini adalah capaian PKO <strong>Dinas PUPR Kabupaten Mimika secara menyeluruh</strong>. Data dikonsolidasikan dari realisasi capaian kinerja tahunan seluruh bidang, subbagian, dan seksi.
                                            </p>
                                        </div>
                                    </div>

                                    {/* 2 Kartu Utama PKO Dinas */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="rounded-lg border border-amber-300 bg-amber-50/80 dark:bg-amber-950/40 p-4 text-center shadow-2xs">
                                            <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">Nilai PKO Dinas PUPR ({evalYear})</p>
                                            <p className="text-3xl font-black text-amber-900 dark:text-amber-100 mt-1">
                                                {(pko_matrix?.pemda_pko?.nilai ?? 0).toFixed(2)}
                                            </p>
                                            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold mt-0.5 block">Tahun Evaluasi Berjalan</span>
                                        </div>

                                        <div className="rounded-lg border border-slate-200 bg-white dark:bg-slate-800 p-4 text-center shadow-2xs">
                                            <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Predikat PKO Dinas PUPR</p>
                                            <div className="mt-1.5 flex items-center justify-center">
                                                <span className={`inline-flex px-3 py-1 rounded text-sm font-black border ${predikatBadgeCls(pko_matrix?.pemda_pko?.predikat ?? '-')}`}>
                                                    {pko_matrix?.pemda_pko?.predikat ?? '-'}
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-slate-500 font-mono mt-1 block">Standar PermenPANRB 22/2024</span>
                                        </div>
                                    </div>

                                    {/* GRAFIK TREN 5 TAHUN PKO OPD */}
                                    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-800 shadow-2xs">
                                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-100 dark:border-slate-700">
                                            <div>
                                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                                    <TrendingUp className="h-4 w-4 text-amber-600" />
                                                    Grafik Tren Capaian PKO Dinas PUPR Kabupaten Mimika
                                                </h3>
                                                <p className="text-[11px] text-slate-500">Visualisasi deret waktu capaian PKO gabungan Dinas PUPR: Realisasi baseline historis, tahun aktif, dan target proyeksi perencanaan 5 tahun.</p>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                                    <span className="w-2 h-2 rounded-full bg-amber-500"></span> {evalYear} Aktif: {(pko_matrix?.pemda_pko?.nilai ?? 0.0).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                        <PkoPemdaTrendChart trend={pko_matrix?.pemda_pko?.trend ?? []} evalYear={evalYear} />
                                    </div>

                                    {/* MATRIKS TABEL DETAIL ACUAN (Tahun | Nilai | Predikat) */}
                                    <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-800 shadow-2xs overflow-hidden">
                                        <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <FileSpreadsheet className="h-4 w-4 text-amber-600" />
                                                <span className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                                                    Matriks Capaian PKO Dinas PUPR Kabupaten Mimika per Tahun (Acuan Tampilan Detail)
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={handleCopyToClipboard}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                                                >
                                                    <Copy className="h-3.5 w-3.5 text-slate-500" />
                                                    <span>{copied ? 'Tersalin!' : 'Salin Tabel (Excel)'}</span>
                                                </button>
                                                <a
                                                    href={getExportUrl('pko_pemda')}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-amber-600 text-white hover:bg-amber-700 shadow-2xs cursor-pointer"
                                                    title={`Download PDF PKO OPD Tahun ${evalYear}`}
                                                >
                                                    <FileDown className="h-3.5 w-3.5" />
                                                    <span>Download PDF</span>
                                                    <span className="rounded bg-white/20 px-1 py-0.2 text-[10px] font-bold">
                                                        {evalYear}
                                                    </span>
                                                </a>
                                            </div>
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-xs min-w-[600px]">
                                                <thead className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                                                    <tr>
                                                         <th className="px-5 py-3 font-bold w-28 text-center">Tahun</th>
                                                         <th className="px-5 py-3 font-bold text-right w-44">Nilai</th>
                                                         <th className="px-5 py-3 font-bold text-center w-36">Predikat</th>
                                                         <th className="px-4 py-3 font-bold text-center w-24">Tren</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                    {(pko_matrix?.pemda_pko?.trend ?? []).map((row) => {
                                                        const isCurYear = row.tahun === evalYear;
                                                        return (
                                                            <tr
                                                                key={row.tahun}
                                                                className={`hover:bg-slate-50 dark:hover:bg-slate-800/60 transition ${
                                                                    isCurYear ? 'bg-amber-50/50 dark:bg-amber-950/20 font-semibold' : ''
                                                                }`}
                                                            >
                                                                <td className="px-5 py-3.5 text-center font-extrabold text-slate-800 dark:text-white">
                                                                    <div className="inline-flex items-center gap-1.5">
                                                                        <span>{row.tahun}</span>
                                                                        {isCurYear && (
                                                                            <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-bold">
                                                                                Aktif
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                 <td className="px-5 py-3.5 text-right font-mono font-black text-blue-700 dark:text-blue-400 text-base">
                                                                    {row.nilai != null ? row.nilai.toFixed(2) : '-'}
                                                                </td>
                                                                <td className="px-5 py-3.5 text-center">
                                                                    <span className={`inline-flex px-3 py-1 rounded text-xs font-black border ${predikatBadgeCls(row.predikat)}`}>
                                                                        {row.predikat}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3.5 text-center">
                                                                    <span
                                                                        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black ${
                                                                            (row.tren === '↑' || row.tren === '↑')
                                                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                                                                : (row.tren === '↓' || row.tren === '↓')
                                                                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                                                                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                                                                        }`}
                                                                        title={`Arah tren YoY: ${row.tren}`}
                                                                    >
                                                                        {row.tren ?? '→'}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* KETERANGAN PENILAIAN PREDIKAT PKO / NKO */}
                                    <KeteranganPenilaianPkoAkip title={`Keterangan Penilaian Predikat PKO Dinas PUPR`} />
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Banner Konteks Item 7: Pembanding Kinerja Seluruh Bidang & Seksi */}
                                    <div className="p-3.5 bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-900 dark:text-blue-200 flex items-start gap-3">
                                        <Trophy className="h-5 w-5 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5" />
                                        <div className="space-y-1">
                                            <p className="font-bold text-sm">
                                                Capaian Penilaian Kinerja Organisasi (PKO) Bidang &amp; Seksi
                                            </p>
                                            <p className="text-blue-800 dark:text-blue-300 leading-relaxed">
                                                Matriks ini digunakan untuk <strong>membandingkan kinerja seluruh Bidang, Seksi, dan Subbagian</strong> di lingkungan Dinas PUPR Kabupaten Mimika. Nilai Kinerja Organisasi (NKO / PKO) dihitung langsung dari capaian indikator kinerja secara transparan dan akuntabel sesuai standar PermenPANRB No. 22/2024.
                                            </p>
                                        </div>
                                    </div>

                                    {/* 4 Kartu Ringkasan Eksekutif PKO Unit Kerja */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <div className="rounded-lg border border-slate-200 bg-white dark:bg-slate-800 p-4 text-center shadow-2xs">
                                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Unit Kerja Dievaluasi</p>
                                            <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                                                {pko_matrix?.opd_pko?.total_opd ?? 0}
                                            </p>
                                            <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block">Bidang, Subbag &amp; Seksi Aktif</span>
                                        </div>

                                        <div className="rounded-lg border border-blue-200 bg-blue-50/70 dark:bg-blue-950/40 p-4 text-center shadow-2xs">
                                            <p className="text-[11px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider">Rata-rata PKO Unit Kerja ({evalYear})</p>
                                            <p className="text-3xl font-black text-blue-900 dark:text-blue-100 mt-1">
                                                {((pko_matrix?.opd_pko?.rows?.reduce((acc, r) => acc + r.nilai_pko, 0) ?? 0) / (pko_matrix?.opd_pko?.rows?.length || 1)).toFixed(2)}
                                            </p>
                                            {(() => {
                                                const rowCount = pko_matrix?.opd_pko?.rows?.length ?? 0;
                                                const avgPko = rowCount > 0 ? (pko_matrix?.opd_pko?.rows?.reduce((acc, r) => acc + r.nilai_pko, 0) ?? 0) / rowCount : 0;
                                                const avgPredPko = rowCount === 0 ? 'BELUM DINILAI' : (avgPko > 90 ? 'AA' : avgPko > 80 ? 'A' : avgPko > 70 ? 'BB' : avgPko > 60 ? 'B' : avgPko > 50 ? 'CC' : avgPko > 30 ? 'C' : 'D');
                                                return (
                                                    <span className="text-[10px] text-blue-700 dark:text-blue-400 font-semibold mt-0.5 block">
                                                        Predikat PKO: <strong>{avgPredPko}</strong>
                                                    </span>
                                                );
                                            })()}
                                        </div>

                                        <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 dark:bg-emerald-950/40 p-4 text-center shadow-2xs">
                                            <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">Peringkat #1 (Tertinggi)</p>
                                            <p className="text-base font-black text-emerald-900 dark:text-emerald-100 mt-1 truncate" title={pko_matrix?.opd_pko?.rows?.[0]?.perangkat_daerah ?? '-'}>
                                                {pko_matrix?.opd_pko?.rows?.[0]?.perangkat_daerah ?? '-'}
                                            </p>
                                            <span className="text-xs text-emerald-700 dark:text-emerald-300 font-mono font-bold mt-0.5 block">
                                                {pko_matrix?.opd_pko?.rows?.[0] ? `Skor: ${pko_matrix.opd_pko.rows[0].nilai_pko.toFixed(2)} (Predikat ${pko_matrix.opd_pko.rows[0].predikat ?? 'BELUM DINILAI'})` : 'Belum Ada Penilaian'}
                                            </span>
                                        </div>

                                        <div className="rounded-lg border border-rose-200 bg-rose-50/70 dark:bg-rose-950/40 p-4 text-center shadow-2xs">
                                            <p className="text-[11px] font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider">Butuh Perhatian Khusus</p>
                                            <p className="text-3xl font-black text-rose-900 dark:text-rose-100 mt-1">
                                                {pko_matrix?.opd_pko?.attention_count ?? pko_matrix?.opd_pko?.rows?.filter((r) => ['C','D','KURANG','SANGAT KURANG'].includes((r.predikat||'').toUpperCase()) || (r.nilai_pko != null && r.nilai_pko <= 50))?.length ?? 0}
                                            </p>
                                            <span className="text-[10px] text-rose-700 dark:text-rose-400 font-semibold mt-0.5 block">Unit Kerja dengan Nilai Terendah</span>
                                        </div>
                                    </div>

                                    {/* Segmentasi & View Mode Switcher */}
                                    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-800">
                                        <div className="flex flex-wrap items-center gap-2 text-xs">
                                            <span className="font-semibold text-slate-700 dark:text-slate-300">Segmentasi Analisis:</span>
                                            <button
                                                onClick={() => setPkoFilterView('all')}
                                                className={`px-3 py-1.5 rounded-md font-semibold transition cursor-pointer ${
                                                    pkoFilterView === 'all'
                                                        ? 'bg-primary text-white shadow-xs'
                                                        : 'bg-white border text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                                                }`}
                                            >
                                                Semua OPD ({pko_matrix?.opd_pko?.rows?.length ?? 0})
                                            </button>
                                            <button
                                                onClick={() => setPkoFilterView('top')}
                                                className={`px-3 py-1.5 rounded-md font-semibold transition cursor-pointer ${
                                                    pkoFilterView === 'top'
                                                        ? 'bg-emerald-600 text-white shadow-xs'
                                                        : 'bg-white border text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                                                }`}
                                            >
                                                <Trophy className="w-3.5 h-3.5 inline mr-1.5" />Top 10 OPD
                                            </button>
                                            <button
                                                onClick={() => setPkoFilterView('bottom')}
                                                className={`px-3 py-1.5 rounded-md font-semibold transition cursor-pointer ${
                                                    pkoFilterView === 'bottom'
                                                        ? 'bg-rose-600 text-white shadow-xs'
                                                        : 'bg-white border text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                                                }`}
                                            >
                                                <AlertTriangle className="w-3.5 h-3.5 inline mr-1.5" />10 OPD Membutuhkan Perhatian
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-800 shadow-2xs">
                                                <button
                                                    onClick={() => setPkoOpdMatrixView('ranking')}
                                                    className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                                                        pkoOpdMatrixView === 'ranking' ? 'bg-primary text-white' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                                                    }`}
                                                >
                                                    Ranking ({evalYear})
                                                </button>
                                                <button
                                                    onClick={() => setPkoOpdMatrixView('trend_5yr')}
                                                    className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                                                        pkoOpdMatrixView === 'trend_5yr' ? 'bg-primary text-white' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                                                    }`}
                                                >
                                                    Tren PKO
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* GRAFIK PERINGKAT NILAI PKO PERANGKAT DAERAH (ECharts) */}
                                    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-800 shadow-2xs">
                                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-100 dark:border-slate-700">
                                            <div>
                                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                                    <BarChart3 className="h-4 w-4 text-blue-600" />
                                                    Grafik Peringkat Capaian PKO Perangkat Daerah ({evalYear})
                                                </h3>
                                                <p className="text-[11px] text-slate-500">
                                                    Visualisasi perbandingan nilai PKO berdasarkan segmentasi: {pkoFilterView === 'top' ? 'Top 10 OPD Terbaik' : pkoFilterView === 'bottom' ? '10 OPD Membutuhkan Perhatian' : 'Seluruh Perangkat Daerah'}.
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-1.5 text-[10.5px]">
                                                <span className="inline-flex items-center gap-1 text-blue-800 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 font-bold">
                                                    <span className="w-2 h-2 rounded-full bg-blue-600"></span> ISTIMEWA (&gt;100%)
                                                </span>
                                                <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 font-bold">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span> BAIK (&gt;80–100%)
                                                </span>
                                                <span className="inline-flex items-center gap-1 text-amber-900 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-700 font-bold">
                                                    <span className="w-2 h-2 rounded-full bg-amber-400"></span> BUTUH PERBAIKAN (&gt;60–80%)
                                                </span>
                                                <span className="inline-flex items-center gap-1 text-orange-800 bg-orange-50 dark:bg-orange-950/40 dark:text-orange-300 px-2 py-0.5 rounded border border-orange-200 dark:border-orange-800 font-bold">
                                                    <span className="w-2 h-2 rounded-full bg-orange-500"></span> KURANG (&gt;20–60%)
                                                </span>
                                                <span className="inline-flex items-center gap-1 text-rose-800 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800 font-bold">
                                                    <span className="w-2 h-2 rounded-full bg-rose-600"></span> SANGAT KURANG (&le;20%)
                                                </span>
                                            </div>
                                        </div>
                                        <PkoOpdRankingBarChart rows={filteredPkoOpd} />
                                    </div>

                                    {/* TABEL MATRIKS PKO OPD: FORMAT BAKU ACUAN TAMPILAN DETAIL */}
                                    <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-800 shadow-2xs overflow-hidden">
                                        <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                                                <span className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                                                    Matriks Capaian PKO Perangkat Daerah ({pkoOpdMatrixView === 'ranking' ? `Ranking ${evalYear}` : 'Tren PKO'})
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <TableSearchInput
                                                    value={searchQuery}
                                                    onChange={setSearchQuery}
                                                    placeholder="Cari OPD atau predikat..."
                                                    className="w-48 sm:w-60"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleCopyToClipboard}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                                                >
                                                    <Copy className="h-3.5 w-3.5 text-slate-500" />
                                                    <span>{copied ? 'Tersalin!' : 'Salin Tabel (Excel)'}</span>
                                                </button>
                                                <a
                                                    href={getExportUrl('pko_opd')}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-primary text-white hover:bg-primary/90 shadow-2xs cursor-pointer"
                                                    title={`Download PDF PKO OPD Tahun ${evalYear}`}
                                                >
                                                    <FileDown className="h-3.5 w-3.5" />
                                                    <span>Download PDF</span>
                                                    <span className="rounded bg-white/20 px-1 py-0.2 text-[10px] font-bold">
                                                        {evalYear}
                                                    </span>
                                                </a>
                                            </div>
                                        </div>

                                        {pkoOpdMatrixView === 'ranking' ? (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-xs min-w-[850px]">
                                                    <thead className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                                                         <tr>
                                                            <th className="px-3 py-3 font-bold text-center w-12">No</th>
                                                            <th className="px-4 py-3 font-bold">Perangkat Daerah</th>
                                                            <th className="px-3 py-3 font-bold text-right w-32">Capaian PK</th>
                                                            <th className="px-3 py-3 font-bold text-right w-32">Nilai PKO (NKO)</th>
                                                            <th className="px-3 py-3 font-bold text-center w-36">Predikat PKO</th>
                                                            <th className="px-3 py-3 font-bold text-center w-24">Peringkat</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                        {filteredPkoOpd.length === 0 ? (
                                                            <tr><td colSpan={6} className="py-8 text-center text-slate-400">Tidak ada data PKO yang cocok.</td></tr>
                                                        ) : (
                                                            filteredPkoOpd.map((row, idx) => (
                                                                <tr key={row.organization_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                                                                    <td className="px-3 py-3 text-center font-bold text-slate-500">
                                                                        {idx + 1}
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        <p className="font-bold text-slate-800 dark:text-slate-200">{row.perangkat_daerah}</p>
                                                                        <p className="text-[10px] text-slate-400 font-mono">{row.kode}</p>
                                                                    </td>
                                                                    <td className="px-3 py-3 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                                                                        {row.capaian_kinerja.toFixed(2)}%
                                                                    </td>
                                                                    <td className="px-3 py-3 text-right font-mono font-black text-blue-700 dark:text-blue-400 text-sm">
                                                                        {row.nilai_pko.toFixed(2)}
                                                                    </td>
                                                                    <td className="px-3 py-3 text-center">
                                                                        <span className={`inline-flex px-2.5 py-0.5 rounded text-xs font-bold border ${predikatBadgeCls(row.predikat)}`}>
                                                                            {row.predikat}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-3 py-3 text-center font-bold text-slate-700 dark:text-slate-300">
                                                                        {row.peringkat <= 3 ? (
                                                                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-extrabold text-xs">
                                                                                {row.peringkat}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="font-mono text-xs">#{row.peringkat}</span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-xs min-w-[850px]">
                                                    <thead className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                                                        <tr>
                                                            <th className="px-3 py-3 font-bold text-center w-12">No</th>
                                                            <th className="px-4 py-3 font-bold">Perangkat Daerah</th>
                                                            {pkoYears.map((yr) => (
                                                                <th
                                                                    key={yr}
                                                                    className={`px-3 py-3 font-bold text-right w-20 ${
                                                                        yr === evalYear
                                                                            ? 'bg-amber-50/70 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200 font-extrabold'
                                                                            : ''
                                                                    }`}
                                                                >
                                                                    {yr} {yr === evalYear ? '(Aktif)' : ''}
                                                                </th>
                                                            ))}
                                                            <th className="px-3 py-3 font-bold text-center w-16">Tren</th>
                                                            <th className="px-3 py-3 font-bold text-right w-24">Nilai ({evalYear})</th>
                                                            <th className="px-3 py-3 font-bold text-center w-24">Predikat</th>
                                                            <th className="px-3 py-3 font-bold text-center w-20">Peringkat</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                        {filteredPkoOpd.length === 0 ? (
                                                            <tr><td colSpan={6 + pkoYears.length} className="py-8 text-center text-slate-400">Tidak ada data PKO yang cocok.</td></tr>
                                                        ) : (
                                                            filteredPkoOpd.map((row, idx) => (
                                                                <tr key={row.organization_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                                                                    <td className="px-3 py-2.5 text-center font-bold text-slate-500">{idx + 1}</td>
                                                                    <td className="px-4 py-2.5">
                                                                        <p className="font-bold text-slate-800 dark:text-slate-200">{row.perangkat_daerah}</p>
                                                                        <p className="text-[10px] text-slate-400 font-mono">{row.kode}</p>
                                                                    </td>
                                                                    {pkoYears.map((yr) => (
                                                                        <td
                                                                            key={yr}
                                                                            className={`px-3 py-2.5 text-right font-mono ${
                                                                                yr === evalYear
                                                                                    ? 'font-bold text-amber-900 bg-amber-50/40 dark:bg-amber-950/20 dark:text-amber-200'
                                                                                    : 'text-slate-600'
                                                                            }`}
                                                                        >
                                                                            {row.yearly?.[yr]?.nilai != null ? row.yearly[yr].nilai.toFixed(2) : '-'}
                                                                        </td>
                                                                    ))}
                                                                    <td className="px-3 py-2.5 text-center">
                                                                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${(row.tren === '↑' || row.tren === '↑') ? 'bg-emerald-100 text-emerald-800' : (row.tren === '↓' || row.tren === '↓') ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'}`}>
                                                                            {row.tren ?? '→'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-3 py-2.5 text-right font-mono font-extrabold text-blue-700 dark:text-blue-400 text-sm">
                                                                        {row.nilai_pko.toFixed(2)}
                                                                    </td>
                                                                    <td className="px-3 py-2.5 text-center">
                                                                        <span className={`inline-flex px-2.5 py-0.5 rounded text-xs font-bold border ${predikatBadgeCls(row.predikat)}`}>
                                                                            {row.predikat}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-3 py-2.5 text-center font-bold text-slate-700 dark:text-slate-300">
                                                                        <span className="font-mono text-xs">#{row.peringkat}</span>
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>

                                    {/* KETERANGAN PENILAIAN PREDIKAT PKO / NKO */}
                                    <KeteranganPenilaianPkoAkip title="Keterangan Penilaian Predikat PKO Seluruh Perangkat Daerah" />
                                </div>
                            )}
                        </div>
                    )}

                    {/* ===============================================================
                        TAB 7: CAPAIAN RENCANA AKSI TRIWULAN (Baris 5 Panduan)
                    =============================================================== */}
                    {activeTab === 'action_plans' && (
                        <div className="p-4 space-y-4">
                            {/* 💡 CALLOUT EARLY WARNING SYSTEM */}
                            <div className="rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50/60 p-4 text-amber-900 dark:border-amber-700/60 dark:bg-slate-800 dark:text-amber-200 shadow-2xs">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-300 shrink-0">
                                        <ShieldAlert className="h-5 w-5" />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-bold text-amber-950 dark:text-amber-100 flex items-center gap-2">
                                            <span>8. Capaian Kinerja Rencana Aksi Triwulan - Early Warning System (EWS)</span>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-200/80 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200">
                                                Monitoring {actionPlansTw} Tahun {evalYear}
                                            </span>
                                        </h4>
                                        <p className="text-xs leading-relaxed text-amber-900/90 dark:text-amber-200/90">
                                            <strong>Sangat krusial sebagai sistem deteksi dini (Early Warning System)</strong>. Pimpinan daerah dan pimpinan OPD tidak perlu menunggu bulan Desember untuk mengetahui bahwa target indikator atau kegiatan tidak tercapai. Pengendalian dan intervensi dapat dieksekusi sejak triwulan berjalan.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* 5 KARTU RINGKASAN EKSEKUTIF EWS */}
                            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
                                <div
                                    onClick={() => setActionPlansStatusFilter('Semua')}
                                    className={`rounded-lg border p-3 text-center shadow-2xs cursor-pointer transition ${actionPlansStatusFilter === 'Semua' ? 'border-primary ring-2 ring-primary/20 bg-white dark:bg-slate-800' : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800'}`}
                                >
                                    <p className="text-[10px] font-semibold text-slate-500 uppercase">Total OPD / Renaksi</p>
                                    <p className="text-xl font-black text-slate-800 dark:text-white mt-0.5">
                                        {action_plans_matrix?.summary?.total_opd ?? filteredActionPlansOpd.length} / {action_plans_matrix?.summary?.total_renaksi ?? filteredActionPlans.length}
                                    </p>
                                    <span className="text-[10px] text-slate-400 font-medium">Periode {actionPlansTw}</span>
                                </div>
                                <div className="rounded-lg border border-blue-200 bg-blue-50/60 dark:border-blue-800 dark:bg-blue-950/40 p-3 text-center shadow-2xs">
                                    <p className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 uppercase">Rata-rata Capaian</p>
                                    <p className="text-xl font-black text-blue-800 dark:text-blue-200 mt-0.5">
                                        {action_plans_matrix?.summary?.opd_summary?.rata_capaian ?? action_plans_matrix?.summary?.rata_capaian ?? 0}%
                                    </p>
                                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">Agregat {actionPlansTw}</span>
                                </div>
                                <div
                                    onClick={() => setActionPlansStatusFilter(actionPlansStatusFilter === 'Tercapai' ? 'Semua' : 'Tercapai')}
                                    className={`rounded-lg border p-3 text-center shadow-2xs cursor-pointer transition ${actionPlansStatusFilter === 'Tercapai' ? 'border-emerald-500 ring-2 ring-emerald-300 bg-emerald-100/70' : 'border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/50 dark:border-emerald-800 dark:bg-emerald-950/40'}`}
                                >
                                    <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase">Tercapai (On-Track)</p>
                                    <p className="text-xl font-black text-emerald-800 dark:text-emerald-200 mt-0.5">
                                        {action_plans_matrix?.summary?.opd_summary?.tercapai ?? 0} <span className="text-xs font-normal">OPD</span>
                                    </p>
                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400">≥ 100% Target</span>
                                </div>
                                <div
                                    onClick={() => setActionPlansStatusFilter(actionPlansStatusFilter === 'Perlu Perhatian' ? 'Semua' : 'Perlu Perhatian')}
                                    className={`rounded-lg border p-3 text-center shadow-2xs cursor-pointer transition ${actionPlansStatusFilter === 'Perlu Perhatian' ? 'border-amber-500 ring-2 ring-amber-300 bg-amber-100/70' : 'border-amber-200 bg-amber-50/60 hover:bg-amber-100/50 dark:border-amber-800 dark:bg-amber-950/40'}`}
                                >
                                    <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 uppercase">Perlu Perhatian</p>
                                    <p className="text-xl font-black text-amber-800 dark:text-amber-200 mt-0.5">
                                        {action_plans_matrix?.summary?.opd_summary?.perlu_perhatian ?? 0} <span className="text-xs font-normal">OPD</span>
                                    </p>
                                    <span className="text-[10px] text-amber-600 dark:text-amber-400">50% – 99.9%</span>
                                </div>
                                <div
                                    onClick={() => setActionPlansStatusFilter(actionPlansStatusFilter === 'Kritis' ? 'Semua' : 'Kritis')}
                                    className={`rounded-lg border p-3 text-center shadow-2xs cursor-pointer transition ${actionPlansStatusFilter === 'Kritis' ? 'border-rose-500 ring-2 ring-rose-300 bg-rose-100/70' : 'border-rose-200 bg-rose-50/60 hover:bg-rose-100/50 dark:border-rose-800 dark:bg-rose-950/40'}`}
                                >
                                    <p className="text-[10px] font-semibold text-rose-700 dark:text-rose-300 uppercase">Kritis</p>
                                    <p className="text-xl font-black text-rose-800 dark:text-rose-200 mt-0.5">
                                        {action_plans_matrix?.summary?.opd_summary?.kritis ?? 0} <span className="text-xs font-normal">OPD</span>
                                    </p>
                                    <span className="text-[10px] text-rose-600 dark:text-rose-400">&lt; 50%</span>
                                </div>
                                <div
                                    onClick={() => setActionPlansStatusFilter(actionPlansStatusFilter === 'Tidak Dinilai' ? 'Semua' : 'Tidak Dinilai')}
                                    className={`rounded-lg border p-3 text-center shadow-2xs cursor-pointer transition ${actionPlansStatusFilter === 'Tidak Dinilai' ? 'border-slate-500 ring-2 ring-slate-300 bg-slate-100/70 dark:bg-slate-700' : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/50 dark:border-slate-700 dark:bg-slate-800/60'}`}
                                >
                                    <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase">Tidak Dinilai</p>
                                    <p className="text-xl font-black text-slate-700 dark:text-slate-200 mt-0.5">
                                        {action_plans_matrix?.summary?.opd_summary?.tidak_dinilai ?? 0} <span className="text-xs font-normal">OPD</span>
                                    </p>
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Target &amp; Real = 0</span>
                                </div>
                            </div>

                            {/* DUA GRAFIK VISUALISASI CAPAIAN RENCANA AKSI */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                                {/* Grafik 1: Komparasi Seluruh OPD */}
                                <div className="lg:col-span-7 rounded-lg border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-800">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                            <BarChart3 className="h-4 w-4 text-emerald-600" />
                                            <span>Komparasi Capaian Rencana Aksi Antar Perangkat Daerah ({actionPlansTw})</span>
                                        </h3>
                                        <span className="text-[10px] text-slate-400">Target 100%</span>
                                    </div>
                                    <ActionPlansOpdRankingBarChart rows={filteredActionPlansOpd} triwulan={actionPlansTw} />
                                </div>

                                {/* Grafik 2: Tren Agregat 4 Triwulan */}
                                <div className="lg:col-span-5 rounded-lg border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-800 flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                                <TrendingUp className="h-4 w-4 text-blue-600" />
                                                <span>Tren Pergerakan Triwulanan (TW I – TW IV)</span>
                                            </h3>
                                            <span className="text-[10px] text-blue-600 font-semibold">{evalYear}</span>
                                        </div>
                                        <ActionPlansQuarterChart trend={action_plans_matrix?.trend ?? []} />
                                    </div>
                                    <div className="mt-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300">
                                        <div className="grid grid-cols-4 gap-1 text-center font-mono">
                                            {(action_plans_matrix?.trend ?? []).map((t, idx) => (
                                                <div key={idx} className={`p-1 rounded ${t.triwulan === actionPlansTw ? 'bg-blue-100 text-blue-900 font-bold dark:bg-blue-900/60 dark:text-blue-200' : ''}`}>
                                                    <span className="block text-[10px] text-slate-500">{t.triwulan}</span>
                                                    <span>{t.capaian != null ? `${t.capaian.toFixed(1)}%` : '-'}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* BAR FILTER DAN MODE VIEW TABEL */}
                            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                                {/* Mode Tampilan Switcher */}
                                <div className="flex items-center gap-1 bg-white dark:bg-slate-700 p-1 rounded-lg border border-slate-200 dark:border-slate-600">
                                    <button
                                        type="button"
                                        onClick={() => setActionPlansViewMode('opd_summary')}
                                        className={`px-3 py-1.5 rounded text-xs font-bold transition cursor-pointer ${actionPlansViewMode === 'opd_summary' ? 'bg-primary text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'}`}
                                    >
                                        <Building2 className="w-3.5 h-3.5 inline mr-1.5" />Matriks per OPD ({actionPlansTw})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActionPlansViewMode('quarterly_trend')}
                                        className={`px-3 py-1.5 rounded text-xs font-bold transition cursor-pointer ${actionPlansViewMode === 'quarterly_trend' ? 'bg-primary text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'}`}
                                    >
                                        📅 Matriks Tren 4 Triwulan
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActionPlansViewMode('plan_detail')}
                                        className={`px-3 py-1.5 rounded text-xs font-bold transition cursor-pointer ${actionPlansViewMode === 'plan_detail' ? 'bg-primary text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'}`}
                                    >
                                        📋 Rincian Rencana Aksi ({filteredActionPlans.length})
                                    </button>
                                </div>

                                {/* Pemilih Triwulan */}
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Pilih Periode:</span>
                                    <div className="flex items-center gap-1 bg-white dark:bg-slate-700 p-1 rounded-lg border border-slate-200 dark:border-slate-600">
                                        {['TW I', 'TW II', 'TW III', 'TW IV'].map((twName) => (
                                            <button
                                                key={twName}
                                                type="button"
                                                onClick={() => {
                                                    setActionPlansTw(twName);
                                                    applyFilter(indicatorId, organizationId, evalYear);
                                                }}
                                                className={`px-2.5 py-1 text-xs font-bold rounded transition cursor-pointer ${actionPlansTw === twName ? 'bg-amber-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-600'}`}
                                            >
                                                {twName} {twName === 'TW II' ? '(Aktif)' : ''}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Tombol Download PDF */}
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleCopyToClipboard}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                                    >
                                        <Copy className="h-3.5 w-3.5 text-slate-500" />
                                        <span>{copied ? 'Tersalin!' : 'Salin Tabel (Excel)'}</span>
                                    </button>
                                    <a
                                        href={getExportUrl()}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 shadow-2xs cursor-pointer transition"
                                        title={`Download PDF Rencana Aksi ${actionPlansTw} Tahun ${evalYear}`}
                                    >
                                        <FileDown className="h-3.5 w-3.5" />
                                        <span>Download PDF</span>
                                        <span className="rounded bg-white/20 px-1.5 py-0.2 text-[10px] font-bold">
                                            {actionPlansTw} {evalYear}
                                        </span>
                                    </a>
                                </div>
                            </div>

                            {/* SEARCH BAR ATAS TABEL RENCANA AKSI */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                <TableSearchInput
                                    value={searchQuery}
                                    onChange={setSearchQuery}
                                    placeholder={
                                        actionPlansViewMode === 'plan_detail'
                                            ? 'Cari kegiatan, indikator, atau OPD...'
                                            : 'Cari perangkat daerah...'
                                    }
                                    className="w-full sm:w-80"
                                />
                                <div className="text-xs text-slate-500 font-medium">
                                    {actionPlansViewMode === 'plan_detail'
                                        ? `Menampilkan ${filteredActionPlans.length} rincian rencana aksi`
                                        : `Menampilkan ${filteredActionPlansOpd.length} perangkat daerah`}
                                </div>
                            </div>

                            {/* TABEL MATRIKS 1: REKAPITULASI PER OPD (SESUAI ACUAN BAKU ITEM 8) */}
                            {actionPlansViewMode === 'opd_summary' && (
                                <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-800 shadow-2xs overflow-hidden">
                                    <div className="p-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                                            <span className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                                                Matriks Capaian Kinerja Rencana Aksi per Perangkat Daerah ({actionPlansTw} Tahun {evalYear})
                                            </span>
                                        </div>
                                        <span className="text-[11px] text-slate-500 font-medium">
                                            Menampilkan <strong>{filteredActionPlansOpd.length}</strong> OPD
                                        </span>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs min-w-[750px]">
                                            <thead className="bg-slate-50 text-slate-700 dark:bg-slate-800/90 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                                                <tr>
                                                    <th className="px-4 py-3 font-bold text-center w-12">No</th>
                                                    <th className="px-4 py-3 font-bold">OPD / Perangkat Daerah</th>
                                                    <th className="px-4 py-3 font-bold text-right w-36">Target {actionPlansTw}</th>
                                                    <th className="px-4 py-3 font-bold text-right w-36">Realisasi {actionPlansTw}</th>
                                                    <th className="px-4 py-3 font-bold text-right w-32">Capaian</th>
                                                    <th className="px-4 py-3 font-bold text-center w-36">Status</th>
                                                    <th className="px-4 py-3 font-bold text-center w-36">Aksi Detail</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                {filteredActionPlansOpd.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={7} className="py-8 text-center text-slate-400">
                                                            Tidak ada data rencana aksi OPD yang cocok dengan kriteria filter.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    filteredActionPlansOpd.map((row) => (
                                                        <tr key={row.organization_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                                                            <td className="px-4 py-3 text-center font-bold text-slate-500">
                                                                {row.no}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <p className="font-bold text-slate-800 dark:text-slate-200">{row.opd}</p>
                                                                <p className="text-[10px] text-slate-400 font-mono">{row.kode}</p>
                                                            </td>
                                                            <td className="px-4 py-3 text-right font-mono font-semibold text-slate-600 dark:text-slate-400">
                                                                {row.target_tw != null ? row.target_tw.toFixed(2) : '-'}
                                                            </td>
                                                            <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                                                                {row.realisasi_tw != null ? row.realisasi_tw.toFixed(2) : '-'}
                                                            </td>
                                                            <td className="px-4 py-3 text-right font-mono text-sm font-black text-blue-700 dark:text-blue-400">
                                                                {row.capaian != null ? `${row.capaian.toFixed(2)}%${row.is_overachieved ? '*' : ''}` : '-'}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${statusBadgeCls(row.status)}`}>
                                                                    {row.status}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setSelectedOpdForPlansModal(row)}
                                                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 border border-slate-300 dark:border-slate-600 transition cursor-pointer"
                                                                >
                                                                    <Eye className="h-3 w-3 text-blue-600" />
                                                                    <span>Rincian ({row.plans_count})</span>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* TABEL MATRIKS 2: TREN 4 TRIWULAN (TW I – TW IV) */}
                            {actionPlansViewMode === 'quarterly_trend' && (
                                <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-800 shadow-2xs overflow-hidden">
                                    <div className="p-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <TrendingUp className="h-4 w-4 text-blue-600" />
                                            <span className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                                                Matriks Tren Kinerja Triwulanan Perangkat Daerah (TW I s/d TW IV Tahun {evalYear})
                                            </span>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs min-w-[800px]">
                                            <thead className="bg-slate-50 text-slate-700 dark:bg-slate-800/90 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                                                <tr>
                                                    <th className="px-4 py-3 font-bold text-center w-12">No</th>
                                                    <th className="px-4 py-3 font-bold">Perangkat Daerah</th>
                                                    <th className="px-3 py-3 font-bold text-center w-28">TW I (%)</th>
                                                    <th className="px-3 py-3 font-bold text-center w-32 bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300 border-x border-blue-200 dark:border-blue-800">
                                                        TW II (%) {actionPlansTw === 'TW II' ? '★' : ''}
                                                    </th>
                                                    <th className="px-3 py-3 font-bold text-center w-28">TW III (%)</th>
                                                    <th className="px-3 py-3 font-bold text-center w-28">TW IV (%)</th>
                                                    <th className="px-3 py-3 font-bold text-center w-20">Tren</th>
                                                    <th className="px-4 py-3 font-bold text-center w-32">Status ({actionPlansTw})</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                {filteredActionPlansOpd.map((row) => (
                                                    <tr key={row.organization_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                                                        <td className="px-4 py-3 text-center font-bold text-slate-500">{row.no}</td>
                                                        <td className="px-4 py-3">
                                                            <p className="font-bold text-slate-800 dark:text-slate-200">{row.opd}</p>
                                                            <p className="text-[10px] text-slate-400 font-mono">{row.kode}</p>
                                                        </td>
                                                        <td className="px-3 py-3 text-center font-mono text-slate-600">
                                                            {row.quarterly?.['TW I']?.capaian ? `${row.quarterly['TW I'].capaian.toFixed(1)}%` : '-'}
                                                        </td>
                                                        <td className="px-3 py-3 text-center font-mono font-black text-blue-700 dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/20 border-x border-blue-100 dark:border-blue-900">
                                                            {row.quarterly?.['TW II']?.capaian ? `${row.quarterly['TW II'].capaian.toFixed(1)}%` : '-'}
                                                        </td>
                                                        <td className="px-3 py-3 text-center font-mono text-slate-600">
                                                            {row.quarterly?.['TW III']?.capaian ? `${row.quarterly['TW III'].capaian.toFixed(1)}%` : '-'}
                                                        </td>
                                                        <td className="px-3 py-3 text-center font-mono text-slate-600">
                                                            {row.quarterly?.['TW IV']?.capaian ? `${row.quarterly['TW IV'].capaian.toFixed(1)}%` : '-'}
                                                        </td>
                                                        <td className="px-3 py-3 text-center text-sm font-bold">
                                                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${(row.tren === '↑' || row.tren === '↑') ? 'bg-emerald-100 text-emerald-800' : (row.tren === '↓' || row.tren === '↓') ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'}`}>
                                                                {row.tren}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusBadgeCls(row.status)}`}>
                                                                {row.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* TABEL MATRIKS 3: RINCIAN SETIAP RENCANA AKSI KINERJA */}
                            {actionPlansViewMode === 'plan_detail' && (
                                <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-800 shadow-2xs overflow-hidden">
                                    <div className="p-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Target className="h-4 w-4 text-purple-600" />
                                            <span className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                                                Daftar Rincian Rencana Aksi Kinerja ({actionPlansTw} Tahun {evalYear})
                                            </span>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs min-w-[750px]">
                                            <thead className="bg-slate-50 text-slate-700 dark:bg-slate-800/90 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                                                <tr>
                                                    <th className="px-3 py-3 font-semibold text-center w-12">No</th>
                                                    <th className="px-4 py-3 font-semibold w-48">Perangkat Daerah</th>
                                                    <th className="px-4 py-3 font-semibold">Rencana Aksi Kinerja</th>
                                                    <th className="px-3 py-3 font-semibold text-right w-28">Target {actionPlansTw}</th>
                                                    <th className="px-3 py-3 font-semibold text-right w-28">Realisasi {actionPlansTw}</th>
                                                    <th className="px-3 py-3 font-semibold text-right w-28">Capaian</th>
                                                    <th className="px-3 py-3 font-semibold text-center w-32">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                {filteredActionPlans.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={7} className="py-8 text-center text-slate-400">
                                                            Tidak ada rencana aksi triwulan yang cocok.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    filteredActionPlans.map((row) => (
                                                        <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                                                            <td className="px-3 py-2.5 text-center text-slate-500 font-medium">{row.no}</td>
                                                            <td className="px-4 py-2.5">
                                                                <p className="font-semibold text-slate-800 dark:text-slate-200">{row.perangkat_daerah}</p>
                                                                <p className="text-[10px] text-slate-400 font-mono">{row.kode}</p>
                                                            </td>
                                                            <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-300">{row.rencana_aksi}</td>
                                                            <td className="px-3 py-2.5 text-right font-mono text-slate-600 dark:text-slate-400">{row.target_tw != null ? row.target_tw.toFixed(2) : '-'}</td>
                                                            <td className="px-3 py-2.5 text-right font-mono text-slate-800 dark:text-slate-100 font-semibold">{row.realisasi_tw != null ? row.realisasi_tw.toFixed(2) : '-'}</td>
                                                            <td className="px-3 py-2.5 text-right font-mono font-bold text-blue-700 dark:text-blue-400">{row.capaian != null ? `${row.capaian.toFixed(2)}%` : '-'}</td>
                                                            <td className="px-3 py-2.5 text-center">
                                                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusBadgeCls(row.status)}`}>
                                                                    {row.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* KRITERIA STATUS CAPAIAN RENCANA AKSI TW */}
                            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 flex flex-wrap items-center gap-x-4 gap-y-2">
                                <span className="font-bold flex items-center gap-1">
                                    💡 Kriteria Status Capaian Rencana Aksi ({actionPlansTw}):
                                </span>
                                <span className="inline-flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                    <strong>Tercapai:</strong> Capaian &ge; 100%
                                </span>
                                <span className="text-slate-300 dark:text-slate-600">|</span>
                                <span className="inline-flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                    <strong>Perlu Perhatian:</strong> 50% &le; Capaian &lt; 100%
                                </span>
                                <span className="text-slate-300 dark:text-slate-600">|</span>
                                <span className="inline-flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                    <strong>Kritis:</strong> Capaian &lt; 50%
                                </span>
                                <span className="text-slate-300 dark:text-slate-600">|</span>
                                <span className="inline-flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                                    <strong>Tidak Dinilai:</strong> Target = 0 dan Realisasi = 0
                                </span>
                            </div>
                        </div>
                    )}

                    {/* ===============================================================
                        TAB: RENCANA AKSI ANGGARAN (Monitoring Serapan Keuangan)
                    =============================================================== */}
                    {activeTab === 'monitoring_budget' && (
                        <div className="p-4 space-y-4">
                            {/* 💡 CALLOUT EARLY WARNING SYSTEM ANGGARAN */}
                            <div className="rounded-xl border border-emerald-300 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50/60 p-4 text-emerald-900 dark:border-emerald-700/60 dark:bg-slate-800 dark:text-emerald-200 shadow-2xs">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 shrink-0">
                                        <Coins className="h-5 w-5" />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-bold text-emerald-950 dark:text-emerald-100 flex items-center gap-2">
                                            <span>Rencana Aksi Anggaran TW - Monitoring Serapan Keuangan Triwulanan</span>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-200/80 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-200">
                                                Monitoring {actionPlansTw} Tahun {evalYear}
                                            </span>
                                        </h4>
                                        <p className="text-xs leading-relaxed text-emerald-900/90 dark:text-emerald-200/90">
                                            <strong>Monitoring pengendalian serapan anggaran triwulanan</strong>. Mengacu langsung pada data Menu Monitoring Anggaran, menampilkan alokasi Pagu, Realisasi, dan Persentase Serapan per Perangkat Daerah dan per subkegiatan untuk deteksi dini deviasi keuangan.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* 6 KARTU RINGKASAN EKSEKUTIF ANGGARAN */}
                            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
                                <div
                                    onClick={() => setBudgetFilterStatus('Semua')}
                                    className={`rounded-lg border p-3 text-center shadow-2xs cursor-pointer transition ${budgetFilterStatus === 'Semua' ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-white dark:bg-slate-800' : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800'}`}
                                >
                                    <p className="text-[10px] font-semibold text-slate-500 uppercase">Total OPD / Subkeg</p>
                                    <p className="text-xl font-black text-slate-800 dark:text-white mt-0.5">
                                        {monitoring_budget_matrix?.summary?.total_opd ?? filteredMonitoringBudgetOpd.length} / {monitoring_budget_matrix?.summary?.total_items ?? filteredMonitoringBudgetRows.length}
                                    </p>
                                    <span className="text-[10px] text-slate-400 font-medium">Periode {actionPlansTw}</span>
                                </div>
                                <div className="rounded-lg border border-blue-200 bg-blue-50/60 dark:border-blue-800 dark:bg-blue-950/40 p-3 text-center shadow-2xs">
                                    <p className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 uppercase">Rata-rata Serapan</p>
                                    <p className="text-xl font-black text-blue-800 dark:text-blue-200 mt-0.5">
                                        {(monitoring_budget_matrix?.summary?.opd_summary?.rata_capaian ?? monitoring_budget_matrix?.summary?.rata_capaian ?? monitoring_budget_matrix?.summary?.serapan_persen ?? 0).toFixed(2)}%
                                    </p>
                                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">Agregat {actionPlansTw}</span>
                                </div>
                                <div
                                    onClick={() => setBudgetFilterStatus(budgetFilterStatus === 'Tercapai' ? 'Semua' : 'Tercapai')}
                                    className={`rounded-lg border p-3 text-center shadow-2xs cursor-pointer transition ${budgetFilterStatus === 'Tercapai' ? 'border-emerald-500 ring-2 ring-emerald-300 bg-emerald-100/70' : 'border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/50 dark:border-emerald-800 dark:bg-emerald-950/40'}`}
                                >
                                    <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase">Tercapai (On-Track)</p>
                                    <p className="text-xl font-black text-emerald-800 dark:text-emerald-200 mt-0.5">
                                        {monitoring_budget_matrix?.summary?.opd_summary?.tercapai ?? monitoring_budget_matrix?.summary?.status_counts?.tercapai ?? 0} <span className="text-xs font-normal">OPD</span>
                                    </p>
                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400">≥ 100% Target</span>
                                </div>
                                <div
                                    onClick={() => setBudgetFilterStatus(budgetFilterStatus === 'Perlu Perhatian' ? 'Semua' : 'Perlu Perhatian')}
                                    className={`rounded-lg border p-3 text-center shadow-2xs cursor-pointer transition ${budgetFilterStatus === 'Perlu Perhatian' ? 'border-amber-500 ring-2 ring-amber-300 bg-amber-100/70' : 'border-amber-200 bg-amber-50/60 hover:bg-amber-100/50 dark:border-amber-800 dark:bg-amber-950/40'}`}
                                >
                                    <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 uppercase">Perlu Perhatian</p>
                                    <p className="text-xl font-black text-amber-800 dark:text-amber-200 mt-0.5">
                                        {monitoring_budget_matrix?.summary?.opd_summary?.perlu_perhatian ?? monitoring_budget_matrix?.summary?.status_counts?.perlu_perhatian ?? 0} <span className="text-xs font-normal">OPD</span>
                                    </p>
                                    <span className="text-[10px] text-amber-600 dark:text-amber-400">50% – 99.9%</span>
                                </div>
                                <div
                                    onClick={() => setBudgetFilterStatus(budgetFilterStatus === 'Kritis' ? 'Semua' : 'Kritis')}
                                    className={`rounded-lg border p-3 text-center shadow-2xs cursor-pointer transition ${budgetFilterStatus === 'Kritis' ? 'border-rose-500 ring-2 ring-rose-300 bg-rose-100/70' : 'border-rose-200 bg-rose-50/60 hover:bg-rose-100/50 dark:border-rose-800 dark:bg-rose-950/40'}`}
                                >
                                    <p className="text-[10px] font-semibold text-rose-700 dark:text-rose-300 uppercase">Kritis</p>
                                    <p className="text-xl font-black text-rose-800 dark:text-rose-200 mt-0.5">
                                        {monitoring_budget_matrix?.summary?.opd_summary?.kritis ?? monitoring_budget_matrix?.summary?.status_counts?.kritis ?? 0} <span className="text-xs font-normal">OPD</span>
                                    </p>
                                    <span className="text-[10px] text-rose-600 dark:text-rose-400">&lt; 50%</span>
                                </div>
                                <div
                                    onClick={() => setBudgetFilterStatus(budgetFilterStatus === 'Tidak Dinilai' ? 'Semua' : 'Tidak Dinilai')}
                                    className={`rounded-lg border p-3 text-center shadow-2xs cursor-pointer transition ${budgetFilterStatus === 'Tidak Dinilai' ? 'border-slate-500 ring-2 ring-slate-300 bg-slate-100/70 dark:bg-slate-700' : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/50 dark:border-slate-700 dark:bg-slate-800/60'}`}
                                >
                                    <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase">Tidak Dinilai</p>
                                    <p className="text-xl font-black text-slate-700 dark:text-slate-200 mt-0.5">
                                        {monitoring_budget_matrix?.summary?.opd_summary?.tidak_dinilai ?? monitoring_budget_matrix?.summary?.status_counts?.tidak_dinilai ?? 0} <span className="text-xs font-normal">OPD</span>
                                    </p>
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Target &amp; Real = 0</span>
                                </div>
                            </div>

                            {/* DUA GRAFIK VISUALISASI SERAPAN ANGGARAN */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                                {/* Grafik 1: Komparasi Seluruh OPD */}
                                <div className="lg:col-span-7 rounded-lg border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-800">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                            <BarChart3 className="h-4 w-4 text-emerald-600" />
                                            <span>Komparasi Serapan Anggaran Antar Perangkat Daerah ({actionPlansTw})</span>
                                        </h3>
                                        <span className="text-[10px] text-slate-400">Target 100%</span>
                                    </div>
                                    <BudgetOpdRankingBarChart rows={filteredMonitoringBudgetOpd} triwulan={actionPlansTw} />
                                </div>

                                {/* Grafik 2: Tren Agregat 4 Triwulan */}
                                <div className="lg:col-span-5 rounded-lg border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-800 flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                                <TrendingUp className="h-4 w-4 text-emerald-600" />
                                                <span>Tren Pergerakan Serapan Triwulanan (TW I – TW IV)</span>
                                            </h3>
                                            <span className="text-[10px] text-emerald-600 font-semibold">{evalYear}</span>
                                        </div>
                                        <BudgetQuarterChart trend={monitoring_budget_matrix?.trend ?? []} />
                                    </div>
                                    <div className="mt-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300">
                                        <div className="grid grid-cols-4 gap-1 text-center font-mono">
                                            {(monitoring_budget_matrix?.trend ?? []).map((t, idx) => (
                                                <div key={idx} className={`p-1 rounded ${t.triwulan === actionPlansTw ? 'bg-emerald-100 text-emerald-900 font-bold dark:bg-emerald-900/60 dark:text-emerald-200' : ''}`}>
                                                    <span className="block text-[10px] text-slate-500">{t.triwulan}</span>
                                                    <span>{t.serapan != null ? `${t.serapan.toFixed(1)}%` : '-'}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* BAR FILTER DAN MODE VIEW TABEL */}
                            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                                {/* Mode Tampilan Switcher */}
                                <div className="flex items-center gap-1 bg-white dark:bg-slate-700 p-1 rounded-lg border border-slate-200 dark:border-slate-600">
                                    <button
                                        type="button"
                                        onClick={() => setBudgetViewMode('opd_summary')}
                                        className={`px-3 py-1.5 rounded text-xs font-bold transition cursor-pointer ${budgetViewMode === 'opd_summary' ? 'bg-primary text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'}`}
                                    >
                                        <Building2 className="w-3.5 h-3.5 inline mr-1.5" />Matriks per OPD ({actionPlansTw})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setBudgetViewMode('quarterly_trend')}
                                        className={`px-3 py-1.5 rounded text-xs font-bold transition cursor-pointer ${budgetViewMode === 'quarterly_trend' ? 'bg-primary text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'}`}
                                    >
                                        📅 Matriks Tren 4 Triwulan
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setBudgetViewMode('plan_detail')}
                                        className={`px-3 py-1.5 rounded text-xs font-bold transition cursor-pointer ${budgetViewMode === 'plan_detail' ? 'bg-primary text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'}`}
                                    >
                                        📋 Rincian Subkegiatan Anggaran ({filteredMonitoringBudgetRows.length})
                                    </button>
                                </div>

                                {/* Pemilih Triwulan */}
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Pilih Periode:</span>
                                    <div className="flex items-center gap-1 bg-white dark:bg-slate-700 p-1 rounded-lg border border-slate-200 dark:border-slate-600">
                                        {['TW I', 'TW II', 'TW III', 'TW IV'].map((twName) => (
                                            <button
                                                key={twName}
                                                type="button"
                                                onClick={() => {
                                                    setActionPlansTw(twName);
                                                    applyFilter(indicatorId, organizationId, evalYear);
                                                }}
                                                className={`px-2.5 py-1 text-xs font-bold rounded transition cursor-pointer ${actionPlansTw === twName ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-600'}`}
                                            >
                                                {twName} {twName === 'TW II' ? '(Aktif)' : ''}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Tombol Download PDF */}
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleCopyToClipboard}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                                    >
                                        <Copy className="h-3.5 w-3.5 text-slate-500" />
                                        <span>{copied ? 'Tersalin!' : 'Salin Tabel (Excel)'}</span>
                                    </button>
                                    <a
                                        href={getExportUrl()}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 shadow-2xs cursor-pointer transition"
                                        title={`Download PDF Rencana Aksi Anggaran ${actionPlansTw} Tahun ${evalYear}`}
                                    >
                                        <FileDown className="h-3.5 w-3.5" />
                                        <span>Download PDF</span>
                                        <span className="rounded bg-white/20 px-1.5 py-0.2 text-[10px] font-bold">
                                            {actionPlansTw} {evalYear}
                                        </span>
                                    </a>
                                </div>
                            </div>

                            {/* SEARCH BAR ATAS TABEL */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                <TableSearchInput
                                    value={searchQuery}
                                    onChange={setSearchQuery}
                                    placeholder={
                                        budgetViewMode === 'plan_detail'
                                            ? 'Cari subkegiatan, indikator, atau OPD...'
                                            : 'Cari perangkat daerah...'
                                    }
                                    className="w-full sm:w-80"
                                />
                                <div className="text-xs text-slate-500 font-medium">
                                    {budgetViewMode === 'plan_detail'
                                        ? `Menampilkan ${filteredMonitoringBudgetRows.length} rincian subkegiatan anggaran`
                                        : `Menampilkan ${filteredMonitoringBudgetOpd.length} perangkat daerah`}
                                </div>
                            </div>

                            {/* TABEL MATRIKS 1: REKAPITULASI PER OPD */}
                            {budgetViewMode === 'opd_summary' && (
                                <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-800 shadow-2xs overflow-hidden">
                                    <div className="p-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                                            <span className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                                                Matriks Serapan Anggaran per Perangkat Daerah ({actionPlansTw} Tahun {evalYear})
                                            </span>
                                        </div>
                                        <span className="text-[11px] text-slate-500 font-medium">
                                            Menampilkan <strong>{filteredMonitoringBudgetOpd.length}</strong> OPD
                                        </span>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs min-w-[750px]">
                                            <thead className="bg-slate-50 text-slate-700 dark:bg-slate-800/90 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                                                <tr>
                                                    <th className="px-4 py-3 font-bold text-center w-12">No</th>
                                                    <th className="px-4 py-3 font-bold">OPD / Perangkat Daerah</th>
                                                    <th className="px-4 py-3 font-bold text-right w-36">Pagu {actionPlansTw}</th>
                                                    <th className="px-4 py-3 font-bold text-right w-36">Realisasi {actionPlansTw}</th>
                                                    <th className="px-4 py-3 font-bold text-right w-32">Serapan</th>
                                                    <th className="px-4 py-3 font-bold text-center w-36">Status</th>
                                                    <th className="px-4 py-3 font-bold text-center w-36">Aksi Detail</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                {filteredMonitoringBudgetOpd.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={7} className="py-8 text-center text-slate-400">
                                                            Tidak ada data serapan anggaran OPD yang cocok dengan kriteria filter.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    filteredMonitoringBudgetOpd.map((row) => (
                                                        <tr key={row.organization_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                                                            <td className="px-4 py-3 text-center font-bold text-slate-500">{row.no}</td>
                                                            <td className="px-4 py-3">
                                                                <p className="font-bold text-slate-800 dark:text-slate-200">{row.opd}</p>
                                                                <p className="text-[10px] text-slate-400 font-mono">{row.kode}</p>
                                                            </td>
                                                            <td className="px-4 py-3 text-right font-mono font-semibold text-slate-600 dark:text-slate-400" title={row.pagu_tw > 0 ? formatRupiah(row.pagu_tw) : undefined}>
                                                                {row.pagu_tw > 0 ? formatRupiahCompact(row.pagu_tw) : '-'}
                                                            </td>
                                                            <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100" title={row.realisasi_tw > 0 ? formatRupiah(row.realisasi_tw) : undefined}>
                                                                {row.realisasi_tw > 0 ? formatRupiahCompact(row.realisasi_tw) : '-'}
                                                            </td>
                                                            <td className="px-4 py-3 text-right font-mono text-sm font-black text-emerald-700 dark:text-emerald-400">
                                                                {row.serapan != null ? `${row.serapan.toFixed(2)}%${row.is_overachieved ? '*' : ''}` : '-'}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${statusBadgeCls(row.status)}`}>
                                                                    {row.status ?? '-'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setSelectedOpdForBudgetModal(row)}
                                                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 border border-slate-300 dark:border-slate-600 transition cursor-pointer"
                                                                >
                                                                    <Eye className="h-3 w-3 text-emerald-600" />
                                                                    <span>Rincian ({row.items_count})</span>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* TABEL MATRIKS 2: TREN 4 TRIWULAN (TW I – TW IV) */}
                            {budgetViewMode === 'quarterly_trend' && (
                                <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-800 shadow-2xs overflow-hidden">
                                    <div className="p-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <TrendingUp className="h-4 w-4 text-emerald-600" />
                                            <span className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                                                Matriks Tren Serapan Anggaran Triwulanan Perangkat Daerah (TW I s/d TW IV Tahun {evalYear})
                                            </span>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs min-w-[800px]">
                                            <thead className="bg-slate-50 text-slate-700 dark:bg-slate-800/90 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                                                <tr>
                                                    <th className="px-4 py-3 font-bold text-center w-12">No</th>
                                                    <th className="px-4 py-3 font-bold">Perangkat Daerah</th>
                                                    <th className="px-3 py-3 font-bold text-center w-28">TW I (%)</th>
                                                    <th className="px-3 py-3 font-bold text-center w-32 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 border-x border-emerald-200 dark:border-emerald-800">
                                                        TW II (%) {actionPlansTw === 'TW II' ? '★' : ''}
                                                    </th>
                                                    <th className="px-3 py-3 font-bold text-center w-28">TW III (%)</th>
                                                    <th className="px-3 py-3 font-bold text-center w-28">TW IV (%)</th>
                                                    <th className="px-3 py-3 font-bold text-center w-20">Tren</th>
                                                    <th className="px-4 py-3 font-bold text-center w-32">Status ({actionPlansTw})</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                {filteredMonitoringBudgetOpd.map((row) => (
                                                    <tr key={row.organization_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                                                        <td className="px-4 py-3 text-center font-bold text-slate-500">{row.no}</td>
                                                        <td className="px-4 py-3">
                                                            <p className="font-bold text-slate-800 dark:text-slate-200">{row.opd}</p>
                                                            <p className="text-[10px] text-slate-400 font-mono">{row.kode}</p>
                                                        </td>
                                                        <td className="px-3 py-3 text-center font-mono text-slate-600">
                                                            {row.quarterly?.['TW I']?.serapan != null ? `${row.quarterly['TW I'].serapan.toFixed(1)}%` : '-'}
                                                        </td>
                                                        <td className="px-3 py-3 text-center font-mono font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20 border-x border-emerald-100 dark:border-emerald-900">
                                                            {row.quarterly?.['TW II']?.serapan != null ? `${row.quarterly['TW II'].serapan.toFixed(1)}%` : '-'}
                                                        </td>
                                                        <td className="px-3 py-3 text-center font-mono text-slate-600">
                                                            {row.quarterly?.['TW III']?.serapan != null ? `${row.quarterly['TW III'].serapan.toFixed(1)}%` : '-'}
                                                        </td>
                                                        <td className="px-3 py-3 text-center font-mono text-slate-600">
                                                            {row.quarterly?.['TW IV']?.serapan != null ? `${row.quarterly['TW IV'].serapan.toFixed(1)}%` : '-'}
                                                        </td>
                                                        <td className="px-3 py-3 text-center text-sm font-bold">
                                                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${(row.tren === '↑') ? 'bg-emerald-100 text-emerald-800' : (row.tren === '↓') ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'}`}>
                                                                {row.tren ?? '→'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusBadgeCls(row.status)}`}>
                                                                {row.status ?? '-'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* TABEL MATRIKS 3: RINCIAN SETIAP SUBKEGIATAN ANGGARAN */}
                            {budgetViewMode === 'plan_detail' && (
                                <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-800 shadow-2xs overflow-hidden">
                                    <div className="p-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Coins className="h-4 w-4 text-emerald-600" />
                                            <span className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                                                Daftar Rincian Subkegiatan Anggaran ({actionPlansTw} Tahun {evalYear})
                                            </span>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs min-w-[750px]">
                                            <thead className="bg-slate-50 text-slate-700 dark:bg-slate-800/90 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                                                <tr>
                                                    <th className="px-3 py-3 font-semibold text-center w-12">No</th>
                                                    <th className="px-4 py-3 font-semibold w-48">Perangkat Daerah</th>
                                                    <th className="px-4 py-3 font-semibold">Subkegiatan &amp; Indikator</th>
                                                    <th className="px-3 py-3 font-semibold text-right w-28">Pagu {actionPlansTw}</th>
                                                    <th className="px-3 py-3 font-semibold text-right w-28">Realisasi {actionPlansTw}</th>
                                                    <th className="px-3 py-3 font-semibold text-right w-28">Serapan</th>
                                                    <th className="px-3 py-3 font-semibold text-center w-32">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                {filteredMonitoringBudgetRows.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={7} className="py-8 text-center text-slate-400">
                                                            Tidak ada rincian subkegiatan anggaran yang cocok.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    filteredMonitoringBudgetRows.map((row) => (
                                                        <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                                                            <td className="px-3 py-2.5 text-center text-slate-500 font-medium">{row.no}</td>
                                                            <td className="px-4 py-2.5">
                                                                <p className="font-semibold text-slate-800 dark:text-slate-200">{row.perangkat_daerah}</p>
                                                                <p className="text-[10px] text-slate-400 font-mono">{row.kode}</p>
                                                            </td>
                                                            <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-300">
                                                                <p className="font-semibold">{row.subkegiatan}</p>
                                                                <p className="text-[11px] text-slate-500 dark:text-slate-400">{row.indikator_subkegiatan}</p>
                                                            </td>
                                                            <td className="px-3 py-2.5 text-right font-mono text-slate-600 dark:text-slate-400" title={row.pagu_tw > 0 ? formatRupiah(row.pagu_tw) : undefined}>
                                                                {row.pagu_tw > 0 ? formatRupiahCompact(row.pagu_tw) : '-'}
                                                            </td>
                                                            <td className="px-3 py-2.5 text-right font-mono text-slate-800 dark:text-slate-100 font-semibold" title={row.realisasi_tw > 0 ? formatRupiah(row.realisasi_tw) : undefined}>
                                                                {row.realisasi_tw > 0 ? formatRupiahCompact(row.realisasi_tw) : '-'}
                                                            </td>
                                                            <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                                                                {row.serapan != null ? `${row.serapan.toFixed(2)}%` : '-'}
                                                            </td>
                                                            <td className="px-3 py-2.5 text-center">
                                                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusBadgeCls(row.status)}`}>
                                                                    {row.status ?? '-'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* KRITERIA STATUS SERAPAN ANGGARAN TW */}
                            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 flex flex-wrap items-center gap-x-4 gap-y-2">
                                <span className="font-bold flex items-center gap-1">
                                    💡 Kriteria Status Serapan Anggaran ({actionPlansTw}):
                                </span>
                                <span className="inline-flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                    <strong>Tercapai:</strong> Serapan &ge; 100%
                                </span>
                                <span className="text-slate-300 dark:text-slate-600">|</span>
                                <span className="inline-flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                    <strong>Perlu Perhatian:</strong> 50% &le; Serapan &lt; 100%
                                </span>
                                <span className="text-slate-300 dark:text-slate-600">|</span>
                                <span className="inline-flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                    <strong>Kritis:</strong> Serapan &lt; 50%
                                </span>
                                <span className="text-slate-300 dark:text-slate-600">|</span>
                                <span className="inline-flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                                    <strong>Tidak Dinilai:</strong> Pagu = 0 dan Realisasi = 0
                                </span>
                            </div>
                        </div>
                    )}

                    {/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = 
                        TAB 8: PETA RISIKO / PERHATIAN KINERJA OPD (Baris 6 Panduan)
                    = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =  */}
                    {activeTab === 'risk_map' && (
                        <div className="p-4 space-y-4">
                            {/* 5 EWS INDIKATOR MULTI-KRITERIA */}
                            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                                <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-3 text-center shadow-2xs">
                                    <p className="text-[10px] font-semibold text-rose-700 uppercase">Indikator Kritis</p>
                                    <p className="text-xl font-black text-rose-900 mt-0.5">{risk_map_matrix?.summary.critical_iku_count ?? 0}</p>
                                    <span className="text-[10px] text-rose-600">Perlu Penanganan Cepat</span>
                                </div>
                                <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-center shadow-2xs">
                                    <p className="text-[10px] font-semibold text-amber-700 uppercase">OPD Capaian &lt; 80%</p>
                                    <p className="text-xl font-black text-amber-900 mt-0.5">{risk_map_matrix?.summary.low_cap_opd_count ?? 0}</p>
                                    <span className="text-[10px] text-amber-600">Target Belum Optimal</span>
                                </div>
                                <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-3 text-center shadow-2xs">
                                    <p className="text-[10px] font-semibold text-indigo-700 uppercase">Renaksi TW Terlambat</p>
                                    <p className="text-xl font-black text-indigo-900 mt-0.5">{risk_map_matrix?.summary.late_renaksi_count ?? 0}</p>
                                    <span className="text-[10px] text-indigo-600">Progres Fisik Lambat</span>
                                </div>
                                <div className="rounded-lg border border-orange-200 bg-orange-50/50 p-3 text-center shadow-2xs">
                                    <p className="text-[10px] font-semibold text-orange-700 uppercase">Dokumen Belum Lengkap</p>
                                    <p className="text-xl font-black text-orange-900 mt-0.5">{risk_map_matrix?.summary.incomplete_docs_count ?? 0}</p>
                                    <span className="text-[10px] text-orange-600">Kepatuhan SAKIP &lt; 100%</span>
                                </div>
                                <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-3 text-center shadow-2xs">
                                    <p className="text-[10px] font-semibold text-purple-700 uppercase">SAKIP Rendah / Turun</p>
                                    <p className="text-xl font-black text-purple-900 mt-0.5">{risk_map_matrix?.summary.low_sakip_count ?? 0}</p>
                                    <span className="text-[10px] text-purple-600">Nilai &lt; 70 (BB)</span>
                                </div>
                            </div>

                            {/* RINGKASAN LEVEL RISIKO & GRAFIK */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                                <div className="md:col-span-8 grid grid-cols-3 gap-3">
                                    <div className="rounded-lg border border-rose-300 bg-rose-100/70 p-4 text-center shadow-2xs">
                                        <p className="text-xs font-bold text-rose-800 uppercase">Risiko Tinggi</p>
                                        <p className="text-3xl font-black text-rose-950 mt-1">{risk_map_matrix?.summary.risiko_tinggi ?? 0} OPD</p>
                                        <span className="text-[11px] text-rose-700">Skor Risiko &ge; 50</span>
                                    </div>
                                    <div className="rounded-lg border border-amber-300 bg-amber-100/70 p-4 text-center shadow-2xs">
                                        <p className="text-xs font-bold text-amber-800 uppercase">Risiko Sedang</p>
                                        <p className="text-3xl font-black text-amber-950 mt-1">{risk_map_matrix?.summary.risiko_sedang ?? 0} OPD</p>
                                        <span className="text-[11px] text-amber-700">Skor Risiko 25 - 49</span>
                                    </div>
                                    <div className="rounded-lg border border-emerald-300 bg-emerald-100/70 p-4 text-center shadow-2xs">
                                        <p className="text-xs font-bold text-emerald-800 uppercase">Risiko Rendah</p>
                                        <p className="text-3xl font-black text-emerald-950 mt-1">{risk_map_matrix?.summary.risiko_rendah ?? 0} OPD</p>
                                        <span className="text-[11px] text-emerald-700">Skor Risiko &lt; 25</span>
                                    </div>
                                </div>
                                <div className="md:col-span-4 rounded-lg border border-slate-200 bg-white p-3 flex flex-col items-center justify-center shadow-2xs">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">Proporsi Level Risiko</p>
                                    <RiskDistributionDonutChart
                                        tinggi={risk_map_matrix?.summary.risiko_tinggi ?? 0}
                                        sedang={risk_map_matrix?.summary.risiko_sedang ?? 0}
                                        rendah={risk_map_matrix?.summary.risiko_rendah ?? 0}
                                    />
                                </div>
                            </div>

                            {/* TABEL PETA RISIKO OPD */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                                <div className="flex items-center gap-2">
                                    <ShieldAlert className="h-4 w-4 text-rose-600" />
                                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                        Matriks Peta Risiko dan Early Warning System (Tahun {evalYear})
                                    </h4>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <TableSearchInput
                                        value={searchQuery}
                                        onChange={setSearchQuery}
                                        placeholder="Cari perangkat daerah..."
                                    />
                                    <a
                                        href={getExportUrl('risk_map')}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 shadow-2xs cursor-pointer transition"
                                        title={`Download PDF Peta Risiko Tahun ${evalYear}`}
                                    >
                                        <FileDown className="h-3.5 w-3.5" />
                                        <span>Download PDF</span>
                                        <span className="rounded bg-white/20 px-1.5 py-0.2 text-[10px] font-bold">
                                            {evalYear}
                                        </span>
                                    </a>
                                </div>
                            </div>

                            <div className="overflow-x-auto rounded-lg border border-slate-200">
                                <table className="w-full text-left text-xs min-w-[950px]">
                                    <thead className="bg-slate-100 text-slate-700">
                                        <tr>
                                            <th className="px-3 py-3 font-semibold text-center w-12">No</th>
                                            <th className="px-4 py-3 font-semibold w-48">Perangkat Daerah</th>
                                            <th className="px-3 py-3 font-semibold text-center w-28">Skor Risiko</th>
                                            <th className="px-3 py-3 font-semibold text-center w-28">Level Risiko</th>
                                            <th className="px-3 py-3 font-semibold text-right w-24">Capaian</th>
                                            <th className="px-3 py-3 font-semibold text-right w-24">SAKIP</th>
                                            <th className="px-3 py-3 font-semibold text-center w-28">Dokumen</th>
                                            <th className="px-4 py-3 font-semibold">Faktor Pemicu Risiko</th>
                                            <th className="px-4 py-3 font-semibold w-56">Rekomendasi Pimpinan</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {filteredRiskMap.length === 0 ? (
                                            <tr><td colSpan={9} className="py-8 text-center text-slate-400">Tidak ada OPD yang sesuai filter.</td></tr>
                                        ) : (
                                            filteredRiskMap.map((row) => (
                                                <tr key={row.organization_id} className="hover:bg-slate-50 transition">
                                                    <td className="px-3 py-2.5 text-center text-slate-500 font-medium">{row.rank}</td>
                                                    <td className="px-4 py-2.5">
                                                        <p className="font-semibold text-slate-800">{row.perangkat_daerah}</p>
                                                        <p className="text-[10px] text-slate-400 font-mono">{row.kode}</p>
                                                    </td>
                                                    <td className="px-3 py-2.5 text-center font-mono font-bold text-sm">
                                                        <span className={row.risk_score >= 50 ? 'text-rose-700' : row.risk_score >= 25 ? 'text-amber-700' : 'text-emerald-700'}>
                                                            {row.risk_score}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2.5 text-center">
                                                        <span className={`inline-flex px-2.5 py-0.5 rounded text-xs font-bold ${
                                                            row.risk_level === 'Tinggi'
                                                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                                                : row.risk_level === 'Sedang'
                                                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                                                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                                        }`}>
                                                            {row.risk_level}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2.5 text-right font-mono">{row.rata_capaian.toFixed(1)}%</td>
                                                    <td className="px-3 py-2.5 text-right font-mono font-semibold">{row.sakip_nilai.toFixed(1)} ({row.sakip_predikat})</td>
                                                    <td className="px-3 py-2.5 text-center font-mono">{row.dokumen_persen.toFixed(0)}%</td>
                                                    <td className="px-4 py-2.5">
                                                        <div className="flex flex-wrap gap-1">
                                                            {row.risk_factors.length === 0 ? (
                                                                <span className="text-emerald-600 text-[11px]">Tidak ada anomali terdeteksi</span>
                                                            ) : (
                                                                row.risk_factors.map((rf, i) => (
                                                                    <span key={i} className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${rf.severity === 'critical' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                                                        {rf.detail}
                                                                    </span>
                                                                ))
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-slate-600 text-[11px]">
                                                        {row.rekomendasi[0] ?? '-'}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = 
                        TAB 9: ANALISIS TREN DERET WAKTU
                    = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =  */}
                    {activeTab === 'trend' && (
                        <div className="p-4 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                        Analisis Tren Deret Waktu Capaian Kinerja ({evalYear})
                                    </h4>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <TableSearchInput
                                        value={searchQuery}
                                        onChange={setSearchQuery}
                                        placeholder="Cari periode..."
                                    />
                                    <a
                                        href={getExportUrl('trend')}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 shadow-2xs cursor-pointer transition"
                                        title={`Download PDF Tren Capaian Tahun ${evalYear}`}
                                    >
                                        <FileDown className="h-3.5 w-3.5" />
                                        <span>Download PDF</span>
                                        <span className="rounded bg-white/20 px-1.5 py-0.2 text-[10px] font-bold">
                                            {evalYear}
                                        </span>
                                    </a>
                                </div>
                            </div>
                            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                                <table className="w-full text-left text-xs min-w-[650px]">
                                    <thead className="bg-slate-100 text-slate-700">
                                        <tr>
                                            <th className="px-4 py-3 font-semibold text-center w-12">No</th>
                                            <th className="px-4 py-3 font-semibold">Periode Pengukuran</th>
                                            <th className="px-4 py-3 font-semibold text-center">Rentang Tanggal</th>
                                            <th className="px-4 py-3 font-semibold text-center">Indikator Dievaluasi</th>
                                            <th className="px-4 py-3 font-semibold text-center">Total Realisasi</th>
                                            <th className="px-4 py-3 font-semibold text-right">Rata-rata Capaian</th>
                                            <th className="px-4 py-3 font-semibold text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {filteredTrend.map((row, i) => (
                                            <tr key={row.period_id ?? i} className="hover:bg-slate-50 transition">
                                                <td className="px-4 py-2.5 text-center text-slate-500 font-medium">{i + 1}</td>
                                                <td className="px-4 py-2.5 font-semibold text-slate-800">{row.period}</td>
                                                <td className="px-4 py-2.5 text-center text-slate-500">{formatDate(row.start_date)} s/d {formatDate(row.end_date)}</td>
                                                <td className="px-4 py-2.5 text-center text-slate-600">{row.evaluated_indicators ?? 0} indikator</td>
                                                <td className="px-4 py-2.5 text-center font-mono text-slate-600">{row.realization_count}</td>
                                                <td className="px-4 py-2.5 text-right font-mono font-bold text-blue-700 text-sm">{row.average_achievement.toFixed(2)}%</td>
                                                <td className="px-4 py-2.5 text-center"><span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusBadgeCls(row.status ?? '')}`}>{row.status ?? '-'}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = 
                        TAB 10: ANALISIS DEVIASI
                    = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =  */}
                    {activeTab === 'deviation' && (
                        <div className="p-4 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                                <div className="flex items-center gap-2">
                                    <ArrowUpDown className="h-4 w-4 text-primary" />
                                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                        Analisis Deviasi Target vs Realisasi ({evalYear})
                                    </h4>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <TableSearchInput
                                        value={searchQuery}
                                        onChange={setSearchQuery}
                                        placeholder="Cari indikator atau OPD..."
                                    />
                                    <a
                                        href={getExportUrl('deviation')}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 shadow-2xs cursor-pointer transition"
                                        title={`Download PDF Analisis Deviasi Tahun ${evalYear}`}
                                    >
                                        <FileDown className="h-3.5 w-3.5" />
                                        <span>Download PDF</span>
                                        <span className="rounded bg-white/20 px-1.5 py-0.2 text-[10px] font-bold">
                                            {evalYear}
                                        </span>
                                    </a>
                                </div>
                            </div>
                            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                                <table className="w-full text-left text-xs min-w-[850px]">
                                    <thead className="bg-slate-100 text-slate-700">
                                        <tr>
                                            <th className="px-3 py-3 font-semibold text-center w-12">No</th>
                                            <th className="px-3 py-3 font-semibold w-28">Kode</th>
                                            <th className="px-4 py-3 font-semibold">Indikator Kinerja</th>
                                            <th className="px-3 py-3 font-semibold w-36">Perangkat Daerah</th>
                                            <th className="px-3 py-3 font-semibold text-center w-28">Periode</th>
                                            <th className="px-3 py-3 font-semibold text-right w-24">Target</th>
                                            <th className="px-3 py-3 font-semibold text-right w-24">Realisasi</th>
                                            <th className="px-3 py-3 font-semibold text-right w-24">Deviasi</th>
                                            <th className="px-3 py-3 font-semibold text-right w-28">Capaian</th>
                                            <th className="px-3 py-3 font-semibold text-center w-28">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {filteredDeviation.map((row, i) => (
                                            <tr key={i} className="hover:bg-slate-50 transition">
                                                <td className="px-3 py-2 text-center text-slate-500 font-medium">{i + 1}</td>
                                                <td className="px-3 py-2 font-mono text-slate-500 font-semibold">{row.indicator_code}</td>
                                                <td className="px-4 py-2 font-semibold text-slate-800">{row.indicator_name}</td>
                                                <td className="px-3 py-2 text-slate-600 truncate max-w-[140px]">{row.organization_name ?? row.organization_code}</td>
                                                <td className="px-3 py-2 text-center text-slate-600">{row.period}</td>
                                                <td className="px-3 py-2 text-right font-mono text-slate-600">{row.target !== null ? row.target.toLocaleString('id-ID') : '-'}</td>
                                                <td className="px-3 py-2 text-right font-mono font-semibold text-slate-800">{row.value.toLocaleString('id-ID')}</td>
                                                <td className="px-3 py-2 text-right font-mono font-semibold">
                                                    {row.deviation !== null ? (
                                                        <span className={row.deviation >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                                                            {row.deviation > 0 ? `+${row.deviation}` : row.deviation}
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                                <td className="px-3 py-2 text-right font-mono font-bold text-blue-700">{row.achievement !== null ? `${row.achievement.toFixed(2)}%` : '-'}</td>
                                                <td className="px-3 py-2 text-center"><span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold border ${statusBadgeCls(row.status)}`}>{row.status}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = 
                        TAB 11: HEATMAP KINERJA
                    =============================================================== */}
                    {activeTab === 'heatmap' && (
                        <div className="overflow-x-auto p-4">
                            <table className="w-full text-left text-xs border border-slate-200">
                                <thead className="bg-slate-100 text-slate-700">
                                    <tr>
                                        <th className="px-3 py-2.5 font-semibold text-center w-10">No</th>
                                        <th className="px-3 py-2.5 font-semibold w-24">Kode</th>
                                        <th className="px-4 py-2.5 font-semibold">Indikator Kinerja</th>
                                        {heatmap.periods.map((p) => (
                                            <th key={p.id} className="px-3 py-2.5 font-semibold text-center text-xs">{p.name}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {heatmap.rows.map((r, i) => (
                                        <tr key={r.indicator_code} className="hover:bg-slate-50 transition">
                                            <td className="px-3 py-2 text-center text-slate-400 font-medium">{i + 1}</td>
                                            <td className="px-3 py-2 font-mono text-slate-500 font-semibold">{r.indicator_code}</td>
                                            <td className="px-4 py-2 font-semibold text-slate-800 max-w-[220px] truncate" title={r.indicator_name}>{r.indicator_name}</td>
                                            {r.cells.map((c) => {
                                                const bg =
                                                    c.status === 'good' ? 'bg-emerald-100 text-emerald-900' :
                                                    c.status === 'warning' ? 'bg-amber-100 text-amber-900' :
                                                    c.status === 'critical' ? 'bg-rose-100 text-rose-900' :
                                                    'bg-slate-100 text-slate-400';
                                                return (
                                                    <td key={c.period_id} className="px-2 py-2 text-center">
                                                        <span className={`inline-block w-full py-1 rounded text-[11px] font-mono font-bold ${bg}`}>
                                                            {c.achievement !== null ? `${c.achievement}%` : '-'}
                                                        </span>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* --- MODAL DIALOG 1: DRILL-DOWN POHON KINERJA OPD -------------- */}
                {selectedOpdForDrilldown && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
                            {/* Header */}
                            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
                                <div className="flex items-center gap-2.5">
                                    <GitFork className="h-5 w-5 text-primary" />
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                            Drill-Down Cascading Kinerja: {selectedOpdForDrilldown.perangkat_daerah}
                                        </h3>
                                        <p className="text-xs text-slate-500 font-mono">{selectedOpdForDrilldown.kode} &bull; Rata-rata Capaian: {selectedOpdForDrilldown.rata_capaian.toFixed(2)}% ({selectedOpdForDrilldown.status})</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedOpdForDrilldown(null)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-5 overflow-y-auto space-y-6">
                                {/* Flow Pipeline Breadcrumb: OPD -> Sasaran -> Indikator Kinerja -> Target -> Realisasi -> Program -> Kegiatan -> Subkegiatan */}
                                <div className="p-3 rounded-lg bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-blue-900 dark:text-blue-200">
                                    <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-bold">1. OPD</span>
                                    <span>&rarr;</span>
                                    <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200">2. Sasaran</span>
                                    <span>&rarr;</span>
                                    <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200">3. Indikator Kinerja</span>
                                    <span>&rarr;</span>
                                    <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200">4. Benchmark & Realisasi</span>
                                    <span>&rarr;</span>
                                    <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200">5. Program</span>
                                    <span>&rarr;</span>
                                    <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200">6. Kegiatan</span>
                                    <span>&rarr;</span>
                                    <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200">7. Subkegiatan</span>
                                </div>

                                {/* Diagnosa Pimpinan: Mengapa Berstatus Merah / Kritis / Perhatian */}
                                {(() => {
                                    const criticalInds = selectedOpdForDrilldown.drilldown.indikator.filter(
                                        (d) => d.status === 'Kritis' || (d.capaian !== null && d.capaian < 50) || (d.capaian !== null && d.capaian < 0)
                                    );
                                    if (criticalInds.length === 0) return null;
                                    return (
                                        <div className="p-3.5 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/40 text-xs text-rose-900 dark:text-rose-200 space-y-2">
                                            <div className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-400">
                                                <AlertTriangle className="h-4 w-4" />
                                                <span>Diagnosa Pimpinan: Faktor Penyebab Status "{selectedOpdForDrilldown.status}"</span>
                                            </div>
                                            <p className="text-[11.5px] text-rose-800 dark:text-rose-300">
                                                Ditemukan <strong>{criticalInds.length} indikator</strong> yang berstatus deviasi kritis (&lt; 50%) atau bernilai minus yang menyebabkan OPD ini membutuhkan perhatian / intervensi pimpinan:
                                            </p>
                                            <div className="space-y-1.5 pt-1">
                                                {criticalInds.map((ci) => (
                                                    <div key={`crit-${ci.id}`} className="bg-white/80 dark:bg-slate-900/80 p-2 rounded border border-rose-200 dark:border-rose-900/50">
                                                        <div className="flex items-center justify-between font-semibold">
                                                            <span>• {ci.nama} ({ci.code})</span>
                                                            <span className={ci.capaian !== null && ci.capaian < 0 ? 'text-rose-600 font-black' : 'text-amber-600 font-bold'}>
                                                                Benchmark: {ci.target ?? '-'} | Real: {ci.realisasi ?? '-'} | Cap: {ci.capaian !== null ? `${ci.capaian}%` : '-'}
                                                            </span>
                                                        </div>
                                                        <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">
                                                            ↳ {ci.penyebab_merah ?? 'Realisasi capaian kinerja belum memenuhi standar benchmark tahun evaluasi.'}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Cascading Lengkap per Sasaran Strategis */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide flex items-center gap-1.5">
                                            <GitFork className="h-4 w-4 text-primary" />
                                            Rincian Cascading Kinerja Lengkap per Sasaran Strategis
                                        </h4>
                                        <span className="text-[11px] text-slate-500 font-medium">
                                            Total {selectedOpdForDrilldown.drilldown.sasaran_hierarki?.length ?? (selectedOpdForDrilldown.drilldown.indikator?.length ? 1 : 0)} Sasaran Strategis
                                        </span>
                                    </div>

                                    {(selectedOpdForDrilldown.drilldown.sasaran_hierarki ?? (selectedOpdForDrilldown.drilldown.indikator?.length ? [
                                        {
                                            sasaran: 'Sasaran Strategis Perangkat Daerah',
                                            indikator: selectedOpdForDrilldown.drilldown.indikator,
                                            programs: selectedOpdForDrilldown.drilldown.programs,
                                        }
                                    ] : [])).map((group, gIdx) => (
                                        <div key={gIdx} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
                                            {/* Sasaran Header */}
                                            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold text-[10px] font-mono">
                                                        SASARAN {gIdx + 1}
                                                    </span>
                                                    <h5 className="font-bold text-xs text-slate-900 dark:text-white">
                                                        {group.sasaran}
                                                    </h5>
                                                </div>
                                                <span className="text-[11px] font-medium text-slate-500">
                                                    {group.indikator.length} Indikator Kinerja
                                                </span>
                                            </div>

                                            <div className="p-4 space-y-4">
                                                {/* Tabel Indikator Kinerja Sasaran */}
                                                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                                                    <table className="w-full text-left text-xs">
                                                        <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                                            <tr>
                                                                <th className="px-3 py-2.5 font-semibold text-center w-8">No</th>
                                                                <th className="px-3 py-2.5 font-semibold">Indikator Kinerja</th>
                                                                <th className="px-2 py-2.5 font-semibold text-center w-16">Satuan</th>
                                                                <th className="px-2 py-2.5 font-semibold text-right w-20">Benchmark ({evalYear})</th>
                                                                <th className="px-2 py-2.5 font-semibold text-right w-20">Realisasi</th>
                                                                <th className="px-2 py-2.5 font-semibold text-right w-24">Capaian</th>
                                                                <th className="px-2 py-2.5 font-semibold text-center w-24">Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                                            {group.indikator.map((ind, i) => (
                                                                <tr key={ind.id} className={ind.status === 'Kritis' || (ind.capaian !== null && ind.capaian < 0) ? 'bg-rose-50/50 dark:bg-rose-950/20' : 'hover:bg-slate-50/70 transition'}>
                                                                    <td className="px-3 py-2 text-center text-slate-500">{i + 1}</td>
                                                                    <td className="px-3 py-2">
                                                                        <p className="font-semibold text-slate-800 dark:text-slate-200">{ind.nama}</p>
                                                                        <p className="text-[10px] text-slate-400 font-mono">{ind.code}</p>
                                                                        {ind.penyebab_merah && (
                                                                            <p className="text-[10.5px] text-rose-700 dark:text-rose-400 font-semibold mt-0.5">
                                                                                <AlertTriangle className="w-3 h-3 inline mr-1 text-rose-600" />{ind.penyebab_merah}
                                                                            </p>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-2 py-2 text-center text-slate-500 font-mono">{ind.satuan}</td>
                                                                    <td className="px-2 py-2 text-right font-mono text-slate-600 dark:text-slate-400">{ind.target ?? '-'}</td>
                                                                    <td className="px-2 py-2 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">{ind.realisasi ?? '-'}</td>
                                                                    <td className="px-2 py-2 text-right font-mono font-bold text-sm">
                                                                        <span className={ind.capaian !== null && ind.capaian < 0 ? 'text-rose-700 font-black' : ind.capaian !== null && ind.capaian >= 100 ? 'text-emerald-700' : 'text-amber-700'}>
                                                                            {ind.capaian !== null ? `${ind.capaian}%` : '-'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-2 py-2 text-center">
                                                                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold border ${statusBadgeCls(ind.status)}`}>
                                                                            {ind.status}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>

                                                {/* Legenda Kriteria Status Kinerja di bawah tabel indikator sasaran */}
                                                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 flex flex-wrap items-center gap-x-3 gap-y-1">
                                                    <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                                                        <span>💡</span> Status Kinerja:
                                                    </span>
                                                    <span className="inline-flex items-center gap-1">
                                                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                                        <strong>Tercapai:</strong> Capaian &ge; 100%
                                                    </span>
                                                    <span className="text-slate-300 dark:text-slate-600">|</span>
                                                    <span className="inline-flex items-center gap-1">
                                                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                                        <strong>Perlu Perhatian:</strong> 50% &le; Capaian &lt; 100%
                                                    </span>
                                                    <span className="text-slate-300 dark:text-slate-600">|</span>
                                                    <span className="inline-flex items-center gap-1">
                                                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                                        <strong>Kritis:</strong> Capaian &lt; 50% / Minus
                                                    </span>
                                                    <span className="text-slate-300 dark:text-slate-600">|</span>
                                                    <span className="inline-flex items-center gap-1">
                                                        <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                                                        <strong>Tidak Dinilai:</strong> Benchmark = 0 &amp; Real = 0
                                                    </span>
                                                </div>

                                                {/* Pohon Program -> Kegiatan -> Subkegiatan Pendukung */}
                                                <div className="space-y-2.5 pt-1">
                                                    <h6 className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 uppercase">
                                                        <Layers className="h-3.5 w-3.5 text-emerald-600" />
                                                        Cascading Pelaksanaan: Program &rarr; Kegiatan &rarr; Subkegiatan
                                                    </h6>
                                                    <div className="space-y-2">
                                                        {group.programs.map((prog, pIdx) => (
                                                            <div key={pIdx} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-3 space-y-2">
                                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                                                                    <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-mono text-[9.5px]">PROGRAM</span>
                                                                    <span>{prog.kode} - {prog.nama}</span>
                                                                </div>

                                                                {/* Kegiatan */}
                                                                <div className="pl-4 space-y-2 border-l-2 border-blue-300 ml-2">
                                                                    {prog.kegiatan.map((keg, kIdx) => (
                                                                        <div key={kIdx} className="space-y-1">
                                                                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                                                                                <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 font-mono text-[9px]">KEGIATAN</span>
                                                                                <span>{keg.kode} - {keg.nama}</span>
                                                                            </div>

                                                                            {/* Subkegiatan */}
                                                                            <div className="pl-4 space-y-0.5 border-l border-amber-300 ml-2 text-[11px] text-slate-600 dark:text-slate-400">
                                                                                {keg.subkegiatan.map((sub, sIdx) => (
                                                                                    <div key={sIdx} className="flex items-center gap-2">
                                                                                        <span className="px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[9px]">SUBKEGIATAN</span>
                                                                                        <span>{sub.kode} - {sub.nama}</span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => setSelectedOpdForDrilldown(null)}
                                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 transition cursor-pointer"
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- MODAL DIALOG 2: DETAIL LAPORAN HASIL EVALUASI (LHE) SAKIP -- */}
                {selectedLhe && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
                            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-purple-50/80 dark:bg-purple-950/40">
                                <div className="flex items-center gap-2">
                                    <Medal className="h-5 w-5 text-purple-700" />
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                            Laporan Hasil Evaluasi (LHE) SAKIP
                                        </h3>
                                        <p className="text-xs text-slate-500">{selectedLhe.opd} ({selectedLhe.kode})</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedLhe(null)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="p-5 space-y-4 text-xs">
                                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono text-[11px]">
                                    <div>
                                        <span className="text-slate-500 block">Nomor LHE:</span>
                                        <span className="font-bold text-slate-800">{selectedLhe.lhe.nomor_lhe}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 block">Tanggal Pengesahan:</span>
                                        <span className="font-bold text-slate-800">{selectedLhe.lhe.tanggal}</span>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="text-slate-500 block">Tim Evaluator:</span>
                                        <span className="font-bold text-slate-800">{selectedLhe.lhe.evaluator}</span>
                                    </div>
                                </div>

                                <div className="text-center p-3 rounded-lg bg-purple-50 border border-purple-200">
                                    <span className="text-[11px] font-semibold text-purple-700 block uppercase">Nilai Akuntabilitas Kinerja</span>
                                    <span className="text-3xl font-black text-purple-900">{selectedLhe.nilai.toFixed(2)}</span>
                                    <div className="mt-1">
                                        <span className={`inline-flex px-3 py-0.5 rounded-full text-xs font-black border ${predikatBadgeCls(selectedLhe.predikat)}`}>
                                            PREDIKAT: {selectedLhe.predikat}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-bold text-slate-700 mb-1">Catatan Evaluator:</h4>
                                    <p className="p-2.5 rounded bg-slate-50 border border-slate-200 text-slate-600 text-[11px]">
                                        {selectedLhe.lhe.catatan}
                                    </p>
                                </div>

                                <div>
                                    <h4 className="font-bold text-slate-700 mb-1">Rekomendasi Tindak Lanjut:</h4>
                                    <p className="p-2.5 rounded bg-slate-50 border border-slate-200 text-slate-600 text-[11px]">
                                        {selectedLhe.lhe.rekomendasi}
                                    </p>
                                </div>
                            </div>

                            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                                <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                                    <Check className="h-3.5 w-3.5" />
                                    {selectedLhe.lhe.status_dokumen}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setSelectedLhe(null)}
                                    className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 transition cursor-pointer"
                                >
                                    Selesai
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- MODAL DIALOG 3: RINCIAN RENCANA AKSI PERANGKAT DAERAH -- */}
                {selectedOpdForPlansModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
                            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-emerald-50/80 dark:bg-emerald-950/40">
                                <div className="flex items-center gap-2">
                                    <Target className="h-5 w-5 text-emerald-700" />
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                            Rincian Rencana Aksi Kinerja - {actionPlansTw}
                                        </h3>
                                        <p className="text-xs text-slate-500">{selectedOpdForPlansModal.opd} ({selectedOpdForPlansModal.kode})</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedOpdForPlansModal(null)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="p-5 space-y-4 text-xs">
                                {/* Ringkasan Capaian OPD */}
                                <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700 text-center font-mono">
                                    <div>
                                        <span className="text-[10px] text-slate-500 uppercase block font-sans">Target {actionPlansTw}</span>
                                        <span className="text-base font-bold text-slate-700 dark:text-slate-200">
                                            {selectedOpdForPlansModal.target_tw != null ? selectedOpdForPlansModal.target_tw.toFixed(2) : '-'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-500 uppercase block font-sans">Realisasi {actionPlansTw}</span>
                                        <span className="text-base font-bold text-slate-900 dark:text-white">
                                            {selectedOpdForPlansModal.realisasi_tw != null ? selectedOpdForPlansModal.realisasi_tw.toFixed(2) : '-'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-500 uppercase block font-sans">Capaian & Status</span>
                                        <span className="text-base font-black text-blue-700 dark:text-blue-400 block">
                                            {selectedOpdForPlansModal.capaian != null ? `${selectedOpdForPlansModal.capaian.toFixed(2)}%${selectedOpdForPlansModal.is_overachieved ? '*' : ''}` : '-'}
                                        </span>
                                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${statusBadgeCls(selectedOpdForPlansModal.status)}`}>
                                            {selectedOpdForPlansModal.status}
                                        </span>
                                    </div>
                                </div>

                                {/* Daftar Kegiatan Rencana Aksi */}
                                <div>
                                    <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center justify-between">
                                        <span>Daftar Rencana Aksi ({selectedOpdForPlansModal.plans?.length ?? 0} Kegiatan)</span>
                                        <span className="text-[10px] text-slate-400 font-normal">Tahun {evalYear}</span>
                                    </h4>
                                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                                <tr>
                                                    <th className="px-3 py-2 text-center w-10">No</th>
                                                    <th className="px-3 py-2">Rencana Aksi / Kegiatan</th>
                                                    <th className="px-3 py-2 text-right w-20">Target</th>
                                                    <th className="px-3 py-2 text-right w-20">Realisasi</th>
                                                    <th className="px-3 py-2 text-right w-20">Capaian</th>
                                                    <th className="px-3 py-2 text-center w-24">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                {(!selectedOpdForPlansModal.plans || selectedOpdForPlansModal.plans.length === 0) ? (
                                                    <tr>
                                                        <td colSpan={6} className="py-6 text-center text-slate-400">
                                                            Belum ada rincian rencana aksi spesifik untuk OPD ini.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    selectedOpdForPlansModal.plans.map((p: any, pIdx: number) => (
                                                        <tr key={p.id ?? pIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                                            <td className="px-3 py-2 text-center text-slate-500">{pIdx + 1}</td>
                                                            <td className="px-3 py-2">
                                                                <p className="font-semibold text-slate-800 dark:text-slate-200">{p.judul}</p>
                                                                <p className="text-[10px] text-slate-400 font-mono">{p.kode}</p>
                                                            </td>
                                                            <td className="px-3 py-2 text-right font-mono text-slate-600 dark:text-slate-400">
                                                                {p.target != null ? p.target.toFixed(2) : '-'}
                                                            </td>
                                                            <td className="px-3 py-2 text-right font-mono font-bold text-slate-800 dark:text-slate-100">
                                                                {p.realisasi != null ? p.realisasi.toFixed(2) : '-'}
                                                            </td>
                                                            <td className="px-3 py-2 text-right font-mono font-bold text-blue-700 dark:text-blue-400">
                                                                {p.capaian != null ? `${p.capaian.toFixed(2)}%` : '-'}
                                                            </td>
                                                            <td className="px-3 py-2 text-center">
                                                                <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold border ${statusBadgeCls(p.status)}`}>
                                                                    {p.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Kriteria Status Modal */}
                                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                                    <span className="font-semibold text-slate-700 dark:text-slate-300">💡 Kriteria:</span>
                                    <span className="inline-flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                        <span><strong>Tercapai:</strong> &ge; 100%</span>
                                    </span>
                                    <span className="text-slate-300 dark:text-slate-600">|</span>
                                    <span className="inline-flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                        <span><strong>Perlu Perhatian:</strong> 50% &le; Capaian &lt; 100%</span>
                                    </span>
                                    <span className="text-slate-300 dark:text-slate-600">|</span>
                                    <span className="inline-flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                        <span><strong>Kritis:</strong> &lt; 50%</span>
                                    </span>
                                    <span className="text-slate-300 dark:text-slate-600">|</span>
                                    <span className="inline-flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                        <span><strong>Tidak Dinilai:</strong> Target = 0 &amp; Real = 0</span>
                                    </span>
                                </div>
                            </div>

                            <div className="p-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => setSelectedOpdForPlansModal(null)}
                                    className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 transition cursor-pointer"
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- MODAL DIALOG 4: RINCIAN SUBKEGIATAN ANGGARAN PERANGKAT DAERAH -- */}
                {selectedOpdForBudgetModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
                            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-emerald-50/80 dark:bg-emerald-950/40">
                                <div className="flex items-center gap-2">
                                    <Coins className="h-5 w-5 text-emerald-700" />
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                            Rincian Subkegiatan Anggaran - {actionPlansTw}
                                        </h3>
                                        <p className="text-xs text-slate-500">{selectedOpdForBudgetModal.opd} ({selectedOpdForBudgetModal.kode})</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedOpdForBudgetModal(null)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="p-5 space-y-4 text-xs">
                                {/* Ringkasan Serapan OPD */}
                                <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700 text-center font-mono">
                                    <div>
                                        <span className="text-[10px] text-slate-500 uppercase block font-sans">Pagu {actionPlansTw}</span>
                                        <span className="text-base font-bold text-slate-700 dark:text-slate-200" title={selectedOpdForBudgetModal.pagu_tw > 0 ? formatRupiah(selectedOpdForBudgetModal.pagu_tw) : undefined}>
                                            {selectedOpdForBudgetModal.pagu_tw > 0 ? formatRupiahCompact(selectedOpdForBudgetModal.pagu_tw) : '-'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-500 uppercase block font-sans">Realisasi {actionPlansTw}</span>
                                        <span className="text-base font-bold text-slate-900 dark:text-white" title={selectedOpdForBudgetModal.realisasi_tw > 0 ? formatRupiah(selectedOpdForBudgetModal.realisasi_tw) : undefined}>
                                            {selectedOpdForBudgetModal.realisasi_tw > 0 ? formatRupiahCompact(selectedOpdForBudgetModal.realisasi_tw) : '-'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-500 uppercase block font-sans">Serapan &amp; Status</span>
                                        <span className="text-base font-black text-emerald-700 dark:text-emerald-400 block">
                                            {selectedOpdForBudgetModal.serapan != null ? `${selectedOpdForBudgetModal.serapan.toFixed(2)}%${selectedOpdForBudgetModal.is_overachieved ? '*' : ''}` : '-'}
                                        </span>
                                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${statusBadgeCls(selectedOpdForBudgetModal.status)}`}>
                                            {selectedOpdForBudgetModal.status ?? '-'}
                                        </span>
                                    </div>
                                </div>

                                {/* Daftar Subkegiatan Anggaran */}
                                <div>
                                    <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center justify-between">
                                        <span>Daftar Subkegiatan Anggaran ({selectedOpdForBudgetModal.items?.length ?? selectedOpdForBudgetModal.items_count ?? 0} Subkegiatan)</span>
                                        <span className="text-[10px] text-slate-400 font-normal">Tahun {evalYear}</span>
                                    </h4>
                                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden max-h-72 overflow-y-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 sticky top-0">
                                                <tr>
                                                    <th className="px-3 py-2 text-center w-10">No</th>
                                                    <th className="px-3 py-2">Subkegiatan &amp; Indikator</th>
                                                    <th className="px-3 py-2 text-right w-24">Pagu</th>
                                                    <th className="px-3 py-2 text-right w-24">Realisasi</th>
                                                    <th className="px-3 py-2 text-right w-20">Serapan</th>
                                                    <th className="px-3 py-2 text-center w-24">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                {(!selectedOpdForBudgetModal.items || selectedOpdForBudgetModal.items.length === 0) ? (
                                                    <tr>
                                                        <td colSpan={6} className="py-6 text-center text-slate-400">
                                                            Belum ada rincian subkegiatan anggaran spesifik untuk OPD ini.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    selectedOpdForBudgetModal.items.map((item: any, itmIdx: number) => (
                                                        <tr key={item.id ?? itmIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                                            <td className="px-3 py-2 text-center text-slate-500">{itmIdx + 1}</td>
                                                            <td className="px-3 py-2">
                                                                <p className="font-semibold text-slate-800 dark:text-slate-200">{item.subkegiatan}</p>
                                                                <p className="text-[10px] text-slate-400">{item.indikator_subkegiatan}</p>
                                                            </td>
                                                            <td className="px-3 py-2 text-right font-mono text-slate-600 dark:text-slate-400" title={item.pagu_tw > 0 ? formatRupiah(item.pagu_tw) : undefined}>
                                                                {item.pagu_tw > 0 ? formatRupiahCompact(item.pagu_tw) : '-'}
                                                            </td>
                                                            <td className="px-3 py-2 text-right font-mono font-bold text-slate-800 dark:text-slate-100" title={item.realisasi_tw > 0 ? formatRupiah(item.realisasi_tw) : undefined}>
                                                                {item.realisasi_tw > 0 ? formatRupiahCompact(item.realisasi_tw) : '-'}
                                                            </td>
                                                            <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                                                                {item.serapan != null ? `${item.serapan.toFixed(2)}%` : '-'}
                                                            </td>
                                                            <td className="px-3 py-2 text-center">
                                                                <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold border ${statusBadgeCls(item.status)}`}>
                                                                    {item.status ?? '-'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Kriteria Status Modal */}
                                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                                    <span className="font-semibold text-slate-700 dark:text-slate-300">💡 Kriteria:</span>
                                    <span className="inline-flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                        <span><strong>Tercapai:</strong> &ge; 100%</span>
                                    </span>
                                    <span className="text-slate-300 dark:text-slate-600">|</span>
                                    <span className="inline-flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                        <span><strong>Perlu Perhatian:</strong> 50% &le; Serapan &lt; 100%</span>
                                    </span>
                                    <span className="text-slate-300 dark:text-slate-600">|</span>
                                    <span className="inline-flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                        <span><strong>Kritis:</strong> &lt; 50%</span>
                                    </span>
                                    <span className="text-slate-300 dark:text-slate-600">|</span>
                                    <span className="inline-flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                        <span><strong>Tidak Dinilai:</strong> Pagu = 0 &amp; Real = 0</span>
                                    </span>
                                </div>
                            </div>

                            <div className="p-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => setSelectedOpdForBudgetModal(null)}
                                    className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 transition cursor-pointer"
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- FOOTER BANTUAN OPERASIONAL --------------------------------- */}
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <HelpCircle className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <span>
                            Data diperbarui secara dinamis dari database SAKIP. Klik tombol <strong>Salin Data (Excel)</strong> untuk menyalin seluruh baris terfilter ke spreadsheet Anda.
                        </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-shrink-0">
                        <span>&copy; {currentYear} {orgName} {instansiName}. Hak Cipta Dilindungi.</span>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
