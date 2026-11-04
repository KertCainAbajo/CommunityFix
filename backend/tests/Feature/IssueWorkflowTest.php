<?php

namespace Tests\Feature;

use App\Models\Issue;
use App\Notifications\IssueStatusChanged;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\ActsOnIssues;
use Tests\TestCase;

class IssueWorkflowTest extends TestCase
{
    use ActsOnIssues, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutDefer();
    }

    public function test_an_issue_moves_through_the_full_workflow_to_resolved(): void
    {
        $issue = $this->report();
        $this->resolve($issue);

        $this->getJson("/api/issues/{$issue->id}")
            ->assertJsonPath('status', 'resolved')
            ->assertJsonCount(4, 'timeline')
            ->assertJsonPath('timeline.3.note', 'Lamp replaced.')
            ->assertJsonPath('timeline.3.author', 'Staff Member');

        $this->assertNotNull($issue->fresh()->resolved_at);
    }

    public function test_the_reporter_is_emailed_when_staff_change_the_status(): void
    {
        Notification::fake();
        $user = $this->resident();
        $issue = $this->report($user);

        Sanctum::actingAs($this->staff());
        $this->move($issue, 'acknowledged', 'We are on it.')->assertOk();

        Notification::assertSentTo($user, IssueStatusChanged::class, function (IssueStatusChanged $notification) use ($user, $issue) {
            $mail = $notification->toMail($user);

            return str_contains($mail->subject, $issue->ref())
                && in_array('Note from staff: We are on it.', $mail->introLines, true)
                && str_ends_with($mail->actionUrl, "/issues/{$issue->id}");
        });
    }

    public function test_a_mail_failure_does_not_undo_a_status_change(): void
    {
        config(['mail.default' => 'broken', 'mail.mailers.broken' => ['transport' => 'smtp', 'host' => '127.0.0.1', 'port' => 1]]);
        $issue = $this->report();

        Sanctum::actingAs($this->staff());
        $this->move($issue, 'acknowledged')->assertOk();

        $this->assertSame('acknowledged', $issue->fresh()->status->value);
    }

    public function test_reporters_are_not_emailed_about_their_own_reopen(): void
    {
        $user = $this->resident();
        $issue = $this->report($user);
        $this->resolve($issue);
        Notification::fake();

        Sanctum::actingAs($user);
        $this->postJson("/api/issues/{$issue->id}/reopen", ['note' => 'Still broken.'])->assertOk();

        Notification::assertNothingSent();
    }

    public function test_only_staff_can_change_status_priority_or_department(): void
    {
        $issue = $this->report($this->resident());

        $this->move($issue, 'acknowledged')->assertForbidden();
        $this->patchJson("/api/issues/{$issue->id}", ['priority' => 'urgent'])->assertForbidden();

        Sanctum::actingAs($this->staff());
        $this->patchJson("/api/issues/{$issue->id}", ['priority' => 'urgent', 'department' => 'Public Works'])
            ->assertOk()->assertJsonPath('priority', 'urgent')->assertJsonPath('department', 'Public Works');
    }

    public function test_guests_cannot_change_status(): void
    {
        $issue = Issue::factory()->create();

        $this->move($issue, 'acknowledged')->assertUnauthorized();
    }

    public function test_invalid_status_moves_are_refused(): void
    {
        $issue = Issue::factory()->create();
        Sanctum::actingAs($this->staff());

        $this->move($issue, 'resolved', 'Skipping ahead')->assertConflict();
        $this->move($issue, 'constructor')->assertUnprocessable();
    }

    public function test_resolving_or_rejecting_needs_an_explanation(): void
    {
        $issue = Issue::factory()->create();
        Sanctum::actingAs($this->staff());

        $this->move($issue, 'rejected')->assertJsonValidationErrors(['note' => 'Add a note']);
        $this->move($issue, 'rejected', '   ')->assertUnprocessable();
        $this->move($issue, 'rejected', 'Duplicate.')->assertOk();
    }

    public function test_only_the_reporter_can_reopen_a_resolved_issue(): void
    {
        $user = $this->resident();
        $issue = $this->report($user);
        $url = "/api/issues/{$issue->id}/reopen";

        $this->postJson($url, ['note' => 'Too early'])->assertConflict();

        $this->resolve($issue);

        Sanctum::actingAs($this->resident());
        $this->postJson($url, ['note' => 'Not mine'])->assertForbidden();

        Sanctum::actingAs($user);
        $this->postJson($url, [])->assertUnprocessable();
        $this->postJson($url, ['note' => 'The light went out again.'])
            ->assertOk()
            ->assertJsonPath('status', 'acknowledged')
            ->assertJsonPath('resolved_at', null);
    }

    public function test_support_toggles_and_reporters_cannot_support_their_own_issue(): void
    {
        $reporter = $this->resident();
        $issue = $this->report($reporter);
        $url = "/api/issues/{$issue->id}/support";

        $this->postJson($url)->assertUnprocessable();

        Sanctum::actingAs($this->resident());
        $this->postJson($url)->assertOk()->assertJsonPath('support_count', 1)->assertJsonPath('supported', true);
        $this->postJson($url)->assertOk()->assertJsonPath('support_count', 0)->assertJsonPath('supported', false);
    }

    public function test_closed_issues_cannot_be_supported(): void
    {
        $issue = $this->report();
        $this->resolve($issue);

        Sanctum::actingAs($this->resident());
        $this->postJson("/api/issues/{$issue->id}/support")->assertConflict();
    }

    public function test_stats_count_open_issues_and_resolution_time(): void
    {
        $this->report();
        $issue = $this->report();
        $this->resolve($issue);

        $stats = $this->getJson('/api/stats')->assertOk();

        $stats->assertJsonPath('total', 2)
            ->assertJsonPath('open', 1)
            ->assertJsonPath('by_status.resolved', 1)
            ->assertJsonPath('open_by_category.0.category', 'streetlight');
        $this->assertIsNumeric($stats->json('avg_resolution_days'));
    }
}
