<?php

namespace App\Enums;

enum IssueStatus: string
{
    case Reported = 'reported';
    case Acknowledged = 'acknowledged';
    case InProgress = 'in_progress';
    case Resolved = 'resolved';
    case Rejected = 'rejected';

    public function label(): string
    {
        return match ($this) {
            self::Reported => 'Reported',
            self::Acknowledged => 'Verified',
            self::InProgress => 'In progress',
            self::Resolved => 'Resolved',
            self::Rejected => 'Rejected',
        };
    }

    /** Moves staff may make from this status. Residents reopen separately. */
    public function transitions(): array
    {
        return match ($this) {
            self::Reported => [self::Acknowledged, self::Rejected],
            self::Acknowledged => [self::InProgress, self::Rejected],
            self::InProgress => [self::Resolved, self::Acknowledged],
            self::Resolved => [self::InProgress],
            self::Rejected => [self::Acknowledged],
        };
    }

    /** Closing a report always has to tell the resident why. */
    public function requiresNote(): bool
    {
        return in_array($this, [self::Resolved, self::Rejected], true);
    }

    public function isOpen(): bool
    {
        return in_array($this, self::open(), true);
    }

    /** New reports stay private until staff verify them, because anyone can submit one. */
    public static function public(): array
    {
        return [self::Acknowledged, self::InProgress, self::Resolved];
    }

    public function isPublic(): bool
    {
        return in_array($this, self::public(), true);
    }

    public static function open(): array
    {
        return [self::Reported, self::Acknowledged, self::InProgress];
    }
}
