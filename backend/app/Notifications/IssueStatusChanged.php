<?php

namespace App\Notifications;

use App\Enums\IssueStatus;
use App\Models\Issue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class IssueStatusChanged extends Notification
{
    public function __construct(
        private Issue $issue,
        private IssueStatus $status,
        private ?string $note,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject("Update on your report {$this->issue->tracking_code}")
            ->line("\"{$this->issue->title}\" is now: {$this->status->label()}.")
            ->lineIf((bool) $this->note, "Note from staff: {$this->note}")
            ->action('Track your report', config('communityfix.frontend_url').'/track/'.$this->issue->tracking_code);
    }
}
