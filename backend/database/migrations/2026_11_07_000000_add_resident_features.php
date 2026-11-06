<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** In-site notifications, "Me too" on reports, resident feedback, and staff announcements. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('type');
            $table->morphs('notifiable');
            $table->text('data');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });

        Schema::create('issue_supports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('issue_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamp('created_at')->nullable();
            $table->unique(['issue_id', 'user_id']);
        });

        Schema::table('issues', function (Blueprint $table) {
            $table->unsignedTinyInteger('feedback_rating')->nullable();
            $table->string('feedback_note', 500)->nullable();
        });

        Schema::create('announcements', function (Blueprint $table) {
            $table->id();
            $table->string('title', 120);
            $table->text('body');
            $table->foreignId('author_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('announcements');
        Schema::table('issues', function (Blueprint $table) {
            $table->dropColumn(['feedback_rating', 'feedback_note']);
        });
        Schema::dropIfExists('issue_supports');
        Schema::dropIfExists('notifications');
    }
};
