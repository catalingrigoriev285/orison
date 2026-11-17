<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Components\RefreshComponentStatus;
use App\Enums\AlertEvent;
use App\Enums\MaintenanceStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\MaintenanceRequest;
use App\Models\Component;
use App\Models\Maintenance;
use App\Services\Alerts\AlertDispatcher;
use App\Services\Alerts\AlertPayloads;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class MaintenanceController extends Controller
{
    public function __construct(private RefreshComponentStatus $refreshComponentStatus) {}

    public function index(): Response
    {
        return Inertia::render('admin/maintenances/index', [
            'maintenances' => Maintenance::query()->with('components')->latest('scheduled_start')->limit(100)->get()
                ->map(fn (Maintenance $maintenance) => [
                    'id' => $maintenance->id,
                    'title' => $maintenance->translate('title'),
                    'status' => $maintenance->status->value,
                    'scheduled_start' => $maintenance->scheduled_start->toIso8601String(),
                    'scheduled_end' => $maintenance->scheduled_end->toIso8601String(),
                    'components' => $maintenance->components->map(fn (Component $component) => $component->translate('name'))->all(),
                ])->all(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/maintenances/form', [
            'maintenance' => null,
            'components' => $this->componentOptions(),
        ]);
    }

    public function store(MaintenanceRequest $request, AlertDispatcher $alerts): RedirectResponse
    {
        $maintenance = new Maintenance;
        $this->save($maintenance, $request);

        $alerts->dispatch(
            match ($maintenance->status) {
                MaintenanceStatus::Scheduled => AlertEvent::MaintenanceScheduled,
                MaintenanceStatus::InProgress => AlertEvent::MaintenanceStarted,
                MaintenanceStatus::Completed => AlertEvent::MaintenanceCompleted,
            },
            AlertPayloads::maintenance($maintenance),
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Maintenance scheduled.')]);

        return to_route('admin.maintenances.index');
    }

    public function edit(Maintenance $maintenance): Response
    {
        $timezone = config('status.timezone');

        return Inertia::render('admin/maintenances/form', [
            'maintenance' => [
                'id' => $maintenance->id,
                'title' => $maintenance->title,
                'description' => $maintenance->description,
                'scheduled_start' => $maintenance->scheduled_start->setTimezone($timezone)->format('Y-m-d\TH:i'),
                'scheduled_end' => $maintenance->scheduled_end->setTimezone($timezone)->format('Y-m-d\TH:i'),
                'components' => $maintenance->components()->pluck('components.id')->all(),
            ],
            'components' => $this->componentOptions(),
        ]);
    }

    public function update(MaintenanceRequest $request, Maintenance $maintenance): RedirectResponse
    {
        $this->save($maintenance, $request);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Maintenance saved.')]);

        return to_route('admin.maintenances.index');
    }

    public function destroy(Maintenance $maintenance): RedirectResponse
    {
        $components = $maintenance->components()->get();

        $maintenance->delete();

        $this->refresh($components);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Maintenance deleted.')]);

        return to_route('admin.maintenances.index');
    }

    private function save(Maintenance $maintenance, MaintenanceRequest $request): void
    {
        $previousComponents = $maintenance->exists ? $maintenance->components()->get() : collect();

        $maintenance->fill([
            'title' => $request->translations('title'),
            'description' => $request->translations('description'),
            'scheduled_start' => $request->localDate('scheduled_start'),
            'scheduled_end' => $request->localDate('scheduled_end'),
        ]);
        $maintenance->status = $maintenance->expectedStatus();
        $maintenance->save();

        $maintenance->components()->sync($request->validated('components', []));
        $maintenance->load('components');

        $this->refresh($previousComponents->merge($maintenance->components));
    }

    /**
     * @param  Collection<int, Component>  $components
     */
    private function refresh(Collection $components): void
    {
        $components->unique('id')->each(fn (Component $component) => $this->refreshComponentStatus->handle($component));
    }

    /**
     * @return array<int, array{id: int, name: string|null}>
     */
    private function componentOptions(): array
    {
        return Component::query()->orderBy('sort_order')->get()
            ->map(fn (Component $component) => ['id' => $component->id, 'name' => $component->translate('name')])
            ->all();
    }
}
