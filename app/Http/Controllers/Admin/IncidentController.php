<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Components\RefreshComponentStatus;
use App\Actions\Incidents\CreateIncident;
use App\Enums\IncidentImpact;
use App\Enums\IncidentStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\IncidentRequest;
use App\Models\Component;
use App\Models\Incident;
use App\Models\IncidentUpdate;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class IncidentController extends Controller
{
    public function __construct(private RefreshComponentStatus $refreshComponentStatus) {}

    public function index(Request $request): Response
    {
        $filter = in_array($request->query('filter'), ['open', 'resolved'], true) ? (string) $request->query('filter') : 'all';

        $incidents = Incident::query()
            ->with('components')
            ->when($filter === 'open', fn ($query) => $query->unresolved())
            ->when($filter === 'resolved', fn ($query) => $query->where('status', IncidentStatus::Resolved))
            ->latest('started_at')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (Incident $incident) => [
                'id' => $incident->id,
                'title' => $incident->translate('title'),
                'impact' => $incident->impact->value,
                'status' => $incident->status->value,
                'is_automatic' => $incident->is_automatic,
                'started_at' => $incident->started_at->toIso8601String(),
                'resolved_at' => $incident->resolved_at?->toIso8601String(),
                'components' => $incident->components->map(fn (Component $component) => $component->translate('name'))->all(),
            ]);

        return Inertia::render('admin/incidents/index', [
            'incidents' => $incidents,
            'filter' => $filter,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/incidents/create', [
            'components' => $this->componentOptions(),
        ]);
    }

    public function store(IncidentRequest $request, CreateIncident $createIncident): RedirectResponse
    {
        $incident = $createIncident->handle(
            title: (array) $request->translations('title'),
            impact: $request->enum('impact', IncidentImpact::class) ?? IncidentImpact::Minor,
            status: $request->enum('status', IncidentStatus::class) ?? IncidentStatus::Investigating,
            message: (array) $request->translations('message'),
            components: $request->componentStatuses(),
            startedAt: $request->localDate('started_at'),
            user: $request->user(),
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Incident published.')]);

        return to_route('admin.incidents.show', $incident);
    }

    public function show(Incident $incident): Response
    {
        $incident->load(['components', 'updates.user']);

        return Inertia::render('admin/incidents/show', [
            'incident' => [
                'id' => $incident->id,
                'title' => $incident->title,
                'impact' => $incident->impact->value,
                'status' => $incident->status->value,
                'is_automatic' => $incident->is_automatic,
                'started_at' => $incident->started_at->toIso8601String(),
                'started_at_local' => $incident->started_at->setTimezone(config('status.timezone'))->format('Y-m-d\TH:i'),
                'resolved_at' => $incident->resolved_at?->toIso8601String(),
                'components' => $incident->components->map(fn (Component $component) => [
                    'id' => $component->id,
                    'status' => $component->getRelationValue('pivot')?->getAttribute('component_status'),
                ])->all(),
                'updates' => $incident->updates->map(fn (IncidentUpdate $update) => [
                    'id' => $update->id,
                    'status' => $update->status->value,
                    'message' => $update->message,
                    'author' => $update->user?->name,
                    'created_at' => $update->created_at?->toIso8601String(),
                ])->all(),
            ],
            'components' => $this->componentOptions(),
        ]);
    }

    public function update(IncidentRequest $request, Incident $incident): RedirectResponse
    {
        $previousComponents = $incident->components()->get();

        $incident->update([
            'title' => $request->translations('title'),
            'impact' => $request->enum('impact', IncidentImpact::class),
            'started_at' => $request->localDate('started_at') ?? $incident->started_at,
        ]);

        $incident->components()->sync(
            collect($request->componentStatuses())->map(fn (string $status) => ['component_status' => $status])->all(),
        );

        $previousComponents->merge($incident->components()->get())
            ->unique('id')
            ->each(fn (Component $component) => $this->refreshComponentStatus->handle($component));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Incident saved.')]);

        return back();
    }

    public function destroy(Incident $incident): RedirectResponse
    {
        $components = $incident->components()->get();

        $incident->delete();

        $components->each(fn (Component $component) => $this->refreshComponentStatus->handle($component));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Incident deleted.')]);

        return to_route('admin.incidents.index');
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
