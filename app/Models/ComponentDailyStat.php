<?php

namespace App\Models;

use App\Enums\ComponentStatus;
use Carbon\CarbonImmutable;
use Database\Factories\ComponentDailyStatFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $component_id
 * @property CarbonImmutable $date
 * @property float|null $uptime_percent
 * @property int $downtime_minutes
 * @property ComponentStatus $worst_status
 */
#[Fillable(['component_id', 'date', 'uptime_percent', 'downtime_minutes', 'worst_status'])]
class ComponentDailyStat extends Model
{
    /** @use HasFactory<ComponentDailyStatFactory> */
    use HasFactory;

    /**
     * @return BelongsTo<Component, $this>
     */
    public function component(): BelongsTo
    {
        return $this->belongsTo(Component::class);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'date' => 'date',
            'uptime_percent' => 'float',
            'worst_status' => ComponentStatus::class,
        ];
    }
}
