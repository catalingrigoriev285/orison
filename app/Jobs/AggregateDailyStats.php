<?php

namespace App\Jobs;

use App\Models\Component;
use App\Models\ComponentDailyStat;
use App\Services\Stats\DailyStatsCalculator;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class AggregateDailyStats implements ShouldQueue
{
    use Queueable;

    /**
     * @param  string|null  $date  Local date (Y-m-d) to aggregate; defaults to yesterday.
     */
    public function __construct(public ?string $date = null) {}

    public function handle(DailyStatsCalculator $calculator): void
    {
        $timezone = config('status.timezone');
        $day = $this->date
            ? CarbonImmutable::parse($this->date, $timezone)
            : CarbonImmutable::now($timezone)->subDay();

        Component::query()->each(function (Component $component) use ($calculator, $day) {
            ComponentDailyStat::updateOrCreate(
                ['component_id' => $component->id, 'date' => $day->toDateString()],
                $calculator->calculate($component, $day),
            );
        });
    }
}
