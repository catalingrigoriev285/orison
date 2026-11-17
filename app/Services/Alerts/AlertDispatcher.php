<?php

namespace App\Services\Alerts;

use App\Enums\AlertEvent;
use App\Jobs\SendAlertWebhook;
use App\Models\AlertDelivery;
use Illuminate\Support\Str;

class AlertDispatcher
{
    /**
     * Record an alert and queue its delivery to the configured webhook.
     *
     * @param  array<string, mixed>  $data
     */
    public function dispatch(AlertEvent $event, array $data): AlertDelivery
    {
        $url = config('status.webhook.url');

        $delivery = AlertDelivery::create([
            'uuid' => (string) Str::uuid(),
            'event' => $event,
            'payload' => [
                'event' => $event->value,
                'occurred_at' => now()->toIso8601String(),
                ...$data,
            ],
            'target_url' => $url,
            'error' => blank($url) ? 'STATUS_WEBHOOK_URL is not configured.' : null,
            'failed_at' => blank($url) ? now() : null,
        ]);

        if (filled($url)) {
            SendAlertWebhook::dispatch($delivery);
        }

        return $delivery;
    }

    /**
     * Queue another delivery attempt of an existing alert, keeping its UUID.
     */
    public function retry(AlertDelivery $delivery): void
    {
        $url = config('status.webhook.url');

        $delivery->update([
            'target_url' => $url,
            'failed_at' => blank($url) ? now() : null,
            'error' => blank($url) ? 'STATUS_WEBHOOK_URL is not configured.' : null,
        ]);

        if (filled($url)) {
            SendAlertWebhook::dispatch($delivery);
        }
    }
}
