<?php

namespace App\Notifications;

use App\Models\Issue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ReportReceived extends Notification
{
    public function __construct(private Issue $issue) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject("We received your report {$this->issue->tracking_code}")
            ->line("Thank you for reporting \"{$this->issue->title}\".")
            ->line("Your tracking number is {$this->issue->tracking_code}. Keep it to follow your report.")
            ->action('Track your report', config('communityfix.frontend_url').'/track/'.$this->issue->tracking_code);
    }
}
