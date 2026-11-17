import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTrans } from '@/hooks/use-trans';
import type { Paginated } from '@/types';

export function Pagination<T>({ page }: { page: Paginated<T> }) {
    const { t } = useTrans();

    if (!page.last_page || page.last_page <= 1) {
        return null;
    }

    return (
        <nav className="mt-6 flex items-center justify-between">
            <Button
                variant="secondary"
                size="sm"
                disabled={!page.prev_page_url}
                asChild={!!page.prev_page_url}
            >
                {page.prev_page_url ? (
                    <Link href={page.prev_page_url} preserveScroll>
                        <ChevronLeft /> {t('Previous')}
                    </Link>
                ) : (
                    <span>
                        <ChevronLeft /> {t('Previous')}
                    </span>
                )}
            </Button>
            <span className="text-[13px] text-muted-foreground">
                {t('Page :current of :last', {
                    current: page.current_page ?? 1,
                    last: page.last_page,
                })}
            </span>
            <Button
                variant="secondary"
                size="sm"
                disabled={!page.next_page_url}
                asChild={!!page.next_page_url}
            >
                {page.next_page_url ? (
                    <Link href={page.next_page_url} preserveScroll>
                        {t('Next')} <ChevronRight />
                    </Link>
                ) : (
                    <span>
                        {t('Next')} <ChevronRight />
                    </span>
                )}
            </Button>
        </nav>
    );
}
