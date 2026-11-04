<?php

namespace App\Http\Requests\Issue;

use App\Enums\IssueCategory;
use App\Enums\IssueStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListIssuesRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'q' => ['nullable', 'string', 'max:200'],
            'status' => ['nullable', Rule::enum(IssueStatus::class)],
            'category' => ['nullable', Rule::enum(IssueCategory::class)],
            'sort' => ['nullable', Rule::in(['newest', 'oldest', 'priority'])],
            'open' => ['nullable', 'boolean'],
            'page' => ['nullable', 'integer', 'min:1', 'max:1000000'],
        ];
    }

    public function filters(): array
    {
        return [...$this->safe()->only(['q', 'status', 'category']), 'open' => $this->boolean('open')];
    }
}
