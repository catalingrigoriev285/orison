<?php

namespace App\Actions\Incidents;

use App\Actions\Components\RefreshComponentStatus;
use App\Enums\AlertEvent;
use App\Enums\IncidentStatus;
use App\Models\Component;
use App\Models\Incident;
use App\Models\IncidentUpdate;
use App\Models\User;
use App\Services\Alerts\AlertDispatcher;
use App\Services\Alerts\AlertPayloads;
use Illuminate\Support\Facades\DB;

class PostIncidentUpdate
{
    public function __construct(
        private RefreshComponentStatus $refreshComponentStatus,
        private AlertDispatcher $alerts,
    ) {}

    /**
     * Add a timeline update to an incident and move it to the given status.
     *
     * @param  array<string, string|null>  $message
     */
    public function handle(
        Incident $incident,
        IncidentStatus $status,
        array $message,
        ?User $user = null,
        bool $notify = true,
    ): IncidentUpdate {
        $update = DB::transaction(function () use ($incident, $status, $message, $user) {
            $update = $incident->updates()->create([
                'status' => $status,
                'message' => $message,
                'user_id' => $user?->id,
            ]);

            $incident->update([
                'status' => $status,
                'resolved_at' => $status === IncidentStatus::Resolved ? ($incident->resolved_at ?? now()) : null,
            ]);

            return $update;
        });

        $incident->components->each(fn (Component $component) => $this->refreshComponentStatus->handle($component));

        if ($notify) {
            $this->alerts->dispatch(
                $status === IncidentStatus::Resolved ? AlertEvent::IncidentResolved : AlertEvent::IncidentUpdated,
                AlertPayloads::incident($incident->fresh() ?? $incident),
            );
        }

        return $update;
    }
}
