<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Components\RefreshComponentStatus;
use App\Actions\Monitoring\RecordCheckResult;
use App\Enums\MonitorState;
use App\Enums\MonitorType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\MonitorRequest;
use App\Models\Component;
use App\Models\Monitor;
use App\Models\MonitorCheck;
use App\Services\Monitoring\MonitorChecker;
use Carbon\CarbonInterface;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class MonitorController extends Controller
{
    private const RANGES = ['24h' => 1, '7d' => 7, '30d' => 30];

    public function __construct(private RefreshComponentStatus $refreshComponentStatus) {}

    public function index(): Response
    {
        return Inertia::render('admin/monitors/index', [
            'monitors' => Monitor::query()->with('component')->orderBy('name')->get()
                ->map(fn (Monitor $monitor) => [
                    ...self::summary($monitor),
                    'uptime24h' => $monitor->uptimeSince(now()->subDay()),
                    'uptime30d' => $monitor->uptimeSince(now()->subDays(30)),
                ])->all(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/monitors/form', [
            'monitor' => null,
            'components' => $this->componentOptions(),
        ]);
    }

    public function store(MonitorRequest $request): RedirectResponse
    {
        $monitor = Monitor::create([
            ...$request->validated(),
            'state' => $request->boolean('is_active', true) ? MonitorState::Pending : MonitorState::Paused,
            'state_changed_at' => now(),
            'heartbeat_token' => $request->enum('type', MonitorType::class) === MonitorType::Heartbeat ? Str::random(40) : null,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Monitor created.')]);

        return to_route('admin.monitors.show', $monitor);
    }

    public function show(Request $request, Monitor $monitor): Response
    {
        $range = array_key_exists((string) $request->query('range'), self::RANGES) ? (string) $request->query('range') : '24h';
        $since = now()->subDays(self::RANGES[$range]);

        $checks = $monitor->checks()
            ->where('checked_at', '>=', $since)
            ->orderBy('checked_at')
            ->get(['checked_at', 'response_time_ms', 'is_up', 'error']);

        $monitor->load('component');

        return Inertia::render('admin/monitors/show', [
            'monitor' => [
                ...self::summary($monitor),
                ...$monitor->only(['interval_seconds', 'timeout_seconds', 'failure_threshold', 'expected_status', 'method', 'keyword', 'notify', 'auto_incident']),
                'heartbeat_url' => $monitor->heartbeat_token ? route('api.heartbeat', $monitor->heartbeat_token) : null,
                'last_error' => $monitor->last_error,
                'state_changed_at' => $monitor->state_changed_at?->toIso8601String(),
            ],
            'range' => $range,
            'uptime' => [
                '24h' => $monitor->uptimeSince(now()->subDay()),
                '7d' => $monitor->uptimeSince(now()->subDays(7)),
                '30d' => $monitor->uptimeSince(now()->subDays(30)),
                '90d' => $monitor->uptimeSince(now()->subDays(90)),
            ],
            'chart' => $this->chartBuckets($checks, $since),
            'outages' => $this->outages($checks, $monitor->failure_threshold),
            'recentChecks' => $monitor->checks()->latest('checked_at')->limit(15)->get()
                ->map(fn (MonitorCheck $check) => [
                    'id' => $check->id,
                    'is_up' => $check->is_up,
                    'response_time_ms' => $check->response_time_ms,
                    'status_code' => $check->status_code,
                    'error' => $check->error,
                    'checked_at' => $check->checked_at->toIso8601String(),
                ])->all(),
        ]);
    }

    public function edit(Monitor $monitor): Response
    {
        return Inertia::render('admin/monitors/form', [
            'monitor' => [
                'id' => $monitor->id,
                ...$monitor->only([
                    'name', 'component_id', 'url', 'host', 'port', 'method', 'expected_status', 'keyword',
                    'interval_seconds', 'timeout_seconds', 'failure_threshold', 'is_active', 'notify', 'auto_incident',
                ]),
                'type' => $monitor->type->value,
            ],
            'components' => $this->componentOptions(),
        ]);
    }

    public function update(MonitorRequest $request, Monitor $monitor): RedirectResponse
    {
        $previousComponent = $monitor->component;
        $wasActive = $monitor->is_active;

        $monitor->fill($request->validated());

        if ($monitor->type === MonitorType::Heartbeat && $monitor->heartbeat_token === null) {
            $monitor->heartbeat_token = Str::random(40);
        }

        if ($wasActive !== $monitor->is_active) {
            $this->applyActivation($monitor);
        }

        $monitor->save();

        $this->refreshComponents($monitor, $previousComponent);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Monitor saved.')]);

        return to_route('admin.monitors.show', $monitor);
    }

    public function destroy(Monitor $monitor): RedirectResponse
    {
        $component = $monitor->component;

        $monitor->delete();

        if ($component) {
            $this->refreshComponentStatus->handle($component);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Monitor deleted.')]);

        return to_route('admin.monitors.index');
    }

    /**
     * Run a check right now instead of waiting for the scheduler.
     */
    public function check(Monitor $monitor, MonitorChecker $checker, RecordCheckResult $recordCheckResult): RedirectResponse
    {
        if (! $monitor->type->isPolled()) {
            Inertia::flash('toast', ['type' => 'info', 'message' => __('Heartbeat monitors are checked when the platform pings them.')]);

            return back();
        }

        $result = $checker->check($monitor);
        $recordCheckResult->handle($monitor, $result);

        Inertia::flash('toast', $result->isUp
            ? ['type' => 'success', 'message' => __('Check passed in :ms ms.', ['ms' => $result->responseTimeMs])]
            : ['type' => 'error', 'message' => __('Check failed: :error', ['error' => $result->error])]);

        return back();
    }

    /**
     * Pause or resume a monitor.
     */
    public function toggle(Monitor $monitor): RedirectResponse
    {
        $monitor->is_active = ! $monitor->is_active;
        $this->applyActivation($monitor);
        $monitor->save();

        $this->refreshComponents($monitor);

        Inertia::flash('toast', ['type' => 'success', 'message' => $monitor->is_active ? __('Monitor resumed.') : __('Monitor paused.')]);

        return back();
    }

    /**
     * Fields shared by every admin listing of a monitor.
     *
     * @return array<string, mixed>
     */
    public static function summary(Monitor $monitor): array
    {
        return [
            'id' => $monitor->id,
            'name' => $monitor->name,
            'type' => $monitor->type->value,
            'target' => $monitor->target(),
            'state' => $monitor->state->value,
            'is_active' => $monitor->is_active,
            'component' => $monitor->component ? ['id' => $monitor->component->id, 'name' => $monitor->component->translate('name')] : null,
            'last_checked_at' => $monitor->last_checked_at?->toIso8601String(),
            'last_response_ms' => $monitor->last_response_ms,
        ];
    }

    private function applyActivation(Monitor $monitor): void
    {
        $monitor->fill([
            'state' => $monitor->is_active ? MonitorState::Pending : MonitorState::Paused,
            'state_changed_at' => now(),
            'consecutive_failures' => 0,
        ]);
    }

    private function refreshComponents(Monitor $monitor, ?Component $previous = null): void
    {
        collect([$previous, $monitor->fresh()?->component])
            ->filter()
            ->unique('id')
            ->each(fn (Component $component) => $this->refreshComponentStatus->handle($component));
    }

    /**
     * @return array<int, array{id: int, name: string|null}>
     */
    private function componentOptions(): array
    {
        return Component::query()->orderBy('sort_order')->get()
            ->map(fn (Component $component) => ['id' => $component->id, 'name' => $component->translate('name')])
            ->all();
    }

    /**
     * Average response time and failures per time bucket for the chart.
     *
     * @param  Collection<int, MonitorCheck>  $checks
     * @return array<int, array{at: string, ms: int|null, failed: int, total: int}>
     */
    private function chartBuckets(Collection $checks, CarbonInterface $since, int $buckets = 96): array
    {
        $span = max(1, now()->getTimestamp() - $since->getTimestamp());
        $size = (int) ceil($span / $buckets);

        $grouped = $checks->groupBy(fn (MonitorCheck $check) => intdiv($check->checked_at->getTimestamp() - $since->getTimestamp(), $size));

        return collect(range(0, $buckets - 1))->map(function (int $index) use ($grouped, $since, $size) {
            /** @var Collection<int, MonitorCheck> $bucket */
            $bucket = $grouped->get($index, collect());
            $upTimes = $bucket->where('is_up', true)->pluck('response_time_ms')->filter(fn ($ms) => $ms !== null);

            return [
                'at' => $since->copy()->addSeconds($index * $size)->toIso8601String(),
                'ms' => $upTimes->isEmpty() ? null : (int) round((float) $upTimes->avg()),
                'failed' => $bucket->where('is_up', false)->count(),
                'total' => $bucket->count(),
            ];
        })->all();
    }

    /**
     * Periods where at least `threshold` consecutive checks failed, newest first.
     *
     * @param  Collection<int, MonitorCheck>  $checks
     * @return array<int, array{started_at: string, ended_at: string|null, duration_seconds: int, error: string|null}>
     */
    private function outages(Collection $checks, int $threshold): array
    {
        $outages = [];
        $failedRun = collect();

        foreach ([...$checks->all(), null] as $check) {
            if ($check !== null && ! $check->is_up) {
                $failedRun->push($check);

                continue;
            }

            /** @var MonitorCheck|null $first */
            $first = $failedRun->first();
            /** @var MonitorCheck|null $last */
            $last = $failedRun->last();

            if ($first !== null && $last !== null && $failedRun->count() >= $threshold) {
                $outages[] = [
                    'started_at' => $first->checked_at->toIso8601String(),
                    'ended_at' => $check?->checked_at->toIso8601String(),
                    'duration_seconds' => (int) $first->checked_at->diffInSeconds($check->checked_at ?? now(), true),
                    'error' => $last->error,
                ];
            }

            $failedRun = collect();
        }

        return array_reverse($outages);
    }
}
