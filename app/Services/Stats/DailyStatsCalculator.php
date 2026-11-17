<?php

namespace App\Services\Stats;

use App\Enums\ComponentStatus;
use App\Models\Component;
use App\Models\Incident;
use App\Models\Maintenance;
use App\Models\Monitor;
use App\Models\MonitorCheck;
use Carbon\CarbonImmutable;

class DailyStatsCalculator
{
    /**
     * Compute uptime and the worst status of a component for one local day.
     *
     * @return array{uptime_percent: float|null, downtime_minutes: int, worst_status: ComponentStatus}
     */
    public function calculate(Component $component, CarbonImmutable $day): array
    {
        $start = $day->setTimezone(config('status.timezone'))->startOfDay();
        $end = $start->endOfDay();

        [$uptime, $downtimeMinutes] = $this->uptime($component, $start, $end);

        $statuses = Incident::query()
            ->join('component_incident', 'component_incident.incident_id', '=', 'incidents.id')
            ->where('component_incident.component_id', $component->id)
            ->where('incidents.started_at', '<=', $end->utc())
            ->where(fn ($query) => $query->whereNull('incidents.resolved_at')->orWhere('incidents.resolved_at', '>=', $start->utc()))
            ->pluck('component_incident.component_status')
            ->map(fn (string $status) => ComponentStatus::from($status))
            ->push($this->statusFromUptime($uptime, $downtimeMinutes));

        $hadMaintenance = Maintenance::query()
            ->whereHas('components', fn ($query) => $query->whereKey($component->id))
            ->where('scheduled_start', '<=', $end->utc())
            ->where('scheduled_end', '>=', $start->utc())
            ->exists();

        if ($hadMaintenance) {
            $statuses->push(ComponentStatus::UnderMaintenance);
        }

        return [
            'uptime_percent' => $uptime,
            'downtime_minutes' => $downtimeMinutes,
            'worst_status' => ComponentStatus::worstOf($statuses),
        ];
    }

    /**
     * @return array{0: float|null, 1: int}
     */
    private function uptime(Component $component, CarbonImmutable $start, CarbonImmutable $end): array
    {
        $monitors = $component->monitors()->get(['id', 'interval_seconds'])->keyBy('id');

        if ($monitors->isEmpty()) {
            return [null, 0];
        }

        $rows = MonitorCheck::query()
            ->whereIn('monitor_id', $monitors->keys())
            ->whereBetween('checked_at', [$start->utc(), $end->utc()])
            ->groupBy('monitor_id')
            ->selectRaw('monitor_id, count(*) as total, sum(case when is_up then 1 else 0 end) as up')
            ->get();

        $total = (int) $rows->sum('total');

        if ($total === 0) {
            return [null, 0];
        }

        $downtimeSeconds = $rows->sum(function (MonitorCheck $row) use ($monitors) {
            /** @var Monitor $monitor */
            $monitor = $monitors->get($row->monitor_id);

            return ((int) $row->getAttribute('total') - (int) $row->getAttribute('up')) * $monitor->interval_seconds;
        });

        $uptime = round((int) $rows->sum('up') / $total * 100, 3);

        return [$uptime, (int) round($downtimeSeconds / 60 / $monitors->count())];
    }

    private function statusFromUptime(?float $uptime, int $downtimeMinutes): ComponentStatus
    {
        return match (true) {
            $uptime === null, $downtimeMinutes === 0 => ComponentStatus::Operational,
            $uptime >= 99 => ComponentStatus::DegradedPerformance,
            $uptime >= 95 => ComponentStatus::PartialOutage,
            default => ComponentStatus::MajorOutage,
        };
    }
}
