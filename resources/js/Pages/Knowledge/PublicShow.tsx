import Reveal from '@/Components/Landing/Reveal';
import PublicLayout from '@/Layouts/PublicLayout';
import { formatDate } from '@/lib/utils';
import { Head, Link } from '@inertiajs/react';
import { YouTubePlayer, YouTubeIcon } from '@/Components/YouTubePlayer';
import { isYouTubeUrl } from '@/lib/video';
import { ArrowLeft, Download, ExternalLink } from 'lucide-react';

interface Publisher {
    id: number;
    name: string;
}

interface Document {
    id: number;
    title: string;
    document_type: string;
    category: string | null;
    tags: string | null;
    content: string | null;
    external_url: string | null;
    file_path: string | null;
    version: number;
    published_at: string | null;
    publisher: Publisher | null;
}

interface Props {
    document: Document;
}

const typeLabel: Record<string, string> = {
    regulation: 'Regulasi',
    sop: 'SOP',
    faq: 'FAQ',
    tutorial: 'Tutorial',
    news: 'Berita/Pengumuman',
    guideline: 'Pedoman',
    video_tutorial: 'Video Tutorial',
    external_link: 'Tautan Aplikasi Pendukung',
};

export default function PublicShow({ document }: Props) {
    const isVideo =
        document.document_type === 'video_tutorial' ||
        (document.external_url ? isYouTubeUrl(document.external_url) : false);

    const hasYouTube = document.external_url
        ? isYouTubeUrl(document.external_url)
        : false;

    return (
        <PublicLayout active="info">
            <Head>
                <title>{`${document.title} • Informasi Publik e-KASUARI`}</title>
                <meta
                    name="description"
                    content={document.content ? document.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 160) : document.title}
                />
                <meta
                    name="keywords"
                    content={`${document.tags ? document.tags + ', ' : ''}${typeLabel[document.document_type] || ''}, informasi publik papua barat, sakip, e-kasuari`}
                />
                <meta property="og:title" content={`${document.title} • Informasi Publik e-KASUARI`} />
                <meta
                    property="og:description"
                    content={document.content ? document.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 160) : document.title}
                />
                <meta property="og:type" content="article" />
                {document.published_at && <meta property="article:published_time" content={document.published_at} />}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={document.title} />
                <meta
                    name="twitter:description"
                    content={document.content ? document.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 160) : document.title}
                />
                <script type="application/ld+json">
                    {JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'Article',
                        headline: document.title,
                        description: document.content ? document.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 160) : document.title,
                        datePublished: document.published_at || undefined,
                        author: {
                            '@type': 'GovernmentOrganization',
                            name: document.publisher?.name || 'Pemerintah Provinsi Papua Barat',
                        },
                        publisher: {
                            '@type': 'GovernmentOrganization',
                            name: 'Pemerintah Provinsi Papua Barat',
                        },
                    })}
                </script>
            </Head>

            <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
                <Link
                    href={route('knowledge.public.index')}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Kembali ke Pusat Informasi</span>
                </Link>

                <Reveal delay={1}>
                    <article className="mt-6 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8 dark:border-border dark:bg-card">
                        <div className="flex flex-wrap items-center gap-2">
                            {isVideo ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-400">
                                    <YouTubeIcon className="h-3.5 w-3.5 text-red-600" />
                                    <span>Video Tutorial</span>
                                </span>
                            ) : (
                                <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary dark:bg-primary/20">
                                    {typeLabel[document.document_type] ?? document.document_type}
                                </span>
                            )}
                            {document.category && (
                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-muted dark:text-muted-foreground">
                                    {document.category}
                                </span>
                            )}
                            <span className="text-xs text-gray-400 dark:text-muted-foreground">
                                v{document.version}
                            </span>
                        </div>

                        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl dark:text-foreground">
                            {document.title}
                        </h1>

                        <p className="mt-2 text-xs text-gray-500 dark:text-muted-foreground">
                            Dipublikasikan {formatDate(document.published_at)}
                            {document.publisher ? ` oleh ${document.publisher.name}` : ''}
                        </p>

                        {document.tags && (
                            <p className="mt-2 text-xs text-gray-400 dark:text-muted-foreground">
                                Tag: {document.tags}
                            </p>
                        )}

                        {/* Responsive Auto Embed YouTube Player */}
                        {hasYouTube && (
                            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200/90 shadow-md">
                                <YouTubePlayer
                                    url={document.external_url!}
                                    title={document.title}
                                />
                            </div>
                        )}

                        {/* Rich Text Body Content */}
                        {document.content && (
                            <div
                                className="prose prose-slate max-w-none mt-6 sm:prose-base text-gray-700 dark:prose-invert dark:text-gray-300"
                                dangerouslySetInnerHTML={{ __html: document.content }}
                            />
                        )}

                        <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-6 dark:border-border">
                            {document.file_path && (
                                <a
                                    href={route('knowledge.public.download', document.id)}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition"
                                >
                                    <Download className="h-4 w-4" />
                                    <span>Unduh Dokumen / Modul</span>
                                </a>
                            )}
                            {document.external_url && (
                                <a
                                    href={document.external_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-slate-50 dark:border-border dark:bg-muted dark:text-foreground dark:hover:bg-muted/80 transition"
                                >
                                    {hasYouTube ? (
                                        <YouTubeIcon className="h-4 w-4 text-red-600" />
                                    ) : (
                                        <ExternalLink className="h-4 w-4" />
                                    )}
                                    <span>
                                        {hasYouTube
                                            ? 'Tonton di YouTube'
                                            : 'Buka Tautan Eksternal'}
                                    </span>
                                </a>
                            )}
                        </div>
                    </article>
                </Reveal>
            </section>
        </PublicLayout>
    );
}
