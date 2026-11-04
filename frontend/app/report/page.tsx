import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { ReportForm } from "@/components/forms";
import { PageSkeleton } from "@/components/issue-parts";
import { getMeta, getUser } from "@/lib/api";

export const metadata: Metadata = { title: "Report a problem" };

async function Report() {
  if (!(await getUser())) redirect("/login?next=/report");
  return <ReportForm meta={await getMeta()} />;
}

export default function ReportPage() {
  return (
    <div className="mx-auto grid w-full max-w-2xl gap-3.5">
      <h1 className="text-3xl font-bold tracking-tight">Report a problem</h1>
      <p className="text-muted-foreground">
        You&apos;ll get a reference number and can follow progress from your reports page.
      </p>
      <Suspense fallback={<PageSkeleton />}>
        <Report />
      </Suspense>
    </div>
  );
}
