import { Head, router, usePoll } from '@inertiajs/react';
import { Pause, Play, RotateCw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
    AdminPage,
    EmptyState,
    PageHeader,
} from '@/components/admin/page-header';
import { StatusBadge } from '@/components/status/status-badge';
import { StatusDot } from '@/components/status/status-dot';
import { SectionTitle, Surface } from '@/components/status/surface';
import { Button } from '@/components/ui/button';
import { useBreadcrumbs } from '@/hooks/use-breadcrumbs';
import { useTrans } from '@/hooks/use-trans';
import { formatDateTime, formatRelative } from '@/lib/format';
import type { Tone } from '@/lib/status';
import { cn } from '@/lib/utils';
import queueRoutes from '@/routes/admin/queue';

type JobState = 'waiting' | 'delayed' | 'running' | 'stuck';
type FinishedStatus = 'processed' | 'released' | 'retrying' | 'failed';

type QueueRow = {
    name: string;
    waiting: number;
    delayed: number;
    running: number;
    stuck: number;
    failed: number;
    oldest_waiting_at: string | null;
};

type Job = {
    id: number;
    queue: string;
    name: string;
    state: JobState;
    attempts: number;
    created_at: string;
    available_at: string;
    reserved_at: string | null;
};

type Finished = {
    id: string;
    name: string;
    queue: string;
    status: FinishedStatus;
    attempts: number;
    duration_ms: number | null;
    error: string | null;
    finished_at: string;
};

type FailedJob = {
    uuid: string;
    queue: string;
    name: string;
    error: string;
    failed_at: string | null;
};

type Worker = {
    host: string;
    pid: number;
    connection: string | null;
    queue: string | null;
    seen_at: string;
};

type Snapshot = {
    connection: string;
    driver: string;
    supported: boolean;
    workers: Worker[];
    recent: Finished[];
    queues: QueueRow[];
    totals: Record<
        'waiting' | 'delayed' | 'running' | 'stuck' | 'failed',
        number
    >;
    jobs: Job[];
    failed: FailedJob[];
    generated_at: string;
};

/** How often the page refreshes itself. */
const POLL_MS = 3_000;

const jobStateTone: Record<JobState, Tone> = {
    waiting: 'empty',
    delayed: 'empty',
    running: 'maintenance',
    stuck: 'partial',
};

const jobStateLabel: Record<JobState, string> = {
    waiting: 'Waiting',
    delayed: 'Delayed',
    running: 'Running',
    stuck: 'Stuck',
};

const finishedTone: Record<FinishedStatus, Tone> = {
    processed: 'operational',
    released: 'empty',
    retrying: 'degraded',
    failed: 'major',
};

const finishedLabel: Record<FinishedStatus, string> = {
    processed: 'Done',
    released: 'Released',
    retrying: 'Will retry',
    failed: 'Failed',
};

export default function QueueIndex({ queue }: { queue: Snapshot }) {
    const { t, locale, timezone } = useTrans();
    const [paused, setPaused] = useState(false);

    useBreadcrumbs([{ title: t('Queue'), href: queueRoutes.index() }]);

    const { start, stop } = usePoll(POLL_MS, { only: ['queue'] });

    const togglePolling = () => {
        if (paused) {
            start();
        } else {
            stop();
        }

        setPaused(!paused);
    };

    const post = (
        url: string,
        method: 'post' | 'delete',
        question?: string,
    ) => {
        if (question && !window.confirm(question)) {
            return;
        }

        router.visit(url, {
            method,
            preserveScroll: true,
            only: ['queue', 'flash'],
        });
    };

    const tiles = [
        {
            label: t('Waiting'),
            value: queue.totals.waiting,
            tone: 'text-foreground',
            hint: t('Ready to run'),
        },
        {
            label: t('Running'),
            value: queue.totals.running,
            tone:
                queue.totals.running > 0
                    ? 'text-status-maintenance'
                    : 'text-foreground',
            hint:
                queue.totals.stuck > 0
                    ? t(':count stuck', { count: queue.totals.stuck })
                    : t('Picked up by a worker'),
        },
        {
            label: t('Delayed'),
            value: queue.totals.delayed,
            tone: 'text-foreground',
            hint: t('Scheduled for later or backing off'),
        },
        {
            label: t('Failed'),
            value: queue.totals.failed,
            tone:
                queue.totals.failed > 0
                    ? 'text-status-major'
                    : 'text-foreground',
            hint:
                queue.totals.failed > 0
                    ? t('Needs attention')
                    : t('Nothing failed'),
        },
    ];

    return (
        <AdminPage>
            <Head title={t('Queue')} />
            <PageHeader
                title={t('Queue')}
                description={t(
                    'Background jobs, live. The page refreshes every 3 seconds.',
                )}
                actions={
                    <>
                        <span className="flex items-center gap-2 text-[13px] text-muted-foreground">
                            <StatusDot
                                tone={paused ? 'empty' : 'operational'}
                                className={cn(!paused && 'animate-pulse')}
                            />
                            {paused ? t('Paused') : t('Live')}
                        </span>
                        <Button variant="secondary" onClick={togglePolling}>
                            {paused ? <Play /> : <Pause />}
                            {paused ? t('Resume') : t('Pause')}
                        </Button>
                    </>
                }
            />

            {!queue.supported && (
                <Surface className="mb-8 p-5 text-[14px]">
                    {t(
                        'The queue uses the ":driver" driver. Waiting and running jobs can only be listed with the database driver; workers, recent activity and failed jobs are still shown.',
                        { driver: queue.driver },
                    )}
                </Surface>
            )}

            <WorkersCard workers={queue.workers} />

            <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
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

            {queue.queues.length > 0 && (
                <section className="mt-10">
                    <SectionTitle>{t('Queues')}</SectionTitle>
                    <Surface className="overflow-x-auto">
                        <table className="w-full min-w-[560px] text-[13px]">
                            <thead>
                                <tr className="border-b border-hairline text-left text-muted-foreground">
                                    <th className="px-5 py-3 font-medium">
                                        {t('Queue')}
                                    </th>
                                    <th className="px-3 py-3 text-right font-medium">
                                        {t('Waiting')}
                                    </th>
                                    <th className="px-3 py-3 text-right font-medium">
                                        {t('Running')}
                                    </th>
                                    <th className="px-3 py-3 text-right font-medium">
                                        {t('Delayed')}
                                    </th>
                                    <th className="px-3 py-3 text-right font-medium">
                                        {t('Failed')}
                                    </th>
                                    <th className="px-5 py-3 text-right font-medium">
                                        {t('Oldest waiting')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-hairline">
                                {queue.queues.map((row) => (
                                    <tr key={row.name}>
                                        <td className="px-5 py-3 font-mono">
                                            {row.name}
                                        </td>
                                        <td className="px-3 py-3 text-right tabular-nums">
                                            {row.waiting}
                                        </td>
                                        <td className="px-3 py-3 text-right tabular-nums">
                                            {row.running}
                                            {row.stuck > 0 && (
                                                <span className="ml-1 text-status-partial">
                                                    +{row.stuck}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 text-right tabular-nums">
                                            {row.delayed}
                                        </td>
                                        <td
                                            className={cn(
                                                'px-3 py-3 text-right tabular-nums',
                                                row.failed > 0 &&
                                                    'text-status-major',
                                            )}
                                        >
                                            {row.failed}
                                        </td>
                                        <td className="px-5 py-3 text-right text-muted-foreground">
                                            {row.oldest_waiting_at
                                                ? formatRelative(
                                                      row.oldest_waiting_at,
                                                      locale,
                                                  )
                                                : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Surface>
                </section>
            )}

            {queue.supported && (
                <section className="mt-10">
                    <SectionTitle>{t('In the queue')}</SectionTitle>
                    <Surface className="divide-y divide-hairline overflow-hidden">
                        {queue.jobs.length === 0 ? (
                            <EmptyState
                                title={t('The queue is empty.')}
                                description={t(
                                    'Jobs appear here while they wait or run.',
                                )}
                            />
                        ) : (
                            queue.jobs.map((job) => (
                                <div
                                    key={job.id}
                                    className="flex items-center justify-between gap-4 px-5 py-3"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate font-mono text-[13px] font-medium">
                                            {job.name}
                                        </p>
                                        <p className="truncate text-[12px] text-muted-foreground">
                                            #{job.id} · {job.queue} ·{' '}
                                            {job.reserved_at
                                                ? t('started :time', {
                                                      time: formatRelative(
                                                          job.reserved_at,
                                                          locale,
                                                      ),
                                                  })
                                                : job.state === 'delayed'
                                                  ? t('runs :time', {
                                                        time: formatRelative(
                                                            job.available_at,
                                                            locale,
                                                        ),
                                                    })
                                                  : t('queued :time', {
                                                        time: formatRelative(
                                                            job.created_at,
                                                            locale,
                                                        ),
                                                    })}
                                            {job.attempts > 0 &&
                                                ` · ${t(':count attempts', { count: job.attempts })}`}
                                        </p>
                                    </div>
                                    <StatusBadge
                                        tone={jobStateTone[job.state]}
                                        label={t(jobStateLabel[job.state])}
                                    />
                                </div>
                            ))
                        )}
                    </Surface>
                </section>
            )}

            <section className="mt-10">
                <SectionTitle>{t('Recent activity')}</SectionTitle>
                <Surface className="divide-y divide-hairline overflow-hidden">
                    {queue.recent.length === 0 ? (
                        <EmptyState
                            title={t('Nothing has run yet.')}
                            description={t(
                                'Finished jobs show up here as workers process them.',
                            )}
                        />
                    ) : (
                        queue.recent.map((item) => (
                            <div
                                key={item.id}
                                className="flex items-center justify-between gap-4 px-5 py-3"
                            >
                                <div className="min-w-0">
                                    <p className="truncate font-mono text-[13px] font-medium">
                                        {item.name}
                                    </p>
                                    <p className="truncate text-[12px] text-muted-foreground">
                                        {item.queue} ·{' '}
                                        {formatRelative(
                                            item.finished_at,
                                            locale,
                                        )}
                                        {item.duration_ms !== null &&
                                            ` · ${item.duration_ms} ms`}
                                        {item.attempts > 1 &&
                                            ` · ${t(':count attempts', { count: item.attempts })}`}
                                    </p>
                                    {item.error && (
                                        <p className="mt-1 truncate text-[12px] text-status-major">
                                            {item.error}
                                        </p>
                                    )}
                                </div>
                                <StatusBadge
                                    tone={finishedTone[item.status]}
                                    label={t(finishedLabel[item.status])}
                                />
                            </div>
                        ))
                    )}
                </Surface>
            </section>

            <section className="mt-10">
                <div className="flex items-end justify-between gap-3">
                    <SectionTitle>{t('Failed jobs')}</SectionTitle>
                    {queue.failed.length > 0 && (
                        <div className="mb-3 flex gap-2">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() =>
                                    post(queueRoutes.retryAll.url(), 'post')
                                }
                            >
                                <RotateCw /> {t('Retry all')}
                            </Button>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() =>
                                    post(
                                        queueRoutes.flush.url(),
                                        'delete',
                                        t(
                                            'Delete every failed job? This cannot be undone.',
                                        ),
                                    )
                                }
                            >
                                <Trash2 /> {t('Delete all')}
                            </Button>
                        </div>
                    )}
                </div>
                <Surface className="divide-y divide-hairline overflow-hidden">
                    {queue.failed.length === 0 ? (
                        <EmptyState
                            title={t('No failed jobs.')}
                            description={t(
                                'Jobs that run out of attempts are kept here so they can be retried.',
                            )}
                        />
                    ) : (
                        queue.failed.map((job) => (
                            <div
                                key={job.uuid}
                                className="flex items-start justify-between gap-4 px-5 py-3"
                            >
                                <div className="min-w-0">
                                    <p className="truncate font-mono text-[13px] font-medium">
                                        {job.name}
                                    </p>
                                    <p className="truncate text-[12px] text-muted-foreground">
                                        {job.queue}
                                        {job.failed_at &&
                                            ` · ${formatDateTime(job.failed_at, locale, timezone)}`}
                                    </p>
                                    <p className="mt-1 line-clamp-2 text-[12px] break-words text-status-major">
                                        {job.error}
                                    </p>
                                </div>
                                <div className="flex shrink-0 gap-2">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() =>
                                            post(
                                                queueRoutes.retry.url(job.uuid),
                                                'post',
                                            )
                                        }
                                        aria-label={t('Retry')}
                                    >
                                        <RotateCw /> {t('Retry')}
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() =>
                                            post(
                                                queueRoutes.forget.url(
                                                    job.uuid,
                                                ),
                                                'delete',
                                                t('Delete this failed job?'),
                                            )
                                        }
                                        aria-label={t('Delete')}
                                    >
                                        <Trash2 />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </Surface>
            </section>
        </AdminPage>
    );
}

function WorkersCard({ workers }: { workers: Worker[] }) {
    const { t, locale } = useTrans();
    const online = workers.length > 0;

    return (
        <Surface className="p-5">
            <div className="flex items-center gap-2">
                <StatusDot tone={online ? 'operational' : 'major'} />
                <p className="text-[15px] font-semibold">
                    {online
                        ? t(':count workers online', { count: workers.length })
                        : t('No worker is running')}
                </p>
            </div>
            {online ? (
                <ul className="mt-3 space-y-1 text-[12px] text-muted-foreground">
                    {workers.map((worker) => (
                        <li
                            key={`${worker.host}:${worker.pid}`}
                            className="font-mono"
                        >
                            {worker.host} · pid {worker.pid}
                            {worker.queue && ` · ${worker.queue}`} ·{' '}
                            {t('seen :time', {
                                time: formatRelative(worker.seen_at, locale),
                            })}
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="mt-2 text-[13px] text-muted-foreground">
                    {t(
                        'Jobs wait until a worker runs (php artisan queue:work, or the queue container).',
                    )}
                </p>
            )}
        </Surface>
    );
}
