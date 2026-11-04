<?php

namespace App\Models;

use App\Enums\PhotoKind;
use Illuminate\Database\Eloquent\Model;

class IssuePhoto extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['kind', 'path', 'uploaded_by', 'created_at'];

    protected function casts(): array
    {
        return ['kind' => PhotoKind::class];
    }
}
