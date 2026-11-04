<?php

namespace App\Http\Controllers\Api\Concerns;

use App\Http\Resources\IssueResource;
use App\Models\Issue;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

trait RespondsWithIssue
{
    /** The full issue, with its timeline, as seen by whoever is asking. */
    protected function issueResponse(Issue $issue, Request $request, int $status = 200): JsonResponse
    {
        $fresh = Issue::query()
            ->with(['reporter', 'updates.author'])
            ->withViewerContext($request->user('sanctum'))
            ->findOrFail($issue->id);

        return IssueResource::make($fresh)->response()->setStatusCode($status);
    }
}
