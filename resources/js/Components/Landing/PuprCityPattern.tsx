import React from 'react';

/**
 * City Skyline, Bridge Cables, & Construction Crane Pattern
 * Identitas visual infrastruktur fisik resmi insan PUPR (Cipta Karya, Bina Marga, SDA).
 */
export function PuprCitySkylinePattern({
    className = 'text-[#FFB800]/15 dark:text-[#FFB800]/10',
    opacity = '0.12',
}: {
    className?: string;
    opacity?: string;
}) {
    return (
        <div
            className={`pointer-events-none absolute bottom-0 left-0 right-0 w-full overflow-hidden ${className}`}
            style={{ opacity }}
            aria-hidden="true"
        >
            <svg
                viewBox="0 0 1440 220"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-auto min-w-[1000px] preserve-3d"
            >
                {/* Construction Tower Cranes */}
                <path
                    d="M180 30V150M180 35H240M180 45L220 35M180 35H150M240 35L240 60"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                />
                <path
                    d="M1020 15V150M1020 20H1090M1020 30L1070 20M1020 20H990M1090 20L1090 50"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                />

                {/* Suspension Bridge / Jembatan Bentang Panjang (Bina Marga) */}
                <path
                    d="M480 80V170M640 80V170M400 170C480 90 640 90 720 170M480 80C560 130 560 130 640 80"
                    stroke="currentColor"
                    strokeWidth="2"
                />
                <path
                    d="M495 105V170M515 125V170M535 138V170M560 142V170M585 138V170M605 125V170M625 105V170"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeDasharray="1.5 2"
                />

                {/* City Buildings Skyline (Cipta Karya & Penataan Ruang) */}
                <rect x="40" y="110" width="35" height="110" fill="currentColor" fillOpacity="0.4" />
                <rect x="85" y="80" width="45" height="140" fill="currentColor" fillOpacity="0.6" />
                <rect x="140" y="100" width="30" height="120" fill="currentColor" fillOpacity="0.3" />
                
                <rect x="250" y="70" width="55" height="150" fill="currentColor" fillOpacity="0.5" />
                <rect x="315" y="95" width="40" height="125" fill="currentColor" fillOpacity="0.35" />
                <rect x="365" y="60" width="60" height="160" fill="currentColor" fillOpacity="0.65" />
                
                {/* Central Civic Center Tower */}
                <polygon points="760,170 790,45 820,170" fill="currentColor" fillOpacity="0.45" />
                <rect x="830" y="65" width="50" height="155" fill="currentColor" fillOpacity="0.55" />
                <rect x="890" y="90" width="40" height="130" fill="currentColor" fillOpacity="0.35" />
                <rect x="940" y="75" width="65" height="145" fill="currentColor" fillOpacity="0.6" />
                
                <rect x="1110" y="85" width="45" height="135" fill="currentColor" fillOpacity="0.5" />
                <rect x="1165" y="105" width="35" height="115" fill="currentColor" fillOpacity="0.35" />
                <rect x="1210" y="70" width="60" height="150" fill="currentColor" fillOpacity="0.6" />
                <rect x="1280" y="95" width="40" height="125" fill="currentColor" fillOpacity="0.4" />
                <rect x="1330" y="115" width="50" height="105" fill="currentColor" fillOpacity="0.3" />

                {/* Highway & Ground Infrastructure Line */}
                <line x1="0" y1="170" x2="1440" y2="170" stroke="currentColor" strokeWidth="3" />
                <line x1="0" y1="175" x2="1440" y2="175" stroke="currentColor" strokeWidth="1" strokeDasharray="6 4" />
            </svg>
        </div>
    );
}

/**
 * Blueprint Engineering Matrix Grid
 * Garis-garis rancang bangun presisi khas arsitektur & teknik sipil PUPR.
 */
export function PuprBlueprintGrid({
    className = 'opacity-[0.05]',
}: {
    className?: string;
}) {
    return (
        <div
            className={`pointer-events-none absolute inset-0 ${className}`}
            style={{
                backgroundImage: `
                    linear-gradient(to right, #FFB800 1px, transparent 1px),
                    linear-gradient(to bottom, #FFB800 1px, transparent 1px)
                `,
                backgroundSize: '40px 40px',
            }}
            aria-hidden="true"
        />
    );
}
