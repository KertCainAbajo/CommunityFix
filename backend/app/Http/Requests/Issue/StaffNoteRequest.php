<?php

namespace App\Http\Requests\Issue;

use Illuminate\Foundation\Http\FormRequest;

/** A required note: a staff update, or a resident saying why a report isn't fixed. */
class StaffNoteRequest extends FormRequest
{
    public function rules(): array
    {
        return ['note' => ['required', 'string', 'max:1000']];
    }

    public function messages(): array
    {
        return [
            'note.required' => 'Write a note first.',
            'note.*' => 'Keep notes under 1000 characters.',
        ];
    }
}
