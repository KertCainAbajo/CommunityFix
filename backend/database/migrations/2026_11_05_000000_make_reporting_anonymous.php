<?php

use App\Models\Issue;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/** Residents no longer have accounts: reports carry optional contact details and a tracking code. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('issues', function (Blueprint $table) {
            $table->string('tracking_code', 16)->nullable();
            $table->string('contact_name', 80)->nullable();
            $table->string('contact_email')->nullable();
            $table->string('contact_phone', 30)->nullable();
        });

        Schema::create('issue_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('issue_id')->constrained()->cascadeOnDelete();
            $table->string('kind')->default('evidence');
            $table->string('path');
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at');
        });

        Schema::table('issue_updates', function (Blueprint $table) {
            $table->foreignId('author_id')->nullable()->change();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('role')->default('staff')->change();
            $table->boolean('is_active')->default(true);
        });

        $this->moveExistingData();

        Schema::table('issues', function (Blueprint $table) {
            $table->unique('tracking_code');
            $table->dropConstrainedForeignId('reporter_id');
            $table->dropColumn('photo_path');
        });

        Schema::dropIfExists('issue_supports');

        $this->removeResidentAccounts();

        // Someone has to be able to manage staff accounts.
        if (! DB::table('users')->where('role', 'admin')->exists()) {
            DB::table('users')->where('role', 'staff')->orderBy('id')->limit(1)->update(['role' => 'admin']);
        }
    }

    private function moveExistingData(): void
    {
        foreach (DB::table('issues')->get() as $issue) {
            $reporter = DB::table('users')->where('id', $issue->reporter_id)->first();

            DB::table('issues')->where('id', $issue->id)->update([
                'tracking_code' => Issue::generateTrackingCode(),
                'contact_name' => $reporter?->name,
                'contact_email' => $reporter?->email,
            ]);

            if ($issue->photo_path) {
                DB::table('issue_photos')->insert([
                    'issue_id' => $issue->id,
                    'kind' => 'evidence',
                    'path' => $issue->photo_path,
                    'created_at' => $issue->created_at,
                ]);
            }
        }
    }

    private function removeResidentAccounts(): void
    {
        $residents = DB::table('users')->where('role', 'resident')->pluck('id');

        DB::table('issue_updates')->whereIn('author_id', $residents)->update(['author_id' => null]);
        DB::table('personal_access_tokens')->whereIn('tokenable_id', $residents)->delete();
        DB::table('users')->whereIn('id', $residents)->delete();
    }

    public function down(): void
    {
        throw new RuntimeException('Resident accounts were removed, so this migration cannot be reversed.');
    }
};
