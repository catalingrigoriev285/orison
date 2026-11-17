import { StatusBadge } from '@/components/status/status-badge';
import { useTrans } from '@/hooks/use-trans';
import { formatRelative } from '@/lib/format';
import type { AlertSummary } from '@/types';

export const alertStateLabel = {
    delivered: 'Delivered',
    failed: 'Failed',
    pending: 'Pending',
} as const;

export const alertStateTone = {
    delivered: 'operational',
    failed: 'major',
    pending: 'degraded',
} as const;

export function AlertRow({ alert }: { alert: AlertSummary }) {
    const { t, locale } = useTrans();

    return (
        <div className="flex items-center justify-between gap-4 px-5 py-3">
            <div className="min-w-0">
                <p className="font-mono text-[13px]">{alert.event}</p>
                <p className="text-[12px] text-muted-foreground">
                    {formatRelative(alert.created_at, locale)}
                </p>
            </div>
            <StatusBadge
                tone={alertStateTone[alert.state]}
                label={t(alertStateLabel[alert.state])}
            />
        </div>
    );
}
