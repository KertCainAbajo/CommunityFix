<?php

namespace App\Http\Requests\Issue;

use App\Enums\IssueCategory;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreIssueRequest extends FormRequest
{
    public const MAX_PHOTOS = 3;

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'min:5', 'max:120'],
            'description' => ['required', 'string', 'min:10', 'max:2000'],
            'address' => ['required', 'string', 'min:3', 'max:200'],
            'category' => ['required', Rule::enum(IssueCategory::class)],
            'lat' => ['nullable', 'required_with:lng', 'numeric', 'between:-90,90'],
            'lng' => ['nullable', 'required_with:lat', 'numeric', 'between:-180,180'],
            'contact_name' => ['nullable', 'string', 'max:80'],
            'contact_email' => ['nullable', 'email', 'max:255'],
            'contact_phone' => ['nullable', 'string', 'max:30', 'regex:/^[0-9+()\-\s]+$/'],
            'photos' => ['nullable', 'array', 'max:'.self::MAX_PHOTOS],
            // `mimes` inspects the file's bytes, not the name the client sent.
            'photos.*' => ['file', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
            // A field people never see: only bots fill it in.
            'website' => ['prohibited'],
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
            'contact_name.*' => 'Keep your name under 80 characters.',
            'contact_email.*' => 'Enter a valid email address, or leave it empty.',
            'contact_phone.*' => 'Enter a valid phone number, or leave it empty.',
            'photos.max' => 'You can add up to '.self::MAX_PHOTOS.' photos.',
            'photos.*.max' => 'Photos can be up to 4 MB.',
            'photos.*' => 'Photos must be JPEG, PNG or WebP images.',
            'website.*' => 'That report could not be accepted.',
        ];
    }

    public function details(): array
    {
        return $this->safe()->except(['photos', 'website']);
    }
}
