import { Toaster } from '@/Components/ui/sonner';
import { useFlash } from '@/hooks/useFlash';

/**
 * FlashToaster — drop this anywhere inside <AuthenticatedLayout> to enable
 * Sonner toast notifications from Laravel flash messages.
 * Renders the <Toaster> portal + fires toasts on flash changes.
 *
 * Usage: <FlashToaster /> anywhere in a page component.
 */
export function FlashToaster() {
    useFlash();
    return <Toaster position="top-right" richColors closeButton />;
}
