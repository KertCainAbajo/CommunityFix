<?php

namespace Tests\Feature;

use App\Models\Issue;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class IssueApiTest extends TestCase
{
    use RefreshDatabase;

    private const REPORT = [
        'title' => 'Broken streetlight on Main St',
        'description' => 'The light has been off for a week.',
        'category' => 'streetlight',
        'address' => '12 Main St',
    ];

    private function resident(): User
    {
        return User::factory()->create(['name' => 'Test Resident']);
    }

    private function staff(): User
    {
        return User::factory()->create(['name' => 'Staff Member'])->forceFill(['role' => 'staff']);
    }

    private function report(?User $user = null, array $fields = []): Issue
    {
        Sanctum::actingAs($user ?? $this->resident());
        $response = $this->postJson('/api/issues', [...self::REPORT, ...$fields])->assertCreated();

        return Issue::findOrFail($response->json('id'));
    }

    private function move(Issue $issue, string $status, ?string $note = null): TestResponse
    {
        return $this->postJson("/api/issues/{$issue->id}/status", ['status' => $status, 'note' => $note]);
    }

    private function resolve(Issue $issue): void
    {
        Sanctum::actingAs($this->staff());
        $this->move($issue, 'acknowledged')->assertOk();
        $this->move($issue, 'in_progress')->assertOk();
        $this->move($issue, 'resolved', 'Lamp replaced.')->assertOk();
    }

    /** Sanctum::actingAs persists between requests in a test; this clears it. */
    private function asGuest(): void
    {
        $this->app['auth']->forgetGuards();
    }

    public function test_registration_cannot_create_staff_accounts(): void
    {
        $this->postJson('/api/auth/register', [
            'name' => 'Sneaky', 'email' => 'Sneaky@Example.com', 'password' => 'password123', 'role' => 'staff',
        ])->assertCreated()->assertJsonPath('user.role', 'resident')->assertJsonPath('user.email', 'sneaky@example.com');

        $this->assertFalse(User::where('email', 'sneaky@example.com')->first()->isStaff());
    }

    public function test_registration_rejects_a_duplicate_email(): void
    {
        User::factory()->create(['email' => 'taken@example.com']);

        $this->postJson('/api/auth/register', ['name' => 'Copy', 'email' => 'TAKEN@example.com', 'password' => 'password123'])
            ->assertUnprocessable();
    }

    public function test_login_returns_a_working_token_and_logout_revokes_it(): void
    {
        User::factory()->create(['email' => 'me@example.com', 'password' => 'password123']);

        $token = $this->postJson('/api/auth/login', ['email' => 'ME@example.com', 'password' => 'password123'])
            ->assertOk()->json('token');

        $headers = ['Authorization' => "Bearer {$token}"];
        $this->getJson('/api/auth/me', $headers)->assertOk()->assertJsonPath('user.email', 'me@example.com');

        $this->postJson('/api/auth/logout', [], $headers)->assertNoContent();
        $this->asGuest();
        $this->getJson('/api/auth/me', $headers)->assertUnauthorized();
    }

    public function test_login_rejects_bad_credentials(): void
    {
        User::factory()->create(['email' => 'me@example.com', 'password' => 'password123']);

        $this->postJson('/api/auth/login', ['email' => 'me@example.com', 'password' => 'wrong-password'])->assertUnauthorized();
        $this->postJson('/api/auth/login', ['email' => 'ghost@example.com', 'password' => 'wrong-password'])->assertUnauthorized();
    }

    public function test_login_is_rate_limited_per_account(): void
    {
        foreach (range(1, 10) as $attempt) {
            $this->postJson('/api/auth/login', ['email' => 'target@example.com', 'password' => 'guess'])->assertUnauthorized();
        }

        $this->postJson('/api/auth/login', ['email' => 'target@example.com', 'password' => 'guess'])->assertTooManyRequests();
        $this->postJson('/api/auth/login', ['email' => 'other@example.com', 'password' => 'guess'])->assertUnauthorized();
    }

    public function test_reporting_needs_an_account(): void
    {
        $this->postJson('/api/issues', self::REPORT)->assertUnauthorized();
    }

    public function test_reporting_validates_fields(): void
    {
        Sanctum::actingAs($this->resident());

        $this->postJson('/api/issues', [...self::REPORT, 'title' => 'x'])->assertJsonValidationErrors('title');
        $this->postJson('/api/issues', [...self::REPORT, 'category' => 'nope'])->assertJsonValidationErrors('category');
        $this->postJson('/api/issues', [...self::REPORT, 'lat' => 12])->assertJsonValidationErrors('lng');
        $this->postJson('/api/issues', [...self::REPORT, 'lat' => 95, 'lng' => 10])->assertJsonValidationErrors('lat');
    }

    public function test_a_new_report_starts_as_reported_with_a_timeline_entry(): void
    {
        $issue = $this->report(fields: ['lat' => 14.5, 'lng' => 121]);
        $this->asGuest();

        $this->getJson("/api/issues/{$issue->id}")
            ->assertOk()
            ->assertJsonPath('status', 'reported')
            ->assertJsonPath('ref', sprintf('CF-%04d', $issue->id))
            ->assertJsonPath('lat', 14.5)
            ->assertJsonCount(1, 'timeline')
            ->assertJsonPath('timeline.0.to_status', 'reported');
    }

    public function test_photos_are_checked_by_content_and_stored(): void
    {
        Storage::fake('public');
        Sanctum::actingAs($this->resident());

        // A real file: Laravel's fake uploads report their type from the name, not the bytes.
        $path = tempnam(sys_get_temp_dir(), 'cf');
        file_put_contents($path, '<script>alert(1)</script>');
        $fake = new UploadedFile($path, 'photo.png', 'image/png', null, true);

        $this->post('/api/issues', [...self::REPORT, 'photo' => $fake], ['Accept' => 'application/json'])
            ->assertJsonValidationErrors('photo');

        $real = UploadedFile::fake()->image('evil.html.png', 40, 40);
        $response = $this->post('/api/issues', [...self::REPORT, 'photo' => $real], ['Accept' => 'application/json'])
            ->assertCreated();

        $path = Issue::find($response->json('id'))->photo_path;
        Storage::disk('public')->assertExists($path);
        $this->assertMatchesRegularExpression('#^issues/\w+\.png$#', $path);
        $this->assertStringEndsWith($path, $response->json('photo_url'));
    }

    public function test_oversized_photos_are_rejected(): void
    {
        Storage::fake('public');
        Sanctum::actingAs($this->resident());

        $photo = UploadedFile::fake()->image('big.jpg')->size(4097);

        $this->post('/api/issues', [...self::REPORT, 'photo' => $photo], ['Accept' => 'application/json'])
            ->assertJsonValidationErrors(['photo' => 'up to 4 MB']);
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

    public function test_only_staff_can_change_status_priority_or_department(): void
    {
        $user = $this->resident();
        $issue = $this->report($user);

        $this->move($issue, 'acknowledged')->assertForbidden();
        $this->patchJson("/api/issues/{$issue->id}", ['priority' => 'urgent'])->assertForbidden();

        Sanctum::actingAs($this->staff());
        $this->patchJson("/api/issues/{$issue->id}", ['priority' => 'urgent', 'department' => 'Public Works'])
            ->assertOk()->assertJsonPath('priority', 'urgent')->assertJsonPath('department', 'Public Works');
    }

    public function test_guests_cannot_change_status(): void
    {
        $issue = $this->report();
        $this->asGuest();

        $this->move($issue, 'acknowledged')->assertUnauthorized();
    }

    public function test_invalid_status_moves_are_refused(): void
    {
        $issue = $this->report();
        Sanctum::actingAs($this->staff());

        $this->move($issue, 'resolved', 'Skipping ahead')->assertConflict();
        $this->move($issue, 'constructor')->assertUnprocessable();
    }

    public function test_resolving_or_rejecting_needs_an_explanation(): void
    {
        $issue = $this->report();
        Sanctum::actingAs($this->staff());

        $this->move($issue, 'rejected')->assertUnprocessable();
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

    public function test_reporter_identity_stays_private_from_the_public(): void
    {
        $user = $this->resident();
        $issue = $this->report($user);
        $this->postJson("/api/issues/{$issue->id}/comments", ['note' => 'Still broken.'])->assertCreated();
        $this->asGuest();

        $response = $this->getJson("/api/issues/{$issue->id}")->assertOk();
        $this->assertArrayNotHasKey('reporter_name', $response->json());
        $this->assertSame([null, null], array_column($response->json('timeline'), 'author'));
        $response->assertJsonPath('timeline.1.author_role', 'Reporter');

        $this->assertArrayNotHasKey('reporter_name', $this->getJson('/api/issues')->json('items.0'));

        Sanctum::actingAs($this->staff());
        $this->getJson("/api/issues/{$issue->id}")->assertJsonPath('reporter_name', 'Test Resident');
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

    public function test_the_list_filters_by_status_category_search_and_owner(): void
    {
        $user = $this->resident();
        $issue = $this->report($user, ['title' => 'Unique Zebra crossing', 'category' => 'road']);
        $this->report(fields: ['title' => 'Something different']);

        Sanctum::actingAs($this->staff());
        $this->move($issue, 'acknowledged')->assertOk();

        $ids = fn (string $query) => array_column($this->getJson("/api/issues?{$query}")->json('items'), 'id');

        $this->assertSame([$issue->id], $ids('q=zebra'), 'Search should ignore case.');
        $this->assertSame([], $ids('q=zebra&status=reported'));
        $this->assertSame([$issue->id], $ids('q=zebra&status=acknowledged&category=road'));
        $this->assertSame([], $ids('q=100%25'));

        Sanctum::actingAs($user);
        $this->assertSame([$issue->id], $ids('mine=1'));
    }

    public function test_my_reports_needs_an_account(): void
    {
        $this->getJson('/api/issues?mine=1')->assertUnauthorized();
    }

    public function test_the_queue_sorts_by_priority_then_age(): void
    {
        $normal = $this->report();
        $urgent = $this->report();
        Sanctum::actingAs($this->staff());
        $this->patchJson("/api/issues/{$urgent->id}", ['priority' => 'urgent'])->assertOk();

        $items = $this->getJson('/api/issues?sort=priority')->json('items');

        $this->assertSame([$urgent->id, $normal->id], array_column($items, 'id'));
    }

    public function test_the_list_paginates(): void
    {
        $user = User::factory()->create();
        Issue::insert(array_map(fn (int $n) => [
            ...self::REPORT, 'reporter_id' => $user->id, 'created_at' => now(), 'updated_at' => now(),
        ], range(1, 25)));

        $this->getJson('/api/issues?page=2')
            ->assertJsonCount(5, 'items')
            ->assertJsonPath('total', 25)
            ->assertJsonPath('page', 2)
            ->assertJsonPath('pages', 2);
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

    public function test_meta_describes_the_workflow(): void
    {
        $this->getJson('/api/meta')
            ->assertOk()
            ->assertJsonPath('statuses.in_progress', 'In progress')
            ->assertJsonPath('transitions.reported', ['acknowledged', 'rejected']);
    }

    public function test_malformed_filters_are_rejected_cleanly(): void
    {
        foreach (['status[]=x', 'category[]=x', 'q[]=x', 'q[a]=b', 'q=%FF%FE', 'q=a%00b', 'q='.str_repeat('a', 201)] as $query) {
            $this->getJson("/api/issues?{$query}")->assertUnprocessable();
        }
    }

    public function test_malformed_login_and_registration_are_rejected_cleanly(): void
    {
        $this->postJson('/api/auth/login', ['email' => ['a'], 'password' => 'x'])->assertUnprocessable();
        $this->postJson('/api/auth/login', ['email' => "a\0b@example.com", 'password' => 'x'])->assertUnprocessable();
        $this->postJson('/api/auth/register', ['name' => 'Valid', 'email' => ['a'], 'password' => 'password123'])->assertUnprocessable();
        $this->postJson('/api/auth/register', ['name' => "Va\0lid", 'email' => 'a@example.com', 'password' => 'password123'])->assertUnprocessable();
    }

    public function test_invalid_characters_never_reach_the_database(): void
    {
        Sanctum::actingAs($this->resident());

        $this->postJson('/api/issues', [...self::REPORT, 'title' => "Bad \0 title here"])->assertUnprocessable();
        $this->assertSame(0, Issue::count());
    }

    public function test_staff_accounts_can_be_created_from_the_command_line(): void
    {
        $this->artisan('staff:create', ['name' => 'New Staff', 'email' => 'NEW@Example.com'])->assertSuccessful();

        $this->assertTrue(User::where('email', 'new@example.com')->firstOrFail()->isStaff());
    }

    public function test_demo_data_cannot_be_seeded_in_production(): void
    {
        $this->app['env'] = 'production';

        $this->expectExceptionMessage('must not be seeded in production');
        $this->app->make(DatabaseSeeder::class)->run();
    }

    public function test_unknown_issues_and_routes_return_404(): void
    {
        $this->getJson('/api/issues/99999')->assertNotFound();
        $this->getJson('/api/issues/abc')->assertNotFound();
        $this->getJson('/api/issues/99999999999999999999')->assertNotFound();
        $this->getJson('/api/nope')->assertNotFound();
    }
}
