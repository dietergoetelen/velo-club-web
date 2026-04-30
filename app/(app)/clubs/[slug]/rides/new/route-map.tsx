'use client';

import { useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { RideRoute } from '@/lib/types';

type StartPos = { lat: number; lng: number };

// ── Sub-components ────────────────────────────────────────────────────────────

function ClickHandler({ onMapClick }: { onMapClick: (pos: StartPos) => void }) {
  useMapEvents({
    click(e) { onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng }); },
  });
  return null;
}

function BoundsFitter({
  routes,
  startPos,
}: {
  routes:   RideRoute[];
  startPos: StartPos | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (routes.length > 0) {
      const all = routes.flatMap(r => r.coordinates) as [number, number][];
      if (all.length) map.fitBounds(all, { padding: [48, 48] });
    } else if (startPos) {
      map.setView([startPos.lat, startPos.lng], 13);
    }
  }, [routes, startPos, map]);

  return null;
}

// ── Main map ──────────────────────────────────────────────────────────────────

type Props = {
  startPos:        StartPos | null;
  routes:          RideRoute[];
  selectedRouteId: string | null;
  onMapClick:      (pos: StartPos) => void;
  onRouteSelect:   (route: RideRoute) => void;
};

export default function RouteMap({
  startPos,
  routes,
  selectedRouteId,
  onMapClick,
  onRouteSelect,
}: Props) {
  /* Default to centre of Belgium */
  const defaultCenter: [number, number] = [50.50, 4.47];

  return (
    <MapContainer
      center={defaultCenter}
      zoom={8}
      style={{ height: '100%', width: '100%' }}
      zoomControl
    >
      {/* Carto Positron — clean, minimal, routes pop nicely */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        maxZoom={19}
      />

      <ClickHandler onMapClick={onMapClick} />
      <BoundsFitter routes={routes} startPos={startPos} />

      {/* ── Routes ── */}
      {routes.map(route => {
        const selected = route.id === selectedRouteId;
        return (
          <Polyline
            key={route.id}
            positions={route.coordinates}
            pathOptions={{
              color:   route.color,
              weight:  selected ? 6 : 4,
              opacity: selected ? 1 : 0.45,
            }}
            eventHandlers={{ click: () => onRouteSelect(route) }}
          />
        );
      })}

      {/* ── Start marker ── amber circle, matches design system ── */}
      {startPos && (
        <CircleMarker
          center={[startPos.lat, startPos.lng]}
          radius={11}
          pathOptions={{
            color:       '#1E293B',  // --ink
            weight:      3,
            fillColor:   '#FBBF24',  // --amber
            fillOpacity: 1,
          }}
        />
      )}
    </MapContainer>
  );
}
