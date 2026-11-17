<?php

namespace App\Http\Requests\Admin;

use App\Concerns\TranslatableRules;
use App\Enums\ComponentStatus;
use App\Enums\IncidentImpact;
use App\Enums\IncidentStatus;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validates creating an incident (with its first update) and editing its details.
 */
class IncidentRequest extends FormRequest
{
    use TranslatableRules;

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $isCreating = $this->isMethod('post');

        return [
            ...$this->translatable('title'),
            'impact' => ['required', Rule::enum(IncidentImpact::class)],
            'started_at' => ['nullable', 'date'],
            'components' => ['array'],
            'components.*.id' => ['required', 'integer', Rule::exists('components', 'id')],
            'components.*.status' => ['required', Rule::enum(ComponentStatus::class)->except([ComponentStatus::UnderMaintenance])],
            ...($isCreating ? [
                'status' => ['required', Rule::enum(IncidentStatus::class)],
                ...$this->translatable('message', max: 5000),
            ] : []),
        ];
    }

    /**
     * @return array<int, string> component id => component status
     */
    public function componentStatuses(): array
    {
        return $this->safe()->collect('components')
            ->mapWithKeys(fn (array $item) => [(int) $item['id'] => (string) $item['status']])
            ->all();
    }
}
