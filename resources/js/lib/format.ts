import type { Locale } from '@/types';

const intlLocales: Record<Locale, string> = {
    ro: 'ro-RO',
    ru: 'ru-RU',
    en: 'en-GB',
};

export function intlLocale(locale: Locale): string {
    return intlLocales[locale] ?? 'ro-RO';
}

export function formatDateTime(
    iso: string,
    locale: Locale,
    timeZone: string,
): string {
    return new Intl.DateTimeFormat(intlLocale(locale), {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone,
    }).format(new Date(iso));
}

export function formatTime(
    iso: string,
    locale: Locale,
    timeZone: string,
): string {
    return new Intl.DateTimeFormat(intlLocale(locale), {
        hour: '2-digit',
        minute: '2-digit',
        timeZone,
    }).format(new Date(iso));
}

/**
 * Formats a plain Y-m-d date (already a local calendar day).
 */
export function formatDay(
    date: string,
    locale: Locale,
    options: Intl.DateTimeFormatOptions = {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    },
): string {
    return new Intl.DateTimeFormat(intlLocale(locale), {
        ...options,
        timeZone: 'UTC',
    }).format(new Date(`${date}T00:00:00Z`));
}

export function formatMonth(
    iso: string,
    locale: Locale,
    timeZone: string,
): string {
    return new Intl.DateTimeFormat(intlLocale(locale), {
        month: 'long',
        year: 'numeric',
        timeZone,
    }).format(new Date(iso));
}

export function formatRelative(iso: string, locale: Locale): string {
    const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
    const formatter = new Intl.RelativeTimeFormat(intlLocale(locale), {
        numeric: 'auto',
    });
    const units: [Intl.RelativeTimeFormatUnit, number][] = [
        ['day', 86400],
        ['hour', 3600],
        ['minute', 60],
    ];

    for (const [unit, size] of units) {
        if (Math.abs(seconds) >= size) {
            return formatter.format(Math.round(seconds / size), unit);
        }
    }

    return formatter.format(seconds, 'second');
}

export function formatDuration(totalSeconds: number, locale: Locale): string {
    const minutes = Math.max(1, Math.round(totalSeconds / 60));
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    const rest = minutes % 60;
    const unit = (value: number, name: 'day' | 'hour' | 'minute') =>
        new Intl.NumberFormat(intlLocale(locale), {
            style: 'unit',
            unit: name,
            unitDisplay: 'short',
        }).format(value);

    return [
        days ? unit(days, 'day') : null,
        hours ? unit(hours, 'hour') : null,
        rest || (!days && !hours) ? unit(rest, 'minute') : null,
    ]
        .filter(Boolean)
        .join(' ');
}

export function formatPercent(
    value: number | null,
    locale: Locale,
    digits = 2,
): string {
    if (value === null) {
        return '—';
    }

    return `${new Intl.NumberFormat(intlLocale(locale), {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    }).format(value)}%`;
}
