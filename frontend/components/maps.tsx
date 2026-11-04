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

function pin(L: Leaflet, status: Status): DivIcon {
  return L.divIcon({
    className: "",
    html: `<span class="pin" data-status="${status}"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
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
      map?.remove();
    };
  }, []);

  return element;
}

const mapClass = "z-0 rounded-sm border bg-muted";

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
      map.fitBounds(points.map(({ lat, lng }) => [lat, lng]), { padding: [32, 32] });
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
        leaflet.current?.map.setView([coords.latitude, coords.longitude], 17);
      },
      () => setMessage("Could not get your location. Tap the map instead."),
    );
  };

  return (
    <fieldset className="grid min-w-0 gap-2">
      <legend className="mb-2 text-sm font-medium">
        Pin it on the map <span className="font-normal text-muted-foreground">(optional)</span>
      </legend>
      <div ref={element} className={`${mapClass} h-60`} />
      <div className="flex flex-wrap items-center gap-2.5">
        <Button type="button" variant="outline" onClick={locate}>Use my location</Button>
        <span aria-live="polite" className="text-sm text-muted-foreground">{message}</span>
      </div>
      <input type="hidden" name="lat" value={position?.lat.toFixed(6) ?? ""} />
      <input type="hidden" name="lng" value={position?.lng.toFixed(6) ?? ""} />
    </fieldset>
  );
}
