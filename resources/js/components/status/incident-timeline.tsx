import { useTrans } from '@/hooks/use-trans';
import { formatDateTime } from '@/lib/format';
import { incidentStatusLabel } from '@/lib/status';
import { cn } from '@/lib/utils';
import type { PublicIncidentUpdate } from '@/types';

/**
 * Vertical list of updates, newest first, with a hairline rail.
 */
export function IncidentTimeline({
    updates,
    compact = false,
}: {
    updates: PublicIncidentUpdate[];
    compact?: boolean;
}) {
    const { t, locale, timezone } = useTrans();

    return (
        <ol className={cn('relative', compact ? 'space-y-3' : 'space-y-6')}>
            {updates.map((update, index) => (
                <li key={update.id} className="relative pl-5">
                    <span
                        className={cn(
                            'absolute top-[7px] left-0 size-[7px] rounded-full',
                            index === 0 ? 'bg-foreground' : 'bg-input',
                        )}
                    />
                    {index < updates.length - 1 && (
                        <span className="absolute top-[18px] -bottom-3 left-[3px] w-px bg-hairline" />
                    )}
                    <p className="text-[15px] leading-relaxed">
                        <span className="font-semibold">
                            {t(incidentStatusLabel[update.status])}
                        </span>
                        <span className="text-muted-foreground"> — </span>
                        <span className="whitespace-pre-line">
                            {update.message}
                        </span>
                    </p>
                    <time
                        dateTime={update.created_at}
                        className="mt-0.5 block text-[13px] text-muted-foreground"
                    >
                        {formatDateTime(update.created_at, locale, timezone)}
                    </time>
                </li>
            ))}
        </ol>
    );
}
