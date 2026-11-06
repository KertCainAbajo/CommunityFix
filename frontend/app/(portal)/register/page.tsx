import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { GoogleButton, RegisterForm } from "@/components/forms";
import { PageSkeleton } from "@/components/issue-parts";
import { OrDivider, PortalHeading } from "@/components/portal";
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
        Already have an account? <Link href="/login" className="portal-link font-semibold text-[#1a4fd6]">Sign in</Link>
      </p>
    </>
  );
}

export default function RegisterPage() {
  return (
    <>
      <PortalHeading title="Create your account">Keep all your reports in one place and get updates.</PortalHeading>
      <Suspense fallback={<PageSkeleton />}>
        <SignUp />
      </Suspense>
    </>
  );
}
