'use client';

import { useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) { onPick(e.latlng.lat, e.latlng.lng); },
  });
  return null;
}

function Recentre({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    if (lat !== 0 || lng !== 0) map.setView([lat, lng], 13);
  }, [lat, lng, map]);
  return null;
}

export default function StartLocationMap({
  lat,
  lng,
  onPick,
}: {
  lat:    number;
  lng:    number;
  onPick: (lat: number, lng: number) => void;
}) {
  const isSet = lat !== 0 || lng !== 0;
  const center: [number, number] = isSet ? [lat, lng] : [50.50, 4.47];
  const zoom = isSet ? 13 : 8;

  return (
    <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }} zoomControl>
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        maxZoom={19}
      />
      <ClickHandler onPick={onPick} />
      <Recentre lat={lat} lng={lng} />
      {isSet && (
        <CircleMarker
          center={[lat, lng]}
          radius={10}
          pathOptions={{ color: '#1E293B', weight: 3, fillColor: '#FBBF24', fillOpacity: 1 }}
        />
      )}
    </MapContainer>
  );
}
