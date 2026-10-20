import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import PublicLayout from '@/Layouts/PublicLayout';
import { PuprBlueprintGrid, PuprCitySkylinePattern } from '@/Components/Landing/PuprCityPattern';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { SelectNative } from '@/Components/ui/select-native';
import { Input } from '@/Components/ui/input';
import { cn } from '@/lib/utils';
import {
    ArrowLeft, Building2, ChevronDown, ChevronRight, Eye,
    Filter, GitBranch, Layers, Maximize, Maximize2, Minimize2,
    Printer, RotateCcw, Search, Target, X, ZoomIn, ZoomOut,
} from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import {
    KinerjaNode, getNodeChildren, SURABAYA_LEVELS, getSurabayaLevelConfig, normalizeLevel,
} from '@/types/kinerjaTree';

interface Organization { id: number; code: string; name: string; short_name?: string; }
interface Period { id: number; year: number; }

interface PohonKinerjaPublikProps {
    tree: KinerjaNode[];
    organizations: Organization[];
    periods: Period[];
    treeLevels: Record<string, string>;
    filters: { organization?: string; period?: string };
}

// ─── Public Read-Only Node Card ──────────────────────────────────────────────
function PublicNodeCard({
    node,
    isOutputStack = false,
    highlighted,
    isSelected,
    matchesSearch,
    isCollapsed,
    childCount,
    onToggleCollapse,
    onSelectNode,
}: {
    node: KinerjaNode;
    isOutputStack?: boolean;
    highlighted: boolean;
    isSelected: boolean;
    matchesSearch: boolean;
    isCollapsed: boolean;
    childCount: number;
    onToggleCollapse: (id: number) => void;
    onSelectNode: (node: KinerjaNode) => void;
}) {
    const config = getSurabayaLevelConfig(node.level);

    return (
        <div
            onClick={(e) => {
                e.stopPropagation();
                onSelectNode(node);
            }}
            title={childCount > 0 ? 'Klik kartu untuk melihat detail simpul lengkap' : 'Simpul Terminal (Tingkat Paling Bawah)'}
            className={cn(
                'group relative flex flex-col rounded-xl border-2 text-left transition-all duration-200 cursor-pointer shadow-md select-none',
                'hover:shadow-xl hover:border-amber-400 hover:-translate-y-0.5',
                config.cardBg,
                config.border,
                config.widthClass,
                isSelected && 'ring-4 ring-[#FFB800] ring-offset-2 scale-[1.03] z-30 shadow-2xl border-[#FFB800]',
                !isSelected && highlighted && 'ring-4 ring-primary ring-offset-2 scale-[1.02] z-20 shadow-xl',
                matchesSearch && !isSelected && !highlighted && 'ring-4 ring-amber-400 ring-offset-2 scale-[1.02] z-20 shadow-xl'
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
                <p className="text-xs sm:text-[13px] font-semibold text-slate-800 dark:text-slate-100 leading-snug line-clamp-4">
                    {node.name}
                </p>

                {node.description && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 italic line-clamp-2">
                        {node.description}
                    </p>
                )}

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

                {node.organization && (
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="truncate">{node.organization.short_name || node.organization.name}</span>
                    </div>
                )}
            </div>

            {/* Bottom Expand / Collapse Handle & Detail Button */}
            <div className="flex items-center justify-between px-2.5 py-1.5 bg-slate-50/90 dark:bg-slate-800/80 rounded-b-lg border-t border-slate-100 dark:border-slate-800 gap-1.5">
                {childCount > 0 ? (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleCollapse(node.id);
                        }}
                        className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold transition shadow-2xs cursor-pointer',
                            isCollapsed
                                ? 'bg-[#FFB800] hover:bg-amber-400 text-slate-950 font-black'
                                : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200'
                        )}
                        title={isCollapsed ? 'Buka cabang turunan di bawah simpul ini' : 'Tutup cabang turunan'}
                    >
                        {isCollapsed ? (
                            <>
                                <ChevronRight className="h-3.5 w-3.5" />
                                <span>+{childCount} Turunan</span>
                            </>
                        ) : (
                            <>
                                <ChevronDown className="h-3.5 w-3.5" />
                                <span>{childCount} Turunan</span>
                            </>
                        )}
                    </button>
                ) : (
                    <span className="text-[10px] text-slate-400 font-mono">Simpul Terminal</span>
                )}

                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onSelectNode(node);
                    }}
                    className={cn(
                        'inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded transition cursor-pointer',
                        isSelected
                            ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300'
                            : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50'
                    )}
                    title="Buka panel detail lengkap simpul ini"
                >
                    <span>Detail</span>
                    <Eye className="h-3 w-3" />
                </button>
            </div>
        </div>
    );
}

// ─── Public Read-Only Hybrid Tree SubTree ─────────────────────────────────────
function PublicSubTree({
    node,
    visibleLayers,
    collapsedIds,
    highlightedId,
    selectedNodeId,
    matchedIds,
    onToggleCollapse,
    onSelectNode,
}: {
    node: KinerjaNode;
    visibleLayers: Record<string, boolean>;
    collapsedIds: Set<number>;
    highlightedId: number | null;
    selectedNodeId: number | null;
    matchedIds: Set<number>;
    onToggleCollapse: (id: number) => void;
    onSelectNode: (node: KinerjaNode) => void;
}) {
    if (visibleLayers[normalizeLevel(node.level)] === false) return null;

    const allChildren = getNodeChildren(node);
    const visibleChildren = allChildren.filter(
        (c) => visibleLayers[normalizeLevel(c.level)] !== false
    );

    const isCollapsed = collapsedIds.has(node.id);
    const highlighted = highlightedId === node.id;
    const isSelected = selectedNodeId === node.id;
    const matchesSearch = matchedIds.has(node.id);

    const isOutputStack =
        visibleChildren.length > 0 &&
        visibleChildren.every((c) => normalizeLevel(c.level) === 'output');

    return (
        <div className="flex flex-col items-center">
            <PublicNodeCard
                node={node}
                isOutputStack={isOutputStack}
                highlighted={highlighted}
                isSelected={isSelected}
                matchesSearch={matchesSearch}
                isCollapsed={isCollapsed}
                childCount={visibleChildren.length}
                onToggleCollapse={onToggleCollapse}
                onSelectNode={onSelectNode}
            />

            {!isCollapsed && visibleChildren.length > 0 && (
                <div className="transition-all duration-300 ease-in-out flex flex-col items-center">
                    {isOutputStack ? (
                        /* Vertical Output Stack */
                        <div className="flex flex-col items-center pt-2">
                            <div className="w-0.5 h-6 bg-slate-300 dark:bg-slate-600" />
                            <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-slate-400 dark:border-t-slate-500 -mt-0.5 mb-2" />

                            <div className="flex flex-col gap-2.5 items-center">
                                {visibleChildren.map((child, idx) => (
                                    <React.Fragment key={child.id}>
                                        {idx > 0 && (
                                            <div className="flex flex-col items-center">
                                                <div className="w-0.5 h-3 bg-amber-300 dark:bg-amber-600" />
                                                <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-amber-400 -mt-0.5" />
                                            </div>
                                        )}
                                        <PublicNodeCard
                                            node={child}
                                            isOutputStack={true}
                                            highlighted={highlightedId === child.id}
                                            isSelected={selectedNodeId === child.id}
                                            matchesSearch={matchedIds.has(child.id)}
                                            isCollapsed={false}
                                            childCount={0}
                                            onToggleCollapse={onToggleCollapse}
                                            onSelectNode={onSelectNode}
                                        />
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* Horizontal Branch */
                        <div className="flex flex-col items-center">
                            <div className="w-0.5 h-6 bg-slate-400/80 dark:bg-slate-500/80" />

                            <div className="flex items-start justify-center pt-1">
                                {visibleChildren.map((child, idx) => {
                                    const isFirst = idx === 0;
                                    const isLast = idx === visibleChildren.length - 1;
                                    const isOnly = visibleChildren.length === 1;

                                    return (
                                        <div key={child.id} className="relative flex flex-col items-center px-3 sm:px-4">
                                            {!isOnly && (
                                                <div
                                                    className={cn(
                                                        'absolute top-0 h-0.5 bg-slate-400/80 dark:bg-slate-500/80',
                                                        isFirst
                                                            ? 'left-1/2 right-0'
                                                            : isLast
                                                            ? 'left-0 right-1/2'
                                                            : 'left-0 right-0'
                                                    )}
                                                />
                                            )}

                                            <div className="w-0.5 h-6 bg-slate-400/80 dark:bg-slate-500/80" />
                                            <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-slate-500 dark:border-t-slate-400 -mt-0.5 mb-1" />

                                            <PublicSubTree
                                                node={child}
                                                visibleLayers={visibleLayers}
                                                collapsedIds={collapsedIds}
                                                highlightedId={highlightedId}
                                                selectedNodeId={selectedNodeId}
                                                matchedIds={matchedIds}
                                                onToggleCollapse={onToggleCollapse}
                                                onSelectNode={onSelectNode}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Main Public Page ────────────────────────────────────────────────────────
export default function PohonKinerjaPublik({
    tree,
    organizations,
    periods,
    treeLevels,
    filters,
}: PohonKinerjaPublikProps) {
    const { appConfig } = usePage<any>().props;
    const appName = appConfig?.appName || 'SIM Kinerja';
    const instansiName = appConfig?.instansiName || 'Pemerintah Daerah';

    const [highlightedId, setHighlightedId] = useState<number | null>(null);
    const [selectedNode, setSelectedNode] = useState<KinerjaNode | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [layerFilterOpen, setLayerFilterOpen] = useState(false);

    // Layer Visibility
    const [visibleLayers, setVisibleLayers] = useState<Record<string, boolean>>({
        visi: true,
        outcome: true,
        csf: true,
        kondisi_antara: true,
        kondisi_operasional: true,
        output: true,
    });

    const toggleLayer = (layerKey: string) => {
        setVisibleLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
    };

    // Helper untuk mengumpulkan seluruh simpul yang memiliki anak agar di-collapse secara default
    const collectAllParentIds = useCallback((nodes: KinerjaNode[]) => {
        const ids = new Set<number>();
        function collect(items: KinerjaNode[]) {
            for (const n of items) {
                const c = getNodeChildren(n);
                if (c.length > 0) {
                    ids.add(n.id);
                    collect(c);
                }
            }
        }
        collect(nodes);
        return ids;
    }, []);

    // Collapse State: default collapse saat pertama kali dibuka
    const [collapsedIds, setCollapsedIds] = useState<Set<number>>(() => collectAllParentIds(tree));

    // Reset collapse state saat data tree berganti (misal filter unit kerja/periode berubah)
    useEffect(() => {
        setCollapsedIds(collectAllParentIds(tree));
    }, [tree, collectAllParentIds]);

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
        setCollapsedIds(collectAllParentIds(tree));
    }, [tree, collectAllParentIds]);

    // Handle node selection without expanding/collapsing
    const handleSelectNode = useCallback((node: KinerjaNode) => {
        setSelectedNode((prev) => (prev?.id === node.id ? null : node));
        setHighlightedId((prev) => (prev === node.id ? null : node.id));
    }, []);

    // Search matches
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
                    path.forEach((aId) => ancestors.add(aId));
                }

                const childMatched = search(getNodeChildren(node), [...path, node.id]);
                if (childMatched) subtreeMatched = true;
            }
            return subtreeMatched;
        }

        search(tree, []);
        return { matchedIds: matches, ancestorIds: ancestors };
    }, [tree, searchQuery]);

    // Otomatis buka leluhur simpul yang cocok saat melakukan pencarian
    useEffect(() => {
        if (ancestorIds.size > 0) {
            setCollapsedIds((prev) => {
                const next = new Set(prev);
                ancestorIds.forEach((id) => next.delete(id));
                return next;
            });
        }
    }, [ancestorIds]);

    // Hierarki alur cascading dari akar hingga simpul terpilih
    const selectedNodeBreadcrumb = useMemo<KinerjaNode[]>(() => {
        if (!selectedNode) return [];
        const path: KinerjaNode[] = [];
        function findPath(nodes: KinerjaNode[], currentPath: KinerjaNode[]): boolean {
            for (const n of nodes) {
                const nextPath = [...currentPath, n];
                if (n.id === selectedNode?.id) {
                    path.push(...nextPath);
                    return true;
                }
                if (findPath(getNodeChildren(n), nextPath)) {
                    return true;
                }
            }
            return false;
        }
        findPath(tree, []);
        return path;
    }, [tree, selectedNode]);

    // Sinkronisasi nilai filter organisasi & periode (mencocokkan ID atau kode secara fleksibel)
    const selectedOrgId = useMemo(() => {
        if (!filters.organization) return '';
        const match = organizations.find(
            (o) => String(o.id) === String(filters.organization) || o.code === String(filters.organization)
        );
        return match ? String(match.id) : String(filters.organization);
    }, [filters.organization, organizations]);

    const selectedPeriodYear = useMemo(() => {
        if (!filters.period) return '';
        const match = periods.find(
            (p) => String(p.year) === String(filters.period) || String(p.id) === String(filters.period)
        );
        return match ? String(match.year) : String(filters.period);
    }, [filters.period, periods]);

    const handleFilter = (key: string, value: string) => {
        router.get('/laporan/pohon-kinerja', { ...filters, [key]: value }, { preserveState: true, replace: true });
    };

    const backUrl = route('laporan.publik.index', {
        kategori: 'perencanaan',
        type: 'pohon_kinerja',
        ...(filters.organization ? { organization_id: filters.organization } : {}),
        ...(filters.period ? { year: filters.period } : {}),
    });

    const handleBack = (e: React.MouseEvent) => {
        const lastLaporanUrl = typeof window !== 'undefined' ? sessionStorage.getItem('laporan_last_url') : null;
        if (lastLaporanUrl && typeof window !== 'undefined' && window.history.length > 1) {
            e.preventDefault();
            window.history.back();
        }
    };

    return (
        <PublicLayout active="pohon" hideFooter={true}>
            <Head>
                <title>{`Pohon Kinerja Publik - ${appName} ${instansiName}`}</title>
                <meta
                    name="description"
                    content={`Visualisasi Pohon Kinerja (Cascading Kinerja) ${instansiName}. Telusuri keselarasan tujuan, sasaran strategis, program, dan indikator kinerja seluruh unit kerja.`}
                />
                <meta
                    name="keywords"
                    content={`pohon kinerja, cascading kinerja, sasaran strategis, sakip, akuntabilitas, ${instansiName.toLowerCase()}`}
                />
                <meta property="og:title" content={`Pohon Kinerja Publik - ${appName} ${instansiName}`} />
                <meta
                    property="og:description"
                    content={`Visualisasi Pohon Kinerja (Cascading Kinerja) ${instansiName} secara interaktif dan transparan.`}
                />
                <meta property="og:type" content="website" />
                <meta name="twitter:card" content="summary_large_image" />
            </Head>

            <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#f5f5f4] dark:bg-[#080d11] relative overflow-hidden">
                {/* PUPR Blueprint Grid di Latar Belakang Pohon Kinerja */}
                <PuprBlueprintGrid className="opacity-[0.04]" />

                {/* Header Toolbar - Mobile-first compact layout */}
                <div className="relative z-10 shrink-0 flex flex-col gap-2 border-b border-amber-500/30 bg-gradient-to-r from-[#002B49] via-[#051c2f] to-[#020e17] px-3 sm:px-4 py-2.5 text-white shadow-md">

                    {/* Row 1: Back + Title + Print */}
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="ghost"
                            asChild
                            className="h-8 shrink-0 px-2 text-xs gap-1 text-slate-200 hover:text-white hover:bg-white/10"
                        >
                            <Link href={backUrl} onClick={handleBack}>
                                <ArrowLeft className="h-3.5 w-3.5 text-[#FFB800]" />
                                <span className="hidden xs:inline">Kembali</span>
                            </Link>
                        </Button>

                        <div className="h-4 w-px bg-white/20 shrink-0" />

                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#FFB800] text-slate-950">
                                <GitBranch className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-xs sm:text-sm font-bold font-serif text-white leading-tight truncate">
                                    Pohon Kinerja Cascading
                                    <span className="hidden sm:inline"> • PUPR Mimika</span>
                                </h1>
                                <span className="hidden sm:block text-[10px] font-mono text-[#FFB800] leading-none">
                                    Penyelarasan 5 Matra Infrastruktur Bumi Amungme &amp; Kamoro
                                </span>
                            </div>
                            <span className="hidden lg:inline-flex ml-1 rounded-md bg-[#FFB800] text-slate-950 px-1.5 py-0.5 text-[9px] font-mono font-black shrink-0">
                                PermenPAN-RB 89/2021
                            </span>
                        </div>

                        <Button
                            size="sm"
                            asChild
                            className="h-8 shrink-0 px-2.5 text-xs gap-1 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-zinc-950 font-bold shadow-md"
                        >
                            <a
                                href={route('planning.trees.print', {
                                    ...(filters.organization ? { organization: filters.organization } : {}),
                                    ...(filters.period ? { period: filters.period } : {}),
                                })}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <Printer className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Cetak PDF</span>
                            </a>
                        </Button>
                    </div>

                    {/* Row 2: Filters */}
                    <div className="grid grid-cols-2 sm:flex sm:flex-row gap-1.5 sm:gap-2">
                        <SelectNative
                            value={selectedOrgId}
                            onChange={(e) => handleFilter('organization', e.target.value)}
                            className="h-8 text-xs col-span-2 sm:w-48 bg-white/10 text-white border-white/20"
                        >
                            <option value="" className="text-slate-900">Semua Unit Kerja</option>
                            {organizations.map((o) => (
                                <option key={o.id} value={String(o.id)} className="text-slate-900">
                                    {o.short_name || o.name}
                                </option>
                            ))}
                        </SelectNative>

                        <SelectNative
                            value={selectedPeriodYear}
                            onChange={(e) => handleFilter('period', e.target.value)}
                            className="h-8 text-xs bg-white/10 text-white border-white/20 sm:w-28"
                        >
                            <option value="" className="text-slate-900">Semua Tahun</option>
                            {periods.map((p) => (
                                <option key={p.id} value={String(p.year)} className="text-slate-900">
                                    {p.year}
                                </option>
                            ))}
                        </SelectNative>

                        <div className="relative">
                            <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Cari simpul..."
                                className="h-8 pl-7 pr-7 text-xs bg-white/10 text-white border-white/20 placeholder-slate-400 sm:w-52"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2 top-2 text-slate-400 hover:text-white"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>

                        {matchedIds.size > 0 && (
                            <Badge variant="secondary" className="h-8 px-2 bg-amber-400 text-slate-950 font-bold text-[11px] self-center">
                                {matchedIds.size} cocok
                            </Badge>
                        )}

                        {/* Action buttons - icon only on mobile */}
                        <div className="flex items-center gap-1 col-span-2 sm:col-span-1 sm:ml-auto">
                            <div className="relative">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setLayerFilterOpen(!layerFilterOpen)}
                                    className={cn(
                                        'h-8 text-xs gap-1 bg-white/10 border-white/20 text-white hover:bg-white/20',
                                        layerFilterOpen && 'bg-white/25',
                                    )}
                                    title="Filter Layer"
                                >
                                    <Layers className="h-3.5 w-3.5 text-amber-300" />
                                    <span className="hidden sm:inline">Layer</span>
                                    <ChevronDown className="h-3 w-3 opacity-60" />
                                </Button>

                                {layerFilterOpen && (
                                    <div className="absolute left-0 sm:right-0 sm:left-auto top-9 z-50 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-border dark:bg-card">
                                        <div className="text-xs font-bold text-slate-800 dark:text-foreground pb-2 mb-1.5 border-b border-slate-100 dark:border-slate-800">
                                            Filter Layer:
                                        </div>
                                        <div className="space-y-1.5">
                                            {Object.entries(SURABAYA_LEVELS).map(([k, lvl]) => (
                                                <label key={k} className="flex items-center gap-2 text-xs cursor-pointer p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800">
                                                    <input
                                                        type="checkbox"
                                                        checked={visibleLayers[k] ?? true}
                                                        onChange={() => toggleLayer(k)}
                                                        className="rounded text-primary h-3.5 w-3.5"
                                                    />
                                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: lvl.accent }} />
                                                    <span className="text-slate-800 dark:text-slate-200">{lvl.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <Button
                                size="sm"
                                variant="outline"
                                onClick={collapseAll}
                                className="h-8 text-xs gap-1 bg-white/10 border-white/20 text-white hover:bg-white/20"
                                title="Tutup semua cabang"
                            >
                                <Minimize2 className="h-3.5 w-3.5 text-amber-300" />
                                <span className="hidden sm:inline">Tutup Semua</span>
                            </Button>

                            <Button
                                size="sm"
                                variant="outline"
                                onClick={expandAll}
                                className="h-8 text-xs gap-1 bg-white/10 border-white/20 text-white hover:bg-white/20"
                                title="Buka seluruh cabang pohon kinerja"
                            >
                                <Maximize2 className="h-3.5 w-3.5 text-amber-300" />
                                <span className="hidden sm:inline">Buka Semua</span>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Main Interactive Canvas & Inspector Container */}
                <div className="flex-1 overflow-hidden relative flex flex-col">
                    <TransformWrapper
                        initialScale={0.8}
                        minScale={0.15}
                        maxScale={2.5}
                        limitToBounds={false}
                        centerOnInit={true}
                        smooth={false}
                        wheel={{ step: 0.05 }}
                        doubleClick={{ disabled: true }}
                        panning={{ velocityDisabled: true }}
                        zoomAnimation={{ animationTime: 200, animationType: 'easeOut' }}
                    >
                        {({ zoomIn, zoomOut, resetTransform, centerView, state }) => (
                            <>
                                {/* Floating zoom & positioning controls */}
                                <div className="absolute top-4 right-4 z-30 flex items-center gap-1 rounded-xl border border-slate-200 bg-white/90 backdrop-blur-md px-2 py-1 shadow-lg dark:border-slate-800 dark:bg-slate-900/90">
                                    <button
                                        type="button"
                                        onClick={() => zoomIn(0.1, 200, 'easeOut')}
                                        className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                                        title="Zoom In (Perlahan 10%)"
                                    >
                                        <ZoomIn className="h-4 w-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => zoomOut(0.1, 200, 'easeOut')}
                                        className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                                        title="Zoom Out (Perlahan 10%)"
                                    >
                                        <ZoomOut className="h-4 w-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => resetTransform(200, 'easeOut')}
                                        className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                                        title="Reset Zoom Awal (80%)"
                                    >
                                        <RotateCcw className="h-4 w-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => centerView(0.8, 250, 'easeOut')}
                                        className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                                        title="Pusatkan Tampilan"
                                    >
                                        <Maximize className="h-4 w-4" />
                                    </button>
                                    <div className="h-4 w-px bg-slate-200 mx-1" />
                                    <span className="text-[11px] font-mono font-medium text-slate-500 w-12 text-center select-none">
                                        {Math.round((state?.scale ?? 0.8) * 100)}%
                                    </span>
                                </div>

                                <div className="flex-1 w-full h-full min-h-0 overflow-hidden cursor-grab active:cursor-grabbing">
                                    <TransformComponent
                                        wrapperStyle={{ width: '100%', height: '100%' }}
                                        contentStyle={{
                                            width: 'max-content',
                                            minWidth: '100%',
                                            minHeight: '100%',
                                            padding: '60px 80px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                        }}
                                    >
                                        {tree.length > 0 ? (
                                            <div className="flex flex-col items-center gap-12 select-none min-w-max pb-32">
                                                {tree.map((rootNode) => (
                                                    <PublicSubTree
                                                        key={rootNode.id}
                                                        node={rootNode}
                                                        visibleLayers={visibleLayers}
                                                        collapsedIds={collapsedIds}
                                                        highlightedId={highlightedId}
                                                        selectedNodeId={selectedNode?.id ?? null}
                                                        matchedIds={matchedIds}
                                                        onToggleCollapse={toggleCollapse}
                                                        onSelectNode={handleSelectNode}
                                                    />
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center min-h-[400px] w-full text-center gap-2">
                                                <GitBranch className="h-16 w-16 text-slate-300" />
                                                <p className="text-sm font-semibold text-slate-500">
                                                    Belum ada pohon kinerja yang dipublikasikan
                                                </p>
                                            </div>
                                        )}
                                    </TransformComponent>
                                </div>

                                {/* Legend Bawah Informasi Interaksi */}
                                <div className="shrink-0 flex items-center gap-3 overflow-x-auto border-t border-slate-200 bg-white/95 px-3 sm:px-4 py-1.5 text-xs scrollbar-none">
                                    <span className="font-bold text-[10px] text-slate-400 uppercase tracking-wider shrink-0">
                                        Tingkatan:
                                    </span>
                                    {Object.entries(SURABAYA_LEVELS).map(([k, lvl]) => (
                                        <div key={k} className="flex items-center gap-1 text-[10px] text-slate-600 shrink-0">
                                            <span className="h-2 w-2 rounded-full shrink-0" style={{ background: lvl.accent }} />
                                            <span className="font-medium">{lvl.label}</span>
                                        </div>
                                    ))}
                                    <span className="hidden sm:block ml-auto text-[10px] text-slate-400 font-medium shrink-0">
                                        💡 Klik kartu untuk detail • Scroll untuk zoom (5%)
                                    </span>
                                </div>
                            </>
                        )}
                    </TransformWrapper>

                    {/* ══ PANEL INSPEKSI DETAIL SIMPUL (Slide-Over Inspector) ══ */}
                    {selectedNode && (
                        <aside
                            aria-label="Detail Simpul Pohon Kinerja"
                            className="absolute top-0 right-0 bottom-0 z-40 w-full sm:w-[380px] lg:w-[420px] bg-white dark:bg-[#07131e] border-l border-slate-200 dark:border-amber-500/30 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 select-none"
                        >
                            {/* Header Inspector */}
                            <div className="shrink-0 flex items-center justify-between p-4 border-b border-slate-200 dark:border-white/10 bg-gradient-to-r from-[#002B49] to-[#07243c] text-white">
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#FFB800] text-slate-950 font-black">
                                        {selectedNode.code}
                                    </span>
                                    <span className="text-xs font-bold font-mono tracking-wider text-amber-300 uppercase">
                                        {getSurabayaLevelConfig(selectedNode.level).tierName}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedNode(null)}
                                    className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
                                    title="Tutup Detail Simpul"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Body Inspector */}
                            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
                                {/* Pernyataan Kinerja (Statement) Lengkap */}
                                <div className="space-y-1.5">
                                    <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">
                                        Pernyataan Kinerja (Cascading Statement):
                                    </span>
                                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
                                        {selectedNode.name}
                                    </h3>
                                </div>

                                {/* Deskripsi Tambahan */}
                                {selectedNode.description && (
                                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 leading-relaxed text-xs">
                                        {selectedNode.description}
                                    </div>
                                )}

                                {/* Indikator Kinerja Utama (IKU) */}
                                {selectedNode.indicator ? (
                                    <div className="p-3.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 space-y-2">
                                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wide">
                                            <Target className="h-3.5 w-3.5 shrink-0" />
                                            <span>Indikator Kinerja Terukur</span>
                                        </div>
                                        <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                                            {selectedNode.indicator.name}
                                        </div>
                                        {selectedNode.indicator.unit && (
                                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                                Satuan Pengukuran: <span className="font-bold text-slate-700 dark:text-slate-300">{selectedNode.indicator.unit}</span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-400 italic text-[11px]">
                                        Belum ada indikator kuantitatif yang dipasangkan pada simpul ini.
                                    </div>
                                )}

                                {/* Organisasi / Bidang Pengampu */}
                                {selectedNode.organization && (
                                    <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 space-y-1">
                                        <span className="text-[10px] font-mono font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider block">
                                            Unit Kerja Pengampu:
                                        </span>
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-100">
                                            <Building2 className="h-4 w-4 text-blue-600 shrink-0" />
                                            <span>{selectedNode.organization.name}</span>
                                        </div>
                                        {selectedNode.organization.short_name && (
                                            <div className="text-[11px] text-slate-500 font-mono">
                                                Singkatan: {selectedNode.organization.short_name}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Hierarki Cascading Breadcrumb */}
                                {selectedNodeBreadcrumb.length > 1 && (
                                    <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-white/10">
                                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                                            Rantai Cascading (Alur Vertikal):
                                        </span>
                                        <div className="space-y-1.5">
                                            {selectedNodeBreadcrumb.map((bNode, bIdx) => (
                                                <div
                                                    key={bNode.id}
                                                    onClick={() => {
                                                        setSelectedNode(bNode);
                                                        setHighlightedId(bNode.id);
                                                    }}
                                                    className={cn(
                                                        'flex items-center gap-2 p-2 rounded-lg cursor-pointer transition text-[11px]',
                                                        bNode.id === selectedNode.id
                                                            ? 'bg-[#FFB800]/20 border border-[#FFB800] font-bold text-amber-950 dark:text-amber-300'
                                                            : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300'
                                                    )}
                                                >
                                                    <span className="font-mono text-[9px] px-1 py-0.5 rounded bg-black/10 dark:bg-white/10 shrink-0 font-bold">
                                                        {bIdx + 1}. {bNode.code}
                                                    </span>
                                                    <span className="truncate flex-1">{bNode.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer Inspector Aksi */}
                            <div className="shrink-0 p-3 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#07131e] flex items-center justify-between gap-2">
                                {getNodeChildren(selectedNode).length > 0 && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            toggleCollapse(selectedNode.id);
                                        }}
                                        className="h-8 text-xs gap-1.5 flex-1"
                                    >
                                        {collapsedIds.has(selectedNode.id) ? (
                                            <>
                                                <ChevronDown className="h-3.5 w-3.5" />
                                                <span>Buka Cabang Turunan</span>
                                            </>
                                        ) : (
                                            <>
                                                <Minimize2 className="h-3.5 w-3.5" />
                                                <span>Tutup Cabang Turunan</span>
                                            </>
                                        )}
                                    </Button>
                                )}
                                <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => setSelectedNode(null)}
                                    className="h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                                >
                                    Tutup
                                </Button>
                            </div>
                        </aside>
                    )}
                </div>
            </div>
        </PublicLayout>
    );
}
