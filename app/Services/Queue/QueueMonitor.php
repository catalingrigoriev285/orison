<?php

namespace App\Services\Queue;

use Illuminate\Contracts\Queue\Job;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

/**
 * Live view of the queue for Admin → Queue.
 *
 * Waiting, delayed and running jobs come straight from the database queue
 * tables (`jobs`, `failed_jobs`). Two things the tables cannot tell are
 * recorded from queue events (see AppServiceProvider): which workers are
 * alive (a heartbeat written while they loop) and what finished recently
 * (a short ring buffer, since a processed job is deleted from `jobs`).
 */
class QueueMonitor
{
    public const WORKERS_KEY = 'orison.queue.workers';

    public const RECENT_KEY = 'orison.queue.recent';

    /** How many finished jobs the "recent activity" list keeps. */
    public const RECENT_SIZE = 30;

    /** A worker that has not looped for this long counts as offline. */
    public const WORKER_TIMEOUT_SECONDS = 30;

    /** Heartbeats are written at most this often per worker process. */
    private const HEARTBEAT_EVERY_SECONDS = 5;

    private const JOBS_LIMIT = 100;

    private const FAILED_LIMIT = 50;

    private static int $lastHeartbeat = 0;

    /** @var array<string, float> job id => microtime it started */
    private static array $started = [];

    /**
     * Called on every worker loop; throttled so idle workers barely write.
     */
    public function heartbeat(?string $connection = null, ?string $queue = null): void
    {
        if (time() - self::$lastHeartbeat < self::HEARTBEAT_EVERY_SECONDS) {
            return;
        }

        self::$lastHeartbeat = time();

        $this->safely(function () use ($connection, $queue) {
            $workers = $this->liveWorkers();
            $workers[$this->workerId()] = [
                'host' => (string) gethostname(),
                'pid' => (int) getmypid(),
                'connection' => $connection,
                'queue' => $queue,
                'seen_at' => time(),
            ];

            Cache::put(self::WORKERS_KEY, $workers, now()->addHour());
        });
    }

    public function jobStarted(Job $job): void
    {
        self::$started[$this->jobKey($job)] = microtime(true);
    }

    /**
     * @param  'processed'|'released'|'retrying'|'failed'  $status
     */
    public function jobFinished(Job $job, string $status, ?Throwable $exception = null): void
    {
        $key = $this->jobKey($job);
        $started = self::$started[$key] ?? null;
        unset(self::$started[$key]);

        $this->safely(function () use ($job, $status, $exception, $started) {
            $recent = Cache::get(self::RECENT_KEY, []);

            array_unshift($recent, [
                'id' => (string) Str::uuid(),
                'name' => $this->shortName($job->resolveName()),
                'queue' => $job->getQueue(),
                'status' => $status,
                'attempts' => $job->attempts(),
                'duration_ms' => $started ? (int) round((microtime(true) - $started) * 1000) : null,
                'error' => $exception ? Str::limit($exception->getMessage(), 300) : null,
                'finished_at' => now()->toIso8601String(),
            ]);

            Cache::put(self::RECENT_KEY, array_slice($recent, 0, self::RECENT_SIZE), now()->addDay());
        });

        $this->heartbeat($job->getConnectionName(), $job->getQueue());
    }

    /**
     * Everything Admin → Queue shows, in one array.
     *
     * @return array<string, mixed>
     */
    public function snapshot(): array
    {
        $connection = (string) config('queue.default');
        $driver = (string) config("queue.connections.{$connection}.driver");

        $snapshot = [
            'connection' => $connection,
            'driver' => $driver,
            'supported' => $driver === 'database',
            'workers' => array_values(array_map(fn (array $worker) => [
                ...$worker,
                'seen_at' => date(DATE_ATOM, $worker['seen_at']),
            ], $this->liveWorkers())),
            'recent' => Cache::get(self::RECENT_KEY, []),
            'queues' => [],
            'totals' => ['waiting' => 0, 'delayed' => 0, 'running' => 0, 'stuck' => 0, 'failed' => 0],
            'jobs' => [],
            'failed' => [],
            'generated_at' => now()->toIso8601String(),
        ];

        if ($snapshot['supported']) {
            $snapshot = [...$snapshot, ...$this->databaseState($connection)];
        }

        try {
            $snapshot['failed'] = $this->failedJobs();
            $snapshot['totals']['failed'] = $this->failedTable()->count();

            foreach ($this->failedTable()->selectRaw('queue, count(*) as total')->groupBy('queue')->pluck('total', 'queue') as $queue => $total) {
                $snapshot['queues'][$queue] ??= $this->emptyQueue($queue);
                $snapshot['queues'][$queue]['failed'] = (int) $total;
            }
        } catch (Throwable) {
            // No failed_jobs table (failed jobs not stored in the database).
        }

        ksort($snapshot['queues']);
        $snapshot['queues'] = array_values($snapshot['queues']);

        return $snapshot;
    }

    /**
     * @return array{queues: array<string, array<string, mixed>>, totals: array<string, int>, jobs: list<array<string, mixed>>}
     */
    private function databaseState(string $connection): array
    {
        $now = time();
        $retryAfter = (int) config("queue.connections.{$connection}.retry_after", 90);
        $table = DB::connection(config("queue.connections.{$connection}.connection"))
            ->table((string) config("queue.connections.{$connection}.table", 'jobs'));

        // Aliases end in "_jobs": "delayed" is a reserved word in MySQL.
        $rows = (clone $table)
            ->selectRaw('queue')
            ->selectRaw('sum(case when reserved_at is null and available_at <= ? then 1 else 0 end) as waiting_jobs', [$now])
            ->selectRaw('sum(case when reserved_at is null and available_at > ? then 1 else 0 end) as delayed_jobs', [$now])
            ->selectRaw('sum(case when reserved_at is not null and reserved_at > ? then 1 else 0 end) as running_jobs', [$now - $retryAfter])
            ->selectRaw('sum(case when reserved_at is not null and reserved_at <= ? then 1 else 0 end) as stuck_jobs', [$now - $retryAfter])
            ->selectRaw('min(case when reserved_at is null and available_at <= ? then available_at end) as oldest_waiting', [$now])
            ->groupBy('queue')
            ->get();

        $queues = [];
        $totals = ['waiting' => 0, 'delayed' => 0, 'running' => 0, 'stuck' => 0, 'failed' => 0];

        foreach ($rows as $row) {
            $queue = $this->emptyQueue($row->queue);

            foreach (['waiting', 'delayed', 'running', 'stuck'] as $state) {
                $queue[$state] = (int) $row->{$state.'_jobs'};
                $totals[$state] += $queue[$state];
            }

            $queue['oldest_waiting_at'] = $row->oldest_waiting ? date(DATE_ATOM, (int) $row->oldest_waiting) : null;
            $queues[$row->queue] = $queue;
        }

        $jobs = (clone $table)
            ->orderByRaw('case when reserved_at is null then 1 else 0 end')
            ->orderBy('available_at')
            ->orderBy('id')
            ->limit(self::JOBS_LIMIT)
            ->get(['id', 'queue', 'payload', 'attempts', 'reserved_at', 'available_at', 'created_at'])
            ->map(function (object $row) use ($now, $retryAfter) {
                $state = match (true) {
                    $row->reserved_at !== null && $row->reserved_at <= $now - $retryAfter => 'stuck',
                    $row->reserved_at !== null => 'running',
                    $row->available_at > $now => 'delayed',
                    default => 'waiting',
                };

                return [
                    'id' => (int) $row->id,
                    'queue' => $row->queue,
                    'name' => $this->payloadName($row->payload),
                    'state' => $state,
                    'attempts' => (int) $row->attempts,
                    'created_at' => date(DATE_ATOM, (int) $row->created_at),
                    'available_at' => date(DATE_ATOM, (int) $row->available_at),
                    'reserved_at' => $row->reserved_at ? date(DATE_ATOM, (int) $row->reserved_at) : null,
                ];
            })
            ->all();

        return ['queues' => $queues, 'totals' => $totals, 'jobs' => $jobs];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function failedJobs(): array
    {
        return $this->failedTable()
            ->orderByDesc('failed_at')
            ->orderByDesc('id')
            ->limit(self::FAILED_LIMIT)
            ->get(['uuid', 'connection', 'queue', 'payload', 'exception', 'failed_at'])
            ->map(fn (object $row) => [
                'uuid' => $row->uuid,
                'queue' => $row->queue,
                'name' => $this->payloadName($row->payload),
                'error' => Str::limit(strtok((string) $row->exception, "\n") ?: '', 300),
                'failed_at' => $row->failed_at ? date(DATE_ATOM, strtotime((string) $row->failed_at.' UTC')) : null,
            ])
            ->all();
    }

    private function failedTable(): Builder
    {
        return DB::connection(config('queue.failed.database'))
            ->table((string) config('queue.failed.table', 'failed_jobs'));
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private function liveWorkers(): array
    {
        $workers = Cache::get(self::WORKERS_KEY, []);

        return array_filter(
            is_array($workers) ? $workers : [],
            fn ($worker) => is_array($worker) && time() - (int) ($worker['seen_at'] ?? 0) <= self::WORKER_TIMEOUT_SECONDS,
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function emptyQueue(string $queue): array
    {
        return ['name' => $queue, 'waiting' => 0, 'delayed' => 0, 'running' => 0, 'stuck' => 0, 'failed' => 0, 'oldest_waiting_at' => null];
    }

    private function payloadName(string $payload): string
    {
        $decoded = json_decode($payload, true);

        return $this->shortName((string) ($decoded['displayName'] ?? $decoded['job'] ?? 'Unknown job'));
    }

    /** "App\Jobs\SendAlertWebhook" → "SendAlertWebhook". */
    private function shortName(string $name): string
    {
        return class_exists($name) || str_contains($name, '\\') ? class_basename($name) : $name;
    }

    private function workerId(): string
    {
        return gethostname().':'.getmypid();
    }

    private function jobKey(Job $job): string
    {
        return $job->getConnectionName().':'.$job->getJobId();
    }

    /**
     * Monitoring must never break a worker or a page.
     */
    private function safely(callable $callback): void
    {
        try {
            $callback();
        } catch (Throwable $exception) {
            report($exception);
        }
    }
}
