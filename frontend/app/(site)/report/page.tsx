import type { Metadata } from "next";
import { Suspense } from "react";

import { ReportForm } from "@/components/forms";
import { PageSkeleton } from "@/components/issue-parts";
import { getMeta } from "@/lib/api";

export const metadata: Metadata = { title: "Report a problem" };

async function Report({ searchParams }: Pick<PageProps<"/report">, "searchParams">) {
  const [meta, { category }] = await Promise.all([getMeta(), searchParams]);

  return <ReportForm meta={meta} category={typeof category === "string" ? category : undefined} />;
}

export default function ReportPage({ searchParams }: PageProps<"/report">) {
  return (
    <div className="mx-auto grid w-full max-w-2xl gap-3.5">
      <h1 className="text-4xl">Report a problem</h1>
      <p className="text-lg text-muted-foreground">
        You don&apos;t need an account. Answer the questions below and you&apos;ll get a tracking number to follow your
        report until it&apos;s fixed.
      </p>
      <Suspense fallback={<PageSkeleton />}>
        <Report searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
