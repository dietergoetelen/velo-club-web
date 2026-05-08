'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';

function PickerMapLoading() {
  const t = useTranslations('common');
  return (
    <div className="w-full h-full flex items-center justify-center bg-muted text-xs text-ink-soft font-bold">
      {t('loadingMap')}
    </div>
  );
}

const PickerMap = dynamic(() => import('./start-location-map'), {
  ssr:     false,
  loading: PickerMapLoading,
});

export function StartLocationPicker({
  initialLat,
  initialLng,
}: {
  initialLat: number;
  initialLng: number;
}) {
  const t = useTranslations('clubs.settings');
  const [lat, setLat] = useState(initialLat);
  const [lng, setLng] = useState(initialLng);
  const isSet = lat !== 0 || lng !== 0;

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => { setLat(pos.coords.latitude); setLng(pos.coords.longitude); },
      ()  => alert(t('geolocationFailed')),
    );
  };

  const clear = () => { setLat(0); setLng(0); };

  return (
    <div>
      <label className="field-label">{t('startLocationLabel')}</label>
      <p className="text-xs text-ink-soft -mt-1 mb-2">
        {t('startLocationHint')}
      </p>

      <div
        className="w-full h-56 rounded-lg overflow-hidden mb-3"
        style={{ border: '2px solid var(--ink)' }}
      >
        <PickerMap
          lat={lat}
          lng={lng}
          onPick={(la, ln) => { setLat(la); setLng(ln); }}
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={useMyLocation}
          className="btn-secondary text-xs px-3 py-1.5"
        >
          {t('useMyLocation')}
        </button>
        {isSet && (
          <>
            <span className="text-xs text-ink-soft tabular-nums flex-1">
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </span>
            <button
              type="button"
              onClick={clear}
              className="text-xs text-ink-soft hover:text-ink transition-colors font-black"
              aria-label={t('clearStart')}
            >
              ✕
            </button>
          </>
        )}
      </div>

      <input type="hidden" name="start_lat" value={lat} />
      <input type="hidden" name="start_lng" value={lng} />
    </div>
  );
}
