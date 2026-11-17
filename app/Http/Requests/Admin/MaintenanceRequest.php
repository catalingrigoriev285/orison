<?php

namespace App\Http\Requests\Admin;

use App\Concerns\TranslatableRules;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class MaintenanceRequest extends FormRequest
{
    use TranslatableRules;

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            ...$this->translatable('title'),
            ...$this->translatable('description', required: false, max: 5000),
            'scheduled_start' => ['required', 'date'],
            'scheduled_end' => ['required', 'date', 'after:scheduled_start'],
            'components' => ['array'],
            'components.*' => ['integer', Rule::exists('components', 'id')],
        ];
    }
}
