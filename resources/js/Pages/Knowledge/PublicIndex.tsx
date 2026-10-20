import Reveal from '@/Components/Landing/Reveal';
import PublicLayout from '@/Layouts/PublicLayout';
import { PuprBlueprintGrid, PuprCitySkylinePattern } from '@/Components/Landing/PuprCityPattern';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    BookOpen,
    Calendar,
    ChevronDown,
    ChevronRight,
    Download,
    ExternalLink,
    FileText,
    GraduationCap,
    Layers,
    Menu,
    Newspaper,
    Play,
    RotateCcw,
    Search,
    ShieldCheck,
    Tag,
    Video,
    X,
} from 'lucide-react';
import React, { useState } from 'react';
import { YouTubeThumbnail, YouTubeIcon } from '@/Components/YouTubePlayer';
import { isYouTubeUrl } from '@/lib/video';
import TablePagination from '@/Components/TablePagination';
import { formatDate } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Document {
    id: number;
    title: string;
    document_type: string;
    category: string | null;
    tags: string | null;
    content: string | null;
    external_url: string | null;
    file_path: string | null;
    published_at: string | null;
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

interface Paginator {
    data: Document[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface Props {
    documents: Paginator;
    kategori: string | null;
    activeType: string | null;
    kategoriList: Kategori[];
    filters: {
        search?: string | null;
        document_type?: string | null;
        category?: string | null;
        kategori?: string | null;
        per_page?: number | string | null;
    };
    categories: string[];
}

const typeLabel: Record<string, string> = {
    regulation: 'Regulasi',
    sop: 'SOP',
    faq: 'FAQ',
    tutorial: 'Tutorial',
    news: 'Berita/Pengumuman',
    guideline: 'Pedoman',
    video_tutorial: 'Video Tutorial',
    external_link: 'Tautan Aplikasi Pendukung',
};

const KategoriIcon: Record<string, React.ElementType> = {
    FileText,
    GraduationCap,
    Newspaper,
    BookOpen,
    Layers,
};

export default function PublicIndex({
    documents,
    kategori,
    activeType,
    kategoriList,
    filters,
    categories,
}: Props) {
    const { appConfig } = usePage<any>().props;
    const appName = appConfig?.appName || 'SIPERFORMA PUPR';
    const instansiName = appConfig?.instansiName || 'Pemerintah Kabupaten Mimika';
    const orgName = appConfig?.organizationName || 'Dinas Pekerjaan Umum dan Penataan Ruang';

    const [searchTerm, setSearchTerm] = useState(filters.search ?? '');
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const strip = (text: string | null) =>
        text ? text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 160) : '';

    const applyFilter = (patch: Partial<Props['filters']>) => {
        router.get(
            route('knowledge.public.index'),
            { ...filters, ...patch },
            { preserveState: true, replace: true },
        );
    };

    const switchKategori = (key: string) => {
        setSearchTerm('');
        setSidebarOpen(false);
        if (key === 'semua') {
            applyFilter({ kategori: null, document_type: null, category: null, search: null });
        } else {
            applyFilter({ kategori: key, document_type: null, category: null, search: null });
        }
    };

    const switchType = (subKey: string, parentKategoriKey: string) => {
        setSearchTerm('');
        setSidebarOpen(false);
        // Toggle: klik lagi sub-item yang aktif -> kembali tampilkan semua di kategori tsb
        if (activeType === subKey) {
            applyFilter({ kategori: parentKategoriKey, document_type: null, category: null, search: null });
        } else {
            applyFilter({ kategori: parentKategoriKey, document_type: subKey, category: null, search: null });
        }
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilter({ search: searchTerm.trim() || null });
    };

    const handleSearchClear = () => {
        setSearchTerm('');
        applyFilter({ search: null });
    };

    const handleResetAll = () => {
        setSearchTerm('');
        applyFilter({ kategori: null, document_type: null, category: null, search: null });
    };

    const isAllActive = !kategori || kategori === 'semua';
    const activeKategori = isAllActive ? null : kategoriList.find((k) => k.key === kategori);
    const activeSubItem = activeKategori?.subItems.find((s) => s.key === activeType);

    const ActiveIcon = activeSubItem
        ? (activeType === 'video_tutorial' ? Video : FileText)
        : activeKategori
        ? (KategoriIcon[activeKategori.icon] ?? FileText)
        : Layers;

    const contentTitle = activeSubItem
        ? activeSubItem.label
        : activeKategori
        ? activeKategori.label
        : 'Semua Dokumen & Regulasi';

    const contentDescription = activeSubItem
        ? `Menampilkan dokumen kategori jenis ${activeSubItem.label}`
        : activeKategori
        ? activeKategori.description
        : `Akses seluruh regulasi daerah, pedoman evaluasi SAKIP, petunjuk teknis penilaian IKU, SOP, dan publikasi kinerja ${instansiName}`;

    const hasActiveFilter = Boolean(filters.search || filters.category || filters.document_type || (kategori && kategori !== 'semua'));

    return (
        <PublicLayout active="info">
            <Head>
                <title>{`Pusat Informasi & Regulasi Kinerja Daerah • ${appName} ${instansiName}`}</title>
                <meta
                    name="description"
                    content={`Pusat Informasi & Regulasi Kinerja Daerah ${instansiName}. Akses regulasi SAKIP, pedoman teknis, SOP, FAQ, pengumuman, dan video tutorial.`}
                />
                <meta
                    name="keywords"
                    content={`informasi publik, regulasi sakip, pedoman kinerja daerah, sop akuntabilitas, berita, tutorial sakip, ${instansiName.toLowerCase()}`}
                />
                <meta property="og:title" content={`Pusat Informasi & Regulasi Kinerja Daerah • ${appName} ${instansiName}`} />
                <meta
                    property="og:description"
                    content={`Akses regulasi daerah, pedoman SAKIP, petunjuk teknis penilaian IKU, dan pengumuman kinerja ${instansiName} secara transparan.`}
                />
                <meta property="og:type" content="website" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={`Pusat Informasi & Regulasi Kinerja Daerah • ${appName} ${instansiName}`} />
                <meta
                    name="twitter:description"
                    content={`Akses regulasi daerah, pedoman SAKIP, petunjuk teknis penilaian IKU, dan pengumuman kinerja ${instansiName} secara transparan.`}
                />
            </Head>

            {/* Header Banner - PUPR Mimika Spirit */}
            <section className="relative overflow-hidden bg-gradient-to-b from-[#002B49] via-[#07243c] to-[#041624] pt-10 pb-12 sm:pt-14 sm:pb-16 border-b border-amber-500/20 text-white">
                <PuprBlueprintGrid className="opacity-[0.06]" />
                <PuprCitySkylinePattern className="text-[#FFB800] z-0" opacity="0.22" />

                <div className="relative z-10 mx-auto max-w-5xl px-4 text-center sm:px-6">
                    <Reveal>
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/40 border border-[#FFB800]/40 text-[#FFB800] text-xs font-mono font-bold tracking-wider mb-4 shadow-md">
                            <span>Bekerja Keras • Bergerak Cepat • Bertindak Tepat</span>
                        </div>

                        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight font-serif text-white leading-tight">
                            Bank Regulasi &amp; Standar Mutu{' '}
                            <span className="text-[#FFB800]">
                                PUPR Mimika
                            </span>
                        </h1>

                        <p className="mx-auto mt-3.5 max-w-2xl text-xs sm:text-sm leading-relaxed text-slate-200 font-light">
                            {`Akses resmi peraturan perundang-undangan SAKIP, petunjuk teknis penilaian capaian IKU, PermenPUPR, SOP verifikasi fisik lapangan, dan pedoman mutu konstruksi ${orgName} ${instansiName}.`}
                        </p>
                    </Reveal>
                </div>
            </section>

            {/* ── Main Body: Sidebar Kiri + Konten Kanan ─────────────────── */}
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
                <div className="flex gap-6 lg:items-start">

                    {/* ── Mobile FAB Toggle ─────────────────────────────────── */}
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="lg:hidden fixed bottom-5 left-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
                        aria-label="Buka menu jenis dokumen"
                    >
                        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>

                    {/* Mobile overlay */}
                    {sidebarOpen && (
                        <div
                            className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-xs"
                            onClick={() => setSidebarOpen(false)}
                        />
                    )}

                    {/* ════════════════════════════════════════════════════════
                        SIDEBAR KIRI (Layout Accordion seperti Laporan Publik)
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
                            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-border dark:bg-card shadow-2xs">

                                {/* ── Opsi Utama: Semua Dokumen ── */}
                                <button
                                    onClick={() => switchKategori('semua')}
                                    className={`
                                        w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-slate-100 dark:border-border
                                        ${isAllActive
                                            ? 'bg-slate-800 text-white dark:bg-primary'
                                            : 'text-slate-700 hover:bg-slate-50 dark:text-foreground dark:hover:bg-muted/40'
                                        }
                                    `}
                                >
                                    <Layers className={`h-4 w-4 shrink-0 ${isAllActive ? 'text-white' : 'text-primary'}`} />
                                    <span className="flex-1 text-xs font-bold uppercase tracking-wide">
                                        Semua Dokumen
                                    </span>
                                    {isAllActive && (
                                        <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                            Aktif
                                        </span>
                                    )}
                                </button>

                                {/* ── Grup Kategori Accordion ── */}
                                {kategoriList.map((k) => {
                                    const Icon = KategoriIcon[k.icon] ?? FileText;
                                    const isKategoriActive = kategori === k.key;

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

                                            {/* ── Sub-Items (tampil saat kategori aktif) ── */}
                                            {isKategoriActive && k.subItems.length > 0 && (
                                                <ul className="bg-slate-50 dark:bg-muted/20">
                                                    {k.subItems.map((sub) => {
                                                        const isSubActive = activeType === sub.key;
                                                        return (
                                                            <li key={sub.key}>
                                                                <button
                                                                    onClick={() => switchType(sub.key, k.key)}
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
                                    {`Dokumen regulasi dan pedoman teknis telah divalidasi resmi ${instansiName}.`}
                                </p>
                            </div>
                        </div>
                    </aside>

                    {/* ════════════════════════════════════════════════════════
                        KONTEN KANAN (Filter Bar + Dokumen Grid)
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
                                    {contentDescription && (
                                        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-muted-foreground line-clamp-1">
                                            {contentDescription}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-muted dark:text-muted-foreground self-start sm:self-auto">
                                {documents.total} dokumen
                            </span>
                        </div>

                        {/* ── Filter Bar ────────────────────────────────────── */}
                        <div className="mb-5 rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs dark:border-border dark:bg-card">
                            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                                {/* Search */}
                                <form onSubmit={handleSearchSubmit} className="relative flex-1">
                                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Cari judul, kata kunci, atau konten dokumen..."
                                        className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-9 text-xs text-gray-900 placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-border dark:bg-muted/40 dark:text-foreground dark:focus:bg-background sm:text-sm"
                                    />
                                    {searchTerm && (
                                        <button
                                            type="button"
                                            onClick={handleSearchClear}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-muted"
                                            title="Hapus pencarian"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </form>

                                {/* Kategori Dropdown */}
                                {categories.length > 0 && (
                                    <div className="relative w-full sm:w-56">
                                        <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <select
                                            value={filters.category ?? ''}
                                            onChange={(e) => applyFilter({ category: e.target.value || null })}
                                            className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-8 text-xs font-medium text-slate-700 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-border dark:bg-muted/40 dark:text-foreground cursor-pointer"
                                        >
                                            <option value="">Semua Kategori</option>
                                            {categories.map((c) => (
                                                <option key={c} value={c}>
                                                    {c}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    </div>
                                )}

                                {/* Reset Filter Button */}
                                {hasActiveFilter && (
                                    <button
                                        onClick={handleResetAll}
                                        className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:border-border dark:bg-muted dark:text-muted-foreground dark:hover:text-foreground"
                                        title="Reset semua filter"
                                    >
                                        <RotateCcw className="h-3.5 w-3.5" />
                                        <span className="hidden sm:inline">Reset</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* ── Grid Dokumen ───────────────────────────────────── */}
                        {documents.data.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center dark:border-border dark:bg-muted/20">
                                <FileText className="mx-auto h-10 w-10 text-slate-300 dark:text-muted-foreground/60 mb-2.5" />
                                <h3 className="text-sm font-bold text-gray-900 dark:text-foreground">
                                    {hasActiveFilter ? 'Tidak Ditemukan Dokumen yang Cocok' : 'Belum Ada Konten Publik'}
                                </h3>
                                <p className="mt-1 text-xs text-gray-500 dark:text-muted-foreground max-w-sm mx-auto">
                                    {hasActiveFilter
                                        ? 'Coba gunakan kata kunci pencarian yang lain atau sesuaikan filter jenis/kategori di samping.'
                                        : 'Regulasi dan pedoman teknis akan tampil di halaman ini setelah dipublikasikan oleh administrator.'}
                                </p>
                                {hasActiveFilter && (
                                    <button
                                        onClick={handleResetAll}
                                        className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-border dark:bg-card dark:text-foreground"
                                    >
                                        <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                                        <span>Tampilkan Semua Dokumen</span>
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2">
                                {documents.data.map((doc, i) => {
                                    const isVideo =
                                        doc.document_type === 'video_tutorial' ||
                                        (doc.external_url ? isYouTubeUrl(doc.external_url) : false);
                                    const hasYouTube = doc.external_url
                                        ? isYouTubeUrl(doc.external_url)
                                        : false;

                                    return (
                                        <article
                                            key={doc.id}
                                            className="group flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm dark:border-border dark:bg-card overflow-hidden"
                                        >
                                            <div>
                                                {/* YouTube Thumbnail preview jika ada */}
                                                {hasYouTube && (
                                                    <Link
                                                        href={route('knowledge.public.show', doc.id)}
                                                        className="mb-3 block overflow-hidden rounded-lg border border-slate-100 dark:border-border"
                                                    >
                                                        <YouTubeThumbnail
                                                            url={doc.external_url!}
                                                            alt={doc.title}
                                                            className="w-full aspect-video object-cover transition-transform duration-300 group-hover:scale-105"
                                                        />
                                                    </Link>
                                                )}

                                                {/* Badges */}
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    {isVideo ? (
                                                        <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700 dark:bg-red-950/40 dark:text-red-400">
                                                            <YouTubeIcon className="h-3 w-3 text-red-600" />
                                                            <span>Video Tutorial</span>
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary dark:bg-primary/20">
                                                            {typeLabel[doc.document_type] ?? doc.document_type}
                                                        </span>
                                                    )}
                                                    {doc.category && (
                                                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-muted dark:text-muted-foreground">
                                                            {doc.category}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Title */}
                                                <h3 className="mt-2.5 text-sm font-bold leading-snug text-gray-900 dark:text-foreground group-hover:text-primary transition-colors">
                                                    <Link
                                                        href={route('knowledge.public.show', doc.id)}
                                                        className="focus:outline-hidden"
                                                    >
                                                        {doc.title}
                                                    </Link>
                                                </h3>

                                                {/* Excerpt */}
                                                {doc.content && (
                                                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-gray-500 dark:text-muted-foreground">
                                                        {strip(doc.content)}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Footer Card */}
                                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-border flex items-center justify-between text-xs text-gray-500 dark:text-muted-foreground">
                                                <div className="flex items-center gap-1.5 text-[11px]">
                                                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                                    <span>{doc.published_at ? formatDate(doc.published_at) : 'Tersedia'}</span>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {doc.file_path && (
                                                        <a
                                                            href={route('knowledge.public.download', doc.id)}
                                                            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200 dark:bg-muted dark:text-muted-foreground dark:hover:text-foreground transition"
                                                            title="Unduh PDF"
                                                        >
                                                            <Download className="h-3 w-3" />
                                                            <span>Unduh</span>
                                                        </a>
                                                    )}

                                                    <Link
                                                        href={route('knowledge.public.show', doc.id)}
                                                        className="inline-flex items-center gap-1 font-semibold text-primary hover:underline text-xs"
                                                    >
                                                        <span>{isVideo ? 'Tonton' : doc.external_url ? 'Buka' : 'Baca'}</span>
                                                        {isVideo ? (
                                                            <Play className="h-3 w-3 fill-primary" />
                                                        ) : doc.external_url ? (
                                                            <ExternalLink className="h-3 w-3" />
                                                        ) : (
                                                            <ArrowRight className="h-3.5 w-3.5" />
                                                        )}
                                                    </Link>
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        )}

                        <TablePagination
                            pagination={documents}
                            itemLabel="dokumen"
                            filters={filters}
                            baseUrl={route('knowledge.public.index')}
                        />
                    </div>
                </div>
            </div>
        </PublicLayout>
    );
}

