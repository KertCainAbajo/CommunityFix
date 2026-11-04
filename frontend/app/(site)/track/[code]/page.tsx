import type { Metadata } from "next";
import { Suspense } from "react";

import { CopyCode, ReopenForm, TrackForm } from "@/components/forms";
import { PageSkeleton } from "@/components/issue-parts";
import { IssueView } from "@/components/issue-view";
import { ApiError, api, getMeta } from "@/lib/api";
import type { Issue } from "@/lib/types";

export const metadata: Metadata = { title: "Track your report" };

function NewReportBanner({ code }: { code: string }) {
  return (
    <section className="asphalt grid gap-3 p-5" aria-labelledby="saved-title">
      <h2 id="saved-title" className="text-3xl text-paint">Report received. Save your tracking number.</h2>
      <p className="text-muted-foreground">
        It&apos;s the only way to follow this report, and we can&apos;t recover it unless you left an email.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <code className="border-2 border-dashed border-paint px-3 py-1.5 font-mono text-2xl font-medium tracking-wider">{code}</code>
        <CopyCode code={code} />
      </div>
    </section>
  );
}

async function loadReport(code: string) {
  try {
    return await api<Issue>(`/track/${encodeURIComponent(code)}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

async function Tracked({ params, searchParams }: Pick<PageProps<"/track/[code]">, "params" | "searchParams">) {
  const { code } = await params;
  const { new: isNew } = await searchParams;
  const [issue, meta] = await Promise.all([loadReport(code), getMeta()]);

  if (!issue) {
    return (
      <div className="mx-auto grid w-full max-w-md gap-3.5">
        <h1 className="text-5xl">Report not found</h1>
        <p className="text-muted-foreground">Check the tracking number and try again.</p>
        <div className="sheet"><TrackForm /></div>
      </div>
    );
  }

  return (
    <>
      {isNew && <NewReportBanner code={code.toUpperCase()} />}
      {issue.status === "reported" && (
        <p className="border-l-4 border-[#c2410c] bg-card px-4 py-3">
          Staff will review your report soon. It appears publicly once it&apos;s verified.
        </p>
      )}
      <IssueView
        issue={issue}
        meta={meta}
        aside={issue.status === "resolved" ? <ReopenForm code={code} /> : undefined}
      />
    </>
  );
}

export default function TrackedReportPage({ params, searchParams }: PageProps<"/track/[code]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Tracked params={params} searchParams={searchParams} />
    </Suspense>
  );
}
