<?php

use App\Models\User;
use App\Services\Queue\QueueMonitor;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

beforeEach(function () {
    config(['queue.default' => 'database']);
    Cache::forget(QueueMonitor::RECENT_KEY);
    Cache::forget(QueueMonitor::WORKERS_KEY);
    $this->actingAs(User::factory()->create());
});

function queueJob(array $overrides = []): void
{
    DB::table('jobs')->insert([
        'queue' => 'default',
        'payload' => json_encode(['displayName' => 'App\\Jobs\\SendAlertWebhook', 'job' => 'Illuminate\\Queue\\CallQueuedHandler@call']),
        'attempts' => 0,
        'reserved_at' => null,
        'available_at' => time(),
        'created_at' => time(),
        ...$overrides,
    ]);
}

function failedJob(): string
{
    $uuid = (string) Str::uuid();

    DB::table('failed_jobs')->insert([
        'uuid' => $uuid,
        'connection' => 'database',
        'queue' => 'default',
        'payload' => json_encode(['uuid' => $uuid, 'displayName' => 'App\\Jobs\\RunMonitorCheck', 'job' => 'Illuminate\\Queue\\CallQueuedHandler@call', 'data' => []]),
        'exception' => "RuntimeException: Webhook responded with HTTP 500\n#0 trace",
        'failed_at' => now(),
    ]);

    return $uuid;
}

test('the queue page lists waiting, delayed, running, stuck and failed jobs', function () {
    queueJob();
    queueJob(['available_at' => time() + 600]);
    queueJob(['reserved_at' => time() - 5, 'attempts' => 1]);
    queueJob(['reserved_at' => time() - 3600, 'attempts' => 1, 'queue' => 'checks']);
    failedJob();

    $this->get(route('admin.queue.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/queue/index')
            ->where('queue.supported', true)
            ->where('queue.totals', ['waiting' => 1, 'delayed' => 1, 'running' => 1, 'stuck' => 1, 'failed' => 1])
            ->has('queue.jobs', 4)
            ->where('queue.jobs.0.state', 'running')
            ->where('queue.jobs.0.name', 'SendAlertWebhook')
            ->has('queue.queues', 2)
            ->where('queue.failed.0.name', 'RunMonitorCheck')
            ->where('queue.failed.0.error', 'RuntimeException: Webhook responded with HTTP 500'));
});

test('a failed job can be retried or deleted', function () {
    $retried = failedJob();
    $deleted = failedJob();

    $this->post(route('admin.queue.retry', $retried))->assertRedirect();
    expect(DB::table('failed_jobs')->where('uuid', $retried)->exists())->toBeFalse()
        ->and(DB::table('jobs')->count())->toBe(1);

    $this->delete(route('admin.queue.forget', $deleted))->assertRedirect();
    expect(DB::table('failed_jobs')->count())->toBe(0);
});

test('all failed jobs can be retried or deleted at once', function () {
    failedJob();
    failedJob();

    $this->post(route('admin.queue.retry-all'))->assertRedirect();
    expect(DB::table('failed_jobs')->count())->toBe(0)
        ->and(DB::table('jobs')->count())->toBe(2);

    failedJob();
    $this->delete(route('admin.queue.flush'))->assertRedirect();
    expect(DB::table('failed_jobs')->count())->toBe(0);
});

test('processed jobs and worker heartbeats are recorded from queue events', function () {
    config(['queue.default' => 'sync']);

    dispatch(function () {
        // A job that simply succeeds.
    });

    $recent = Cache::get(QueueMonitor::RECENT_KEY);

    expect($recent)->toHaveCount(1)
        ->and($recent[0]['status'])->toBe('processed')
        ->and($recent[0]['duration_ms'])->toBeInt()
        ->and(app(QueueMonitor::class)->snapshot()['workers'])->toHaveCount(1);
});
