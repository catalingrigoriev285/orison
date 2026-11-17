<?php

use App\Enums\MonitorState;
use App\Enums\MonitorType;
use App\Models\Component;
use App\Models\Monitor;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->actingAs(User::factory()->create());
});

test('a monitor can be created', function () {
    $component = Component::factory()->create();

    $this->post(route('admin.monitors.store'), [
        'name' => 'Site web',
        'component_id' => $component->id,
        'type' => 'http',
        'url' => 'https://example.com',
        'method' => 'GET',
        'expected_status' => 200,
        'interval_seconds' => 60,
        'timeout_seconds' => 10,
        'failure_threshold' => 2,
        'is_active' => true,
        'notify' => true,
        'auto_incident' => false,
    ])->assertSessionHasNoErrors();

    $monitor = Monitor::sole();
    expect($monitor->state)->toBe(MonitorState::Pending)
        ->and($monitor->component_id)->toBe($component->id);
});

test('a heartbeat monitor gets a token and needs no url', function () {
    $this->post(route('admin.monitors.store'), [
        'name' => 'Scheduler',
        'type' => 'heartbeat',
        'interval_seconds' => 300,
        'timeout_seconds' => 10,
        'failure_threshold' => 1,
    ])->assertSessionHasNoErrors();

    expect(Monitor::sole())
        ->type->toBe(MonitorType::Heartbeat)
        ->heartbeat_token->toHaveLength(40);
});

test('monitor fields are validated for the chosen type', function () {
    $this->post(route('admin.monitors.store'), [
        'name' => 'Broken',
        'type' => 'tcp',
        'interval_seconds' => 5,
        'timeout_seconds' => 10,
        'failure_threshold' => 2,
    ])->assertSessionHasErrors(['host', 'port', 'interval_seconds']);

    $this->post(route('admin.monitors.store'), [
        'name' => 'Broken',
        'type' => 'keyword',
        'url' => 'not a url',
        'interval_seconds' => 60,
        'timeout_seconds' => 10,
        'failure_threshold' => 2,
    ])->assertSessionHasErrors(['url', 'keyword', 'method']);

    expect(Monitor::count())->toBe(0);
});

test('the monitor page shows uptime, outages and recent checks', function () {
    $monitor = Monitor::factory()->create(['failure_threshold' => 2]);
    $monitor->checks()->create(['is_up' => true, 'response_time_ms' => 120, 'checked_at' => now()->subMinutes(4)]);
    $monitor->checks()->create(['is_up' => false, 'error' => 'Timeout', 'checked_at' => now()->subMinutes(3)]);
    $monitor->checks()->create(['is_up' => false, 'error' => 'Timeout', 'checked_at' => now()->subMinutes(2)]);
    $monitor->checks()->create(['is_up' => true, 'response_time_ms' => 140, 'checked_at' => now()->subMinute()]);

    $this->get(route('admin.monitors.show', $monitor))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/monitors/show')
            ->where('uptime.24h', 50)
            ->has('outages', 1)
            ->where('outages.0.error', 'Timeout')
            ->has('recentChecks', 4)
            ->has('chart', 96),
        );
});

test('a monitor can be checked on demand', function () {
    Http::fake(['*' => Http::response('ok')]);
    $monitor = Monitor::factory()->create(['state' => MonitorState::Pending]);

    $this->post(route('admin.monitors.check', $monitor))->assertRedirect();

    expect($monitor->fresh()->state)->toBe(MonitorState::Up)
        ->and($monitor->checks()->count())->toBe(1);
});

test('a monitor can be paused and resumed', function () {
    $monitor = Monitor::factory()->down()->create();

    $this->post(route('admin.monitors.toggle', $monitor));
    expect($monitor->fresh())->is_active->toBeFalse()->state->toBe(MonitorState::Paused);

    $this->post(route('admin.monitors.toggle', $monitor));
    expect($monitor->fresh())->is_active->toBeTrue()->state->toBe(MonitorState::Pending);
});
