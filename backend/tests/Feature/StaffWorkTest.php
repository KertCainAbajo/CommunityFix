<?php

namespace Tests\Feature;

use App\Models\Issue;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\ActsOnIssues;
use Tests\TestCase;

class StaffWorkTest extends TestCase
{
    use ActsOnIssues, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutDefer();
    }

    public function test_a_report_moves_through_the_full_workflow_to_resolved(): void
    {
        $issue = $this->report();
        $this->resolve($issue);

        $this->getJson("/api/track/{$issue->tracking_code}")
            ->assertJsonPath('status', 'resolved')
            ->assertJsonCount(4, 'timeline')
            ->assertJsonPath('timeline.3.note', 'Lamp replaced.')
            ->assertJsonPath('timeline.3.author', 'Staff Member');

        $this->assertNotNull($issue->fresh()->resolved_at);
    }

    public function test_staff_see_contact_details_and_the_tracking_number(): void
    {
        $issue = $this->report(['contact_name' => 'Sam', 'contact_email' => 'sam@example.com', 'contact_phone' => '0917 123 4567']);

        Sanctum::actingAs($this->staff());
        $this->getJson("/api/issues/{$issue->id}")
            ->assertJsonPath('contact.email', 'sam@example.com')
            ->assertJsonPath('contact.phone', '0917 123 4567')
            ->assertJsonPath('tracking_code', $issue->tracking_code);
    }

    public function test_guests_cannot_do_staff_work(): void
    {
        $issue = Issue::factory()->create();

        $this->move($issue, 'acknowledged')->assertUnauthorized();
        $this->patchJson("/api/issues/{$issue->id}", ['priority' => 'urgent'])->assertUnauthorized();
        $this->postJson("/api/issues/{$issue->id}/comments", ['note' => 'Hi'])->assertUnauthorized();
        $this->postJson("/api/issues/{$issue->id}/photos", [])->assertUnauthorized();
        $this->getJson('/api/analytics')->assertUnauthorized();
        $this->getJson('/api/staff')->assertUnauthorized();
    }

    public function test_staff_can_set_priority_and_assign_a_team(): void
    {
        $issue = Issue::factory()->create();
        Sanctum::actingAs($this->staff());

        $this->patchJson("/api/issues/{$issue->id}", ['priority' => 'urgent', 'department' => 'Road Crew A'])
            ->assertOk()->assertJsonPath('priority', 'urgent')->assertJsonPath('department', 'Road Crew A');
    }

    public function test_staff_notes_appear_in_the_timeline(): void
    {
        $issue = Issue::factory()->create();
        Sanctum::actingAs($this->staff());

        $this->postJson("/api/issues/{$issue->id}/comments", [])->assertUnprocessable();
        $this->postJson("/api/issues/{$issue->id}/comments", ['note' => 'Crew booked.'])
            ->assertCreated()->assertJsonPath('timeline.0.note', 'Crew booked.');
    }

    public function test_staff_can_upload_before_and_after_photos(): void
    {
        Storage::fake('public');
        $issue = Issue::factory()->create();
        Sanctum::actingAs($this->staff());
        $photo = UploadedFile::fake()->image('site.jpg', 40, 40);

        $url = "/api/issues/{$issue->id}/photos";
        $headers = ['Accept' => 'application/json'];

        $this->post($url, ['kind' => 'evidence', 'photo' => $photo], $headers)->assertJsonValidationErrors('kind');
        $this->post($url, ['kind' => 'before'], $headers)->assertJsonValidationErrors('photo');
        $this->post($url, ['kind' => 'before', 'photo' => $photo], $headers)->assertCreated();
        $this->post($url, ['kind' => 'after', 'photo' => $photo], $headers)
            ->assertCreated()
            ->assertJsonPath('photos.1.kind', 'after')
            ->assertJsonPath('photos.1.label', 'After');
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

    public function test_the_queue_sorts_by_priority_then_age(): void
    {
        $normal = Issue::factory()->create();
        $urgent = Issue::factory()->create(['priority' => 'urgent']);
        Sanctum::actingAs($this->staff());

        $items = $this->getJson('/api/issues?sort=priority')->json('items');

        $this->assertSame([$urgent->id, $normal->id], array_column($items, 'id'));
    }

    public function test_analytics_break_down_reports_by_category_team_and_month(): void
    {
        Issue::factory()->create(['department' => 'Road Crew A']);
        $done = Issue::factory()->create(['department' => 'Road Crew A', 'category' => 'road']);
        $this->resolve($done);

        Sanctum::actingAs($this->staff());
        $response = $this->getJson('/api/analytics')->assertOk();

        $response->assertJsonPath('total', 2)
            ->assertJsonPath('by_team.0.team', 'Road Crew A')
            ->assertJsonPath('by_team.0.total', 2)
            ->assertJsonPath('by_team.0.resolved', 1)
            ->assertJsonCount(2, 'by_category')
            ->assertJsonCount(6, 'by_month')
            ->assertJsonPath('by_month.5.reported', 2)
            ->assertJsonPath('by_month.5.resolved', 1);
    }

    public function test_public_stats_count_reports_and_resolution_time(): void
    {
        $this->report();
        $issue = $this->report();
        $this->resolve($issue);

        $stats = $this->getJson('/api/stats')->assertOk();

        $stats->assertJsonPath('total', 2)->assertJsonPath('open', 1)->assertJsonPath('by_status.resolved', 1);
        $this->assertIsNumeric($stats->json('avg_resolution_days'));
    }

    public function test_stats_include_30_day_trends_and_overdue_reports(): void
    {
        $old = Issue::factory()->create();
        $old->forceFill(['created_at' => now()->subDays(20)])->saveQuietly();
        Issue::factory()->create();

        $stats = $this->getJson('/api/stats')->assertOk();

        $stats->assertJsonPath('overdue', 1)
            ->assertJsonCount(30, 'trends.total')
            ->assertJsonPath('trends.total.29', 2)
            ->assertJsonPath('trends.total.0', 0)
            ->assertJsonPath('trends.open.29', 2)
            ->assertJsonPath('trends.overdue.29', 1)
            ->assertJsonPath('trends.overdue.0', 0);
    }

    public function test_activity_shows_the_public_only_verified_reports(): void
    {
        $hidden = $this->report(['title' => 'Still waiting for review', 'contact_email' => 'sam@example.com']);
        $shown = $this->report(['title' => 'Verified problem here']);

        Sanctum::actingAs($this->staff());
        $this->move($shown, 'acknowledged')->assertOk();
        $this->getJson('/api/activity')->assertSee('Still waiting for review');
        $this->asGuest();

        $response = $this->getJson('/api/activity')->assertOk();

        $response->assertSee('Verified problem here')->assertJsonPath('items.0.to_status', 'acknowledged');
        $response->assertDontSee('Still waiting for review');
        $this->assertStringNotContainsString('sam@example.com', $response->getContent());
        $this->assertStringNotContainsString($hidden->tracking_code, $response->getContent());
        $this->assertStringNotContainsString($shown->tracking_code, $response->getContent());
    }

    public function test_only_admins_can_manage_staff_accounts(): void
    {
        Sanctum::actingAs($this->staff());

        $this->getJson('/api/staff')->assertForbidden();
        $this->postJson('/api/staff', ['name' => 'New', 'email' => 'new@example.com', 'role' => 'admin'])->assertForbidden();
    }

    public function test_an_admin_creates_a_staff_account_with_a_one_time_password(): void
    {
        Sanctum::actingAs(User::factory()->admin()->create());

        $response = $this->postJson('/api/staff', ['name' => 'New Person', 'email' => 'NEW@Example.com', 'role' => 'staff'])
            ->assertCreated()
            ->assertJsonPath('user.email', 'new@example.com')
            ->assertJsonPath('user.role', 'staff');
        $this->asGuest();

        $this->postJson('/api/auth/login', ['email' => 'new@example.com', 'password' => $response->json('password')])->assertOk();
    }

    public function test_deactivating_staff_ends_their_sessions_and_blocks_login(): void
    {
        $person = User::factory()->create(['email' => 'gone@example.com', 'password' => 'password123']);
        $person->createToken('web');
        Sanctum::actingAs(User::factory()->admin()->create());

        $this->patchJson("/api/staff/{$person->id}", ['is_active' => false])->assertOk()->assertJsonPath('user.is_active', false);
        $this->asGuest();

        $this->assertSame(0, $person->tokens()->count());
        $this->postJson('/api/auth/login', ['email' => 'gone@example.com', 'password' => 'password123'])->assertUnauthorized();
    }

    public function test_admins_cannot_lock_themselves_out(): void
    {
        $admin = User::factory()->admin()->create();
        Sanctum::actingAs($admin);

        $this->patchJson("/api/staff/{$admin->id}", ['is_active' => false])->assertUnprocessable();
        $this->patchJson("/api/staff/{$admin->id}", ['role' => 'staff'])->assertUnprocessable();
    }
}
