<?php

namespace App\Models;

use App\Enums\AlertEvent;
use Carbon\CarbonImmutable;
use Database\Factories\AlertDeliveryFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\MassPrunable;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $uuid
 * @property AlertEvent $event
 * @property array<string, mixed> $payload
 * @property string|null $target_url
 * @property int|null $response_code
 * @property int $attempts
 * @property string|null $error
 * @property CarbonImmutable|null $delivered_at
 * @property CarbonImmutable|null $failed_at
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 */
#[Fillable(['uuid', 'event', 'payload', 'target_url', 'response_code', 'attempts', 'error', 'delivered_at', 'failed_at'])]
class AlertDelivery extends Model
{
    /** @use HasFactory<AlertDeliveryFactory> */
    use HasFactory, MassPrunable;

    public function state(): string
    {
        return match (true) {
            $this->delivered_at !== null => 'delivered',
            $this->failed_at !== null => 'failed',
            default => 'pending',
        };
    }

    /**
     * @return Builder<static>
     */
    public function prunable(): Builder
    {
        return static::query()->where('created_at', '<', now()->subDays(180));
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'event' => AlertEvent::class,
            'payload' => 'array',
            'delivered_at' => 'datetime',
            'failed_at' => 'datetime',
        ];
    }
}
