import { Head, Link } from '@inertiajs/react';
import { ChevronRight, Plus } from 'lucide-react';
import {
    MonitorState,
    monitorTypeLabel,
} from '@/components/admin/monitor-state';
import {
    AdminPage,
    EmptyState,
    PageHeader,
} from '@/components/admin/page-header';
import { Surface } from '@/components/status/surface';
import { Button } from '@/components/ui/button';
import { useBreadcrumbs } from '@/hooks/use-breadcrumbs';
import { useTrans } from '@/hooks/use-trans';
import { formatPercent, formatRelative } from '@/lib/format';
import monitors from '@/routes/admin/monitors';
import type { MonitorSummary } from '@/types';

type Row = MonitorSummary & {
    uptime24h: number | null;
    uptime30d: number | null;
};

export default function MonitorsIndex({ monitors: rows }: { monitors: Row[] }) {
    const { t, locale } = useTrans();

    useBreadcrumbs([{ title: t('Monitors'), href: monitors.index() }]);

    return (
        <AdminPage>
            <Head title={t('Monitors')} />
            <PageHeader
                title={t('Monitors')}
                description={t(
                    'Automatic checks that decide each component’s status.',
                )}
                actions={
                    <Button asChild>
                        <Link href={monitors.create()}>
                            <Plus /> {t('New monitor')}
                        </Link>
                    </Button>
                }
            />

            <Surface className="overflow-hidden">
                {rows.length === 0 ? (
                    <EmptyState
                        title={t('No monitors yet')}
                        description={t(
                            'Add a monitor to start checking a service every minute.',
                        )}
                    />
                ) : (
                    <table className="w-full text-left text-[14px]">
                        <thead className="border-b border-hairline text-[12px] text-muted-foreground">
                            <tr>
                                <th className="px-5 py-3 font-medium">
                                    {t('Name')}
                                </th>
                                <th className="px-3 py-3 font-medium">
                                    {t('Status')}
                                </th>
                                <th className="hidden px-3 py-3 font-medium lg:table-cell">
                                    {t('Component')}
                                </th>
                                <th className="hidden px-3 py-3 text-right font-medium md:table-cell">
                                    {t('Response')}
                                </th>
                                <th className="hidden px-3 py-3 text-right font-medium md:table-cell">
                                    24h
                                </th>
                                <th className="hidden px-3 py-3 text-right font-medium md:table-cell">
                                    30d
                                </th>
                                <th className="w-8" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-hairline">
                            {rows.map((monitor) => (
                                <tr
                                    key={monitor.id}
                                    className="group relative transition-colors hover:bg-accent"
                                >
                                    <td className="max-w-0 px-5 py-3.5">
                                        <Link
                                            href={monitors.show(monitor.id)}
                                            className="after:absolute after:inset-0"
                                        >
                                            <span className="block truncate font-medium">
                                                {monitor.name}
                                            </span>
                                        </Link>
                                        <span className="block truncate text-[12px] text-muted-foreground">
                                            {t(monitorTypeLabel[monitor.type])}{' '}
                                            · {monitor.target}
                                        </span>
                                    </td>
                                    <td className="px-3 py-3.5">
                                        <MonitorState state={monitor.state} />
                                        {monitor.last_checked_at && (
                                            <span className="block text-[12px] text-muted-foreground">
                                                {formatRelative(
                                                    monitor.last_checked_at,
                                                    locale,
                                                )}
                                            </span>
                                        )}
                                    </td>
                                    <td className="hidden px-3 py-3.5 text-muted-foreground lg:table-cell">
                                        {monitor.component?.name ?? '—'}
                                    </td>
                                    <td className="hidden px-3 py-3.5 text-right tabular-nums md:table-cell">
                                        {monitor.last_response_ms !== null
                                            ? `${monitor.last_response_ms} ms`
                                            : '—'}
                                    </td>
                                    <td className="hidden px-3 py-3.5 text-right tabular-nums md:table-cell">
                                        {formatPercent(
                                            monitor.uptime24h,
                                            locale,
                                        )}
                                    </td>
                                    <td className="hidden px-3 py-3.5 text-right tabular-nums md:table-cell">
                                        {formatPercent(
                                            monitor.uptime30d,
                                            locale,
                                        )}
                                    </td>
                                    <td className="pr-4">
                                        <ChevronRight className="size-4 text-muted-foreground" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </Surface>
        </AdminPage>
    );
}
