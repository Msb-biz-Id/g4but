/**
 * Helper utilities for YouTube video auto-embedding and thumbnail extraction.
 */

/**
 * Extract YouTube 11-character video ID from various URL formats or iframe snippets:
 * - https://www.youtube.com/watch?v=dQw4w9WgXcQ
 * - https://youtu.be/dQw4w9WgXcQ
 * - https://www.youtube.com/embed/dQw4w9WgXcQ
 * - https://www.youtube.com/shorts/dQw4w9WgXcQ
 * - <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"...
 */
export function getYouTubeVideoId(url: string | null | undefined): string | null {
    if (!url || typeof url !== 'string') return null;
    const cleanUrl = url.trim();

    // Check if input is an iframe code
    const iframeMatch = cleanUrl.match(/src=["'](?:https?:)?\/\/(?:www\.)?youtube(?:-nocookie)?\.com\/embed\/([a-zA-Z0-9_-]{11})/i);
    if (iframeMatch?.[1]) {
        return iframeMatch[1];
    }

    // Standard YouTube URL regex
    const regExp = /(?:youtube(?:-nocookie)?\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/i;
    const match = cleanUrl.match(regExp);

    if (match?.[1]) {
        return match[1];
    }

    // Direct 11-character video ID string
    if (/^[a-zA-Z0-9_-]{11}$/.test(cleanUrl)) {
        return cleanUrl;
    }

    return null;
}

/**
 * Returns privacy-enhanced YouTube embed URL (youtube-nocookie.com)
 */
export function getYouTubeEmbedUrl(url: string | null | undefined): string | null {
    const videoId = getYouTubeVideoId(url);
    if (!videoId) return null;
    return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`;
}

/**
 * Returns high quality YouTube thumbnail URL
 */
export function getYouTubeThumbnailUrl(url: string | null | undefined): string | null {
    const videoId = getYouTubeVideoId(url);
    if (!videoId) return null;
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

/**
 * Check if a URL or text is a valid YouTube reference
 */
export function isYouTubeUrl(url: string | null | undefined): boolean {
    return getYouTubeVideoId(url) !== null;
}
