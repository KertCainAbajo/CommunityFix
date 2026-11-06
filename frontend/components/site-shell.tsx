import { FolderOpen, LayoutDashboard, Phone } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { Logo } from "@/components/logo";
import { SiteNav, SiteNavFallback } from "@/components/site-nav";
import { buttonVariants } from "@/components/ui/button";
import { getUser, isStaff } from "@/lib/api";

const pill = buttonVariants({ variant: "ghost", className: "hidden h-9 gap-1.5 rounded-full border bg-card px-4 text-sm font-semibold shadow-sm sm:inline-flex" });

/** A way back to the person's reports or work. It also catches a cookie whose session has ended. */
async function AccountLink() {
  const user = await getUser();
  if (!user) redirect("/login");

  if (!isStaff(user)) {
    return (
      <Link href="/my-reports" className={pill}>
        <FolderOpen aria-hidden className="size-4" /> My reports
      </Link>
    );
  }

  return (
    <Link href="/dashboard" className={pill}>
      <LayoutDashboard aria-hidden className="size-4" /> Dashboard
    </Link>
  );
}

/** The sidebar, top bar and footer of the signed-in site. */
export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid flex-1 lg:grid-cols-[16.5rem_minmax(0,1fr)]">
      <aside className="side">
        <Link href="/" aria-label="CommunityFix home" className="px-1.5"><Logo /></Link>
        <Suspense fallback={<SiteNavFallback />}>
          <SiteNav />
        </Suspense>
        <div className="mt-auto hidden rounded-2xl border bg-gradient-to-br from-[#eaf1ff] to-[#e8f8ef] p-4 lg:block">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Phone aria-hidden className="size-4 text-destructive" /> Emergency?
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Call your local hotline. Don&apos;t use this form.</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="topbar max-sm:hidden">
          <div className="container-wide flex items-center justify-between gap-4 py-3">
            <p className="font-semibold text-muted-foreground">Barangay Community Portal</p>
            <Suspense><AccountLink /></Suspense>
          </div>
        </header>
        <main className="page-grid flex-1">{children}</main>
        <footer id="contact" className="border-t">
          <div className="container-wide flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-5 text-sm text-muted-foreground">
            <span>© CommunityFix · Issue reporting and resolution platform</span>
            <span className="flex items-center gap-1.5 lg:hidden"><Phone aria-hidden className="size-4 text-destructive" /> Emergency? Call your local hotline.</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
