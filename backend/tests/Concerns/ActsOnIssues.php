<?php

namespace Tests\Concerns;

use App\Models\Issue;
use App\Models\User;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;

trait ActsOnIssues
{
    protected const REPORT = [
        'title' => 'Broken streetlight on Main St',
        'description' => 'The light has been off for a week.',
        'category' => 'streetlight',
        'address' => '12 Main St',
    ];

    protected function staff(): User
    {
        return User::factory()->create(['name' => 'Staff Member']);
    }

    protected function report(array $fields = []): Issue
    {
        if (! auth('sanctum')->check()) {
            $this->asResident();
        }

        $response = $this->postJson('/api/issues', [...self::REPORT, ...$fields])->assertCreated();

        return Issue::where('tracking_code', $response->json('tracking_code'))->firstOrFail();
    }

    protected function move(Issue $issue, string $status, ?string $note = null): TestResponse
    {
        return $this->postJson("/api/issues/{$issue->id}/status", ['status' => $status, 'note' => $note]);
    }

    protected function resolve(Issue $issue): void
    {
        Sanctum::actingAs($this->staff());
        $this->move($issue, 'acknowledged')->assertOk();
        $this->move($issue, 'in_progress')->assertOk();
        $this->move($issue, 'resolved', 'Lamp replaced.')->assertOk();
        $this->asResident();
    }

    /** A signed-in resident with no contact details, who is neither staff nor the reporter. */
    protected function asResident(): User
    {
        $resident = User::factory()->resident()->create(['email' => null]);
        Sanctum::actingAs($resident);

        return $resident;
    }

    /** Sanctum::actingAs persists between requests in a test; this clears it. */
    protected function asGuest(): void
    {
        $this->app['auth']->forgetGuards();
    }
}
