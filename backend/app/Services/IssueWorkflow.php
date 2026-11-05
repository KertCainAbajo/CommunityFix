<?php

namespace App\Services;

use App\Enums\IssueStatus;
use App\Enums\PhotoKind;
use App\Models\Issue;
use App\Models\User;
use App\Notifications\IssueStatusChanged;
use App\Notifications\ReportReceived;
use Closure;
use Illuminate\Http\UploadedFile;
use Illuminate\Notifications\Notification as BaseNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Throwable;

/** The rules for how a report moves from filed to resolved. */
class IssueWorkflow
{
    /**
     * A signed-in resident owns the report, and their account fills in any contact details left empty.
     *
     * @param  UploadedFile[]  $photos
     */
    public function report(array $details, array $photos, ?User $owner = null): Issue
    {
        if ($owner && ! $owner->isStaff()) {
            $details['contact_name'] ??= $owner->name;
            $details['contact_email'] ??= $owner->email;
            $details['contact_phone'] ??= $owner->phone;
        }

        $paths = array_map(fn (UploadedFile $photo) => $photo->store('issues'), $photos);

        try {
            $issue = DB::transaction(function () use ($details, $paths, $owner) {
                $issue = new Issue($details);
                $issue->user_id = $owner && ! $owner->isStaff() ? $owner->id : null;
                $issue->save();
                foreach ($paths as $path) {
                    $issue->photos()->create(['kind' => PhotoKind::Evidence, 'path' => $path, 'created_at' => now()]);
                }
                $issue->addUpdate(null, to: IssueStatus::Reported);

                return $issue;
            });
        } catch (Throwable $error) {
            Storage::delete($paths);

            throw $error;
        }

        $this->notifyReporter($issue, new ReportReceived($issue));

        return $issue;
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

        $this->notifyReporter($issue, new IssueStatusChanged($issue, $to, $note));
    }

    public function reopen(Issue $issue, string $note): void
    {
        $this->move($issue, IssueStatus::Acknowledged, null, $note, function (Issue $current) {
            abort_unless($current->status === IssueStatus::Resolved, 409, 'Only resolved reports can be reopened.');
        });
    }

    public function addPhoto(Issue $issue, UploadedFile $photo, PhotoKind $kind, User $staff): void
    {
        $path = $photo->store('issues');

        DB::transaction(function () use ($issue, $path, $kind, $staff) {
            $issue->photos()->create([
                'kind' => $kind,
                'path' => $path,
                'uploaded_by' => $staff->id,
                'created_at' => now(),
            ]);
            $issue->addUpdate($staff, "Added a photo: {$kind->label()}");
        });
    }

    /** The row lock stops two people moving the same report at the same moment. */
    private function move(Issue $issue, IssueStatus $to, ?User $actor, ?string $note, Closure $guard): void
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
    }

    // Sent after the response, and a mail failure must never undo the work.
    private function notifyReporter(Issue $issue, BaseNotification $notification): void
    {
        if ($issue->contact_email) {
            defer(fn () => rescue(fn () => Notification::route('mail', $issue->contact_email)->notify($notification)));
        }
    }
}
