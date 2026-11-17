import { useId } from 'react';
import type { ComponentType } from 'react';
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
    /** Colour of the current status. */
    status: string;
};

type SceneProps = { palette: Palette };

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
};

export function StatusScene({
    scene,
    status,
    className,
}: {
    scene: SceneStyle;
    status: ComponentStatus;
    className?: string;
}) {
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
