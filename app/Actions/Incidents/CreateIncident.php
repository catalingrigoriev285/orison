<?php

namespace App\Actions\Incidents;

use App\Actions\Components\RefreshComponentStatus;
use App\Enums\AlertEvent;
use App\Enums\IncidentImpact;
use App\Enums\IncidentStatus;
use App\Models\Component;
use App\Models\Incident;
use App\Models\User;
use App\Services\Alerts\AlertDispatcher;
use App\Services\Alerts\AlertPayloads;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

class CreateIncident
{
    public function __construct(
        private RefreshComponentStatus $refreshComponentStatus,
        private AlertDispatcher $alerts,
    ) {}

    /**
     * Open an incident with its first update and mark the affected components.
     *
     * @param  array<string, string|null>  $title
     * @param  array<string, string|null>  $message
     * @param  array<int, string>  $components  component id => component status value
     */
    public function handle(
        array $title,
        IncidentImpact $impact,
        IncidentStatus $status,
        array $message,
        array $components = [],
        ?CarbonInterface $startedAt = null,
        ?User $user = null,
        ?int $monitorId = null,
        bool $notify = true,
    ): Incident {
        $incident = DB::transaction(function () use ($title, $impact, $status, $message, $components, $startedAt, $user, $monitorId) {
            $incident = Incident::create([
                'title' => $title,
                'impact' => $impact,
                'status' => $status,
                'monitor_id' => $monitorId,
                'is_automatic' => $monitorId !== null,
                'started_at' => $startedAt ?? now(),
                'resolved_at' => $status === IncidentStatus::Resolved ? now() : null,
            ]);

            $incident->components()->sync(
                collect($components)->mapWithKeys(fn (string $componentStatus, int $id) => [$id => ['component_status' => $componentStatus]])->all(),
            );

            $incident->updates()->create([
                'status' => $status,
                'message' => $message,
                'user_id' => $user?->id,
            ]);

            return $incident;
        });

        $incident->components->each(fn (Component $component) => $this->refreshComponentStatus->handle($component));

        if ($notify) {
            $this->alerts->dispatch(AlertEvent::IncidentCreated, AlertPayloads::incident($incident));
        }

        return $incident;
    }
}
