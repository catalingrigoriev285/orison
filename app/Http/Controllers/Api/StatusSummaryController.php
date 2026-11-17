<?php

namespace App\Http\Controllers\Api;

use App\Enums\ComponentStatus;
use App\Enums\MaintenanceStatus;
use App\Http\Controllers\Controller;
use App\Models\Component;
use App\Models\Incident;
use App\Models\Maintenance;
use Illuminate\Http\JsonResponse;

class StatusSummaryController extends Controller
{
    /**
     * Machine-readable summary so the main platform can show a downtime banner.
     * Text is returned as {ro, ru, en} maps.
     */
    public function __invoke(): JsonResponse
    {
        $components = Component::query()->where('is_visible', true)->orderBy('sort_order')->get();

        return response()->json([
            'status' => ComponentStatus::worstOf($components->pluck('status'))->value,
            'page_url' => route('home'),
            'components' => $components->map(fn (Component $component) => [
                'slug' => $component->slug,
                'name' => $component->name,
                'status' => $component->status->value,
            ])->all(),
            'incidents' => Incident::query()->unresolved()->with('latestUpdate')->latest('started_at')->get()
                ->map(fn (Incident $incident) => [
                    'id' => $incident->id,
                    'title' => $incident->title,
                    'impact' => $incident->impact->value,
                    'status' => $incident->status->value,
                    'started_at' => $incident->started_at->toIso8601String(),
                    'latest_message' => $incident->latestUpdate?->message,
                    'url' => route('status.incident', $incident),
                ])->all(),
            'maintenances' => Maintenance::query()->where('status', '!=', MaintenanceStatus::Completed)->orderBy('scheduled_start')->get()
                ->map(fn (Maintenance $maintenance) => [
                    'id' => $maintenance->id,
                    'title' => $maintenance->title,
                    'status' => $maintenance->status->value,
                    'scheduled_start' => $maintenance->scheduled_start->toIso8601String(),
                    'scheduled_end' => $maintenance->scheduled_end->toIso8601String(),
                ])->all(),
            'generated_at' => now()->toIso8601String(),
        ])->header('Cache-Control', 'public, max-age=30');
    }
}
