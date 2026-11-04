<?php

namespace App\Http\Requests\Staff;

use App\Http\Requests\Auth\Concerns\NormalizesEmail;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreStaffRequest extends FormRequest
{
    use NormalizesEmail;

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:80'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'role' => ['required', Rule::in(['staff', 'admin'])],
        ];
    }

    public function messages(): array
    {
        return [
            'name.*' => 'Enter their name.',
            'email.unique' => 'That email already has an account.',
            'email.*' => 'Enter a valid email address.',
            'role.*' => 'Choose a role.',
        ];
    }
}
