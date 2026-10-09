import { Button } from '@/Components/ui/button';
import { ButtonHTMLAttributes } from 'react';

export default function SecondaryButton({
    type = 'button',
    className = '',
    disabled,
    children,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <Button
            type={type}
            variant="outline"
            className={className}
            disabled={disabled}
            {...props}
        >
            {children}
        </Button>
    );
}