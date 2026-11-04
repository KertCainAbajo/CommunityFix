<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\RespondsWithIssue;
use App\Http\Controllers\Controller;
use App\Http\Requests\Issue\StaffNoteRequest;
use App\Models\Issue;
use App\Services\IssueWorkflow;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

/** Everything a resident can do with their tracking number. */
class TrackingController extends Controller
{
    use RespondsWithIssue;

    public function show(string $code): JsonResponse
    {
        return $this->issueResponse($this->find($code));
    }

    public function reopen(string $code, StaffNoteRequest $request, IssueWorkflow $workflow): JsonResponse
    {
        $issue = $this->find($code);
        $workflow->reopen($issue, $request->validated('note'));

        return $this->issueResponse($issue->refresh());
    }

    private function find(string $code): Issue
    {
        return Issue::where('tracking_code', Str::upper($code))->firstOr(
            fn () => abort(404, 'We could not find a report with that tracking number.'),
        );
    }
}
