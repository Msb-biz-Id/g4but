import { Head, useForm } from '@inertiajs/react';
import { QrCode, ShieldCheck, Copy, CheckCircle } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import GuestLayout from '@/Layouts/GuestLayout';

interface Props {
    secret: string;
    qrImage: string; // base64 SVG dari backend (lokal, tanpa internet)
}

export default function MfaSetup({ secret, qrImage }: Props) {
    const [copied, setCopied] = useState(false);
    const { data, setData, post, processing, errors } = useForm({ code: '' });

    const copySecret = () => {
        navigator.clipboard.writeText(secret);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('mfa.setup.confirm'));
    };

    return (
        <GuestLayout>
            <Head title="Setup MFA" />

            <div className="flex min-h-screen items-center justify-center p-4">
                <Card className="w-full max-w-lg">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
                            <ShieldCheck className="h-7 w-7 text-blue-600" />
                        </div>
                        <CardTitle className="text-xl">Setup Autentikasi Dua Faktor</CardTitle>
                        <CardDescription>
                            Akun Anda memerlukan MFA. Scan QR code di bawah menggunakan aplikasi
                            authenticator (Google Authenticator, Authy, dll).
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        {/* QR Code */}
                        <div className="flex flex-col items-center gap-3">
                            <div className="rounded-xl border-2 border-gray-200 p-3">
                                <img
                                    src={qrImage}
                                    alt="QR Code MFA"
                                    className="h-48 w-48"
                                />
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Atau masukkan kode secret secara manual:
                            </p>
                            <div className="flex items-center gap-2">
                                <code className="rounded bg-muted px-3 py-1.5 font-mono text-sm tracking-widest">
                                    {secret}
                                </code>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={copySecret}
                                >
                                    {copied ? (
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* Verifikasi kode */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="code">Kode OTP (6 digit)</Label>
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
                                Aktifkan MFA
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </GuestLayout>
    );
}
