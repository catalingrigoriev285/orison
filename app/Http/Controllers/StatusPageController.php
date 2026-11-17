<?php

namespace App\Http\Controllers;

use App\Enums\ComponentStatus;
use App\Enums\IncidentStatus;
use App\Enums\MaintenanceStatus;
use App\Http\Resources\IncidentResource;
use App\Http\Resources\MaintenanceResource;
use App\Models\Component;
use App\Models\ComponentGroup;
use App\Models\Incident;
use App\Models\Maintenance;
use App\Services\StatusPage\UptimeHistory;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StatusPageController extends Controller
{
    public function index(Request $request, UptimeHistory $uptimeHistory): Response
    {
        $components = Component::query()
            ->where('is_visible', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        $history = $uptimeHistory->forComponents($components);

        $groups = ComponentGroup::query()->orderBy('sort_order')->get();

        $componentGroups = $components
            ->groupBy(fn (Component $component) => $component->component_group_id ?? 0)
            ->sortBy(fn ($items, int $groupId) => $groups->firstWhere('id', $groupId)->sort_order ?? -1)
            ->map(fn ($items, int $groupId) => [
                'id' => $groupId ?: null,
                'name' => $groups->firstWhere('id', $groupId)?->translate('name'),
                'components' => $items->map(fn (Component $component) => [
                    'id' => $component->id,
                    'name' => $component->translate('name'),
                    'description' => $component->translate('description'),
                    'status' => $component->status->value,
                    ...$history[$component->id],
                ])->values()->all(),
            ])
            ->values()
            ->all();

        $activeIncidents = Incident::query()
            ->unresolved()
            ->with(['updates', 'components'])
            ->latest('started_at')
            ->get();

        $maintenances = Maintenance::query()
            ->where('status', '!=', MaintenanceStatus::Completed)
            ->with('components')
            ->orderBy('scheduled_start')
            ->get();

        return Inertia::render('status/index', [
            'overall' => ComponentStatus::worstOf($components->pluck('status'))->value,
            'groups' => $componentGroups,
            'activeIncidents' => IncidentResource::collection($activeIncidents)->resolve($request),
            'activeMaintenances' => MaintenanceResource::collection($maintenances->where('status', MaintenanceStatus::InProgress)->values())->resolve($request),
            'upcomingMaintenances' => MaintenanceResource::collection($maintenances->where('status', MaintenanceStatus::Scheduled)->values())->resolve($request),
            'pastDays' => $this->pastDays($request),
        ]);
    }

    public function incident(Request $request, Incident $incident): Response
    {
        $incident->load(['updates', 'components']);

        return Inertia::render('status/incident', [
            'incident' => IncidentResource::make($incident)->resolve($request),
        ]);
    }

    public function history(Request $request): Response
    {
        $incidents = Incident::query()
            ->where('status', IncidentStatus::Resolved)
            ->with(['updates', 'components'])
            ->latest('started_at')
            ->paginate(15);

        return Inertia::render('status/history', [
            'incidents' => IncidentResource::collection($incidents),
        ]);
    }

    /**
     * Resolved incidents of the last 14 days, one entry per day (newest first)
     * so empty days can say "no incidents reported".
     *
     * @return array<int, array{date: string, incidents: array<int, mixed>}>
     */
    private function pastDays(Request $request): array
    {
        $timezone = config('status.timezone');
        $today = CarbonImmutable::now($timezone)->startOfDay();
        $from = $today->subDays(13);

        $incidents = Incident::query()
            ->where('status', IncidentStatus::Resolved)
            ->where('started_at', '>=', $from->utc())
            ->with(['updates', 'components'])
            ->latest('started_at')
            ->get()
            ->groupBy(fn (Incident $incident) => $incident->started_at->setTimezone($timezone)->toDateString());

        return collect(range(0, 13))
            ->map(function (int $offset) use ($today, $incidents, $request) {
                $date = $today->subDays($offset)->toDateString();

                return [
                    'date' => $date,
                    'incidents' => IncidentResource::collection($incidents->get($date, collect()))->resolve($request),
                ];
            })
            ->all();
    }
}
