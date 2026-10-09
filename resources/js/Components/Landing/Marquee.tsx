const items = [
    'e-KASUARI Pemerintah Provinsi Papua Barat',
    'Papua Barat Bangkit, Mandiri & Sejahtera',
    'Akuntabilitas SAKIP Terintegrasi & Berkeadilan',
    'Pilot Project 4 OPD Percontohan Papua Barat',
    'Bappeda • Inspektorat • Koperasi UKM • PUPR',
    'Early Warning System (EWS) Kinerja Cepat',
    'Cascading Sasaran RPJMD ke Renstra OPD',
    'Transparansi & Keterbukaan Informasi Publik Daerah',
];

export default function Marquee() {
    const loop = [...items, ...items];

    return (
        <div
            className="group relative overflow-hidden border-y border-slate-800 bg-slate-900 py-3 text-slate-300 dark:border-border dark:bg-slate-950 select-none"
            title="Arahkan kursor atau sentuh untuk menjeda"
        >
            <div className="flex w-max animate-marquee gap-10 pr-10 group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused] cursor-default transition-all">
                {loop.map((item, i) => (
                    <span
                        key={i}
                        className="flex items-center gap-2.5 text-xs font-semibold text-slate-300"
                    >
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400/90 shadow-xs shadow-amber-400/50" />
                        {item}
                    </span>
                ))}
            </div>
        </div>
    );
}
