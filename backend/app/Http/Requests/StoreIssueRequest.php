<?php

namespace App\Http\Requests;

use App\Enums\IssueCategory;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreIssueRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'min:5', 'max:120'],
            'description' => ['required', 'string', 'min:10', 'max:2000'],
            'address' => ['required', 'string', 'min:3', 'max:200'],
            'category' => ['required', Rule::enum(IssueCategory::class)],
            'lat' => ['nullable', 'required_with:lng', 'numeric', 'between:-90,90'],
            'lng' => ['nullable', 'required_with:lat', 'numeric', 'between:-180,180'],
            // `mimes` inspects the file's bytes, not the name the client sent.
            'photo' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
        ];
    }

    public function messages(): array
    {
        return [
            'title.*' => 'Give the problem a title of 5 to 120 characters.',
            'description.*' => 'Describe the problem in 10 to 2000 characters.',
            'address.*' => 'Tell us where the problem is.',
            'category.*' => 'Choose a category.',
            'lat.*' => 'That map location is not valid.',
            'lng.*' => 'That map location is not valid.',
            'photo.max' => 'Photos can be up to 4 MB.',
            'photo.*' => 'Photos must be JPEG, PNG or WebP images.',
        ];
    }
}
