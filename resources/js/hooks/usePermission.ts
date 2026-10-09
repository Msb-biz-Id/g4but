import { usePage } from '@inertiajs/react';
import { PageProps } from '@/types';

/**
 * Hook untuk mengecek permission/role pengguna saat ini.
 * Sesuai FR-IAM-003: RBAC berbasis resource + action.
 */
export function usePermission() {
    const { auth } = usePage<PageProps>().props;

    const hasPermission = (permission: string): boolean => {
        return auth.user?.permissions?.includes(permission) ?? false;
    };

    const hasRole = (role: string): boolean => {
        return auth.user?.roles?.some((r) => r.name === role) ?? false;
    };

    const hasAnyRole = (roles: string[]): boolean => {
        return roles.some((role) => hasRole(role));
    };

    const hasAnyPermission = (permissions: string[]): boolean => {
        return permissions.some((perm) => hasPermission(perm));
    };

    return { hasPermission, hasRole, hasAnyRole, hasAnyPermission, user: auth.user };
}
