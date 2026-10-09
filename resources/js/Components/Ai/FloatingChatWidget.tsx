import React, { useState, useRef, useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import {
    Bot, X, Send, RotateCcw, Sparkles, User,
    Minus, Maximize2, Minimize2, Copy, Check,
    ShieldCheck, AlertTriangle, Loader2,
    FileText, BarChart3, TrendingUp, Lightbulb, Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageProps } from '@/types';

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
    sources?: Record<string, any> | null;
    isError?: boolean;
}

const QUICK_ACTIONS = [
    { label: 'Buat Executive Summary',          icon: FileText,   query: 'Buat Executive Summary kinerja Pemprov Papua Barat' },
    { label: 'Analisis Insight Kinerja',         icon: BarChart3,  query: 'Analisis insight kinerja dan anomali capaian' },
    { label: 'Prediksi Capaian Akhir Tahun',     icon: TrendingUp, query: 'Prediksi capaian akhir tahun dan serapan APBD' },
    { label: 'Rekomendasi Tindak Lanjut',        icon: Lightbulb,  query: 'Rekomendasi tindak lanjut penguatan SAKIP' },
    { label: 'Status Kinerja per OPD',           icon: Building2,  query: 'Status kinerja per OPD dan komparasi capaian' },
];

export interface FloatingChatWidgetProps {
    isOpen?: boolean;
    onClose?: () => void;
    onToggle?: () => void;
    sidebarCollapsed?: boolean;
    hideFloatingTrigger?: boolean;
}

export default function FloatingChatWidget({
    isOpen: controlledIsOpen,
    onClose: controlledOnClose,
    onToggle: controlledOnToggle,
    sidebarCollapsed = false,
    hideFloatingTrigger = true,
}: FloatingChatWidgetProps = {}) {
    const { auth } = usePage<PageProps>().props;
    const user = auth?.user;

    const STORAGE_MSG_KEY = `ekasuari-ai-chat-messages-${user?.id || 'default'}`;
    const STORAGE_MIN_KEY = 'ekasuari-ai-chat-minimized';

    const [localIsOpen, setLocalIsOpen] = useState(false);
    const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : localIsOpen;
    const [isMinimized, setIsMinimized] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false;
        return window.localStorage.getItem(STORAGE_MIN_KEY) === '1';
    });
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const toggleMinimize = () => {
        setIsMinimized((prev) => {
            const next = !prev;
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(STORAGE_MIN_KEY, next ? '1' : '0');
            }
            return next;
        });
    };

    const toggleOpen = () => {
        if (controlledOnToggle) {
            controlledOnToggle();
        } else if (controlledIsOpen !== undefined && controlledOnClose) {
            controlledOnClose();
        } else {
            setLocalIsOpen((prev) => !prev);
        }
        if (isMinimized) {
            setIsMinimized(false);
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(STORAGE_MIN_KEY, '0');
            }
        }
    };

    const handleClose = () => {
        if (controlledOnClose) {
            controlledOnClose();
        } else {
            setLocalIsOpen(false);
        }
    };

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const isOpdWide = Array.isArray(user?.roles)
        ? user.roles.some((r: any) =>
            typeof r === 'string'
                ? ['Super Admin', 'Admin OPD', 'Kepala OPD'].includes(r)
                : ['Super Admin', 'Admin OPD', 'Kepala OPD'].includes(r?.name)
        )
        : false;

    const userOrgName = user?.organizations?.[0]?.name || (user as any)?.organization?.name;
    const scopeLabel = isOpdWide
        ? 'Akses: Seluruh Unit Kerja (OPD)'
        : userOrgName
            ? `Akses: ${userOrgName}`
            : 'Akses: Unit Kerja Terotorisasi';

    const defaultWelcome: ChatMessage = {
        id: 'welcome',
        role: 'assistant',
        content: `Selamat datang **${user?.name || 'Bapak/Ibu'}**.\n\nSaya adalah **AI Asisten SAKIP & Kinerja e-KASUARI Perangkat Daerah** yang bertugas mendampingi Anda dalam analisis dan pemantauan akuntabilitas kinerja unit kerja secara objektif, transparan, dan berbasis data resmi sistem tanpa halusinasi.\n\nSilakan pilih salah satu menu analisis cepat di bawah atau ajukan pertanyaan spesifik terkait indikator, dokumen, anggaran, dan evaluasi SAKIP.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Chat memory
    const [messages, setMessages] = useState<ChatMessage[]>(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = window.localStorage.getItem(STORAGE_MSG_KEY);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        return parsed;
                    }
                }
            } catch (e) {
                console.error('Failed to load chat history from localStorage', e);
            }
        }
        return [defaultWelcome];
    });

    useEffect(() => {
        if (typeof window !== 'undefined' && messages.length > 0) {
            try {
                window.localStorage.setItem(STORAGE_MSG_KEY, JSON.stringify(messages));
            } catch (e) {
                console.error('Failed to save chat history to localStorage', e);
            }
        }
    }, [messages, STORAGE_MSG_KEY]);

    useEffect(() => {
        if (isOpen && !isMinimized) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen, isMinimized, isLoading]);

    useEffect(() => {
        if (isOpen && !isMinimized) {
            setTimeout(() => inputRef.current?.focus(), 150);
        }
    }, [isOpen, isMinimized]);

    // Helper untuk membersihkan string JSON mentah jika tidak sengaja terkirim
    const cleanOutputText = (raw: string): string => {
        const trimmed = raw.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            try {
                const parsed = JSON.parse(trimmed);
                let out = '';
                if (parsed.ringkasan) out += parsed.ringkasan + '\n\n';
                if (Array.isArray(parsed.perhatian) && parsed.perhatian.length > 0) {
                    out += '**Catatan Perhatian:**\n';
                    parsed.perhatian.forEach((p: any) => {
                        out += '- ' + (p.catatan || p.indikator || JSON.stringify(p)) + '\n';
                    });
                    out += '\n';
                }
                if (Array.isArray(parsed.rekomendasi) && parsed.rekomendasi.length > 0) {
                    out += '**Rekomendasi Tindak Lanjut:**\n';
                    parsed.rekomendasi.forEach((r: any) => {
                        out += '- ' + (r.tindakan || JSON.stringify(r)) + '\n';
                    });
                }
                if (out.trim()) return out.trim();
            } catch (e) {
                // Not JSON, continue
            }
        }
        return raw;
    };

    const handleSend = async (messageText?: string) => {
        const query = (messageText || input).trim();
        if (!query || isLoading) return;

        const userMsgId = 'msg-' + Date.now();
        const userMsg: ChatMessage = {
            id: userMsgId,
            role: 'user',
            content: query,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        const updatedMessages = [...messages, userMsg];
        setMessages(updatedMessages);
        setInput('');
        setIsLoading(true);

        const historyPayload = updatedMessages
            .filter((m) => m.role === 'user' || m.role === 'assistant')
            .slice(-10)
            .map((m) => ({
                role: m.role,
                content: m.content,
            }));

        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;
            const res = await fetch(route('ai.chat'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken || '',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({
                    message: query,
                    history: historyPayload,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                const errorMsg: ChatMessage = {
                    id: 'err-' + Date.now(),
                    role: 'assistant',
                    content: data.message || 'Layanan Asisten AI sedang tidak dapat dijangkau.',
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    isError: true,
                };
                setMessages((prev) => [...prev, errorMsg]);
                return;
            }

            const cleanContent = cleanOutputText(data.message || 'Tidak ada respon dari sistem.');

            const botMsg: ChatMessage = {
                id: 'bot-' + Date.now(),
                role: 'assistant',
                content: cleanContent,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                sources: data.sources || null,
            };

            setMessages((prev) => [...prev, botMsg]);
        } catch (err: any) {
            const networkErrorMsg: ChatMessage = {
                id: 'err-net-' + Date.now(),
                role: 'assistant',
                content: 'Gagal terhubung ke server. Silakan periksa koneksi atau coba lagi sesaat lagi.',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isError: true,
            };
            setMessages((prev) => [...prev, networkErrorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearChat = () => {
        const resetMsg: ChatMessage = {
            id: 'welcome-' + Date.now(),
            role: 'assistant',
            content: `Percakapan telah direset. Silakan pilih menu analisis cepat atau ajukan pertanyaan baru.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages([resetMsg]);
        if (typeof window !== 'undefined') {
            window.localStorage.removeItem(STORAGE_MSG_KEY);
        }
    };

    const handleCopy = (id: string, text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const renderMarkdown = (text: string) => {
        const lines = text.split('\n');
        return (
            <div className="space-y-1.5 text-xs sm:text-sm leading-relaxed">
                {lines.map((line, idx) => {
                    if (!line.trim()) return <div key={idx} className="h-1.5" />;

                    let formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                    formatted = formatted.replace(/`([^`]+)`/g, '<code class="bg-muted px-1 rounded text-[11px] font-mono">$1</code>');

                    if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
                        const content = formatted.replace(/^[\s\-•]+/, '');
                        return (
                            <div key={idx} className="flex items-start gap-1.5 ml-1">
                                <span className="text-primary font-bold mt-0.5">•</span>
                                <span dangerouslySetInnerHTML={{ __html: content }} />
                            </div>
                        );
                    }

                    const numMatch = line.match(/^(\d+)\.\s+(.*)$/);
                    if (numMatch) {
                        return (
                            <div key={idx} className="flex items-start gap-1.5 ml-1">
                                <span className="font-semibold text-primary">{numMatch[1]}.</span>
                                <span dangerouslySetInnerHTML={{ __html: numMatch[2].replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                            </div>
                        );
                    }

                    if (line.startsWith('###')) {
                        return <h4 key={idx} className="font-bold text-xs mt-2 text-foreground" dangerouslySetInnerHTML={{ __html: formatted.replace(/^###\s*/, '') }} />;
                    }
                    if (line.startsWith('##')) {
                        return <h3 key={idx} className="font-bold text-sm mt-2 text-foreground" dangerouslySetInnerHTML={{ __html: formatted.replace(/^##\s*/, '') }} />;
                    }

                    return <p key={idx} dangerouslySetInnerHTML={{ __html: formatted }} />;
                })}
            </div>
        );
    };

    if (!user) return null;

    return (
        <div
            className={cn(
                'fixed z-50 flex flex-col items-start transition-all duration-300 pointer-events-none',
                'bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] left-3 sm:left-4',
                sidebarCollapsed ? 'lg:left-20 lg:bottom-4' : 'lg:left-[272px] lg:bottom-4'
            )}
        >
            {/* Window Chat */}
            {isOpen && (
                <div
                    className={cn(
                        'pointer-events-auto bg-background border border-border shadow-2xl rounded-2xl flex flex-col overflow-hidden transition-all duration-200 mb-2',
                        isMinimized
                            ? 'w-72 sm:w-80 h-14'
                            : 'w-[calc(100vw-24px)] max-w-sm sm:max-w-md sm:w-[460px] h-[580px] max-h-[85vh]'
                    )}
                >
                    {/* Header Formal Tanpa Emoji */}
                    <div className="bg-primary px-4 py-3 text-primary-foreground flex items-center justify-between shadow-xs select-none">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-8 w-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0 border border-white/20">
                                <Bot className="h-4 w-4 text-white" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <h3 className="text-xs sm:text-sm font-bold truncate">
                                        AI Asisten e-KASUARI
                                    </h3>
                                    <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                                </div>
                                <p className="text-[10px] text-white/80 truncate font-normal">
                                    {scopeLabel}
                                </p>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-0.5 shrink-0">
                            {!isMinimized && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleClearChat}
                                    title="Reset Percakapan"
                                    className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/10"
                                >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={toggleMinimize}
                                title={isMinimized ? 'Perbesar' : 'Kecilkan'}
                                className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/10"
                            >
                                {isMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleClose}
                                title="Tutup"
                                className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/10"
                            >
                                <X className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>

                    {/* Chat Body */}
                    {!isMinimized && (
                        <>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50 dark:bg-slate-900/30 scrollbar-thin">
                                {messages.map((msg) => {
                                    const isUser = msg.role === 'user';
                                    return (
                                        <div
                                            key={msg.id}
                                            className={cn(
                                                'flex gap-2 max-w-[92%]',
                                                isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                                            )}
                                        >
                                            {!isUser && (
                                                <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 border border-primary/20">
                                                    <Bot className="h-3.5 w-3.5" />
                                                </div>
                                            )}

                                            <div className="space-y-1">
                                                <div
                                                    className={cn(
                                                        'rounded-2xl px-3.5 py-2.5 shadow-2xs text-left',
                                                        isUser
                                                            ? 'bg-primary text-primary-foreground rounded-tr-xs'
                                                            : msg.isError
                                                                ? 'bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-200 border border-red-200 dark:border-red-800 rounded-tl-xs'
                                                                : 'bg-card text-foreground border border-border rounded-tl-xs'
                                                    )}
                                                >
                                                    {isUser ? (
                                                        <p className="text-xs sm:text-sm whitespace-pre-wrap">{msg.content}</p>
                                                    ) : (
                                                        renderMarkdown(msg.content)
                                                    )}
                                                </div>

                                                <div
                                                    className={cn(
                                                        'flex items-center gap-2 px-1 text-[10px] text-muted-foreground',
                                                        isUser ? 'justify-end' : 'justify-start'
                                                    )}
                                                >
                                                    <span>{msg.timestamp}</span>
                                                    {!isUser && !msg.isError && (
                                                        <button
                                                            onClick={() => handleCopy(msg.id, msg.content)}
                                                            className="hover:text-foreground inline-flex items-center gap-1 transition-colors"
                                                            title="Salin Teks"
                                                        >
                                                            {copiedId === msg.id ? (
                                                                <>
                                                                    <Check className="h-3 w-3 text-emerald-500" />
                                                                    <span className="text-emerald-500">Tersalin</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Copy className="h-3 w-3" />
                                                                    <span>Salin</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {isLoading && (
                                    <div className="flex gap-2 max-w-[85%] mr-auto items-start">
                                        <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                                            <Bot className="h-3.5 w-3.5" />
                                        </div>
                                        <div className="bg-card border border-border rounded-2xl rounded-tl-xs px-3.5 py-2.5 shadow-2xs flex items-center gap-2 text-xs text-muted-foreground">
                                            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                                            <span>Menganalisis data kinerja sistem...</span>
                                        </div>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>

                            {/* 5 Quick Action Pills Sesuai Permintaan (Bebas Emoji) */}
                            <div className="px-3 pt-2.5 pb-2 bg-background border-t border-border">
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                        <Sparkles className="h-3 w-3 text-primary" />
                                        Menu Analisis Eksekutif Cepat:
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {QUICK_ACTIONS.map((action, i) => {
                                        const Icon = action.icon;
                                        return (
                                            <button
                                                key={i}
                                                onClick={() => handleSend(action.query)}
                                                className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-muted/60 hover:bg-primary hover:text-primary-foreground text-foreground px-2.5 py-1 rounded-lg border border-border hover:border-primary transition-all cursor-pointer select-none"
                                            >
                                                <Icon className="h-3.5 w-3.5 shrink-0" />
                                                <span>{action.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Input Form */}
                            <div className="p-3 bg-background border-t border-border">
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        handleSend();
                                    }}
                                    className="flex items-center gap-2"
                                >
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder="Ketik topik SAKIP, indikator, atau OPD..."
                                        disabled={isLoading}
                                        className="flex-1 bg-muted/50 border border-input rounded-xl px-3.5 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:bg-background transition-all"
                                    />
                                    <Button
                                        type="submit"
                                        size="icon"
                                        disabled={!input.trim() || isLoading}
                                        className="h-9 w-9 rounded-xl shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xs"
                                    >
                                        {isLoading ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Send className="h-4 w-4" />
                                        )}
                                    </Button>
                                </form>

                                <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground px-0.5">
                                    <span className="flex items-center gap-1 text-[9px]">
                                        <ShieldCheck className="h-3 w-3 text-primary" />
                                        Otorisasi RBAC Aktif • Bebas Halusinasi
                                    </span>
                                    <span className="text-[9px]">
                                        e-KASUARI
                                    </span>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ── Floating Launcher Trigger Button 'AI Asisten e-KASUARI' ── */}
            {!hideFloatingTrigger && (
                <button
                    type="button"
                    onClick={toggleOpen}
                    className={cn(
                        'pointer-events-auto group relative flex items-center gap-2.5 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer focus:outline-none focus:ring-4 focus:ring-primary/30 active:scale-95 border border-white/20 dark:border-slate-700/50',
                        isOpen && !isMinimized
                            ? 'h-10 px-3.5 rounded-full bg-slate-800 hover:bg-slate-900 text-white'
                            : 'h-11 px-3.5 rounded-full bg-gradient-to-r from-primary via-teal-600 to-emerald-600 hover:from-primary/95 hover:via-teal-600/95 hover:to-emerald-600/95 text-white'
                    )}
                    aria-label="AI Asisten e-KASUARI"
                    title="Tanya AI Asisten e-KASUARI"
                >
                    {isOpen && !isMinimized ? (
                        <>
                            <X className="h-4 w-4 text-slate-300 group-hover:rotate-90 transition-transform duration-200" />
                            <span className="text-xs font-semibold text-slate-200">Tutup</span>
                        </>
                    ) : (
                        <>
                            {/* Icon with online status pulse */}
                            <div className="relative flex items-center justify-center h-7 w-7 rounded-full bg-white/20 text-white shadow-inner shrink-0">
                                <Bot className="h-4 w-4 transition-transform group-hover:scale-110" />
                                <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 border border-white dark:border-slate-900" />
                                </span>
                            </div>

                            {/* Label & Description */}
                            <div className="flex flex-col items-start text-left pr-1 select-none">
                                <div className="flex items-center gap-1.5 leading-tight">
                                    <span className="text-xs font-bold tracking-tight text-white drop-shadow-xs">
                                        AI Asisten e-KASUARI
                                    </span>
                                    <Sparkles className="h-3 w-3 text-amber-300 fill-amber-300 animate-pulse shrink-0" />
                                </div>
                                <span className="text-[10px] text-white/90 font-normal leading-none mt-0.5">
                                    Tanya Data SAKIP
                                </span>
                            </div>
                        </>
                    )}
                </button>
            )}
        </div>
    );
}
