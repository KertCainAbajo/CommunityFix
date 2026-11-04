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

class IssueReportingTest extends TestCase
{
    use ActsOnIssues, RefreshDatabase;

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

    public function test_reports_are_rate_limited_per_account(): void
    {
        $spammer = $this->resident();
        Sanctum::actingAs($spammer);

        foreach (range(1, 10) as $attempt) {
            $this->postJson('/api/issues', self::REPORT)->assertCreated();
        }

        $this->postJson('/api/issues', self::REPORT)->assertTooManyRequests();

        $this->report($this->resident());
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

        $stored = Issue::find($response->json('id'))->photo_path;
        Storage::disk('public')->assertExists($stored);
        $this->assertMatchesRegularExpression('#^issues/\w+\.png$#', $stored);
        $this->assertStringEndsWith($stored, $response->json('photo_url'));
    }

    public function test_oversized_photos_are_rejected(): void
    {
        Storage::fake('public');
        Sanctum::actingAs($this->resident());

        $photo = UploadedFile::fake()->image('big.jpg')->size(4097);

        $this->post('/api/issues', [...self::REPORT, 'photo' => $photo], ['Accept' => 'application/json'])
            ->assertJsonValidationErrors(['photo' => 'up to 4 MB']);
    }

    public function test_invalid_characters_never_reach_the_database(): void
    {
        Sanctum::actingAs($this->resident());

        $this->postJson('/api/issues', [...self::REPORT, 'title' => "Bad \0 title here"])->assertUnprocessable();

        $this->assertSame(0, Issue::count());
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

    public function test_empty_filters_from_the_search_form_are_ignored(): void
    {
        Issue::factory()->create();

        $this->getJson('/api/issues?q=&status=&category=&sort=')->assertOk()->assertJsonPath('total', 1);
    }

    public function test_my_reports_needs_an_account(): void
    {
        $this->getJson('/api/issues?mine=1')->assertUnauthorized();
    }

    public function test_malformed_filters_are_rejected_cleanly(): void
    {
        foreach (['status[]=x', 'category[]=x', 'q[]=x', 'q[a]=b', 'sort[]=x', 'status=nope', 'page=abc', 'q=%FF%FE', 'q=a%00b', 'q='.str_repeat('a', 201)] as $query) {
            $this->getJson("/api/issues?{$query}")->assertUnprocessable();
        }
    }

    public function test_the_queue_sorts_by_priority_then_age(): void
    {
        $normal = Issue::factory()->create();
        $urgent = Issue::factory()->create(['priority' => 'urgent']);

        $items = $this->getJson('/api/issues?sort=priority')->json('items');

        $this->assertSame([$urgent->id, $normal->id], array_column($items, 'id'));
    }

    public function test_the_list_paginates(): void
    {
        Issue::factory()->count(25)->for(User::factory(), 'reporter')->create();

        $this->getJson('/api/issues?page=2')
            ->assertJsonCount(5, 'items')
            ->assertJsonPath('total', 25)
            ->assertJsonPath('page', 2)
            ->assertJsonPath('pages', 2);
    }

    public function test_meta_describes_the_workflow(): void
    {
        $this->getJson('/api/meta')
            ->assertOk()
            ->assertJsonPath('statuses.in_progress', 'In progress')
            ->assertJsonPath('transitions.reported', ['acknowledged', 'rejected']);
    }

    public function test_unknown_issues_and_routes_return_404(): void
    {
        $this->getJson('/api/issues/99999')->assertNotFound();
        $this->getJson('/api/issues/abc')->assertNotFound();
        $this->getJson('/api/issues/99999999999999999999')->assertNotFound();
        $this->getJson('/api/nope')->assertNotFound();
    }
}
