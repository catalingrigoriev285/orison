<?php

namespace App\Http\Requests\Admin;

use App\Concerns\TranslatableRules;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ComponentGroupRequest extends FormRequest
{
    use TranslatableRules;

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            ...$this->translatable('name'),
            'sort_order' => ['required', 'integer', 'min:0'],
        ];
    }
}
