import { CircleCheckBig } from "lucide-react";
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
    <section className="grid gap-3 border-l-4 border-brand-green bg-accent p-6" aria-labelledby="saved-title">
      <h2 id="saved-title" className="flex items-center gap-2.5 text-2xl sm:text-3xl">
        <CircleCheckBig aria-hidden className="size-8 flex-none text-brand-green" />
        Thank you! Please save your tracking number.
      </h2>
      <p className="text-lg">
        Write it down or take a photo of this page. It&apos;s how you follow your report, and we can only send it to you
        again if you left an email.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <code className="border-2 border-dashed border-primary bg-card px-4 py-2 font-sans text-3xl font-bold tracking-wider text-primary">
          {code}
        </code>
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
      <div className="mx-auto grid w-full max-w-lg gap-3.5">
        <h1 className="text-4xl">Report not found</h1>
        <p className="text-lg text-muted-foreground">Please check the tracking number and try again.</p>
        <div className="sheet"><TrackForm /></div>
      </div>
    );
  }

  return (
    <>
      {isNew && <NewReportBanner code={code.toUpperCase()} />}
      {issue.status === "reported" && (
        <p className="border-l-4 border-primary bg-card px-4 py-3 text-lg">
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
