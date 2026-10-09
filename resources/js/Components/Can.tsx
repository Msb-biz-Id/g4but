import { usePage } from '@inertiajs/react';
import { ReactNode } from 'react';
import { PageProps } from '@/types';

interface CanProps {
    permission: string | string[];
    fallback?: ReactNode;
    children: ReactNode;
}

/**
 * <Can permission="user:create"> guard component.
 * Renders children only if the current user has ALL listed permissions.
 * For ANY match, use permission={['a', 'b']} with requireAll={false}.
 *
 * BRD FR-IAM: permission-based rendering, no write ops on unauthorized routes.
 */
export function Can({ permission, fallback = null, children }: CanProps) {
    const { auth } = usePage<PageProps>().props;
    const userPermissions: string[] = auth.user?.permissions ?? [];

    const required = Array.isArray(permission) ? permission : [permission];
    const hasAccess = required.every((p) => userPermissions.includes(p));

    return hasAccess ? <>{children}</> : <>{fallback}</>;
}

/**
 * usePermission(permission): returns boolean.
 * Use when you need imperative permission check in component logic.
 */
export function usePermission(permission: string | string[]): boolean {
    const { auth } = usePage<PageProps>().props;
    const userPermissions: string[] = auth.user?.permissions ?? [];
    const required = Array.isArray(permission) ? permission : [permission];
    return required.every((p) => userPermissions.includes(p));
}
