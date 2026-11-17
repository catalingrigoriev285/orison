<?php

namespace App\Http\Requests\Admin;

use App\Enums\MonitorType;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class MonitorRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $type = $this->enum('type', MonitorType::class);
        $isHttp = in_array($type, [MonitorType::Http, MonitorType::Keyword], true);

        return [
            'name' => ['required', 'string', 'max:255'],
            'component_id' => ['nullable', 'integer', Rule::exists('components', 'id')],
            'type' => ['required', Rule::enum(MonitorType::class)],
            'url' => [Rule::requiredIf($isHttp), 'nullable', 'url:http,https', 'max:2048'],
            'method' => [Rule::requiredIf($isHttp), 'nullable', Rule::in(['GET', 'HEAD', 'POST'])],
            'expected_status' => [Rule::requiredIf($isHttp), 'nullable', 'integer', 'between:100,599'],
            'keyword' => [Rule::requiredIf($type === MonitorType::Keyword), 'nullable', 'string', 'max:255'],
            'host' => [Rule::requiredIf($type === MonitorType::Tcp), 'nullable', 'string', 'max:255'],
            'port' => [Rule::requiredIf($type === MonitorType::Tcp), 'nullable', 'integer', 'between:1,65535'],
            'interval_seconds' => ['required', 'integer', 'between:30,86400'],
            'timeout_seconds' => ['required', 'integer', 'between:1,60'],
            'failure_threshold' => ['required', 'integer', 'between:1,10'],
            'is_active' => ['boolean'],
            'notify' => ['boolean'],
            'auto_incident' => ['boolean'],
        ];
    }
}
