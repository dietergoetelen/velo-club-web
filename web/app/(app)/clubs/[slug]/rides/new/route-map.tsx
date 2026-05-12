'use client';

import { useEffect, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Marker,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { RideRoute } from '@/lib/types';
import DirectionArrows from '@/lib/direction-arrows';
import { MapSearch } from '@/components/map-search';

type StartPos = { lat: number; lng: number };
type Waypoint = { id: string; lat: number; lng: number };

// ── Sub-components ────────────────────────────────────────────────────────────

function ClickHandler({
  editing,
  onMapClick,
  onAddWaypoint,
}: {
  editing:        boolean;
  onMapClick:     (pos: StartPos) => void;
  onAddWaypoint?: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (editing) {
        onAddWaypoint?.(e.latlng.lat, e.latlng.lng);
      } else {
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });
  return null;
}

function BoundsFitter({
  routes,
  startPos,
  editing,
  editPolyline,
}: {
  routes:        RideRoute[];
  startPos:      StartPos | null;
  editing:       boolean;
  editPolyline?: [number, number][];
}) {
  const map = useMap();
  const fitOnceForEditing = useRef(false);

  useEffect(() => {
    if (editing) {
      // First time we enter edit mode, position the map. Don't re-fit on
      // subsequent recalcs — the user may have panned.
      if (fitOnceForEditing.current) return;

      if (editPolyline && editPolyline.length >= 2) {
        // Existing route — fit to its bounds.
        map.fitBounds(editPolyline as [number, number][], { padding: [48, 48] });
      } else if (startPos) {
        // Empty/single-point polyline — center on start. fitBounds on a
        // single point would zoom to max; use a friendly default zoom.
        map.setView([startPos.lat, startPos.lng], 13);
      }
      fitOnceForEditing.current = true;
      return;
    }

    if (routes.length > 0) {
      const all = routes.flatMap(r => r.coordinates) as [number, number][];
      if (all.length) map.fitBounds(all, { padding: [48, 48] });
    } else if (startPos) {
      map.setView([startPos.lat, startPos.lng], 13);
    }
  }, [routes, startPos, map, editing, editPolyline]);

  return null;
}

// ── Main map ──────────────────────────────────────────────────────────────────

// Numbered amber pin for waypoints. Built once per index because Leaflet's
// divIcon needs distinct DOM strings per number.
function waypointIcon(n: number): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="
      width: 26px; height: 26px; border-radius: 50%;
      background: var(--amber, #FBBF24);
      border: 2px solid var(--ink, #1E293B);
      box-shadow: 2px 2px 0 var(--ink, #1E293B);
      color: var(--ink, #1E293B);
      font: 900 12px/22px ui-sans-serif, system-ui, sans-serif;
      text-align: center; cursor: grab; user-select: none;">${n}</div>`,
    iconSize:   [26, 26],
    iconAnchor: [13, 13],
  });
}

type Props = {
  startPos:        StartPos | null;
  routes:          RideRoute[];
  selectedRouteId: string | null;
  onMapClick:      (pos: StartPos) => void;
  onRouteSelect:   (route: RideRoute) => void;

  // Edit mode (only used when editing === true)
  editing?:           boolean;
  waypoints?:         Waypoint[];
  editPolyline?:      [number, number][];
  onAddWaypoint?:     (lat: number, lng: number) => void;
  onMoveWaypoint?:    (id: string, lat: number, lng: number) => void;
  onDeleteWaypoint?:  (id: string) => void;
};

export default function RouteMap({
  startPos,
  routes,
  selectedRouteId,
  onMapClick,
  onRouteSelect,
  editing          = false,
  waypoints        = [],
  editPolyline,
  onAddWaypoint,
  onMoveWaypoint,
  onDeleteWaypoint,
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

      <ClickHandler
        editing={editing}
        onMapClick={onMapClick}
        onAddWaypoint={onAddWaypoint}
      />
      <MapSearch />
      <BoundsFitter
        routes={routes}
        startPos={startPos}
        editing={editing}
        editPolyline={editPolyline}
      />

      {/* ── Routes ── (hidden in edit mode; the editPolyline takes over) */}
      {!editing && routes.map(route => {
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

      {/* ── Direction arrows on the selected route only (avoid clutter) ── */}
      {!editing && (() => {
        const sel = routes.find(r => r.id === selectedRouteId);
        return sel ? <DirectionArrows coordinates={sel.coordinates} /> : null;
      })()}

      {/* ── Edit-mode polyline ── */}
      {editing && editPolyline && editPolyline.length > 0 && (
        <>
          <Polyline
            positions={editPolyline}
            pathOptions={{ color: '#8B5CF6', weight: 6, opacity: 1 }}
          />
          <DirectionArrows coordinates={editPolyline} />
        </>
      )}

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

      {/* ── Waypoint markers (edit mode only) ── */}
      {editing && waypoints.map((wp, i) => (
        <Marker
          key={wp.id}
          position={[wp.lat, wp.lng]}
          icon={waypointIcon(i + 1)}
          draggable
          eventHandlers={{
            dragend: e => {
              const m = e.target as L.Marker;
              const ll = m.getLatLng();
              onMoveWaypoint?.(wp.id, ll.lat, ll.lng);
            },
          }}
        />
      ))}
    </MapContainer>
  );
}
