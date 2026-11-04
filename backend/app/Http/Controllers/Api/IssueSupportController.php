<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\RespondsWithIssue;
use App\Http\Controllers\Controller;
use App\Models\Issue;
use App\Services\IssueWorkflow;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IssueSupportController extends Controller
{
    use RespondsWithIssue;

    public function toggle(Issue $issue, Request $request, IssueWorkflow $workflow): JsonResponse
    {
        $workflow->toggleSupport($issue, $request->user());

        return $this->issueResponse($issue, $request);
    }
}
