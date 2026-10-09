import { useReveal } from '@/hooks/useReveal';
import { PropsWithChildren } from 'react';

export default function Reveal({
    children,
    delay = 0,
    className = '',
}: PropsWithChildren<{ delay?: 0 | 1 | 2 | 3 | 4; className?: string }>) {
    const ref = useReveal<HTMLDivElement>();

    return (
        <div
            ref={ref}
            className={`reveal ${delay ? `reveal-delay-${delay}` : ''} ${className}`}
        >
            {children}
        </div>
    );
}
