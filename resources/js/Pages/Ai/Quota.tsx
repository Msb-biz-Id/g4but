import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/Dashboard/PageHeader';
import { PageProps } from '@/types';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { CheckCircle2, Settings2, XCircle, Infinity, ArrowLeft } from 'lucide-react';
import TablePagination from '@/Components/TablePagination';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface KuotaHariIni {
 kuota_maksimal: number;
 terpakai: number;
 sisa: number | null;
}

interface OrgQuotaItem {
 id: number;
 name: string;
 short_name: string;
 code: string;
 kuota_hari_ini: KuotaHariIni | null;
 kuota_default: number;
}

interface Props extends PageProps {
 organizations: OrgQuotaItem[];
 kuota_default: number;
 today: string;
}

// ─── Kuota Cell ───────────────────────────────────────────────────────────────

function KuotaStatus({ kuota, defaultVal }: { kuota: KuotaHariIni | null; defaultVal: number }) {
 if (!kuota) {
  return <span className="text-xs text-gray-400 italic">Belum ada aktivitas hari ini (default: {defaultVal}/hari)</span>;
 }
 if (kuota.kuota_maksimal === -1) {
  return (
   <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
    <Infinity className="h-3.5 w-3.5" />
    <span className="text-xs font-medium">Unlimited · {kuota.terpakai} terpakai</span>
   </div>
  );
 }
 const persen = kuota.kuota_maksimal > 0 ? Math.round((kuota.terpakai / kuota.kuota_maksimal) * 100) : 0;
 return (
  <div className="flex items-center gap-2">
   <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
    <div
     className={cn('h-full rounded-full transition-all', persen >= 100 ? 'bg-red-500' : persen >= 80 ? 'bg-amber-500' : 'bg-green-500')}
     style={{ width: `${Math.min(persen, 100)}%` }}
    />
   </div>
   <span className="text-xs text-gray-600 dark:text-gray-400">
    {kuota.terpakai}/{kuota.kuota_maksimal}
    <span className={cn('ml-1', persen >= 100 ? 'text-red-500' : 'text-gray-400')}>
     ({persen >= 100 ? 'Habis' : `sisa ${kuota.sisa}`})
    </span>
   </span>
  </div>
 );
}

// ─── Edit Row Inline ──────────────────────────────────────────────────────────

function QuotaRow({ org }: { org: OrgQuotaItem }) {
 const [editing, setEditing] = useState(false);
 const [value, setValue] = useState(
  org.kuota_hari_ini?.kuota_maksimal?.toString() ?? org.kuota_default.toString()
 );
 const [saving, setSaving] = useState(false);

 const save = () => {
  const num = parseInt(value, 10);
  if (isNaN(num) || (num < -1) || (num > 1000 && num !== -1)) return;
  setSaving(true);
  router.put(
   route('ai.quota.update', org.id),
   { kuota_maksimal: num },
   {
    preserveScroll: true,
    onSuccess: () => { setEditing(false); setSaving(false); },
    onError: () => setSaving(false),
   }
  );
 };

 return (
  <TableRow>
   <TableCell>
    <div>
     <p className="text-sm font-medium">{org.name}</p>
     <p className="text-xs text-gray-400">{org.code}</p>
    </div>
   </TableCell>
   <TableCell>
    <KuotaStatus kuota={org.kuota_hari_ini} defaultVal={org.kuota_default} />
   </TableCell>
   <TableCell className="text-right">
    {editing ? (
     <div className="flex items-center justify-end gap-2">
      <div className="flex flex-col">
       <Input
        type="number"
        value={value}
        min={-1}
        max={1000}
        onChange={(e) => setValue(e.target.value)}
        className="h-7 w-24 text-sm"
        placeholder="-1 = ∞"
        onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
        autoFocus
       />
       <span className="text-[10px] text-gray-400 mt-0.5 text-right">-1 = unlimited</span>
      </div>
      <Button size="sm" className="h-7 px-2 text-xs gap-1" onClick={save} disabled={saving}>
       <CheckCircle2 className="h-3.5 w-3.5" />
       {saving ? 'Menyimpan…' : 'Simpan'}
      </Button>
      <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => { setEditing(false); setValue(org.kuota_hari_ini?.kuota_maksimal?.toString() ?? org.kuota_default.toString()); }}>
       <XCircle className="h-3.5 w-3.5" />
      </Button>
     </div>
    ) : (
     <Button
      size="sm"
      variant="outline"
      className="h-7 px-3 text-xs gap-1"
      onClick={() => setEditing(true)}
     >
      <Settings2 className="h-3 w-3" /> Atur Kuota
     </Button>
    )}
   </TableCell>
  </TableRow>
 );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function AiQuota({ auth, organizations, kuota_default, today }: Props) {
 const props = usePage().props as { flash: { success?: string | null; error?: string | null } };
 const flash = props.flash;

 const [currentPage, setCurrentPage] = useState(1);
 const [perPage, setPerPage] = useState(25);

 const total = organizations.length;
 const lastPage = Math.max(1, Math.ceil(total / perPage));
 const safeCurrentPage = Math.min(currentPage, lastPage);
 const from = total > 0 ? (safeCurrentPage - 1) * perPage + 1 : 0;
 const to = total > 0 ? Math.min(safeCurrentPage * perPage, total) : 0;
 const paginatedOrgs = organizations.slice((safeCurrentPage - 1) * perPage, safeCurrentPage * perPage);

 const totalTerpakai = organizations.reduce((s, o) => s + (o.kuota_hari_ini?.terpakai ?? 0), 0);
 const totalKuota    = organizations.reduce((s, o) => {
  const k = o.kuota_hari_ini?.kuota_maksimal ?? kuota_default;
  return k === -1 ? s : s + k;
 }, 0);

 return (
  <AuthenticatedLayout>
   <Head title="Manajemen Kuota AI" />
   <div className="space-y-6 p-6">

    <PageHeader
     title="Manajemen Kuota AI per OPD"
     description={`Atur batas pemanggilan AI harian per OPD (MOD-AI-006, BR-AI-009) · Tanggal: ${today}`}
     breadcrumbs={[
      { label: 'Kecerdasan Buatan' },
      { label: 'Asisten AI', href: route('ai.index') },
      { label: 'Manajemen Kuota' },
     ]}
     actions={
      <Button variant="outline" size="sm" asChild>
       <Link href={route('ai.index')} className="gap-1.5"><ArrowLeft className="h-4 w-4" /> Kembali ke AI</Link>
      </Button>
     }
    />

    {/* Flash */}
    {flash?.success && (
     <div className="flex items-center gap-2 rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">
      <CheckCircle2 className="h-4 w-4 shrink-0" /> {flash.success}
     </div>
    )}
    {flash?.error && (
     <div className="flex items-center gap-2 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
      <XCircle className="h-4 w-4 shrink-0" /> {flash.error}
     </div>
    )}

    {/* Ringkasan hari ini */}
    <div className="grid grid-cols-3 gap-3">
     <Card>
      <CardContent className="pt-4 pb-3">
       <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{organizations.length}</p>
       <p className="text-xs text-gray-500">OPD Aktif</p>
      </CardContent>
     </Card>
     <Card>
      <CardContent className="pt-4 pb-3">
       <p className="text-2xl font-bold">{totalTerpakai}</p>
       <p className="text-xs text-gray-500">Total Panggilan Hari Ini</p>
      </CardContent>
     </Card>
     <Card>
      <CardContent className="pt-4 pb-3">
       <p className="text-2xl font-bold">{totalKuota === 0 ? '∞' : totalKuota}</p>
       <p className="text-xs text-gray-500">Total Kuota Hari Ini</p>
      </CardContent>
     </Card>
    </div>

    {/* Catatan */}
    <Card className="border-blue-100 bg-blue-50/40 dark:border-blue-900/30 dark:bg-blue-950/10">
     <CardContent className="pt-3 pb-2 text-xs text-blue-700 dark:text-blue-300 space-y-1">
      <p>• Kuota berlaku per hari kalender. Jika OPD belum ada aktivitas hari ini, kuota default sistem (<strong>{kuota_default}/hari</strong>) berlaku.</p>
      <p>• Nilai <strong>-1</strong> berarti <strong>unlimited</strong> (tidak dibatasi) - gunakan hanya untuk pengujian atau OPD tertentu.</p>
      <p>• Perubahan kuota langsung berlaku untuk sisa hari ini. Hari berikutnya akan kembali ke nilai default kecuali diatur ulang.</p>
      <p>• Default global dapat diubah via variabel environment <code className="bg-blue-100 px-1 rounded dark:bg-blue-900">EKASUARI_AI_DAILY_QUOTA</code>.</p>
     </CardContent>
    </Card>

    {/* Tabel kuota per OPD */}
    <Card>
     <CardHeader>
      <CardTitle className="text-sm flex items-center gap-2">
       <Settings2 className="h-4 w-4 text-indigo-500" />
       Kuota Harian per OPD
       <Badge variant="secondary">{organizations.length} OPD</Badge>
      </CardTitle>
      <CardDescription>Klik "Atur Kuota" pada baris OPD untuk mengubah batas hari ini.</CardDescription>
     </CardHeader>
     <CardContent className="overflow-x-auto">
      <Table>
       <TableHeader>
        <TableRow>
         <TableHead className="text-xs uppercase tracking-wider w-1/2">OPD</TableHead>
         <TableHead className="text-xs uppercase tracking-wider">Status Hari Ini</TableHead>
         <TableHead className="text-right text-xs uppercase tracking-wider">Aksi</TableHead>
        </TableRow>
       </TableHeader>
       <TableBody>
        {organizations.length === 0 ? (
         <TableRow>
          <TableCell colSpan={3} className="py-8 text-center text-xs text-gray-400">
           Tidak ada OPD aktif ditemukan.
          </TableCell>
         </TableRow>
        ) : (
         paginatedOrgs.map((org) => <QuotaRow key={org.id} org={org} />)
        )}
       </TableBody>
      </Table>
      <TablePagination
       clientSide={true}
       from={from}
       to={to}
       totalItems={total}
       perPage={perPage}
       currentPage={safeCurrentPage}
       lastPage={lastPage}
       itemLabel="OPD"
       onPerPageChange={(val) => {
        setPerPage(val);
        setCurrentPage(1);
       }}
       onClientPageChange={(p) => setCurrentPage(p)}
      />
     </CardContent>
    </Card>

   </div>
  </AuthenticatedLayout>
 );
}
