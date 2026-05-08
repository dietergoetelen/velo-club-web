'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';

function MapLoading() {
  const t = useTranslations('common');
  return (
    <div className="w-full h-full flex items-center justify-center bg-muted">
      <p className="text-ink-soft text-sm font-bold animate-pulse">{t('loadingMap')}</p>
    </div>
  );
}

const RideDetailMap = dynamic(() => import('./ride-detail-map'), {
  ssr:     false,
  loading: MapLoading,
});

export default function RideMapClient({ coordinates }: { coordinates: [number, number][] }) {
  return <RideDetailMap coordinates={coordinates} />;
}
