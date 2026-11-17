<?php

namespace App\Models;

use App\Concerns\HasTranslations;
use App\Enums\IncidentStatus;
use Carbon\CarbonImmutable;
use Database\Factories\IncidentUpdateFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $incident_id
 * @property int|null $user_id
 * @property IncidentStatus $status
 * @property array<string, string|null> $message
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 */
#[Fillable(['incident_id', 'user_id', 'status', 'message', 'created_at'])]
class IncidentUpdate extends Model
{
    /** @use HasFactory<IncidentUpdateFactory> */
    use HasFactory, HasTranslations;

    /**
     * @return BelongsTo<Incident, $this>
     */
    public function incident(): BelongsTo
    {
        return $this->belongsTo(Incident::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => IncidentStatus::class,
            'message' => 'array',
        ];
    }
}
