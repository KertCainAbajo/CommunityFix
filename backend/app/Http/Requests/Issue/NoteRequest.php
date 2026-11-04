<?php

namespace App\Http\Requests\Issue;

use Illuminate\Foundation\Http\FormRequest;

/** A required note, used for comments and for reopening a report. */
class NoteRequest extends FormRequest
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
