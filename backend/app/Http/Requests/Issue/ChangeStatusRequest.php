<?php

namespace App\Http\Requests\Issue;

use App\Enums\IssueStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ChangeStatusRequest extends FormRequest
{
    public function rules(): array
    {
        $status = $this->input('status');
        $needsNote = is_string($status) && IssueStatus::tryFrom($status)?->requiresNote();

        return [
            'status' => ['required', Rule::enum(IssueStatus::class)],
            'note' => [Rule::requiredIf($needsNote), 'nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'status.*' => 'Choose a valid status.',
            'note.required' => 'Add a note so the resident knows what happened.',
            'note.*' => 'Keep notes under 1000 characters.',
        ];
    }

    public function status(): IssueStatus
    {
        return IssueStatus::from($this->validated('status'));
    }
}
