import { Head, Link, router } from '@inertiajs/react';
import {
    Check,
    Copy,
    Pause,
    Pencil,
    Play,
    RefreshCw,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { ConfirmButton } from '@/components/admin/confirm-button';
import {
    MonitorState,
    monitorTypeLabel,
} from '@/components/admin/monitor-state';
import { AdminPage, PageHeader } from '@/components/admin/page-header';
import { ResponseTimeChart } from '@/components/status/response-time-chart';
import type { ChartBucket } from '@/components/status/response-time-chart';
import { SegmentedControl } from '@/components/status/segmented-control';
import { SectionTitle, Surface } from '@/components/status/surface';
import { Button } from '@/components/ui/button';
import { useBreadcrumbs } from '@/hooks/use-breadcrumbs';
import { useClipboard } from '@/hooks/use-clipboard';
import { useTrans } from '@/hooks/use-trans';
import {
    formatDateTime,
    formatDuration,
    formatPercent,
    formatRelative,
} from '@/lib/format';
import { cn } from '@/lib/utils';
import monitors from '@/routes/admin/monitors';
import type { MonitorSummary } from '@/types';

type Props = {
    monitor: MonitorSummary & {
        interval_seconds: number;
        timeout_seconds: number;
        failure_threshold: number;
        expected_status: number;
        method: string;
        keyword: string | null;
        notify: boolean;
        auto_incident: boolean;
        heartbeat_url: string | null;
        last_error: string | null;
        state_changed_at: string | null;
    };
    range: '24h' | '7d' | '30d';
    uptime: Record<'24h' | '7d' | '30d' | '90d', number | null>;
    chart: ChartBucket[];
    outages: {
        started_at: string;
        ended_at: string | null;
        duration_seconds: number;
        error: string | null;
    }[];
    recentChecks: {
        id: number;
        is_up: boolean;
        response_time_ms: number | null;
        status_code: number | null;
        error: string | null;
        checked_at: string;
    }[];
};

export default function MonitorShow({
    monitor,
    range,
    uptime,
    chart,
    outages,
    recentChecks,
}: Props) {
    const { t, locale, timezone } = useTrans();
    const [checking, setChecking] = useState(false);

    useBreadcrumbs([
        { title: t('Monitors'), href: monitors.index() },
        { title: monitor.name, href: monitors.show(monitor.id) },
    ]);

    return (
        <AdminPage>
            <Head title={monitor.name} />
            <PageHeader
                title={monitor.name}
                description={
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <MonitorState state={monitor.state} />
                        <span>
                            {t(monitorTypeLabel[monitor.type])} ·{' '}
                            {monitor.target}
                        </span>
                        {monitor.state_changed_at && (
                            <span>
                                {t('State changed :time', {
                                    time: formatRelative(
                                        monitor.state_changed_at,
                                        locale,
                                    ),
                                })}
                            </span>
                        )}
                    </span>
                }
                actions={
                    <>
                        {monitor.type !== 'heartbeat' && (
                            <Button
                                variant="secondary"
                                disabled={checking}
                                onClick={() =>
                                    router.post(
                                        monitors.check.url(monitor.id),
                                        {},
                                        {
                                            preserveScroll: true,
                                            onStart: () => setChecking(true),
                                            onFinish: () => setChecking(false),
                                        },
                                    )
                                }
                            >
                                <RefreshCw
                                    className={cn(checking && 'animate-spin')}
                                />{' '}
                                {t('Check now')}
                            </Button>
                        )}
                        <Button
                            variant="secondary"
                            onClick={() =>
                                router.post(
                                    monitors.toggle.url(monitor.id),
                                    {},
                                    { preserveScroll: true },
                                )
                            }
                        >
                            {monitor.is_active ? <Pause /> : <Play />}
                            {monitor.is_active ? t('Pause') : t('Resume')}
                        </Button>
                        <Button variant="secondary" asChild>
                            <Link href={monitors.edit(monitor.id)}>
                                <Pencil /> {t('Edit')}
                            </Link>
                        </Button>
                    </>
                }
            />

            {monitor.last_error && monitor.state !== 'up' && (
                <div className="mb-6 rounded-[14px] border border-status-major bg-card px-5 py-3.5 text-[14px]">
                    <span className="font-semibold text-status-major">
                        {t('Last error')}:{' '}
                    </span>
                    <span className="font-mono text-[13px]">
                        {monitor.last_error}
                    </span>
                </div>
            )}

            {monitor.heartbeat_url && (
                <HeartbeatUrl url={monitor.heartbeat_url} />
            )}

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {(['24h', '7d', '30d', '90d'] as const).map((key) => (
                    <Surface key={key} as="div" className="p-5">
                        <p className="text-[13px] font-medium text-muted-foreground">
                            {t('Uptime · :range', { range: key })}
                        </p>
                        <p className="mt-2 text-[26px] leading-none font-semibold tracking-tight tabular-nums">
                            {formatPercent(uptime[key], locale, 3)}
                        </p>
                    </Surface>
                ))}
            </div>

            <section className="mt-10">
                <SectionTitle
                    action={
                        <SegmentedControl
                            size="sm"
                            value={range}
                            items={(['24h', '7d', '30d'] as const).map(
                                (value) => ({
                                    value,
                                    label: value,
                                    href: monitors.show.url(monitor.id, {
                                        query: { range: value },
                                    }),
                                }),
                            )}
                        />
                    }
                >
                    {t('Response time')}
                </SectionTitle>
                <Surface className="p-5">
                    <ResponseTimeChart buckets={chart} />
                </Surface>
            </section>

            <div className="mt-10 grid gap-8 lg:grid-cols-2">
                <section>
                    <SectionTitle>{t('Downtime')}</SectionTitle>
                    <Surface className="divide-y divide-hairline">
                        {outages.length === 0 ? (
                            <p className="px-5 py-6 text-center text-[14px] text-muted-foreground">
                                {t('No downtime in this period.')}
                            </p>
                        ) : (
                            outages.map((outage) => (
                                <div
                                    key={outage.started_at}
                                    className="px-5 py-3.5"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-[14px] font-medium">
                                            {formatDateTime(
                                                outage.started_at,
                                                locale,
                                                timezone,
                                            )}
                                        </span>
                                        <span
                                            className={cn(
                                                'text-[13px] tabular-nums',
                                                outage.ended_at
                                                    ? 'text-muted-foreground'
                                                    : 'font-semibold text-status-major',
                                            )}
                                        >
                                            {outage.ended_at
                                                ? formatDuration(
                                                      outage.duration_seconds,
                                                      locale,
                                                  )
                                                : t('Ongoing')}
                                        </span>
                                    </div>
                                    {outage.error && (
                                        <p className="mt-0.5 truncate font-mono text-[12px] text-muted-foreground">
                                            {outage.error}
                                        </p>
                                    )}
                                </div>
                            ))
                        )}
                    </Surface>
                </section>

                <section>
                    <SectionTitle>{t('Recent checks')}</SectionTitle>
                    <Surface className="divide-y divide-hairline">
                        {recentChecks.length === 0 ? (
                            <p className="px-5 py-6 text-center text-[14px] text-muted-foreground">
                                {t('No checks yet.')}
                            </p>
                        ) : (
                            recentChecks.map((check) => (
                                <div
                                    key={check.id}
                                    className="flex items-center justify-between gap-3 px-5 py-2.5 text-[13px]"
                                >
                                    <span className="flex min-w-0 items-center gap-2.5">
                                        <span
                                            className={cn(
                                                'size-2 shrink-0 rounded-full',
                                                check.is_up
                                                    ? 'bg-status-operational'
                                                    : 'bg-status-major',
                                            )}
                                        />
                                        <span className="shrink-0 text-muted-foreground">
                                            {formatDateTime(
                                                check.checked_at,
                                                locale,
                                                timezone,
                                            )}
                                        </span>
                                        {check.error && (
                                            <span className="truncate font-mono text-[12px] text-status-major">
                                                {check.error}
                                            </span>
                                        )}
                                    </span>
                                    <span className="shrink-0 tabular-nums">
                                        {check.status_code && (
                                            <span className="mr-3 text-muted-foreground">
                                                {check.status_code}
                                            </span>
                                        )}
                                        {check.response_time_ms !== null
                                            ? `${check.response_time_ms} ms`
                                            : '—'}
                                    </span>
                                </div>
                            ))
                        )}
                    </Surface>
                </section>
            </div>

            <Surface className="mt-10 grid gap-x-8 gap-y-3 p-6 text-[14px] sm:grid-cols-2">
                <Detail
                    label={t('Interval')}
                    value={`${monitor.interval_seconds} s`}
                />
                <Detail
                    label={t('Timeout')}
                    value={`${monitor.timeout_seconds} s`}
                />
                <Detail
                    label={t('Failures before down')}
                    value={String(monitor.failure_threshold)}
                />
                <Detail
                    label={t('Component')}
                    value={monitor.component?.name ?? '—'}
                />
                <Detail
                    label={t('Send alerts')}
                    value={monitor.notify ? t('Yes') : t('No')}
                />
                <Detail
                    label={t('Open incidents automatically')}
                    value={monitor.auto_incident ? t('Yes') : t('No')}
                />
            </Surface>

            <div className="mt-6 flex justify-end">
                <ConfirmButton
                    href={monitors.destroy.url(monitor.id)}
                    title={t('Delete this monitor?')}
                    description={t(
                        'Its check history is deleted too. This cannot be undone.',
                    )}
                >
                    <Trash2 /> {t('Delete monitor')}
                </ConfirmButton>
            </div>
        </AdminPage>
    );
}

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-4 border-b border-hairline pb-3 last:border-0 sm:[&:nth-last-child(2)]:border-0">
            <span className="text-muted-foreground">{label}</span>
            <span className="text-right font-medium">{value}</span>
        </div>
    );
}

function HeartbeatUrl({ url }: { url: string }) {
    const { t } = useTrans();
    const [copiedText, copy] = useClipboard();

    return (
        <Surface className="mb-6 p-5">
            <p className="text-[14px] font-semibold">{t('Heartbeat URL')}</p>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
                {t(
                    'Send a GET or POST request to this URL from the platform scheduler at least once per interval.',
                )}
            </p>
            <div className="mt-3 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-[10px] bg-fill px-3 py-2 font-mono text-[12px]">
                    {url}
                </code>
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void copy(url)}
                >
                    {copiedText === url ? <Check /> : <Copy />}
                    {copiedText === url ? t('Copied') : t('Copy')}
                </Button>
            </div>
        </Surface>
    );
}
