export type Locale = 'ro' | 'ru' | 'en';

export type Translations = Partial<Record<Locale, string | null>>;

export type ComponentStatus =
    | 'operational'
    | 'degraded_performance'
    | 'partial_outage'
    | 'major_outage'
    | 'under_maintenance';

export type IncidentStatus =
    | 'investigating'
    | 'identified'
    | 'monitoring'
    | 'resolved';

export type IncidentImpact = 'none' | 'minor' | 'major' | 'critical';

export type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed';

export type MonitorType = 'http' | 'keyword' | 'tcp' | 'heartbeat';

export type MonitorState = 'pending' | 'up' | 'down' | 'paused';

export type UptimeDay = {
    date: string;
    status: ComponentStatus | null;
    uptime: number | null;
    downtime_minutes: number;
    incidents: { id: number; title: string | null }[];
};

export type PublicComponent = {
    id: number;
    name: string;
    description: string | null;
    status: ComponentStatus;
    uptime: number | null;
    days: UptimeDay[];
};

export type PublicComponentGroup = {
    id: number | null;
    name: string | null;
    components: PublicComponent[];
};

export type PublicIncidentUpdate = {
    id: number;
    status: IncidentStatus;
    message: string | null;
    created_at: string;
};

export type PublicIncident = {
    id: number;
    title: string;
    impact: IncidentImpact;
    status: IncidentStatus;
    started_at: string;
    resolved_at: string | null;
    components?: { id: number; name: string; status: ComponentStatus }[];
    updates?: PublicIncidentUpdate[];
};

export type PublicMaintenance = {
    id: number;
    title: string;
    description: string | null;
    status: MaintenanceStatus;
    scheduled_start: string;
    scheduled_end: string;
    components?: { id: number; name: string }[];
};

export type Paginated<T> = {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    meta?: {
        current_page: number;
        last_page: number;
        total: number;
        links: { url: string | null; label: string; active: boolean }[];
    };
    current_page?: number;
    last_page?: number;
    next_page_url?: string | null;
    prev_page_url?: string | null;
};

export type MonitorSummary = {
    id: number;
    name: string;
    type: MonitorType;
    target: string;
    state: MonitorState;
    is_active: boolean;
    component: { id: number; name: string } | null;
    last_checked_at: string | null;
    last_response_ms: number | null;
};

export type AlertSummary = {
    id: number;
    event: string;
    state: 'delivered' | 'failed' | 'pending';
    created_at: string;
    delivered_at: string | null;
};

export type Option = { id: number; name: string };
