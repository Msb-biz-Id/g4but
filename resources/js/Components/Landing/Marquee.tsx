import { usePage } from '@inertiajs/react';
import { PageProps } from '@/types';

export default function Marquee() {
    const { appConfig } = usePage<PageProps>().props;
    const appName = appConfig?.appName || 'SIM Kinerja';
    const orgName = appConfig?.organizationName || 'Organisasi Perangkat Daerah';
    const instansiName = appConfig?.instansiName || 'Pemerintah Daerah';

    const items = [
        `${appName} Sistem Akuntabilitas Kinerja Terintegrasi`,
        `${orgName} yang Akuntabel & Berorientasi Hasil`,
        'Akuntabilitas SAKIP Terintegrasi & Berkelanjutan',
        `Penyelarasan Kinerja ${instansiName}`,
        'Early Warning System (EWS) Kinerja Cepat',
        'Cascading Sasaran Perencanaan ke Seluruh Unit Kerja',
        'Transparansi & Keterbukaan Informasi Kinerja Publik',
    ];

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
