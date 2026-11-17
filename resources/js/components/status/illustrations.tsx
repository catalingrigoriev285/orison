import type { ComponentType } from 'react';
import { componentStatusTone } from '@/lib/status';
import { cn } from '@/lib/utils';
import type { ComponentStatus, IllustrationStyle } from '@/types';

/**
 * Built-in illustrations shown above the status card. Each style has four
 * variants that follow the overall status. Colours come from theme CSS
 * variables only, so they follow the accent colour and dark mode.
 */
export const ILLUSTRATIONS: { id: IllustrationStyle; label: string }[] = [
    { id: 'horizon', label: 'Horizon' },
    { id: 'servers', label: 'Servers' },
    { id: 'cloud', label: 'Cloud' },
    { id: 'pulse', label: 'Pulse' },
];

type Variant = 'operational' | 'degraded' | 'major' | 'maintenance';

const variantOf: Record<ComponentStatus, Variant> = {
    operational: 'operational',
    degraded_performance: 'degraded',
    partial_outage: 'degraded',
    major_outage: 'major',
    under_maintenance: 'maintenance',
};

type Palette = {
    variant: Variant;
    /** Colour of the current status (green, yellow, orange, red or blue). */
    status: string;
};

type SceneProps = { palette: Palette };

const SCENES: Record<IllustrationStyle, ComponentType<SceneProps>> = {
    horizon: Horizon,
    servers: Servers,
    cloud: CloudScene,
    pulse: Pulse,
};

const SURFACE = 'var(--card)';
const FILL = 'var(--fill)';
const LINE = 'var(--border)';
const INK = 'var(--muted-foreground)';
const ACCENT = 'var(--primary)';

export function StatusIllustration({
    illustration,
    status,
    className,
}: {
    illustration: IllustrationStyle;
    status: ComponentStatus;
    className?: string;
}) {
    const palette: Palette = {
        variant: variantOf[status],
        status: `var(--status-${componentStatusTone[status]})`,
    };

    // Rendered as a component (not called as a function) so each scene keeps
    // its own hooks; the React Compiler adds memo hooks to every scene.
    const Scene = SCENES[illustration];

    if (!Scene) {
        return null;
    }

    return (
        <svg
            viewBox="0 0 280 160"
            fill="none"
            aria-hidden="true"
            className={cn('block h-auto w-full', className)}
        >
            <ellipse cx="140" cy="148" rx="104" ry="7" fill={FILL} />
            <Scene key={illustration} palette={palette} />
        </svg>
    );
}

/** Round status badge with a white glyph. */
function Badge({ x, y, palette }: { x: number; y: number; palette: Palette }) {
    const glyph = {
        operational: <path d="M-5.5 0.5l3.8 3.8L5.8-4.2" />,
        degraded: (
            <>
                <path d="M0-5.5v6" />
                <circle cx="0" cy="5" r="0.6" fill="#fff" />
            </>
        ),
        major: <path d="M-4.5-4.5l9 9M4.5-4.5l-9 9" />,
        maintenance: (
            <path
                transform="translate(-7.2 -7.2) scale(0.6)"
                d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
                strokeWidth={3.6}
            />
        ),
    }[palette.variant];

    return (
        <g transform={`translate(${x} ${y})`}>
            <circle
                r="15"
                fill={palette.status}
                stroke={SURFACE}
                strokeWidth="4"
            />
            <g
                stroke="#fff"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                {glyph}
            </g>
        </g>
    );
}

/** Cloud outline in an 80×44 box. */
function CloudShape({
    transform,
    fill = SURFACE,
}: {
    transform: string;
    fill?: string;
}) {
    return (
        <path
            transform={transform}
            d="M14 44H66A14 14 0 0 0 68 16A22 22 0 0 0 26 12A16 16 0 0 0 14 44Z"
            fill={fill}
            stroke={LINE}
            strokeWidth="2"
            strokeLinejoin="round"
        />
    );
}

function Rain({ x, y, color }: { x: number; y: number; color: string }) {
    return (
        <g stroke={color} strokeWidth="2.4" strokeLinecap="round">
            {[0, 14, 28].map((dx, i) => (
                <path key={dx} d={`M${x + dx} ${y + (i % 2) * 6}l-3 8`} />
            ))}
        </g>
    );
}

/* ------------------------------------------------------------------ */
/* Horizon: a sun over the horizon inside an orbit (the Orison mark).   */
/* ------------------------------------------------------------------ */
function Horizon({ palette }: SceneProps) {
    const { variant, status } = palette;
    const sunColor =
        variant === 'major'
            ? LINE
            : variant === 'operational'
              ? ACCENT
              : status;

    return (
        <>
            <circle
                cx="140"
                cy="90"
                r="70"
                stroke={LINE}
                strokeWidth="2"
                strokeDasharray="2 7"
                strokeLinecap="round"
            />
            <circle
                cx="140"
                cy="90"
                r="58"
                fill={SURFACE}
                stroke={LINE}
                strokeWidth="2"
            />
            <circle cx="84" cy="50" r="5.5" fill={ACCENT} />

            {variant === 'operational' && (
                <g stroke={ACCENT} strokeWidth="3" strokeLinecap="round">
                    <path d="M140 50v-9M112 60l-6-6M168 60l6-6M100 82h-9M180 82h9" />
                </g>
            )}

            <path d="M108 112a32 32 0 0 1 64 0Z" fill={sunColor} />
            <rect x="74" y="112" width="132" height="12" rx="6" fill={FILL} />
            <path
                d="M66 112h148"
                stroke={INK}
                strokeWidth="3"
                strokeLinecap="round"
            />

            {variant === 'degraded' && (
                <CloudShape transform="translate(138 58) scale(0.85)" />
            )}
            {variant === 'major' && (
                <>
                    <CloudShape transform="translate(96 46) scale(1.05)" />
                    <CloudShape transform="translate(142 62) scale(0.8)" />
                    <Rain x={118} y={98} color={status} />
                </>
            )}
            {variant === 'maintenance' && (
                <g
                    stroke={status}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M196 112V52h-34M196 60l-8-8M196 70l-8-8M196 80l-8-8" />
                    <path d="M166 52v14" />
                    <rect
                        x="159"
                        y="66"
                        width="14"
                        height="10"
                        rx="2"
                        fill={SURFACE}
                    />
                </g>
            )}

            <Badge x={210} y={40} palette={palette} />
        </>
    );
}

/* ------------------------------------------------------------------ */
/* Servers: a rack whose lights follow the status.                      */
/* ------------------------------------------------------------------ */
function Servers({ palette }: SceneProps) {
    const { variant, status } = palette;
    const units = [0, 1, 2].map((index) => {
        const isAffected =
            (variant === 'degraded' && index === 1) ||
            (variant === 'major' && index === 1) ||
            (variant === 'maintenance' && index === 0);

        return {
            y: 34 + index * 30,
            shift: variant === 'major' && index === 1 ? 22 : 0,
            light: isAffected
                ? status
                : variant === 'major'
                  ? status
                  : 'var(--status-operational)',
            outline: isAffected && variant !== 'degraded' ? status : LINE,
        };
    });

    return (
        <>
            <rect x="92" y="26" width="96" height="104" rx="12" fill={FILL} />
            {units.map((unit, index) => (
                <g key={index} transform={`translate(${unit.shift} 0)`}>
                    <rect
                        x="100"
                        y={unit.y}
                        width="80"
                        height="24"
                        rx="7"
                        fill={SURFACE}
                        stroke={unit.outline}
                        strokeWidth="2"
                    />
                    {[0, 1, 2].map((dot) => (
                        <circle
                            key={dot}
                            cx={112 + dot * 9}
                            cy={unit.y + 12}
                            r="3"
                            fill={unit.light}
                        />
                    ))}
                    <path
                        d={`M146 ${unit.y + 9}h24M146 ${unit.y + 15}h24`}
                        stroke={LINE}
                        strokeWidth="2"
                        strokeLinecap="round"
                    />
                </g>
            ))}
            <path
                d="M104 130v8M176 130v8"
                stroke={INK}
                strokeWidth="3"
                strokeLinecap="round"
            />

            <path
                d="M60 64h20M60 64v40h20"
                stroke={variant === 'major' ? status : ACCENT}
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeDasharray={variant === 'operational' ? undefined : '4 5'}
            />
            <circle
                cx="60"
                cy="64"
                r="5"
                fill={variant === 'major' ? status : ACCENT}
            />

            <Badge x={206} y={30} palette={palette} />
        </>
    );
}

/* ------------------------------------------------------------------ */
/* Cloud: a cloud connected to three devices.                           */
/* ------------------------------------------------------------------ */
function CloudScene({ palette }: SceneProps) {
    const { variant, status } = palette;
    const link = variant === 'operational' ? ACCENT : status;
    const dashed =
        variant === 'degraded' || variant === 'maintenance' ? '4 5' : undefined;

    return (
        <>
            <g
                stroke={link}
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeDasharray={dashed}
            >
                <path d="M118 72L86 108" />
                {variant === 'major' ? (
                    <path d="M140 74v10M140 94v10" />
                ) : (
                    <path d="M140 74v30" />
                )}
                <path d="M162 72l32 36" />
            </g>
            {variant === 'major' && (
                <path
                    d="M134 86l12 6"
                    stroke={status}
                    strokeWidth="2.4"
                    strokeLinecap="round"
                />
            )}

            <CloudShape transform="translate(98 22) scale(1.05)" />
            {variant === 'major' && <Rain x={122} y={74} color={status} />}

            {/* Laptop */}
            <rect
                x="62"
                y="108"
                width="40"
                height="26"
                rx="4"
                fill={SURFACE}
                stroke={LINE}
                strokeWidth="2"
            />
            <path
                d="M56 138h52"
                stroke={INK}
                strokeWidth="3"
                strokeLinecap="round"
            />
            {/* Phone */}
            <rect
                x="130"
                y="106"
                width="20"
                height="34"
                rx="5"
                fill={SURFACE}
                stroke={LINE}
                strokeWidth="2"
            />
            <path
                d="M137 134h6"
                stroke={LINE}
                strokeWidth="2"
                strokeLinecap="round"
            />
            {/* Monitor */}
            <rect
                x="176"
                y="108"
                width="40"
                height="26"
                rx="4"
                fill={SURFACE}
                stroke={LINE}
                strokeWidth="2"
            />
            <path
                d="M196 134v5M188 140h16"
                stroke={INK}
                strokeWidth="2.4"
                strokeLinecap="round"
            />

            {[82, 140, 196].map((x) => (
                <circle
                    key={x}
                    cx={x}
                    cy={x === 140 ? 120 : 121}
                    r="3.5"
                    fill={
                        variant === 'operational'
                            ? 'var(--status-operational)'
                            : status
                    }
                />
            ))}

            <Badge x={192} y={32} palette={palette} />
        </>
    );
}

/* ------------------------------------------------------------------ */
/* Pulse: a monitor showing a heartbeat line.                           */
/* ------------------------------------------------------------------ */
function Pulse({ palette }: SceneProps) {
    const { variant, status } = palette;
    const lines: Record<Variant, string> = {
        operational:
            'M84 78h24l8-22 10 42 8-30 6 10h22l8-22 10 42 8-30 6 10h12',
        degraded:
            'M84 78h16l6-10 8 18 6-8h18l10-30 8 50 6-24 6 4h10l4-6 6 10 4-4h12',
        major: 'M84 78h44l6-6 6 6h56',
        maintenance: 'M84 78h112',
    };

    return (
        <>
            <rect
                x="66"
                y="22"
                width="148"
                height="102"
                rx="14"
                fill={SURFACE}
                stroke={LINE}
                strokeWidth="2"
            />
            <rect x="76" y="32" width="128" height="82" rx="8" fill={FILL} />
            <path
                d="M76 56h128M76 78h128M76 100h128"
                stroke={LINE}
                strokeWidth="1"
            />
            <path
                d="M140 124v10M120 138h40"
                stroke={INK}
                strokeWidth="3"
                strokeLinecap="round"
            />

            <path
                d={lines[variant]}
                stroke={variant === 'operational' ? ACCENT : status}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={variant === 'maintenance' ? '5 6' : undefined}
            />
            {variant === 'maintenance' && (
                <g fill={status}>
                    <rect x="130" y="60" width="7" height="22" rx="2" />
                    <rect x="143" y="60" width="7" height="22" rx="2" />
                </g>
            )}

            <Badge x={212} y={28} palette={palette} />
        </>
    );
}
