import Link from "next/link";

import { logout } from "@/app/actions";
import { buttonVariants } from "@/components/ui/button";
import { getUser } from "@/lib/api";

const linkClass = "font-display text-lg font-semibold tracking-wide uppercase hover:text-paint";
const reportClass = buttonVariants({ className: "h-9 px-3.5 text-base" });

function PublicLinks() {
  return (
    <>
      <Link href="/issues" className={linkClass}>All reports</Link>
      <Link href="/track" className={linkClass}>Track a report</Link>
    </>
  );
}

export function SiteNavFallback() {
  return (
    <nav aria-label="Main" className="flex flex-wrap items-center gap-x-5 gap-y-1">
      <PublicLinks />
      <Link href="/report" className={reportClass}>Report a problem</Link>
    </nav>
  );
}

export async function SiteNav() {
  const user = await getUser();

  return (
    <nav aria-label="Main" className="flex flex-wrap items-center gap-x-5 gap-y-1">
      {user ? (
        <>
          <Link href="/dashboard" className={linkClass}>Dashboard</Link>
          <Link href="/dashboard/analytics" className={linkClass}>Analytics</Link>
          {user.role === "admin" && <Link href="/dashboard/staff" className={linkClass}>Staff</Link>}
          <form action={logout}>
            <button type="submit" className={`${linkClass} cursor-pointer`}>Log out</button>
          </form>
        </>
      ) : (
        <PublicLinks />
      )}
      <Link href="/report" className={reportClass}>Report a problem</Link>
    </nav>
  );
}
