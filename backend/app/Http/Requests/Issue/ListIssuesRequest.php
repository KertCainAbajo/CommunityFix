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
            'sort' => ['nullable', Rule::in(['newest', 'oldest', 'supported', 'priority'])],
            'open' => ['nullable', 'boolean'],
            'mine' => ['nullable', 'boolean'],
            'page' => ['nullable', 'integer', 'min:1', 'max:1000000'],
        ];
    }

    public function filters(): array
    {
        $viewer = $this->user('sanctum');
        abort_if($this->boolean('mine') && ! $viewer, 401, 'Please log in first.');

        return [
            ...$this->safe()->only(['q', 'status', 'category']),
            'open' => $this->boolean('open'),
            'reporter_id' => $this->boolean('mine') ? $viewer->id : null,
        ];
    }
}
