import React from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import { formatDate } from '@/lib/utils';
import { getNodeChildren, SURABAYA_LEVELS, getSurabayaLevelConfig, normalizeLevel, KinerjaNode } from '@/types/kinerjaTree';

// ─── Types ──────────────────────────────────────────────────────────────────
interface Indicator { id: number; code: string; name: string; unit?: string; }
interface Organization { id: number; code: string; name: string; short_name?: string; }
interface Period { id: number; year: number; }

interface TreesPrintProps {
    tree: KinerjaNode[];
    organizations: Organization[];
    periods: Period[];
    treeLevels: Record<string, string>;
    filters: { organization?: string; period?: string };
    org?: Organization | null;
    period?: Period | null;
}

// ─── Print Level Styling ─────────────────────────────────────────────────────
const PRINT_LEVEL_STYLE: Record<string, {
    headerBg: string;
    headerText: string;
    bodyBg: string;
    bodyText: string;
    border: string;
    label: string;
}> = {
    visi: {
        headerBg: '#1e1b4b',
        headerText: '#fde047',
        bodyBg: '#ffffff',
        bodyText: '#1e1b4b',
        border: '#1e1b4b',
        label: 'VISI / TUJUAN',
    },
    outcome: {
        headerBg: '#ea580c',
        headerText: '#ffffff',
        bodyBg: '#fff7ed',
        bodyText: '#7c2d12',
        border: '#ea580c',
        label: 'SASARAN STRATEGIS',
    },
    csf: {
        headerBg: '#e11d48',
        headerText: '#ffffff',
        bodyBg: '#fff1f2',
        bodyText: '#881337',
        border: '#e11d48',
        label: 'STRATEGIC OUTCOME (CSF)',
    },
    kondisi_antara: {
        headerBg: '#2563eb',
        headerText: '#ffffff',
        bodyBg: '#eff6ff',
        bodyText: '#1e3a8a',
        border: '#2563eb',
        label: 'TACTICAL OUTCOME',
    },
    kondisi_operasional: {
        headerBg: '#0d9488',
        headerText: '#ffffff',
        bodyBg: '#f0fdfa',
        bodyText: '#134e4a',
        border: '#0d9488',
        label: 'OPERATIONAL OUTCOME',
    },
    output: {
        headerBg: '#f59e0b',
        headerText: '#451a03',
        bodyBg: '#fffbeb',
        bodyText: '#78350f',
        border: '#f59e0b',
        label: 'OUTPUT / KEGIATAN',
    },
};

function getPrintStyle(level: string) {
    return PRINT_LEVEL_STYLE[normalizeLevel(level)] ?? PRINT_LEVEL_STYLE['outcome'];
}

// ─── Print Node Card ─────────────────────────────────────────────────────────
function PrintNodeCard({ node, isOutput = false }: { node: KinerjaNode; isOutput?: boolean }) {
    const s = getPrintStyle(node.level);
    const isVisi = normalizeLevel(node.level) === 'visi';

    return (
        <div style={{
            border: `2px solid ${s.border}`,
            borderRadius: 6,
            overflow: 'hidden',
            width: isVisi ? 340 : (isOutput ? 210 : 250),
            fontSize: 10,
            background: '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            pageBreakInside: 'avoid',
            display: 'flex',
            flexDirection: 'column',
        }}>
            {/* Header Strip */}
            <div style={{
                background: s.headerBg,
                color: s.headerText,
                padding: '3px 8px',
                fontWeight: 700,
                fontSize: 8.5,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                letterSpacing: '0.03em',
            }}>
                <span>{s.label}</span>
                <span style={{ fontFamily: 'monospace', background: 'rgba(0,0,0,0.2)', padding: '1px 4px', borderRadius: 3 }}>
                    {node.code}
                </span>
            </div>

            {/* Body */}
            <div style={{
                background: s.bodyBg,
                color: s.bodyText,
                padding: '6px 8px',
                lineHeight: 1.3,
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
            }}>
                <div style={{ fontWeight: 600, fontSize: isVisi ? 11 : 9.5 }}>
                    {node.name}
                </div>

                {node.indicator && (
                    <div style={{
                        fontSize: 8.5,
                        color: s.bodyText,
                        borderTop: `1px dashed ${s.border}44`,
                        paddingTop: 3,
                        marginTop: 2,
                    }}>
                        <span style={{ fontWeight: 700 }}>🎯 IK:</span> {node.indicator.name}
                        {node.indicator.unit && <span> ({node.indicator.unit})</span>}
                    </div>
                )}

                {node.organization && (
                    <div style={{
                        fontSize: 8,
                        color: '#64748b',
                        borderTop: '1px solid #f1f5f9',
                        paddingTop: 2,
                        marginTop: 'auto',
                    }}>
                        🏢 {node.organization.short_name || node.organization.name}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Print Hybrid SubTree ────────────────────────────────────────────────────
function PrintSubTree({ node }: { node: KinerjaNode }) {
    const children = getNodeChildren(node);
    const hasChildren = children.length > 0;

    // Check if children are output stack
    const isOutputStack = hasChildren && children.every(c => normalizeLevel(c.level) === 'output');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <PrintNodeCard node={node} />

            {hasChildren && (
                isOutputStack ? (
                    /* Vertical Output Stack */
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: 2, background: '#94a3b8', height: 14 }} />
                        <div style={{
                            width: 0,
                            height: 0,
                            borderLeft: '4px solid transparent',
                            borderRight: '4px solid transparent',
                            borderTop: '5px solid #94a3b8',
                            marginBottom: 4,
                        }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
                            {children.map((child, idx) => (
                                <React.Fragment key={child.id}>
                                    {idx > 0 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <div style={{ width: 1.5, background: '#f59e0b', height: 8 }} />
                                            <div style={{
                                                width: 0,
                                                height: 0,
                                                borderLeft: '3px solid transparent',
                                                borderRight: '3px solid transparent',
                                                borderTop: '4px solid #f59e0b',
                                            }} />
                                        </div>
                                    )}
                                    <PrintNodeCard node={child} isOutput={true} />
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                ) : (
                    /* Horizontal Branch */
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: 2, background: '#94a3b8', height: 16 }} />
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 20 }}>
                            {children.length > 1 && (
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: '10%',
                                    right: '10%',
                                    height: 2,
                                    background: '#94a3b8',
                                }} />
                            )}
                            {children.map((child) => (
                                <div key={child.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <div style={{ width: 2, background: '#94a3b8', height: 16 }} />
                                    <div style={{
                                        width: 0,
                                        height: 0,
                                        borderLeft: '4px solid transparent',
                                        borderRight: '4px solid transparent',
                                        borderTop: '5px solid #94a3b8',
                                        marginBottom: 4,
                                    }} />
                                    <PrintSubTree node={child} />
                                </div>
                            ))}
                        </div>
                    </div>
                )
            )}
        </div>
    );
}

// ─── Main Print Page ─────────────────────────────────────────────────────────
export default function TreesPrint({
    tree,
    organizations,
    periods,
    filters,
    org,
    period,
}: TreesPrintProps) {
    const { appConfig } = usePage<PageProps>().props;
    const appName = appConfig?.appName || 'e-SAKIP';
    const instansiName = appConfig?.instansiName || 'Pemerintah Daerah';
    const today = formatDate(new Date().toISOString());

    return (
        <div style={{
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
            background: '#ffffff',
            color: '#1e293b',
            minHeight: '100vh',
            padding: 24,
            boxSizing: 'border-box',
        }}>
            <Head title="Cetak Pohon Kinerja (PermenPAN-RB 89/2021)" />

            {/* Print & Screen CSS */}
            <style>{`
                @media print {
                    @page {
                        size: A3 landscape;
                        margin: 10mm;
                    }
                    body {
                        background: #fff !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .print-container {
                        overflow: visible !important;
                        width: 100% !important;
                    }
                }
            `}</style>

            {/* Screen Controls Header */}
            <div className="no-print" style={{
                marginBottom: 20,
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '12px 16px',
                background: '#f8fafc',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button
                        onClick={() => window.history.back()}
                        style={{
                            padding: '6px 12px',
                            borderRadius: 6,
                            border: '1px solid #cbd5e1',
                            background: '#fff',
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 600,
                        }}
                    >
                        ← Kembali
                    </button>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>
                        Pohon Kinerja {appName} (PermenPAN-RB 89/2021)
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 11, color: '#64748b' }}>
                        💡 Tip: Gunakan kertas A3/A4 Landscape pada dialog cetak printer
                    </span>
                    <button
                        onClick={() => window.print()}
                        style={{
                            padding: '8px 18px',
                            borderRadius: 6,
                            border: 'none',
                            background: '#4f46e5',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                        }}
                    >
                        🖨️ Cetak / Simpan PDF
                    </button>
                </div>
            </div>

            {/* Document Header */}
            <div style={{
                textAlign: 'center',
                borderBottom: '2px solid #0f172a',
                paddingBottom: 12,
                marginBottom: 20,
            }}>
                <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    POHON KINERJA (CASCADING KINERJA)
                </h1>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#475569', fontWeight: 600 }}>
                    {instansiName.toUpperCase()} {period ? `• PERIODE TAHUN ${period.year}` : ''}
                </p>
                {org && (
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: '#0284c7', fontWeight: 700 }}>
                        {org.name}
                    </p>
                )}
                <p style={{ margin: '4px 0 0', fontSize: 9.5, color: '#94a3b8' }}>
                    Berdasarkan Standar Penjenjangan Kinerja PermenPAN-RB Nomor 89 Tahun 2021 • Dicetak pada: {today}
                </p>
            </div>

            {/* Main Tree Container */}
            <div className="print-container" style={{ overflowX: 'auto', padding: '10px 0' }}>
                {tree.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, minWidth: 'max-content' }}>
                        {tree.map((root) => (
                            <PrintSubTree key={root.id} node={root} />
                        ))}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                        Belum ada data pohon kinerja untuk organisasi / periode yang dipilih.
                    </div>
                )}
            </div>

            {/* Document Footer / Legend */}
            <div style={{
                marginTop: 28,
                paddingTop: 12,
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 9,
                color: '#64748b',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontWeight: 700 }}>Keterangan Tingkat:</span>
                    {Object.entries(PRINT_LEVEL_STYLE).map(([k, st]) => (
                        <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 8, height: 8, borderRadius: 2, background: st.headerBg }} />
                            <span>{st.label}</span>
                        </div>
                    ))}
                </div>
                <span>e-SAKIP LITE • Sistem Akuntabilitas Kinerja Instansi Pemerintah Terpadu</span>
            </div>
        </div>
    );
}
