<?php

namespace App\Http\Controllers\Api;

use App\Enums\IssueStatus;
use App\Http\Controllers\Controller;
use App\Models\Issue;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class IssueActionController extends Controller
{
    private const NOTE_RULES = ['nullable', 'string', 'max:1000'];

    public function status(Issue $issue, Request $request): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::enum(IssueStatus::class)],
            'note' => self::NOTE_RULES,
        ], ['status.*' => 'Choose a valid status.']);

        $to = IssueStatus::from($data['status']);
        $note = trim($data['note'] ?? '');

        abort_unless(
            in_array($to, $issue->status->transitions(), true),
            409,
            'A report that is '.strtolower($issue->status->label()).' cannot move to that status.',
        );
        abort_if($to->requiresNote() && $note === '', 422, 'Add a note so the resident knows what happened.');

        $issue->moveTo($to, $request->user(), $note);

        return IssueController::respond($issue, $request);
    }

    public function reopen(Issue $issue, Request $request): JsonResponse
    {
        $data = $request->validate(['note' => self::NOTE_RULES]);
        $note = trim($data['note'] ?? '');

        abort_unless($issue->reporter_id === $request->user()->id, 403, 'Only the person who reported this can reopen it.');
        abort_unless($issue->status === IssueStatus::Resolved, 409, 'Only resolved reports can be reopened.');
        abort_if($note === '', 422, 'Tell us what is still wrong.');

        $issue->moveTo(IssueStatus::Acknowledged, $request->user(), $note);

        return IssueController::respond($issue, $request);
    }

    public function comment(Issue $issue, Request $request): JsonResponse
    {
        $data = $request->validate(['note' => self::NOTE_RULES]);
        $note = trim($data['note'] ?? '');

        abort_if($note === '', 422, 'Write a comment first.');

        $issue->addUpdate($request->user(), $note);

        return IssueController::respond($issue, $request, 201);
    }

    public function support(Issue $issue, Request $request): JsonResponse
    {
        abort_if($issue->reporter_id === $request->user()->id, 422, 'You reported this one yourself.');
        abort_unless($issue->status->isOpen(), 409, 'This report is already closed.');

        $issue->supporters()->toggle($request->user()->id);

        return IssueController::respond($issue, $request);
    }
}
