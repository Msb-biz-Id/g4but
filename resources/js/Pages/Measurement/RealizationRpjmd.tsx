import React, { useState, useMemo } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import MeasurementNav from '@/Pages/Measurement/MeasurementNav';
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
    Save,
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
    Pencil,
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

interface RpjmdItem {
    id: number;
    parent_id?: number | null;
    level?: 'goal' | 'objective';
    order_no?: number;
    mission: string | null;
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
    children?: RpjmdItem[];
}

function RpjmdRealizationTrendChart({ years, items, goals }: { years: number[]; items: RpjmdItem[]; goals?: RpjmdItem[] }) {
    const trendData = useMemo(() => {
        // Collect entities to evaluate:
        // Priority 1: If hierarchy `goals` are passed, collect child objectives across goals.
        // If a goal has NO children, include the goal itself so goal-level indicators are evaluated.
        // Priority 2: If `goals` is empty, use `items`.
        const evalEntities: RpjmdItem[] = [];

        if (goals && goals.length > 0) {
            goals.forEach((g) => {
                if (g.children && g.children.length > 0) {
                    evalEntities.push(...g.children);
                } else {
                    evalEntities.push(g);
                }
            });
        } else {
            const objectives = items.filter((it) => it.level !== 'goal');
            if (objectives.length > 0) {
                evalEntities.push(...objectives);
            } else {
                evalEntities.push(...items);
            }
        }

        return years.map((yr) => {
            const entityAchs: number[] = [];
            evalEntities.forEach((it) => {
                const isGoal = it.level === 'goal';
                let indList: IndicatorItem[] = [];
                if (isGoal) {
                    if (it.goal_indicators_list && it.goal_indicators_list.length > 0) {
                        indList = it.goal_indicators_list;
                    } else if (it.objective_indicators_list && it.objective_indicators_list.length > 0) {
                        indList = it.objective_indicators_list;
                    }
                } else {
                    if (it.objective_indicators_list && it.objective_indicators_list.length > 0) {
                        indList = it.objective_indicators_list;
                    } else if (it.goal_indicators_list && it.goal_indicators_list.length > 0) {
                        indList = it.goal_indicators_list;
                    }
                }

                if (indList.length === 0) {
                    indList = [
                        {
                            id: 1,
                            indicator: isGoal ? (it.goal_indicator || '-') : (it.objective_indicator || '-'),
                            unit: isGoal ? (it.goal_indicator_unit || '%') : (it.unit || '%'),
                            measurement_pattern: isGoal ? (it.goal_measurement_pattern || 'Positif') : (it.measurement_pattern || 'Positif'),
                            targets: isGoal ? (it.goal_targets || it.targets || {}) : (it.targets || {}),
                            realizations: isGoal ? (it.goal_realizations || it.realizations || {}) : (it.realizations || {}),
                            calculations: it.calculations || {},
                        },
                    ];
                }

                const validIndAchs: number[] = [];
                indList.forEach((ind) => {
                    let a = ind.calculations?.[yr]?.achievement;
                    if (a === null || a === undefined) {
                        const tRaw = ind.targets?.[yr];
                        const rRaw = ind.realizations?.[yr];
                        if (tRaw !== undefined && tRaw !== null && tRaw !== '' &&
                            rRaw !== undefined && rRaw !== null && rRaw !== '') {
                            const t = Number(tRaw);
                            const r = Number(rRaw);
                            if (!isNaN(t) && !isNaN(r)) {
                                const pol = ind.measurement_pattern || (isGoal ? (it.goal_measurement_pattern || 'Positif') : (it.measurement_pattern || 'Positif'));
                                if (t === 0) {
                                    a = r === 0 ? 100 : 0;
                                } else if (pol === 'Negatif') {
                                    a = Math.max(0, parseFloat((((2 * t - r) / t) * 100).toFixed(2)));
                                } else {
                                    a = Math.max(0, parseFloat(((r / t) * 100).toFixed(2)));
                                }
                            }
                        }
                    }

                    if (a !== null && a !== undefined && !isNaN(a)) {
                        validIndAchs.push(a);
                    }
                });

                if (validIndAchs.length > 0) {
                    const indAvg = validIndAchs.reduce((acc, v) => acc + v, 0) / validIndAchs.length;
                    entityAchs.push(indAvg);
                }
            });

            const avg = entityAchs.length
                ? parseFloat((entityAchs.reduce((acc, v) => acc + v, 0) / entityAchs.length).toFixed(1))
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
                let html = `<div style="font-weight:700;margin-bottom:4px;border-bottom:1px solid #334155;padding-bottom:3px">Tren Capaian Sasaran RPJMD — Tahun ${yr}</div>`;
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

interface RpjmdPeriodInfo {
    id: number;
    code: string;
    name: string;
    start_date?: string;
    end_date?: string;
}

interface Props {
    goals?: RpjmdItem[];
    items: RpjmdItem[];
    years: number[];
    activeYear?: number;
    activeRpjmdPeriod?: RpjmdPeriodInfo | null;
    availableRpjmdPeriods?: RpjmdPeriodInfo[];
    canManage: boolean;
    userIsSpBappeda: boolean;
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
    accentColor?: 'rose' | 'emerald' | 'blue';
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
    accentColor = 'rose',
}: IndicatorFormFieldsProps) {
    const isRose = accentColor === 'rose';
    const isEmerald = accentColor === 'emerald';

    return (
        <div
            className={`p-3 rounded-lg border text-xs space-y-2.5 transition-all ${
                isRose
                    ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                    : isEmerald
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60'
                    : 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/60'
            }`}
        >
            {/* Header: Indikator #X & Remove Button */}
            <div className="flex items-center justify-between border-b pb-1.5 border-border/60">
                <span className="font-bold flex items-center gap-1.5 text-foreground">
                    <span className={`h-2 w-2 rounded-full ${isRose ? 'bg-rose-500' : isEmerald ? 'bg-emerald-500' : 'bg-blue-500'}`} />
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

export default function RealizationRpjmd({
    goals: initialGoals = [],
    items = [],
    years = [],
    activeYear,
    activeRpjmdPeriod,
    availableRpjmdPeriods = [],
    canManage,
    userIsSpBappeda,
}: Props) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
    const [quickAddParentGoal, setQuickAddParentGoal] = useState<RpjmdItem | null>(null);
    const [quickAddGoalNumber, setQuickAddGoalNumber] = useState<number>(1);
    const [nextGoalNumber, setNextGoalNumber] = useState<number>(1);
    const [editItem, setEditItem] = useState<RpjmdItem | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<string>('Semua');
    const [deleteItem, setDeleteItem] = useState<RpjmdItem | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    const [isEditMissionOpen, setIsEditMissionOpen] = useState(false);
    const [missionToEdit, setMissionToEdit] = useState('');
    const [newMissionName, setNewMissionName] = useState('');
    const [isUpdatingMission, setIsUpdatingMission] = useState(false);

    const [createMode, setCreateMode] = useState<'both' | 'objective'>('both');
    const [selectedMissionOption, setSelectedMissionOption] = useState<string>('');
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

    interface GoalFormItem {
        id: number;
        goal: string;
        goal_indicators: IndicatorItem[];
        objectives: ObjectiveFormItem[];
    }

    const emptyGoal = (): GoalFormItem => ({
        id: Date.now() + Math.random(),
        goal: '',
        goal_indicators: [emptyIndicator()],
        objectives: [emptyObjective()],
    });

    const [createForm, setCreateForm] = useState({
        mission: '',
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
    const [editMission, setEditMission] = useState('');
    const [editGoal, setEditGoal] = useState('');
    const [editGoalIndicators, setEditGoalIndicators] = useState<IndicatorItem[]>([]);
    const [editObjective, setEditObjective] = useState('');
    const [editOrderNo, setEditOrderNo] = useState(1);
    const [editObjIndicators, setEditObjIndicators] = useState<IndicatorItem[]>([]);
    const [processingEdit, setProcessingEdit] = useState(false);

    // Build the hierarchical tree: use goals prop if available, or build from items
    const hierarchyGoals = useMemo(() => {
        let rawGoals: RpjmdItem[] = [];
        if (initialGoals && initialGoals.length > 0) {
            rawGoals = initialGoals;
        } else {
            // Fallback: group items by goal
            const goalsMap = new Map<number, RpjmdItem>();
            const orphanObjectives: RpjmdItem[] = [];

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
                const synthetic: RpjmdItem = {
                    id: 0,
                    level: 'goal',
                    mission: items[0].mission,
                    goal: items[0].goal || 'Tujuan RPJMD',
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

        // Group by mission so contiguous goals under the same mission are kept together in order of first appearance
        const missionOrder: string[] = [];
        const missionMap = new Map<string, RpjmdItem[]>();

        rawGoals.forEach((g) => {
            const m = g.mission?.trim() || 'Misi RPJMD';
            if (!missionMap.has(m)) {
                missionMap.set(m, []);
                missionOrder.push(m);
            }
            missionMap.get(m)!.push(g);
        });

        const sorted: RpjmdItem[] = [];
        missionOrder.forEach((m) => {
            sorted.push(...missionMap.get(m)!);
        });

        return sorted;
    }, [initialGoals, items]);

    const availableMissions = useMemo(() => {
        const set = new Set<string>();
        hierarchyGoals.forEach((g) => {
            if (g.mission && g.mission.trim()) {
                set.add(g.mission.trim());
            }
        });
        return Array.from(set);
    }, [hierarchyGoals]);

    const availableGoals = useMemo(() => {
        const missionCounts = new Map<string, number>();
        return hierarchyGoals.map((g) => {
            const m = g.mission?.trim() || 'Misi RPJMD';
            const count = (missionCounts.get(m) || 0) + 1;
            missionCounts.set(m, count);
            return {
                id: g.id,
                goalNo: count,
                mission: g.mission || '-',
                goal: g.goal || 'Tujuan RPJMD',
                label: `(${count}) ${g.goal || 'Tujuan RPJMD'} [Misi: ${g.mission || '-'}]`,
            };
        });
    }, [hierarchyGoals]);

    // Statistics calculated across child objectives (and multi-indicators)
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
            const calc = ind.calculations?.[evalYear] || fallbackCalc?.[evalYear];
            let ach = calc?.achievement;
            let status = calc?.status;

            if (ach === null || ach === undefined) {
                const tRaw = ind.targets?.[evalYear];
                const rRaw = ind.realizations?.[evalYear];
                if (tRaw !== undefined && tRaw !== null && tRaw !== '' &&
                    rRaw !== undefined && rRaw !== null && rRaw !== '') {
                    const t = Number(tRaw);
                    const r = Number(rRaw);
                    if (!isNaN(t) && !isNaN(r)) {
                        const pol = ind.measurement_pattern || fallbackPol || 'Positif';
                        if (t === 0) {
                            ach = r === 0 ? 100 : 0;
                        } else if (pol === 'Negatif') {
                            ach = Math.max(0, parseFloat((((2 * t - r) / t) * 100).toFixed(2)));
                        } else {
                            ach = Math.max(0, parseFloat(((r / t) * 100).toFixed(2)));
                        }
                        status = ach >= 100 ? 'Tercapai' : ach >= 50 ? 'Perlu Perhatian' : 'Kritis';
                    }
                }
            }

            if (ach !== null && ach !== undefined && !isNaN(ach)) {
                totalAchievements.push(ach);
            }
            if (status === 'Tercapai') tercapai++;
            else if (status === 'Perlu Perhatian') perhatian++;
            else if (status === 'Kritis') kritis++;
            else if (status === 'Tidak Dinilai' || (!calc && (ach === null || ach === undefined))) tidakDinilai++;
        };

        hierarchyGoals.forEach((goal) => {
            const children = goal.children || [];
            totalObjectivesCount += children.length;

            if (children.length > 0) {
                children.forEach((child) => {
                    const indList = (child.objective_indicators_list && child.objective_indicators_list.length > 0)
                        ? child.objective_indicators_list
                        : (child.goal_indicators_list && child.goal_indicators_list.length > 0)
                            ? child.goal_indicators_list
                            : [{ indicator: child.objective_indicator || '-', unit: child.unit || '%', targets: child.targets || {}, realizations: child.realizations || {}, calculations: child.calculations, measurement_pattern: child.measurement_pattern }];
                    indList.forEach((ind) => processIndicator(ind, child.calculations, child.measurement_pattern));
                });
            } else {
                // Goal without children: evaluate goal's own indicators
                const goalInds = (goal.goal_indicators_list && goal.goal_indicators_list.length > 0)
                    ? goal.goal_indicators_list
                    : (goal.objective_indicators_list && goal.objective_indicators_list.length > 0)
                        ? goal.objective_indicators_list
                        : [{ indicator: goal.goal_indicator || '-', unit: goal.goal_indicator_unit || '%', targets: goal.goal_targets || goal.targets || {}, realizations: goal.goal_realizations || goal.realizations || {}, calculations: goal.calculations, measurement_pattern: goal.goal_measurement_pattern || goal.measurement_pattern }];
                goalInds.forEach((ind) => processIndicator(ind, goal.calculations, goal.goal_measurement_pattern || goal.measurement_pattern));
            }
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
        const missionCounts = new Map<string, number>();
        return hierarchyGoals.map((goal) => {
            const m = goal.mission?.trim() || 'Misi RPJMD';
            const goalNo = (missionCounts.get(m) || 0) + 1;
            missionCounts.set(m, goalNo);

            const q = searchQuery.toLowerCase().trim();

            const goalIndList = (goal.goal_indicators_list && goal.goal_indicators_list.length > 0)
                ? goal.goal_indicators_list
                : [{ indicator: goal.goal_indicator, unit: goal.goal_indicator_unit }];

            const goalMatchesSearch = !q || (
                (goal.mission && goal.mission.toLowerCase().includes(q)) ||
                (goal.goal && goal.goal.toLowerCase().includes(q)) ||
                goalIndList.some((gi) => (gi.indicator && gi.indicator.toLowerCase().includes(q)) || (gi.unit && gi.unit.toLowerCase().includes(q)))
            );

            const filteredChildren = (goal.children || []).filter((child) => {
                const indList = (child.objective_indicators_list && child.objective_indicators_list.length > 0)
                    ? child.objective_indicators_list
                    : [{ indicator: child.objective_indicator, unit: child.unit, calculations: child.calculations }];

                if (q) {
                    const objMatches = child.objective && child.objective.toLowerCase().includes(q);
                    const indMatches = indList.some(
                        (ind) => (ind.indicator && ind.indicator.toLowerCase().includes(q)) || (ind.unit && ind.unit.toLowerCase().includes(q))
                    );
                    if (!objMatches && !indMatches && !goalMatchesSearch) return false;
                }

                if (selectedStatus !== 'Semua') {
                    const hasStatus = indList.some((ind) => {
                        const st = ind.calculations?.[evalYear]?.status || 'Tidak Dinilai';
                        return st === selectedStatus;
                    });
                    const childSt = child.calculations?.[evalYear]?.status || 'Tidak Dinilai';
                    if (!hasStatus && childSt !== selectedStatus) return false;
                }

                return true;
            });

            let keepGoal = goalMatchesSearch || filteredChildren.length > 0;
            if (selectedStatus !== 'Semua') {
                if (goal.children && goal.children.length > 0) {
                    keepGoal = filteredChildren.length > 0;
                } else {
                    const goalIndList = (goal.goal_indicators_list && goal.goal_indicators_list.length > 0)
                        ? goal.goal_indicators_list
                        : [{ indicator: goal.goal_indicator, unit: goal.goal_indicator_unit, calculations: goal.calculations }];
                    const goalHasStatus = goalIndList.some((ind) => (ind.calculations?.[evalYear]?.status || 'Tidak Dinilai') === selectedStatus)
                        || ((goal.calculations?.[evalYear]?.status || 'Tidak Dinilai') === selectedStatus);
                    keepGoal = goalHasStatus && (!q || goalMatchesSearch);
                }
            }

            return {
                goal,
                goalNo,
                children: filteredChildren,
                visible: keepGoal,
            };
        }).filter((g) => g.visible);
    }, [hierarchyGoals, searchQuery, selectedStatus, evalYear]);

    // Group filtered goals by Mission
    const groupedByMission = useMemo(() => {
        const groups: { mission: string; goals: typeof filteredHierarchy }[] = [];
        const map = new Map<string, typeof filteredHierarchy>();

        filteredHierarchy.forEach((item) => {
            const m = item.goal.mission?.trim() || 'Misi RPJMD';
            if (!map.has(m)) {
                map.set(m, []);
                groups.push({ mission: m, goals: map.get(m)! });
            }
            map.get(m)!.push(item);
        });

        return groups;
    }, [filteredHierarchy]);

    // Pagination by Goal item
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const totalGoals = filteredHierarchy.length;
    const lastPage = Math.max(1, Math.ceil(totalGoals / perPage));
    const safeCurrentPage = Math.min(currentPage, lastPage);
    const from = totalGoals > 0 ? (safeCurrentPage - 1) * perPage + 1 : 0;
    const to = totalGoals > 0 ? Math.min(safeCurrentPage * perPage, totalGoals) : 0;
    const paginatedGoals = filteredHierarchy.slice((safeCurrentPage - 1) * perPage, safeCurrentPage * perPage);

    // Group paginated goals by Mission for clean section dividers
    const paginatedGrouped = useMemo(() => {
        const groups: { mission: string; goals: typeof paginatedGoals }[] = [];
        const map = new Map<string, typeof paginatedGoals>();

        paginatedGoals.forEach((item) => {
            const m = item.goal.mission?.trim() || 'Misi RPJMD';
            if (!map.has(m)) {
                map.set(m, []);
                groups.push({ mission: m, goals: map.get(m)! });
            }
            map.get(m)!.push(item);
        });

        return groups;
    }, [paginatedGoals]);

    // ── Edit Mission Handlers ──────────────────────────────────────────────────
    const openEditMissionModal = (mission: string) => {
        setMissionToEdit(mission);
        setNewMissionName(mission);
        setIsEditMissionOpen(true);
    };

    const handleEditMissionSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMissionName.trim()) return;
        setIsUpdatingMission(true);
        router.post(
            route('measurement.realization.rpjmd.update-mission'),
            {
                old_mission: missionToEdit,
                new_mission: newMissionName.trim(),
            },
            {
                onSuccess: () => {
                    setIsEditMissionOpen(false);
                    setIsUpdatingMission(false);
                },
                onError: () => {
                    setIsUpdatingMission(false);
                },
            }
        );
    };

    // ── Create Modal Handlers ──────────────────────────────────────────────────
    const openCreateModal = () => {
        setNextGoalNumber(hierarchyGoals.length + 1);

        const firstMission = availableMissions[0] ?? '';
        setSelectedMissionOption(firstMission ? firstMission : '__new__');
        setSelectedGoalId(hierarchyGoals[0]?.id ?? null);
        setCreateMode('both');

        setCreateForm({
            mission: firstMission,
            goal: '',
            goal_indicators: [emptyIndicator()],
            objectives: [emptyObjective()],
            goals: [emptyGoal()],
        });
        setIsCreateOpen(true);
    };

    // Goal helpers for Create Form (Multi-Goal)
    const addGoalToCreateForm = () => {
        setCreateForm((prev) => ({
            ...prev,
            goals: [...prev.goals, emptyGoal()],
        }));
    };

    const removeGoalFromCreateForm = (goalIndex: number) => {
        if (createForm.goals.length <= 1) return;
        setCreateForm((prev) => ({
            ...prev,
            goals: prev.goals.filter((_, i) => i !== goalIndex),
        }));
    };

    const updateGoalField = (goalIndex: number, val: string) => {
        setCreateForm((prev) => {
            const copy = [...prev.goals];
            copy[goalIndex] = { ...copy[goalIndex], goal: val };
            return { ...prev, goals: copy };
        });
    };

    const addGoalIndicatorToGoal = (goalIndex: number) => {
        setCreateForm((prev) => {
            const copy = [...prev.goals];
            copy[goalIndex] = {
                ...copy[goalIndex],
                goal_indicators: [...copy[goalIndex].goal_indicators, emptyIndicator()],
            };
            return { ...prev, goals: copy };
        });
    };

    const removeGoalIndicatorFromGoal = (goalIndex: number, indIndex: number) => {
        setCreateForm((prev) => {
            const copy = [...prev.goals];
            if (copy[goalIndex].goal_indicators.length <= 1) return prev;
            copy[goalIndex] = {
                ...copy[goalIndex],
                goal_indicators: copy[goalIndex].goal_indicators.filter((_, i) => i !== indIndex),
            };
            return { ...prev, goals: copy };
        });
    };

    const updateGoalIndicatorFieldInGoal = (goalIndex: number, indIndex: number, field: keyof IndicatorItem, val: any) => {
        setCreateForm((prev) => {
            const copy = [...prev.goals];
            const indCopy = [...copy[goalIndex].goal_indicators];
            indCopy[indIndex] = { ...indCopy[indIndex], [field]: val };
            copy[goalIndex] = { ...copy[goalIndex], goal_indicators: indCopy };
            return { ...prev, goals: copy };
        });
    };

    const updateGoalIndicatorTargetInGoal = (goalIndex: number, indIndex: number, yr: number | string, val: string) => {
        setCreateForm((prev) => {
            const copy = [...prev.goals];
            const indCopy = [...copy[goalIndex].goal_indicators];
            indCopy[indIndex] = { ...indCopy[indIndex], targets: { ...indCopy[indIndex].targets, [yr]: val } };
            copy[goalIndex] = { ...copy[goalIndex], goal_indicators: indCopy };
            return { ...prev, goals: copy };
        });
    };

    const updateGoalIndicatorRealizationInGoal = (goalIndex: number, indIndex: number, yr: number | string, val: string) => {
        setCreateForm((prev) => {
            const copy = [...prev.goals];
            const indCopy = [...copy[goalIndex].goal_indicators];
            indCopy[indIndex] = { ...indCopy[indIndex], realizations: { ...indCopy[indIndex].realizations, [yr]: val } };
            copy[goalIndex] = { ...copy[goalIndex], goal_indicators: indCopy };
            return { ...prev, goals: copy };
        });
    };

    // Objective helpers inside a Goal (Multi-Goal)
    const addObjectiveToGoal = (goalIndex: number) => {
        setCreateForm((prev) => {
            const copy = [...prev.goals];
            copy[goalIndex] = {
                ...copy[goalIndex],
                objectives: [...copy[goalIndex].objectives, emptyObjective()],
            };
            return { ...prev, goals: copy };
        });
    };

    const removeObjectiveFromGoal = (goalIndex: number, objIndex: number) => {
        setCreateForm((prev) => {
            const copy = [...prev.goals];
            if (copy[goalIndex].objectives.length <= 1) return prev;
            copy[goalIndex] = {
                ...copy[goalIndex],
                objectives: copy[goalIndex].objectives.filter((_, i) => i !== objIndex),
            };
            return { ...prev, goals: copy };
        });
    };

    const updateObjectiveFieldInGoal = (goalIndex: number, objIndex: number, val: string) => {
        setCreateForm((prev) => {
            const copy = [...prev.goals];
            const objCopy = [...copy[goalIndex].objectives];
            objCopy[objIndex] = { ...objCopy[objIndex], objective: val };
            copy[goalIndex] = { ...copy[goalIndex], objectives: objCopy };
            return { ...prev, goals: copy };
        });
    };

    const addIndicatorToObjectiveInGoal = (goalIndex: number, objIndex: number) => {
        setCreateForm((prev) => {
            const copy = [...prev.goals];
            const objCopy = [...copy[goalIndex].objectives];
            objCopy[objIndex] = {
                ...objCopy[objIndex],
                indicators: [...objCopy[objIndex].indicators, emptyIndicator()],
            };
            copy[goalIndex] = { ...copy[goalIndex], objectives: objCopy };
            return { ...prev, goals: copy };
        });
    };

    const removeIndicatorFromObjectiveInGoal = (goalIndex: number, objIndex: number, indIndex: number) => {
        setCreateForm((prev) => {
            const copy = [...prev.goals];
            const objCopy = [...copy[goalIndex].objectives];
            if (objCopy[objIndex].indicators.length <= 1) return prev;
            objCopy[objIndex] = {
                ...objCopy[objIndex],
                indicators: objCopy[objIndex].indicators.filter((_, i) => i !== indIndex),
            };
            copy[goalIndex] = { ...copy[goalIndex], objectives: objCopy };
            return { ...prev, goals: copy };
        });
    };

    const updateObjectiveIndicatorFieldInGoal = (goalIndex: number, objIndex: number, indIndex: number, field: keyof IndicatorItem, val: any) => {
        setCreateForm((prev) => {
            const copy = [...prev.goals];
            const objCopy = [...copy[goalIndex].objectives];
            const indCopy = [...objCopy[objIndex].indicators];
            indCopy[indIndex] = { ...indCopy[indIndex], [field]: val };
            objCopy[objIndex] = { ...objCopy[objIndex], indicators: indCopy };
            copy[goalIndex] = { ...copy[goalIndex], objectives: objCopy };
            return { ...prev, goals: copy };
        });
    };

    const updateObjectiveIndicatorTargetInGoal = (goalIndex: number, objIndex: number, indIndex: number, yr: number | string, val: string) => {
        setCreateForm((prev) => {
            const copy = [...prev.goals];
            const objCopy = [...copy[goalIndex].objectives];
            const indCopy = [...objCopy[objIndex].indicators];
            indCopy[indIndex] = { ...indCopy[indIndex], targets: { ...indCopy[indIndex].targets, [yr]: val } };
            objCopy[objIndex] = { ...objCopy[objIndex], indicators: indCopy };
            copy[goalIndex] = { ...copy[goalIndex], objectives: objCopy };
            return { ...prev, goals: copy };
        });
    };

    const updateObjectiveIndicatorRealizationInGoal = (goalIndex: number, objIndex: number, indIndex: number, yr: number | string, val: string) => {
        setCreateForm((prev) => {
            const copy = [...prev.goals];
            const objCopy = [...copy[goalIndex].objectives];
            const indCopy = [...objCopy[objIndex].indicators];
            indCopy[indIndex] = { ...indCopy[indIndex], realizations: { ...indCopy[indIndex].realizations, [yr]: val } };
            objCopy[objIndex] = { ...objCopy[objIndex], indicators: indCopy };
            copy[goalIndex] = { ...copy[goalIndex], objectives: objCopy };
            return { ...prev, goals: copy };
        });
    };

    // Objective helpers for Create Form (Mode: Objective only)
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
            const copy = [...prev.objectives];
            copy[index] = { ...copy[index], objective: val };
            return { ...prev, objectives: copy };
        });
    };

    const addIndicatorToObjective = (objIndex: number) => {
        setCreateForm((prev) => {
            const copy = [...prev.objectives];
            copy[objIndex] = {
                ...copy[objIndex],
                indicators: [...copy[objIndex].indicators, emptyIndicator()],
            };
            return { ...prev, objectives: copy };
        });
    };

    const removeIndicatorFromObjective = (objIndex: number, indIndex: number) => {
        setCreateForm((prev) => {
            const copy = [...prev.objectives];
            if (copy[objIndex].indicators.length <= 1) return prev;
            copy[objIndex] = {
                ...copy[objIndex],
                indicators: copy[objIndex].indicators.filter((_, i) => i !== indIndex),
            };
            return { ...prev, objectives: copy };
        });
    };

    const updateObjectiveIndicatorField = (objIndex: number, indIndex: number, field: keyof IndicatorItem, val: any) => {
        setCreateForm((prev) => {
            const copy = [...prev.objectives];
            const indCopy = [...copy[objIndex].indicators];
            indCopy[indIndex] = { ...indCopy[indIndex], [field]: val };
            copy[objIndex] = { ...copy[objIndex], indicators: indCopy };
            return { ...prev, objectives: copy };
        });
    };

    const updateObjectiveIndicatorTarget = (objIndex: number, indIndex: number, year: number | string, val: string) => {
        setCreateForm((prev) => {
            const copy = [...prev.objectives];
            const indCopy = [...copy[objIndex].indicators];
            indCopy[indIndex] = {
                ...indCopy[indIndex],
                targets: { ...indCopy[indIndex].targets, [year]: val },
            };
            copy[objIndex] = { ...copy[objIndex], indicators: indCopy };
            return { ...prev, objectives: copy };
        });
    };

    const updateObjectiveIndicatorRealization = (objIndex: number, indIndex: number, year: number | string, val: string) => {
        setCreateForm((prev) => {
            const copy = [...prev.objectives];
            const indCopy = [...copy[objIndex].indicators];
            indCopy[indIndex] = {
                ...indCopy[indIndex],
                realizations: { ...indCopy[indIndex].realizations, [year]: val },
            };
            copy[objIndex] = { ...copy[objIndex], indicators: indCopy };
            return { ...prev, objectives: copy };
        });
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (createMode === 'objective') {
            if (!selectedGoalId) {
                alert('Silakan pilih Tujuan Induk terlebih dahulu.');
                return;
            }
            router.post(route('measurement.realization.rpjmd.store'), {
                mode: 'objective',
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

        const missionVal = selectedMissionOption === '__new__' ? createForm.mission : selectedMissionOption;
        const firstGoal = createForm.goals[0];

        router.post(route('measurement.realization.rpjmd.store'), {
            mode: 'both',
            mission: missionVal,
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
    const openQuickAddModal = (goal: RpjmdItem, goalNo: number) => {
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
            route('measurement.realization.rpjmd.store'),
            {
                mode: 'objective',
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
    const openEditModal = (item: RpjmdItem) => {
        setEditItem(item);
        if (item.level === 'goal') {
            setEditMission(item.mission || '');
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
            payload.mission = editMission;
            payload.goal = editGoal;
            payload.goal_indicators = editGoalIndicators;
        } else {
            payload.objective = editObjective;
            payload.order_no = editOrderNo;
            payload.indicators = editObjIndicators;
        }

        router.put(route('measurement.realization.rpjmd.update', editItem.id), payload, {
            onSuccess: () => {
                setEditItem(null);
                setProcessingEdit(false);
            },
            onError: () => {
                setProcessingEdit(false);
            },
        });
    };

    // ── Delete Handlers ────────────────────────────────────────────────────────
    const promptDelete = (item: RpjmdItem) => {
        setDeleteItem(item);
        setIsDeleteOpen(true);
    };

    const confirmDelete = () => {
        if (deleteItem) {
            router.delete(route('measurement.realization.rpjmd.destroy', deleteItem.id), {
                onSuccess: () => {
                    setIsDeleteOpen(false);
                    setDeleteItem(null);
                },
            });
        }
    };

    const exportPdfUrl = route('measurement.realization.rpjmd.export-pdf', activeRpjmdPeriod?.id ? { period_id: activeRpjmdPeriod.id } : {});

    return (
        <AuthenticatedLayout>
            <Head title="Realisasi Kinerja (RPJMD)" />

            <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-full print:p-0">
                {/* Reusable Nav Tab Bar */}
                <div className="print:hidden">
                    <MeasurementNav activeTab="rpjmd" userIsSpBappeda={userIsSpBappeda} exportPdfUrl={exportPdfUrl} />
                </div>

                {/* Tahun Evaluasi Selector Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3 p-2.5 rounded-xl bg-card border border-border/80 shadow-xs print:hidden">
                    <div className="flex flex-wrap items-center gap-2">
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
                    <div className="text-xs text-muted-foreground px-2">
                        Status kartu & filter tabel merekap capaian untuk tahun: <span className="text-primary font-bold">{evalYear}</span>
                    </div>
                </div>

                {/* 8 EXECUTIVE SUMMARY CARDS */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 mb-5 print:hidden">
                    {/* Card 1: Total Tujuan */}
                    <div className="border border-border/70 rounded-xl bg-card p-3 shadow-xs flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Tujuan RPJMD</p>
                            <Layers className="h-4 w-4 text-rose-500" />
                        </div>
                        <p className="text-2xl font-black tracking-tight text-foreground mt-1">{stats.totalGoals}</p>
                        <span className="text-[10px] text-muted-foreground">Tujuan Makro</span>
                    </div>

                    {/* Card 2: Total Sasaran */}
                    <div className="border border-border/70 rounded-xl bg-card p-3 shadow-xs flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Sasaran RPJMD</p>
                            <Target className="h-4 w-4 text-emerald-600" />
                        </div>
                        <p className="text-2xl font-black tracking-tight text-foreground mt-1">{stats.totalObjectives}</p>
                        <span className="text-[10px] text-muted-foreground">Sub-Sasaran Strategis</span>
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

                {/* Grafis Tren Capaian Sasaran RPJMD Multi-Tahun */}
                <Card className="border border-border shadow-xs mb-5 bg-card print:hidden">
                    <CardHeader className="p-4 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b">
                        <div>
                            <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-emerald-600" />
                                <span>Grafik Tren Capaian Sasaran RPJMD Multi-Tahun ({years.length > 0 ? `${years[0]}–${years[years.length - 1]}` : '2026–2030'})</span>
                            </CardTitle>
                            <CardDescription className="text-xs text-muted-foreground mt-0.5">
                                Pergerakan rata-rata capaian realisasi RPJMD terhadap garis Benchmark (100%)
                            </CardDescription>
                        </div>
                        <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 dark:bg-blue-950/50 dark:text-blue-300 px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-800 self-start sm:self-auto">
                            Benchmark: 100%
                        </span>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                        <RpjmdRealizationTrendChart years={years} items={items} goals={hierarchyGoals} />
                    </CardContent>
                </Card>

                {/* Main Card */}
                <Card className="border border-border shadow-sm overflow-hidden">
                    <CardHeader className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 p-4 bg-card border-b">
                        <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                                    <FileSpreadsheet className="h-5 w-5 text-primary shrink-0" />
                                    <span>Realisasi Kinerja (RPJMD)</span>
                                </CardTitle>
                                <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 text-[11px] font-semibold">
                                    Pengampu: Bappeda & Admin Provinsi
                                </Badge>
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-300 text-[11px] font-semibold">
                                    Struktur Berjenjang 1:N
                                </Badge>
                                {activeRpjmdPeriod && (
                                    <Badge variant="outline" className="border-blue-500/60 bg-blue-50/50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300 text-xs font-normal">
                                        Periode: {activeRpjmdPeriod.name}
                                    </Badge>
                                )}
                            </div>
                            <CardDescription className="text-xs text-muted-foreground mt-0.5">
                                Matriks realisasi dan evaluasi berjenjang (1 Tujuan mengayomi banyak Sasaran) dengan penomoran otomatis (1) dan (1.1).
                            </CardDescription>
                        </div>

                        {/* Search & Action Controls */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full lg:w-auto print:hidden">
                            {availableRpjmdPeriods.length > 1 && (
                                <div className="w-48 sm:w-56 shrink-0">
                                    <Select2
                                        value={activeRpjmdPeriod?.id ?? ''}
                                        onChange={(val) => {
                                            const cleanPeriodId = typeof val === 'object' && val !== null
                                                ? String((val as any)?.target?.value ?? (val as any)?.[0] ?? val)
                                                : String(val);
                                            router.get(
                                                route('measurement.realization.rpjmd'),
                                                { period_id: cleanPeriodId },
                                                { preserveState: true, preserveScroll: true }
                                            );
                                        }}
                                        options={availableRpjmdPeriods.map((p) => ({
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
                                        placeholder="Cari misi, tujuan, sasaran..."
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
                                    title="Download PDF Laporan Realisasi RPJMD"
                                >
                                    <FileDown className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">Download PDF</span>
                                    <span className="sm:hidden">PDF</span>
                                </a>

                                {canManage ? (
                                    <Button onClick={openCreateModal} size="sm" className="h-8 gap-1.5 text-xs font-medium shrink-0 whitespace-nowrap bg-primary hover:bg-primary/90">
                                        <Plus className="h-3.5 w-3.5" />
                                        <span>Tambah Misi, Tujuan &amp; Sasaran</span>
                                    </Button>
                                ) : (
                                    <Badge
                                        variant="outline"
                                        className="h-8 text-xs text-muted-foreground gap-1.5 px-2.5 shrink-0 whitespace-nowrap bg-muted/30 border-dashed"
                                        title="Modul ini diampu oleh Bappeda & Admin Provinsi. Akun OPD lain hanya memiliki hak akses Mode Baca."
                                    >
                                        <Lock className="h-3.5 w-3.5" />
                                        <span>Mode Baca (Bappeda / Provinsi)</span>
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
                                            className="sticky top-0 md:left-0 z-40 w-[60px] min-w-[60px] max-w-[60px] px-2 py-2 border-b border-r border-border bg-rose-100 text-rose-950 dark:bg-rose-950 dark:text-rose-100 text-center select-none md:shadow-[1px_0_0_0_rgba(0,0,0,0.1)]"
                                        >
                                            NO
                                        </th>
                                        <th
                                            rowSpan={2}
                                            className="sticky top-0 md:left-[60px] z-40 w-[180px] min-w-[180px] max-w-[180px] px-3 py-2 border-b border-r border-border bg-rose-100 text-rose-950 dark:bg-rose-950 dark:text-rose-100 text-center select-none md:shadow-[3px_0_6px_-2px_rgba(0,0,0,0.15)]"
                                        >
                                            MISI
                                        </th>
                                        <th rowSpan={2} className="sticky top-0 z-30 px-3 py-2 border-b border-r border-border bg-rose-100/95 text-rose-950 dark:bg-rose-950/80 dark:text-rose-100 min-w-[180px] text-center select-none">
                                            TUJUAN
                                        </th>
                                        <th rowSpan={2} className="sticky top-0 z-30 px-3 py-2 border-b border-r border-border bg-rose-100/95 text-rose-950 dark:bg-rose-950/80 dark:text-rose-100 min-w-[160px] text-center select-none">
                                            INDIKATOR TUJUAN
                                        </th>
                                        <th rowSpan={2} className="sticky top-0 z-30 px-2 py-2 border-b border-r border-border bg-rose-100/95 text-rose-950 dark:bg-rose-950/80 dark:text-rose-100 min-w-[65px] text-center select-none" title="Satuan Indikator Tujuan">
                                            SATUAN
                                        </th>
                                        <th
                                            rowSpan={2}
                                            className="sticky top-0 z-30 w-[220px] min-w-[220px] max-w-[220px] px-3 py-2 border-b border-r border-border bg-rose-100/95 text-rose-950 dark:bg-rose-950/80 dark:text-rose-100 text-left font-bold select-none"
                                        >
                                            SASARAN RPJMD
                                        </th>
                                        <th rowSpan={2} className="sticky top-0 z-30 px-3 py-2 border-b border-r border-border bg-rose-100/95 text-rose-950 dark:bg-rose-950/80 dark:text-rose-100 min-w-[180px] text-center select-none">
                                            INDIKATOR SASARAN
                                        </th>
                                        <th rowSpan={2} className="sticky top-0 z-30 px-2 py-2 border-b border-r border-border bg-rose-100/95 text-rose-950 dark:bg-rose-950/80 dark:text-rose-100 min-w-[65px] text-center select-none" title="Satuan Indikator Sasaran">
                                            SATUAN
                                        </th>
                                        <th rowSpan={2} className="sticky top-0 z-30 px-2 py-2 border-b border-r border-border bg-rose-100/95 text-rose-950 dark:bg-rose-950/80 dark:text-rose-100 min-w-[75px] text-center select-none">
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
                                                colSpan={canManage ? 9 + years.length * 4 + 1 : 9 + years.length * 4}
                                                className="p-12 text-center"
                                            >
                                                <div className="max-w-md mx-auto flex flex-col items-center justify-center space-y-3">
                                                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                                                        <Search className="h-6 w-6" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="font-semibold text-sm text-foreground">
                                                            {searchQuery ? 'Indikator Tidak Ditemukan' : 'Belum Ada Data Realisasi RPJMD'}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {searchQuery
                                                                ? `Tidak ada indikator yang sesuai dengan kata kunci "${searchQuery}". Silakan coba kata kunci lain.`
                                                                : `Mulai dengan menambahkan Tujuan & Sasaran RPJMD untuk periode ${years.length > 0 ? `${years[0]}–${years[years.length - 1]}` : 'evaluasi'}.`}
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
                                        paginatedGrouped.map((grp) => (
                                            <React.Fragment key={`mission-grp-${grp.mission}`}>
                                                {/* MISSION BANNER SEPARATOR */}
                                                <tr className="bg-slate-100/90 dark:bg-slate-800/80 border-y border-slate-300 dark:border-slate-700 select-none">
                                                    <td
                                                        colSpan={canManage ? 9 + years.length * 4 + 1 : 9 + years.length * 4}
                                                        className="px-3 py-2 font-bold text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wide bg-slate-100/95 dark:bg-slate-800/95 border-b border-slate-300 dark:border-slate-700"
                                                    >
                                                        <div className="flex items-center justify-between sticky left-3 w-fit min-w-[360px] max-w-full gap-4">
                                                            <div className="flex items-center gap-2">
                                                                <span className="h-2.5 w-2.5 rounded-full bg-rose-600 shrink-0"></span>
                                                                <span>MISI: {grp.mission}</span>
                                                            </div>
                                                            {canManage && (
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => openEditMissionModal(grp.mission)}
                                                                    className="h-6 px-2 text-[11px] font-medium gap-1 bg-white hover:bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600 shadow-2xs cursor-pointer"
                                                                >
                                                                    <Pencil className="h-3 w-3 text-amber-600" />
                                                                    <span>Edit Misi</span>
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>

                                                {/* GOALS & THEIR SUB-OBJECTIVES */}
                                                {(() => {
                                                    const processedGoals = grp.goals.map((item) => {
                                                        const { goal, goalNo, children } = item;
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

                                                        const childrenWithInds = children.map((c) => {
                                                            const inds = (c.objective_indicators_list && c.objective_indicators_list.length > 0)
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
                                                            return { child: c, inds };
                                                        });

                                                        const totalChildIndRows = childrenWithInds.reduce((sum, ci) => sum + ci.inds.length, 0);
                                                        const totalGoalRows = goalInds.length + (childrenWithInds.length === 0 ? 1 : totalChildIndRows);

                                                        return {
                                                            goal,
                                                            goalNo,
                                                            children,
                                                            goalInds,
                                                            childrenWithInds,
                                                            totalGoalRows,
                                                        };
                                                    });

                                                    const totalMissionRows = processedGoals.reduce((sum, pg) => sum + pg.totalGoalRows, 0);

                                                    return processedGoals.map(({ goal, goalNo, children, goalInds, childrenWithInds, totalGoalRows }, goalIdx) => (
                                                        <React.Fragment key={`goal-block-${goal.id}`}>
                                                            {/* ── GOAL INDICATOR ROWS ── */}
                                                            {goalInds.map((gInd, gIdx) => (
                                                                <tr
                                                                    key={`goal-ind-${goal.id}-${gInd.id ?? gIdx}`}
                                                                    className={`bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-100/40 dark:hover:bg-rose-900/30 transition-colors ${
                                                                        gIdx === 0 ? 'border-t-2 border-rose-300 dark:border-rose-800' : ''
                                                                    }`}
                                                                >
                                                                    {/* Row 0 of Goal: Spans NO, MISI (Sekali per Misi dengan totalMissionRows), TUJUAN */}
                                                                    {gIdx === 0 && (
                                                                        <>
                                                                            <td
                                                                                rowSpan={totalGoalRows}
                                                                                className="md:sticky md:left-0 z-10 w-[60px] min-w-[60px] max-w-[60px] px-2 py-2.5 border-b border-r border-border text-center align-top font-mono font-bold text-rose-900 dark:text-rose-200 bg-rose-50/90 dark:bg-rose-950/80 md:shadow-[1px_0_0_0_rgba(0,0,0,0.1)]"
                                                                            >
                                                                                ({goalNo})
                                                                            </td>
                                                                            {goalIdx === 0 && (
                                                                                <td
                                                                                    rowSpan={totalMissionRows}
                                                                                    className="md:sticky md:left-[60px] z-10 w-[180px] min-w-[180px] max-w-[180px] px-3 py-2 border-b border-r border-border align-top text-xs text-slate-700 dark:text-slate-300 leading-relaxed break-words bg-rose-50/90 dark:bg-rose-950/80 md:shadow-[3px_0_6px_-2px_rgba(0,0,0,0.15)]"
                                                                                >
                                                                                    {grp.mission || '-'}
                                                                                </td>
                                                                            )}
                                                                            <td
                                                                                rowSpan={totalGoalRows}
                                                                                className="px-3 py-2 border-b border-r border-border align-top text-foreground leading-relaxed min-w-[180px] bg-rose-50/30 dark:bg-rose-950/20"
                                                                            >
                                                                                <div className="flex items-center gap-1.5 mb-1">
                                                                                    <Badge variant="outline" className="bg-rose-100 text-rose-900 dark:bg-rose-900 dark:text-rose-100 border-rose-300 text-[10px] font-bold px-1.5 py-0">
                                                                                        TUJUAN RPJMD
                                                                                    </Badge>
                                                                                </div>
                                                                                <div className="font-semibold text-xs text-slate-900 dark:text-white leading-snug">
                                                                                    {goal.goal || '-'}
                                                                                </div>
                                                                            </td>
                                                                        </>
                                                                    )}

                                                                    {/* INDIKATOR TUJUAN */}
                                                                    <td className="px-3 py-2 border-b border-r border-border align-top text-foreground leading-relaxed min-w-[160px]">
                                                                        <div className="font-medium text-xs text-slate-800 dark:text-slate-200 leading-snug">
                                                                            {goalInds.length > 1 && (
                                                                                <span className="font-mono text-[10px] font-bold text-rose-700 dark:text-rose-400 mr-1">
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
                                                                                className="w-[220px] min-w-[220px] max-w-[220px] px-3 py-2 border-b border-r border-border align-top bg-rose-50/20 dark:bg-rose-950/10"
                                                                            >
                                                                                <div className="flex flex-col gap-1.5">
                                                                                    <span className="text-[11px] font-semibold text-slate-500 italic">
                                                                                        Mengayomi {children.length} Sasaran Strategis
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
                                                                                className="px-3 py-2 border-b border-r border-border align-top text-center text-slate-400 min-w-[180px] bg-rose-50/20 dark:bg-rose-950/10"
                                                                            >
                                                                                —
                                                                            </td>
                                                                            <td
                                                                                rowSpan={goalInds.length}
                                                                                className="px-2 py-2 border-b border-r border-border text-center align-top text-slate-400 min-w-[65px] bg-rose-50/20 dark:bg-rose-950/10"
                                                                            >
                                                                                —
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
                                                                            <span className="text-slate-400">—</span>
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
                                                                                : '—'}
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
                                                                                : '—'}
                                                                        </td>
                                                                    ))}

                                                                    {/* CAPAIAN TUJUAN (Soft Amber) */}
                                                                    {years.map((yr) => {
                                                                        const calc = gInd.calculations?.[yr];
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
                                                                                {calc && calc.achievement !== null ? `${calc.achievement.toFixed(2)}%` : '—'}
                                                                            </td>
                                                                        );
                                                                    })}

                                                                    {/* STATUS TUJUAN */}
                                                                    {years.map((yr) => {
                                                                        const calc = gInd.calculations?.[yr];
                                                                        const isSelected = evalYear === yr;
                                                                        return (
                                                                            <td
                                                                                key={`g-s-${yr}-${gIdx}`}
                                                                                className={`px-1.5 py-2 border-b border-r border-border text-center align-top ${
                                                                                    isSelected ? 'bg-amber-100/50 dark:bg-amber-900/40' : 'bg-amber-50/20 dark:bg-amber-950/10'
                                                                                }`}
                                                                            >
                                                                                {calc ? (
                                                                                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold border ${calc.bgClass} whitespace-nowrap`}>
                                                                                        {calc.status}
                                                                                    </span>
                                                                                ) : (
                                                                                    '—'
                                                                                )}
                                                                            </td>
                                                                        );
                                                                    })}

                                                                    {/* AKSI TUJUAN (Spanned across goal indicators) */}
                                                                    {gIdx === 0 && canManage && (
                                                                        <td
                                                                            rowSpan={goalInds.length}
                                                                            className="px-2 py-2 border-b border-border text-center align-top whitespace-nowrap print:hidden bg-rose-50/20 dark:bg-rose-950/10"
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
                                                                        —
                                                                    </td>
                                                                    <td className="px-2 py-2 border-b border-r border-border text-center text-slate-400 bg-white dark:bg-slate-900">
                                                                        —
                                                                    </td>
                                                                    <td
                                                                        colSpan={canManage ? 4 + years.length * 4 + 1 : 4 + years.length * 4}
                                                                        className="px-6 py-2.5 text-xs text-muted-foreground italic border-b bg-white dark:bg-slate-900"
                                                                    >
                                                                        Belum ada Sasaran di bawah Tujuan ini.{' '}
                                                                        {canManage && (
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
                                                                                    <td
                                                                                        rowSpan={inds.length}
                                                                                        className="px-3 py-2 border-b border-r border-border text-center align-top text-slate-400 min-w-[160px] bg-white dark:bg-slate-900"
                                                                                    >
                                                                                        —
                                                                                    </td>
                                                                                    <td
                                                                                        rowSpan={inds.length}
                                                                                        className="px-2 py-2 border-b border-r border-border text-center align-top text-slate-400 min-w-[65px] bg-white dark:bg-slate-900"
                                                                                    >
                                                                                        —
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
                                                                                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                                                                                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                                                                                    }`}
                                                                                >
                                                                                    {cInd.measurement_pattern || 'Positif'}
                                                                                </span>
                                                                            </td>

                                                                            {/* TARGET SASARAN (Soft Blue) */}
                                                                            {years.map((yr) => (
                                                                                <td
                                                                                    key={`c-t-${yr}-${child.id}-${iIdx}`}
                                                                                    className="px-2 py-2 border-b border-r border-border text-right align-top font-mono tabular-nums bg-blue-50/20 dark:bg-blue-950/10 text-slate-700 dark:text-slate-300"
                                                                                >
                                                                                    {cInd.targets?.[yr] !== undefined && cInd.targets?.[yr] !== null && cInd.targets?.[yr] !== ''
                                                                                        ? Number(cInd.targets[yr]).toLocaleString('id-ID')
                                                                                        : '-'}
                                                                                </td>
                                                                            ))}

                                                                            {/* REALISASI SASARAN (Soft Emerald) */}
                                                                            {years.map((yr) => (
                                                                                <td
                                                                                    key={`c-r-${yr}-${child.id}-${iIdx}`}
                                                                                    className="px-2 py-2 border-b border-r border-border text-right align-top font-mono tabular-nums bg-emerald-50/20 dark:bg-emerald-950/10 text-slate-700 dark:text-slate-300"
                                                                                >
                                                                                    {cInd.realizations?.[yr] !== undefined && cInd.realizations?.[yr] !== null && cInd.realizations?.[yr] !== ''
                                                                                        ? Number(cInd.realizations[yr]).toLocaleString('id-ID')
                                                                                        : '-'}
                                                                                </td>
                                                                            ))}

                                                                            {/* CAPAIAN (%) SASARAN (Soft Amber) */}
                                                                            {years.map((yr) => {
                                                                                const calc = cInd.calculations?.[yr];
                                                                                const isSelected = evalYear === yr;
                                                                                return (
                                                                                    <td
                                                                                        key={`c-ach-${yr}-${child.id}-${iIdx}`}
                                                                                        className={`px-2 py-2 border-b border-r border-border text-right align-top font-mono tabular-nums font-bold text-foreground ${
                                                                                            isSelected
                                                                                                ? 'bg-amber-100/40 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200'
                                                                                                : 'bg-amber-50/20 dark:bg-amber-950/10'
                                                                                        }`}
                                                                                    >
                                                                                        {calc && calc.achievement !== null
                                                                                            ? `${calc.achievement.toFixed(2)}%`
                                                                                            : '-'}
                                                                                    </td>
                                                                                );
                                                                            })}

                                                                            {/* STATUS SASARAN */}
                                                                            {years.map((yr) => {
                                                                                const calc = cInd.calculations?.[yr];
                                                                                const isSelected = evalYear === yr;
                                                                                return (
                                                                                    <td
                                                                                        key={`c-st-${yr}-${child.id}-${iIdx}`}
                                                                                        className={`px-1.5 py-2 border-b border-r border-border text-center align-top ${
                                                                                            isSelected ? 'bg-amber-100/40 dark:bg-amber-900/30' : 'bg-amber-50/20 dark:bg-amber-950/10'
                                                                                        }`}
                                                                                    >
                                                                                        {calc ? (
                                                                                            <span
                                                                                                className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold border ${calc.bgClass} whitespace-nowrap ${
                                                                                                    isSelected ? 'shadow-xs ring-1 ring-amber-400/60' : ''
                                                                                                }`}
                                                                                            >
                                                                                                {calc.status}
                                                                                            </span>
                                                                                        ) : (
                                                                                            '-'
                                                                                        )}
                                                                                    </td>
                                                                                );
                                                                            })}

                                                                            {/* AKSI SUB-SASARAN (Spanned across Sasaran's indicators) */}
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
                                                    ));
                                                })()}
                                            </React.Fragment>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Kriteria Status Kinerja Legend */}
                        <div className="p-3 bg-muted/20 border-b flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground print:hidden">
                            <span className="font-semibold text-foreground">Kriteria Status Kinerja:</span>
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
                            totalItems={totalGoals}
                            perPage={perPage}
                            currentPage={safeCurrentPage}
                            lastPage={lastPage}
                            itemLabel="Tujuan RPJMD"
                            onPerPageChange={(val) => {
                                setPerPage(val);
                                setCurrentPage(1);
                            }}
                            onClientPageChange={(p) => setCurrentPage(p)}
                        />
                    </CardContent>
                </Card>

                {/* =========================================================================
                    MODAL 1: CREATE DYNAMIC MULTI-SASARAN (1 TUJUAN -> N SASARAN)
                ========================================================================== */}
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
                        <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
                            <DialogTitle className="flex items-center gap-2 text-base font-bold">
                                <FileSpreadsheet className="h-5 w-5 text-primary" />
                                Tambah Misi, Tujuan & Sasaran RPJMD
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">
                                Masukkan Misi, Tujuan RPJMD beserta Sasaran strategis di bawahnya.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleCreateSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
                            {/* PILIHAN MODE TAMBAH: TUJUAN BARU vs SASARAN DI TUJUAN EKSISTING */}
                            {availableGoals.length > 0 && (
                                <div className="flex items-center gap-1.5 p-1 bg-muted/80 rounded-lg w-fit border text-xs">
                                    <button
                                        type="button"
                                        onClick={() => setCreateMode('both')}
                                        className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                                            createMode === 'both'
                                                ? 'bg-background text-primary shadow-xs'
                                                : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        + Buat Tujuan Baru (+ Sasaran)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setCreateMode('objective');
                                            if (!selectedGoalId && availableGoals.length > 0) {
                                                setSelectedGoalId(availableGoals[0].id);
                                            }
                                        }}
                                        className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                                            createMode === 'objective'
                                                ? 'bg-background text-primary shadow-xs'
                                                : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        + Tambah Sasaran ke Tujuan yang Sudah Ada
                                    </button>
                                </div>
                            )}

                            {createMode === 'objective' ? (
                                /* MODE TAMBAH SASARAN KE TUJUAN EKSISTING */
                                <div className="space-y-4">
                                    <div className="p-3.5 bg-muted/40 border-2 border-primary/20 rounded-lg space-y-3">
                                        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                                            <Layers className="h-4 w-4 text-primary" />
                                            PILIH TUJUAN INDUK RPJMD
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs font-semibold">Tujuan Induk (Pilih dari daftar)</Label>
                                            <Select2
                                                value={selectedGoalId ? String(selectedGoalId) : ''}
                                                onChange={(val) => setSelectedGoalId(Number(val))}
                                                options={availableGoals.map((g) => ({
                                                    value: String(g.id),
                                                    label: g.label,
                                                }))}
                                                placeholder="Pilih Tujuan Induk RPJMD..."
                                            />
                                        </div>
                                        {selectedGoalId && (() => {
                                            const goalObj = availableGoals.find((g) => g.id === selectedGoalId);
                                            if (!goalObj) return null;
                                            return (
                                                <div className="p-2.5 bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded space-y-1 text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <Badge className="bg-rose-600 text-white text-[10px]">Tujuan ({goalObj.goalNo})</Badge>
                                                        <span className="font-semibold text-rose-950 dark:text-rose-100">{goalObj.goal}</span>
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground">Misi: {goalObj.mission}</p>
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    {/* DAFTAR SASARAN STRATEGIS */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between border-b pb-1.5">
                                            <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                                                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                                                DAFTAR SASARAN STRATEGIS ({createForm.objectives.length} Sasaran)
                                            </div>
                                        </div>

                                        {createForm.objectives.map((obj, index) => (
                                            <div
                                                key={`create-obj-${index}`}
                                                className="p-3.5 bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg space-y-3 relative group"
                                            >
                                                <div className="flex items-center justify-between border-b border-emerald-200 dark:border-emerald-800 pb-1.5">
                                                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
                                                        Sasaran #{index + 1}
                                                    </span>
                                                    {createForm.objectives.length > 1 && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => removeObjectiveFromCreateForm(index)}
                                                            className="h-6 px-2 text-rose-600 hover:bg-rose-100 hover:text-rose-700 text-xs gap-1"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                            <span>Hapus Sasaran</span>
                                                        </Button>
                                                    )}
                                                </div>

                                                <div className="space-y-1">
                                                    <Label className="text-xs font-semibold">Sasaran RPJMD</Label>
                                                    <Textarea
                                                        value={obj.objective}
                                                        onChange={(e) => updateObjectiveField(index, e.target.value)}
                                                        placeholder="Sasaran strategis..."
                                                        className="min-h-[45px] text-xs bg-background"
                                                        required
                                                    />
                                                </div>

                                                {/* REPEATER INDIKATOR SASARAN */}
                                                <div className="space-y-2 pt-1">
                                                    <div className="flex items-center justify-between">
                                                        <Label className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                                                            Indikator Sasaran ({obj.indicators.length})
                                                        </Label>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => addIndicatorToObjective(index)}
                                                            className="h-6 text-[11px] px-2 gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-100/50 dark:border-emerald-800 dark:text-emerald-300 cursor-pointer"
                                                        >
                                                            <Plus className="h-3 w-3" />
                                                            <span>+ Tambah Indikator Sasaran</span>
                                                        </Button>
                                                    </div>
                                                    <div className="space-y-2.5">
                                                        {obj.indicators.map((oInd, oIdx) => (
                                                            <IndicatorFormFields
                                                                key={`create-obj-ind-${index}-${oInd.id ?? oIdx}`}
                                                                indicator={oInd}
                                                                index={oIdx}
                                                                total={obj.indicators.length}
                                                                labelPrefix="Indikator Sasaran"
                                                                years={years}
                                                                onUpdateField={(field, val) => updateObjectiveIndicatorField(index, oIdx, field, val)}
                                                                onUpdateTarget={(yr, val) => updateObjectiveIndicatorTarget(index, oIdx, yr, val)}
                                                                onUpdateRealization={(yr, val) => updateObjectiveIndicatorRealization(index, oIdx, yr, val)}
                                                                onRemove={() => removeIndicatorFromObjective(index, oIdx)}
                                                                accentColor="emerald"
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={addObjectiveToCreateForm}
                                            className="w-full h-8 text-xs gap-1.5 border-dashed border-emerald-500 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            <span>+ Tambah Sasaran</span>
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                /* MODE BUAT TUJUAN BARU (+ SASARAN) */
                                <>
                                    {/* LEVEL 1: MISI RPJMD */}
                                    <div className="p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2">
                                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1">
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                                                <span className="h-2 w-2 rounded-full bg-slate-500"></span>
                                                LEVEL 1: MISI RPJMD
                                            </div>
                                            {availableMissions.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (selectedMissionOption === '__new__') {
                                                            const def = availableMissions[0] || '';
                                                            setSelectedMissionOption(def);
                                                            setCreateForm((prev) => ({ ...prev, mission: def }));
                                                        } else {
                                                            setSelectedMissionOption('__new__');
                                                            setCreateForm((prev) => ({ ...prev, mission: '' }));
                                                        }
                                                    }}
                                                    className="text-xs text-primary hover:underline font-medium cursor-pointer"
                                                >
                                                    {selectedMissionOption === '__new__' ? '← Pilih Misi yang Sudah Ada' : '+ Ketik Misi Baru'}
                                                </button>
                                            )}
                                        </div>

                                        {availableMissions.length > 0 && selectedMissionOption !== '__new__' ? (
                                            <div className="space-y-1">
                                                <Label className="text-xs font-semibold">Pilih Misi yang Sudah Ada</Label>
                                                <Select2
                                                    value={selectedMissionOption}
                                                    onChange={(val) => {
                                                        setSelectedMissionOption(val);
                                                        setCreateForm((prev) => ({ ...prev, mission: val }));
                                                    }}
                                                    options={availableMissions.map((m) => ({ value: m, label: m }))}
                                                    placeholder="Pilih Misi RPJMD..."
                                                />
                                            </div>
                                        ) : (
                                            <div className="space-y-1">
                                                <Label className="text-xs font-semibold">
                                                    {availableMissions.length > 0 ? 'Tuliskan Misi RPJMD Baru' : 'Misi RPJMD'} <span className="text-destructive">*</span>
                                                </Label>
                                                <Input
                                                    value={createForm.mission}
                                                    onChange={(e) => setCreateForm({ ...createForm, mission: e.target.value })}
                                                    placeholder="cth: Mewujudkan Sumber Daya Manusia yang Berkualitas dan Berdaya Saing..."
                                                    className="h-8 text-xs bg-background"
                                                    required={createMode === 'both'}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* LEVEL 2: DAFTAR TUJUAN RPJMD */}
                                    <div className="space-y-4 pt-1">
                                        <div className="flex items-center justify-between border-b pb-1">
                                            <div className="flex items-center gap-2 text-xs font-bold text-rose-950 dark:text-rose-200">
                                                <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                                                LEVEL 2: DAFTAR TUJUAN RPJMD ({createForm.goals.length} Tujuan)
                                            </div>
                                        </div>

                                        {createForm.goals.map((goalItem, gIdx) => (
                                            <div
                                                key={`create-goal-${goalItem.id ?? gIdx}`}
                                                className="p-3.5 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-lg space-y-3.5"
                                            >
                                                <div className="flex items-center justify-between border-b border-rose-200 dark:border-rose-900 pb-1.5">
                                                    <span className="text-xs font-bold text-rose-950 dark:text-rose-200 flex items-center gap-1.5">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-rose-600"></span>
                                                        Tujuan #{gIdx + 1}
                                                    </span>
                                                    {createForm.goals.length > 1 && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => removeGoalFromCreateForm(gIdx)}
                                                            className="h-6 px-2 text-rose-600 hover:bg-rose-100 hover:text-rose-700 text-xs gap-1"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                            <span>Hapus Tujuan</span>
                                                        </Button>
                                                    )}
                                                </div>

                                                <div className="space-y-1">
                                                    <Label className="text-xs font-semibold">Tujuan RPJMD <span className="text-destructive">*</span></Label>
                                                    <Textarea
                                                        value={goalItem.goal}
                                                        onChange={(e) => updateGoalField(gIdx, e.target.value)}
                                                        placeholder="Tujuan RPJMD makro..."
                                                        className="min-h-[50px] text-xs bg-background"
                                                        required={createMode === 'both'}
                                                    />
                                                </div>

                                                {/* REPEATER INDIKATOR TUJUAN */}
                                                <div className="space-y-2 pt-1">
                                                    <div className="flex items-center justify-between">
                                                        <Label className="text-xs font-bold text-rose-950 dark:text-rose-200 flex items-center gap-1.5">
                                                            <span>Indikator Tujuan ({goalItem.goal_indicators.length})</span>
                                                        </Label>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => addGoalIndicatorToGoal(gIdx)}
                                                            className="h-6 text-[11px] px-2 gap-1 border-rose-300 text-rose-700 hover:bg-rose-100/60 dark:border-rose-800 dark:text-rose-300 cursor-pointer"
                                                        >
                                                            <Plus className="h-3 w-3" />
                                                            <span>+ Tambah Indikator Tujuan</span>
                                                        </Button>
                                                    </div>
                                                    <div className="space-y-2.5">
                                                        {goalItem.goal_indicators.map((gInd, indIdx) => (
                                                            <IndicatorFormFields
                                                                key={`create-goal-ind-${gIdx}-${gInd.id ?? indIdx}`}
                                                                indicator={gInd}
                                                                index={indIdx}
                                                                total={goalItem.goal_indicators.length}
                                                                labelPrefix="Indikator Tujuan"
                                                                years={years}
                                                                onUpdateField={(field, val) => updateGoalIndicatorFieldInGoal(gIdx, indIdx, field, val)}
                                                                onUpdateTarget={(yr, val) => updateGoalIndicatorTargetInGoal(gIdx, indIdx, yr, val)}
                                                                onUpdateRealization={(yr, val) => updateGoalIndicatorRealizationInGoal(gIdx, indIdx, yr, val)}
                                                                onRemove={() => removeGoalIndicatorFromGoal(gIdx, indIdx)}
                                                                accentColor="rose"
                                                            />
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* SUB-SECTION: SASARAN DI BAWAH TUJUAN INI */}
                                                <div className="p-3 bg-white/70 dark:bg-slate-900/60 border border-emerald-200 dark:border-emerald-800/60 rounded-lg space-y-3">
                                                    <div className="flex items-center justify-between border-b border-emerald-100 dark:border-emerald-900/40 pb-1.5">
                                                        <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                                                            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                                                            DAFTAR SASARAN STRATEGIS ({goalItem.objectives.length} Sasaran)
                                                        </span>
                                                    </div>

                                                    <div className="space-y-2.5">
                                                        {goalItem.objectives.map((obj, oIdx) => (
                                                            <div
                                                                key={`create-goal-${gIdx}-obj-${oIdx}`}
                                                                className="p-3 bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg space-y-2.5 relative group"
                                                            >
                                                                <div className="flex items-center justify-between border-b border-emerald-200 dark:border-emerald-800 pb-1">
                                                                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                                                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
                                                                        Sasaran #{oIdx + 1}
                                                                    </span>
                                                                    {goalItem.objectives.length > 1 && (
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => removeObjectiveFromGoal(gIdx, oIdx)}
                                                                            className="h-6 px-2 text-rose-600 hover:bg-rose-100 hover:text-rose-700 text-xs gap-1"
                                                                        >
                                                                            <Trash2 className="h-3 w-3" />
                                                                            <span>Hapus Sasaran</span>
                                                                        </Button>
                                                                    )}
                                                                </div>

                                                                <div className="space-y-1">
                                                                    <Label className="text-xs font-semibold">Sasaran RPJMD</Label>
                                                                    <Textarea
                                                                        value={obj.objective}
                                                                        onChange={(e) => updateObjectiveFieldInGoal(gIdx, oIdx, e.target.value)}
                                                                        placeholder="Sasaran strategis..."
                                                                        className="min-h-[45px] text-xs bg-background"
                                                                        required
                                                                    />
                                                                </div>

                                                                {/* REPEATER INDIKATOR SASARAN */}
                                                                <div className="space-y-2 pt-1">
                                                                    <div className="flex items-center justify-between">
                                                                        <Label className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                                                                            Indikator Sasaran ({obj.indicators.length})
                                                                        </Label>
                                                                        <Button
                                                                            type="button"
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => addIndicatorToObjectiveInGoal(gIdx, oIdx)}
                                                                            className="h-6 text-[11px] px-2 gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-100/50 dark:border-emerald-800 dark:text-emerald-300 cursor-pointer"
                                                                        >
                                                                            <Plus className="h-3 w-3" />
                                                                            <span>+ Tambah Indikator Sasaran</span>
                                                                        </Button>
                                                                    </div>
                                                                    <div className="space-y-2.5">
                                                                        {obj.indicators.map((oInd, indIdx) => (
                                                                            <IndicatorFormFields
                                                                                key={`create-goal-${gIdx}-obj-${oIdx}-ind-${oInd.id ?? indIdx}`}
                                                                                indicator={oInd}
                                                                                index={indIdx}
                                                                                total={obj.indicators.length}
                                                                                labelPrefix="Indikator Sasaran"
                                                                                years={years}
                                                                                onUpdateField={(field, val) => updateObjectiveIndicatorFieldInGoal(gIdx, oIdx, indIdx, field, val)}
                                                                                onUpdateTarget={(yr, val) => updateObjectiveIndicatorTargetInGoal(gIdx, oIdx, indIdx, yr, val)}
                                                                                onUpdateRealization={(yr, val) => updateObjectiveIndicatorRealizationInGoal(gIdx, oIdx, indIdx, yr, val)}
                                                                                onRemove={() => removeIndicatorFromObjectiveInGoal(gIdx, oIdx, indIdx)}
                                                                                accentColor="emerald"
                                                                            />
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* SATU TOMBOL TAMBAH SASARAN DI BAWAH DAFTAR SASARAN */}
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => addObjectiveToGoal(gIdx)}
                                                        className="w-full h-8 text-xs gap-1.5 border-dashed border-emerald-500 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer"
                                                    >
                                                        <Plus className="h-3.5 w-3.5" />
                                                        <span>+ Tambah Sasaran</span>
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}

                                        {/* SATU TOMBOL TAMBAH TUJUAN DI BAWAH DAFTAR TUJUAN */}
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={addGoalToCreateForm}
                                            className="w-full h-9 text-xs font-semibold gap-1.5 border-dashed border-rose-400 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                                        >
                                            <Plus className="h-4 w-4" />
                                            <span>+ Tambah Tujuan</span>
                                        </Button>
                                    </div>
                                </>
                            )}

                            </div>{/* end scrollable body */}

                            <DialogFooter className="px-5 py-3 border-t bg-background shrink-0 flex items-center justify-end gap-2 w-full">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsCreateOpen(false)}
                                >
                                    Batal
                                </Button>
                                <Button type="submit" size="sm" className="gap-1.5 font-medium bg-primary hover:bg-primary/90">
                                    <Save className="h-4 w-4" />
                                    <span>{createMode === 'objective' ? 'Simpan Sasaran' : 'Simpan Misi, Tujuan & Sasaran'}</span>
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* =========================================================================
                    MODAL 2: QUICK ADD CHILD SASARAN UNDER EXISTING TUJUAN
                ========================================================================== */}
                <Dialog open={isQuickAddOpen} onOpenChange={setIsQuickAddOpen}>
                    <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
                        <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
                            <DialogTitle className="flex items-center gap-2 text-base font-bold">
                                <FolderPlus className="h-5 w-5 text-emerald-600" />
                                Tambah Sub-Sasaran di Bawah Tujuan ({quickAddGoalNumber})
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">
                                Menambahkan sasaran strategis baru yang langsung terafiliasi dengan Tujuan induk berikut.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleQuickAddSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
                        {quickAddParentGoal && (
                            <div className="p-3 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-lg space-y-1">
                                <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wide">
                                    Tujuan Induk ({quickAddGoalNumber})
                                </span>
                                <p className="text-xs font-semibold text-rose-950 dark:text-rose-100">
                                    {quickAddParentGoal.goal}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                    Misi: {quickAddParentGoal.mission || '-'}
                                </p>
                            </div>
                        )}

                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">Sasaran RPJMD <span className="text-destructive">*</span></Label>
                                <Textarea
                                    value={quickObjective}
                                    onChange={(e) => setQuickObjective(e.target.value)}
                                    placeholder="Sasaran strategis..."
                                    className="min-h-[55px] text-xs bg-background"
                                    required
                                />
                            </div>

                            {/* REPEATER INDIKATOR SASARAN */}
                            <div className="space-y-2 pt-1">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                                        Indikator Sasaran ({quickIndicators.length})
                                    </Label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={addQuickIndicator}
                                        className="h-6 text-[11px] px-2 gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-100/50 dark:border-emerald-800 dark:text-emerald-300 cursor-pointer"
                                    >
                                        <Plus className="h-3 w-3" />
                                        <span>+ Tambah Indikator Sasaran</span>
                                    </Button>
                                </div>
                                <div className="space-y-2.5">
                                    {quickIndicators.map((qi, qIdx) => (
                                        <IndicatorFormFields
                                            key={`quick-ind-${qi.id ?? qIdx}`}
                                            indicator={qi}
                                            index={qIdx}
                                            total={quickIndicators.length}
                                            labelPrefix="Indikator Sasaran"
                                            years={years}
                                            onUpdateField={(field, val) => updateQuickIndicatorField(qIdx, field, val)}
                                            onUpdateTarget={(yr, val) => updateQuickIndicatorTarget(qIdx, yr, val)}
                                            onUpdateRealization={(yr, val) => updateQuickIndicatorRealization(qIdx, yr, val)}
                                            onRemove={() => removeQuickIndicator(qIdx)}
                                            accentColor="emerald"
                                        />
                                    ))}
                                </div>
                            </div>
                            </div>{/* end scrollable body */}

                            <DialogFooter className="px-5 py-3 border-t bg-background shrink-0 flex-row justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setIsQuickAddOpen(false);
                                        setQuickAddParentGoal(null);
                                    }}
                                >
                                    Batal
                                </Button>
                                <Button type="submit" size="sm" disabled={processingQuick} className="gap-1.5 font-medium bg-emerald-600 hover:bg-emerald-700 text-white">
                                    <Save className="h-4 w-4" />
                                    Simpan Sub-Sasaran
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* =========================================================================
                    MODAL 3: EDIT (GOAL OR OBJECTIVE)
                ========================================================================== */}
                <Dialog
                    open={!!editItem}
                    onOpenChange={(open) => {
                        if (!open) {
                            setEditItem(null);
                        }
                    }}
                >
                    <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
                        <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
                            <DialogTitle className="flex items-center gap-2">
                                <Edit2 className="h-5 w-5 text-primary" />
                                {editItem?.level === 'goal' ? 'Edit Data Tujuan RPJMD' : 'Edit Data Sasaran RPJMD'}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">
                                {editItem?.level === 'goal'
                                    ? 'Memperbarui Tujuan RPJMD. Perubahan Misi dan Tujuan akan otomatis disinkronkan ke seluruh Sub-Sasaran di bawah Tujuan ini.'
                                    : 'Memperbarui rincian Sasaran, indikator sasaran, target, serta realisasi tahunan.'}
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleEditSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
                            {editItem?.level === 'goal' ? (
                                /* EDIT GOAL FORM */
                                <div className="p-3.5 bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-lg space-y-3">
                                    <div className="flex items-center gap-2 text-xs font-bold text-rose-950 dark:text-rose-200 border-b border-rose-200 dark:border-rose-900 pb-1.5">
                                        <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                                        DATA INDUK TUJUAN RPJMD
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-xs font-semibold">MISI RPJMD <span className="text-destructive">*</span></Label>
                                        <Input
                                            value={editMission}
                                            onChange={(e) => setEditMission(e.target.value)}
                                            placeholder="Misi RPJMD..."
                                            className="h-8 text-xs bg-background"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-xs font-semibold">TUJUAN RPJMD <span className="text-destructive">*</span></Label>
                                        <Textarea
                                            value={editGoal}
                                            onChange={(e) => setEditGoal(e.target.value)}
                                            placeholder="Tujuan RPJMD..."
                                            className="min-h-[60px] text-xs bg-background"
                                            required
                                        />
                                    </div>

                                    {/* REPEATER INDIKATOR TUJUAN */}
                                    <div className="space-y-2 pt-1">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs font-bold text-rose-950 dark:text-rose-200">
                                                Indikator Tujuan ({editGoalIndicators.length})
                                            </Label>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={addEditGoalIndicator}
                                                className="h-6 text-[11px] px-2 gap-1 border-rose-300 text-rose-700 hover:bg-rose-100/50 dark:border-rose-800 dark:text-rose-300 cursor-pointer"
                                            >
                                                <Plus className="h-3 w-3" />
                                                <span>+ Tambah Indikator Tujuan</span>
                                            </Button>
                                        </div>
                                        <div className="space-y-2.5">
                                            {editGoalIndicators.map((gi, gIdx) => (
                                                <IndicatorFormFields
                                                    key={`edit-gind-${gi.id ?? gIdx}`}
                                                    indicator={gi}
                                                    index={gIdx}
                                                    total={editGoalIndicators.length}
                                                    labelPrefix="Indikator Tujuan"
                                                    years={years}
                                                    onUpdateField={(field, val) => updateEditGoalIndicatorField(gIdx, field, val)}
                                                    onUpdateTarget={(yr, val) => updateEditGoalIndicatorTarget(gIdx, yr, val)}
                                                    onUpdateRealization={(yr, val) => updateEditGoalIndicatorRealization(gIdx, yr, val)}
                                                    onRemove={() => removeEditGoalIndicator(gIdx)}
                                                    accentColor="rose"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* EDIT OBJECTIVE FORM */
                                <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-lg space-y-3">
                                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-950 dark:text-emerald-200 border-b border-emerald-200 dark:border-emerald-900 pb-1.5">
                                        <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                                        DATA SASARAN STRATEGIS
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-xs font-semibold">SASARAN RPJMD <span className="text-destructive">*</span></Label>
                                        <Textarea
                                            value={editObjective}
                                            onChange={(e) => setEditObjective(e.target.value)}
                                            placeholder="Sasaran RPJMD..."
                                            className="min-h-[60px] text-xs bg-background"
                                            required
                                        />
                                    </div>

                                    {/* REPEATER INDIKATOR SASARAN */}
                                    <div className="space-y-2 pt-1">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                                                Indikator Sasaran ({editObjIndicators.length})
                                            </Label>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={addEditObjIndicator}
                                                className="h-6 text-[11px] px-2 gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-100/50 dark:border-emerald-800 dark:text-emerald-300 cursor-pointer"
                                            >
                                                <Plus className="h-3 w-3" />
                                                <span>+ Tambah Indikator Sasaran</span>
                                            </Button>
                                        </div>
                                        <div className="space-y-2.5">
                                            {editObjIndicators.map((oi, oIdx) => (
                                                <IndicatorFormFields
                                                    key={`edit-oind-${oi.id ?? oIdx}`}
                                                    indicator={oi}
                                                    index={oIdx}
                                                    total={editObjIndicators.length}
                                                    labelPrefix="Indikator Sasaran"
                                                    years={years}
                                                    onUpdateField={(field, val) => updateEditObjIndicatorField(oIdx, field, val)}
                                                    onUpdateTarget={(yr, val) => updateEditObjIndicatorTarget(oIdx, yr, val)}
                                                    onUpdateRealization={(yr, val) => updateEditObjIndicatorRealization(oIdx, yr, val)}
                                                    onRemove={() => removeEditObjIndicator(oIdx)}
                                                    accentColor="emerald"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                            </div>{/* end scrollable body */}

                            <DialogFooter className="px-5 py-3 border-t bg-background shrink-0 flex-row justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setEditItem(null);
                                    }}
                                >
                                    Batal
                                </Button>
                                <Button type="submit" size="sm" disabled={processingEdit} className="gap-1.5 font-medium">
                                    <Save className="h-4 w-4" />
                                    Simpan Perubahan
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* =========================================================================
                    MODAL 4: EDIT MISI RPJMD
                ========================================================================== */}
                <Dialog open={isEditMissionOpen} onOpenChange={setIsEditMissionOpen}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-base font-bold">
                                <Pencil className="h-5 w-5 text-amber-600" />
                                <span>Edit Misi RPJMD</span>
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">
                                Perubahan nama Misi ini akan otomatis disinkronkan ke seluruh Tujuan dan Sasaran yang bernaung di bawah Misi ini.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleEditMissionSubmit} className="space-y-4 pt-2">
                            <div className="p-3 bg-muted/40 rounded border space-y-1 text-xs">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground">Misi Saat Ini:</span>
                                <p className="font-semibold text-foreground">{missionToEdit}</p>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Nama / Uraian Misi Baru <span className="text-destructive">*</span></Label>
                                <Textarea
                                    value={newMissionName}
                                    onChange={(e) => setNewMissionName(e.target.value)}
                                    placeholder="Tuliskan nama Misi RPJMD baru..."
                                    className="min-h-[70px] text-xs bg-background"
                                    required
                                />
                            </div>

                            <DialogFooter className="pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsEditMissionOpen(false)}
                                >
                                    Batal
                                </Button>
                                <Button type="submit" size="sm" disabled={isUpdatingMission} className="gap-1.5 font-medium bg-primary">
                                    <Save className="h-4 w-4" />
                                    <span>{isUpdatingMission ? 'Menyimpan...' : 'Simpan Perubahan Misi'}</span>
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* DELETE CONFIRMATION DIALOG */}
                <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Hapus Data Realisasi RPJMD?</AlertDialogTitle>
                            <AlertDialogDescription>
                                {deleteItem?.level === 'goal'
                                    ? `Apakah Anda yakin ingin menghapus Tujuan RPJMD "${deleteItem.goal}"? PERINGATAN: Seluruh Sub-Sasaran di bawah Tujuan ini akan ikut terhapus!`
                                    : `Apakah Anda yakin ingin menghapus Sasaran RPJMD "${deleteItem?.objective}"? Tindakan ini tidak dapat dibatalkan.`}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Hapus
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </AuthenticatedLayout>
    );
}
