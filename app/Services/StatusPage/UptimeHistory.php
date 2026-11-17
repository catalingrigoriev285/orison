<?php

namespace App\Services\StatusPage;

use App\Enums\ComponentStatus;
use App\Models\Component;
use App\Models\ComponentDailyStat;
use App\Models\Incident;
use App\Services\Stats\DailyStatsCalculator;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

class UptimeHistory
{
    public function __construct(private DailyStatsCalculator $calculator) {}

    /**
     * Day-by-day history for the uptime bars, oldest day first. Past days come
     * from the nightly aggregate; today is computed live (cached for a minute).
     *
     * @param  EloquentCollection<int, Component>  $components
     * @return array<int, array{uptime: float|null, days: array<int, array{date: string, status: string|null, uptime: float|null, downtime_minutes: int, incidents: array<int, array{id: int, title: string|null}>}>}>
     */
    public function forComponents(EloquentCollection $components): array
    {
        $days = (int) config('status.history_days');
        $today = CarbonImmutable::now(config('status.timezone'))->startOfDay();
        $from = $today->subDays($days - 1);

        $stats = ComponentDailyStat::query()
            ->whereIn('component_id', $components->modelKeys())
            ->where('date', '>=', $from->toDateString())
            ->get()
            ->groupBy('component_id')
            ->map(fn (Collection $rows) => $rows->keyBy(fn (ComponentDailyStat $row) => $row->date->toDateString()));

        $incidents = Incident::query()
            ->with('components:id')
            ->where(fn ($query) => $query->whereNull('resolved_at')->orWhere('resolved_at', '>=', $from->utc()))
            ->get();

        return $components->mapWithKeys(function (Component $component) use ($days, $from, $today, $stats, $incidents) {
            $componentIncidents = $incidents->filter(
                fn (Incident $incident) => $incident->components->contains('id', $component->id),
            );

            $history = collect(range(0, $days - 1))->map(function (int $offset) use ($component, $from, $today, $stats, $componentIncidents) {
                $day = $from->addDays($offset);
                $date = $day->toDateString();
                $dayEnd = $day->endOfDay();

                $stat = $day->equalTo($today)
                    ? $this->today($component, $today)
                    : $stats->get($component->id)?->get($date)?->only(['uptime_percent', 'downtime_minutes', 'worst_status']);

                return [
                    'date' => $date,
                    'status' => $stat ? $stat['worst_status']->value : null,
                    'uptime' => $stat['uptime_percent'] ?? null,
                    'downtime_minutes' => $stat['downtime_minutes'] ?? 0,
                    'incidents' => $componentIncidents
                        ->filter(fn (Incident $incident) => $incident->started_at->lte($dayEnd)
                            && ($incident->resolved_at === null || $incident->resolved_at->gte($day)))
                        ->map(fn (Incident $incident) => ['id' => $incident->id, 'title' => $incident->translate('title')])
                        ->values()
                        ->all(),
                ];
            });

            $measured = $history->pluck('uptime')->filter(fn (?float $uptime) => $uptime !== null);

            return [$component->id => [
                'uptime' => $measured->isEmpty() ? null : round((float) $measured->avg(), 2),
                'days' => $history->all(),
            ]];
        })->all();
    }

    /**
     * @return array{uptime_percent: float|null, downtime_minutes: int, worst_status: ComponentStatus}
     */
    private function today(Component $component, CarbonImmutable $today): array
    {
        return Cache::remember(
            "status:component:{$component->id}:today:{$today->toDateString()}",
            60,
            fn () => $this->calculator->calculate($component, $today),
        );
    }
}
