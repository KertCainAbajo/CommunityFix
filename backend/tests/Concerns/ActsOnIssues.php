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

    protected function resident(): User
    {
        return User::factory()->create(['name' => 'Test Resident', 'role' => 'resident']);
    }

    protected function staff(): User
    {
        return User::factory()->staff()->create(['name' => 'Staff Member']);
    }

    protected function report(?User $user = null, array $fields = []): Issue
    {
        Sanctum::actingAs($user ?? $this->resident());
        $response = $this->postJson('/api/issues', [...self::REPORT, ...$fields])->assertCreated();

        return Issue::findOrFail($response->json('id'));
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
    }

    /** Sanctum::actingAs persists between requests in a test; this clears it. */
    protected function asGuest(): void
    {
        $this->app['auth']->forgetGuards();
    }
}
