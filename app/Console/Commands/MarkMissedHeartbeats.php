<?php

namespace App\Console\Commands;

use App\Actions\Monitoring\RecordCheckResult;
use App\Enums\MonitorType;
use App\Models\Monitor;
use App\Services\Monitoring\CheckResult;
use Carbon\CarbonInterface;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Date;

#[Signature('status:check-heartbeats')]
#[Description('Record a failed check for heartbeat monitors that stopped pinging')]
class MarkMissedHeartbeats extends Command
{
    public function handle(RecordCheckResult $recordCheckResult): int
    {
        $grace = (int) config('status.heartbeat_grace_seconds');

        Monitor::query()
            ->where('is_active', true)
            ->where('type', MonitorType::Heartbeat)
            ->each(function (Monitor $monitor) use ($recordCheckResult, $grace) {
                $lastBeat = $this->lastBeatAt($monitor);

                if ($lastBeat->gt(now()->subSeconds($monitor->interval_seconds + $grace))) {
                    return;
                }

                // While a heartbeat stays missing, log one failure per interval.
                if ($monitor->last_checked_at?->gt(now()->subSeconds($monitor->interval_seconds))) {
                    return;
                }

                $recordCheckResult->handle($monitor, CheckResult::down(
                    'No heartbeat received since '.$lastBeat->toIso8601String(),
                ));
            });

        return self::SUCCESS;
    }

    private function lastBeatAt(Monitor $monitor): CarbonInterface
    {
        /** @var string|null $lastSuccess */
        $lastSuccess = $monitor->checks()->where('is_up', true)->max('checked_at');

        return $lastSuccess
            ? Date::parse($lastSuccess)
            : ($monitor->state_changed_at ?? $monitor->updated_at ?? now());
    }
}
