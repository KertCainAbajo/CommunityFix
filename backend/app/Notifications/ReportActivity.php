<?php

namespace App\Notifications;

use App\Models\Issue;
use App\Models\User;
use Illuminate\Notifications\Notification;

/** A notice in the resident's bell, so people without an email hear about their reports too. */
class ReportActivity extends Notification
{
    public function __construct(
        private Issue $issue,
        private string $message,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(User $notifiable): array
    {
        // Only the reporter has the private tracking page, which also shows unverified reports.
        $mine = $this->issue->user_id === $notifiable->id;

        return [
            'title' => $this->issue->title,
            'message' => $this->message,
            'href' => $mine ? "/track/{$this->issue->tracking_code}" : "/issues/{$this->issue->id}",
        ];
    }
}
