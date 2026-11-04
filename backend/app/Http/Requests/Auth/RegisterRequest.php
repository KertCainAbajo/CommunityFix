<?php

namespace App\Http\Requests\Auth;

use App\Http\Requests\Auth\Concerns\NormalizesEmail;
use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    use NormalizesEmail;

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:80'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'max:72'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.*' => 'Enter your name.',
            'email.unique' => 'That email already has an account. Try logging in.',
            'email.*' => 'Enter a valid email address.',
            'password.*' => 'Use a password of 8 to 72 characters.',
        ];
    }
}
