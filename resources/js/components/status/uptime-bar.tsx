import { Link } from '@inertiajs/react';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTrans } from '@/hooks/use-trans';
import { formatDay, formatDuration, formatPercent } from '@/lib/format';
import {
    componentStatusLabel,
    componentStatusTone,
    toneClasses,
} from '@/lib/status';
import { cn } from '@/lib/utils';
import { incident as incidentRoute } from '@/routes/status';
import type { UptimeDay } from '@/types';

/** Days shown on phones; the full history is shown from the sm breakpoint. */
const MOBILE_DAYS = 30;

export function UptimeBar({
    days,
    uptime,
}: {
    days: UptimeDay[];
    uptime: number | null;
}) {
    const { t, locale } = useTrans();

    return (
        <div>
            <div className="flex h-8 items-stretch gap-[2px] sm:gap-[3px]">
                {days.map((day, index) => {
                    const tone = day.status
                        ? componentStatusTone[day.status]
                        : 'empty';

                    return (
                        <Tooltip key={day.date}>
                            <TooltipTrigger asChild>
                                <button
                                    type="button"
                                    aria-label={formatDay(day.date, locale)}
                                    className={cn(
                                        'min-w-0 flex-1 rounded-[3px] transition-opacity duration-200 outline-none hover:opacity-70 focus-visible:ring-2 focus-visible:ring-ring',
                                        toneClasses[tone].bg,
                                        index < days.length - MOBILE_DAYS &&
                                            'hidden sm:block',
                                    )}
                                />
                            </TooltipTrigger>
                            <TooltipContent
                                side="top"
                                className="w-64 p-3.5 text-left"
                            >
                                <DayDetails day={day} />
                            </TooltipContent>
                        </Tooltip>
                    );
                })}
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-[12px] text-muted-foreground">
                <span className="sm:hidden">
                    {t(':count days ago', { count: MOBILE_DAYS })}
                </span>
                <span className="hidden sm:inline">
                    {t(':count days ago', { count: days.length })}
                </span>
                <span className="h-px flex-1 bg-hairline" />
                <span className="font-medium text-foreground/80">
                    {uptime === null
                        ? t('No data yet')
                        : t(':percent uptime', {
                              percent: formatPercent(uptime, locale),
                          })}
                </span>
                <span className="h-px flex-1 bg-hairline" />
                <span>{t('Today')}</span>
            </div>
        </div>
    );
}

function DayDetails({ day }: { day: UptimeDay }) {
    const { t, locale } = useTrans();

    return (
        <div className="space-y-2">
            <p className="text-[13px] font-semibold">
                {formatDay(day.date, locale, {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                })}
            </p>
            {day.status === null ? (
                <p className="text-muted-foreground">
                    {t('No data for this day.')}
                </p>
            ) : (
                <>
                    <p
                        className={cn(
                            'font-medium',
                            toneClasses[componentStatusTone[day.status]].text,
                        )}
                    >
                        {t(componentStatusLabel[day.status])}
                    </p>
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-muted-foreground">
                        <dt>{t('Uptime')}</dt>
                        <dd className="text-right text-foreground tabular-nums">
                            {formatPercent(day.uptime, locale)}
                        </dd>
                        {day.downtime_minutes > 0 && (
                            <>
                                <dt>{t('Downtime')}</dt>
                                <dd className="text-right text-foreground tabular-nums">
                                    {formatDuration(
                                        day.downtime_minutes * 60,
                                        locale,
                                    )}
                                </dd>
                            </>
                        )}
                    </dl>
                </>
            )}
            {day.incidents.length > 0 ? (
                <ul className="space-y-1 border-t border-hairline pt-2">
                    {day.incidents.map((incident) => (
                        <li key={incident.id}>
                            <Link
                                href={incidentRoute(incident.id)}
                                className="font-medium text-primary hover:underline"
                            >
                                {incident.title}
                            </Link>
                        </li>
                    ))}
                </ul>
            ) : (
                day.status !== null && (
                    <p className="border-t border-hairline pt-2 text-muted-foreground">
                        {t('No incidents reported.')}
                    </p>
                )
            )}
        </div>
    );
}
