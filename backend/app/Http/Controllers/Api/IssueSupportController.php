<?php

namespace App\Http\Controllers\Api;

use App\Enums\IssueStatus;
use App\Http\Controllers\Api\Concerns\RespondsWithIssue;
use App\Http\Controllers\Controller;
use App\Http\Resources\IssueResource;
use App\Models\Issue;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/** "Me too": neighbors back a report instead of filing it again, and get its updates. */
class IssueSupportController extends Controller
{
    use RespondsWithIssue;

    /** About 200 metres, measured in degrees. */
    private const NEARBY = 0.002;

    /** Open, verified reports close to a pin, shown before someone files a duplicate. */
    public function nearby(Request $request): JsonResponse
    {
        $data = $request->validate([
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
            'category' => ['required', 'string', 'max:40'],
        ]);

        $issues = Issue::query()
            ->with('photos')
            ->withCount('supporters')
            ->where('category', $data['category'])
            ->whereIn('status', [IssueStatus::Acknowledged, IssueStatus::InProgress])
            ->whereBetween('lat', [$data['lat'] - self::NEARBY, $data['lat'] + self::NEARBY])
            ->whereBetween('lng', [$data['lng'] - self::NEARBY, $data['lng'] + self::NEARBY])
            ->latest()
            ->limit(5)
            ->get();

        return response()->json(['items' => IssueResource::collection($issues)]);
    }

    public function store(Issue $issue, Request $request): JsonResponse
    {
        abort_unless($issue->status->isPublic() && $issue->status !== IssueStatus::Resolved, 409, 'This report is not open for support.');
        abort_if($issue->user_id === $request->user()->id, 422, 'This is your own report.');

        $issue->supporters()->syncWithoutDetaching([$request->user()->id => ['created_at' => now()]]);

        return $this->issueResponse($issue, 201);
    }

    public function destroy(Issue $issue, Request $request): Response
    {
        $issue->supporters()->detach($request->user()->id);

        return response()->noContent();
    }
}
