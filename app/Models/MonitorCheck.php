<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Database\Factories\MonitorCheckFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\MassPrunable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $monitor_id
 * @property bool $is_up
 * @property int|null $response_time_ms
 * @property int|null $status_code
 * @property string|null $error
 * @property CarbonImmutable $checked_at
 */
#[Fillable(['monitor_id', 'is_up', 'response_time_ms', 'status_code', 'error', 'checked_at'])]
class MonitorCheck extends Model
{
    /** @use HasFactory<MonitorCheckFactory> */
    use HasFactory, MassPrunable;

    public $timestamps = false;

    /**
     * @return BelongsTo<Monitor, $this>
     */
    public function monitor(): BelongsTo
    {
        return $this->belongsTo(Monitor::class);
    }

    /**
     * @return Builder<static>
     */
    public function prunable(): Builder
    {
        return static::query()->where('checked_at', '<', now()->subDays(config('status.check_retention_days')));
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_up' => 'boolean',
            'checked_at' => 'datetime',
        ];
    }
}
