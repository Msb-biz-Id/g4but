import React, { useState, useEffect } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Textarea } from '@/Components/ui/textarea';
import { Label } from '@/Components/ui/label';
import { SelectNative } from '@/Components/ui/select-native';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import { ChevronRight, ChevronLeft, Check, AlertCircle, ArrowLeft, Target, FileText, CheckCircle2 } from 'lucide-react';
import { PageBreadcrumb } from '@/Components/Dashboard/PageBreadcrumb';
import axios from 'axios';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Period    { id: number; name: string; start_year: number; end_year: number; }
interface Org       { id: number; code: string; name: string; }
interface Unit      { id: number; name: string; symbol: string; }
interface Officer   { id: number; name: string; }
interface Goal      { id: number; name: string; code?: string; }
interface Objective { id: number; name: string; code?: string; }

interface IkuData {
    id?: number;
    level: string; planning_period_id: string; owner_organization_id: string;
    strategic_goal_id: string; strategic_objective_id: string;
    name: string; measurement_unit_id: string;
    definition: string; formula_notes: string;
    baseline_year: string; baseline_value?: string; baseline_note: string; polarization: string;
    data_source: string; frequency: string; responsible_officer_id: string;
    targets: { year: number; target_value: string }[];
}

interface Props {
    iku?: IkuData;
    periods: Period[]; organizations: Org[]; units: Unit[]; officers: Officer[];
    goals?: Goal[]; objectives?: Objective[];
    levelOptions: { value: string; label: string }[];
    polarizationOptions: { value: string; label: string }[];
    frequencyOptions: { value: string; label: string }[];
    isAdminOpd?: boolean;
    userOpdId?: number | null;
}

// ── Step Indicators ────────────────────────────────────────────────────────────

const STEPS = [
    { title: 'Identitas', desc: 'OPD, Sasaran & Nama' },
    { title: 'Metadata', desc: 'Definisi & Formula' },
    { title: 'Target', desc: 'Target Capaian Tahunan' },
    { title: 'Konfirmasi', desc: 'Validasi Akhir' },
];

function StepIndicator({ current }: { current: number }) {
    return (
        <div className="w-full mb-8">
            <div className="flex items-center justify-between max-w-2xl mx-auto">
                {STEPS.map((stepItem, i) => (
                    <React.Fragment key={i}>
                        <div className="flex flex-col items-center relative group">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all duration-200
                                ${i < current 
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : i === current 
                                        ? 'bg-primary text-primary-foreground shadow-md ring-4 ring-primary/20 scale-105'
                                        : 'bg-muted text-muted-foreground border border-border'}`}>
                                {i < current ? <Check className="h-5 w-5 stroke-[2.5]" /> : i + 1}
                            </div>
                            <div className="text-center mt-2">
                                <span className={`text-xs font-semibold block transition-colors
                                    ${i === current ? 'text-primary' : i < current ? 'text-foreground' : 'text-muted-foreground'}`}>
                                    {stepItem.title}
                                </span>
                                <span className="hidden sm:block text-[11px] text-muted-foreground">
                                    {stepItem.desc}
                                </span>
                            </div>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div className={`flex-1 h-0.5 mx-2 -mt-6 transition-all duration-300
                                ${i < current ? 'bg-emerald-500' : 'bg-muted'}`} />
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
}

// ── Error display ──────────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
    if (!message) return null;
    return <p className="mt-1 flex items-center gap-1 text-xs text-destructive"><AlertCircle className="h-3 w-3" />{message}</p>;
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function IkuCreate({ iku, periods, organizations, units, officers,
    goals: initGoals = [], objectives: initObjectives = [],
    levelOptions, polarizationOptions, frequencyOptions,
    isAdminOpd = false, userOpdId = null }: Props) {

    const isEdit = !!iku?.id;
    const [step, setStep] = useState(0);
    const [goals, setGoals] = useState<Goal[]>(initGoals);
    const [objectives, setObjectives] = useState<Objective[]>(initObjectives);
    const [years, setYears] = useState<number[]>([]);

    const { data, setData, post, put, errors, processing } = useForm<IkuData>({
        level: iku?.level ?? 'perangkat_daerah',
        planning_period_id: iku?.planning_period_id?.toString() ?? '',
        owner_organization_id: iku?.owner_organization_id?.toString() ?? (isAdminOpd && userOpdId ? String(userOpdId) : ''),
        strategic_goal_id: iku?.strategic_goal_id?.toString() ?? '',
        strategic_objective_id: iku?.strategic_objective_id?.toString() ?? '',
        name: iku?.name ?? '',
        measurement_unit_id: iku?.measurement_unit_id?.toString() ?? '',
        definition: iku?.definition ?? '',
        formula_notes: iku?.formula_notes ?? '',
        baseline_year: iku?.baseline_year?.toString() ?? '',
        baseline_value: (iku as any)?.baseline_value?.toString() ?? '',
        baseline_note: iku?.baseline_note ?? '',
        polarization: iku?.polarization ?? '',
        data_source: iku?.data_source ?? '',
        frequency: iku?.frequency ?? '',
        responsible_officer_id: iku?.responsible_officer_id?.toString() ?? '',
        targets: iku?.targets ?? [],
    });

    // Admin OPD: auto-lock OPD saat form dibuka
    useEffect(() => {
        if (isAdminOpd && userOpdId && !data.owner_organization_id) {
            setData('owner_organization_id', String(userOpdId));
        }
    }, [isAdminOpd, userOpdId]);

    // Fetch goals when period/level/org changes
    useEffect(() => {
        if (!data.planning_period_id) { setGoals([]); setObjectives([]); return; }
        axios.get('/api/v1/iku/goals', { params: {
            period_id: data.planning_period_id,
            level: data.level,
            org_id: data.level === 'perangkat_daerah' ? data.owner_organization_id : undefined,
        }}).then(r => setGoals(r.data.data)).catch(() => setGoals([]));
    }, [data.planning_period_id, data.level, data.owner_organization_id]);

    // Fetch objectives when goal changes
    useEffect(() => {
        if (!data.strategic_goal_id) { setObjectives([]); return; }
        axios.get('/api/v1/iku/objectives', { params: { goal_id: data.strategic_goal_id } })
            .then(r => setObjectives(r.data.data)).catch(() => setObjectives([]));
    }, [data.strategic_goal_id]);

    // Fetch years for target step when period changes
    useEffect(() => {
        if (!data.planning_period_id) { setYears([]); return; }
        axios.get('/api/v1/iku/period-years', { params: { period_id: data.planning_period_id } })
            .then(r => {
                const y: number[] = r.data.data;
                setYears(y);
                if (data.targets.length === 0 || data.targets.length !== y.length) {
                    setData('targets', y.map(yr => ({ year: yr, target_value: '' })));
                }
            }).catch(() => setYears([]));
    }, [data.planning_period_id]);

    function updateTarget(index: number, value: string) {
        const t = [...data.targets];
        t[index] = { ...t[index], target_value: value };
        setData('targets', t);
    }

    function submit() {
        if (isEdit) {
            put(route('planning.iku.update', iku!.id));
        } else {
            post(route('planning.iku.store'));
        }
    }

    // Data for Step 4 Confirmation
    const period   = periods.find(p => p.id.toString() === data.planning_period_id);
    const org      = organizations.find(o => o.id.toString() === data.owner_organization_id);
    const goal     = goals.find(g => g.id.toString() === data.strategic_goal_id);
    const obj      = objectives.find(o => o.id.toString() === data.strategic_objective_id);
    const unit     = units.find(u => u.id.toString() === data.measurement_unit_id);
    const polLabel = polarizationOptions.find(p => p.value === data.polarization)?.label ?? '-';
    const freqLabel= frequencyOptions.find(f => f.value === data.frequency)?.label ?? '-';

    const confirmationRows: [string, string][] = [
        ['Periode',        period ? (period.name ?? `${period.start_year}–${period.end_year}`) : '-'],
        ['Level',          data.level === 'pemda' ? 'Pemerintah Daerah' : 'Perangkat Daerah'],
        ['OPD',            org?.name ?? (data.level === 'pemda' ? '(Pemda)' : '-')],
        ['Tujuan',         goal?.name ?? '-'],
        ['Sasaran',        obj?.name ?? '-'],
        ['Nama Indikator', data.name || '-'],
        ['Satuan',         unit ? `${unit.name} (${unit.symbol})` : '-'],
        ['Def. Operasional', data.definition || '-'],
        ['Formula/Rumus',  data.formula_notes || '-'],
        ['Baseline',       data.baseline_value ? `${data.baseline_value} (${data.baseline_year || '-'})` : (data.baseline_year || '-')],
        ['Polarisasi',     polLabel],
        ['Sumber Data',    data.data_source || '-'],
        ['Frekuensi',      freqLabel],
    ];

    return (
        <AuthenticatedLayout header={
            <div className="flex items-center gap-3">
                <Link href={route('planning.iku.index')}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-foreground">
                        {isEdit ? 'Edit Indikator Kinerja Utama' : 'Tambah IKU Baru'}
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {isEdit ? 'Perbarui data dan target indikator kinerja' : 'Lengkapi tahapan formulir berikut untuk mendaftarkan IKU baru'}
                    </p>
                </div>
            </div>
        }>
            <Head title={isEdit ? 'Edit IKU' : 'Tambah IKU'} />

            <div className="py-6 space-y-6">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                    {/* Breadcrumb */}
                    <div className="mb-6">
                        <PageBreadcrumb items={[
                            { label: 'Perencanaan', href: route('planning.iku.index') },
                            { label: 'Indikator Kinerja Utama', href: route('planning.iku.index') },
                            { label: isEdit ? 'Edit IKU' : 'Tambah Baru' },
                        ]} />
                    </div>

                    <Card className="border border-border/80 shadow-sm bg-card rounded-xl">
                        <CardHeader className="border-b border-border/60 pb-6">
                            <CardTitle className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                                <Target className="h-5 w-5 text-primary" />
                                {isEdit ? 'Formulir Pembaruan IKU' : 'Formulir Pendaftaran IKU Multi-Tahap'}
                            </CardTitle>
                            <CardDescription className="text-xs text-muted-foreground">
                                Tahap {step + 1} dari {STEPS.length}: {STEPS[step].title} - {STEPS[step].desc}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-8">
                            <StepIndicator current={step} />

                            <div className="min-h-[320px]">
                                {/* ── Step 1: Identitas ── */}
                                {step === 0 && (
                                    <div className="space-y-5">
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            {/* Periode */}
                                            <div>
                                                <Label>Periode <span className="text-red-500">*</span></Label>
                                                <SelectNative value={data.planning_period_id} onChange={e => setData('planning_period_id', e.target.value)}>
                                                    <option value="">-- Pilih Periode --</option>
                                                    {periods.map(p => <option key={p.id} value={p.id}>{p.name ?? `${p.start_year}–${p.end_year}`}</option>)}
                                                </SelectNative>
                                                <FieldError message={errors.planning_period_id} />
                                            </div>

                                            {/* Level */}
                                            <div>
                                                <Label>Level IKU <span className="text-red-500">*</span></Label>
                                                <SelectNative value={data.level} onChange={e => { setData('level', e.target.value); setData('owner_organization_id', ''); }}>
                                                    {levelOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                                </SelectNative>
                                                <FieldError message={errors.level} />
                                            </div>

                                            {/* OPD - hanya untuk Perangkat Daerah */}
                                            {data.level === 'perangkat_daerah' && (
                                                <div className="sm:col-span-2">
                                                    <Label>Perangkat Daerah <span className="text-red-500">*</span></Label>
                                                    {isAdminOpd ? (
                                                        <div className="mt-1 flex items-center gap-2 rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
                                                            <span className="flex-1">
                                                                {organizations.find(o => String(o.id) === String(data.owner_organization_id))?.name ?? 'OPD Anda'}
                                                            </span>
                                                            <span className="text-[11px] bg-amber-100 text-amber-700 border border-amber-300 rounded px-1.5 py-0.5 font-medium">🔒 Terkunci</span>
                                                        </div>
                                                    ) : (
                                                        <SelectNative value={data.owner_organization_id} onChange={e => setData('owner_organization_id', e.target.value)}>
                                                            <option value="">-- Pilih OPD --</option>
                                                            {organizations.map(o => <option key={o.id} value={o.id}>{o.code} - {o.name}</option>)}
                                                        </SelectNative>
                                                    )}
                                                    <FieldError message={errors.owner_organization_id} />
                                                </div>
                                            )}

                                            {/* Tujuan */}
                                            <div>
                                                <Label>Tujuan <span className="text-red-500">*</span></Label>
                                                <SelectNative
                                                    value={data.strategic_goal_id}
                                                    onChange={e => { setData('strategic_goal_id', e.target.value); setData('strategic_objective_id', ''); }}
                                                    disabled={goals.length === 0}
                                                >
                                                    <option value="">
                                                        {!data.planning_period_id
                                                            ? '-- Pilih periode dulu --'
                                                            : (data.level === 'perangkat_daerah' && !data.owner_organization_id
                                                                ? '-- Pilih OPD dulu --'
                                                                : (goals.length === 0 ? '-- Belum ada data tujuan --' : '-- Pilih Tujuan --'))}
                                                    </option>
                                                    {goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                                </SelectNative>
                                                <FieldError message={errors.strategic_goal_id} />
                                            </div>

                                            {/* Sasaran */}
                                            <div>
                                                <Label>Sasaran <span className="text-red-500">*</span></Label>
                                                <SelectNative
                                                    value={data.strategic_objective_id}
                                                    onChange={e => setData('strategic_objective_id', e.target.value)}
                                                    disabled={objectives.length === 0}
                                                >
                                                    <option value="">
                                                        {!data.strategic_goal_id
                                                            ? '-- Pilih tujuan dulu --'
                                                            : (objectives.length === 0 ? '-- Belum ada data sasaran --' : '-- Pilih Sasaran --')}
                                                    </option>
                                                    {objectives.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                                                </SelectNative>
                                                <FieldError message={errors.strategic_objective_id} />
                                            </div>

                                            {/* Nama Indikator (free-text) */}
                                            <div className="sm:col-span-2">
                                                <Label>Nama Indikator <span className="text-red-500">*</span></Label>
                                                <Input value={data.name} onChange={e => setData('name', e.target.value)} placeholder="Contoh: Angka Partisipasi Kasar (APK) SMA" />
                                                <FieldError message={errors.name} />
                                            </div>

                                            {/* Satuan */}
                                            <div>
                                                <Label>Satuan <span className="text-red-500">*</span></Label>
                                                <SelectNative value={data.measurement_unit_id} onChange={e => setData('measurement_unit_id', e.target.value)}>
                                                    <option value="">-- Pilih Satuan --</option>
                                                    {units.map(u => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
                                                </SelectNative>
                                                <FieldError message={errors.measurement_unit_id} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ── Step 2: Metadata ── */}
                                {step === 1 && (
                                    <div className="space-y-4">
                                        <div>
                                            <Label>Definisi Operasional <span className="text-red-500">*</span></Label>
                                            <Textarea rows={3} value={data.definition} onChange={e => setData('definition', e.target.value)} placeholder="Jelaskan secara jelas apa yang diukur oleh indikator ini..." />
                                            <FieldError message={errors.definition} />
                                        </div>
                                        <div>
                                            <Label>Formula / Rumus <span className="text-red-500">*</span></Label>
                                            <Textarea rows={2} value={data.formula_notes} onChange={e => setData('formula_notes', e.target.value)} placeholder="Contoh: (Jumlah siswa SMA / Penduduk usia 16-18) × 100" />
                                            <FieldError message={errors.formula_notes} />
                                        </div>
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                            <div>
                                                <Label>Tahun Baseline <span className="text-red-500">*</span></Label>
                                                <Input type="number" value={data.baseline_year} onChange={e => setData('baseline_year', e.target.value)} placeholder="2024" />
                                                <FieldError message={errors.baseline_year} />
                                            </div>
                                            <div>
                                                <Label>Nilai Baseline</Label>
                                                <Input type="number" step="any" value={data.baseline_value} onChange={e => setData('baseline_value', e.target.value)} placeholder="Contoh: 72.50" />
                                                <FieldError message={errors.baseline_value} />
                                            </div>
                                            <div>
                                                <Label>Polarisasi <span className="text-red-500">*</span></Label>
                                                <SelectNative value={data.polarization} onChange={e => setData('polarization', e.target.value)}>
                                                    <option value="">-- Pilih --</option>
                                                    {polarizationOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                                </SelectNative>
                                                <FieldError message={errors.polarization} />
                                            </div>
                                            <div>
                                                <Label>Frekuensi Pengukuran <span className="text-red-500">*</span></Label>
                                                <SelectNative value={data.frequency} onChange={e => setData('frequency', e.target.value)}>
                                                    <option value="">-- Pilih --</option>
                                                    {frequencyOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                                </SelectNative>
                                                <FieldError message={errors.frequency} />
                                            </div>
                                        </div>

                                        {/* Polarisasi Helper Box */}
                                        {data.polarization && (
                                            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center gap-2 text-xs text-foreground">
                                                <span className="font-semibold text-primary">Petunjuk Polarisasi:</span>
                                                {data.polarization === 'positif' && 'Semakin tinggi nilai capaian realisasi, semakin baik status kinerjanya.'}
                                                {data.polarization === 'negatif' && 'Semakin rendah nilai capaian realisasi (misal: tingkat kemiskinan/stunting), semakin baik hasilnya.'}
                                                {data.polarization === 'stabil' && 'Nilai realisasi diharapkan tepat stabil sesuai target yang ditetapkan.'}
                                            </div>
                                        )}
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <div>
                                                <Label>Sumber Data <span className="text-red-500">*</span></Label>
                                                <Input value={data.data_source} onChange={e => setData('data_source', e.target.value)} placeholder="Contoh: Dinas Pendidikan / Dapodik" />
                                                <FieldError message={errors.data_source} />
                                            </div>
                                            <div>
                                                <Label>Unit Penanggung Jawab</Label>
                                                <SelectNative value={data.responsible_officer_id} onChange={e => setData('responsible_officer_id', e.target.value)}>
                                                    <option value="">-- Pilih Pejabat --</option>
                                                    {officers.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                                                </SelectNative>
                                            </div>
                                        </div>
                                        <div>
                                            <Label>Keterangan Baseline</Label>
                                            <Textarea rows={2} value={data.baseline_note} onChange={e => setData('baseline_note', e.target.value)} placeholder="Catatan sumber atau kondisi baseline jika diperlukan (opsional)" />
                                        </div>
                                    </div>
                                )}

                                {/* ── Step 3: Target ── */}
                                {step === 2 && (
                                    <div className="space-y-3">
                                        {years.length === 0 ? (
                                            <p className="text-center text-muted-foreground py-8">Pilih periode terlebih dahulu pada Langkah 1 untuk mengisi target tahunan.</p>
                                        ) : (
                                            <>
                                                <p className="text-xs text-muted-foreground">Isi target capaian indikator secara kuantitatif untuk setiap tahun rencana pembangunan.</p>
                                                <div className="rounded-lg border border-border overflow-hidden bg-card">
                                                    <table className="w-full text-sm">
                                                        <thead className="bg-muted/50 border-b border-border">
                                                            <tr>
                                                                <th className="px-4 py-3 text-left font-semibold text-foreground text-xs uppercase tracking-wider">Tahun</th>
                                                                <th className="px-4 py-3 text-left font-semibold text-foreground text-xs uppercase tracking-wider">Target <span className="text-red-500">*</span></th>
                                                                <th className="px-4 py-3 text-left font-semibold text-foreground text-xs uppercase tracking-wider w-24">Satuan</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-border">
                                                            {data.targets.map((t, i) => (
                                                                <tr key={t.year} className="hover:bg-muted/20">
                                                                    <td className="px-4 py-2.5 font-medium text-foreground">{t.year}</td>
                                                                    <td className="px-4 py-2.5">
                                                                        <Input
                                                                            type="number"
                                                                            step="0.01"
                                                                            value={t.target_value}
                                                                            onChange={e => updateTarget(i, e.target.value)}
                                                                            placeholder="0.00"
                                                                            className="w-36 font-semibold"
                                                                        />
                                                                    </td>
                                                                    <td className="px-4 py-2.5 text-muted-foreground">{units.find(u => u.id.toString() === data.measurement_unit_id)?.symbol ?? '-'}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* ── Step 4: Konfirmasi ── */}
                                {step === 3 && (
                                    <div className="space-y-4">
                                        <p className="text-xs text-muted-foreground">Periksa kembali data di bawah ini sebelum menyimpan atau mengajukan IKU.</p>
                                        <div className="rounded-lg border border-border overflow-hidden bg-card">
                                            <table className="w-full text-sm">
                                                <tbody className="divide-y divide-border">
                                                    {confirmationRows.map(([label, value]) => (
                                                        <tr key={label}>
                                                            <td className="px-4 py-2.5 w-48 font-medium text-muted-foreground bg-muted/40 text-xs uppercase tracking-wider">{label}</td>
                                                            <td className="px-4 py-2.5 text-foreground font-medium">{value}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        {data.targets.length > 0 && (
                                            <div className="rounded-lg border border-border overflow-hidden bg-card">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-muted/50 border-b border-border">
                                                        <tr>
                                                            <th className="px-4 py-2.5 text-left font-semibold text-foreground text-xs uppercase tracking-wider">Tahun</th>
                                                            <th className="px-4 py-2.5 text-left font-semibold text-foreground text-xs uppercase tracking-wider">Target</th>
                                                            <th className="px-4 py-2.5 text-left font-semibold text-foreground text-xs uppercase tracking-wider">Satuan</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-border">
                                                        {data.targets.map(t => (
                                                            <tr key={t.year}>
                                                                <td className="px-4 py-2.5 text-foreground font-semibold">{t.year}</td>
                                                                <td className="px-4 py-2.5 text-primary font-bold">{t.target_value || '-'}</td>
                                                                <td className="px-4 py-2.5 text-muted-foreground">{unit?.symbol ?? '-'}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Navigation Buttons */}
                            <div className="mt-8 flex items-center justify-between border-t border-border pt-5">
                                {step === 0 ? (
                                    <Link href={route('planning.iku.index')}>
                                        <Button variant="outline" type="button" className="text-muted-foreground hover:text-foreground">
                                            Batal
                                        </Button>
                                    </Link>
                                ) : (
                                    <Button
                                        variant="outline"
                                        type="button"
                                        onClick={() => setStep(s => s - 1)}
                                    >
                                        <ChevronLeft className="mr-1.5 h-4 w-4" /> Sebelumnya
                                    </Button>
                                )}

                                {step < STEPS.length - 1 ? (
                                    <Button 
                                        type="button" 
                                        onClick={() => setStep(s => s + 1)}
                                        className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                                    >
                                        Selanjutnya <ChevronRight className="ml-1.5 h-4 w-4" />
                                    </Button>
                                ) : (
                                    <div className="flex gap-2.5">
                                        <Button
                                            variant="outline"
                                            type="button"
                                            onClick={submit}
                                            disabled={processing}
                                        >
                                            Simpan Draft
                                        </Button>
                                        <Button
                                            type="button"
                                            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                                            onClick={() => { setData('iku_status' as any, 'diajukan'); submit(); }}
                                            disabled={processing}
                                        >
                                            <Check className="mr-1.5 h-4 w-4" />
                                            Simpan & Ajukan
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
