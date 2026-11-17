<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ComponentGroupRequest;
use App\Models\ComponentGroup;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

class ComponentGroupController extends Controller
{
    public function store(ComponentGroupRequest $request): RedirectResponse
    {
        ComponentGroup::create([
            'name' => $request->translations('name'),
            'sort_order' => $request->validated('sort_order'),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Group created.')]);

        return back();
    }

    public function update(ComponentGroupRequest $request, ComponentGroup $group): RedirectResponse
    {
        $group->update([
            'name' => $request->translations('name'),
            'sort_order' => $request->validated('sort_order'),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Group saved.')]);

        return back();
    }

    public function destroy(ComponentGroup $group): RedirectResponse
    {
        $group->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Group deleted.')]);

        return back();
    }
}
