import { usePage } from '@inertiajs/react';
import { useCallback } from 'react';
import type { Locale, Translations } from '@/types';

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
    translated: (values: Translations | null | undefined) => string;
    locale: Locale;
    locales: Locale[];
    timezone: string;
} {
    const { translations, locale, locales, timezone, defaultLocale } =
        usePage().props;

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

    /** Pick a {ro, ru, en} value in the current language, then the default one. */
    const translated = useCallback(
        (values: Translations | null | undefined): string =>
            values?.[locale] ||
            values?.[defaultLocale] ||
            Object.values(values ?? {}).find(Boolean) ||
            '',
        [locale, defaultLocale],
    );

    return { t, translated, locale, locales, timezone };
}
