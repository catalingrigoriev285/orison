<?php

namespace App\Http\Resources;

use App\Models\Component;
use App\Models\Incident;
use App\Models\IncidentUpdate;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Incident
 */
class IncidentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->translate('title'),
            'impact' => $this->impact->value,
            'status' => $this->status->value,
            'started_at' => $this->started_at->toIso8601String(),
            'resolved_at' => $this->resolved_at?->toIso8601String(),
            'components' => $this->whenLoaded('components', fn () => $this->components->map(fn (Component $component) => [
                'id' => $component->id,
                'name' => $component->translate('name'),
                'status' => $component->getRelationValue('pivot')?->getAttribute('component_status'),
            ])->all()),
            'updates' => $this->whenLoaded('updates', fn () => $this->updates
                ->map(fn (IncidentUpdate $update) => IncidentUpdateResource::make($update)->resolve($request))
                ->all()),
        ];
    }
}
