import type { Metadata } from "next";
import { Suspense } from "react";

import { ReportForm } from "@/components/forms";
import { PageSkeleton } from "@/components/issue-parts";
import { getMeta } from "@/lib/api";

export const metadata: Metadata = { title: "Report a problem" };

async function Report() {
  return <ReportForm meta={await getMeta()} />;
}

export default function ReportPage() {
  return (
    <div className="mx-auto grid w-full max-w-2xl gap-3.5">
      <h1 className="text-5xl">Report a problem</h1>
      <p className="text-muted-foreground">
        No account needed. You&apos;ll get a tracking number to follow your report until it&apos;s fixed.
      </p>
      <Suspense fallback={<PageSkeleton />}>
        <Report />
      </Suspense>
    </div>
  );
}
