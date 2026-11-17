import { usePage } from '@inertiajs/react';
import { useCallback } from 'react';
import type { Locale } from '@/types';

export type TranslateFn = (
    key: string,
    replacements?: Record<string, string | number>,
) => string;

/**
 * UI strings use English text as keys (Laravel JSON translations), so a
 * missing translation gracefully falls back to English.
 */
export function useTrans(): {
    t: TranslateFn;
    locale: Locale;
    locales: Locale[];
    timezone: string;
} {
    const { translations, locale, locales, timezone } = usePage().props;

    const t = useCallback<TranslateFn>(
        (key, replacements = {}) => {
            let text = translations?.[key] ?? key;

            for (const [name, value] of Object.entries(replacements)) {
                text = text.replaceAll(`:${name}`, String(value));
            }

            return text;
        },
        [translations],
    );

    return { t, locale, locales, timezone };
}
