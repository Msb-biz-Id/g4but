import { usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast } from 'sonner';

/**
 * useFlash — reads Inertia flash props and fires Sonner toasts automatically.
 * Place this hook once in a layout wrapper or per-page.
 *
 * Expected flash props from Laravel:
 *   flash.success → green toast
 *   flash.error   → red/destructive toast
 *   flash.warning → amber toast
 *   flash.info    → info toast
 */
export function useFlash() {
    const { flash } = usePage().props as {
        flash: {
            success?: string | null;
            error?: string | null;
            warning?: string | null;
            info?: string | null;
        };
    };

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error)   toast.error(flash.error);
        if (flash?.warning) toast.warning(flash.warning);
        if (flash?.info)    toast.info(flash.info);
    }, [flash?.success, flash?.error, flash?.warning, flash?.info]);
}
