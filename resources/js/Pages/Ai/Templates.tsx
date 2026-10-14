import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { SelectNative } from '@/Components/ui/select-native';
import { Textarea } from '@/Components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { formatDateTime } from '@/lib/utils';
import PageHeader from '@/Components/Dashboard/PageHeader';
import { ArrowLeft, Sparkles, Plus } from 'lucide-react';

interface TemplateItem {
 id: number;
 code: string;
 name: string;
 feature: string;
 version: number;
 content: string;
 is_active: boolean;
 created_at: string | null;
 creator: { id: number; name: string } | null;
}

interface FeatureOption {
 value: string;
 label: string;
}

interface Props extends PageProps {
 templates: TemplateItem[];
 features: FeatureOption[];
}

export default function AiTemplates({ auth, templates, features }: Props) {
 const form = useForm({ feature: features[0]?.value ?? '', name: '', content: '' });

 const submit: FormEventHandler = (e) => {
 e.preventDefault();
 form.post(route('ai.templates.store'), {
 preserveScroll: true,
 onSuccess: () => form.reset('name', 'content'),
 });
 };

 const groupByFeature = (): Record<string, TemplateItem[]> =>
 templates.reduce<Record<string, TemplateItem[]>>((acc, template) => {
 if (!acc[template.feature]) {
 acc[template.feature] = [];
 }
 acc[template.feature].push(template);
 return acc;
 }, {});

 const groups = groupByFeature();

    return (
        <AuthenticatedLayout>
            <Head title="Template AI" />

            <div className="space-y-6 p-6">
                <PageHeader
                    title="Template Prompt AI"
                    description="Kelola dan buat versi prompt template terstandarisasi untuk analisis rekomendasi SAKIP otomatis."
                    breadcrumbs={[
                        { label: 'Kecerdasan Buatan' },
                        { label: 'Asisten AI', href: route('ai.index') },
                        { label: 'Template Prompt' },
                    ]}
                    actions={
                        <Button variant="outline" size="sm" asChild>
                            <Link href={route('ai.index')} className="gap-1.5">
                                <ArrowLeft className="h-4 w-4" />
                                Kembali ke AI
                            </Link>
                        </Button>
                    }
                />

                <div className="mx-auto max-w-4xl space-y-6">

 <Card className="mb-6">
 <CardHeader>
 <CardTitle>Buat Versi Baru Template</CardTitle>
 <CardDescription>
 Versi baru otomatis menjadi aktif; versi sebelumnya dinonaktifkan (AIG-006).
 Gunakan placeholder seperti {'{scope}'}, {'{period}'}, {'{problems}'}, {'{generated_at}'}.
 </CardDescription>
 </CardHeader>
 <CardContent>
 <form autoComplete="off" noValidate onSubmit={submit} className="space-y-4">
 <div className="grid gap-4 sm:grid-cols-2">
 <div>
 <Label>Fitur</Label>
 <SelectNative
 value={form.data.feature}
 onChange={(e) => form.setData('feature', e.target.value)}
 className="mt-1"
 >
 {features.map((f) => (
 <option key={f.value} value={f.value}>
 {f.label}
 </option>
 ))}
 </SelectNative>
 </div>
 <div>
 <Label>Nama (opsional)</Label>
 <Input
 type="text"
 value={form.data.name}
 onChange={(e) => form.setData('name', e.target.value)}
 className="mt-1"
 placeholder="Nama template"
 />
 </div>
 </div>
 <div>
 <Label>Isi Prompt Template</Label>
 <Textarea
 value={form.data.content}
 onChange={(e) => form.setData('content', e.target.value)}
 className="mt-1 min-h-[160px] font-mono text-xs"
 placeholder="Tulis instruksi template prompt AI..."
 />
 {form.errors.content && (
 <p className="mt-1 text-xs text-red-600">
 {form.errors.content}
 </p>
 )}
 </div>
 <div className="flex justify-end gap-2">
 <Button type="submit" disabled={form.processing}>
 Simpan Versi Baru
 </Button>
 </div>
 </form>
 </CardContent>
 </Card>

 <Card>
 <CardHeader>
 <CardTitle>Daftar Versi Template</CardTitle>
 </CardHeader>
 <CardContent>
 {features.length === 0 && (
 <p className="text-sm text-gray-400">Tidak ada fitur template.</p>
 )}
 <Tabs defaultValue={features[0]?.value}>
 <TabsList className="flex flex-wrap h-auto">
 {features.map((f) => (
 <TabsTrigger key={f.value} value={f.value}>
 {f.label}
 </TabsTrigger>
 ))}
 </TabsList>
 {features.map((f) => (
 <TabsContent key={f.value} value={f.value} className="space-y-3 pt-4">
 {(groups[f.value] ?? []).length === 0 && (
 <p className="text-sm text-gray-400">
 Belum ada template untuk fitur ini.
 </p>
 )}
 {(groups[f.value] ?? []).map((template) => (
 <div
 key={template.id}
 className="rounded-md border p-4"
 >
 <div className="mb-2 flex flex-wrap items-center gap-2">
 <Badge variant="secondary">
 v{template.version}
 </Badge>
 {template.is_active ? (
 <Badge variant="success">Aktif</Badge>
 ) : (
 <Badge variant="outline">Nonaktif</Badge>
 )}
 <span className="text-sm font-medium text-gray-800">
 {template.name}
 </span>
 <span className="text-xs text-gray-500">
 dibuat oleh {template.creator?.name ?? '-'} ·
 {formatDateTime(template.created_at)}
 </span>
 {!template.is_active && (
 <Button
 size="sm"
 variant="outline"
 className="ml-auto"
 onClick={() =>
 form.post(
 route(
 'ai.templates.activate',
 template.id,
 ),
 { preserveScroll: true },
 )
 }
 >
 Aktifkan
 </Button>
 )}
 </div>
 <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-md bg-gray-50 p-3 font-mono text-xs text-gray-700">
 {template.content}
 </pre>
 </div>
 ))}
 </TabsContent>
 ))}
 </Tabs>
 </CardContent>
 </Card>
 </div>
 </div>
 </AuthenticatedLayout>
 );
}