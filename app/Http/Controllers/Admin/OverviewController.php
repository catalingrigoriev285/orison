<?php

namespace App\Http\Controllers\Admin;

use App\Enums\MonitorState;
use App\Http\Controllers\Controller;
use App\Models\AlertDelivery;
use App\Models\Incident;
use App\Models\Monitor;
use App\Models\MonitorCheck;
use Inertia\Inertia;
use Inertia\Response;

class OverviewController extends Controller
{
    public function __invoke(): Response
    {
        $monitors = Monitor::query()->with('component')->orderBy('name')->get();

        $checks30d = MonitorCheck::query()->where('checked_at', '>=', now()->subDays(30));
        $total30d = (clone $checks30d)->count();
        $up30d = $checks30d->where('is_up', true)->count();

        return Inertia::render('admin/overview', [
            'stats' => [
                'monitors' => $monitors->count(),
                'up' => $monitors->where('state', MonitorState::Up)->count(),
                'down' => $monitors->where('state', MonitorState::Down)->count(),
                'paused' => $monitors->where('is_active', false)->count(),
                'uptime30d' => $total30d > 0 ? round($up30d / $total30d * 100, 3) : null,
                'avgResponse24h' => ($average = MonitorCheck::query()
                    ->where('checked_at', '>=', now()->subDay())
                    ->where('is_up', true)
                    ->avg('response_time_ms')) !== null ? (int) round((float) $average) : null,
                'openIncidents' => Incident::query()->unresolved()->count(),
            ],
            'monitors' => $monitors->map(fn (Monitor $monitor) => [
                ...MonitorController::summary($monitor),
                'uptime24h' => $monitor->uptimeSince(now()->subDay()),
                'sparkline' => $monitor->checks()
                    ->latest('checked_at')
                    ->limit(40)
                    ->get(['response_time_ms', 'is_up'])
                    ->reverse()
                    ->map(fn (MonitorCheck $check) => ['ms' => $check->response_time_ms, 'up' => $check->is_up])
                    ->values()
                    ->all(),
            ])->all(),
            'openIncidents' => Incident::query()->unresolved()->latest('started_at')->get()
                ->map(fn (Incident $incident) => [
                    'id' => $incident->id,
                    'title' => $incident->translate('title'),
                    'impact' => $incident->impact->value,
                    'status' => $incident->status->value,
                    'started_at' => $incident->started_at->toIso8601String(),
                ])->all(),
            'recentAlerts' => AlertDelivery::query()->latest()->limit(8)->get()
                ->map(fn (AlertDelivery $delivery) => AlertController::summary($delivery))
                ->all(),
        ]);
    }
}
