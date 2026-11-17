<?php

namespace App\Models;

use App\Concerns\HasTranslations;
use App\Enums\ComponentStatus;
use App\Enums\IncidentStatus;
use App\Enums\MaintenanceStatus;
use Carbon\CarbonImmutable;
use Database\Factories\ComponentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int|null $component_group_id
 * @property array<string, string|null> $name
 * @property array<string, string|null>|null $description
 * @property string $slug
 * @property int $sort_order
 * @property bool $is_visible
 * @property ComponentStatus $status
 * @property ComponentStatus|null $status_override
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 */
#[Fillable(['component_group_id', 'name', 'description', 'slug', 'sort_order', 'is_visible', 'status', 'status_override'])]
class Component extends Model
{
    /** @use HasFactory<ComponentFactory> */
    use HasFactory, HasTranslations;

    /**
     * @return BelongsTo<ComponentGroup, $this>
     */
    public function group(): BelongsTo
    {
        return $this->belongsTo(ComponentGroup::class, 'component_group_id');
    }

    /**
     * @return HasMany<Monitor, $this>
     */
    public function monitors(): HasMany
    {
        return $this->hasMany(Monitor::class);
    }

    /**
     * @return HasMany<ComponentDailyStat, $this>
     */
    public function dailyStats(): HasMany
    {
        return $this->hasMany(ComponentDailyStat::class);
    }

    /**
     * @return BelongsToMany<Incident, $this>
     */
    public function incidents(): BelongsToMany
    {
        return $this->belongsToMany(Incident::class)->withPivot('component_status');
    }

    /**
     * @return BelongsToMany<Maintenance, $this>
     */
    public function maintenances(): BelongsToMany
    {
        return $this->belongsToMany(Maintenance::class);
    }

    public function isUnderMaintenance(): bool
    {
        return $this->maintenances()->where('status', MaintenanceStatus::InProgress)->exists();
    }

    /**
     * The worst status reported by an unresolved incident affecting this component.
     */
    public function openIncidentStatus(): ?ComponentStatus
    {
        $statuses = $this->incidents()
            ->where('incidents.status', '!=', IncidentStatus::Resolved)
            ->pluck('component_incident.component_status')
            ->map(fn (string $status) => ComponentStatus::from($status));

        return $statuses->isEmpty() ? null : ComponentStatus::worstOf($statuses);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'name' => 'array',
            'description' => 'array',
            'is_visible' => 'boolean',
            'status' => ComponentStatus::class,
            'status_override' => ComponentStatus::class,
        ];
    }
}
