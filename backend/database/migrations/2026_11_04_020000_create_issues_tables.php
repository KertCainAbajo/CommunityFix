<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('issues', function (Blueprint $table) {
            $table->id();
            $table->string('title', 120);
            $table->text('description');
            $table->string('category')->index();
            $table->string('address', 200);
            $table->decimal('lat', 9, 6)->nullable();
            $table->decimal('lng', 9, 6)->nullable();
            $table->string('photo_path')->nullable();
            $table->string('status')->default('reported')->index();
            $table->string('priority')->default('normal');
            $table->string('department', 80)->nullable();
            $table->foreignId('reporter_id')->constrained('users');
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
        });

        // The report's history: one row per status change or comment.
        Schema::create('issue_updates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('issue_id')->constrained()->cascadeOnDelete();
            $table->foreignId('author_id')->constrained('users');
            $table->string('from_status')->nullable();
            $table->string('to_status')->nullable();
            $table->text('note')->nullable();
            $table->timestamp('created_at');
        });

        // "This affects me too" votes from other residents.
        Schema::create('issue_supports', function (Blueprint $table) {
            $table->foreignId('issue_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->primary(['issue_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('issue_supports');
        Schema::dropIfExists('issue_updates');
        Schema::dropIfExists('issues');
    }
};
