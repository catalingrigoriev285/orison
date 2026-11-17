<?php

namespace App\Enums;

enum AlertEvent: string
{
    case MonitorDown = 'monitor.down';
    case MonitorUp = 'monitor.up';
    case IncidentCreated = 'incident.created';
    case IncidentUpdated = 'incident.updated';
    case IncidentResolved = 'incident.resolved';
    case MaintenanceScheduled = 'maintenance.scheduled';
    case MaintenanceStarted = 'maintenance.started';
    case MaintenanceCompleted = 'maintenance.completed';
    case Test = 'test';
}
