"use client";

import { ThumbsUp } from "lucide-react";
import { useState, useTransition } from "react";

import { toggleSupport } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** "Me too": says the problem affects you as well, and brings you its updates. */
export function SupportButton({ issueId, supported, onDone }: { issueId: number; supported: boolean; onDone?: () => void }) {
  const [pending, start] = useTransition();
  const [on, setOn] = useState(supported);
  const [error, setError] = useState<string | null>(null);

  const toggle = () => start(async () => {
    const failed = await toggleSupport(issueId, !on);
    if (failed) setError(failed.error);
    else {
      setOn(!on);
      onDone?.();
    }
  });

  return (
    <div className="grid gap-1">
      <Button type="button" variant={on ? "secondary" : "default"} className="h-10 gap-2" disabled={pending} aria-pressed={on} onClick={toggle}>
        <ThumbsUp aria-hidden className={cn("size-4", on && "fill-current")} /> {on ? "You said me too" : "Me too"}
      </Button>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
