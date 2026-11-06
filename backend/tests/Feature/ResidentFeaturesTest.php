<?php

namespace Tests\Feature;

use App\Models\Issue;
use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Laravel\Sanctum\Sanctum;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\GoogleProvider;
use Tests\Concerns\ActsOnIssues;
use Tests\TestCase;

class ResidentFeaturesTest extends TestCase
{
    use ActsOnIssues, RefreshDatabase;

    private const PIN = ['lat' => 14.6, 'lng' => 120.98];

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutDefer();
    }

    private function resident(array $fields = []): User
    {
        $resident = User::factory()->resident()->create(['password' => 'password123', ...$fields]);
        Sanctum::actingAs($resident);

        return $resident;
    }

    private function verifyAs(string $status, Issue $issue): void
    {
        Sanctum::actingAs($this->staff());
        $this->move($issue, $status)->assertOk();
    }

    // Email confirmation

    public function test_signing_up_sends_a_confirmation_link_that_works_once_opened(): void
    {
        Notification::fake();

        $this->postJson('/api/auth/register', ['name' => 'Ana', 'email' => 'ana@example.com', 'password' => 'password123'])
            ->assertCreated()->assertJsonPath('user.email_verified', false);

        $user = User::where('email', 'ana@example.com')->first();
        Notification::assertSentTo($user, VerifyEmail::class);

        $url = URL::temporarySignedRoute('verification.verify', now()->addHour(), ['user' => $user->id, 'hash' => sha1($user->email)]);
        $this->get($url)->assertRedirect(config('communityfix.frontend_url').'/account?verified=1');
        $this->assertTrue($user->refresh()->hasVerifiedEmail());
    }

    public function test_a_tampered_confirmation_link_does_nothing(): void
    {
        $user = User::factory()->resident()->unverified()->create();

        $this->get("/api/auth/verify-email/{$user->id}/".sha1($user->email))
            ->assertRedirect(config('communityfix.frontend_url').'/account?verified=0');
        $this->assertFalse($user->refresh()->hasVerifiedEmail());
    }

    public function test_an_unconfirmed_address_gets_no_report_emails_until_it_is_confirmed(): void
    {
        $user = $this->resident(['email' => 'maybe@example.com', 'email_verified_at' => null]);
        $issue = $this->report();
        $this->assertNull($issue->contact_email);

        $url = URL::temporarySignedRoute('verification.verify', now()->addHour(), ['user' => $user->id, 'hash' => sha1($user->email)]);
        $this->get($url);
        $this->assertSame('maybe@example.com', $issue->refresh()->contact_email);
    }

    public function test_google_locks_out_whoever_registered_an_unconfirmed_address_first(): void
    {
        config(['services.google.client_id' => 'id', 'services.google.client_secret' => 'secret']);
        $squatter = User::factory()->resident()->unverified()->create(['email' => 'real@example.com', 'password' => 'password123']);
        $token = $squatter->createToken('web')->plainTextToken;

        $google = (new \Laravel\Socialite\Two\User)->setRaw(['email_verified' => true])->map(['id' => 'g-1', 'name' => 'Real Owner', 'email' => 'real@example.com']);
        $provider = \Mockery::mock(GoogleProvider::class);
        $provider->shouldReceive('stateless')->andReturnSelf();
        $provider->shouldReceive('redirectUrl')->andReturnSelf();
        $provider->shouldReceive('user')->andReturn($google);
        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);

        $this->postJson('/api/auth/google/callback', ['code' => 'abc'])->assertOk();

        $this->assertNull($squatter->refresh()->password);
        $this->assertSame(0, $squatter->tokens()->where('token', hash('sha256', explode('|', $token)[1]))->count());
    }

    // Account settings

    public function test_residents_can_change_their_details(): void
    {
        $this->resident(['email' => 'ana@example.com']);

        $this->patchJson('/api/account', ['name' => 'Ana Cruz', 'email' => 'ana@example.com', 'phone' => '0917 123 4567'])
            ->assertOk()->assertJsonPath('user.name', 'Ana Cruz')->assertJsonPath('user.phone', '+639171234567')
            ->assertJsonPath('user.email_verified', true);
    }

    public function test_changing_the_email_needs_the_password_and_a_new_confirmation(): void
    {
        Notification::fake();
        $user = $this->resident(['email' => 'old@example.com']);

        $this->patchJson('/api/account', ['name' => 'Ana', 'email' => 'new@example.com'])->assertUnprocessable();
        $this->patchJson('/api/account', ['name' => 'Ana', 'email' => 'new@example.com', 'current_password' => 'wrong-one'])->assertUnprocessable();
        $this->assertSame('old@example.com', $user->refresh()->email);

        $this->patchJson('/api/account', ['name' => 'Ana', 'email' => 'new@example.com', 'current_password' => 'password123'])
            ->assertOk()->assertJsonPath('user.email_verified', false);
        Notification::assertSentTo($user, VerifyEmail::class);
    }

    public function test_an_email_cannot_be_removed_and_older_phone_accounts_can_add_one(): void
    {
        $this->resident(['email' => 'ana@example.com']);
        $this->patchJson('/api/account', ['name' => 'Ana', 'email' => ''])->assertUnprocessable();

        $this->resident(['email' => null, 'phone' => '+639170000009']);
        $this->patchJson('/api/account', ['name' => 'Ben', 'email' => 'ben@example.com', 'phone' => '09170000009', 'current_password' => 'password123'])->assertOk();
    }

    public function test_changing_the_password_needs_the_old_one_and_ends_other_sessions(): void
    {
        $user = User::factory()->resident()->create(['email' => 'ana@example.com', 'password' => 'password123']);
        $other = $user->createToken('other')->accessToken;
        $current = $user->createToken('current')->plainTextToken;
        $headers = ['Authorization' => "Bearer {$current}"];

        $this->putJson('/api/account/password', ['current_password' => 'nope', 'password' => 'new-password'], $headers)->assertUnprocessable();
        $this->putJson('/api/account/password', ['current_password' => 'password123', 'password' => 'new-password'], $headers)->assertNoContent();

        $this->assertNull($other->fresh());
        $this->asGuest();
        $this->postJson('/api/auth/login', ['login' => 'ana@example.com', 'password' => 'new-password'])->assertOk();
    }

    public function test_deleting_an_account_keeps_the_report_but_removes_personal_details(): void
    {
        $user = $this->resident(['name' => 'Ana', 'email' => 'ana@example.com']);
        $issue = $this->report();

        $this->deleteJson('/api/account', ['current_password' => 'wrong'])->assertUnprocessable();
        $this->deleteJson('/api/account', ['current_password' => 'password123'])->assertNoContent();

        $this->assertNull(User::find($user->id));
        $issue->refresh();
        $this->assertNull($issue->user_id);
        $this->assertNull($issue->contact_email);
        $this->assertNull($issue->contact_name);
    }

    public function test_staff_cannot_delete_their_own_account(): void
    {
        Sanctum::actingAs($this->staff());
        $this->deleteJson('/api/account', ['current_password' => 'password'])->assertForbidden();
    }

    // Notifications

    public function test_status_changes_and_staff_notes_reach_the_bell_and_can_be_marked_read(): void
    {
        $owner = $this->resident(['email' => null]);
        $issue = $this->report();

        $this->verifyAs('acknowledged', $issue);
        $this->postJson("/api/issues/{$issue->id}/comments", ['note' => 'A team is on the way.'])->assertCreated();

        Sanctum::actingAs($owner);
        $this->getJson('/api/notifications')->assertOk()
            ->assertJsonPath('unread', 2)
            ->assertJsonPath('items.1.href', "/track/{$issue->tracking_code}")
            ->assertJsonPath('items.1.title', $issue->title);

        $this->postJson('/api/notifications/read')->assertNoContent();
        $this->getJson('/api/notifications')->assertJsonPath('unread', 0);
    }

    public function test_notifications_belong_to_one_person(): void
    {
        $this->resident();
        $issue = $this->report();
        $this->verifyAs('acknowledged', $issue);

        $this->asResident();
        $this->getJson('/api/notifications')->assertJsonPath('unread', 0)->assertJsonCount(0, 'items');
    }

    // Working on your own report

    public function test_residents_can_edit_or_cancel_only_before_review(): void
    {
        Storage::fake();
        $owner = $this->resident();
        $issue = $this->report();
        $edit = ['title' => 'A clearer title here', 'description' => 'A much clearer description.', 'category' => 'road', 'address' => 'Rizal Ave'];

        $this->patchJson("/api/my/issues/{$issue->id}", $edit)->assertOk()->assertJsonPath('title', 'A clearer title here');

        $this->verifyAs('acknowledged', $issue);
        Sanctum::actingAs($owner);
        $this->patchJson("/api/my/issues/{$issue->id}", $edit)->assertConflict();
        $this->deleteJson("/api/my/issues/{$issue->id}")->assertConflict();

        $second = $this->report();
        $this->deleteJson("/api/my/issues/{$second->id}")->assertNoContent();
        $this->assertNull(Issue::find($second->id));
    }

    public function test_only_the_reporter_can_touch_a_report(): void
    {
        $this->resident();
        $issue = $this->report();

        $this->asResident();
        $this->patchJson("/api/my/issues/{$issue->id}", [...self::REPORT])->assertForbidden();
        $this->deleteJson("/api/my/issues/{$issue->id}")->assertForbidden();
        $this->postJson("/api/my/issues/{$issue->id}/comments", ['note' => 'Hi'])->assertForbidden();
        $this->postJson("/api/my/issues/{$issue->id}/feedback", ['rating' => 1])->assertForbidden();
        $this->post("/api/my/issues/{$issue->id}/photos", [], ['Accept' => 'application/json'])->assertForbidden();
    }

    public function test_residents_can_reply_and_their_name_stays_private(): void
    {
        $this->resident(['name' => 'Very Private Name']);
        $issue = $this->report();

        $this->postJson("/api/my/issues/{$issue->id}/comments", ['note' => 'It got worse today.'])->assertCreated()
            ->assertJsonPath('timeline.1.note', 'It got worse today.')
            ->assertJsonPath('timeline.1.author', null)
            ->assertJsonPath('timeline.1.author_role', 'Resident');
    }

    public function test_residents_can_add_a_photo_later(): void
    {
        Storage::fake();
        $this->resident();
        $issue = $this->report();
        $tmp = tempnam(sys_get_temp_dir(), 'cf').'.jpg';
        imagejpeg(imagecreatetruecolor(4, 4), $tmp);

        $this->post("/api/my/issues/{$issue->id}/photos", ['photo' => new UploadedFile($tmp, 'a.jpg', 'image/jpeg', null, true)], ['Accept' => 'application/json'])
            ->assertCreated()->assertJsonCount(1, 'photos');
        @unlink($tmp);
    }

    public function test_feedback_is_only_for_resolved_reports_and_stays_private(): void
    {
        $owner = $this->resident();
        $issue = $this->report();
        $this->postJson("/api/my/issues/{$issue->id}/feedback", ['rating' => 5])->assertConflict();

        $this->resolve($issue);
        Sanctum::actingAs($owner);
        $this->postJson("/api/my/issues/{$issue->id}/feedback", ['rating' => 9])->assertUnprocessable();
        $this->postJson("/api/my/issues/{$issue->id}/feedback", ['rating' => 4, 'note' => 'Fast work.'])->assertOk()->assertJsonPath('feedback.rating', 4);

        $this->asResident();
        $this->getJson("/api/issues/{$issue->id}")->assertOk()->assertJsonMissingPath('feedback');
    }

    public function test_my_reports_counts_every_status_and_can_filter(): void
    {
        $owner = $this->resident();
        $first = $this->report();
        $this->report(['title' => 'A second report']);
        $this->verifyAs('acknowledged', $first);

        Sanctum::actingAs($owner);
        $this->getJson('/api/my/issues?status=acknowledged')->assertOk()
            ->assertJsonCount(1, 'items')
            ->assertJsonPath('counts.acknowledged', 1)
            ->assertJsonPath('counts.reported', 1);
        $this->getJson('/api/my/issues?status=nonsense')->assertUnprocessable();

        $this->asResident();
        $this->getJson('/api/my/issues')->assertOk()->assertJson(['counts' => []]);
    }

    // Me too

    public function test_nearby_finds_verified_open_reports_of_the_same_type_only(): void
    {
        $this->resident();
        $near = $this->report(self::PIN);
        $hidden = $this->report([...self::PIN, 'title' => 'Not verified yet']);
        $far = $this->report(['lat' => 15.5, 'lng' => 121.5, 'title' => 'Far away report']);
        $other = $this->report([...self::PIN, 'category' => 'road', 'title' => 'Other type here']);
        foreach ([$near, $far, $other] as $issue) {
            $this->verifyAs('acknowledged', $issue);
        }

        $this->asResident();
        $this->getJson('/api/issues/nearby?'.http_build_query([...self::PIN, 'category' => 'streetlight']))
            ->assertOk()->assertJsonCount(1, 'items')->assertJsonPath('items.0.id', $near->id);
        $this->assertNotNull($hidden);
    }

    public function test_me_too_counts_once_can_be_undone_and_brings_updates(): void
    {
        $this->resident();
        $issue = $this->report();
        $this->verifyAs('acknowledged', $issue);

        $neighbor = $this->asResident();
        $this->postJson("/api/issues/{$issue->id}/support")->assertCreated()->assertJsonPath('supporters', 1)->assertJsonPath('supported', true);
        $this->postJson("/api/issues/{$issue->id}/support")->assertCreated()->assertJsonPath('supporters', 1);

        $this->verifyAs('in_progress', $issue);
        Sanctum::actingAs($neighbor);
        $this->getJson('/api/notifications')->assertJsonPath('unread', 1)->assertJsonPath('items.0.href', "/issues/{$issue->id}");

        $this->deleteJson("/api/issues/{$issue->id}/support")->assertNoContent();
        $this->getJson("/api/issues/{$issue->id}")->assertJsonPath('supporters', 0)->assertJsonPath('supported', false);
    }

    public function test_me_too_is_refused_on_your_own_hidden_or_finished_reports(): void
    {
        $owner = $this->resident();
        $issue = $this->report();

        $this->asResident();
        $this->postJson("/api/issues/{$issue->id}/support")->assertConflict();

        $this->verifyAs('acknowledged', $issue);
        Sanctum::actingAs($owner);
        $this->postJson("/api/issues/{$issue->id}/support")->assertUnprocessable();
    }

    // Announcements

    public function test_staff_post_announcements_that_everyone_signed_in_can_read(): void
    {
        $notice = ['title' => 'Water interruption', 'body' => 'No water on Friday morning.'];

        $this->resident();
        $this->postJson('/api/announcements', $notice)->assertForbidden();

        Sanctum::actingAs($this->staff());
        $id = $this->postJson('/api/announcements', $notice)->assertCreated()->json('id');

        $this->asResident();
        $this->getJson('/api/announcements')->assertOk()->assertJsonPath('items.0.title', 'Water interruption');
        $this->deleteJson("/api/announcements/{$id}")->assertForbidden();

        $this->asGuest();
        $this->getJson('/api/announcements')->assertUnauthorized();

        Sanctum::actingAs($this->staff());
        $this->deleteJson("/api/announcements/{$id}")->assertNoContent();
    }
}
