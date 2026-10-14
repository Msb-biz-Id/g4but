import { useRef, useState, useEffect, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Separator } from '@/Components/ui/separator';
import {
    Save, RotateCcw, Lock, Eye, EyeOff,
    Sparkles, Shield, Upload, Building2, Palette,
    Bell, Image, ImagePlus, Loader2, CheckCircle2,
    Sliders, AlertCircle
} from 'lucide-react';
import { PageProps } from '@/types';
import { toast } from 'sonner';
import ConfirmDialog from '@/Components/ConfirmDialog';
import { Select2 } from '@/Components/ui/select2';
import PageHeader from '@/Components/Dashboard/PageHeader';

interface AppConfig {
    id: number;
    key: string;
    label?: string;
    value: string | boolean | number | null;
    type: 'boolean' | 'integer' | 'string' | 'json' | 'secret';
    group: string;
    description?: string;
    default_value?: string;
    is_secret: boolean;
}

interface SettingsIndexProps extends PageProps {
    configs: AppConfig[];
    canManage: boolean;
    groups: string[];
}

// ── Tab definitions ────────────────────────────────────────────────────────
const TABS = [
    {
        key: 'umum',
        label: 'Identitas & Umum',
        icon: Building2,
        groups: ['general'],
        description: 'Nama aplikasi resmi, email kontak admin, tahun anggaran aktif, zona waktu, dan mode pemeliharaan.',
    },
    {
        key: 'ui',
        label: 'Tampilan & Tema',
        icon: Palette,
        groups: ['ui', 'theme'],
        description: 'Kustomisasi gambar banner headline, background login, serta preferensi warna tema dan font.',
    },
    {
        key: 'keamanan',
        label: 'Keamanan & Sesi',
        icon: Shield,
        groups: ['security'],
        description: 'Proteksi akses, durasi sesi login, batas percobaan gagal, dan kebijakan autentikasi pengguna.',
    },
    {
        key: 'ai',
        label: 'AI Performance',
        icon: Sparkles,
        groups: ['ai'],
        description: 'Konfigurasi provider AI, model bahasa cerdas, batas kuota token, dan analisis kinerja otomatis.',
    },
    {
        key: 'integrasi',
        label: 'Notifikasi & Gateway',
        icon: Bell,
        groups: ['notification', 'whatsapp', 'ews'],
        description: 'Koneksi pengiriman notifikasi email, WhatsApp gateway resmi, dan ambang batas Early Warning System (EWS).',
    },
    {
        key: 'upload',
        label: 'Unggahan & Berkas',
        icon: Upload,
        groups: ['upload'],
        description: 'Aturan batas ukuran file dan format dokumen yang diizinkan untuk diunggah ke sistem.',
    },
];

const GROUP_LABELS: Record<string, { title: string; desc: string }> = {
    general: {
        title: 'Identitas Aplikasi & Pemerintah Daerah',
        desc: 'Informasi umum mengenai identitas sistem, pemerintah daerah, dan parameter operasional.',
    },
    ui: {
        title: 'Gambar Headline & Background Login',
        desc: 'Aset visual untuk halaman depan (landing page) dan halaman masuk pengguna.',
    },
    theme: {
        title: 'Tema Warna & Tipografi',
        desc: 'Palet warna utama, mode gelap, border radius, dan jenis font antarmuka sistem.',
    },
    security: {
        title: 'Keamanan & Proteksi Akun',
        desc: 'Kebijakan keamanan akun, durasi sesi aktif, dan perlindungan brute force.',
    },
    ai: {
        title: 'AI Performance Intelligence Engine',
        desc: 'Pengaturan koneksi API ke model kecerdasan buatan untuk modul analitik dan asisten.',
    },
    notification: {
        title: 'Notifikasi Email & Sistem',
        desc: 'Pengaturan saluran email pemberitahuan otomatis kepada pengguna dan OPD.',
    },
    whatsapp: {
        title: 'Integrasi WhatsApp Gateway',
        desc: 'Konfigurasi integrasi WhatsApp Bot dan pengiriman pesan notifikasi via nomor resmi.',
    },
    ews: {
        title: 'Early Warning System (EWS)',
        desc: 'Ambang batas nilai peringatan dan risiko keterlambatan penginputan kinerja.',
    },
    upload: {
        title: 'Batas Berkas Unggahan Dokumen',
        desc: 'Kebijakan ukuran file maksimal dan jenis ekstensi dokumen yang diperbolehkan.',
    },
};

const TYPE_LABELS: Record<string, string> = {
    boolean: 'Ya/Tidak',
    integer: 'Angka',
    string: 'Teks',
    json: 'JSON',
    secret: 'Kunci Rahasia',
};

// Preset dropdown options
const PRESET_OPTIONS: Record<string, { label: string; value: string }[]> = {
    'theme.preset': [
        { label: 'Indigo (Default)', value: 'indigo' },
        { label: 'Blue (Biru)', value: 'blue' },
        { label: 'Violet (Ungu)', value: 'violet' },
        { label: 'Emerald (Hijau)', value: 'emerald' },
        { label: 'Rose (Merah Muda)', value: 'rose' },
        { label: 'Amber (Oranye)', value: 'amber' },
        { label: 'Slate (Netral)', value: 'slate' },
    ],
    'ai.provider': [
        { label: 'OpenAI (ChatGPT)', value: 'openai' },
        { label: 'OpenRouter (Multi-Model)', value: 'openrouter' },
        { label: 'Google Gemini', value: 'gemini' },
        { label: 'Mock (Simulasi Lokal)', value: 'mock' },
    ],
    'app.timezone': [
        { label: 'Asia/Jayapura (WIT)', value: 'Asia/Jayapura' },
        { label: 'Asia/Makassar (WITA)', value: 'Asia/Makassar' },
        { label: 'Asia/Jakarta (WIB)', value: 'Asia/Jakarta' },
    ],
};

// Kunci yang perlu widget upload file
const ASSET_KEYS: Record<string, { label: string; accept: string; hint: string }> = {
    app_logo: {
        label: 'Logo Aplikasi',
        accept: 'image/webp,image/png,image/svg+xml,image/jpeg',
        hint: 'WebP/PNG/SVG, rekomendasi 128×128px',
    },
    app_favicon: {
        label: 'Favicon',
        accept: 'image/x-icon,image/png,image/svg+xml',
        hint: 'ICO/PNG/SVG, rekomendasi 32×32px',
    },
    ui_headline_image: {
        label: 'Gambar Headline',
        accept: 'image/webp,image/jpeg,image/png',
        hint: 'WebP/JPG/PNG, rekomendasi 1280×720px (16:9)',
    },
    ui_login_image: {
        label: 'Gambar Background Login',
        accept: 'image/webp,image/jpeg,image/png',
        hint: 'WebP/JPG/PNG, rekomendasi 1920×1080px',
    },
};

// ── ImageUploadField ───────────────────────────────────────────────────────
function ImageUploadField({
    config,
    canManage,
}: {
    config: AppConfig;
    canManage: boolean;
}) {
    const meta = ASSET_KEYS[config.key];
    const fileRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    const currentUrl = (config.value as string) || meta?.hint || '';
    const displayUrl = currentUrl.split('?')[0]; // untuk display teks saja
    const imageUrl = currentUrl; // gunakan URL lengkap (dengan ?v=...) agar browser tidak cache

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setPreview(URL.createObjectURL(f));
    };

    const handleUpload = () => {
        const f = fileRef.current?.files?.[0];
        if (!f) return;
        setUploading(true);
        const fd = new FormData();
        fd.append('asset_key', config.key);
        fd.append('file', f);
        router.post(route('settings.upload-asset'), fd as any, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                toast.success(`${meta.label} berhasil diunggah!`);
                setPreview(null);
                if (fileRef.current) fileRef.current.value = '';
            },
            onError: (e) => toast.error(Object.values(e)[0] as string),
            onFinish: () => setUploading(false),
        });
    };

    return (
        <div className="flex flex-col sm:flex-row sm:items-start gap-4 py-2">
            <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">{config.label || meta.label}</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        <Image className="w-2.5 h-2.5 mr-1" />
                        Aset Gambar
                    </Badge>
                </div>
                {config.description && (
                    <p className="text-xs text-muted-foreground">{config.description}</p>
                )}
                <p className="text-[11px] text-muted-foreground/70 font-mono">{displayUrl}</p>
            </div>

            <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
                {(preview || imageUrl) && (
                    <div className="h-20 w-36 rounded-lg border border-dashed border-border overflow-hidden bg-muted flex items-center justify-center shadow-2xs">
                        <img
                            src={preview || imageUrl}
                            alt={meta.label}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                        />
                    </div>
                )}

                {canManage && (
                    <div className="flex items-center gap-1.5">
                        <label className="cursor-pointer">
                            <input
                                ref={fileRef}
                                type="file"
                                accept={meta.accept}
                                className="hidden"
                                onChange={handleFile}
                                disabled={uploading}
                            />
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground transition cursor-pointer shadow-2xs">
                                <ImagePlus className="w-3.5 h-3.5" />
                                Pilih Berkas
                            </span>
                        </label>
                        {fileRef.current?.files?.[0] || preview ? (
                            <Button size="sm" onClick={handleUpload} disabled={uploading} className="h-8 text-xs">
                                <Upload className="w-3.5 h-3.5 mr-1" />
                                {uploading ? 'Mengunggah...' : 'Upload'}
                            </Button>
                        ) : null}
                    </div>
                )}
                <p className="text-[10px] text-muted-foreground">{meta.hint}</p>
            </div>
        </div>
    );
}

// ── Unified Config Field Row ───────────────────────────────────────────────
function ConfigFieldRow({
    config,
    value,
    onChange,
    onReset,
    canManage,
}: {
    config: AppConfig;
    value: string | boolean | number;
    onChange: (val: string | boolean | number) => void;
    onReset: () => void;
    canManage: boolean;
}) {
    const [showSecret, setShowSecret] = useState(false);
    const isBoolean = config.type === 'boolean';
    const isOn = isBoolean && (value === true || value === '1' || value === 1);
    const hasPreset = config.key in PRESET_OPTIONS;

    // Check if modified from original database value
    const isDirty = useMemo(() => {
        if (isBoolean) {
            const orig = config.value === true || config.value === '1' || config.value === 1;
            return isOn !== orig;
        }
        return String(value ?? '') !== String(config.value ?? '');
    }, [value, config.value, isBoolean, isOn]);

    return (
        <div className={`flex flex-col sm:flex-row sm:items-start justify-between gap-4 py-2.5 rounded-lg transition-colors ${
            isDirty ? 'bg-primary/5 px-3 -mx-3 border-l-2 border-primary' : ''
        }`}>
            <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">{config.label || config.key}</span>
                    <code className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {config.key}
                    </code>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {TYPE_LABELS[config.type] || config.type}
                    </Badge>
                    {config.is_secret && (
                        <Badge variant="destructive" className="flex items-center gap-1 text-[10px] px-1.5 py-0">
                            <Lock className="w-2.5 h-2.5" />
                            Rahasia
                        </Badge>
                    )}
                    {isDirty && (
                        <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] px-1.5 py-0">
                            Diubah
                        </Badge>
                    )}
                </div>
                {config.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed">{config.description}</p>
                )}
                {config.default_value && (
                    <p className="text-[11px] text-muted-foreground/70">
                        Default: <code className="bg-muted px-1 rounded">{config.default_value}</code>
                    </p>
                )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 shrink-0">
                {isBoolean ? (
                    <button
                        type="button"
                        disabled={!canManage}
                        onClick={() => onChange(!isOn)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                            isOn ? 'bg-primary' : 'bg-muted'
                        }`}
                    >
                        <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
                                isOn ? 'translate-x-5' : 'translate-x-0'
                            }`}
                        />
                    </button>
                ) : hasPreset ? (
                    <div className="w-52 sm:w-64">
                        <Select2
                            value={String(value)}
                            disabled={!canManage}
                            onChange={(val) => onChange(val)}
                            options={PRESET_OPTIONS[config.key].map((opt) => ({
                                value: opt.value,
                                label: opt.label,
                            }))}
                            placeholder="Pilih Konfigurasi"
                        />
                    </div>
                ) : (
                    <div className="relative">
                        <Input
                            type={config.is_secret && !showSecret ? 'password' : (config.type === 'integer' ? 'number' : 'text')}
                            value={String(value ?? '')}
                            disabled={!canManage}
                            onChange={(e) => onChange(e.target.value)}
                            className={`h-8 text-sm w-48 sm:w-64 ${config.is_secret ? 'pr-8' : ''} ${
                                isDirty ? 'border-primary ring-1 ring-primary/30' : ''
                            }`}
                        />
                        {config.is_secret && (
                            <button
                                type="button"
                                onClick={() => setShowSecret((p) => !p)}
                                tabIndex={-1}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        )}
                    </div>
                )}

                {canManage && (
                    <Button
                        variant="ghost"
                        size="sm"
                        title="Kembalikan ke nilai default"
                        onClick={onReset}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </Button>
                )}
            </div>
        </div>
    );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function SettingsIndex({ configs, canManage }: SettingsIndexProps) {
    const [activeTab, setActiveTab] = useState('umum');
    const [formValues, setFormValues] = useState<Record<number, string | boolean | number>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [resetTargetConfig, setResetTargetConfig] = useState<AppConfig | null>(null);

    // Initialize & sync local state from server props
    useEffect(() => {
        const initial: Record<number, string | boolean | number> = {};
        configs.forEach((c) => {
            initial[c.id] = c.value ?? '';
        });
        setFormValues(initial);
    }, [configs]);

    const normalizeGroup = (g: string) => {
        const lower = (g || '').toLowerCase().trim();
        if (lower === 'early warning' || lower === 'early_warning') return 'ews';
        if (lower === 'notifikasi') return 'notification';
        if (lower === 'whatsapp') return 'whatsapp';
        return lower;
    };

    const currentTab = TABS.find((t) => t.key === activeTab) ?? TABS[0];
    const targetGroups = currentTab.groups.map(normalizeGroup);
    const tabConfigs = configs.filter((c) => targetGroups.includes(normalizeGroup(c.group)));
    const tabGroups = Array.from(new Set(tabConfigs.map((c) => normalizeGroup(c.group))));

    // Calculate unsaved changes count on active tab
    const dirtyCount = useMemo(() => {
        let count = 0;
        tabConfigs.forEach((c) => {
            if (c.key in ASSET_KEYS) return;
            const current = formValues[c.id];
            if (c.type === 'boolean') {
                const bVal = current === true || current === '1' || current === 1;
                const bOrig = c.value === true || c.value === '1' || c.value === 1;
                if (bVal !== bOrig) count++;
            } else {
                if (String(current ?? '') !== String(c.value ?? '')) count++;
            }
        });
        return count;
    }, [tabConfigs, formValues]);

    // Handle single field change
    const handleFieldChange = (configId: number, val: string | boolean | number) => {
        setFormValues((prev) => ({
            ...prev,
            [configId]: val,
        }));
    };

    // Revert active tab edits
    const handleDiscardTabChanges = () => {
        setFormValues((prev) => {
            const next = { ...prev };
            tabConfigs.forEach((c) => {
                next[c.id] = c.value ?? '';
            });
            return next;
        });
        toast.info('Perubahan pada tab ini dibatalkan.');
    };

    // Unified save all settings in active tab
    const handleSaveTab = () => {
        setIsSaving(true);
        const payload: Record<number, string | boolean | number> = {};
        tabConfigs.forEach((c) => {
            if (!(c.key in ASSET_KEYS)) {
                payload[c.id] = formValues[c.id] ?? '';
            }
        });

        router.post(
            route('settings.batch'),
            { settings: payload },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(`Semua pengaturan '${currentTab.label}' berhasil disimpan!`);
                },
                onError: (e) => {
                    toast.error((Object.values(e)[0] as string) || 'Gagal menyimpan pengaturan.');
                },
                onFinish: () => setIsSaving(false),
            }
        );
    };

    // Single reset confirmation
    const confirmResetSingle = () => {
        if (!resetTargetConfig) return;
        router.post(
            route('settings.reset', resetTargetConfig.id),
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(`Pengaturan '${resetTargetConfig.label || resetTargetConfig.key}' dikembalikan ke default.`);
                    setResetTargetConfig(null);
                },
                onError: (e) => {
                    toast.error((Object.values(e)[0] as string) || 'Gagal mengembalikan pengaturan.');
                },
            }
        );
    };

    return (
        <AuthenticatedLayout header="Konfigurasi Sistem">
            <Head title="Konfigurasi Sistem" />

            <div className="space-y-6 max-w-7xl mx-auto pb-16">
                {/* ── Page Header ──────────────────────────────────────── */}
                <PageHeader
                    breadcrumbs={[
                        { label: 'Master Data & Pengaturan' },
                        { label: 'Pengaturan Sistem' },
                    ]}
                    title="Konfigurasi & Pengaturan Sistem"
                    description="Kelola parameter global aplikasi, keamanan, antarmuka visual, kuota AI, serta integrasi gateway."
                    actions={
                        canManage ? (
                            <div className="flex items-center gap-2">
                                {dirtyCount > 0 && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleDiscardTabChanges}
                                        disabled={isSaving}
                                        className="text-xs"
                                    >
                                        Batalkan ({dirtyCount})
                                    </Button>
                                )}
                                <Button
                                    size="sm"
                                    onClick={handleSaveTab}
                                    disabled={isSaving}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs shadow-xs"
                                >
                                    {isSaving ? (
                                        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                                    ) : (
                                        <Save className="w-4 h-4 mr-1.5" />
                                    )}
                                    {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan Tab Ini'}
                                </Button>
                            </div>
                        ) : undefined
                    }
                />

                {/* ── Tab Navigation Bar ───────────────────────────────── */}
                <div className="flex overflow-x-auto gap-1 rounded-xl border border-border bg-slate-100/70 dark:bg-slate-800/50 p-1.5 shadow-xs scrollbar-thin">
                    {TABS.map((tab) => {
                        const hasConfigs = configs.some((c) => tab.groups.includes(c.group));
                        if (!hasConfigs) return null;
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
                                    isActive
                                        ? 'bg-white dark:bg-slate-900 text-primary dark:text-white shadow-xs border border-slate-200 dark:border-slate-800'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-foreground hover:bg-white/50 dark:hover:bg-slate-900/50'
                                }`}
                            >
                                <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-primary' : 'text-slate-400'}`} />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* ── Tab Content Description ──────────────────────────── */}
                <div className="px-1">
                    <p className="text-xs text-muted-foreground">
                        {currentTab.description}
                    </p>
                </div>

                {/* ── Group Cards (Unified Section) ────────────────────── */}
                {tabGroups.length === 0 ? (
                    <Card className="p-8 text-center text-sm text-muted-foreground">
                        Tidak ada konfigurasi yang ditemukan pada tab ini.
                    </Card>
                ) : (
                    <div className="space-y-6">
                        {tabGroups.map((group) => {
                            const groupMeta = GROUP_LABELS[group] || { title: group.toUpperCase(), desc: '' };
                            const rawConfigs = tabConfigs.filter((c) => normalizeGroup(c.group) === group);
                            if (rawConfigs.length === 0) return null;

                            const AI_ORDER: Record<string, number> = {
                                'ai.provider': 1,
                                'ai.api_key': 2,
                                'ai.base_url': 3,
                                'ai.model': 4,
                                'ai.timeout': 5,
                                'ai.daily_quota': 6,
                                'ai.max_tokens': 7,
                                'ai.enabled': 8,
                            };

                            const groupConfigs = group === 'ai'
                                ? [...rawConfigs].sort((a, b) => (AI_ORDER[a.key] || 99) - (AI_ORDER[b.key] || 99))
                                : rawConfigs;

                            return (
                                <Card key={group} className="border-slate-200 dark:border-slate-800 shadow-xs">
                                    <CardHeader className="p-5 pb-3">
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                            <div>
                                                <CardTitle className="text-base font-semibold text-foreground">
                                                    {groupMeta.title}
                                                </CardTitle>
                                                {groupMeta.desc && (
                                                    <CardDescription className="text-xs mt-0.5">
                                                        {groupMeta.desc}
                                                    </CardDescription>
                                                )}
                                            </div>
                                            <Badge variant="secondary" className="w-fit text-xs font-normal">
                                                {groupConfigs.length} Pengaturan
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-5 pt-1 space-y-3">
                                        {groupConfigs.map((cfg, idx) => (
                                            <div key={cfg.id}>
                                                {cfg.key in ASSET_KEYS ? (
                                                    <ImageUploadField config={cfg} canManage={canManage} />
                                                ) : (
                                                    <ConfigFieldRow
                                                        config={cfg}
                                                        value={formValues[cfg.id] ?? cfg.value ?? ''}
                                                        onChange={(val) => handleFieldChange(cfg.id, val)}
                                                        onReset={() => setResetTargetConfig(cfg)}
                                                        canManage={canManage}
                                                    />
                                                )}
                                                {idx < groupConfigs.length - 1 && <Separator className="my-2" />}
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}

                {/* ── Bottom Sticky Bar when Changes Exist ─────────────── */}
                {dirtyCount > 0 && canManage && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-4 border border-slate-700 animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex items-center gap-2 text-xs font-medium">
                            <AlertCircle className="w-4 h-4 text-amber-400" />
                            <span>Ada {dirtyCount} pengaturan yang belum disimpan di tab ini</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleDiscardTabChanges}
                                disabled={isSaving}
                                className="h-7 text-xs text-slate-300 hover:text-white hover:bg-slate-800 dark:text-slate-600 dark:hover:text-slate-900"
                            >
                                Batalkan
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleSaveTab}
                                disabled={isSaving}
                                className="h-7 text-xs bg-primary hover:bg-primary/90 text-white font-medium"
                            >
                                {isSaving ? (
                                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                                ) : (
                                    <Save className="w-3.5 h-3.5 mr-1" />
                                )}
                                {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Confirmation Dialog for Reset to Default */}
            <ConfirmDialog
                open={!!resetTargetConfig}
                onOpenChange={(open) => {
                    if (!open) setResetTargetConfig(null);
                }}
                title="Kembalikan ke Nilai Default?"
                description={`Apakah Anda yakin ingin mengembalikan pengaturan '${resetTargetConfig?.label || resetTargetConfig?.key}' ke nilai default?`}
                confirmText="Kembalikan Default"
                cancelText="Batal"
                variant="destructive"
                onConfirm={confirmResetSingle}
                onCancel={() => setResetTargetConfig(null)}
            />
        </AuthenticatedLayout>
    );
}
