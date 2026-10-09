import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { SelectNative } from '@/Components/ui/select-native';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';
import { Input } from '@/Components/ui/input';
import { Textarea } from '@/Components/ui/textarea';
import { Label } from '@/Components/ui/label';
import { cn, formatDateTime } from '@/lib/utils';
import {
    AlertCircle, ArrowLeft, Building2, CheckCheck, ChevronDown, ChevronRight, Eye,
    FileImage, Filter, GitBranch, Layers, Maximize, Maximize2, Minimize2,
    Pencil, Plus, Printer, RotateCcw, Search, Send, Target, Trash2,
    Upload, X, ZoomIn, ZoomOut,
} from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import ConfirmDialog from '@/Components/ConfirmDialog';

// ─── Types & Level Definitions ────────────────────────────────────────────────
import {
    Indicator,
    Organization,
    Period,
    KinerjaNode,
    getNodeChildren,
    SURABAYA_LEVELS,
    getSurabayaLevelConfig,
    normalizeLevel,
} from '@/types/kinerjaTree';

export type { Indicator, Organization, Period, KinerjaNode };
export { getNodeChildren, SURABAYA_LEVELS, getSurabayaLevelConfig, normalizeLevel };

interface AllNode { id: number; level: string; name: string; }
interface StaticFile { label: string; url: string; uploaded_at: string; }
interface Revision {
    id: number; note: string; status: string;
    sender: { name: string } | null; acknowledged_at: string | null;
    created_at: string;
}

export interface ActiveRootTree {
    id: number;
    code: string;
    name: string;
    organization?: { id?: number; name?: string; short_name?: string };
    performance_period?: { id?: number; year?: number };
    level?: string;
    total_nodes?: number;
}

interface TreesProps {
    tree: KinerjaNode[];
    activeRootTree?: ActiveRootTree | null;
    isMacroView?: boolean;
    organizations: Organization[];
    periods: Period[];
    indicators: Indicator[];
    allNodes: AllNode[];
    treeLevels: Record<string, string>;
    filters: { organization?: string; period?: string };
    staticFile?: StaticFile | null;
    revisions?: Revision[];
    canManage?: boolean;
}

// ═══════════════════════════════════════════════════════════════════
// KARTU SIMPUL MODEL SURABAYA (SurabayaNodeCard)
// ═══════════════════════════════════════════════════════════════════
function SurabayaNodeCard({
    node,
    isOutputStack = false,
    highlighted,
    matchesSearch,
    isCollapsed,
    childCount,
    onToggleCollapse,
    onHighlight,
    onAddChild,
    onEdit,
    onDelete,
}: {
    node: KinerjaNode;
    isOutputStack?: boolean;
    highlighted: boolean;
    matchesSearch: boolean;
    isCollapsed: boolean;
    childCount: number;
    onToggleCollapse: (id: number) => void;
    onHighlight: (id: number | null) => void;
    onAddChild?: (node: KinerjaNode) => void;
    onEdit?: (node: KinerjaNode) => void;
    onDelete?: (node: KinerjaNode) => void;
}) {
    const config = getSurabayaLevelConfig(node.level);

    return (
        <div
            onClick={(e) => {
                e.stopPropagation();
                onHighlight(highlighted ? null : node.id);
            }}
            className={cn(
                'group relative flex flex-col rounded-xl border-2 text-left transition-all duration-200 cursor-pointer shadow-md select-none',
                config.cardBg,
                config.border,
                config.widthClass,
                highlighted && 'ring-4 ring-primary ring-offset-2 scale-[1.03] z-20 shadow-2xl',
                matchesSearch && !highlighted && 'ring-4 ring-amber-400 ring-offset-2 scale-[1.02] z-20 shadow-xl'
            )}
        >
            {/* Header Strip */}
            <div className={cn('flex items-center justify-between px-3 py-1.5 rounded-t-lg text-[10px] font-bold tracking-wide uppercase', config.headerBg)}>
                <span className="truncate">{config.tierName}</span>
                <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-black/20 font-bold shrink-0 ml-1">
                    {node.code}
                </span>
            </div>

            {/* Content Body */}
            <div className="p-3 flex flex-col gap-2 flex-1">
                {/* Statement Text */}
                <p className="text-xs sm:text-[13px] font-semibold text-slate-800 dark:text-slate-100 leading-snug line-clamp-4">
                    {node.name}
                </p>

                {/* Deskripsi tambahan jika ada */}
                {node.description && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 italic line-clamp-2">
                        {node.description}
                    </p>
                )}

                {/* Indikator Kinerja */}
                {node.indicator && (
                    <div className="flex items-start gap-1.5 rounded-md bg-white/70 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/70 px-2 py-1 text-[11px] text-slate-700 dark:text-slate-300">
                        <Target className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                        <div className="flex-1 overflow-hidden">
                            <span className="font-medium truncate block">{node.indicator.name}</span>
                            {node.indicator.unit && (
                                <span className="text-[10px] text-slate-400 font-mono">Satuan: {node.indicator.unit}</span>
                            )}
                        </div>
                    </div>
                )}

                {/* Footer: OPD Penanggung Jawab */}
                {node.organization && (
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="truncate">{node.organization.short_name || node.organization.name}</span>
                    </div>
                )}
            </div>

            {/* Bottom Expand / Collapse Handle & Actions */}
            <div className="flex items-center justify-between px-2.5 py-1 bg-slate-50/90 dark:bg-slate-800/80 rounded-b-lg border-t border-slate-100 dark:border-slate-800">
                {/* Toggle Collapse Button jika memiliki turunan */}
                {childCount > 0 ? (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleCollapse(node.id);
                        }}
                        className={cn(
                            'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition',
                            isCollapsed
                                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300'
                        )}
                        title={isCollapsed ? 'Tampilkan anak' : 'Sembunyikan anak'}
                    >
                        {isCollapsed ? (
                            <>
                                <ChevronRight className="h-3 w-3" />
                                <span>+{childCount} Anak</span>
                            </>
                        ) : (
                            <>
                                <ChevronDown className="h-3 w-3" />
                                <span>{childCount} Anak</span>
                            </>
                        )}
                    </button>
                ) : (
                    <span className="text-[10px] text-slate-400 font-mono">Terminal</span>
                )}

                {/* Quick Node Actions on hover/active */}
                <div
                    className="flex items-center gap-0.5 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                >
                    {onAddChild && (
                        <button
                            type="button"
                            onClick={() => onAddChild(node)}
                            className="p-1 rounded text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-950 transition"
                            title="Tambah simpul turunan"
                        >
                            <Plus className="h-3.5 w-3.5" />
                        </button>
                    )}
                    {onEdit && (
                        <button
                            type="button"
                            onClick={() => onEdit(node)}
                            className="p-1 rounded text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-950 transition"
                            title="Ubah simpul"
                        >
                            <Pencil className="h-3.5 w-3.5" />
                        </button>
                    )}
                    {onDelete && (
                        <button
                            type="button"
                            onClick={() => onDelete(node)}
                            className="p-1 rounded text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950 transition"
                            title="Hapus simpul"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// HYBRID TREE RENDERER MODEL SURABAYA
// (Horizontal branches for levels 0-4 + Vertical Stacks for Output)
// ═══════════════════════════════════════════════════════════════════
function SurabayaSubTree({
    node,
    visibleLayers,
    collapsedIds,
    highlightedId,
    matchedIds,
    onToggleCollapse,
    onHighlight,
    onAddChild,
    onEdit,
    onDelete,
}: {
    node: KinerjaNode;
    visibleLayers: Record<string, boolean>;
    collapsedIds: Set<number>;
    highlightedId: number | null;
    matchedIds: Set<number>;
    onToggleCollapse: (id: number) => void;
    onHighlight: (id: number | null) => void;
    onAddChild?: (node: KinerjaNode) => void;
    onEdit?: (node: KinerjaNode) => void;
    onDelete?: (node: KinerjaNode) => void;
}) {
    // Sembunyikan simpul jika layernya dinonaktifkan
    if (visibleLayers[normalizeLevel(node.level)] === false) {
        return null;
    }

    const allChildren = getNodeChildren(node);
    // Filter anak yang layernya aktif
    const visibleChildren = allChildren.filter(
        (c) => visibleLayers[normalizeLevel(c.level)] !== false
    );

    const isCollapsed = collapsedIds.has(node.id);
    const highlighted = highlightedId === node.id;
    const matchesSearch = matchedIds.has(node.id);

    // KUNCI MODEL SURABAYA:
    // Jika semua visible children berlevel 'output', tumpuk secara vertikal (Vertical Output Stack)!
    const isOutputStack =
        visibleChildren.length > 0 &&
        visibleChildren.every((c) => normalizeLevel(c.level) === 'output');

    return (
        <div className="flex flex-col items-center">
            {/* Kartu Simpul */}
            <SurabayaNodeCard
                node={node}
                isOutputStack={isOutputStack}
                highlighted={highlighted}
                matchesSearch={matchesSearch}
                isCollapsed={isCollapsed}
                childCount={visibleChildren.length}
                onToggleCollapse={onToggleCollapse}
                onHighlight={onHighlight}
                onAddChild={onAddChild}
                onEdit={onEdit}
                onDelete={onDelete}
            />

            {/* Jika tidak diciutkan dan memiliki anak aktif */}
            {!isCollapsed && visibleChildren.length > 0 && (
                <>
                    {isOutputStack ? (
                        /* MODEL SURABAYA: VERTICAL OUTPUT STACK (Berjejer ke bawah) */
                        <div className="flex flex-col items-center pt-2">
                            {/* Panah vertikal turun dari parent */}
                            <div className="w-0.5 h-6 bg-slate-300 dark:bg-slate-600" />
                            <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-slate-400 dark:border-t-slate-500 -mt-0.5 mb-2" />

                            {/* Kolom kartu kuning Output */}
                            <div className="flex flex-col gap-2.5 items-center">
                                {visibleChildren.map((child, idx) => (
                                    <React.Fragment key={child.id}>
                                        {idx > 0 && (
                                            <div className="flex flex-col items-center">
                                                <div className="w-0.5 h-3 bg-amber-300 dark:bg-amber-600" />
                                                <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-amber-400 -mt-0.5" />
                                            </div>
                                        )}
                                        <SurabayaNodeCard
                                            node={child}
                                            isOutputStack={true}
                                            highlighted={highlightedId === child.id}
                                            matchesSearch={matchedIds.has(child.id)}
                                            isCollapsed={false}
                                            childCount={0}
                                            onToggleCollapse={onToggleCollapse}
                                            onHighlight={onHighlight}
                                            onAddChild={onAddChild}
                                            onEdit={onEdit}
                                            onDelete={onDelete}
                                        />
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* MODEL HORIZONTAL: Cabang menyebar ke samping untuk level 1-4 */
                        <div className="flex flex-col items-center">
                            {/* Garis vertikal turun dari simpul parent */}
                            <div className="w-0.5 h-6 bg-slate-300 dark:bg-slate-600" />

                            {/* Container Cabang-Cabang Horizontal */}
                            <div className="flex items-start justify-center gap-6 sm:gap-8">
                                {visibleChildren.map((child, idx) => {
                                    const isFirst = idx === 0;
                                    const isLast = idx === visibleChildren.length - 1;
                                    const isOnly = visibleChildren.length === 1;

                                    return (
                                        <div key={child.id} className="relative flex flex-col items-center">
                                            {/* Rail horizontal penghubung */}
                                            {!isOnly && (
                                                <div
                                                    className={cn(
                                                        'absolute top-0 h-0.5 bg-slate-300 dark:bg-slate-600',
                                                        isFirst
                                                            ? 'left-1/2 right-0'
                                                            : isLast
                                                            ? 'left-0 right-1/2'
                                                            : 'left-0 right-0'
                                                    )}
                                                />
                                            )}

                                            {/* Drop stem vertikal ke anak */}
                                            <div className="w-0.5 h-6 bg-slate-300 dark:bg-slate-600" />
                                            <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-slate-400 dark:border-t-slate-500 -mt-0.5 mb-1" />

                                            {/* Rekursi pohon anak */}
                                            <SurabayaSubTree
                                                node={child}
                                                visibleLayers={visibleLayers}
                                                collapsedIds={collapsedIds}
                                                highlightedId={highlightedId}
                                                matchedIds={matchedIds}
                                                onToggleCollapse={onToggleCollapse}
                                                onHighlight={onHighlight}
                                                onAddChild={onAddChild}
                                                onEdit={onEdit}
                                                onDelete={onDelete}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// PANEL KIRI — Tree List Hierarkis
// ═══════════════════════════════════════════════════════════════════
function TreeNodeListItem({
    node,
    depth,
    treeLevels,
    visibleLayers,
    highlightedId,
    matchedIds,
    onHighlight,
    onAddChild,
    onEdit,
    onDelete,
}: {
    node: KinerjaNode;
    depth: number;
    treeLevels: Record<string, string>;
    visibleLayers: Record<string, boolean>;
    highlightedId: number | null;
    matchedIds: Set<number>;
    onHighlight: (id: number | null) => void;
    onAddChild?: (n: KinerjaNode) => void;
    onEdit?: (n: KinerjaNode) => void;
    onDelete?: (n: KinerjaNode) => void;
}) {
    const [open, setOpen] = useState(true);
    if (visibleLayers[normalizeLevel(node.level)] === false) return null;

    const children = getNodeChildren(node).filter(
        (c) => visibleLayers[normalizeLevel(c.level)] !== false
    );
    const hasChildren = children.length > 0;
    const config = getSurabayaLevelConfig(node.level);
    const label = treeLevels[node.level] || config.label;
    const isHL = highlightedId === node.id;
    const isMatched = matchedIds.has(node.id);

    return (
        <div className="flex flex-col">
            <div
                className={cn(
                    'group flex items-center gap-2 py-1.5 pr-2 rounded-md cursor-pointer transition-colors',
                    isHL ? 'ring-2 ring-primary bg-primary/10' : isMatched ? 'bg-amber-100 dark:bg-amber-950/40 ring-1 ring-amber-400' : 'hover:bg-slate-100 dark:hover:bg-muted/50'
                )}
                style={{ paddingLeft: `${depth * 20 + 8}px` }}
                onClick={() => onHighlight(isHL ? null : node.id)}
            >
                <div
                    className="flex-none w-4 flex items-center justify-center text-slate-400 hover:text-slate-700"
                    onClick={(e) => {
                        e.stopPropagation();
                        setOpen(!open);
                    }}
                >
                    {hasChildren ? (
                        open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
                    ) : (
                        <div className="w-3.5" />
                    )}
                </div>

                <div className="h-2 w-2 shrink-0 rounded-full" style={{ background: config.accent }} />

                <div className="flex-1 flex flex-col gap-0.5 overflow-hidden min-w-0">
                    <div className="flex items-center gap-1.5">
                        <span className={cn('text-[9px] px-1.5 py-0.2 rounded font-bold uppercase shrink-0', config.badgeBg, config.badgeText)}>
                            {label}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400 shrink-0">{node.code}</span>
                        <span className="text-xs font-semibold text-slate-800 dark:text-foreground truncate">{node.name}</span>
                    </div>
                    {node.organization && (
                        <span className="text-[10px] text-slate-400 truncate pl-1">
                            {node.organization.short_name || node.organization.name}
                        </span>
                    )}
                </div>

                {(onAddChild || onEdit || onDelete) && (
                    <div
                        className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 flex items-center gap-0.5 transition-opacity shrink-0"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {onAddChild && (
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-emerald-600 hover:bg-emerald-50" onClick={() => onAddChild(node)}>
                                <Plus className="h-3 w-3" />
                            </Button>
                        )}
                        {onEdit && (
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-600 hover:bg-blue-50" onClick={() => onEdit(node)}>
                                <Pencil className="h-3 w-3" />
                            </Button>
                        )}
                        {onDelete && (
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-rose-600 hover:bg-rose-50" onClick={() => onDelete(node)}>
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {open && hasChildren && (
                <div className="relative">
                    <div className="absolute top-0 bottom-2 w-px bg-slate-200 dark:bg-border" style={{ left: `${depth * 20 + 15}px` }} />
                    {children.map((child) => (
                        <TreeNodeListItem
                            key={child.id}
                            node={child}
                            depth={depth + 1}
                            treeLevels={treeLevels}
                            visibleLayers={visibleLayers}
                            highlightedId={highlightedId}
                            matchedIds={matchedIds}
                            onHighlight={onHighlight}
                            onAddChild={onAddChild}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// MODAL FORM TAMBAH / UBAH SIMPUL
// ═══════════════════════════════════════════════════════════════════
function TreeModal({
    isOpen,
    onClose,
    node,
    parentNode,
    organizations,
    periods,
    indicators,
    allNodes,
    treeLevels,
    filters,
}: {
    isOpen: boolean;
    onClose: () => void;
    node?: KinerjaNode | null;
    parentNode?: KinerjaNode | null;
    organizations: Organization[];
    periods: Period[];
    indicators: Indicator[];
    allNodes: AllNode[];
    treeLevels: Record<string, string>;
    filters: { organization?: string; period?: string };
}) {
    const isEdit = !!node;
    let defaultLevel = 'visi';

    if (!isEdit && parentNode) {
        const parentLvl = normalizeLevel(parentNode.level);
        if (parentLvl === 'visi') defaultLevel = 'outcome';
        else if (parentLvl === 'outcome') defaultLevel = 'csf';
        else if (parentLvl === 'csf') defaultLevel = 'kondisi_antara';
        else if (parentLvl === 'kondisi_antara') defaultLevel = 'kondisi_operasional';
        else if (parentLvl === 'kondisi_operasional') defaultLevel = 'output';
        else defaultLevel = 'output';
    }

    const { data, setData, post, put, processing, errors, reset } = useForm({
        organization_id: node?.organization_id?.toString() || parentNode?.organization_id?.toString() || filters.organization || '',
        performance_period_id: node?.performance_period_id?.toString() || parentNode?.performance_period_id?.toString() || filters.period || '',
        parent_id: node?.parent_id?.toString() || parentNode?.id?.toString() || '',
        level: node?.level || defaultLevel,
        code: node?.code || '',
        sort_order: node?.sort_order?.toString() || '0',
        name: node?.name || '',
        indicator_id: node?.indicator_id?.toString() || '',
        description: node?.description || '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const opts = {
            onSuccess: () => {
                onClose();
                reset();
            },
        };
        if (isEdit && node) put(`/planning/trees/${node.id}`, opts);
        else post('/planning/trees', opts);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Ubah Simpul Pohon Kinerja' : 'Tambah Simpul Pohon Kinerja'}</DialogTitle>
                </DialogHeader>
                <form autoComplete="off" noValidate onSubmit={submit} className="space-y-4 py-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>Organisasi Pelaksana / Pengampu</Label>
                            <SelectNative
                                value={data.organization_id}
                                onChange={(e) => setData('organization_id', e.target.value)}
                            >
                                <option value="">Pilih Organisasi</option>
                                {organizations.map((o) => (
                                    <option key={o.id} value={o.id}>
                                        {o.name}
                                    </option>
                                ))}
                            </SelectNative>
                            {errors.organization_id && <p className="text-xs text-destructive">{errors.organization_id}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <Label>Periode Kinerja</Label>
                            <SelectNative
                                value={data.performance_period_id}
                                onChange={(e) => setData('performance_period_id', e.target.value)}
                            >
                                <option value="">Pilih Periode</option>
                                {periods.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.year}
                                    </option>
                                ))}
                            </SelectNative>
                            {errors.performance_period_id && (
                                <p className="text-xs text-destructive">{errors.performance_period_id}</p>
                            )}
                        </div>
                    </div>

                    {!isEdit && (
                        <div className="space-y-1.5">
                            <Label>Simpul Induk (Parent Node)</Label>
                            <SelectNative
                                value={data.parent_id}
                                onChange={(e) => setData('parent_id', e.target.value)}
                            >
                                <option value="">Tidak ada (Akar Visi Utama)</option>
                                {allNodes.map((n) => (
                                    <option key={n.id} value={n.id}>
                                        [{treeLevels[n.level] || n.level}] {n.name}
                                    </option>
                                ))}
                            </SelectNative>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <Label>Tingkatan Simpul (Level)</Label>
                            <SelectNative
                                value={data.level}
                                onChange={(e) => setData('level', e.target.value)}
                            >
                                {Object.entries(treeLevels).map(([k, v]) => (
                                    <option key={k} value={k}>
                                        {v}
                                    </option>
                                ))}
                            </SelectNative>
                            {errors.level && <p className="text-xs text-destructive">{errors.level}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <Label>Kode Simpul</Label>
                            <Input
                                value={data.code}
                                onChange={(e) => setData('code', e.target.value)}
                                placeholder="cth: SS-01, TO-02..."
                            />
                            {errors.code && <p className="text-xs text-destructive">{errors.code}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <Label>Urutan Tampil</Label>
                            <Input
                                type="number"
                                value={data.sort_order}
                                onChange={(e) => setData('sort_order', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label>Pernyataan Sasaran / Simpul Kinerja (Statement)</Label>
                        <Input
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder="cth: Meningkatnya Produktivitas UMKM..."
                        />
                        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                    </div>

                    <div className="space-y-1.5">
                        <Label>Indikator Kinerja Terkait (Opsional)</Label>
                        <SelectNative
                            value={data.indicator_id}
                            onChange={(e) => setData('indicator_id', e.target.value)}
                        >
                            <option value="">Tidak ada indikator</option>
                            {indicators.map((i) => (
                                <option key={i.id} value={i.id}>
                                    {i.code ? `[${i.code}] ` : ''}{i.name} {i.unit ? `(${i.unit})` : ''}
                                </option>
                            ))}
                        </SelectNative>
                    </div>

                    <div className="space-y-1.5">
                        <Label>Kondisi Hasil / Deskripsi Tambahan (Opsional)</Label>
                        <Textarea
                            rows={2}
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            placeholder="Deskripsi atau kondisi hasil yang diharapkan..."
                        />
                    </div>

                    <DialogFooter className="pt-2 flex-col-reverse sm:flex-row gap-2 sm:gap-0">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Batal
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Menyimpan...' : 'Simpan Simpul'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// ═══════════════════════════════════════════════════════════════════
// HALAMAN UTAMA POHON KINERJA (e-KASUARI MODEL KOTA SURABAYA)
// ═══════════════════════════════════════════════════════════════════
export default function Trees({
    tree,
    activeRootTree,
    isMacroView = false,
    organizations,
    periods,
    indicators,
    allNodes,
    treeLevels,
    filters,
    staticFile,
    revisions = [],
    canManage = false,
}: TreesProps) {
    const [modalOpen, setModalOpen] = useState(false);
    const [activeNode, setActiveNode] = useState<KinerjaNode | null>(null);
    const [activeParent, setActiveParent] = useState<KinerjaNode | null>(null);
    const [deleteNodeTarget, setDeleteNodeTarget] = useState<KinerjaNode | null>(null);
    const [highlightedId, setHighlightedId] = useState<number | null>(null);
    const [leftWidth, setLeftWidth] = useState(38);
    const [isDragging, setIsDragging] = useState(false);
    const [viewMode, setViewMode] = useState<'split' | 'list' | 'visual'>(() => {
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
            return 'visual';
        }
        return 'split';
    });
    const [uploadOpen, setUploadOpen] = useState(false);
    const [revisionOpen, setRevisionOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [layerFilterOpen, setLayerFilterOpen] = useState(false);

    // ── Layer Visibility Filter ─────────────────────────────────────────
    const [visibleLayers, setVisibleLayers] = useState<Record<string, boolean>>({
        visi: true,
        outcome: true,
        csf: true,
        kondisi_antara: true,
        kondisi_operasional: true,
        output: true,
    });

    const toggleLayer = (layerKey: string) => {
        setVisibleLayers((prev) => ({
            ...prev,
            [layerKey]: !prev[layerKey],
        }));
    };

    const toggleAllLayers = (show: boolean) => {
        setVisibleLayers({
            visi: show,
            outcome: show,
            csf: show,
            kondisi_antara: show,
            kondisi_operasional: show,
            output: show,
        });
    };

    // ── Expand & Collapse All ───────────────────────────────────────────
    const [collapsedIds, setCollapsedIds] = useState<Set<number>>(new Set());

    const toggleCollapse = useCallback((id: number) => {
        setCollapsedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const expandAll = useCallback(() => {
        setCollapsedIds(new Set());
    }, []);

    const collapseAll = useCallback(() => {
        const idsToCollapse = new Set<number>();
        function collect(nodes: KinerjaNode[]) {
            for (const n of nodes) {
                const c = getNodeChildren(n);
                if (c.length > 0) {
                    idsToCollapse.add(n.id);
                    collect(c);
                }
            }
        }
        collect(tree);
        setCollapsedIds(idsToCollapse);
    }, [tree]);

    // ── Search & Smart Highlight ────────────────────────────────────────
    const { matchedIds, ancestorIds } = useMemo(() => {
        const matches = new Set<number>();
        const ancestors = new Set<number>();
        if (!searchQuery.trim()) return { matchedIds: matches, ancestorIds: ancestors };

        const q = searchQuery.toLowerCase().trim();

        function search(nodes: KinerjaNode[], path: number[]): boolean {
            let subtreeMatched = false;
            for (const node of nodes) {
                const nodeName = node.name?.toLowerCase() || '';
                const nodeCode = node.code?.toLowerCase() || '';
                const orgName = node.organization?.name?.toLowerCase() || '';
                const indName = node.indicator?.name?.toLowerCase() || '';

                const isMatch =
                    nodeName.includes(q) ||
                    nodeCode.includes(q) ||
                    orgName.includes(q) ||
                    indName.includes(q);

                if (isMatch) {
                    matches.add(node.id);
                    subtreeMatched = true;
                    path.forEach((ancestorId) => ancestors.add(ancestorId));
                }

                const childMatched = search(getNodeChildren(node), [...path, node.id]);
                if (childMatched) subtreeMatched = true;
            }
            return subtreeMatched;
        }

        search(tree, []);
        return { matchedIds: matches, ancestorIds: ancestors };
    }, [tree, searchQuery]);

    // Auto-uncollapse jalur yang cocok saat mencari
    useEffect(() => {
        if (ancestorIds.size > 0) {
            setCollapsedIds((prev) => {
                const next = new Set(prev);
                ancestorIds.forEach((id) => next.delete(id));
                return next;
            });
        }
    }, [ancestorIds]);

    // ── Splitter Resizing ───────────────────────────────────────────────
    const containerRef = useRef<HTMLDivElement>(null);
    const onMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    useEffect(() => {
        if (!isDragging) return;
        const onMove = (e: MouseEvent) => {
            if (!containerRef.current) return;
            const r = containerRef.current.getBoundingClientRect();
            setLeftWidth(Math.min(65, Math.max(20, ((e.clientX - r.left) / r.width) * 100)));
        };
        const onUp = () => setIsDragging(false);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [isDragging]);

    // ── Actions ─────────────────────────────────────────────────────────
    const openAddRoot = () => { setActiveNode(null); setActiveParent(null); setModalOpen(true); };
    const openAddChild = (p: KinerjaNode) => { setActiveNode(null); setActiveParent(p); setModalOpen(true); };
    const openEdit = (n: KinerjaNode) => { setActiveNode(n); setActiveParent(null); setModalOpen(true); };
    const handleDelete = (n: KinerjaNode) => {
        setDeleteNodeTarget(n);
    };

    const handleConfirmDeleteNode = () => {
        if (deleteNodeTarget) {
            router.delete(`/planning/trees/${deleteNodeTarget.id}`, {
                preserveScroll: true,
                onSuccess: () => setDeleteNodeTarget(null),
            });
        }
    };
    const handleFilter = (key: string, value: string) => {
        router.get('/planning/trees', { ...filters, [key]: value }, { preserveState: true, replace: true });
    };

    // ── Upload Berkas Statis & Catatan Revisi ────────────────────────────
    const uploadForm = useForm<{ file: File | null; organization_id: string; performance_period_id: string; label: string }>({
        file: null, organization_id: filters.organization ?? '', performance_period_id: filters.period ?? '', label: '',
    });
    const handleUploadStatic = (e: React.FormEvent) => {
        e.preventDefault();
        uploadForm.post(route('planning.trees.upload-static'), {
            onSuccess: () => { setUploadOpen(false); uploadForm.reset(); },
            forceFormData: true,
        });
    };

    const pendingRevisions = revisions.filter((r) => r.status === 'pending');

    const pageTitle = activeRootTree ? `Pohon Kinerja: ${activeRootTree.name}` : 'Pohon Kinerja';

    return (
        <AuthenticatedLayout header={pageTitle} noPadding>
            <Head title={pageTitle} />

            <div className="flex h-[calc(100vh-3.5rem)] flex-col bg-slate-100 dark:bg-slate-950">
                {/* ── TOOLBAR ATAS ────────────────────────────────────────────── */}
                <div className="flex shrink-0 flex-col gap-2.5 border-b border-slate-200 bg-white px-4 py-2.5 dark:border-border dark:bg-card shadow-xs">
                    {/* Baris 1: Judul, Badges & Mode Tampilan */}
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <Link
                                href={route('planning.trees.index')}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-100 hover:text-primary transition dark:border-border dark:bg-card dark:text-slate-200 dark:hover:bg-accent mr-1"
                                title="Kembali ke Tabel Master Pohon Kinerja"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" />
                                <span className="font-medium">Daftar Pohon</span>
                            </Link>

                            <GitBranch className="h-5 w-5 text-primary shrink-0" />
                            <div className="flex flex-col">
                                <h1 className="text-sm font-bold text-slate-800 dark:text-foreground line-clamp-1 max-w-[280px] sm:max-w-md lg:max-w-xl" title={activeRootTree?.name}>
                                    {activeRootTree ? activeRootTree.name : 'Pohon Kinerja Daerah'}
                                </h1>
                                {activeRootTree && (
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                        {activeRootTree.organization?.name ?? 'Provinsi'} {activeRootTree.code ? `• Kode: ${activeRootTree.code}` : ''}
                                    </span>
                                )}
                            </div>

                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-muted dark:text-slate-300">
                                {allNodes.length} simpul
                            </span>
                            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                                {isMacroView ? 'Pohon Makro Provinsi' : 'Model PermenPAN-RB 89/2021'}
                            </span>

                            {pendingRevisions.length > 0 && (
                                <button
                                    onClick={() => setRevisionOpen(true)}
                                    className="flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-600 hover:bg-rose-200 transition dark:bg-rose-950 dark:text-rose-400"
                                >
                                    <AlertCircle className="h-3 w-3" />
                                    {pendingRevisions.length} Catatan Revisi
                                </button>
                            )}
                        </div>

                        {/* Pengalih Mode Tampilan */}
                        <div className="flex rounded-lg border border-slate-200 dark:border-border overflow-hidden shrink-0">
                            {(['split', 'visual', 'list'] as const).map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => setViewMode(mode)}
                                    className={cn(
                                        'px-2.5 sm:px-3 py-1 text-xs font-medium transition',
                                        viewMode === mode
                                            ? 'bg-primary text-primary-foreground font-semibold'
                                            : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-card dark:text-muted-foreground'
                                    )}
                                >
                                    {mode === 'split' ? 'Split' : mode === 'visual' ? 'Visual' : 'Daftar'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Baris 2: Filter Organisasi, Periode, Search & Aksi Pohon */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
                        {/* Filter OPD & Periode */}
                        <div className="flex flex-wrap items-center gap-2">
                            <SelectNative
                                value={filters.organization || ''}
                                onChange={(e) => handleFilter('organization', e.target.value)}
                                className="h-8 text-xs w-full sm:w-48"
                            >
                                <option value="">Semua Organisasi</option>
                                {organizations.map((o) => (
                                    <option key={o.id} value={o.code || o.id}>
                                        {o.name}
                                    </option>
                                ))}
                            </SelectNative>

                            <SelectNative
                                value={filters.period || ''}
                                onChange={(e) => handleFilter('period', e.target.value)}
                                className="h-8 text-xs w-full sm:w-36"
                            >
                                <option value="">Semua Periode</option>
                                {periods.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.year}
                                    </option>
                                ))}
                            </SelectNative>

                            {/* Pencarian Pintar Simpul */}
                            <div className="relative flex-1 sm:w-56">
                                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Cari simpul, OPD, IK..."
                                    className="h-8 pl-8 pr-7 text-xs"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                            {matchedIds.size > 0 && (
                                <Badge variant="secondary" className="text-[11px] h-7 px-2">
                                    {matchedIds.size} cocok
                                </Badge>
                            )}
                        </div>

                        {/* Kontrol Kanvas & Aksi Utama */}
                        <div className="flex flex-wrap items-center gap-1.5">
                            {/* Filter Layer Toggle Dropdown */}
                            <div className="relative">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setLayerFilterOpen(!layerFilterOpen)}
                                    className={cn('h-8 text-xs gap-1.5', layerFilterOpen && 'bg-slate-100 dark:bg-muted')}
                                >
                                    <Layers className="h-3.5 w-3.5 text-primary" />
                                    <span>Layer</span>
                                    <ChevronDown className="h-3 w-3 opacity-60" />
                                </Button>

                                {layerFilterOpen && (
                                    <div className="absolute right-0 top-9 z-50 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-border dark:bg-card">
                                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                                            <span className="text-xs font-bold text-slate-800 dark:text-foreground">Tampilkan Layer:</span>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => toggleAllLayers(true)}
                                                    className="text-[10px] font-semibold text-primary hover:underline"
                                                >
                                                    Semua
                                                </button>
                                                <span className="text-slate-300">|</span>
                                                <button
                                                    onClick={() => toggleAllLayers(false)}
                                                    className="text-[10px] font-semibold text-slate-400 hover:underline"
                                                >
                                                    Reset
                                                </button>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            {Object.entries(SURABAYA_LEVELS).map(([key, lvl]) => (
                                                <label
                                                    key={key}
                                                    className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 p-1.5 rounded cursor-pointer transition"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={visibleLayers[key] ?? true}
                                                        onChange={() => toggleLayer(key)}
                                                        className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                                                    />
                                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: lvl.accent }} />
                                                    <span className="flex-1 font-medium">{lvl.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Expand All & Collapse All */}
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={expandAll}
                                title="Buka seluruh cabang pohon"
                                className="h-8 px-2 text-xs gap-1"
                            >
                                <Maximize2 className="h-3.5 w-3.5 text-blue-600" />
                                <span className="hidden sm:inline">Expand All</span>
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={collapseAll}
                                title="Ciutkan semua cabang"
                                className="h-8 px-2 text-xs gap-1"
                            >
                                <Minimize2 className="h-3.5 w-3.5 text-slate-600" />
                                <span className="hidden sm:inline">Collapse</span>
                            </Button>

                            {/* Cetak PDF */}
                            <Button size="sm" variant="outline" asChild className="h-8 text-xs gap-1">
                                <a
                                    href={route('planning.trees.print', {
                                        ...(filters.organization ? { organization: filters.organization } : {}),
                                        ...(filters.period ? { period: filters.period } : {}),
                                    })}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <Printer className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">Cetak / PDF</span>
                                </a>
                            </Button>

                            {/* Unggah Berkas Statis */}
                            {canManage && (
                                <Button size="sm" variant="outline" onClick={() => setUploadOpen(true)} className="h-8 text-xs gap-1">
                                    <FileImage className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">Berkas</span>
                                </Button>
                            )}

                            {/* Tambah Akar */}
                            {canManage && (
                                <Button size="sm" onClick={openAddRoot} className="h-8 text-xs gap-1 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs">
                                    <Plus className="h-3.5 w-3.5" />
                                    <span>Tambah Akar</span>
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Info Berkas Statis jika ada */}
                {staticFile && (
                    <div className="shrink-0 flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-xs dark:border-amber-900 dark:bg-amber-950/30">
                        <FileImage className="h-4 w-4 text-amber-500" />
                        <span className="text-amber-800 dark:text-amber-300">
                            Berkas statis tersedia: <strong>{staticFile.label}</strong>
                        </span>
                        <a
                            href={staticFile.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-auto font-semibold text-amber-700 underline hover:text-amber-900 dark:text-amber-400"
                        >
                            Lihat Berkas ↗
                        </a>
                        <span className="text-slate-400">{formatDateTime(staticFile.uploaded_at)}</span>
                    </div>
                )}

                {/* ── AREA KONTEN DUAL-PANEL ──────────────────────────────────── */}
                <div ref={containerRef} className="flex flex-1 overflow-hidden">
                    {/* Panel Kiri: Hierarki List */}
                    {viewMode !== 'visual' && (
                        <div
                            className="flex flex-col overflow-hidden border-r border-slate-200 bg-white dark:border-border dark:bg-card shrink-0"
                            style={{ width: viewMode === 'split' ? `${leftWidth}%` : '100%' }}
                        >
                            <div className="shrink-0 border-b border-slate-100 dark:border-border px-4 py-2 flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Struktur Hierarki Pohon
                                </span>
                                {highlightedId && (
                                    <button
                                        onClick={() => setHighlightedId(null)}
                                        className="text-[11px] text-primary hover:underline"
                                    >
                                        Hapus Sorotan
                                    </button>
                                )}
                            </div>
                            <div className="flex-1 overflow-y-auto p-3">
                                {tree.length > 0 ? (
                                    tree.map((node) => (
                                        <TreeNodeListItem
                                            key={node.id}
                                            node={node}
                                            depth={0}
                                            treeLevels={treeLevels}
                                            visibleLayers={visibleLayers}
                                            highlightedId={highlightedId}
                                            matchedIds={matchedIds}
                                            onHighlight={setHighlightedId}
                                            onAddChild={canManage ? openAddChild : undefined}
                                            onEdit={canManage ? openEdit : undefined}
                                            onDelete={canManage ? handleDelete : undefined}
                                        />
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
                                        <GitBranch className="h-10 w-10 text-slate-300" />
                                        <p className="text-sm text-slate-400">Belum ada simpul pohon kinerja</p>
                                        {canManage && (
                                            <Button size="sm" variant="outline" onClick={openAddRoot} className="mt-2">
                                                Tambah Akar Baru
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Resizer Handle */}
                    {viewMode === 'split' && (
                        <div
                            className={cn(
                                'w-1.5 shrink-0 cursor-col-resize bg-slate-200 hover:bg-primary/40 transition-colors dark:bg-border',
                                isDragging && 'bg-primary'
                            )}
                            onMouseDown={onMouseDown}
                        />
                    )}

                    {/* Panel Kanan: Visual Kanvas Interaktif Pohon Surabaya */}
                    {viewMode !== 'list' && (
                        <div
                            className="flex-1 overflow-hidden relative flex flex-col bg-slate-50/70 dark:bg-slate-900/60"
                            style={viewMode === 'split' ? { width: `${100 - leftWidth}%` } : undefined}
                        >
                            <TransformWrapper
                                initialScale={0.8}
                                minScale={0.15}
                                maxScale={2.5}
                                limitToBounds={false}
                                centerOnInit={true}
                                wheel={{ step: 0.08 }}
                                doubleClick={{ disabled: true }}
                            >
                                {({ zoomIn, zoomOut, resetTransform, centerView, state }) => (
                                    <>
                                        {/* Floating Zoom & Canvas Controls */}
                                        <div className="absolute top-4 right-4 z-30 flex items-center gap-1 rounded-xl border border-slate-200 bg-white/90 backdrop-blur-md px-2 py-1 shadow-lg dark:border-slate-800 dark:bg-slate-900/90">
                                            <button
                                                type="button"
                                                onClick={() => zoomIn()}
                                                className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                                                title="Zoom In"
                                            >
                                                <ZoomIn className="h-4 w-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => zoomOut()}
                                                className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                                                title="Zoom Out"
                                            >
                                                <ZoomOut className="h-4 w-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => resetTransform()}
                                                className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                                                title="Reset Zoom (100%)"
                                            >
                                                <RotateCcw className="h-4 w-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => centerView(0.8)}
                                                className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                                                title="Pusatkan Tampilan"
                                            >
                                                <Maximize className="h-4 w-4" />
                                            </button>
                                            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
                                            <span className="text-[11px] font-mono font-medium text-slate-500 w-12 text-center">
                                                {Math.round((state?.scale ?? 0.8) * 100)}%
                                            </span>
                                        </div>

                                        {/* Canvas Pan-Zoom Container */}
                                        <div className="flex-1 w-full h-full overflow-hidden cursor-grab active:cursor-grabbing">
                                            <TransformComponent
                                                wrapperStyle={{ width: '100%', height: '100%' }}
                                                contentStyle={{ width: 'max-content', minWidth: '100%', minHeight: '100%', padding: '60px 80px' }}
                                            >
                                                {tree.length > 0 ? (
                                                    <div className="flex flex-col items-center gap-12 select-none">
                                                        {tree.map((rootNode) => (
                                                            <SurabayaSubTree
                                                                key={rootNode.id}
                                                                node={rootNode}
                                                                visibleLayers={visibleLayers}
                                                                collapsedIds={collapsedIds}
                                                                highlightedId={highlightedId}
                                                                matchedIds={matchedIds}
                                                                onToggleCollapse={toggleCollapse}
                                                                onHighlight={setHighlightedId}
                                                                onAddChild={canManage ? openAddChild : undefined}
                                                                onEdit={canManage ? openEdit : undefined}
                                                                onDelete={canManage ? handleDelete : undefined}
                                                            />
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center min-h-[400px] w-full text-center gap-3">
                                                        <GitBranch className="h-16 w-16 text-slate-300" />
                                                        <p className="text-base font-semibold text-slate-500">
                                                            Belum Ada Pohon Kinerja
                                                        </p>
                                                        <p className="text-xs text-slate-400 max-w-sm">
                                                            Mulai rancang pohon kinerja penjenjangan hasil (cascading outcome) dengan menambah simpul akar visi daerah.
                                                        </p>
                                                        {canManage && (
                                                            <Button onClick={openAddRoot} className="mt-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs">
                                                                <Plus className="h-4 w-4 mr-1.5" />
                                                                Tambah Akar Visi
                                                            </Button>
                                                        )}
                                                    </div>
                                                )}
                                            </TransformComponent>
                                        </div>

                                        {/* Legend Bawah */}
                                        <div className="shrink-0 flex flex-wrap items-center gap-4 border-t border-slate-200 bg-white/95 px-4 py-2 text-xs dark:border-border dark:bg-card">
                                            <span className="font-bold text-[11px] text-slate-400 uppercase tracking-wider">
                                                Tingkatan:
                                            </span>
                                            {Object.entries(SURABAYA_LEVELS).map(([k, lvl]) => (
                                                <div key={k} className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                                                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: lvl.accent }} />
                                                    <span className="font-medium">{lvl.label}</span>
                                                </div>
                                            ))}
                                            <span className="ml-auto text-[11px] text-slate-400">
                                                💡 Drag untuk pan • Scroll untuk zoom • Klik simpul untuk sorotan
                                            </span>
                                        </div>
                                    </>
                                )}
                            </TransformWrapper>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Dialog Tambah / Ubah Simpul ──────────────────────────────── */}
            <TreeModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                node={activeNode}
                parentNode={activeParent}
                organizations={organizations}
                periods={periods}
                indicators={indicators}
                allNodes={allNodes}
                treeLevels={treeLevels}
                filters={filters}
            />

            {/* ── Dialog Unggah Berkas Statis ──────────────────────────────── */}
            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Upload className="h-5 w-5 text-primary" />
                            Unggah Berkas Pohon Kinerja
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-slate-500 dark:text-muted-foreground">
                        Unggah gambar atau PDF pohon kinerja sebagai alternatif jika pohon belum dapat dibuat secara dinamis.
                    </p>
                    <form onSubmit={handleUploadStatic} className="space-y-4 mt-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="sf-org">Organisasi</Label>
                            <SelectNative
                                id="sf-org"
                                value={uploadForm.data.organization_id}
                                onChange={(e) => uploadForm.setData('organization_id', e.target.value)}
                            >
                                <option value="">— Pilih OPD —</option>
                                {organizations.map((o) => (
                                    <option key={o.id} value={String(o.id)}>
                                        {o.name}
                                    </option>
                                ))}
                            </SelectNative>
                            {uploadForm.errors.organization_id && (
                                <p className="text-xs text-rose-500">{uploadForm.errors.organization_id}</p>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="sf-file">File (PDF / JPG / PNG — maks 10 MB)</Label>
                            <Input
                                id="sf-file"
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => uploadForm.setData('file', e.target.files?.[0] ?? null)}
                            />
                            {uploadForm.errors.file && <p className="text-xs text-rose-500">{uploadForm.errors.file}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="sf-label">Label / Nama Berkas (opsional)</Label>
                            <Input
                                id="sf-label"
                                value={uploadForm.data.label}
                                onChange={(e) => uploadForm.setData('label', e.target.value)}
                                placeholder="cth: Pohon Kinerja Bappeda 2025"
                            />
                        </div>
                        <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
                            <Button type="button" variant="outline" onClick={() => setUploadOpen(false)}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={uploadForm.processing}>
                                {uploadForm.processing ? 'Mengunggah...' : 'Unggah'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ── Dialog Catatan Revisi Biro ───────────────────────────────── */}
            <Dialog open={revisionOpen} onOpenChange={setRevisionOpen}>
                <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Send className="h-5 w-5 text-rose-500" />
                            Catatan Revisi dari Biro Organisasi
                        </DialogTitle>
                    </DialogHeader>
                    {pendingRevisions.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
                            <CheckCheck className="h-10 w-10 text-emerald-300" />
                            <p className="text-sm">Tidak ada catatan revisi yang perlu ditindaklanjuti.</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-80 overflow-y-auto">
                            {pendingRevisions.map((rev) => (
                                <div
                                    key={rev.id}
                                    className="rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/30"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="text-sm font-medium text-rose-800 dark:text-rose-300">
                                            {rev.sender?.name ?? 'Biro Organisasi'}
                                        </p>
                                        <span className="text-[11px] text-rose-400">{formatDateTime(rev.created_at)}</span>
                                    </div>
                                    <p className="mt-2 text-sm text-rose-700 dark:text-rose-200 whitespace-pre-wrap">
                                        {rev.note}
                                    </p>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="mt-3 text-xs"
                                        onClick={() =>
                                            router.patch(
                                                route('planning.revisions.acknowledge', rev.id),
                                                {},
                                                { preserveScroll: true }
                                            )
                                        }
                                    >
                                        <CheckCheck className="h-3.5 w-3.5 mr-1" />
                                        Tandai Dibaca
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                    <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setRevisionOpen(false)}>
                            Tutup
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={deleteNodeTarget !== null}
                onOpenChange={(open) => !open && setDeleteNodeTarget(null)}
                title="Hapus Simpul Pohon Kinerja"
                description={deleteNodeTarget ? `Apakah Anda yakin ingin menghapus simpul "${deleteNodeTarget.code} - ${deleteNodeTarget.name}" beserta seluruh turunannya?` : ''}
                confirmText="Hapus Simpul"
                variant="destructive"
                onConfirm={handleConfirmDeleteNode}
            />
        </AuthenticatedLayout>
    );
}
