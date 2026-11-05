<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\IssueUpdate;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** The latest events across all reports. The public only sees verified reports. */
class ActivityController extends Controller
{
    private const LIMIT = 6;

    public function __invoke(Request $request): JsonResponse
    {
        $viewer = $request->user('sanctum');

        $updates = IssueUpdate::query()
            ->with(['issue', 'author'])
            ->whereHas('issue', fn (Builder $issue) => $issue->visibleTo($viewer))
            ->latest('created_at')
            ->orderByDesc('id')
            ->limit(self::LIMIT)
            ->get();

        return response()->json(['items' => $updates->map(fn (IssueUpdate $update) => [
            'id' => $update->id,
            'issue_id' => $update->issue_id,
            'ref' => $update->issue->ref(),
            'title' => $update->issue->title,
            'from_status' => $update->from_status,
            'to_status' => $update->to_status,
            'author' => $update->author?->name,
            'created_at' => $update->created_at,
        ])]);
    }
}
