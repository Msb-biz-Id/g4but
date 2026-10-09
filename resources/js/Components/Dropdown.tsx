import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import { InertiaLinkProps, Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';

const Dropdown = ({ children }: PropsWithChildren) => {
    return <DropdownMenu>{children}</DropdownMenu>;
};

const Trigger = ({ children }: PropsWithChildren) => {
    return <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>;
};

const Content = ({
    align = 'right',
    width = '48',
    contentClasses = 'py-1',
    children,
}: PropsWithChildren<{
    align?: 'left' | 'right';
    width?: '48';
    contentClasses?: string;
}>) => {
    return (
        <DropdownMenuContent
            align={align === 'right' ? 'end' : 'start'}
            className={width === '48' ? 'min-w-48' : ''}
        >
            <div className={contentClasses}>{children}</div>
        </DropdownMenuContent>
    );
};

const DropdownLink = ({
    className = '',
    children,
    ...props
}: InertiaLinkProps) => {
    return (
        <DropdownMenuItem asChild>
            <Link {...props} className={className}>
                {children}
            </Link>
        </DropdownMenuItem>
    );
};

Dropdown.Trigger = Trigger;
Dropdown.Content = Content;
Dropdown.Link = DropdownLink;

export default Dropdown;