import React, { useState, useRef, useEffect, FormEventHandler } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Head, Link } from '@inertiajs/react';
import { Send, Bot, User, Sparkles, RefreshCw, Shield, AlertCircle, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

// Global declaration for Ziggy route helper in Inertia
declare function route(name?: string, params?: unknown): string;

interface ChatMessage {
    id: string;
    sender: 'user' | 'assistant';
    text: string;
    timestamp: string;
    scope?: string;
    suggestedActions?: string[];
}

interface Props extends PageProps {
    initialQuery?: string;
}

const QUICK_PROMPTS = [
    'Ringkasan capaian IKU OPD dan Unit Kerja',
    'Status kepatuhan dokumen SAKIP tahun berjalan',
    'Rekomendasi percepatan tindak lanjut evaluasi AKIP',
    'Daftar Unit Kerja dengan deviasi realisasi',
];

export default function Chatbot({ auth, initialQuery }: Props) {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'welcome',
            sender: 'assistant',
            text: 'Halo! Saya AI Asisten e-KASUARI. Saya siap membantu Anda menganalisis data SAKIP, capaian IKU, dokumen perencanaan, pengukuran kinerja, dan evaluasi akuntabilitas unit kerja secara faktual dan terpercaya.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            suggestedActions: QUICK_PROMPTS,
        },
    ]);
    const [input, setInput] = useState(initialQuery || '');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const handleSend = async (queryText?: string) => {
        const textToSend = (queryText || input).trim();
        if (!textToSend || isLoading) return;

        const userMsg: ChatMessage = {
            id: `user-${Date.now()}`,
            sender: 'user',
            text: textToSend,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
            const res = await fetch(route('ai.chat'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({ message: textToSend }),
            });

            const data = await res.json();

            let replyText = 'Maaf, terjadi kendala dalam memproses respons AI.';
            if (data.status === 'ok' && data.data?.narrative) {
                replyText = data.data.narrative;
            } else if (data.message) {
                replyText = data.message;
            }

            const aiMsg: ChatMessage = {
                id: `ai-${Date.now()}`,
                sender: 'assistant',
                text: replyText,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                scope: data.data?.scope,
            };

            setMessages((prev) => [...prev, aiMsg]);
        } catch {
            const errorMsg: ChatMessage = {
                id: `err-${Date.now()}`,
                sender: 'assistant',
                text: 'Koneksi ke layanan AI terputus atau batas kuota harian tercapai. Silakan coba kembali sesaat lagi.',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
            setMessages((prev) => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    const onSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        handleSend();
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            href={route('ai.index')}
                            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Kembali ke AI Asisten"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                                <Bot className="h-5 w-5 text-primary" />
                                Chatbot AI Kinerja & SAKIP OPD
                            </h1>
                            <p className="text-xs text-muted-foreground">
                                Konsultasi interaktif data akuntabilitas dan indikator kinerja unit kerja
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                            <Shield className="h-3 w-3 mr-1" />
                            Data Terproteksi RBAC
                        </Badge>
                    </div>
                </div>
            }
        >
            <Head title="Chatbot AI SAKIP - e-KASUARI" />

            <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 space-y-4">
                <Card className="flex flex-col h-[calc(100vh-230px)] min-h-[500px] border shadow-xs bg-card">
                    {/* Header Bar */}
                    <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between space-y-0">
                        <div className="flex items-center gap-2">
                            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            <CardTitle className="text-sm font-semibold">Sesi Aktif AI Asisten</CardTitle>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => {
                                setMessages([
                                    {
                                        id: 'reset',
                                        sender: 'assistant',
                                        text: 'Percakapan baru telah dimulai. Ada yang dapat saya bantu mengenai data kinerja atau SAKIP Perangkat Daerah?',
                                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                        suggestedActions: QUICK_PROMPTS,
                                    },
                                ]);
                            }}
                        >
                            <RefreshCw className="h-3.5 w-3.5 mr-1" />
                            Mulai Ulang Sesi
                        </Button>
                    </CardHeader>

                    {/* Messages Container */}
                    <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={cn(
                                    'flex gap-3 max-w-3xl',
                                    msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                                )}
                            >
                                <div
                                    className={cn(
                                        'h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold',
                                        msg.sender === 'user'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-primary/10 border border-primary/20 text-primary'
                                    )}
                                >
                                    {msg.sender === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                                </div>

                                <div className="space-y-2">
                                    <div
                                        className={cn(
                                            'rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-xs',
                                            msg.sender === 'user'
                                                ? 'bg-primary text-primary-foreground rounded-tr-none'
                                                : 'bg-muted/80 text-foreground border border-border/60 rounded-tl-none'
                                        )}
                                    >
                                        <p className="whitespace-pre-wrap">{msg.text}</p>
                                    </div>

                                    {/* Suggested Actions if any */}
                                    {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {msg.suggestedActions.map((prompt, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    disabled={isLoading}
                                                    onClick={() => handleSend(prompt)}
                                                    className="text-xs bg-background hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border/80 px-2.5 py-1 rounded-full transition-colors inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                                >
                                                    <Sparkles className="h-3 w-3 text-primary" />
                                                    <span>{prompt}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    <div
                                        className={cn(
                                            'text-[10px] text-muted-foreground px-1 flex items-center gap-2',
                                            msg.sender === 'user' ? 'justify-end' : 'justify-start'
                                        )}
                                    >
                                        <span>{msg.timestamp}</span>
                                        {msg.scope && <span className="opacity-75">• Lingkup: {msg.scope}</span>}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex gap-3 max-w-3xl mr-auto">
                                <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                                    <Bot className="h-4 w-4 animate-spin" />
                                </div>
                                <div className="rounded-2xl px-4 py-3 bg-muted/80 text-foreground border border-border/60 rounded-tl-none">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span className="flex h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
                                        <span className="flex h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.2s]" />
                                        <span className="flex h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.4s]" />
                                        <span className="ml-1">Sedang menganalisis data faktual...</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </CardContent>

                    {/* Input Footer */}
                    <div className="p-3 sm:p-4 border-t bg-muted/30">
                        <form onSubmit={onSubmit} className="flex gap-2 items-center">
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ketik pertanyaan terkait indikator, capaian, dokumen, atau analisis SAKIP..."
                                disabled={isLoading}
                                className="flex-1 bg-background"
                            />
                            <Button type="submit" disabled={!input.trim() || isLoading} className="shrink-0">
                                <Send className="h-4 w-4 mr-1 sm:mr-1.5" />
                                <span className="hidden sm:inline">Kirim</span>
                            </Button>
                        </form>
                        <p className="text-[10px] text-muted-foreground mt-2 text-center flex items-center justify-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Respons AI disarikan secara langsung dari database akuntabilitas Perangkat Daerah.
                        </p>
                    </div>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
