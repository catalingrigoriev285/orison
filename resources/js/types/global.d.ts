import type { Auth } from '@/types/auth';
import type { Brand, Locale } from '@/types/status';

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
            brand: Brand;
            defaultLocale: Locale;
            locale: Locale;
            locales: Locale[];
            timezone: string;
            translations: Record<string, string>;
            [key: string]: unknown;
        };
    }
}
