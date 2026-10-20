import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/Components/ui/accordion';
import { Button } from '@/Components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import { Separator } from '@/Components/ui/separator';
import {
    Sheet,
    SheetContent,
    SheetTrigger,
} from '@/Components/ui/sheet';
import { cn } from '@/lib/utils';
import { Link, usePage } from '@inertiajs/react';
import { PropsWithChildren, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import ThemeToggle from '@/Components/ThemeToggle';
import ApplicationLogo from '@/Components/ApplicationLogo';
import ThemePanel from '@/Components/ThemePanel';
import ScrollToTop from '@/Components/ScrollToTop';
import { FlashToaster } from '@/Components/FlashToaster';
import FloatingChatWidget from '@/Components/Ai/FloatingChatWidget';
import { applyServerTheme } from '@/lib/theme';
import type { PageProps } from '@/types';
import NotificationDropdown from '@/Components/NotificationDropdown';

import {
    AlertTriangle,
    BarChart3,
    Bell,
    Bot,
    Building2,
    CalendarRange,
    ChevronDown,
    Database,
    FileText,
    Gauge,
    Goal,
    LayoutDashboard,
    LogOut,
    LucideIcon,
    Menu,
    MessageCircle,
    Network,
    NotebookPen,
    PanelLeftClose,
    PanelLeftOpen,
    Plug,
    Ruler,
    ScrollText,
    Settings,
    Shield,
    Rocket,
    Share2,
    ShieldAlert,
    Target,
    TrendingUp,
    TreePine,
    Activity,
    BookOpen,
    ClipboardList,
    Coins,
    ExternalLink,
    FileSpreadsheet,
    Globe,
    HelpCircle,
    Newspaper,
    Upload,
    Users,
    Video,
    Sparkles,
    Search,
} from 'lucide-react';

type SidebarItemProps = {
    href: string;
    icon: LucideIcon;
    label: string;
    active: boolean;
    mobile?: boolean;
    collapsed?: boolean;
    onClick?: () => void;
};

type SidebarGroupProps = {
    title: string;
    icon: LucideIcon;
    items: SidebarItemProps[];
    mobile?: boolean;
    collapsed?: boolean;
    onExpand?: (title: string) => void;
    onItemClick?: () => void;
    sectionHeading?: string;
};

function SidebarItem({
    href,
    icon: Icon,
    label,
    active,
    mobile,
    collapsed,
    onClick,
}: SidebarItemProps) {
    const handleClick = (e: React.MouseEvent<Element>) => {
        const nav = (e.currentTarget as HTMLElement).closest('nav');
        if (nav && typeof window !== 'undefined') {
            window.sessionStorage.setItem('ekasuari-sidebar-scroll', nav.scrollTop.toString());
        }
        if (onClick) onClick();
    };

    return (
        <Link
            href={href}
            onClick={handleClick}
            title={collapsed ? label : undefined}
            data-active={active ? 'true' : undefined}
            className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                collapsed && 'justify-center px-0 h-10 w-10 mx-auto',
                active
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80',
                mobile && 'text-sm min-h-[44px] py-2.5',
            )}
        >
            <Icon
                className={cn(
                    'h-4 w-4 shrink-0 transition-colors',
                    active ? 'text-primary-foreground' : 'text-slate-400 group-hover:text-white',
                )}
            />
            {!collapsed && <span className="truncate">{label}</span>}
        </Link>
    );
}

function SidebarGroup({
    title,
    icon: Icon,
    items,
    mobile,
    collapsed,
    onExpand,
    onItemClick,
}: SidebarGroupProps) {
    if (collapsed) {
        if (items.length === 1) {
            const [item] = items;
            return (
                <SidebarItem
                    href={item.href}
                    icon={item.icon}
                    label={item.label}
                    active={item.active}
                    collapsed
                    onClick={onItemClick}
                />
            );
        }

        return (
            <div className="flex justify-center">
                <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    title={title}
                    onClick={() => onExpand?.(title)}
                    className="h-10 w-10 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg"
                >
                    <Icon className="h-4 w-4 shrink-0" />
                </Button>
            </div>
        );
    }

    if (items.length === 1) {
        const [item] = items;
        return (
            <SidebarItem
                href={item.href}
                icon={item.icon}
                label={item.label}
                active={item.active}
                mobile={mobile}
                onClick={onItemClick}
            />
        );
    }

    return (
        <AccordionItem value={title} className="border-b-0">
            <AccordionTrigger className={cn(
                "gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800/80 hover:no-underline hover:text-white data-[state=open]:bg-slate-800/50 data-[state=open]:text-white",
                mobile && "min-h-[44px] py-2.5"
            )}>
                <span className="flex items-center gap-3">
                    <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="truncate">{title}</span>
                </span>
            </AccordionTrigger>
            <AccordionContent className="pb-0">
                <div className="mt-1 space-y-1 border-l border-slate-800/80 pl-3 ml-4">
                    {items.map((item) => (
                        <SidebarItem
                            key={item.href}
                            href={item.href}
                            icon={item.icon}
                            label={item.label}
                            active={item.active}
                            mobile={mobile}
                            onClick={onItemClick}
                        />
                    ))}
                </div>
            </AccordionContent>
        </AccordionItem>
    );
}

export default function Authenticated({
    header,
    noPadding = false,
    children,
}: PropsWithChildren<{ header?: ReactNode; noPadding?: boolean }>) {
    const { auth, appConfig } = usePage<PageProps>().props;
    const { url: currentUrl } = usePage();
    const user = auth?.user;
    const appName = appConfig?.appName || 'E-Sakip PUPR';

    const permissions = user?.permissions ?? [];
    const canViewUsers = permissions.includes('user:view');
    const canViewRoles = permissions.includes('role:view');
    const canViewOrganizations = permissions.includes('organization:view');
    const canViewIndicators = permissions.includes('indicator:view');
    const canViewUnits = permissions.includes('unit:view');
    const canViewPeriods = permissions.includes('planning_period:view');
    const canRunImports = permissions.includes('import:run');
    const canRunMigrations = permissions.includes('migration:run');
    const canViewGoals = permissions.includes('goal:view');
    const canViewTargets = permissions.includes('target:view');
    const canViewRealizations = permissions.includes('realization:view');
    const canViewReports = permissions.includes('report:view');
    const canViewEvaluations = permissions.includes('evaluation:view');
    const canViewAlerts = permissions.includes('alert:view');
    const canViewAlertRules = permissions.includes('alert_rule:view');
    const canViewNotifications = permissions.includes('notification:view');
    const canViewAnalytics = permissions.includes('dashboard:view');
    const canViewKnowledge = permissions.includes('knowledge:view');
    const canUseAi = permissions.includes('ai:use');
    const canManageAiTemplates = permissions.includes('config:manage');
    const canViewIntegrations = permissions.includes('integration:view');
    const canViewReadiness = permissions.includes('config:view');
    const canViewPlanning = permissions.includes('goal:view');       // fix: planning:view tdk ada di seeder, gate pakai goal:view
    const canViewAudit = permissions.includes('audit_log:view');      // fix: audit_log:view (bukan audit:view)
    const canViewWhatsapp = permissions.includes('integration:view'); // fix: pakai integration:view (whatsapp:view tdk ada di seeder)
    const canViewMonitoring = permissions.includes('planning:review'); // Monitoring OPD: eksklusif pengawas provinsi (planning:review)
    const canManageSettings = permissions.includes('config:manage');

    // ─── FLAG FASE MVP ─────────────────────────────────────────────────────────
    // true  = tampilkan hanya menu yang disepakati di meeting baseline client
    // false = tampilkan semua menu (aktifkan saat Phase 2 disetujui client)
    const MVP_PHASE_1 = false;

    const menuGroups = [
        // ─── 1. Beranda ────────────────────────────────────────────────────────
        {
            title: 'Beranda',
            icon: LayoutDashboard,
            items: [
                {
                    href: route('dashboard'),
                    label: 'Beranda',
                    icon: LayoutDashboard,
                    active: route().current('dashboard'),
                    show: true,
                },
            ],
        },
        {
            title: 'Ringkasan Kinerja',
            icon: BarChart3,
            items: [
                {
                    href: route('analytics.index'),
                    label: 'Ringkasan Kinerja',
                    icon: BarChart3,
                    active: route().current('analytics*'),
                    show: canViewAnalytics || true,
                },
            ],
        },

        // ─── 2. Master Data ───────────────────────────────────────────────────
        {
            title: 'Master Data',
            icon: Database,
            items: [
                {
                    href: route('organizations.index'),
                    label: 'Organisasi',
                    icon: Building2,
                    active: route().current('organizations*'),
                    show: canViewOrganizations,
                },

                {
                    href: route('periods.index'),
                    label: 'Periode',
                    icon: CalendarRange,
                    active: route().current('periods*'),
                    show: canViewPeriods,
                },
                {
                    href: route('imports.index'),
                    label: 'Import Data',
                    icon: Upload,
                    active: route().current('imports*'),
                    show: canRunImports,
                },
                {
                    href: route('migrations.index'),
                    label: 'Migrasi Data',
                    icon: Database,
                    active: route().current('migrations*'),
                    show: canRunMigrations,
                },
            ],
        },

        // ─── 3. Perencanaan Kinerja ───────────────────────────────────────────
        {
            title: 'Perencanaan Kinerja',
            sectionHeading: 'PERENCANAAN KINERJA',
            icon: Goal,
            items: [
                {
                    href: route('planning.index'),
                    label: 'Dokumen Perencanaan',
                    icon: FileText,
                    active: route().current('planning.index') || route().current('planning.documents*') || route().current('planning.docs*'),
                    show: canViewPlanning,
                },
                {
                    href: route('planning.trees.index'),
                    label: 'Pohon Kinerja',
                    icon: TreePine,
                    active: route().current('planning.trees*'),
                    show: canViewPlanning,
                },
                {
                    href: route('planning.monitoring-matrix'),
                    label: 'Monitoring OPD',
                    icon: BarChart3,
                    active: route().current('planning.monitoring-matrix*'),
                    show: canViewMonitoring,
                },
            ],
        },

        // ─── 4. Pengukuran Kinerja ─────────────────────────────────────────────
        {
            title: 'Pengukuran Kinerja',
            icon: Gauge,
            items: [
                {
                    href: route('measurement.realization.opd'),
                    label: 'Realisasi Perangkat Daerah',
                    icon: Building2,
                    active: route().current('measurement.realization.opd*'),
                    show: canViewRealizations,
                },
                {
                    href: route('measurement.monitoring.output'),
                    label: 'Monitoring Fisik / Output',
                    icon: Activity,
                    active: route().current('measurement.monitoring.output*'),
                    show: canViewRealizations,
                },
                {
                    href: route('measurement.monitoring.budget'),
                    label: 'Monitoring Anggaran',
                    icon: Coins,
                    active: route().current('measurement.monitoring.budget*'),
                    show: canViewRealizations,
                },
            ],
        },

        // ─── 5. Pelaporan Kinerja ── TAMPIL (Mandiri) ────────────────────────
        {
            title: 'Pelaporan Kinerja',
            icon: FileText,
            items: [
                {
                    href: route('reports.index'),
                    label: 'Pelaporan Kinerja',
                    icon: FileText,
                    active: route().current('reports*'),
                    show: canViewReports, // ✅ TAMPIL - Pelaporan Kinerja OPD
                },
            ],
        },

        // ─── 6. Evaluasi Kinerja ── TAMPIL (Mandiri) ─────────────────────────
        {
            title: 'Evaluasi Kinerja',
            icon: NotebookPen,
            items: [
                {
                    href: route('evaluations.index'),
                    label: 'Evaluasi Kinerja',
                    icon: NotebookPen,
                    active: route().current('evaluations*'),
                    show: canViewEvaluations, // ✅ TAMPIL - Nilai 4 komponen SAKIP, predikat & LHE
                },
            ],
        },

        // ─── 7. Dashboard Analitik ── TAMPIL (Data Real, Salin & Unduh) ──────
        {
            title: 'Dashboard Analitik',
            icon: BarChart3,
            items: [
                {
                    href: route('analytics.index'),
                    label: 'Dashboard Analitik',
                    icon: BarChart3,
                    active: route().current('analytics*'),
                    show: canViewAnalytics, // ✅ TAMPIL - Data real tabular, salin & unduh
                },
            ],
        },

        // ─── 8. AI Performance Intelligence ──────────────────────────────────
        // Tampil: AI Assistant (untuk pimpinan)
        // Hide:   Template Prompt (developer tool), AI Prediction (Phase 2)
        {
            title: 'AI Performance Intelligence',
            icon: Bot,
            items: [
                {
                    href: route('ai.index'),
                    label: 'AI Asisten',
                    icon: Bot,
                    active: route().current('ai.*'),
                    show: canUseAi, // ✅ TAMPIL - AI Asisten untuk pimpinan & aparatur
                },
                {
                    href: route('ai.templates'),
                    label: 'Template Prompt',
                    icon: Bot,
                    active: route().current('ai.templates*'),
                    show: canManageAiTemplates && !MVP_PHASE_1, // 🔒 HIDE Phase 2 - internal developer tool
                },

            ],
        },

        // ─── 9. Early Warning System ──────────────────────────────────────────
        // Tampil: Peringatan Kinerja, Notifikasi
        // Hide:   Aturan Peringatan (Phase 2 - konfigurasi teknis)
        {
            title: 'Early Warning System',
            icon: Bell,
            items: [
                {
                    href: route('alerts.index'),
                    label: 'Peringatan Kinerja',
                    icon: AlertTriangle,
                    active: route().current('alerts*'),
                    show: canViewAlerts, // ✅ TAMPIL - monitoring keterlambatan OPD
                },
                {
                    href: route('alert-rules.index'),
                    label: 'Aturan Peringatan',
                    icon: BarChart3,
                    active: route().current('alert-rules*'),
                    show: canViewAlertRules && !MVP_PHASE_1, // 🔒 HIDE Phase 2 - konfigurasi teknis
                },
                {
                    href: route('notifications.index'),
                    label: 'Notifikasi',
                    icon: Bell,
                    active: route().current('notifications*'),
                    show: canViewNotifications, // ✅ TAMPIL - notifikasi peringatan
                },
            ],
        },

        // ─── 10. Pusat Informasi ── AKTIF (Sesuai Proposal Modul 10) ────────────
        {
            title: 'Pusat Informasi',
            icon: FileText,
            items: [
                {
                    href: route('knowledge.index'),
                    label: 'Semua Dokumen',
                    icon: FileText,
                    active: route().current('knowledge.index') && (typeof window !== 'undefined' && !new URLSearchParams(window.location.search).get('document_type')),
                    show: canViewKnowledge,
                },
                {
                    href: route('knowledge.index') + '?document_type=regulation',
                    label: 'Regulasi',
                    icon: ScrollText,
                    active: route().current('knowledge*') && (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('document_type') === 'regulation'),
                    show: canViewKnowledge, // ✅ AKTIF
                },
                {
                    href: route('knowledge.index') + '?document_type=guideline',
                    label: 'Pedoman',
                    icon: BookOpen,
                    active: route().current('knowledge*') && (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('document_type') === 'guideline'),
                    show: canViewKnowledge, // ✅ AKTIF
                },
                {
                    href: route('knowledge.index') + '?document_type=sop',
                    label: 'SOP',
                    icon: ClipboardList,
                    active: route().current('knowledge*') && (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('document_type') === 'sop'),
                    show: canViewKnowledge, // ✅ AKTIF
                },
                {
                    href: route('knowledge.index') + '?document_type=faq',
                    label: 'FAQ',
                    icon: HelpCircle,
                    active: route().current('knowledge*') && (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('document_type') === 'faq'),
                    show: canViewKnowledge, // ✅ AKTIF
                },
                {
                    href: route('knowledge.index') + '?document_type=news',
                    label: 'Berita',
                    icon: Newspaper,
                    active: route().current('knowledge*') && (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('document_type') === 'news'),
                    show: canViewKnowledge, // ✅ AKTIF
                },
                {
                    href: route('knowledge.index') + '?document_type=video_tutorial',
                    label: 'Video Tutorial',
                    icon: Video,
                    active: route().current('knowledge*') && (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('document_type') === 'video_tutorial'),
                    show: canViewKnowledge, // ✅ AKTIF
                },
                {
                    href: route('knowledge.index') + '?document_type=external_link',
                    label: 'Tautan Aplikasi Pendukung',
                    icon: ExternalLink,
                    active: route().current('knowledge*') && (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('document_type') === 'external_link'),
                    show: canViewKnowledge, // ✅ AKTIF
                },
                {
                    href: route('knowledge.public.index'),
                    label: 'Portal Publik Informasi',
                    icon: Globe,
                    active: false,
                    show: true,
                },
            ],
        },

        // ─── 11. Manajemen Pengguna ───────────────────────────────────────────
        // Tampil: Pengguna, Hak Akses & Peran
        // Hide:   Integrasi, Go-Live Readiness (developer/ops tool)
        {
            title: 'Manajemen Pengguna',
            icon: Users,
            items: [
                {
                    href: route('users.index'),
                    label: 'Pengguna',
                    icon: Users,
                    active: route().current('users*'),
                    show: canViewUsers, // ✅ TAMPIL - registrasi akun OPD + whitelist WA
                },
                {
                    href: route('roles.index'),
                    label: 'Hak Akses & Peran',
                    icon: Shield,
                    active: route().current('roles*'),
                    show: canViewRoles, // ✅ TAMPIL - manajemen role
                },

            ],
        },

        // ─── 12. Audit Log ── TAMPIL ───────────────────────────────────────
        {
            title: 'Audit Log',
            icon: Shield,
            items: [
                {
                    href: route('audit.index'),
                    label: 'Audit Log',
                    icon: Shield,
                    active: route().current('audit*'),
                    show: canViewAudit,
                },
            ],
        },

        // ─── 13. WhatsApp Chatbot ── TAMPIL (MVP) ────────────────────────────
        {
            title: 'WhatsApp Chatbot',
            icon: MessageCircle,
            items: [
                {
                    href: route('whatsapp.index'),
                    label: 'WhatsApp AI',
                    icon: MessageCircle,
                    active: route().current('whatsapp*'),
                    show: canViewWhatsapp, // ✅ TAMPIL - integrasi chatbot pimpinan
                },
            ],
        },

        // ─── 14. Pengaturan Sistem ── TAMPIL (MVP) ───────────────────────────
        {
            title: 'Pengaturan Sistem',
            icon: Settings,
            items: [
                {
                    href: route('settings.index'),
                    label: 'Konfigurasi Sistem',
                    icon: Settings,
                    active: route().current('settings*'),
                    show: canManageSettings, // ✅ TAMPIL - konfigurasi dasar sistem
                },
            ],
        },
    ];

    const visibleGroups = menuGroups
        .map((group) => ({ ...group, items: group.items.filter((i) => i.show) }))
        .filter((group) => group.items.length > 0);

    const [mobileOpen, setMobileOpen] = useState(false);
    const { url } = usePage();
    useEffect(() => {
        setMobileOpen(false);
    }, [url]);

    const prevUrlRef = useRef(url);

    // Open groups state with localStorage persistence
    const [openGroups, setOpenGroups] = useState<string[]>(() => {
        let saved: string[] = [];
        if (typeof window !== 'undefined') {
            try {
                const item = window.localStorage.getItem('ekasuari-sidebar-open-groups');
                if (item) saved = JSON.parse(item);
            } catch (e) {
                saved = [];
            }
        }
        const activeTitles = visibleGroups
            .filter((group) => group.items.some((item) => item.active))
            .map((group) => group.title);
        return Array.from(new Set([...saved, ...activeTitles]));
    });

    // Automatically ensure active group opens when navigating to a new URL
    useEffect(() => {
        if (prevUrlRef.current !== url) {
            prevUrlRef.current = url;
            const activeTitles = visibleGroups
                .filter((group) => group.items.some((item) => item.active))
                .map((group) => group.title);

            if (activeTitles.length > 0) {
                setOpenGroups((prev) => {
                    const missing = activeTitles.filter((t) => !prev.includes(t));
                    if (missing.length === 0) return prev;
                    const next = Array.from(new Set([...prev, ...activeTitles]));
                    if (typeof window !== 'undefined') {
                        window.localStorage.setItem('ekasuari-sidebar-open-groups', JSON.stringify(next));
                    }
                    return next;
                });
            }
        }
    }, [url]);

    const handleOpenGroupsChange = (newOpenGroups: string[]) => {
        setOpenGroups(newOpenGroups);
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('ekasuari-sidebar-open-groups', JSON.stringify(newOpenGroups));
        }
    };

    const desktopNavRef = useRef<HTMLElement>(null);
    const mobileNavRef = useRef<HTMLElement>(null);

    const handleNavScroll = (e: React.UIEvent<HTMLElement>) => {
        const top = e.currentTarget.scrollTop;
        if (typeof window !== 'undefined') {
            window.sessionStorage.setItem('ekasuari-sidebar-scroll', top.toString());
        }
    };

    // Scroll standby restoration: prevent jumping to top on reload or actions
    useEffect(() => {
        const restoreScroll = () => {
            if (!desktopNavRef.current) return;
            const navEl = desktopNavRef.current;
            const savedScroll = typeof window !== 'undefined'
                ? window.sessionStorage.getItem('ekasuari-sidebar-scroll')
                : null;

            if (savedScroll !== null) {
                const parsed = parseInt(savedScroll, 10);
                if (!isNaN(parsed) && parsed > 0) {
                    navEl.scrollTop = parsed;
                }
            }

            // Also ensure active item is visible without jumping to top
            const activeEl = navEl.querySelector<HTMLElement>('[data-active="true"]');
            if (activeEl) {
                const navRect = navEl.getBoundingClientRect();
                const elRect = activeEl.getBoundingClientRect();
                if (elRect.top < navRect.top || elRect.bottom > navRect.bottom) {
                    activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                }
            }
        };

        restoreScroll();
        const timer = setTimeout(restoreScroll, 100);
        return () => clearTimeout(timer);
    }, [url]);

    const renderSidebar = (mobile = false) => (
        <nav
            ref={mobile ? mobileNavRef : desktopNavRef}
            onScroll={mobile ? undefined : handleNavScroll}
            className="flex-1 min-h-0 space-y-1 overflow-y-auto px-2.5 py-3 scrollbar-thin scrollbar-thumb-slate-700"
        >
            <Accordion
                type="multiple"
                value={openGroups}
                onValueChange={handleOpenGroupsChange}
                className="w-full space-y-1"
            >
                {visibleGroups.map((group) => (
                    <div key={group.title} className="space-y-1">
                        {!collapsed && group.sectionHeading && (
                            <div className="px-3 pt-4 pb-1 text-[10px] font-bold tracking-wider text-slate-400/90 uppercase select-none">
                                {group.sectionHeading}
                            </div>
                        )}
                        {collapsed && group.sectionHeading && (
                            <div className="my-2 border-t border-slate-800/60" />
                        )}
                        <SidebarGroup
                            title={group.title}
                            icon={group.icon}
                            items={group.items}
                            mobile={mobile}
                            collapsed={!mobile && collapsed}
                            onExpand={expandAndOpen}
                            onItemClick={mobile ? () => setMobileOpen(false) : undefined}
                        />
                    </div>
                ))}
            </Accordion>
        </nav>
    );

    const [collapsed, setCollapsed] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false;
        const saved = window.localStorage.getItem('ekasuari-sidebar-collapsed');
        if (saved !== null) return saved === '1';
        // Auto-collapse pada layar laptop standar (< 1280px) untuk memaksimalkan ruang tabel data
        return window.innerWidth < 1280;
    });

    // AI Chat standby state: bertahan saat reload halaman maupun navigasi menu
    const [isChatOpen, setIsChatOpen] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false;
        return window.localStorage.getItem('ekasuari-ai-chat-open') === '1';
    });

    const toggleChat = () => {
        setIsChatOpen((prev) => {
            const next = !prev;
            if (typeof window !== 'undefined') {
                window.localStorage.setItem('ekasuari-ai-chat-open', next ? '1' : '0');
            }
            return next;
        });
    };

    const closeChat = () => {
        setIsChatOpen(false);
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('ekasuari-ai-chat-open', '0');
        }
    };

    const openChat = () => {
        setIsChatOpen(true);
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('ekasuari-ai-chat-open', '1');
        }
    };

    // Apply server theme (warna, radius, font) dari database
    const { theme } = usePage<PageProps>().props;
    useEffect(() => {
        if (theme) applyServerTheme(theme);
    }, [theme]);

    const toggleCollapsed = () => {
        setCollapsed((prev) => {
            const next = !prev;
            window.localStorage.setItem('ekasuari-sidebar-collapsed', next ? '1' : '0');
            return next;
        });
    };

    const expandAndOpen = (title: string) => {
        setCollapsed(false);
        window.localStorage.setItem('ekasuari-sidebar-collapsed', '0');
        setOpenGroups((prev) => {
            const next = Array.from(new Set([...prev, title]));
            if (typeof window !== 'undefined') {
                window.localStorage.setItem('ekasuari-sidebar-open-groups', JSON.stringify(next));
            }
            return next;
        });
    };

    const initial = (user?.name ?? '?').charAt(0).toUpperCase();
    const roleName =
        (Array.isArray(user?.roles) && user.roles.length > 0
            ? (typeof user.roles[0] === 'string' ? user.roles[0] : (user.roles[0] as any)?.name)
            : null) ||
        user?.job_title ||
        'Administrator';

    return (
        <div className="min-h-screen bg-background">
            <aside
                className={cn(
                    'fixed inset-y-0 left-0 z-30 hidden flex-col overflow-hidden border-r border-slate-800 bg-[#0F172A] text-slate-200 transition-[width] duration-200 lg:flex',
                    collapsed ? 'w-16' : 'w-64',
                )}
            >
                <div
                    className={cn(
                        'flex h-16 items-center border-b border-slate-800 bg-[#0B132B]/60 transition-[padding] duration-200',
                        collapsed ? 'justify-center px-0' : 'gap-3 px-4',
                    )}
                >
                    <ApplicationLogo className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 object-contain drop-shadow" />
                    {!collapsed && (
                        <div className="min-w-0 flex-1">
                            <span className="block text-base font-bold tracking-tight text-white leading-tight">
                                {appName}
                            </span>
                            <span className="block text-[11px] font-medium text-slate-400 leading-tight truncate mt-0.5">
                                {appConfig?.instansiName || 'Kabupaten Mimika'}
                            </span>
                        </div>
                    )}
                </div>

                {renderSidebar()}

                <div className="border-t border-slate-800 p-2 space-y-1.5 bg-[#0B132B]/40">
                    {/* AI Asisten Floating Chat Trigger */}
                    <button
                        type="button"
                        onClick={toggleChat}
                        className={cn(
                            'group flex items-center rounded-lg transition-all text-left cursor-pointer select-none',
                            collapsed
                                ? 'h-10 w-10 justify-center mx-auto'
                                : 'w-full gap-2.5 px-3 py-2',
                            isChatOpen
                                ? 'bg-primary text-primary-foreground shadow-md ring-2 ring-primary/40'
                                : 'bg-slate-800/80 border border-slate-700/60 hover:bg-slate-800 hover:border-slate-600 text-slate-200'
                        )}
                        title={collapsed ? `AI Asisten ${appName}` : undefined}
                    >
                        <div
                            className={cn(
                                'relative flex items-center justify-center rounded-md shrink-0 transition-colors',
                                collapsed ? 'h-8 w-8' : 'h-7 w-7',
                                isChatOpen
                                    ? 'bg-white/20 text-white'
                                    : 'bg-primary text-primary-foreground shadow-xs'
                            )}
                        >
                            <Bot className="h-4 w-4" />
                            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                            </span>
                        </div>

                        {!collapsed && (
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 leading-tight">
                                    <span
                                        className={cn(
                                            'text-xs font-bold truncate',
                                            isChatOpen ? 'text-white' : 'text-white group-hover:text-primary'
                                        )}
                                    >
                                        AI Asisten {appName}
                                    </span>
                                    <Sparkles
                                        className={cn(
                                            'h-3 w-3 shrink-0',
                                            isChatOpen
                                                ? 'text-amber-300 fill-amber-300'
                                                : 'text-amber-400 fill-amber-400 animate-pulse'
                                        )}
                                    />
                                </div>
                                <p
                                    className={cn(
                                        'text-[10px] truncate mt-0.5',
                                        isChatOpen ? 'text-white/80' : 'text-slate-400'
                                    )}
                                >
                                    Tanya SAKIP & Kinerja
                                </p>
                            </div>
                        )}
                    </button>

                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className={cn(
                            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-rose-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300',
                            collapsed && 'justify-center px-0',
                        )}
                        title={collapsed ? 'Keluar' : undefined}
                    >
                        <LogOut className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>Keluar</span>}
                    </Link>
                </div>
            </aside>

            <div
                className={cn(
                    'flex flex-col min-w-0 w-full overflow-x-hidden transition-[padding] duration-200',
                    collapsed ? 'lg:pl-16' : 'lg:pl-64',
                )}
            >
                <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-2 sm:gap-3 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm px-3 sm:px-4 lg:px-6">
                    <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            onClick={toggleCollapsed}
                            className="hidden shrink-0 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white lg:inline-flex"
                            aria-label="Lipat sidebar"
                        >
                            {collapsed ? (
                                <PanelLeftOpen className="h-5 w-5" />
                            ) : (
                                <PanelLeftClose className="h-5 w-5" />
                            )}
                        </Button>
                        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                            <SheetTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="shrink-0 lg:hidden min-h-[40px] min-w-[40px]"
                                    aria-label="Menu"
                                >
                                    <Menu className="h-5 w-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="flex flex-col w-72 p-0 bg-[#0F172A] border-slate-800 text-slate-200">
                                <div className="flex h-16 items-center gap-3 border-b border-slate-800 bg-[#0B132B]/60 px-4">
                                    <ApplicationLogo className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 object-contain drop-shadow" />
                                    <div className="min-w-0 flex-1">
                                        <span className="block text-base font-bold tracking-tight text-white leading-tight">
                                            {appName}
                                        </span>
                                        <span className="block text-[11px] font-medium text-slate-400 leading-tight truncate mt-0.5">
                                            {appConfig?.instansiName || 'Kabupaten Mimika'}
                                        </span>
                                    </div>
                                </div>
                                <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between sm:hidden bg-[#0B132B]/30">
                                    <span className="text-[11px] text-slate-400 font-medium">Tema Warna</span>
                                    <ThemePanel />
                                </div>
                                {renderSidebar(true)}
                                <div className="border-t border-slate-800 p-3 space-y-2 bg-[#0B132B]/40">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMobileOpen(false);
                                            openChat();
                                        }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60 hover:bg-slate-800 text-left cursor-pointer transition-colors min-h-[44px]"
                                    >
                                        <div className="relative flex items-center justify-center h-8 w-8 rounded-md bg-primary text-primary-foreground shrink-0 shadow-xs">
                                            <Bot className="h-4 w-4" />
                                            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                                            </span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5 leading-tight">
                                                <span className="text-xs font-bold text-white truncate">
                                                    AI Asisten {appName}
                                                </span>
                                                <Sparkles className="h-3 w-3 text-amber-400 fill-amber-400 shrink-0" />
                                            </div>
                                            <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                                Tanya SAKIP & Kinerja
                                            </p>
                                        </div>
                                    </button>

                                    <Link
                                        href={route('logout')}
                                        method="post"
                                        as="button"
                                        onClick={() => setMobileOpen(false)}
                                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors min-h-[40px]"
                                    >
                                        <LogOut className="h-4 w-4 shrink-0" />
                                        <span>Keluar</span>
                                    </Link>
                                </div>
                            </SheetContent>
                        </Sheet>

                        {/* Mobile Brand Title */}
                        <div className="flex items-center gap-2 lg:hidden min-w-0">
                            <ApplicationLogo className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 object-contain drop-shadow" />
                            <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white truncate max-w-[120px] xs:max-w-[160px]">
                                {appName}
                            </span>
                        </div>

                        {/* Global Search Bar (Center/Left) */}
                        <div className="relative hidden max-w-sm w-full md:block lg:max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                            <input
                                type="search"
                                placeholder="Cari menu, data, atau informasi..."
                                className="w-full h-9 pl-9 pr-4 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                        {/* Quick AI Assistant Trigger in Mobile Header */}
                        <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            onClick={toggleChat}
                            className={cn(
                                'relative shrink-0 lg:hidden transition-colors min-h-[40px] min-w-[40px]',
                                isChatOpen
                                    ? 'bg-primary/15 text-primary'
                                    : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
                            )}
                            aria-label={`AI Asisten ${appName}`}
                            title={`Tanya AI Asisten ${appName}`}
                        >
                            <Bot className="h-4 w-4" />
                            <span className="absolute top-2 right-2 flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                            </span>
                        </Button>

                        <div className="hidden sm:inline-flex">
                            <ThemePanel />
                        </div>
                        <ThemeToggle />
                        {canViewNotifications && (
                            <NotificationDropdown />
                        )}

                        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    className="flex items-center gap-2.5 rounded-lg p-1 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                                >
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-xs">
                                        {initial}
                                    </span>
                                    <div className="hidden min-w-0 text-left sm:block">
                                        <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight truncate max-w-[170px]">
                                            {user?.name}
                                        </div>
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight truncate max-w-[170px]">
                                            {roleName}
                                        </div>
                                    </div>
                                    <ChevronDown className="hidden h-4 w-4 text-slate-400 shrink-0 sm:inline" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 shadow-lg">
                                <DropdownMenuLabel>
                                    <div className="text-sm font-semibold text-foreground">{user?.name}</div>
                                    <div className="text-xs font-normal text-muted-foreground truncate">
                                        {user?.email}
                                    </div>
                                    <div className="text-[11px] text-primary font-medium mt-1">
                                        {roleName}
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link href={route('profile.edit')} className="cursor-pointer">
                                        Pengaturan Profil
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="text-destructive focus:text-destructive cursor-pointer"
                                    asChild
                                >
                                    <Link href={route('logout')} method="post" as="button" className="w-full text-left">
                                        Keluar
                                    </Link>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                <main className={cn('flex-1 min-w-0 w-full bg-slate-50/70 dark:bg-slate-950/70', noPadding ? 'p-0' : 'p-3 sm:p-5 lg:p-7')}>{children}</main>
            </div>

            <ScrollToTop />
            <FlashToaster />
            <FloatingChatWidget
                isOpen={isChatOpen}
                onClose={closeChat}
                onToggle={toggleChat}
                sidebarCollapsed={collapsed}
                hideFloatingTrigger={true}
            />
        </div>
    );
}