import { ImgHTMLAttributes } from 'react';
import { usePage } from '@inertiajs/react';
import { cn } from '@/lib/utils';

export default function ApplicationLogo({
    className,
    alt = 'Logo e-KASUARI Papua Barat',
    src,
    ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
    const { appConfig } = usePage<any>().props;
    const resolvedSrc = src || appConfig?.logoUrl || '/logo.webp';

    return (
        <img
            src={resolvedSrc}
            alt={alt}
            className={cn('object-contain shrink-0', className)}
            {...props}
        />
    );
}
