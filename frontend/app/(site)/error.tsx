"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <div className="grid justify-items-center gap-3 rounded-xl border border-dashed px-4 py-9 text-center">
      <p>Something went wrong loading this page. The server may still be waking up.</p>
      <Button variant="outline" onClick={() => retry()}>Try again</Button>
    </div>
  );
}
