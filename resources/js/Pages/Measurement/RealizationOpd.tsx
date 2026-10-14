import React, { useState, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import MeasurementNav from '@/Pages/Measurement/MeasurementNav';
import PageBreadcrumb from '@/Components/Dashboard/PageBreadcrumb';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import TablePagination from '@/Components/TablePagination';
import { Badge } from '@/Components/ui/badge';
import { Input } from '@/Components/ui/input';
import { Textarea } from '@/Components/ui/textarea';
import { Label } from '@/Components/ui/label';
import { Select2 } from '@/Components/ui/select2';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/Components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/Components/ui/alert-dialog';
import {
    Plus,
    Edit2,
    Trash2,
    Building2,
    FileSpreadsheet,
    FileDown,
    Lock,
    Search,
    TrendingUp,
    CheckCircle2,
    AlertCircle,
    XCircle,
    HelpCircle,
    Calendar,
    Target,
    Layers,
    FolderPlus,
    X,
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';

interface CalculationYear {
    target: number | null;
    realization: number | null;
    achievement: number | null;
    status: string;
    badge: string;
    bgClass: string;
}

interface IndicatorItem {
    [key: string]: any;
    id?: number | string;
    indicator: string;
    unit: string;
    measurement_pattern: 'Positif' | 'Negatif';
    targets: Record<string, any>;
    realizations: Record<string, any>;
    calculations?: Record<string, CalculationYear>;
}

interface ObjectiveFormItem {
    [key: string]: any;
    objective: string;
    indicators: IndicatorItem[];
}

interface GoalFormItem {
    id: number;
    goal: string;
    goal_indicators: IndicatorItem[];
    objectives: ObjectiveFormItem[];
}

interface OpdItem {
    id: number;
    organization_id: number;
    organization?: { id: number; name: string; code: string };
    parent_id?: number | null;
    level?: 'goal' | 'objective';
    order_no?: number;
    goal: string | null;
    goal_indicators?: IndicatorItem[] | null;
    goal_indicators_list?: IndicatorItem[];
    goal_indicator: string | null;
    goal_indicator_unit: string | null;
    goal_measurement_pattern?: 'Positif' | 'Negatif';
    goal_targets?: Record<string, number | string | null> | null;
    goal_realizations?: Record<string, number | string | null> | null;
    objective: string | null;
    indicators?: IndicatorItem[] | null;
    objective_indicators_list?: IndicatorItem[];
    objective_indicator: string | null;
    unit: string | null;
    measurement_pattern: 'Positif' | 'Negatif';
    targets: Record<string, number | string | null> | null;
    realizations: Record<string, number | string | null> | null;
    calculations: Record<string, CalculationYear>;
    children?: OpdItem[];
}

interface OrganizationOption {
    id: number;
    code: string;
    name: string;
}

interface PlanningPeriodInfo {
    id: number;
    code: string;
    name: string;
    start_date?: string;
    end_date?: string;
}

// ── Helpers: Hitung capaian + status dari target & realisasi (fallback jika backend tidak menghitung) ──
function computeAchievementFallback(
    ind: IndicatorItem,
    yr: number,
    fallbackPattern?: string
): number | null {
    // Prioritaskan dari backend
    const calcAch = ind.calculations?.[yr]?.achievement;
    if (calcAch !== null && calcAch !== undefined) return calcAch;

    // Fallback: hitung di frontend
    const tRaw = ind.targets?.[yr];
    const rRaw = ind.realizations?.[yr];
    if (
        tRaw === undefined || tRaw === null || tRaw === '' ||
        rRaw === undefined || rRaw === null || rRaw === ''
    ) return null;

    const t = Number(tRaw);
    const r = Number(rRaw);
    if (isNaN(t) || isNaN(r)) return null;

    const pol = ind.measurement_pattern || fallbackPattern || 'Positif';
    if (t === 0) return r === 0 ? 100 : 0;
    if (pol === 'Negatif') return Math.max(0, parseFloat((((2 * t - r) / t) * 100).toFixed(2)));
    return Math.max(0, parseFloat(((r / t) * 100).toFixed(2)));
}

function getStatusInfo(achievement: number | null): { status: string; bgClass: string } {
    if (achievement === null) return { status: 'Tidak Dinilai', bgClass: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300' };
    if (achievement >= 100) return { status: 'Tercapai', bgClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300' };
    if (achievement >= 50) return { status: 'Perlu Perhatian', bgClass: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300' };
    return { status: 'Kritis', bgClass: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300' };
}

interface Props {
    goals?: OpdItem[];
    items: OpdItem[];
    organizations: OrganizationOption[];
    selectedOrgId: number | null;
    years: number[];
    activeYear?: number;
    activePlanningPeriod?: PlanningPeriodInfo | null;
    activeRpjmdPeriod?: PlanningPeriodInfo | null;
    availablePlanningPeriods?: PlanningPeriodInfo[];
    availableRpjmdPeriods?: PlanningPeriodInfo[];
    canManage: boolean;
    canManageAllOpd?: boolean;
}

function OpdRealizationTrendChart({ years, items, goals }: { years: number[]; items: OpdItem[]; goals?: OpdItem[] }) {
    const trendData = useMemo(() => {
        const allIndicatorsWithPattern: { ind: IndicatorItem; pattern: string }[] = [];

        if (goals && goals.length > 0) {
            goals.forEach((g) => {
                // 1. Goal Indicators
                const goalInds = (g.goal_indicators_list && g.goal_indicators_list.length > 0)
                    ? g.goal_indicators_list
                    : [{
                        id: 1,
                        indicator: g.goal_indicator || '-',
                        unit: g.goal_indicator_unit || '%',
                        measurement_pattern: g.goal_measurement_pattern || 'Positif',
                        targets: g.goal_targets || g.targets || {},
                        realizations: g.goal_realizations || g.realizations || {},
                        calculations: g.calculations || {},
                    }];
                goalInds.forEach((gi) => {
                    allIndicatorsWithPattern.push({
                        ind: gi,
                        pattern: gi.measurement_pattern || g.goal_measurement_pattern || 'Positif',
                    });
                });

                // 2. Child Objectives Indicators
                (g.children || []).forEach((c) => {
                    const childInds = (c.objective_indicators_list && c.objective_indicators_list.length > 0)
                        ? c.objective_indicators_list
                        : (c.goal_indicators_list && c.goal_indicators_list.length > 0)
                            ? c.goal_indicators_list
                            : [{
                                id: 1,
                                indicator: c.objective_indicator || '-',
                                unit: c.unit || '%',
                                measurement_pattern: c.measurement_pattern || 'Positif',
                                targets: c.targets || {},
                                realizations: c.realizations || {},
                                calculations: c.calculations || {},
                            }];
                    childInds.forEach((ci) => {
                        allIndicatorsWithPattern.push({
                            ind: ci,
                            pattern: ci.measurement_pattern || c.measurement_pattern || 'Positif',
                        });
                    });
                });
            });
        } else if (items && items.length > 0) {
            items.forEach((it) => {
                const isGoal = it.level === 'goal';
                const indList = isGoal
                    ? (it.goal_indicators_list && it.goal_indicators_list.length > 0 ? it.goal_indicators_list : (it.objective_indicators_list || []))
                    : (it.objective_indicators_list && it.objective_indicators_list.length > 0 ? it.objective_indicators_list : (it.goal_indicators_list || []));
                const listToUse = indList.length > 0
                    ? indList
                    : [{
                        id: 1,
                        indicator: isGoal ? (it.goal_indicator || '-') : (it.objective_indicator || '-'),
                        unit: isGoal ? (it.goal_indicator_unit || '%') : (it.unit || '%'),
                        measurement_pattern: isGoal ? (it.goal_measurement_pattern || 'Positif') : (it.measurement_pattern || 'Positif'),
                        targets: it.targets || {},
                        realizations: it.realizations || {},
                        calculations: it.calculations || {},
                    }];
                listToUse.forEach((ind) => {
                    allIndicatorsWithPattern.push({
                        ind,
                        pattern: ind.measurement_pattern || it.measurement_pattern || 'Positif',
                    });
                });
            });
        }

        return years.map((yr) => {
            const validIndAchs: number[] = [];
            allIndicatorsWithPattern.forEach(({ ind, pattern }) => {
                const ach = computeAchievementFallback(ind, yr, pattern);
                if (ach !== null && ach !== undefined && !isNaN(ach)) {
                    validIndAchs.push(ach);
                }
            });

            const avg = validIndAchs.length
                ? parseFloat((validIndAchs.reduce((acc, v) => acc + v, 0) / validIndAchs.length).toFixed(1))
                : null;

            return {
                year: yr,
                achievement: avg,
                benchmark: 100,
            };
        });
    }, [items, goals, years]);

    const yrLabels = trendData.map((t) => t.year);
    const achievements = trendData.map((t) => t.achievement);
    const benchmarks = trendData.map(() => 100);

    const validAchs = achievements.filter((v): v is number => v !== null && v !== undefined);
    const maxVal = validAchs.length > 0 ? Math.max(...validAchs, 100) : 100;
    const yAxisMax = Math.min(200, Math.ceil((maxVal + 15) / 10) * 10);

    const option = {
        tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            borderColor: '#334155',
            textStyle: { color: '#ffffff', fontSize: 11 },
            formatter: (params: any) => {
                const yr = params[0]?.axisValue;
                const point = trendData.find((t) => t.year === Number(yr));
                let html = `<div style="font-weight:700;margin-bottom:4px;border-bottom:1px solid #334155;padding-bottom:3px">Tren Capaian Renstra PD - Tahun ${yr}</div>`;
                if (point?.achievement !== null && point?.achievement !== undefined) {
                    html += `<div style="display:flex;justify-content:space-between;gap:12px"><span>Rata-rata Capaian:</span><b style="color:#10b981">${point.achievement}%</b></div>`;
                    html += `<div style="display:flex;justify-content:space-between;gap:12px"><span>Benchmark:</span><b>100%</b></div>`;
                } else {
                    html += `<div style="color:#94a3b8;font-style:italic">Belum ada data realisasi</div>`;
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
        grid: { top: 24, bottom: 30, left: 10, right: 20, containLabel: true },
        xAxis: {
            type: 'category',
            data: yrLabels,
            axisLine: { lineStyle: { color: '#cbd5e1' } },
            axisLabel: { color: '#475569', fontSize: 11, fontWeight: 'bold' },
        },
        yAxis: {
            type: 'value',
            min: 0,
            max: yAxisMax,
            splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
            axisLabel: { formatter: '{value}%', color: '#64748b', fontSize: 10 },
        },
        series: [
            {
                name: 'Benchmark',
                type: 'line',
                data: benchmarks,
                lineStyle: { color: '#93c5fd', width: 2, type: 'dashed' },
                itemStyle: { color: '#60a5fa' },
                symbol: 'none',
            },
            {
                name: 'Rata-rata Capaian Realisasi (%)',
                type: 'line',
                data: achievements,
                showSymbol: true,
                symbol: 'circle',
                symbolSize: 8,
                connectNulls: true,
                lineStyle: { color: '#10b981', width: 3 },
                itemStyle: { color: '#059669', borderWidth: 2, borderColor: '#ffffff' },
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

interface IndicatorFormFieldsProps {
    indicator: IndicatorItem;
    index: number;
    total: number;
    labelPrefix?: string;
    years: number[];
    onUpdateField: (field: keyof IndicatorItem, val: any) => void;
    onUpdateTarget: (year: number | string, val: string) => void;
    onUpdateRealization: (year: number | string, val: string) => void;
    onRemove?: () => void;
    accentColor?: 'sky' | 'emerald' | 'rose';
}

function IndicatorFormFields({
    indicator,
    index,
    total,
    labelPrefix = 'Indikator',
    years,
    onUpdateField,
    onUpdateTarget,
    onUpdateRealization,
    onRemove,
    accentColor = 'sky',
}: IndicatorFormFieldsProps) {
    const isSky = accentColor === 'sky';
    const isEmerald = accentColor === 'emerald';

    return (
        <div
            className={`p-3 rounded-lg border text-xs space-y-2.5 transition-all ${
                isSky
                    ? 'bg-sky-50/40 dark:bg-sky-950/20 border-sky-200 dark:border-sky-900/60'
                    : isEmerald
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60'
                    : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
            }`}
        >
            {/* Header: Indikator #X & Remove Button */}
            <div className="flex items-center justify-between border-b pb-1.5 border-border/60">
                <span className="font-bold flex items-center gap-1.5 text-foreground">
                    <span className={`h-2 w-2 rounded-full ${isSky ? 'bg-sky-500' : isEmerald ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    {labelPrefix} #{index + 1}
                </span>
                {total > 1 && onRemove && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onRemove}
                        className="h-6 px-2 text-rose-600 hover:bg-rose-100 hover:text-rose-700 dark:text-rose-400 text-[11px] gap-1 cursor-pointer"
                        title="Hapus Indikator Ini"
                    >
                        <Trash2 className="h-3 w-3" />
                        <span>Hapus Indikator</span>
                    </Button>
                )}
            </div>

            {/* Nama Indikator, Satuan, Pola */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div className="md:col-span-6 space-y-1">
                    <Label className="text-[11px] font-semibold">
                        Nama Indikator <span className="text-destructive">*</span>
                    </Label>
                    <Input
                        value={indicator.indicator}
                        onChange={(e) => onUpdateField('indicator', e.target.value)}
                        placeholder="cth: Persentase Capaian Indikator..."
                        className="h-8 text-xs bg-background"
                        required
                    />
                </div>
                <div className="md:col-span-3 space-y-1">
                    <Label className="text-[11px] font-semibold">Satuan</Label>
                    <Input
                        value={indicator.unit}
                        onChange={(e) => onUpdateField('unit', e.target.value)}
                        placeholder="cth: %, Indeks"
                        className="h-8 text-xs bg-background"
                    />
                </div>
                <div className="md:col-span-3 space-y-1">
                    <Label className="text-[11px] font-semibold">Pola Pengukuran</Label>
                    <Select2
                        value={indicator.measurement_pattern}
                        onChange={(val) => onUpdateField('measurement_pattern', val as 'Positif' | 'Negatif')}
                        options={[
                            { value: 'Positif', label: 'Positif (Semakin ↑ baik)' },
                            { value: 'Negatif', label: 'Negatif (Semakin ↓ baik)' },
                        ]}
                    />
                </div>
            </div>

            {/* Target Multi-Tahun (Soft Blue) */}
            <div className="p-2 rounded bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/60 space-y-1">
                <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                        Target Tahunan ({years.join(', ')})
                    </span>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">
                        Titik (.) untuk desimal
                    </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5">
                    {years.map((y) => (
                        <div key={`tgt-${y}`} className="space-y-0.5">
                            <span className="text-[10px] font-mono text-muted-foreground block text-center sm:text-left">{y}</span>
                            <Input
                                type="number"
                                step="any"
                                value={indicator.targets?.[y] ?? ''}
                                onChange={(e) => onUpdateTarget(y, e.target.value)}
                                placeholder="Target"
                                className="h-7 text-xs font-mono text-right bg-background"
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Realisasi Multi-Tahun (Soft Emerald) */}
            <div className="p-2 rounded bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/60 space-y-1">
                <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Realisasi Tahunan ({years.join(', ')})
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                        Titik (.) untuk desimal
                    </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5">
                    {years.map((y) => (
                        <div key={`real-${y}`} className="space-y-0.5">
                            <span className="text-[10px] font-mono text-muted-foreground block text-center sm:text-left">{y}</span>
                            <Input
                                type="number"
                                step="any"
                                value={indicator.realizations?.[y] ?? ''}
                                onChange={(e) => onUpdateRealization(y, e.target.value)}
                                placeholder="Realisasi"
                                className="h-7 text-xs font-mono text-right bg-background"
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function RealizationOpd({
    goals: initialGoals = [],
    items = [],
    organizations = [],
    selectedOrgId,
    years = [],
    activeYear,
    activePlanningPeriod,
    activeRpjmdPeriod: propRpjmdPeriod,
    availablePlanningPeriods = [],
    availableRpjmdPeriods: propRpjmdPeriods = [],
    canManage,
    canManageAllOpd,
}: Props) {
    const isGlobalManager = Boolean(canManageAllOpd);
    const activePeriod = activePlanningPeriod ?? propRpjmdPeriod;
    const availablePeriods = availablePlanningPeriods.length > 0 ? availablePlanningPeriods : propRpjmdPeriods;

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
    const [quickAddParentGoal, setQuickAddParentGoal] = useState<OpdItem | null>(null);
    const [quickAddGoalNumber, setQuickAddGoalNumber] = useState<number>(1);
    const [editItem, setEditItem] = useState<OpdItem | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<string>('Semua');
    const [deleteItem, setDeleteItem] = useState<OpdItem | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    const [createMode, setCreateMode] = useState<'both' | 'objective'>('both');
    const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);

    const [evalYear, setEvalYear] = useState<number>(() => {
        return activeYear ?? (years?.includes(new Date().getFullYear()) ? new Date().getFullYear() : (years?.[1] ?? years?.[0] ?? 2026));
    });

    // ── Multi-Indicator Helpers ─────────────────────────────────────────────────
    const emptyIndicator = (defaultName = '', defaultUnit = '%', defaultPattern: 'Positif' | 'Negatif' = 'Positif'): IndicatorItem => {
        const t: Record<string, string> = {};
        const r: Record<string, string> = {};
        years.forEach((y) => {
            t[y] = '';
            r[y] = '';
        });
        return {
            id: Date.now() + Math.random(),
            indicator: defaultName,
            unit: defaultUnit,
            measurement_pattern: defaultPattern,
            targets: t,
            realizations: r,
        };
    };

    const emptyObjective = (): ObjectiveFormItem => ({
        objective: '',
        indicators: [emptyIndicator()],
    });

    const emptyGoal = (): GoalFormItem => ({
        id: Date.now() + Math.random(),
        goal: '',
        goal_indicators: [emptyIndicator()],
        objectives: [emptyObjective()],
    });

    const [createForm, setCreateForm] = useState({
        organization_id: selectedOrgId || (organizations[0]?.id ?? 0),
        goal: '',
        goal_indicators: [emptyIndicator()] as IndicatorItem[],
        objectives: [emptyObjective()] as ObjectiveFormItem[],
        goals: [emptyGoal()] as GoalFormItem[],
    });

    // ── Quick Add Objective State (Multi-Indicator) ──────────────────────────────
    const [quickObjective, setQuickObjective] = useState('');
    const [quickIndicators, setQuickIndicators] = useState<IndicatorItem[]>([emptyIndicator()]);
    const [processingQuick, setProcessingQuick] = useState(false);

    // ── Edit State (Multi-Indicator) ─────────────────────────────────────────────
    const [editGoal, setEditGoal] = useState('');
    const [editGoalIndicators, setEditGoalIndicators] = useState<IndicatorItem[]>([]);
    const [editObjective, setEditObjective] = useState('');
    const [editOrderNo, setEditOrderNo] = useState(1);
    const [editObjIndicators, setEditObjIndicators] = useState<IndicatorItem[]>([]);
    const [processingEdit, setProcessingEdit] = useState(false);

    // Build the hierarchical tree: use goals prop if available, or build from items
    const hierarchyGoals = useMemo(() => {
        let rawGoals: OpdItem[] = [];
        if (initialGoals && initialGoals.length > 0) {
            rawGoals = initialGoals;
        } else {
            // Fallback: group items by goal
            const goalsMap = new Map<number, OpdItem>();
            const orphanObjectives: OpdItem[] = [];

            items.forEach((it) => {
                if (it.level === 'goal') {
                    goalsMap.set(it.id, { ...it, children: [] });
                } else if (it.parent_id && goalsMap.has(it.parent_id)) {
                    goalsMap.get(it.parent_id)!.children!.push(it);
                } else {
                    orphanObjectives.push(it);
                }
            });

            // If no explicit goals, create a synthetic goal for orphans
            if (goalsMap.size === 0 && items.length > 0) {
                const synthetic: OpdItem = {
                    id: 0,
                    organization_id: selectedOrgId || 0,
                    level: 'goal',
                    goal: items[0].goal || 'Tujuan Renstra',
                    goal_indicator: items[0].goal_indicator,
                    goal_indicator_unit: items[0].goal_indicator_unit,
                    objective: null,
                    objective_indicator: null,
                    unit: null,
                    measurement_pattern: 'Positif',
                    targets: {},
                    realizations: {},
                    calculations: {},
                    children: items,
                };
                rawGoals = [synthetic];
            } else {
                rawGoals = Array.from(goalsMap.values());
            }
        }

        return rawGoals;
    }, [initialGoals, items, selectedOrgId]);

    const availableGoals = useMemo(() => {
        return hierarchyGoals.map((g, idx) => ({
            id: g.id,
            goalNo: idx + 1,
            goal: g.goal || 'Tujuan Renstra',
            label: `(${idx + 1}) ${g.goal || 'Tujuan Renstra'}`,
        }));
    }, [hierarchyGoals]);

    // Statistics calculated across goal indicators AND child objectives indicators
    const stats = useMemo(() => {
        let tercapai = 0;
        let perhatian = 0;
        let kritis = 0;
        let tidakDinilai = 0;
        const totalAchievements: number[] = [];
        let totalGoalsCount = hierarchyGoals.length;
        let totalObjectivesCount = 0;
        let totalIndikatorCount = 0;

        const processIndicator = (ind: any, fallbackCalc?: any, fallbackPol?: string) => {
            totalIndikatorCount++;
            const pattern = ind.measurement_pattern || fallbackPol || 'Positif';
            const ach = computeAchievementFallback(ind, evalYear, pattern);
            const statusInfo = getStatusInfo(ach);
            const calc = ind.calculations?.[evalYear] || fallbackCalc?.[evalYear];
            const status = calc?.status || statusInfo.status;

            if (ach !== null && ach !== undefined && !isNaN(ach)) {
                totalAchievements.push(ach);
            }
            if (status === 'Tercapai') tercapai++;
            else if (status === 'Perlu Perhatian') perhatian++;
            else if (status === 'Kritis') kritis++;
            else tidakDinilai++;
        };

        hierarchyGoals.forEach((goal) => {
            // 1. Process Goal Indicators
            const goalInds = (goal.goal_indicators_list && goal.goal_indicators_list.length > 0)
                ? goal.goal_indicators_list
                : [{
                    id: 1,
                    indicator: goal.goal_indicator || '-',
                    unit: goal.goal_indicator_unit || '%',
                    measurement_pattern: goal.goal_measurement_pattern || 'Positif',
                    targets: goal.goal_targets || goal.targets || {},
                    realizations: goal.goal_realizations || goal.realizations || {},
                    calculations: goal.calculations || {},
                }];
            goalInds.forEach((ind) => processIndicator(ind, goal.calculations, goal.goal_measurement_pattern || goal.measurement_pattern));

            // 2. Process Child Objectives Indicators
            const children = goal.children || [];
            totalObjectivesCount += children.length;

            children.forEach((child) => {
                const childInds = (child.objective_indicators_list && child.objective_indicators_list.length > 0)
                    ? child.objective_indicators_list
                    : (child.goal_indicators_list && child.goal_indicators_list.length > 0)
                        ? child.goal_indicators_list
                        : [{
                            id: 1,
                            indicator: child.objective_indicator || '-',
                            unit: child.unit || '%',
                            measurement_pattern: child.measurement_pattern || 'Positif',
                            targets: child.targets || {},
                            realizations: child.realizations || {},
                            calculations: child.calculations || {},
                        }];
                childInds.forEach((ind) => processIndicator(ind, child.calculations, child.measurement_pattern));
            });
        });

        // Fallback if no goals exist in hierarchyGoals, look at flat items
        if (hierarchyGoals.length === 0 && items.length > 0) {
            items.forEach((it) => {
                const isGoal = it.level === 'goal';
                const indList = isGoal
                    ? (it.goal_indicators_list && it.goal_indicators_list.length > 0 ? it.goal_indicators_list : (it.objective_indicators_list || []))
                    : (it.objective_indicators_list && it.objective_indicators_list.length > 0 ? it.objective_indicators_list : (it.goal_indicators_list || []));
                const listToUse = indList.length > 0
                    ? indList
                    : [{ indicator: isGoal ? (it.goal_indicator || '-') : (it.objective_indicator || '-'), unit: isGoal ? (it.goal_indicator_unit || '%') : (it.unit || '%'), targets: it.targets || {}, realizations: it.realizations || {}, calculations: it.calculations, measurement_pattern: it.measurement_pattern }];
                listToUse.forEach((ind) => processIndicator(ind, it.calculations, it.measurement_pattern));
            });
            totalObjectivesCount = items.filter((it) => it.level !== 'goal').length;
            totalGoalsCount = items.filter((it) => it.level === 'goal').length;
        }

        const avg = totalAchievements.length
            ? (totalAchievements.reduce((a, b) => a + b, 0) / totalAchievements.length).toFixed(1)
            : '0.0';

        return {
            totalGoals: totalGoalsCount,
            totalObjectives: totalObjectivesCount,
            totalIndikator: totalIndikatorCount > 0 ? totalIndikatorCount : totalObjectivesCount,
            avgAchievement: avg,
            tercapai,
            perhatian,
            kritis,
            tidakDinilai,
        };
    }, [hierarchyGoals, items, evalYear]);

    // Filter goals and their child objectives by search query and status tab
    const filteredHierarchy = useMemo(() => {
        return hierarchyGoals.map((goal, idx) => {
            const goalNo = idx + 1;
            const q = searchQuery.toLowerCase().trim();

            const rawGoalIndList = (goal.goal_indicators_list && goal.goal_indicators_list.length > 0)
                ? goal.goal_indicators_list
                : [{
                    id: 1,
                    indicator: goal.goal_indicator || '-',
                    unit: goal.goal_indicator_unit || '%',
                    measurement_pattern: goal.goal_measurement_pattern || 'Positif',
                    targets: goal.goal_targets || goal.targets || {},
                    realizations: goal.goal_realizations || goal.realizations || {},
                    calculations: goal.calculations || {},
                }];

            const goalMatchesSearch = !q || (
                (goal.goal && goal.goal.toLowerCase().includes(q)) ||
                rawGoalIndList.some((gi) => (gi.indicator && gi.indicator.toLowerCase().includes(q)) || (gi.unit && gi.unit.toLowerCase().includes(q)))
            );

            const filteredChildren = (goal.children || []).filter((child) => {
                const indList = (child.objective_indicators_list && child.objective_indicators_list.length > 0)
                    ? child.objective_indicators_list
                    : [{
                        id: 1,
                        indicator: child.objective_indicator || '-',
                        unit: child.unit || '%',
                        measurement_pattern: child.measurement_pattern || 'Positif',
                        targets: child.targets || {},
                        realizations: child.realizations || {},
                        calculations: child.calculations || {},
                    }];

                if (q) {
                    const objMatches = child.objective && child.objective.toLowerCase().includes(q);
                    const indMatches = indList.some(
                        (ind) => (ind.indicator && ind.indicator.toLowerCase().includes(q)) || (ind.unit && ind.unit.toLowerCase().includes(q))
                    );
                    if (!objMatches && !indMatches && !goalMatchesSearch) return false;
                }

                if (selectedStatus !== 'Semua') {
                    const hasStatus = indList.some((ind) => {
                        const ach = computeAchievementFallback(ind, evalYear, ind.measurement_pattern || child.measurement_pattern);
                        const st = ind.calculations?.[evalYear]?.status || getStatusInfo(ach).status;
                        return st === selectedStatus;
                    });
                    if (!hasStatus) return false;
                }

                return true;
            });

            // Check if goal's own indicators match selected status
            const goalHasMatchingStatus = rawGoalIndList.some((ind) => {
                const ach = computeAchievementFallback(ind, evalYear, ind.measurement_pattern || goal.goal_measurement_pattern);
                const st = ind.calculations?.[evalYear]?.status || getStatusInfo(ach).status;
                return st === selectedStatus;
            });

            let keepGoal = goalMatchesSearch || filteredChildren.length > 0;
            if (selectedStatus !== 'Semua') {
                keepGoal = (goalHasMatchingStatus || filteredChildren.length > 0) && (!q || goalMatchesSearch || filteredChildren.length > 0);
            }

            return {
                goal,
                goalNo,
                children: filteredChildren,
                visible: keepGoal,
            };
        }).filter((g) => g.visible);
    }, [hierarchyGoals, searchQuery, selectedStatus, evalYear]);

    // ── Pagination by Goal ───────────────────────────────────────────────────────
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const totalGoalsCount = filteredHierarchy.length;
    const lastPage = Math.max(1, Math.ceil(totalGoalsCount / perPage));
    const safeCurrentPage = Math.min(currentPage, lastPage);
    const from = totalGoalsCount > 0 ? (safeCurrentPage - 1) * perPage + 1 : 0;
    const to = totalGoalsCount > 0 ? Math.min(safeCurrentPage * perPage, totalGoalsCount) : 0;
    const paginatedGoals = filteredHierarchy.slice((safeCurrentPage - 1) * perPage, safeCurrentPage * perPage);

    // Selected organization details
    const selectedOrg = organizations.find((o) => o.id === selectedOrgId);
    const selectedOrgName = selectedOrg ? `${selectedOrg.code} - ${selectedOrg.name}` : 'Semua Perangkat Daerah';

    const handleOrgChange = (newOrgId: string | number) => {
        const cleanOrgId = typeof newOrgId === 'object' && newOrgId !== null
            ? String((newOrgId as any)?.target?.value ?? (newOrgId as any)?.[0] ?? (newOrgId as any)?.value ?? newOrgId)
            : String(newOrgId);

        router.get(
            route('measurement.realization.opd'),
            {
                organization_id: cleanOrgId,
                ...(activePeriod?.id ? { period_id: String(activePeriod.id) } : {}),
            },
            { preserveState: true }
        );
    };

    // ── Create Modal Handlers ───────────────────────────────────────────────────
    const openCreateModal = () => {
        setCreateMode('both');
        setSelectedGoalId(null);
        setCreateForm({
            organization_id: selectedOrgId || (organizations[0]?.id ?? 0),
            goal: '',
            goal_indicators: [emptyIndicator()],
            objectives: [emptyObjective()],
            goals: [emptyGoal()],
        });
        setIsCreateOpen(true);
    };

    // Goal creation helpers in multi-goal mode
    const addGoalToCreateForm = () => {
        setCreateForm((prev) => ({
            ...prev,
            goals: [...prev.goals, emptyGoal()],
        }));
    };

    const removeGoalFromCreateForm = (gIdx: number) => {
        if (createForm.goals.length <= 1) return;
        setCreateForm((prev) => ({
            ...prev,
            goals: prev.goals.filter((_, i) => i !== gIdx),
        }));
    };

    const updateGoalField = (gIdx: number, val: string) => {
        setCreateForm((prev) => {
            const next = [...prev.goals];
            next[gIdx] = { ...next[gIdx], goal: val };
            return { ...prev, goals: next };
        });
    };

    const addGoalIndicatorToGoal = (gIdx: number) => {
        setCreateForm((prev) => {
            const next = [...prev.goals];
            next[gIdx] = {
                ...next[gIdx],
                goal_indicators: [...next[gIdx].goal_indicators, emptyIndicator()],
            };
            return { ...prev, goals: next };
        });
    };

    const removeGoalIndicatorFromGoal = (gIdx: number, indIdx: number) => {
        setCreateForm((prev) => {
            const next = [...prev.goals];
            if (next[gIdx].goal_indicators.length <= 1) return prev;
            next[gIdx] = {
                ...next[gIdx],
                goal_indicators: next[gIdx].goal_indicators.filter((_, i) => i !== indIdx),
            };
            return { ...prev, goals: next };
        });
    };

    const updateGoalIndicatorField = (gIdx: number, indIdx: number, field: keyof IndicatorItem, val: any) => {
        setCreateForm((prev) => {
            const next = [...prev.goals];
            const nextInds = [...next[gIdx].goal_indicators];
            nextInds[indIdx] = { ...nextInds[indIdx], [field]: val };
            next[gIdx] = { ...next[gIdx], goal_indicators: nextInds };
            return { ...prev, goals: next };
        });
    };

    const updateGoalIndicatorTarget = (gIdx: number, indIdx: number, yr: number | string, val: string) => {
        setCreateForm((prev) => {
            const next = [...prev.goals];
            const nextInds = [...next[gIdx].goal_indicators];
            nextInds[indIdx] = {
                ...nextInds[indIdx],
                targets: { ...nextInds[indIdx].targets, [yr]: val },
            };
            next[gIdx] = { ...next[gIdx], goal_indicators: nextInds };
            return { ...prev, goals: next };
        });
    };

    const updateGoalIndicatorRealization = (gIdx: number, indIdx: number, yr: number | string, val: string) => {
        setCreateForm((prev) => {
            const next = [...prev.goals];
            const nextInds = [...next[gIdx].goal_indicators];
            nextInds[indIdx] = {
                ...nextInds[indIdx],
                realizations: { ...nextInds[indIdx].realizations, [yr]: val },
            };
            next[gIdx] = { ...next[gIdx], goal_indicators: nextInds };
            return { ...prev, goals: next };
        });
    };

    const addObjectiveToGoal = (gIdx: number) => {
        setCreateForm((prev) => {
            const next = [...prev.goals];
            next[gIdx] = {
                ...next[gIdx],
                objectives: [...next[gIdx].objectives, emptyObjective()],
            };
            return { ...prev, goals: next };
        });
    };

    const removeObjectiveFromGoal = (gIdx: number, objIdx: number) => {
        setCreateForm((prev) => {
            const next = [...prev.goals];
            if (next[gIdx].objectives.length <= 1) return prev;
            next[gIdx] = {
                ...next[gIdx],
                objectives: next[gIdx].objectives.filter((_, i) => i !== objIdx),
            };
            return { ...prev, goals: next };
        });
    };

    const updateObjectiveFieldInGoal = (gIdx: number, objIdx: number, field: string, val: any) => {
        setCreateForm((prev) => {
            const next = [...prev.goals];
            const nextObjs = [...next[gIdx].objectives];
            nextObjs[objIdx] = { ...nextObjs[objIdx], [field]: val };
            next[gIdx] = { ...next[gIdx], objectives: nextObjs };
            return { ...prev, goals: next };
        });
    };

    const addIndicatorToObjectiveInGoal = (gIdx: number, objIdx: number) => {
        setCreateForm((prev) => {
            const next = [...prev.goals];
            const nextObjs = [...next[gIdx].objectives];
            nextObjs[objIdx] = {
                ...nextObjs[objIdx],
                indicators: [...nextObjs[objIdx].indicators, emptyIndicator()],
            };
            next[gIdx] = { ...next[gIdx], objectives: nextObjs };
            return { ...prev, goals: next };
        });
    };

    const removeIndicatorFromObjectiveInGoal = (gIdx: number, objIdx: number, indIdx: number) => {
        setCreateForm((prev) => {
            const next = [...prev.goals];
            const nextObjs = [...next[gIdx].objectives];
            if (nextObjs[objIdx].indicators.length <= 1) return prev;
            nextObjs[objIdx] = {
                ...nextObjs[objIdx],
                indicators: nextObjs[objIdx].indicators.filter((_, i) => i !== indIdx),
            };
            next[gIdx] = { ...next[gIdx], objectives: nextObjs };
            return { ...prev, goals: next };
        });
    };

    const updateIndicatorInObjectiveInGoal = (gIdx: number, objIdx: number, indIdx: number, field: keyof IndicatorItem, val: any) => {
        setCreateForm((prev) => {
            const next = [...prev.goals];
            const nextObjs = [...next[gIdx].objectives];
            const nextInds = [...nextObjs[objIdx].indicators];
            nextInds[indIdx] = { ...nextInds[indIdx], [field]: val };
            nextObjs[objIdx] = { ...nextObjs[objIdx], indicators: nextInds };
            next[gIdx] = { ...next[gIdx], objectives: nextObjs };
            return { ...prev, goals: next };
        });
    };

    const updateIndicatorTargetInObjectiveInGoal = (gIdx: number, objIdx: number, indIdx: number, yr: number | string, val: string) => {
        setCreateForm((prev) => {
            const next = [...prev.goals];
            const nextObjs = [...next[gIdx].objectives];
            const nextInds = [...nextObjs[objIdx].indicators];
            nextInds[indIdx] = {
                ...nextInds[indIdx],
                targets: { ...nextInds[indIdx].targets, [yr]: val },
            };
            nextObjs[objIdx] = { ...nextObjs[objIdx], indicators: nextInds };
            next[gIdx] = { ...next[gIdx], objectives: nextObjs };
            return { ...prev, goals: next };
        });
    };

    const updateIndicatorRealizationInObjectiveInGoal = (gIdx: number, objIdx: number, indIdx: number, yr: number | string, val: string) => {
        setCreateForm((prev) => {
            const next = [...prev.goals];
            const nextObjs = [...next[gIdx].objectives];
            const nextInds = [...nextObjs[objIdx].indicators];
            nextInds[indIdx] = {
                ...nextInds[indIdx],
                realizations: { ...nextInds[indIdx].realizations, [yr]: val },
            };
            nextObjs[objIdx] = { ...nextObjs[objIdx], indicators: nextInds };
            next[gIdx] = { ...next[gIdx], objectives: nextObjs };
            return { ...prev, goals: next };
        });
    };

    // Mode objective helpers (for adding to existing goal)
    const addObjectiveToCreateForm = () => {
        setCreateForm((prev) => ({
            ...prev,
            objectives: [...prev.objectives, emptyObjective()],
        }));
    };

    const removeObjectiveFromCreateForm = (index: number) => {
        if (createForm.objectives.length <= 1) return;
        setCreateForm((prev) => ({
            ...prev,
            objectives: prev.objectives.filter((_, i) => i !== index),
        }));
    };

    const updateObjectiveField = (index: number, val: string) => {
        setCreateForm((prev) => {
            const next = [...prev.objectives];
            next[index] = { ...next[index], objective: val };
            return { ...prev, objectives: next };
        });
    };

    const addIndicatorToObjective = (objIdx: number) => {
        setCreateForm((prev) => {
            const next = [...prev.objectives];
            next[objIdx] = {
                ...next[objIdx],
                indicators: [...next[objIdx].indicators, emptyIndicator()],
            };
            return { ...prev, objectives: next };
        });
    };

    const removeIndicatorFromObjective = (objIdx: number, indIdx: number) => {
        setCreateForm((prev) => {
            const next = [...prev.objectives];
            if (next[objIdx].indicators.length <= 1) return prev;
            next[objIdx] = {
                ...next[objIdx],
                indicators: next[objIdx].indicators.filter((_, i) => i !== indIdx),
            };
            return { ...prev, objectives: next };
        });
    };

    const updateIndicatorField = (objIdx: number, indIdx: number, field: keyof IndicatorItem, val: any) => {
        setCreateForm((prev) => {
            const next = [...prev.objectives];
            const nextInds = [...next[objIdx].indicators];
            nextInds[indIdx] = { ...nextInds[indIdx], [field]: val };
            next[objIdx] = { ...next[objIdx], indicators: nextInds };
            return { ...prev, objectives: next };
        });
    };

    const updateIndicatorTarget = (objIdx: number, indIdx: number, yr: number | string, val: string) => {
        setCreateForm((prev) => {
            const next = [...prev.objectives];
            const nextInds = [...next[objIdx].indicators];
            nextInds[indIdx] = {
                ...nextInds[indIdx],
                targets: { ...nextInds[indIdx].targets, [yr]: val },
            };
            next[objIdx] = { ...next[objIdx], indicators: nextInds };
            return { ...prev, objectives: next };
        });
    };

    const updateIndicatorRealization = (objIdx: number, indIdx: number, yr: number | string, val: string) => {
        setCreateForm((prev) => {
            const next = [...prev.objectives];
            const nextInds = [...next[objIdx].indicators];
            nextInds[indIdx] = {
                ...nextInds[indIdx],
                realizations: { ...nextInds[indIdx].realizations, [yr]: val },
            };
            next[objIdx] = { ...next[objIdx], indicators: nextInds };
            return { ...prev, objectives: next };
        });
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const targetOrgId = createForm.organization_id || selectedOrgId || organizations[0]?.id;

        if (createMode === 'objective') {
            if (!selectedGoalId) {
                alert('Pilih Tujuan Renstra Induk terlebih dahulu.');
                return;
            }
            router.post(route('measurement.realization.opd.store'), {
                mode: 'objective',
                organization_id: targetOrgId,
                parent_id: selectedGoalId,
                objectives: createForm.objectives.map((obj, i) => ({
                    order_no: i + 1,
                    objective: obj.objective,
                    indicators: obj.indicators,
                })),
            } as any, {
                onSuccess: () => {
                    setIsCreateOpen(false);
                },
            });
            return;
        }

        const firstGoal = createForm.goals[0];

        router.post(route('measurement.realization.opd.store'), {
            mode: 'both',
            organization_id: targetOrgId,
            goals: createForm.goals.map((g) => ({
                goal: g.goal,
                goal_indicators: g.goal_indicators,
                objectives: g.objectives.map((obj, i) => ({
                    order_no: i + 1,
                    objective: obj.objective,
                    indicators: obj.indicators,
                })),
            })),
            // Legacy fallbacks:
            goal: firstGoal?.goal || '',
            goal_indicators: firstGoal?.goal_indicators || [],
            objectives: firstGoal?.objectives.map((obj, i) => ({
                order_no: i + 1,
                objective: obj.objective,
                indicators: obj.indicators,
            })) || [],
        } as any, {
            onSuccess: () => {
                setIsCreateOpen(false);
            },
        });
    };

    // ── Quick Add Child Objective Handlers ─────────────────────────────────────
    const openQuickAddModal = (goal: OpdItem, goalNo: number) => {
        setQuickAddParentGoal(goal);
        setQuickAddGoalNumber(goalNo);
        setQuickObjective('');
        setQuickIndicators([emptyIndicator()]);
        setIsQuickAddOpen(true);
    };

    const addQuickIndicator = () => {
        setQuickIndicators((prev) => [...prev, emptyIndicator()]);
    };

    const removeQuickIndicator = (index: number) => {
        if (quickIndicators.length <= 1) return;
        setQuickIndicators((prev) => prev.filter((_, i) => i !== index));
    };

    const updateQuickIndicatorField = (index: number, field: keyof IndicatorItem, val: any) => {
        setQuickIndicators((prev) => {
            const copy = [...prev];
            copy[index] = { ...copy[index], [field]: val };
            return copy;
        });
    };

    const updateQuickIndicatorTarget = (indIndex: number, year: number | string, val: string) => {
        setQuickIndicators((prev) => {
            const copy = [...prev];
            copy[indIndex] = {
                ...copy[indIndex],
                targets: { ...copy[indIndex].targets, [year]: val },
            };
            return copy;
        });
    };

    const updateQuickIndicatorRealization = (indIndex: number, year: number | string, val: string) => {
        setQuickIndicators((prev) => {
            const copy = [...prev];
            copy[indIndex] = {
                ...copy[indIndex],
                realizations: { ...copy[indIndex].realizations, [year]: val },
            };
            return copy;
        });
    };

    const handleQuickAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!quickAddParentGoal) return;
        setProcessingQuick(true);
        router.post(
            route('measurement.realization.opd.store'),
            {
                mode: 'objective',
                organization_id: quickAddParentGoal.organization_id || selectedOrgId,
                parent_id: quickAddParentGoal.id,
                objective: quickObjective,
                indicators: quickIndicators,
            } as any,
            {
                onSuccess: () => {
                    setIsQuickAddOpen(false);
                    setQuickAddParentGoal(null);
                    setQuickObjective('');
                    setQuickIndicators([emptyIndicator()]);
                    setProcessingQuick(false);
                },
                onError: () => {
                    setProcessingQuick(false);
                },
            }
        );
    };

    // ── Edit Modal Handlers ────────────────────────────────────────────────────
    const openEditModal = (item: OpdItem) => {
        setEditItem(item);
        if (item.level === 'goal') {
            setEditGoal(item.goal || '');
            const gInds = (item.goal_indicators_list && item.goal_indicators_list.length > 0)
                ? item.goal_indicators_list.map((gi) => {
                    const t: Record<string, string> = {};
                    const r: Record<string, string> = {};
                    years.forEach((y) => {
                        t[y] = gi.targets?.[y] !== undefined && gi.targets?.[y] !== null ? String(gi.targets[y]) : '';
                        r[y] = gi.realizations?.[y] !== undefined && gi.realizations?.[y] !== null ? String(gi.realizations[y]) : '';
                    });
                    return {
                        id: gi.id,
                        indicator: gi.indicator || '',
                        unit: gi.unit || '%',
                        measurement_pattern: (gi.measurement_pattern as 'Positif' | 'Negatif') || 'Positif',
                        targets: t,
                        realizations: r,
                    };
                })
                : [emptyIndicator()];
            setEditGoalIndicators(gInds);
        } else {
            setEditObjective(item.objective || '');
            setEditOrderNo(item.order_no || 1);
            const oInds = (item.objective_indicators_list && item.objective_indicators_list.length > 0)
                ? item.objective_indicators_list.map((oi) => {
                    const t: Record<string, string> = {};
                    const r: Record<string, string> = {};
                    years.forEach((y) => {
                        t[y] = oi.targets?.[y] !== undefined && oi.targets?.[y] !== null ? String(oi.targets[y]) : '';
                        r[y] = oi.realizations?.[y] !== undefined && oi.realizations?.[y] !== null ? String(oi.realizations[y]) : '';
                    });
                    return {
                        id: oi.id,
                        indicator: oi.indicator || '',
                        unit: oi.unit || '%',
                        measurement_pattern: (oi.measurement_pattern as 'Positif' | 'Negatif') || 'Positif',
                        targets: t,
                        realizations: r,
                    };
                })
                : [emptyIndicator()];
            setEditObjIndicators(oInds);
        }
    };

    // Goal indicator edit helpers
    const addEditGoalIndicator = () => {
        setEditGoalIndicators((prev) => [...prev, emptyIndicator()]);
    };
    const removeEditGoalIndicator = (index: number) => {
        if (editGoalIndicators.length <= 1) return;
        setEditGoalIndicators((prev) => prev.filter((_, i) => i !== index));
    };
    const updateEditGoalIndicatorField = (index: number, field: keyof IndicatorItem, val: any) => {
        setEditGoalIndicators((prev) => {
            const copy = [...prev];
            copy[index] = { ...copy[index], [field]: val };
            return copy;
        });
    };
    const updateEditGoalIndicatorTarget = (indIndex: number, year: number | string, val: string) => {
        setEditGoalIndicators((prev) => {
            const copy = [...prev];
            copy[indIndex] = {
                ...copy[indIndex],
                targets: { ...copy[indIndex].targets, [year]: val },
            };
            return copy;
        });
    };
    const updateEditGoalIndicatorRealization = (indIndex: number, year: number | string, val: string) => {
        setEditGoalIndicators((prev) => {
            const copy = [...prev];
            copy[indIndex] = {
                ...copy[indIndex],
                realizations: { ...copy[indIndex].realizations, [year]: val },
            };
            return copy;
        });
    };

    // Objective indicator edit helpers
    const addEditObjIndicator = () => {
        setEditObjIndicators((prev) => [...prev, emptyIndicator()]);
    };
    const removeEditObjIndicator = (index: number) => {
        if (editObjIndicators.length <= 1) return;
        setEditObjIndicators((prev) => prev.filter((_, i) => i !== index));
    };
    const updateEditObjIndicatorField = (index: number, field: keyof IndicatorItem, val: any) => {
        setEditObjIndicators((prev) => {
            const copy = [...prev];
            copy[index] = { ...copy[index], [field]: val };
            return copy;
        });
    };
    const updateEditObjIndicatorTarget = (indIndex: number, year: number | string, val: string) => {
        setEditObjIndicators((prev) => {
            const copy = [...prev];
            copy[indIndex] = {
                ...copy[indIndex],
                targets: { ...copy[indIndex].targets, [year]: val },
            };
            return copy;
        });
    };
    const updateEditObjIndicatorRealization = (indIndex: number, year: number | string, val: string) => {
        setEditObjIndicators((prev) => {
            const copy = [...prev];
            copy[indIndex] = {
                ...copy[indIndex],
                realizations: { ...copy[indIndex].realizations, [year]: val },
            };
            return copy;
        });
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editItem) return;
        setProcessingEdit(true);

        const payload: Record<string, any> = {};
        if (editItem.level === 'goal') {
            payload.goal = editGoal;
            payload.goal_indicators = editGoalIndicators;
        } else {
            payload.objective = editObjective;
            payload.order_no = editOrderNo;
            payload.indicators = editObjIndicators;
        }

        router.put(
            route('measurement.realization.opd.update', editItem.id),
            payload as any,
            {
                onSuccess: () => {
                    setEditItem(null);
                    setProcessingEdit(false);
                },
                onError: () => {
                    setProcessingEdit(false);
                },
            }
        );
    };

    // ── Delete Handlers ────────────────────────────────────────────────────────
    const promptDelete = (item: OpdItem) => {
        setDeleteItem(item);
        setIsDeleteOpen(true);
    };

    const confirmDelete = () => {
        if (!deleteItem) return;
        router.delete(route('measurement.realization.opd.destroy', deleteItem.id), {
            onSuccess: () => {
                setIsDeleteOpen(false);
                setDeleteItem(null);
            },
        });
    };

    const exportPdfUrl = route('measurement.realization.opd.export-pdf', {
        organization_id: selectedOrgId ?? undefined,
        period_id: activePeriod?.id ?? undefined,
        year: evalYear,
    });

    return (
        <AuthenticatedLayout>
            <Head title="Realisasi Kinerja (Perangkat Daerah)" />

            <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-full print:p-0 space-y-4">
                <div className="print:hidden">
                    <PageBreadcrumb items={[
                        { label: 'Pengukuran' },
                        { label: 'Realisasi Kinerja Perangkat Daerah' },
                    ]} className="mb-4" />
                    <MeasurementNav activeTab="opd" canManageAllOpd={isGlobalManager} exportPdfUrl={exportPdfUrl} />
                </div>

                {/* OPD Selector & Evaluation Year Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4 p-3 rounded-xl bg-card border border-border/80 shadow-xs print:hidden">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-primary shrink-0" />
                            <Label className="text-xs font-semibold text-muted-foreground shrink-0">Perangkat Daerah:</Label>
                            <div className="w-64 sm:w-80">
                                <Select2
                                    value={String(selectedOrgId ?? '')}
                                    onChange={(val) => handleOrgChange(val)}
                                    options={organizations.map((org) => ({
                                        value: String(org.id),
                                        label: `${org.code} - ${org.name}`,
                                    }))}
                                    placeholder="Pilih Perangkat Daerah..."
                                    searchPlaceholder="Cari OPD..."
                                />
                            </div>
                        </div>

                        <div className="h-5 w-px bg-border/80 hidden sm:block" />

                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 ml-1">
                                <Calendar className="h-3.5 w-3.5 text-primary" />
                                Tahun Evaluasi:
                            </span>
                            <div className="inline-flex flex-wrap items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/60">
                                {years.map((yr) => {
                                    const isSelected = evalYear === yr;
                                    return (
                                        <button
                                            key={yr}
                                            type="button"
                                            onClick={() => setEvalYear(yr)}
                                            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                                                isSelected
                                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                                    : 'text-muted-foreground hover:text-foreground hover:bg-background/80'
                                            }`}
                                        >
                                            {yr}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="text-xs text-muted-foreground px-2">
                        Status kartu &amp; filter tabel merekap capaian untuk tahun: <span className="text-primary font-bold">{evalYear}</span>
                    </div>
                </div>

                {/* 8 EXECUTIVE SUMMARY CARDS */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 mb-5 print:hidden">
                    {/* Card 1: Total Tujuan */}
                    <div className="border border-border/70 rounded-xl bg-card p-3 shadow-xs flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Tujuan Renstra</p>
                            <Layers className="h-4 w-4 text-sky-500" />
                        </div>
                        <p className="text-2xl font-black tracking-tight text-foreground mt-1">{stats.totalGoals}</p>
                        <span className="text-[10px] text-muted-foreground">Tujuan Renstra PD</span>
                    </div>

                    {/* Card 2: Total Sasaran */}
                    <div className="border border-border/70 rounded-xl bg-card p-3 shadow-xs flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Sasaran Renstra</p>
                            <Target className="h-4 w-4 text-emerald-600" />
                        </div>
                        <p className="text-2xl font-black tracking-tight text-foreground mt-1">{stats.totalObjectives}</p>
                        <span className="text-[10px] text-muted-foreground">Sub-Sasaran Renstra</span>
                    </div>

                    {/* Card 3: Total Indikator */}
                    <button
                        type="button"
                        onClick={() => setSelectedStatus('Semua')}
                        className={`border rounded-xl p-3 text-left transition cursor-pointer flex flex-col justify-between ${
                            selectedStatus === 'Semua'
                                ? 'border-primary ring-2 ring-primary/30 bg-primary/5'
                                : 'border-border/70 bg-card hover:bg-muted/40'
                        }`}
                        title="Klik untuk tampilkan semua indikator"
                    >
                        <div className="flex items-center justify-between w-full">
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Indikator</p>
                            <FileSpreadsheet className="h-4 w-4 text-primary" />
                        </div>
                        <p className="text-2xl font-black tracking-tight text-foreground mt-1">{stats.totalIndikator}</p>
                        <span className="text-[10px] text-primary font-medium">Semua Indikator</span>
                    </button>

                    {/* Card 4: Rata-rata Capaian */}
                    <div className="border border-border/70 rounded-xl bg-card p-3 shadow-xs flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Rata Capaian</p>
                            <TrendingUp className="h-4 w-4 text-blue-600" />
                        </div>
                        <p className="text-2xl font-black tracking-tight text-foreground mt-1">{stats.avgAchievement}%</p>
                        <span className="text-[10px] text-blue-600 font-medium">Tahun {evalYear}</span>
                    </div>

                    {/* Card 5: Tercapai */}
                    <button
                        type="button"
                        onClick={() => setSelectedStatus(selectedStatus === 'Tercapai' ? 'Semua' : 'Tercapai')}
                        className={`border rounded-xl p-3 text-left transition cursor-pointer flex flex-col justify-between ${
                            selectedStatus === 'Tercapai'
                                ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-100/60 dark:bg-emerald-950/40'
                                : 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-100/30'
                        }`}
                        title="Klik untuk filter data Tercapai"
                    >
                        <div className="flex items-center justify-between w-full">
                            <p className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide">Tercapai</p>
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        </div>
                        <p className="text-2xl font-black tracking-tight text-emerald-700 dark:text-emerald-300 mt-1">{stats.tercapai}</p>
                        <span className="text-[10px] text-emerald-600 font-medium">&ge; 100% • Th {evalYear}</span>
                    </button>

                    {/* Card 6: Perlu Perhatian */}
                    <button
                        type="button"
                        onClick={() => setSelectedStatus(selectedStatus === 'Perlu Perhatian' ? 'Semua' : 'Perlu Perhatian')}
                        className={`border rounded-xl p-3 text-left transition cursor-pointer flex flex-col justify-between ${
                            selectedStatus === 'Perlu Perhatian'
                                ? 'border-amber-500 ring-2 ring-amber-500/30 bg-amber-100/60 dark:bg-amber-950/40'
                                : 'border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-100/30'
                        }`}
                        title="Klik untuk filter data Perlu Perhatian"
                    >
                        <div className="flex items-center justify-between w-full">
                            <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wide">Perhatian</p>
                            <AlertCircle className="h-4 w-4 text-amber-600" />
                        </div>
                        <p className="text-2xl font-black tracking-tight text-amber-700 dark:text-amber-300 mt-1">{stats.perhatian}</p>
                        <span className="text-[10px] text-amber-600 font-medium">50%–99% • Th {evalYear}</span>
                    </button>

                    {/* Card 7: Kritis */}
                    <button
                        type="button"
                        onClick={() => setSelectedStatus(selectedStatus === 'Kritis' ? 'Semua' : 'Kritis')}
                        className={`border rounded-xl p-3 text-left transition cursor-pointer flex flex-col justify-between ${
                            selectedStatus === 'Kritis'
                                ? 'border-rose-500 ring-2 ring-rose-500/30 bg-rose-100/60 dark:bg-rose-950/40'
                                : 'border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-100/30'
                        }`}
                        title="Klik untuk filter data Kritis"
                    >
                        <div className="flex items-center justify-between w-full">
                            <p className="text-[11px] font-semibold text-rose-800 dark:text-rose-300 uppercase tracking-wide">Kritis</p>
                            <XCircle className="h-4 w-4 text-rose-600" />
                        </div>
                        <p className="text-2xl font-black tracking-tight text-rose-700 dark:text-rose-300 mt-1">{stats.kritis}</p>
                        <span className="text-[10px] text-rose-600 font-medium">&lt; 50% • Th {evalYear}</span>
                    </button>

                    {/* Card 8: Tidak Dinilai */}
                    <button
                        type="button"
                        onClick={() => setSelectedStatus(selectedStatus === 'Tidak Dinilai' ? 'Semua' : 'Tidak Dinilai')}
                        className={`border rounded-xl p-3 text-left transition cursor-pointer flex flex-col justify-between ${
                            selectedStatus === 'Tidak Dinilai'
                                ? 'border-slate-500 ring-2 ring-slate-500/30 bg-slate-100/70 dark:bg-slate-800/80'
                                : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30 hover:bg-slate-100/40'
                        }`}
                        title="Klik untuk filter data Tidak Dinilai"
                    >
                        <div className="flex items-center justify-between w-full">
                            <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Tidak Dinilai</p>
                            <HelpCircle className="h-4 w-4 text-slate-500" />
                        </div>
                        <p className="text-2xl font-black tracking-tight text-slate-700 dark:text-slate-300 mt-1">{stats.tidakDinilai}</p>
                        <span className="text-[10px] text-slate-500 font-medium">Target=0 &amp; Real=0</span>
                    </button>
                </div>

                {/* Trend Chart Card */}
                <Card className="border border-border shadow-xs mb-5 bg-card print:hidden">
                    <CardHeader className="p-4 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b">
                        <div>
                            <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-emerald-600" />
                                <span>Grafik Tren Capaian Renstra Perangkat Daerah ({years.length > 0 ? `${years[0]}–${years[years.length - 1]}` : '2026–2030'})</span>
                            </CardTitle>
                            <CardDescription className="text-xs text-muted-foreground mt-0.5">
                                Pergerakan rata-rata capaian realisasi sasaran PD terhadap garis Benchmark (100%)
                            </CardDescription>
                        </div>
                        <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 dark:bg-blue-950/50 dark:text-blue-300 px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-800 self-start sm:self-auto">
                            Benchmark: 100%
                        </span>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                        <OpdRealizationTrendChart years={years} items={items} goals={hierarchyGoals} />
                    </CardContent>
                </Card>

                {/* Main Card */}
                <Card className="border border-border shadow-sm overflow-hidden">
                    <CardHeader className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 p-4 bg-card border-b">
                        <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                                    <Building2 className="h-5 w-5 text-primary shrink-0" />
                                    <span>Realisasi Kinerja Perangkat Daerah (PD)</span>
                                </CardTitle>
                                <Badge variant="secondary" className="bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800 text-[11px] font-semibold">
                                    Pengampu: Masing-masing PD
                                </Badge>
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-300 text-[11px] font-semibold">
                                    Struktur Berjenjang 1:N
                                </Badge>
                                {activePeriod && (
                                    <Badge variant="outline" className="border-blue-500/60 bg-blue-50/50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300 text-xs font-normal">
                                        Periode: {activePeriod.name}
                                    </Badge>
                                )}
                            </div>
                            <CardDescription className="text-xs text-muted-foreground mt-0.5">
                                Matriks realisasi dan evaluasi Renstra berjenjang (1 Tujuan Renstra mengayomi banyak Sasaran) untuk {selectedOrgName}.
                            </CardDescription>
                        </div>

                        {/* Search & Action Controls */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full lg:w-auto print:hidden">
                            {availablePeriods.length > 1 && (
                                <div className="w-48 sm:w-56 shrink-0">
                                    <Select2
                                        value={activePeriod?.id ?? ''}
                                        onChange={(val) => {
                                            const cleanPeriodId = typeof val === 'object' && val !== null
                                                ? String((val as any)?.target?.value ?? (val as any)?.[0] ?? val)
                                                : String(val);
                                            router.get(
                                                route('measurement.realization.opd'),
                                                {
                                                    organization_id: selectedOrgId ? String(selectedOrgId) : undefined,
                                                    period_id: cleanPeriodId,
                                                },
                                                { preserveState: true, preserveScroll: true }
                                            );
                                        }}
                                        options={availablePeriods.map((p) => ({
                                            value: p.id,
                                            label: p.name,
                                        }))}
                                        placeholder="Pilih Periode..."
                                    />
                                </div>
                            )}

                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <div className="relative flex-1 sm:w-64">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Cari tujuan, sasaran, indikator..."
                                        className="h-8 pl-8 text-xs w-full bg-background"
                                    />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>

                                <a
                                    href={exportPdfUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 text-xs font-medium transition-colors shrink-0"
                                    title="Download PDF Laporan Realisasi Kinerja PD"
                                >
                                    <FileDown className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">Download PDF</span>
                                    <span className="sm:hidden">PDF</span>
                                </a>

                                {canManage ? (
                                    <Button onClick={openCreateModal} size="sm" className="h-8 gap-1.5 text-xs font-medium shrink-0 whitespace-nowrap bg-primary hover:bg-primary/90">
                                        <Plus className="h-3.5 w-3.5" />
                                        <span>Tambah Tujuan &amp; Sasaran</span>
                                    </Button>
                                ) : (
                                    <Badge
                                        variant="outline"
                                        className="h-8 text-xs text-muted-foreground gap-1.5 px-2.5 shrink-0 whitespace-nowrap bg-muted/30 border-dashed"
                                        title="Akun Anda hanya memiliki hak akses Mode Baca untuk OPD ini."
                                    >
                                        <Lock className="h-3.5 w-3.5" />
                                        <span>Mode Baca</span>
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </CardHeader>

                    {/* Status Tabs Filter */}
                    <div className="flex flex-wrap items-center gap-1.5 p-2.5 sm:px-4 bg-muted/30 border-b border-border/60 print:hidden">
                        <span className="text-xs font-semibold text-muted-foreground mr-1">Filter Status:</span>
                        <Button
                            type="button"
                            variant={selectedStatus === 'Semua' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedStatus('Semua')}
                            className="h-7 text-xs px-2.5"
                        >
                            Semua ({stats.totalIndikator})
                        </Button>
                        <Button
                            type="button"
                            variant={selectedStatus === 'Tercapai' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedStatus('Tercapai')}
                            className={`h-7 text-xs px-2.5 ${
                                selectedStatus === 'Tercapai'
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    : 'text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-300 dark:border-emerald-800'
                            }`}
                        >
                            🟢 Tercapai ({stats.tercapai})
                        </Button>
                        <Button
                            type="button"
                            variant={selectedStatus === 'Perlu Perhatian' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedStatus('Perlu Perhatian')}
                            className={`h-7 text-xs px-2.5 ${
                                selectedStatus === 'Perlu Perhatian'
                                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                    : 'text-amber-700 border-amber-300 hover:bg-amber-50 dark:text-amber-300 dark:border-amber-800'
                            }`}
                        >
                            🟡 Perlu Perhatian ({stats.perhatian})
                        </Button>
                        <Button
                            type="button"
                            variant={selectedStatus === 'Kritis' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedStatus('Kritis')}
                            className={`h-7 text-xs px-2.5 ${
                                selectedStatus === 'Kritis'
                                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                    : 'text-rose-700 border-rose-300 hover:bg-rose-50 dark:text-rose-300 dark:border-rose-800'
                            }`}
                        >
                            🔴 Kritis ({stats.kritis})
                        </Button>
                        <Button
                            type="button"
                            variant={selectedStatus === 'Tidak Dinilai' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedStatus('Tidak Dinilai')}
                            className={`h-7 text-xs px-2.5 ${
                                selectedStatus === 'Tidak Dinilai'
                                    ? 'bg-slate-600 hover:bg-slate-700 text-white'
                                    : 'text-slate-700 border-slate-300 hover:bg-slate-100 dark:text-slate-300 dark:border-slate-700'
                            }`}
                        >
                            ⚪ Tidak Dinilai ({stats.tidakDinilai})
                        </Button>
                    </div>

                    <CardContent className="p-0">
                        {/* Scroll Container with sticky header */}
                        <div className="overflow-x-auto max-h-[75vh] relative scrollbar-thin border-b">
                            <table className="w-full text-xs border-separate border-spacing-0 text-left">
                                <thead>
                                    {/* Header Baris 1 */}
                                    <tr className="font-bold text-center select-none">
                                        <th
                                            rowSpan={2}
                                            className="sticky top-0 md:left-0 z-40 w-[60px] min-w-[60px] max-w-[60px] px-2 py-2 border-b border-r border-border bg-sky-100 text-sky-950 dark:bg-sky-950 dark:text-sky-100 text-center select-none md:shadow-[1px_0_0_0_rgba(0,0,0,0.1)]"
                                        >
                                            NO
                                        </th>
                                        <th
                                            rowSpan={2}
                                            className="sticky top-0 md:left-[60px] z-40 w-[220px] min-w-[220px] max-w-[220px] px-3 py-2 border-b border-r border-border bg-sky-100 text-sky-950 dark:bg-sky-950 dark:text-sky-100 text-center select-none md:shadow-[3px_0_6px_-2px_rgba(0,0,0,0.15)]"
                                            title="Tujuan Renstra / Uraian Kinerja Renstra"
                                        >
                                            TUJUAN RENSTRA
                                        </th>
                                        <th rowSpan={2} className="sticky top-0 z-30 px-3 py-2 border-b border-r border-border bg-sky-100/95 text-sky-950 dark:bg-sky-950/80 dark:text-sky-100 min-w-[180px] text-center select-none">
                                            INDIKATOR TUJUAN
                                        </th>
                                        <th rowSpan={2} className="sticky top-0 z-30 px-2 py-2 border-b border-r border-border bg-sky-100/95 text-sky-950 dark:bg-sky-950/80 dark:text-sky-100 min-w-[65px] text-center select-none" title="Satuan Indikator Tujuan">
                                            SATUAN
                                        </th>
                                        <th
                                            rowSpan={2}
                                            className="sticky top-0 z-30 w-[220px] min-w-[220px] max-w-[220px] px-3 py-2 border-b border-r border-border bg-sky-100/95 text-sky-950 dark:bg-sky-950/80 dark:text-sky-100 text-left font-bold select-none"
                                        >
                                            SASARAN RENSTRA
                                        </th>
                                        <th rowSpan={2} className="sticky top-0 z-30 px-3 py-2 border-b border-r border-border bg-sky-100/95 text-sky-950 dark:bg-sky-950/80 dark:text-sky-100 min-w-[180px] text-center select-none">
                                            INDIKATOR SASARAN
                                        </th>
                                        <th rowSpan={2} className="sticky top-0 z-30 px-2 py-2 border-b border-r border-border bg-sky-100/95 text-sky-950 dark:bg-sky-950/80 dark:text-sky-100 min-w-[65px] text-center select-none" title="Satuan Indikator Sasaran">
                                            SATUAN
                                        </th>
                                        <th rowSpan={2} className="sticky top-0 z-30 px-2 py-2 border-b border-r border-border bg-sky-100/95 text-sky-950 dark:bg-sky-950/80 dark:text-sky-100 min-w-[75px] text-center select-none">
                                            POLA
                                        </th>
                                        {/* TARGET - Soft Blue Color Accent */}
                                        <th colSpan={years.length} className="sticky top-0 z-30 px-3 py-1.5 border-b border-r border-border bg-blue-200 text-blue-950 dark:bg-blue-900/60 dark:text-blue-100 text-center select-none">
                                            TARGET
                                        </th>
                                        {/* REALISASI - Soft Emerald Color Accent */}
                                        <th colSpan={years.length} className="sticky top-0 z-30 px-3 py-1.5 border-b border-r border-border bg-emerald-200 text-emerald-950 dark:bg-emerald-900/60 dark:text-emerald-100 text-center select-none">
                                            REALISASI
                                        </th>
                                        {/* PERSENTASE CAPAIAN (%) - Soft Amber Color Accent */}
                                        <th colSpan={years.length} className="sticky top-0 z-30 px-3 py-1.5 border-b border-r border-border bg-amber-200 text-amber-950 dark:bg-amber-900/60 dark:text-amber-100 text-center select-none">
                                            PERSENTASE CAPAIAN (%)
                                        </th>
                                        <th colSpan={years.length} className="sticky top-0 z-30 px-3 py-1.5 border-b border-r border-border bg-amber-200 text-amber-950 dark:bg-amber-900/60 dark:text-amber-100 text-center select-none">
                                            STATUS CAPAIAN
                                        </th>
                                        {canManage && (
                                            <th rowSpan={2} className="sticky top-0 z-30 px-3 py-2 border-b border-border bg-muted/95 text-foreground min-w-[120px] text-center select-none print:hidden">
                                                AKSI
                                            </th>
                                        )}
                                    </tr>

                                    {/* Header Baris 2: Sub-Kolom Tahun */}
                                    <tr className="font-semibold text-center select-none">
                                        {/* Target Years (Blue) */}
                                        {years.map((y) => (
                                            <th key={`t-${y}`} className="sticky top-[32px] z-20 px-2 py-1 border-b border-r border-border bg-blue-100/80 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200 min-w-[65px]">
                                                {y}
                                            </th>
                                        ))}
                                        {/* Realization Years (Emerald) */}
                                        {years.map((y) => (
                                            <th key={`r-${y}`} className="sticky top-[32px] z-20 px-2 py-1 border-b border-r border-border bg-emerald-100/80 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 min-w-[65px]">
                                                {y}
                                            </th>
                                        ))}
                                        {/* Capaian Years (Amber) */}
                                        {years.map((y) => (
                                            <th
                                                key={`c-${y}`}
                                                className={`sticky top-[32px] z-20 px-2 py-1 border-b border-r border-border min-w-[75px] ${
                                                    evalYear === y
                                                        ? 'bg-amber-200 text-amber-950 font-bold ring-1 ring-inset ring-amber-500'
                                                        : 'bg-amber-100/70 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200'
                                                }`}
                                            >
                                                {y}
                                            </th>
                                        ))}
                                        {/* Status Years (Amber) */}
                                        {years.map((y) => (
                                            <th
                                                key={`s-${y}`}
                                                className={`sticky top-[32px] z-20 px-2 py-1 border-b border-r border-border min-w-[95px] ${
                                                    evalYear === y
                                                        ? 'bg-amber-200 text-amber-950 font-bold ring-1 ring-inset ring-amber-500'
                                                        : 'bg-amber-100/70 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200'
                                                }`}
                                            >
                                                {y}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-border/60 font-sans">
                                    {paginatedGoals.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={canManage ? 8 + years.length * 4 + 1 : 8 + years.length * 4}
                                                className="p-12 text-center"
                                            >
                                                <div className="max-w-md mx-auto flex flex-col items-center justify-center space-y-3">
                                                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                                                        <Search className="h-6 w-6" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="font-semibold text-sm text-foreground">
                                                            {searchQuery ? 'Indikator Tidak Ditemukan' : 'Belum Ada Data Realisasi Renstra PD'}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {searchQuery
                                                                ? `Tidak ada indikator yang sesuai dengan kata kunci "${searchQuery}". Silakan coba kata kunci lain.`
                                                                : `Mulai dengan menambahkan Tujuan & Sasaran Renstra untuk ${selectedOrgName} pada periode ${years.length > 0 ? `${years[0]}–${years[years.length - 1]}` : 'evaluasi'}.`}
                                                        </p>
                                                    </div>
                                                    {!searchQuery && canManage && (
                                                        <Button onClick={openCreateModal} size="sm" className="h-8 gap-1.5 text-xs mt-1">
                                                            <Plus className="h-3.5 w-3.5" />
                                                            <span>Tambah Tujuan Pertama</span>
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                    paginatedGoals.map(({ goal, goalNo, children }) => {
                                        const rawGoalInds = (goal.goal_indicators_list && goal.goal_indicators_list.length > 0)
                                            ? goal.goal_indicators_list
                                            : [{
                                                id: 1,
                                                indicator: goal.goal_indicator || '-',
                                                unit: goal.goal_indicator_unit || '%',
                                                measurement_pattern: goal.goal_measurement_pattern || 'Positif',
                                                targets: goal.goal_targets || goal.targets || {},
                                                realizations: goal.goal_realizations || goal.realizations || {},
                                                calculations: goal.calculations || {},
                                            }];

                                        const goalInds = selectedStatus === 'Semua'
                                            ? rawGoalInds
                                            : rawGoalInds.filter((gInd) => {
                                                const ach = computeAchievementFallback(gInd, evalYear, gInd.measurement_pattern || goal.goal_measurement_pattern);
                                                const status = gInd.calculations?.[evalYear]?.status || getStatusInfo(ach).status;
                                                return status === selectedStatus;
                                            });

                                        const childrenWithInds = children.map((c) => {
                                            const rawInds = (c.objective_indicators_list && c.objective_indicators_list.length > 0)
                                                ? c.objective_indicators_list
                                                : [{
                                                    id: 1,
                                                    indicator: c.objective_indicator || '-',
                                                    unit: c.unit || '%',
                                                    measurement_pattern: c.measurement_pattern || 'Positif',
                                                    targets: c.targets || {},
                                                    realizations: c.realizations || {},
                                                    calculations: c.calculations || {},
                                                }];
                                            const inds = selectedStatus === 'Semua'
                                                ? rawInds
                                                : rawInds.filter((cInd) => {
                                                    const ach = computeAchievementFallback(cInd, evalYear, cInd.measurement_pattern || c.measurement_pattern);
                                                    const status = cInd.calculations?.[evalYear]?.status || getStatusInfo(ach).status;
                                                    return status === selectedStatus;
                                                });
                                            return { child: c, inds };
                                        }).filter((ci) => ci.inds.length > 0);

                                        const totalChildIndRows = childrenWithInds.reduce((sum, ci) => sum + ci.inds.length, 0);
                                        const totalGoalRows = (goalInds.length > 0 ? goalInds.length : 0) + (childrenWithInds.length === 0 ? 1 : totalChildIndRows);

                                        return (
                                            <React.Fragment key={`goal-block-${goal.id}`}>
                                                    {/* ── GOAL INDICATOR ROWS ── */}
                                                    {goalInds.map((gInd, gIdx) => (
                                                        <tr
                                                            key={`goal-ind-${goal.id}-${gInd.id ?? gIdx}`}
                                                            className={`bg-sky-50/50 dark:bg-sky-950/20 hover:bg-sky-100/40 dark:hover:bg-sky-900/30 transition-colors ${
                                                                gIdx === 0 ? 'border-t-2 border-sky-300 dark:border-sky-800' : ''
                                                            }`}
                                                        >
                                                            {/* Row 0 of Goal: Spans NO, TUJUAN */}
                                                            {gIdx === 0 && (
                                                                <>
                                                                    <td
                                                                        rowSpan={totalGoalRows}
                                                                        className="md:sticky md:left-0 z-10 w-[60px] min-w-[60px] max-w-[60px] px-2 py-2.5 border-b border-r border-border text-center align-top font-mono font-bold text-sky-900 dark:text-sky-200 bg-sky-50/95 dark:bg-sky-950/90 md:shadow-[1px_0_0_0_rgba(0,0,0,0.1)]"
                                                                    >
                                                                        ({goalNo})
                                                                    </td>
                                                                    <td
                                                                        rowSpan={totalGoalRows}
                                                                        className="md:sticky md:left-[60px] z-10 w-[220px] min-w-[220px] max-w-[220px] px-3 py-2 border-b border-r border-border align-top text-foreground leading-relaxed bg-sky-50/95 dark:bg-sky-950/90 md:shadow-[3px_0_6px_-2px_rgba(0,0,0,0.15)]"
                                                                    >
                                                                        <div className="flex items-center gap-1.5 mb-1">
                                                                            <Badge variant="outline" className="bg-sky-100 text-sky-900 dark:bg-sky-900 dark:text-sky-100 border-sky-300 text-[10px] font-bold px-1.5 py-0">
                                                                                TUJUAN RENSTRA
                                                                            </Badge>
                                                                        </div>
                                                                        <div className="font-semibold text-xs text-slate-900 dark:text-white leading-snug">
                                                                            {goal.goal || '-'}
                                                                        </div>
                                                                    </td>
                                                                </>
                                                            )}

                                                            {/* INDIKATOR TUJUAN */}
                                                            <td className="px-3 py-2 border-b border-r border-border align-top text-foreground leading-relaxed min-w-[180px]">
                                                                <div className="font-medium text-xs text-slate-800 dark:text-slate-200 leading-snug">
                                                                    {goalInds.length > 1 && (
                                                                        <span className="font-mono text-[10px] font-bold text-sky-700 dark:text-sky-400 mr-1">
                                                                            ({goalNo}.{gIdx + 1})
                                                                        </span>
                                                                    )}
                                                                    {gInd.indicator || '-'}
                                                                </div>
                                                            </td>

                                                            {/* SATUAN TUJUAN */}
                                                            <td className="px-2 py-2 border-b border-r border-border text-center align-top font-mono text-xs text-slate-600 dark:text-slate-400 min-w-[65px]">
                                                                {gInd.unit || '-'}
                                                            </td>

                                                            {/* SASARAN & INDIKATOR SASARAN SPANNED ACROSS GOAL INDICATORS */}
                                                            {gIdx === 0 && (
                                                                <>
                                                                    <td
                                                                        rowSpan={goalInds.length}
                                                                        className="w-[220px] min-w-[220px] max-w-[220px] px-3 py-2 border-b border-r border-border align-top bg-sky-50/20 dark:bg-sky-950/10"
                                                                    >
                                                                        <div className="flex flex-col gap-1.5">
                                                                            <span className="text-[11px] font-semibold text-slate-500 italic">
                                                                                Mengayomi {children.length} Sasaran Renstra
                                                                            </span>
                                                                            {canManage && (
                                                                                <Button
                                                                                    type="button"
                                                                                    variant="outline"
                                                                                    size="sm"
                                                                                    onClick={() => openQuickAddModal(goal, goalNo)}
                                                                                    className="h-6 text-[11px] px-2 gap-1 border-emerald-400 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 w-fit cursor-pointer"
                                                                                    title={`Tambah Sasaran di bawah Tujuan (${goalNo})`}
                                                                                >
                                                                                    <FolderPlus className="h-3 w-3" />
                                                                                    <span>+ Sasaran ({goalNo}.{children.length + 1})</span>
                                                                                </Button>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td
                                                                        rowSpan={goalInds.length}
                                                                        className="px-3 py-2 border-b border-r border-border align-top text-center text-slate-400 min-w-[180px] bg-sky-50/20 dark:bg-sky-950/10"
                                                                    >
                                                                        -
                                                                    </td>
                                                                    <td
                                                                        rowSpan={goalInds.length}
                                                                        className="px-2 py-2 border-b border-r border-border text-center align-top text-slate-400 min-w-[65px] bg-sky-50/20 dark:bg-sky-950/10"
                                                                    >
                                                                        -
                                                                    </td>
                                                                </>
                                                            )}

                                                            {/* POLA PENGUKURAN */}
                                                            <td className="px-2 py-2 border-b border-r border-border text-center align-top min-w-[75px]">
                                                                {gInd.measurement_pattern ? (
                                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200">
                                                                        {gInd.measurement_pattern}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-slate-400">-</span>
                                                                )}
                                                            </td>

                                                            {/* TARGET TUJUAN (Soft Blue) */}
                                                            {years.map((yr) => (
                                                                <td
                                                                    key={`g-t-${yr}-${gIdx}`}
                                                                    className="px-2 py-2 border-b border-r border-border text-right align-top font-mono tabular-nums text-slate-700 dark:text-slate-300 bg-blue-50/30 dark:bg-blue-950/20"
                                                                >
                                                                    {gInd.targets?.[yr] !== undefined && gInd.targets?.[yr] !== null && gInd.targets?.[yr] !== ''
                                                                        ? Number(gInd.targets[yr]).toLocaleString('id-ID')
                                                                        : '-'}
                                                                </td>
                                                            ))}

                                                            {/* REALISASI TUJUAN (Soft Emerald) */}
                                                            {years.map((yr) => (
                                                                <td
                                                                    key={`g-r-${yr}-${gIdx}`}
                                                                    className="px-2 py-2 border-b border-r border-border text-right align-top font-mono tabular-nums text-slate-700 dark:text-slate-300 bg-emerald-50/30 dark:bg-emerald-950/20"
                                                                >
                                                                    {gInd.realizations?.[yr] !== undefined && gInd.realizations?.[yr] !== null && gInd.realizations?.[yr] !== ''
                                                                        ? Number(gInd.realizations[yr]).toLocaleString('id-ID')
                                                                        : '-'}
                                                                </td>
                                                            ))}

                                                            {/* CAPAIAN TUJUAN (Soft Amber) */}
                                                            {years.map((yr) => {
                                                                const achievement = computeAchievementFallback(gInd, yr);
                                                                const statusInfo = getStatusInfo(achievement);
                                                                const backendCalc = gInd.calculations?.[yr];
                                                                const bgClass = backendCalc?.bgClass || statusInfo.bgClass;
                                                                const status = backendCalc?.status || statusInfo.status;
                                                                const isSelected = evalYear === yr;
                                                                return (
                                                                    <td
                                                                        key={`g-c-${yr}-${gIdx}`}
                                                                        className={`px-2 py-2 border-b border-r border-border text-right align-top font-mono tabular-nums font-bold ${
                                                                            isSelected
                                                                                ? 'bg-amber-100/50 dark:bg-amber-900/40 text-amber-950 dark:text-amber-200'
                                                                                : 'bg-amber-50/20 dark:bg-amber-950/10'
                                                                        }`}
                                                                    >
                                                                        {achievement !== null ? `${achievement.toFixed(2)}%` : '-'}
                                                                    </td>
                                                                );
                                                            })}

                                                            {/* STATUS TUJUAN */}
                                                            {years.map((yr) => {
                                                                const achievement = computeAchievementFallback(gInd, yr);
                                                                const statusInfo = getStatusInfo(achievement);
                                                                const backendCalc = gInd.calculations?.[yr];
                                                                const bgClass = backendCalc?.bgClass || statusInfo.bgClass;
                                                                const status = backendCalc?.status || statusInfo.status;
                                                                const isSelected = evalYear === yr;
                                                                return (
                                                                    <td
                                                                        key={`g-s-${yr}-${gIdx}`}
                                                                        className={`px-1.5 py-2 border-b border-r border-border text-center align-top ${
                                                                            isSelected ? 'bg-amber-100/50 dark:bg-amber-900/40' : 'bg-amber-50/20 dark:bg-amber-950/10'
                                                                        }`}
                                                                    >
                                                                        {achievement !== null ? (
                                                                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold border ${bgClass} whitespace-nowrap`}>
                                                                                {status}
                                                                            </span>
                                                                        ) : (
                                                                            '-'
                                                                        )}
                                                                    </td>
                                                                );
                                                            })}

                                                            {/* AKSI TUJUAN (Spanned across goal indicators) */}
                                                            {gIdx === 0 && canManage && (
                                                                <td
                                                                    rowSpan={goalInds.length}
                                                                    className="px-2 py-2 border-b border-border text-center align-top whitespace-nowrap print:hidden bg-sky-50/20 dark:bg-sky-950/10"
                                                                >
                                                                    <div className="flex items-center justify-center gap-1">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                                                            onClick={() => openEditModal(goal)}
                                                                            title={`Edit Data Tujuan (${goalNo})`}
                                                                        >
                                                                            <Edit2 className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                                            onClick={() => promptDelete(goal)}
                                                                            title={`Hapus Tujuan (${goalNo}) beserta seluruh Sasaran di bawahnya`}
                                                                        >
                                                                            <Trash2 className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    </div>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ))}

                                                    {/* ── CHILD OBJECTIVES ROWS ── */}
                                                    {childrenWithInds.length === 0 ? (
                                                        <tr className="bg-slate-50/50 dark:bg-slate-900/30">
                                                            <td className="px-3 py-2 border-b border-r border-border text-center text-slate-400 bg-white dark:bg-slate-900">
                                                                -
                                                            </td>
                                                            <td className="px-2 py-2 border-b border-r border-border text-center text-slate-400 bg-white dark:bg-slate-900">
                                                                -
                                                            </td>
                                                            <td
                                                                colSpan={canManage ? 4 + years.length * 4 + 1 : 4 + years.length * 4}
                                                                className="px-6 py-2.5 text-xs text-muted-foreground italic border-b bg-white dark:bg-slate-900"
                                                            >
                                                                {selectedStatus !== 'Semua'
                                                                    ? `Tidak ada Sasaran dengan status "${selectedStatus}" di bawah Tujuan ini.`
                                                                    : 'Belum ada Sasaran di bawah Tujuan ini.'}{' '}
                                                                {selectedStatus === 'Semua' && canManage && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => openQuickAddModal(goal, goalNo)}
                                                                        className="text-primary underline hover:text-primary/80 font-medium ml-1 cursor-pointer"
                                                                    >
                                                                        Klik untuk tambah Sasaran ({goalNo}.1)
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        childrenWithInds.map(({ child, inds }, cIdx) => {
                                                            const objNumber = `(${goalNo}.${cIdx + 1})`;
                                                            return inds.map((cInd, iIdx) => (
                                                                <tr
                                                                    key={`child-ind-${child.id}-${cInd.id ?? iIdx}`}
                                                                    className="hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-colors group"
                                                                >
                                                                    {/* When iIdx === 0: render empty Tujuan Indicator & Sasaran block */}
                                                                    {iIdx === 0 && (
                                                                        <>
                                                                            {/* If no goalInds were rendered, render NO & TUJUAN on first child row */}
                                                                            {goalInds.length === 0 && cIdx === 0 && (
                                                                                <>
                                                                                    <td
                                                                                        rowSpan={totalChildIndRows}
                                                                                        className="md:sticky md:left-0 z-10 w-[60px] min-w-[60px] max-w-[60px] px-2 py-2.5 border-b border-r border-border text-center align-top font-mono font-bold text-sky-900 dark:text-sky-200 bg-sky-50/95 dark:bg-sky-950/90 md:shadow-[1px_0_0_0_rgba(0,0,0,0.1)]"
                                                                                    >
                                                                                        ({goalNo})
                                                                                    </td>
                                                                                    <td
                                                                                        rowSpan={totalChildIndRows}
                                                                                        className="md:sticky md:left-[60px] z-10 w-[220px] min-w-[220px] max-w-[220px] px-3 py-2 border-b border-r border-border align-top text-foreground leading-relaxed bg-sky-50/95 dark:bg-sky-950/90 md:shadow-[3px_0_6px_-2px_rgba(0,0,0,0.15)]"
                                                                                    >
                                                                                        <div className="flex items-center gap-1.5 mb-1">
                                                                                            <Badge variant="outline" className="bg-sky-100 text-sky-900 dark:bg-sky-900 dark:text-sky-100 border-sky-300 text-[10px] font-bold px-1.5 py-0">
                                                                                                TUJUAN RENSTRA
                                                                                            </Badge>
                                                                                        </div>
                                                                                        <div className="font-semibold text-xs text-slate-900 dark:text-white leading-snug">
                                                                                            {goal.goal || '-'}
                                                                                        </div>
                                                                                    </td>
                                                                                </>
                                                                            )}
                                                                            <td
                                                                                rowSpan={inds.length}
                                                                                className="px-3 py-2 border-b border-r border-border text-center align-top text-slate-400 min-w-[180px] bg-white dark:bg-slate-900"
                                                                            >
                                                                                -
                                                                            </td>
                                                                            <td
                                                                                rowSpan={inds.length}
                                                                                className="px-2 py-2 border-b border-r border-border text-center align-top text-slate-400 min-w-[65px] bg-white dark:bg-slate-900"
                                                                            >
                                                                                -
                                                                            </td>
                                                                            <td
                                                                                rowSpan={inds.length}
                                                                                className="w-[220px] min-w-[220px] max-w-[220px] px-3 py-2.5 border-b border-r border-border align-top break-words leading-relaxed border-l-2 border-l-emerald-500 bg-white dark:bg-slate-900"
                                                                            >
                                                                                <div className="flex items-center gap-1.5 mb-1">
                                                                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 border-emerald-300 text-[10px] font-semibold px-1.5 py-0">
                                                                                        SASARAN {objNumber}
                                                                                    </Badge>
                                                                                    {inds.length > 1 && (
                                                                                        <span className="text-[10px] text-emerald-600 font-bold font-mono">
                                                                                            ({inds.length} Indikator)
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                <div className="font-semibold text-xs text-slate-900 dark:text-white leading-snug">
                                                                                    {child.objective || '-'}
                                                                                </div>
                                                                            </td>
                                                                        </>
                                                                    )}

                                                                    {/* INDIKATOR SASARAN */}
                                                                    <td className="px-3 py-2.5 border-b border-r border-border align-top font-semibold text-foreground leading-relaxed min-w-[180px] break-words bg-white dark:bg-slate-900">
                                                                        {inds.length > 1 && (
                                                                            <span className="font-mono text-[10px] font-bold text-emerald-700 dark:text-emerald-400 mr-1">
                                                                                ({goalNo}.{cIdx + 1}.{iIdx + 1})
                                                                            </span>
                                                                        )}
                                                                        {cInd.indicator || '-'}
                                                                    </td>

                                                                    {/* SATUAN SASARAN */}
                                                                    <td className="px-2 py-2 border-b border-r border-border text-center align-top font-mono text-muted-foreground min-w-[65px] bg-white dark:bg-slate-900">
                                                                        {cInd.unit || '-'}
                                                                    </td>

                                                                    {/* POLA PENGUKURAN */}
                                                                    <td className="px-2 py-2 border-b border-r border-border text-center align-top min-w-[75px] bg-white dark:bg-slate-900">
                                                                        <span
                                                                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                                                                cInd.measurement_pattern === 'Negatif'
                                                                                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                                                                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                                            }`}
                                                                        >
                                                                            {cInd.measurement_pattern || 'Positif'}
                                                                        </span>
                                                                    </td>

                                                                    {/* TARGET SASARAN (Soft Blue) */}
                                                                    {years.map((yr) => (
                                                                        <td
                                                                            key={`c-t-${yr}-${iIdx}`}
                                                                            className="px-2 py-2 border-b border-r border-border text-right align-top font-mono tabular-nums text-slate-700 dark:text-slate-300 bg-blue-50/20 dark:bg-blue-950/10"
                                                                        >
                                                                            {cInd.targets?.[yr] !== undefined && cInd.targets?.[yr] !== null && cInd.targets?.[yr] !== ''
                                                                                ? Number(cInd.targets[yr]).toLocaleString('id-ID')
                                                                                : '-'}
                                                                        </td>
                                                                    ))}

                                                                    {/* REALISASI SASARAN (Soft Emerald) */}
                                                                    {years.map((yr) => (
                                                                        <td
                                                                            key={`c-r-${yr}-${iIdx}`}
                                                                            className="px-2 py-2 border-b border-r border-border text-right align-top font-mono tabular-nums text-slate-700 dark:text-slate-300 bg-emerald-50/20 dark:bg-emerald-950/10"
                                                                        >
                                                                            {cInd.realizations?.[yr] !== undefined && cInd.realizations?.[yr] !== null && cInd.realizations?.[yr] !== ''
                                                                                ? Number(cInd.realizations[yr]).toLocaleString('id-ID')
                                                                                : '-'}
                                                                        </td>
                                                                    ))}

                                                                    {/* CAPAIAN SASARAN (Soft Amber) */}
                                                                    {years.map((yr) => {
                                                                        const achievement = computeAchievementFallback(cInd, yr);
                                                                        const statusInfo = getStatusInfo(achievement);
                                                                        const backendCalc = cInd.calculations?.[yr];
                                                                        const bgClass = backendCalc?.bgClass || statusInfo.bgClass;
                                                                        const status = backendCalc?.status || statusInfo.status;
                                                                        const isSelected = evalYear === yr;
                                                                        return (
                                                                            <td
                                                                                key={`c-c-${yr}-${iIdx}`}
                                                                                className={`px-2 py-2 border-b border-r border-border text-right align-top font-mono tabular-nums font-bold ${
                                                                                    isSelected
                                                                                        ? 'bg-amber-100/50 dark:bg-amber-900/40 text-amber-950 dark:text-amber-200'
                                                                                        : 'bg-amber-50/20 dark:bg-amber-950/10'
                                                                                }`}
                                                                            >
                                                                                {achievement !== null ? `${achievement.toFixed(2)}%` : '-'}
                                                                            </td>
                                                                        );
                                                                    })}

                                                                    {/* STATUS SASARAN */}
                                                                    {years.map((yr) => {
                                                                        const achievement = computeAchievementFallback(cInd, yr);
                                                                        const statusInfo = getStatusInfo(achievement);
                                                                        const backendCalc = cInd.calculations?.[yr];
                                                                        const bgClass = backendCalc?.bgClass || statusInfo.bgClass;
                                                                        const status = backendCalc?.status || statusInfo.status;
                                                                        const isSelected = evalYear === yr;
                                                                        return (
                                                                            <td
                                                                                key={`c-s-${yr}-${iIdx}`}
                                                                                className={`px-1.5 py-2 border-b border-r border-border text-center align-top ${
                                                                                    isSelected ? 'bg-amber-100/50 dark:bg-amber-900/40' : 'bg-amber-50/20 dark:bg-amber-950/10'
                                                                                }`}
                                                                            >
                                                                                {achievement !== null ? (
                                                                                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold border ${bgClass} whitespace-nowrap`}>
                                                                                        {status}
                                                                                    </span>
                                                                                ) : (
                                                                                    '-'
                                                                                )}
                                                                            </td>
                                                                        );
                                                                    })}

                                                                    {/* AKSI SASARAN (Spanned across its own indicators) */}
                                                                    {iIdx === 0 && canManage && (
                                                                        <td
                                                                            rowSpan={inds.length}
                                                                            className="px-2 py-2 border-b border-border text-center align-top whitespace-nowrap print:hidden bg-white dark:bg-slate-900"
                                                                        >
                                                                            <div className="flex items-center justify-center gap-1">
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                                                                    onClick={() => openEditModal(child)}
                                                                                    title={`Edit Sasaran ${objNumber}`}
                                                                                >
                                                                                    <Edit2 className="h-3.5 w-3.5" />
                                                                                </Button>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                                                    onClick={() => promptDelete(child)}
                                                                                    title={`Hapus Sasaran ${objNumber}`}
                                                                                >
                                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                                </Button>
                                                                            </div>
                                                                        </td>
                                                                    )}
                                                                </tr>
                                                            ));
                                                        })
                                                    )}
                                                </React.Fragment>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Keterangan Kriteria Status Kinerja */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 p-3 text-xs bg-muted/40 border-b border-border/60">
                            <span className="font-semibold text-muted-foreground">Kriteria Status Kinerja:</span>
                            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                <strong>Tercapai:</strong> Capaian &ge; 100%
                            </span>
                            <span className="text-muted-foreground/40">|</span>
                            <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                <strong>Perlu Perhatian:</strong> 50% &le; Capaian &lt; 100%
                            </span>
                            <span className="text-muted-foreground/40">|</span>
                            <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-400">
                                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                <strong>Kritis:</strong> Capaian &lt; 50% / Nilai Minus
                            </span>
                            <span className="text-muted-foreground/40">|</span>
                            <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-400">
                                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                                <strong>Tidak Dinilai:</strong> Target = 0 &amp; Realisasi = 0 / Belum Ada Data
                            </span>
                        </div>

                        {/* Pagination Helper */}
                        <TablePagination
                            clientSide={true}
                            from={from}
                            to={to}
                            totalItems={totalGoalsCount}
                            perPage={perPage}
                            currentPage={safeCurrentPage}
                            lastPage={lastPage}
                            itemLabel="Tujuan Renstra"
                            onPerPageChange={(val) => {
                                setPerPage(val);
                                setCurrentPage(1);
                            }}
                            onClientPageChange={(p) => setCurrentPage(p)}
                        />
                    </CardContent>
                </Card>
            </div>

            {/* ═════════════════════════════════════════════════════════════════════════ */}
            {/* MODAL 1: CREATE TUJUAN & SASARAN RENSTRA                                */}
            {/* ═════════════════════════════════════════════════════════════════════════ */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <Plus className="h-5 w-5 text-primary" />
                            Tambah Data Kinerja Renstra (Perangkat Daerah)
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Pilih mode penambahan: Buat Tujuan Renstra Baru beserta Sub-Sasarannya, atau Tambah Sasaran ke Tujuan Renstra yang sudah ada.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Mode Selector Tabs */}
                    <div className="grid grid-cols-2 gap-2 p-1 bg-muted/60 rounded-lg text-xs font-semibold">
                        <button
                            type="button"
                            onClick={() => setCreateMode('both')}
                            className={`py-2 px-3 rounded-md transition-all cursor-pointer ${
                                createMode === 'both'
                                    ? 'bg-background text-primary shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            1. Buat Tujuan Renstra Baru &amp; Sub-Sasaran
                        </button>
                        <button
                            type="button"
                            onClick={() => setCreateMode('objective')}
                            className={`py-2 px-3 rounded-md transition-all cursor-pointer ${
                                createMode === 'objective'
                                    ? 'bg-background text-primary shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            2. Tambah Sasaran ke Tujuan yang Ada
                        </button>
                    </div>

                    <form onSubmit={handleCreateSubmit} className="space-y-4">
                        {/* OPD Target Selector (for Admin OPD) */}
                        {isGlobalManager && (
                            <div className="space-y-1 p-3 bg-muted/30 rounded-lg border">
                                <Label className="text-xs font-semibold">
                                    Target Perangkat Daerah <span className="text-destructive">*</span>
                                </Label>
                                <Select2
                                    value={String(createForm.organization_id)}
                                    onChange={(val) => setCreateForm((prev) => ({ ...prev, organization_id: Number(val) }))}
                                    options={organizations.map((org) => ({
                                        value: String(org.id),
                                        label: `${org.code} - ${org.name}`,
                                    }))}
                                    placeholder="Pilih Perangkat Daerah..."
                                    searchPlaceholder="Cari OPD..."
                                />
                            </div>
                        )}

                        {/* MODE 1: CREATE GOAL & OBJECTIVES */}
                        {createMode === 'both' ? (
                            <div className="space-y-4">
                                {createForm.goals.map((g, gIdx) => (
                                    <div
                                        key={g.id}
                                        className="p-3.5 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/20 dark:bg-sky-950/10 space-y-3"
                                    >
                                        <div className="flex items-center justify-between border-b pb-2 border-sky-200/80">
                                            <span className="font-bold text-xs text-sky-900 dark:text-sky-200 flex items-center gap-1.5">
                                                <Layers className="h-4 w-4 text-sky-600" />
                                                Tujuan Renstra #{gIdx + 1}
                                            </span>
                                            {createForm.goals.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeGoalFromCreateForm(gIdx)}
                                                    className="h-6 px-2 text-rose-600 hover:bg-rose-100 text-[11px] gap-1 cursor-pointer"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                    <span>Hapus Tujuan #{gIdx + 1}</span>
                                                </Button>
                                            )}
                                        </div>

                                        {/* Uraian Tujuan */}
                                        <div className="space-y-1">
                                            <Label className="text-xs font-semibold">
                                                Uraian Tujuan Renstra <span className="text-destructive">*</span>
                                            </Label>
                                            <Textarea
                                                rows={2}
                                                value={g.goal}
                                                onChange={(e) => updateGoalField(gIdx, e.target.value)}
                                                placeholder="Tuliskan rumusan Tujuan Renstra Perangkat Daerah..."
                                                className="text-xs bg-background"
                                                required
                                            />
                                        </div>

                                        {/* Indikator Tujuan (Multi) */}
                                        <div className="space-y-2 pt-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-foreground flex items-center gap-1">
                                                    <span className="h-2 w-2 rounded-full bg-sky-500" />
                                                    Indikator Tujuan Renstra ({g.goal_indicators.length})
                                                </span>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => addGoalIndicatorToGoal(gIdx)}
                                                    className="h-6 text-[11px] px-2 gap-1 border-sky-300 text-sky-700 hover:bg-sky-50 cursor-pointer"
                                                >
                                                    <Plus className="h-3 w-3" />
                                                    <span>+ Tambah Indikator Tujuan</span>
                                                </Button>
                                            </div>

                                            {g.goal_indicators.map((gi, indIdx) => (
                                                <IndicatorFormFields
                                                    key={gi.id ?? indIdx}
                                                    indicator={gi}
                                                    index={indIdx}
                                                    total={g.goal_indicators.length}
                                                    labelPrefix="Indikator Tujuan"
                                                    years={years}
                                                    accentColor="sky"
                                                    onUpdateField={(f, v) => updateGoalIndicatorField(gIdx, indIdx, f, v)}
                                                    onUpdateTarget={(yr, v) => updateGoalIndicatorTarget(gIdx, indIdx, yr, v)}
                                                    onUpdateRealization={(yr, v) => updateGoalIndicatorRealization(gIdx, indIdx, yr, v)}
                                                    onRemove={() => removeGoalIndicatorFromGoal(gIdx, indIdx)}
                                                />
                                            ))}
                                        </div>

                                        {/* Sub-Sasaran Renstra di Bawah Tujuan Ini (Multi) */}
                                        <div className="space-y-3 pt-2 border-t border-sky-200/60">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-foreground flex items-center gap-1">
                                                    <Target className="h-3.5 w-3.5 text-emerald-600" />
                                                    Sub-Sasaran Renstra di Bawah Tujuan #{gIdx + 1} ({g.objectives.length})
                                                </span>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => addObjectiveToGoal(gIdx)}
                                                    className="h-6 text-[11px] px-2 gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                                                >
                                                    <Plus className="h-3 w-3" />
                                                    <span>+ Tambah Sasaran</span>
                                                </Button>
                                            </div>

                                            {g.objectives.map((obj, objIdx) => (
                                                <div
                                                    key={objIdx}
                                                    className="p-3 rounded-lg border border-emerald-200/80 bg-emerald-50/20 space-y-2.5"
                                                >
                                                    <div className="flex items-center justify-between border-b pb-1.5 border-emerald-200/60">
                                                        <span className="font-bold text-[11px] text-emerald-900 dark:text-emerald-200">
                                                            Sasaran Renstra #{objIdx + 1}
                                                        </span>
                                                        {g.objectives.length > 1 && (
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => removeObjectiveFromGoal(gIdx, objIdx)}
                                                                className="h-5 px-1.5 text-rose-600 hover:bg-rose-100 text-[10px] gap-1 cursor-pointer"
                                                            >
                                                                <Trash2 className="h-2.5 w-2.5" />
                                                                <span>Hapus Sasaran #{objIdx + 1}</span>
                                                            </Button>
                                                        )}
                                                    </div>

                                                    <div className="space-y-1">
                                                        <Label className="text-[11px] font-semibold">
                                                            Uraian Sasaran Renstra <span className="text-destructive">*</span>
                                                        </Label>
                                                        <Input
                                                            value={obj.objective}
                                                            onChange={(e) => updateObjectiveFieldInGoal(gIdx, objIdx, 'objective', e.target.value)}
                                                            placeholder="cth: Meningkatnya Kualitas Pelayanan Publik..."
                                                            className="h-8 text-xs bg-background"
                                                            required
                                                        />
                                                    </div>

                                                    {/* Indikator Sasaran */}
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[11px] font-semibold text-muted-foreground">
                                                                Indikator Sasaran ({obj.indicators.length})
                                                            </span>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => addIndicatorToObjectiveInGoal(gIdx, objIdx)}
                                                                className="h-5 text-[10px] px-1.5 gap-1 text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                                                            >
                                                                <Plus className="h-2.5 w-2.5" />
                                                                <span>+ Indikator Sasaran</span>
                                                            </Button>
                                                        </div>

                                                        {obj.indicators.map((ind, indIdx) => (
                                                            <IndicatorFormFields
                                                                key={ind.id ?? indIdx}
                                                                indicator={ind}
                                                                index={indIdx}
                                                                total={obj.indicators.length}
                                                                labelPrefix="Indikator Sasaran"
                                                                years={years}
                                                                accentColor="emerald"
                                                                onUpdateField={(f, v) => updateIndicatorInObjectiveInGoal(gIdx, objIdx, indIdx, f, v)}
                                                                onUpdateTarget={(yr, v) => updateIndicatorTargetInObjectiveInGoal(gIdx, objIdx, indIdx, yr, v)}
                                                                onUpdateRealization={(yr, v) => updateIndicatorRealizationInObjectiveInGoal(gIdx, objIdx, indIdx, yr, v)}
                                                                onRemove={() => removeIndicatorFromObjectiveInGoal(gIdx, objIdx, indIdx)}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={addGoalToCreateForm}
                                    className="w-full h-8 text-xs gap-1.5 border-dashed border-sky-300 text-sky-700 hover:bg-sky-50 cursor-pointer"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    <span>+ Tambah Tujuan Renstra Lain</span>
                                </Button>
                            </div>
                        ) : (
                            /* MODE 2: TAMBAH SASARAN KE TUJUAN YANG ADA */
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold">
                                        Pilih Tujuan Renstra Induk <span className="text-destructive">*</span>
                                    </Label>
                                    <Select2
                                        value={selectedGoalId ? String(selectedGoalId) : ''}
                                        onChange={(val) => setSelectedGoalId(Number(val))}
                                        options={availableGoals.map((g) => ({
                                            value: String(g.id),
                                            label: g.label,
                                        }))}
                                        placeholder="Pilih Tujuan Renstra..."
                                        searchPlaceholder="Cari tujuan..."
                                    />
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                            <Target className="h-4 w-4 text-emerald-600" />
                                            Daftar Sasaran Renstra ({createForm.objectives.length})
                                        </span>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={addObjectiveToCreateForm}
                                            className="h-6 text-[11px] px-2 gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                                        >
                                            <Plus className="h-3 w-3" />
                                            <span>+ Tambah Sasaran</span>
                                        </Button>
                                    </div>

                                    {createForm.objectives.map((obj, objIdx) => (
                                        <div
                                            key={objIdx}
                                            className="p-3 rounded-lg border border-emerald-200/80 bg-emerald-50/20 space-y-2.5"
                                        >
                                            <div className="flex items-center justify-between border-b pb-1.5 border-emerald-200/60">
                                                <span className="font-bold text-[11px] text-emerald-900 dark:text-emerald-200">
                                                    Sasaran Renstra #{objIdx + 1}
                                                </span>
                                                {createForm.objectives.length > 1 && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeObjectiveFromCreateForm(objIdx)}
                                                        className="h-5 px-1.5 text-rose-600 hover:bg-rose-100 text-[10px] gap-1 cursor-pointer"
                                                    >
                                                        <Trash2 className="h-2.5 w-2.5" />
                                                        <span>Hapus Sasaran #{objIdx + 1}</span>
                                                    </Button>
                                                )}
                                            </div>

                                            <div className="space-y-1">
                                                <Label className="text-[11px] font-semibold">
                                                    Uraian Sasaran Renstra <span className="text-destructive">*</span>
                                                </Label>
                                                <Input
                                                    value={obj.objective}
                                                    onChange={(e) => updateObjectiveField(objIdx, e.target.value)}
                                                    placeholder="cth: Meningkatnya Kualitas Pelayanan Publik..."
                                                    className="h-8 text-xs bg-background"
                                                    required
                                                />
                                            </div>

                                            {/* Indikator Sasaran */}
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] font-semibold text-muted-foreground">
                                                        Indikator Sasaran ({obj.indicators.length})
                                                    </span>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => addIndicatorToObjective(objIdx)}
                                                        className="h-5 text-[10px] px-1.5 gap-1 text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                                                    >
                                                        <Plus className="h-2.5 w-2.5" />
                                                        <span>+ Indikator Sasaran</span>
                                                    </Button>
                                                </div>

                                                {obj.indicators.map((ind, indIdx) => (
                                                    <IndicatorFormFields
                                                        key={ind.id ?? indIdx}
                                                        indicator={ind}
                                                        index={indIdx}
                                                        total={obj.indicators.length}
                                                        labelPrefix="Indikator Sasaran"
                                                        years={years}
                                                        accentColor="emerald"
                                                        onUpdateField={(f, v) => updateIndicatorField(objIdx, indIdx, f, v)}
                                                        onUpdateTarget={(yr, v) => updateIndicatorTarget(objIdx, indIdx, yr, v)}
                                                        onUpdateRealization={(yr, v) => updateIndicatorRealization(objIdx, indIdx, yr, v)}
                                                        onRemove={() => removeIndicatorFromObjective(objIdx, indIdx)}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <DialogFooter className="gap-2 pt-3 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsCreateOpen(false)}
                                className="h-8 text-xs"
                            >
                                Batal
                            </Button>
                            <Button type="submit" size="sm" className="h-8 text-xs">
                                Simpan Data Renstra PD
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ═════════════════════════════════════════════════════════════════════════ */}
            {/* MODAL 2: QUICK ADD CHILD SASARAN                                        */}
            {/* ═════════════════════════════════════════════════════════════════════════ */}
            <Dialog open={isQuickAddOpen} onOpenChange={setIsQuickAddOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <FolderPlus className="h-5 w-5 text-emerald-600" />
                            Tambah Sasaran Renstra di Bawah Tujuan ({quickAddGoalNumber})
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Menambahkan Sasaran Renstra baru langsung di bawah Tujuan Renstra:{' '}
                            <span className="font-semibold text-foreground">
                                {quickAddParentGoal?.goal || '-'}
                            </span>
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleQuickAddSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <Label className="text-xs font-semibold">
                                Uraian Sasaran Renstra <span className="text-destructive">*</span>
                            </Label>
                            <Textarea
                                rows={2}
                                value={quickObjective}
                                onChange={(e) => setQuickObjective(e.target.value)}
                                placeholder="Tuliskan rumusan Sasaran Renstra Perangkat Daerah..."
                                className="text-xs bg-background"
                                required
                            />
                        </div>

                        {/* Indikator Sasaran (Multi) */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-foreground flex items-center gap-1">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                    Indikator Sasaran ({quickIndicators.length})
                                </span>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addQuickIndicator}
                                    className="h-6 text-[11px] px-2 gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                                >
                                    <Plus className="h-3 w-3" />
                                    <span>+ Tambah Indikator</span>
                                </Button>
                            </div>

                            {quickIndicators.map((ind, indIdx) => (
                                <IndicatorFormFields
                                    key={ind.id ?? indIdx}
                                    indicator={ind}
                                    index={indIdx}
                                    total={quickIndicators.length}
                                    labelPrefix="Indikator Sasaran"
                                    years={years}
                                    accentColor="emerald"
                                    onUpdateField={(f, v) => updateQuickIndicatorField(indIdx, f, v)}
                                    onUpdateTarget={(yr, v) => updateQuickIndicatorTarget(indIdx, yr, v)}
                                    onUpdateRealization={(yr, v) => updateQuickIndicatorRealization(indIdx, yr, v)}
                                    onRemove={() => removeQuickIndicator(indIdx)}
                                />
                            ))}
                        </div>

                        <DialogFooter className="gap-2 pt-3 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsQuickAddOpen(false)}
                                className="h-8 text-xs"
                                disabled={processingQuick}
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
                                disabled={processingQuick}
                            >
                                {processingQuick ? 'Menyimpan...' : 'Simpan Sasaran Renstra'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ═════════════════════════════════════════════════════════════════════════ */}
            {/* MODAL 3: EDIT DATA (TUJUAN ATAU SASARAN)                                */}
            {/* ═════════════════════════════════════════════════════════════════════════ */}
            <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <Edit2 className="h-5 w-5 text-primary" />
                            {editItem?.level === 'goal' ? 'Edit Tujuan Renstra & Indikator' : 'Edit Sasaran Renstra & Indikator'}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            {editItem?.level === 'goal'
                                ? 'Perubahan pada nama Tujuan Renstra akan otomatis terbarui di seluruh Sasaran di bawahnya.'
                                : 'Perbarui data rumusan Sasaran Renstra beserta indikator kinerjanya.'}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleEditSubmit} className="space-y-4">
                        {editItem?.level === 'goal' ? (
                            /* EDIT GOAL */
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold">
                                        Uraian Tujuan Renstra <span className="text-destructive">*</span>
                                    </Label>
                                    <Textarea
                                        rows={2}
                                        value={editGoal}
                                        onChange={(e) => setEditGoal(e.target.value)}
                                        className="text-xs bg-background"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-foreground flex items-center gap-1">
                                            <span className="h-2 w-2 rounded-full bg-sky-500" />
                                            Indikator Tujuan Renstra ({editGoalIndicators.length})
                                        </span>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={addEditGoalIndicator}
                                            className="h-6 text-[11px] px-2 gap-1 border-sky-300 text-sky-700 hover:bg-sky-50 cursor-pointer"
                                        >
                                            <Plus className="h-3 w-3" />
                                            <span>+ Tambah Indikator</span>
                                        </Button>
                                    </div>

                                    {editGoalIndicators.map((gi, idx) => (
                                        <IndicatorFormFields
                                            key={gi.id ?? idx}
                                            indicator={gi}
                                            index={idx}
                                            total={editGoalIndicators.length}
                                            labelPrefix="Indikator Tujuan"
                                            years={years}
                                            accentColor="sky"
                                            onUpdateField={(f, v) => updateEditGoalIndicatorField(idx, f, v)}
                                            onUpdateTarget={(yr, v) => updateEditGoalIndicatorTarget(idx, yr, v)}
                                            onUpdateRealization={(yr, v) => updateEditGoalIndicatorRealization(idx, yr, v)}
                                            onRemove={() => removeEditGoalIndicator(idx)}
                                        />
                                    ))}
                                </div>
                            </div>
                        ) : (
                            /* EDIT OBJECTIVE */
                            <div className="space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                    <div className="md:col-span-10 space-y-1">
                                        <Label className="text-xs font-semibold">
                                            Uraian Sasaran Renstra <span className="text-destructive">*</span>
                                        </Label>
                                        <Input
                                            value={editObjective}
                                            onChange={(e) => setEditObjective(e.target.value)}
                                            className="h-8 text-xs bg-background"
                                            required
                                        />
                                    </div>
                                    <div className="md:col-span-2 space-y-1">
                                        <Label className="text-xs font-semibold">Nomor Urut</Label>
                                        <Input
                                            type="number"
                                            min={1}
                                            value={editOrderNo}
                                            onChange={(e) => setEditOrderNo(Number(e.target.value))}
                                            className="h-8 text-xs bg-background"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-foreground flex items-center gap-1">
                                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                            Indikator Sasaran Renstra ({editObjIndicators.length})
                                        </span>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={addEditObjIndicator}
                                            className="h-6 text-[11px] px-2 gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                                        >
                                            <Plus className="h-3 w-3" />
                                            <span>+ Tambah Indikator</span>
                                        </Button>
                                    </div>

                                    {editObjIndicators.map((oi, idx) => (
                                        <IndicatorFormFields
                                            key={oi.id ?? idx}
                                            indicator={oi}
                                            index={idx}
                                            total={editObjIndicators.length}
                                            labelPrefix="Indikator Sasaran"
                                            years={years}
                                            accentColor="emerald"
                                            onUpdateField={(f, v) => updateEditObjIndicatorField(idx, f, v)}
                                            onUpdateTarget={(yr, v) => updateEditObjIndicatorTarget(idx, yr, v)}
                                            onUpdateRealization={(yr, v) => updateEditObjIndicatorRealization(idx, yr, v)}
                                            onRemove={() => removeEditObjIndicator(idx)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        <DialogFooter className="gap-2 pt-3 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditItem(null)}
                                className="h-8 text-xs"
                                disabled={processingEdit}
                            >
                                Batal
                            </Button>
                            <Button type="submit" size="sm" className="h-8 text-xs" disabled={processingEdit}>
                                {processingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ═════════════════════════════════════════════════════════════════════════ */}
            {/* ALERT DIALOG: DELETE CONFIRMATION                                        */}
            {/* ═════════════════════════════════════════════════════════════════════════ */}
            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-base font-bold text-destructive">
                            Konfirmasi Hapus Data
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-xs space-y-2">
                            <span>Apakah Anda yakin ingin menghapus data ini?</span>
                            {deleteItem?.level === 'goal' ? (
                                <span className="block font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2 rounded border border-rose-200 dark:border-rose-900">
                                    PERINGATAN: Menghapus Tujuan ini juga akan menghapus seluruh Sub-Sasaran Renstra dan Indikator di bawahnya secara permanen!
                                </span>
                            ) : (
                                <span className="block font-medium text-muted-foreground">
                                    Sasaran: <b className="text-foreground">{deleteItem?.objective || '-'}</b>
                                </span>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel className="h-8 text-xs">Batal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="h-8 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Hapus Permanen
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AuthenticatedLayout>
    );
}
