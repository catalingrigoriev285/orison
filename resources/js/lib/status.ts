import type {
    ComponentStatus,
    IncidentImpact,
    IncidentStatus,
    MaintenanceStatus,
    MonitorState,
} from '@/types';

type Tone =
    | 'operational'
    | 'degraded'
    | 'partial'
    | 'major'
    | 'maintenance'
    | 'empty';

export const toneClasses: Record<
    Tone,
    { bg: string; text: string; border: string }
> = {
    operational: {
        bg: 'bg-status-operational',
        text: 'text-status-operational',
        border: 'border-status-operational',
    },
    degraded: {
        bg: 'bg-status-degraded',
        text: 'text-[#b25000] dark:text-status-degraded',
        border: 'border-status-degraded',
    },
    partial: {
        bg: 'bg-status-partial',
        text: 'text-[#c93400] dark:text-status-partial',
        border: 'border-status-partial',
    },
    major: {
        bg: 'bg-status-major',
        text: 'text-[#d70015] dark:text-status-major',
        border: 'border-status-major',
    },
    maintenance: {
        bg: 'bg-status-maintenance',
        text: 'text-[#0066cc] dark:text-status-maintenance',
        border: 'border-status-maintenance',
    },
    empty: {
        bg: 'bg-status-empty',
        text: 'text-muted-foreground',
        border: 'border-status-empty',
    },
};

export const componentStatusTone: Record<ComponentStatus, Tone> = {
    operational: 'operational',
    degraded_performance: 'degraded',
    partial_outage: 'partial',
    major_outage: 'major',
    under_maintenance: 'maintenance',
};

/** English source strings, translated with t(). */
export const componentStatusLabel: Record<ComponentStatus, string> = {
    operational: 'Operational',
    degraded_performance: 'Degraded performance',
    partial_outage: 'Partial outage',
    major_outage: 'Major outage',
    under_maintenance: 'Under maintenance',
};

export const overallStatusTitle: Record<ComponentStatus, string> = {
    operational: 'All systems operational',
    degraded_performance: 'Some systems are running slowly',
    partial_outage: 'Partial system outage',
    major_outage: 'Major system outage',
    under_maintenance: 'Scheduled maintenance in progress',
};

export const incidentImpactTone: Record<IncidentImpact, Tone> = {
    none: 'empty',
    minor: 'degraded',
    major: 'partial',
    critical: 'major',
};

export const incidentImpactLabel: Record<IncidentImpact, string> = {
    none: 'No impact',
    minor: 'Minor',
    major: 'Major',
    critical: 'Critical',
};

export const incidentStatusLabel: Record<IncidentStatus, string> = {
    investigating: 'Investigating',
    identified: 'Identified',
    monitoring: 'Monitoring',
    resolved: 'Resolved',
};

export const maintenanceStatusLabel: Record<MaintenanceStatus, string> = {
    scheduled: 'Scheduled',
    in_progress: 'In progress',
    completed: 'Completed',
};

export const monitorStateTone: Record<MonitorState, Tone> = {
    up: 'operational',
    down: 'major',
    pending: 'degraded',
    paused: 'empty',
};

export const monitorStateLabel: Record<MonitorState, string> = {
    up: 'Up',
    down: 'Down',
    pending: 'Pending',
    paused: 'Paused',
};

export const componentStatuses = Object.keys(
    componentStatusLabel,
) as ComponentStatus[];
export const incidentStatuses = Object.keys(
    incidentStatusLabel,
) as IncidentStatus[];
export const incidentImpacts = Object.keys(
    incidentImpactLabel,
) as IncidentImpact[];

export type { Tone };
