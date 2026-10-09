import PublicLayout from '@/Layouts/PublicLayout';
import { Head, Link, router } from '@inertiajs/react';
import {
    BarChart2,
    Building2,
    CalendarDays,
    ChevronDown,
    ChevronRight,
    ClipboardCheck,
    Download,
    Eye,
    FileSearch,
    FileText,
    Gauge,
    GitBranch,
    Menu,
    RotateCcw,
    Search,
    ShieldCheck,
    X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Button } from '@/Components/ui/button';
import TablePagination from '@/Components/TablePagination';
import { formatDate } from '@/lib/utils';
import { Select2 } from '@/Components/ui/select2';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Dokumen {
    id: number;
    code: string;
    title: string;
    type: string;
    type_label: string;
    year: number;
    organization: { id: number; code: string; name: string } | null;
    description: string | null;
    has_file: boolean;
    file_size: string | null;
    approved_at: string | null;
    download_url: string;
}

interface SubItem {
    key: string;
    label: string;
}

interface Kategori {
    key: string;
    label: string;
    icon: string;
    description?: string;
    subItems: SubItem[];
}

interface Org {
    id: number;
    code: string;
    name: string;
}

interface Paginator {
    data: Dokumen[];
    current_page: number;
    last_page: number;
    per_page: number;
    from: number | null;
    to: number | null;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface Props {
    documents: Paginator;
    kategori: string;
    activeType: string | null;
    kategoriList: Kategori[];
    organizations: Org[];
    years: number[];
    filters: {
        kategori: string;
        type: string | null;
        organization_id: number | null;
        year: number | null;
        search?: string | null;
        per_page?: number | string | null;
    };
}

// ─── Icon map ─────────────────────────────────────────────────────────────────
const KategoriIcon: Record<string, React.ElementType> = {
    FileText,
    Gauge,
    BarChart2,
    ClipboardCheck,
};

// ─── Badge tipe dokumen ───────────────────────────────────────────────────────
function TypeBadge({ label }: { label: string }) {
    return (
        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary dark:bg-primary/20">
            {label}
        </span>
    );
}

// ─── Dokumen Card ─────────────────────────────────────────────────────────────
function DokumenCard({ doc }: { doc: Dokumen }) {
    return (
        <div className="group flex flex-col justify-between gap-4 rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs transition-all hover:border-primary/40 hover:shadow-sm dark:border-border dark:bg-card dark:hover:border-primary/40 sm:flex-row sm:items-start">
            <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <TypeBadge label={doc.type_label} />
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-muted dark:text-muted-foreground">
                        Tahun {doc.year}
                    </span>
                    {doc.approved_at && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                            ✓ Terverifikasi {formatDate(doc.approved_at)}
                        </span>
                    )}
                </div>

                <h3 className="mt-2 text-sm font-bold leading-snug text-gray-900 dark:text-foreground sm:text-base">
                    {doc.title}
                </h3>

                {doc.organization && (
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                        <span>{doc.organization.name}</span>
                    </p>
                )}

                {doc.description && (
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-muted-foreground line-clamp-2">
                        {doc.description}
                    </p>
                )}
            </div>

            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-border sm:flex-col sm:items-end sm:border-0 sm:pt-0">
                {doc.file_size ? (
                    <span className="text-[11px] font-medium text-slate-400 dark:text-muted-foreground sm:order-2">
                        {doc.file_size}
                    </span>
                ) : (
                    <span className="text-[11px] text-slate-400 sm:order-2">PDF</span>
                )}

                <div className="flex flex-wrap items-center gap-2 sm:order-1 sm:justify-end">
                    {doc.type === 'pohon_kinerja' && (
                        <Link
                            href={route('laporan.publik.pohon-kinerja', {
                                ...(doc.organization ? { organization: doc.organization.id } : {}),
                                ...(doc.year ? { period: doc.year } : {}),
                            })}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition"
                        >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Pohon Interaktif ↗</span>
                        </Link>
                    )}

                    {doc.has_file ? (
                        <a
                            href={doc.download_url}
                            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground shadow-xs transition hover:bg-primary/90 active:scale-95"
                            download
                        >
                            <Download className="h-3.5 w-3.5" />
                            <span>Unduh</span>
                        </a>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-400 dark:border-border dark:bg-muted/40">
                            Belum Tersedia PDF
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Halaman Utama ────────────────────────────────────────────────────────────
export default function LaporanPublik({
    documents,
    kategori,
    activeType,
    kategoriList,
    organizations,
    years,
    filters,
}: Props) {
    const [searchTerm, setSearchTerm] = useState(filters.search ?? '');
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('laporan_last_url', window.location.href);
            if (activeType) {
                sessionStorage.setItem('laporan_active_type', activeType);
            }
        }
    }, [filters, activeType]);

    const applyFilter = (patch: Partial<typeof filters>) => {
        router.get(
            route('laporan.publik.index'),
            { ...filters, ...patch },
            { preserveState: true, replace: true },
        );
    };

    // Ganti kategori → reset semua filter
    const switchKategori = (key: string) => {
        setSearchTerm('');
        setSidebarOpen(false);
        applyFilter({ kategori: key, type: null, organization_id: null, year: null, search: null });
    };

    // Klik sub-item → filter by type spesifik dalam kategori yang sama
    const switchType = (key: string) => {
        setSearchTerm('');
        setSidebarOpen(false);
        // Toggle: klik lagi sub-item yang aktif → tampilkan semua
        applyFilter({ type: filters.type === key ? null : key, organization_id: null, year: null, search: null });
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilter({ search: searchTerm.trim() || null });
    };

    const handleSearchClear = () => {
        setSearchTerm('');
        applyFilter({ search: null });
    };

    const activeKategori = kategoriList.find((k) => k.key === kategori);
    const ActiveIcon = activeKategori ? (KategoriIcon[activeKategori.icon] ?? FileText) : FileText;
    const hasActiveFilters = Boolean(filters.organization_id || filters.year || filters.search || filters.type);

    // Label judul konten: nama sub-item jika ada type aktif, atau nama kategori
    const activeSubItem = activeKategori?.subItems.find((s) => s.key === activeType);
    const contentTitle = activeSubItem ? activeSubItem.label : (activeKategori?.label ?? 'Dokumen SAKIP');

    return (
        <PublicLayout active="laporan">
            <Head>
                <title>Laporan Akuntabilitas Kinerja Publik — e-KASUARI Papua Barat</title>
                <meta
                    name="description"
                    content="Portal Laporan Akuntabilitas Kinerja Publik Pemerintah Provinsi Papua Barat. Akses dokumen perencanaan, pengukuran kinerja, pelaporan, dan evaluasi SAKIP seluruh OPD."
                />
                <meta
                    name="keywords"
                    content="laporan kinerja papua barat, dokumen sakip, lkip opd, iku pemprov papua barat, transparansi kinerja"
                />
                <meta property="og:title" content="Laporan Akuntabilitas Kinerja Publik — e-KASUARI Papua Barat" />
                <meta
                    property="og:description"
                    content="Portal Laporan Akuntabilitas Kinerja Publik Pemerintah Provinsi Papua Barat. Akses dokumen perencanaan, pengukuran kinerja, pelaporan, dan evaluasi SAKIP seluruh OPD."
                />
                <meta property="og:type" content="website" />
                <meta name="twitter:card" content="summary_large_image" />
            </Head>

            {/* ── Hero Section ───────────────────────────────────────────── */}
            <section className="border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white py-6 dark:border-border dark:from-muted/40 dark:to-background">
                <div className="mx-auto max-w-7xl px-4 sm:px-6">
                    <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20 dark:bg-primary/20">
                            <FileText className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary dark:bg-primary/20">
                                    Portal Transparansi Publik
                                </span>
                                <span className="text-[11px] font-semibold text-slate-400">E-SAKIP Papua Barat</span>
                            </div>
                            <h1 className="mt-0.5 text-xl font-extrabold tracking-tight text-gray-900 dark:text-foreground sm:text-2xl">
                                Laporan Kinerja Publik
                            </h1>
                            <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-gray-500 dark:text-muted-foreground">
                                Akses dokumen resmi perencanaan, pengukuran, pelaporan, dan evaluasi akuntabilitas kinerja perangkat daerah Pemerintah Provinsi Papua Barat secara terbuka.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Main Body: Sidebar + Konten ─────────────────────────────── */}
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
                <div className="flex gap-6 lg:items-start">

                    {/* ── Mobile FAB Toggle ─────────────────────────────────── */}
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="lg:hidden fixed bottom-5 left-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
                        aria-label="Buka menu kategori"
                    >
                        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>

                    {/* Mobile overlay */}
                    {sidebarOpen && (
                        <div
                            className="lg:hidden fixed inset-0 z-40 bg-black/40"
                            onClick={() => setSidebarOpen(false)}
                        />
                    )}

                    {/* ════════════════════════════════════════════════════════
                        SIDEBAR KIRI
                    ════════════════════════════════════════════════════════ */}
                    <aside
                        className={`
                            fixed inset-y-0 left-0 z-40 w-72 overflow-y-auto bg-white shadow-xl pt-4 pb-8
                            transform transition-transform duration-300 ease-in-out
                            dark:bg-card dark:border-r dark:border-border
                            lg:relative lg:inset-auto lg:z-auto lg:w-64 lg:flex-none lg:shadow-none
                            lg:translate-x-0 lg:overflow-visible lg:bg-transparent lg:pt-0 lg:pb-0
                            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                        `}
                    >
                        <div className="lg:sticky lg:top-6 px-3 lg:px-0">
                            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-border dark:bg-card">

                                {kategoriList.map((k) => {
                                    const Icon = KategoriIcon[k.icon] ?? FileText;
                                    const isKategoriActive = k.key === kategori;

                                    return (
                                        <div key={k.key} className="border-b border-slate-100 last:border-0 dark:border-border">

                                            {/* ── Kategori Header (klikable) ── */}
                                            <button
                                                onClick={() => switchKategori(k.key)}
                                                className={`
                                                    w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                                                    ${isKategoriActive
                                                        ? 'bg-slate-800 text-white dark:bg-primary'
                                                        : 'text-slate-700 hover:bg-slate-50 dark:text-foreground dark:hover:bg-muted/40'
                                                    }
                                                `}
                                            >
                                                <Icon className={`h-4 w-4 shrink-0 ${isKategoriActive ? 'text-white' : 'text-primary'}`} />
                                                <span className="flex-1 text-xs font-bold uppercase tracking-wide">
                                                    {k.label}
                                                </span>
                                                {isKategoriActive
                                                    ? <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
                                                    : <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-30" />
                                                }
                                            </button>

                                            {/* ── Sub-Items (tampil saat kategori aktif, semuanya klikable) ── */}
                                            {isKategoriActive && k.subItems.length > 0 && (
                                                <ul className="bg-slate-50 dark:bg-muted/20">
                                                    {k.subItems.map((sub) => {
                                                        const isSubActive = activeType === sub.key;
                                                        return (
                                                            <li key={sub.key}>
                                                                <button
                                                                    onClick={() => switchType(sub.key)}
                                                                    className={`
                                                                        w-full flex items-center gap-3 px-5 py-2.5 text-left text-xs
                                                                        border-b border-slate-100/70 last:border-0 dark:border-border/50
                                                                        transition-colors
                                                                        ${isSubActive
                                                                            ? 'bg-primary/10 text-primary font-bold dark:bg-primary/20 dark:text-primary'
                                                                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-muted-foreground dark:hover:bg-muted/40 dark:hover:text-foreground'
                                                                        }
                                                                    `}
                                                                >
                                                                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${isSubActive ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`} />
                                                                    <span className="flex-1">{sub.label}</span>
                                                                    {isSubActive && (
                                                                        <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                                                                            Aktif
                                                                        </span>
                                                                    )}
                                                                </button>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Disclaimer di footer sidebar */}
                            <div className="mt-4 flex items-start gap-2 rounded-xl border border-slate-200/80 bg-slate-50 p-3.5 dark:border-border dark:bg-card/60">
                                <ShieldCheck className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                                <p className="text-[11px] leading-relaxed text-slate-500 dark:text-muted-foreground">
                                    Dokumen telah divalidasi pejabat berwenang sesuai PermenPAN-RB No. 88/2021.
                                </p>
                            </div>
                        </div>
                    </aside>

                    {/* ════════════════════════════════════════════════════════
                        KONTEN KANAN
                    ════════════════════════════════════════════════════════ */}
                    <div className="min-w-0 flex-1">

                        {/* ── Judul Konten ──────────────────────────────────── */}
                        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20">
                                    <ActiveIcon className="h-4 w-4" />
                                </div>
                                <div>
                                    <h2 className="text-base font-extrabold text-gray-900 dark:text-foreground leading-none">
                                        {contentTitle}
                                    </h2>
                                    {activeKategori?.description && !activeType && (
                                        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-muted-foreground line-clamp-1">
                                            {activeKategori.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-muted dark:text-muted-foreground">
                                {documents.total} dokumen
                            </span>
                        </div>

                        {/* ── Filter Bar ────────────────────────────────────── */}
                        <div className="mb-4 rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs dark:border-border dark:bg-card">
                            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                                {/* Search */}
                                <form onSubmit={handleSearchSubmit} className="relative flex-1">
                                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Cari nama dokumen, kode, atau kata kunci..."
                                        className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-9 text-xs text-gray-900 placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-border dark:bg-muted/40 dark:text-foreground dark:focus:bg-background sm:text-sm"
                                    />
                                    {searchTerm && (
                                        <button type="button" onClick={handleSearchClear} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-muted">
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </form>

                                {/* OPD */}
                                <div className="w-full sm:w-60">
                                    <Select2
                                        value={filters.organization_id ?? ''}
                                        onChange={(val) => applyFilter({ organization_id: val ? Number(val) : null })}
                                        options={[
                                            { value: '', label: 'Semua OPD' },
                                            ...organizations.map((o) => ({
                                                value: o.id,
                                                label: o.name,
                                            })),
                                        ]}
                                        placeholder="Semua OPD"
                                        searchPlaceholder="Cari OPD..."
                                    />
                                </div>

                                {/* Tahun */}
                                <div className="w-full sm:w-36">
                                    <Select2
                                        value={filters.year ?? ''}
                                        onChange={(val) => applyFilter({ year: val ? Number(val) : null })}
                                        options={[
                                            { value: '', label: 'Semua Tahun' },
                                            ...years.map((y) => ({
                                                value: y,
                                                label: `Tahun ${y}`,
                                            })),
                                        ]}
                                        placeholder="Semua Tahun"
                                    />
                                </div>

                                {/* Reset */}
                                {hasActiveFilters && (
                                    <button
                                        onClick={() => {
                                            setSearchTerm('');
                                            applyFilter({ type: null, organization_id: null, year: null, search: null });
                                        }}
                                        className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-dashed border-red-200 bg-red-50/50 px-3 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400"
                                    >
                                        <RotateCcw className="h-3.5 w-3.5" />
                                        Reset
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* ── Banner Pohon Kinerja Interaktif Surabaya ── */}
                        {(filters.type === 'pohon_kinerja' || activeType === 'pohon_kinerja') && (
                            <div className="mb-4 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50/90 via-white to-amber-50/70 p-4 shadow-xs dark:border-indigo-900/50 dark:from-indigo-950/40 dark:via-card dark:to-amber-950/20">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                                            <GitBranch className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                                    Fitur Interaktif
                                                </span>
                                                <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                                                    Standar PermenPAN-RB 89/2021
                                                </span>
                                            </div>
                                            <h3 className="text-sm font-bold text-slate-900 dark:text-foreground mt-1">
                                                Pohon Kinerja Interaktif (Visual Cascading)
                                            </h3>
                                            <p className="text-xs text-slate-600 dark:text-muted-foreground mt-0.5 max-w-xl">
                                                Jelajahi penjenjangan sasaran kinerja daerah dari Visi hingga Output Kegiatan. Dilengkapi navigasi Pan & Zoom, filter sembunyikan layer, pencarian simpul, dan expand/collapse cabang.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                        <Button size="sm" asChild className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-xs">
                                            <Link
                                                href={route('laporan.publik.pohon-kinerja', {
                                                    ...(filters.organization_id ? { organization: filters.organization_id } : {}),
                                                    ...(filters.year ? { period: filters.year } : {}),
                                                })}
                                            >
                                                <Eye className="h-4 w-4" />
                                                <span>Buka Visual Pohon ↗</span>
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Daftar Dokumen / Empty State ─────────────────── */}
                        <div className="flex flex-col gap-2.5">
                            {documents.data.length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-16 px-4 text-center dark:border-border dark:bg-muted/10">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-muted">
                                        <FileSearch className="h-7 w-7" />
                                    </div>
                                    <div className="max-w-sm">
                                        <h3 className="text-sm font-bold text-gray-900 dark:text-foreground">
                                            {hasActiveFilters ? 'Dokumen Tidak Ditemukan' : 'Belum Ada Dokumen Terpublikasi'}
                                        </h3>
                                        <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-muted-foreground">
                                            {hasActiveFilters
                                                ? 'Tidak ditemukan dokumen yang cocok. Silakan sesuaikan filter Anda.'
                                                : 'Dokumen pada kategori ini sedang dalam tahap penyusunan dan verifikasi resmi.'}
                                        </p>
                                    </div>
                                    {hasActiveFilters && (
                                        <button
                                            onClick={() => {
                                                setSearchTerm('');
                                                applyFilter({ type: null, organization_id: null, year: null, search: null });
                                            }}
                                            className="mt-1 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-border dark:bg-card dark:text-foreground"
                                        >
                                            <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                                            Tampilkan Semua
                                        </button>
                                    )}
                                </div>
                            ) : (
                                documents.data.map((doc) => (
                                    <DokumenCard key={doc.id} doc={doc} />
                                ))
                            )}
                        </div>

                        <TablePagination
                            pagination={documents}
                            itemLabel="dokumen"
                            filters={filters}
                            baseUrl={route('laporan.publik.index')}
                        />
                    </div>
                </div>
            </div>
        </PublicLayout>
    );
}
