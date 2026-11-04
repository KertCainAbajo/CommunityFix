"use client";

import { useSyncExternalStore } from "react";

const noChanges = () => () => {};

/** This page is built ahead of time, so the address is only known in the browser. */
export function RequestedPath() {
  const path = useSyncExternalStore(noChanges, () => window.location.pathname, () => "");

  return <code className="min-h-5 font-mono text-sm break-all text-muted-foreground">{path}</code>;
}
