"use client";

import Link from "next/link";
import { useActionState, useState, useTransition, type ChangeEvent, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

import {
  addComment,
  assignIssue,
  changeStatus,
  createIssue,
  login,
  register,
  reopenIssue,
  toggleSupport,
} from "@/app/actions";
import { LocationPicker } from "@/components/maps";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { FormState, Issue, Meta, Status } from "@/lib/types";

const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
const MAX_PHOTO_EDGE = 1600;

function Field({ label, id, children }: { label: ReactNode; id: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function FormError({ state }: { state: FormState }) {
  if (!state) return null;
  return (
    <Alert variant="destructive" role="alert">
      <AlertDescription>{state.error}</AlertDescription>
    </Alert>
  );
}

function Submit({ children, variant }: { children: ReactNode; variant?: "default" | "outline" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending} className="h-10 px-4">
      {children}
    </Button>
  );
}

export function AuthForm({ mode, next }: { mode: "login" | "register"; next: string }) {
  const isLogin = mode === "login";
  const [state, action] = useActionState(isLogin ? login : register, null);

  return (
    <form action={action} className="grid gap-4 rounded-xl border bg-card p-5">
      <input type="hidden" name="next" value={next} />
      {!isLogin && (
        <Field label="Your name" id="name">
          <Input id="name" name="name" required minLength={2} maxLength={80} autoComplete="name" />
        </Field>
      )}
      <Field label="Email" id="email">
        <Input id="email" type="email" name="email" required autoComplete="email" />
      </Field>
      <Field label="Password" id="password">
        <Input
          id="password"
          type="password"
          name="password"
          required
          minLength={isLogin ? undefined : 8}
          autoComplete={isLogin ? "current-password" : "new-password"}
        />
      </Field>
      <FormError state={state} />
      <Submit>{isLogin ? "Log in" : "Create account"}</Submit>
    </form>
  );
}

// Phone photos are often 5 MB or more. Shrinking them here keeps uploads fast
// and under the size limits of the hosting platforms.
async function shrinkPhoto(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_PHOTO_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  return blob ? new File([blob], "photo.jpg", { type: "image/jpeg" }) : file;
}

export function ReportForm({ meta }: { meta: Meta }) {
  const [state, action] = useActionState(createIssue, null);
  const [preview, setPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<FormState>(null);

  const choosePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const [file] = input.files ?? [];
    setPhotoError(null);
    setPreview(null);
    if (!file) return;

    const photo = await shrinkPhoto(file).catch(() => file);
    if (photo.size > MAX_PHOTO_BYTES) {
      input.value = "";
      setPhotoError({ error: "Photos can be up to 4 MB." });
      return;
    }

    const files = new DataTransfer();
    files.items.add(photo);
    input.files = files.files;
    setPreview(URL.createObjectURL(photo));
  };

  return (
    <form action={action} className="grid gap-4 rounded-xl border bg-card p-5">
      <Field label="Type of problem" id="category">
        <NativeSelect id="category" name="category" required className="w-full">
          <NativeSelectOption value="">Choose one…</NativeSelectOption>
          {Object.entries(meta.categories).map(([key, label]) => (
            <NativeSelectOption key={key} value={key}>{label}</NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Short title" id="title">
        <Input id="title" name="title" required minLength={5} maxLength={120} placeholder="e.g. Streetlight out near the covered court" />
      </Field>
      <Field label="What's wrong?" id="description">
        <Textarea
          id="description"
          name="description"
          rows={4}
          required
          minLength={10}
          maxLength={2000}
          placeholder="What did you see, how long has it been like this, and is anyone at risk?"
        />
      </Field>
      <Field label="Where is it?" id="address">
        <Input id="address" name="address" required minLength={3} maxLength={200} placeholder="Street, nearest landmark" />
      </Field>
      <LocationPicker center={meta.map_center} />
      <Field label={<>Photo <span className="font-normal text-muted-foreground">(optional)</span></>} id="photo">
        <Input id="photo" type="file" name="photo" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto} />
      </Field>
      {preview && <img src={preview} alt="Preview of your photo" className="max-h-72 w-full rounded-lg object-cover" />}
      <FormError state={photoError ?? state} />
      <Submit>Submit report</Submit>
    </form>
  );
}

export function CommentForm({ issueId }: { issueId: number }) {
  const [state, action] = useActionState(addComment.bind(null, issueId), null);

  return (
    <form action={action} className="grid gap-3">
      <Field label="Add a comment" id="comment">
        <Textarea id="comment" name="note" rows={3} maxLength={1000} required />
      </Field>
      <FormError state={state} />
      <div><Submit variant="outline">Post comment</Submit></div>
    </form>
  );
}

export function ReopenForm({ issueId }: { issueId: number }) {
  const [state, action] = useActionState(reopenIssue.bind(null, issueId), null);

  return (
    <form action={action} className="grid gap-3 rounded-xl border bg-card p-4.5">
      <h2 className="font-semibold">Still not fixed?</h2>
      <Field label="What's still wrong?" id="reopen-note">
        <Textarea id="reopen-note" name="note" rows={3} maxLength={1000} required />
      </Field>
      <FormError state={state} />
      <Submit variant="outline">Reopen this report</Submit>
    </form>
  );
}

export function SupportButton({ issue }: { issue: Issue }) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<FormState>(null);

  return (
    <div className="grid gap-2">
      <Button
        type="button"
        variant="outline"
        aria-pressed={issue.supported}
        disabled={pending}
        className="h-10 w-full aria-pressed:border-primary aria-pressed:text-primary"
        onClick={() => startTransition(async () => setState(await toggleSupport(issue.id)))}
      >
        {issue.supported ? "You marked this as affecting you" : "This affects me too"}
        {issue.support_count > 0 && ` (${issue.support_count})`}
      </Button>
      <FormError state={state} />
    </div>
  );
}

function StatusButtons({ moves, meta }: { moves: Status[]; meta: Meta }) {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-wrap gap-2.5">
      {moves.map((status) => (
        <Button
          key={status}
          type="submit"
          name="status"
          value={status}
          disabled={pending}
          variant={status === "resolved" ? "default" : "outline"}
          className="h-10 px-4"
        >
          Move to {meta.statuses[status].toLowerCase()}
        </Button>
      ))}
    </div>
  );
}

export function StaffPanel({ issue, meta }: { issue: Issue; meta: Meta }) {
  const [statusState, statusAction] = useActionState(changeStatus.bind(null, issue.id), null);
  const [assignState, assignAction] = useActionState(assignIssue.bind(null, issue.id), null);

  return (
    <section className="grid gap-5 rounded-xl border bg-card p-4.5">
      <h2 className="font-semibold">Staff actions</h2>
      <form action={statusAction} className="grid gap-3">
        <Field label="Note to the resident" id="status-note">
          <Textarea id="status-note" name="note" rows={3} maxLength={1000} placeholder="What's happening with this report?" />
        </Field>
        <FormError state={statusState} />
        <StatusButtons moves={meta.transitions[issue.status]} meta={meta} />
      </form>
      <form key={`${issue.priority}-${issue.department}`} action={assignAction} className="grid gap-3">
        <Field label="Priority" id="priority">
          <NativeSelect id="priority" name="priority" defaultValue={issue.priority} className="w-full">
            {Object.entries(meta.priorities).map(([key, label]) => (
              <NativeSelectOption key={key} value={key}>{label}</NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Assigned department" id="department">
          <Input id="department" name="department" maxLength={80} defaultValue={issue.department ?? ""} placeholder="e.g. Public Works" />
        </Field>
        <FormError state={assignState} />
        <Submit variant="outline">Save assignment</Submit>
      </form>
    </section>
  );
}

export function AuthSwitch({ mode, next }: { mode: "login" | "register"; next: string }) {
  const isLogin = mode === "login";
  const href = `/${isLogin ? "register" : "login"}?next=${encodeURIComponent(next)}`;

  return (
    <p className="text-sm text-muted-foreground">
      {isLogin ? "New here? " : "Already have an account? "}
      <Link href={href} className="text-primary underline">
        {isLogin ? "Create an account" : "Log in"}
      </Link>
    </p>
  );
}
