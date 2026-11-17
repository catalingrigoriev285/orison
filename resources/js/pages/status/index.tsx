import { Head, Link, usePage, usePoll } from '@inertiajs/react';
import { CalendarClock, ChevronRight, Info } from 'lucide-react';
import {
    IncidentRow,
    ActiveIncidentCard,
} from '@/components/status/incident-card';
import { StatusIcon } from '@/components/status/status-icon';
import { SectionTitle, Surface } from '@/components/status/surface';
import { UptimeBar } from '@/components/status/uptime-bar';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTrans } from '@/hooks/use-trans';
import { formatDateTime, formatDay, formatTime } from '@/lib/format';
import {
    componentStatusLabel,
    componentStatusTone,
    overallStatusTitle,
    toneClasses,
} from '@/lib/status';
import { cn } from '@/lib/utils';
import { history } from '@/routes/status';
import type {
    ComponentStatus,
    PublicComponentGroup,
    PublicIncident,
    PublicMaintenance,
} from '@/types';

type Props = {
    overall: ComponentStatus;
    groups: PublicComponentGroup[];
    activeIncidents: PublicIncident[];
    activeMaintenances: PublicMaintenance[];
    upcomingMaintenances: PublicMaintenance[];
    pastDays: { date: string; incidents: PublicIncident[] }[];
};

export default function StatusIndex({
    overall,
    groups,
    activeIncidents,
    activeMaintenances,
    upcomingMaintenances,
    pastDays,
}: Props) {
    const { t, locale } = useTrans();
    const { brand } = usePage().props;

    usePoll(60_000, {
        only: [
            'overall',
            'groups',
            'activeIncidents',
            'activeMaintenances',
            'upcomingMaintenances',
            'pastDays',
        ],
    });

    return (
        <>
            <Head title={t(overallStatusTitle[overall])} />

            <OverallStatus status={overall} overlap={!!brand.scene} />

            {(activeIncidents.length > 0 || activeMaintenances.length > 0) && (
                <div className="mt-10 space-y-4">
                    {activeIncidents.map((incident) => (
                        <ActiveIncidentCard
                            key={incident.id}
                            incident={incident}
                        />
                    ))}
                    {activeMaintenances.map((maintenance) => (
                        <MaintenanceCard
                            key={maintenance.id}
                            maintenance={maintenance}
                            active
                        />
                    ))}
                </div>
            )}

            {upcomingMaintenances.length > 0 && (
                <section className="mt-10">
                    <SectionTitle>{t('Scheduled maintenance')}</SectionTitle>
                    <div className="space-y-4">
                        {upcomingMaintenances.map((maintenance) => (
                            <MaintenanceCard
                                key={maintenance.id}
                                maintenance={maintenance}
                            />
                        ))}
                    </div>
                </section>
            )}

            <div className="mt-12 space-y-8">
                {groups.map((group) => (
                    <section key={group.id ?? 'ungrouped'}>
                        {group.name && (
                            <SectionTitle>{group.name}</SectionTitle>
                        )}
                        <Surface className="divide-y divide-hairline">
                            {group.components.map((component) => (
                                <div key={component.id} className="p-5 sm:px-6">
                                    <div className="mb-3.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                                        <div className="flex min-w-0 items-center gap-1.5">
                                            <h3 className="text-[16px] font-semibold tracking-tight">
                                                {component.name}
                                            </h3>
                                            {component.description && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <button
                                                            type="button"
                                                            className="rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                                                            aria-label={
                                                                component.description
                                                            }
                                                        >
                                                            <Info className="size-3.5" />
                                                        </button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        {component.description}
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}
                                        </div>
                                        <span
                                            className={cn(
                                                'flex shrink-0 items-center gap-1.5 text-[13px] font-medium',
                                                toneClasses[
                                                    componentStatusTone[
                                                        component.status
                                                    ]
                                                ].text,
                                            )}
                                        >
                                            {t(
                                                componentStatusLabel[
                                                    component.status
                                                ],
                                            )}
                                            <StatusIcon
                                                status={component.status}
                                                className="size-4"
                                            />
                                        </span>
                                    </div>
                                    <UptimeBar
                                        days={component.days}
                                        uptime={component.uptime}
                                    />
                                </div>
                            ))}
                        </Surface>
                    </section>
                ))}
            </div>

            <section className="mt-14">
                <SectionTitle>{t('Past incidents')}</SectionTitle>
                <Surface className="divide-y divide-hairline">
                    {pastDays.map((day) => (
                        <div key={day.date} className="px-5 py-4 sm:px-6">
                            <h3 className="mb-2 text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
                                {formatDay(day.date, locale)}
                            </h3>
                            {day.incidents.length === 0 ? (
                                <p className="text-[14px] text-muted-foreground">
                                    {t('No incidents reported.')}
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {day.incidents.map((incident) => (
                                        <IncidentRow
                                            key={incident.id}
                                            incident={incident}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </Surface>
                <div className="mt-4 text-center">
                    <Link
                        href={history()}
                        className="inline-flex items-center gap-0.5 text-[14px] font-medium text-primary hover:underline"
                    >
                        {t('Incident history')}
                        <ChevronRight className="size-4" />
                    </Link>
                </div>
            </section>
        </>
    );
}

/**
 * Solid bar in the status colour. With a header scene it overlaps the
 * bottom edge of the scene.
 */
function OverallStatus({
    status,
    overlap,
}: {
    status: ComponentStatus;
    overlap: boolean;
}) {
    const { t, locale, timezone } = useTrans();
    const tone = componentStatusTone[status];
    // Yellow needs dark text to stay readable.
    const ink =
        tone === 'degraded'
            ? 'text-[#1d1d1f] dark:text-[#1d1d1f]'
            : 'text-white dark:text-white';

    return (
        <div
            className={cn(
                'relative flex flex-wrap items-center justify-between gap-x-6 gap-y-1 rounded-[14px] px-5 py-4 shadow-[0_6px_20px_rgba(0,0,0,0.10)] sm:px-6 sm:py-5',
                toneClasses[tone].bg,
                ink,
                overlap && '-mt-12 sm:-mt-16',
            )}
        >
            <h1 className="flex items-center gap-3 text-[21px] leading-tight font-semibold tracking-tight sm:text-[26px]">
                <StatusIcon
                    status={status}
                    className={cn('size-7 shrink-0 sm:size-8', ink)}
                />
                {t(overallStatusTitle[status])}
            </h1>
            <p className="text-[13px] font-medium opacity-90 sm:text-[14px]">
                {t('Updated at :time', {
                    time: formatTime(
                        new Date().toISOString(),
                        locale,
                        timezone,
                    ),
                })}
            </p>
        </div>
    );
}

function MaintenanceCard({
    maintenance,
    active = false,
}: {
    maintenance: PublicMaintenance;
    active?: boolean;
}) {
    const { t, locale, timezone } = useTrans();

    return (
        <Surface as="article" className="overflow-hidden">
            {active && <div className="h-1 bg-status-maintenance" />}
            <div className="flex gap-4 p-5 sm:p-6">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-status-maintenance">
                    <CalendarClock className="size-5" />
                </div>
                <div className="min-w-0">
                    <p className="text-[12px] font-semibold tracking-wide text-status-maintenance uppercase">
                        {active ? t('Maintenance in progress') : t('Scheduled')}
                    </p>
                    <h3 className="mt-0.5 text-[17px] font-semibold tracking-tight">
                        {maintenance.title}
                    </h3>
                    {maintenance.description && (
                        <p className="mt-1 text-[14px] whitespace-pre-line text-muted-foreground">
                            {maintenance.description}
                        </p>
                    )}
                    <p className="mt-2 text-[13px] text-foreground">
                        {formatDateTime(
                            maintenance.scheduled_start,
                            locale,
                            timezone,
                        )}
                        {' – '}
                        {formatDateTime(
                            maintenance.scheduled_end,
                            locale,
                            timezone,
                        )}
                    </p>
                    {maintenance.components &&
                        maintenance.components.length > 0 && (
                            <p className="mt-1 text-[13px] text-muted-foreground">
                                {t('Affects')}:{' '}
                                {maintenance.components
                                    .map((c) => c.name)
                                    .join(', ')}
                            </p>
                        )}
                </div>
            </div>
        </Surface>
    );
}
