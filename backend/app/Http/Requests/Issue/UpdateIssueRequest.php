<?php

namespace App\Http\Requests\Issue;

use App\Enums\IssuePriority;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateIssueRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'priority' => ['sometimes', Rule::enum(IssuePriority::class)],
            'department' => ['sometimes', 'nullable', 'string', 'max:80'],
        ];
    }

    public function messages(): array
    {
        return [
            'priority.*' => 'Choose a valid priority.',
            'department.*' => 'Keep the department under 80 characters.',
        ];
    }
}
