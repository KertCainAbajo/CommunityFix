<?php

namespace App\Services;

use App\Enums\IssueStatus;
use App\Models\Issue;
use App\Models\User;
use App\Notifications\IssueStatusChanged;
use Closure;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Throwable;

/** The rules for how a report moves from filed to resolved. */
class IssueWorkflow
{
    public function report(array $details, ?UploadedFile $photo, User $reporter): Issue
    {
        $photoPath = $photo?->store('issues');

        try {
            return DB::transaction(function () use ($details, $photoPath, $reporter) {
                $issue = Issue::create([...$details, 'photo_path' => $photoPath, 'reporter_id' => $reporter->id]);
                $issue->addUpdate($reporter, to: IssueStatus::Reported);

                return $issue;
            });
        } catch (Throwable $error) {
            if ($photoPath) {
                Storage::delete($photoPath);
            }

            throw $error;
        }
    }

    public function changeStatus(Issue $issue, IssueStatus $to, User $staff, ?string $note): void
    {
        $this->move($issue, $to, $staff, $note, function (Issue $current) use ($to) {
            abort_unless(
                in_array($to, $current->status->transitions(), true),
                409,
                'A report that is '.strtolower($current->status->label()).' cannot move to that status.',
            );
        });
    }

    public function reopen(Issue $issue, User $reporter, string $note): void
    {
        $this->move($issue, IssueStatus::Acknowledged, $reporter, $note, function (Issue $current) {
            abort_unless($current->status === IssueStatus::Resolved, 409, 'Only resolved reports can be reopened.');
        });
    }

    public function toggleSupport(Issue $issue, User $user): void
    {
        abort_if($issue->reporter_id === $user->id, 422, 'You reported this one yourself.');
        abort_unless($issue->status->isOpen(), 409, 'This report is already closed.');

        DB::transaction(function () use ($issue, $user) {
            Issue::lockForUpdate()->findOrFail($issue->id);
            $issue->supporters()->toggle($user->id);
        });
    }

    /** The row lock stops two people moving the same report at the same moment. */
    private function move(Issue $issue, IssueStatus $to, User $actor, ?string $note, Closure $guard): void
    {
        DB::transaction(function () use ($issue, $to, $actor, $note, $guard) {
            $current = Issue::lockForUpdate()->findOrFail($issue->id);
            $guard($current);

            $from = $current->status;
            $current->update([
                'status' => $to,
                'resolved_at' => $to === IssueStatus::Resolved ? now() : null,
            ]);
            $current->addUpdate($actor, $note, $from, $to);
        });

        if ($actor->id !== $issue->reporter_id) {
            $this->notifyReporter($issue, $to, $note);
        }
    }

    // Sent after the response, and a mail failure must never undo a status change.
    private function notifyReporter(Issue $issue, IssueStatus $to, ?string $note): void
    {
        defer(fn () => rescue(fn () => $issue->reporter->notify(new IssueStatusChanged($issue, $to, $note))));
    }
}
