<?php

namespace App\Enums;

enum IssueCategory: string
{
    case Streetlight = 'streetlight';
    case Road = 'road';
    case Drainage = 'drainage';
    case Waste = 'waste';
    case Water = 'water';
    case Sidewalk = 'sidewalk';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::Streetlight => 'Broken streetlight',
            self::Road => 'Damaged road',
            self::Drainage => 'Drainage or flooding',
            self::Waste => 'Garbage or illegal dumping',
            self::Water => 'Water leak',
            self::Sidewalk => 'Sidewalk or footpath',
            self::Other => 'Other',
        };
    }
}
