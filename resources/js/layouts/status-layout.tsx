import { Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { BrandMark } from '@/components/brand-mark';
import { LanguageSwitcher } from '@/components/status/language-switcher';
import { StatusScene } from '@/components/status/scenes';
import { ThemeToggle } from '@/components/theme-toggle';
import { useTrans } from '@/hooks/use-trans';
import { cn } from '@/lib/utils';
import { home } from '@/routes';
import { history } from '@/routes/status';
import type { ComponentStatus } from '@/types';

export default function StatusLayout({ children }: { children: ReactNode }) {
    const { t } = useTrans();
    const { props, component } = usePage();
    const { brand } = props;
    const overall = props.overall as ComponentStatus | undefined;
    const scene = component === 'status/index' && overall ? brand.scene : null;

    return (
        <div className="flex min-h-svh flex-col bg-background">
            <header className="border-b border-hairline bg-card">
                <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-4 px-4 sm:px-6">
                    <Link
                        href={home()}
                        className="flex min-w-0 items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <BrandMark />
                        <span className="truncate text-[15px] font-semibold tracking-tight">
                            {brand.name}
                            <span className="ml-1.5 font-normal text-muted-foreground">
                                {t('Status')}
                            </span>
                        </span>
                    </Link>
                    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                        <LanguageSwitcher />
                        <ThemeToggle />
                    </div>
                </div>
            </header>

            {scene && overall && (
                <div className="h-[clamp(180px,24vw,340px)] overflow-hidden">
                    <StatusScene scene={scene} status={overall} />
                </div>
            )}

            <main
                className={cn(
                    'mx-auto w-full max-w-3xl flex-1 px-4 pb-16 sm:px-6',
                    !scene && 'pt-8 sm:pt-12',
                )}
            >
                {children}
            </main>

            <footer className="border-t border-hairline">
                <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-2 px-4 py-6 text-[13px] text-muted-foreground sm:flex-row sm:px-6">
                    <span>
                        © {new Date().getFullYear()} {brand.name}
                    </span>
                    <nav className="flex items-center gap-5">
                        <Link
                            href={history()}
                            className="hover:text-foreground"
                        >
                            {t('Incident history')}
                        </Link>
                        {brand.website_url && (
                            <a
                                href={brand.website_url}
                                className="hover:text-foreground"
                            >
                                {brand.website_url
                                    .replace(/^https?:\/\//, '')
                                    .replace(/\/$/, '')}
                            </a>
                        )}
                        {brand.name !== 'Orison' && (
                            <span>{t('Powered by Orison')}</span>
                        )}
                    </nav>
                </div>
            </footer>
        </div>
    );
}
