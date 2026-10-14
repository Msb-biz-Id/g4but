import { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { User, PageProps } from '@/types';
import {
    ArrowRight,
    Search,
    Network,
    FileCheck2,
    BookOpen,
    LogIn,
    Sparkles,
    TrendingUp,
    ShieldCheck,
    BarChart3,
    CheckCircle2,
    Layers,
    Activity,
    HardHat,
    Building2,
    Compass,
    Wrench,
} from 'lucide-react';
import { PuprEmblemSvg, BIDANG_PUPR_MIMIKA } from './PuprOrnaments';
import { PuprCitySkylinePattern, PuprBlueprintGrid } from './PuprCityPattern';

interface HeroProps {
    user?: User | null;
    canLogin?: boolean;
    canRegister?: boolean;
    stats?: {
        organizations: number;
        indicators: number;
        realizations: number;
        public_documents: number;
    };
}

const PUPR_FEATURE_HIGHLIGHTS = [
    {
        id: 'bm',
        title: 'Bina Marga (Jalan & Jembatan)',
        badge: 'KONEKTIVITAS WILAYAH',
        icon: Compass,
        headline: 'Akselerasi Konektivitas Jalan & Jembatan Bumi Amungme-Kamoro',
        summary:
            'Pengukuran berkala kemantapan jalan kabupaten, pembukaan akses distrik terisolir, dan pemeliharaan jembatan dengan verifikasi dokumentasi lapangan presisi.',
        metric: 'Kemantapan Jalan',
        metricSub: 'Verifikasi Fisik Berkala',
        actionHref: '/laporan',
        actionLabel: 'Lihat Capaian Bina Marga',
    },
    {
        id: 'ck',
        title: 'Cipta Karya & Permukiman',
        badge: 'TATA BANGUNAN & SPAM',
        icon: Building2,
        headline: 'Penyediaan Air Bersih SPAM & Prasarana Gedung Daerah',
        summary:
            'Pencatatan realisasi penyerapan dan fisik pada program cakupan air minum layak, sanitasi terpadu, dan penataan gedung pemerintahan Mimika.',
        metric: 'Standar Teknis',
        metricSub: 'Evidence Dokumentasi Lengkap',
        actionHref: '/laporan',
        actionLabel: 'Capaian Cipta Karya',
    },
    {
        id: 'sda',
        title: 'Sumber Daya Air (SDA)',
        badge: 'PENGENDALIAN BANJIR',
        icon: Activity,
        headline: 'Pengendalian Banjir Sungai Wania & Pengamanan Kawasan Pesisir',
        summary:
            'Normalisasi saluran drainase perkotaan Timika, pembangunan tanggul penahan banjir, dan irigasi pertanian dengan audit progres berjenjang.',
        metric: 'Mitigasi Banjir',
        metricSub: 'Laporan Triwulanan',
        actionHref: '/laporan',
        actionLabel: 'Capaian SDA Mimika',
    },
    {
        id: 'pohon',
        title: 'Pohon Kinerja Cascading',
        badge: 'CASCADING RPJMD',
        icon: Network,
        headline: 'Penyelarasan Sasaran dari Kepala Dinas hingga Pengawas Lapangan',
        summary:
            'Cascading tujuan pembangunan infrastruktur RPJMD Kabupaten Mimika ke sasaran strategis dinas dan IKU bidang teknis secara hierarkis.',
        metric: '100% Selaras',
        metricSub: 'Bebas Sasaran Semu',
        actionHref: '/laporan/pohon-kinerja',
        actionLabel: 'Buka Pohon Kinerja',
    },
];

const SEARCH_SUGGESTIONS = [
    'Bina Marga',
    'Cipta Karya',
    'Sumber Daya Air',
    'Tata Ruang',
    'Jalan Poros Timika',
    'Renstra PUPR 2024-2026',
];

export default function Hero({ user, stats }: HeroProps) {
    const { appConfig } = usePage<PageProps>().props;
    const appName = appConfig?.appName || 'e-SAKIP';
    const instansiName = appConfig?.instansiName || 'Pemerintah Kabupaten Mimika';
    const orgName = appConfig?.organizationName || 'Dinas Pekerjaan Umum dan Penataan Ruang';

    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState(0);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = searchQuery.trim();
        const targetUrl = route('laporan.publik.index') + (trimmed ? `?q=${encodeURIComponent(trimmed)}` : '');
        window.location.href = targetUrl;
    };

    const currentFeature = PUPR_FEATURE_HIGHLIGHTS[activeTab];
    const FeatureIcon = currentFeature.icon;

    return (
        <section
            id="beranda"
            className="relative w-full overflow-hidden bg-gradient-to-b from-[#002B49] via-[#07243c] to-[#041624] text-white py-16 sm:py-24 border-b border-amber-500/20 scroll-mt-14"
        >
            {/* Background architectural glow, blueprint grid and PUPR City Skyline */}
            <PuprBlueprintGrid className="opacity-[0.06]" />
            <PuprCitySkylinePattern className="text-[#FFB800] z-0" opacity="0.22" />
            <div className="absolute top-0 right-1/4 w-[600px] h-[350px] bg-[#FFB800]/10 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute bottom-0 left-10 w-[500px] h-[300px] bg-blue-500/10 rounded-full blur-[140px] pointer-events-none" />

            <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* PUPR Official Slogan Ribbon */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/40 border border-[#FFB800]/40 text-[#FFB800] text-xs font-mono font-bold shadow-md">
                        <HardHat className="w-4 h-4" />
                        <span>Bekerja Keras • Bergerak Cepat • Bertindak Tepat</span>
                    </div>

                    <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-xs font-mono font-semibold">
                        <Sparkles className="w-3.5 h-3.5 text-[#FFB800]" />
                        <span>Portal Akuntabilitas Kinerja • {orgName} Mimika</span>
                    </span>
                </div>

                {/* Hero Grid: Left Content + Right Interactive Matra Console */}
                <div className="grid gap-12 lg:grid-cols-12 items-center">
                    {/* Left Column: Headline, Description & Search */}
                    <div className="lg:col-span-7 space-y-6">
                        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight font-serif text-white leading-[1.12]">
                            Akuntabilitas Infrastruktur <span className="text-[#FFB800]">PUPR Mimika</span>
                        </h1>

                        <p className="text-base sm:text-lg text-slate-200 leading-relaxed max-w-2xl font-light">
                            Satu gerbang terpadu akuntabilitas kinerja pembangunan jalan, jembatan, gedung daerah, penataan ruang, dan sumber daya air di seluruh penjuru Bumi Amungme &amp; Kamoro.
                        </p>

                        {/* Search Box */}
                        <form
                            onSubmit={handleSearchSubmit}
                            className="p-2 rounded-2xl bg-black/50 border border-[#FFB800]/40 shadow-2xl backdrop-blur-md flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-xl transition-all focus-within:border-[#FFB800]"
                        >
                            <div className="flex items-center gap-3 px-3 flex-1">
                                <Search className="w-5 h-5 text-[#FFB800] shrink-0" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Cari Laporan SAKIP, Bina Marga, Cipta Karya, Renstra..."
                                    className="w-full bg-transparent border-0 text-sm text-white placeholder-slate-400 focus:ring-0 p-1 font-medium"
                                />
                            </div>
                            <button
                                type="submit"
                                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FFB800] to-amber-500 hover:from-amber-400 hover:to-[#FFB800] text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg transition-transform active:scale-95"
                            >
                                <span>Cari Laporan</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </form>

                        {/* Suggestion Chips */}
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-[11px] font-mono text-amber-300">Pencarian Cepat:</span>
                            {SEARCH_SUGGESTIONS.map((sug) => (
                                <button
                                    key={sug}
                                    type="button"
                                    onClick={() => {
                                        setSearchQuery(sug);
                                        window.location.href = route('laporan.publik.index') + `?q=${encodeURIComponent(sug)}`;
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-[#FFB800]/20 border border-white/15 hover:border-[#FFB800] text-slate-200 hover:text-[#FFB800] text-[11px] transition-colors"
                                >
                                    {sug}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right Column: Interactive Matra Pembangunan Console */}
                    <div className="lg:col-span-5">
                        <div className="relative rounded-3xl border border-amber-500/30 bg-gradient-to-b from-[#07243c] via-[#051c30] to-[#031322] p-6 sm:p-7 shadow-2xl backdrop-blur-xl">
                            {/* Console Title Bar */}
                            <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
                                <div className="flex items-center gap-2">
                                    <PuprEmblemSvg className="w-5 h-5" color="#FFB800" />
                                    <span className="text-xs font-mono font-bold uppercase text-[#FFB800]">
                                        Matra Penyelenggaraan Kinerja
                                    </span>
                                </div>
                                <span className="text-[10px] font-mono text-slate-400">
                                    Tab {activeTab + 1} / {PUPR_FEATURE_HIGHLIGHTS.length}
                                </span>
                            </div>

                            {/* Segmented Switcher */}
                            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10 mb-5">
                                {PUPR_FEATURE_HIGHLIGHTS.map((f, i) => (
                                    <button
                                        key={f.id}
                                        type="button"
                                        onClick={() => setActiveTab(i)}
                                        className={`py-2 px-2 rounded-lg text-[11px] font-bold transition-all truncate text-left ${
                                            activeTab === i
                                                ? 'bg-[#FFB800] text-slate-950 shadow-md font-black'
                                                : 'text-slate-300 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        {f.title.split(' ')[0]} {f.title.split(' ')[1] || ''}
                                    </button>
                                ))}
                            </div>

                            {/* Active Highlight Card */}
                            <div className="space-y-4">
                                <div className="flex items-start gap-3.5">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#002B49] border border-[#FFB800]/40 text-[#FFB800] shadow-inner">
                                        <FeatureIcon className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-mono font-bold text-[#FFB800] uppercase">
                                            {currentFeature.badge}
                                        </div>
                                        <h3 className="text-base font-bold text-white font-serif leading-snug mt-0.5">
                                            {currentFeature.headline}
                                        </h3>
                                        <p className="mt-1.5 text-xs text-slate-300 leading-relaxed font-light">
                                            {currentFeature.summary}
                                        </p>
                                    </div>
                                </div>

                                {/* Metric Highlight Pill */}
                                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/40 border border-white/10">
                                    <div>
                                        <div className="text-sm font-extrabold font-mono text-[#FFB800]">
                                            {currentFeature.metric}
                                        </div>
                                        <div className="text-[10px] text-slate-400">
                                            {currentFeature.metricSub}
                                        </div>
                                    </div>

                                    <Link
                                        href={currentFeature.actionHref}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFB800] hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors shadow-md"
                                    >
                                        <span>{currentFeature.actionLabel}</span>
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Metric Summary Counters */}
                {stats && (
                    <div className="mt-14 pt-8 border-t border-white/10 grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-[#FFB800]/40 transition-colors">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-mono text-[#FFB800] uppercase tracking-wider font-bold">
                                    BIDANG &amp; UNIT PUPR
                                </span>
                                <Layers className="w-4 h-4 text-amber-300" />
                            </div>
                            <div className="text-3xl font-black font-mono text-white">
                                {stats.organizations || 5}
                            </div>
                            <p className="text-xs text-slate-300 mt-1">Bidang Teknis &amp; Sekretariat</p>
                        </div>

                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-[#FFB800]/40 transition-colors">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-mono text-[#FFB800] uppercase tracking-wider font-bold">
                                    INDIKATOR IKU
                                </span>
                                <TrendingUp className="w-4 h-4 text-amber-300" />
                            </div>
                            <div className="text-3xl font-black font-mono text-white">
                                {stats.indicators || 0}
                            </div>
                            <p className="text-xs text-slate-300 mt-1">Target Sasaran Strategis Dinas</p>
                        </div>

                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-[#FFB800]/40 transition-colors">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-mono text-[#FFB800] uppercase tracking-wider font-bold">
                                    REALISASI EVIDENCE
                                </span>
                                <BarChart3 className="w-4 h-4 text-amber-300" />
                            </div>
                            <div className="text-3xl font-black font-mono text-white">
                                {stats.realizations || 0}
                            </div>
                            <p className="text-xs text-slate-300 mt-1">Progres Fisik &amp; Serapan Sah</p>
                        </div>

                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-[#FFB800]/40 transition-colors">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-mono text-[#FFB800] uppercase tracking-wider font-bold">
                                    DOKUMEN SAKIP
                                </span>
                                <BookOpen className="w-4 h-4 text-amber-300" />
                            </div>
                            <div className="text-3xl font-black font-mono text-white">
                                {stats.public_documents || 0}
                            </div>
                            <p className="text-xs text-slate-300 mt-1">Renstra, PK, LHE &amp; LKjIP</p>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
