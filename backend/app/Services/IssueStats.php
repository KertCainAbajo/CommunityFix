<?php

namespace App\Services;

use App\Enums\IssueStatus;
use App\Models\Issue;

class IssueStats
{
    public function summary(): array
    {
        $byStatus = $this->countsByStatus();

        return [
            'total' => array_sum($byStatus),
            'open' => array_sum(array_map(fn (IssueStatus $status) => $byStatus[$status->value], IssueStatus::open())),
            'by_status' => $byStatus,
            'open_by_category' => $this->openByCategory(),
            'avg_resolution_days' => $this->averageResolutionDays(),
        ];
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

    private function averageResolutionDays(): ?float
    {
        $days = Issue::whereNotNull('resolved_at')
            ->get(['created_at', 'resolved_at'])
            ->avg(fn (Issue $issue) => $issue->created_at->diffInSeconds($issue->resolved_at) / 86400);

        return $days === null ? null : round($days, 1);
    }
}
