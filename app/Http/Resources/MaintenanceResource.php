<?php

namespace App\Http\Resources;

use App\Models\Component;
use App\Models\Maintenance;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Maintenance
 */
class MaintenanceResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->translate('title'),
            'description' => $this->translate('description'),
            'status' => $this->status->value,
            'scheduled_start' => $this->scheduled_start->toIso8601String(),
            'scheduled_end' => $this->scheduled_end->toIso8601String(),
            'components' => $this->whenLoaded('components', fn () => $this->components->map(fn (Component $component) => [
                'id' => $component->id,
                'name' => $component->translate('name'),
            ])->all()),
        ];
    }
}
