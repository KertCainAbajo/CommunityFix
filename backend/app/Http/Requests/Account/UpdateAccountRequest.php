<?php

namespace App\Http\Requests\Account;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class UpdateAccountRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $email = $this->input('email');
        $phone = $this->input('phone');

        $this->merge([
            'email' => is_string($email) && trim($email) !== '' ? Str::lower(trim($email)) : null,
            'phone' => is_string($phone) && trim($phone) !== '' ? (User::normalizePhone($phone) ?? $phone) : null,
        ]);
    }

    public function rules(): array
    {
        $user = $this->user();

        return [
            'name' => ['required', 'string', 'min:2', 'max:80'],
            // Older phone-only accounts may stay that way, but nobody can remove an email: it's how passwords are recovered.
            'email' => [$user->email ? 'required' : 'nullable', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user)],
            'phone' => ['nullable', 'string', 'regex:/^\+\d{10,15}$/', Rule::unique('users', 'phone')->ignore($user)],
            'current_password' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.*' => 'Enter your name.',
            'email.required' => 'Your account needs an email, so you can recover your password.',
            'email.unique' => 'That email already has an account.',
            'email.*' => 'Enter a valid email address.',
            'phone.unique' => 'That phone number already has an account.',
            'phone.*' => 'Enter a valid phone number, like 0917 123 4567.',
        ];
    }
}
