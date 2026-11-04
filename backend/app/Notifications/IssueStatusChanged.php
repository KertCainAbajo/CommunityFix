<?php

namespace App\Notifications;

use App\Enums\IssueStatus;
use App\Models\Issue;
use App\Models\User;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class IssueStatusChanged extends Notification
{
    public function __construct(
        private Issue $issue,
        private IssueStatus $status,
        private ?string $note,
    ) {}

    public function via(User $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(User $notifiable): MailMessage
    {
        $url = config('communityfix.frontend_url').'/issues/'.$this->issue->id;

        return (new MailMessage)
            ->subject("Update on your report {$this->issue->ref()}")
            ->line("\"{$this->issue->title}\" is now: {$this->status->label()}.")
            ->lineIf((bool) $this->note, "Note from staff: {$this->note}")
            ->action('View your report', $url);
    }
}
