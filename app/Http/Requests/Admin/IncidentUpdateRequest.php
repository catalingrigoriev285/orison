<?php

namespace App\Http\Requests\Admin;

use App\Concerns\TranslatableRules;
use App\Enums\IncidentStatus;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class IncidentUpdateRequest extends FormRequest
{
    use TranslatableRules;

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'status' => ['required', Rule::enum(IncidentStatus::class)],
            ...$this->translatable('message', max: 5000),
        ];
    }
}
