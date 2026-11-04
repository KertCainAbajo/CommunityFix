import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AuthForm, AuthSwitch } from "@/components/forms";
import { PageSkeleton } from "@/components/issue-parts";
import { getUser } from "@/lib/api";

type Params = Promise<Record<string, string | string[] | undefined>>;
type Mode = "login" | "register";

async function AuthContent({ mode, searchParams }: { mode: Mode; searchParams: Params }) {
  const { next, reset } = await searchParams;
  const target = typeof next === "string" ? next : "/";

  if (await getUser()) redirect(target.startsWith("/") && !target.startsWith("//") ? target : "/");

  return (
    <>
      {reset && <p role="status" className="rounded-lg border bg-card px-4 py-3">Your password has been changed. You can log in now.</p>}
      <AuthForm mode={mode} next={target} />
      <AuthSwitch mode={mode} next={target} />
    </>
  );
}

export function AuthPage({ mode, searchParams }: { mode: Mode; searchParams: Params }) {
  return (
    <div className="mx-auto grid w-full max-w-sm gap-3.5">
      <h1 className="text-3xl font-bold tracking-tight">{mode === "login" ? "Log in" : "Create an account"}</h1>
      <Suspense fallback={<PageSkeleton />}>
        <AuthContent mode={mode} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
