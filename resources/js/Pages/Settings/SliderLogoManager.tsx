import React, { useState, useRef } from 'react';
import { router } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Input } from '@/Components/ui/input';
import {
    Plus, Trash2, Edit3, ArrowUp, ArrowDown, ExternalLink,
    UploadCloud, CheckCircle2, Image, Link as LinkIcon,
    Eye, EyeOff, Save, Loader2, Sparkles, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

export interface SliderLogoItem {
    id: string;
    name: string;
    image: string;
    url?: string;
    active: boolean;
}

interface SliderLogoManagerProps {
    initialLogos: SliderLogoItem[];
    canManage: boolean;
}

export default function SliderLogoManager({
    initialLogos = [],
    canManage = true,
}: SliderLogoManagerProps) {
    const [logos, setLogos] = useState<SliderLogoItem[]>(initialLogos);
    const [isSaving, setIsSaving] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    // Form modal state
    const [formData, setFormData] = useState<SliderLogoItem>({
        id: '',
        name: '',
        image: '',
        url: '',
        active: true,
    });
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Buka modal untuk menambah logo baru
    const handleAddNew = () => {
        setFormData({
            id: String(Date.now()),
            name: '',
            image: '/logo.webp',
            url: '',
            active: true,
        });
        setEditingIndex(null);
        setIsModalOpen(true);
    };

    // Buka modal untuk mengedit logo yang sudah ada
    const handleEdit = (index: number) => {
        setFormData({ ...logos[index] });
        setEditingIndex(index);
        setIsModalOpen(true);
    };

    // Hapus logo dari daftar
    const handleDelete = (index: number) => {
        const item = logos[index];
        if (confirm(`Hapus logo '${item.name}' dari slide?`)) {
            const next = logos.filter((_, i) => i !== index);
            setLogos(next);
            toast.info(`Logo '${item.name}' dihapus dari daftar. Jangan lupa klik 'Simpan Perubahan'.`);
        }
    };

    // Pindah urutan logo
    const handleMove = (index: number, direction: 'up' | 'down') => {
        if (
            (direction === 'up' && index === 0) ||
            (direction === 'down' && index === logos.length - 1)
        ) {
            return;
        }

        const next = [...logos];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        const temp = next[index];
        next[index] = next[targetIndex];
        next[targetIndex] = temp;
        setLogos(next);
    };

    // Toggle status aktif logo
    const handleToggleActive = (index: number) => {
        const next = [...logos];
        next[index] = { ...next[index], active: !next[index].active };
        setLogos(next);
    };

    // Upload file gambar logo via ajax
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const fd = new FormData();
        fd.append('file', file);

        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;
            const res = await fetch(route('settings.slider-logo.upload'), {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': csrfToken || '',
                    'Accept': 'application/json',
                },
                body: fd,
            });

            const data = await res.json();
            if (res.ok && data.url) {
                setFormData((prev) => ({ ...prev, image: data.url }));
                toast.success('Gambar logo berhasil diunggah!');
            } else {
                toast.error(data.message || 'Gagal mengunggah gambar logo.');
            }
        } catch (err: any) {
            toast.error('Terjadi kesalahan saat mengunggah: ' + err.message);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Simpan dari form modal ke daftar logo lokal
    const handleSaveFormModal = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            toast.error('Nama instansi/mitra wajib diisi.');
            return;
        }
        if (!formData.image.trim()) {
            toast.error('Gambar logo wajib dipilih atau diunggah.');
            return;
        }

        if (editingIndex !== null) {
            // Update
            const next = [...logos];
            next[editingIndex] = { ...formData };
            setLogos(next);
            toast.success(`Logo '${formData.name}' berhasil diperbarui.`);
        } else {
            // Tambah baru
            setLogos([...logos, { ...formData, id: String(Date.now()) }]);
            toast.success(`Logo '${formData.name}' ditambahkan ke daftar.`);
        }

        setIsModalOpen(false);
    };

    // Simpan seluruh daftar ke server
    const handleSaveAllToServer = () => {
        setIsSaving(true);
        router.post(
            route('settings.slider-logos.save'),
            { logos: logos as any },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Pengaturan slide logo beranda berhasil disimpan!');
                },
                onError: (err) => {
                    toast.error('Gagal menyimpan: ' + (Object.values(err)[0] || 'Periksa kembali data form.'));
                },
                onFinish: () => setIsSaving(false),
            }
        );
    };

    return (
        <div className="space-y-6">
            {/* Header Kontrol */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Kelola Slide Logo Mitra &amp; Ekosistem</span>
                        <Badge variant="secondary" className="font-mono text-xs font-semibold">
                            {logos.length} Logo
                        </Badge>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Logo-logo ini tampil secara bergulir otomatis (marquee) tepat di bawah headline beranda publik.
                    </p>
                </div>

                {canManage && (
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAddNew}
                            className="gap-1.5 text-xs font-semibold"
                        >
                            <Plus className="w-4 h-4 text-primary" />
                            <span>Tambah Logo Baru</span>
                        </Button>

                        <Button
                            type="button"
                            size="sm"
                            onClick={handleSaveAllToServer}
                            disabled={isSaving}
                            className="gap-1.5 text-xs font-semibold bg-[#FFB800] hover:bg-amber-500 text-slate-950 font-bold shadow"
                        >
                            {isSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            <span>Simpan Slide Logo</span>
                        </Button>
                    </div>
                )}
            </div>

            {/* List / Grid Kartu Logo */}
            {logos.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40">
                    <Image className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Belum ada logo pada slide beranda
                    </p>
                    <p className="text-xs text-slate-400 max-w-sm mt-1">
                        Klik tombol Tambah Logo Baru untuk memasukkan logo instansi pemerintah, mitra, atau portal layanan terkait.
                    </p>
                    {canManage && (
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleAddNew}
                            className="mt-4 gap-1.5 text-xs font-semibold"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Tambah Logo Pertama</span>
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {logos.map((item, index) => (
                        <div
                            key={item.id || index}
                            className={`group relative flex flex-col justify-between rounded-xl border p-3.5 transition-all bg-white dark:bg-slate-900 shadow-xs ${
                                item.active
                                    ? 'border-slate-200 dark:border-slate-800 hover:border-amber-400 hover:shadow-md'
                                    : 'border-dashed border-slate-300 dark:border-slate-700 opacity-60 bg-slate-50/50'
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                {/* Preview Gambar Logo */}
                                <div className="h-14 w-20 shrink-0 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 flex items-center justify-center overflow-hidden">
                                    <img
                                        src={item.image}
                                        alt={item.name}
                                        className="h-full w-full object-contain filter drop-shadow-xs"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = '/logo.webp';
                                        }}
                                    />
                                </div>

                                {/* Informasi & URL */}
                                <div className="min-w-0 flex-1 space-y-1">
                                    <div className="flex items-center justify-between gap-1">
                                        <span className="font-semibold text-xs text-slate-900 dark:text-white truncate block" title={item.name}>
                                            {item.name}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleToggleActive(index)}
                                            title={item.active ? 'Nonaktifkan' : 'Aktifkan'}
                                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                        >
                                            {item.active ? (
                                                <Eye className="w-3.5 h-3.5 text-emerald-500" />
                                            ) : (
                                                <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                                            )}
                                        </button>
                                    </div>

                                    {item.url ? (
                                        <a
                                            href={item.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-[11px] font-mono text-primary hover:underline truncate max-w-full"
                                            title={item.url}
                                        >
                                            <LinkIcon className="w-3 h-3 shrink-0" />
                                            <span className="truncate">{item.url}</span>
                                            <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-60" />
                                        </a>
                                    ) : (
                                        <span className="text-[11px] text-slate-400 italic block">
                                            Tanpa tautan link
                                        </span>
                                    )}

                                    <div className="pt-0.5">
                                        <span className="text-[10px] font-mono text-slate-400">
                                            Urutan #{index + 1}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Tombol Aksi Item */}
                            {canManage && (
                                <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            disabled={index === 0}
                                            onClick={() => handleMove(index, 'up')}
                                            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
                                            title="Geser Naik"
                                        >
                                            <ArrowUp className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            disabled={index === logos.length - 1}
                                            onClick={() => handleMove(index, 'down')}
                                            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
                                            title="Geser Turun"
                                        >
                                            <ArrowDown className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleEdit(index)}
                                            className="h-7 px-2 text-xs gap-1 text-slate-600 dark:text-slate-300"
                                        >
                                            <Edit3 className="w-3.5 h-3.5" />
                                            <span>Edit</span>
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(index)}
                                            className="h-7 px-2 text-xs gap-1 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            <span>Hapus</span>
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Live Interactive Preview Box */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-white space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono tracking-wider text-amber-300 uppercase flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-[#FFB800]" />
                        <span>Pratinjau Langsung Efek Animasi &amp; Hover Slide</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                        Arahkan kursor atau klik logo di bawah untuk menguji efek
                    </span>
                </div>

                <div className="relative overflow-hidden rounded-lg bg-[#00182b] border border-amber-500/20 py-4 px-2">
                    <div className="flex items-center justify-start sm:justify-center gap-8 overflow-x-auto no-scrollbar scroll-smooth p-2">
                        {logos.filter((l) => l.active).map((item, idx) => (
                            <a
                                key={`preview-${idx}`}
                                href={item.url || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => {
                                    if (!item.url) e.preventDefault();
                                }}
                                className="group/prev shrink-0 flex items-center justify-center p-2 h-14 w-32 bg-transparent transition-transform duration-300 hover:scale-115 active:scale-95 cursor-pointer"
                                title={`Buka ${item.name} di tab baru`}
                            >
                                <img
                                    src={item.image}
                                    alt={item.name}
                                    className="max-h-11 max-w-full object-contain filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] transition-transform duration-300 group-hover/prev:scale-110"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = '/logo.webp';
                                    }}
                                />
                            </a>
                        ))}
                    </div>
                </div>
            </div>

            {/* Modal Dialog Form Tambah / Edit */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Image className="w-4 h-4 text-primary" />
                                <span>{editingIndex !== null ? 'Edit Logo Slide' : 'Tambah Logo Slide Baru'}</span>
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSaveFormModal} className="space-y-4">
                            {/* Nama Instansi */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Nama Instansi / Mitra / Layanan <span className="text-rose-500">*</span>
                                </label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Contoh: Kementerian PUPR RI"
                                    required
                                    className="text-xs"
                                />
                            </div>

                            {/* Tautan / URL Link */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Tautan / Link Tujuan (Opsional)
                                </label>
                                <Input
                                    value={formData.url || ''}
                                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                    placeholder="Contoh: https://pu.go.id atau /laporan/pohon-kinerja"
                                    className="text-xs font-mono"
                                />
                                <p className="text-[11px] text-slate-400 mt-1">
                                    Jika diisi, pengunjung yang mengklik logo ini akan diarahkan ke tautan tersebut.
                                </p>
                            </div>

                            {/* Upload / URL Gambar Logo */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    File Gambar Logo <span className="text-rose-500">*</span>
                                </label>

                                <div className="flex items-center gap-3">
                                    {/* Preview Kotak */}
                                    <div className="h-16 w-24 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 p-1 flex items-center justify-center overflow-hidden">
                                        {formData.image ? (
                                            <img
                                                src={formData.image}
                                                alt="Preview"
                                                className="h-full w-full object-contain"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = '/logo.webp';
                                                }}
                                            />
                                        ) : (
                                            <Image className="w-6 h-6 text-slate-300" />
                                        )}
                                    </div>

                                    <div className="flex-1 space-y-1.5">
                                        <div className="flex items-center gap-2">
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/png,image/webp,image/svg+xml,image/jpeg"
                                                onChange={handleFileUpload}
                                                className="hidden"
                                                id="upload-slider-file"
                                                disabled={isUploading}
                                            />
                                            <label
                                                htmlFor="upload-slider-file"
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 cursor-pointer shadow-2xs transition"
                                            >
                                                {isUploading ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                ) : (
                                                    <UploadCloud className="w-3.5 h-3.5 text-primary" />
                                                )}
                                                <span>{isUploading ? 'Mengunggah...' : 'Unggah File Gambar'}</span>
                                            </label>
                                        </div>
                                        <Input
                                            value={formData.image}
                                            onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                                            placeholder="Atau ketik path / URL gambar..."
                                            className="text-[11px] font-mono h-8"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Checkbox Status Aktif */}
                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="logo-active"
                                    checked={formData.active}
                                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                                />
                                <label htmlFor="logo-active" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                                    Tampilkan logo ini pada slider beranda
                                </label>
                            </div>

                            {/* Tombol Simpan Form Modal */}
                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsModalOpen(false)}
                                    className="text-xs"
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    size="sm"
                                    className="text-xs font-semibold bg-primary text-primary-foreground"
                                >
                                    {editingIndex !== null ? 'Simpan Perubahan' : 'Tambahkan ke Daftar'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
