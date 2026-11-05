<?php

namespace App\Services;

use App\Enums\IssueCategory;
use App\Enums\IssueStatus;
use App\Models\Issue;
use Illuminate\Support\Collection;

class IssueStats
{
    private const MONTHS = 6;

    private const TREND_DAYS = 30;

    /** An open report older than this counts as overdue. */
    private const OVERDUE_DAYS = 14;

    public function summary(): array
    {
        $byStatus = $this->countsByStatus();
        $trends = $this->trends();

        return [
            'total' => array_sum($byStatus),
            'open' => array_sum(array_map(fn (IssueStatus $status) => $byStatus[$status->value], IssueStatus::open())),
            'by_status' => $byStatus,
            'overdue' => end($trends['overdue']),
            'trends' => $trends,
            'open_by_category' => $this->openByCategory(),
            'avg_resolution_days' => $this->averageDays(Issue::whereNotNull('resolved_at')->get(['created_at', 'resolved_at'])),
        ];
    }

    /** The detailed figures for staff. */
    public function analytics(): array
    {
        $issues = Issue::all(['category', 'department', 'status', 'created_at', 'resolved_at']);

        return [
            'by_category' => collect(IssueCategory::cases())->map(function (IssueCategory $category) use ($issues) {
                return ['category' => $category->value, ...$this->breakdown($issues->where('category', $category))];
            })->filter(fn (array $row) => $row['total'] > 0)->sortByDesc('total')->values()->all(),
            'by_team' => $issues->whereNotNull('department')->groupBy('department')
                ->map(fn (Collection $group, string $team) => ['team' => $team, ...$this->breakdown($group)])
                ->sortByDesc('total')->values()->all(),
            'by_month' => $this->byMonth($issues),
        ];
    }

    /** How each figure stood on each of the last 30 days, oldest first. */
    private function trends(): array
    {
        $issues = Issue::all(['status', 'created_at', 'updated_at', 'resolved_at']);
        $closedAt = fn (Issue $issue) => $issue->resolved_at
            ?? ($issue->status === IssueStatus::Rejected ? $issue->updated_at : null);
        $openOn = fn (Issue $issue, $day) => $issue->created_at <= $day
            && (! $closedAt($issue) || $closedAt($issue) > $day);

        $days = collect(range(self::TREND_DAYS - 1, 0))->map(fn (int $ago) => now()->subDays($ago)->endOfDay());
        $series = fn (callable $count) => $days->map(fn ($day) => $issues->filter(fn (Issue $issue) => $count($issue, $day))->count())->all();

        return [
            'total' => $series(fn (Issue $issue, $day) => $issue->created_at <= $day),
            'open' => $series($openOn),
            'resolved' => $series(fn (Issue $issue, $day) => $issue->resolved_at && $issue->resolved_at <= $day),
            'overdue' => $series(fn (Issue $issue, $day) => $openOn($issue, $day)
                && $issue->created_at <= $day->copy()->subDays(self::OVERDUE_DAYS)),
        ];
    }

    private function breakdown(Collection $issues): array
    {
        return [
            'total' => $issues->count(),
            'open' => $issues->filter(fn (Issue $issue) => $issue->status->isOpen())->count(),
            'resolved' => $issues->where('status', IssueStatus::Resolved)->count(),
            'avg_days' => $this->averageDays($issues->whereNotNull('resolved_at')),
        ];
    }

    private function byMonth(Collection $issues): array
    {
        return collect(range(self::MONTHS - 1, 0))->map(function (int $ago) use ($issues) {
            $month = now()->startOfMonth()->subMonths($ago);
            $inMonth = fn ($date) => $date?->isSameMonth($month);

            return [
                'month' => $month->format('M Y'),
                'reported' => $issues->filter(fn (Issue $issue) => $inMonth($issue->created_at))->count(),
                'resolved' => $issues->filter(fn (Issue $issue) => $inMonth($issue->resolved_at))->count(),
            ];
        })->all();
    }

    private function countsByStatus(): array
    {
        $counts = Issue::toBase()->selectRaw('status, count(*) as n')->groupBy('status')->pluck('n', 'status');

        return collect(IssueStatus::cases())
            ->mapWithKeys(fn (IssueStatus $status) => [$status->value => (int) ($counts[$status->value] ?? 0)])
            ->all();
    }

    private function openByCategory(): array
    {
        return Issue::toBase()
            ->selectRaw('category, count(*) as n')
            ->whereIn('status', IssueStatus::open())
            ->groupBy('category')
            ->orderByDesc('n')
            ->get()
            ->map(fn ($row) => ['category' => $row->category, 'n' => (int) $row->n])
            ->all();
    }

    private function averageDays(Collection $resolved): ?float
    {
        $days = $resolved->avg(fn (Issue $issue) => $issue->created_at->diffInSeconds($issue->resolved_at) / 86400);

        return $days === null ? null : round($days, 1);
    }
}
