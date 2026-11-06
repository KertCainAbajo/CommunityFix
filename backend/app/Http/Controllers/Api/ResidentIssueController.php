<?php

namespace App\Http\Controllers\Api;

use App\Enums\IssueCategory;
use App\Enums\IssueStatus;
use App\Enums\PhotoKind;
use App\Http\Controllers\Api\Concerns\RespondsWithIssue;
use App\Http\Controllers\Controller;
use App\Http\Requests\Issue\StaffNoteRequest;
use App\Models\Issue;
use App\Services\IssueWorkflow;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

/** What a resident can do with a report they filed. */
class ResidentIssueController extends Controller
{
    use RespondsWithIssue;

    private const MAX_PHOTOS = 6;

    /** Editing stops once staff have reviewed it, so nobody verifies one problem and sees another. */
    public function update(Issue $issue, Request $request): JsonResponse
    {
        $this->authorizeOwner($issue, $request);
        $this->mustAwaitReview($issue);

        $issue->update($request->validate([
            'title' => ['required', 'string', 'min:5', 'max:120'],
            'description' => ['required', 'string', 'min:10', 'max:2000'],
            'category' => ['required', Rule::enum(IssueCategory::class)],
            'address' => ['required', 'string', 'min:3', 'max:200'],
        ]));

        return $this->issueResponse($issue);
    }

    public function destroy(Issue $issue, Request $request): Response
    {
        $this->authorizeOwner($issue, $request);
        $this->mustAwaitReview($issue);

        $paths = $issue->photos()->pluck('path')->all();
        $issue->delete();
        Storage::delete($paths);

        return response()->noContent();
    }

    public function comment(Issue $issue, StaffNoteRequest $request): JsonResponse
    {
        $this->authorizeOwner($issue, $request);
        $issue->addUpdate($request->user(), $request->validated('note'));

        return $this->issueResponse($issue, 201);
    }

    public function photo(Issue $issue, Request $request, IssueWorkflow $workflow): JsonResponse
    {
        $this->authorizeOwner($issue, $request);
        abort_if($issue->photos()->count() >= self::MAX_PHOTOS, 422, 'This report already has as many photos as it can hold.');

        $request->validate(
            ['photo' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:4096']],
            ['photo.max' => 'Photos can be up to 4 MB.', 'photo.*' => 'Photos must be JPEG, PNG or WebP images.'],
        );
        $workflow->addPhoto($issue, $request->file('photo'), PhotoKind::Evidence, $request->user());

        return $this->issueResponse($issue, 201);
    }

    public function feedback(Issue $issue, Request $request): JsonResponse
    {
        $this->authorizeOwner($issue, $request);
        abort_unless($issue->status === IssueStatus::Resolved, 409, 'You can rate a report once it has been resolved.');

        $data = $request->validate(
            ['rating' => ['required', 'integer', 'between:1,5'], 'note' => ['nullable', 'string', 'max:500']],
            ['rating.*' => 'Choose a rating from 1 to 5.', 'note.*' => 'Keep your comment under 500 characters.'],
        );
        $issue->update(['feedback_rating' => $data['rating'], 'feedback_note' => $data['note'] ?? null]);

        return $this->issueResponse($issue);
    }

    private function authorizeOwner(Issue $issue, Request $request): void
    {
        abort_unless($issue->user_id === $request->user()->id, 403, 'This is not your report.');
    }

    private function mustAwaitReview(Issue $issue): void
    {
        abort_unless($issue->status === IssueStatus::Reported, 409, 'Staff have already reviewed this report. Add a message instead.');
    }
}
