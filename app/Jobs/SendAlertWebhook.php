<?php

namespace App\Jobs;

use App\Models\AlertDelivery;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class SendAlertWebhook implements ShouldQueue
{
    use Queueable;

    public int $tries = 5;

    public function __construct(public AlertDelivery $delivery) {}

    /**
     * @return array<int, int>
     */
    public function backoff(): array
    {
        return [10, 60, 300, 900];
    }

    public function handle(): void
    {
        $url = (string) $this->delivery->target_url;
        $body = (string) json_encode($this->delivery->payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $timestamp = (string) now()->getTimestamp();

        $this->delivery->increment('attempts');

        try {
            $response = Http::timeout(config('status.webhook.timeout'))
                ->withHeaders([
                    'X-Status-Event' => $this->delivery->event->value,
                    'X-Status-Delivery' => $this->delivery->uuid,
                    'X-Status-Timestamp' => $timestamp,
                    'X-Status-Signature' => self::signature($timestamp, $body, (string) config('status.webhook.secret')),
                    'User-Agent' => 'Orison/1.0',
                ])
                ->withBody($body, 'application/json')
                ->post($url);

            $this->delivery->update(['response_code' => $response->status()]);

            if ($response->failed()) {
                throw new RuntimeException("Webhook responded with HTTP {$response->status()}");
            }
        } catch (Throwable $exception) {
            $this->delivery->update(['error' => Str::limit($exception->getMessage(), 1000)]);

            throw $exception;
        }

        $this->delivery->update([
            'delivered_at' => now(),
            'failed_at' => null,
            'error' => null,
        ]);
    }

    public function failed(?Throwable $exception): void
    {
        $this->delivery->update([
            'failed_at' => now(),
            'error' => Str::limit($exception?->getMessage() ?? 'Unknown error', 1000),
        ]);
    }

    public static function signature(string $timestamp, string $body, string $secret): string
    {
        return 'sha256='.hash_hmac('sha256', $timestamp.'.'.$body, $secret);
    }
}
