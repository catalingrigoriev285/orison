<?php

namespace App\Http\Requests\Admin;

use DateTimeZone;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SettingsRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:60'],
            'description' => ['nullable', 'string', 'max:200'],
            'website_url' => ['nullable', 'url:http,https', 'max:255'],
            'accent_color' => ['required', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'default_locale' => ['required', Rule::in(config('status.locales'))],
            'timezone' => ['required', Rule::in(DateTimeZone::listIdentifiers())],
            'logo' => ['nullable', 'file', 'mimes:png,jpg,jpeg,webp,svg', 'max:1024'],
            'favicon' => ['nullable', 'file', 'mimes:png,ico,svg', 'max:512'],
            'background' => ['nullable', 'file', 'mimes:png,jpg,jpeg,webp', 'max:4096'],
            'show_background' => ['required', 'boolean'],
            'remove_logo' => ['boolean'],
            'remove_favicon' => ['boolean'],
            'remove_background' => ['boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'accent_color.regex' => __('Use a hex colour such as #0071e3.'),
        ];
    }
}
