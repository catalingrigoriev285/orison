import { createInertiaApp, router } from '@inertiajs/react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import SettingsLayout from '@/layouts/settings/layout';
import StatusLayout from '@/layouts/status-layout';

// The brand name is editable in Admin → Settings, so read it from the page
// instead of baking it in at build time.
let appName =
    (typeof document !== 'undefined' &&
        document
            .querySelector('meta[name="application-name"]')
            ?.getAttribute('content')) ||
    import.meta.env.VITE_APP_NAME ||
    'Orison';

router.on('navigate', (event) => {
    appName = event.detail.page.props.brand?.name ?? appName;
});

void createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    layout: (name) => {
        switch (true) {
            case name.startsWith('status/'):
                return StatusLayout;
            case name.startsWith('auth/'):
                return AuthLayout;
            case name.startsWith('settings/'):
                return [AppLayout, SettingsLayout];
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                {app}
                <Toaster />
            </TooltipProvider>
        );
    },
    progress: {
        color: '#0071e3',
    },
});

// This will set light / dark mode on load...
initializeTheme();
