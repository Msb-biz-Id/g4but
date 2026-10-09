import React, { useState, useEffect, useCallback } from 'react';
import { usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import { cn } from '@/lib/utils';

interface Step {
    threshold: number;
    label: string;
}

const LOCAL_JOURNEY_STEPS: Step[] = [
    { threshold: 28, label: 'Menyapa Fajar Tanah Papua Barat' },
    { threshold: 62, label: 'Harmonisasi Kinerja & Akuntabilitas Daerah' },
    { threshold: 88, label: 'Menyiapkan Portal Bumi Kasuari' },
    { threshold: 100, label: 'Selamat Datang di e-KASUARI' },
];

export default function LandingPreloader() {
    const { appConfig } = usePage<PageProps>().props;
    const [progress, setProgress] = useState(0);
    const [isFading, setIsFading] = useState(false);
    const [isMounted, setIsMounted] = useState(true);

    // Dynamic brand elements from System Settings
    const appName = appConfig?.appName || 'e-KASUARI';
    const appDescription = appConfig?.appDescription || 'Sistem Informasi Akuntabilitas Kinerja Terintegrasi';
    const logoUrl = appConfig?.logoUrl || '/logo.webp';

    const finishPreloader = useCallback(() => {
        setProgress(100);
        setIsFading(true);
        const timer = setTimeout(() => {
            setIsMounted(false);
        }, 600); // 600ms smooth minimalist fade-out
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        // Calm, elegant progress animation (~2.2 seconds total duration)
        let current = 0;
        const interval = setInterval(() => {
            // Smooth pacing that decelerates slightly near the end for luxury feel
            let step = 1.4;
            if (current < 35) step = 1.8;
            else if (current < 70) step = 1.4;
            else if (current < 92) step = 1.1;
            else step = 2.0;

            current = Math.min(current + step, 100);
            setProgress(Math.round(current));

            if (current >= 100) {
                clearInterval(interval);
                finishPreloader();
            }
        }, 32); // Smooth 30fps update

        // Fallback safety timeout
        const maxSafetyTimeout = setTimeout(() => {
            clearInterval(interval);
            finishPreloader();
        }, 3600);

        return () => {
            clearInterval(interval);
            clearTimeout(maxSafetyTimeout);
        };
    }, [finishPreloader]);

    // Keyboard shortcut (Escape to skip immediately)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') finishPreloader();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [finishPreloader]);

    if (!isMounted) return null;

    // Current local milestone status
    const currentStep = LOCAL_JOURNEY_STEPS.find((s) => progress <= s.threshold) || LOCAL_JOURNEY_STEPS[LOCAL_JOURNEY_STEPS.length - 1];

    return (
        <aside
            aria-label="Memuat portal akuntabilitas"
            className={cn(
                'fixed inset-0 z-[9999] flex flex-col items-center justify-between py-12 px-6 sm:px-8',
                'bg-[#090d16] text-slate-100', // Solid deep canvas without transparent photo blotches
                'transition-all duration-700 ease-out select-none cursor-pointer',
                isFading ? 'opacity-0 scale-[1.01] pointer-events-none' : 'opacity-100 scale-100'
            )}
            onClick={finishPreloader}
            title="Ketuk layar untuk langsung masuk"
        >
            {/* Top Local Accent: Minimalist Ethnic Border Motif (Papua Geometric Lines) */}
            <header className="w-full max-w-xl flex flex-col items-center gap-2 pointer-events-none">
                <div className="flex items-center gap-3 w-full justify-center">
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-amber-500/20 to-emerald-500/30" />
                    {/* Minimalist stylized chevron diamond inspired by Papuan woodcarving patterns */}
                    <svg className="w-4 h-4 text-amber-400/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <polygon points="12 2 22 12 12 22 2 12" />
                        <circle cx="12" cy="12" r="2.5" fill="currentColor" fillOpacity="0.8" />
                    </svg>
                    <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-amber-500/20 to-emerald-500/30" />
                </div>
                <span className="text-[10px] sm:text-[11px] tracking-[0.3em] uppercase text-amber-300/80 font-medium">
                    Pemerintah Provinsi Papua Barat
                </span>
            </header>

            {/* Ambient Deep Glow (Soft, Integrated, Non-distracting) */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] sm:w-[500px] h-[400px] sm:h-[500px] rounded-full bg-emerald-950/20 blur-[140px] pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] sm:w-[300px] h-[200px] sm:h-[300px] rounded-full bg-amber-950/15 blur-[100px] pointer-events-none" />
            </div>

            {/* Centerpiece: Dynamic Logo, Local Identity & Clean Typography */}
            <main className="relative flex flex-col items-center text-center max-w-md my-auto">
                {/* Minimalist Emblem Container */}
                <div className="relative mb-7 flex items-center justify-center">
                    {/* Soft ambient ring */}
                    <div className="absolute -inset-2.5 rounded-2xl bg-gradient-to-b from-amber-500/10 via-emerald-500/10 to-transparent blur-sm opacity-60" />

                    {/* Logo Plate */}
                    <div className="relative h-24 w-24 sm:h-28 sm:w-28 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl flex items-center justify-center p-3.5">
                        <img
                            src={logoUrl}
                            alt={appName}
                            className="h-full w-full object-contain drop-shadow-md transition-transform duration-500"
                            onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                                const parent = (e.target as HTMLElement).parentElement;
                                if (parent && !parent.querySelector('.fallback-emblem')) {
                                    const fallback = document.createElement('div');
                                    fallback.className = 'fallback-emblem text-amber-400 font-serif font-bold text-2xl tracking-wider';
                                    fallback.innerText = 'PB';
                                    parent.appendChild(fallback);
                                }
                            }}
                        />
                    </div>
                </div>

                {/* Cultural Badge */}
                <div className="mb-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/20 text-emerald-300/90 text-[11px] font-medium tracking-wide">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400/80 animate-ping" />
                    <span>Bumi Kasuari • Tanah Keberkahan</span>
                </div>

                {/* Dynamic System Name */}
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2 font-sans">
                    {appName}
                </h1>

                {/* Dynamic Description / Tagline */}
                <p className="text-xs sm:text-sm text-slate-400 font-normal leading-relaxed max-w-xs sm:max-w-sm line-clamp-2 mb-8">
                    {appDescription}
                </p>

                {/* Ultra-Minimalist Progress Line & Milestone Label */}
                <div className="w-64 sm:w-72 space-y-2.5">
                    {/* Progress Bar Track: Thin 2px Luxury Line */}
                    <div className="h-[2px] w-full bg-slate-800/80 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 rounded-full transition-all duration-100 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    {/* Step Label & Percentage */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-normal">
                        <span className="truncate pr-2 text-slate-300 font-sans">
                            {currentStep.label}
                        </span>
                        <span className="font-mono text-amber-400/90 font-medium tabular-nums shrink-0">
                            {progress}%
                        </span>
                    </div>
                </div>
            </main>

            {/* Bottom Footer: Philosophical Papuan Quote & Subtle Skip Hint */}
            <footer className="w-full max-w-xl flex flex-col items-center gap-2 text-center pointer-events-none">
                <p className="text-[11px] text-slate-400/80 italic tracking-wide font-serif">
                    &ldquo;Membangun dengan Hati, Melayani dengan Akuntabilitas&rdquo;
                </p>
                <span className="text-[10px] text-slate-500 tracking-wider uppercase font-medium">
                    Ketuk layar untuk melewati
                </span>
            </footer>
        </aside>
    );
}
