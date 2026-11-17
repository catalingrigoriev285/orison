import { Head, Link } from '@inertiajs/react';
import { ChevronRight, Plus, Zap } from 'lucide-react';
import {
    AdminPage,
    EmptyState,
    PageHeader,
} from '@/components/admin/page-header';
import { Pagination } from '@/components/admin/pagination';
import { StatusBadge } from '@/components/status/status-badge';
import { SegmentedControl } from '@/components/status/segmented-control';
import { Surface } from '@/components/status/surface';
import { Button } from '@/components/ui/button';
import { useBreadcrumbs } from '@/hooks/use-breadcrumbs';
import { useTrans } from '@/hooks/use-trans';
import { formatDateTime, formatDuration } from '@/lib/format';
import { incidentImpactTone, incidentStatusLabel } from '@/lib/status';
import incidents from '@/routes/admin/incidents';
import type { IncidentImpact, IncidentStatus, Paginated } from '@/types';

type Row = {
    id: number;
    title: string;
    impact: IncidentImpact;
    status: IncidentStatus;
    is_automatic: boolean;
    started_at: string;
    resolved_at: string | null;
    components: string[];
};

export default function IncidentsIndex({
    incidents: page,
    filter,
}: {
    incidents: Paginated<Row>;
    filter: 'all' | 'open' | 'resolved';
}) {
    const { t, locale, timezone } = useTrans();

    useBreadcrumbs([{ title: t('Incidents'), href: incidents.index() }]);

    return (
        <AdminPage>
            <Head title={t('Incidents')} />
            <PageHeader
                title={t('Incidents')}
                description={t(
                    'Everything posted here appears on the public status page.',
                )}
                actions={
                    <Button asChild>
                        <Link href={incidents.create()}>
                            <Plus /> {t('Report incident')}
                        </Link>
                    </Button>
                }
            />

            <SegmentedControl
                className="mb-5"
                value={filter}
                items={[
                    {
                        value: 'all',
                        label: t('All'),
                        href: incidents.index.url(),
                    },
                    {
                        value: 'open',
                        label: t('Open'),
                        href: incidents.index.url({
                            query: { filter: 'open' },
                        }),
                    },
                    {
                        value: 'resolved',
                        label: t('Resolved'),
                        href: incidents.index.url({
                            query: { filter: 'resolved' },
                        }),
                    },
                ]}
            />

            <Surface className="divide-y divide-hairline overflow-hidden">
                {page.data.length === 0 ? (
                    <EmptyState
                        title={t('No incidents')}
                        description={t(
                            'Good news — nothing has been reported.',
                        )}
                    />
                ) : (
                    page.data.map((incident) => (
                        <Link
                            key={incident.id}
                            href={incidents.show(incident.id)}
                            className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-accent"
                        >
                            <div className="min-w-0">
                                <p className="flex items-center gap-1.5 truncate text-[15px] font-semibold">
                                    {incident.is_automatic && (
                                        <Zap
                                            className="size-3.5 shrink-0 text-status-degraded"
                                            aria-label={t('Automatic')}
                                        />
                                    )}
                                    {incident.title}
                                </p>
                                <p className="truncate text-[13px] text-muted-foreground">
                                    {formatDateTime(
                                        incident.started_at,
                                        locale,
                                        timezone,
                                    )}
                                    {incident.resolved_at &&
                                        ` · ${formatDuration((new Date(incident.resolved_at).getTime() - new Date(incident.started_at).getTime()) / 1000, locale)}`}
                                    {incident.components.length > 0 &&
                                        ` · ${incident.components.join(', ')}`}
                                </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-3">
                                <StatusBadge
                                    tone={
                                        incident.status === 'resolved'
                                            ? 'operational'
                                            : incidentImpactTone[
                                                  incident.impact
                                              ]
                                    }
                                    label={t(
                                        incidentStatusLabel[incident.status],
                                    )}
                                />
                                <ChevronRight className="size-4 text-muted-foreground" />
                            </div>
                        </Link>
                    ))
                )}
            </Surface>

            <Pagination page={page} />
        </AdminPage>
    );
}
