import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';

export type SegmentedItem = {
    value: string;
    label: string;
    href?: string;
};

/**
 * iOS-style segmented control. Items with an href navigate (preserving
 * scroll); otherwise onChange is called.
 */
export function SegmentedControl({
    items,
    value,
    onChange,
    size = 'md',
    className,
    ariaLabel,
}: {
    items: SegmentedItem[];
    value: string;
    onChange?: (value: string) => void;
    size?: 'sm' | 'md';
    className?: string;
    ariaLabel?: string;
}) {
    return (
        <div
            role="tablist"
            aria-label={ariaLabel}
            className={cn(
                'inline-flex items-center rounded-full bg-secondary p-0.5',
                className,
            )}
        >
            {items.map((item) => {
                const isActive = item.value === value;
                const classes = cn(
                    'rounded-full font-medium transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    size === 'sm'
                        ? 'px-2.5 py-0.5 text-[12px]'
                        : 'px-3.5 py-1 text-[13px]',
                    isActive
                        ? 'bg-card text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.12)]'
                        : 'text-muted-foreground hover:text-foreground',
                );

                return item.href ? (
                    <Link
                        key={item.value}
                        href={item.href}
                        role="tab"
                        aria-selected={isActive}
                        preserveScroll
                        className={classes}
                    >
                        {item.label}
                    </Link>
                ) : (
                    <button
                        key={item.value}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => onChange?.(item.value)}
                        className={classes}
                    >
                        {item.label}
                    </button>
                );
            })}
        </div>
    );
}
