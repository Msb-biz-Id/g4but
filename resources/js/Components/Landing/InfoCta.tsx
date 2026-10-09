import { User } from '@/types';
import { Link } from '@inertiajs/react';
import { ArrowRight, LogIn, BookOpen } from 'lucide-react';
import Reveal from './Reveal';

export default function InfoCta({ user }: { user: User | null }) {
    return (
        <section className="bg-white py-16 sm:py-20 dark:bg-background">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
                <Reveal>
                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 px-8 py-16 text-center shadow-2xl sm:px-16 border border-slate-800">
                        {/* Subtle Papua Geometric Diamond Pattern Motif Watermark */}
                        <div
                            className="pointer-events-none absolute inset-0 opacity-[0.03]"
                            style={{
                                backgroundImage:
                                    "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'%3E%3Cpath d='M20 0l20 20-20 20L0 20zM20 8l12 12-12 12-12-12z'/%3E%3C/g%3E%3C/svg%3E\")",
                                backgroundSize: '32px 32px',
                            }}
                        />
                        <div className="pointer-events-none absolute -top-20 -left-20 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
                        <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-slate-500/10 blur-3xl" />

                        <span className="relative inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/20 px-4 py-1.5 text-xs font-semibold text-primary backdrop-blur">
                            <BookOpen className="h-3.5 w-3.5 stroke-[2.5]" />
                            <span>Keterbukaan Informasi Kinerja Papua Barat</span>
                        </span>

                        <h2 className="relative mt-5 text-2xl font-extrabold text-white sm:text-3xl lg:text-4xl">
                            Pusat Informasi & Regulasi Kinerja Daerah
                        </h2>
                        <p className="relative mx-auto mt-3 max-w-2xl text-slate-300 text-sm sm:text-base leading-relaxed">
                            Akses regulasi daerah, pedoman SAKIP, petunjuk teknis penilaian IKU, dan pengumuman kinerja Pemerintah Provinsi Papua Barat secara transparan tanpa perlu masuk.
                        </p>
                        <p className="relative mt-2 text-xs font-medium text-amber-300/80 italic tracking-wide">
                            "Membangun Papua Barat yang Akuntabel, Transparan, Mandiri, dan Sejahtera"
                        </p>

                        <div className="relative mt-8 flex flex-wrap items-center justify-center gap-4">
                            <Link
                                href={route('knowledge.public.index')}
                                className="inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-sm font-bold text-primary-foreground shadow-md shadow-primary/30 transition hover:bg-primary/90 active:scale-[0.99]"
                            >
                                Jelajahi Pusat Informasi
                                <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                            </Link>
                            {!user && (
                                <Link
                                    href={route('login')}
                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 backdrop-blur px-6 py-3.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
                                >
                                    <LogIn className="h-4 w-4" />
                                    Masuk ke Aplikasi
                                </Link>
                            )}
                        </div>
                    </div>
                </Reveal>
            </div>
        </section>
    );
}
