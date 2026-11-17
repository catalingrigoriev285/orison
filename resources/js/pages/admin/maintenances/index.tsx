import { Head, Link } from '@inertiajs/react';
import { ChevronRight, Plus } from 'lucide-react';
import {
    AdminPage,
    EmptyState,
    PageHeader,
} from '@/components/admin/page-header';
import { StatusBadge } from '@/components/status/status-badge';
import { Surface } from '@/components/status/surface';
import { Button } from '@/components/ui/button';
import { useBreadcrumbs } from '@/hooks/use-breadcrumbs';
import { useTrans } from '@/hooks/use-trans';
import { formatDateTime } from '@/lib/format';
import { maintenanceStatusLabel } from '@/lib/status';
import maintenances from '@/routes/admin/maintenances';
import type { MaintenanceStatus } from '@/types';

type Row = {
    id: number;
    title: string;
    status: MaintenanceStatus;
    scheduled_start: string;
    scheduled_end: string;
    components: string[];
};

const tone = {
    scheduled: 'maintenance',
    in_progress: 'partial',
    completed: 'empty',
} as const;

export default function MaintenancesIndex({
    maintenances: rows,
}: {
    maintenances: Row[];
}) {
    const { t, locale, timezone } = useTrans();

    useBreadcrumbs([{ title: t('Maintenance'), href: maintenances.index() }]);

    return (
        <AdminPage>
            <Head title={t('Maintenance')} />
            <PageHeader
                title={t('Maintenance')}
                description={t(
                    'Planned work is announced on the status page. Monitor alerts are muted during the window.',
                )}
                actions={
                    <Button asChild>
                        <Link href={maintenances.create()}>
                            <Plus /> {t('Schedule maintenance')}
                        </Link>
                    </Button>
                }
            />

            <Surface className="divide-y divide-hairline overflow-hidden">
                {rows.length === 0 ? (
                    <EmptyState
                        title={t('No maintenance scheduled')}
                        description={t(
                            'Let users know ahead of planned downtime.',
                        )}
                    />
                ) : (
                    rows.map((row) => (
                        <Link
                            key={row.id}
                            href={maintenances.edit(row.id)}
                            className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-accent"
                        >
                            <div className="min-w-0">
                                <p className="truncate text-[15px] font-semibold">
                                    {row.title}
                                </p>
                                <p className="truncate text-[13px] text-muted-foreground">
                                    {formatDateTime(
                                        row.scheduled_start,
                                        locale,
                                        timezone,
                                    )}{' '}
                                    –{' '}
                                    {formatDateTime(
                                        row.scheduled_end,
                                        locale,
                                        timezone,
                                    )}
                                    {row.components.length > 0 &&
                                        ` · ${row.components.join(', ')}`}
                                </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-3">
                                <StatusBadge
                                    tone={tone[row.status]}
                                    label={t(
                                        maintenanceStatusLabel[row.status],
                                    )}
                                />
                                <ChevronRight className="size-4 text-muted-foreground" />
                            </div>
                        </Link>
                    ))
                )}
            </Surface>
        </AdminPage>
    );
}
