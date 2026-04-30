'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

type Props = {
  coordinates: [number, number][];  // [lat, lng]
};

function BoundsFitter({ coordinates }: { coordinates: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (coordinates.length > 0) {
      map.fitBounds(coordinates, { padding: [48, 48] });
    }
  }, [coordinates, map]);
  return null;
}

export default function RideDetailMap({ coordinates }: Props) {
  const defaultCenter: [number, number] = [50.50, 4.47];
  const start = coordinates[0] ?? null;

  return (
    <MapContainer
      center={defaultCenter}
      zoom={8}
      style={{ height: '100%', width: '100%' }}
      zoomControl
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        maxZoom={19}
      />

      <BoundsFitter coordinates={coordinates} />

      {coordinates.length > 0 && (
        <Polyline
          positions={coordinates}
          pathOptions={{ color: '#8B5CF6', weight: 5, opacity: 1 }}
        />
      )}

      {start && (
        <CircleMarker
          center={start}
          radius={11}
          pathOptions={{
            color:       '#1E293B',
            weight:      3,
            fillColor:   '#FBBF24',
            fillOpacity: 1,
          }}
        />
      )}
    </MapContainer>
  );
}
