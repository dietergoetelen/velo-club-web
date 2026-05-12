/**
 * Photon geocoder client.
 *
 * Photon is komoot's free OSM-based geocoder. No API key, CORS-enabled, so
 * the browser can call it directly. Rate limits are forgiving for a small
 * club app. Docs: https://photon.komoot.io/
 */

const PHOTON_URL = 'https://photon.komoot.io/api/';

export interface PlaceResult {
  id:          string;
  lat:         number;
  lng:         number;
  name:        string;   // primary label (e.g. "Markt 12" or "Antwerpen")
  description: string;   // secondary line (city/region/country)
  /** [west, south, east, north] when Photon returned an extent — for fitBounds. */
  bbox?: [number, number, number, number];
}

interface PhotonProperties {
  osm_id:      number;
  osm_type:    string;
  name?:       string;
  street?:     string;
  housenumber?: string;
  city?:       string;
  state?:      string;
  country?:    string;
  postcode?:   string;
  /** Photon returns [west, north, east, south] — note the order. */
  extent?:     [number, number, number, number];
}

interface PhotonFeature {
  geometry:   { coordinates: [number, number] };
  properties: PhotonProperties;
}

interface PhotonResponse {
  features: PhotonFeature[];
}

/**
 * Photon supports only `default | de | en | fr` for the `lang` param. Pass
 * one of those (or undefined to use the default mixed-language labels).
 */
export type GeocodeLang = 'default' | 'de' | 'en' | 'fr';

export async function searchPlaces(
  query: string,
  bias?: { lat: number; lng: number },
  lang?: GeocodeLang,
  signal?: AbortSignal,
): Promise<PlaceResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const params = new URLSearchParams({ q, limit: '6' });
  if (lang) params.set('lang', lang);
  if (bias) {
    params.set('lat', String(bias.lat));
    params.set('lon', String(bias.lng));
  }

  const res = await fetch(`${PHOTON_URL}?${params.toString()}`, { signal });
  if (!res.ok) return [];
  const data = await res.json() as PhotonResponse;
  if (!Array.isArray(data?.features)) return [];

  return data.features.map(f => {
    const [lng, lat] = f.geometry.coordinates;
    const p = f.properties;

    const addr  = [p.housenumber, p.street].filter(Boolean).join(' ');
    const place = [p.city, p.state, p.country].filter(Boolean).join(', ');

    const name        = addr || p.name || p.city || 'Onbekend';
    const description = addr
      ? place
      : p.name && place
        ? place
        : '';

    let bbox: PlaceResult['bbox'];
    if (p.extent) {
      // Photon: [w, n, e, s] → we want [w, s, e, n] (Leaflet ordering)
      const [w, n, e, s] = p.extent;
      bbox = [w, s, e, n];
    }

    return {
      id: `${p.osm_type}-${p.osm_id}`,
      lat,
      lng,
      name,
      description,
      bbox,
    };
  });
}
