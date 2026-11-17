import { useId } from 'react';
import type { ComponentType } from 'react';
import { useTrans } from '@/hooks/use-trans';
import { componentStatusTone } from '@/lib/status';
import { cn } from '@/lib/utils';
import type { ComponentStatus, SceneStyle } from '@/types';

/**
 * Wide header scenes drawn across the top of the status page. Each one is a
 * 1600×360 SVG that is cropped at the sides on narrow screens, so the middle
 * (roughly x 410–1190) carries the important parts.
 *
 * Colours come from theme CSS variables only: grey structures, accent-coloured
 * figures, a warm highlight, and lights that follow the current status.
 */
export const SCENES: { id: SceneStyle; label: string }[] = [
    { id: 'factory', label: 'Control room' },
    { id: 'datacenter', label: 'Data centre' },
    { id: 'city', label: 'City skyline' },
    { id: 'space', label: 'Space mission' },
    { id: 'seasons', label: 'Seasons' },
];

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export const SEASONS: { id: Season; label: string }[] = [
    { id: 'spring', label: 'Spring' },
    { id: 'summer', label: 'Summer' },
    { id: 'autumn', label: 'Autumn' },
    { id: 'winter', label: 'Winter' },
];

/** Season of the given moment by calendar month, in the status page's timezone. */
export function seasonOf(date: Date, timezone?: string): Season {
    let month = date.getMonth() + 1;

    try {
        month = Number(
            new Intl.DateTimeFormat('en-US', {
                month: 'numeric',
                timeZone: timezone,
            }).format(date),
        );
    } catch {
        // Unknown timezone: keep the browser's month.
    }

    if (month >= 3 && month <= 5) {
        return 'spring';
    }

    if (month >= 6 && month <= 8) {
        return 'summer';
    }

    return month >= 9 && month <= 11 ? 'autumn' : 'winter';
}

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
    /** Colour of the current status. */
    status: string;
};

type SceneProps = { palette: Palette; season: Season };

const G1 = 'var(--border)';
const G2 = 'var(--input)';
const SURFACE = 'var(--card)';
const ACCENT = 'var(--primary)';
const WARM = 'var(--status-degraded)';
const OK = 'var(--status-operational)';
const GROUND = 318;

const SCENE_COMPONENTS: Record<SceneStyle, ComponentType<SceneProps>> = {
    factory: Factory,
    datacenter: DataCentre,
    city: City,
    space: Space,
    seasons: Seasons,
};

export function StatusScene({
    scene,
    status,
    season,
    className,
}: {
    scene: SceneStyle;
    status: ComponentStatus;
    /** Only used by the Seasons scene; defaults to the current season. */
    season?: Season;
    className?: string;
}) {
    const { timezone } = useTrans();
    // Rendered as a component, never called as a function: the React
    // Compiler gives every scene its own memo hooks.
    const Scene = SCENE_COMPONENTS[scene];
    const fadeId = useId();

    if (!Scene) {
        return null;
    }

    return (
        <svg
            viewBox="0 0 1600 360"
            preserveAspectRatio="xMidYMax slice"
            fill="none"
            aria-hidden="true"
            className={cn('block size-full', className)}
        >
            <Scene
                key={scene}
                season={season ?? seasonOf(new Date(), timezone)}
                palette={{
                    variant: variantOf[status],
                    status: `var(--status-${componentStatusTone[status]})`,
                }}
            />
            {/*
              Round fade: the scene dissolves into the page along a wide
              arc that is lowest in the middle and rises towards the sides.
            */}
            <defs>
                <radialGradient
                    id={fadeId}
                    gradientUnits="userSpaceOnUse"
                    cx="800"
                    cy="-5003"
                    r="5363"
                >
                    <stop
                        offset="0.9888"
                        style={{
                            stopColor: 'var(--background)',
                            stopOpacity: 0,
                        }}
                    />
                    <stop
                        offset="1"
                        style={{
                            stopColor: 'var(--background)',
                            stopOpacity: 1,
                        }}
                    />
                </radialGradient>
            </defs>
            <rect
                x="-400"
                y="150"
                width="2400"
                height="214"
                fill={`url(#${fadeId})`}
            />
        </svg>
    );
}

/** Indicator lights: all green when fine, some (or most) in the status colour otherwise. */
function lightColor({ variant, status }: Palette, index: number): string {
    if (variant === 'operational') {
        return OK;
    }

    const affected = variant === 'major' ? index % 2 === 0 : index % 3 === 0;

    return affected ? status : OK;
}

/* ------------------------------ Shared pieces ------------------------------ */

function Pipe({ d, width = 16 }: { d: string; width?: number }) {
    return (
        <g strokeLinejoin="round">
            <path d={d} stroke={G2} strokeWidth={width} />
            <path d={d} stroke={G1} strokeWidth={width - 5} />
        </g>
    );
}

function Gauge({
    x,
    y,
    color,
    angle = -40,
}: {
    x: number;
    y: number;
    color: string;
    angle?: number;
}) {
    return (
        <g transform={`translate(${x} ${y})`}>
            <circle r="16" fill={SURFACE} stroke={G2} strokeWidth="3" />
            <path
                d="M0 0V-10"
                stroke={color}
                strokeWidth="3"
                strokeLinecap="round"
                transform={`rotate(${angle})`}
            />
            <circle r="2.5" fill={color} />
        </g>
    );
}

function Screen({
    x,
    y,
    width,
    height,
    palette,
}: {
    x: number;
    y: number;
    width: number;
    height: number;
    palette: Palette;
}) {
    const mid = y + height / 2;
    const step = (width - 20) / 6;
    const amp = height / 4;
    const flat =
        palette.variant === 'major' || palette.variant === 'maintenance';
    const line = flat
        ? `M${x + 10} ${mid}H${x + width - 10}`
        : `M${x + 10} ${mid}h${step}l${step / 2} ${-amp}l${step} ${amp * 2}l${step / 2} ${-amp}h${step}l${step / 2} ${-amp / 2}l${step / 2} ${amp / 2}h${step}`;

    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                rx="8"
                fill={SURFACE}
                stroke={G2}
                strokeWidth="3"
            />
            <path
                d={line}
                stroke={
                    palette.variant === 'operational' ? ACCENT : palette.status
                }
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={
                    palette.variant === 'maintenance' ? '5 7' : undefined
                }
            />
        </g>
    );
}

/** A warning triangle during an outage, a cone during maintenance. */
function StatusSign({
    x,
    y,
    palette,
}: {
    x: number;
    y: number;
    palette: Palette;
}) {
    if (palette.variant === 'major') {
        return (
            <g transform={`translate(${x} ${y})`}>
                <path
                    d="M0 -34L19 -2H-19Z"
                    fill={palette.status}
                    stroke={palette.status}
                    strokeWidth="4"
                    strokeLinejoin="round"
                />
                <path
                    d="M0 -24v11"
                    stroke="#fff"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                />
                <circle cy="-7" r="2" fill="#fff" />
            </g>
        );
    }

    if (palette.variant === 'maintenance') {
        return (
            <g transform={`translate(${x} ${y})`}>
                <path d="M-9 -3L-3 -30H3L9 -3Z" fill={palette.status} />
                <path d="M-6 -15H6" stroke="#fff" strokeWidth="3.5" />
                <path
                    d="M-14 -2H14"
                    stroke={palette.status}
                    strokeWidth="5"
                    strokeLinecap="round"
                />
            </g>
        );
    }

    return null;
}

/** A small robot worker standing with its feet at (x, y). */
function Robot({
    x,
    y,
    palette,
    arm = 'down',
    flip = false,
    hat = true,
    tablet = false,
    scale = 1,
}: {
    x: number;
    y: number;
    palette: Palette;
    arm?: 'down' | 'up' | 'forward';
    flip?: boolean;
    hat?: boolean;
    tablet?: boolean;
    scale?: number;
}) {
    const arms = {
        down: 'M15 -50q11 6 9 22',
        up: 'M15 -50q16 -4 20 -26',
        forward: 'M15 -48q10 4 20 -2',
    };

    return (
        <g
            transform={`translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})`}
            stroke={ACCENT}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M-8 -26v24h-7M8 -26v24h7" />
            <path d="M-15 -50q-11 6 -9 22" />
            <rect
                x="-15"
                y="-58"
                width="30"
                height="34"
                rx="9"
                fill={SURFACE}
            />
            <circle cy="-41" r="4.5" fill={palette.status} stroke="none" />
            <path d={arms[arm]} />
            {tablet && arm === 'forward' && (
                <rect
                    x="33"
                    y="-64"
                    width="13"
                    height="18"
                    rx="3"
                    fill={SURFACE}
                />
            )}
            <path d="M0 -58v-5" />
            <rect
                x="-17"
                y="-88"
                width="34"
                height="26"
                rx="10"
                fill={SURFACE}
            />
            <rect
                x="-11"
                y="-81"
                width="22"
                height="11"
                rx="5.5"
                fill={ACCENT}
                stroke="none"
            />
            <circle cx="-4.5" cy="-75.5" r="1.8" fill={SURFACE} stroke="none" />
            <circle cx="5.5" cy="-75.5" r="1.8" fill={SURFACE} stroke="none" />
            {hat ? (
                <g stroke={WARM}>
                    <path d="M-19 -86a19 17 0 0 1 38 0Z" fill={WARM} />
                    <path d="M-23 -86h48" strokeWidth="4" />
                </g>
            ) : (
                <>
                    <path d="M0 -88v-10" />
                    <circle
                        cy="-101"
                        r="3.5"
                        fill={palette.status}
                        stroke="none"
                    />
                </>
            )}
        </g>
    );
}

function Cloud({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
    return (
        <path
            transform={`translate(${x} ${y}) scale(${scale})`}
            d="M14 44H66A14 14 0 0 0 68 16A22 22 0 0 0 26 12A16 16 0 0 0 14 44Z"
            fill={SURFACE}
            stroke={G2}
            strokeWidth="3"
            strokeLinejoin="round"
        />
    );
}

function Satellite({
    x,
    y,
    palette,
}: {
    x: number;
    y: number;
    palette: Palette;
}) {
    return (
        <g
            transform={`translate(${x} ${y}) rotate(-16)`}
            stroke={ACCENT}
            strokeWidth="3"
            strokeLinejoin="round"
        >
            <rect x="-40" y="-9" width="26" height="18" rx="3" fill={G1} />
            <rect x="14" y="-9" width="26" height="18" rx="3" fill={G1} />
            <rect
                x="-12"
                y="-12"
                width="24"
                height="24"
                rx="6"
                fill={SURFACE}
            />
            <circle r="4" fill={palette.status} stroke="none" />
        </g>
    );
}

function Floor() {
    return <path d={`M0 ${GROUND}H1600`} stroke={G2} strokeWidth="3" />;
}

/* --------------------------------- Factory --------------------------------- */

function Factory({ palette }: SceneProps) {
    return (
        <>
            <Pipe d="M0 78H250V160H500V44H930V120H1210V66H1600" />
            <Pipe d="M0 236H140V318" width={14} />
            <Pipe d="M1600 190H1486V318" width={14} />
            <Pipe d="M700 44V0" />
            <Pipe d="M1210 66V0" />
            <Pipe d="M355 196V160" width={12} />
            {[
                [120, 78, -50],
                [380, 160, 20],
                [820, 44, -20],
                [1070, 120, 50],
                [1400, 66, -70],
            ].map(([x, y, angle], index) => (
                <Gauge
                    key={x}
                    x={x}
                    y={y}
                    angle={angle}
                    color={lightColor(palette, index)}
                />
            ))}
            <g stroke={ACCENT} strokeWidth="3" strokeLinecap="round">
                <circle cx="610" cy="44" r="13" fill={SURFACE} />
                <path d="M610 31v26M597 44h26" />
            </g>

            {/* Hanging platform */}
            <path d="M74 0V214M206 0V214" stroke={G2} strokeWidth="3" />
            <rect
                x="56"
                y="214"
                width="168"
                height="11"
                rx="5.5"
                fill={G1}
                stroke={G2}
                strokeWidth="3"
            />
            <Robot x={140} y={214} palette={palette} arm="up" />

            {/* Tank */}
            <rect
                x="300"
                y="196"
                width="110"
                height="122"
                rx="24"
                fill={SURFACE}
                stroke={G2}
                strokeWidth="3"
            />
            <path d="M300 240h110M300 284h110" stroke={G1} strokeWidth="3" />
            <circle cx="355" cy="262" r="7" fill={lightColor(palette, 3)} />

            {/* Control console */}
            <rect
                x="560"
                y="180"
                width="28"
                height="30"
                fill={G1}
                stroke={G2}
                strokeWidth="3"
            />
            <path d="M684 206v-16" stroke={G2} strokeWidth="3" />
            <circle cx="684" cy="182" r="9" fill={WARM} />
            <rect
                x="520"
                y="206"
                width="200"
                height="112"
                rx="14"
                fill={G1}
                stroke={G2}
                strokeWidth="3"
            />
            <Screen x={538} y={224} width={104} height={56} palette={palette} />
            {[0, 1, 2].map((index) => (
                <circle
                    key={index}
                    cx={662 + index * 18}
                    cy={236}
                    r="5.5"
                    fill={lightColor(palette, index)}
                />
            ))}
            <rect
                x="654"
                y="256"
                width="52"
                height="20"
                rx="5"
                fill={SURFACE}
                stroke={G2}
                strokeWidth="3"
            />
            <path
                d="M538 298h164"
                stroke={G2}
                strokeWidth="3"
                strokeLinecap="round"
            />

            <Robot x={772} y={GROUND} palette={palette} arm="forward" tablet />

            {/* Conveyor */}
            <path d="M852 298v20M1078 298v20" stroke={G2} strokeWidth="4" />
            {[
                [862, 38, 32],
                [936, 44, 38],
                [1018, 34, 26],
            ].map(([x, w, h], index) => (
                <g key={x}>
                    <rect
                        x={x}
                        y={276 - h}
                        width={w}
                        height={h}
                        rx="4"
                        fill={index === 1 ? WARM : SURFACE}
                        stroke={index === 1 ? WARM : ACCENT}
                        strokeWidth="3"
                    />
                    <path
                        d={`M${x + w / 2} ${276 - h}v${h / 3}`}
                        stroke={index === 1 ? SURFACE : ACCENT}
                        strokeWidth="3"
                    />
                </g>
            ))}
            <rect
                x="830"
                y="276"
                width="270"
                height="22"
                rx="11"
                fill={SURFACE}
                stroke={G2}
                strokeWidth="3"
            />
            {Array.from({ length: 11 }, (_, index) => (
                <circle
                    key={index}
                    cx={846 + index * 24}
                    cy={287}
                    r="5"
                    fill={G1}
                    stroke={G2}
                    strokeWidth="2"
                />
            ))}

            {/* Hanging lamp */}
            <path d="M1010 126v44" stroke={G2} strokeWidth="3" />
            <path d="M988 188a22 18 0 0 1 44 0Z" fill={WARM} />

            <StatusSign x={1126} y={GROUND} palette={palette} />

            {/* Big machine */}
            <path
                d="M1180 150a60 46 0 0 1 120 0Z"
                fill={SURFACE}
                stroke={G2}
                strokeWidth="3"
            />
            <circle cx="1240" cy="128" r="12" fill={WARM} />
            <rect
                x="1150"
                y="150"
                width="180"
                height="168"
                rx="16"
                fill={G1}
                stroke={G2}
                strokeWidth="3"
            />
            <Screen
                x={1172}
                y={174}
                width={136}
                height={64}
                palette={palette}
            />
            {[0, 1, 2, 3, 4].map((index) => (
                <circle
                    key={index}
                    cx={1184 + index * 28}
                    cy={262}
                    r="6"
                    fill={lightColor(palette, index + 1)}
                />
            ))}
            <path
                d="M1174 286h132M1174 300h132"
                stroke={G2}
                strokeWidth="3"
                strokeLinecap="round"
            />

            {/* Crate */}
            <rect
                x="1376"
                y="286"
                width="68"
                height="32"
                rx="4"
                fill={SURFACE}
                stroke={G2}
                strokeWidth="3"
            />
            <path
                d="M1376 286l68 32M1444 286l-68 32"
                stroke={G1}
                strokeWidth="3"
            />
            <Robot x={1410} y={286} palette={palette} arm="up" flip />

            <Floor />
        </>
    );
}

/* ------------------------------- Data centre ------------------------------- */

const RACKS = [70, 180, 290, 400, 510, 860, 970, 1250, 1360, 1470];

function DataCentre({ palette }: SceneProps) {
    return (
        <>
            {Array.from({ length: 9 }, (_, index) => (
                <path
                    key={index}
                    d={`M${100 + index * 180} 0v40`}
                    stroke={G2}
                    strokeWidth="3"
                />
            ))}
            <rect
                x="-10"
                y="40"
                width="1620"
                height="14"
                fill={G1}
                stroke={G2}
                strokeWidth="3"
            />

            {RACKS.map((x, rack) => (
                <g key={x}>
                    <path
                        d={`M${x + 28} 54C${x + 28} 104 ${x + 46} 92 ${x + 46} 132`}
                        stroke={rack % 2 === 0 ? ACCENT : G2}
                        strokeWidth="3"
                    />
                    <rect
                        x={x}
                        y="132"
                        width="92"
                        height="186"
                        rx="8"
                        fill={SURFACE}
                        stroke={G2}
                        strokeWidth="3"
                    />
                    {[0, 1, 2, 3, 4, 5].map((row) => (
                        <g key={row}>
                            <rect
                                x={x + 10}
                                y={144 + row * 28}
                                width="72"
                                height="20"
                                rx="5"
                                fill={G1}
                            />
                            <circle
                                cx={x + 21}
                                cy={154 + row * 28}
                                r="3.8"
                                fill={lightColor(palette, rack * 5 + row)}
                            />
                            <path
                                d={`M${x + 34} ${154 + row * 28}h38`}
                                stroke={G2}
                                strokeWidth="2.5"
                                strokeLinecap="round"
                            />
                        </g>
                    ))}
                </g>
            ))}

            {/* Cooling units */}
            {[684, 1108].map((x) => (
                <g key={x}>
                    <rect
                        x={x}
                        y="76"
                        width="104"
                        height="48"
                        rx="10"
                        fill={SURFACE}
                        stroke={G2}
                        strokeWidth="3"
                    />
                    <circle
                        cx={x + 28}
                        cy="100"
                        r="14"
                        fill={G1}
                        stroke={G2}
                        strokeWidth="3"
                    />
                    <path
                        d={`M${x + 28} 88v24M${x + 16} 100h24`}
                        stroke={G2}
                        strokeWidth="3"
                        strokeLinecap="round"
                    />
                    <path
                        d={`M${x + 56} 92h34M${x + 56} 104h34`}
                        stroke={G1}
                        strokeWidth="3"
                        strokeLinecap="round"
                    />
                </g>
            ))}

            {/* Robot with a cart */}
            <Robot x={672} y={GROUND} palette={palette} arm="forward" />
            <rect x="718" y="244" width="52" height="30" rx="5" fill={WARM} />
            <rect
                x="706"
                y="274"
                width="76"
                height="28"
                rx="6"
                fill={SURFACE}
                stroke={ACCENT}
                strokeWidth="3"
            />
            <circle
                cx="722"
                cy="310"
                r="6.5"
                fill={SURFACE}
                stroke={ACCENT}
                strokeWidth="3"
            />
            <circle
                cx="766"
                cy="310"
                r="6.5"
                fill={SURFACE}
                stroke={ACCENT}
                strokeWidth="3"
            />

            <StatusSign x={818} y={GROUND} palette={palette} />

            {/* Console */}
            <Robot x={1104} y={GROUND} palette={palette} arm="forward" />
            <Screen x={1144} y={206} width={78} height={48} palette={palette} />
            <path d="M1183 254v10" stroke={G2} strokeWidth="4" />
            <rect
                x="1136"
                y="264"
                width="94"
                height="54"
                rx="8"
                fill={G1}
                stroke={G2}
                strokeWidth="3"
            />
            <path
                d="M1150 282h66M1150 298h66"
                stroke={G2}
                strokeWidth="3"
                strokeLinecap="round"
            />

            <Floor />
        </>
    );
}

/* ----------------------------------- City ---------------------------------- */

const BUILDINGS: [number, number, number][] = [
    [40, 110, 150],
    [190, 90, 200],
    [330, 130, 120],
    [520, 100, 230],
    [680, 120, 160],
    [900, 110, 210],
    [1060, 140, 130],
    [1250, 100, 190],
    [1400, 120, 150],
];

function City({ palette }: SceneProps) {
    return (
        <>
            <circle cx="1290" cy="84" r="34" fill={WARM} />
            <Cloud x={170} y={40} scale={1.3} />
            <Cloud x={600} y={24} />
            <Cloud x={980} y={54} scale={1.15} />

            {Array.from({ length: 18 }, (_, index) => {
                const height = 80 + ((index * 53) % 110);

                return (
                    <rect
                        key={index}
                        x={index * 92 - 10}
                        y={GROUND - height}
                        width="80"
                        height={height}
                        fill={G1}
                    />
                );
            })}

            <path
                d="M1100 74L836 112"
                stroke={
                    palette.variant === 'operational' ? ACCENT : palette.status
                }
                strokeWidth="2.5"
                strokeDasharray="5 8"
                strokeLinecap="round"
            />
            <Satellite x={1120} y={70} palette={palette} />

            {/* Radio tower */}
            <path
                d="M798 318L820 112L842 318M804 262h32M809 212h22M814 164h12"
                stroke={G2}
                strokeWidth="3.5"
                strokeLinejoin="round"
            />
            <g
                stroke={
                    palette.variant === 'operational' ? ACCENT : palette.status
                }
                strokeWidth="3"
                strokeLinecap="round"
            >
                <path d="M798 94a26 26 0 0 1 44 0" />
                <path d="M784 84a42 42 0 0 1 72 0" strokeDasharray="4 7" />
            </g>
            <circle cx="820" cy="106" r="8" fill={palette.status} />

            {BUILDINGS.map(([x, width, height], building) => {
                const top = GROUND - height;
                const columns = Math.floor((width - 20) / 22);
                const rows = Math.floor((height - 24) / 26);
                const inset = (width - (columns * 22 - 10)) / 2;

                return (
                    <g key={x}>
                        <rect
                            x={x}
                            y={top}
                            width={width}
                            height={height + 4}
                            rx="6"
                            fill={SURFACE}
                            stroke={G2}
                            strokeWidth="3"
                        />
                        {Array.from({ length: columns * rows }, (_, cell) => {
                            const column = cell % columns;
                            const row = Math.floor(cell / columns);
                            const lit =
                                (column * 7 + row * 5 + building * 3) % 4 === 0;

                            return (
                                <rect
                                    key={cell}
                                    x={x + inset + column * 22}
                                    y={top + 16 + row * 26}
                                    width="12"
                                    height="14"
                                    rx="2.5"
                                    fill={lit ? WARM : G1}
                                />
                            );
                        })}
                    </g>
                );
            })}

            {/* Rooftop antennas */}
            {[
                [570, 88],
                [235, 118],
                [1300, 128],
            ].map(([x, y], index) => (
                <g key={x}>
                    <path d={`M${x} ${y}v-30`} stroke={G2} strokeWidth="3" />
                    <circle
                        cx={x}
                        cy={y - 34}
                        r="5"
                        fill={lightColor(palette, index)}
                    />
                </g>
            ))}

            <Robot x={740} y={158} palette={palette} arm="up" scale={0.9} />
            <Robot
                x={1136}
                y={188}
                palette={palette}
                arm="forward"
                tablet
                flip
                scale={0.9}
            />
            <StatusSign x={395} y={198} palette={palette} />

            <Floor />
        </>
    );
}

/* ---------------------------------- Space ---------------------------------- */

function Dish({
    x,
    y,
    palette,
    flip = false,
}: {
    x: number;
    y: number;
    palette: Palette;
    flip?: boolean;
}) {
    return (
        <g
            transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1)`}
            strokeWidth="3"
            strokeLinejoin="round"
        >
            <path
                d="M0 -34V0M-16 2L0 -18L16 2"
                stroke={G2}
                strokeLinecap="round"
            />
            <path d="M-30 -66A34 34 0 0 0 28 -24Z" fill={SURFACE} stroke={G2} />
            <path d="M-1 -45L18 -70" stroke={G2} strokeLinecap="round" />
            <circle cx="19" cy="-72" r="5" fill={palette.status} />
        </g>
    );
}

function Space({ palette }: SceneProps) {
    return (
        <>
            {Array.from({ length: 46 }, (_, index) => (
                <circle
                    key={index}
                    cx={(index * 197 + 40) % 1600}
                    cy={((index * 89) % 210) + 10}
                    r={index % 3 === 0 ? 2.4 : 1.5}
                    fill={index % 5 === 0 ? WARM : G2}
                />
            ))}

            {/* Planets */}
            <g stroke={ACCENT} strokeWidth="3">
                <circle cx="230" cy="92" r="38" fill={SURFACE} />
                <path d="M199 78q30 12 66 2M196 104q34 10 70 -4" stroke={G1} />
                <ellipse
                    cx="230"
                    cy="92"
                    rx="64"
                    ry="13"
                    transform="rotate(-18 230 92)"
                />
            </g>
            <circle cx="1390" cy="72" r="22" fill={WARM} />

            {/* Orbit */}
            <path
                d="M300 210Q800 20 1320 180"
                stroke={G2}
                strokeWidth="2.5"
                strokeDasharray="4 9"
                strokeLinecap="round"
            />
            <Satellite x={602} y={127} palette={palette} />
            <Satellite x={1061} y={122} palette={palette} />

            {/* Surface */}
            <path
                d="M0 318Q800 250 1600 318V364H0Z"
                fill={G1}
                stroke={G2}
                strokeWidth="3"
            />
            {[
                [150, 332, 26],
                [480, 318, 18],
                [980, 314, 22],
                [1340, 326, 30],
            ].map(([x, y, rx]) => (
                <ellipse key={x} cx={x} cy={y} rx={rx} ry="5" fill={G2} />
            ))}

            <Dish x={420} y={292} palette={palette} />
            <Dish x={1440} y={303} palette={palette} flip />

            {/* Dome station */}
            <path d="M640 218v-22" stroke={G2} strokeWidth="3" />
            <circle cx="640" cy="192" r="5" fill={lightColor(palette, 0)} />
            <path
                d="M560 288a80 70 0 0 1 160 0Z"
                fill={SURFACE}
                stroke={G2}
                strokeWidth="3"
                strokeLinejoin="round"
            />
            <path
                d="M626 288v-26a14 14 0 0 1 28 0v26"
                fill={G1}
                stroke={G2}
                strokeWidth="3"
            />
            {[592, 688].map((x) => (
                <circle key={x} cx={x} cy={262} r="8" fill={WARM} />
            ))}

            <StatusSign x={770} y={287} palette={palette} />

            {/* Rocket */}
            <path
                d="M932 286V118M932 152h-30M932 204h-28"
                stroke={G2}
                strokeWidth="4"
                strokeLinecap="round"
            />
            <circle cx="932" cy="112" r="6" fill={lightColor(palette, 2)} />
            <rect
                x="836"
                y="276"
                width="96"
                height="11"
                rx="5"
                fill={SURFACE}
                stroke={G2}
                strokeWidth="3"
            />
            <path
                d="M860 232L840 276H864ZM900 232L920 276H896Z"
                fill={ACCENT}
                stroke={ACCENT}
                strokeWidth="3"
                strokeLinejoin="round"
            />
            <path
                d="M880 92C904 128 906 190 900 264H860C854 190 856 128 880 92Z"
                fill={SURFACE}
                stroke={ACCENT}
                strokeWidth="3"
                strokeLinejoin="round"
            />
            <path
                d="M880 92C891 108 897 122 900 138H860C863 122 869 108 880 92Z"
                fill={WARM}
                stroke={ACCENT}
                strokeWidth="3"
                strokeLinejoin="round"
            />
            <circle
                cx="880"
                cy="174"
                r="11"
                fill={G1}
                stroke={ACCENT}
                strokeWidth="3"
            />
            <path d="M862 220h36" stroke={ACCENT} strokeWidth="3" />

            <Robot x={1052} y={289} palette={palette} arm="up" hat={false} />

            {/* Flag */}
            <path
                d="M1140 292v-50"
                stroke={G2}
                strokeWidth="3"
                strokeLinecap="round"
            />
            <path d="M1140 242l30 9l-30 9Z" fill={ACCENT} />

            {/* Rover */}
            <g stroke={ACCENT} strokeWidth="3" strokeLinejoin="round">
                <path d="M1262 264v-22h-14" strokeLinecap="round" />
                <rect
                    x="1232"
                    y="232"
                    width="18"
                    height="13"
                    rx="3"
                    fill={SURFACE}
                />
                <rect
                    x="1214"
                    y="264"
                    width="76"
                    height="20"
                    rx="7"
                    fill={SURFACE}
                />
            </g>
            <circle cx="1276" cy="274" r="4" fill={palette.status} />
            {[1226, 1252, 1278].map((x) => (
                <circle
                    key={x}
                    cx={x}
                    cy={291}
                    r="8"
                    fill={SURFACE}
                    stroke={G2}
                    strokeWidth="3"
                />
            ))}
        </>
    );
}

/* --------------------------------- Seasons --------------------------------- */

const SEASON_COLORS: Record<
    Season,
    { ground: string; canopy: string[]; sun: string }
> = {
    spring: {
        ground: '#34c759',
        canopy: ['#8fd88f', '#a6e3a1', '#7ccf86'],
        sun: WARM,
    },
    summer: {
        ground: '#34c759',
        canopy: ['#34c759', '#2fb350', '#4cd26b'],
        sun: WARM,
    },
    autumn: {
        ground: '#d9a441',
        canopy: ['#ff9500', '#ff6b3d', '#f5b800'],
        sun: '#ff9500',
    },
    winter: { ground: G2, canopy: [], sun: SURFACE },
};

const PINE = '#2fa55a';
const TRUNK = '#b08968';
const PINK = '#ff8fb1';
const RED = '#ff3b30';
const SNOW = '#ffffff';

/** Height of the rolling ground at a given x. */
function hill(x: number): number {
    return 256 + 20 * ((x - 800) / 800) ** 2;
}

function LeafTree({
    x,
    scale = 1,
    season,
    index,
}: {
    x: number;
    scale?: number;
    season: Season;
    index: number;
}) {
    const canopy = SEASON_COLORS[season].canopy;
    const color = canopy[index % canopy.length];

    return (
        <g
            transform={`translate(${x} ${hill(x) + 2}) scale(${scale})`}
            stroke={TRUNK}
            strokeWidth="5"
            strokeLinecap="round"
        >
            <path d="M0 0V-62" />
            {season === 'winter' ? (
                <path
                    d="M0 -40L-24 -72M0 -52L22 -84M0 -62L-8 -104M0 -62L14 -108M-24 -72l-14 -6M-24 -72l-2 -16M22 -84l16 -2M22 -84l2 -16"
                    strokeWidth="3.5"
                />
            ) : (
                <g stroke="none" fill={color}>
                    <circle cx="-24" cy="-72" r="26" />
                    <circle cx="24" cy="-72" r="26" />
                    <circle cy="-96" r="34" />
                    {season === 'spring' &&
                        [
                            [-28, -78],
                            [-6, -112],
                            [16, -90],
                            [30, -66],
                            [-10, -70],
                            [8, -122],
                        ].map(([cx, cy]) => (
                            <circle
                                key={`${cx}${cy}`}
                                cx={cx}
                                cy={cy}
                                r="4.5"
                                fill={PINK}
                            />
                        ))}
                </g>
            )}
        </g>
    );
}

function PineTree({
    x,
    scale = 1,
    season,
}: {
    x: number;
    scale?: number;
    season: Season;
}) {
    return (
        <g transform={`translate(${x} ${hill(x) + 2}) scale(${scale})`}>
            <path d="M0 0V-20" stroke={TRUNK} strokeWidth="6" />
            <path
                d="M-34 -16H34L0 -62ZM-27 -48H27L0 -90ZM-20 -78H20L0 -116Z"
                fill={PINE}
                stroke={PINE}
                strokeWidth="3"
                strokeLinejoin="round"
            />
            {season === 'winter' && (
                <path
                    d="M-12 -98L0 -116L12 -98M-16 -68L0 -90L16 -68M-20 -38L0 -62L20 -38"
                    stroke={SNOW}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            )}
        </g>
    );
}

function Snowman({ x }: { x: number }) {
    return (
        <g
            transform={`translate(${x} ${hill(x) + 2})`}
            fill={SNOW}
            stroke={G2}
            strokeWidth="3"
        >
            <circle cy="-20" r="21" />
            <circle cy="-50" r="15" />
            <circle cy="-73" r="11" />
            <path
                d="M-13 -62H13"
                stroke={ACCENT}
                strokeWidth="5"
                strokeLinecap="round"
            />
            <path
                d="M9 -62v13"
                stroke={ACCENT}
                strokeWidth="5"
                strokeLinecap="round"
            />
            <path d="M0 -72l13 3l-13 2Z" fill="#ff9500" stroke="none" />
            <circle cx="-4" cy="-77" r="1.6" fill={G2} stroke="none" />
            <circle cx="4" cy="-77" r="1.6" fill={G2} stroke="none" />
            <path d="M-8 -83h16v-11h-16Z" fill={ACCENT} stroke="none" />
            <path
                d="M-13 -83h26"
                stroke={ACCENT}
                strokeWidth="4"
                strokeLinecap="round"
            />
        </g>
    );
}

/** Things that drift through the air: petals, birds, leaves or snow. */
function SeasonAir({ season }: { season: Season }) {
    if (season === 'summer') {
        return (
            <g stroke={G2} strokeWidth="3" strokeLinecap="round">
                {[
                    [420, 70],
                    [470, 96],
                    [1010, 60],
                ].map(([x, y]) => (
                    <path
                        key={x}
                        d={`M${x - 11} ${y - 2}q6 -6 11 2q5 -8 11 -2`}
                    />
                ))}
            </g>
        );
    }

    const count = season === 'winter' ? 46 : 24;
    const leaves = SEASON_COLORS.autumn.canopy;

    return (
        <>
            {Array.from({ length: count }, (_, index) => {
                const x = (index * 197 + 60) % 1600;
                const y = 18 + ((index * 83) % 226);

                if (season === 'winter') {
                    return (
                        <circle
                            key={index}
                            cx={x}
                            cy={y}
                            r={2.2 + (index % 3) * 0.9}
                            fill={G2}
                        />
                    );
                }

                if (season === 'autumn') {
                    return (
                        <path
                            key={index}
                            transform={`translate(${x} ${y}) rotate(${(index * 47) % 360})`}
                            d="M0 -8C6 -4 6 4 0 8C-6 4 -6 -4 0 -8Z"
                            fill={leaves[index % leaves.length]}
                        />
                    );
                }

                return (
                    <ellipse
                        key={index}
                        transform={`translate(${x} ${y}) rotate(${(index * 47) % 180})`}
                        rx="5"
                        ry="2.8"
                        fill={PINK}
                    />
                );
            })}
        </>
    );
}

/** What grows or lies on the ground, and what the second robot is busy with. */
function SeasonGround({ season }: { season: Season }) {
    const at = (x: number) => `translate(${x} ${hill(x) + 2})`;

    if (season === 'winter') {
        return (
            <>
                {[150, 470, 990, 1210, 1490].map((x) => (
                    <path
                        key={x}
                        transform={at(x)}
                        d="M-40 2Q0 -24 40 2"
                        fill={SURFACE}
                        stroke={G2}
                        strokeWidth="3"
                    />
                ))}
                <Snowman x={634} />
            </>
        );
    }

    if (season === 'autumn') {
        return (
            <>
                {[210, 652, 1040, 1390].map((x) => (
                    <g key={x} transform={at(x)}>
                        <path
                            d="M-36 0Q-18 -24 0 -22Q20 -26 36 0Z"
                            fill="#ff9500"
                        />
                        <path
                            d="M-18 0Q-6 -14 8 -12Q20 -12 26 0Z"
                            fill="#f5b800"
                        />
                        <circle cx="-14" cy="-12" r="5" fill="#ff6b3d" />
                    </g>
                ))}
                {/* Rake in the robot's hand */}
                <g
                    transform={at(560)}
                    stroke={TRUNK}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                >
                    <path d="M35 -52L62 -6" />
                    <path d="M52 -8L72 -4M54 -8l-3 7M61 -6l-3 7M68 -5l-3 7" />
                </g>
                {/* Pumpkin */}
                <g transform={at(486)}>
                    <ellipse cy="-13" rx="19" ry="14" fill="#ff9500" />
                    <path
                        d="M0 -26V-1M-9 -25Q-14 -13 -9 -1M9 -25Q14 -13 9 -1"
                        stroke="#e07800"
                        strokeWidth="2"
                    />
                    <path
                        d="M0 -27q1 -7 6 -8"
                        stroke={PINE}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                    />
                </g>
            </>
        );
    }

    const flowers = season === 'spring' ? [PINK, RED, WARM] : [SURFACE, WARM];
    const spots =
        season === 'spring'
            ? [128, 214, 462, 610, 634, 658, 682, 980, 1064, 1218, 1392, 1476]
            : [128, 214, 462, 498, 640, 668, 980, 1016, 1064, 1218, 1392, 1476];

    return (
        <>
            {spots.map((x, index) => (
                <g
                    key={x}
                    transform={at(x)}
                    stroke="#34c759"
                    strokeWidth="3"
                    strokeLinecap="round"
                >
                    <path d="M0 0V-18M0 -6q-7 -1 -8 -8M0 -4q7 -1 8 -8" />
                    <circle
                        cy="-22"
                        r="6"
                        fill={flowers[index % flowers.length]}
                        stroke={season === 'summer' ? G2 : 'none'}
                        strokeWidth="2"
                    />
                    {season === 'summer' && (
                        <circle cy="-22" r="2.2" fill={WARM} stroke="none" />
                    )}
                </g>
            ))}
            {season === 'spring' ? (
                /* Watering can */
                <g
                    transform={at(560)}
                    stroke={ACCENT}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M34 -60H52V-42H34Z" fill={SURFACE} />
                    <path d="M52 -48L66 -58" />
                    <path
                        d="M70 -50v6M77 -44v6M66 -38v6M74 -32v6"
                        strokeWidth="2.5"
                    />
                </g>
            ) : (
                /* Kite */
                <g transform={at(560)}>
                    <path
                        d="M35 -76Q70 -120 96 -188"
                        stroke={G2}
                        strokeWidth="2"
                    />
                    <g transform="translate(100 -204) rotate(24)">
                        <path
                            d="M0 -22L15 0L0 26L-15 0Z"
                            fill={RED}
                            stroke={RED}
                            strokeWidth="3"
                            strokeLinejoin="round"
                        />
                        <path
                            d="M0 -22V26M-15 0H15"
                            stroke={SURFACE}
                            strokeWidth="2"
                        />
                    </g>
                    <path
                        d="M92 -180q-10 10 -2 20q8 10 -2 20"
                        stroke={WARM}
                        strokeWidth="3"
                        strokeLinecap="round"
                    />
                </g>
            )}
        </>
    );
}

function Seasons({ palette, season }: SceneProps) {
    const colors = SEASON_COLORS[season];
    const signal = palette.variant === 'operational' ? ACCENT : palette.status;
    const hut = hill(740);
    const mast = hill(840);

    return (
        <>
            {/* Sky */}
            {season === 'summer' && (
                <g stroke={WARM} strokeWidth="5" strokeLinecap="round">
                    {Array.from({ length: 12 }, (_, index) => (
                        <path
                            key={index}
                            transform={`translate(1250 84) rotate(${index * 30})`}
                            d="M0 -52V-66"
                        />
                    ))}
                </g>
            )}
            <circle
                cx="1250"
                cy={season === 'autumn' || season === 'winter' ? 104 : 84}
                r={season === 'summer' ? 40 : season === 'winter' ? 26 : 32}
                fill={colors.sun}
                stroke={season === 'winter' ? G2 : 'none'}
                strokeWidth="3"
            />
            <Cloud x={170} y={40} scale={1.3} />
            {season !== 'summer' && <Cloud x={640} y={22} />}
            <Cloud x={1000} y={50} scale={1.1} />
            {season === 'winter' && <Cloud x={1320} y={30} scale={1.2} />}

            {/* Far hills */}
            <path
                d="M0 236C200 186 380 188 560 226C720 178 940 170 1120 222C1300 178 1480 188 1600 226V320H0Z"
                fill={G1}
            />
            {season === 'winter' && (
                <path
                    d="M250 201Q300 190 350 196M760 186Q850 172 930 186M1290 196Q1350 184 1420 192"
                    stroke={SURFACE}
                    strokeWidth="8"
                    strokeLinecap="round"
                />
            )}

            {[60, 250, 400, 1090, 1300, 1530].map((x, index) => (
                <LeafTree
                    key={x}
                    x={x}
                    season={season}
                    index={index}
                    scale={0.85 + (index % 3) * 0.12}
                />
            ))}
            {[160, 330, 1010, 1180, 1420].map((x, index) => (
                <PineTree
                    key={x}
                    x={x}
                    season={season}
                    scale={0.9 + (index % 2) * 0.2}
                />
            ))}

            {/* Weather hut */}
            {(season === 'winter' || season === 'autumn') && (
                <g fill={G1}>
                    <circle cx="776" cy={hut - 128} r="7" />
                    <circle cx="786" cy={hut - 146} r="9" />
                    <circle cx="780" cy={hut - 168} r="11" />
                </g>
            )}
            <rect
                x="768"
                y={hut - 116}
                width="14"
                height="30"
                fill={SURFACE}
                stroke={G2}
                strokeWidth="3"
            />
            <rect
                x="692"
                y={hut - 68}
                width="96"
                height="72"
                rx="4"
                fill={SURFACE}
                stroke={G2}
                strokeWidth="3"
            />
            <path
                d={`M680 ${hut - 66}L740 ${hut - 112}L800 ${hut - 66}Z`}
                fill={ACCENT}
                stroke={ACCENT}
                strokeWidth="4"
                strokeLinejoin="round"
            />
            {season === 'winter' && (
                <path
                    d={`M686 ${hut - 72}L740 ${hut - 113}L794 ${hut - 72}`}
                    stroke={SNOW}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            )}
            <rect
                x="704"
                y={hut - 52}
                width="26"
                height="24"
                rx="3"
                fill={WARM}
                stroke={G2}
                strokeWidth="3"
            />
            <rect
                x="746"
                y={hut - 46}
                width="26"
                height="48"
                rx="3"
                fill={G1}
                stroke={G2}
                strokeWidth="3"
            />
            <circle cx="766" cy={hut - 20} r="2.5" fill={ACCENT} />

            {/* Mast with the status beacon */}
            <path
                d={`M840 ${mast + 2}V${mast - 146}M826 ${mast + 2}L840 ${mast - 40}L854 ${mast + 2}`}
                stroke={G2}
                strokeWidth="3.5"
                strokeLinejoin="round"
            />
            <g stroke={signal} strokeWidth="3" strokeLinecap="round">
                <path d={`M818 ${mast - 164}a26 26 0 0 1 44 0`} />
                <path
                    d={`M804 ${mast - 174}a42 42 0 0 1 72 0`}
                    strokeDasharray="4 7"
                />
            </g>
            <circle cx="840" cy={mast - 152} r="8" fill={palette.status} />

            <SeasonGround season={season} />

            <Robot
                x={560}
                y={hill(560) + 2}
                palette={palette}
                arm={
                    season === 'winter' || season === 'summer'
                        ? 'up'
                        : 'forward'
                }
            />
            <Robot
                x={908}
                y={hill(908) + 2}
                palette={palette}
                arm="forward"
                tablet
                flip
            />
            <StatusSign x={966} y={hill(966) + 2} palette={palette} />

            {/*
              Ground, drawn over everything standing on it so nothing
              pokes out below the ground line.
            */}
            <path
                d="M-10 276Q800 236 1610 276V364H-10Z"
                fill={SURFACE}
                stroke={colors.ground}
                strokeWidth="4"
            />

            <SeasonAir season={season} />
        </>
    );
}
