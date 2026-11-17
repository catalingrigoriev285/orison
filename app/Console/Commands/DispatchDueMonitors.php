<?php

namespace App\Console\Commands;

use App\Enums\MonitorType;
use App\Jobs\RunMonitorCheck;
use App\Models\Monitor;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('status:dispatch-monitors')]
#[Description('Queue a check for every active monitor whose interval has elapsed')]
class DispatchDueMonitors extends Command
{
    public function handle(): int
    {
        $dueMonitors = Monitor::query()
            ->where('is_active', true)
            ->where('type', '!=', MonitorType::Heartbeat)
            ->get()
            ->filter(fn (Monitor $monitor) => $monitor->isDue());

        $dueMonitors->each(fn (Monitor $monitor) => RunMonitorCheck::dispatch($monitor));

        $this->components->info("Queued {$dueMonitors->count()} monitor checks.");

        return self::SUCCESS;
    }
}
