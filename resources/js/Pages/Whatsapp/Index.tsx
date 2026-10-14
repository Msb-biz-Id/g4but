import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';
import { MessageCircle, Plus, Trash2, ShieldCheck, Power, PhoneCall, Headset, CheckCircle2 } from 'lucide-react';
import { PageProps } from '@/types';
import { cn, formatDateTime } from '@/lib/utils';
import ConfirmDialog from '@/Components/ConfirmDialog';
import { toast } from 'sonner';
import PageHeader from '@/Components/Dashboard/PageHeader';

interface WhatsappIdentity {
 id: number;
 phone_number: string;
 display_number?: string;
 is_verified: boolean;
 is_active: boolean;
 user?: { id: number; name: string; email: string };
}

interface WhatsappMessage {
 id: number;
 phone_number: string;
 display_number?: string;
 direction: 'inbound' | 'outbound';
 status: string;
 content: string;
 created_at: string;
}

interface Handoff {
 id: number;
 phone_number: string;
 request_text?: string;
 status: 'pending' | 'resolved' | 'closed';
 created_at: string;
 user?: { name: string };
 resolver?: { name: string };
 resolved_by?: number;
}

interface WhatsappIndexProps extends PageProps {
 identities: WhatsappIdentity[];
 messages: WhatsappMessage[];
 handoffs: Handoff[];
 canManage: boolean;
 canAudit: boolean;
 statusLabels: Record<string, string>;
 directionLabels: Record<string, string>;
 messageStatusLabels: Record<string, string>;
 handoffStatusLabels: Record<string, string>;
}

export default function WhatsappIndex({
 identities,
 messages,
 handoffs,
 canManage,
 canAudit,
 statusLabels,
 directionLabels,
 messageStatusLabels,
 handoffStatusLabels,
}: WhatsappIndexProps) {
 const [regModal, setRegModal] = useState(false);

 const { data, setData, post, processing, errors, reset } = useForm({
 phone_number: '',
 display_number: '',
 });

 const submitRegister = (e: React.FormEvent) => {
 e.preventDefault();
 post('/whatsapp/register', {
 onSuccess: () => {
 setRegModal(false);
 reset();
 }
 });
 };

 const [deletePhoneId, setDeletePhoneId] = useState<number | null>(null);
 const [resolveHandoffId, setResolveHandoffId] = useState<number | null>(null);

 const handleDelete = (id: number) => {
 setDeletePhoneId(id);
 };

 const confirmDeletePhone = () => {
 if (deletePhoneId === null) return;
 router.delete(`/whatsapp/${deletePhoneId}`, {
 preserveScroll: true,
 onSuccess: () => {
 setDeletePhoneId(null);
 toast.success('Nomor WhatsApp berhasil dihapus.');
 },
 });
 };

 const handleVerify = (id: number) => {
 router.post(`/whatsapp/${id}/verify`, {}, { preserveScroll: true });
 };

 const handleToggle = (id: number) => {
 router.post(`/whatsapp/${id}/toggle`, {}, { preserveScroll: true });
 };

 const handleResolve = (id: number) => {
 setResolveHandoffId(id);
 };

 const confirmResolveHandoff = () => {
 if (resolveHandoffId === null) return;
 router.post(`/whatsapp/handoffs/${resolveHandoffId}/resolve`, {}, {
 preserveScroll: true,
 onSuccess: () => {
 setResolveHandoffId(null);
 toast.success('Handoff ditandai selesai.');
 },
 });
 };

 return (
        <AuthenticatedLayout
            header="AI Chatbot WhatsApp"
        >
            <Head title="AI Chatbot WhatsApp" />

            <div className="space-y-6">
                <PageHeader
                    breadcrumbs={[
                        { label: 'Integrasi & Gateway' },
                        { label: 'WhatsApp Bot' },
                    ]}
                    title="Integrasi AI Chatbot WhatsApp"
                    description="Kelola gateway WhatsApp resmi, pendaftaran nomor admin/aparatur, dan penanganan permohonan informasi."
                    actions={
                        canManage ? (
                            <Button onClick={() => setRegModal(true)} className="w-full sm:w-auto justify-center bg-primary text-primary-foreground hover:bg-primary/90">
                                <Plus className="w-4 h-4 mr-2" />
                                Daftarkan Nomor
                            </Button>
                        ) : undefined
                    }
                />

                {!canManage && (
                    <Card>
                        <CardContent className="p-4 sm:p-6">
                            <p className="text-sm text-muted-foreground">
                                Anda tidak memiliki hak akses untuk mengelola nomor WhatsApp.
                            </p>
                        </CardContent>
                    </Card>
                )}

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6 pb-2">
                            <CardTitle className="text-base sm:text-lg font-medium">Nomor WhatsApp Terdaftar</CardTitle>
                            <Badge variant="secondary">{identities.length}</Badge>
                        </CardHeader>
                        <CardContent className="p-4 sm:p-6 pt-0">
                            <div className="space-y-4">
                                {identities.length > 0 ? identities.map((i) => (
                                    <div key={i.id} className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b pb-4 last:border-0 last:pb-0">
                                        <div className="flex items-start space-x-3">
                                            <div className="mt-1 shrink-0">
                                                <PhoneCall className="w-5 h-5 text-emerald-500" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">
                                                    {i.display_number || i.phone_number}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {i.user?.name || '-'} &middot; {i.user?.email || ''}
                                                </p>
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    <Badge variant={(i.is_verified ? "success" : "warning") as any}>
                                                        {i.is_verified ? 'Terverifikasi' : 'Belum Verifikasi'}
                                                    </Badge>
                                                    <Badge variant={(i.is_active ? "success" : "secondary") as any}>
                                                        {i.is_active ? 'Aktif' : 'Nonaktif'}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                        {canManage && (
                                            <div className="flex items-center space-x-2 self-end sm:self-start shrink-0">
                                                {!i.is_verified && (
                                                    <Button variant="outline" size="icon" onClick={() => handleVerify(i.id)}>
                                                        <ShieldCheck className="w-4 h-4" />
                                                    </Button>
                                                )}
                                                <Button variant="outline" size="icon" onClick={() => handleToggle(i.id)}>
                                                    <Power className="w-4 h-4" />
                                                </Button>
                                                <Button variant="destructive" size="icon" onClick={() => handleDelete(i.id)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )) : (
                                    <p className="text-sm text-muted-foreground">Belum ada nomor terdaftar.</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

 <Card>
 <CardHeader className="flex flex-row items-center justify-between pb-2">
 <CardTitle className="text-lg font-medium">Riwayat Percakapan</CardTitle>
 <Badge variant="secondary">{messages.length}</Badge>
 </CardHeader>
 <CardContent>
 <div className="space-y-4">
 {messages.length > 0 ? messages.map((m) => (
 <div key={m.id} className="border-b pb-4 last:border-0 last:pb-0">
 <div className="flex items-center justify-between mb-2">
 <div className="flex items-center space-x-2">
 <Badge variant={(m.direction === 'inbound' ? 'info' : 'success') as any}>
 {directionLabels[m.direction] || m.direction}
 </Badge>
 <span className="font-medium text-sm">
 {m.display_number || m.phone_number}
 </span>
 </div>
 <Badge variant={(m.status === 'blocked' ? 'destructive' : m.status === 'sent' ? 'success' : 'secondary') as any}>
 {messageStatusLabels[m.status] || m.status}
 </Badge>
 </div>
 <p className="text-xs text-muted-foreground mb-1">
 {formatDateTime(m.created_at)}
 </p>
 <p className="text-sm text-muted-foreground truncate">
 {m.content}
 </p>
 </div>
 )) : (
 <p className="text-sm text-muted-foreground">Belum ada percakapan.</p>
 )}
 </div>
 </CardContent>
 </Card>
 </div>

    <Card className="xl:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6 pb-2">
            <div className="flex items-center space-x-2">
                <Headset className="w-5 h-5 text-gray-500" />
                <CardTitle className="text-base sm:text-lg font-medium">Handoff ke Petugas (FR-WA-017)</CardTitle>
            </div>
            <Badge variant="secondary">{handoffs.length}</Badge>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
            <div className="space-y-4">
                {handoffs.length > 0 ? handoffs.map((h) => (
                    <div key={h.id} className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b pb-4 last:border-0 last:pb-0">
                        <div className="flex items-start space-x-3">
                            <div className="mt-1 shrink-0">
                                <Headset className={cn("w-5 h-5", h.status === 'pending' ? "text-amber-500" : h.status === 'resolved' ? "text-emerald-500" : "text-gray-400")} />
                            </div>
                            <div>
                                <p className="font-medium text-sm">
                                    Handoff #{h.id} - {h.phone_number}
                                </p>
                                {h.request_text && (
                                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                                        {h.request_text}
                                    </p>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">
                                    {h.user?.name || 'Sistem'} &middot; {formatDateTime(h.created_at)}
                                </p>
                                <div className="mt-2">
                                    <Badge variant={(h.status === 'pending' ? 'warning' : h.status === 'resolved' ? 'success' : 'secondary') as any}>
                                        {handoffStatusLabels[h.status] || h.status}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                        {canManage && h.status === 'pending' && (
                            <Button variant="outline" size="sm" onClick={() => handleResolve(h.id)} className="self-end sm:self-start shrink-0">
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Tandai Selesai
                            </Button>
                        )}
                    </div>
                )) : (
                    <p className="text-sm text-muted-foreground">Belum ada permintaan handoff.</p>
                )}
            </div>
        </CardContent>
    </Card>
 </div>

 <Dialog open={regModal} onOpenChange={setRegModal}>
 <DialogContent className="max-h-[85vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle>Daftarkan Nomor WhatsApp</DialogTitle>
 </DialogHeader>
 <form autoComplete="off" noValidate onSubmit={submitRegister} className="space-y-4">
 <div className="space-y-2">
 <Label htmlFor="phone_number">Nomor Telepon</Label>
 <Input
 id="phone_number"
 value={data.phone_number}
 onChange={(e) => setData('phone_number', e.target.value)}
 placeholder="+6281234567890"

 />
 {errors.phone_number && <p className="text-sm text-destructive">{errors.phone_number}</p>}
 </div>
 <div className="space-y-2">
 <Label htmlFor="display_number">Nama / Label Nomor (Opsional)</Label>
 <Input
 id="display_number"
 value={data.display_number}
 onChange={(e) => setData('display_number', e.target.value)}
 placeholder="Misal: CS Pusat"
 />
 {errors.display_number && <p className="text-sm text-destructive">{errors.display_number}</p>}
 </div>

 <div className="text-sm bg-amber-50 border border-amber-200 rounded p-3 text-amber-800">
 Setelah didaftarkan, hubungi administrator untuk verifikasi nomor.
 </div>

 <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
 <Button type="button" variant="outline" onClick={() => setRegModal(false)}>
 Batal
 </Button>
 <Button type="submit" disabled={processing}>
 Daftarkan
 </Button>
 </DialogFooter>
 </form>
 </DialogContent>
 </Dialog>

                <ConfirmDialog
                    open={deletePhoneId !== null}
                    onOpenChange={(open) => !open && setDeletePhoneId(null)}
                    title="Hapus Nomor WhatsApp?"
                    description="Apakah Anda yakin ingin menghapus nomor ini dari sistem?"
                    confirmText="Hapus Nomor"
                    cancelText="Batal"
                    onConfirm={confirmDeletePhone}
                    onCancel={() => setDeletePhoneId(null)}
                />

                <ConfirmDialog
                    open={resolveHandoffId !== null}
                    onOpenChange={(open) => !open && setResolveHandoffId(null)}
                    title="Tandai Handoff Selesai?"
                    description="Apakah Anda yakin ingin menandai percakapan handoff ini selesai?"
                    confirmText="Tandai Selesai"
                    cancelText="Batal"
                    variant="default"
                    onConfirm={confirmResolveHandoff}
                    onCancel={() => setResolveHandoffId(null)}
                />
            </AuthenticatedLayout>
    );
}
