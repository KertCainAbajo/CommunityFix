<?php

namespace App\Http\Requests\Staff;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateStaffRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'role' => ['sometimes', Rule::in(['staff', 'admin'])],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
