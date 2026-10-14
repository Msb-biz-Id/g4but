import React from 'react';

/**
 * Ornamen anyaman geometris Noken khas pegunungan Papua Tengah
 * Menggunakan perpaduan garis tenun berlian (diamond mesh weave) tradisional.
 */
export function NokenWeavePattern({
    className = 'text-amber-500/10 dark:text-amber-400/10',
    width = 120,
    height = 40,
}: {
    className?: string;
    width?: number;
    height?: number;
}) {
    return (
        <svg
            className={className}
            width={width}
            height={height}
            viewBox="0 0 120 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            <path
                d="M0 20L15 5L30 20L45 5L60 20L75 5L90 20L105 5L120 20L105 35L90 20L75 35L60 20L45 35L30 20L15 35L0 20Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M15 20L30 12.5L45 20L60 12.5L75 20L90 12.5L105 20"
                stroke="currentColor"
                strokeWidth="1"
                strokeDasharray="2 3"
            />
        </svg>
    );
}

/**
 * Badge Filosofi Noken (Warisan Budaya UNESCO)
 * Lambang kejujuran, keterbukaan, dan wadah tanggung jawab amanah rakyat Papua Tengah.
 */
export function NokenWisdomBadge({
    title = 'Filosofi Noken Papua',
    sub = 'Wadah Kejujuran & Tanggung Jawab Kinerja',
    variant = 'emerald',
}: {
    title?: string;
    sub?: string;
    variant?: 'emerald' | 'amber' | 'slate';
}) {
    const variantStyles = {
        emerald:
            'bg-emerald-950/80 border-emerald-500/30 text-emerald-300 dark:bg-emerald-950/60 dark:border-emerald-500/40',
        amber:
            'bg-amber-950/80 border-amber-500/30 text-amber-300 dark:bg-amber-950/60 dark:border-amber-500/40',
        slate:
            'bg-zinc-900/80 border-zinc-700/50 text-zinc-300 dark:bg-zinc-900/60 dark:border-zinc-700',
    };

    return (
        <div
            className={`inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full border text-xs backdrop-blur-md transition-all hover:scale-[1.02] shadow-sm ${variantStyles[variant]}`}
        >
            <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <div className="flex items-center gap-1.5 font-medium tracking-tight">
                <span className="font-semibold text-amber-300 uppercase tracking-wider text-[10px]">
                    {title}
                </span>
                <span className="text-zinc-400">•</span>
                <span className="text-zinc-200 text-[11px]">{sub}</span>
            </div>
        </div>
    );
}

/**
 * 8 Wilayah Kabupaten Cakupan Papua Tengah
 */
export const KABUPATEN_PAPUA_TENGAH = [
    { code: 'NAB', name: 'Nabire', capital: 'Ibu Kota Provinsi' },
    { code: 'MIM', name: 'Mimika', capital: 'Timika' },
    { code: 'PAN', name: 'Paniai', capital: 'Enarotali' },
    { code: 'PUJ', name: 'Puncak Jaya', capital: 'Mulia' },
    { code: 'PUK', name: 'Puncak', capital: 'Ilaga' },
    { code: 'DOG', name: 'Dogiyai', capital: 'Kigamani' },
    { code: 'INT', name: 'Intan Jaya', capital: 'Sugapa' },
    { code: 'DEI', name: 'Deiyai', capital: 'Tigi' },
];
