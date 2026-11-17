<?php

namespace App\Models;

use App\Concerns\HasTranslations;
use App\Enums\IncidentImpact;
use App\Enums\IncidentStatus;
use Carbon\CarbonImmutable;
use Database\Factories\IncidentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * @property int $id
 * @property int|null $monitor_id
 * @property array<string, string|null> $title
 * @property IncidentImpact $impact
 * @property IncidentStatus $status
 * @property bool $is_automatic
 * @property CarbonImmutable $started_at
 * @property CarbonImmutable|null $resolved_at
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 */
#[Fillable(['monitor_id', 'title', 'impact', 'status', 'is_automatic', 'started_at', 'resolved_at'])]
class Incident extends Model
{
    /** @use HasFactory<IncidentFactory> */
    use HasFactory, HasTranslations;

    /**
     * @return BelongsTo<Monitor, $this>
     */
    public function monitor(): BelongsTo
    {
        return $this->belongsTo(Monitor::class);
    }

    /**
     * @return HasMany<IncidentUpdate, $this>
     */
    public function updates(): HasMany
    {
        return $this->hasMany(IncidentUpdate::class)->latest()->latest('id');
    }

    /**
     * @return HasOne<IncidentUpdate, $this>
     */
    public function latestUpdate(): HasOne
    {
        return $this->hasOne(IncidentUpdate::class)->latestOfMany();
    }

    /**
     * @return BelongsToMany<Component, $this>
     */
    public function components(): BelongsToMany
    {
        return $this->belongsToMany(Component::class)->withPivot('component_status');
    }

    /**
     * @param  Builder<Incident>  $query
     */
    public function scopeUnresolved(Builder $query): void
    {
        $query->where('status', '!=', IncidentStatus::Resolved);
    }

    public function isResolved(): bool
    {
        return $this->status === IncidentStatus::Resolved;
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'title' => 'array',
            'impact' => IncidentImpact::class,
            'status' => IncidentStatus::class,
            'is_automatic' => 'boolean',
            'started_at' => 'datetime',
            'resolved_at' => 'datetime',
        ];
    }
}
