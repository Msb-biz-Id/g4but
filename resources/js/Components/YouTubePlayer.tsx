import React from 'react';
import { getYouTubeEmbedUrl, getYouTubeThumbnailUrl, isYouTubeUrl } from '@/lib/video';
import { Play, Video } from 'lucide-react';

export function YouTubeIcon({ className = 'h-4 w-4' }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
    );
}

interface Props {
    url: string | null | undefined;
    title?: string;
    className?: string;
    autoPlay?: boolean;
    showPlaceholder?: boolean;
}

export function YouTubePlayer({
    url,
    title = 'Video Tutorial',
    className = '',
    autoPlay = false,
    showPlaceholder = true,
}: Props) {
    const embedUrl = getYouTubeEmbedUrl(url);

    if (!embedUrl) {
        if (!showPlaceholder) return null;
        return (
            <div className={`flex flex-col items-center justify-center p-8 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-400 text-center ${className}`}>
                <Video className="w-10 h-10 mb-2 opacity-40" />
                <p className="text-xs font-medium">Link video YouTube belum diisi atau tidak valid.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Contoh: https://www.youtube.com/watch?v=... atau https://youtu.be/...</p>
            </div>
        );
    }

    const finalEmbed = autoPlay ? `${embedUrl}&autoplay=1` : embedUrl;

    return (
        <div className={`relative w-full aspect-video rounded-xl sm:rounded-2xl overflow-hidden shadow-md border border-slate-200 dark:border-slate-800 bg-black ${className}`}>
            <iframe
                src={finalEmbed}
                title={title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
                className="absolute inset-0 w-full h-full border-0"
            />
        </div>
    );
}

export default YouTubePlayer;

/**
 * YouTube Thumbnail Card with Play Overlay for Cards & Lists
 */
export function YouTubeThumbnail({
    url,
    title,
    alt,
    onClick,
    className = '',
}: {
    url: string | null | undefined;
    title?: string;
    alt?: string;
    onClick?: () => void;
    className?: string;
}) {
    const displayTitle = title || alt;
    const thumbUrl = getYouTubeThumbnailUrl(url);

    if (!thumbUrl) {
        return (
            <div className={`aspect-video w-full rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 ${className}`}>
                <Video className="w-8 h-8 opacity-40" />
            </div>
        );
    }

    return (
        <div
            onClick={onClick}
            className={`group relative aspect-video w-full rounded-xl overflow-hidden shadow-xs cursor-pointer bg-slate-900 ${className}`}
        >
            <img
                src={thumbUrl}
                alt={title || 'Thumbnail Video'}
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
            />
            {/* Play Button Overlay */}
            <div className="absolute inset-0 bg-black/25 group-hover:bg-black/40 flex items-center justify-center transition-colors">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-600/90 text-white group-hover:scale-110 shadow-lg transition-transform">
                    <Play className="w-5 h-5 fill-white ml-0.5" />
                </div>
            </div>
            {title && (
                <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                    <p className="text-white text-xs font-semibold truncate drop-shadow-xs">{title}</p>
                </div>
            )}
        </div>
    );
}
