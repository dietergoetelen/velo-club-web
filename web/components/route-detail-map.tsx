'use client';

import { useEffect } from 'react';
import { MapContainer, Polyline, CircleMarker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import DirectionArrows from '@/lib/direction-arrows';
import MapLayers from '@/components/map-layers';

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

export default function RouteDetailMap({ coordinates }: Props) {
  const defaultCenter: [number, number] = [50.50, 4.47];
  const start = coordinates[0] ?? null;

  return (
    <MapContainer
      center={defaultCenter}
      zoom={8}
      style={{ height: '100%', width: '100%' }}
      zoomControl
    >
      <MapLayers />

      <BoundsFitter coordinates={coordinates} />

      {coordinates.length > 0 && (
        <>
          <Polyline
            positions={coordinates}
            pathOptions={{ color: '#8B5CF6', weight: 5, opacity: 1 }}
          />
          <DirectionArrows coordinates={coordinates} />
        </>
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
