import { Head, Link } from '@inertiajs/react';
import { ChevronLeft } from 'lucide-react';
import { IncidentTimeline } from '@/components/status/incident-timeline';
import { StatusBadge } from '@/components/status/status-badge';
import { Surface } from '@/components/status/surface';
import { useTrans } from '@/hooks/use-trans';
import { formatDateTime, formatDuration } from '@/lib/format';
import {
    componentStatusLabel,
    componentStatusTone,
    incidentImpactLabel,
    incidentImpactTone,
    incidentStatusLabel,
} from '@/lib/status';
import { home } from '@/routes';
import type { PublicIncident } from '@/types';

export default function IncidentPage({
    incident,
}: {
    incident: PublicIncident;
}) {
    const { t, locale, timezone } = useTrans();
    const isResolved = incident.status === 'resolved';
    const durationSeconds = incident.resolved_at
        ? (new Date(incident.resolved_at).getTime() -
              new Date(incident.started_at).getTime()) /
          1000
        : null;

    return (
        <>
            <Head title={incident.title} />

            <Link
                href={home()}
                className="inline-flex items-center gap-0.5 text-[14px] font-medium text-primary hover:underline"
            >
                <ChevronLeft className="size-4" />
                {t('Current status')}
            </Link>

            <header className="mt-6">
                <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge
                        tone={
                            isResolved
                                ? 'operational'
                                : incidentImpactTone[incident.impact]
                        }
                        label={t(incidentStatusLabel[incident.status])}
                    />
                    <span className="text-[13px] text-muted-foreground">
                        {t('Impact')}: {t(incidentImpactLabel[incident.impact])}
                    </span>
                </div>
                <h1 className="mt-3 text-[30px] leading-tight font-semibold tracking-tight sm:text-[36px]">
                    {incident.title}
                </h1>
                <p className="mt-2 text-[15px] text-muted-foreground">
                    {t('Started :date', {
                        date: formatDateTime(
                            incident.started_at,
                            locale,
                            timezone,
                        ),
                    })}
                    {durationSeconds !== null &&
                        ` · ${t('Lasted :duration', {
                            duration: formatDuration(durationSeconds, locale),
                        })}`}
                </p>
            </header>

            <Surface className="mt-8 p-6 sm:p-8">
                <IncidentTimeline updates={incident.updates ?? []} />
            </Surface>

            {incident.components && incident.components.length > 0 && (
                <Surface className="mt-4 p-6 sm:px-8">
                    <h2 className="text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
                        {t('Affected services')}
                    </h2>
                    <ul className="mt-3 divide-y divide-hairline">
                        {incident.components.map((component) => (
                            <li
                                key={component.id}
                                className="flex items-center justify-between gap-3 py-2.5 text-[15px]"
                            >
                                <span className="font-medium">
                                    {component.name}
                                </span>
                                <StatusBadge
                                    tone={componentStatusTone[component.status]}
                                    label={t(
                                        componentStatusLabel[component.status],
                                    )}
                                />
                            </li>
                        ))}
                    </ul>
                </Surface>
            )}
        </>
    );
}
