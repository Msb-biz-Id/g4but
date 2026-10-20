import React, { useRef, useState, useEffect, useCallback } from 'react';
import { usePage } from '@inertiajs/react';
import { cn } from '@/lib/utils';

export interface SliderLogoItem {
    id?: string | number;
    name: string;
    image: string;
    url?: string | null;
    active?: boolean;
}

interface PartnerLogoSliderProps {
    className?: string;
}

export default function PartnerLogoSlider({ className }: PartnerLogoSliderProps) {
    const { appConfig } = usePage<any>().props;
    const sliderContainerRef = useRef<HTMLDivElement>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);

    // Ambil daftar logo murni dari database (Seeder / Pengaturan sistem)
    const logos: SliderLogoItem[] = (appConfig?.logoSlider || []).filter(
        (item: SliderLogoItem) => item.active !== false
    );

    // Scroll ke logo index tertentu
    const scrollToLogo = useCallback((index: number) => {
        if (!sliderContainerRef.current || logos.length === 0) return;
        const container = sliderContainerRef.current;
        const target = container.querySelector<HTMLElement>(`[data-logo-index="${index}"]`);
        if (target) {
            const containerWidth = container.offsetWidth;
            const targetLeft = target.offsetLeft;
            const targetWidth = target.offsetWidth;
            // Posisikan item di tengah container
            const scrollPos = targetLeft - (containerWidth / 2) + (targetWidth / 2);
            container.scrollTo({
                left: Math.max(0, scrollPos),
                behavior: 'smooth',
            });
            setActiveIndex(index);
        }
    }, [logos.length]);

    // Update active dot index saat user scroll manual atau swipe
    const handleScroll = () => {
        if (!sliderContainerRef.current || logos.length === 0) return;
        const container = sliderContainerRef.current;
        const scrollCenter = container.scrollLeft + (container.offsetWidth / 2);

        let closestIndex = 0;
        let minDiff = Infinity;

        const items = container.querySelectorAll<HTMLElement>('[data-logo-index]');
        items.forEach((item) => {
            const idx = Number(item.getAttribute('data-logo-index'));
            const itemCenter = item.offsetLeft + (item.offsetWidth / 2);
            const diff = Math.abs(scrollCenter - itemCenter);
            if (diff < minDiff) {
                minDiff = diff;
                closestIndex = idx;
            }
        });

        setActiveIndex(closestIndex);
    };

    // Auto-advance slider setiap 3.5 detik jika tidak sedang di-hover
    useEffect(() => {
        if (logos.length <= 1 || isHovered) return;

        const interval = setInterval(() => {
            setActiveIndex((prev) => {
                const next = (prev + 1) % logos.length;
                scrollToLogo(next);
                return next;
            });
        }, 3500);

        return () => clearInterval(interval);
    }, [logos.length, isHovered, scrollToLogo]);

    if (!logos || logos.length === 0) {
        return null;
    }

    return (
        <section
            aria-label="Slide Logo Mitra dan Ekosistem Terkait"
            className={cn(
                'relative w-full overflow-hidden bg-gradient-to-r from-[#00182b] via-[#05233c] to-[#00182b] border-y border-amber-500/20 py-4 sm:py-5 select-none shadow-sm',
                className
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Subtle architectural background pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

            {/* Gradient shadow edge masks (fade halus tepi kiri & kanan) */}
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 sm:w-24 z-20 bg-gradient-to-r from-[#00182b] via-[#00182b]/80 to-transparent" />
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 sm:w-24 z-20 bg-gradient-to-l from-[#00182b] via-[#00182b]/80 to-transparent" />

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
                {/* Header Strip Terpusat di Tengah */}
                <div className="flex items-center justify-center text-center mb-3 sm:mb-4">
                    <div className="inline-flex items-center gap-2">
                        <span className="flex h-2 w-2 rounded-full bg-[#FFB800] animate-pulse" />
                        <span className="text-[11px] sm:text-[12px] font-mono font-bold uppercase tracking-wider text-amber-300">
                            Ekosistem Terintegrasi &amp; Mitra Pengawasan Kinerja
                        </span>
                    </div>
                </div>

                {/* Slider Track (Scroll-smooth, Drag-friendly, Snap-friendly) */}
                <div
                    ref={sliderContainerRef}
                    onScroll={handleScroll}
                    className="relative flex items-center justify-start sm:justify-center gap-6 sm:gap-10 overflow-x-auto no-scrollbar scroll-smooth cursor-grab active:cursor-grabbing py-2 px-4"
                >
                    {logos.map((item, index) => {
                        const hasLink = Boolean(item.url && item.url.trim().length > 0);
                        const isCurrent = activeIndex === index;

                        const CardContent = (
                            <div
                                data-logo-index={index}
                                className={cn(
                                    'group/item relative flex items-center justify-center p-2 transition-transform duration-300',
                                    'h-12 sm:h-14 w-28 sm:w-36 shrink-0',
                                    'hover:scale-115 active:scale-95 cursor-pointer',
                                    isCurrent && 'scale-105'
                                )}
                            >
                                {/* Logo Image: Murni transparan dengan efek zoom bersih */}
                                <img
                                    src={item.image}
                                    alt={item.name}
                                    title={item.name}
                                    loading="lazy"
                                    referrerPolicy="no-referrer"
                                    className="max-h-10 sm:max-h-12 max-w-full object-contain filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] transition-transform duration-300 group-hover/item:scale-110"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = '/logo.webp';
                                    }}
                                />
                            </div>
                        );

                        // Seluruh logo dengan tautan WAJIB membuka tab baru (target="_blank")
                        if (hasLink) {
                            return (
                                <a
                                    key={`logo-${item.id || index}-${index}`}
                                    href={item.url!}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="shrink-0 block focus:outline-hidden"
                                    title={`Buka ${item.name} di tab baru`}
                                >
                                    {CardContent}
                                </a>
                            );
                        }

                        return (
                            <div key={`logo-static-${item.id || index}-${index}`} className="shrink-0">
                                {CardContent}
                            </div>
                        );
                    })}
                </div>

                {/* Dot Indicators Tanpa Arrow */}
                {logos.length > 1 && (
                    <div className="flex items-center justify-center gap-1.5 pt-3">
                        {logos.map((item, dotIdx) => {
                            const isCurrent = activeIndex === dotIdx;
                            return (
                                <button
                                    key={`dot-${dotIdx}`}
                                    type="button"
                                    onClick={() => scrollToLogo(dotIdx)}
                                    aria-label={`Buka slide ${item.name}`}
                                    title={item.name}
                                    className={cn(
                                        'transition-all duration-300 rounded-full cursor-pointer focus:outline-hidden',
                                        isCurrent
                                            ? 'w-6 h-2 bg-[#FFB800] shadow-[0_0_8px_rgba(255,184,0,0.7)]'
                                            : 'w-2 h-2 bg-white/30 hover:bg-white/60'
                                    )}
                                />
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
}
