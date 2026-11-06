<?php

namespace App\Http\Requests\Auth;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/** A resident signing up. The email is required because it's how a lost password is recovered. */
class RegisterRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $email = $this->input('email');
        $phone = $this->input('phone');

        $this->merge([
            'email' => is_string($email) && trim($email) !== '' ? Str::lower(trim($email)) : null,
            // An unreadable number stays as typed, so the format rule below can reject it.
            'phone' => is_string($phone) && trim($phone) !== '' ? (User::normalizePhone($phone) ?? $phone) : null,
        ]);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:80'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'phone' => ['nullable', 'string', 'regex:/^\+\d{10,15}$/', Rule::unique('users', 'phone')],
            'password' => ['required', 'string', 'min:8', 'max:72'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.*' => 'Enter your name.',
            'email.unique' => 'That email already has an account. Try signing in.',
            'phone.unique' => 'That phone number already has an account. Try signing in.',
            'email.*' => 'Enter a valid email address.',
            'phone.*' => 'Enter a valid phone number, like 0917 123 4567.',
            'password.min' => 'Use at least 8 characters for your password.',
            'password.*' => 'Choose a password up to 72 characters.',
        ];
    }

    /** @return array{name: string, email: ?string, phone: ?string, password: string} */
    public function account(): array
    {
        return $this->safe()->only(['name', 'email', 'phone', 'password']);
    }
}
