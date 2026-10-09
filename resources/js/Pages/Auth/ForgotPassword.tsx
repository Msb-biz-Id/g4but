import GuestLayout from '@/Layouts/GuestLayout';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { Mail } from 'lucide-react';

export default function ForgotPassword({ status }: { status?: string }) {
 const { data, setData, post, processing, errors } = useForm({ email: '' });

 const submit: FormEventHandler = (e) => {
 e.preventDefault();
 post(route('password.email'));
 };

 return (
 <GuestLayout>
 <Head title="Lupa Kata Sandi" />

 <div className="mb-6 text-center">
 <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Lupa Kata Sandi?</h2>
 <p className="mt-2 text-sm text-gray-500">
 Masukkan alamat email Anda dan kami akan mengirimkan tautan untuk mengatur ulang kata sandi.
 </p>
 </div>

 {status && (
 <div className="mb-4 rounded-md bg-green-50 px-4 py-3 text-sm font-medium text-green-700 dark:bg-green-950/30 dark:text-green-300">
 {status}
 </div>
 )}

 <form autoComplete="off" noValidate onSubmit={submit} className="space-y-4">
 <div className="space-y-1.5">
 <Label htmlFor="email">Email</Label>
 <Input
 id="email"
 type="email"
 name="email"
 value={data.email}
 autoFocus
 onChange={(e) => setData('email', e.target.value)}
 placeholder="nama@instansi.go.id"
 className={errors.email ? 'border-destructive' : ''}
 />
 {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
 </div>

 <Button type="submit" disabled={processing} className="w-full gap-1.5">
 {processing ? 'Mengirim…' : <><Mail className="h-4 w-4" /> Kirim Tautan Reset</>}
 </Button>
 </form>
 </GuestLayout>
 );
}
