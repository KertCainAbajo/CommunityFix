<?php

namespace App\Http\Requests\Issue;

use App\Enums\PhotoKind;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePhotoRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'kind' => ['required', Rule::in([PhotoKind::Before->value, PhotoKind::After->value])],
            'photo' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
        ];
    }

    public function messages(): array
    {
        return [
            'kind.*' => 'Choose before or after.',
            'photo.required' => 'Choose a photo first.',
            'photo.max' => 'Photos can be up to 4 MB.',
            'photo.*' => 'Photos must be JPEG, PNG or WebP images.',
        ];
    }

    public function kind(): PhotoKind
    {
        return PhotoKind::from($this->validated('kind'));
    }
}
