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
            self::Acknowledged => 'Acknowledged',
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

    public static function open(): array
    {
        return [self::Reported, self::Acknowledged, self::InProgress];
    }
}
