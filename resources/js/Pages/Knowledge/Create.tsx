import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Button } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { SelectNative } from '@/Components/ui/select-native';
import { RichTextEditor } from '@/Components/RichTextEditor';
import { YouTubePlayer, YouTubeIcon } from '@/Components/YouTubePlayer';
import { isYouTubeUrl } from '@/lib/video';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { AlertCircle, Video } from 'lucide-react';

interface Props extends PageProps {}

const typeOptions = [
    { value: 'regulation', label: 'Regulasi' },
    { value: 'guideline', label: 'Pedoman' },
    { value: 'sop', label: 'SOP' },
    { value: 'faq', label: 'FAQ' },
    { value: 'news', label: 'Berita' },
    { value: 'tutorial', label: 'Tutorial' },
    { value: 'video_tutorial', label: 'Video Tutorial' },
    { value: 'external_link', label: 'Tautan Aplikasi Pendukung' },
];

export default function KnowledgeCreate({ auth }: Props) {
    const form = useForm({
        title: '',
        document_type: 'regulation',
        category: '',
        content: '',
        tags: '',
        access: 'internal',
        external_url: '',
        file: null as File | null,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.post(route('knowledge.store'), { forceFormData: true });
    };

    const isVideoType = form.data.document_type === 'video_tutorial';
    const hasYouTubeUrl = isYouTubeUrl(form.data.external_url);

    return (
        <AuthenticatedLayout header="Tambah Dokumen">
            <Head title="Tambah Dokumen" />
            <div className="py-12">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                    <Card>
                        <form
                            autoComplete="off"
                            noValidate
                            onSubmit={submit}
                            className="space-y-6 p-6"
                        >
                            <div>
                                <Label>Judul</Label>
                                <Input
                                    type="text"
                                    placeholder="Judul artikel atau dokumen referensi"
                                    value={form.data.title}
                                    onChange={(e) => form.setData('title', e.target.value)}
                                    className="mt-1"
                                />
                                {form.errors.title && (
                                    <p className="mt-1 text-xs text-red-600">
                                        {form.errors.title}
                                    </p>
                                )}
                            </div>

                            <div className="grid gap-4 sm:grid-cols-3">
                                <div>
                                    <Label>Tipe</Label>
                                    <SelectNative
                                        value={form.data.document_type}
                                        onChange={(e) =>
                                            form.setData('document_type', e.target.value)
                                        }
                                        className="mt-1"
                                    >
                                        {typeOptions.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </SelectNative>
                                </div>
                                <div>
                                    <Label>Kategori</Label>
                                    <Input
                                        type="text"
                                        value={form.data.category}
                                        onChange={(e) =>
                                            form.setData('category', e.target.value)
                                        }
                                        placeholder="mis. Keuangan / SAKIP"
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label>Akses</Label>
                                    <SelectNative
                                        value={form.data.access}
                                        onChange={(e) =>
                                            form.setData('access', e.target.value)
                                        }
                                        className="mt-1"
                                    >
                                        <option value="internal">Internal</option>
                                        <option value="public">Publik</option>
                                    </SelectNative>
                                </div>
                            </div>

                            {isVideoType && (
                                <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                                    <div className="flex items-start gap-2.5">
                                        <YouTubeIcon className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                                        <div className="space-y-1">
                                            <p className="font-semibold">
                                                Gunakan Link / Embed YouTube untuk Video Tutorial
                                            </p>
                                            <p className="text-xs leading-relaxed opacity-90">
                                                Untuk menghemat ruang server dan memastikan video dapat diputar dengan lancar tanpa batas ukuran, masukkan link YouTube pada kolom tautan di bawah. Sistem akan otomatis memutar video secara langsung (auto-embed).
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <Label className="flex items-center gap-1.5">
                                    {isVideoType ? (
                                        <>
                                            <YouTubeIcon className="h-4 w-4 text-red-600" />
                                            <span>Tautan / URL Video YouTube</span>
                                        </>
                                    ) : (
                                        <span>Tautan Eksternal (opsional)</span>
                                    )}
                                </Label>
                                <Input
                                    type="text"
                                    value={form.data.external_url}
                                    onChange={(e) =>
                                        form.setData('external_url', e.target.value)
                                    }
                                    placeholder={
                                        isVideoType
                                            ? 'https://www.youtube.com/watch?v=... atau https://youtu.be/...'
                                            : 'https://...'
                                    }
                                    className="mt-1"
                                />
                                {form.errors.external_url && (
                                    <p className="mt-1 text-xs text-red-600">
                                        {form.errors.external_url}
                                    </p>
                                )}

                                {hasYouTubeUrl && (
                                    <div className="mt-3 space-y-1.5">
                                        <span className="text-xs font-medium text-slate-500">
                                            Pratinjau Video (Auto Embed):
                                        </span>
                                        <div className="max-w-xl overflow-hidden rounded-xl border border-slate-200 shadow-xs">
                                            <YouTubePlayer
                                                url={form.data.external_url}
                                                title="Preview Video"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <Label>Konten / Deskripsi</Label>
                                <div className="mt-1">
                                    <RichTextEditor
                                        value={form.data.content}
                                        onChange={(html: string) => form.setData('content', html)}
                                        placeholder="Tulis isi panduan, materi, atau penjelasan dokumen referensi..."
                                    />
                                </div>
                                {form.errors.content && (
                                    <p className="mt-1 text-xs text-red-600">
                                        {form.errors.content}
                                    </p>
                                )}
                            </div>

                            <div>
                                <Label>Tag (pisahkan dengan koma)</Label>
                                <Input
                                    type="text"
                                    value={form.data.tags}
                                    onChange={(e) => form.setData('tags', e.target.value)}
                                    placeholder="mis. SAKIP, regulasi, 2026"
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <Label>
                                    {isVideoType
                                        ? 'Lampiran Dokumen / Modul Pendukung (opsional)'
                                        : 'Lampiran (opsional)'}
                                </Label>
                                <input
                                    type="file"
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.pptx,.jpg,.jpeg,.png"
                                    onChange={(e) =>
                                        form.setData('file', e.target.files?.[0] ?? null)
                                    }
                                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100 dark:text-gray-400 dark:file:bg-primary/20 dark:file:text-primary"
                                />
                                {isVideoType && (
                                    <p className="mt-1 text-xs text-slate-400">
                                        Hanya untuk dokumen modul/slide pendukung (PDF/PPT/DOC). Hindari upload video mentah ke file ini.
                                    </p>
                                )}
                                {form.errors.file && (
                                    <p className="mt-1 text-xs text-red-600">
                                        {form.errors.file}
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-border">
                                <Button variant="ghost" asChild>
                                    <Link href={route('knowledge.index')}>Batal</Link>
                                </Button>
                                <Button type="submit" disabled={form.processing}>
                                    Simpan Dokumen
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}