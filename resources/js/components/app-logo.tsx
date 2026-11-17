import { usePage } from '@inertiajs/react';
import { BrandMark } from '@/components/brand-mark';
import { useTrans } from '@/hooks/use-trans';

export default function AppLogo() {
    const { t } = useTrans();
    const { brand } = usePage().props;

    return (
        <>
            <BrandMark className="size-8 rounded-[9px]" />
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="truncate leading-tight font-semibold">
                    {brand.name}
                </span>
                <span className="truncate text-[11px] text-muted-foreground">
                    {t('Status admin')}
                </span>
            </div>
        </>
    );
}
