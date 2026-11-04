<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\RespondsWithIssue;
use App\Http\Controllers\Controller;
use App\Http\Requests\Issue\ChangeStatusRequest;
use App\Models\Issue;
use App\Services\IssueWorkflow;
use Illuminate\Http\JsonResponse;

class IssueStatusController extends Controller
{
    use RespondsWithIssue;

    public function update(Issue $issue, ChangeStatusRequest $request, IssueWorkflow $workflow): JsonResponse
    {
        $workflow->changeStatus($issue, $request->status(), $request->user(), $request->validated('note'));

        return $this->issueResponse($issue->refresh());
    }
}
