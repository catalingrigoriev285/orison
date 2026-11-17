<?php

namespace App\Models;

use App\Enums\MonitorState;
use App\Enums\MonitorType;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Database\Factories\MonitorFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int|null $component_id
 * @property string $name
 * @property MonitorType $type
 * @property string|null $url
 * @property string|null $host
 * @property int|null $port
 * @property string $method
 * @property int $expected_status
 * @property string|null $keyword
 * @property string|null $heartbeat_token
 * @property int $interval_seconds
 * @property int $timeout_seconds
 * @property int $failure_threshold
 * @property bool $is_active
 * @property MonitorState $state
 * @property int $consecutive_failures
 * @property CarbonImmutable|null $last_checked_at
 * @property CarbonImmutable|null $state_changed_at
 * @property int|null $last_response_ms
 * @property string|null $last_error
 * @property bool $notify
 * @property bool $auto_incident
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 */
#[Fillable([
    'component_id', 'name', 'type', 'url', 'host', 'port', 'method', 'expected_status', 'keyword',
    'heartbeat_token', 'interval_seconds', 'timeout_seconds', 'failure_threshold', 'is_active',
    'state', 'consecutive_failures', 'last_checked_at', 'state_changed_at', 'last_response_ms',
    'last_error', 'notify', 'auto_incident',
])]
class Monitor extends Model
{
    /** @use HasFactory<MonitorFactory> */
    use HasFactory;

    /**
     * @return BelongsTo<Component, $this>
     */
    public function component(): BelongsTo
    {
        return $this->belongsTo(Component::class);
    }

    /**
     * @return HasMany<MonitorCheck, $this>
     */
    public function checks(): HasMany
    {
        return $this->hasMany(MonitorCheck::class);
    }

    public function isDue(): bool
    {
        return $this->is_active
            && $this->type->isPolled()
            && ($this->last_checked_at === null
                || $this->last_checked_at->lte(now()->subSeconds($this->interval_seconds - 5)));
    }

    /**
     * Human readable target shown in the admin panel and in alerts.
     */
    public function target(): string
    {
        return match ($this->type) {
            MonitorType::Http, MonitorType::Keyword => (string) $this->url,
            MonitorType::Tcp => $this->host.':'.$this->port,
            MonitorType::Heartbeat => 'heartbeat',
        };
    }

    /**
     * Uptime percentage over checks since the given moment, or null without data.
     */
    public function uptimeSince(CarbonInterface $since): ?float
    {
        $checks = $this->checks()->where('checked_at', '>=', $since);
        $total = (clone $checks)->count();

        if ($total === 0) {
            return null;
        }

        return round($checks->where('is_up', true)->count() / $total * 100, 3);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => MonitorType::class,
            'state' => MonitorState::class,
            'is_active' => 'boolean',
            'notify' => 'boolean',
            'auto_incident' => 'boolean',
            'last_checked_at' => 'datetime',
            'state_changed_at' => 'datetime',
        ];
    }
}
