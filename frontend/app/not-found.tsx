import Link from "next/link";

import { RequestedPath } from "@/components/requested-path";
import { SiteShell } from "@/components/site-shell";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <SiteShell>
      <section className="grid justify-items-center gap-4 py-12 text-center">
        <h1 className="text-4xl sm:text-5xl">We can&apos;t find that page</h1>
        <p className="max-w-lg text-lg text-muted-foreground">
          There&apos;s no page at this address. Please check it for typing mistakes, or use one of the buttons below.
        </p>
        <RequestedPath />
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/" className={buttonVariants({ className: "cta h-13 px-6 text-lg" })}>Go to the home page</Link>
          <Link href="/track" className={buttonVariants({ variant: "outline", className: "h-13 px-6 text-lg text-primary" })}>
            Track a report
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}
