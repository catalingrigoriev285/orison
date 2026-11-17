<?php

use App\Enums\ComponentStatus;
use App\Jobs\AggregateDailyStats;
use App\Models\Component;
use App\Models\ComponentDailyStat;
use App\Models\Incident;
use App\Models\Monitor;
use Carbon\CarbonImmutable;

test('daily stats compute uptime, downtime and the worst status of the day', function () {
    $timezone = config('status.timezone');
    $day = CarbonImmutable::now($timezone)->subDay()->setTime(10, 0);
    $component = Component::factory()->create();
    $monitor = Monitor::factory()->for($component)->create(['interval_seconds' => 60]);

    foreach (range(1, 96) as $minute) {
        $monitor->checks()->create(['is_up' => true, 'checked_at' => $day->addMinutes($minute)]);
    }
    foreach (range(1, 4) as $minute) {
        $monitor->checks()->create(['is_up' => false, 'checked_at' => $day->subMinutes($minute)]);
    }

    $incident = Incident::factory()->resolved()->create(['started_at' => $day, 'resolved_at' => $day->addHour()]);
    $incident->components()->attach($component, ['component_status' => ComponentStatus::DegradedPerformance->value]);

    AggregateDailyStats::dispatchSync($day->toDateString());

    $stat = ComponentDailyStat::sole();
    expect($stat->date->toDateString())->toBe($day->toDateString())
        ->and($stat->uptime_percent)->toBe(96.0)
        ->and($stat->downtime_minutes)->toBe(4)
        ->and($stat->worst_status)->toBe(ComponentStatus::PartialOutage);
});

test('a day without checks has no uptime value', function () {
    $component = Component::factory()->create();

    AggregateDailyStats::dispatchSync(now()->subDay()->toDateString());

    expect(ComponentDailyStat::sole())
        ->component_id->toBe($component->id)
        ->uptime_percent->toBeNull()
        ->worst_status->toBe(ComponentStatus::Operational);
});
