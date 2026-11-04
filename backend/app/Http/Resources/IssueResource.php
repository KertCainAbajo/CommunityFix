<?php

namespace App\Http\Resources;

use App\Models\IssueUpdate;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class IssueResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $viewer = $request->user('sanctum');
        $isMine = $viewer?->id === $this->reporter_id;

        return [
            'id' => $this->id,
            'ref' => $this->ref(),
            'title' => $this->title,
            'description' => $this->description,
            'category' => $this->category,
            'address' => $this->address,
            'lat' => $this->lat,
            'lng' => $this->lng,
            'photo_url' => $this->photo_path ? Storage::url($this->photo_path) : null,
            'status' => $this->status,
            'priority' => $this->priority,
            'department' => $this->department,
            'support_count' => $this->supporters_count ?? 0,
            'supported' => (bool) ($this->supported ?? false),
            'is_mine' => $isMine,
            // Residents stay anonymous to the public.
            'reporter_name' => $this->when($isMine || $viewer?->isStaff(), fn () => $this->reporter->name),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'resolved_at' => $this->resolved_at,
            'timeline' => $this->whenLoaded('updates', fn () => $this->updates->map(
                fn (IssueUpdate $update) => $this->timelineEntry($update, $viewer),
            )),
        ];
    }

    private function timelineEntry(IssueUpdate $update, ?User $viewer): array
    {
        $author = $update->author;
        $showName = $author->isStaff() || $viewer?->isStaff() || $viewer?->id === $author->id;

        return [
            'id' => $update->id,
            'author' => $showName ? $author->name : null,
            'author_role' => match (true) {
                $author->isStaff() => 'Staff',
                $author->id === $this->reporter_id => 'Reporter',
                default => 'Resident',
            },
            'from_status' => $update->from_status,
            'to_status' => $update->to_status,
            'note' => $update->note,
            'created_at' => $update->created_at,
        ];
    }
}
