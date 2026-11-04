import type { Metadata } from "next";
import { Suspense } from "react";

import { Filters } from "@/components/filters";
import { EmptyState, IssueList, PageSkeleton, Pager } from "@/components/issue-parts";
import { getIssues, getMeta, toQuery } from "@/lib/api";

export const metadata: Metadata = { title: "All reports" };

const SORTS = { newest: "Newest first", oldest: "Oldest first", supported: "Most affected" };

async function Reports({ searchParams }: Pick<PageProps<"/issues">, "searchParams">) {
  const query = toQuery(await searchParams);
  const [meta, data] = await Promise.all([getMeta(), getIssues(query.toString())]);

  return (
    <>
      <Filters
        action="/issues"
        values={Object.fromEntries(query)}
        statuses={meta.statuses}
        categories={meta.categories}
        sorts={SORTS}
      />
      <p aria-live="polite" className="text-muted-foreground">
        {data.total} {data.total === 1 ? "report" : "reports"}
      </p>
      {data.items.length > 0 ? (
        <IssueList issues={data.items} meta={meta} />
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
      <h1 className="text-3xl font-bold tracking-tight">All reports</h1>
      <Suspense fallback={<PageSkeleton />}>
        <Reports searchParams={searchParams} />
      </Suspense>
    </>
  );
}
