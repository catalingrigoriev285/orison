<?php

namespace App\Actions\Components;

use App\Enums\ComponentStatus;
use App\Enums\MonitorState;
use App\Models\Component;
use App\Models\Monitor;

class RefreshComponentStatus
{
    /**
     * Recalculate and persist the public status of a component.
     *
     * A manual override always wins. Otherwise the status is the worst of:
     * monitor health, an active maintenance window and open incidents.
     */
    public function handle(Component $component): ComponentStatus
    {
        $status = $component->status_override ?? ComponentStatus::worstOf(array_filter([
            $this->statusFromMonitors($component),
            $component->isUnderMaintenance() ? ComponentStatus::UnderMaintenance : null,
            $component->openIncidentStatus(),
        ]));

        if ($component->status !== $status) {
            $component->forceFill(['status' => $status])->save();
        }

        return $status;
    }

    public function handleAll(): void
    {
        Component::query()->each(fn (Component $component) => $this->handle($component));
    }

    private function statusFromMonitors(Component $component): ComponentStatus
    {
        $monitors = $component->monitors()
            ->where('is_active', true)
            ->whereIn('state', [MonitorState::Up, MonitorState::Down])
            ->get();

        if ($monitors->isEmpty()) {
            return ComponentStatus::Operational;
        }

        $downCount = $monitors->where('state', MonitorState::Down)->count();

        if ($downCount === $monitors->count()) {
            return ComponentStatus::MajorOutage;
        }

        if ($downCount > 0) {
            return ComponentStatus::PartialOutage;
        }

        if ($monitors->contains(fn (Monitor $monitor) => $this->isSlow($monitor))) {
            return ComponentStatus::DegradedPerformance;
        }

        return ComponentStatus::Operational;
    }

    private function isSlow(Monitor $monitor): bool
    {
        if ($monitor->last_response_ms === null || $monitor->last_response_ms < config('status.degraded_response_min_ms')) {
            return false;
        }

        $average = $monitor->checks()
            ->where('is_up', true)
            ->where('checked_at', '>=', now()->subDay())
            ->avg('response_time_ms');

        return $average !== null
            && $monitor->last_response_ms > (float) $average * config('status.degraded_response_multiplier');
    }
}
