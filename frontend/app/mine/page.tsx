import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { EmptyState, IssueList, PageSkeleton, Pager } from "@/components/issue-parts";
import { buttonVariants } from "@/components/ui/button";
import { getIssues, getMeta, getUser, toQuery } from "@/lib/api";

export const metadata: Metadata = { title: "My reports" };

async function MyReports({ searchParams }: Pick<PageProps<"/mine">, "searchParams">) {
  if (!(await getUser())) redirect("/login?next=/mine");

  const query = toQuery(await searchParams);
  query.set("mine", "1");
  const [meta, data] = await Promise.all([getMeta(), getIssues(query.toString())]);

  return (
    <>
      {data.items.length > 0 ? (
        <IssueList issues={data.items} meta={meta} />
      ) : (
        <EmptyState>You haven&apos;t reported anything yet.</EmptyState>
      )}
      <Pager page={data.page} pages={data.pages} href={(page) => `/mine?page=${page}`} />
    </>
  );
}

export default function MinePage({ searchParams }: PageProps<"/mine">) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">My reports</h1>
        <Link href="/report" className={buttonVariants({ className: "h-9 px-3" })}>Report a problem</Link>
      </div>
      <Suspense fallback={<PageSkeleton />}>
        <MyReports searchParams={searchParams} />
      </Suspense>
    </>
  );
}
