import React, { useState } from 'react';
import Reveal from './Reveal';
import { PuprBlueprintGrid, PuprCitySkylinePattern } from './PuprCityPattern';
import { HardHat, Building2, Compass, Activity, Layers, Wrench, ShieldCheck, ChevronRight } from 'lucide-react';
import { PuprEmblemSvg } from './PuprOrnaments';

interface SeksiData {
    name: string;
    code: string;
    picEmail: string;
    focus: string;
}

interface BidangData {
    name: string;
    code: string;
    icon: any;
    kabidEmail: string;
    tagline: string;
    sections: SeksiData[];
}

const STRUKTUR_BIDANG: BidangData[] = [
    {
        name: 'Bidang Cipta Karya',
        code: 'BIDANG-CK',
        icon: Building2,
        kabidEmail: 'kabid.ciptakarya@esakip.local',
        tagline: 'Tata Gedung, Prasarana Pemukiman & Air Minum',
        sections: [
            {
                name: 'Seksi Bangunan Gedung dan Penataan Lingkungan',
                code: 'SEKSI-CK-1',
                picEmail: 'seksi.gedung@esakip.local',
                focus: 'Standarisasi kelayakan teknis gedung daerah & tata lingkungan perkotaan',
            },
            {
                name: 'Seksi Penyehatan Prasarana Pemukiman',
                code: 'SEKSI-CK-2',
                picEmail: 'seksi.prasarana@esakip.local',
                focus: 'Prasarana dasar sanitasi, drainase pemukiman, dan pencegahan kawasan kumuh',
            },
            {
                name: 'Seksi Air Minum Dan Sanitasi',
                code: 'SEKSI-CK-3',
                picEmail: 'seksi.airminum@esakip.local',
                focus: 'Pengembangan jaringan SPAM perpipaan dan sanitasi terpadu masyarakat Mimika',
            },
        ],
    },
    {
        name: 'Bidang Bina Marga',
        code: 'BIDANG-BM',
        icon: Compass,
        kabidEmail: 'kabid.binamarga@esakip.local',
        tagline: 'Konektivitas Jalan & Jembatan Kabupaten',
        sections: [
            {
                name: 'Seksi Pembangunan Dan Peningkatan Jalan dan Jembatan',
                code: 'SEKSI-BM-1',
                picEmail: 'seksi.pembangunanjalan@esakip.local',
                focus: 'Pembangunan ruas jalan poros kabupaten dan jembatan penghubung distrik',
            },
            {
                name: 'Seksi Pemeliharaan Jalan dan Jembatan',
                code: 'SEKSI-BM-2',
                picEmail: 'seksi.pemeliharaanjalan@esakip.local',
                focus: 'Pemeliharaan berkala, penanganan tanggap darurat jalan dan jembatan rusak',
            },
            {
                name: 'Seksi Perencanaan Dan Leger Jalan dan Jembatan',
                code: 'SEKSI-BM-3',
                picEmail: 'seksi.perencanaanjalan@esakip.local',
                focus: 'Audit data leger jalan daerah, DED konstruksi, dan inventarisasi aset jalan',
            },
        ],
    },
    {
        name: 'Bidang Sumber Daya Air',
        code: 'BIDANG-SDA',
        icon: Activity,
        kabidEmail: 'kabid.sda@esakip.local',
        tagline: 'Pengendali Banjir, Tanggul & Jaringan Irigasi',
        sections: [
            {
                name: 'Seksi Pembangunan Sarana dan Prasarana SDA',
                code: 'SEKSI-SDA-1',
                picEmail: 'seksi.sarpras.sda@esakip.local',
                focus: 'Pembangunan tanggul penahan banjir sungai dan sarana irigasi pertanian',
            },
            {
                name: 'Seksi Operasi dan Pemeliharaan SDA',
                code: 'SEKSI-SDA-2',
                picEmail: 'seksi.op.sda@esakip.local',
                focus: 'Operasi pintu air, normalisasi berkala saluran sungai dan drainase primer',
            },
            {
                name: 'Seksi Bina Manfaat SDA',
                code: 'SEKSI-SDA-3',
                picEmail: 'seksi.binamanfaat.sda@esakip.local',
                focus: 'Pendataan pemanfaatan alokasi air tanah dan pemberdayaan P3A kelompok tani',
            },
        ],
    },
    {
        name: 'Bidang Penataan Ruang',
        code: 'BIDANG-TR',
        icon: Layers,
        kabidEmail: 'kabid.penataanruang@esakip.local',
        tagline: 'RTRW, Pemanfaatan Zonasi & Pengendalian',
        sections: [
            {
                name: 'Seksi Perencanaan Penataan Ruang',
                code: 'SEKSI-TR-1',
                picEmail: 'seksi.perencanaanruang@esakip.local',
                focus: 'Penyusunan Rencana Tata Ruang Wilayah (RTRW) & Rencana Detail Tata Ruang (RDTR)',
            },
            {
                name: 'Seksi Pemanfaatan Ruang',
                code: 'SEKSI-TR-2',
                picEmail: 'seksi.pemanfaatanruang@esakip.local',
                focus: 'Kesesuaian Kegiatan Pemanfaatan Ruang (KKPR) dan perizinan zonasi wilayah',
            },
            {
                name: 'Seksi Pengendalian Tata Ruang',
                code: 'SEKSI-TR-3',
                picEmail: 'seksi.pengendalianruang@esakip.local',
                focus: 'Pengawasan tertib ruang, penegakan sanksi tata ruang dan audit kepatuhan',
            },
        ],
    },
];

export default function PuprOrgStructure() {
    const [selectedBidang, setSelectedBidang] = useState<string>('BIDANG-BM');

    return (
        <section
            id="struktur-organisasi"
            className="relative bg-gradient-to-b from-[#002B49] via-[#051c2f] to-[#020e17] text-white py-20 sm:py-28 border-b border-amber-500/20 overflow-hidden"
        >
            {/* Blueprint Matrix Grid & City Skyline Pattern */}
            <PuprBlueprintGrid className="opacity-[0.06]" />
            <PuprCitySkylinePattern className="text-[#FFB800] z-0" opacity="0.22" />

            <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Header Title */}
                <Reveal className="text-center max-w-3xl mx-auto mb-14">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/40 border border-[#FFB800]/40 text-[#FFB800] text-xs font-mono font-bold tracking-wider mb-4 shadow-md">
                        <HardHat className="w-4 h-4" />
                        <span>STRUKTUR RESMI DINAS PUPR KABUPATEN MIMIKA</span>
                    </div>

                    <h2 className="text-3xl sm:text-5xl font-black font-serif text-white tracking-tight leading-tight">
                        Bagan Struktur Organisasi &amp; Seksi Teknis
                    </h2>

                    <p className="mt-3 text-xs sm:text-sm text-slate-300 font-light leading-relaxed">
                        Hierarki kelembagaan pelaksana akuntabilitas kinerja pembangunan infrastruktur di Bumi Amungme &amp; Kamoro. Setiap seksi memiliki peran setara sebagai unit kerja mandiri pengampu indikator kinerja.
                    </p>
                </Reveal>

                {/* ══ BAGAN HIERARKI VISUAL SESUAI STRUKTUR RESMI ══════════════ */}
                <div className="relative mb-14">
                    {/* Kotak Puncak: Kepala Dinas PUPR */}
                    <div className="flex flex-col items-center">
                        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#002B49] to-[#0A2540] border-2 border-[#FFB800] shadow-2xl text-center max-w-md w-full relative group">
                            <div className="flex items-center justify-center gap-2 mb-1">
                                <PuprEmblemSvg className="w-5 h-5" color="#FFB800" />
                                <span className="text-[10px] font-mono tracking-widest text-[#FFB800] font-black uppercase">
                                    PEMIMPIN OPD (CHECKER UTAMA)
                                </span>
                            </div>
                            <h3 className="text-lg sm:text-xl font-black font-serif text-white">
                                Kepala Dinas PUPR Kabupaten Mimika
                            </h3>
                            <p className="text-[11px] font-mono text-slate-300 mt-0.5">
                                Akun: <span className="text-[#FFB800]">kepala.opd@esakip.local</span>
                            </p>
                        </div>

                        {/* Garis Vertikal Penghubung ke Sekretariat */}
                        <div className="w-0.5 h-6 bg-[#FFB800]/60" />

                        {/* Kotak Sekretariat */}
                        <div className="px-5 py-2.5 rounded-xl bg-black/60 border border-amber-400/40 text-center text-xs font-mono text-amber-200 shadow-md">
                            <span className="font-bold text-white">Sekretariat Dinas</span> • Penyelaras Perencanaan &amp; Keuangan
                        </div>

                        {/* Garis Vertikal Turun ke Percabangan */}
                        <div className="w-0.5 h-8 bg-[#FFB800]/60" />
                    </div>

                    {/* Garis Horizontal Penghubung 4 Bidang Teknis */}
                    <div className="hidden lg:block relative mx-auto w-11/12">
                        <div className="h-0.5 w-full bg-[#FFB800]/60" />
                        <div className="flex justify-between w-full -mt-0.5">
                            <div className="w-0.5 h-6 bg-[#FFB800]/60" />
                            <div className="w-0.5 h-6 bg-[#FFB800]/60" />
                            <div className="w-0.5 h-6 bg-[#FFB800]/60" />
                            <div className="w-0.5 h-6 bg-[#FFB800]/60" />
                        </div>
                    </div>

                    {/* Grid 4 Bidang Teknis + 12 Seksi (Persis Bagan User) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mt-4">
                        {STRUKTUR_BIDANG.map((bidang) => {
                            const Icon = bidang.icon;
                            const isSelected = selectedBidang === bidang.code;

                            return (
                                <div
                                    key={bidang.code}
                                    onClick={() => setSelectedBidang(bidang.code)}
                                    className={`cursor-pointer rounded-2xl border transition-all duration-300 p-5 flex flex-col justify-between ${
                                        isSelected
                                            ? 'bg-gradient-to-b from-[#002B49] to-[#062137] border-[#FFB800] shadow-[0_0_25px_rgba(255,184,0,0.2)] scale-[1.01]'
                                            : 'bg-black/40 border-white/10 hover:border-amber-400/50 hover:bg-black/60'
                                    }`}
                                >
                                    {/* Header Bidang */}
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="h-10 w-10 rounded-xl bg-[#FFB800]/15 border border-[#FFB800]/30 flex items-center justify-center text-[#FFB800]">
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-amber-300 font-bold">
                                                {bidang.code}
                                            </span>
                                        </div>

                                        <h4 className="text-base font-bold font-serif text-white leading-snug">
                                            {bidang.name}
                                        </h4>
                                        <p className="text-[11px] text-[#FFB800] mt-0.5 font-medium">
                                            {bidang.tagline}
                                        </p>
                                        <p className="text-[10px] font-mono text-slate-400 mt-1">
                                            Kabid: <span className="text-slate-200">{bidang.kabidEmail}</span>
                                        </p>

                                        {/* 3 Seksi Teknis (Setara Bidang) */}
                                        <div className="mt-4 pt-4 border-t border-white/10 space-y-2.5">
                                            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-amber-400 block">
                                                3 SEKSI PELAKSANA:
                                            </span>

                                            {bidang.sections.map((seksi) => (
                                                <div
                                                    key={seksi.code}
                                                    className="p-2.5 rounded-xl bg-black/40 border border-white/10 hover:border-[#FFB800]/40 transition-colors"
                                                >
                                                    <div className="flex items-start gap-1.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-[#FFB800] mt-1.5 shrink-0" />
                                                        <div>
                                                            <div className="text-xs font-bold text-white leading-tight">
                                                                {seksi.name}
                                                            </div>
                                                            <div className="text-[10px] font-mono text-amber-300/80 mt-0.5">
                                                                {seksi.picEmail}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Garis Putus-putus ke UPTD (Sesuai Gambar) */}
                    <div className="flex flex-col items-center mt-8">
                        <div className="w-0.5 h-8 border-l-2 border-dashed border-[#FFB800]/60" />
                        <div className="p-4 rounded-xl bg-black/70 border border-dashed border-[#FFB800] text-center max-w-sm w-full shadow-lg">
                            <span className="text-[10px] font-mono text-[#FFB800] font-black uppercase tracking-wider block">
                                UNIT PELAKSANA TEKNIS DAERAH
                            </span>
                            <h4 className="text-sm font-bold text-white mt-0.5 font-serif">
                                UPTD Dinas PUPR Kabupaten Mimika
                            </h4>
                            <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                                Akun: <span className="text-amber-300">kepala.uptd@esakip.local</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
