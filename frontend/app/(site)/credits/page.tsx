import type { Metadata } from "next";

import { PHOTO_CREDITS } from "@/lib/photos";

export const metadata: Metadata = { title: "Photo credits" };

export default function CreditsPage() {
  return (
    <div className="mx-auto grid w-full max-w-2xl gap-4">
      <h1 className="text-3xl">Photo credits</h1>
      <p className="text-muted-foreground">The photos on this site come from Wikimedia Commons. Thank you to the photographers.</p>
      <ul className="sheet gap-3!">
        {PHOTO_CREDITS.map((photo) => (
          <li key={photo.href} className="[overflow-wrap:anywhere]">
            <a href={photo.href} target="_blank" rel="noreferrer" className="link">{photo.title}</a> by {photo.author}, {photo.license}, resized and cropped
          </li>
        ))}
        <li>Other photos are public domain or CC0.</li>
      </ul>
    </div>
  );
}
