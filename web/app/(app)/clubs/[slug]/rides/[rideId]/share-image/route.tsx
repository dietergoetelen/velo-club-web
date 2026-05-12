import { ImageResponse } from 'next/og';
import { getAuthenticatedPB } from '@/lib/session';
import { renderRouteMapDataUri } from '@/lib/share-image';
import type { Club, Route } from '@/lib/types';

export const runtime = 'nodejs';

const LOCALE = 'nl-BE';

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString(LOCALE, {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(LOCALE, {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string; rideId: string }> },
) {
  const { slug, rideId } = await params;

  const pb = await getAuthenticatedPB().catch(() => null);
  if (!pb) return new Response('unauthorized', { status: 401 });

  let club: Club;
  let ride: Route;
  try {
    club = await pb.collection('clubs').getFirstListItem<Club>(`slug = "${slug}"`);
    ride = await pb.collection('routes').getOne<Route>(rideId);
  } catch {
    return new Response('not found', { status: 404 });
  }
  if (ride.club !== club.id) return new Response('not found', { status: 404 });

  const mapUri = await renderRouteMapDataUri(ride.coordinates, 960, '#FBBF24');

  // ── Layout constants (palette mirrors globals.css) ──────────────────────
  const PAPER    = '#FBF6EC';
  const INK      = '#1E293B';
  const INK_SOFT = '#64748B';
  const AMBER    = '#FBBF24';

  return new ImageResponse(
    (
      <div
        style={{
          width:           '100%',
          height:          '100%',
          display:         'flex',
          flexDirection:   'column',
          backgroundColor: PAPER,
          padding:         '80px 64px',
          fontFamily:      'Inter, system-ui, sans-serif',
        }}
      >
        {/* ── Top: club + ride title + date ───────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize:      28,
              fontWeight:    900,
              color:         INK_SOFT,
              letterSpacing: 3,
              textTransform: 'uppercase',
            }}
          >
            {club.name}
          </div>
          <div
            style={{
              fontSize:   88,
              fontWeight: 900,
              color:      INK,
              lineHeight: 1.02,
              marginTop:  16,
              letterSpacing: -1,
            }}
          >
            {ride.name}
          </div>
          <div
            style={{
              fontSize:   38,
              fontWeight: 600,
              color:      INK_SOFT,
              marginTop:  20,
              textTransform: 'capitalize',
            }}
          >
            {`${formatDay(ride.date)} · ${formatTime(ride.date)}`}
          </div>
        </div>

        {/* ── Stats row ────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: 80, marginTop: 36 }}>
          <Stat label="AFSTAND"  value={`${ride.distance_km}`} unit="km" />
          <Stat label="HOOGTE"   value={`${ride.elevation_m}`} unit="m ↑" />
        </div>

        {/* ── Map ──────────────────────────────────────────────────────── */}
        {mapUri && (
          <div
            style={{
              display:         'flex',
              marginTop:       56,
              borderRadius:    32,
              border:          `4px solid ${INK}`,
              overflow:        'hidden',
              boxShadow:       `12px 12px 0 ${INK}`,
              alignSelf:       'center',
              width:           '100%',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mapUri} width={952} height={952} alt="" />
          </div>
        )}

        {/* ── Spacer + footer ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', flex: 1 }} />

        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 24 }}>
          <div
            style={{
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              width:           96,
              height:          96,
              borderRadius:    9999,
              backgroundColor: AMBER,
              border:          `4px solid ${INK}`,
              boxShadow:       `6px 6px 0 ${INK}`,
              fontSize:        56,
              fontWeight:      900,
              color:           INK,
            }}
          >
            🚴
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 38, fontWeight: 900, color: INK }}>
              Gepland met Zoesh
            </div>
            <div style={{ fontSize: 20, color: INK_SOFT, marginTop: 4 }}>
              © OpenStreetMap contributors · CARTO
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width:  1080,
      height: 1920,
    },
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          fontSize:      22,
          fontWeight:    900,
          color:         '#64748B',
          letterSpacing: 3,
        }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', marginTop: 6 }}>
        <div style={{ fontSize: 88, fontWeight: 900, color: '#1E293B', lineHeight: 1 }}>
          {value}
        </div>
        <div style={{ fontSize: 32, fontWeight: 700, color: '#64748B', marginLeft: 12 }}>
          {unit}
        </div>
      </div>
    </div>
  );
}
