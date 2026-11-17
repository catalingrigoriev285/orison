import AppLogoIcon from '@/components/app-logo-icon';
import { cn } from '@/lib/utils';

/**
 * The Orison app icon: white mark on a solid blue rounded square.
 */
export function BrandMark({ className }: { className?: string }) {
    return (
        <span
            className={cn(
                'inline-flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-primary text-white',
                className,
            )}
        >
            <AppLogoIcon className="size-[70%]" />
        </span>
    );
}
