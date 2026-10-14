import { ImgHTMLAttributes } from 'react';
import { usePage } from '@inertiajs/react';
import { cn } from '@/lib/utils';

export default function ApplicationLogo({
    className,
    alt,
    src,
    ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
    const { appConfig } = usePage<any>().props;
    const resolvedSrc = src || appConfig?.logoUrl || '/logo.webp';
    const resolvedAlt = alt || `Logo ${appConfig?.appName || 'SIM Kinerja'} ${appConfig?.instansiName || ''}`.trim();

    return (
        <img
            src={resolvedSrc}
            alt={resolvedAlt}
            className={cn('object-contain shrink-0', className)}
            {...props}
        />
    );
}
