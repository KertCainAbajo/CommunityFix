"use client";

import type { DivIcon, Map as LeafletMap, Marker } from "leaflet";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { MapPoint, Status } from "@/lib/types";

type Center = { lat: number; lng: number };
type Leaflet = typeof import("leaflet");

function createMap(L: Leaflet, element: HTMLElement, center: Center, zoom: number) {
  const map = L.map(element, { scrollWheelZoom: false }).setView([center.lat, center.lng], zoom);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
  return map;
}

const PIN_SYMBOLS: Record<Status, string> = {
  reported: '<path d="M17 9v10M17 23.5v.5" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round"/>',
  acknowledged: '<circle cx="17" cy="16" r="5" fill="none" stroke="#fff" stroke-width="3"/><path d="M21 20l3.5 3.5" stroke="#fff" stroke-width="3" stroke-linecap="round"/>',
  in_progress: '<path d="M23.5 10.5a5 5 0 0 0-6.6 6.2l-6 6 2.4 2.4 6-6a5 5 0 0 0 6.2-6.6l-3 3-2.6-.4-.4-2.6z" fill="#fff"/>',
  resolved: '<path d="M11 17l4.2 4.2L23.5 12" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>',
  rejected: '<path d="M12 12l10 10M22 12L12 22" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/>',
};

function pin(L: Leaflet, status: Status): DivIcon {
  return L.divIcon({
    className: "",
    html: `<svg class="map-pin" viewBox="0 0 34 44" data-status="${status}"><path d="M17 1C8.2 1 1 8 1 16.8 1 28.6 17 43 17 43s16-14.4 16-26.2C33 8 25.8 1 17 1Z" style="fill:var(--plate-solid)" stroke="#fff" stroke-width="2"/>${PIN_SYMBOLS[status]}</svg>`,
    iconSize: [34, 44],
    iconAnchor: [17, 43],
  });
}

// Leaflet touches `window`, so it can only load in the browser.
function useLeaflet(setup: (L: Leaflet, element: HTMLElement) => LeafletMap) {
  const element = useRef<HTMLDivElement>(null);
  const latestSetup = useRef(setup);

  useEffect(() => {
    latestSetup.current = setup;
  });

  useEffect(() => {
    let map: LeafletMap | undefined;
    let cancelled = false;

    import("leaflet").then((L) => {
      if (!cancelled && element.current) map = latestSetup.current(L, element.current);
    });

    return () => {
      cancelled = true;
      map?.stop();
      map?.remove();
    };
  }, []);

  return element;
}

const mapClass = "z-0 border bg-muted";

export function IssueMap({
  points,
  center,
  zoom = 14,
  className = "h-60",
}: {
  points: MapPoint[];
  center: Center;
  zoom?: number;
  className?: string;
}) {
  const router = useRouter();

  const element = useLeaflet((L, node) => {
    const map = createMap(L, node, center, zoom);
    for (const point of points) {
      L.marker([point.lat, point.lng], { icon: pin(L, point.status), title: point.title })
        .on("click", () => router.push(`/issues/${point.id}`))
        .addTo(map);
    }
    if (points.length > 1) {
      // No animation: leaving the page mid-zoom makes Leaflet throw after the map is gone.
      map.fitBounds(points.map(({ lat, lng }) => [lat, lng]), { padding: [32, 32], animate: false });
    }
    return map;
  });

  return <div ref={element} className={`${mapClass} ${className}`} />;
}

export function LocationPicker({ center }: { center: Center }) {
  const [position, setPosition] = useState<Center | null>(null);
  const [message, setMessage] = useState("Tap the map to drop a pin.");
  const leaflet = useRef<{ L: Leaflet; map: LeafletMap; marker?: Marker } | null>(null);

  const place = (lat: number, lng: number) => {
    setPosition({ lat, lng });
    setMessage("Pin placed. Tap again to move it.");

    const current = leaflet.current;
    if (!current) return;
    if (current.marker) current.marker.setLatLng([lat, lng]);
    else current.marker = current.L.marker([lat, lng], { icon: pin(current.L, "reported") }).addTo(current.map);
  };

  const element = useLeaflet((L, node) => {
    const map = createMap(L, node, center, 14);
    leaflet.current = { L, map };
    map.on("click", (event) => place(event.latlng.lat, event.latlng.lng));
    return map;
  });

  const locate = () => {
    if (!navigator.geolocation) {
      setMessage("Your browser cannot share its location.");
      return;
    }
    setMessage("Finding you…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        place(coords.latitude, coords.longitude);
        leaflet.current?.map.setView([coords.latitude, coords.longitude], 17, { animate: false });
      },
      () => setMessage("Could not get your location. Tap the map instead."),
    );
  };

  return (
    <fieldset className="grid min-w-0 gap-2">
      <legend className="mb-2">
        Show it on the map <span className="font-normal text-muted-foreground">(optional)</span>
      </legend>
      <div ref={element} className={`${mapClass} h-60`} />
      <div className="flex flex-wrap items-center gap-2.5">
        <Button type="button" variant="outline" className="h-12 px-5 text-primary" onClick={locate}>Use my location</Button>
        <span aria-live="polite" className="text-muted-foreground">{message}</span>
      </div>
      <input type="hidden" name="lat" value={position?.lat.toFixed(6) ?? ""} />
      <input type="hidden" name="lng" value={position?.lng.toFixed(6) ?? ""} />
    </fieldset>
  );
}
