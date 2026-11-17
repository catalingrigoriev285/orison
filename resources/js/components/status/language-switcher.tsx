import { Link, usePage } from '@inertiajs/react';
import { Check, ChevronDown } from 'lucide-react';
import { Flag } from '@/components/status/flag';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTrans } from '@/hooks/use-trans';
import { cn } from '@/lib/utils';
import type { Locale } from '@/types';

/** Each language is named in itself, so people can find their own. */
const languageNames: Record<Locale, string> = {
    ro: 'Română',
    ru: 'Русский',
    en: 'English',
};

export function LanguageSwitcher({ className }: { className?: string }) {
    const { t, locale, locales } = useTrans();
    const { url } = usePage();
    const path = url.split('?')[0];

    return (
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger
                aria-label={t('Language')}
                className={cn(
                    'inline-flex h-8 shrink-0 items-center gap-2 rounded-full bg-secondary pr-2.5 pl-2 text-[13px] font-medium text-foreground transition-colors duration-200 outline-none hover:bg-[#dedee3] focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-[#dedee3] dark:hover:bg-[#3a3a3c] dark:data-[state=open]:bg-[#3a3a3c]',
                    className,
                )}
            >
                <Flag locale={locale} />
                <span className="uppercase">{locale}</span>
                <ChevronDown className="size-3.5 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                sideOffset={6}
                className="min-w-44 rounded-[14px] border-hairline p-1 shadow-[0_10px_30px_rgba(0,0,0,0.12)]"
            >
                {locales.map((code) => (
                    <DropdownMenuItem
                        key={code}
                        asChild
                        className="cursor-pointer gap-2.5 rounded-[9px] px-2.5 py-2 text-[14px]"
                    >
                        <Link
                            href={`${path}?lang=${code}`}
                            preserveScroll
                            lang={code}
                            aria-current={code === locale ? 'true' : undefined}
                        >
                            <Flag locale={code} />
                            <span className="flex-1">
                                {languageNames[code]}
                            </span>
                            {code === locale && (
                                <Check className="size-4 text-primary" />
                            )}
                        </Link>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
