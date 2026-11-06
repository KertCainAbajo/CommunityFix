"use client";

import { Check, Star } from "lucide-react";
import { useActionState, useState, useTransition } from "react";

import {
  addMyPhoto,
  addReply,
  cancelReport,
  changePassword,
  createAnnouncement,
  deleteAccount,
  deleteAnnouncement,
  editReport,
  markNotificationsRead,
  resendVerification,
  sendFeedback,
  updateAccount,
} from "@/app/actions";
import { Field, FormError, FormNotice, Previews, Submit, usePhotos } from "@/components/forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { Issue, Meta, User } from "@/lib/types";
import { cn } from "@/lib/utils";

// Account

export function AccountForm({ user }: { user: User }) {
  const [state, action] = useActionState(updateAccount, null);
  const [email, setEmail] = useState(user.email ?? "");
  const changingEmail = email.trim().toLowerCase() !== (user.email ?? "") && user.has_password;

  return (
    <form action={action} className="grid gap-4">
      <Field label="Full name" id="account-name">
        <Input id="account-name" name="name" required minLength={2} maxLength={80} autoComplete="name" defaultValue={user.name} />
      </Field>
      <Field label="Email" id="account-email">
        <Input id="account-email" type="email" name="email" required={!!user.email} maxLength={255} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      </Field>
      <Field label="Phone number (optional)" id="account-phone">
        <Input id="account-phone" type="tel" name="phone" maxLength={20} autoComplete="tel" defaultValue={user.phone ?? ""} />
      </Field>
      {changingEmail && (
        <Field label="Your current password, to change your email" id="account-confirm">
          <Input id="account-confirm" type="password" name="current_password" required autoComplete="current-password" />
        </Field>
      )}
      <FormNotice state={state} />
      <FormError state={state} />
      <div><Submit>Save changes</Submit></div>
    </form>
  );
}

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, action] = useActionState(changePassword, null);

  return (
    <form action={action} className="grid gap-4">
      {hasPassword && (
        <Field label="Current password" id="password-current">
          <Input id="password-current" type="password" name="current_password" required autoComplete="current-password" />
        </Field>
      )}
      <Field label="New password (at least 8 characters)" id="password-new">
        <Input id="password-new" type="password" name="password" required minLength={8} maxLength={72} autoComplete="new-password" />
      </Field>
      <FormNotice state={state} />
      <FormError state={state} />
      <div><Submit>{hasPassword ? "Change password" : "Set a password"}</Submit></div>
    </form>
  );
}

export function DeleteAccountForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, action] = useActionState(deleteAccount, null);
  const [open, setOpen] = useState(false);

  if (!open) {
    return <div><Button type="button" variant="destructive" className="h-11" onClick={() => setOpen(true)}>Delete my account</Button></div>;
  }

  return (
    <form action={action} className="grid gap-4">
      <p className="font-semibold">This can&apos;t be undone. Are you sure?</p>
      {hasPassword && (
        <Field label="Enter your password to confirm" id="delete-password">
          <Input id="delete-password" type="password" name="current_password" required autoComplete="current-password" />
        </Field>
      )}
      <FormError state={state} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="destructive" className="h-11">Yes, delete my account</Button>
        <Button type="button" variant="ghost" className="h-11" onClick={() => setOpen(false)}>Keep my account</Button>
      </div>
    </form>
  );
}

export function ResendVerification() {
  const [state, action] = useActionState(resendVerification, null);

  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <Button type="submit" variant="outline" className="h-9 text-sm">Send the link again</Button>
      <FormNotice state={state} />
      <FormError state={state} />
    </form>
  );
}

export function MarkAllRead() {
  const [pending, start] = useTransition();

  return (
    <Button type="button" variant="outline" className="h-9 text-sm" disabled={pending} onClick={() => start(() => markNotificationsRead())}>
      Mark all as read
    </Button>
  );
}

// A resident's own report

export function ReplyForm({ issueId }: { issueId: number }) {
  const [state, action] = useActionState(addReply.bind(null, issueId), null);

  return (
    <form action={action} className="grid gap-3">
      <Field label="Add a message for staff" id="reply-note">
        <Textarea id="reply-note" name="note" rows={3} maxLength={1000} required placeholder="Has anything changed? Is there something staff should know?" />
      </Field>
      <FormError state={state} />
      <div><Submit variant="outline">Send message</Submit></div>
    </form>
  );
}

export function AddPhotoForm({ issueId }: { issueId: number }) {
  const [state, action] = useActionState(addMyPhoto.bind(null, issueId), null);
  const { choose, previews, error } = usePhotos(1);

  return (
    <form action={action} className="sheet">
      <h2 className="text-xl">Add another photo</h2>
      <Field label="Choose a photo" id="my-photo">
        <Input id="my-photo" type="file" name="photo" required accept="image/jpeg,image/png,image/webp" onChange={choose} className="h-auto py-2.5" />
      </Field>
      <Previews urls={previews} />
      <FormError state={error ?? state} />
      <div><Submit variant="outline">Upload photo</Submit></div>
    </form>
  );
}

export function EditReportForm({ issue, meta }: { issue: Issue; meta: Meta }) {
  const [state, action] = useActionState(editReport.bind(null, issue.id), null);

  return (
    <details className="sheet">
      <summary className="cursor-pointer font-heading text-xl font-bold">Edit this report</summary>
      <form action={action} className="grid gap-3 pt-3">
        <Field label="Title" id="edit-title">
          <Input id="edit-title" name="title" required minLength={5} maxLength={120} defaultValue={issue.title} />
        </Field>
        <Field label="Type of problem" id="edit-category">
          <NativeSelect id="edit-category" name="category" defaultValue={issue.category}>
            {Object.entries(meta.categories).map(([key, label]) => <NativeSelectOption key={key} value={key}>{label}</NativeSelectOption>)}
          </NativeSelect>
        </Field>
        <Field label="Description" id="edit-description">
          <Textarea id="edit-description" name="description" rows={4} required minLength={10} maxLength={2000} defaultValue={issue.description} />
        </Field>
        <Field label="Street and nearest landmark" id="edit-address">
          <Input id="edit-address" name="address" required minLength={3} maxLength={200} defaultValue={issue.address} />
        </Field>
        <FormError state={state} />
        <div><Submit>Save changes</Submit></div>
      </form>
    </details>
  );
}

export function CancelReportForm({ issueId }: { issueId: number }) {
  const [state, action] = useActionState(cancelReport.bind(null, issueId), null);
  const [sure, setSure] = useState(false);

  return (
    <section className="sheet">
      <h2 className="text-xl">Filed this by mistake?</h2>
      <p className="text-muted-foreground">You can cancel it until staff review it.</p>
      {sure ? (
        <form action={action} className="flex flex-wrap gap-2">
          <Button type="submit" variant="destructive" className="h-11">Yes, cancel my report</Button>
          <Button type="button" variant="ghost" className="h-11" onClick={() => setSure(false)}>Keep it</Button>
        </form>
      ) : (
        <div><Button type="button" variant="destructive" className="h-11" onClick={() => setSure(true)}>Cancel this report</Button></div>
      )}
      <FormError state={state} />
    </section>
  );
}

export function FeedbackForm({ issue }: { issue: Issue }) {
  const [state, action] = useActionState(sendFeedback.bind(null, issue.id), null);
  const [rating, setRating] = useState(issue.feedback?.rating ?? 0);

  return (
    <form action={action} className="sheet">
      <h2 className="text-xl">How was the fix?</h2>
      <fieldset>
        <legend className="sr-only">Rate the fix from 1 to 5 stars</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <label key={value} className="cursor-pointer rounded-md p-1 transition-transform hover:scale-110 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring">
              <input type="radio" name="rating" value={value} required checked={rating === value} onChange={() => setRating(value)} className="sr-only" />
              <span className="sr-only">{value} {value === 1 ? "star" : "stars"}</span>
              <Star aria-hidden className={cn("size-7", value <= rating ? "fill-amber-400 text-amber-400" : "text-input")} />
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Anything to add? (optional)" id="feedback-note">
        <Textarea id="feedback-note" name="note" rows={2} maxLength={500} defaultValue={issue.feedback?.note ?? ""} />
      </Field>
      <FormError state={state} />
      {issue.feedback && <p className="flex items-center gap-1.5 text-sm text-brand-green"><Check aria-hidden className="size-4" /> Thank you for your feedback.</p>}
      <div><Submit variant="outline">{issue.feedback ? "Update my rating" : "Send my rating"}</Submit></div>
    </form>
  );
}

// Staff announcements

export function AnnouncementForm() {
  const [state, action] = useActionState(createAnnouncement, null);

  return (
    <form action={action} className="grid gap-3">
      <Field label="Title" id="notice-title">
        <Input id="notice-title" name="title" required minLength={3} maxLength={120} placeholder="For example: Water interruption on Friday" />
      </Field>
      <Field label="Message" id="notice-body">
        <Textarea id="notice-body" name="body" rows={3} required minLength={3} maxLength={1000} />
      </Field>
      <FormError state={state} />
      <div><Submit>Post announcement</Submit></div>
    </form>
  );
}

export function DeleteAnnouncement({ id }: { id: number }) {
  const [pending, start] = useTransition();

  return (
    <Button type="button" variant="ghost" className="h-8 text-sm text-destructive" disabled={pending} onClick={() => start(() => deleteAnnouncement(id))}>
      Remove
    </Button>
  );
}
