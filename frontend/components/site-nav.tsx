import Link from "next/link";

import { logout } from "@/app/actions";
import { buttonVariants } from "@/components/ui/button";
import { getUser } from "@/lib/api";

const linkClass = "text-sm hover:text-primary hover:underline";
const reportClass = buttonVariants({ className: "h-9 px-3" });

export function SiteNavFallback() {
  return (
    <nav aria-label="Main" className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <Link href="/issues" className={linkClass}>All reports</Link>
      <Link href="/report" className={reportClass}>Report a problem</Link>
    </nav>
  );
}

export async function SiteNav() {
  const user = await getUser();

  return (
    <nav aria-label="Main" className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <Link href="/issues" className={linkClass}>All reports</Link>
      {user && <Link href="/mine" className={linkClass}>My reports</Link>}
      {user?.role === "staff" && <Link href="/dashboard" className={linkClass}>Dashboard</Link>}
      {user ? (
        <form action={logout}>
          <button type="submit" className={`${linkClass} cursor-pointer`}>Log out</button>
        </form>
      ) : (
        <Link href="/login" className={linkClass}>Log in</Link>
      )}
      <Link href="/report" className={reportClass}>Report a problem</Link>
    </nav>
  );
}
