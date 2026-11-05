import { Megaphone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState, IssueList, PageSkeleton, Pager } from "@/components/issue-parts";
import { buttonVariants } from "@/components/ui/button";
import { api, getMeta, requireAccount } from "@/lib/api";
import type { IssuePage } from "@/lib/types";

export const metadata: Metadata = { title: "My reports" };

async function MyReports({ searchParams }: Pick<PageProps<"/my-reports">, "searchParams">) {
  const user = await requireAccount("/my-reports");
  const { page } = await searchParams;
  const current = typeof page === "string" && /^\d{1,4}$/.test(page) ? page : "1";
  const [meta, data] = await Promise.all([getMeta(), api<IssuePage>(`/my/issues?page=${current}`)]);
  const open = data.items.filter((issue) => issue.status !== "resolved" && issue.status !== "rejected").length;

  return (
    <>
      <section className="card flex flex-wrap items-center justify-between gap-4 p-6">
        <div className="grid gap-1">
          <p className="eyebrow">Resident account</p>
          <h1 className="text-3xl">Hello, {user.name.split(" ")[0]}</h1>
          <p className="text-muted-foreground">
            {data.total === 0
              ? "You haven't filed a report with this account yet."
              : `You've filed ${data.total} ${data.total === 1 ? "report" : "reports"}. ${open} still being worked on.`}
          </p>
        </div>
        <Link href="/report" className={buttonVariants({ className: "cta h-12 gap-2 px-5 text-base" })}>
          <Megaphone aria-hidden className="size-4.5" /> Report a problem
        </Link>
      </section>

      <section aria-labelledby="mine-title" className="card p-5 sm:p-6">
        <div className="mb-3 grid gap-1">
          <p className="eyebrow">Your reports</p>
          <h2 id="mine-title" className="text-lg">Follow every report you&apos;ve filed</h2>
        </div>
        {data.items.length > 0 ? (
          <IssueList issues={data.items} meta={meta} ownReports />
        ) : (
          <EmptyState>Reports you file while signed in will show up here.</EmptyState>
        )}
      </section>

      <Pager page={data.page} pages={data.pages} href={(n) => `/my-reports?page=${n}`} />
    </>
  );
}

export default function MyReportsPage({ searchParams }: PageProps<"/my-reports">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MyReports searchParams={searchParams} />
    </Suspense>
  );
}
