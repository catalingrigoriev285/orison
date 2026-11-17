<?php

namespace App\Services\Monitoring;

use App\Enums\MonitorType;
use App\Models\Monitor;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use InvalidArgumentException;

class MonitorChecker
{
    /**
     * Perform a single check against the monitor's target.
     */
    public function check(Monitor $monitor): CheckResult
    {
        return match ($monitor->type) {
            MonitorType::Http, MonitorType::Keyword => $this->checkHttp($monitor),
            MonitorType::Tcp => $this->checkTcp($monitor),
            MonitorType::Heartbeat => throw new InvalidArgumentException('Heartbeat monitors are not polled.'),
        };
    }

    private function checkHttp(Monitor $monitor): CheckResult
    {
        $startedAt = hrtime(true);

        try {
            $response = Http::timeout($monitor->timeout_seconds)
                ->connectTimeout($monitor->timeout_seconds)
                ->withUserAgent('Orison/1.0 (+'.config('app.url').')')
                ->send(strtoupper($monitor->method), (string) $monitor->url);
        } catch (ConnectionException $exception) {
            return CheckResult::down(
                Str::limit($exception->getMessage(), 500),
                $this->elapsedMs($startedAt),
            );
        }

        $responseTimeMs = $this->elapsedMs($startedAt);

        if ($response->status() !== $monitor->expected_status) {
            return CheckResult::down(
                "Unexpected status code {$response->status()} (expected {$monitor->expected_status})",
                $responseTimeMs,
                $response->status(),
            );
        }

        if ($monitor->type === MonitorType::Keyword && ! str_contains($response->body(), (string) $monitor->keyword)) {
            return CheckResult::down(
                "Keyword \"{$monitor->keyword}\" not found in response",
                $responseTimeMs,
                $response->status(),
            );
        }

        return CheckResult::up($responseTimeMs, $response->status());
    }

    private function checkTcp(Monitor $monitor): CheckResult
    {
        $startedAt = hrtime(true);

        $socket = @stream_socket_client(
            "tcp://{$monitor->host}:{$monitor->port}",
            $errorCode,
            $errorMessage,
            $monitor->timeout_seconds,
        );

        $responseTimeMs = $this->elapsedMs($startedAt);

        if ($socket === false) {
            return CheckResult::down(
                trim("Connection failed ({$errorCode}) {$errorMessage}"),
                $responseTimeMs,
            );
        }

        fclose($socket);

        return CheckResult::up($responseTimeMs);
    }

    private function elapsedMs(int|float $startedAt): int
    {
        return (int) round((hrtime(true) - $startedAt) / 1_000_000);
    }
}
