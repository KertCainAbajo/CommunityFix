import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { ForgotLink, LoginForm } from "@/components/forms";
import { PageSkeleton } from "@/components/issue-parts";
import { getUser } from "@/lib/api";

export const metadata: Metadata = { title: "Staff login" };

async function Login({ searchParams }: Pick<PageProps<"/staff/login">, "searchParams">) {
  const { next, reset } = await searchParams;
  const target = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  if (await getUser()) redirect(target);

  return (
    <>
      {reset && (
        <p role="status" className="border-l-4 border-[#0f7a46] bg-card px-4 py-3">
          Your password has been changed. You can log in now.
        </p>
      )}
      <LoginForm next={target} />
      <ForgotLink />
    </>
  );
}

export default function StaffLoginPage({ searchParams }: PageProps<"/staff/login">) {
  return (
    <>
      <h1 className="text-5xl">Staff login</h1>
      <p className="text-muted-foreground">Residents don&apos;t need an account to report or track a problem.</p>
      <Suspense fallback={<PageSkeleton />}>
        <Login searchParams={searchParams} />
      </Suspense>
    </>
  );
}
