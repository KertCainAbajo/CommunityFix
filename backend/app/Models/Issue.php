<?php

namespace App\Models;

use App\Enums\IssueCategory;
use App\Enums\IssuePriority;
use App\Enums\IssueStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Issue extends Model
{
    use HasFactory;

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

    /** Adds the support count, and whether this viewer has supported the issue. */
    public function scopeWithViewerContext(Builder $query, ?User $viewer): void
    {
        $query->withCount('supporters')
            ->withExists(['supporters as supported' => fn (Builder $q) => $q->where('users.id', $viewer?->id ?? 0)]);
    }

    public function scopeFilter(Builder $query, array $filters): void
    {
        $query
            ->when($filters['status'] ?? null, fn (Builder $q, string $status) => $q->where('status', $status))
            ->when($filters['category'] ?? null, fn (Builder $q, string $category) => $q->where('category', $category))
            ->when($filters['reporter_id'] ?? null, fn (Builder $q, int $id) => $q->where('reporter_id', $id))
            ->when($filters['open'] ?? false, fn (Builder $q) => $q->whereIn('status', IssueStatus::open()))
            ->when($filters['q'] ?? null, function (Builder $q, string $search) {
                $pattern = '%'.addcslashes($search, '\\%_').'%';
                $q->where(fn (Builder $inner) => $inner
                    ->whereLike('title', $pattern)
                    ->orWhereLike('description', $pattern)
                    ->orWhereLike('address', $pattern));
            });
    }

    public function scopeSortBy(Builder $query, ?string $sort): void
    {
        match ($sort) {
            'oldest' => $query->oldest()->orderBy('id'),
            'supported' => $query->orderByDesc('supporters_count')->latest()->orderByDesc('id'),
            'priority' => $query->orderByRaw(
                "CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END"
            )->oldest()->orderBy('id'),
            default => $query->latest()->orderByDesc('id'),
        };
    }
}
