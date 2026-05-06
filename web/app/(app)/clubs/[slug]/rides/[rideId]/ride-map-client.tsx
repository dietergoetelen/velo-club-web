'use client';

import dynamic from 'next/dynamic';

const RideDetailMap = dynamic(() => import('./ride-detail-map'), {
  ssr:     false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-muted">
      <p className="text-ink-soft text-sm font-bold animate-pulse">Loading map…</p>
    </div>
  ),
});

export default function RideMapClient({ coordinates }: { coordinates: [number, number][] }) {
  return <RideDetailMap coordinates={coordinates} />;
}
