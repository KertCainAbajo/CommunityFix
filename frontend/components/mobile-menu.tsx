"use client";

import { Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";

/** On phones the menu folds away, so the page starts at the top of the screen. */
export function MobileMenu({ logo, actions, children }: { logo: ReactNode; actions: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        {logo}
        <div className="flex items-center gap-2 lg:hidden">
          {actions}
          <button
            type="button"
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid size-11 cursor-pointer place-items-center rounded-full border border-white/25 text-white transition-colors hover:bg-white/10"
            onClick={() => setOpen(!open)}
          >
            {open ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
          </button>
        </div>
      </div>
      <div
        id="site-menu"
        className={open ? undefined : "max-lg:hidden"}
        onClick={(event) => {
          if ((event.target as Element).closest("a")) setOpen(false);
        }}
      >
        {children}
      </div>
    </>
  );
}
