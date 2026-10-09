import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Badge } from '@/Components/ui/badge';
import { CheckCircle2, AlertTriangle, ArrowLeft, Upload, FileSpreadsheet } from 'lucide-react';

interface ValidRow {
    name: string;
    level: string;
    owner_organization_id?: number | null;
    measurement_unit_id?: number | null;
    definition?: string | null;
    formula_notes?: string | null;
    polarization: string;
    baseline_year?: number | null;
    baseline_note?: string | null;
    data_source?: string | null;
    frequency: string;
}

interface ErrorRow {
    row: number;
    data: Record<string, string>;
    errors: string[];
}

interface Props {
    validRows: ValidRow[];
    errorRows: ErrorRow[];
    totalRows: number;
}

export default function ImportPreview({ validRows, errorRows, totalRows }: Props) {
    const [tab, setTab] = useState<'valid' | 'error'>('valid');
    const [submitting, setSubmitting] = useState(false);

    function handleCommit() {
        if (validRows.length === 0) return;
        setSubmitting(true);
        router.post(route('planning.iku.import.commit'), {}, {
            onFinish: () => setSubmitting(false),
        });
    }

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Pratinjau Impor IKU</h2>}>
            <Head title="Pratinjau Impor IKU" />

            <div className="py-6">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">

                    {/* Breadcrumb */}
                    <nav className="text-sm text-gray-500">
                        <span>Beranda</span> <span className="mx-1">›</span>
                        <span>Perencanaan Kinerja</span> <span className="mx-1">›</span>
                        <Link href={route('planning.iku.index')} className="text-blue-600 hover:underline">IKU</Link> <span className="mx-1">›</span>
                        <span className="font-medium text-gray-800">Pratinjau Impor</span>
                    </nav>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Total Baris Dibaca</p>
                                        <p className="text-2xl font-bold text-gray-900">{totalRows}</p>
                                    </div>
                                    <div className="rounded-full bg-blue-100 p-3 text-blue-600">
                                        <FileSpreadsheet className="h-6 w-6" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-green-600">Baris Valid (Siap Impor)</p>
                                        <p className="text-2xl font-bold text-green-700">{validRows.length}</p>
                                    </div>
                                    <div className="rounded-full bg-green-100 p-3 text-green-600">
                                        <CheckCircle2 className="h-6 w-6" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-red-600">Baris Error (Dilewati)</p>
                                        <p className="text-2xl font-bold text-red-700">{errorRows.length}</p>
                                    </div>
                                    <div className="rounded-full bg-red-100 p-3 text-red-600">
                                        <AlertTriangle className="h-6 w-6" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Actions Bar */}
                    <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                            <Button
                                variant={tab === 'valid' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setTab('valid')}
                            >
                                Baris Valid ({validRows.length})
                            </Button>
                            <Button
                                variant={tab === 'error' ? 'destructive' : 'outline'}
                                size="sm"
                                onClick={() => setTab('error')}
                            >
                                Baris Error ({errorRows.length})
                            </Button>
                        </div>

                        <div className="flex gap-2">
                            <Link href={route('planning.iku.index')}>
                                <Button variant="outline">
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Batal
                                </Button>
                            </Link>
                            <Button
                                onClick={handleCommit}
                                disabled={validRows.length === 0 || submitting}
                            >
                                <Upload className="mr-2 h-4 w-4" />
                                {submitting ? 'Memproses...' : `Impor ${validRows.length} Data Valid`}
                            </Button>
                        </div>
                    </div>

                    {/* Content Table */}
                    {tab === 'valid' ? (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Daftar Data IKU Valid</CardTitle>
                                <CardDescription>Data berikut telah tervalidasi dan siap disimpan sebagai Draft IKU.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {validRows.length === 0 ? (
                                    <p className="text-center text-sm text-gray-500 py-8">Tidak ada baris data yang valid.</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-12">No</TableHead>
                                                    <TableHead>Level</TableHead>
                                                    <TableHead>Nama Indikator</TableHead>
                                                    <TableHead>Tahun Baseline</TableHead>
                                                    <TableHead>Polarisasi</TableHead>
                                                    <TableHead>Sumber Data</TableHead>
                                                    <TableHead>Frekuensi</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {validRows.map((r, i) => (
                                                    <TableRow key={i}>
                                                        <TableCell className="text-gray-500">{i + 1}</TableCell>
                                                        <TableCell>
                                                            <span className="text-xs font-semibold">
                                                                {r.level === 'pemda' ? 'Pemda' : 'Perangkat Daerah'}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="font-medium text-sm">{r.name}</TableCell>
                                                        <TableCell>{r.baseline_year ?? '-'}</TableCell>
                                                        <TableCell>
                                                            <span className="text-xs capitalize font-medium">{r.polarization}</span>
                                                        </TableCell>
                                                        <TableCell className="text-sm text-gray-600">{r.data_source ?? '-'}</TableCell>
                                                        <TableCell className="text-sm capitalize">{r.frequency}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base text-red-600">Daftar Baris yang Mengandung Kesalahan</CardTitle>
                                <CardDescription>Baris berikut tidak akan diimpor karena tidak memenuhi syarat validasi.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {errorRows.length === 0 ? (
                                    <p className="text-center text-sm text-gray-500 py-8">Tidak ada baris dengan kesalahan. Semua data valid!</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-20">Baris Excel</TableHead>
                                                    <TableHead>Nama Indikator</TableHead>
                                                    <TableHead>Level / OPD</TableHead>
                                                    <TableHead>Keterangan Error</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {errorRows.map((er, idx) => (
                                                    <TableRow key={idx}>
                                                        <TableCell className="font-bold text-red-600">Baris {er.row}</TableCell>
                                                        <TableCell className="font-medium">{er.data['Nama Indikator'] || '(Kosong)'}</TableCell>
                                                        <TableCell className="text-xs">
                                                            {er.data['Level'] || '-'} / {er.data['Nama OPD'] || '-'}
                                                        </TableCell>
                                                        <TableCell>
                                                            <ul className="list-disc list-inside text-xs text-red-600 space-y-0.5">
                                                                {er.errors.map((err, eIdx) => (
                                                                    <li key={eIdx}>{err}</li>
                                                                ))}
                                                            </ul>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                </div>
            </div>
        </AuthenticatedLayout>
    );
}
