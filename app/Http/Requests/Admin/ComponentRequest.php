<?php

namespace App\Http\Requests\Admin;

use App\Concerns\TranslatableRules;
use App\Enums\ComponentStatus;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ComponentRequest extends FormRequest
{
    use TranslatableRules;

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            ...$this->translatable('name'),
            ...$this->translatable('description', required: false, max: 500),
            'slug' => ['required', 'string', 'max:100', 'alpha_dash', Rule::unique('components', 'slug')->ignore($this->route('component'))],
            'component_group_id' => ['nullable', 'integer', Rule::exists('component_groups', 'id')],
            'sort_order' => ['required', 'integer', 'min:0'],
            'is_visible' => ['boolean'],
            'status_override' => ['nullable', Rule::enum(ComponentStatus::class)],
        ];
    }
}
