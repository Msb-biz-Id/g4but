import React, { useCallback, useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Youtube from '@tiptap/extension-youtube';
import {
    Bold,
    Italic,
    Strikethrough,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    Quote,
    Code,
    Link as LinkIcon,
    Unlink,
    Video,
    Minus,
    Undo2,
    Redo2,
    RemoveFormatting,
} from 'lucide-react';

interface RichTextEditorProps {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
    className?: string;
    minHeight?: string;
}

export function RichTextEditor({
    value,
    onChange,
    placeholder = 'Tulis isi konten atau informasi...',
    className = '',
    minHeight = '180px',
}: RichTextEditorProps) {
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [isYoutubeModalOpen, setIsYoutubeModalOpen] = useState(false);
    const [youtubeUrl, setYoutubeUrl] = useState('');

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [2, 3, 4],
                },
            }),
            Placeholder.configure({
                placeholder,
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-primary underline font-medium hover:opacity-80 transition',
                },
            }),
            Youtube.configure({
                inline: false,
                HTMLAttributes: {
                    class: 'aspect-video w-full rounded-xl overflow-hidden shadow-md my-4 border border-slate-200 dark:border-slate-800',
                },
            }),
        ],
        content: value || '',
        editorProps: {
            attributes: {
                class: `prose prose-sm sm:prose-base dark:prose-invert max-w-none p-4 focus:outline-none focus:ring-0 leading-relaxed text-slate-800 dark:text-slate-100`,
                style: `min-height: ${minHeight};`,
            },
        },
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            onChange(html === '<p></p>' ? '' : html);
        },
    });

    // Synchronize content if external value changes (e.g. form reset)
    useEffect(() => {
        if (!editor) return;
        const currentHtml = editor.getHTML();
        if (value !== currentHtml && (value || currentHtml !== '<p></p>')) {
            editor.commands.setContent(value || '', { emitUpdate: false });
        }
    }, [value, editor]);

    const setLink = useCallback(() => {
        if (!editor) return;
        const previousUrl = editor.getAttributes('link').href;
        setLinkUrl(previousUrl || '');
        setIsLinkModalOpen(true);
    }, [editor]);

    const handleConfirmLink = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editor) return;
        if (!linkUrl.trim()) {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
        } else {
            const finalUrl = linkUrl.startsWith('http://') || linkUrl.startsWith('https://') ? linkUrl : `https://${linkUrl}`;
            editor.chain().focus().extendMarkRange('link').setLink({ href: finalUrl }).run();
        }
        setIsLinkModalOpen(false);
        setLinkUrl('');
    };

    const handleAddYoutube = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editor || !youtubeUrl.trim()) return;
        editor.commands.setYoutubeVideo({
            src: youtubeUrl.trim(),
        });
        setIsYoutubeModalOpen(false);
        setYoutubeUrl('');
    };

    if (!editor) {
        return (
            <div className={`rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 min-h-[${minHeight}] animate-pulse ${className}`} />
        );
    }

    return (
        <div className={`rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 ${className}`}>
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    disabled={!editor.can().chain().focus().toggleBold().run()}
                    className={`p-1.5 rounded-lg text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer ${editor.isActive('bold') ? 'bg-primary/15 text-primary dark:bg-primary/30' : ''}`}
                    title="Tebal (Ctrl+B)"
                >
                    <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    disabled={!editor.can().chain().focus().toggleItalic().run()}
                    className={`p-1.5 rounded-lg text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer ${editor.isActive('italic') ? 'bg-primary/15 text-primary dark:bg-primary/30' : ''}`}
                    title="Miring (Ctrl+I)"
                >
                    <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    disabled={!editor.can().chain().focus().toggleStrike().run()}
                    className={`p-1.5 rounded-lg text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer ${editor.isActive('strike') ? 'bg-primary/15 text-primary dark:bg-primary/30' : ''}`}
                    title="Coret"
                >
                    <Strikethrough className="w-3.5 h-3.5" />
                </button>

                <span className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={`px-2 py-1 rounded-lg text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer ${editor.isActive('heading', { level: 2 }) ? 'bg-primary/15 text-primary dark:bg-primary/30' : ''}`}
                    title="Judul Bab (H2)"
                >
                    <Heading2 className="w-3.5 h-3.5" />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    className={`px-2 py-1 rounded-lg text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer ${editor.isActive('heading', { level: 3 }) ? 'bg-primary/15 text-primary dark:bg-primary/30' : ''}`}
                    title="Sub-Judul (H3)"
                >
                    <Heading3 className="w-3.5 h-3.5" />
                </button>

                <span className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={`p-1.5 rounded-lg text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer ${editor.isActive('bulletList') ? 'bg-primary/15 text-primary dark:bg-primary/30' : ''}`}
                    title="Daftar Butir (Bullet)"
                >
                    <List className="w-3.5 h-3.5" />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={`p-1.5 rounded-lg text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer ${editor.isActive('orderedList') ? 'bg-primary/15 text-primary dark:bg-primary/30' : ''}`}
                    title="Daftar Nomor"
                >
                    <ListOrdered className="w-3.5 h-3.5" />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    className={`p-1.5 rounded-lg text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer ${editor.isActive('blockquote') ? 'bg-primary/15 text-primary dark:bg-primary/30' : ''}`}
                    title="Kutipan (Quote)"
                >
                    <Quote className="w-3.5 h-3.5" />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                    className={`p-1.5 rounded-lg text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer ${editor.isActive('codeBlock') ? 'bg-primary/15 text-primary dark:bg-primary/30' : ''}`}
                    title="Blok Kode / Format Khusus"
                >
                    <Code className="w-3.5 h-3.5" />
                </button>

                <span className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

                <button
                    type="button"
                    onClick={setLink}
                    className={`p-1.5 rounded-lg text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer ${editor.isActive('link') ? 'bg-primary/15 text-primary dark:bg-primary/30' : ''}`}
                    title="Sisipkan Tautan (Link)"
                >
                    <LinkIcon className="w-3.5 h-3.5" />
                </button>
                {editor.isActive('link') && (
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().unsetLink().run()}
                        className="p-1.5 rounded-lg text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                        title="Hapus Tautan"
                    >
                        <Unlink className="w-3.5 h-3.5" />
                    </button>
                )}

                <button
                    type="button"
                    onClick={() => setIsYoutubeModalOpen(true)}
                    className="p-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer flex items-center gap-1"
                    title="Sisipkan Video YouTube ke Teks"
                >
                    <Video className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold hidden sm:inline">YouTube</span>
                </button>

                <button
                    type="button"
                    onClick={() => editor.chain().focus().setHorizontalRule().run()}
                    className="p-1.5 rounded-lg text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                    title="Garis Pembatas (Divider)"
                >
                    <Minus className="w-3.5 h-3.5" />
                </button>

                <span className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

                <button
                    type="button"
                    onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
                    className="p-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                    title="Hapus Pemformatan"
                >
                    <RemoveFormatting className="w-3.5 h-3.5" />
                </button>

                <div className="ml-auto flex items-center gap-0.5">
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().undo().run()}
                        disabled={!editor.can().chain().focus().undo().run()}
                        className="p-1.5 rounded-lg text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition cursor-pointer"
                        title="Urungkan (Undo)"
                    >
                        <Undo2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().redo().run()}
                        disabled={!editor.can().chain().focus().redo().run()}
                        className="p-1.5 rounded-lg text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition cursor-pointer"
                        title="Ulangi (Redo)"
                    >
                        <Redo2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="relative">
                <EditorContent editor={editor} />
            </div>

            {/* Modal Input Link */}
            {isLinkModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-2xl max-w-sm w-full border border-slate-200 dark:border-slate-800 space-y-4">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <LinkIcon className="w-4 h-4 text-primary" />
                            <span>Sisipkan Tautan (Link)</span>
                        </h4>
                        <form onSubmit={handleConfirmLink} className="space-y-3">
                            <input
                                type="url"
                                autoFocus
                                required
                                value={linkUrl}
                                onChange={(e) => setLinkUrl(e.target.value)}
                                placeholder="https://contoh.com/dokumen.pdf"
                                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <div className="flex justify-end gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setIsLinkModalOpen(false)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-1.5 rounded-lg text-xs font-bold bg-primary text-white hover:bg-primary/90 shadow-2xs cursor-pointer"
                                >
                                    Terapkan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Input YouTube */}
            {isYoutubeModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-red-100 text-red-600 dark:bg-red-950/50">
                                <Video className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                    Sisipkan Video YouTube ke Konten
                                </h4>
                                <p className="text-[11px] text-slate-500">
                                    Video akan di-embed langsung di dalam teks artikel
                                </p>
                            </div>
                        </div>
                        <form onSubmit={handleAddYoutube} className="space-y-3">
                            <div>
                                <input
                                    type="url"
                                    autoFocus
                                    required
                                    value={youtubeUrl}
                                    onChange={(e) => setYoutubeUrl(e.target.value)}
                                    placeholder="https://www.youtube.com/watch?v=... atau https://youtu.be/..."
                                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                                <span className="text-[10px] text-slate-400 mt-1 block">
                                    Mendukung URL standar YouTube, tautan pendek youtu.be, atau Shorts.
                                </span>
                            </div>
                            <div className="flex justify-end gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setIsYoutubeModalOpen(false)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-1.5 rounded-lg text-xs font-bold bg-red-600 text-white hover:bg-red-700 shadow-2xs cursor-pointer"
                                >
                                    Sematkan Video
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default RichTextEditor;
