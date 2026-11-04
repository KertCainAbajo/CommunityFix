import "leaflet/dist/leaflet.css";
import "./globals.css";

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";

import { SiteNav, SiteNavFallback } from "@/components/site-nav";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "CommunityFix", template: "%s · CommunityFix" },
  description: "Report community problems and track them until they are resolved.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col">
        <header className="border-b bg-card">
          <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-5 gap-y-2 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold">
              <span aria-hidden className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
                <svg viewBox="0 0 32 32" className="size-full">
                  <path d="M9 16.5l5 5 9-11" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              CommunityFix
            </Link>
            <Suspense fallback={<SiteNavFallback />}>
              <SiteNav />
            </Suspense>
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-7 px-4 pt-7 pb-14">{children}</main>
        <footer className="border-t py-4 text-sm text-muted-foreground">
          <div className="mx-auto max-w-5xl px-4">
            CommunityFix. For emergencies, call your local hotline instead of filing a report.
          </div>
        </footer>
      </body>
    </html>
  );
}
