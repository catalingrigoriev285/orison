import { Link } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import { IncidentTimeline } from '@/components/status/incident-timeline';
import { StatusBadge } from '@/components/status/status-badge';
import { Surface } from '@/components/status/surface';
import { useTrans } from '@/hooks/use-trans';
import {
    incidentImpactTone,
    incidentStatusLabel,
    toneClasses,
} from '@/lib/status';
import { cn } from '@/lib/utils';
import { incident as incidentRoute } from '@/routes/status';
import type { PublicIncident } from '@/types';

/**
 * Prominent card for an incident that is still open.
 */
export function ActiveIncidentCard({ incident }: { incident: PublicIncident }) {
    const { t } = useTrans();
    const tone = incidentImpactTone[incident.impact];

    return (
        <Surface as="article" className="overflow-hidden">
            <div className={cn('h-1', toneClasses[tone].bg)} />
            <div className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <Link
                        href={incidentRoute(incident.id)}
                        className="group inline-flex items-center gap-1 text-[19px] leading-snug font-semibold tracking-tight"
                    >
                        {incident.title}
                        <ChevronRight className="size-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
                    </Link>
                    <StatusBadge
                        tone={tone}
                        label={t(incidentStatusLabel[incident.status])}
                    />
                </div>
                {incident.components && incident.components.length > 0 && (
                    <p className="mt-1 text-[13px] text-muted-foreground">
                        {t('Affects')}:{' '}
                        {incident.components.map((c) => c.name).join(', ')}
                    </p>
                )}
                {incident.updates && incident.updates.length > 0 && (
                    <div className="mt-5">
                        <IncidentTimeline
                            updates={incident.updates.slice(0, 3)}
                            compact
                        />
                    </div>
                )}
            </div>
        </Surface>
    );
}

/**
 * Compact row used in the past-incidents list and history.
 */
export function IncidentRow({ incident }: { incident: PublicIncident }) {
    const { t } = useTrans();
    const latest = incident.updates?.[0];
    const tone = incidentImpactTone[incident.impact];

    return (
        <Link
            href={incidentRoute(incident.id)}
            className="group block rounded-xl px-1 py-1 transition-colors duration-200"
        >
            <p
                className={cn(
                    'text-[15px] font-semibold group-hover:underline',
                    tone === 'empty'
                        ? 'text-foreground'
                        : toneClasses[tone].text,
                )}
            >
                {incident.title}
            </p>
            {latest && (
                <p className="mt-0.5 line-clamp-2 text-[14px] text-muted-foreground">
                    <span className="font-medium text-foreground">
                        {t(incidentStatusLabel[latest.status])}
                    </span>{' '}
                    — {latest.message}
                </p>
            )}
        </Link>
    );
}
