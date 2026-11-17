<?php

namespace App\Actions\Monitoring;

use App\Actions\Components\RefreshComponentStatus;
use App\Actions\Incidents\CreateIncident;
use App\Actions\Incidents\PostIncidentUpdate;
use App\Enums\AlertEvent;
use App\Enums\ComponentStatus;
use App\Enums\IncidentImpact;
use App\Enums\IncidentStatus;
use App\Enums\MonitorState;
use App\Models\Incident;
use App\Models\Monitor;
use App\Services\Alerts\AlertDispatcher;
use App\Services\Alerts\AlertPayloads;
use App\Services\Monitoring\CheckResult;

class RecordCheckResult
{
    public function __construct(
        private RefreshComponentStatus $refreshComponentStatus,
        private AlertDispatcher $alerts,
        private CreateIncident $createIncident,
        private PostIncidentUpdate $postIncidentUpdate,
    ) {}

    /**
     * Store a check result and move the monitor between up and down.
     *
     * A monitor goes down only after `failure_threshold` consecutive failed
     * checks, and comes back up on the first successful one.
     */
    public function handle(Monitor $monitor, CheckResult $result): MonitorState
    {
        $monitor->checks()->create([
            'is_up' => $result->isUp,
            'response_time_ms' => $result->responseTimeMs,
            'status_code' => $result->statusCode,
            'error' => $result->error,
            'checked_at' => now(),
        ]);

        $previousState = $monitor->state;
        $previousChange = $monitor->state_changed_at;
        $failures = $result->isUp ? 0 : $monitor->consecutive_failures + 1;

        $newState = match (true) {
            $result->isUp => MonitorState::Up,
            $failures >= $monitor->failure_threshold => MonitorState::Down,
            default => $previousState === MonitorState::Paused ? MonitorState::Pending : $previousState,
        };

        $stateChanged = $newState !== $previousState;

        $monitor->update([
            'consecutive_failures' => $failures,
            'state' => $newState,
            'state_changed_at' => $stateChanged ? now() : $monitor->state_changed_at,
            'last_checked_at' => now(),
            'last_response_ms' => $result->responseTimeMs,
            'last_error' => $result->error,
        ]);

        if ($monitor->component) {
            $this->refreshComponentStatus->handle($monitor->component);
        }

        if ($stateChanged && $newState === MonitorState::Down) {
            $this->wentDown($monitor, $result);
        }

        if ($stateChanged && $newState === MonitorState::Up && $previousState === MonitorState::Down) {
            $this->cameBackUp($monitor, $result, $previousChange?->diffInSeconds(now(), true));
        }

        return $newState;
    }

    private function wentDown(Monitor $monitor, CheckResult $result): void
    {
        if ($monitor->auto_incident && ! $this->openAutomaticIncident($monitor)) {
            $this->createIncident->handle(
                title: $this->translated(':service is unavailable', $monitor),
                impact: IncidentImpact::Major,
                status: IncidentStatus::Investigating,
                message: $this->translated('Our monitoring detected that :service is not responding. We are investigating.', $monitor),
                components: $monitor->component_id ? [$monitor->component_id => ComponentStatus::MajorOutage->value] : [],
                monitorId: $monitor->id,
                notify: false,
            );
        }

        if ($this->shouldAlert($monitor)) {
            $this->alerts->dispatch(AlertEvent::MonitorDown, AlertPayloads::monitor($monitor, $result));
        }
    }

    private function cameBackUp(Monitor $monitor, CheckResult $result, ?float $downtimeSeconds): void
    {
        $incident = $this->openAutomaticIncident($monitor);

        if ($incident) {
            $this->postIncidentUpdate->handle(
                $incident,
                IncidentStatus::Resolved,
                $this->translated(':service is working normally again.', $monitor),
                notify: false,
            );
        }

        if ($this->shouldAlert($monitor)) {
            $this->alerts->dispatch(
                AlertEvent::MonitorUp,
                AlertPayloads::monitor($monitor, $result, $downtimeSeconds === null ? null : (int) $downtimeSeconds),
            );
        }
    }

    /**
     * Alerts are muted while the monitor's component is in a maintenance window.
     */
    private function shouldAlert(Monitor $monitor): bool
    {
        return $monitor->notify && ! $monitor->component?->isUnderMaintenance();
    }

    private function openAutomaticIncident(Monitor $monitor): ?Incident
    {
        return Incident::query()
            ->where('monitor_id', $monitor->id)
            ->where('is_automatic', true)
            ->unresolved()
            ->latest('started_at')
            ->first();
    }

    /**
     * @return array<string, string>
     */
    private function translated(string $key, Monitor $monitor): array
    {
        return collect(config()->array('status.locales'))
            ->mapWithKeys(fn (string $locale) => [$locale => __($key, [
                'service' => $monitor->component?->translate('name', $locale) ?? $monitor->name,
            ], $locale)])
            ->all();
    }
}
