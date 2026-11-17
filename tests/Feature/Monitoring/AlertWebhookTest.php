<?php

use App\Enums\AlertEvent;
use App\Jobs\SendAlertWebhook;
use App\Models\AlertDelivery;
use App\Services\Alerts\AlertDispatcher;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;

beforeEach(function () {
    config([
        'status.webhook.url' => 'https://example.com/hooks/status',
        'status.webhook.secret' => 'top-secret',
    ]);
});

test('alerts are posted as signed json', function () {
    Http::fake(['example.com/*' => Http::response(['ok' => true])]);

    $delivery = app(AlertDispatcher::class)->dispatch(AlertEvent::Test, ['message' => 'Salut']);

    Http::assertSent(function (Request $request) use ($delivery) {
        $timestamp = $request->header('X-Status-Timestamp')[0];

        return $request->url() === 'https://example.com/hooks/status'
            && $request->header('X-Status-Event')[0] === 'test'
            && $request->header('X-Status-Delivery')[0] === $delivery->uuid
            && $request->header('X-Status-Signature')[0] === 'sha256='.hash_hmac('sha256', $timestamp.'.'.$request->body(), 'top-secret')
            && $request['message'] === 'Salut'
            && $request['event'] === 'test';
    });

    expect($delivery->fresh())
        ->delivered_at->not->toBeNull()
        ->response_code->toBe(200)
        ->attempts->toBe(1);
});

test('a failed delivery records the error and is retried', function () {
    Http::fake(['*' => Http::response('nope', 500)]);
    $delivery = AlertDelivery::factory()->create(['delivered_at' => null, 'attempts' => 0]);

    expect(fn () => (new SendAlertWebhook($delivery))->handle())->toThrow(RuntimeException::class);

    expect($delivery->fresh())
        ->response_code->toBe(500)
        ->error->toContain('HTTP 500')
        ->delivered_at->toBeNull();

    (new SendAlertWebhook($delivery))->failed(new RuntimeException('Gave up'));
    expect($delivery->fresh()->state())->toBe('failed');
});

test('without a webhook url alerts are logged as failed and not sent', function () {
    Queue::fake();
    config(['status.webhook.url' => null]);

    $delivery = app(AlertDispatcher::class)->dispatch(AlertEvent::Test, []);

    expect($delivery->state())->toBe('failed')
        ->and($delivery->error)->toContain('STATUS_WEBHOOK_URL');
    Queue::assertNothingPushed();
});
