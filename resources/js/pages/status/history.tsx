import { Head, Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IncidentRow } from '@/components/status/incident-card';
import { SectionTitle, Surface } from '@/components/status/surface';
import { Button } from '@/components/ui/button';
import { useTrans } from '@/hooks/use-trans';
import { formatDateTime, formatMonth } from '@/lib/format';
import { home } from '@/routes';
import type { PublicIncident } from '@/types';

type ResourcePage<T> = {
    data: T[];
    links: { prev: string | null; next: string | null };
    meta: { current_page: number; last_page: number };
};

export default function History({
    incidents,
}: {
    incidents: ResourcePage<PublicIncident>;
}) {
    const { t, locale, timezone } = useTrans();

    const months = incidents.data.reduce<Map<string, PublicIncident[]>>(
        (groups, incident) => {
            const month = formatMonth(incident.started_at, locale, timezone);
            groups.set(month, [...(groups.get(month) ?? []), incident]);

            return groups;
        },
        new Map(),
    );

    return (
        <>
            <Head title={t('Incident history')} />

            <Link
                href={home()}
                className="inline-flex items-center gap-0.5 text-[14px] font-medium text-primary hover:underline"
            >
                <ChevronLeft className="size-4" />
                {t('Current status')}
            </Link>

            <h1 className="mt-6 text-[32px] font-semibold tracking-tight sm:text-[40px]">
                {t('Incident history')}
            </h1>

            {incidents.data.length === 0 ? (
                <Surface className="mt-10 p-10 text-center text-[15px] text-muted-foreground">
                    {t('No incidents have been reported yet.')}
                </Surface>
            ) : (
                <div className="mt-10 space-y-10">
                    {[...months.entries()].map(([month, items]) => (
                        <section key={month}>
                            <SectionTitle>
                                <span className="capitalize">{month}</span>
                            </SectionTitle>
                            <Surface className="divide-y divide-hairline">
                                {items.map((incident) => (
                                    <div
                                        key={incident.id}
                                        className="px-5 py-4 sm:px-6"
                                    >
                                        <IncidentRow incident={incident} />
                                        <p className="mt-1 px-1 text-[13px] text-muted-foreground">
                                            {formatDateTime(
                                                incident.started_at,
                                                locale,
                                                timezone,
                                            )}
                                        </p>
                                    </div>
                                ))}
                            </Surface>
                        </section>
                    ))}
                </div>
            )}

            {incidents.meta.last_page > 1 && (
                <nav className="mt-10 flex items-center justify-between">
                    <Button
                        variant="secondary"
                        size="sm"
                        disabled={!incidents.links.prev}
                        asChild={!!incidents.links.prev}
                    >
                        {incidents.links.prev ? (
                            <Link
                                href={incidents.links.prev}
                                preserveScroll={false}
                            >
                                <ChevronLeft /> {t('Newer')}
                            </Link>
                        ) : (
                            <span>
                                <ChevronLeft /> {t('Newer')}
                            </span>
                        )}
                    </Button>
                    <span className="text-[13px] text-muted-foreground">
                        {t('Page :current of :last', {
                            current: incidents.meta.current_page,
                            last: incidents.meta.last_page,
                        })}
                    </span>
                    <Button
                        variant="secondary"
                        size="sm"
                        disabled={!incidents.links.next}
                        asChild={!!incidents.links.next}
                    >
                        {incidents.links.next ? (
                            <Link href={incidents.links.next}>
                                {t('Older')} <ChevronRight />
                            </Link>
                        ) : (
                            <span>
                                {t('Older')} <ChevronRight />
                            </span>
                        )}
                    </Button>
                </nav>
            )}
        </>
    );
}
