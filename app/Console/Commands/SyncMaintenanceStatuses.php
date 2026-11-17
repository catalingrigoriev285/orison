<?php

namespace App\Console\Commands;

use App\Actions\Components\RefreshComponentStatus;
use App\Enums\AlertEvent;
use App\Enums\MaintenanceStatus;
use App\Models\Component;
use App\Models\Maintenance;
use App\Services\Alerts\AlertDispatcher;
use App\Services\Alerts\AlertPayloads;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('status:sync-maintenances')]
#[Description('Start and complete maintenance windows according to their schedule')]
class SyncMaintenanceStatuses extends Command
{
    public function handle(RefreshComponentStatus $refreshComponentStatus, AlertDispatcher $alerts): int
    {
        Maintenance::query()
            ->where('status', '!=', MaintenanceStatus::Completed)
            ->with('components')
            ->each(function (Maintenance $maintenance) use ($refreshComponentStatus, $alerts) {
                $expected = $maintenance->expectedStatus();

                if ($expected === $maintenance->status) {
                    return;
                }

                $maintenance->update(['status' => $expected]);

                $maintenance->components->each(fn (Component $component) => $refreshComponentStatus->handle($component));

                $alerts->dispatch(
                    $expected === MaintenanceStatus::InProgress ? AlertEvent::MaintenanceStarted : AlertEvent::MaintenanceCompleted,
                    AlertPayloads::maintenance($maintenance),
                );
            });

        return self::SUCCESS;
    }
}
