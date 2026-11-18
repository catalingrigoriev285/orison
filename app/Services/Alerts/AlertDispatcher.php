<?php

namespace App\Services\Alerts;

use App\Enums\AlertEvent;
use App\Jobs\SendAlertWebhook;
use App\Models\AlertDelivery;
use Illuminate\Support\Str;

class AlertDispatcher
{
    public const NOT_CONFIGURED = 'The webhook URL is not configured (Admin → Alerts).';

    public function __construct(private WebhookSettings $webhook) {}

    /**
     * Record an alert and queue its delivery to the configured webhook.
     *
     * @param  array<string, mixed>  $data
     */
    public function dispatch(AlertEvent $event, array $data): AlertDelivery
    {
        $url = $this->webhook->url();

        $delivery = AlertDelivery::create([
            'uuid' => (string) Str::uuid(),
            'event' => $event,
            'payload' => [
                'event' => $event->value,
                'occurred_at' => now()->toIso8601String(),
                ...$data,
            ],
            'target_url' => $url,
            'error' => blank($url) ? self::NOT_CONFIGURED : null,
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
        $url = $this->webhook->url();

        $delivery->update([
            'target_url' => $url,
            'failed_at' => blank($url) ? now() : null,
            'error' => blank($url) ? self::NOT_CONFIGURED : null,
        ]);

        if (filled($url)) {
            SendAlertWebhook::dispatch($delivery);
        }
    }
}
