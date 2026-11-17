import { setLayoutProps } from '@inertiajs/react';
import { useEffect } from 'react';
import type { BreadcrumbItem } from '@/types';

/**
 * Set the (translated) breadcrumbs shown in the admin header.
 */
export function useBreadcrumbs(breadcrumbs: BreadcrumbItem[]): void {
    const key = JSON.stringify(breadcrumbs);

    useEffect(() => {
        setLayoutProps({ breadcrumbs: JSON.parse(key) as BreadcrumbItem[] });
    }, [key]);
}
