import { StatusDot } from '@/components/status/status-dot';
import { toneClasses } from '@/lib/status';
import type { Tone } from '@/lib/status';
import { cn } from '@/lib/utils';

/**
 * A quiet, solid pill: coloured dot plus label on a neutral fill.
 */
export function StatusBadge({
    tone,
    label,
    className,
}: {
    tone: Tone;
    label: string;
    className?: string;
}) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full bg-fill px-2.5 py-0.5 text-[12px] font-medium whitespace-nowrap',
                toneClasses[tone].text,
                className,
            )}
        >
            <StatusDot tone={tone} className="size-1.5" />
            {label}
        </span>
    );
}
