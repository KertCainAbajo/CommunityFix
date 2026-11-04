<?php

namespace App\Http\Controllers\Api\Concerns;

use App\Http\Resources\IssueResource;
use App\Models\Issue;
use Illuminate\Http\JsonResponse;

trait RespondsWithIssue
{
    /** The full issue, with its timeline and photos. */
    protected function issueResponse(Issue $issue, int $status = 200): JsonResponse
    {
        $issue->load(['photos', 'updates.author']);

        return IssueResource::make($issue)->response()->setStatusCode($status);
    }
}
