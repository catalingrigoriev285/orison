<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Components\RefreshComponentStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ComponentRequest;
use App\Models\Component;
use App\Models\ComponentGroup;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class ComponentController extends Controller
{
    public function __construct(private RefreshComponentStatus $refreshComponentStatus) {}

    public function index(): Response
    {
        return Inertia::render('admin/components/index', [
            'components' => Component::query()->withCount('monitors')->orderBy('sort_order')->orderBy('id')->get()
                ->map(fn (Component $component) => [
                    'id' => $component->id,
                    'name' => $component->translate('name'),
                    'slug' => $component->slug,
                    'group_id' => $component->component_group_id,
                    'status' => $component->status->value,
                    'status_override' => $component->status_override?->value,
                    'is_visible' => $component->is_visible,
                    'sort_order' => $component->sort_order,
                    'monitors_count' => $component->getAttribute('monitors_count'),
                ])->all(),
            'groups' => $this->groups(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/components/form', [
            'component' => null,
            'groups' => $this->groups(),
            'nextSortOrder' => (int) Component::query()->max('sort_order') + 1,
        ]);
    }

    public function store(ComponentRequest $request): RedirectResponse
    {
        $component = Component::create([
            ...$request->safe()->except(['name', 'description']),
            'name' => $request->translations('name'),
            'description' => $request->translations('description'),
        ]);

        $this->refreshComponentStatus->handle($component);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Component created.')]);

        return to_route('admin.components.index');
    }

    public function edit(Component $component): Response
    {
        return Inertia::render('admin/components/form', [
            'component' => [
                'id' => $component->id,
                'name' => $component->name,
                'description' => $component->description,
                'slug' => $component->slug,
                'component_group_id' => $component->component_group_id,
                'sort_order' => $component->sort_order,
                'is_visible' => $component->is_visible,
                'status_override' => $component->status_override?->value,
            ],
            'groups' => $this->groups(),
            'nextSortOrder' => $component->sort_order,
        ]);
    }

    public function update(ComponentRequest $request, Component $component): RedirectResponse
    {
        $component->update([
            ...$request->safe()->except(['name', 'description']),
            'name' => $request->translations('name'),
            'description' => $request->translations('description'),
        ]);

        $this->refreshComponentStatus->handle($component);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Component saved.')]);

        return to_route('admin.components.index');
    }

    public function destroy(Component $component): RedirectResponse
    {
        $component->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Component deleted.')]);

        return to_route('admin.components.index');
    }

    /**
     * @return array<int, array{id: int, name: array<string, string|null>, label: string|null, sort_order: int}>
     */
    private function groups(): array
    {
        return ComponentGroup::query()->orderBy('sort_order')->get()
            ->map(fn (ComponentGroup $group) => [
                'id' => $group->id,
                'name' => $group->name,
                'label' => $group->translate('name'),
                'sort_order' => $group->sort_order,
            ])->all();
    }
}
