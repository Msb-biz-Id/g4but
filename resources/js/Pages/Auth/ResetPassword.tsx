import GuestLayout from '@/Layouts/GuestLayout';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { KeyRound } from 'lucide-react';

export default function ResetPassword({ token, email }: { token: string; email: string }) {
 const { data, setData, post, processing, errors, reset } = useForm({
 token: token,
 email: email,
 password: '',
 password_confirmation: '',
 });

 const submit: FormEventHandler = (e) => {
 e.preventDefault();
 post(route('password.store'), {
 onFinish: () => reset('password', 'password_confirmation'),
 });
 };

 return (
 <GuestLayout>
 <Head title="Reset Kata Sandi" />

 <div className="mb-6 text-center">
 <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Atur Ulang Kata Sandi</h2>
 <p className="mt-1 text-sm text-gray-500">Buat kata sandi baru untuk akun Anda.</p>
 </div>

 <form autoComplete="off" noValidate onSubmit={submit} className="space-y-4">
 <div className="space-y-1.5">
 <Label htmlFor="email">Email</Label>
 <Input
 id="email"
 type="email"
 name="email"
 placeholder="nama@instansi.go.id"
 value={data.email}
 autoComplete="username"
 readOnly
 className="bg-gray-50 dark:bg-gray-800"
 onChange={(e) => setData('email', e.target.value)}
 />
 {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
 </div>

 <div className="space-y-1.5">
 <Label htmlFor="password">Kata Sandi Baru <span className="text-red-500">*</span></Label>
 <Input
 id="password"
 type="password"
 name="password"
 placeholder="Minimal 8 karakter"
 value={data.password}
 autoComplete="new-password"
 autoFocus
 onChange={(e) => setData('password', e.target.value)}
 className={errors.password ? 'border-destructive' : ''}
 />
 {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
 </div>

 <div className="space-y-1.5">
 <Label htmlFor="password_confirmation">Konfirmasi Kata Sandi <span className="text-red-500">*</span></Label>
 <Input
 id="password_confirmation"
 type="password"
 name="password_confirmation"
 placeholder="Ulangi kata sandi baru"
 value={data.password_confirmation}
 autoComplete="new-password"
 onChange={(e) => setData('password_confirmation', e.target.value)}
 className={errors.password_confirmation ? 'border-destructive' : ''}
 />
 {errors.password_confirmation && (
 <p className="text-xs text-destructive">{errors.password_confirmation}</p>
 )}
 </div>

 <Button type="submit" disabled={processing} className="w-full gap-1.5">
 {processing ? 'Menyimpan…' : <><KeyRound className="h-4 w-4" /> Simpan Kata Sandi Baru</>}
 </Button>
 </form>
 </GuestLayout>
 );
}
