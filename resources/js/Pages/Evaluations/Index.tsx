import React, { useState, useMemo } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import TablePagination from '@/Components/TablePagination';
import { Select2 } from '@/Components/ui/select2';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/Components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/Components/ui/alert-dialog';
import {
    FileText,
    Upload,
    Plus,
    Pencil,
    Trash2,
    Download,
    FileDown,
    CheckCircle2,
    Calendar,
    Building2,
    AlertCircle,
    Search,
    Award,
    Target,
    HelpCircle,
    ChevronDown,
    ExternalLink,
    Info,
} from 'lucide-react';

// ─── Interfaces ────────────────────────────────────────────────────────────────

interface SakipItem {
    no: number;
    evaluation_id?: number | null;
    organization_id: number;
    organization_code: string;
    organization_name: string;
    perencanaan: number;
    pengukuran: number;
    pelaporan: number;
    evaluasi_internal: number;
    nilai: number;
    predikat: string;
    status_evaluasi: string;
    lhe_file_path?: string | null;
    lhe_file_url?: string | null;
}

interface PkoIndicatorItem {
    id: number;
    pko_evaluation_id: number;
    order: number;
    sasaran: string;
    indikator: string;
    satuan: string;
    target: number;
    realisasi: number;
    capaian_pk: number;
    normalisasi_capaian: number;
    koreksi_akip: number;
    nilai_akhir: number;
}

interface PkoEvaluationItem {
    id: number;
    year: number;
    organization_id: number;
    total_capaian_pk: number;
    nko: number;
    predikat: string;
    status: string;
    indicators: PkoIndicatorItem[];
}

interface OrganizationOption {
    id: number;
    code: string;
    name: string;
}

interface Props extends PageProps {
    year: number;
    available_years: number[];
    sakip_pemda: SakipItem;
    sakip_opd: SakipItem[];
    pko_pemda: PkoEvaluationItem | null;
    pko_opd: PkoEvaluationItem | null;
    selected_opd_id: number;
    organizations: OrganizationOption[];
    can_manage: boolean;
    can_manage_pemda?: boolean;
}

// ─── Format Helpers ────────────────────────────────────────────────────────────

function formatNumberId(val: number | null | undefined, decimals = 2): string {
    if (val === null || val === undefined || isNaN(val)) return '0,00';
    return Number(val).toLocaleString('id-ID', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}

function formatPercentId(val: number | null | undefined, decimals = 2): string {
    if (val === null || val === undefined || isNaN(val)) return '0,00%';
    return `${formatNumberId(val, decimals)}%`;
}

function computeSakipPredikat(total: number): string {
    if (total < 0) return 'D';
    if (total > 90) return 'AA';
    if (total > 80) return 'A';
    if (total > 70) return 'BB';
    if (total > 60) return 'B';
    if (total > 50) return 'CC';
    if (total > 30) return 'C';
    return 'D';
}

function getKoreksiAkipRate(predikat: string): number {
    const p = (predikat || '').trim().toUpperCase();
    if (p === 'AA' || p === 'A') return 0;
    if (p === 'BB') return 10;
    if (p === 'B') return 15;
    if (p === 'CC') return 20;
    if (p === 'C' || p === 'D') return 30;
    return 0;
}

function getSakipBadge(predikat: string) {
    const p = (predikat || '').trim().toUpperCase();
    if (!p || p === 'BELUM DINILAI' || p === '-') {
        return <Badge className="bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 font-bold" title="Belum Dinilai">BELUM DINILAI</Badge>;
    }
    if (p === 'AA') {
        return <Badge className="bg-emerald-700 text-white hover:bg-emerald-800 font-bold" title="Sangat Memuaskan (> 90 - 100)">AA</Badge>;
    }
    if (p === 'A') {
        return <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 font-bold" title="Memuaskan (> 80 - 90)">A</Badge>;
    }
    if (p === 'BB') {
        return <Badge className="bg-blue-600 text-white hover:bg-blue-700 font-bold" title="Sangat Baik (> 70 - 80)">BB</Badge>;
    }
    if (p === 'B') {
        return <Badge className="bg-sky-600 text-white hover:bg-sky-700 font-bold" title="Baik (> 60 - 70)">B</Badge>;
    }
    if (p === 'CC') {
        return <Badge className="bg-amber-400 text-slate-950 hover:bg-amber-500 font-bold" title="Cukup / Memadai (> 50 - 60)">CC</Badge>;
    }
    if (p === 'C') {
        return <Badge className="bg-orange-500 text-white hover:bg-orange-600 font-bold" title="Kurang (> 30 - 50)">C</Badge>;
    }
    if (p === 'D') {
        return <Badge className="bg-rose-700 text-white hover:bg-rose-800 font-bold" title="Sangat Kurang (0 - 30)">D</Badge>;
    }
    return <Badge className="bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 font-bold" title={p}>{p}</Badge>;
}

function getPkoPredikatBadge(predikat: string) {
    const p = (predikat || '').trim().toUpperCase();
    if (!p || p === 'BELUM DINILAI' || p === '-') {
        return <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 tracking-wide" title="Belum Dinilai">BELUM DINILAI</span>;
    }
    if (p === 'ISTIMEWA' || p === 'AA') {
        return <span className="inline-flex px-3 py-1 rounded-full text-xs font-black bg-blue-600 text-white tracking-wide shadow-xs" title="Istimewa (> 100%)">ISTIMEWA</span>;
    }
    if (p === 'BAIK' || p === 'A') {
        return <span className="inline-flex px-3 py-1 rounded-full text-xs font-black bg-emerald-600 text-white tracking-wide shadow-xs" title="Baik (80% - 100%)">BAIK</span>;
    }
    if (p === 'BUTUH PERBAIKAN' || p === 'BB') {
        return <span className="inline-flex px-3 py-1 rounded-full text-xs font-black bg-amber-400 text-slate-950 tracking-wide shadow-xs" title="Butuh Perbaikan (60% - 80%)">BUTUH PERBAIKAN</span>;
    }
    if (p === 'KURANG' || p === 'B' || p === 'CC' || p === 'C') {
        return <span className="inline-flex px-3 py-1 rounded-full text-xs font-black bg-orange-500 text-white tracking-wide shadow-xs" title="Kurang (20% - 60%)">KURANG</span>;
    }
    if (p === 'SANGAT KURANG' || p === 'D') {
        return <span className="inline-flex px-3 py-1 rounded-full text-xs font-black bg-rose-700 text-white tracking-wide shadow-xs" title="Sangat Kurang (<= 20%)">SANGAT KURANG</span>;
    }
    return <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 tracking-wide" title={p}>{p}</span>;
}

function getStatusEvaluasiBadge(status?: string, size: 'sm' | 'xs' = 'xs') {
    const raw = (status || '').trim();
    const s = raw.toLowerCase();
    const textSize = size === 'sm' ? 'text-[11px]' : 'text-[10px]';

    if (!raw || s === 'belum dievaluasi') {
        return (
            <span className={`inline-flex px-2 py-0.5 rounded-full ${textSize} font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-300 dark:border-rose-700`}>
                Belum Dievaluasi
            </span>
        );
    }

    if (s === 'draft') {
        return (
            <span className={`inline-flex px-2 py-0.5 rounded-full ${textSize} font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700`}>
                Draft
            </span>
        );
    }

    if (s.includes('review') || s === 'dalam review') {
        return (
            <span className={`inline-flex px-2 py-0.5 rounded-full ${textSize} font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700`}>
                {raw}
            </span>
        );
    }

    if (s === 'final') {
        return (
            <span className={`inline-flex px-2 py-0.5 rounded-full ${textSize} font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700`}>
                Final
            </span>
        );
    }

    return (
        <span className={`inline-flex px-2 py-0.5 rounded-full ${textSize} font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700`}>
            {raw}
        </span>
    );
}

export default function EvaluationsIndex({
    auth,
    year,
    available_years,
    sakip_pemda,
    sakip_opd,
    pko_pemda,
    pko_opd,
    selected_opd_id,
    organizations,
    can_manage,
    can_manage_pemda = false,
}: Props) {
    const { flash } = usePage().props as { flash: { success?: string | null; error?: string | null } };

    // Active Top Level Tab
    const [activeTab, setActiveTab] = useState<'sakip' | 'pko'>('sakip');

    // Filter Year & OPD
    const [selectedYear, setSelectedYear] = useState<number>(year);
    const [selectedOpd, setSelectedOpd] = useState<number>(selected_opd_id);
    const [opdSearch, setOpdSearch] = useState('');

    // Sub-tab under PKO (Pemda vs OPD)
    const [pkoSubTab, setPkoSubTab] = useState<'pemda' | 'opd'>('pemda');

    // Show Calculation Info
    const [showGuide, setShowGuide] = useState(false);
    const [showSakipGuide, setShowSakipGuide] = useState(false);

    // ─── Modals State ──────────────────────────────────────────────────────────
    // 1. SAKIP Modal (Create / Edit)
    const [sakipModalOpen, setSakipModalOpen] = useState(false);
    const [editingOrgId, setEditingOrgId] = useState<number>(sakip_pemda?.organization_id || 1);
    const [editingOrgName, setEditingOrgName] = useState<string>('Pemerintah Provinsi');
    const [sakipPerencanaan, setSakipPerencanaan] = useState<number>(0);
    const [sakipPengukuran, setSakipPengukuran] = useState<number>(0);
    const [sakipPelaporan, setSakipPelaporan] = useState<number>(0);
    const [sakipEvaluasiInternal, setSakipEvaluasiInternal] = useState<number>(0);
    const [sakipStatus, setSakipStatus] = useState<string>('Final');

    // 2. Upload LHE Modal
    const [lheModalOpen, setLheModalOpen] = useState(false);
    const [lheTargetOrg, setLheTargetOrg] = useState<{ id: number; name: string } | null>(null);
    const [lheFile, setLheFile] = useState<File | null>(null);
    const [isUploadingLhe, setIsUploadingLhe] = useState(false);

    // 3. PKO Indicator Modal (Create / Edit)
    const [pkoModalOpen, setPkoModalOpen] = useState(false);
    const [pkoTargetType, setPkoTargetType] = useState<'pemda' | 'opd'>('pemda');
    const [editingPkoIndicator, setEditingPkoIndicator] = useState<PkoIndicatorItem | null>(null);
    const [pkoSasaran, setPkoSasaran] = useState('');
    const [pkoIndikator, setPkoIndikator] = useState('');
    const [pkoSatuan, setPkoSatuan] = useState('Persen');
    const [pkoTarget, setPkoTarget] = useState<number>(0);
    const [pkoRealisasi, setPkoRealisasi] = useState<number>(0);
    const [pkoKoreksiManual, setPkoKoreksiManual] = useState<number | ''>('');

    // 4. Delete Confirmation Dialogs
    const [deleteSakipId, setDeleteSakipId] = useState<number | null>(null);
    const [isDeleteSakipOpen, setIsDeleteSakipOpen] = useState(false);
    const [deletePkoId, setDeletePkoId] = useState<number | null>(null);
    const [isDeletePkoOpen, setIsDeletePkoOpen] = useState(false);

    // Handle Year Switch
    const handleYearChange = (newYear: number) => {
        setSelectedYear(newYear);
        router.get(
            route('evaluations.index'),
            { year: newYear, opd_id: selectedOpd },
            { preserveState: true, preserveScroll: true }
        );
    };

    // Handle OPD Switch for PKO Perangkat Daerah
    const handleOpdChange = (newOpdId: number) => {
        setSelectedOpd(newOpdId);
        router.get(
            route('evaluations.index'),
            { year: selectedYear, opd_id: newOpdId },
            { preserveState: true, preserveScroll: true }
        );
    };

    // Filtered OPD List for SAKIP
    const filteredSakipOpd = useMemo(() => {
        if (!opdSearch.trim()) return sakip_opd;
        const q = opdSearch.toLowerCase();
        return sakip_opd.filter(
            (o) => o.organization_name.toLowerCase().includes(q) || o.organization_code.toLowerCase().includes(q)
        );
    }, [sakip_opd, opdSearch]);

    const [sakipPage, setSakipPage] = useState(1);
    const [sakipPerPage, setSakipPerPage] = useState(25);
    const totalSakip = filteredSakipOpd.length;
    const lastSakipPage = Math.max(1, Math.ceil(totalSakip / sakipPerPage));
    const safeSakipPage = Math.min(sakipPage, lastSakipPage);
    const fromSakip = totalSakip > 0 ? (safeSakipPage - 1) * sakipPerPage + 1 : 0;
    const toSakip = totalSakip > 0 ? Math.min(safeSakipPage * sakipPerPage, totalSakip) : 0;
    const paginatedSakipOpd = filteredSakipOpd.slice((safeSakipPage - 1) * sakipPerPage, safeSakipPage * sakipPerPage);

    // Open SAKIP Edit / Input Modal
    const openSakipModal = (item?: SakipItem) => {
        if (item) {
            if (item.organization_id === sakip_pemda.organization_id && !can_manage_pemda) {
                return;
            }
            setEditingOrgId(item.organization_id);
            setEditingOrgName(item.organization_name);
            setSakipPerencanaan(item.perencanaan);
            setSakipPengukuran(item.pengukuran);
            setSakipPelaporan(item.pelaporan);
            setSakipEvaluasiInternal(item.evaluasi_internal);
            setSakipStatus(item.status_evaluasi || 'Final');
        } else {
            // Default to Pemda or first OPD
            if (can_manage_pemda) {
                setEditingOrgId(sakip_pemda.organization_id);
                setEditingOrgName(sakip_pemda.organization_name);
                setSakipPerencanaan(sakip_pemda.perencanaan);
                setSakipPengukuran(sakip_pemda.pengukuran);
                setSakipPelaporan(sakip_pemda.pelaporan);
                setSakipEvaluasiInternal(sakip_pemda.evaluasi_internal);
                setSakipStatus(sakip_pemda.status_evaluasi || 'Final');
            } else if (organizations.length > 0) {
                const firstOpd = organizations[0];
                const opdItem = sakip_opd.find((o) => o.organization_id === firstOpd.id);
                setEditingOrgId(firstOpd.id);
                setEditingOrgName(opdItem?.organization_name || firstOpd.name);
                setSakipPerencanaan(opdItem?.perencanaan || 0);
                setSakipPengukuran(opdItem?.pengukuran || 0);
                setSakipPelaporan(opdItem?.pelaporan || 0);
                setSakipEvaluasiInternal(opdItem?.evaluasi_internal || 0);
                setSakipStatus(opdItem?.status_evaluasi || 'Final');
            } else {
                setEditingOrgId(0);
                setEditingOrgName('');
                setSakipPerencanaan(0);
                setSakipPengukuran(0);
                setSakipPelaporan(0);
                setSakipEvaluasiInternal(0);
                setSakipStatus('Final');
            }
        }
        setSakipModalOpen(true);
    };

    // Live SAKIP Total Calculation
    const liveSakipTotal = useMemo(() => {
        return Number((Number(sakipPerencanaan || 0) + Number(sakipPengukuran || 0) + Number(sakipPelaporan || 0) + Number(sakipEvaluasiInternal || 0)).toFixed(2));
    }, [sakipPerencanaan, sakipPengukuran, sakipPelaporan, sakipEvaluasiInternal]);

    const liveSakipPredikat = useMemo(() => {
        return computeSakipPredikat(liveSakipTotal);
    }, [liveSakipTotal]);

    // Submit SAKIP (Create / Update)
    const submitSakip = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingOrgId === sakip_pemda.organization_id && !can_manage_pemda) {
            return;
        }
        router.post(
            route('evaluations.sakip.save'),
            {
                organization_id: editingOrgId,
                year: selectedYear,
                perencanaan: sakipPerencanaan,
                pengukuran: sakipPengukuran,
                pelaporan: sakipPelaporan,
                evaluasi_internal: sakipEvaluasiInternal,
                status_evaluasi: sakipStatus,
            },
            {
                preserveScroll: true,
                onSuccess: () => setSakipModalOpen(false),
            }
        );
    };

    // Delete SAKIP Evaluation (Reset)
    const deleteSakip = (evaluationId?: number | null) => {
        if (!evaluationId) return;
        if (evaluationId === sakip_pemda.evaluation_id && !can_manage_pemda) {
            return;
        }
        setDeleteSakipId(evaluationId);
        setIsDeleteSakipOpen(true);
    };

    const confirmDeleteSakip = () => {
        if (deleteSakipId) {
            router.delete(route('evaluations.destroy', deleteSakipId), {
                preserveScroll: true,
                onSuccess: () => {
                    setIsDeleteSakipOpen(false);
                    setDeleteSakipId(null);
                },
            });
        }
    };

    // Open Upload LHE Modal
    const openUploadLhe = (orgId: number, orgName: string) => {
        if (orgId === sakip_pemda.organization_id && !can_manage_pemda) {
            return;
        }
        setLheTargetOrg({ id: orgId, name: orgName });
        setLheFile(null);
        setLheModalOpen(true);
    };

    // Submit Upload LHE
    const submitLhe = (e: React.FormEvent) => {
        e.preventDefault();
        if (!lheTargetOrg || !lheFile) return;
        if (lheTargetOrg.id === sakip_pemda.organization_id && !can_manage_pemda) {
            return;
        }

        const formData = new FormData();
        formData.append('organization_id', String(lheTargetOrg.id));
        formData.append('year', String(selectedYear));
        formData.append('file', lheFile);

        setIsUploadingLhe(true);
        router.post(route('evaluations.sakip.upload-lhe'), formData, {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => {
                setIsUploadingLhe(false);
                setLheModalOpen(false);
            },
        });
    };

    // Open PKO Modal (Create / Edit)
    const openPkoModal = (type: 'pemda' | 'opd', item?: PkoIndicatorItem) => {
        if (type === 'pemda' && !can_manage_pemda) {
            return;
        }
        setPkoTargetType(type);
        if (item) {
            setEditingPkoIndicator(item);
            setPkoSasaran(item.sasaran);
            setPkoIndikator(item.indikator);
            setPkoSatuan(item.satuan);
            setPkoTarget(item.target);
            setPkoRealisasi(item.realisasi);
            setPkoKoreksiManual(item.koreksi_akip);
        } else {
            setEditingPkoIndicator(null);
            setPkoSasaran('');
            setPkoIndikator('');
            setPkoSatuan('Persen');
            setPkoTarget(0);
            setPkoRealisasi(0);

            // Auto lookup SAKIP predikat for default koreksi
            const targetOrgId = type === 'pemda' ? sakip_pemda.organization_id : selectedOpd;
            const refSakip = type === 'pemda' ? sakip_pemda : sakip_opd.find((o) => o.organization_id === targetOrgId);
            const autoRate = refSakip ? getKoreksiAkipRate(refSakip.predikat) : 20;
            setPkoKoreksiManual(autoRate);
        }
        setPkoModalOpen(true);
    };

    // Live PKO Calculations inside Modal
    const liveCapaian = useMemo(() => {
        if (!pkoTarget || pkoTarget === 0) return 0;
        return Number(((pkoRealisasi / pkoTarget) * 100).toFixed(2));
    }, [pkoTarget, pkoRealisasi]);

    const liveNormalisasi = useMemo(() => {
        return Math.min(liveCapaian, 110.0);
    }, [liveCapaian]);

    const liveKoreksi = useMemo(() => {
        if (pkoKoreksiManual !== '') return Number(pkoKoreksiManual);
        const targetOrgId = pkoTargetType === 'pemda' ? sakip_pemda.organization_id : selectedOpd;
        const refSakip = pkoTargetType === 'pemda' ? sakip_pemda : sakip_opd.find((o) => o.organization_id === targetOrgId);
        return refSakip ? getKoreksiAkipRate(refSakip.predikat) : 20;
    }, [pkoKoreksiManual, pkoTargetType, sakip_pemda, sakip_opd, selectedOpd]);

    const liveNilaiAkhir = useMemo(() => {
        return Number((liveNormalisasi * (1 - liveKoreksi / 100)).toFixed(2));
    }, [liveNormalisasi, liveKoreksi]);

    // Submit PKO Indicator (Create / Update)
    const submitPkoIndicator = (e: React.FormEvent) => {
        e.preventDefault();
        if (pkoTargetType === 'pemda' && !can_manage_pemda) {
            return;
        }
        const targetOrgId = pkoTargetType === 'pemda' ? sakip_pemda.organization_id : selectedOpd;

        router.post(
            route('evaluations.pko.indicators.save'),
            {
                id: editingPkoIndicator?.id,
                organization_id: targetOrgId,
                year: selectedYear,
                sasaran: pkoSasaran,
                indikator: pkoIndikator,
                satuan: pkoSatuan,
                target: pkoTarget,
                realisasi: pkoRealisasi,
                koreksi_akip: liveKoreksi,
            },
            {
                preserveScroll: true,
                onSuccess: () => setPkoModalOpen(false),
            }
        );
    };

    // Delete PKO Indicator
    const deletePkoIndicator = (indicatorId: number) => {
        if (pkoSubTab === 'pemda' && !can_manage_pemda) {
            return;
        }
        setDeletePkoId(indicatorId);
        setIsDeletePkoOpen(true);
    };

    const confirmDeletePko = () => {
        if (deletePkoId) {
            router.delete(route('evaluations.pko.indicators.destroy', deletePkoId), {
                preserveScroll: true,
                onSuccess: () => {
                    setIsDeletePkoOpen(false);
                    setDeletePkoId(null);
                },
            });
        }
    };

    const selectedOpdObj = organizations.find((o) => o.id === selectedOpd);
    const currentPko = pkoSubTab === 'pemda' ? pko_pemda : pko_opd;
    const canManagePko = pkoSubTab === 'pemda' ? can_manage_pemda : can_manage;

    return (
        <AuthenticatedLayout header="Evaluasi Kinerja">
            <Head title="Evaluasi Kinerja - SAKIP & PKO" />

            <div className="py-6 space-y-6">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">

                    {/* ─── FLASH MESSAGES ───────────────────────────────────────── */}
                    {flash?.success && (
                        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800 shadow-xs">
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                            <span>{flash.success}</span>
                        </div>
                    )}
                    {flash?.error && (
                        <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-800 shadow-xs">
                            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                            <span>{flash.error}</span>
                        </div>
                    )}

                    {/* ─── HEADER BAR & FILTER TAHUN ────────────────────────────── */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                        <div>
                            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                Evaluasi Kinerja
                            </h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Kelola hasil evaluasi 4 komponen akuntabilitas SAKIP & Penilaian Kinerja Organisasi (PKO) sesuai PermenPANRB 22/2024.
                            </p>
                        </div>

                        <div className="flex items-center gap-2.5 w-full sm:w-auto">
                            {/* Year Filter */}
                            <div className="w-36 shrink-0">
                                <Select2
                                    value={selectedYear}
                                    onChange={(val) => handleYearChange(Number(val))}
                                    options={available_years.map((y) => ({
                                        value: y,
                                        label: `Tahun ${y}`,
                                    }))}
                                    placeholder="Pilih Tahun"
                                />
                            </div>

                            {/* Main Action Button */}
                            {can_manage && (
                                activeTab === 'sakip' ? (
                                    <Button
                                        onClick={() => openSakipModal()}
                                        className="gap-1.5 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs flex-1 sm:flex-initial justify-center whitespace-nowrap"
                                    >
                                        <Plus className="h-4 w-4" />
                                        <span>Input Evaluasi SAKIP</span>
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={() => openPkoModal(pkoSubTab)}
                                        className="gap-1.5 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs flex-1 sm:flex-initial justify-center whitespace-nowrap"
                                    >
                                        <Plus className="h-4 w-4" />
                                        <span>Tambah Indikator PKO</span>
                                    </Button>
                                )
                            )}
                        </div>
                    </div>

                    {/* ─── TAB NAVIGATION ───────────────────────────────────────── */}
                    <div className="flex items-center border-b border-slate-200 dark:border-slate-800 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none gap-2">
                        <button
                            type="button"
                            onClick={() => setActiveTab('sakip')}
                            className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold text-sm transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
                                activeTab === 'sakip'
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                        >
                            <Award className="h-4 w-4 shrink-0" />
                            <span>1. Evaluasi SAKIP</span>
                            <Badge variant="secondary" className="ml-1 text-[10px] font-semibold hidden sm:inline-flex">
                                4 Komponen & LHE
                            </Badge>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('pko')}
                            className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold text-sm transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
                                activeTab === 'pko'
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                        >
                            <Target className="h-4 w-4 shrink-0" />
                            <span>2. Penilaian Kinerja Organisasi (PKO)</span>
                            <Badge variant="secondary" className="ml-1 text-[10px] font-semibold hidden sm:inline-flex">
                                Normalisasi & Koreksi AKIP
                            </Badge>
                        </button>
                    </div>

                    {/* ═══════════════════════════════════════════════════════════════
                        TAB 1: EVALUASI SAKIP (PEMDA & OPD)
                    ═══════════════════════════════════════════════════════════════ */}
                    {activeTab === 'sakip' && (
                        <div className="space-y-6">

                            {/* Card 1: SAKIP Pemerintah Daerah */}
                            <Card className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-xs">
                                <CardHeader className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 py-3.5 px-4 sm:px-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <div>
                                        <CardTitle className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                            <Building2 className="h-4 w-4 text-blue-600 shrink-0" />
                                            <span>SAKIP Pemerintah Daerah</span>
                                        </CardTitle>
                                        <CardDescription className="text-xs mt-0.5">
                                            Hasil evaluasi akuntabilitas kinerja Pemerintah Provinsi Papua Barat Tahun Anggaran {selectedYear}.
                                        </CardDescription>
                                    </div>

                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                        {can_manage_pemda && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => openSakipModal(sakip_pemda)}
                                                className="h-8 text-xs font-semibold gap-1.5 flex-1 sm:flex-initial justify-center whitespace-nowrap"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                                <span>Edit Nilai SAKIP</span>
                                            </Button>
                                        )}
                                        <a
                                            href={route('evaluations.export-sakip-pdf', { year: selectedYear })}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md border border-border bg-background text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors shrink-0 flex-1 sm:flex-initial whitespace-nowrap"
                                        >
                                            <FileDown className="h-3.5 w-3.5" />
                                            <span>Download PDF SAKIP</span>
                                        </a>
                                    </div>
                                </CardHeader>

                                <CardContent className="p-0">
                                    <div className="overflow-x-auto scrollbar-thin">
                                        <table className="w-full text-left text-xs border-collapse min-w-[850px]">
                                            <thead className="bg-slate-100/70 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                                                <tr>
                                                    <th className="px-3 py-2.5 text-center w-12">No</th>
                                                    <th className="px-4 py-2.5">Pemerintah Daerah</th>
                                                    <th className="px-3 py-2.5 text-right">Perencanaan (30)</th>
                                                    <th className="px-3 py-2.5 text-right">Pengukuran (30)</th>
                                                    <th className="px-3 py-2.5 text-right">Pelaporan (15)</th>
                                                    <th className="px-3 py-2.5 text-right">Evaluasi Internal (25)</th>
                                                    <th className="px-3 py-2.5 text-right font-black text-slate-900 dark:text-white">Nilai SAKIP</th>
                                                    <th className="px-3 py-2.5 text-center w-20">Predikat</th>
                                                    <th className="px-3 py-2.5 text-center w-28">Status Evaluasi</th>
                                                    <th className="px-3 py-2.5 text-center w-36">Dokumen LHE</th>
                                                    {can_manage_pemda && <th className="px-3 py-2.5 text-center w-20">Aksi</th>}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                                                    <td className="px-3 py-3 text-center font-medium text-slate-500">1</td>
                                                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white text-sm">
                                                        {sakip_pemda.organization_name}
                                                    </td>
                                                    <td className="px-3 py-3 text-right font-mono font-medium text-slate-700 dark:text-slate-300">
                                                        {formatNumberId(sakip_pemda.perencanaan)}
                                                    </td>
                                                    <td className="px-3 py-3 text-right font-mono font-medium text-slate-700 dark:text-slate-300">
                                                        {formatNumberId(sakip_pemda.pengukuran)}
                                                    </td>
                                                    <td className="px-3 py-3 text-right font-mono font-medium text-slate-700 dark:text-slate-300">
                                                        {formatNumberId(sakip_pemda.pelaporan)}
                                                    </td>
                                                    <td className="px-3 py-3 text-right font-mono font-medium text-slate-700 dark:text-slate-300">
                                                        {formatNumberId(sakip_pemda.evaluasi_internal)}
                                                    </td>
                                                    <td className="px-3 py-3 text-right font-mono font-black text-sm text-blue-700 dark:text-blue-400">
                                                        {formatNumberId(sakip_pemda.nilai)}
                                                    </td>
                                                    <td className="px-3 py-3 text-center">
                                                        {getSakipBadge(sakip_pemda.predikat)}
                                                    </td>
                                                    <td className="px-3 py-3 text-center">
                                                        {getStatusEvaluasiBadge(sakip_pemda.status_evaluasi, 'sm')}
                                                    </td>
                                                    <td className="px-3 py-3 text-center">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            {sakip_pemda.lhe_file_url ? (
                                                                <a
                                                                    href={sakip_pemda.lhe_file_url}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold"
                                                                    title="Unduh Dokumen LHE"
                                                                >
                                                                    <FileText className="h-4 w-4" />
                                                                    <span>LHE</span>
                                                                </a>
                                                            ) : (
                                                                <span className="text-[11px] text-slate-400 italic">Belum ada</span>
                                                            )}
                                                            {can_manage_pemda && (
                                                                <button
                                                                    onClick={() => openUploadLhe(sakip_pemda.organization_id, sakip_pemda.organization_name)}
                                                                    className="p-1 text-slate-400 hover:text-blue-600 rounded transition"
                                                                    title="Upload Dokumen LHE"
                                                                >
                                                                    <Upload className="h-3.5 w-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                    {can_manage_pemda && (
                                                        <td className="px-3 py-3 text-center">
                                                            <div className="flex items-center justify-center gap-1">
                                                                <button
                                                                    onClick={() => openSakipModal(sakip_pemda)}
                                                                    className="p-1 text-slate-500 hover:text-blue-600 rounded transition"
                                                                    title="Edit Nilai"
                                                                >
                                                                    <Pencil className="h-3.5 w-3.5" />
                                                                </button>
                                                                {sakip_pemda.evaluation_id && (
                                                                    <button
                                                                        onClick={() => deleteSakip(sakip_pemda.evaluation_id)}
                                                                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                                                                        title="Hapus / Reset"
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    )}
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Card 2: SAKIP Perangkat Daerah (OPD) */}
                            <Card className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-xs">
                                <CardHeader className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 py-3.5 px-4 sm:px-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <div>
                                        <CardTitle className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                            <Award className="h-4 w-4 text-emerald-600 shrink-0" />
                                            <span>SAKIP Perangkat Daerah (OPD)</span>
                                        </CardTitle>
                                        <CardDescription className="text-xs mt-0.5">
                                            Daftar hasil evaluasi akuntabilitas 4 komponen SAKIP seluruh OPD Tahun Anggaran {selectedYear}.
                                        </CardDescription>
                                    </div>

                                    {/* Search Input */}
                                    <div className="relative w-full sm:w-64">
                                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                        <input
                                            type="text"
                                            value={opdSearch}
                                            onChange={(e) => setOpdSearch(e.target.value)}
                                            placeholder="Cari OPD..."
                                            className="h-8 w-full pl-8 pr-3 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-primary"
                                        />
                                    </div>
                                </CardHeader>

                                <CardContent className="p-0">
                                    <div className="overflow-x-auto scrollbar-thin">
                                        <table className="w-full text-left text-xs border-collapse min-w-[880px]">
                                            <thead className="bg-slate-100/70 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                                                <tr>
                                                    <th className="px-3 py-2.5 text-center w-12">No</th>
                                                    <th className="px-4 py-2.5">Perangkat Daerah</th>
                                                    <th className="px-3 py-2.5 text-right">Perencanaan (30)</th>
                                                    <th className="px-3 py-2.5 text-right">Pengukuran (30)</th>
                                                    <th className="px-3 py-2.5 text-right">Pelaporan (15)</th>
                                                    <th className="px-3 py-2.5 text-right">Evaluasi Internal (25)</th>
                                                    <th className="px-3 py-2.5 text-right font-black text-slate-900 dark:text-white">Nilai SAKIP</th>
                                                    <th className="px-3 py-2.5 text-center w-20">Predikat</th>
                                                    <th className="px-3 py-2.5 text-center w-28">Status Evaluasi</th>
                                                    <th className="px-3 py-2.5 text-center w-36">Dokumen LHE</th>
                                                    {can_manage && <th className="px-3 py-2.5 text-center w-20">Aksi</th>}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                                {filteredSakipOpd.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={can_manage ? 11 : 10} className="py-8 text-center text-slate-400 italic">
                                                            Tidak ada data SAKIP OPD yang cocok dengan pencarian.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    paginatedSakipOpd.map((row, index) => (
                                                        <tr key={row.organization_id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition">
                                                            <td className="px-3 py-2.5 text-center font-medium text-slate-500">{fromSakip + index}</td>
                                                            <td className="px-4 py-2.5">
                                                                <p className="font-semibold text-slate-800 dark:text-slate-200">{row.organization_name}</p>
                                                                <p className="text-[10px] text-slate-400 font-mono">{row.organization_code}</p>
                                                            </td>
                                                            <td className="px-3 py-2.5 text-right font-mono text-slate-700 dark:text-slate-300">
                                                                {formatNumberId(row.perencanaan)}
                                                            </td>
                                                            <td className="px-3 py-2.5 text-right font-mono text-slate-700 dark:text-slate-300">
                                                                {formatNumberId(row.pengukuran)}
                                                            </td>
                                                            <td className="px-3 py-2.5 text-right font-mono text-slate-700 dark:text-slate-300">
                                                                {formatNumberId(row.pelaporan)}
                                                            </td>
                                                            <td className="px-3 py-2.5 text-right font-mono text-slate-700 dark:text-slate-300">
                                                                {formatNumberId(row.evaluasi_internal)}
                                                            </td>
                                                            <td className="px-3 py-2.5 text-right font-mono font-black text-sm text-blue-700 dark:text-blue-400">
                                                                {formatNumberId(row.nilai)}
                                                            </td>
                                                            <td className="px-3 py-2.5 text-center">
                                                                {getSakipBadge(row.predikat)}
                                                            </td>
                                                            <td className="px-3 py-2.5 text-center">
                                                                {getStatusEvaluasiBadge(row.status_evaluasi, 'xs')}
                                                            </td>
                                                            <td className="px-3 py-2.5 text-center">
                                                                <div className="flex items-center justify-center gap-1.5">
                                                                    {row.lhe_file_url ? (
                                                                        <a
                                                                            href={row.lhe_file_url}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold"
                                                                            title="Unduh Dokumen LHE"
                                                                        >
                                                                            <FileText className="h-4 w-4" />
                                                                        </a>
                                                                    ) : (
                                                                        <span className="text-[10px] text-slate-400 italic">-</span>
                                                                    )}
                                                                    {can_manage && (can_manage_pemda || organizations.some((o) => o.id === row.organization_id)) && (
                                                                        <button
                                                                            onClick={() => openUploadLhe(row.organization_id, row.organization_name)}
                                                                            className="p-1 text-slate-400 hover:text-blue-600 rounded transition"
                                                                            title="Upload Dokumen LHE"
                                                                        >
                                                                            <Upload className="h-3.5 w-3.5" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            {can_manage && (
                                                                <td className="px-3 py-2.5 text-center">
                                                                    {(can_manage_pemda || organizations.some((o) => o.id === row.organization_id)) ? (
                                                                        <div className="flex items-center justify-center gap-1">
                                                                            <button
                                                                                onClick={() => openSakipModal(row)}
                                                                                className="p-1 text-slate-500 hover:text-blue-600 rounded transition"
                                                                                title="Edit Nilai"
                                                                            >
                                                                                <Pencil className="h-3.5 w-3.5" />
                                                                            </button>
                                                                            {row.evaluation_id && (
                                                                                <button
                                                                                    onClick={() => deleteSakip(row.evaluation_id)}
                                                                                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                                                                                    title="Hapus / Reset"
                                                                                >
                                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-[10px] text-slate-400 italic">-</span>
                                                                    )}
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                    <TablePagination
                                        clientSide={true}
                                        from={fromSakip}
                                        to={toSakip}
                                        totalItems={totalSakip}
                                        perPage={sakipPerPage}
                                        currentPage={safeSakipPage}
                                        lastPage={lastSakipPage}
                                        itemLabel="perangkat daerah"
                                        onPerPageChange={(val) => {
                                            setSakipPerPage(val);
                                            setSakipPage(1);
                                        }}
                                        onClientPageChange={(p) => setSakipPage(p)}
                                    />
                                </CardContent>
                            </Card>

                            {/* Keterangan Klasifikasi Predikat SAKIP */}
                            <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
                                <CardHeader
                                    className="py-3 px-5 cursor-pointer hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition flex flex-row items-center justify-between"
                                    onClick={() => setShowSakipGuide(!showSakipGuide)}
                                >
                                    <div className="flex items-center gap-2">
                                        <Info className="h-4 w-4 text-blue-600" />
                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                                            Keterangan Klasifikasi Predikat &amp; Rentang Nilai SAKIP
                                        </span>
                                    </div>
                                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${showSakipGuide ? 'rotate-180' : ''}`} />
                                </CardHeader>

                                {showSakipGuide && (
                                    <CardContent className="p-0 border-t border-slate-200 dark:border-slate-800">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-xs border-collapse">
                                                <thead className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                                                    <tr>
                                                        <th className="px-4 py-2 text-center w-52 border-r border-slate-200 dark:border-slate-700">Rentang Nilai</th>
                                                        <th className="px-4 py-2 text-center w-36 border-r border-slate-200 dark:border-slate-700">Predikat</th>
                                                        <th className="px-4 py-2">Kategori / Keterangan Mutu Akuntabilitas Kinerja</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-xs">
                                                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                        <td className="px-4 py-2 text-center font-mono font-bold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700">Nilai &gt; 90 hingga 100</td>
                                                        <td className="px-4 py-2 text-center border-r border-slate-200 dark:border-slate-700"><span className="inline-flex px-2.5 py-0.5 rounded text-xs font-black bg-emerald-700 text-white">AA</span></td>
                                                        <td className="px-4 py-2 font-semibold text-emerald-800 dark:text-emerald-300">Sangat Memuaskan</td>
                                                    </tr>
                                                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                        <td className="px-4 py-2 text-center font-mono font-bold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700">Nilai &gt; 80 hingga 90</td>
                                                        <td className="px-4 py-2 text-center border-r border-slate-200 dark:border-slate-700"><span className="inline-flex px-2.5 py-0.5 rounded text-xs font-black bg-emerald-600 text-white">A</span></td>
                                                        <td className="px-4 py-2 font-semibold text-emerald-700 dark:text-emerald-400">Memuaskan</td>
                                                    </tr>
                                                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                        <td className="px-4 py-2 text-center font-mono font-bold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700">Nilai &gt; 70 hingga 80</td>
                                                        <td className="px-4 py-2 text-center border-r border-slate-200 dark:border-slate-700"><span className="inline-flex px-2.5 py-0.5 rounded text-xs font-black bg-blue-600 text-white">BB</span></td>
                                                        <td className="px-4 py-2 font-semibold text-blue-700 dark:text-blue-400">Sangat Baik</td>
                                                    </tr>
                                                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                        <td className="px-4 py-2 text-center font-mono font-bold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700">Nilai &gt; 60 hingga 70</td>
                                                        <td className="px-4 py-2 text-center border-r border-slate-200 dark:border-slate-700"><span className="inline-flex px-2.5 py-0.5 rounded text-xs font-black bg-sky-600 text-white">B</span></td>
                                                        <td className="px-4 py-2 font-semibold text-sky-700 dark:text-sky-400">Baik</td>
                                                    </tr>
                                                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                        <td className="px-4 py-2 text-center font-mono font-bold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700">Nilai &gt; 50 hingga 60</td>
                                                        <td className="px-4 py-2 text-center border-r border-slate-200 dark:border-slate-700"><span className="inline-flex px-2.5 py-0.5 rounded text-xs font-black bg-amber-400 text-slate-950">CC</span></td>
                                                        <td className="px-4 py-2 font-semibold text-amber-700 dark:text-amber-400">Cukup / Memadai</td>
                                                    </tr>
                                                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                        <td className="px-4 py-2 text-center font-mono font-bold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700">Nilai &gt; 30 hingga 50</td>
                                                        <td className="px-4 py-2 text-center border-r border-slate-200 dark:border-slate-700"><span className="inline-flex px-2.5 py-0.5 rounded text-xs font-black bg-orange-500 text-white">C</span></td>
                                                        <td className="px-4 py-2 font-semibold text-orange-700 dark:text-orange-400">Kurang</td>
                                                    </tr>
                                                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                        <td className="px-4 py-2 text-center font-mono font-bold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700">Nilai 0 hingga 30 / Minus (&lt; 0)</td>
                                                        <td className="px-4 py-2 text-center border-r border-slate-200 dark:border-slate-700"><span className="inline-flex px-2.5 py-0.5 rounded text-xs font-black bg-rose-700 text-white">D</span></td>
                                                        <td className="px-4 py-2 font-semibold text-rose-700 dark:text-rose-400">Sangat Kurang</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </CardContent>
                                )}
                            </Card>
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════════════════════════
                        TAB 2: PENILAIAN KINERJA ORGANISASI (PKO)
                    ═══════════════════════════════════════════════════════════════ */}
                    {activeTab === 'pko' && (
                        <div className="space-y-6">

                            {/* Sub-tab Switcher & OPD Selector */}
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <button
                                        type="button"
                                        onClick={() => setPkoSubTab('pemda')}
                                        className={`flex-1 sm:flex-initial text-center px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                                            pkoSubTab === 'pemda'
                                                ? 'bg-blue-600 text-white shadow-xs'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                        }`}
                                    >
                                        PKO Pemda
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setPkoSubTab('opd')}
                                        className={`flex-1 sm:flex-initial text-center px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                                            pkoSubTab === 'opd'
                                                ? 'bg-blue-600 text-white shadow-xs'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                        }`}
                                    >
                                        PKO OPD
                                    </button>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full sm:w-auto">
                                    {pkoSubTab === 'opd' && (
                                        <div className="w-full sm:w-72">
                                            <Select2
                                                value={selectedOpd}
                                                onChange={(val) => handleOpdChange(Number(val))}
                                                options={organizations.map((org) => ({
                                                    value: org.id,
                                                    label: `${org.code} - ${org.name}`,
                                                }))}
                                                placeholder="Pilih OPD..."
                                                searchPlaceholder="Cari OPD..."
                                            />
                                        </div>
                                    )}

                                    <a
                                        href={route('evaluations.export-pko-pdf', {
                                            year: selectedYear,
                                            target_type: pkoSubTab,
                                            organization_id: pkoSubTab === 'opd' ? selectedOpd : undefined,
                                        })}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md border border-border bg-background text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors shrink-0 w-full sm:w-auto whitespace-nowrap"
                                    >
                                        <FileDown className="h-3.5 w-3.5" />
                                        <span>Download PDF PKO</span>
                                    </a>
                                </div>
                            </div>

                            {/* Summary Stat Cards */}
                            {currentPko && (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
                                        <CardContent className="p-4 flex items-center justify-between">
                                            <div>
                                                <p className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">Total Capaian PK</p>
                                                <p className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-0.5">
                                                    {formatPercentId(currentPko.total_capaian_pk)}
                                                </p>
                                            </div>
                                            <div className="h-10 w-10 rounded-full bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600">
                                                <Target className="h-5 w-5" />
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
                                        <CardContent className="p-4 flex items-center justify-between">
                                            <div>
                                                <p className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">Nilai Kinerja Organisasi (NKO)</p>
                                                <p className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-0.5">
                                                    {formatPercentId(currentPko.nko)}
                                                </p>
                                            </div>
                                            <div className="h-10 w-10 rounded-full bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600">
                                                <Award className="h-5 w-5" />
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
                                        <CardContent className="p-4 flex items-center justify-between">
                                            <div>
                                                <p className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">Predikat PKO</p>
                                                <div className="mt-1.5">
                                                    {getPkoPredikatBadge(currentPko.predikat)}
                                                </div>
                                            </div>
                                            <div className="h-10 w-10 rounded-full bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600">
                                                <CheckCircle2 className="h-5 w-5" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}

                            {/* Table PKO (10 Kolom sesuai gambar) */}
                            <Card className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-xs">
                                <CardHeader className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 py-3.5 px-4 sm:px-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <div>
                                        <CardTitle className="text-base font-bold text-slate-800 dark:text-white">
                                            {pkoSubTab === 'pemda' ? 'Indikator PKO Pemerintah Daerah' : `Indikator PKO — ${selectedOpdObj?.name ?? 'Perangkat Daerah'}`} (Tahun {selectedYear})
                                        </CardTitle>
                                        <CardDescription className="text-xs mt-0.5">
                                            10 Kolom hasil perhitungan: Target, Realisasi, Capaian PK, Batas Normalisasi 110%, dan Koreksi Predikat AKIP.
                                        </CardDescription>
                                    </div>

                                    {canManagePko && (
                                        <Button
                                            size="sm"
                                            onClick={() => openPkoModal(pkoSubTab)}
                                            className="h-8 text-xs font-semibold gap-1.5 bg-blue-700 hover:bg-blue-800 text-white w-full sm:w-auto justify-center whitespace-nowrap"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            <span>Tambah Indikator</span>
                                        </Button>
                                    )}
                                </CardHeader>

                                <CardContent className="p-0">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs border-collapse min-w-[960px]">
                                            <thead className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 font-bold border-b border-slate-300 dark:border-slate-700">
                                                <tr>
                                                    <th className="border-r border-slate-200 dark:border-slate-700 px-3 py-2.5 text-center w-10">No</th>
                                                    <th className="border-r border-slate-200 dark:border-slate-700 px-3 py-2.5 w-44">Tujuan / Sasaran</th>
                                                    <th className="border-r border-slate-200 dark:border-slate-700 px-3 py-2.5">Indikator Kinerja</th>
                                                    <th className="border-r border-slate-200 dark:border-slate-700 px-2 py-2.5 text-center w-20">Satuan</th>
                                                    <th className="border-r border-slate-200 dark:border-slate-700 px-2 py-2.5 text-right w-20">Target</th>
                                                    <th className="border-r border-slate-200 dark:border-slate-700 px-2 py-2.5 text-right w-20">Realisasi</th>
                                                    <th className="border-r border-slate-200 dark:border-slate-700 px-2 py-2.5 text-right w-28">Capaian PK (%)</th>
                                                    <th className="border-r border-slate-200 dark:border-slate-700 px-2 py-2.5 text-right w-32">Normalisasi Capaian PK (1)</th>
                                                    <th className="border-r border-slate-200 dark:border-slate-700 px-2 py-2.5 text-right w-24">Koreksi AKIP (2)</th>
                                                    <th className="border-r border-slate-200 dark:border-slate-700 px-3 py-2.5 text-right font-black w-32">Nilai Akhir Capaian PK (3)</th>
                                                    {canManagePko && <th className="px-2 py-2.5 text-center w-16">Aksi</th>}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                                {(!currentPko || currentPko.indicators.length === 0) ? (
                                                    <tr>
                                                        <td colSpan={canManagePko ? 11 : 10} className="py-12 text-center">
                                                            <div className="max-w-md mx-auto flex flex-col items-center justify-center space-y-3">
                                                                <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                                                    <Target className="h-6 w-6" />
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                                                                        Belum Ada Indikator PKO
                                                                    </p>
                                                                    <p className="text-xs text-slate-500">
                                                                        Belum ada indikator Penilaian Kinerja Organisasi (PKO) untuk {pkoSubTab === 'pemda' ? 'Pemerintah Daerah' : selectedOpdObj?.name} tahun {selectedYear}.
                                                                    </p>
                                                                </div>
                                                                {canManagePko && (
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => openPkoModal(pkoSubTab)}
                                                                        className="h-8 text-xs font-semibold gap-1.5 bg-blue-700 hover:bg-blue-800 text-white mt-1"
                                                                    >
                                                                        <Plus className="h-3.5 w-3.5" />
                                                                        + Tambah Indikator PKO Pertama
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    currentPko.indicators.map((ind, idx) => (
                                                        <tr key={ind.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                                                            <td className="border-r border-slate-200 dark:border-slate-700 px-3 py-2 text-center font-medium text-slate-500">
                                                                {idx + 1}
                                                            </td>
                                                            <td className="border-r border-slate-200 dark:border-slate-700 px-3 py-2 leading-relaxed font-medium text-slate-900 dark:text-slate-100">
                                                                {ind.sasaran}
                                                            </td>
                                                            <td className="border-r border-slate-200 dark:border-slate-700 px-3 py-2 leading-relaxed text-slate-800 dark:text-slate-200">
                                                                {ind.indikator}
                                                            </td>
                                                            <td className="border-r border-slate-200 dark:border-slate-700 px-2 py-2 text-center text-slate-600 dark:text-slate-300">
                                                                {ind.satuan}
                                                            </td>
                                                            <td className="border-r border-slate-200 dark:border-slate-700 px-2 py-2 text-right font-mono">
                                                                {formatNumberId(ind.target)}
                                                            </td>
                                                            <td className="border-r border-slate-200 dark:border-slate-700 px-2 py-2 text-right font-mono">
                                                                {formatNumberId(ind.realisasi)}
                                                            </td>
                                                            <td className={`border-r border-slate-200 dark:border-slate-700 px-2 py-2 text-right font-mono font-semibold ${
                                                                ind.capaian_pk < 0 ? 'text-rose-600' : 'text-slate-800 dark:text-slate-200'
                                                            }`}>
                                                                {formatPercentId(ind.capaian_pk)}
                                                            </td>
                                                            <td className={`border-r border-slate-200 dark:border-slate-700 px-2 py-2 text-right font-mono font-semibold ${
                                                                ind.normalisasi_capaian < 0 ? 'text-rose-600' : 'text-slate-800 dark:text-slate-200'
                                                            }`}>
                                                                {formatPercentId(ind.normalisasi_capaian)}
                                                            </td>
                                                            <td className="border-r border-slate-200 dark:border-slate-700 px-2 py-2 text-right font-mono text-slate-600 dark:text-slate-400">
                                                                {formatPercentId(ind.koreksi_akip, 0)}
                                                            </td>
                                                            <td className={`border-r border-slate-200 dark:border-slate-700 px-3 py-2 text-right font-mono font-bold text-sm ${
                                                                ind.nilai_akhir < 0 ? 'text-rose-600' : 'text-blue-600 dark:text-blue-400'
                                                            }`}>
                                                                {formatPercentId(ind.nilai_akhir)}
                                                            </td>
                                                            {canManagePko && (
                                                                <td className="px-2 py-2 text-center">
                                                                    <div className="flex items-center justify-center gap-1">
                                                                        <button
                                                                            onClick={() => openPkoModal(pkoSubTab, ind)}
                                                                            className="p-1 text-slate-500 hover:text-blue-600 rounded transition"
                                                                            title="Edit Indikator"
                                                                        >
                                                                            <Pencil className="h-3.5 w-3.5" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => deletePkoIndicator(ind.id)}
                                                                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                                                                            title="Hapus Indikator"
                                                                        >
                                                                            <Trash2 className="h-3.5 w-3.5" />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ))
                                                )}

                                                {/* Summary Rows */}
                                                {currentPko && currentPko.indicators.length > 0 && (
                                                    <>
                                                        <tr className="bg-slate-50 dark:bg-slate-800/80 font-bold border-t-2 border-slate-300 dark:border-slate-700">
                                                            <td colSpan={canManagePko ? 9 : 8} className="border-r border-slate-200 dark:border-slate-700 px-4 py-2 text-left uppercase text-slate-800 dark:text-slate-200">
                                                                Total Capaian PK
                                                            </td>
                                                            <td className="border-r border-slate-200 dark:border-slate-700 px-3 py-2 text-right font-mono text-sm font-black text-blue-700 dark:text-blue-400">
                                                                {formatPercentId(currentPko.total_capaian_pk)}
                                                            </td>
                                                            {canManagePko && <td className="px-2 py-2"></td>}
                                                        </tr>
                                                        <tr className="bg-slate-50 dark:bg-slate-800/80 font-bold border-t border-slate-200 dark:border-slate-700">
                                                            <td colSpan={canManagePko ? 9 : 8} className="border-r border-slate-200 dark:border-slate-700 px-4 py-2 text-left uppercase text-slate-800 dark:text-slate-200">
                                                                Nilai Kinerja Organisasi (NKO)
                                                            </td>
                                                            <td className="border-r border-slate-200 dark:border-slate-700 px-3 py-2 text-right font-mono text-sm font-black text-indigo-700 dark:text-indigo-400">
                                                                {formatPercentId(currentPko.nko)}
                                                            </td>
                                                            {canManagePko && <td className="px-2 py-2"></td>}
                                                        </tr>
                                                        <tr className="bg-slate-50 dark:bg-slate-800/80 font-bold border-t border-slate-200 dark:border-slate-700">
                                                            <td colSpan={canManagePko ? 9 : 8} className="border-r border-slate-200 dark:border-slate-700 px-4 py-2.5 text-left uppercase text-slate-800 dark:text-slate-200">
                                                                Predikat PKO
                                                            </td>
                                                            <td className="border-r border-slate-200 dark:border-slate-700 px-3 py-2.5 text-right">
                                                                {getPkoPredikatBadge(currentPko.predikat)}
                                                            </td>
                                                            {canManagePko && <td className="px-2 py-2.5"></td>}
                                                        </tr>
                                                    </>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Keterangan Nilai & Rumus Klasifikasi Predikat PKO */}
                            <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
                                <CardHeader
                                    className="py-3 px-5 cursor-pointer hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition flex flex-row items-center justify-between"
                                    onClick={() => setShowGuide(!showGuide)}
                                >
                                    <div className="flex items-center gap-2">
                                        <Info className="h-4 w-4 text-blue-600" />
                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                                            Keterangan Klasifikasi Predikat Nilai Kinerja Organisasi (PKO / NKO)
                                        </span>
                                    </div>
                                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${showGuide ? 'rotate-180' : ''}`} />
                                </CardHeader>

                                {showGuide && (
                                    <CardContent className="p-5 border-t border-slate-200 dark:border-slate-800 space-y-5 text-xs text-slate-700 dark:text-slate-300">
                                        {/* Formula & Pengisian Normalisasi */}
                                        <div className="space-y-1">
                                            <p className="font-bold text-slate-900 dark:text-white">
                                                1. Batas Maksimum Normalisasi Capaian:
                                            </p>
                                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                                Nilai capaian perjanjian kinerja dinormalisasi dengan batas maksimum 110 persen (capaian PK di atas 110% dibatasi maksimal 110%):
                                            </p>
                                            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded font-mono text-center font-bold text-slate-900 dark:text-white">
                                                N<sub>i</sub> = min(Capaian PK, 110%) &nbsp;|&nbsp; NKO = &Sigma; Nilai Akhir &divide; Jumlah Indikator
                                            </div>
                                        </div>

                                        {/* Koreksi Capaian Perjanjian Kinerja Berdasarkan Predikat AKIP */}
                                        <div className="space-y-2">
                                            <p className="font-bold text-slate-900 dark:text-white">
                                                2. Koreksi Capaian Perjanjian Kinerja Berdasarkan Predikat Akuntabilitas Kinerja Instansi Pemerintah:
                                            </p>
                                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                                Pengisian Koreksi AKIP (2) ditentukan berdasarkan Predikat Akuntabilitas Kinerja Instansi Pemerintah (AKIP) yang diperoleh. Nilai akhir capaian dihitung setelah memperhitungkan persentase koreksi:
                                            </p>
                                            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded font-mono text-center font-bold text-slate-900 dark:text-white">
                                                Nilai Akhir Capaian PK (3) = Normalisasi Capaian PK (1) &times; (1 &minus; Koreksi AKIP (2))
                                            </div>
                                            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700 max-w-xl">
                                                <table className="w-full text-left text-xs border-collapse">
                                                    <thead className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                                                        <tr>
                                                            <th className="px-4 py-2 text-center w-44 border-r border-slate-200 dark:border-slate-700">Predikat AKIP</th>
                                                            <th className="px-4 py-2 text-center">Koreksi Capaian PK setelah Normalisasi</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-xs">
                                                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                            <td className="px-4 py-2 text-center border-r border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white">
                                                                <span className="inline-flex px-2.5 py-0.5 rounded text-xs font-black bg-emerald-700 text-white">AA</span>
                                                            </td>
                                                            <td className="px-4 py-2 text-center font-mono font-bold text-slate-800 dark:text-slate-200">0%</td>
                                                        </tr>
                                                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                            <td className="px-4 py-2 text-center border-r border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white">
                                                                <span className="inline-flex px-2.5 py-0.5 rounded text-xs font-black bg-emerald-600 text-white">A</span>
                                                            </td>
                                                            <td className="px-4 py-2 text-center font-mono font-bold text-slate-800 dark:text-slate-200">0%</td>
                                                        </tr>
                                                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                            <td className="px-4 py-2 text-center border-r border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white">
                                                                <span className="inline-flex px-2.5 py-0.5 rounded text-xs font-black bg-blue-600 text-white">BB</span>
                                                            </td>
                                                            <td className="px-4 py-2 text-center font-mono font-bold text-slate-800 dark:text-slate-200">10%</td>
                                                        </tr>
                                                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                            <td className="px-4 py-2 text-center border-r border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white">
                                                                <span className="inline-flex px-2.5 py-0.5 rounded text-xs font-black bg-sky-600 text-white">B</span>
                                                            </td>
                                                            <td className="px-4 py-2 text-center font-mono font-bold text-slate-800 dark:text-slate-200">15%</td>
                                                        </tr>
                                                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                            <td className="px-4 py-2 text-center border-r border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white">
                                                                <span className="inline-flex px-2.5 py-0.5 rounded text-xs font-black bg-amber-400 text-slate-950">CC</span>
                                                            </td>
                                                            <td className="px-4 py-2 text-center font-mono font-bold text-slate-800 dark:text-slate-200">20%</td>
                                                        </tr>
                                                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                            <td className="px-4 py-2 text-center border-r border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white">
                                                                <span className="inline-flex px-2.5 py-0.5 rounded text-xs font-black bg-orange-500 text-white">C</span>
                                                            </td>
                                                            <td className="px-4 py-2 text-center font-mono font-bold text-slate-800 dark:text-slate-200">30%</td>
                                                        </tr>
                                                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                            <td className="px-4 py-2 text-center border-r border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-white">
                                                                <span className="inline-flex px-2.5 py-0.5 rounded text-xs font-black bg-rose-700 text-white">D</span>
                                                            </td>
                                                            <td className="px-4 py-2 text-center font-mono font-bold text-slate-800 dark:text-slate-200">30%</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Tabel Rentang Predikat PKO */}
                                        <div className="space-y-2">
                                            <p className="font-bold text-slate-900 dark:text-white">
                                                3. Tabel Klasifikasi Predikat Nilai Kinerja Organisasi (NKO):
                                            </p>
                                            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                                                <table className="w-full text-left text-xs border-collapse">
                                                    <thead className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                                                        <tr>
                                                            <th className="px-4 py-2 text-center w-52 border-r border-slate-200 dark:border-slate-700">Rentang Nilai Kinerja (NKO)</th>
                                                            <th className="px-4 py-2 text-center w-36 border-r border-slate-200 dark:border-slate-700">Predikat PKO</th>
                                                            <th className="px-4 py-2">Keterangan Evaluasi Capaian Kinerja</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-xs">
                                                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                            <td className="px-4 py-2 text-center font-mono font-bold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700">X &gt; 100% (hingga 110%)</td>
                                                            <td className="px-4 py-2 text-center border-r border-slate-200 dark:border-slate-700"><span className="inline-flex px-2.5 py-0.5 rounded text-xs font-black bg-blue-600 text-white">ISTIMEWA</span></td>
                                                            <td className="px-4 py-2 font-semibold text-blue-800 dark:text-blue-300">Istimewa (Pencapaian melampaui target yang diperjanjikan)</td>
                                                        </tr>
                                                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                            <td className="px-4 py-2 text-center font-mono font-bold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700">80% &lt; X &le; 100%</td>
                                                            <td className="px-4 py-2 text-center border-r border-slate-200 dark:border-slate-700"><span className="inline-flex px-2.5 py-0.5 rounded text-xs font-black bg-emerald-600 text-white">BAIK</span></td>
                                                            <td className="px-4 py-2 font-semibold text-emerald-700 dark:text-emerald-400">Baik (Pencapaian memenuhi target secara optimal)</td>
                                                        </tr>
                                                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                            <td className="px-4 py-2 text-center font-mono font-bold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700">60% &lt; X &le; 80%</td>
                                                            <td className="px-4 py-2 text-center border-r border-slate-200 dark:border-slate-700"><span className="inline-flex px-2.5 py-0.5 rounded text-xs font-black bg-amber-400 text-slate-950">BUTUH PERBAIKAN</span></td>
                                                            <td className="px-4 py-2 font-semibold text-amber-700 dark:text-amber-400">Butuh Perbaikan (Pencapaian cukup, perlu langkah akselerasi dan evaluasi)</td>
                                                        </tr>
                                                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                            <td className="px-4 py-2 text-center font-mono font-bold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700">20% &lt; X &le; 60%</td>
                                                            <td className="px-4 py-2 text-center border-r border-slate-200 dark:border-slate-700"><span className="inline-flex px-2.5 py-0.5 rounded text-xs font-black bg-orange-500 text-white">KURANG</span></td>
                                                            <td className="px-4 py-2 font-semibold text-orange-700 dark:text-orange-400">Kurang (Pencapaian di bawah target yang diharapkan)</td>
                                                        </tr>
                                                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                            <td className="px-4 py-2 text-center font-mono font-bold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700">0% &le; X &le; 20% / Minus (&lt; 0)</td>
                                                            <td className="px-4 py-2 text-center border-r border-slate-200 dark:border-slate-700"><span className="inline-flex px-2.5 py-0.5 rounded text-xs font-black bg-rose-700 text-white">SANGAT KURANG</span></td>
                                                            <td className="px-4 py-2 font-semibold text-rose-700 dark:text-rose-400">Sangat Kurang (Realisasi kinerja sangat rendah atau di bawah standar)</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </CardContent>
                                )}
                            </Card>

                        </div>
                    )}

                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                MODAL 1: FORM INPUT / EDIT SAKIP (CRUD)
            ═══════════════════════════════════════════════════════════════ */}
            <Dialog open={sakipModalOpen} onOpenChange={setSakipModalOpen}>
                <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <Award className="h-5 w-5 text-primary" />
                            Input / Edit Nilai SAKIP — Tahun {selectedYear}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Isi nilai 4 komponen akuntabilitas kinerja untuk instansi terpilih. Nilai dan predikat dihitung otomatis.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submitSakip} className="space-y-4 pt-1">
                        <div className="space-y-1">
                            <Label className="text-xs font-semibold">Pilih Instansi / Perangkat Daerah</Label>
                            <Select2
                                value={editingOrgId}
                                onChange={(val) => {
                                    const id = Number(val);
                                    setEditingOrgId(id);
                                    if (id === sakip_pemda.organization_id) {
                                        setEditingOrgName(sakip_pemda.organization_name);
                                        setSakipPerencanaan(sakip_pemda.perencanaan);
                                        setSakipPengukuran(sakip_pemda.pengukuran);
                                        setSakipPelaporan(sakip_pemda.pelaporan);
                                        setSakipEvaluasiInternal(sakip_pemda.evaluasi_internal);
                                        setSakipStatus(sakip_pemda.status_evaluasi || 'Final');
                                    } else {
                                        const opdItem = sakip_opd.find((o) => o.organization_id === id);
                                        setEditingOrgName(opdItem?.organization_name || '');
                                        setSakipPerencanaan(opdItem?.perencanaan || 0);
                                        setSakipPengukuran(opdItem?.pengukuran || 0);
                                        setSakipPelaporan(opdItem?.pelaporan || 0);
                                        setSakipEvaluasiInternal(opdItem?.evaluasi_internal || 0);
                                        setSakipStatus(opdItem?.status_evaluasi || 'Final');
                                    }
                                }}
                                options={[
                                    ...(can_manage_pemda ? [{ value: sakip_pemda.organization_id, label: 'Pemerintah Provinsi (Pemda)' }] : []),
                                    ...organizations.map((org) => ({
                                        value: org.id,
                                        label: `${org.code} - ${org.name}`,
                                    })),
                                ]}
                                placeholder="Pilih Instansi..."
                                searchPlaceholder="Cari instansi / OPD..."
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">Perencanaan Kinerja (Maks 30)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="30"
                                    value={sakipPerencanaan}
                                    onChange={(e) => setSakipPerencanaan(Number(e.target.value))}
                                    required
                                    className="font-mono text-sm"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">Pengukuran Kinerja (Maks 30)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="30"
                                    value={sakipPengukuran}
                                    onChange={(e) => setSakipPengukuran(Number(e.target.value))}
                                    required
                                    className="font-mono text-sm"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">Pelaporan Kinerja (Maks 15)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="15"
                                    value={sakipPelaporan}
                                    onChange={(e) => setSakipPelaporan(Number(e.target.value))}
                                    required
                                    className="font-mono text-sm"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">Evaluasi Internal (Maks 25)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="25"
                                    value={sakipEvaluasiInternal}
                                    onChange={(e) => setSakipEvaluasiInternal(Number(e.target.value))}
                                    required
                                    className="font-mono text-sm"
                                />
                            </div>
                        </div>

                        <p className="text-[11px] text-muted-foreground bg-slate-100 dark:bg-slate-800/60 p-2.5 rounded border border-slate-200 dark:border-slate-700">
                            💡 <b>Bobot Permenpan RB:</b> Total akumulasi maksimal 100 poin (Perencanaan: 30, Pengukuran: 30, Pelaporan: 15, Evaluasi Internal: 25). Gunakan tanda titik <code>.</code> untuk angka desimal (cth: <code>28.50</code>).
                        </p>

                        <div className="space-y-1">
                            <Label className="text-xs font-semibold">Status Evaluasi</Label>
                            <Select2
                                value={sakipStatus}
                                onChange={(val) => setSakipStatus(val)}
                                options={[
                                    { value: 'Final', label: 'Final' },
                                    { value: 'Draft', label: 'Draft' },
                                    { value: 'Dalam Review', label: 'Dalam Review' },
                                ]}
                                placeholder="Pilih Status"
                            />
                        </div>

                        {/* Live Calculation Preview */}
                        <div className="rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 p-3 flex items-center justify-between">
                            <div>
                                <p className="text-[11px] font-bold text-blue-800 dark:text-blue-300 uppercase">Nilai Total SAKIP</p>
                                <p className="text-xl font-black text-blue-900 dark:text-blue-200 font-mono mt-0.5">
                                    {formatNumberId(liveSakipTotal)}
                                    <span className="text-xs font-normal text-muted-foreground ml-1">/ 100</span>
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[11px] font-bold text-blue-800 dark:text-blue-300 uppercase">Predikat</p>
                                <div className="mt-0.5">
                                    {getSakipBadge(liveSakipPredikat)}
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button type="button" variant="outline" onClick={() => setSakipModalOpen(false)}>
                                Batal
                            </Button>
                            <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
                                Simpan Nilai SAKIP
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ═══════════════════════════════════════════════════════════════
                MODAL 2: UPLOAD DOKUMEN LHE
            ═══════════════════════════════════════════════════════════════ */}
            <Dialog open={lheModalOpen} onOpenChange={setLheModalOpen}>
                <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <Upload className="h-5 w-5 text-primary" />
                            Upload Dokumen LHE
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Unggah berkas Laporan Hasil Evaluasi (LHE) untuk <strong>{lheTargetOrg?.name}</strong> tahun {selectedYear}.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submitLhe} className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Pilih Berkas Dokumen (PDF, DOC, DOCX maks 20MB)</Label>
                            <Input
                                type="file"
                                accept=".pdf,.doc,.docx"
                                onChange={(e) => setLheFile(e.target.files?.[0] || null)}
                                required
                                className="text-xs"
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setLheModalOpen(false)}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={isUploadingLhe || !lheFile} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
                                {isUploadingLhe ? 'Mengunggah...' : 'Upload Dokumen'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ═══════════════════════════════════════════════════════════════
                MODAL 3: FORM TAMBAH / EDIT INDIKATOR PKO (CRUD)
            ═══════════════════════════════════════════════════════════════ */}
            <Dialog open={pkoModalOpen} onOpenChange={setPkoModalOpen}>
                <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <Target className="h-5 w-5 text-primary" />
                            {editingPkoIndicator ? 'Edit' : 'Tambah'} Indikator Kinerja Organisasi (PKO)
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Instansi: <strong>{pkoTargetType === 'pemda' ? 'Pemerintah Daerah' : selectedOpdObj?.name}</strong> (Tahun {selectedYear}).
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submitPkoIndicator} className="space-y-3.5 pt-1">
                        <div className="space-y-1">
                            <Label className="text-xs font-semibold">Tujuan / Sasaran</Label>
                            <Input
                                type="text"
                                value={pkoSasaran}
                                onChange={(e) => setPkoSasaran(e.target.value)}
                                placeholder="Contoh: Meningkatnya nilai investasi daerah"
                                required
                                className="text-xs"
                            />
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-semibold">Indikator Kinerja</Label>
                            <Input
                                type="text"
                                value={pkoIndikator}
                                onChange={(e) => setPkoIndikator(e.target.value)}
                                placeholder="Contoh: Persentase peningkatan investasi..."
                                required
                                className="text-xs"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">Satuan</Label>
                                <Input
                                    type="text"
                                    value={pkoSatuan}
                                    onChange={(e) => setPkoSatuan(e.target.value)}
                                    placeholder="Persen / Rp Triliun"
                                    required
                                    className="text-xs"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">Target</Label>
                                <Input
                                    type="number"
                                    step="any"
                                    value={pkoTarget}
                                    onChange={(e) => setPkoTarget(Number(e.target.value))}
                                    required
                                    className="text-xs font-mono"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">Realisasi</Label>
                                <Input
                                    type="number"
                                    step="any"
                                    value={pkoRealisasi}
                                    onChange={(e) => setPkoRealisasi(Number(e.target.value))}
                                    required
                                    className="text-xs font-mono"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
                                <Label className="text-xs font-semibold">Koreksi AKIP (2) (%)</Label>
                                <span className="text-[10px] sm:text-[11px] text-slate-500 italic">
                                    Sesuaikan manual
                                </span>
                            </div>
                            <Input
                                type="number"
                                step="any"
                                min="0"
                                max="100"
                                value={pkoKoreksiManual}
                                onChange={(e) => setPkoKoreksiManual(e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="Contoh: 20"
                                className="text-xs font-mono"
                            />
                        </div>

                        {/* Live Calculation Preview */}
                        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3 space-y-1.5 text-xs">
                            <p className="font-bold text-slate-800 dark:text-slate-200 text-[11px] uppercase border-b border-slate-200 dark:border-slate-800 pb-1">
                                Hasil Perhitungan Otomatis:
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
                                <div>Capaian PK (%): <span className="font-mono font-bold">{formatPercentId(liveCapaian)}</span></div>
                                <div>Normalisasi (maks 110%): <span className="font-mono font-bold">{formatPercentId(liveNormalisasi)}</span></div>
                                <div>Koreksi AKIP: <span className="font-mono font-bold">{formatPercentId(liveKoreksi, 0)}</span></div>
                                <div>Nilai Akhir Capaian: <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{formatPercentId(liveNilaiAkhir)}</span></div>
                            </div>
                        </div>

                        <p className="text-[11px] text-muted-foreground bg-slate-100 dark:bg-slate-800/60 p-2.5 rounded border border-slate-200 dark:border-slate-700">
                            💡 <b>Aturan PKO:</b> Capaian PK dihitung dari Realisasi / Target × 100%. Batas normalisasi maksimal 110%. Nilai akhir dihitung setelah dikurangi Koreksi AKIP. Gunakan tanda titik <code>.</code> untuk angka desimal.
                        </p>

                        <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
                            <Button type="button" variant="outline" onClick={() => setPkoModalOpen(false)}>
                                Batal
                            </Button>
                            <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
                                Simpan Indikator
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* AlertDialog - Hapus Evaluasi SAKIP */}
            <AlertDialog open={isDeleteSakipOpen} onOpenChange={setIsDeleteSakipOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Data Evaluasi SAKIP?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Apakah Anda yakin ingin menghapus data evaluasi SAKIP ini? Semua nilai akan direset dan tindakan ini tidak dapat dibatalkan.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteSakip} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Hapus
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* AlertDialog - Hapus Indikator PKO */}
            <AlertDialog open={isDeletePkoOpen} onOpenChange={setIsDeletePkoOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Indikator PKO?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Apakah Anda yakin ingin menghapus indikator PKO ini? Tindakan ini tidak dapat dibatalkan.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeletePko} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Hapus
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </AuthenticatedLayout>
    );
}