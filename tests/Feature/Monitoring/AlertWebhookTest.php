<?php

use App\Enums\AlertEvent;
use App\Jobs\SendAlertWebhook;
use App\Models\AlertDelivery;
use App\Models\User;
use App\Services\Alerts\AlertDispatcher;
use App\Services\Alerts\WebhookSettings;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;

beforeEach(function () {
    app(WebhookSettings::class)->store('https://example.com/hooks/status', 'top-secret');
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

    expect(fn () => (new SendAlertWebhook($delivery))->handle(app(WebhookSettings::class)))->toThrow(RuntimeException::class);

    expect($delivery->fresh())
        ->response_code->toBe(500)
        ->error->toContain('HTTP 500')
        ->delivered_at->toBeNull();

    (new SendAlertWebhook($delivery))->failed(new RuntimeException('Gave up'));
    expect($delivery->fresh()->state())->toBe('failed');
});

test('without a webhook url alerts are logged as failed and not sent', function () {
    Queue::fake();
    app(WebhookSettings::class)->store(null, null);

    $delivery = app(AlertDispatcher::class)->dispatch(AlertEvent::Test, []);

    expect($delivery->state())->toBe('failed')
        ->and($delivery->error)->toBe(AlertDispatcher::NOT_CONFIGURED);
    Queue::assertNothingPushed();
});

test('the webhook url and secret are edited from the admin panel', function () {
    $this->actingAs(User::factory()->create());
    $secret = WebhookSettings::generateSecret();

    $this->put(route('admin.alerts.webhook'), [
        'url' => 'https://online-educatie.test/api/status/webhook',
        'secret' => $secret,
    ])->assertSessionHasNoErrors()->assertRedirect();

    $webhook = app(WebhookSettings::class);
    expect($webhook->url())->toBe('https://online-educatie.test/api/status/webhook')
        ->and($webhook->secret())->toBe($secret);

    $this->get(route('admin.alerts.index'))
        ->assertInertia(fn ($page) => $page
            ->where('webhook.url', 'https://online-educatie.test/api/status/webhook')
            ->where('webhook.secret', $secret));
});

test('a webhook url needs a long enough secret', function () {
    app(WebhookSettings::class)->store(null, null);
    $this->actingAs(User::factory()->create());

    $this->put(route('admin.alerts.webhook'), ['url' => 'https://example.com/hook', 'secret' => ''])
        ->assertSessionHasErrors('secret');

    $this->put(route('admin.alerts.webhook'), ['url' => 'https://example.com/hook', 'secret' => 'short'])
        ->assertSessionHasErrors('secret');

    expect(app(WebhookSettings::class)->url())->toBeNull();
});

test('a regenerated secret signs the next attempt without restarting the worker', function () {
    Http::fake(['example.com/*' => Http::response(['ok' => true])]);
    $delivery = AlertDelivery::factory()->create(['target_url' => 'https://example.com/hooks/status', 'delivered_at' => null]);

    app(WebhookSettings::class)->store('https://example.com/hooks/status', 'rotated-secret-rotated-secret-rotated');
    (new SendAlertWebhook($delivery))->handle(app(WebhookSettings::class));

    Http::assertSent(function (Request $request) {
        $timestamp = $request->header('X-Status-Timestamp')[0];

        return $request->header('X-Status-Signature')[0]
            === 'sha256='.hash_hmac('sha256', $timestamp.'.'.$request->body(), 'rotated-secret-rotated-secret-rotated');
    });
});
