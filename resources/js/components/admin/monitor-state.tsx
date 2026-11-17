import { StatusDot } from '@/components/status/status-dot';
import { useTrans } from '@/hooks/use-trans';
import { monitorStateLabel, monitorStateTone, toneClasses } from '@/lib/status';
import { cn } from '@/lib/utils';
import type { MonitorState as State } from '@/types';

export function MonitorState({ state }: { state: State }) {
    const { t } = useTrans();
    const tone = monitorStateTone[state];

    return (
        <span
            className={cn(
                'inline-flex items-center gap-2 text-[13px] font-medium',
                toneClasses[tone].text,
            )}
        >
            <StatusDot tone={tone} pulse={state === 'down'} />
            {t(monitorStateLabel[state])}
        </span>
    );
}

export const monitorTypeLabel = {
    http: 'HTTP(S)',
    keyword: 'Keyword',
    tcp: 'TCP port',
    heartbeat: 'Heartbeat',
} as const;
