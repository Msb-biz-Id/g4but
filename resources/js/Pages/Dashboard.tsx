import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ApplicationLogo from '@/Components/ApplicationLogo';
import { PageProps } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, User as UserIcon, TableProperties, ArrowRight, ExternalLink, Target, TrendingUp, Search, X, Check, Copy, Download } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/Components/ui/dialog';
import { Select2 } from '@/Components/ui/select2';
import { formatRupiah, formatRupiahCompact } from '@/lib/utils';


// ─── Types ────────────────────────────────────────────────────────────────────

export interface PemdaMatrixRow {
    no: number;
    name: string;
    type: string;
    period: string;
    period_type: string;
    is_available: boolean;
    status: string;
    document_id?: number | null;
    document_title?: string | null;
    document_number?: string | null;
    approved_at?: string | null;
    has_file?: boolean;
    download_url?: string | null;
}

export interface PemdaSakipMatrix {
    total_required: number;
    available: number;
    missing: number;
    percentage: number;
    status: string;
    rows: PemdaMatrixRow[];
    evaluation_year: number;
}

export interface OpdMatrixDocDetail {
    is_available: boolean;
    has_file?: boolean;
    download_url?: string | null;
    title?: string;
}

export interface OpdMatrixRow {
    no: number;
    organization_id: number;
    organization_code: string;
    organization_name: string;
    checks: Record<string, boolean>;
    doc_details?: Record<string, OpdMatrixDocDetail>;
    available_count: number;
    missing_count: number;
    total_required: number;
    percentage: number;
    status: string;
}

export interface OpdSakipMatrix {
    total_opd: number;
    opd_lengkap: number;
    opd_belum_lengkap: number;
    pct_lengkap: number;
    missing_docs: number;
    total_required_docs: number;
    available_docs: number;
    columns: Record<string, string>;
    rows: OpdMatrixRow[];
    evaluation_year: number;
    status_distribution?: {
        lengkap: number;
        belum_lengkap: number;
        belum_tersedia: number;
    };
}

export interface RpjmdYearlyData {
    target: number | null;
    realization: number | null;
    achievement: number | null;
    status: string;
    predikat: string;
    badge: string;
    color: string;
    bgClass: string;
}

export interface RpjmdMatrixRow {
    no: number | string;
    id: number;
    kode: string;
    tujuan: string;
    sasaran: string;
    strategic_objective_id: number | null;
    indikator: string;
    satuan: string;
    polarization: string;
    target: number | null;
    realisasi: number | null;
    capaian: number | null;
    status: string;
    predikat: string;
    badge: string;
    color: string;
    bgClass: string;
    opd_pengampu: string;
    opd_id: number | null;
    yearly: Record<number, RpjmdYearlyData>;
    level?: 'goal' | 'objective';
    parent_id?: number | null;
    order_no?: number;
    number_code?: string;
    goal_code?: string;
}

export interface RpjmdMatrixSummary {
    total_tujuan?: number;
    total_sasaran: number;
    total_indikator: number;
    rata_capaian: number;
    tercapai: number;
    perlu_perhatian: number;
    kritis: number;
    tidak_dinilai?: number;
    breakdown: {
        tercapai: number;
        perlu_perhatian: number;
        terlambat: number;
        kritis: number;
    };
    evaluation_year: number;
}

export interface RpjmdTrendPoint {
    tahun: number;
    target: number | null;
    realisasi: number | null;
    capaian: number | null;
    tercapai: number;
    perlu_perhatian: number;
    kritis?: number;
    tidak_dinilai?: number;
    status: string;
}

export interface RpjmdMatrixData {
    summary: RpjmdMatrixSummary;
    trend: RpjmdTrendPoint[];
    rows: RpjmdMatrixRow[];
    years: number[];
    evaluation_year: number;
}

interface KpiKelengkapanPemda { pct: number; tersedia: number; total: number; status: string; }
interface KpiOpdLengkap { lengkap: number; total: number; pct: number; }
interface KpiCapaian { pct: number; status: string; }
interface KpiSakipOpd { nilai: number; predikat: string; }
interface KpiPko { nilai: number; predikat: string; }
interface KpiRataPkoOpd { nilai: number; predikat: string; total_opd: number; }
interface KpiKritis { jumlah: number; }

interface KpiData {
    kelengkapan_pemda: KpiKelengkapanPemda;
    opd_sakip_lengkap: KpiOpdLengkap;
    rata_capaian_rpjmd: KpiCapaian;
    capaian_iku_pemda: KpiCapaian;
    rata_capaian_opd: KpiCapaian;
    nilai_sakip_pemda?: KpiSakipOpd;
    rata_nilai_sakip_opd: KpiSakipOpd;
    nilai_pko_pemda: KpiPko;
    rata_nilai_pko_opd?: KpiRataPkoOpd;
    rata_rata_pko_pemda?: KpiRataPkoOpd;
    opd_kritis: KpiKritis;
}

interface StatusDistribusi { total: number; tercapai: number; perlu_perhatian: number; terlambat?: number; kritis: number; tidak_dinilai?: number; }
interface TrendRpjmd { tahun: number; target: number | null; realisasi: number | null; }
interface TrendPko { tahun: number; nilai: number | null; }

interface OpdRankItem {
    id: number; rank: number; nama: string; kode: string;
    jumlah_indikator: number; rata_capaian: number;
    tercapai: number; perlu_perhatian: number; terlambat: number; kritis: number;
    status: string;
}

interface SakipDistribusi {
    rata_nilai: number; predikat_rata: string; total_dievaluasi: number;
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
}

interface PkoOpdItem { rank: number; nama: string; kode: string; nilai_pko: number; predikat: string; }

interface RenaksSummary { tahun: number; triwulan: string; on_track: number; perlu_perhatian: number; terlambat: number; kritis: number; }
interface RenaksOpd { nama: string; target_tw: number | null; realisasi_tw: number | null; capaian: number | null; status: string; }
interface BudgetSummary {
    tahun: number;
    triwulan: string;
    total_pagu: number;
    total_realisasi: number;
    serapan_persen: number;
    tercapai: number;
    perlu_perhatian: number;
    kritis: number;
    tidak_dinilai: number;
    rata_serapan: number;
}
interface BudgetOpd {
    nama: string;
    pagu_tw: number;
    realisasi_tw: number;
    serapan: number | null;
    status: string;
}
interface AttentionItem { uraian: string; kategori: string; jumlah: number; status: string; }

interface FilterOptionItem { id: number; code: string; name: string; }
interface FilterOptions {
    organizations: FilterOptionItem[];
    sasaran: FilterOptionItem[];
    years: number[];
    triwulan: string[];
    status: string[];
}
interface CurrentFilters {
    tahun_evaluasi: number;
    triwulan: string;
    organization_id: number | null;
    strategic_objective_id: number | null;
    status_kinerja: string;
}

interface Props extends PageProps {
    tahun_evaluasi: number;
    triwulan_aktif: string;
    current_filters?: CurrentFilters;
    filter_options?: FilterOptions;
    kpi: KpiData;
    rpjmd_status: StatusDistribusi;
    iku_status: StatusDistribusi;
    opd_status: StatusDistribusi;
    rpjmd_trend: TrendRpjmd[];
    iku_trend: TrendRpjmd[];
    pko_trend: TrendPko[];
    opd_ranking: OpdRankItem[];
    sakip_distribusi: SakipDistribusi;
    pko_opd: PkoOpdItem[];
    renaks_summary: RenaksSummary;
    renaks_opd: RenaksOpd[];
    budget_summary?: BudgetSummary;
    budget_opd?: BudgetOpd[];
    attention_list: AttentionItem[];
    last_updated_at: string;
    pemda_sakip_matrix?: PemdaSakipMatrix;
    opd_sakip_matrix?: OpdSakipMatrix;
    rpjmd_matrix?: RpjmdMatrixData;
    sakip_pemda?: any;
    sakip_pemda_matrix?: any;
}

// ─── SAKIP Donut Chart (Modal / Summary) ──────────────────────────────────────

function SakipDonutChart({ available, missing, percentage }: { available: number; missing: number; percentage: number }) {
    const option = {
        tooltip: {
            trigger: 'item',
            formatter: '{b}: <b>{c}</b> Dokumen ({d}%)',
        },
        legend: {
            bottom: 0,
            itemWidth: 10,
            itemHeight: 10,
            textStyle: { fontSize: 11, color: '#4b5563' },
        },
        series: [
            {
                name: 'Kelengkapan Dokumen',
                type: 'pie',
                radius: ['58%', '82%'],
                center: ['50%', '42%'],
                avoidLabelOverlap: false,
                label: {
                    show: true,
                    position: 'center',
                    formatter: () => `{val|${percentage.toFixed(1)}%}\n{lbl|Kelengkapan}`,
                    rich: {
                        val: { fontSize: 17, fontWeight: 800, color: '#1f2937', lineHeight: 21 },
                        lbl: { fontSize: 10, color: '#6b7280', lineHeight: 14 },
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
    total: number;
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
            textStyle: { fontSize: 11, color: '#4b5563' },
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
                        val: { fontSize: 17, fontWeight: 800, color: '#1f2937', lineHeight: 21 },
                        lbl: { fontSize: 10, color: '#6b7280', lineHeight: 14 },
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

// ─── RPJMD 5-Year Trend Chart (Modal Detail) ─────────────────────────────────

function RpjmdModalTrendChart({ trend }: { trend: RpjmdTrendPoint[] }) {
    const years = trend.map((t) => t.tahun);
    const capaian = trend.map((t) => t.capaian);
    const target = trend.map((t) => t.target ?? 0);
    const yearStart = years[0] ?? 2026;
    const yearEnd = years[years.length - 1] ?? 2030;

    const option = {
        tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            borderColor: '#334155',
            textStyle: { color: '#ffffff', fontSize: 11 },
            formatter: (params: any) => {
                const yr = params[0]?.axisValue;
                const point = trend.find((t) => t.tahun === Number(yr));
                let html = `<div style="font-weight:700;margin-bottom:4px;border-bottom:1px solid #334155;padding-bottom:3px">Tren Sasaran RPJMD — Tahun ${yr}</div>`;
                if (point?.capaian !== null && point?.capaian !== undefined) {
                    html += `<div style="display:flex;justify-content:space-between;gap:12px"><span>Rata-rata Capaian:</span><b style="color:#10b981">${point.capaian}%</b></div>`;
                    html += `<div style="display:flex;justify-content:space-between;gap:12px"><span>Tercapai (≥100%):</span><b>${point.tercapai} Indikator</b></div>`;
                    html += `<div style="display:flex;justify-content:space-between;gap:12px"><span>Perlu Perhatian (50–<100%):</span><b style="color:#f59e0b">${point.perlu_perhatian} Indikator</b></div>`;
                    html += `<div style="display:flex;justify-content:space-between;gap:12px"><span>Kritis (&lt;50%):</span><b style="color:#ef4444">${point.kritis ?? 0} Indikator</b></div>`;
                    html += `<div style="display:flex;justify-content:space-between;gap:12px"><span>Benchmark:</span><b>100%</b></div>`;
                } else {
                    html += `<div style="color:#94a3b8;font-style:italic">Tahun masa depan (target perencanaan RPJMD ${yearStart}–${yearEnd})</div>`;
                }
                return html;
            },
        },
        legend: {
            bottom: 0,
            itemWidth: 16,
            itemHeight: 8,
            textStyle: { fontSize: 11, color: '#64748b' },
            data: [
                { name: 'Benchmark', icon: 'line' },
                { name: 'Rata-rata Capaian Realisasi (%)', icon: 'circle' },
            ],
        },
        grid: {
            top: 24,
            bottom: 30,
            left: 10,
            right: 20,
            containLabel: true,
        },
        xAxis: {
            type: 'category',
            data: years,
            axisLine: { lineStyle: { color: '#cbd5e1' } },
            axisLabel: { color: '#475569', fontSize: 11, fontWeight: 'bold' },
        },
        yAxis: {
            type: 'value',
            min: 50,
            max: 120,
            splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
            axisLabel: {
                formatter: '{value}%',
                color: '#64748b',
                fontSize: 10,
            },
        },
        series: [
            {
                name: 'Benchmark',
                type: 'line',
                data: target,
                lineStyle: { color: '#93c5fd', width: 2, type: 'dashed' },
                itemStyle: { color: '#60a5fa' },
                symbol: 'none',
            },
            {
                name: 'Rata-rata Capaian Realisasi (%)',
                type: 'line',
                data: capaian,
                lineStyle: { color: '#10b981', width: 3 },
                itemStyle: { color: '#059669', borderWidth: 2, borderColor: '#ffffff' },
                symbolSize: 8,
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                            { offset: 0, color: 'rgba(16, 185, 129, 0.28)' },
                            { offset: 1, color: 'rgba(16, 185, 129, 0.02)' },
                        ],
                    },
                },
                label: {
                    show: true,
                    position: 'top',
                    formatter: (p: any) => (p.value !== null && p.value !== undefined ? `${p.value}%` : ''),
                    fontSize: 10.5,
                    fontWeight: 'bold',
                    color: '#065f46',
                },
            },
        ],
    };

    return (
        <div className="w-full h-52">
            <ReactECharts option={option} style={{ width: '100%', height: '100%' }} opts={{ renderer: 'svg' }} />
        </div>
    );
}

// ─── Status helpers ───────────────────────────────────────────────────────────

type StatusType =
    | 'Tercapai'
    | 'Perlu Perhatian'
    | 'Terlambat'
    | 'Kritis'
    | 'Tidak Dinilai'
    | 'Lengkap'
    | 'Belum Lengkap'
    | 'Belum Tersedia'
    | 'Tersedia'
    | 'On Track'
    | 'Baik'
    | 'Sangat Baik'
    | 'Sangat Kurang'
    | 'Kurang'
    | 'Sedang'
    | 'Sebagian'
    | 'Di Bawah Target'
    | string;

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string; border: string }> = {
    // 1. Hijau / Emerald: Tercapai, Lengkap, Tersedia, On Track, Baik, Sangat Baik
    'Tercapai':        { bg: 'bg-emerald-100 dark:bg-emerald-950/40', text: 'text-emerald-800 dark:text-emerald-300', dot: '#10b981', border: 'border-emerald-300 dark:border-emerald-800/60' },
    'Lengkap':         { bg: 'bg-emerald-100 dark:bg-emerald-950/40', text: 'text-emerald-800 dark:text-emerald-300', dot: '#10b981', border: 'border-emerald-300 dark:border-emerald-800/60' },
    'Tersedia':        { bg: 'bg-emerald-100 dark:bg-emerald-950/40', text: 'text-emerald-800 dark:text-emerald-300', dot: '#10b981', border: 'border-emerald-300 dark:border-emerald-800/60' },
    'On Track':        { bg: 'bg-emerald-100 dark:bg-emerald-950/40', text: 'text-emerald-800 dark:text-emerald-300', dot: '#10b981', border: 'border-emerald-300 dark:border-emerald-800/60' },
    'Baik':            { bg: 'bg-emerald-100 dark:bg-emerald-950/40', text: 'text-emerald-800 dark:text-emerald-300', dot: '#10b981', border: 'border-emerald-300 dark:border-emerald-800/60' },
    'Sangat Baik':     { bg: 'bg-emerald-100 dark:bg-emerald-950/40', text: 'text-emerald-800 dark:text-emerald-300', dot: '#10b981', border: 'border-emerald-300 dark:border-emerald-800/60' },

    // 2. Kuning / Amber: Perlu Perhatian, Belum Lengkap, Sebagian, Sedang
    'Perlu Perhatian': { bg: 'bg-amber-100 dark:bg-amber-950/40',   text: 'text-amber-800 dark:text-amber-300',   dot: '#f59e0b', border: 'border-amber-300 dark:border-amber-800/60' },
    'Belum Lengkap':   { bg: 'bg-amber-100 dark:bg-amber-950/40',   text: 'text-amber-800 dark:text-amber-300',   dot: '#f59e0b', border: 'border-amber-300 dark:border-amber-800/60' },
    'Sebagian':        { bg: 'bg-amber-100 dark:bg-amber-950/40',   text: 'text-amber-800 dark:text-amber-300',   dot: '#f59e0b', border: 'border-amber-300 dark:border-amber-800/60' },
    'Sedang':          { bg: 'bg-amber-100 dark:bg-amber-950/40',   text: 'text-amber-800 dark:text-amber-300',   dot: '#f59e0b', border: 'border-amber-300 dark:border-amber-800/60' },

    // 3. Oranye: Terlambat, Di Bawah Target, Kurang
    'Terlambat':       { bg: 'bg-orange-100 dark:bg-orange-950/40', text: 'text-orange-800 dark:text-orange-300', dot: '#f97316', border: 'border-orange-300 dark:border-orange-800/60' },
    'Di Bawah Target': { bg: 'bg-orange-100 dark:bg-orange-950/40', text: 'text-orange-800 dark:text-orange-300', dot: '#f97316', border: 'border-orange-300 dark:border-orange-800/60' },
    'Kurang':          { bg: 'bg-orange-100 dark:bg-orange-950/40', text: 'text-orange-800 dark:text-orange-300', dot: '#f97316', border: 'border-orange-300 dark:border-orange-800/60' },

    // 4. Merah / Rose: Kritis, Belum Tersedia, Sangat Kurang
    'Kritis':          { bg: 'bg-rose-100 dark:bg-rose-950/40',     text: 'text-rose-800 dark:text-rose-300',     dot: '#ef4444', border: 'border-rose-300 dark:border-rose-800/60' },
    'Belum Tersedia':  { bg: 'bg-rose-100 dark:bg-rose-950/40',     text: 'text-rose-800 dark:text-rose-300',     dot: '#ef4444', border: 'border-rose-300 dark:border-rose-800/60' },
    'Sangat Kurang':   { bg: 'bg-rose-100 dark:bg-rose-950/40',     text: 'text-rose-800 dark:text-rose-300',     dot: '#ef4444', border: 'border-rose-300 dark:border-rose-800/60' },

    // 5. Netral / Gray: Tidak Dinilai, Belum Ada Data
    'Tidak Dinilai':   { bg: 'bg-slate-100 dark:bg-slate-800',      text: 'text-slate-600 dark:text-slate-300',   dot: '#9ca3af', border: 'border-slate-300 dark:border-slate-700' },
    'Belum Ada Data':  { bg: 'bg-slate-100 dark:bg-slate-800',      text: 'text-slate-600 dark:text-slate-300',   dot: '#9ca3af', border: 'border-slate-300 dark:border-slate-700' },
    '-':               { bg: 'bg-slate-100 dark:bg-slate-800',      text: 'text-slate-600 dark:text-slate-300',   dot: '#9ca3af', border: 'border-slate-300 dark:border-slate-700' },
};

const DONUT_COLORS: Record<string, string> = {
    'Tercapai':        '#10b981',
    'Perlu Perhatian': '#f59e0b',
    'Terlambat':       '#f97316',
    'Kritis':          '#ef4444',
    'Tidak Dinilai':   '#9ca3af',
    'Lengkap':         '#10b981',
    'Belum Lengkap':   '#f59e0b',
    'Belum Tersedia':  '#ef4444',
    'Tersedia':        '#10b981',
};

function sc(status: StatusType) {
    if (!status) {
        return { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-300', dot: '#9ca3af', border: 'border-slate-300 dark:border-slate-700' };
    }
    if (STATUS_COLORS[status]) return STATUS_COLORS[status];

    const s = String(status).toLowerCase().trim();
    if (s.includes('belum tersedia') || s.includes('kritis') || s.includes('sangat kurang')) {
        return STATUS_COLORS['Belum Tersedia'];
    }
    if (s.includes('belum lengkap') || s.includes('perlu perhatian') || s.includes('sebagian') || s.includes('sedang')) {
        return STATUS_COLORS['Belum Lengkap'];
    }
    if ((s.includes('lengkap') && !s.includes('belum')) || s.includes('tercapai') || s.includes('tersedia') || s.includes('on track') || s.includes('baik')) {
        return STATUS_COLORS['Tercapai'];
    }
    if (s.includes('terlambat') || s.includes('kurang') || s.includes('di bawah target')) {
        return STATUS_COLORS['Terlambat'];
    }
    return { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-300', dot: '#9ca3af', border: 'border-slate-300 dark:border-slate-700' };
}

function predikatCls(p: string) {
    const s = (p || '').trim().toUpperCase();
    if (s === 'AA' || s === 'ISTIMEWA') return 'text-white bg-emerald-700 border border-emerald-800 font-bold dark:bg-emerald-700 dark:text-white dark:border-emerald-600';
    if (s === 'A' || s === 'BAIK') return 'text-white bg-emerald-600 border border-emerald-700 font-bold dark:bg-emerald-600 dark:text-white dark:border-emerald-500';
    if (s === 'BB' || s === 'BUTUH PERBAIKAN') return 'text-white bg-blue-600 border border-blue-700 font-bold dark:bg-blue-600 dark:text-white dark:border-blue-500';
    if (s === 'B') return 'text-white bg-sky-600 border border-sky-700 font-bold dark:bg-sky-600 dark:text-white dark:border-sky-500';
    if (s === 'CC' || s === 'CUKUP') return 'text-slate-950 bg-amber-400 border border-amber-500 font-bold dark:bg-amber-400 dark:text-slate-950 dark:border-yellow-300';
    if (s === 'C' || s === 'KURANG') return 'text-white bg-orange-500 border border-orange-600 font-bold dark:bg-orange-500 dark:text-white dark:border-orange-400';
    if (s === 'D' || s === 'SANGAT KURANG') return 'text-white bg-rose-700 border border-rose-800 font-bold dark:bg-rose-700 dark:text-white dark:border-rose-500';
    return 'text-slate-700 bg-slate-100 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
}

function capaianColorCls(val: number | null | undefined): string {
    if (val === null || val === undefined) return 'text-slate-400';
    if (val < 0 || val < 50) return 'text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200';
    if (val >= 100) return 'text-emerald-700 font-bold';
    if (val >= 80) return 'text-amber-700 font-semibold';
    return 'text-orange-700 font-semibold';
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: StatusType }) {
    const c = sc(status);
    return (
        <span className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold border ${c.border} ${c.bg} ${c.text}`}>
            {status}
        </span>
    );
}

// ─── Donut Chart + Legend (Interactive Apache ECharts) ────────────────────────

function DonutChart({ data, label }: { data: StatusDistribusi; label: string }) {
    const segs = [
        { key: 'Tercapai',        n: data.tercapai,        color: DONUT_COLORS['Tercapai'] },
        { key: 'Perlu Perhatian', n: data.perlu_perhatian, color: DONUT_COLORS['Perlu Perhatian'] },
        { key: 'Kritis',          n: data.kritis,          color: DONUT_COLORS['Kritis'] },
    ];
    if (data.tidak_dinilai && data.tidak_dinilai > 0) {
        segs.push({ key: 'Tidak Dinilai', n: data.tidak_dinilai, color: DONUT_COLORS['Tidak Dinilai'] });
    }
    const total = data.total || 0;
    const hasData = segs.some(s => s.n > 0);

    const option = {
        tooltip: {
            trigger: 'item',
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            borderColor: '#374151',
            textStyle: { color: '#ffffff', fontSize: 11 },
            formatter: (params: any) => {
                const pct = total > 0 ? ((params.value / total) * 100).toFixed(1) : 0;
                return `<div style="padding:2px">
                    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${params.color};margin-right:6px"></span>
                    <strong>${params.name}</strong><br/>
                    Jumlah: <b>${params.value}</b> (${pct}%)
                </div>`;
            }
        },
        series: [
            {
                type: 'pie',
                radius: ['58%', '82%'],
                center: ['50%', '50%'],
                avoidLabelOverlap: false,
                itemStyle: {
                    borderRadius: 3,
                    borderColor: '#ffffff',
                    borderWidth: 2
                },
                label: {
                    show: true,
                    position: 'center',
                    formatter: () => `{val|${total}}\n{lbl|${label}}`,
                    rich: {
                        val: { fontSize: 20, fontWeight: 700, color: '#1f2937', lineHeight: 22 },
                        lbl: { fontSize: 10, color: '#6b7280', lineHeight: 14 }
                    }
                },
                emphasis: {
                    scale: true,
                    scaleSize: 6,
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.18)'
                    }
                },
                data: hasData
                    ? segs.filter(s => s.n > 0).map(s => ({
                          name: s.key,
                          value: s.n,
                          itemStyle: { color: s.color }
                      }))
                    : [{ name: 'Belum Ada Data', value: 1, itemStyle: { color: '#e5e7eb' }, tooltip: { show: false } }]
            }
        ]
    };

    return (
        <div className="flex items-center gap-2 sm:gap-3 py-1">
            {/* Interactive ECharts Donut */}
            <div className="relative flex-shrink-0 w-28 h-28 sm:w-32 sm:h-32">
                <ReactECharts
                    option={option}
                    style={{ width: '100%', height: '100%' }}
                    opts={{ renderer: 'svg' }}
                />
            </div>
            {/* Legend Identik dengan sebelumnya */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-0 pr-1">
                {segs.map((s) => (
                    <div key={s.key} className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-xs text-gray-600 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: s.color }} />
                            <span className="truncate">{s.key}</span>
                        </span>
                        <span className="text-xs font-bold text-gray-800 flex-shrink-0">{s.n}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Trend Line Chart (Target vs Realisasi) — Interactive ECharts ────────────

function TrendChart({ data }: { data: TrendRpjmd[]; title?: string }) {
    const validReal = data.map(d => d.realisasi).filter(v => v != null) as number[];
    const validTarg = data.map(d => d.target).filter(v => v != null) as number[];
    const allVals = [...validReal, ...validTarg];

    if (allVals.length === 0) {
        return <div className="flex h-28 items-center justify-center text-xs text-gray-400">Belum ada data</div>;
    }

    const minV = Math.max(0, Math.floor(Math.min(...allVals) / 10) * 10 - 10);
    const maxV = Math.ceil(Math.max(...allVals) / 10) * 10 + 10;

    const option = {
        tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            borderColor: '#374151',
            textStyle: { color: '#ffffff', fontSize: 11 },
            formatter: (params: any) => {
                let s = `<div style="font-weight:700;margin-bottom:4px;border-bottom:1px solid #374151;padding-bottom:2px">Tahun ${params[0]?.axisValue}</div>`;
                params.forEach((p: any) => {
                    if (p.value != null) {
                        s += `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:2px">
                            <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin-right:5px"></span>${p.seriesName}:</span>
                            <b>${p.value}%</b>
                        </div>`;
                    }
                });
                return s;
            }
        },
        legend: {
            bottom: 0,
            itemWidth: 18,
            itemHeight: 8,
            textStyle: { fontSize: 10.5, color: '#6b7280' },
            data: [
                { name: 'Target', icon: 'line', itemStyle: { lineDash: [4, 2] } },
                { name: 'Realisasi', icon: 'circle' }
            ]
        },
        grid: {
            top: 22,
            bottom: 26,
            left: 8,
            right: 14,
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: data.map(d => d.tahun),
            axisLine: { lineStyle: { color: '#e5e7eb' } },
            axisTick: { show: false },
            axisLabel: { color: '#6b7280', fontSize: 10 }
        },
        yAxis: {
            type: 'value',
            min: minV,
            max: maxV,
            splitLine: { lineStyle: { color: '#f3f4f6', type: 'dashed' } },
            axisLabel: {
                formatter: '{value}%',
                color: '#9ca3af',
                fontSize: 9
            }
        },
        series: [
            {
                name: 'Target',
                type: 'line',
                data: data.map(d => d.target),
                lineStyle: { color: '#93c5fd', width: 1.6, type: 'dashed' },
                itemStyle: { color: '#93c5fd' },
                symbol: 'circle',
                symbolSize: 4,
                connectNulls: true
            },
            {
                name: 'Realisasi',
                type: 'line',
                data: data.map(d => d.realisasi),
                lineStyle: { color: '#10b981', width: 2.2 },
                itemStyle: { color: '#10b981' },
                symbol: 'circle',
                symbolSize: 6,
                label: {
                    show: true,
                    position: 'top',
                    formatter: '{c}%',
                    fontSize: 9,
                    fontWeight: 'bold',
                    color: '#065f46'
                },
                connectNulls: true
            }
        ]
    };

    return (
        <div className="w-full h-36">
            <ReactECharts option={option} style={{ width: '100%', height: '100%' }} opts={{ renderer: 'svg' }} />
        </div>
    );
}

// ─── PKO Trend Chart (Single Line) — Interactive ECharts ─────────────────────

function PkoTrendChart({ data }: { data: TrendPko[] }) {
    const vals = data.map(d => d.nilai).filter(v => v != null) as number[];
    if (vals.length === 0) return <div className="flex h-28 items-center justify-center text-xs text-gray-400">Belum ada data</div>;

    const minV = Math.max(0, Math.floor(Math.min(...vals) / 10) * 10 - 10);
    const maxV = Math.ceil(Math.max(...vals) / 10) * 10 + 5;

    const option = {
        tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            borderColor: '#374151',
            textStyle: { color: '#ffffff', fontSize: 11 },
            formatter: (params: any) => {
                const p = params[0];
                return `<div style="font-weight:700;margin-bottom:4px;border-bottom:1px solid #374151;padding-bottom:2px">Tahun ${p?.axisValue}</div>
                <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
                    <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin-right:5px"></span>${p.seriesName}:</span>
                    <b>${p.value}</b>
                </div>`;
            }
        },
        legend: {
            bottom: 0,
            itemWidth: 18,
            itemHeight: 8,
            textStyle: { fontSize: 10.5, color: '#6b7280' },
            data: ['Nilai PKO']
        },
        grid: {
            top: 22,
            bottom: 26,
            left: 8,
            right: 14,
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: data.map(d => d.tahun),
            axisLine: { lineStyle: { color: '#e5e7eb' } },
            axisTick: { show: false },
            axisLabel: { color: '#6b7280', fontSize: 10 }
        },
        yAxis: {
            type: 'value',
            min: minV,
            max: maxV,
            splitLine: { lineStyle: { color: '#f3f4f6', type: 'dashed' } },
            axisLabel: {
                color: '#9ca3af',
                fontSize: 9
            }
        },
        series: [
            {
                name: 'Nilai PKO',
                type: 'line',
                data: data.map(d => d.nilai),
                lineStyle: { color: '#3b82f6', width: 2.2 },
                itemStyle: { color: '#3b82f6' },
                symbol: 'circle',
                symbolSize: 6,
                label: {
                    show: true,
                    position: 'top',
                    formatter: '{c}',
                    fontSize: 9,
                    fontWeight: 'bold',
                    color: '#1d4ed8'
                },
                connectNulls: true
            }
        ]
    };

    return (
        <div className="w-full h-36">
            <ReactECharts option={option} style={{ width: '100%', height: '100%' }} opts={{ renderer: 'svg' }} />
        </div>
    );
}

// ─── SAKIP Bar Chart — Interactive ECharts ────────────────────────────────────

function SakipBarChart({ data }: { data: SakipDistribusi }) {
    const bars = [
        { label: 'AA', v: data.predikat_AA ?? data.predikat_ISTIMEWA ?? 0, color: '#047857' },
        { label: 'A',  v: data.predikat_A ?? 0,                             color: '#10b981' },
        { label: 'BB', v: data.predikat_BB ?? 0,                            color: '#2563eb' },
        { label: 'B',  v: data.predikat_B ?? 0,                             color: '#0ea5e9' },
        { label: 'CC', v: data.predikat_CC ?? 0,                            color: '#eab308' },
        { label: 'C',  v: data.predikat_C ?? 0,                             color: '#f97316' },
        { label: 'D',  v: data.predikat_D ?? data.predikat_SANGAT_KURANG ?? 0, color: '#dc2626' },
    ];

    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            borderColor: '#374151',
            textStyle: { color: '#ffffff', fontSize: 11 },
            formatter: (params: any) => {
                const p = params[0];
                return `<strong>Predikat ${p.name}</strong>: <b>${p.value} OPD</b>`;
            }
        },
        grid: {
            top: 24,
            bottom: 26,
            left: 8,
            right: 8,
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: bars.map(b => b.label),
            axisLine: { lineStyle: { color: '#e5e7eb' } },
            axisTick: { show: false },
            axisLabel: { color: '#4b5563', fontSize: 10, fontWeight: 'bold' }
        },
        yAxis: {
            type: 'value',
            minInterval: 1,
            splitLine: { lineStyle: { color: '#f3f4f6', type: 'dashed' } },
            axisLabel: { color: '#9ca3af', fontSize: 9 }
        },
        series: [
            {
                type: 'bar',
                barWidth: '36%',
                data: bars.map(b => ({
                    value: b.v,
                    itemStyle: {
                        color: b.color,
                        borderRadius: [4, 4, 0, 0]
                    }
                })),
                label: {
                    show: true,
                    position: 'top',
                    fontSize: 10.5,
                    fontWeight: 'bold',
                    color: '#374151'
                },
                emphasis: {
                    itemStyle: {
                        shadowBlur: 6,
                        shadowColor: 'rgba(0,0,0,0.2)'
                    }
                }
            }
        ]
    };

    return (
        <div className="flex flex-col items-center w-full">
            <div className="w-full h-36 sm:h-44">
                <ReactECharts option={option} style={{ width: '100%', height: '100%' }} opts={{ renderer: 'svg' }} />
            </div>
            {/* Summary below */}
            <div className="mt-1 text-center w-full">
                <p className="text-sm font-bold text-gray-700">
                    Rata-rata Nilai SAKIP OPD:&nbsp;
                    <span className="text-blue-700 font-extrabold">{data.rata_nilai} ({data.predikat_rata})</span>
                </p>
                <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-1 text-[11px] text-gray-600">
                    <span><strong className="text-gray-800">{data.total_dievaluasi}</strong> OPD Dievaluasi</span>
                    <span className="text-emerald-800 font-semibold"><strong>{data.predikat_AA ?? data.predikat_ISTIMEWA ?? 0}</strong> AA</span>
                    <span className="text-emerald-600 font-semibold"><strong>{data.predikat_A ?? 0}</strong> A</span>
                    <span className="text-blue-600 font-semibold"><strong>{data.predikat_BB ?? 0}</strong> BB</span>
                    <span className="text-sky-600 font-semibold"><strong>{data.predikat_B ?? 0}</strong> B</span>
                    <span className="text-amber-600 font-semibold"><strong>{data.predikat_CC ?? 0}</strong> CC</span>
                    <span className="text-orange-600 font-semibold"><strong>{data.predikat_C ?? 0}</strong> C</span>
                    <span className="text-rose-700 font-semibold"><strong>{data.predikat_D ?? data.predikat_SANGAT_KURANG ?? 0}</strong> D</span>
                </div>
            </div>
        </div>
    );
}

// ─── Section card wrapper ─────────────────────────────────────────────────────

function Card({
    title,
    children,
    action,
    actionHref,
    extraHeader,
    noPad = false,
    className = '',
}: {
    title: string;
    children: React.ReactNode;
    action?: React.ReactNode;
    actionHref?: string;
    extraHeader?: React.ReactNode;
    noPad?: boolean;
    className?: string;
}) {
    return (
        <div className={`bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col ${className}`}>
            <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 border-b border-gray-100 flex-shrink-0 gap-2">
                <h3 className="text-xs sm:text-[13px] font-semibold text-gray-700 leading-tight">{title}</h3>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {extraHeader}
                    {action && (
                        actionHref ? (
                            <Link href={actionHref} className="flex items-center gap-1 text-xs text-blue-600 hover:underline select-none flex-shrink-0">
                                {action}<ChevronRight className="w-3 h-3" />
                            </Link>
                        ) : (
                            <div className="flex items-center gap-1 text-xs text-blue-600 select-none flex-shrink-0">
                                {action}
                            </div>
                        )
                    )}
                </div>
            </div>
            <div className={noPad ? 'flex-1' : 'p-3 sm:p-4 flex-1'}>{children}</div>
        </div>
    );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard({
    auth, tahun_evaluasi, triwulan_aktif, current_filters, filter_options, kpi,
    rpjmd_status, iku_status, opd_status,
    rpjmd_trend, iku_trend, pko_trend,
    opd_ranking, sakip_distribusi, pko_opd,
    renaks_summary, renaks_opd, budget_summary, budget_opd, attention_list, last_updated_at,
    pemda_sakip_matrix, opd_sakip_matrix, rpjmd_matrix,
    sakip_pemda, sakip_pemda_matrix,
}: Props) {
    const initialRawYear = Number(current_filters?.tahun_evaluasi ?? tahun_evaluasi);
    const resolvedInitialYear = initialRawYear >= 2000 && initialRawYear <= 2100
        ? initialRawYear
        : (filter_options?.years?.find(y => Number(y) >= 2000 && Number(y) <= 2100) ?? 2026);
    const [tahun, setTahun]               = useState(String(resolvedInitialYear));
    const [triwulan, setTriwulan]         = useState(current_filters?.triwulan ?? 'Semua');
    const [opdId, setOpdId]               = useState(current_filters?.organization_id ? String(current_filters.organization_id) : '');
    const [sasaranId, setSasaranId]       = useState(current_filters?.strategic_objective_id ? String(current_filters.strategic_objective_id) : '');
    const [statusKinerja, setStatusKinerja] = useState(current_filters?.status_kinerja ?? 'Semua');

    useEffect(() => {
        const y = Number(current_filters?.tahun_evaluasi ?? tahun_evaluasi);
        if (y >= 2000 && y <= 2100) {
            setTahun(String(y));
        }
    }, [current_filters?.tahun_evaluasi, tahun_evaluasi]);

    const calendarYearOptions = useMemo(() => {
        const rawList = (filter_options?.years ?? []).filter((y) => Number(y) >= 2000 && Number(y) <= 2100);
        if (rawList.length > 0) {
            return rawList;
        }
        const cur = Number(tahun);
        return cur >= 2000 && cur <= 2100 ? [cur] : [2026];
    }, [filter_options?.years, tahun]);

    const [isMatrixModalOpen, setIsMatrixModalOpen] = useState(false);
    const [isOpdModalOpen, setIsOpdModalOpen] = useState(false);
    const [isRpjmdModalOpen, setIsRpjmdModalOpen] = useState(false);
    const [rpjmdMatrixView, setRpjmdMatrixView] = useState<'eval_year' | 'trend_5yr'>('eval_year');
    const [rpjmdSearchQuery, setRpjmdSearchQuery] = useState('');
    const [rpjmdFilterSasaran, setRpjmdFilterSasaran] = useState<string>('');
    const [rpjmdFilterOpd, setRpjmdFilterOpd] = useState<string>('');
    const [rpjmdFilterStatus, setRpjmdFilterStatus] = useState<string>('Semua');
    const [rpjmdCopied, setRpjmdCopied] = useState(false);

    const rpjmdYears = useMemo(() => {
        return rpjmd_matrix?.years ?? filter_options?.years ?? [Number(tahun)];
    }, [rpjmd_matrix?.years, filter_options?.years, tahun]);

    const rpjmdSasaranOptions = useMemo(() => {
        if (!rpjmd_matrix?.rows) return [];
        const map = new Map<number, string>();
        rpjmd_matrix.rows.forEach(r => {
            if (r.strategic_objective_id && !map.has(r.strategic_objective_id)) {
                map.set(r.strategic_objective_id, `${r.number_code || r.no} ${r.sasaran}`);
            }
        });
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [rpjmd_matrix?.rows]);

    const filteredRpjmdRows = useMemo(() => {
        if (!rpjmd_matrix?.rows) return [];
        return rpjmd_matrix.rows.filter((row) => {
            if (rpjmdSearchQuery) {
                const q = rpjmdSearchQuery.toLowerCase();
                const match =
                    ((row as any).misi && (row as any).misi.toLowerCase().includes(q)) ||
                    row.tujuan.toLowerCase().includes(q) ||
                    row.sasaran.toLowerCase().includes(q) ||
                    row.indikator.toLowerCase().includes(q) ||
                    row.opd_pengampu.toLowerCase().includes(q) ||
                    (row.satuan && row.satuan.toLowerCase().includes(q));
                if (!match) return false;
            }
            if (rpjmdFilterSasaran && row.strategic_objective_id !== Number(rpjmdFilterSasaran)) {
                return false;
            }
            if (rpjmdFilterOpd && !row.opd_pengampu.toLowerCase().includes(rpjmdFilterOpd.toLowerCase())) {
                return false;
            }
            if (rpjmdFilterStatus && rpjmdFilterStatus !== 'Semua') {
                if (row.status !== rpjmdFilterStatus) {
                    return false;
                }
            }
            return true;
        });
    }, [rpjmd_matrix?.rows, rpjmdSearchQuery, rpjmdFilterSasaran, rpjmdFilterOpd, rpjmdFilterStatus]);

    // Calculate rowspans for Misi and Tujuan in RPJMD table
    const rpjmdRowSpans = useMemo(() => {
        const misiSpans: number[] = new Array(filteredRpjmdRows.length).fill(1);
        const tujuanSpans: number[] = new Array(filteredRpjmdRows.length).fill(1);

        let i = 0;
        while (i < filteredRpjmdRows.length) {
            const currentMisi = (filteredRpjmdRows[i] as any).misi || 'Misi RPJMD';
            let j = i + 1;
            while (j < filteredRpjmdRows.length && ((filteredRpjmdRows[j] as any).misi || 'Misi RPJMD') === currentMisi) {
                j++;
            }
            misiSpans[i] = j - i;
            for (let k = i + 1; k < j; k++) {
                misiSpans[k] = 0;
            }

            // Within this Misi group, calculate Tujuan spans
            let t = i;
            while (t < j) {
                const currentTujuan = filteredRpjmdRows[t].tujuan || 'Tujuan RPJMD';
                let u = t + 1;
                while (u < j && (filteredRpjmdRows[u].tujuan || 'Tujuan RPJMD') === currentTujuan) {
                    u++;
                }
                tujuanSpans[t] = u - t;
                for (let v = t + 1; v < u; v++) {
                    tujuanSpans[v] = 0;
                }
                t = u;
            }

            i = j;
        }

        return { misiSpans, tujuanSpans };
    }, [filteredRpjmdRows]);

    const handleCopyRpjmdToClipboard = useCallback(() => {
        if (!rpjmd_matrix) return;
        const rows = filteredRpjmdRows;
        let text = '';
        if (rpjmdMatrixView === 'eval_year') {
            text += `No\tMisi\tTujuan\tSasaran RPJMD\tIndikator\tSatuan\tTarget (${rpjmd_matrix.evaluation_year})\tRealisasi (${rpjmd_matrix.evaluation_year})\tCapaian (%)\tStatus\n`;
            rows.forEach((r: any, idx: number) => {
                text += `${idx + 1}\t${r.misi || '-'}\t${r.tujuan}\t${r.sasaran}\t${r.indikator}\t${r.satuan}\t${r.target ?? '-'}\t${r.realisasi ?? '-'}\t${r.capaian !== null ? r.capaian + '%' : '-'}\t${r.status}\n`;
            });
        } else {
            text += `No\tMisi\tTujuan\tSasaran RPJMD\tIndikator\tSatuan\t` +
                rpjmd_matrix.years.map(y => `Target ${y}\tRealisasi ${y}\tCapaian ${y} (%)`).join('\t') +
                `\tStatus (${rpjmd_matrix.evaluation_year})\n`;
            rows.forEach((r: any, idx: number) => {
                const yearCols = rpjmd_matrix.years.map(y => {
                    const yd = r.yearly[y];
                    return `${yd?.target ?? '-'}\t${yd?.realization ?? '-'}\t${yd?.achievement !== null && yd?.achievement !== undefined ? yd.achievement + '%' : '-'}`;
                }).join('\t');
                text += `${idx + 1}\t${r.misi || '-'}\t${r.tujuan}\t${r.sasaran}\t${r.indikator}\t${r.satuan}\t${yearCols}\t${r.status}\n`;
            });
        }
        navigator.clipboard.writeText(text).then(() => {
            setRpjmdCopied(true);
            setTimeout(() => setRpjmdCopied(false), 2000);
        });
    }, [rpjmd_matrix, filteredRpjmdRows, rpjmdMatrixView]);

    const handleDownloadRpjmdCsv = useCallback(() => {
        if (!rpjmd_matrix) return;
        const rows = filteredRpjmdRows;
        let csvContent = '\uFEFF';

        if (rpjmdMatrixView === 'eval_year') {
            const headers = ['No', 'Tujuan', 'Sasaran RPJMD', 'Indikator', 'Kode', 'Satuan', `Target (${rpjmd_matrix.evaluation_year})`, `Realisasi (${rpjmd_matrix.evaluation_year})`, 'Capaian (%)', 'Status'];
            csvContent += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',') + '\n';
            rows.forEach((r, idx) => {
                const line = [
                    idx + 1,
                    r.tujuan,
                    r.sasaran,
                    r.indikator,
                    r.kode,
                    r.satuan,
                    r.target !== null ? r.target : '',
                    r.realisasi !== null ? r.realisasi : '',
                    r.capaian !== null ? r.capaian : '',
                    r.status,
                ];
                csvContent += line.map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',') + '\n';
            });
        } else {
            const headers = ['No', 'Sasaran RPJMD', 'Indikator', 'Kode', 'Satuan'];
            rpjmd_matrix.years.forEach(y => {
                headers.push(`Target ${y}`, `Realisasi ${y}`, `Capaian ${y} (%)`);
            });
            headers.push(`Status (${rpjmd_matrix.evaluation_year})`);
            csvContent += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',') + '\n';

            rows.forEach((r) => {
                const line: (string | number)[] = [r.no, r.sasaran, r.indikator, r.kode, r.satuan];
                rpjmd_matrix.years.forEach(y => {
                    const yd = r.yearly[y];
                    line.push(
                        yd?.target !== null && yd?.target !== undefined ? yd.target : '',
                        yd?.realization !== null && yd?.realization !== undefined ? yd.realization : '',
                        yd?.achievement !== null && yd?.achievement !== undefined ? yd.achievement : ''
                    );
                });
                line.push(r.status);
                csvContent += line.map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',') + '\n';
            });
        }

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `matriks-rpjmd-${rpjmd_matrix.evaluation_year}-${rpjmdMatrixView}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, [rpjmd_matrix, filteredRpjmdRows, rpjmdMatrixView]);

    const getExportUrl = useCallback((type: string = 'dashboard', format: string = 'pdf') => {
        const params = new URLSearchParams();
        params.set('type', type);
        params.set('format', format);
        const numT = Number(tahun);
        const safeTahun = numT >= 2000 && numT <= 2100 ? numT : (calendarYearOptions[0] ?? 2026);
        params.set('tahun_evaluasi', String(safeTahun));
        if (triwulan && triwulan !== 'Semua') params.set('triwulan', String(triwulan));
        if (opdId) params.set('organization_id', String(opdId));
        if (sasaranId) params.set('strategic_objective_id', String(sasaranId));
        if (statusKinerja && statusKinerja !== 'Semua') params.set('status_kinerja', String(statusKinerja));
        return `/dashboard/export?${params.toString()}`;
    }, [tahun, triwulan, opdId, sasaranId, statusKinerja, calendarYearOptions]);

    const [pkoView, setPkoView] = useState<'top' | 'bottom'>('top');
    const [attTab, setAttTab]   = useState<string>('Semua');

    const displayedPko = useMemo(() => {
        if (pkoView === 'bottom') {
            return [...pko_opd].sort((a, b) => (a.nilai_pko ?? 0) - (b.nilai_pko ?? 0)).slice(0, 10);
        }
        return [...pko_opd].sort((a, b) => (b.nilai_pko ?? 0) - (a.nilai_pko ?? 0)).slice(0, 10);
    }, [pko_opd, pkoView]);

    const handleApply = useCallback(() => {
        const numT = Number(tahun);
        const safeTahun = numT >= 2000 && numT <= 2100 ? numT : (calendarYearOptions[0] ?? 2026);
        router.get('/dashboard', {
            tahun_evaluasi: safeTahun,
            triwulan: triwulan !== 'Semua' ? triwulan : undefined,
            organization_id: opdId || undefined,
            strategic_objective_id: sasaranId || undefined,
            status_kinerja: statusKinerja !== 'Semua' ? statusKinerja : undefined,
        }, { preserveState: true, replace: true });
    }, [tahun, triwulan, opdId, sasaranId, statusKinerja, calendarYearOptions]);

    const filteredAtt = attTab === 'Semua'
        ? attention_list
        : attention_list.filter(a => a.kategori === attTab);

    // Today formatted like gambar
    const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <AuthenticatedLayout header="">
            <Head title="Dashboard Eksekutif" />

            {/*
             * ─────────────────────────────────────────────────────────────────
             *  HEADER — Responsive layout (Mobile: stacked + badge, Desktop: 3 cols)
             * ─────────────────────────────────────────────────────────────────
             */}
            <div className="bg-primary text-primary-foreground rounded-lg mb-3 p-3.5 sm:p-4 md:px-5 md:py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 shadow transition-colors duration-200">
                {/* Mobile Top Row / Desktop Left Section */}
                <div className="flex items-center justify-between md:justify-start gap-3 w-full md:w-auto flex-shrink-0">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/20 p-1 flex items-center justify-center shrink-0 shadow-xs backdrop-blur-xs">
                            <ApplicationLogo className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <p className="text-[10px] sm:text-xs font-semibold text-primary-foreground/90 leading-none">Biro Organisasi Sekretariat Daerah</p>
                            <p className="text-xs sm:text-sm font-bold text-primary-foreground leading-tight">Provinsi Papua Barat</p>
                            <p className="text-[9px] sm:text-[10px] text-primary-foreground/75 leading-none">Sistem Monitoring Kinerja</p>
                        </div>
                    </div>
                    {/* User badge on mobile only */}
                    <div className="md:hidden flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-full text-xs">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/20 text-primary-foreground">
                            <UserIcon className="w-3.5 h-3.5" />
                        </span>
                        <span className="font-semibold text-primary-foreground text-xs truncate max-w-[110px]">{auth.user?.name ?? 'Pimpinan'}</span>
                    </div>
                </div>

                {/* Judul & Tanggal on Mobile */}
                <div className="w-full md:flex-1 min-w-0 border-t border-white/15 pt-2.5 md:border-t-0 md:pt-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-lg sm:text-xl font-extrabold leading-tight text-primary-foreground">Dashboard Eksekutif</h1>
                        <span className="inline-flex items-center gap-1 bg-white/20 text-primary-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full border border-white/25 backdrop-blur-xs">
                            📊 Grafik & Visualisasi Interaktif
                        </span>
                    </div>
                    <p className="text-primary-foreground/80 text-[11px] sm:text-xs leading-tight mt-0.5">Monitoring Kinerja dan Akuntabilitas Biro Organisasi Sekretariat Daerah Provinsi Papua Barat</p>
                    <p className="md:hidden text-[10px] text-primary-foreground/70 mt-1 font-medium">{today}</p>
                </div>

                {/* Tanggal + User on Desktop */}
                <div className="hidden md:flex flex-shrink-0 text-right text-xs text-primary-foreground/80 flex-col items-end gap-0.5">
                    <span className="text-primary-foreground font-semibold text-sm">{today}</span>
                    <span className="flex items-center gap-1.5">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/20 text-primary-foreground">
                            <UserIcon className="w-3.5 h-3.5" />
                        </span>
                        <span className="font-semibold text-primary-foreground">{auth.user?.name ?? 'Pimpinan'}</span>
                    </span>
                </div>
            </div>

            {/*
             * ─────────────────────────────────────────────────────────────────
             *  FILTER BAR — Responsive Grid Dinamis
             * ─────────────────────────────────────────────────────────────────
             */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 mb-3 w-full">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 items-end w-full">
                    <div className="flex flex-col gap-1 w-full min-w-0">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide truncate">Tahun Evaluasi</label>
                        <Select2
                            value={tahun}
                            onChange={(val) => setTahun(val)}
                            options={calendarYearOptions.map((y) => ({
                                value: String(y),
                                label: String(y),
                            }))}
                            placeholder="Pilih Tahun"
                        />
                    </div>

                    <div className="flex flex-col gap-1 w-full min-w-0">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide truncate">Triwulan</label>
                        <Select2
                            value={triwulan}
                            onChange={(val) => setTriwulan(val)}
                            options={(filter_options?.triwulan ?? ['Semua', 'TW I', 'TW II', 'TW III', 'TW IV']).map((t) => ({
                                value: t,
                                label: t,
                            }))}
                            placeholder="Pilih Triwulan"
                        />
                    </div>

                    <div className="flex flex-col gap-1 w-full min-w-0">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide truncate">Perangkat Daerah</label>
                        <Select2
                            value={opdId}
                            onChange={(val) => setOpdId(val)}
                            options={[
                                { value: '', label: 'Semua OPD' },
                                ...(filter_options?.organizations ?? []).map((o) => ({
                                    value: String(o.id),
                                    label: o.name,
                                })),
                            ]}
                            placeholder="Semua OPD"
                            searchPlaceholder="Cari OPD..."
                        />
                    </div>

                    <div className="flex flex-col gap-1 w-full min-w-0">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide truncate">Sasaran RPJMD</label>
                        <Select2
                            value={sasaranId}
                            onChange={(val) => setSasaranId(val)}
                            options={[
                                { value: '', label: 'Semua' },
                                ...(filter_options?.sasaran ?? []).map((s) => ({
                                    value: String(s.id),
                                    label: s.name,
                                })),
                            ]}
                            placeholder="Semua Sasaran"
                            searchPlaceholder="Cari Sasaran..."
                        />
                    </div>

                    <div className="flex flex-col gap-1 w-full min-w-0">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide truncate">Status Kinerja</label>
                        <Select2
                            value={statusKinerja}
                            onChange={(val) => setStatusKinerja(val)}
                            options={(filter_options?.status ?? ['Semua', 'Tercapai', 'Perlu Perhatian', 'Kritis']).map((s) => ({
                                value: s,
                                label: s,
                            }))}
                            placeholder="Semua Status"
                        />
                    </div>

                    <div className="flex items-center gap-1.5 w-full min-w-0">
                        <button
                            type="button"
                            onClick={handleApply}
                            className="flex-1 bg-primary hover:bg-primary/90 active:bg-primary/95 text-primary-foreground text-xs font-bold h-9 sm:h-8 rounded transition shadow-xs flex items-center justify-center cursor-pointer"
                        >
                            Terapkan
                        </button>
                        <a
                            href={getExportUrl('dashboard', 'pdf')}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            title="Download Laporan Eksekutif Capaian Kinerja (PDF Langsung)"
                            className="inline-flex items-center justify-center gap-1.5 px-3 h-9 sm:h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded transition shadow-xs cursor-pointer whitespace-nowrap"
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download PDF</span>
                        </a>
                    </div>
                </div>
            </div>

            {/*
             * ─────────────────────────────────────────────────────────────────
             *  SHORTCUT KE DASHBOARD ANALITIK (Data Real Tabular & Unduh)
             * ─────────────────────────────────────────────────────────────────
             */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 p-3 mb-3 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50/70 border border-emerald-200 rounded-lg text-xs text-emerald-900 shadow-2xs">
                <div className="flex items-center gap-2.5">
                    <span className="p-1.5 rounded-md bg-emerald-600 text-white shadow-xs">
                        <TableProperties className="w-4 h-4" />
                    </span>
                    <div>
                        <p className="font-bold text-emerald-950">Membutuhkan Data Real Mentah atau Download PDF?</p>
                        <p className="text-[11px] text-emerald-800">
                            Akses <strong>Dashboard Analitik</strong> untuk melihat data tabular 5 submodul (Tren, Deviasi, Komparasi OPD, Analisis IKU & Heatmap), lengkap dengan tombol <strong>Salin ke Excel (Ctrl+V)</strong> dan <strong>Download PDF</strong>.
                        </p>
                    </div>
                </div>
                <Link
                    href={route('analytics.index')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition flex-shrink-0"
                >
                    <span>Buka Data Real Analitik</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                </Link>
            </div>

            {/*
             * ─────────────────────────────────────────────────────────────────
             *  GRID KPI — 9 KARTU, DIBAGI 2 BARIS (5 ATAS / 4 BAWAH)
             * ─────────────────────────────────────────────────────────────────
             */}
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-3">

                {/* 1. Kelengkapan SAKIP Pemda (Klik Detail Matriks 13 Dokumen) */}
                <div
                    onClick={() => setIsMatrixModalOpen(true)}
                    className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 flex flex-col justify-between gap-1.5 cursor-pointer hover:border-blue-400 hover:shadow-md transition group select-none relative"
                    title="Klik untuk melihat detail matriks 13 dokumen SAKIP Pemda"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                            <span className="text-lg sm:text-xl">📄</span>
                            <p className="text-xs sm:text-[10px] lg:text-xs font-semibold text-gray-500 uppercase leading-tight line-clamp-2">Kelengkapan SAKIP Pemda</p>
                        </div>
                        <span className="text-xs sm:text-[10px] text-blue-600 font-semibold opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition flex items-center">
                            Detail ↗
                        </span>
                    </div>
                    <div>
                        <p className="text-xl sm:text-2xl font-extrabold text-gray-800">{kpi.kelengkapan_pemda.pct.toFixed(2)}%</p>
                        <div className="mt-1 flex items-center justify-between">
                            <StatusBadge status={kpi.kelengkapan_pemda.status} />
                            <span className="text-xs sm:text-[10px] text-gray-400 font-medium">
                                {kpi.kelengkapan_pemda.tersedia}/{kpi.kelengkapan_pemda.total} Dok
                            </span>
                        </div>
                    </div>
                    <div className="text-xs sm:text-[10px] text-blue-600 font-medium flex items-center gap-1 group-hover:underline pt-0.5 border-t border-gray-50">
                        <TableProperties className="w-3 h-3" />
                        <span>Klik Detail Matriks</span>
                    </div>
                </div>

                {/* 2. OPD SAKIP Lengkap (Klik Detail Matriks 12 Dokumen OPD) */}
                <div
                    onClick={() => setIsOpdModalOpen(true)}
                    className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 flex flex-col justify-between gap-1.5 cursor-pointer hover:border-blue-400 hover:shadow-md transition group select-none relative"
                    title="Klik untuk melihat detail matriks 12 dokumen SAKIP seluruh Perangkat Daerah"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                            <span className="text-lg sm:text-xl">🏛️</span>
                            <p className="text-xs sm:text-[10px] lg:text-xs font-semibold text-gray-500 uppercase leading-tight line-clamp-2">OPD SAKIP Lengkap</p>
                        </div>
                        <span className="text-xs sm:text-[10px] text-blue-600 font-semibold opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition flex items-center">
                            Detail ↗
                        </span>
                    </div>
                    <div>
                        <p className="text-xl sm:text-2xl font-extrabold text-gray-800 leading-tight">
                            {kpi.opd_sakip_lengkap.lengkap} <span className="text-xs sm:text-sm font-normal text-gray-500">dari {kpi.opd_sakip_lengkap.total} OPD</span>
                        </p>
                        <div className="mt-1">
                            <div className="flex justify-between text-xs sm:text-[10px] text-gray-500 mb-0.5">
                                <span className="font-bold text-blue-700">{kpi.opd_sakip_lengkap.pct.toFixed(1)}% Lengkap</span>
                                <span>{opd_sakip_matrix?.missing_docs ?? 0} Dok Kurang</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-500" style={{ width: `${kpi.opd_sakip_lengkap.pct}%` }} />
                            </div>
                        </div>
                    </div>
                    <div className="text-xs sm:text-[10px] text-blue-600 font-medium flex items-center gap-1 group-hover:underline pt-0.5 border-t border-gray-50">
                        <TableProperties className="w-3 h-3" />
                        <span>Klik Detail Matriks</span>
                    </div>
                </div>

                {/* 3. Rata-rata Capaian RPJMD (Klik Detail Matriks 35 Indikator & Tren 5 Tahun) */}
                <div
                    onClick={() => { setRpjmdMatrixView('eval_year'); setIsRpjmdModalOpen(true); }}
                    className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 flex flex-col justify-between gap-1.5 cursor-pointer hover:border-blue-400 hover:shadow-md transition group select-none relative"
                    title="Klik untuk melihat detail matriks 35 indikator RPJMD & tren 5 tahun"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                            <span className="text-lg sm:text-xl">🎯</span>
                            <p className="text-xs sm:text-[10px] lg:text-xs font-semibold text-gray-500 uppercase leading-tight line-clamp-2">Rata-rata Capaian RPJMD</p>
                        </div>
                        <span className="text-xs sm:text-[10px] text-blue-600 font-semibold opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition flex items-center">
                            Detail ↗
                        </span>
                    </div>
                    <div>
                        <p className="text-xl sm:text-2xl font-extrabold text-gray-800">{kpi.rata_capaian_rpjmd.pct.toFixed(2)}%</p>
                        <div className="mt-1 flex items-center justify-between">
                            <StatusBadge status={kpi.rata_capaian_rpjmd.status} />
                            <span className="text-xs sm:text-[10px] text-gray-400 font-medium">
                                {rpjmd_matrix?.summary.tercapai ?? 0}/{rpjmd_matrix?.summary.total_indikator ?? 0} Tercapai
                            </span>
                        </div>
                    </div>
                    <div className="text-xs sm:text-[10px] text-blue-600 font-medium flex items-center gap-1 group-hover:underline pt-0.5 border-t border-gray-50">
                        <TableProperties className="w-3 h-3" />
                        <span>Klik Detail Matriks</span>
                    </div>
                </div>

                {/* 4. Capaian IKU */}
                <Link
                    href={route('planning.iku.index')}
                    className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 flex flex-col justify-between hover:border-blue-400 hover:shadow-md transition group select-none relative"
                    title="Capaian Indikator Kinerja Utama. Klik untuk rincian."
                >
                    <div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                                <span className="text-lg sm:text-xl">👤</span>
                                <p className="text-xs sm:text-[10px] lg:text-xs font-semibold text-gray-500 uppercase leading-tight line-clamp-2">Capaian IKU Pemda</p>
                            </div>
                            <span className="text-xs sm:text-[10px] text-blue-600 font-semibold opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition flex items-center">
                                Detail ↗
                            </span>
                        </div>
                        <div className="mt-1">
                            <p className="text-xl sm:text-2xl font-extrabold text-gray-800">{kpi.capaian_iku_pemda.pct.toFixed(2)}%</p>
                            <div className="mt-1 flex items-center justify-between">
                                <StatusBadge status={kpi.capaian_iku_pemda.status} />
                                <span className="text-xs sm:text-[10px] text-gray-400 font-medium">
                                    {iku_status.tercapai}/{iku_status.total} Tercapai
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="text-xs sm:text-[10px] text-blue-600 font-medium flex items-center gap-1 group-hover:underline pt-0.5 border-t border-gray-50">
                        <TableProperties className="w-3 h-3" />
                        <span>Klik Detail Capaian IKU</span>
                    </div>
                </Link>

                {/* 5. Rata-rata Capaian Kinerja OPD */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 flex flex-col justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className="text-lg sm:text-xl">📊</span>
                        <p className="text-xs sm:text-[10px] lg:text-xs font-semibold text-gray-500 uppercase leading-tight line-clamp-2">Rata-rata Capaian OPD</p>
                    </div>
                    <div>
                        <p className="text-xl sm:text-2xl font-extrabold text-gray-800">{kpi.rata_capaian_opd.pct.toFixed(2)}%</p>
                        <div className="mt-1 flex items-center justify-between">
                            <StatusBadge status={kpi.rata_capaian_opd.status} />
                            <span className="text-xs sm:text-[10px] text-gray-400 font-medium">Seluruh OPD</span>
                        </div>
                    </div>
                </div>

                {/* 6. Nilai SAKIP Pemda (Modul Evaluasi Pemda - PermenPANRB 88/2021) */}
                <Link
                    href={`${route('analytics.index')}?tab=sakip_pemda`}
                    className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 flex flex-col justify-between gap-1.5 hover:border-blue-400 hover:shadow-md transition group select-none relative"
                    title="Nilai Akuntabilitas Kinerja Instansi Pemerintah Tingkat Pemda (Evaluasi KemenPANRB). Klik untuk rincian."
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                            <span className="text-lg sm:text-xl">🏛️</span>
                            <p className="text-xs sm:text-[10px] lg:text-xs font-semibold text-gray-500 uppercase leading-tight line-clamp-2">Nilai SAKIP Pemda</p>
                        </div>
                        <span className="text-xs sm:text-[10px] text-blue-600 font-semibold opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition flex items-center">
                            Detail ↗
                        </span>
                    </div>
                    <div>
                        <p className="text-xl sm:text-2xl font-extrabold text-gray-800">
                            {(kpi.nilai_sakip_pemda?.nilai ?? 0.0).toFixed(2)}
                        </p>
                        <div className="mt-1 flex items-center justify-between">
                            <span className={`inline-flex self-start px-2 py-0.5 rounded text-xs font-bold ${predikatCls(kpi.nilai_sakip_pemda?.predikat ?? 'BELUM DINILAI')}`}>
                                {kpi.nilai_sakip_pemda?.predikat ?? 'BELUM DINILAI'}
                            </span>
                            <span className="text-xs sm:text-[10px] text-gray-400 font-medium">Pemprov PB</span>
                        </div>
                    </div>
                </Link>

                {/* 7. Rata-rata Nilai SAKIP OPD */}
                <Link
                    href={route('evaluations.index', { year: tahun })}
                    className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 flex flex-col justify-between gap-1.5 hover:border-blue-400 hover:shadow-md transition group select-none relative cursor-pointer"
                    title="Klik untuk melihat rincian evaluasi 4 komponen SAKIP seluruh OPD di modul Evaluasi Kinerja"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                            <span className="text-lg sm:text-xl">🏅</span>
                            <p className="text-xs sm:text-[10px] lg:text-xs font-semibold text-gray-500 uppercase leading-tight line-clamp-2">Rata-rata Nilai SAKIP OPD</p>
                        </div>
                        <span className="text-xs sm:text-[10px] text-blue-600 font-semibold opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition flex items-center">
                            Detail ↗
                        </span>
                    </div>
                    <div>
                        <p className="text-xl sm:text-2xl font-extrabold text-gray-800">{kpi.rata_nilai_sakip_opd.nilai.toFixed(2)}</p>
                        <div className="mt-1 flex items-center justify-between">
                            <span className={`inline-flex self-start px-2 py-0.5 rounded text-xs font-bold ${predikatCls(kpi.rata_nilai_sakip_opd.predikat)}`}>
                                {kpi.rata_nilai_sakip_opd.predikat}
                            </span>
                            <span className="text-xs sm:text-[10px] text-gray-400 font-medium">Rata-rata OPD</span>
                        </div>
                    </div>
                </Link>

                {/* 8. Nilai PKO Pemda */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 flex flex-col justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className="text-lg sm:text-xl">🏆</span>
                        <p className="text-xs sm:text-[10px] lg:text-xs font-semibold text-gray-500 uppercase leading-tight line-clamp-2">Nilai PKO Pemda</p>
                    </div>
                    <div>
                        <p className="text-xl sm:text-2xl font-extrabold text-gray-800">{kpi.nilai_pko_pemda.nilai.toFixed(2)}</p>
                        <div className="mt-1 flex items-center justify-between">
                            <span className={`inline-flex self-start px-2 py-0.5 rounded text-xs font-bold ${predikatCls(kpi.nilai_pko_pemda.predikat)}`}>
                                {kpi.nilai_pko_pemda.predikat}
                            </span>
                            <span className="text-xs sm:text-[10px] text-gray-400 font-medium">Pemprov PB</span>
                        </div>
                    </div>
                </div>

                {/* 9. Rata-rata Nilai PKO OPD (Σ Nilai PKO OPD ÷ Jumlah OPD) */}
                <div
                    className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 flex flex-col justify-between gap-1.5"
                    title={`Rata-rata Nilai PKO OPD = Σ Nilai PKO seluruh OPD ÷ Jumlah OPD = ${(kpi.rata_nilai_pko_opd?.nilai ?? kpi.rata_rata_pko_pemda?.nilai ?? 0).toFixed(2)}`}
                >
                    <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className="text-lg sm:text-xl">📈</span>
                        <p className="text-xs sm:text-[10px] lg:text-xs font-semibold text-gray-500 uppercase leading-tight line-clamp-2">Rata-rata Nilai PKO OPD</p>
                    </div>
                    <div>
                        <p className="text-xl sm:text-2xl font-extrabold text-gray-800">{(kpi.rata_nilai_pko_opd?.nilai ?? kpi.rata_rata_pko_pemda?.nilai ?? 0).toFixed(2)}</p>
                        <div className="mt-1 flex items-center justify-between">
                            <span className={`inline-flex self-start px-2 py-0.5 rounded text-xs font-bold ${predikatCls(kpi.rata_nilai_pko_opd?.predikat ?? kpi.rata_rata_pko_pemda?.predikat ?? 'BELUM DINILAI')}`}>
                                {kpi.rata_nilai_pko_opd?.predikat ?? kpi.rata_rata_pko_pemda?.predikat ?? 'BELUM DINILAI'}
                            </span>
                            <span className="text-xs sm:text-[10px] text-gray-400 font-medium">Σ PKO OPD ÷ {kpi.rata_nilai_pko_opd?.total_opd ?? kpi.rata_rata_pko_pemda?.total_opd ?? 0}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/*
             * ─────────────────────────────────────────────────────────────────
             *  ROW 2 — 3 DONUT CHARTS
             * ─────────────────────────────────────────────────────────────────
             */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mb-3">
                <Card
                    title={`Status Capaian RPJMD (${rpjmd_status.total} Indikator)`}
                    action={
                        <button
                            type="button"
                            onClick={() => { setRpjmdMatrixView('eval_year'); setIsRpjmdModalOpen(true); }}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:underline cursor-pointer"
                        >
                            <span>Lihat Detail Matriks</span>
                            <ChevronRight className="w-3 h-3" />
                        </button>
                    }
                >
                    <div onClick={() => { setRpjmdMatrixView('eval_year'); setIsRpjmdModalOpen(true); }} className="cursor-pointer" title="Klik untuk membuka detail matriks RPJMD">
                        <DonutChart data={rpjmd_status} label="Indikator" />
                    </div>
                </Card>
                <Card
                    title={`Status IKU (${iku_status.total} IKU)`}
                    action="Lihat Detail"
                    actionHref={route('planning.iku.index')}
                >
                    <Link
                        href={route('planning.iku.index')}
                        className="block cursor-pointer"
                        title="Klik untuk membuka detail IKU"
                    >
                        <DonutChart data={iku_status} label="IKU" />
                    </Link>
                </Card>
                <Card title={`Status Kinerja OPD (${opd_status.total} OPD)`} action="Lihat Detail" actionHref={`${route('analytics.index')}?tab=opd`}>
                    <DonutChart data={opd_status} label="OPD" />
                </Card>
            </div>

            {/*
             * ─────────────────────────────────────────────────────────────────
             *  ROW 3 — 3 TREND CHARTS
             * ─────────────────────────────────────────────────────────────────
             */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mb-3">
                <Card
                    title={`Tren Capaian RPJMD (${rpjmd_matrix?.years ? `${rpjmd_matrix.years[0]}–${rpjmd_matrix.years[rpjmd_matrix.years.length - 1]}` : '5 Tahunan'})`}
                    action={
                        <button
                            type="button"
                            onClick={() => { setRpjmdMatrixView('trend_5yr'); setIsRpjmdModalOpen(true); }}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:underline cursor-pointer"
                        >
                            <span>Lihat Tren 5 Tahun</span>
                            <ChevronRight className="w-3 h-3" />
                        </button>
                    }
                >
                    <div onClick={() => { setRpjmdMatrixView('trend_5yr'); setIsRpjmdModalOpen(true); }} className="cursor-pointer" title="Klik untuk melihat tabel tren 5 tahun RPJMD">
                        <TrendChart data={rpjmd_trend} />
                    </div>
                </Card>
                <Card
                    title="Tren IKU"
                    action="Lihat Detail"
                    actionHref={route('planning.iku.index')}
                >
                    <Link
                        href={route('planning.iku.index')}
                        className="block cursor-pointer"
                        title="Klik untuk membuka detail IKU"
                    >
                        <TrendChart data={iku_trend} />
                    </Link>
                </Card>
                <Card title="Tren Nilai PKO Pemerintah Daerah" action="Lihat Detail" actionHref={`${route('analytics.index')}?tab=pko`}>
                    <PkoTrendChart data={pko_trend} />
                </Card>
            </div>

            {/*
             * ─────────────────────────────────────────────────────────────────
             *  ROW 4 — Top 10 Kinerja OPD | Capaian PKO Perangkat Daerah
             * ─────────────────────────────────────────────────────────────────
             */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 mb-3">

                {/* Top 10 OPD — col-span-7 agar leluasa dan tidak terpotong */}
                <Card title={`Top 10 Capaian Kinerja OPD Tahun ${tahun_evaluasi}`} className="lg:col-span-7" noPad>
                    <div className="overflow-x-auto w-full">
                        <table className="w-full text-xs min-w-[480px]">
                            <thead>
                                <tr className="bg-blue-50 text-gray-600">
                                    <th className="px-2.5 py-2 text-center font-semibold w-10">Rank</th>
                                    <th className="px-2.5 py-2 text-left font-semibold">Perangkat Daerah</th>
                                    <th className="px-2 py-2 text-center font-semibold hidden sm:table-cell w-12">Ind.</th>
                                    <th className="px-2.5 py-2 text-right font-semibold w-16">Capaian</th>
                                    <th className="px-2 py-2 text-center font-semibold text-amber-600 hidden md:table-cell w-14">Perhatian</th>
                                    <th className="px-2 py-2 text-center font-semibold text-red-600 hidden md:table-cell w-14">Kritis</th>
                                    <th className="px-2.5 py-2 text-center font-semibold w-24">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {opd_ranking.slice(0, 10).map((opd) => (
                                    <tr key={opd.kode} className="hover:bg-blue-50/40 transition">
                                        <td className="px-2.5 py-2 font-bold text-gray-700 text-center">{opd.rank}</td>
                                        <td className="px-2.5 py-2 max-w-[200px] sm:max-w-[260px] lg:max-w-[300px] xl:max-w-[360px] truncate font-medium" title={opd.nama}>
                                            {/* GAP 6: Link drilldown ke halaman detail OPD */}
                                            <Link
                                                href={route('dashboard.drilldown', { organization: opd.id })}
                                                className="text-blue-600 hover:text-blue-800 hover:underline block truncate"
                                                title={`Lihat detail ${opd.nama}`}
                                            >
                                                {opd.nama}
                                            </Link>
                                        </td>
                                        <td className="px-2 py-2 text-center text-gray-600 hidden sm:table-cell">{opd.jumlah_indikator}</td>
                                        <td className="px-2.5 py-2 text-right font-semibold text-gray-800">{opd.rata_capaian.toFixed(2)}%</td>
                                        <td className="px-2 py-2 text-center hidden md:table-cell">
                                            {opd.perlu_perhatian > 0
                                                ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700 font-bold text-[10px]">{opd.perlu_perhatian}</span>
                                                : <span className="text-gray-300">—</span>}
                                        </td>
                                        <td className="px-2 py-2 text-center hidden md:table-cell">
                                            {opd.kritis > 0
                                                ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-100 text-rose-700 font-bold text-[10px]">{opd.kritis}</span>
                                                : <span className="text-gray-300">—</span>}
                                        </td>
                                        <td className="px-2.5 py-2 text-center"><StatusBadge status={opd.status} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Status Kinerja Legend di bawah tabel Top 10 OPD */}
                    <div className="px-3 py-2 bg-slate-50 border-t border-gray-100 text-[11px] text-gray-600 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <span className="font-bold text-gray-800">💡 Status Kinerja:</span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Tercapai: Capaian &ge; 100%
                        </span>
                        <span className="text-gray-300">|</span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                            Perlu Perhatian: 50% &le; Capaian &lt; 100%
                        </span>
                        <span className="text-gray-300">|</span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-300">
                            Kritis: Capaian &lt; 50%
                        </span>
                        <span className="text-gray-300">|</span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-300">
                            Tidak Dinilai: Target = 0 &amp; Realisasi = 0
                        </span>
                    </div>
                </Card>

                {/* PKO Perangkat Daerah — col-span-5 */}
                <Card
                    title="Capaian PKO Perangkat Daerah"
                    extraHeader={
                        <div className="flex gap-1">
                            <button
                                type="button"
                                onClick={() => setPkoView('top')}
                                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition cursor-pointer ${
                                    pkoView === 'top'
                                        ? 'bg-primary text-primary-foreground shadow-xs'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                Top 10
                            </button>
                            <button
                                type="button"
                                onClick={() => setPkoView('bottom')}
                                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition cursor-pointer ${
                                    pkoView === 'bottom'
                                        ? 'bg-primary text-primary-foreground shadow-xs'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                10 Terendah
                            </button>
                        </div>
                    }
                    action={<span className="hidden sm:inline">Lihat Detail</span>}
                    actionHref={`${route('analytics.index')}?tab=pko`}
                    className="lg:col-span-5"
                    noPad
                >
                    <div className="overflow-x-auto w-full">
                        <table className="w-full text-xs min-w-[320px]">
                            <thead>
                                <tr className="bg-blue-50 text-gray-600">
                                    <th className="px-2.5 py-2 text-center font-semibold w-10">Rank</th>
                                    <th className="px-2.5 py-2 text-left font-semibold">Perangkat Daerah</th>
                                    <th className="px-2.5 py-2 text-right font-semibold w-20">Nilai PKO</th>
                                    <th className="px-2.5 py-2 text-center font-semibold w-24">Predikat</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {displayedPko.map((item) => (
                                    <tr key={item.kode} className="hover:bg-blue-50/40 transition">
                                        <td className="px-2.5 py-2 font-bold text-gray-700 text-center">{item.rank}</td>
                                        <td className="px-2.5 py-2 text-gray-700 max-w-[160px] sm:max-w-[200px] lg:max-w-[240px] truncate font-medium" title={item.nama}>{item.nama}</td>
                                        <td className="px-2.5 py-2 text-right font-semibold text-gray-800">{(item.nilai_pko ?? 0).toFixed(2)}</td>
                                        <td className="px-2.5 py-2 text-center">
                                            <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold ${predikatCls(item.predikat)}`}>{item.predikat}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/*
             * ─────────────────────────────────────────────────────────────────
             *  ROW 5 — Capaian Rencana Aksi Triwulan (Fisik & Anggaran)
             * ─────────────────────────────────────────────────────────────────
             */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 mb-3">

                {/* 1. Capaian Rencana Aksi Triwulan (Fisik) */}
                <Card
                    title={`Capaian Rencana Aksi Triwulan (Fisik) — Tahun ${renaks_summary.tahun} - ${renaks_summary.triwulan}`}
                    action="Lihat Detail"
                    actionHref={`${route('analytics.index')}?tab=action_plans&year=${tahun}${triwulan && triwulan !== 'Semua' ? `&triwulan=${triwulan}` : ''}`}
                    noPad
                >
                    {/* Summary badges — 2 cols on mobile, 4 cols on sm+ */}
                    <div className="px-3 sm:px-4 pt-3 pb-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                            { icon: '✅', label: 'On Track',       n: renaks_summary.on_track,        color: 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800/60 dark:text-emerald-300' },
                            { icon: '⚠️', label: 'Perlu Perhatian', n: renaks_summary.perlu_perhatian, color: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800/60 dark:text-amber-300' },
                            { icon: '⏰', label: 'Terlambat',       n: renaks_summary.terlambat,       color: 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950/40 dark:border-orange-800/60 dark:text-orange-300' },
                            { icon: '❌', label: 'Kritis',          n: renaks_summary.kritis,          color: 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800/60 dark:text-rose-300' },
                        ].map((item) => (
                            <div key={item.label} className={`rounded-lg border p-2 flex flex-col items-center gap-0.5 ${item.color}`}>
                                <span className="text-lg leading-tight">{item.icon}</span>
                                <span className="text-lg font-extrabold leading-tight">{item.n} OPD</span>
                                <span className="text-[10px] font-medium text-center leading-tight">{item.label}</span>
                            </div>
                        ))}
                    </div>
                    {/* Table with horizontal scroll */}
                    <div className="overflow-x-auto w-full">
                        <table className="w-full text-xs border-t border-gray-100 min-w-[420px]">
                            <thead>
                                <tr className="bg-gray-50 text-gray-600">
                                    <th className="px-2.5 py-2 text-left font-semibold w-10">No</th>
                                    <th className="px-2.5 py-2 text-left font-semibold">Perangkat Daerah</th>
                                    <th className="px-2 py-2 text-right font-semibold">Target {renaks_summary.triwulan}</th>
                                    <th className="px-2 py-2 text-right font-semibold">Realisasi {renaks_summary.triwulan}</th>
                                    <th className="px-2.5 py-2 text-right font-semibold">Capaian</th>
                                    <th className="px-2.5 py-2 text-center font-semibold">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {(renaks_opd ?? []).map((opd, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="px-2.5 py-1.5 text-gray-500">{i + 1}</td>
                                        <td className="px-2.5 py-1.5 text-gray-700 font-medium max-w-[150px] truncate" title={opd.nama}>{opd.nama}</td>
                                        <td className="px-2 py-1.5 text-right text-gray-600">
                                            {opd.target_tw !== null && opd.target_tw !== undefined ? opd.target_tw.toFixed(2) : '-'}
                                        </td>
                                        <td className="px-2 py-1.5 text-right text-gray-600">
                                            {opd.realisasi_tw !== null && opd.realisasi_tw !== undefined ? opd.realisasi_tw.toFixed(2) : '-'}
                                        </td>
                                        <td className="px-2.5 py-1.5 text-right font-semibold text-gray-800">
                                            {opd.capaian !== null && opd.capaian !== undefined ? `${opd.capaian.toFixed(2)}%` : '-'}
                                        </td>
                                        <td className="px-2.5 py-1.5 text-center"><StatusBadge status={opd.status} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Status Kinerja Legend di bawah tabel Rencana Aksi TW */}
                    <div className="px-3 py-2 bg-slate-50 border-t border-gray-100 text-[10px] text-gray-600 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-bold text-gray-800">💡 Kriteria:</span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Tercapai &ge; 100%
                        </span>
                        <span className="text-gray-300">|</span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                            Perlu Perhatian 50% &le; C &lt; 100%
                        </span>
                        <span className="text-gray-300">|</span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded font-semibold bg-rose-100 text-rose-800 border border-rose-300">
                            Kritis &lt; 50%
                        </span>
                    </div>
                </Card>

                {/* 2. Capaian Rencana Aksi Anggaran Triwulan (Keuangan) */}
                <Card
                    title={`Capaian Rencana Aksi Anggaran — Tahun ${budget_summary?.tahun ?? renaks_summary.tahun} - ${budget_summary?.triwulan ?? renaks_summary.triwulan}`}
                    action="Lihat Detail"
                    actionHref={`${route('analytics.index')}?tab=monitoring_budget&year=${tahun}${triwulan && triwulan !== 'Semua' ? `&triwulan=${triwulan}` : ''}`}
                    noPad
                >
                    {/* Summary badges — 2 cols on mobile, 4 cols on sm+ */}
                    <div className="px-3 sm:px-4 pt-3 pb-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="rounded-lg border p-2 flex flex-col items-center gap-0.5 bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/40 dark:border-blue-800/60 dark:text-blue-300">
                            <span className="text-lg leading-tight">💰</span>
                            <span className="text-lg font-extrabold leading-tight">{(budget_summary?.serapan_persen ?? 0).toFixed(1)}%</span>
                            <span className="text-[10px] font-medium text-center leading-tight">Serapan APBD</span>
                        </div>
                        <div className="rounded-lg border p-2 flex flex-col items-center gap-0.5 bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800/60 dark:text-emerald-300">
                            <span className="text-lg leading-tight">✅</span>
                            <span className="text-lg font-extrabold leading-tight">{budget_summary?.tercapai ?? 0} OPD</span>
                            <span className="text-[10px] font-medium text-center leading-tight">Tercapai (&ge;100%)</span>
                        </div>
                        <div className="rounded-lg border p-2 flex flex-col items-center gap-0.5 bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800/60 dark:text-amber-300">
                            <span className="text-lg leading-tight">⚠️</span>
                            <span className="text-lg font-extrabold leading-tight">{budget_summary?.perlu_perhatian ?? 0} OPD</span>
                            <span className="text-[10px] font-medium text-center leading-tight">Perlu Perhatian</span>
                        </div>
                        <div className="rounded-lg border p-2 flex flex-col items-center gap-0.5 bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800/60 dark:text-rose-300">
                            <span className="text-lg leading-tight">❌</span>
                            <span className="text-lg font-extrabold leading-tight">{budget_summary?.kritis ?? 0} OPD</span>
                            <span className="text-[10px] font-medium text-center leading-tight">Kritis (&lt;50%)</span>
                        </div>
                    </div>
                    {/* Table with horizontal scroll */}
                    <div className="overflow-x-auto w-full">
                        <table className="w-full text-xs border-t border-gray-100 min-w-[420px]">
                            <thead>
                                <tr className="bg-gray-50 text-gray-600">
                                    <th className="px-2.5 py-2 text-left font-semibold w-10">No</th>
                                    <th className="px-2.5 py-2 text-left font-semibold">Perangkat Daerah</th>
                                    <th className="px-2 py-2 text-right font-semibold">Pagu {budget_summary?.triwulan ?? renaks_summary.triwulan}</th>
                                    <th className="px-2 py-2 text-right font-semibold">Realisasi {budget_summary?.triwulan ?? renaks_summary.triwulan}</th>
                                    <th className="px-2.5 py-2 text-right font-semibold">Serapan</th>
                                    <th className="px-2.5 py-2 text-center font-semibold">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {(budget_opd ?? []).map((opd, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="px-2.5 py-1.5 text-gray-500">{i + 1}</td>
                                        <td className="px-2.5 py-1.5 text-gray-700 font-medium max-w-[150px] truncate" title={opd.nama}>{opd.nama}</td>
                                        <td className="px-2 py-1.5 text-right text-gray-600 font-mono" title={formatRupiah(opd.pagu_tw)}>
                                            {formatRupiahCompact(opd.pagu_tw)}
                                        </td>
                                        <td className="px-2 py-1.5 text-right text-gray-600 font-mono" title={formatRupiah(opd.realisasi_tw)}>
                                            {formatRupiahCompact(opd.realisasi_tw)}
                                        </td>
                                        <td className="px-2.5 py-1.5 text-right font-semibold text-gray-800">
                                            {opd.serapan !== null ? `${opd.serapan.toFixed(2)}%` : '-'}
                                        </td>
                                        <td className="px-2.5 py-1.5 text-center"><StatusBadge status={opd.status} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Status Serapan Legend */}
                    <div className="px-3 py-2 bg-slate-50 border-t border-gray-100 text-[10px] text-gray-600 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-bold text-gray-800">💡 Kriteria:</span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Tercapai &ge; 100%
                        </span>
                        <span className="text-gray-300">|</span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                            Perlu Perhatian 50% &le; S &lt; 100%
                        </span>
                        <span className="text-gray-300">|</span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded font-semibold bg-rose-100 text-rose-800 border border-rose-300">
                            Kritis &lt; 50%
                        </span>
                    </div>
                </Card>

            </div>

            {/*
             * ─────────────────────────────────────────────────────────────────
             *  ROW 6 — Nilai SAKIP OPD | Daftar Perhatian Pimpinan
             * ─────────────────────────────────────────────────────────────────
             */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 mb-3">

                {/* Nilai SAKIP OPD — Luas & Proporsional di kolom 50% */}
                <Card
                    title="Nilai SAKIP OPD"
                    action="Lihat Detail"
                    actionHref={route('evaluations.index', { year: tahun })}
                >
                    <div className="flex flex-col justify-between h-full">
                        <SakipBarChart data={sakip_distribusi} />
                        <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between bg-slate-50 p-2.5 rounded text-xs">
                            <span className="text-gray-600 font-medium">Nilai SAKIP Pemda:</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200" title="Nilai SAKIP Pemda Papua Barat (KemenPANRB)">
                                {(kpi.nilai_sakip_pemda?.nilai ?? 0.0).toFixed(2)} ({kpi.nilai_sakip_pemda?.predikat ?? 'BELUM DINILAI'})
                            </span>
                        </div>
                    </div>
                </Card>

                {/* Daftar Perhatian Pimpinan */}
                <Card title="Daftar Perhatian Pimpinan" action="Lihat Detail" actionHref={route('alerts.index')} noPad>
                    {/* Tabs with scroll for mobile */}
                    <div className="px-3 sm:px-4 py-2.5 border-b border-gray-100 flex gap-1.5 overflow-x-auto no-scrollbar">
                        {(['Semua', 'Dokumen', 'Kinerja', 'SAKIP', 'PKO'] as const).map(tab => {
                            const cnt = tab === 'Semua' ? attention_list.length : attention_list.filter(a => a.kategori === tab).length;
                            return (
                                <button key={tab} onClick={() => setAttTab(tab)}
                                    className={`px-3 py-0.5 rounded text-xs font-semibold transition border flex-shrink-0 cursor-pointer ${
                                        attTab === tab
                                            ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                    }`}>
                                    {tab} ({cnt})
                                </button>
                            );
                        })}
                    </div>
                    {/* Table with horizontal scroll */}
                    <div className="overflow-x-auto w-full">
                        <table className="w-full text-xs min-w-[420px]">
                            <thead>
                                <tr className="bg-gray-50 text-gray-600">
                                    <th className="px-3 py-2 text-left font-semibold">No</th>
                                    <th className="px-3 py-2 text-left font-semibold">Uraian</th>
                                    <th className="px-3 py-2 text-center font-semibold">Kategori</th>
                                    <th className="px-3 py-2 text-center font-semibold">Jumlah</th>
                                    <th className="px-3 py-2 text-center font-semibold">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredAtt.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-3 py-8 text-center text-gray-400">
                                            <div className="flex flex-col items-center gap-2">
                                                <span className="text-3xl">✅</span>
                                                <span>Tidak ada item perhatian</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredAtt.map((item, i) => (
                                    <tr key={i} className="hover:bg-gray-50 transition">
                                        <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                                        <td className="px-3 py-2 text-gray-700">{item.uraian}</td>
                                        <td className="px-3 py-2 text-center">
                                            <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700">{item.kategori}</span>
                                        </td>
                                        <td className="px-3 py-2 text-center font-semibold text-gray-800">{item.jumlah}</td>
                                        <td className="px-3 py-2 text-center"><StatusBadge status={item.status} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/*
             * ─────────────────────────────────────────────────────────────────
             *  FOOTER
             * ─────────────────────────────────────────────────────────────────
             */}
            <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-gray-400 py-3 border-t border-gray-100 mt-2 gap-1.5 text-center sm:text-left">
                <span>© {tahun_evaluasi} Biro Organisasi Sekretariat Daerah Provinsi Papua Barat. Hak Cipta Dilindungi.</span>
                <span>Data diupdate terakhir: {last_updated_at}</span>
            </div>

            {/* ─── MODAL DETAIL MATRIKS 13 DOKUMEN SAKIP PEMDA ────────────── */}
            <Dialog open={isMatrixModalOpen} onOpenChange={setIsMatrixModalOpen}>
                <DialogContent className="max-w-4xl p-0 overflow-hidden sm:max-w-4xl bg-white border-0 shadow-2xl">
                    {/* Header */}
                    <div className="bg-slate-900 text-white p-4 sm:p-5 pr-12 flex items-start justify-between border-b border-slate-800">
                        <div>
                            <div className="flex items-center gap-2.5">
                                <span className="p-1.5 rounded-md bg-blue-600/30 text-blue-400 border border-blue-500/30">
                                    <TableProperties className="w-4 h-4" />
                                </span>
                                <DialogTitle className="text-base sm:text-lg font-bold text-white tracking-tight">
                                    Matriks Kelengkapan Dokumen SAKIP Pemerintah Daerah
                                </DialogTitle>
                            </div>
                            <DialogDescription className="text-xs text-slate-300 mt-1">
                                Evaluasi ketersediaan dan kesesuaian periode 13 dokumen utama SAKIP Pemda — Tahun Evaluasi <strong>{tahun}</strong>
                            </DialogDescription>
                        </div>
                    </div>

                    <div className="p-4 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                        {/* Summary Cards + Chart Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                            {/* Summary Metric Cards (8 cols) */}
                            <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-center">
                                    <p className="text-[10px] font-semibold text-slate-500 uppercase">Total Dokumen</p>
                                    <p className="text-2xl font-black text-slate-800">{pemda_sakip_matrix?.total_required ?? kpi.kelengkapan_pemda.total ?? 0}</p>
                                </div>
                                <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-center">
                                    <p className="text-[10px] font-semibold text-emerald-700 uppercase">Dokumen Tersedia</p>
                                    <p className="text-2xl font-black text-emerald-800">{pemda_sakip_matrix?.available ?? kpi.kelengkapan_pemda.tersedia}</p>
                                </div>
                                <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-3 text-center">
                                    <p className="text-[10px] font-semibold text-rose-700 uppercase">Belum Tersedia</p>
                                    <p className="text-2xl font-black text-rose-800">{pemda_sakip_matrix?.missing ?? (kpi.kelengkapan_pemda.total - kpi.kelengkapan_pemda.tersedia)}</p>
                                </div>
                                <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 text-center">
                                    <p className="text-[10px] font-semibold text-blue-700 uppercase">Kelengkapan</p>
                                    <p className="text-2xl font-black text-blue-800">{(pemda_sakip_matrix?.percentage ?? kpi.kelengkapan_pemda.pct).toFixed(2)}%</p>
                                </div>
                                <div className="col-span-2 sm:col-span-4 rounded-lg border border-slate-200 bg-white p-2.5 flex items-center justify-between px-4">
                                    <span className="text-xs font-semibold text-slate-700">Status Kelengkapan Otomatis:</span>
                                    <StatusBadge status={pemda_sakip_matrix?.status ?? kpi.kelengkapan_pemda.status} />
                                </div>
                            </div>

                            {/* Donut Chart Visual (4 cols) */}
                            <div className="md:col-span-4 rounded-lg border border-slate-200 bg-slate-50/40 p-3 flex flex-col items-center justify-center">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Grafik Proporsi Dokumen</p>
                                <SakipDonutChart
                                    available={pemda_sakip_matrix?.available ?? kpi.kelengkapan_pemda.tersedia}
                                    missing={pemda_sakip_matrix?.missing ?? (kpi.kelengkapan_pemda.total - kpi.kelengkapan_pemda.tersedia)}
                                    percentage={pemda_sakip_matrix?.percentage ?? kpi.kelengkapan_pemda.pct}
                                />
                            </div>
                        </div>

                        {/* Table Matrix 13 Dokumen */}
                        <div className="rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                                        <th className="px-3 py-2.5 font-bold text-center w-12">No</th>
                                        <th className="px-4 py-2.5 font-bold">Dokumen Pemerintah Daerah</th>
                                        <th className="px-3 py-2.5 font-bold text-center w-32">Tahun/Periode</th>
                                        <th className="px-3 py-2.5 font-bold text-center w-28">Kelengkapan</th>
                                        <th className="px-4 py-2.5 font-bold text-center w-32">Status</th>
                                        <th className="px-3 py-2.5 font-bold text-center w-24">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(pemda_sakip_matrix?.rows ?? []).map((row) => (
                                        <tr key={row.no} className="hover:bg-slate-50/70 transition">
                                            <td className="px-3 py-2.5 text-center font-semibold text-slate-500">{row.no}</td>
                                            <td className="px-4 py-2.5">
                                                <div className="font-semibold text-slate-800">{row.name}</div>
                                                {row.document_title && (
                                                    <div className="text-[11px] text-slate-400 truncate max-w-[360px]" title={row.document_title}>
                                                        {row.document_title}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-3 py-2.5 text-center text-slate-600 font-mono text-[11px]">
                                                {row.period}
                                            </td>
                                            <td className="px-3 py-2.5 text-center">
                                                {row.is_available ? (
                                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-black text-sm">
                                                        ✓
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-100 text-rose-600 font-bold text-sm">
                                                        ✕
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2.5 text-center">
                                                <span
                                                    className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                                                        row.is_available
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                            : 'bg-rose-50 text-rose-700 border-rose-200'
                                                    }`}
                                                >
                                                    {row.status}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2.5 text-center">
                                                {row.download_url ? (
                                                    <a
                                                        href={row.download_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        title="Unduh Berkas Fisik Dokumen"
                                                        className="inline-flex items-center justify-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded text-[11px] font-semibold transition"
                                                    >
                                                        <Download className="w-3 h-3" />
                                                        <span>Unduh</span>
                                                    </a>
                                                ) : row.is_available ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-600 border border-amber-200">
                                                        <span>Belum Ada File</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-600 border border-rose-200">
                                                        <span>Belum Ada</span>
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Footnote / Keterangan */}
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 space-y-1">
                            <p className="font-bold text-slate-700">Keterangan:</p>
                            <p className="flex items-center gap-1.5">
                                <span className="font-bold text-emerald-700">✓</span>
                                <span>= Tersedia dan sesuai periode/tahun yang berlaku.</span>
                            </p>
                            <p className="flex items-center gap-1.5">
                                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-rose-100 text-rose-600 font-bold text-[10px]">✕</span>
                                <span>= Belum tersedia pada tahun evaluasi {tahun}.</span>
                            </p>
                            <p className="flex items-center gap-1.5">
                                <Download className="w-3.5 h-3.5 text-emerald-700" />
                                <span>= Berkas dokumen fisik tersedia untuk diunduh langsung.</span>
                            </p>
                            <p className="flex items-center gap-1.5">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-600 border border-amber-200">Belum Ada File</span>
                                <span>= Dokumen tercatat tersedia namun berkas fisik belum diunggah.</span>
                            </p>
                            <p className="flex items-center gap-1.5">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-600 border border-rose-200">Belum Ada</span>
                                <span>= Dokumen belum tersedia dan belum ada berkas.</span>
                            </p>
                        </div>
                    </div>

                    {/* Modal Footer */}
                    <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <a
                                href={getExportUrl('sakip_pemda', 'pdf')}
                                target="_blank"
                                rel="noopener noreferrer"
                                download
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 shadow-2xs transition"
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span>Download PDF Matriks</span>
                            </a>
                            <Link
                                href={`${route('analytics.index')}?tab=sakip_docs`}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Buka Data Lengkap di Analitik</span>
                            </Link>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsMatrixModalOpen(false)}
                            className="w-full sm:w-auto px-4 py-1.5 text-xs font-semibold rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 shadow-2xs transition cursor-pointer"
                        >
                            Tutup
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ═══════════════════════════════════════════════════════════════
             *  MODAL DIALOG: MATRIKS KELENGKAPAN DOKUMEN SAKIP PERANGKAT DAERAH (12 DOK)
             * ═══════════════════════════════════════════════════════════════ */}
            <Dialog open={isOpdModalOpen} onOpenChange={setIsOpdModalOpen}>
                <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto p-0 gap-0">
                    <DialogHeader className="p-5 pb-3 border-b border-slate-200 bg-slate-50/80">
                        <div className="flex items-center gap-2">
                            <span className="p-1.5 bg-blue-100 text-blue-700 rounded-md">
                                <TableProperties className="w-4 h-4" />
                            </span>
                            <div>
                                <DialogTitle className="text-base font-bold text-slate-800">
                                    Matriks Kelengkapan Dokumen SAKIP Perangkat Daerah
                                </DialogTitle>
                                <DialogDescription className="text-xs text-slate-500">
                                    Tingkat ketersediaan dan kelengkapan 12 dokumen SAKIP seluruh Perangkat Daerah (Tahun Evaluasi: <strong>{tahun}</strong>)
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="p-5 space-y-4">
                        {/* 5 Kartu Utama & Ringkasan GRAFIK */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                            {/* 5 Cards */}
                            <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                                <div className="rounded-lg border border-slate-200 bg-white p-3 text-center shadow-2xs">
                                    <p className="text-[10px] font-semibold text-slate-500 uppercase">Total Perangkat Daerah</p>
                                    <p className="text-xl font-black text-slate-800">{opd_sakip_matrix?.total_opd ?? kpi.opd_sakip_lengkap.total} OPD</p>
                                </div>
                                <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-center shadow-2xs">
                                    <p className="text-[10px] font-semibold text-emerald-700 uppercase">OPD Lengkap</p>
                                    <p className="text-xl font-black text-emerald-800">{opd_sakip_matrix?.opd_lengkap ?? kpi.opd_sakip_lengkap.lengkap} OPD</p>
                                </div>
                                <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-center shadow-2xs">
                                    <p className="text-[10px] font-semibold text-amber-700 uppercase">OPD Belum Lengkap</p>
                                    <p className="text-xl font-black text-amber-800">{opd_sakip_matrix?.opd_belum_lengkap ?? (kpi.opd_sakip_lengkap.total - kpi.opd_sakip_lengkap.lengkap)} OPD</p>
                                </div>
                                <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 text-center shadow-2xs">
                                    <p className="text-[10px] font-semibold text-blue-700 uppercase">Persentase Lengkap</p>
                                    <p className="text-xl font-black text-blue-800">{opd_sakip_matrix?.pct_lengkap ?? kpi.opd_sakip_lengkap.pct}%</p>
                                </div>
                                <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-3 text-center shadow-2xs col-span-2 sm:col-span-1">
                                    <p className="text-[10px] font-semibold text-rose-700 uppercase">Dokumen Belum Ada</p>
                                    <p className="text-xl font-black text-rose-800">{opd_sakip_matrix?.missing_docs ?? 0} Dokumen</p>
                                </div>
                                <div className="col-span-2 sm:col-span-5 rounded-lg border border-slate-200 bg-white p-2.5 flex items-center justify-between px-3.5 shadow-2xs text-xs text-slate-600">
                                    <span>
                                        <strong>Rumus:</strong> Persentase OPD Lengkap = Jumlah OPD Lengkap (100%) / Total OPD × 100% = {opd_sakip_matrix?.opd_lengkap ?? 0} / {opd_sakip_matrix?.total_opd ?? 0} × 100% = <strong className="text-blue-700">{opd_sakip_matrix?.pct_lengkap ?? 0}%</strong>
                                    </span>
                                </div>
                            </div>

                            {/* Ringkasan GRAFIK */}
                            <div className="md:col-span-4 rounded-lg border border-slate-200 bg-white p-3 flex flex-col items-center justify-center shadow-2xs">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">Grafik Proporsi OPD</p>
                                <SakipOpdDonutChart
                                    lengkap={opd_sakip_matrix?.opd_lengkap ?? 0}
                                    belumLengkap={opd_sakip_matrix?.opd_belum_lengkap ?? 0}
                                    percentage={opd_sakip_matrix?.pct_lengkap ?? 0}
                                    total={opd_sakip_matrix?.total_opd ?? 0}
                                />
                            </div>
                        </div>

                        {/* Matriks Tabel 12 Dokumen OPD */}
                        <div className="overflow-x-auto rounded-lg border border-slate-200">
                            <table className="w-full text-left text-xs min-w-[1050px]">
                                <thead className="bg-slate-100 text-slate-700">
                                    <tr>
                                        <th className="px-3 py-2.5 font-semibold text-center w-10">No</th>
                                        <th className="px-3 py-2.5 font-semibold w-44">Perangkat Daerah</th>
                                        {Object.entries(opd_sakip_matrix?.columns ?? {}).map(([k, lbl]) => (
                                            <th key={k} className="px-1.5 py-2.5 font-semibold text-center text-[10px] max-w-[65px] leading-tight" title={lbl}>
                                                {lbl}
                                            </th>
                                        ))}
                                        <th className="px-2.5 py-2.5 font-semibold text-center w-24">Kelengkapan</th>
                                        <th className="px-3 py-2.5 font-semibold text-center w-28">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(opd_sakip_matrix?.rows ?? []).map((row) => (
                                        <tr key={row.organization_id} className="hover:bg-slate-50/70 transition">
                                            <td className="px-3 py-2 text-center font-semibold text-slate-500">{row.no}</td>
                                            <td className="px-3 py-2 font-semibold text-slate-800 truncate max-w-[200px]" title={row.organization_name}>
                                                {row.organization_name}
                                            </td>
                                            {Object.keys(opd_sakip_matrix?.columns ?? {}).map((k) => {
                                                const detail = row.doc_details?.[k];
                                                return (
                                                    <td key={k} className="px-1.5 py-2 text-center">
                                                        {row.checks[k] ? (
                                                            detail?.has_file && detail?.download_url ? (
                                                                <a
                                                                    href={detail.download_url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    title={`Unduh berkas: ${detail.title || 'Dokumen'}`}
                                                                    className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition cursor-pointer"
                                                                >
                                                                    <Download className="w-2.5 h-2.5" />
                                                                </a>
                                                            ) : (
                                                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs" title="Tersedia">
                                                                    ✓
                                                                </span>
                                                            )
                                                        ) : (
                                                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-100 text-rose-600 font-bold text-xs">
                                                                ✕
                                                            </span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                            <td className="px-2.5 py-2 text-center font-bold text-blue-700">
                                                {row.percentage}%
                                                <span className="block text-[10px] font-normal text-slate-400">
                                                    {row.available_count}/{row.total_required}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <span
                                                    className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                                        row.status === 'Lengkap'
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                            : row.status === 'Belum Lengkap'
                                                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                            : 'bg-rose-50 text-rose-700 border-rose-200'
                                                    }`}
                                                >
                                                    {row.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Footnote / Keterangan */}
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 space-y-1">
                            <p className="font-bold text-slate-700">Keterangan:</p>
                            <p className="flex items-center gap-1.5">
                                <span className="font-bold text-emerald-700">✓</span>
                                <span>= Dokumen tersedia dan sesuai tahun/periode yang berlaku.</span>
                            </p>
                            <p className="flex items-center gap-1.5">
                                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-rose-100 text-rose-600 font-bold text-[10px]">✕</span>
                                <span>= Dokumen belum tersedia pada tahun evaluasi {tahun}.</span>
                            </p>
                            <p className="flex items-center gap-1.5">
                                <Download className="w-3.5 h-3.5 text-emerald-700" />
                                <span>= Dokumen memiliki berkas fisik yang dapat diunduh langsung.</span>
                            </p>
                        </div>
                    </div>

                    {/* Modal Footer */}
                    <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <a
                                href={getExportUrl('sakip_opd', 'pdf')}
                                target="_blank"
                                rel="noopener noreferrer"
                                download
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 shadow-2xs transition"
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span>Download PDF Matriks OPD</span>
                            </a>
                            <Link
                                href={`${route('analytics.index')}?tab=sakip_docs`}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Buka Data Lengkap di Analitik</span>
                            </Link>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsOpdModalOpen(false)}
                            className="w-full sm:w-auto px-4 py-1.5 text-xs font-semibold rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 shadow-2xs transition cursor-pointer"
                        >
                            Tutup
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ═══════════════════════════════════════════════════════════════
             *  MODAL DIALOG: MATRIKS CAPAIAN SASARAN & INDIKATOR RPJMD (35 INDIKATOR + TREN 5 TAHUN)
             * ═══════════════════════════════════════════════════════════════ */}
            <Dialog open={isRpjmdModalOpen} onOpenChange={setIsRpjmdModalOpen}>
                <DialogContent className="sm:max-w-7xl max-h-[92vh] overflow-y-auto p-0 gap-0 bg-white border-0 shadow-2xl">
                    {/* Header */}
                    <div className="bg-slate-900 text-white p-4 sm:p-5 pr-12 flex items-start justify-between border-b border-slate-800">
                        <div>
                            <div className="flex items-center gap-2.5">
                                <span className="p-1.5 rounded-md bg-emerald-600/30 text-emerald-400 border border-emerald-500/30">
                                    <Target className="w-4 h-4" />
                                </span>
                                <DialogTitle className="text-base sm:text-lg font-bold text-white tracking-tight">
                                    Matriks Capaian Sasaran &amp; Indikator RPJMD Pemerintah Daerah
                                </DialogTitle>
                            </div>
                            <DialogDescription className="text-xs text-slate-300 mt-1">
                                Monitoring capaian target indikator sasaran RPJMD tahun evaluasi <strong>{tahun}</strong> dan analisis tren multi-tahun ({rpjmd_matrix?.years ? `${rpjmd_matrix.years[0]}–${rpjmd_matrix.years[rpjmd_matrix.years.length - 1]}` : '5 Tahunan'})
                            </DialogDescription>
                        </div>
                    </div>

                    <div className="p-4 sm:p-6 space-y-4">
                        {/* 8 KARTU UTAMA EKSEKUTIF RPJMD */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                            <div className="rounded-lg border border-slate-200 bg-white p-3 text-center shadow-2xs">
                                <p className="text-[10px] font-semibold text-rose-700 uppercase tracking-wide">Tujuan RPJMD</p>
                                <p className="text-2xl font-black text-rose-800 mt-0.5">{rpjmd_matrix?.summary.total_tujuan ?? 0}</p>
                                <span className="text-[10px] text-slate-400">Tujuan Makro</span>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-white p-3 text-center shadow-2xs">
                                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Sasaran RPJMD</p>
                                <p className="text-2xl font-black text-slate-800 mt-0.5">{rpjmd_matrix?.summary.total_sasaran ?? 0}</p>
                                <span className="text-[10px] text-slate-400">Sasaran Strategis</span>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-white p-3 text-center shadow-2xs">
                                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Indikator</p>
                                <p className="text-2xl font-black text-blue-800 mt-0.5">{rpjmd_matrix?.summary.total_indikator ?? 0}</p>
                                <span className="text-[10px] text-blue-500">Total Indikator</span>
                            </div>
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 text-center shadow-2xs">
                                <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide">Rata-rata Capaian</p>
                                <p className="text-2xl font-black text-emerald-700 mt-0.5">{(rpjmd_matrix?.summary.rata_capaian ?? 0.0).toFixed(2)}%</p>
                                <span className="text-[10px] text-emerald-600 font-medium">Tahun {tahun}</span>
                            </div>
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 text-center shadow-2xs">
                                <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide">Tercapai</p>
                                <p className="text-2xl font-black text-emerald-700 mt-0.5">{rpjmd_matrix?.summary.tercapai ?? 0}</p>
                                <span className="text-[10px] text-emerald-600 font-medium">Capaian &ge; 100%</span>
                            </div>
                            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-center shadow-2xs">
                                <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide">Perlu Perhatian</p>
                                <p className="text-2xl font-black text-amber-700 mt-0.5">{rpjmd_matrix?.summary.perlu_perhatian ?? 0}</p>
                                <span className="text-[10px] text-amber-600 font-medium">50% &le; Capaian &lt; 100%</span>
                            </div>
                            <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-3 text-center shadow-2xs">
                                <p className="text-[10px] font-semibold text-rose-700 uppercase tracking-wide">Kritis</p>
                                <p className="text-2xl font-black text-rose-700 mt-0.5">{rpjmd_matrix?.summary.kritis ?? 0}</p>
                                <span className="text-[10px] text-rose-600 font-medium">Capaian &lt; 50%</span>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-center shadow-2xs">
                                <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Tidak Dinilai</p>
                                <p className="text-2xl font-black text-slate-700 mt-0.5">{rpjmd_matrix?.summary.tidak_dinilai ?? 0}</p>
                                <span className="text-[10px] text-slate-500 font-medium">Target=0 &amp; Real=0</span>
                            </div>
                        </div>

                        {/* GRAFIK TREN 5 TAHUN (2025 -> 2026 -> 2027 -> 2028 -> 2029) */}
                        <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-200">
                                <div className="flex items-center gap-2">
                                    <span className="p-1 rounded bg-blue-100 text-blue-700">
                                        <TrendingUp className="w-3.5 h-3.5" />
                                    </span>
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-800">Capaian Sasaran RPJMD per Tahun</h4>
                                        <p className="text-[11px] text-slate-500">
                                            Lintasan tren deret waktu: <strong className="text-blue-700 font-mono">{rpjmdYears.join(' \u2192 ')}</strong>
                                        </p>
                                    </div>
                                </div>
                                <span className="text-[11px] text-blue-700 font-bold bg-blue-50 px-2.5 py-1 rounded border border-blue-200 shadow-2xs">
                                    Benchmark: 100%
                                </span>
                            </div>
                            <RpjmdModalTrendChart trend={rpjmd_matrix?.trend ?? []} />
                        </div>

                        {/* FILTER & VIEW TOGGLE BAR */}
                        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                            {/* View Mode Buttons */}
                            <div className="inline-flex rounded-md p-1 bg-slate-100 border border-slate-200 self-start md:self-auto">
                                <button
                                    type="button"
                                    onClick={() => setRpjmdMatrixView('eval_year')}
                                    className={`px-3 py-1 text-xs font-bold rounded cursor-pointer transition ${
                                        rpjmdMatrixView === 'eval_year'
                                            ? 'bg-white text-blue-700 shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    Matriks Evaluasi ({tahun})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRpjmdMatrixView('trend_5yr')}
                                    className={`px-3 py-1 text-xs font-bold rounded cursor-pointer transition flex items-center gap-1.5 ${
                                        rpjmdMatrixView === 'trend_5yr'
                                            ? 'bg-white text-blue-700 shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    <span>Tabel Tren ({rpjmd_matrix?.years ? `${rpjmd_matrix.years[0]}–${rpjmd_matrix.years[rpjmd_matrix.years.length - 1]}` : '5 Tahunan'})</span>
                                    <span className="text-[10px] px-1.5 py-0.2 bg-blue-100 text-blue-700 rounded-full font-bold">5 Thn</span>
                                </button>
                            </div>

                            {/* Filters & Actions */}
                            <div className="flex flex-wrap items-center gap-2">
                                {/* Search */}
                                <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Cari sasaran, indikator, OPD..."
                                        value={rpjmdSearchQuery}
                                        onChange={(e) => setRpjmdSearchQuery(e.target.value)}
                                        className="w-full pl-8 pr-7 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                    />
                                    {rpjmdSearchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setRpjmdSearchQuery('')}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>

                                {/* Filter Sasaran */}
                                <div className="w-48 sm:w-56">
                                    <Select2
                                        value={rpjmdFilterSasaran}
                                        onChange={(val) => setRpjmdFilterSasaran(val)}
                                        options={[
                                            { value: '', label: 'Semua Sasaran' },
                                            ...rpjmdSasaranOptions.map((s) => ({
                                                value: s.id,
                                                label: s.name,
                                            })),
                                        ]}
                                        placeholder="Semua Sasaran"
                                        searchPlaceholder="Cari Sasaran..."
                                    />
                                </div>

                                {/* Filter Status */}
                                <div className="w-40 sm:w-44">
                                    <Select2
                                        value={rpjmdFilterStatus}
                                        onChange={(val) => setRpjmdFilterStatus(val)}
                                        options={[
                                            { value: 'Semua', label: 'Semua Status' },
                                            { value: 'Tercapai', label: 'Tercapai (≥100%)' },
                                            { value: 'Perlu Perhatian', label: 'Perlu Perhatian (50%–<100%)' },
                                            { value: 'Kritis', label: 'Kritis (<50% / Minus)' },
                                            { value: 'Tidak Dinilai', label: 'Tidak Dinilai' },
                                        ]}
                                        placeholder="Semua Status"
                                    />
                                </div>

                                {/* Copy to Clipboard */}
                                <button
                                    type="button"
                                    onClick={handleCopyRpjmdToClipboard}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition shadow-2xs cursor-pointer"
                                    title="Salin data tabel saat ini ke clipboard untuk ditempel di Excel (Ctrl+V)"
                                >
                                    {rpjmdCopied ? (
                                        <>
                                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                                            <span className="text-emerald-700 font-bold">Tersalin!</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                                            <span>Salin Excel</span>
                                        </>
                                    )}
                                </button>

                                {/* Download PDF */}
                                <a
                                    href={getExportUrl('rpjmd', 'pdf')}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download
                                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition shadow-2xs cursor-pointer"
                                    title="Download dokumen matriks capaian RPJMD dalam format PDF (sesuai filter aktif)"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Download PDF</span>
                                </a>
                            </div>
                        </div>

                        {/* MATRIKS TABEL (SWITCHABLE: EVAL_YEAR vs TREND_5YR) */}
                        {rpjmdMatrixView === 'eval_year' ? (
                            /* VIEW 1: Matriks Evaluasi Tahun Berjalan */
                            <div className="overflow-x-auto rounded-lg border border-slate-200">
                                <table className="w-full text-left text-xs min-w-[950px] border-collapse">
                                    <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                                        <tr>
                                            <th className="px-3 py-2.5 font-bold text-center w-12 border-r border-slate-200">No</th>
                                            <th className="px-3 py-2.5 font-bold w-44 border-r border-slate-200">Misi</th>
                                            <th className="px-3 py-2.5 font-bold w-48 border-r border-slate-200">Tujuan</th>
                                            <th className="px-3 py-2.5 font-bold w-52 border-r border-slate-200">Sasaran RPJMD</th>
                                            <th className="px-3 py-2.5 font-bold border-r border-slate-200">Indikator</th>
                                            <th className="px-2.5 py-2.5 font-bold text-right w-24 bg-blue-100 text-blue-950 border-r border-blue-200">Target</th>
                                            <th className="px-2.5 py-2.5 font-bold text-right w-24 bg-emerald-100 text-emerald-950 border-r border-emerald-200">Realisasi</th>
                                            <th className="px-2.5 py-2.5 font-bold text-right w-24 bg-amber-100 text-amber-950 border-r border-amber-200">Capaian</th>
                                            <th className="px-3 py-2.5 font-bold text-center w-28">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredRpjmdRows.length === 0 ? (
                                            <tr>
                                                <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                                                    Tidak ada indikator sasaran yang sesuai filter pencarian.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredRpjmdRows.map((row, idx) => (
                                                <tr key={row.id} className="hover:bg-slate-50/70 transition">
                                                    <td className="px-3 py-2.5 text-center font-semibold text-slate-500 border-r border-slate-100">{idx + 1}</td>
                                                    {rpjmdRowSpans.misiSpans[idx] > 0 && (
                                                        <td
                                                            rowSpan={rpjmdRowSpans.misiSpans[idx]}
                                                            className="px-3 py-2.5 text-slate-700 align-top bg-slate-50/60 font-medium border-r border-slate-200"
                                                            title={(row as any).misi || 'Misi RPJMD'}
                                                        >
                                                            {(row as any).misi || 'Misi RPJMD'}
                                                        </td>
                                                    )}
                                                    {rpjmdRowSpans.tujuanSpans[idx] > 0 && (
                                                        <td
                                                            rowSpan={rpjmdRowSpans.tujuanSpans[idx]}
                                                            className="px-3 py-2.5 text-slate-700 align-top bg-slate-50/30 border-r border-slate-200"
                                                            title={row.tujuan}
                                                        >
                                                            {row.tujuan}
                                                        </td>
                                                    )}
                                                    <td className="px-3 py-2.5 font-semibold text-slate-800 border-r border-slate-100" title={row.sasaran}>
                                                        {row.sasaran}
                                                    </td>
                                                    <td className="px-3 py-2.5 border-r border-slate-100">
                                                        <div className="font-semibold text-slate-900">{row.indikator}</div>
                                                        <div className="text-[10px] text-slate-400 font-mono">
                                                            {row.kode} • Satuan: {row.satuan} • {row.polarization === 'negatif' ? 'Pola Negatif' : 'Pola Positif'}
                                                        </div>
                                                    </td>
                                                    <td className="px-2.5 py-2.5 text-right font-mono font-medium text-blue-950 bg-blue-50/40 border-r border-slate-100">
                                                        {row.target !== null ? row.target.toLocaleString('id-ID') : '-'}
                                                    </td>
                                                    <td className="px-2.5 py-2.5 text-right font-mono font-semibold text-emerald-950 bg-emerald-50/40 border-r border-slate-100">
                                                        {row.realisasi !== null ? row.realisasi.toLocaleString('id-ID') : '-'}
                                                    </td>
                                                    <td className="px-2.5 py-2.5 text-right font-mono font-black text-xs text-amber-950 bg-amber-50/40 border-r border-slate-100">
                                                        {row.capaian !== null ? (
                                                            <span className={capaianColorCls(row.capaian)}>
                                                                {row.capaian.toFixed(2)}%
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-center">
                                                        <StatusBadge status={row.status} />
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            /* VIEW 2: Tabel Tren 5 Tahun */
                            <div className="overflow-x-auto rounded-lg border border-slate-200">
                                <table className="w-full text-left text-xs min-w-[1250px] border-collapse">
                                    <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                                        <tr>
                                            <th rowSpan={2} className="px-2.5 py-2 font-bold text-center w-10 border-r border-slate-200">No</th>
                                            <th rowSpan={2} className="px-3 py-2 font-bold w-44 border-r border-slate-200">Misi</th>
                                            <th rowSpan={2} className="px-3 py-2 font-bold w-48 border-r border-slate-200">Tujuan</th>
                                            <th rowSpan={2} className="px-3 py-2 font-bold w-52 border-r border-slate-200">Sasaran RPJMD</th>
                                            <th rowSpan={2} className="px-3 py-2 font-bold w-52 border-r border-slate-200">Indikator</th>
                                            {rpjmdYears.map((y) => (
                                                <th
                                                    key={y}
                                                    colSpan={3}
                                                    className={`px-2 py-1.5 font-bold text-center border-r border-slate-200 ${
                                                        y === Number(tahun) ? 'bg-blue-200/70 text-blue-900 font-black' : 'bg-slate-200/50'
                                                    }`}
                                                >
                                                    {y} {y === Number(tahun) && '(Aktif)'}
                                                </th>
                                            ))}
                                            <th rowSpan={2} className="px-3 py-2 font-bold text-center w-28">Status ({tahun})</th>
                                        </tr>
                                        <tr className="bg-slate-50 text-[10.5px] border-b border-slate-200">
                                            {rpjmdYears.map((y) => (
                                                <React.Fragment key={`sub-${y}`}>
                                                    <th className="px-1.5 py-1 text-right font-semibold bg-blue-100/80 text-blue-900 border-r border-blue-200">Tgt</th>
                                                    <th className="px-1.5 py-1 text-right font-semibold bg-emerald-100/80 text-emerald-900 border-r border-emerald-200">Real</th>
                                                    <th className="px-1.5 py-1 text-right font-bold bg-amber-100/80 text-amber-900 border-r border-slate-200">Cap (%)</th>
                                                </React.Fragment>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredRpjmdRows.length === 0 ? (
                                            <tr>
                                                <td colSpan={6 + rpjmdYears.length * 3} className="px-4 py-8 text-center text-slate-400">
                                                    Tidak ada indikator sasaran yang sesuai filter pencarian.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredRpjmdRows.map((row, idx) => (
                                                <tr key={`trend-${row.id}`} className="hover:bg-slate-50/70 transition">
                                                    <td className="px-2.5 py-2 text-center font-semibold text-slate-500 border-r border-slate-100">{idx + 1}</td>
                                                    {rpjmdRowSpans.misiSpans[idx] > 0 && (
                                                        <td
                                                            rowSpan={rpjmdRowSpans.misiSpans[idx]}
                                                            className="px-3 py-2 text-slate-700 align-top bg-slate-50/60 font-medium border-r border-slate-200"
                                                            title={(row as any).misi || 'Misi RPJMD'}
                                                        >
                                                            {(row as any).misi || 'Misi RPJMD'}
                                                        </td>
                                                    )}
                                                    {rpjmdRowSpans.tujuanSpans[idx] > 0 && (
                                                        <td
                                                            rowSpan={rpjmdRowSpans.tujuanSpans[idx]}
                                                            className="px-3 py-2 text-slate-700 align-top bg-slate-50/30 border-r border-slate-200"
                                                            title={row.tujuan}
                                                        >
                                                            {row.tujuan}
                                                        </td>
                                                    )}
                                                    <td className="px-3 py-2 font-semibold text-slate-800 border-r border-slate-100" title={row.sasaran}>
                                                        {row.sasaran}
                                                    </td>
                                                    <td className="px-3 py-2 border-r border-slate-100">
                                                        <div className="font-semibold text-slate-900">{row.indikator}</div>
                                                        <div className="text-[10px] text-slate-400 font-mono">{row.kode} ({row.satuan})</div>
                                                    </td>
                                                    {rpjmdYears.map((y) => {
                                                        const yd = row.yearly[y];
                                                        const isCurrentYear = y === Number(tahun);
                                                        return (
                                                            <React.Fragment key={`td-${row.id}-${y}`}>
                                                                <td className={`px-1.5 py-2 text-right font-mono text-[11px] bg-blue-50/40 text-blue-950 ${isCurrentYear ? 'font-medium' : ''}`}>
                                                                    {yd?.target !== null && yd?.target !== undefined ? yd.target.toLocaleString('id-ID') : '-'}
                                                                </td>
                                                                <td className={`px-1.5 py-2 text-right font-mono text-[11px] font-semibold bg-emerald-50/40 text-emerald-950`}>
                                                                    {yd?.realization !== null && yd?.realization !== undefined ? yd.realization.toLocaleString('id-ID') : '-'}
                                                                </td>
                                                                <td className={`px-1.5 py-2 text-right font-mono text-[11px] font-bold border-r border-slate-100 bg-amber-50/40 text-amber-950`}>
                                                                    {yd?.achievement !== null && yd?.achievement !== undefined ? (
                                                                        <span className={capaianColorCls(yd.achievement)}>
                                                                            {yd.achievement.toFixed(1)}%
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-slate-300 font-normal">-</span>
                                                                    )}
                                                                </td>
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                    <td className="px-3 py-2 text-center">
                                                        <StatusBadge status={row.status} />
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* FOOTNOTE & ATURAN STATUS */}
                        <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1.5">
                            <p className="font-bold text-slate-700">Keterangan Status Capaian RPJMD:</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-[11px] mt-1">
                                <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-900">
                                    <strong>🟢 Tercapai (≥ 100%)</strong>: Target terpenuhi atau terlampaui.
                                </div>
                                <div className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-900">
                                    <strong>🟡 Perlu Perhatian (50% - &lt;100%)</strong>: Capaian antara 50% sampai kurang dari 100%.
                                </div>
                                <div className="p-2 rounded bg-rose-50 border border-rose-300 text-rose-950">
                                    <strong>🔴 Kritis (&lt; 50% / Minus)</strong>: Terkendala berat, belum ada realisasi, atau nilai minus.
                                </div>
                                <div className="p-2 rounded bg-slate-100 border border-slate-300 text-slate-800">
                                    <strong>⚪ Tidak Dinilai</strong>: Target = 0 dan Realisasi = 0.
                                </div>
                            </div>
                            <div className="mt-2 text-[11px] text-slate-500 pt-2 border-t border-slate-200">
                                💡 <strong>Aturan Khusus:</strong> Apabila capaian bernilai minus (&lt; 0), indikator secara otomatis diklasifikasikan berstatus <strong>Kritis</strong> sesuai kriteria evaluasi kinerja.
                            </div>
                        </div>
                    </div>

                    {/* Modal Footer */}
                    <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <a
                                href={getExportUrl('rpjmd', 'pdf')}
                                target="_blank"
                                rel="noopener noreferrer"
                                download
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 shadow-2xs transition cursor-pointer"
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span>Download PDF Matriks RPJMD</span>
                            </a>
                            <Link
                                href={`${route('analytics.index')}?tab=rpjmd`}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Buka Tab RPJMD di Analitik</span>
                            </Link>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsRpjmdModalOpen(false)}
                            className="w-full sm:w-auto px-4 py-1.5 text-xs font-semibold rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 shadow-2xs transition cursor-pointer"
                        >
                            Tutup
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}