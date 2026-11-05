import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { GoogleButton, RegisterForm } from "@/components/forms";
import { PageSkeleton } from "@/components/issue-parts";
import { OrDivider } from "@/components/portal";
import { getUser, homeFor } from "@/lib/api";

export const metadata: Metadata = { title: "Create an account" };

async function SignUp() {
  const user = await getUser();
  if (user) redirect(homeFor(user));

  return (
    <>
      <RegisterForm next="" />
      <OrDivider />
      <GoogleButton />
      <p className="text-center text-sm font-medium text-[#0b1f3a]">
        Already have an account? <Link href="/login" className="font-semibold text-[#1a4fd6] hover:underline">Sign in</Link>
      </p>
      <p className="text-center text-sm text-muted-foreground">
        Prefer not to sign up? <Link href="/report" className="font-semibold text-[#1a4fd6] hover:underline">Report as Guest</Link>
      </p>
    </>
  );
}

export default function RegisterPage() {
  return (
    <>
      <div className="grid gap-1 text-center">
        <h1 className="text-xl">Create your resident account</h1>
        <p className="text-sm text-muted-foreground">Keep all your reports in one place and get updates.</p>
      </div>
      <Suspense fallback={<PageSkeleton />}>
        <SignUp />
      </Suspense>
    </>
  );
}
