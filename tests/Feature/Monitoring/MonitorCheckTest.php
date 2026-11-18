<?php

use App\Enums\AlertEvent;
use App\Enums\ComponentStatus;
use App\Enums\IncidentStatus;
use App\Enums\MonitorState;
use App\Jobs\RunMonitorCheck;
use App\Jobs\SendAlertWebhook;
use App\Models\AlertDelivery;
use App\Models\Component;
use App\Models\Incident;
use App\Models\Maintenance;
use App\Models\Monitor;
use App\Services\Alerts\WebhookSettings;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;

beforeEach(function () {
    app(WebhookSettings::class)->store('https://example.com/hooks/status', str_repeat('s', 40));
});

test('a monitor goes down only after the failure threshold is reached', function () {
    Queue::fake([SendAlertWebhook::class]);
    Http::fake(['example.test/*' => Http::response('Bad gateway', 502)]);
    $component = Component::factory()->create();
    $monitor = Monitor::factory()->for($component)->create(['url' => 'https://example.test/health', 'failure_threshold' => 2]);

    RunMonitorCheck::dispatchSync($monitor);

    expect($monitor->fresh()->state)->toBe(MonitorState::Up)
        ->and($monitor->fresh()->consecutive_failures)->toBe(1)
        ->and($component->fresh()->status)->toBe(ComponentStatus::Operational);
    Queue::assertNothingPushed();

    RunMonitorCheck::dispatchSync($monitor->fresh());

    expect($monitor->fresh()->state)->toBe(MonitorState::Down)
        ->and($monitor->fresh()->last_error)->toContain('502')
        ->and($component->fresh()->status)->toBe(ComponentStatus::MajorOutage)
        ->and($monitor->checks()->count())->toBe(2);
    Queue::assertPushed(SendAlertWebhook::class, fn (SendAlertWebhook $job) => $job->delivery->event === AlertEvent::MonitorDown);
});

test('a monitor recovers on the first successful check and reports the downtime', function () {
    Queue::fake([SendAlertWebhook::class]);
    Http::fake(['example.test/*' => Http::response('ok')]);
    $monitor = Monitor::factory()->down()->create(['url' => 'https://example.test/health']);

    RunMonitorCheck::dispatchSync($monitor);

    expect($monitor->fresh()->state)->toBe(MonitorState::Up);
    $delivery = AlertDelivery::sole();
    expect($delivery->event)->toBe(AlertEvent::MonitorUp)
        ->and($delivery->payload['downtime_seconds'])->toBeGreaterThanOrEqual(299);
});

test('a keyword monitor fails when the keyword is missing', function () {
    Queue::fake([SendAlertWebhook::class]);
    Http::fake(['example.test/*' => Http::response('<response>FAILED</response>')]);
    $monitor = Monitor::factory()->keyword('SUCCESS')->create(['url' => 'https://example.test/api', 'failure_threshold' => 1]);

    RunMonitorCheck::dispatchSync($monitor);

    expect($monitor->fresh()->state)->toBe(MonitorState::Down)
        ->and($monitor->fresh()->last_error)->toContain('SUCCESS');
});

test('a connection error counts as a failed check', function () {
    Queue::fake([SendAlertWebhook::class]);
    Http::fake(fn () => throw new ConnectionException('Could not resolve host'));
    $monitor = Monitor::factory()->create(['failure_threshold' => 1]);

    RunMonitorCheck::dispatchSync($monitor);

    expect($monitor->fresh()->state)->toBe(MonitorState::Down)
        ->and($monitor->fresh()->last_error)->toContain('Could not resolve host');
});

test('only one of several monitors being down is a partial outage', function () {
    $component = Component::factory()->create();
    Monitor::factory()->for($component)->create();
    $failing = Monitor::factory()->for($component)->create(['failure_threshold' => 1, 'notify' => false]);
    Http::fake([$failing->url => Http::response('', 500)]);

    RunMonitorCheck::dispatchSync($failing);

    expect($component->fresh()->status)->toBe(ComponentStatus::PartialOutage);
});

test('a manual status override wins over monitor results', function () {
    $component = Component::factory()->create(['status_override' => ComponentStatus::UnderMaintenance]);
    $monitor = Monitor::factory()->for($component)->create(['failure_threshold' => 1, 'notify' => false]);
    Http::fake(['*' => Http::response('', 500)]);

    RunMonitorCheck::dispatchSync($monitor);

    expect($component->fresh()->status)->toBe(ComponentStatus::UnderMaintenance);
});

test('alerts are muted while the component is under maintenance', function () {
    Queue::fake([SendAlertWebhook::class]);
    Http::fake(['*' => Http::response('', 503)]);
    $component = Component::factory()->create();
    Maintenance::factory()->inProgress()->create()->components()->attach($component);
    $monitor = Monitor::factory()->for($component)->create(['failure_threshold' => 1]);

    RunMonitorCheck::dispatchSync($monitor);

    expect($monitor->fresh()->state)->toBe(MonitorState::Down)
        ->and($component->fresh()->status)->toBe(ComponentStatus::MajorOutage);
    Queue::assertNothingPushed();
});

test('monitors with automatic incidents open and resolve an incident', function () {
    Queue::fake([SendAlertWebhook::class]);
    $component = Component::factory()->create(['name' => ['ro' => 'Lecții video', 'ru' => 'Видеоуроки']]);
    $monitor = Monitor::factory()->for($component)->create(['failure_threshold' => 1, 'auto_incident' => true]);

    Http::fake(['*' => Http::sequence()->push('', 503)->push('ok')]);
    RunMonitorCheck::dispatchSync($monitor);

    $incident = Incident::sole();
    expect($incident->is_automatic)->toBeTrue()
        ->and($incident->title['ro'])->toBe('Lecții video este indisponibil')
        ->and($incident->title['ru'])->toBe('Видеоуроки недоступен')
        ->and($incident->status)->toBe(IncidentStatus::Investigating)
        ->and($incident->components->pluck('id')->all())->toBe([$component->id]);

    RunMonitorCheck::dispatchSync($monitor->fresh());

    expect($incident->fresh()->status)->toBe(IncidentStatus::Resolved)
        ->and($incident->updates()->count())->toBe(2)
        ->and($component->fresh()->status)->toBe(ComponentStatus::Operational);
});

test('only due, active, polled monitors are dispatched', function () {
    Queue::fake();
    $due = Monitor::factory()->create(['last_checked_at' => now()->subMinutes(2)]);
    Monitor::factory()->create(['last_checked_at' => now()->subSeconds(10)]);
    Monitor::factory()->paused()->create();
    Monitor::factory()->heartbeat()->create();

    $this->artisan('status:dispatch-monitors')->assertSuccessful();

    Queue::assertPushed(RunMonitorCheck::class, 1);
    Queue::assertPushed(RunMonitorCheck::class, fn (RunMonitorCheck $job) => $job->monitor->is($due));
});
