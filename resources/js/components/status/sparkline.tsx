import { cn } from '@/lib/utils';

/**
 * Tiny response-time line. Failed checks are marked as red ticks.
 */
export function Sparkline({
    points,
    className,
}: {
    points: { ms: number | null; up: boolean }[];
    className?: string;
}) {
    const width = 120;
    const height = 28;

    if (points.length < 2) {
        return <div className={cn('h-7 w-[120px]', className)} />;
    }

    const values = points.map((p) => p.ms ?? 0);
    const max = Math.max(...values, 1);
    const step = width / (points.length - 1);
    const y = (ms: number) => height - 2 - (ms / max) * (height - 4);
    const line = points
        .map(
            (p, i) =>
                `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${y(p.ms ?? 0).toFixed(1)}`,
        )
        .join(' ');

    return (
        <svg
            viewBox={`0 0 ${width} ${height}`}
            className={cn('h-7 w-[120px] overflow-visible', className)}
            aria-hidden="true"
        >
            <path
                d={line}
                fill="none"
                stroke="var(--chart-1)"
                strokeWidth={1.5}
                strokeLinejoin="round"
                strokeLinecap="round"
            />
            {points.map((p, i) =>
                p.up ? null : (
                    <rect
                        key={i}
                        x={i * step - 1}
                        y={0}
                        width={2}
                        height={height}
                        rx={1}
                        fill="var(--status-major)"
                    />
                ),
            )}
        </svg>
    );
}
