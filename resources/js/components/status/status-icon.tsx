import {
    CircleAlert,
    CircleCheck,
    CircleMinus,
    CircleX,
    Wrench,
} from 'lucide-react';
import { componentStatusTone, toneClasses } from '@/lib/status';
import { cn } from '@/lib/utils';
import type { ComponentStatus } from '@/types';

const icons = {
    operational: CircleCheck,
    degraded_performance: CircleAlert,
    partial_outage: CircleMinus,
    major_outage: CircleX,
    under_maintenance: Wrench,
} as const;

export function StatusIcon({
    status,
    className,
}: {
    status: ComponentStatus;
    className?: string;
}) {
    const Icon = icons[status];

    return (
        <Icon
            aria-hidden="true"
            strokeWidth={2.25}
            className={cn(
                'size-[18px] shrink-0',
                toneClasses[componentStatusTone[status]].text,
                className,
            )}
        />
    );
}
