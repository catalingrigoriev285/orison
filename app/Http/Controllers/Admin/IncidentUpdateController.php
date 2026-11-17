<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Components\RefreshComponentStatus;
use App\Actions\Incidents\PostIncidentUpdate;
use App\Enums\IncidentStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\IncidentUpdateRequest;
use App\Models\Component;
use App\Models\Incident;
use App\Models\IncidentUpdate;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

class IncidentUpdateController extends Controller
{
    public function store(IncidentUpdateRequest $request, Incident $incident, PostIncidentUpdate $postIncidentUpdate): RedirectResponse
    {
        $postIncidentUpdate->handle(
            $incident,
            $request->enum('status', IncidentStatus::class) ?? $incident->status,
            (array) $request->translations('message'),
            $request->user(),
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Update posted.')]);

        return back();
    }

    /**
     * Correct the wording of an existing update. Does not notify anyone.
     */
    public function update(IncidentUpdateRequest $request, Incident $incident, IncidentUpdate $update): RedirectResponse
    {
        $update->update([
            'status' => $request->enum('status', IncidentStatus::class),
            'message' => $request->translations('message'),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Update saved.')]);

        return back();
    }

    public function destroy(Incident $incident, IncidentUpdate $update, RefreshComponentStatus $refreshComponentStatus): RedirectResponse
    {
        if ($incident->updates()->count() <= 1) {
            Inertia::flash('toast', ['type' => 'error', 'message' => __('An incident needs at least one update.')]);

            return back();
        }

        $update->delete();

        /** @var IncidentUpdate $latest */
        $latest = $incident->updates()->first();

        $incident->update([
            'status' => $latest->status,
            'resolved_at' => $latest->status === IncidentStatus::Resolved ? $latest->created_at : null,
        ]);

        $incident->components->each(fn (Component $component) => $refreshComponentStatus->handle($component));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Update deleted.')]);

        return back();
    }
}
