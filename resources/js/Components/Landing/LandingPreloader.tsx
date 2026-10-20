import React, { useState, useEffect, useCallback } from 'react';
import { usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import { cn } from '@/lib/utils';
import { X, HardHat, CheckCircle2 } from 'lucide-react';
import ApplicationLogo from '@/Components/ApplicationLogo';
import { PuprCitySkylinePattern, PuprBlueprintGrid } from './PuprCityPattern';

/**
 * LandingPreloader: PUPR Mimika Spirit
 * Animasi loading progress interaktif (0% -> 100%), siluet skyline jembatan/crane PUPR,
 * dismissible via Esc / klik tombol 'Lewati'.
 */
export default function LandingPreloader() {
    const { appConfig } = usePage<PageProps>().props;
    const [progress, setProgress] = useState(0);
    const [isDismissed, setIsDismissed] = useState(false);
    const [isAnimatingOut, setIsAnimatingOut] = useState(false);

    const appName = appConfig?.appName || 'e-SAKIP';
    const instansiName = appConfig?.instansiName || 'Pemerintah Kabupaten Mimika';
    const orgName = appConfig?.organizationName || 'Dinas Pekerjaan Umum dan Penataan Ruang';

    const triggerDismiss = useCallback(() => {
        setIsAnimatingOut(true);
        const timer = setTimeout(() => {
            setIsDismissed(true);
        }, 350);
        return () => clearTimeout(timer);
    }, []);

    // Jalankan progress bar dari 0 ke 100%
    useEffect(() => {
        const interval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setTimeout(() => {
                        triggerDismiss();
                    }, 250);
                    return 100;
                }
                // Step acak halus agar terasa organik
                const increment = Math.floor(Math.random() * 8) + 4;
                return Math.min(prev + increment, 100);
            });
        }, 40);

        return () => clearInterval(interval);
    }, [triggerDismiss]);

    // Keyboard shortcut Escape / Enter untuk skip
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' || e.key === 'Enter') {
                triggerDismiss();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [triggerDismiss]);

    if (isDismissed) return null;

    const getStatusText = (val: number) => {
        if (val < 30) return 'Menginisialisasi Konfigurasi PUPR Mimika...';
        if (val < 65) return 'Sinkronisasi 5 Matra Pembangunan Daerah...';
        if (val < 95) return 'Verifikasi Akuntabilitas Kinerja & SAKIP...';
        return 'Sistem Siap Digunakan';
    };

    return (
        <aside
            aria-label="Portal Preloader PUPR Mimika"
            role="status"
            className={cn(
                'fixed inset-0 z-[9999] flex flex-col justify-between p-6 sm:p-10 select-none overflow-hidden',
                'bg-gradient-to-b from-[#002B49] via-[#051c2f] to-[#020e17] text-white transition-opacity duration-300 ease-out',
                isAnimatingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
            )}
        >
            {/* Latar Belakang Blueprint Grid & City Skyline PUPR */}
            <PuprBlueprintGrid className="opacity-[0.08]" />
            <PuprCitySkylinePattern className="text-[#FFB800] z-0" opacity="0.18" />

            {/* Architectural radial glow */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[#FFB800]/10 rounded-full blur-[120px] pointer-events-none" />

            {/* Top Bar Header */}
            <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-[#FFB800] animate-pulse" />
                    <div>
                        <span className="text-[10px] font-mono tracking-widest text-[#FFB800] uppercase font-bold block">
                            {orgName}
                        </span>
                        <span className="text-[9px] font-mono text-slate-300 tracking-wider">
                            KABUPATEN MIMIKA • TIMIKA
                        </span>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        triggerDismiss();
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/40 hover:bg-black/60 border border-[#FFB800]/30 hover:border-[#FFB800] text-[11px] font-mono text-slate-200 hover:text-white transition-all shadow-md cursor-pointer"
                    title="Tekan Escape untuk langsung masuk"
                >
                    <span>LEWATI</span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-white/10 text-[#FFB800]">Esc</span>
                    <X className="w-3.5 h-3.5 text-[#FFB800]" />
                </button>
            </div>

            {/* Center Monogram & Progress Indicator */}
            <div className="relative z-10 flex flex-col items-center justify-center text-center my-auto max-w-lg mx-auto w-full px-4">
                {/* Logo Resmi Sistem */}
                <div className="relative mb-6 flex items-center justify-center">
                    <ApplicationLogo className="h-28 w-28 sm:h-32 sm:w-32 object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-transform animate-pulse-soft" />
                </div>

                {/* Judul Sistem */}
                <div className="flex items-center gap-2 mb-1.5">
                    <h1 className="text-3xl sm:text-4xl font-black font-serif text-white tracking-tight">
                        {appName}
                    </h1>
                    <span className="rounded-md bg-[#FFB800] text-slate-950 px-2.5 py-0.5 text-xs font-mono font-black shadow">
                        PUPR
                    </span>
                </div>

                <p className="text-xs sm:text-sm text-amber-200 font-semibold tracking-wide">
                    Sistem Akuntabilitas Kinerja Terintegrasi
                </p>

                {/* Slogan Resmi PUPR */}
                <div className="mt-4 px-4 py-1.5 rounded-full bg-black/50 border border-[#FFB800]/40 text-[#FFB800] text-xs font-mono font-bold tracking-wider inline-flex items-center gap-2 shadow-inner">
                    <HardHat className="w-3.5 h-3.5" />
                    <span>Bekerja Keras • Bergerak Cepat • Bertindak Tepat</span>
                </div>

                {/* Progress Bar Dinamis */}
                <div className="w-full mt-8 max-w-xs space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-slate-300 truncate pr-2">{getStatusText(progress)}</span>
                        <span className="text-[#FFB800] font-bold tabular-nums">{progress}%</span>
                    </div>

                    <div className="h-2 w-full rounded-full bg-black/60 border border-white/10 overflow-hidden p-0.5">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-amber-500 via-[#FFB800] to-yellow-300 transition-all duration-75 ease-out shadow-sm"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Bottom Territorial Footprint & Hint */}
            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] font-mono text-slate-400 border-t border-white/10 pt-4">
                <div className="flex items-center gap-2">
                    <span className="text-white font-medium">Bumi Amungme &amp; Kamoro</span>
                    <span>•</span>
                    <span className="text-[#FFB800]">Kabupaten Mimika, Papua Tengah</span>
                </div>
                <div className="flex items-center gap-1.5 text-amber-300/80">
                    <CheckCircle2 className="w-3 h-3 text-[#FFB800]" />
                    <span>Standar SAKIP PermenPAN-RB No. 88/2021</span>
                </div>
            </div>
        </aside>
    );
}
