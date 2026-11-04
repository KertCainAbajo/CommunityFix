<?php

namespace App\Enums;

enum PhotoKind: string
{
    case Evidence = 'evidence';
    case Before = 'before';
    case After = 'after';

    public function label(): string
    {
        return match ($this) {
            self::Evidence => 'From the resident',
            self::Before => 'Before',
            self::After => 'After',
        };
    }
}
