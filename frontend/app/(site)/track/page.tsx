import type { Metadata } from "next";

import { TrackForm } from "@/components/forms";

export const metadata: Metadata = { title: "Track your report" };

export default function TrackPage() {
  return (
    <div className="mx-auto grid w-full max-w-lg gap-3.5">
      <h1 className="text-4xl">Track your report</h1>
      <p className="text-lg text-muted-foreground">Enter the tracking number you got when you filed your report.</p>
      <div className="sheet"><TrackForm /></div>
    </div>
  );
}
