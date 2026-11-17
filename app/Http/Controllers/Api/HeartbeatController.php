<?php

namespace App\Http\Controllers\Api;

use App\Actions\Monitoring\RecordCheckResult;
use App\Enums\MonitorType;
use App\Http\Controllers\Controller;
use App\Models\Monitor;
use App\Services\Monitoring\CheckResult;
use Illuminate\Http\JsonResponse;

class HeartbeatController extends Controller
{
    /**
     * Called by scheduled jobs on the platform to prove they are still running.
     */
    public function __invoke(string $token, RecordCheckResult $recordCheckResult): JsonResponse
    {
        $monitor = Monitor::query()
            ->where('type', MonitorType::Heartbeat)
            ->where('heartbeat_token', $token)
            ->where('is_active', true)
            ->firstOrFail();

        $state = $recordCheckResult->handle($monitor, CheckResult::up());

        return response()->json(['ok' => true, 'state' => $state->value]);
    }
}
