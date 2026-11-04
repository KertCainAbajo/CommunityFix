import Link from "next/link";

import { RequestedPath } from "@/components/requested-path";
import { SiteShell } from "@/components/site-shell";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <SiteShell>
      <section className="grid justify-items-center gap-5 py-10 text-center sm:py-16">
        <div aria-hidden className="hazard-bar w-full max-w-md" />
        <p className="font-mono text-sm tracking-widest text-muted-foreground uppercase">Error 404</p>
        <h1 className="text-6xl sm:text-7xl">Road closed</h1>
        <p className="max-w-md text-lg text-muted-foreground">
          There&apos;s no page at this address. Check it for typing mistakes, or use one of the links below.
        </p>
        <RequestedPath />
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/" className={buttonVariants({ className: "h-11 px-5 text-lg" })}>Go home</Link>
          <Link href="/track" className={buttonVariants({ variant: "outline", className: "h-11 px-5 text-lg" })}>
            Track a report
          </Link>
        </div>
        <div aria-hidden className="hazard-bar w-full max-w-md" />
      </section>
    </SiteShell>
  );
}
