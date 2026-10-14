import React from 'react';

/**
 * Simbol Baling-Baling Roda Gigi Resmi PUPR
 * Melambangkan 3 matra utama: Pengairan/SDA, Bina Marga (Jalan/Jembatan), dan Cipta Karya (Gedung/Tata Ruang).
 */
export function PuprEmblemSvg({
    className = 'w-8 h-8',
    color = '#FFB800',
}: {
    className?: string;
    color?: string;
}) {
    return (
        <svg
            className={className}
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            {/* Outer gear teeth */}
            <circle cx="24" cy="24" r="20" stroke={color} strokeWidth="3" opacity="0.35" />
            <circle cx="24" cy="24" r="8" fill={color} />
            {/* 3 Iconic curved blades (Baling-baling PUPR) */}
            <path
                d="M24 16C24 8 32 4 36 6C34 14 28 16 24 16Z"
                fill={color}
            />
            <path
                d="M17 28C10 32 6 24 8 20C16 22 17 28 17 28Z"
                fill={color}
            />
            <path
                d="M31 28C38 32 42 24 40 20C32 22 31 28 31 28Z"
                fill={color}
            />
        </svg>
    );
}

/**
 * Semboyan Resmi Insan PUPR
 */
export function PuprMottoBadge({
    className = '',
}: {
    className?: string;
}) {
    return (
        <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#002B49] to-[#0A2540] border border-amber-400/40 text-amber-300 text-xs font-mono shadow-md ${className}`}
        >
            <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-ping" />
            <span className="font-bold tracking-wider text-[11px] uppercase">
                Bekerja Keras • Bergerak Cepat • Bertindak Tepat
            </span>
        </div>
    );
}

/**
 * 5 Bidang Teknis PUPR Kabupaten Mimika
 */
export const BIDANG_PUPR_MIMIKA = [
    {
        code: 'BM',
        name: 'Bina Marga',
        scope: 'Konektivitas Jalan, Jembatan & Akses Wilayah Amungme-Kamoro',
        icon: 'Road',
    },
    {
        code: 'CK',
        name: 'Cipta Karya',
        scope: 'Pembangunan Gedung Daerah, SPAM Air Minum, Sanitasi & Pemukiman',
        icon: 'Building',
    },
    {
        code: 'SDA',
        name: 'Sumber Daya Air',
        scope: 'Pengendalian Banjir Sungai Wania, Drainase Perkotaan Timika & Pengamanan Pantai',
        icon: 'Waves',
    },
    {
        code: 'TR',
        name: 'Tata Ruang',
        scope: 'Rencana Tata Ruang Wilayah (RTRW/RDTR) & Kesesuaian Pemanfaatan Ruang',
        icon: 'Map',
    },
    {
        code: 'BK',
        name: 'Bina Konstruksi',
        scope: 'Pengawasan Mutu Bangunan, Sertifikasi Tenaga Kerja & Standar Jasa Konstruksi',
        icon: 'Wrench',
    },
];

/**
 * Wilayah Distrik Prioritas Pembangunan Mimika
 */
export const DISTRIK_MIMIKA = [
    'Mimika Baru (Kota Timika)',
    'Kuala Kencana',
    'Tembagapura (Nemangkawi)',
    'Agimuga',
    'Jila',
    'Mimika Timur',
    'Iwaka',
    'Wania',
];
