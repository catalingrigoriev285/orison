<?php

namespace App\Jobs;

use App\Actions\Monitoring\RecordCheckResult;
use App\Models\Monitor;
use App\Services\Monitoring\MonitorChecker;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class RunMonitorCheck implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public int $uniqueFor = 120;

    public function __construct(public Monitor $monitor) {}

    public function uniqueId(): string
    {
        return (string) $this->monitor->id;
    }

    public function handle(MonitorChecker $checker, RecordCheckResult $recordCheckResult): void
    {
        $recordCheckResult->handle($this->monitor, $checker->check($this->monitor));
    }
}
