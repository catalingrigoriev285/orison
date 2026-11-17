import { cn } from '@/lib/utils';
import { toneClasses } from '@/lib/status';
import type { Tone } from '@/lib/status';

export function StatusDot({
    tone,
    pulse = false,
    className,
}: {
    tone: Tone;
    pulse?: boolean;
    className?: string;
}) {
    return (
        <span
            className={cn('relative inline-flex size-2.5 shrink-0', className)}
        >
            {pulse && (
                <span
                    className={cn(
                        'absolute inset-0 animate-ping rounded-full opacity-60',
                        toneClasses[tone].bg,
                    )}
                />
            )}
            <span
                className={cn(
                    'relative inline-flex size-full rounded-full',
                    toneClasses[tone].bg,
                )}
            />
        </span>
    );
}
