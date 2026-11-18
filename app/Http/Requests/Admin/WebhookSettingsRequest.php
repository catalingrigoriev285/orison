<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class WebhookSettingsRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'url' => ['nullable', 'url:http,https', 'max:2048'],
            // HMAC key shared with the receiving application; a URL needs one.
            'secret' => ['nullable', 'required_with:url', 'string', 'min:32', 'max:255'],
        ];
    }
}
