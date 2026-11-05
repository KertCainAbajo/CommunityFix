<?php

namespace App\Http\Resources;

use App\Enums\PhotoKind;
use App\Models\IssuePhoto;
use App\Models\IssueUpdate;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class IssueResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $viewer = $request->user('sanctum');
        $isStaff = (bool) $viewer?->isStaff();
        $isOwner = $viewer && $this->user_id === $viewer->id;

        return [
            'id' => $this->id,
            'ref' => $this->ref(),
            'title' => $this->title,
            'description' => $this->description,
            'category' => $this->category,
            'address' => $this->address,
            'lat' => $this->lat,
            'lng' => $this->lng,
            'photos' => $this->photos->map(fn (IssuePhoto $photo) => [
                'id' => $photo->id,
                'kind' => $photo->kind,
                'label' => $photo->kind->label(),
                'url' => Storage::url($photo->path),
            ]),
            'photo_url' => $this->coverPhotoUrl(),
            'status' => $this->status,
            'priority' => $this->priority,
            'department' => $this->department,
            // The tracking code works like a password, and contact details are private.
            'tracking_code' => $this->when($isStaff || $isOwner, $this->tracking_code),
            'contact' => $this->when($isStaff, fn () => [
                'name' => $this->contact_name,
                'email' => $this->contact_email,
                'phone' => $this->contact_phone,
            ]),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'resolved_at' => $this->resolved_at,
            'timeline' => $this->whenLoaded('updates', fn () => $this->updates->map(
                fn (IssueUpdate $update) => [
                    'id' => $update->id,
                    'author' => $update->author?->name,
                    'author_role' => $update->author_id ? 'Staff' : 'Resident',
                    'from_status' => $update->from_status,
                    'to_status' => $update->to_status,
                    'note' => $update->note,
                    'created_at' => $update->created_at,
                ],
            )),
        ];
    }

    private function coverPhotoUrl(): ?string
    {
        $photo = $this->photos->firstWhere('kind', PhotoKind::After) ?? $this->photos->first();

        return $photo ? Storage::url($photo->path) : null;
    }
}
