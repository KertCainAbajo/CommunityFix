import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { StaffNoteForm, StaffPanel } from "@/components/forms";
import { PageSkeleton } from "@/components/issue-parts";
import { Fact, IssueView } from "@/components/issue-view";
import { ApiError, api, getMeta, getUser } from "@/lib/api";
import type { Issue } from "@/lib/types";

async function loadIssue(id: string) {
  if (!/^\d{1,9}$/.test(id)) notFound();
  try {
    return await api<Issue>(`/issues/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}

async function IssueDetail({ params }: Pick<PageProps<"/issues/[id]">, "params">) {
  const { id } = await params;
  const [issue, meta, user] = await Promise.all([loadIssue(id), getMeta(), getUser()]);

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
