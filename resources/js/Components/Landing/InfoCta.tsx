import { PageProps, User } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ArrowRight, LogIn, BookOpen, Network, HardHat } from 'lucide-react';
import Reveal from './Reveal';
import { PuprCitySkylinePattern, PuprBlueprintGrid } from './PuprCityPattern';

export default function InfoCta({ user }: { user: User | null }) {
    const { appConfig } = usePage<PageProps>().props;
    const instansiName = appConfig?.instansiName || 'Pemerintah Kabupaten Mimika';
    const orgName = appConfig?.organizationName || 'Dinas Pekerjaan Umum dan Penataan Ruang';

    return (
        <section className="relative bg-[#F8FAFC] dark:bg-[#070E17] py-16 sm:py-24 border-b border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <Reveal>
                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#002B49] via-[#07253d] to-[#041525] p-8 sm:p-14 text-white shadow-2xl border border-amber-500/30">
                        {/* Blueprint Grid & City Skyline Pattern */}
                        <PuprBlueprintGrid className="opacity-[0.06]" />
                        <PuprCitySkylinePattern className="text-[#FFB800] z-0" opacity="0.25" />

                        <div className="relative z-10 max-w-2xl space-y-4">
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/40 border border-[#FFB800]/40 text-[#FFB800] text-xs font-mono font-bold tracking-wider">
                                <HardHat className="w-3.5 h-3.5" />
                                <span>SIGAP MEMBANGUN NEGERI • BUMI AMUNGME &amp; KAMORO</span>
                            </div>

                            <h2 className="text-2xl sm:text-4xl font-extrabold font-serif tracking-tight leading-tight">
                                Akselerasi Infrastruktur Handal &amp; Akuntabilitas Terukur
                            </h2>

                            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-light">
                                Akses dokumen perencanaan, pohon kinerja cascading 5 matra, dan bank regulasi SAKIP {orgName} {instansiName}. Mewujudkan pembangunan bermutu yang menghubungkan seluruh distrik di Mimika.
                            </p>

                            <div className="pt-4 flex flex-wrap items-center gap-3">
                                <Link
                                    href={route('knowledge.public.index')}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FFB800] to-amber-500 hover:from-amber-400 hover:to-[#FFB800] text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg transition-transform active:scale-95"
                                >
                                    <BookOpen className="w-4 h-4" />
                                    <span>Bank Regulasi PUPR</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </Link>

                                <Link
                                    href={route('laporan.publik.pohon-kinerja')}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs tracking-wide transition-colors"
                                >
                                    <Network className="w-4 h-4 text-[#FFB800]" />
                                    <span>Pohon Kinerja Cascading</span>
                                </Link>

                                {!user && (
                                    <Link
                                        href={route('login')}
                                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-amber-300 hover:text-white font-bold text-xs tracking-wide transition-colors sm:ml-auto"
                                    >
                                        <LogIn className="w-4 h-4 text-[#FFB800]" />
                                        <span>Portal Aparatur PUPR →</span>
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </Reveal>
            </div>
        </section>
    );
}
