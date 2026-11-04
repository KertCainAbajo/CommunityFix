<?php

namespace App\Models;

use App\Enums\IssueCategory;
use App\Enums\IssuePriority;
use App\Enums\IssueStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Issue extends Model
{
    use HasFactory;

    // Easy to read aloud: no 0/O or 1/I/L.
    private const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

    protected $fillable = [
        'title', 'description', 'category', 'address', 'lat', 'lng', 'status', 'priority', 'department',
        'contact_name', 'contact_email', 'contact_phone', 'resolved_at',
    ];

    protected $attributes = [
        'status' => 'reported',
        'priority' => 'normal',
    ];

    protected static function booted(): void
    {
        static::creating(function (Issue $issue) {
            $issue->tracking_code ??= self::generateTrackingCode();
        });
    }

    public static function generateTrackingCode(): string
    {
        $pick = fn () => implode('', array_map(
            fn () => self::CODE_ALPHABET[random_int(0, strlen(self::CODE_ALPHABET) - 1)],
            range(1, 4),
        ));

        return "CF-{$pick()}-{$pick()}";
    }

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

    public function updates(): HasMany
    {
        return $this->hasMany(IssueUpdate::class)->orderBy('id');
    }

    public function photos(): HasMany
    {
        return $this->hasMany(IssuePhoto::class)->orderBy('id');
    }

    public function ref(): string
    {
        return 'CF-'.str_pad((string) $this->id, 4, '0', STR_PAD_LEFT);
    }

    /** A null author means the resident who filed the report. */
    public function addUpdate(?User $author, ?string $note = null, ?IssueStatus $from = null, ?IssueStatus $to = null): void
    {
        $this->updates()->create([
            'author_id' => $author?->id,
            'from_status' => $from,
            'to_status' => $to,
            'note' => $note ?: null,
            'created_at' => now(),
        ]);
        $this->touch();
    }

    public function scopeVisibleTo(Builder $query, ?User $viewer): void
    {
        $query->when(! $viewer?->isStaff(), fn (Builder $q) => $q->whereIn('status', IssueStatus::public()));
    }

    public function scopeFilter(Builder $query, array $filters): void
    {
        $query
            ->when($filters['status'] ?? null, fn (Builder $q, string $status) => $q->where('status', $status))
            ->when($filters['category'] ?? null, fn (Builder $q, string $category) => $q->where('category', $category))
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
            'priority' => $query->orderByRaw(
                "CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END"
            )->oldest()->orderBy('id'),
            default => $query->latest()->orderByDesc('id'),
        };
    }
}
