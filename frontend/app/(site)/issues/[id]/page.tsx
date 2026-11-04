import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { StaffNoteForm, StaffPanel } from "@/components/forms";
import { PageSkeleton } from "@/components/issue-parts";
import { Fact, IssueView } from "@/components/issue-view";
import { buttonVariants } from "@/components/ui/button";
import { ApiError, api, getMeta, getUser } from "@/lib/api";
import type { Issue } from "@/lib/types";

async function loadIssue(id: string) {
  if (!/^\d{1,9}$/.test(id)) notFound();
  try {
    return await api<Issue>(`/issues/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    if (error instanceof ApiError && error.status === 403) return null;
    throw error;
  }
}

/** The report exists, but only staff and the person holding its tracking number can see it. */
function PrivateReport({ id }: { id: string }) {
  return (
    <section className="grid justify-items-center gap-4 py-10 text-center">
      <h1 className="text-5xl sm:text-6xl">This report isn&apos;t public</h1>
      <p className="max-w-md text-lg text-muted-foreground">
        Reports appear here once staff verify them. If this is your report, follow it with your tracking number.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/track" className={buttonVariants({ className: "h-11 px-5 text-lg" })}>Track a report</Link>
        <Link
          href={`/staff/login?next=/issues/${id}`}
          className={buttonVariants({ variant: "outline", className: "h-11 px-5 text-lg" })}
        >
          Staff login
        </Link>
      </div>
    </section>
  );
}

async function IssueDetail({ params }: Pick<PageProps<"/issues/[id]">, "params">) {
  const { id } = await params;
  const [issue, meta, user] = await Promise.all([loadIssue(id), getMeta(), getUser()]);

  if (!issue) return <PrivateReport id={id} />;
  if (!user) return <IssueView issue={issue} meta={meta} />;

  const { name, email, phone } = issue.contact ?? {};
  const hasContact = name || email || phone;

  return (
    <IssueView
      issue={issue}
      meta={meta}
      belowTimeline={<StaffNoteForm issueId={issue.id} />}
      facts={
        <>
          <Fact label="Tracking number"><span className="font-mono text-sm">{issue.tracking_code}</span></Fact>
          <Fact label="Resident contact">
            {hasContact ? [name, email, phone].filter(Boolean).join(" · ") : "None left"}
          </Fact>
        </>
      }
      aside={<StaffPanel issue={issue} meta={meta} />}
    />
  );
}

export default function IssuePage({ params }: PageProps<"/issues/[id]">) {
  return (
    <>
      <p className="-mb-4 text-sm">
        <Link href="/issues" className="link">← All reports</Link>
      </p>
      <Suspense fallback={<PageSkeleton />}>
        <IssueDetail params={params} />
      </Suspense>
    </>
  );
}
