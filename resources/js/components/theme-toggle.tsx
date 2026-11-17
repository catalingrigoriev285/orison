import { Moon, Sun } from 'lucide-react';
import { useAppearance } from '@/hooks/use-appearance';
import { useTrans } from '@/hooks/use-trans';
import { cn } from '@/lib/utils';

/**
 * Switches between light and dark appearance. The choice is remembered.
 */
export function ThemeToggle({ className }: { className?: string }) {
    const { t } = useTrans();
    const { resolvedAppearance, updateAppearance } = useAppearance();
    const isDark = resolvedAppearance === 'dark';
    const label = isDark ? t('Switch to light mode') : t('Switch to dark mode');

    return (
        <button
            type="button"
            onClick={() => updateAppearance(isDark ? 'light' : 'dark')}
            aria-label={label}
            title={label}
            className={cn(
                'inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors duration-200 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
                className,
            )}
        >
            {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
    );
}
