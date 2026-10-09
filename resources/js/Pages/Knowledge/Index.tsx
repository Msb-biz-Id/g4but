import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatDateTime, cn } from '@/lib/utils';
import { PageProps } from '@/types';
import { Badge, type BadgeProps } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { SelectNative } from '@/Components/ui/select-native';
import { EmptyState } from '@/Components/EmptyState';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import ConfirmDialog from '@/Components/ConfirmDialog';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/Components/ui/dialog';
import { YouTubePlayer, YouTubeIcon } from '@/Components/YouTubePlayer';
import { isYouTubeUrl } from '@/lib/video';
import { Play } from 'lucide-react';
import TablePagination from '@/Components/TablePagination';

interface DocumentItem {
    id: number;
    title: string;
    document_type: string;
    category: string | null;
    content: string | null;
    file_path: string | null;
    external_url: string | null;
    version: number;
    status: string;
    access: string;
    tags: string | null;
    published_at: string | null;
    publisher: { id: number; name: string } | null;
}

interface Props extends PageProps {
    documents: {
        data: DocumentItem[];
        links: Array<{ url: string | null; label: string; active: boolean }>;
    };
    filters: { search?: string; document_type?: string; category?: string; status?: string; per_page?: number | string };
    categories: string[];
}

const typeLabels: Record<string, string> = {
    regulation: 'Regulasi',
    sop: 'SOP',
    faq: 'FAQ',
    tutorial: 'Tutorial',
    news: 'Berita',
    guideline: 'Pedoman',
    video_tutorial: 'Video Tutorial',
    external_link: 'Tautan Aplikasi Pendukung',
};

const statusLabels: Record<string, { text: string; variant: BadgeProps['variant'] }> = {
    draft: { text: 'Draft', variant: 'secondary' },
    published: { text: 'Terbit', variant: 'success' },
    archived: { text: 'Arsip', variant: 'warning' },
};

export default function KnowledgeIndex({
    auth,
    documents,
    filters,
    categories,
}: Props) {
    const { flash } = usePage().props as { flash: { success?: string | null } };
    const [search, setSearch] = useState(filters.search ?? '');
    const [type, setType] = useState(filters.document_type ?? '');
    const [category, setCategory] = useState(filters.category ?? '');
    const [status, setStatus] = useState(filters.status ?? '');
    const [perPage, setPerPage] = useState(Number(filters.per_page) || 25);
    const [deleteDocTarget, setDeleteDocTarget] = useState<DocumentItem | null>(null);
    const [selectedVideoDoc, setSelectedVideoDoc] = useState<DocumentItem | null>(null);

    const confirmDeleteDoc = () => {
        if (!deleteDocTarget) return;
        router.delete(route('knowledge.destroy', deleteDocTarget.id), {
            onSuccess: () => setDeleteDocTarget(null),
        });
    };

    const permissions = auth.user?.permissions ?? [];
    const canManage = permissions.includes('knowledge:manage');
    const canPublish = permissions.includes('knowledge:publish');

    const isMounted = useRef(false);
    useEffect(() => {
        if (!isMounted.current) { isMounted.current = true; return; }
        const timer = setTimeout(() => {
            router.get(
                route('knowledge.index'),
                { search, document_type: type, category, status, per_page: perPage },
                { preserveState: true, replace: true },
            );
        }, 300);
        return () => clearTimeout(timer);
    }, [search, type, category, status, perPage]);

    return (
        <AuthenticatedLayout
            header="Pusat Informasi"
        >
            <Head title="Basis Pengetahuan" />
            <div className="py-12">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    {flash?.success && (
                        <div className="mb-4 rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">
                            {flash.success}
                        </div>
                    )}

                    <Card className="mb-6">
                        <CardContent className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
                            <div className="grid flex-1 gap-4 lg:grid-cols-4">
                                <Input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Cari judul / konten / tag..."
                                />
                                <SelectNative
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                >
                                    <option value="">Semua Tipe</option>
                                    {Object.entries(typeLabels).map(([key, value]) => (
                                        <option key={key} value={key}>
                                            {value}
                                        </option>
                                    ))}
                                </SelectNative>
                                <SelectNative
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                >
                                    <option value="">Semua Kategori</option>
                                    {categories.map((cat) => (
                                        <option key={cat} value={cat}>
                                            {cat}
                                        </option>
                                    ))}
                                </SelectNative>
                                <SelectNative
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                >
                                    <option value="">Semua Status</option>
                                    <option value="draft">Draft</option>
                                    <option value="published">Terbit</option>
                                    <option value="archived">Arsip</option>
                                </SelectNative>
                            </div>
                            <div className="flex items-center gap-3">
                                {canManage && (
                                    <Button asChild>
                                        <Link href={route('knowledge.create')}>
                                            + Dokumen
                                        </Link>
                                    </Button>
                                )}
                                <Button variant="outline" asChild>
                                    <Link href={route('knowledge.public.index')}>
                                        Lihat Halaman Publik
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-4">
                        {documents.data.map((doc) => (
                            <Card key={doc.id}>
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                {doc.document_type === 'video_tutorial' ? (
                                                    <Badge
                                                        variant="outline"
                                                        className="border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400 inline-flex items-center gap-1 font-medium"
                                                    >
                                                        <YouTubeIcon className="h-3.5 w-3.5 text-red-600" />
                                                        Video Tutorial
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="info">
                                                        {typeLabels[doc.document_type] ?? doc.document_type}
                                                    </Badge>
                                                )}
                                                <Badge variant={statusLabels[doc.status].variant}>
                                                    {statusLabels[doc.status].text}
                                                </Badge>
                                                <Badge variant="secondary">
                                                    v{doc.version}
                                                </Badge>
                                                {doc.access === 'public' && (
                                                    <Badge variant="success">
                                                        Publik
                                                    </Badge>
                                                )}
                                                {doc.category && (
                                                    <Badge variant="secondary">
                                                        {doc.category}
                                                    </Badge>
                                                )}
                                            </div>
                                            <h3 className="mt-2 text-sm font-semibold text-gray-900">
                                                {doc.title}
                                            </h3>
                                            {doc.tags && (
                                                <div className="mt-1 text-xs text-gray-500">
                                                    Tag: {doc.tags}
                                                </div>
                                            )}
                                            <div className="mt-1 text-xs text-gray-400">
                                                {doc.publisher
                                                    ? `oleh ${doc.publisher.name} · `
                                                    : ''}
                                                {doc.published_at
                                                    ? `terbit ${formatDateTime(doc.published_at)}`
                                                    : 'belum terbit'}
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-3 text-sm">
                                            {doc.external_url && isYouTubeUrl(doc.external_url) && (
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedVideoDoc(doc)}
                                                    className="inline-flex items-center gap-1 font-semibold text-red-600 hover:text-red-800"
                                                >
                                                    <Play className="h-3.5 w-3.5 fill-red-600" />
                                                    Tonton Video
                                                </button>
                                            )}
                                            {doc.file_path && (
                                                <a
                                                    href={route('knowledge.download', doc.id)}
                                                    className="text-blue-600 hover:text-blue-900"
                                                >
                                                    Unduh
                                                </a>
                                            )}
                                            {doc.external_url && !isYouTubeUrl(doc.external_url) && (
                                                <a
                                                    href={doc.external_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-blue-600 hover:text-blue-900"
                                                >
                                                    Link
                                                </a>
                                            )}
                                            {canManage && (
                                                <Link
                                                    href={route('knowledge.edit', doc.id)}
                                                    className="text-blue-600 hover:text-blue-900"
                                                >
                                                    Edit
                                                </Link>
                                            )}
                                            {canPublish && doc.status === 'draft' && (
                                                <button
                                                    onClick={() =>
                                                        router.post(
                                                            route('knowledge.publish', doc.id),
                                                        )
                                                    }
                                                    className="text-green-600 hover:text-green-800"
                                                >
                                                    Terbitkan
                                                </button>
                                            )}
                                            {canPublish && doc.status === 'published' && (
                                                <button
                                                    onClick={() =>
                                                        router.post(
                                                            route('knowledge.unpublish', doc.id),
                                                        )
                                                    }
                                                    className="text-yellow-600 hover:text-yellow-800"
                                                >
                                                    Turunkan
                                                </button>
                                            )}
                                            {canManage && (
                                                <button
                                                    onClick={() => setDeleteDocTarget(doc)}
                                                    className="text-red-600 hover:text-red-900"
                                                >
                                                    Hapus
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        {documents.data.length === 0 && (
                            <Card className="p-8">
                                <EmptyState
                                    title="Belum Ada Dokumen Informasi"
                                    description="Tidak ada dokumen atau materi pengetahuan yang cocok dengan filter dan kata kunci pencarian Anda."
                                />
                            </Card>
                        )}

                        <TablePagination
                            pagination={documents}
                            itemLabel="materi"
                            perPage={perPage}
                            onPerPageChange={(val) => setPerPage(val)}
                            baseUrl={route('knowledge.index')}
                            filters={{ search, document_type: type, category, status, per_page: perPage }}
                        />
                    </div>
                </div>
            </div>

            <Dialog
                open={selectedVideoDoc !== null}
                onOpenChange={(open) => !open && setSelectedVideoDoc(null)}
            >
                <DialogContent className="max-w-2xl sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                            <YouTubeIcon className="h-5 w-5 text-red-600" />
                            <span>{selectedVideoDoc?.title}</span>
                        </DialogTitle>
                        {selectedVideoDoc && (
                            <DialogDescription>
                                {selectedVideoDoc.category
                                    ? `Kategori: ${selectedVideoDoc.category}`
                                    : 'Video Tutorial'}
                            </DialogDescription>
                        )}
                    </DialogHeader>
                    {selectedVideoDoc?.external_url && (
                        <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                            <YouTubePlayer
                                url={selectedVideoDoc.external_url}
                                title={selectedVideoDoc.title}
                            />
                        </div>
                    )}
                    {selectedVideoDoc?.content && (
                        <div
                            className="prose prose-sm dark:prose-invert mt-2 max-h-48 overflow-y-auto text-slate-700 dark:text-slate-300"
                            dangerouslySetInnerHTML={{ __html: selectedVideoDoc.content }}
                        />
                    )}
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={deleteDocTarget !== null}
                onOpenChange={(open) => !open && setDeleteDocTarget(null)}
                title="Hapus Dokumen Informasi?"
                description={`Apakah Anda yakin ingin menghapus dokumen "${deleteDocTarget?.title}"? Tindakan ini tidak dapat dibatalkan.`}
                confirmText="Hapus Dokumen"
                cancelText="Batal"
                onConfirm={confirmDeleteDoc}
                onCancel={() => setDeleteDocTarget(null)}
            />
        </AuthenticatedLayout>
    );
}