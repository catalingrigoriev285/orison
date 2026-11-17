<?php

namespace App\Services\Alerts;

use App\Models\Component;
use App\Models\Incident;
use App\Models\Maintenance;
use App\Models\Monitor;
use App\Services\Monitoring\CheckResult;

/**
 * Builds the JSON bodies sent to the alert webhook. Translatable text is sent
 * as full {ro, ru, en} maps so the receiver can notify in each user's language.
 */
class AlertPayloads
{
    /**
     * @return array<string, mixed>
     */
    public static function monitor(Monitor $monitor, ?CheckResult $result = null, ?int $downtimeSeconds = null): array
    {
        return [
            'monitor' => [
                'id' => $monitor->id,
                'name' => $monitor->name,
                'type' => $monitor->type->value,
                'target' => $monitor->target(),
                'state' => $monitor->state->value,
            ],
            'component' => $monitor->component ? self::component($monitor->component) : null,
            'check' => $result ? [
                'status_code' => $result->statusCode,
                'response_time_ms' => $result->responseTimeMs,
                'error' => $result->error,
            ] : null,
            'downtime_seconds' => $downtimeSeconds,
            'url' => route('admin.monitors.show', $monitor),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function incident(Incident $incident): array
    {
        $incident->loadMissing(['components', 'latestUpdate']);

        return [
            'incident' => [
                'id' => $incident->id,
                'title' => $incident->title,
                'impact' => $incident->impact->value,
                'status' => $incident->status->value,
                'is_automatic' => $incident->is_automatic,
                'started_at' => $incident->started_at->toIso8601String(),
                'resolved_at' => $incident->resolved_at?->toIso8601String(),
                'latest_update' => $incident->latestUpdate ? [
                    'status' => $incident->latestUpdate->status->value,
                    'message' => $incident->latestUpdate->message,
                    'created_at' => $incident->latestUpdate->created_at?->toIso8601String(),
                ] : null,
                'components' => $incident->components->map(fn (Component $component) => self::component($component))->all(),
            ],
            'url' => route('status.incident', $incident),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function maintenance(Maintenance $maintenance): array
    {
        $maintenance->loadMissing('components');

        return [
            'maintenance' => [
                'id' => $maintenance->id,
                'title' => $maintenance->title,
                'description' => $maintenance->description,
                'status' => $maintenance->status->value,
                'scheduled_start' => $maintenance->scheduled_start->toIso8601String(),
                'scheduled_end' => $maintenance->scheduled_end->toIso8601String(),
                'components' => $maintenance->components->map(fn (Component $component) => self::component($component))->all(),
            ],
            'url' => route('home'),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private static function component(Component $component): array
    {
        return [
            'id' => $component->id,
            'slug' => $component->slug,
            'name' => $component->name,
            'status' => $component->status->value,
        ];
    }
}
