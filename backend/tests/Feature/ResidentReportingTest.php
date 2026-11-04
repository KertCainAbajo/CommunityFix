<?php

namespace Tests\Feature;

use App\Models\Issue;
use App\Notifications\IssueStatusChanged;
use App\Notifications\ReportReceived;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\ActsOnIssues;
use Tests\TestCase;

class ResidentReportingTest extends TestCase
{
    use ActsOnIssues, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutDefer();
    }

    public function test_anyone_can_report_without_an_account_and_gets_a_tracking_number(): void
    {
        $response = $this->postJson('/api/issues', self::REPORT)->assertCreated();

        $this->assertMatchesRegularExpression('/^CF-[A-Z2-9]{4}-[A-Z2-9]{4}$/', $response->json('tracking_code'));
        $this->assertSame('reported', Issue::first()->status->value);
    }

    public function test_reports_validate_their_fields(): void
    {
        $this->postJson('/api/issues', [...self::REPORT, 'title' => 'x'])->assertJsonValidationErrors('title');
        $this->postJson('/api/issues', [...self::REPORT, 'category' => 'nope'])->assertJsonValidationErrors('category');
        $this->postJson('/api/issues', [...self::REPORT, 'lat' => 12])->assertJsonValidationErrors('lng');
        $this->postJson('/api/issues', [...self::REPORT, 'contact_email' => 'nope'])->assertJsonValidationErrors('contact_email');
        $this->postJson('/api/issues', [...self::REPORT, 'contact_phone' => 'call me'])->assertJsonValidationErrors('contact_phone');
    }

    public function test_bots_that_fill_the_hidden_field_are_refused(): void
    {
        $this->postJson('/api/issues', [...self::REPORT, 'website' => 'http://spam.example'])->assertUnprocessable();

        $this->assertSame(0, Issue::count());
    }

    public function test_reports_are_rate_limited_per_visitor(): void
    {
        config(['communityfix.internal_key' => 'secret']);
        $from = fn (string $ip) => ['X-Internal-Key' => 'secret', 'X-Client-Ip' => $ip];

        foreach (range(1, 10) as $attempt) {
            $this->postJson('/api/issues', self::REPORT, $from('1.1.1.1'))->assertCreated();
        }

        $this->postJson('/api/issues', self::REPORT, $from('1.1.1.1'))->assertTooManyRequests();
        $this->postJson('/api/issues', self::REPORT, $from('2.2.2.2'))->assertCreated();
    }

    public function test_the_visitor_header_cannot_be_faked_without_the_key(): void
    {
        config(['communityfix.internal_key' => 'secret']);

        foreach (range(1, 10) as $attempt) {
            $this->postJson('/api/issues', self::REPORT, ['X-Client-Ip' => "9.9.9.{$attempt}"])->assertCreated();
        }

        $this->postJson('/api/issues', self::REPORT, ['X-Client-Ip' => '8.8.8.8'])->assertTooManyRequests();
    }

    public function test_up_to_three_photos_are_stored_after_checking_their_content(): void
    {
        Storage::fake('public');
        $photo = fn () => UploadedFile::fake()->image('photo.png', 40, 40);

        $this->post('/api/issues', [...self::REPORT, 'photos' => [$photo(), $photo(), $photo(), $photo()]], ['Accept' => 'application/json'])
            ->assertJsonValidationErrors('photos');

        // A real file: Laravel's fake uploads report their type from the name, not the bytes.
        $path = tempnam(sys_get_temp_dir(), 'cf');
        file_put_contents($path, '<script>alert(1)</script>');
        $fake = new UploadedFile($path, 'photo.png', 'image/png', null, true);
        $this->post('/api/issues', [...self::REPORT, 'photos' => [$fake]], ['Accept' => 'application/json'])
            ->assertJsonValidationErrors('photos.0');

        $this->post('/api/issues', [...self::REPORT, 'photos' => [$photo(), $photo()]], ['Accept' => 'application/json'])
            ->assertCreated();

        $photos = Issue::firstOrFail()->photos;
        $this->assertCount(2, $photos);
        Storage::disk('public')->assertExists($photos[0]->path);
    }

    public function test_tracking_shows_progress_with_any_letter_case(): void
    {
        $issue = $this->report();

        $this->getJson('/api/track/'.strtolower($issue->tracking_code))
            ->assertOk()
            ->assertJsonPath('status', 'reported')
            ->assertJsonPath('timeline.0.author_role', 'Resident');
    }

    public function test_tracking_never_shows_contact_details(): void
    {
        $issue = $this->report(['contact_name' => 'Sam', 'contact_email' => 'sam@example.com', 'contact_phone' => '0917 123 4567']);

        $response = $this->getJson("/api/track/{$issue->tracking_code}")->assertOk();

        $this->assertStringNotContainsString('sam@example.com', $response->getContent());
        $this->assertArrayNotHasKey('contact', $response->json());
    }

    public function test_a_wrong_tracking_number_finds_nothing(): void
    {
        $this->getJson('/api/track/CF-AAAA-BBBB')->assertNotFound();
        $this->getJson('/api/track/not-a-code')->assertNotFound();
    }

    public function test_tracking_lookups_are_rate_limited(): void
    {
        foreach (range(1, 30) as $attempt) {
            $this->getJson('/api/track/CF-AAAA-BBBB')->assertNotFound();
        }

        $this->getJson('/api/track/CF-AAAA-BBBB')->assertTooManyRequests();
    }

    public function test_new_reports_stay_hidden_until_staff_verify_them(): void
    {
        $issue = $this->report();

        $this->getJson("/api/issues/{$issue->id}")->assertNotFound();
        $this->getJson('/api/issues')->assertJsonPath('total', 0);

        Sanctum::actingAs($this->staff());
        $this->getJson('/api/issues')->assertJsonPath('total', 1);
        $this->move($issue, 'acknowledged')->assertOk();
        $this->asGuest();

        $this->getJson("/api/issues/{$issue->id}")->assertOk();
        $this->getJson('/api/issues')->assertJsonPath('total', 1);
    }

    public function test_rejected_reports_stay_hidden_from_the_public(): void
    {
        $issue = $this->report();
        Sanctum::actingAs($this->staff());
        $this->move($issue, 'rejected', 'Duplicate.')->assertOk();
        $this->asGuest();

        $this->getJson("/api/issues/{$issue->id}")->assertNotFound();
        $this->getJson("/api/track/{$issue->tracking_code}")->assertOk()->assertJsonPath('timeline.1.note', 'Duplicate.');
    }

    public function test_the_public_never_sees_tracking_numbers_or_contact_details(): void
    {
        Issue::factory()->verified()->create(['contact_email' => 'sam@example.com']);

        $list = $this->getJson('/api/issues')->assertOk();
        $issue = $list->json('items.0');

        $this->assertArrayNotHasKey('tracking_code', $issue);
        $this->assertArrayNotHasKey('contact', $issue);
        $this->assertStringNotContainsString('sam@example.com', $list->getContent());
    }

    public function test_the_tracking_number_holder_can_reopen_a_resolved_report(): void
    {
        $issue = $this->report();
        $url = "/api/track/{$issue->tracking_code}/reopen";

        $this->postJson($url, ['note' => 'Too early'])->assertConflict();

        $this->resolve($issue);

        $this->postJson($url, [])->assertUnprocessable();
        $this->postJson($url, ['note' => 'The light went out again.'])
            ->assertOk()
            ->assertJsonPath('status', 'acknowledged')
            ->assertJsonPath('resolved_at', null);
    }

    public function test_a_resident_who_left_an_email_is_kept_informed(): void
    {
        Notification::fake();
        $issue = $this->report(['contact_email' => 'sam@example.com']);

        Notification::assertSentTo(new AnonymousNotifiable, ReportReceived::class, function ($notification, $channels, $notifiable) use ($issue) {
            return $notifiable->routes['mail'] === 'sam@example.com'
                && str_contains($notification->toMail($notifiable)->subject, $issue->tracking_code);
        });

        Sanctum::actingAs($this->staff());
        $this->move($issue, 'acknowledged', 'We are on it.')->assertOk();

        Notification::assertSentTo(new AnonymousNotifiable, IssueStatusChanged::class, function ($notification, $channels, $notifiable) use ($issue) {
            $mail = $notification->toMail($notifiable);

            return in_array('Note from staff: We are on it.', $mail->introLines, true)
                && str_ends_with($mail->actionUrl, "/track/{$issue->tracking_code}");
        });
    }

    public function test_no_email_is_sent_without_an_address(): void
    {
        Notification::fake();
        $issue = $this->report();

        Sanctum::actingAs($this->staff());
        $this->move($issue, 'acknowledged')->assertOk();

        Notification::assertNothingSent();
    }

    public function test_a_mail_failure_does_not_lose_a_report(): void
    {
        config(['mail.default' => 'broken', 'mail.mailers.broken' => ['transport' => 'smtp', 'host' => '127.0.0.1', 'port' => 1]]);

        $this->report(['contact_email' => 'sam@example.com']);

        $this->assertSame(1, Issue::count());
    }

    public function test_the_list_filters_and_ignores_empty_form_fields(): void
    {
        $match = Issue::factory()->verified()->create(['title' => 'Unique Zebra crossing', 'category' => 'road']);
        Issue::factory()->verified()->create(['title' => 'Something different']);

        $ids = fn (string $query) => array_column($this->getJson("/api/issues?{$query}")->json('items'), 'id');

        $this->assertSame([$match->id], $ids('q=zebra'), 'Search should ignore case.');
        $this->assertSame([], $ids('q=zebra&status=resolved'));
        $this->assertSame([$match->id], $ids('q=zebra&status=acknowledged&category=road'));
        $this->assertSame([], $ids('q=100%25'));
        $this->assertCount(2, $ids('q=&status=&category=&sort='));
    }

    public function test_malformed_filters_are_rejected_cleanly(): void
    {
        foreach (['status[]=x', 'category[]=x', 'q[]=x', 'q[a]=b', 'sort[]=x', 'status=nope', 'page=abc', 'q=%FF%FE', 'q=a%00b', 'q='.str_repeat('a', 201)] as $query) {
            $this->getJson("/api/issues?{$query}")->assertUnprocessable();
        }
    }

    public function test_invalid_characters_never_reach_the_database(): void
    {
        $this->postJson('/api/issues', [...self::REPORT, 'title' => "Bad \0 title here"])->assertUnprocessable();

        $this->assertSame(0, Issue::count());
    }

    public function test_the_list_paginates(): void
    {
        Issue::factory()->verified()->count(25)->create();

        $this->getJson('/api/issues?page=2')
            ->assertJsonCount(5, 'items')
            ->assertJsonPath('total', 25)
            ->assertJsonPath('pages', 2);
    }

    public function test_meta_describes_the_workflow(): void
    {
        $this->getJson('/api/meta')
            ->assertOk()
            ->assertJsonPath('statuses.acknowledged', 'Verified')
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
