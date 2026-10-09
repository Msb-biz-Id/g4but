import { usePage } from '@inertiajs/react';
import { User } from '@/types';

export default function Hero({
    user,
    canLogin,
    canRegister,
}: {
    user?: User | null;
    canLogin?: boolean;
    canRegister?: boolean;
}) {
    const { appConfig } = usePage<any>().props;
    const heroSrc = appConfig?.headlineImageUrl || '/images/hero-banner.webp';

    return (
        <section id="beranda" className="scroll-mt-16">
            {/* ══════════════════════════════════════════════════════════
                Hero Banner: 16:9 Proporsional & Utuh Tanpa Terpotong
                Posisi berada di bawah header (ngeblock)
            ══════════════════════════════════════════════════════════ */}
            <div className="relative w-full overflow-hidden bg-slate-900 shadow-md border-b border-slate-200/80 dark:border-border">
                <img
                    src={heroSrc}
                    alt="e-KASUARI Platform Digital Papua Barat"
                    className="w-full h-auto block aspect-[16/9] object-contain"
                />
            </div>
        </section>
    );
}



