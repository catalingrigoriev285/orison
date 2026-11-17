import type { SVGAttributes } from 'react';

/**
 * The Orison mark: a sun rising over the horizon, inside an orbit.
 * Drawn in currentColor so it adapts to light and dark surfaces.
 */
export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg
            {...props}
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            <circle
                cx="16"
                cy="16"
                r="12.5"
                stroke="currentColor"
                strokeWidth="2.5"
            />
            <path d="M9.5 19a6.5 6.5 0 0 1 13 0Z" fill="currentColor" />
            <path
                d="M5.5 19h21"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
            />
        </svg>
    );
}
