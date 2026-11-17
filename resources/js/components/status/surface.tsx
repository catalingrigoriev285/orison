import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Solid white (or dark grey) rounded surface with a hairline border.
 */
export function Surface({
    children,
    className,
    as: Element = 'section',
}: {
    children: ReactNode;
    className?: string;
    as?: 'section' | 'div' | 'article';
}) {
    return (
        <Element
            className={cn(
                'rounded-[18px] border border-hairline bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
                className,
            )}
        >
            {children}
        </Element>
    );
}

export function SectionTitle({
    children,
    action,
}: {
    children: ReactNode;
    action?: ReactNode;
}) {
    return (
        <div className="mb-3 flex items-end justify-between gap-4 px-1">
            <h2 className="text-[20px] font-semibold tracking-tight">
                {children}
            </h2>
            {action}
        </div>
    );
}
