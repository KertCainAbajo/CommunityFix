import type { Metadata } from "next";
import { Suspense } from "react";

import { Filters } from "@/components/filters";
import { EmptyState, IssueList, PageSkeleton, Pager } from "@/components/issue-parts";
import { getIssues, getMeta, toQuery } from "@/lib/api";

export const metadata: Metadata = { title: "All reports" };

const SORTS = { newest: "Newest first", oldest: "Oldest first" };
const PUBLIC_STATUSES = ["acknowledged", "in_progress", "resolved"] as const;

async function Reports({ searchParams }: Pick<PageProps<"/issues">, "searchParams">) {
  const query = toQuery(await searchParams);
  const [meta, data] = await Promise.all([getMeta(), getIssues(query.toString())]);

  return (
    <>
      <Filters
        action="/issues"
        values={Object.fromEntries(query)}
        statuses={Object.fromEntries(PUBLIC_STATUSES.map((status) => [status, meta.statuses[status]]))}
        categories={meta.categories}
        sorts={SORTS}
      />
      <p aria-live="polite" className="text-muted-foreground">
        {data.total} {data.total === 1 ? "report" : "reports"}
      </p>
      {data.items.length > 0 ? (
        <div className="card px-4.5 py-1.5"><IssueList issues={data.items} meta={meta} /></div>
      ) : (
        <EmptyState>Nothing matches those filters.</EmptyState>
      )}
      <Pager
        page={data.page}
        pages={data.pages}
        href={(page) => {
          const next = new URLSearchParams(query);
          next.set("page", String(page));
          return `/issues?${next}`;
        }}
      />
    </>
  );
}

export default function IssuesPage({ searchParams }: PageProps<"/issues">) {
  return (
    <>
      <h1 className="text-3xl">All reports</h1>
      <p className="-mt-4 text-muted-foreground">Reports appear here once staff have verified them.</p>
      <Suspense fallback={<PageSkeleton />}>
        <Reports searchParams={searchParams} />
      </Suspense>
    </>
  );
}
