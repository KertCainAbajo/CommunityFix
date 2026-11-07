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
    <>
      <section className="page-hero page-hero-slim">
        <img src="/photos/home.jpg" alt="" style={{ objectPosition: "50% 60%" }} />
        <div className="portal-rise relative grid max-w-2xl gap-2 p-6 sm:px-10 sm:py-8">
          <h1 className="text-4xl text-white sm:text-5xl">Report a problem</h1>
          <p className="text-lg text-white/90">It only takes a minute. You&apos;ll get a tracking number to follow it until it&apos;s fixed.</p>
        </div>
      </section>
      <Suspense fallback={<PageSkeleton />}>
        <Report searchParams={searchParams} />
      </Suspense>
    </>
  );
}
