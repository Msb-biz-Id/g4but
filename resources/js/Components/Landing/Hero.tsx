import { usePage } from '@inertiajs/react';
import { User, PageProps } from '@/types';

export interface HeroProps {
    user?: User | null;
    canLogin?: boolean;
    canRegister?: boolean;
    stats?: {
        organizations?: number;
        indicators?: number;
        realizations?: number;
        public_documents?: number;
    };
}

export default function Hero({
    user,
    canLogin,
    canRegister,
    stats,
}: HeroProps = {}) {
    const { appConfig } = usePage<PageProps>().props;
    const heroSrc = appConfig?.headlineImageUrl || '/images/hero-banner.webp';
    const altText = appConfig?.appName
        ? `${appConfig.appName} • ${appConfig.appDescription || appConfig.instansiName || 'Portal Informasi Kinerja'}`
        : 'Banner Utama Aplikasi';

    return (
        <section id="beranda" className="scroll-mt-16">
            {/* ══════════════════════════════════════════════════════════
                Hero Banner: 16:9 Proporsional & Utuh Tanpa Terpotong
                Posisi berada di bawah header (ngeblock)
            ══════════════════════════════════════════════════════════ */}
            <div className="relative w-full overflow-hidden bg-slate-900 shadow-md border-b border-slate-200/80 dark:border-border">
                <img
                    src={heroSrc}
                    alt={altText}
                    className="w-full h-auto block aspect-[16/9] object-contain"
                />
            </div>
        </section>
    );
}
