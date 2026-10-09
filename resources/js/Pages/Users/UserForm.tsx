import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Checkbox } from '@/Components/ui/checkbox';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { SelectNative } from '@/Components/ui/select-native';
import { Switch } from '@/Components/ui/switch';
import { Organization, Role } from '@/types';
import { Link, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import { Building2, KeyRound, Shield, User } from 'lucide-react';

interface UserFormData {
 name: string;
 email: string;
 employee_number: string;
 job_title: string;
 password: string;
 password_confirmation: string;
 is_active: boolean;
 must_change_password: boolean;
 role_ids: number[];
 organization_ids: number[];
}

interface Props {
 roles: Role[];
 organizations: Organization[];
 user?: Partial<{
 id: number;
 name: string;
 email: string;
 employee_number: string | null;
 job_title: string | null;
 is_active: boolean;
 roles: Role[];
 organizations: Organization[];
 }>;
}

export default function UserForm({ roles, organizations, user }: Props) {
 const isEdit = Boolean(user?.id);

 const { data, setData, errors, post, put, processing } = useForm<UserFormData>({
 name: user?.name ?? '',
 email: user?.email ?? '',
 employee_number: user?.employee_number ?? '',
 job_title: user?.job_title ?? '',
 password: '',
 password_confirmation: '',
 is_active: user?.is_active ?? true,
 must_change_password: false,
 role_ids: user?.roles?.map((r) => r.id) ?? [],
 organization_ids: user?.organizations?.map((o) => o.id) ?? [],
 });

 const submit = (e: FormEvent) => {
 e.preventDefault();
 if (isEdit) { put(route('users.update', user!.id)); }
 else { post(route('users.store')); }
 };

 const toggleArr = (arr: number[], val: number) =>
 arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];

 return (
 <form autoComplete="off" noValidate onSubmit={submit} className="space-y-6">

 {/* Akun */}
 <Card>
 <CardHeader className="pb-3">
 <CardTitle className="flex items-center gap-2 text-sm">
 <User className="h-4 w-4 text-indigo-500" /> Akun Pengguna
 </CardTitle>
 </CardHeader>
 <CardContent className="grid gap-4 sm:grid-cols-2">
 <div className="space-y-1">
 <Label htmlFor="name">Nama Lengkap <span className="text-red-500">*</span></Label>
 <Input id="name" placeholder="Nama Lengkap Pengguna" value={data.name} onChange={(e) => setData('name', e.target.value)} />
 {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
 </div>
 <div className="space-y-1">
 <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
 <Input id="email" type="email" placeholder="nama@instansi.go.id" value={data.email} onChange={(e) => setData('email', e.target.value)} />
 {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
 </div>
 <div className="space-y-1">
 <Label htmlFor="employee_number">NIP / Nomor Pegawai</Label>
 <Input id="employee_number" placeholder="cth: 198501012010011001" value={data.employee_number} onChange={(e) => setData('employee_number', e.target.value)} />
 {errors.employee_number && <p className="text-xs text-destructive">{errors.employee_number}</p>}
 </div>
 <div className="space-y-1">
 <Label htmlFor="job_title">Jabatan</Label>
 <Input id="job_title" placeholder="cth: Kepala Bidang / Staff Perencana" value={data.job_title} onChange={(e) => setData('job_title', e.target.value)} />
 </div>
 </CardContent>
 </Card>

 {/* Password */}
 <Card>
 <CardHeader className="pb-3">
 <CardTitle className="flex items-center gap-2 text-sm">
 <KeyRound className="h-4 w-4 text-indigo-500" />
 {isEdit ? 'Ganti Password (kosongkan jika tidak berubah)' : 'Password'}
 </CardTitle>
 </CardHeader>
 <CardContent className="grid gap-4 sm:grid-cols-2">
 <div className="space-y-1">
 <Label htmlFor="password">Password {!isEdit && <span className="text-red-500">*</span>}</Label>
 <Input id="password" type="password" placeholder="Minimal 8 karakter" value={data.password}
 onChange={(e) => setData('password', e.target.value)}
 autoComplete="new-password" />
 {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
 </div>
 <div className="space-y-1">
 <Label htmlFor="password_confirmation">Konfirmasi Password</Label>
 <Input id="password_confirmation" type="password" placeholder="Ulangi kata sandi" value={data.password_confirmation}
 onChange={(e) => setData('password_confirmation', e.target.value)}
 autoComplete="new-password" />
 </div>
 <div className="flex items-center gap-3">
 <Switch id="must_change_password" checked={data.must_change_password}
 onCheckedChange={(v) => setData('must_change_password', v)} />
 <Label htmlFor="must_change_password" className="cursor-pointer">
 Wajib ganti password saat login pertama
 </Label>
 </div>
 </CardContent>
 </Card>

 {/* Role & Status */}
 <Card>
 <CardHeader className="pb-3">
 <CardTitle className="flex items-center gap-2 text-sm">
 <Shield className="h-4 w-4 text-indigo-500" /> Peran & Status
 </CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="flex items-center gap-3">
 <Switch id="is_active" checked={data.is_active}
 onCheckedChange={(v) => setData('is_active', v)} />
 <Label htmlFor="is_active" className="cursor-pointer">
 Akun aktif
 <span className="ml-1 text-xs text-gray-400">(nonaktif = tidak dapat login)</span>
 </Label>
 </div>

 <div>
 <Label className="mb-2 block text-sm font-medium">Peran (Role)</Label>
 <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
 {roles.map((role) => (
 <label key={role.id} className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800">
 <Checkbox
 checked={data.role_ids.includes(role.id)}
 onCheckedChange={() => setData('role_ids', toggleArr(data.role_ids, role.id))}
 />
 <span className="text-sm">{role.name}</span>
 </label>
 ))}
 </div>
 {errors.role_ids && <p className="mt-1 text-xs text-destructive">{errors.role_ids}</p>}
 </div>
 </CardContent>
 </Card>

 {/* Organisasi */}
 <Card>
 <CardHeader className="pb-3">
 <CardTitle className="flex items-center gap-2 text-sm">
 <Building2 className="h-4 w-4 text-indigo-500" /> Organisasi / OPD
 </CardTitle>
 </CardHeader>
 <CardContent>
 <p className="mb-3 text-xs text-gray-400">OPD pertama yang dipilih akan menjadi organisasi default.</p>
 <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
 {organizations.map((org) => (
 <label key={org.id} className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800">
 <Checkbox
 checked={data.organization_ids.includes(org.id)}
 onCheckedChange={() => setData('organization_ids', toggleArr(data.organization_ids, org.id))}
 />
 <span className="text-sm">
 <span className="font-medium">{org.code}</span>
 <span className="ml-1 text-gray-400">—</span>
 <span className="ml-1 text-xs text-gray-500">{org.name}</span>
 </span>
 {data.organization_ids[0] === org.id && (
 <Badge variant="secondary" className="ml-auto text-xs">default</Badge>
 )}
 </label>
 ))}
 </div>
 {errors.organization_ids && <p className="mt-1 text-xs text-destructive">{errors.organization_ids}</p>}
 </CardContent>
 </Card>

 {/* Actions */}
 <div className="flex items-center gap-3">
 <Button type="submit" disabled={processing}>
 {processing ? 'Menyimpan…' : isEdit ? 'Simpan Perubahan' : 'Buat Pengguna'}
 </Button>
 <Button asChild variant="ghost">
 <Link href={route('users.index')}>Batal</Link>
 </Button>
 </div>
 </form>
 );
}