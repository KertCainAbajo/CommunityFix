<?php

namespace App\Http\Requests\Auth;

use App\Http\Requests\Auth\Concerns\NormalizesEmail;
use Illuminate\Foundation\Http\FormRequest;

class ForgotPasswordRequest extends FormRequest
{
    use NormalizesEmail;

    public function rules(): array
    {
        return ['email' => ['required', 'email', 'max:255']];
    }

    public function messages(): array
    {
        return ['email.*' => 'Enter a valid email address.'];
    }
}
