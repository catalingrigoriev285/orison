import { useState } from 'react';
import { useTrans } from '@/hooks/use-trans';
import { formatDateTime } from '@/lib/format';

export type ChartBucket = {
    at: string;
    ms: number | null;
    failed: number;
    total: number;
};

/**
 * Average response time per bucket as a smooth area chart, with failed
 * checks drawn as red columns. Hover to inspect a bucket.
 */
export function ResponseTimeChart({ buckets }: { buckets: ChartBucket[] }) {
    const { t, locale, timezone } = useTrans();
    const [hover, setHover] = useState<number | null>(null);

    const width = 720;
    const height = 220;
    const padTop = 16;
    const padBottom = 24;
    const plotHeight = height - padTop - padBottom;
    const values = buckets.map((b) => b.ms ?? 0);
    const max = niceMax(Math.max(...values, 100));
    const step = width / Math.max(buckets.length - 1, 1);
    const x = (i: number) => i * step;
    const y = (ms: number) => padTop + plotHeight - (ms / max) * plotHeight;

    const segments: string[] = [];
    let current = '';
    buckets.forEach((bucket, i) => {
        if (bucket.ms === null) {
            if (current) segments.push(current);
            current = '';
            return;
        }
        current += `${current ? 'L' : 'M'}${x(i).toFixed(1)},${y(bucket.ms).toFixed(1)} `;
    });
    if (current) segments.push(current);

    const areas = segments.map((segment) => {
        const coords = segment.trim().split(' ');
        const first = coords[0].slice(1).split(',')[0];
        const last = coords[coords.length - 1].slice(1).split(',')[0];
        return `${segment} L${last},${padTop + plotHeight} L${first},${padTop + plotHeight} Z`;
    });

    const hovered = hover !== null ? buckets[hover] : null;
    const gridLines = [0, 0.5, 1].map((f) => Math.round(max * f));
    const hasData = buckets.some((b) => b.total > 0);

    return (
        <div className="relative">
            {!hasData && (
                <div className="absolute inset-0 z-10 flex items-center justify-center text-[14px] text-muted-foreground">
                    {t('No checks in this period yet.')}
                </div>
            )}
            <svg
                viewBox={`0 0 ${width} ${height}`}
                className="ml-14 h-56 w-[calc(100%-3.5rem)]"
                preserveAspectRatio="none"
                onMouseLeave={() => setHover(null)}
                onMouseMove={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    const ratio = (event.clientX - rect.left) / rect.width;
                    setHover(
                        Math.min(
                            buckets.length - 1,
                            Math.max(
                                0,
                                Math.round(ratio * (buckets.length - 1)),
                            ),
                        ),
                    );
                }}
                role="img"
                aria-label={t('Response time')}
            >
                <defs>
                    <linearGradient id="rt-fill" x1="0" x2="0" y1="0" y2="1">
                        <stop
                            offset="0%"
                            stopColor="var(--chart-1)"
                            stopOpacity={0.18}
                        />
                        <stop
                            offset="100%"
                            stopColor="var(--chart-1)"
                            stopOpacity={0}
                        />
                    </linearGradient>
                </defs>
                {gridLines.map((value) => (
                    <line
                        key={value}
                        x1={0}
                        x2={width}
                        y1={y(value)}
                        y2={y(value)}
                        stroke="var(--border)"
                        strokeWidth={1}
                        vectorEffect="non-scaling-stroke"
                    />
                ))}
                {buckets.map((bucket, i) =>
                    bucket.failed > 0 ? (
                        <rect
                            key={`f-${i}`}
                            x={x(i) - step / 2}
                            y={padTop}
                            width={Math.max(step, 2)}
                            height={plotHeight}
                            fill="var(--status-major)"
                            opacity={0.18}
                        />
                    ) : null,
                )}
                {areas.map((d, i) => (
                    <path key={`a-${i}`} d={d} fill="url(#rt-fill)" />
                ))}
                {segments.map((d, i) => (
                    <path
                        key={`l-${i}`}
                        d={d}
                        fill="none"
                        stroke="var(--chart-1)"
                        strokeWidth={2}
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                    />
                ))}
                {hover !== null && (
                    <line
                        x1={x(hover)}
                        x2={x(hover)}
                        y1={padTop}
                        y2={padTop + plotHeight}
                        stroke="var(--muted-foreground)"
                        strokeWidth={1}
                        vectorEffect="non-scaling-stroke"
                    />
                )}
            </svg>
            <div className="pointer-events-none absolute top-0 left-0 h-56 w-14">
                {gridLines.map((value) => (
                    <span
                        key={value}
                        className="absolute right-2 -translate-y-1/2 text-[11px] text-muted-foreground tabular-nums"
                        style={{ top: `${(y(value) / height) * 100}%` }}
                    >
                        {value === 0 ? '0' : `${value} ms`}
                    </span>
                ))}
            </div>
            <div className="mt-2 ml-14 flex min-h-10 items-center justify-between gap-4 text-[13px]">
                {hovered ? (
                    <>
                        <span className="text-muted-foreground">
                            {formatDateTime(hovered.at, locale, timezone)}
                        </span>
                        <span className="tabular-nums">
                            {hovered.ms !== null ? `${hovered.ms} ms` : '—'}
                            {hovered.failed > 0 && (
                                <span className="ml-3 font-medium text-status-major">
                                    {t(':count failed', {
                                        count: hovered.failed,
                                    })}
                                </span>
                            )}
                        </span>
                    </>
                ) : (
                    <span className="text-muted-foreground">
                        {t('Hover the chart to inspect response times.')}
                    </span>
                )}
            </div>
        </div>
    );
}

function niceMax(value: number): number {
    const magnitude = 10 ** Math.floor(Math.log10(value));
    const normalized = value / magnitude;
    const nice =
        normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;

    return nice * magnitude;
}
