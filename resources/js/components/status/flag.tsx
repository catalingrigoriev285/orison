import { useId } from 'react';
import { cn } from '@/lib/utils';
import type { Locale } from '@/types';

/**
 * Small inline flag for each supported language, in a 3:2 rounded frame.
 * SVG keeps flags identical on every OS (emoji flags don't render on Windows).
 */
export function Flag({
    locale,
    className,
}: {
    locale: Locale;
    className?: string;
}) {
    return (
        <span
            aria-hidden="true"
            className={cn(
                'inline-flex h-3.5 w-5 shrink-0 overflow-hidden rounded-[3px] shadow-[0_0_0_0.5px_rgba(0,0,0,0.18)]',
                className,
            )}
        >
            {locale === 'ro' && <Romania />}
            {locale === 'ru' && <Russia />}
            {locale === 'en' && <UnitedKingdom />}
        </span>
    );
}

function Romania() {
    return (
        <svg viewBox="0 0 3 2" className="size-full" preserveAspectRatio="none">
            <rect width="1" height="2" fill="#002B7F" />
            <rect x="1" width="1" height="2" fill="#FCD116" />
            <rect x="2" width="1" height="2" fill="#CE1126" />
        </svg>
    );
}

function Russia() {
    return (
        <svg viewBox="0 0 3 2" className="size-full" preserveAspectRatio="none">
            <rect width="3" height="2" fill="#FFFFFF" />
            <rect y="0.667" width="3" height="0.667" fill="#0039A6" />
            <rect y="1.333" width="3" height="0.667" fill="#D52B1E" />
        </svg>
    );
}

function UnitedKingdom() {
    const id = useId();

    return (
        <svg
            viewBox="0 0 60 30"
            className="size-full"
            preserveAspectRatio="xMidYMid slice"
        >
            <clipPath id={`${id}-diag`}>
                <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
            </clipPath>
            <rect width="60" height="30" fill="#012169" />
            <path
                d="M0,0 L60,30 M60,0 L0,30"
                stroke="#FFFFFF"
                strokeWidth="6"
            />
            <path
                d="M0,0 L60,30 M60,0 L0,30"
                clipPath={`url(#${id}-diag)`}
                stroke="#C8102E"
                strokeWidth="4"
            />
            <path d="M30,0 v30 M0,15 h60" stroke="#FFFFFF" strokeWidth="10" />
            <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
        </svg>
    );
}
