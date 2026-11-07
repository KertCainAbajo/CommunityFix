"use client";

import { ArrowRight, Check, CircleCheck, Circle, Copy, Eye, EyeOff, Hash, LoaderCircle, LockKeyhole, Mail, Phone, UserRound } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useState, useTransition, type ChangeEvent, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

import {
  addPhoto,
  addStaffNote,
  assignIssue,
  changeStatus,
  createIssue,
  createStaff,
  findNearby,
  findReport,
  forgotPassword,
  login,
  register,
  reopenReport,
  resetPassword,
  updateStaff,
} from "@/app/actions";
import { CATEGORY_ICONS } from "@/components/issue-parts";
import { LocationPicker } from "@/components/maps";
import { SupportButton } from "@/components/support-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { categoryPhoto } from "@/lib/photos";
import type { FormState, Issue, Meta, NewStaffState, NoticeState, Status, User } from "@/lib/types";

const MAX_PHOTOS = 3;
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_PHOTO_EDGE = 1600;

export function Field({ label, id, children }: { label: ReactNode; id: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

const Optional = () => <span className="font-sans text-base font-normal text-muted-foreground">(optional)</span>;

export function FormNotice({ state }: { state: NoticeState }) {
  if (!state || !("notice" in state)) return null;
  return <p role="status" className="font-medium text-brand-green">{state.notice}</p>;
}

export function FormError({ state }: { state: FormState | NoticeState | NewStaffState }) {
  if (!state || !("error" in state)) return null;
  return (
    <Alert variant="destructive" role="alert">
      <AlertDescription>{state.error}</AlertDescription>
    </Alert>
  );
}

export function Submit({ children, variant, cta, onDark }: { children: ReactNode; variant?: "default" | "outline"; cta?: boolean; onDark?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending} className={cta ? "cta h-14 gap-2 px-6 text-lg" : onDark ? "h-12 rounded-xl bg-white px-5 text-[#0b1f3a] shadow-[0_8px_20px_-8px_rgb(255_255_255/45%)] hover:bg-[#e6eefc]" : "h-12 px-5"}>
      {children}
    </Button>
  );
}

/** An input with an icon inside it, used on the sign-in panel. */
function IconInput({ icon, className, ...props }: ComponentProps<typeof Input> & { icon: ReactNode }) {
  return (
    <div className="portal-field relative">
      <span aria-hidden className="portal-field-icon pointer-events-none absolute top-1/2 left-3.5 z-10 -translate-y-1/2 [&_svg]:size-4.5">{icon}</span>
      <Input {...props} className={`h-12 rounded-xl border-[#dfe6f0] bg-white pl-11 text-[0.95rem] shadow-[0_1px_2px_rgb(11_23_41/4%)] transition-[border-color,box-shadow] duration-200 placeholder:text-[#7a889b] hover:border-[#c5d3e8] focus-visible:border-[#3b82f6] focus-visible:ring-4 focus-visible:ring-[#3b82f6]/15 ${className ?? ""}`} />
    </div>
  );
}

function WideSubmit({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="portal-submit group/submit h-12 w-full gap-2 rounded-xl text-base">
      {pending ? <LoaderCircle aria-hidden className="size-4.5 animate-spin" /> : null}
      {pending ? "Please wait…" : children}
      {!pending && <ArrowRight aria-hidden className="size-4 transition-transform duration-300 group-hover/submit:translate-x-1" />}
    </Button>
  );
}

/** A label only screen readers hear, for the sign-in fields that show their name as placeholder text. */
function QuietLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return <Label htmlFor={htmlFor} className="sr-only">{children}</Label>;
}

function PasswordInput({ autoComplete, minLength }: { autoComplete: string; minLength?: number }) {
  const [shown, setShown] = useState(false);

  return (
    <div className="relative">
      <IconInput
        icon={<LockKeyhole />}
        id="password"
        type={shown ? "text" : "password"}
        name="password"
        required
        minLength={minLength}
        maxLength={72}
        autoComplete={autoComplete}
        placeholder="Password"
        className="pr-12"
      />
      <button
        type="button"
        onClick={() => setShown(!shown)}
        aria-label={shown ? "Hide password" : "Show password"}
        aria-pressed={shown}
        className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-[#0b1f3a] transition-[background-color,scale] duration-200 hover:bg-[#eef3fe] active:scale-90"
      >
        {shown ? <EyeOff key="hide" aria-hidden className="portal-pop size-4.5" /> : <Eye key="show" aria-hidden className="portal-pop size-4.5" />}
      </button>
    </div>
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
export function usePhotos(limit: number) {
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

export function Previews({ urls }: { urls: string[] }) {
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

function Step({ number, title, children }: { number: number; title: ReactNode; children: ReactNode }) {
  return (
    <section className="sheet gap-5! sm:p-7!">
      <h2 className="flex items-center gap-3 text-2xl">
        <span aria-hidden className="grid size-9 flex-none place-items-center rounded-xl bg-gradient-to-br from-[#1a4fd6] to-[#16a34a] font-heading text-lg text-white">
          {number}
        </span>
        <span>{title}</span>
      </h2>
      {children}
    </section>
  );
}

/** Reports already filed close to the pin, so neighbors can back one instead of filing it again. */
function SimilarReports({ issues, meta }: { issues: Issue[]; meta: Meta }) {
  if (issues.length === 0) return null;

  return (
    <section aria-label="Similar reports nearby" className="grid gap-3 rounded-xl border border-[#f5d48a] bg-[#fff8e6] p-4">
      <div>
        <h3 className="text-lg">Is it one of these?</h3>
        <p className="text-sm text-[#7a4b00]">Already reported nearby. If it&apos;s the same problem, tap Me too to get its updates. You don&apos;t need to send a new report.</p>
      </div>
      <ul className="grid gap-2">
        {issues.map((issue) => (
          <li key={issue.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-card p-3">
            <div className="min-w-0 flex-1 basis-48 [overflow-wrap:anywhere]">
              <Link href={`/issues/${issue.id}`} target="_blank" className="font-semibold hover:underline">{issue.title}</Link>
              <p className="text-sm text-muted-foreground">{issue.address} · {meta.statuses[issue.status]}</p>
            </div>
            {!issue.mine && <SupportButton issueId={issue.id} supported={false} />}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The report as it will look, filling in while the resident types. */
function ReportPreview({
  meta,
  category,
  title,
  address,
  photo,
  checks,
}: {
  meta: Meta;
  category: string;
  title: string;
  address: string;
  photo?: string;
  checks: { label: string; done: boolean }[];
}) {
  const required = checks.filter((check) => !check.label.includes("optional"));
  const left = required.filter((check) => !check.done).length;

  return (
    <div className="card overflow-hidden">
      <div className="relative aspect-[2/1] bg-muted">
        <img src={photo ?? categoryPhoto(category)} alt="" className="size-full object-cover" />
        {!photo && <span className="absolute top-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">Sample photo</span>}
      </div>
      <div className="grid gap-1 p-5 [overflow-wrap:anywhere]">
        <p className="text-sm font-semibold text-primary">{meta.categories[category] ?? "Choose a problem"}</p>
        <p className="font-heading text-lg leading-snug font-bold">{title || "Your title will show here"}</p>
        <p className="text-sm text-muted-foreground">{address || "The location will show here"}</p>
      </div>
      <ul className="grid gap-2 border-t p-5">
        {checks.map(({ label, done }) => (
          <li key={label} className={`flex items-center gap-2 text-sm ${done ? "font-medium" : "text-muted-foreground"}`}>
            {done ? <CircleCheck aria-hidden className="size-4.5 flex-none text-brand-green" /> : <Circle aria-hidden className="size-4.5 flex-none text-input" />}
            {label}
          </li>
        ))}
      </ul>
      <p aria-live="polite" className="border-t bg-muted/50 px-5 py-3 text-sm font-medium">
        {left === 0 ? "Ready to send." : `${left} more ${left === 1 ? "step" : "steps"} to go.`}
      </p>
    </div>
  );
}

export function ReportForm({ meta, category }: { meta: Meta; category?: string }) {
  const [state, action] = useActionState(createIssue, null);
  const { choose, previews, error } = usePhotos(MAX_PHOTOS);
  const [chosen, setChosen] = useState(category ?? "");
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [similar, setSimilar] = useState<Issue[]>([]);
  const [typed, setTyped] = useState({ title: "", description: "", address: "" });

  useEffect(() => {
    if (!chosen || !pin) return;
    let stale = false;
    findNearby(pin.lat, pin.lng, chosen).then((issues) => {
      if (!stale) setSimilar(issues);
    });
    return () => {
      stale = true;
    };
  }, [chosen, pin]);

  const type = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setTyped((current) => ({ ...current, [name]: value }));
  };

  const checks = [
    { label: "Type of problem", done: !!chosen },
    { label: "A short title", done: typed.title.trim().length >= 5 },
    { label: "What you saw", done: typed.description.trim().length >= 10 },
    { label: "Where it is", done: typed.address.trim().length >= 3 },
    { label: "Map pin (optional)", done: !!pin },
    { label: "Photos (optional)", done: previews.length > 0 },
  ];

  return (
    <form action={action} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="grid min-w-0 gap-6">
        <Step number={1} title="What is the problem?">
          <fieldset onChange={(event) => setChosen((event.target as EventTarget as HTMLInputElement).value)}>
            <legend className="mb-3">Choose the type of problem</legend>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {Object.entries(meta.categories).map(([key, label]) => {
                const Icon = CATEGORY_ICONS[key];
                return (
                  <label key={key} className="choice-photo">
                    <input type="radio" name="category" value={key} required defaultChecked={key === category} className="sr-only" />
                    <img src={categoryPhoto(key)} alt="" loading="lazy" />
                    {Icon && <span className="photo-tile-icon"><Icon aria-hidden className="size-5" /></span>}
                    <span aria-hidden className="choice-photo-check"><Check className="size-4" strokeWidth={3} /></span>
                    <span className="photo-tile-label">{label}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          <Field label="Give it a short title" id="title">
            <Input id="title" name="title" required minLength={5} maxLength={120} onChange={type} placeholder="For example: Streetlight out near the covered court" />
          </Field>
          <Field label="Tell us more" id="description">
            <Textarea
              id="description"
              name="description"
              rows={4}
              required
              minLength={10}
              maxLength={2000}
              onChange={type}
              placeholder="What did you see? How long has it been like this? Is anyone at risk?"
            />
          </Field>
        </Step>

        <Step number={2} title="Where is it?">
          <Field label="Street and nearest landmark" id="address">
            <Input id="address" name="address" required minLength={3} maxLength={200} onChange={type} placeholder="For example: Mabini St., near the chapel" />
          </Field>
          <LocationPicker center={meta.map_center} onPlace={setPin} />
          <SimilarReports issues={similar} meta={meta} />
        </Step>

        <Step number={3} title={<>Add photos <Optional /></>}>
          <p className="text-muted-foreground">Photos help staff understand the problem. You can add up to {MAX_PHOTOS}.</p>
          <Field label="Choose photos" id="photos">
            <Input id="photos" type="file" name="photos[]" multiple accept="image/jpeg,image/png,image/webp" onChange={choose} className="h-auto py-2.5" />
          </Field>
          <Previews urls={previews} />
        </Step>

        <details className="sheet sm:p-7!">
          <summary className="cursor-pointer font-heading text-lg font-bold">Use different contact details <Optional /></summary>
          <div className="grid gap-4 pt-4">
            <p className="text-muted-foreground">Only staff can see this. Leave it empty to use the details on your account.</p>
            <Field label="Your name" id="contact_name">
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
          </div>
        </details>
      </div>

      <aside aria-label="Your report so far" className="grid gap-4 lg:sticky lg:top-20">
        <ReportPreview meta={meta} category={chosen} title={typed.title} address={typed.address} photo={previews[0]} checks={checks} />
        <FormError state={error ?? state} />
        <Submit cta>Send my report <ArrowRight aria-hidden className="size-5" /></Submit>
        <p className="text-center text-sm text-muted-foreground">You&apos;ll get a tracking number right after you send it.</p>
      </aside>

      {/* People never see this field. Bots fill it in, and the API refuses them. */}
      <div aria-hidden className="absolute -left-[9999px]">
        <label>Website <input type="text" name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
    </form>
  );
}

export function TrackForm({ dark = false, stacked = false }: { dark?: boolean; stacked?: boolean }) {
  const [state, action] = useActionState(findReport, null);

  if (stacked) {
    return (
      <form action={action} className="grid gap-3">
        <Field label="Tracking number" id="code">
          <IconInput
            icon={<Hash />}
            id="code"
            name="code"
            required
            maxLength={12}
            autoComplete="off"
            spellCheck={false}
            placeholder="CF-7K2M-9QXD"
            className="font-mono tracking-wider uppercase placeholder:normal-case placeholder:tracking-normal"
          />
        </Field>
        <FormError state={state} />
        <WideSubmit>Track my report</WideSubmit>
      </form>
    );
  }

  return (
    <form action={action} className="grid gap-2">
      <Label htmlFor="code" className={dark ? "text-[#c9d6e8]" : undefined}>Track your report</Label>
      <div className="flex gap-2">
        <Input
          id="code"
          name="code"
          required
          maxLength={12}
          autoComplete="off"
          spellCheck={false}
          placeholder="CF-7K2M-9QXD"
          className={`bg-white font-mono tracking-wider uppercase placeholder:normal-case placeholder:tracking-normal ${dark ? "rounded-xl border-transparent" : ""}`}
        />
        <Submit onDark={dark}>Track</Submit>
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
      className="h-12 px-5"
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
      <h2 className="text-xl">Still not fixed?</h2>
      <Field label="What's still wrong?" id="reopen-note">
        <Textarea id="reopen-note" name="note" rows={3} maxLength={1000} required />
      </Field>
      <FormError state={state} />
      <Submit variant="outline">Reopen this report</Submit>
    </form>
  );
}

// Staff sign-in

export function LoginForm({ next, portal }: { next: string; portal: "resident" | "staff" }) {
  const [state, action] = useActionState(login, null);

  return (
    <form action={action} className="grid gap-3.5">
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="portal" value={portal} />
      <div>
        <QuietLabel htmlFor="login">{portal === "staff" ? "Staff email or phone number" : "Email or phone number"}</QuietLabel>
        <IconInput icon={<Mail />} id="login" name="login" required maxLength={255} autoComplete="username" placeholder="Email or Phone Number" />
      </div>
      <div>
        <QuietLabel htmlFor="password">Password</QuietLabel>
        <PasswordInput autoComplete="current-password" />
      </div>
      <FormError state={state} />
      <WideSubmit>Sign In</WideSubmit>
    </form>
  );
}

export function RegisterForm({ next }: { next: string }) {
  const [state, action] = useActionState(register, null);

  return (
    <form action={action} className="grid gap-3.5">
      <input type="hidden" name="next" value={next} />
      <div>
        <QuietLabel htmlFor="name">Full name</QuietLabel>
        <IconInput icon={<UserRound />} id="name" name="name" required minLength={2} maxLength={80} autoComplete="name" placeholder="Full Name" />
      </div>
      <div>
        <QuietLabel htmlFor="email">Email address</QuietLabel>
        <IconInput icon={<Mail />} id="email" type="email" name="email" required maxLength={255} autoComplete="email" placeholder="Email Address" />
      </div>
      <div>
        <QuietLabel htmlFor="phone">Phone number</QuietLabel>
        <IconInput icon={<Phone />} id="phone" type="tel" name="phone" maxLength={20} autoComplete="tel" placeholder="Phone Number (optional)" />
      </div>
      <p className="-mt-1.5 text-xs text-muted-foreground">We use your email to confirm it&apos;s you and to recover your password. You can sign in with your phone too.</p>
      <div>
        <QuietLabel htmlFor="password">Password (at least 8 characters)</QuietLabel>
        <PasswordInput autoComplete="new-password" minLength={8} />
      </div>
      <FormError state={state} />
      <WideSubmit>Create Account</WideSubmit>
    </form>
  );
}

/** The official four-color Google mark, as Google's sign-in guidelines ask. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className="size-5">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export function GoogleButton() {
  return (
    // A plain link: the sign-in leaves this site for Google and comes back.
    <a href="/auth/google" className="flex h-12 items-center justify-center gap-3 rounded-xl border border-[#dfe6f0] bg-white text-[0.95rem] font-semibold text-[#0b1f3a] shadow-[0_1px_2px_rgb(11_23_41/4%)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#c5d3e8] hover:shadow-[0_14px_28px_-16px_rgb(11_23_41/40%)] active:translate-y-0 active:scale-[0.99]">
      <GoogleMark /> Continue with Google
    </a>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState(forgotPassword, null);

  if (state && "notice" in state) {
    return <p role="status" className="rounded-xl border bg-white p-4">{state.notice}</p>;
  }

  return (
    <form action={action} className="grid gap-3">
      <Field label="Email" id="email">
        <IconInput icon={<Mail />} id="email" type="email" name="email" required autoComplete="email" />
      </Field>
      <FormError state={state} />
      <WideSubmit>Send reset link</WideSubmit>
    </form>
  );
}

export function ResetPasswordForm({ token, email }: { token: string; email: string }) {
  const [state, action] = useActionState(resetPassword, null);

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="email" value={email} />
      <Field label="New password" id="password">
        <PasswordInput autoComplete="new-password" minLength={8} />
      </Field>
      <FormError state={state} />
      <WideSubmit>Change password</WideSubmit>
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
          className="h-12 px-5"
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
        <Input id="staff-photo" type="file" name="photo" required accept="image/jpeg,image/png,image/webp" onChange={choose} className="h-auto py-2.5" />
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
      <h2 className="text-xl">Staff actions</h2>
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
      <h2 className="text-xl">Add a staff member</h2>
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
          <code className="font-sans font-bold">{state.password}</code>. Pass it on now, because it won&apos;t be shown again.
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
        className="h-12 px-5"
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
    <p className="text-center text-sm">
      <Link href="/staff/forgot-password" className="portal-link font-semibold text-[#1a4fd6]">Forgot your password?</Link>
    </p>
  );
}
