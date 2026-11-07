"use client";

import type { DivIcon, Map as LeafletMap, Marker } from "leaflet";
import { MapPin, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { MapPoint, Status } from "@/lib/types";

type Center = { lat: number; lng: number };
type Leaflet = typeof import("leaflet");

const toolIcon = (paths: string) =>
  `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

const ICONS = {
  larger: toolIcon('<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>'),
  all: toolIcon('<path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11Z"/><circle cx="12" cy="10" r="2.5"/>'),
};

/** A button in the same stack as the map's + and - buttons. */
function addMapButton(L: Leaflet, map: LeafletMap, label: string, icon: string, onClick: () => void) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "map-tool";
  button.title = label;
  button.setAttribute("aria-label", label);
  button.innerHTML = icon;

  const control = new L.Control({ position: "topleft" });
  control.onAdd = () => {
    const bar = L.DomUtil.create("div", "leaflet-bar");
    bar.append(button);
    L.DomEvent.disableClickPropagation(bar);
    L.DomEvent.on(button, "click", onClick);
    return bar;
  };
  control.addTo(map);

  return button;
}

function createMap(L: Leaflet, element: HTMLElement, center: Center, zoom: number) {
  const map = L.map(element).setView([center.lat, center.lng], zoom);
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

/** Places the pins, and returns a way to bring them all back into view. */
function addPins(L: Leaflet, map: LeafletMap, points: MapPoint[], open: (id: number) => void) {
  for (const point of points) {
    L.marker([point.lat, point.lng], { icon: pin(L, point.status), title: point.title })
      .on("click", () => open(point.id))
      .addTo(map);
  }

  // No animation: leaving the page mid-zoom makes Leaflet throw after the map is gone.
  const showAll = () => map.fitBounds(points.map(({ lat, lng }) => [lat, lng]), { padding: [40, 40], maxZoom: 16, animate: false });
  if (points.length > 1) showAll();
  return showAll;
}

type MapLabels = Partial<Record<Status, string>>;

/** A large map in a card over the page, with the reports listed beside it. */
function MapCard({
  points,
  center,
  zoom,
  title,
  labels,
  onClose,
}: {
  points: MapPoint[];
  center: Center;
  zoom: number;
  title: string;
  labels?: MapLabels;
  onClose: () => void;
}) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const leaflet = useRef<LeafletMap | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const [listShown, setListShown] = useState(true);
  const hasList = points.length > 1;

  const element = useLeaflet((L, node) => {
    const map = createMap(L, node, center, zoom);
    leaflet.current = map;
    const showAll = addPins(L, map, points, (id) => router.push(`/issues/${id}`));
    if (points.length > 0) addMapButton(L, map, "Show all reports", ICONS.all, showAll);
    return map;
  });

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  // The map has to measure itself again when the list opens or closes.
  useEffect(() => {
    leaflet.current?.invalidateSize();
  }, [listShown]);

  const focus = (point: MapPoint) => {
    setActive(point.id);
    leaflet.current?.setView([point.lat, point.lng], 17, { animate: false });
  };

  return (
    <dialog
      ref={dialog}
      aria-label={title}
      className="map-card"
      onClose={onClose}
      onClick={(event) => {
        // A click on the dimmed area outside the card.
        if (event.target === dialog.current) dialog.current.close();
      }}
    >
      <div className="map-card-inner">
        <header className="flex items-center justify-between gap-4 border-b px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-xl">{title}</h2>
            <p className="text-sm text-muted-foreground">{points.length} {points.length === 1 ? "report" : "reports"} shown. Click a pin to open it.</p>
          </div>
          <div className="flex flex-none items-center gap-2">
            {hasList && (
              <button type="button" aria-pressed={!listShown} className="h-10 cursor-pointer rounded-full border px-4 text-sm font-semibold transition-colors hover:bg-muted" onClick={() => setListShown(!listShown)}>
                {listShown ? "Hide list" : "Show list"}
              </button>
            )}
            <button type="button" aria-label="Close map" className="grid size-10 cursor-pointer place-items-center rounded-full border transition-colors hover:bg-muted" onClick={() => dialog.current?.close()}>
              <X aria-hidden className="size-5" />
            </button>
          </div>
        </header>
        <div className={hasList && listShown ? "map-card-body map-card-split" : "map-card-body"}>
          <div ref={element} className="z-0 size-full min-h-72 bg-muted" />
          {hasList && listShown && (
            <ul aria-label="Reports on this map" className="grid content-start gap-2 overflow-y-auto border-l p-3">
              {points.map((point) => (
                <li key={point.id}>
                  <div className={`grid gap-1.5 rounded-xl border p-3 transition-colors ${active === point.id ? "border-primary bg-sky" : "hover:bg-muted"}`}>
                    <button type="button" className="cursor-pointer text-left font-semibold [overflow-wrap:anywhere] hover:text-primary" onClick={() => focus(point)}>
                      {point.title}
                    </button>
                    <div className="flex items-center justify-between gap-2">
                      {labels?.[point.status] ? <span className="plate" data-status={point.status}>{labels[point.status]}</span> : <span />}
                      <Link href={`/issues/${point.id}`} className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                        <MapPin aria-hidden className="size-3.5" /> Open
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </dialog>
  );
}

export function IssueMap({
  points,
  center,
  zoom = 14,
  className = "h-60",
  title = "Community map",
  labels,
}: {
  points: MapPoint[];
  center: Center;
  zoom?: number;
  className?: string;
  title?: string;
  labels?: MapLabels;
}) {
  const router = useRouter();
  const [enlarged, setEnlarged] = useState(false);

  const element = useLeaflet((L, node) => {
    const map = createMap(L, node, center, zoom);
    const showAll = addPins(L, map, points, (id) => router.push(`/issues/${id}`));
    addMapButton(L, map, "View larger map", ICONS.larger, () => setEnlarged(true));
    if (points.length > 0) addMapButton(L, map, "Show all reports", ICONS.all, showAll);
    return map;
  });

  return (
    <>
      <div ref={element} className={`${mapClass} ${className}`} />
      {enlarged && <MapCard points={points} center={center} zoom={zoom} title={title} labels={labels} onClose={() => setEnlarged(false)} />}
    </>
  );
}

export function LocationPicker({ center, onPlace }: { center: Center; onPlace?: (position: Center) => void }) {
  const [position, setPosition] = useState<Center | null>(null);
  const [message, setMessage] = useState("Tap the map to drop a pin.");
  const leaflet = useRef<{ L: Leaflet; map: LeafletMap; marker?: Marker } | null>(null);

  const place = (lat: number, lng: number) => {
    setPosition({ lat, lng });
    onPlace?.({ lat, lng });
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
