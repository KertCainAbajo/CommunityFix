"use client";

import { Check, Copy } from "lucide-react";
import Link from "next/link";
import { useActionState, useState, useTransition, type ChangeEvent, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

import {
  addPhoto,
  addStaffNote,
  assignIssue,
  changeStatus,
  createIssue,
  createStaff,
  findReport,
  forgotPassword,
  login,
  reopenReport,
  resetPassword,
  updateStaff,
} from "@/app/actions";
import { LocationPicker } from "@/components/maps";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { FormState, Issue, Meta, NewStaffState, NoticeState, Status, User } from "@/lib/types";

const MAX_PHOTOS = 3;
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_PHOTO_EDGE = 1600;

function Field({ label, id, children }: { label: ReactNode; id: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

const Optional = () => <span className="font-sans text-xs font-normal tracking-normal normal-case text-muted-foreground">(optional)</span>;

function FormError({ state }: { state: FormState | NoticeState | NewStaffState }) {
  if (!state || !("error" in state)) return null;
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

/** Shrinks what was chosen, then puts the smaller files back in the input. */
function usePhotos(limit: number) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState<FormState>(null);

  const choose = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const chosen = Array.from(input.files ?? []);
    setError(null);
    setPreviews([]);
    if (chosen.length === 0) return;

    if (chosen.length > limit) {
      input.value = "";
      setError({ error: `You can add up to ${limit} ${limit === 1 ? "photo" : "photos"}.` });
      return;
    }

    const photos = await Promise.all(chosen.map((file) => shrinkPhoto(file).catch(() => file)));
    if (photos.reduce((total, photo) => total + photo.size, 0) > MAX_UPLOAD_BYTES) {
      input.value = "";
      setError({ error: "Those photos are too large. Try fewer or smaller ones." });
      return;
    }

    const files = new DataTransfer();
    photos.forEach((photo) => files.items.add(photo));
    input.files = files.files;
    setPreviews(photos.map((photo) => URL.createObjectURL(photo)));
  };

  return { choose, previews, error };
}

function Previews({ urls }: { urls: string[] }) {
  if (urls.length === 0) return null;
  return (
    <div className="grid grid-cols-3 gap-2">
      {urls.map((url) => (
        <img key={url} src={url} alt="Preview of your photo" className="aspect-square w-full border object-cover" />
      ))}
    </div>
  );
}

// Residents

export function ReportForm({ meta }: { meta: Meta }) {
  const [state, action] = useActionState(createIssue, null);
  const { choose, previews, error } = usePhotos(MAX_PHOTOS);

  return (
    <form action={action} className="sheet">
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
      <Field label={<>Photos <Optional /></>} id="photos">
        <Input id="photos" type="file" name="photos[]" multiple accept="image/jpeg,image/png,image/webp" onChange={choose} />
      </Field>
      <Previews urls={previews} />

      <fieldset className="grid gap-3 border-t pt-4">
        <legend className="float-left mb-1 font-display">Your contact details <Optional /></legend>
        <p className="clear-both text-sm text-muted-foreground">
          Only staff can see these. Leave an email and we&apos;ll send you updates, or leave this empty to stay anonymous.
        </p>
        <Field label="Name" id="contact_name">
          <Input id="contact_name" name="contact_name" maxLength={80} autoComplete="name" />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Email" id="contact_email">
            <Input id="contact_email" type="email" name="contact_email" maxLength={255} autoComplete="email" />
          </Field>
          <Field label="Phone" id="contact_phone">
            <Input id="contact_phone" type="tel" name="contact_phone" maxLength={30} autoComplete="tel" />
          </Field>
        </div>
      </fieldset>

      {/* People never see this field. Bots fill it in, and the API refuses them. */}
      <div aria-hidden className="absolute -left-[9999px]">
        <label>Website <input type="text" name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>

      <FormError state={error ?? state} />
      <Submit>Submit report</Submit>
    </form>
  );
}

export function TrackForm({ dark = false }: { dark?: boolean }) {
  const [state, action] = useActionState(findReport, null);

  return (
    <form action={action} className="grid gap-2">
      <Label htmlFor="code" className={dark ? "text-paint" : undefined}>Track your report</Label>
      <div className="flex gap-2">
        <Input
          id="code"
          name="code"
          required
          maxLength={12}
          autoComplete="off"
          spellCheck={false}
          placeholder="CF-7K2M-9QXD"
          className={`font-mono uppercase placeholder:normal-case ${dark ? "border-white/40 bg-black/30 text-white" : ""}`}
        />
        <Submit variant={dark ? "default" : "outline"}>Track</Submit>
      </div>
      <FormError state={state} />
    </form>
  );
}

export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      type="button"
      className="h-10 px-4"
      onClick={async () => {
        await navigator.clipboard.writeText(code);
        setCopied(true);
      }}
    >
      {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

export function ReopenForm({ code }: { code: string }) {
  const [state, action] = useActionState(reopenReport.bind(null, code), null);

  return (
    <form action={action} className="sheet">
      <h2 className="text-2xl">Still not fixed?</h2>
      <Field label="What's still wrong?" id="reopen-note">
        <Textarea id="reopen-note" name="note" rows={3} maxLength={1000} required />
      </Field>
      <FormError state={state} />
      <Submit variant="outline">Reopen this report</Submit>
    </form>
  );
}

// Staff sign-in

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(login, null);

  return (
    <form action={action} className="sheet">
      <input type="hidden" name="next" value={next} />
      <Field label="Email" id="email">
        <Input id="email" type="email" name="email" required autoComplete="email" />
      </Field>
      <Field label="Password" id="password">
        <Input id="password" type="password" name="password" required autoComplete="current-password" />
      </Field>
      <FormError state={state} />
      <Submit>Log in</Submit>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState(forgotPassword, null);

  if (state && "notice" in state) {
    return <p role="status" className="sheet">{state.notice}</p>;
  }

  return (
    <form action={action} className="sheet">
      <Field label="Email" id="email">
        <Input id="email" type="email" name="email" required autoComplete="email" />
      </Field>
      <FormError state={state} />
      <Submit>Send reset link</Submit>
    </form>
  );
}

export function ResetPasswordForm({ token, email }: { token: string; email: string }) {
  const [state, action] = useActionState(resetPassword, null);

  return (
    <form action={action} className="sheet">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="email" value={email} />
      <Field label="New password" id="password">
        <Input id="password" type="password" name="password" required minLength={8} maxLength={72} autoComplete="new-password" />
      </Field>
      <FormError state={state} />
      <Submit>Change password</Submit>
    </form>
  );
}

// Staff work

export function StaffNoteForm({ issueId }: { issueId: number }) {
  const [state, action] = useActionState(addStaffNote.bind(null, issueId), null);

  return (
    <form action={action} className="grid gap-3">
      <Field label="Add a public update" id="staff-note">
        <Textarea id="staff-note" name="note" rows={3} maxLength={1000} required />
      </Field>
      <FormError state={state} />
      <div><Submit variant="outline">Post update</Submit></div>
    </form>
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
          variant={status === "resolved" || status === "acknowledged" ? "default" : "outline"}
          className="h-10 px-4"
        >
          {status === "acknowledged" ? "Verify report" : status === "rejected" ? "Reject report" : `Move to ${meta.statuses[status].toLowerCase()}`}
        </Button>
      ))}
    </div>
  );
}

function PhotoUpload({ issueId }: { issueId: number }) {
  const [state, action] = useActionState(addPhoto.bind(null, issueId), null);
  const { choose, previews, error } = usePhotos(1);

  return (
    <form action={action} className="grid gap-3">
      <Field label="Before or after" id="photo-kind">
        <NativeSelect id="photo-kind" name="kind" className="w-full">
          <NativeSelectOption value="before">Before the work</NativeSelectOption>
          <NativeSelectOption value="after">After the work</NativeSelectOption>
        </NativeSelect>
      </Field>
      <Field label="Photo" id="staff-photo">
        <Input id="staff-photo" type="file" name="photo" required accept="image/jpeg,image/png,image/webp" onChange={choose} />
      </Field>
      <Previews urls={previews} />
      <FormError state={error ?? state} />
      <Submit variant="outline">Upload photo</Submit>
    </form>
  );
}

export function StaffPanel({ issue, meta }: { issue: Issue; meta: Meta }) {
  const [statusState, statusAction] = useActionState(changeStatus.bind(null, issue.id), null);
  const [assignState, assignAction] = useActionState(assignIssue.bind(null, issue.id), null);

  return (
    <section className="sheet">
      <h2 className="text-2xl">Staff actions</h2>
      <form action={statusAction} className="grid gap-3">
        <Field label="Note to the resident" id="status-note">
          <Textarea id="status-note" name="note" rows={3} maxLength={1000} placeholder="What's happening with this report?" />
        </Field>
        <FormError state={statusState} />
        <StatusButtons moves={meta.transitions[issue.status]} meta={meta} />
      </form>
      <form key={`${issue.priority}-${issue.department}`} action={assignAction} className="grid gap-3 border-t pt-4">
        <Field label="Priority" id="priority">
          <NativeSelect id="priority" name="priority" defaultValue={issue.priority} className="w-full">
            {Object.entries(meta.priorities).map(([key, label]) => (
              <NativeSelectOption key={key} value={key}>{label}</NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Maintenance team" id="department">
          <Input id="department" name="department" maxLength={80} defaultValue={issue.department ?? ""} placeholder="e.g. Road Crew A" />
        </Field>
        <FormError state={assignState} />
        <Submit variant="outline">Save assignment</Submit>
      </form>
      <div className="border-t pt-4"><PhotoUpload key={issue.photos.length} issueId={issue.id} /></div>
    </section>
  );
}

// Staff accounts

export function NewStaffForm() {
  const [state, action] = useActionState(createStaff, null);

  return (
    <form action={action} className="sheet">
      <h2 className="text-2xl">Add a staff member</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Name" id="staff-name"><Input id="staff-name" name="name" required minLength={2} maxLength={80} /></Field>
        <Field label="Email" id="staff-email"><Input id="staff-email" type="email" name="email" required /></Field>
        <Field label="Role" id="staff-role">
          <NativeSelect id="staff-role" name="role" className="w-full">
            <NativeSelectOption value="staff">Staff</NativeSelectOption>
            <NativeSelectOption value="admin">Admin</NativeSelectOption>
          </NativeSelect>
        </Field>
      </div>
      <FormError state={state} />
      {state && "password" in state && (
        <p role="status" className="border-l-4 border-[#0f7a46] bg-background px-3 py-2 text-sm">
          Account created for <strong>{state.email}</strong>. Their password is{" "}
          <code className="font-mono font-medium">{state.password}</code>. Pass it on now, because it won&apos;t be shown again.
        </p>
      )}
      <div><Submit>Create account</Submit></div>
    </form>
  );
}

export function StaffRow({ person, isSelf }: { person: User; isSelf: boolean }) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<FormState>(null);
  const change = (changes: { role?: string; is_active?: boolean }) =>
    startTransition(async () => setState(await updateStaff(person.id, changes)));

  return (
    <li className="grid items-center gap-x-4 gap-y-2 border-t px-4 py-3 first:border-t-0 sm:grid-cols-[minmax(0,1fr)_9rem_auto]">
      <div className="min-w-0 [overflow-wrap:anywhere]">
        <p className="font-semibold">{person.name} {isSelf && <span className="font-normal text-muted-foreground">(you)</span>}</p>
        <p className="text-sm text-muted-foreground">{person.email}</p>
      </div>
      <NativeSelect
        aria-label={`Role for ${person.name}`}
        value={person.role}
        disabled={isSelf || pending}
        onChange={(event) => change({ role: event.target.value })}
        className="w-full"
      >
        <NativeSelectOption value="staff">Staff</NativeSelectOption>
        <NativeSelectOption value="admin">Admin</NativeSelectOption>
      </NativeSelect>
      <Button
        type="button"
        variant="outline"
        disabled={isSelf || pending}
        className="h-10 px-4"
        onClick={() => change({ is_active: !person.is_active })}
      >
        {person.is_active ? "Deactivate" : "Reactivate"}
      </Button>
      {state && <div className="sm:col-span-3"><FormError state={state} /></div>}
    </li>
  );
}

export function ForgotLink() {
  return (
    <p className="text-sm">
      <Link href="/staff/forgot-password" className="link">Forgot your password?</Link>
    </p>
  );
}
