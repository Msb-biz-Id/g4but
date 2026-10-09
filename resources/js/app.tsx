import '../css/app.css';
import './bootstrap';

import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { Suspense } from 'react';
import { initTheme, applyServerTheme } from './lib/theme';
import type { PageProps } from './types';

initTheme();

router.on('navigate', (event) => {
    const theme = (event.detail.page.props as unknown as PageProps)?.theme;
    if (theme) {
        applyServerTheme(theme);
    }
});

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

function PageLoader() {
    return (
        <div className="flex h-screen items-center justify-center bg-background">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
    );
}

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.tsx`,
            import.meta.glob('./Pages/**/*.tsx', { eager: false }),
        ),
    setup({ el, App, props }) {
        const initialTheme = (props.initialPage.props as unknown as PageProps)?.theme;
        if (initialTheme) {
            applyServerTheme(initialTheme);
        }

        const root = createRoot(el);

        root.render(
            <Suspense fallback={<PageLoader />}>
                <App {...props} />
            </Suspense>,
        );
    },
    progress: {
        color: '#4B5563',
    },
});

