'use client';

import { LayersControl, TileLayer } from 'react-leaflet';
import { useTranslations } from 'next-intl';

// Shared basemap stack for the interactive maps:
//  - Carto Voyager: readable default (road hierarchy, green forests) while
//    staying calm enough that route polylines pop.
//  - CyclOSM: renders actual cycling infrastructure — separate cycle paths,
//    on-road lanes, and the knooppunten network — so riders can see which
//    roads are bikeable in unfamiliar areas.
//  - Waymarked Trails: transparent overlay with signed cycle routes, for use
//    on top of the standard map.
//
// `cycleRoutes` controls whether the Waymarked Trails overlay starts enabled.
// It should be on while planning/editing (that's when you need to find the
// network) but off when viewing an existing route — the overlay's red/blue
// mesh drowns out the route polyline. The prop is reactive: flipping it
// adds/removes the layer on the live map.
export default function MapLayers({ cycleRoutes = false }: { cycleRoutes?: boolean }) {
  const t = useTranslations('mapLayers');

  return (
    <LayersControl position="topright">
      <LayersControl.BaseLayer checked name={t('standard')}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          maxZoom={19}
        />
      </LayersControl.BaseLayer>

      <LayersControl.BaseLayer name={t('cycling')}>
        <TileLayer
          url="https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png"
          attribution='<a href="https://www.cyclosm.org">CyclOSM</a> | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />
      </LayersControl.BaseLayer>

      <LayersControl.Overlay checked={cycleRoutes} name={t('cycleRoutes')}>
        <TileLayer
          url="https://tile.waymarkedtrails.org/cycling/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://waymarkedtrails.org">Waymarked Trails</a> (CC-BY-SA)'
          maxZoom={18}
          opacity={0.3}
        />
      </LayersControl.Overlay>
    </LayersControl>
  );
}
