import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { ForgotLink, LoginForm } from "@/components/forms";
import { PageSkeleton } from "@/components/issue-parts";
import { PortalTabs } from "@/components/portal";
import { getUser, isStaff } from "@/lib/api";

export const metadata: Metadata = { title: "Staff login" };

async function Login({ searchParams }: Pick<PageProps<"/staff/login">, "searchParams">) {
  const { next, reset } = await searchParams;
  const target = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  // A resident who is signed in can still switch to a staff account here.
  if (isStaff(await getUser())) redirect(target);

  return (
    <>
      {reset && (
        <p role="status" className="rounded-xl border border-[#bbe5c8] bg-[#ecfbf1] px-4 py-3 text-sm text-[#166534]">
          Your password has been changed. You can log in now.
        </p>
      )}
      <LoginForm next={target} portal="staff" />
      <ForgotLink />
    </>
  );
}

export default function StaffLoginPage({ searchParams }: PageProps<"/staff/login">) {
  return (
    <>
      <PortalTabs active="staff" />
      <h1 className="sr-only">Staff login</h1>
      <Suspense fallback={<PageSkeleton />}>
        <Login searchParams={searchParams} />
      </Suspense>
    </>
  );
}
