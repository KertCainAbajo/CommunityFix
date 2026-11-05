import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { GoogleButton, LoginForm } from "@/components/forms";
import { PageSkeleton } from "@/components/issue-parts";
import { OrDivider, PortalTabs } from "@/components/portal";
import { getUser, homeFor } from "@/lib/api";

export const metadata: Metadata = { title: "Sign in" };

const GOOGLE_NOTICES: Record<string, string> = {
  off: "Google sign-in isn't set up yet. Please sign in with your email or phone number.",
  staff: "Staff accounts can't use Google. Please sign in on the Staff tab.",
  failed: "Google sign-in didn't finish. Please try again.",
};

async function ResidentSignIn({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { next, google } = await searchParams;
  const user = await getUser();
  const target = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "";

  if (user) redirect(target || homeFor(user));

  const notice = typeof google === "string" ? GOOGLE_NOTICES[google] : undefined;

  return (
    <>
      {notice && <p role="alert" className="rounded-lg border border-[#f5d48a] bg-[#fff8e6] px-4 py-3 text-sm text-[#7a4b00]">{notice}</p>}
      <LoginForm next={target} portal="resident" />
      <p className="text-center text-sm font-medium text-[#0b1f3a]">
        Don&apos;t have an account? <Link href="/report" className="font-semibold text-[#1a4fd6] hover:underline">Report as Guest</Link>
      </p>
      <OrDivider />
      <GoogleButton />
      <p className="text-center text-sm text-muted-foreground">
        New here? <Link href="/register" className="font-semibold text-[#1a4fd6] hover:underline">Create an account</Link>
        {" · "}
        <Link href="/staff/forgot-password" className="font-semibold text-[#1a4fd6] hover:underline">Forgot password?</Link>
      </p>
    </>
  );
}

export default function ResidentSignInPage({ searchParams }: PageProps<"/login">) {
  return (
    <>
      <PortalTabs active="resident" />
      <h1 className="sr-only">Resident sign in</h1>
      <Suspense fallback={<PageSkeleton />}>
        <ResidentSignIn searchParams={searchParams} />
      </Suspense>
    </>
  );
}
