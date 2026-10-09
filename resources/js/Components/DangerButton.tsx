import { Button } from '@/Components/ui/button';
import { ButtonHTMLAttributes } from 'react';

export default function DangerButton({
    className = '',
    disabled,
    children,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <Button
            variant="destructive"
            className={className}
            disabled={disabled}
            {...props}
        >
            {children}
        </Button>
    );
}