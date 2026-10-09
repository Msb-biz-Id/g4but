import { Head, useForm } from '@inertiajs/react';
import { ShieldCheck } from 'lucide-react';

import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import GuestLayout from '@/Layouts/GuestLayout';

export default function MfaChallenge() {
    const { data, setData, post, processing, errors } = useForm({ code: '' });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('mfa.challenge.verify'));
    };

    return (
        <GuestLayout>
            <Head title="Verifikasi MFA" />

            <div className="flex min-h-screen items-center justify-center p-4">
                <Card className="w-full max-w-sm">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
                            <ShieldCheck className="h-7 w-7 text-blue-600" />
                        </div>
                        <CardTitle>Verifikasi Dua Faktor</CardTitle>
                        <CardDescription>
                            Masukkan kode 6 digit dari aplikasi authenticator Anda untuk melanjutkan.
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="code">Kode OTP</Label>
                                <Input
                                    id="code"
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    placeholder="000000"
                                    className="text-center text-2xl tracking-[0.5em]"
                                    value={data.code}
                                    onChange={(e) => setData('code', e.target.value.replace(/\D/g, ''))}
                                    autoFocus
                                    autoComplete="one-time-code"
                                />
                                {errors.code && (
                                    <p className="text-sm text-destructive">{errors.code}</p>
                                )}
                            </div>

                            <Button type="submit" className="w-full" disabled={processing || data.code.length !== 6}>
                                <ShieldCheck className="mr-2 h-4 w-4" />
                                Verifikasi
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </GuestLayout>
    );
}
