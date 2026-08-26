"use client";

import { useEffect, useMemo, useState } from "react";
import { MapPin, MapPinned } from "lucide-react";

type Coordinates = { lat: number; lon: number };

const coordinateCache = new Map<string, Coordinates | null>();

function mapTiles({ lat, lon }: Coordinates, zoom = 10) {
  const scale = 2 ** zoom;
  const latitude = Math.max(-85.0511, Math.min(85.0511, lat)) * Math.PI / 180;
  const worldX = (lon + 180) / 360 * scale;
  const worldY = (1 - Math.log(Math.tan(latitude) + 1 / Math.cos(latitude)) / Math.PI) / 2 * scale;
  const centerX = Math.floor(worldX);
  const centerY = Math.floor(worldY);
  return Array.from({ length: 9 }, (_, index) => {
    const dx = index % 3 - 1;
    const dy = Math.floor(index / 3) - 1;
    const tileX = (centerX + dx + scale) % scale;
    const tileY = Math.max(0, Math.min(scale - 1, centerY + dy));
    return {
      key: `${zoom}-${tileX}-${tileY}`,
      src: `https://tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`,
      left: `calc(50% + ${(centerX + dx - worldX) * 256}px)`,
      top: `calc(50% + ${(centerY + dy - worldY) * 256}px)`,
    };
  });
}

export function LocationMap({ location, loadingLabel }: { location: string; loadingLabel: string }) {
  const normalizedLocation = location.trim();
  const [coordinates, setCoordinates] = useState<Coordinates | null | undefined>(() => coordinateCache.get(normalizedLocation));

  useEffect(() => {
    if (!normalizedLocation) return;
    if (coordinateCache.has(normalizedLocation)) return;

    const controller = new AbortController();
    const params = new URLSearchParams({ q: normalizedLocation, format: "jsonv2", limit: "1" });
    void fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
      .then((response) => response.ok ? response.json() as Promise<Array<{ lat: string; lon: string }>> : [])
      .then((results) => {
        const result = results[0];
        const next = result && Number.isFinite(Number(result.lat)) && Number.isFinite(Number(result.lon))
          ? { lat: Number(result.lat), lon: Number(result.lon) }
          : null;
        coordinateCache.set(normalizedLocation, next);
        setCoordinates(next);
      })
      .catch((error: unknown) => {
        if ((error as { name?: string }).name === "AbortError") return;
        coordinateCache.set(normalizedLocation, null);
        setCoordinates(null);
      });
    return () => controller.abort();
  }, [normalizedLocation]);

  const tiles = useMemo(() => coordinates ? mapTiles(coordinates) : [], [coordinates]);
  return (
    <div className="location-map" aria-label={`${location} map`}>
      {tiles.length ? <>
        <div className="location-map-tiles">{tiles.map((tile) => <span className="location-map-tile" key={tile.key} style={{ left: tile.left, top: tile.top, backgroundImage: `url(${tile.src})` }} />)}</div>
        <MapPin className="location-map-pin" size={30} fill="currentColor" />
        <a className="location-map-credit" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a>
      </> : <div className="location-map-status"><MapPinned size={17} /><span>{coordinates === undefined ? loadingLabel : location}</span></div>}
    </div>
  );
}
