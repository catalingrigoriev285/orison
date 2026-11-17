<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AlertEvent;
use App\Http\Controllers\Controller;
use App\Models\AlertDelivery;
use App\Services\Alerts\AlertDispatcher;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class AlertController extends Controller
{
    public function index(): Response
    {
        $url = config('status.webhook.url');

        return Inertia::render('admin/alerts/index', [
            'deliveries' => AlertDelivery::query()->latest()->latest('id')->paginate(25)
                ->through(fn (AlertDelivery $delivery) => [
                    ...self::summary($delivery),
                    'payload' => $delivery->payload,
                    'error' => $delivery->error,
                    'response_code' => $delivery->response_code,
                    'attempts' => $delivery->attempts,
                    'uuid' => $delivery->uuid,
                ]),
            'webhook' => [
                'url' => $url,
                'has_secret' => filled(config('status.webhook.secret')),
            ],
        ]);
    }

    public function test(AlertDispatcher $alerts): RedirectResponse
    {
        $alerts->dispatch(AlertEvent::Test, [
            'message' => 'Test alert from '.config('app.name'),
            'url' => route('admin.alerts.index'),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Test alert queued.')]);

        return back();
    }

    public function retry(AlertDelivery $delivery, AlertDispatcher $alerts): RedirectResponse
    {
        $alerts->retry($delivery);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Alert queued for delivery.')]);

        return back();
    }

    /**
     * @return array{id: int, event: string, state: string, created_at: string|null, delivered_at: string|null}
     */
    public static function summary(AlertDelivery $delivery): array
    {
        return [
            'id' => $delivery->id,
            'event' => $delivery->event->value,
            'state' => $delivery->state(),
            'created_at' => $delivery->created_at?->toIso8601String(),
            'delivered_at' => $delivery->delivered_at?->toIso8601String(),
        ];
    }
}
