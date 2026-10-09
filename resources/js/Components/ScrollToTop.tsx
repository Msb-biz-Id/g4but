import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

export default function ScrollToTop() {
    const [visible, setVisible] = useState(false);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            
            if (scrollTop > 240) {
                setVisible(true);
            } else {
                setVisible(false);
            }

            if (docHeight > 0) {
                const currentProgress = Math.min(100, Math.max(0, (scrollTop / docHeight) * 100));
                setProgress(currentProgress);
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };

    // SVG Circular Progress Math (radius = 20, size = 48)
    const radius = 20;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <div
            className={`fixed bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] right-3 sm:right-5 lg:bottom-6 lg:right-6 z-40 transition-all duration-500 ease-out ${
                visible
                    ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
                    : 'opacity-0 translate-y-6 scale-90 pointer-events-none'
            }`}
        >
            <button
                type="button"
                onClick={scrollToTop}
                aria-label={`Kembali ke atas (${Math.round(progress)}%)`}
                title={`Kembali ke atas (${Math.round(progress)}%)`}
                className="group relative flex h-12 w-12 sm:h-13 sm:w-13 items-center justify-center rounded-full bg-white/90 p-0 text-slate-800 shadow-xl shadow-indigo-950/15 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-amber-500/20 focus:outline-none focus:ring-2 focus:ring-amber-400/80 focus:ring-offset-2 dark:bg-slate-900/90 dark:text-slate-100 dark:shadow-black/50 dark:focus:ring-offset-slate-950"
            >
                {/* SVG Progress Ring */}
                <svg
                    className="absolute inset-0 h-full w-full -rotate-90 transform p-0.5"
                    viewBox="0 0 48 48"
                >
                    {/* Background Track Circle */}
                    <circle
                        cx="24"
                        cy="24"
                        r={radius}
                        className="stroke-amber-100/80 dark:stroke-slate-800"
                        strokeWidth="2.5"
                        fill="transparent"
                    />
                    {/* Active Progress Gold Circle */}
                    <circle
                        cx="24"
                        cy="24"
                        r={radius}
                        className="stroke-amber-500 transition-all duration-150 ease-out dark:stroke-amber-400"
                        strokeWidth="2.5"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        fill="transparent"
                    />
                </svg>

                {/* Inner Content & Arrow */}
                <span className="relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-gradient-to-tr from-amber-50 to-indigo-50/50 transition-all duration-300 group-hover:bg-gradient-to-tr group-hover:from-amber-100 group-hover:to-amber-50 dark:from-slate-800 dark:to-slate-850 dark:group-hover:from-amber-950/50 dark:group-hover:to-slate-800">
                    <ArrowUp className="h-4 w-4 sm:h-4.5 sm:w-4.5 stroke-[2.5] text-amber-700 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:text-amber-600 dark:text-amber-400 dark:group-hover:text-amber-300" />
                </span>

                {/* Ambient Hover Glow */}
                <span className="absolute -inset-0.5 -z-10 rounded-full bg-gradient-to-r from-amber-500 to-indigo-600 opacity-0 blur-xs transition-opacity duration-300 group-hover:opacity-40" />
            </button>
        </div>
    );
}
