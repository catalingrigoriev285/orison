import { usePage } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';
import { cn } from '@/lib/utils';

/**
 * The brand icon: the logo uploaded in Admin → Settings, or the default
 * Orison mark (white on the accent colour).
 */
export function BrandMark({ className }: { className?: string }) {
    const { brand } = usePage().props;

    if (brand.logo_url) {
        return (
            <img
                src={brand.logo_url}
                alt=""
                className={cn(
                    'inline-block size-7 shrink-0 rounded-[8px] object-contain',
                    className,
                )}
            />
        );
    }

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
