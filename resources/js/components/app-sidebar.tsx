import { Link } from '@inertiajs/react';
import {
    Activity,
    BellRing,
    Boxes,
    CalendarClock,
    ExternalLink,
    LayoutGrid,
    SlidersHorizontal,
    TriangleAlert,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { useTrans } from '@/hooks/use-trans';
import { overview } from '@/routes/admin';
import alerts from '@/routes/admin/alerts';
import settings from '@/routes/admin/settings';
import components from '@/routes/admin/components';
import incidents from '@/routes/admin/incidents';
import maintenances from '@/routes/admin/maintenances';
import monitors from '@/routes/admin/monitors';
import { home as statusPage } from '@/routes';
import type { NavItem } from '@/types';

export function AppSidebar() {
    const { t } = useTrans();
    const { isCurrentUrl, isCurrentOrParentUrl } = useCurrentUrl();

    const section = (href: NavItem['href']) => isCurrentOrParentUrl(href);

    const mainNavItems: NavItem[] = [
        {
            title: t('Overview'),
            href: overview(),
            icon: LayoutGrid,
            isActive: isCurrentUrl(overview()),
        },
        {
            title: t('Monitors'),
            href: monitors.index(),
            icon: Activity,
            isActive: section(monitors.index()),
        },
        {
            title: t('Components'),
            href: components.index(),
            icon: Boxes,
            isActive: section(components.index()),
        },
        {
            title: t('Incidents'),
            href: incidents.index(),
            icon: TriangleAlert,
            isActive: section(incidents.index()),
        },
        {
            title: t('Maintenance'),
            href: maintenances.index(),
            icon: CalendarClock,
            isActive: section(maintenances.index()),
        },
        {
            title: t('Alerts'),
            href: alerts.index(),
            icon: BellRing,
            isActive: section(alerts.index()),
        },
        {
            title: t('Settings'),
            href: settings.edit(),
            icon: SlidersHorizontal,
            isActive: section(settings.edit()),
        },
    ];

    const footerNavItems: NavItem[] = [
        {
            title: t('View status page'),
            href: statusPage(),
            icon: ExternalLink,
        },
    ];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={overview()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} label={t('Monitoring')} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
