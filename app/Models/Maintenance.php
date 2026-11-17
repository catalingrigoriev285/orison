<?php

namespace App\Models;

use App\Concerns\HasTranslations;
use App\Enums\MaintenanceStatus;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Database\Factories\MaintenanceFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * @property int $id
 * @property array<string, string|null> $title
 * @property array<string, string|null>|null $description
 * @property CarbonImmutable $scheduled_start
 * @property CarbonImmutable $scheduled_end
 * @property MaintenanceStatus $status
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 */
#[Fillable(['title', 'description', 'scheduled_start', 'scheduled_end', 'status'])]
class Maintenance extends Model
{
    /** @use HasFactory<MaintenanceFactory> */
    use HasFactory, HasTranslations;

    /**
     * @return BelongsToMany<Component, $this>
     */
    public function components(): BelongsToMany
    {
        return $this->belongsToMany(Component::class);
    }

    /**
     * The status this window should have at the given moment.
     */
    public function expectedStatus(?CarbonInterface $at = null): MaintenanceStatus
    {
        $at ??= now();

        return match (true) {
            $at->lt($this->scheduled_start) => MaintenanceStatus::Scheduled,
            $at->lt($this->scheduled_end) => MaintenanceStatus::InProgress,
            default => MaintenanceStatus::Completed,
        };
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'title' => 'array',
            'description' => 'array',
            'scheduled_start' => 'datetime',
            'scheduled_end' => 'datetime',
            'status' => MaintenanceStatus::class,
        ];
    }
}
