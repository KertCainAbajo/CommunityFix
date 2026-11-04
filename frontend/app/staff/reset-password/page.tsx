import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ResetPasswordForm } from "@/components/forms";
import { EmptyState, PageSkeleton } from "@/components/issue-parts";

export const metadata: Metadata = { title: "Choose a new password" };

async function ResetForm({ searchParams }: Pick<PageProps<"/staff/reset-password">, "searchParams">) {
  const { token, email } = await searchParams;

  if (typeof token !== "string" || typeof email !== "string") {
    return (
      <EmptyState>
        That reset link is not valid. <Link href="/staff/forgot-password" className="link">Request a new one</Link>
      </EmptyState>
    );
  }

  return <ResetPasswordForm token={token} email={email} />;
}

export default function ResetPasswordPage({ searchParams }: PageProps<"/staff/reset-password">) {
  return (
    <>
      <h1 className="text-5xl">Choose a new password</h1>
      <Suspense fallback={<PageSkeleton />}>
        <ResetForm searchParams={searchParams} />
      </Suspense>
    </>
  );
}
