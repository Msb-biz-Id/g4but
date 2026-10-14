import { useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Palette, RotateCcw, Save, Monitor, Moon, Sun, Check } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/Components/ui/sheet';
import { Label } from '@/Components/ui/label';
import { Separator } from '@/Components/ui/separator';
import { cn } from '@/lib/utils';
import { previewTheme, storeTheme, getStoredTheme, type ThemePreference } from '@/lib/theme';
import type { PageProps, ThemeConfig } from '@/types';

// ─── Presets ─────────────────────────────────────────────────────────────────

interface ColorPreset {
    id: string;
    label: string;
    hsl: string;
    hslDark: string;
    tw: string; // Tailwind/inline color for swatch
}

const COLOR_PRESETS: ColorPreset[] = [
    { id: 'indigo',  label: 'Indigo',   hsl: '243 75% 59%', hslDark: '243 75% 70%', tw: '#6366f1' },
    { id: 'blue',    label: 'Biru',     hsl: '217 91% 60%', hslDark: '217 91% 70%', tw: '#3b82f6' },
    { id: 'green',   label: 'Hijau',    hsl: '142 71% 45%', hslDark: '142 71% 55%', tw: '#22c55e' },
    { id: 'rose',    label: 'Merah',    hsl: '347 77% 60%', hslDark: '347 77% 70%', tw: '#f43f5e' },
    { id: 'orange',  label: 'Oranye',   hsl: '25 95% 53%',  hslDark: '25 95% 63%',  tw: '#f97316' },
    { id: 'purple',  label: 'Ungu',     hsl: '262 83% 58%', hslDark: '262 83% 68%', tw: '#a855f7' },
    { id: 'teal',    label: 'Teal',     hsl: '180 70% 40%', hslDark: '180 70% 55%', tw: '#14b8a6' },
    { id: 'slate',   label: 'Abu-abu',  hsl: '215 25% 40%', hslDark: '215 25% 55%', tw: '#64748b' },
];

const RADIUS_OPTIONS = [
    { value: '0',    label: 'Tajam' },
    { value: '0.25', label: 'Sedikit' },
    { value: '0.5',  label: 'Normal' },
    { value: '0.75', label: 'Bulat' },
    { value: '1',    label: 'Penuh' },
];

const FONT_HEADING_OPTIONS = ['Inter', 'Poppins', 'Plus Jakarta Sans'];
const FONT_BODY_OPTIONS    = ['Inter', 'DM Sans', 'Nunito'];

const DARK_OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
    { value: 'light',  label: 'Terang', icon: Sun },
    { value: 'dark',   label: 'Gelap',  icon: Moon },
    { value: 'system', label: 'Sistem', icon: Monitor },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ThemePanel() {
    const { theme, auth } = usePage<PageProps>().props;

    // Hanya Super Admin yang boleh mengubah tema
    const isSuperAdmin = Array.isArray(auth?.user?.roles)
        ? auth.user.roles.some((r: { name?: string } | string) =>
              typeof r === 'string' ? r === 'Super Admin' : r?.name === 'Super Admin'
          )
        : false;

    if (!auth?.user || !isSuperAdmin) return null;

    // Local state (preview)
    const [preset, setPreset]           = useState(theme.preset);
    const [primaryHsl, setPrimaryHsl]   = useState(theme.primaryHsl);
    const [primaryHslDark, setPHD]      = useState(theme.primaryHslDark);
    const [radius, setRadius]           = useState(theme.radius);
    const [fontHeading, setFontHeading] = useState(theme.fontHeading);
    const [fontBody, setFontBody]       = useState(theme.fontBody);
    const [darkMode, setDarkMode]       = useState<ThemePreference>(() => getStoredTheme());
    const [saving, setSaving]           = useState(false);
    const [open, setOpen]               = useState(false);

    // Sync state if server theme changes
    useEffect(() => {
        setPreset(theme.preset);
        setPrimaryHsl(theme.primaryHsl);
        setPHD(theme.primaryHslDark);
        setRadius(theme.radius);
        setFontHeading(theme.fontHeading);
        setFontBody(theme.fontBody);
    }, [theme]);

    const selectPreset = (p: ColorPreset) => {
        setPreset(p.id);
        setPrimaryHsl(p.hsl);
        setPHD(p.hslDark);
        previewTheme({ primaryHsl: p.hsl, primaryHslDark: p.hslDark });
    };

    const handleRadius = (val: string) => {
        setRadius(val);
        previewTheme({ radius: val });
    };

    const handleHeadingFont = (f: string) => {
        setFontHeading(f);
        previewTheme({ fontHeading: f });
    };

    const handleBodyFont = (f: string) => {
        setFontBody(f);
        previewTheme({ fontBody: f });
    };

    const handleSave = () => {
        setSaving(true);
        router.post(
            route('theme.update'),
            { preset, primary_hsl: primaryHsl, radius, font_heading: fontHeading, font_body: fontBody },
            {
                preserveScroll: true,
                onFinish: () => setSaving(false),
            }
        );
    };

    const handleReset = () => {
        router.post(route('theme.reset'), {}, { preserveScroll: true });
    };

    const handleDarkMode = (val: ThemePreference) => {
        setDarkMode(val);
        storeTheme(val);
        previewTheme({ primaryHsl, primaryHslDark });
    };

    const currentPreset = COLOR_PRESETS.find((p) => p.id === preset);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    aria-label="Panel Tema"
                    title="Pengaturan Tema"
                >
                    <Palette className="h-4 w-4" />
                </Button>
            </SheetTrigger>

            <SheetContent side="right" className="flex w-80 flex-col gap-0 overflow-y-auto p-0 sm:w-96">
                <SheetHeader className="border-b px-5 py-4">
                    <SheetTitle className="flex items-center gap-2 text-base">
                        <Palette className="h-4 w-4 text-primary" />
                        Panel Tema
                    </SheetTitle>
                </SheetHeader>

                <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">

                    {/* ── Mode Gelap/Terang ── */}
                    <section>
                        <Label className="mb-2.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Mode Tampilan
                        </Label>
                        <div className="grid grid-cols-3 gap-1.5">
                            {DARK_OPTIONS.map((opt) => {
                                const Icon = opt.icon;
                                return (
                                    <button
                                        key={opt.value}
                                        onClick={() => handleDarkMode(opt.value)}
                                        className={cn(
                                            'flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-medium transition-all',
                                            darkMode === opt.value
                                                ? 'border-primary bg-primary/10 text-primary'
                                                : 'border-border hover:border-primary/50 hover:bg-muted'
                                        )}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {opt.label}
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    <Separator />

                    {/* ── Warna Primer ── */}
                    <section>
                        <Label className="mb-2.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Warna Utama
                        </Label>
                        <div className="grid grid-cols-4 gap-2">
                            {COLOR_PRESETS.map((p) => (
                                <button
                                    key={p.id}
                                    onClick={() => selectPreset(p)}
                                    title={p.label}
                                    className={cn(
                                        'group relative flex h-12 w-full flex-col items-center justify-center gap-1 rounded-lg border-2 transition-all',
                                        preset === p.id
                                            ? 'border-foreground shadow-md'
                                            : 'border-transparent hover:border-foreground/30'
                                    )}
                                    style={{ backgroundColor: p.tw }}
                                >
                                    {preset === p.id && (
                                        <Check className="h-4 w-4 text-white drop-shadow" />
                                    )}
                                    <span className="text-[9px] font-semibold text-white/90 drop-shadow">
                                        {p.label}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Preview swatch */}
                        <div className="mt-3 flex items-center gap-3">
                            <div
                                className="h-8 w-8 rounded-full border-2 border-border shadow-sm"
                                style={{ backgroundColor: currentPreset?.tw ?? '#6366f1' }}
                            />
                            <div className="text-xs text-muted-foreground">
                                <div className="font-medium text-foreground">{currentPreset?.label ?? preset}</div>
                                <div className="font-mono">{primaryHsl}</div>
                            </div>
                        </div>
                    </section>

                    <Separator />

                    {/* ── Border Radius ── */}
                    <section>
                        <Label className="mb-2.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Sudut Tombol & Card
                        </Label>
                        <div className="grid grid-cols-5 gap-1.5">
                            {RADIUS_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => handleRadius(opt.value)}
                                    className={cn(
                                        'flex flex-col items-center gap-1.5 border p-2 text-[10px] font-medium transition-all',
                                        radius === opt.value
                                            ? 'border-primary bg-primary/10 text-primary'
                                            : 'border-border hover:border-primary/40 hover:bg-muted'
                                    )}
                                    style={{ borderRadius: `${opt.value}rem` }}
                                >
                                    <div
                                        className="h-6 w-6 border-2"
                                        style={{
                                            borderRadius: `${opt.value}rem`,
                                            borderColor: radius === opt.value ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                                        }}
                                    />
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </section>

                    <Separator />

                    {/* ── Tipografi ── */}
                    <section>
                        <Label className="mb-2.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Tipografi - Judul
                        </Label>
                        <div className="space-y-1.5">
                            {FONT_HEADING_OPTIONS.map((f) => (
                                <button
                                    key={f}
                                    onClick={() => handleHeadingFont(f)}
                                    className={cn(
                                        'flex w-full items-center justify-between rounded-lg border px-4 py-2.5 text-sm transition-all',
                                        fontHeading === f
                                            ? 'border-primary bg-primary/10 text-primary'
                                            : 'border-border hover:border-primary/40 hover:bg-muted'
                                    )}
                                    style={{ fontFamily: `"${f}", sans-serif` }}
                                >
                                    <span>{f}</span>
                                    {fontHeading === f && <Check className="h-3.5 w-3.5" />}
                                </button>
                            ))}
                        </div>

                        <Label className="mb-2.5 mt-4 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Tipografi - Konten
                        </Label>
                        <div className="space-y-1.5">
                            {FONT_BODY_OPTIONS.map((f) => (
                                <button
                                    key={f}
                                    onClick={() => handleBodyFont(f)}
                                    className={cn(
                                        'flex w-full items-center justify-between rounded-lg border px-4 py-2.5 text-sm transition-all',
                                        fontBody === f
                                            ? 'border-primary bg-primary/10 text-primary'
                                            : 'border-border hover:border-primary/40 hover:bg-muted'
                                    )}
                                    style={{ fontFamily: `"${f}", sans-serif` }}
                                >
                                    <span>{f}</span>
                                    {fontBody === f && <Check className="h-3.5 w-3.5" />}
                                </button>
                            ))}
                        </div>
                    </section>
                </div>

                {/* ── Footer Actions ── */}
                <div className="border-t px-5 py-4">
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={handleReset}
                            disabled={saving}
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Reset
                        </Button>
                        <Button
                            size="sm"
                            className="flex-1 gap-1.5"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            <Save className="h-3.5 w-3.5" />
                            {saving ? 'Menyimpan…' : 'Simpan Tema'}
                        </Button>
                    </div>
                    <p className="mt-2 text-center text-[10px] text-muted-foreground">
                        Perubahan disimpan ke database dan berlaku global
                    </p>
                </div>
            </SheetContent>
        </Sheet>
    );
}
