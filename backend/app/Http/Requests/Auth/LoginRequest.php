<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class LoginRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        // Older clients send `email`; the sign-in page sends `login` (an email or a phone number).
        if (! $this->has('login') && $this->has('email')) {
            $this->merge(['login' => $this->input('email')]);
        }
    }

    public function rules(): array
    {
        return [
            'login' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string', 'max:255'],
            'portal' => ['nullable', Rule::in(['resident', 'staff'])],
        ];
    }

    public function messages(): array
    {
        return [
            'login.*' => 'Enter your email or phone number.',
            'password.*' => 'Enter your password.',
            'portal.*' => 'Choose resident or staff.',
        ];
    }
}
