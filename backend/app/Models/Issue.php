<?php

namespace App\Models;

use App\Enums\IssueCategory;
use App\Enums\IssuePriority;
use App\Enums\IssueStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class Issue extends Model
{
    protected $fillable = [
        'title', 'description', 'category', 'address', 'lat', 'lng', 'photo_path',
        'status', 'priority', 'department', 'reporter_id', 'resolved_at',
    ];

    protected $attributes = [
        'status' => 'reported',
        'priority' => 'normal',
    ];

    protected function casts(): array
    {
        return [
            'category' => IssueCategory::class,
            'status' => IssueStatus::class,
            'priority' => IssuePriority::class,
            'lat' => 'float',
            'lng' => 'float',
            'resolved_at' => 'datetime',
        ];
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }

    public function updates(): HasMany
    {
        return $this->hasMany(IssueUpdate::class)->orderBy('id');
    }

    public function supporters(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'issue_supports');
    }

    public function ref(): string
    {
        return 'CF-'.str_pad((string) $this->id, 4, '0', STR_PAD_LEFT);
    }

    public function addUpdate(User $author, ?string $note = null, ?IssueStatus $from = null, ?IssueStatus $to = null): void
    {
        $this->updates()->create([
            'author_id' => $author->id,
            'from_status' => $from,
            'to_status' => $to,
            'note' => $note ?: null,
            'created_at' => now(),
        ]);
        $this->touch();
    }

    public function moveTo(IssueStatus $to, User $author, ?string $note): void
    {
        DB::transaction(function () use ($to, $author, $note) {
            $from = $this->status;
            $this->update([
                'status' => $to,
                'resolved_at' => $to === IssueStatus::Resolved ? now() : null,
            ]);
            $this->addUpdate($author, $note, $from, $to);
        });
    }
}
