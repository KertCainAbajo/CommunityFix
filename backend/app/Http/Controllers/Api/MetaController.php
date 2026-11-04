<?php

namespace App\Http\Controllers\Api;

use App\Enums\IssueCategory;
use App\Enums\IssuePriority;
use App\Enums\IssueStatus;
use App\Http\Controllers\Controller;
use App\Models\Issue;
use Illuminate\Http\JsonResponse;

class MetaController extends Controller
{
    public function meta(): JsonResponse
    {
        $labels = fn (array $cases) => collect($cases)->mapWithKeys(fn ($case) => [$case->value => $case->label()]);

        return response()->json([
            'categories' => $labels(IssueCategory::cases()),
            'statuses' => $labels(IssueStatus::cases()),
            'priorities' => $labels(IssuePriority::cases()),
            'transitions' => collect(IssueStatus::cases())->mapWithKeys(fn (IssueStatus $status) => [
                $status->value => array_map(fn (IssueStatus $to) => $to->value, $status->transitions()),
            ]),
            'map_center' => config('communityfix.map_center'),
        ]);
    }

    public function stats(): JsonResponse
    {
        $byStatus = collect(IssueStatus::cases())->mapWithKeys(fn (IssueStatus $status) => [$status->value => 0])
            ->merge(Issue::toBase()->selectRaw('status, count(*) as n')->groupBy('status')->pluck('n', 'status'))
            ->map(fn ($count) => (int) $count);

        $openByCategory = Issue::toBase()
            ->selectRaw('category, count(*) as n')
            ->whereIn('status', IssueStatus::open())
            ->groupBy('category')
            ->orderByDesc('n')
            ->get()
            ->map(fn ($row) => ['category' => $row->category, 'n' => (int) $row->n]);

        $days = Issue::whereNotNull('resolved_at')
            ->get(['created_at', 'resolved_at'])
            ->avg(fn (Issue $issue) => $issue->created_at->diffInSeconds($issue->resolved_at) / 86400);

        return response()->json([
            'total' => $byStatus->sum(),
            'open' => collect(IssueStatus::open())->sum(fn (IssueStatus $status) => $byStatus[$status->value]),
            'by_status' => $byStatus,
            'open_by_category' => $openByCategory,
            'avg_resolution_days' => $days === null ? null : round($days, 1),
        ]);
    }
}
