import { CircleAlert, CircleCheckBig } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/issue-parts";
import { Card } from "@/components/overview";
import { AccountForm, DeleteAccountForm, PasswordForm, ResendVerification } from "@/components/resident-forms";
import { requireAccount } from "@/lib/api";

export const metadata: Metadata = { title: "My account" };

async function Account({ searchParams }: Pick<PageProps<"/account">, "searchParams">) {
  const user = await requireAccount("/account");
  const { verified } = await searchParams;

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-4">
      <h1 className="text-3xl">My account</h1>

      {verified === "1" && (
        <p role="status" className="flex items-center gap-2 rounded-xl border border-[#bbe5c8] bg-[#ecfbf1] px-4 py-3 text-[#166534]">
          <CircleCheckBig aria-hidden className="size-5 flex-none" /> Your email is confirmed. Thank you!
        </p>
      )}
      {verified === "0" && (
        <p role="alert" className="flex items-center gap-2 rounded-xl border border-[#f5d48a] bg-[#fff8e6] px-4 py-3 text-[#7a4b00]">
          <CircleAlert aria-hidden className="size-5 flex-none" /> That link has expired or isn&apos;t valid. Send a new one below.
        </p>
      )}

      {!user.email && (
        <p role="status" className="rounded-xl border border-[#f5d48a] bg-[#fff8e6] px-4 py-3 text-[#7a4b00]">
          Add an email so you can recover your account if you forget your password.
        </p>
      )}

      {user.email && !user.email_verified && (
        <section className="grid gap-2 rounded-xl border border-[#f5d48a] bg-[#fff8e6] p-4 text-[#7a4b00]">
          <p>Please confirm <strong>{user.email}</strong> using the link we sent you. Until then, we can&apos;t email you about your reports.</p>
          <ResendVerification />
        </section>
      )}

      <Card title="Your details" id="details-title"><AccountForm user={user} /></Card>
      <Card title={user.has_password ? "Change your password" : "Set a password"} id="password-title">
        <PasswordForm hasPassword={user.has_password} />
      </Card>
      {user.role === "resident" && (
        <Card title="Delete your account" id="delete-title">
          <div className="grid gap-3">
            <p className="text-muted-foreground">
              Your reports stay, because the problems still need fixing, but your name and contact details are removed from them.
            </p>
            <DeleteAccountForm hasPassword={user.has_password} />
          </div>
        </Card>
      )}
    </div>
  );
}

export default function AccountPage({ searchParams }: PageProps<"/account">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Account searchParams={searchParams} />
    </Suspense>
  );
}
