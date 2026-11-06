"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function NavLink({ href, icon, children, count = 0 }: { href: string; icon: ReactNode; children: ReactNode; count?: number }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname === href;

  return (
    <Link href={href} aria-current={active ? "page" : undefined} className="side-link">
      {icon}
      {children}
      {count > 0 && (
        <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1.5 text-xs font-bold text-white">
          {count}<span className="sr-only"> unread</span>
        </span>
      )}
    </Link>
  );
}
