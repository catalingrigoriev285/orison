import type { Auth } from '@/types/auth';
import type { Locale } from '@/types/status';

declare module 'react' {
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            sidebarOpen: boolean;
            brand: { name: string; website_url: string | null };
            locale: Locale;
            locales: Locale[];
            timezone: string;
            translations: Record<string, string>;
            [key: string]: unknown;
        };
    }
}
