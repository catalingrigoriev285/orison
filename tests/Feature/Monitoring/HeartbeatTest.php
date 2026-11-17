<?php

use App\Enums\MonitorState;
use App\Models\Monitor;

test('a heartbeat ping marks the monitor up', function () {
    $monitor = Monitor::factory()->heartbeat()->create(['state' => MonitorState::Pending]);

    $this->postJson(route('api.heartbeat', $monitor->heartbeat_token))
        ->assertOk()
        ->assertJson(['ok' => true, 'state' => 'up']);

    expect($monitor->fresh()->state)->toBe(MonitorState::Up)
        ->and($monitor->checks()->where('is_up', true)->count())->toBe(1);
});

test('an unknown or paused heartbeat token is not found', function () {
    $paused = Monitor::factory()->heartbeat()->paused()->create();

    $this->postJson(route('api.heartbeat', 'not-a-token'))->assertNotFound();
    $this->postJson(route('api.heartbeat', $paused->heartbeat_token))->assertNotFound();
});

test('a missed heartbeat records failures until the monitor goes down', function () {
    $this->freezeTime();
    $monitor = Monitor::factory()->heartbeat()->create([
        'interval_seconds' => 300,
        'failure_threshold' => 2,
        'notify' => false,
    ]);
    $monitor->checks()->create(['is_up' => true, 'checked_at' => now()->subMinutes(5)]);
    $monitor->update(['last_checked_at' => now()->subMinutes(5)]);

    $this->artisan('status:check-heartbeats');
    expect($monitor->checks()->count())->toBe(1);

    $this->travel(2)->minutes();
    $this->artisan('status:check-heartbeats');
    expect($monitor->fresh()->consecutive_failures)->toBe(1)
        ->and($monitor->fresh()->state)->toBe(MonitorState::Up);

    $this->travel(1)->minutes();
    $this->artisan('status:check-heartbeats');
    expect($monitor->fresh()->consecutive_failures)->toBe(1);

    $this->travel(5)->minutes();
    $this->artisan('status:check-heartbeats');
    expect($monitor->fresh()->state)->toBe(MonitorState::Down);
});
