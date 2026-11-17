import { Head, Link, usePoll } from '@inertiajs/react';
import { ChevronRight, Plus } from 'lucide-react';
import {
    AdminPage,
    EmptyState,
    PageHeader,
} from '@/components/admin/page-header';
import { AlertRow } from '@/components/admin/alert-row';
import { MonitorState } from '@/components/admin/monitor-state';
import { StatusBadge } from '@/components/status/status-badge';
import { Sparkline } from '@/components/status/sparkline';
import { SectionTitle, Surface } from '@/components/status/surface';
import { Button } from '@/components/ui/button';
import { useBreadcrumbs } from '@/hooks/use-breadcrumbs';
import { useTrans } from '@/hooks/use-trans';
import { formatPercent, formatRelative } from '@/lib/format';
import { incidentImpactTone, incidentStatusLabel } from '@/lib/status';
import { overview } from '@/routes/admin';
import alerts from '@/routes/admin/alerts';
import incidents from '@/routes/admin/incidents';
import monitors from '@/routes/admin/monitors';
import type {
    AlertSummary,
    IncidentImpact,
    IncidentStatus,
    MonitorSummary,
} from '@/types';

type Props = {
    stats: {
        monitors: number;
        up: number;
        down: number;
        paused: number;
        uptime30d: number | null;
        avgResponse24h: number | null;
        openIncidents: number;
    };
    monitors: (MonitorSummary & {
        uptime24h: number | null;
        sparkline: { ms: number | null; up: boolean }[];
    })[];
    openIncidents: {
        id: number;
        title: string;
        impact: IncidentImpact;
        status: IncidentStatus;
        started_at: string;
    }[];
    recentAlerts: AlertSummary[];
};

export default function Overview({
    stats,
    monitors: monitorList,
    openIncidents,
    recentAlerts,
}: Props) {
    const { t, locale } = useTrans();

    useBreadcrumbs([{ title: t('Overview'), href: overview() }]);
    usePoll(15_000, {
        only: ['stats', 'monitors', 'openIncidents', 'recentAlerts'],
    });

    const tiles = [
        {
            label: t('Monitors up'),
            value: `${stats.up}/${stats.monitors - stats.paused}`,
            tone: stats.down > 0 ? 'text-status-major' : 'text-foreground',
            hint:
                stats.down > 0
                    ? t(':count down', { count: stats.down })
                    : t('All healthy'),
        },
        {
            label: t('Uptime · 30 days'),
            value: formatPercent(stats.uptime30d, locale, 3),
            tone: 'text-foreground',
            hint: t('Across all monitors'),
        },
        {
            label: t('Avg. response · 24h'),
            value:
                stats.avgResponse24h === null
                    ? '—'
                    : `${stats.avgResponse24h} ms`,
            tone: 'text-foreground',
            hint: t('Successful checks only'),
        },
        {
            label: t('Open incidents'),
            value: String(stats.openIncidents),
            tone:
                stats.openIncidents > 0
                    ? 'text-status-partial'
                    : 'text-foreground',
            hint:
                stats.openIncidents > 0
                    ? t('Visible on the status page')
                    : t('Nothing to report'),
        },
    ];

    return (
        <AdminPage>
            <Head title={t('Overview')} />
            <PageHeader
                title={t('Overview')}
                description={t('Live health of every service.')}
                actions={
                    <>
                        <Button variant="secondary" asChild>
                            <Link href={monitors.create()}>
                                <Plus /> {t('New monitor')}
                            </Link>
                        </Button>
                        <Button asChild>
                            <Link href={incidents.create()}>
                                {t('Report incident')}
                            </Link>
                        </Button>
                    </>
                }
            />

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {tiles.map((tile) => (
                    <Surface key={tile.label} as="div" className="p-5">
                        <p className="text-[13px] font-medium text-muted-foreground">
                            {tile.label}
                        </p>
                        <p
                            className={`mt-2 text-[28px] leading-none font-semibold tracking-tight tabular-nums ${tile.tone}`}
                        >
                            {tile.value}
                        </p>
                        <p className="mt-2 text-[12px] text-muted-foreground">
                            {tile.hint}
                        </p>
                    </Surface>
                ))}
            </div>

            {openIncidents.length > 0 && (
                <section className="mt-10">
                    <SectionTitle>{t('Open incidents')}</SectionTitle>
                    <Surface className="divide-y divide-hairline">
                        {openIncidents.map((incident) => (
                            <Link
                                key={incident.id}
                                href={incidents.show(incident.id)}
                                className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-accent"
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-[15px] font-semibold">
                                        {incident.title}
                                    </p>
                                    <p className="text-[13px] text-muted-foreground">
                                        {formatRelative(
                                            incident.started_at,
                                            locale,
                                        )}
                                    </p>
                                </div>
                                <StatusBadge
                                    tone={incidentImpactTone[incident.impact]}
                                    label={t(
                                        incidentStatusLabel[incident.status],
                                    )}
                                />
                            </Link>
                        ))}
                    </Surface>
                </section>
            )}

            <section className="mt-10">
                <SectionTitle
                    action={
                        <Link
                            href={monitors.index()}
                            className="text-[14px] font-medium text-primary hover:underline"
                        >
                            {t('All monitors')}
                        </Link>
                    }
                >
                    {t('Monitors')}
                </SectionTitle>
                <Surface className="overflow-hidden">
                    {monitorList.length === 0 ? (
                        <EmptyState
                            title={t('No monitors yet')}
                            description={t(
                                'Add a monitor to start checking a service every minute.',
                            )}
                            action={
                                <Button asChild>
                                    <Link href={monitors.create()}>
                                        {t('New monitor')}
                                    </Link>
                                </Button>
                            }
                        />
                    ) : (
                        <div className="divide-y divide-hairline">
                            {monitorList.map((monitor) => (
                                <Link
                                    key={monitor.id}
                                    href={monitors.show(monitor.id)}
                                    className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-3.5 transition-colors hover:bg-accent md:grid-cols-[minmax(0,1fr)_120px_130px_90px_20px]"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-[15px] font-medium">
                                            {monitor.name}
                                        </p>
                                        <p className="truncate text-[12px] text-muted-foreground">
                                            {monitor.target}
                                        </p>
                                    </div>
                                    <MonitorState state={monitor.state} />
                                    <Sparkline
                                        points={monitor.sparkline}
                                        className="hidden md:block"
                                    />
                                    <span className="hidden text-right text-[13px] text-muted-foreground tabular-nums md:block">
                                        {formatPercent(
                                            monitor.uptime24h,
                                            locale,
                                        )}
                                    </span>
                                    <ChevronRight className="hidden size-4 text-muted-foreground md:block" />
                                </Link>
                            ))}
                        </div>
                    )}
                </Surface>
            </section>

            <section className="mt-10">
                <SectionTitle
                    action={
                        <Link
                            href={alerts.index()}
                            className="text-[14px] font-medium text-primary hover:underline"
                        >
                            {t('Alert log')}
                        </Link>
                    }
                >
                    {t('Recent alerts')}
                </SectionTitle>
                <Surface className="divide-y divide-hairline">
                    {recentAlerts.length === 0 ? (
                        <p className="px-5 py-6 text-center text-[14px] text-muted-foreground">
                            {t('No alerts sent yet.')}
                        </p>
                    ) : (
                        recentAlerts.map((alert) => (
                            <AlertRow key={alert.id} alert={alert} />
                        ))
                    )}
                </Surface>
            </section>
        </AdminPage>
    );
}
