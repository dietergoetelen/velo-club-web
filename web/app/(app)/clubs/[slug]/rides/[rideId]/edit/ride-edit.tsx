'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { updateRideRoute } from '@/lib/actions/rides';
import { RouteEditPanel } from '@/components/route-edit-panel';

export function RideEdit({
  rideId,
  slug,
  clubName,
  rideName,
  coordinates,
  distance,
  elevation,
}: {
  rideId:      string;
  slug:        string;
  clubName:    string;
  rideName:    string;
  coordinates: [number, number][];
  distance:    number;
  elevation:   number;
}) {
  const t = useTranslations('rides.edit');
  const [saveError, saveAction] = useActionState(updateRideRoute, null);

  return (
    <RouteEditPanel
      initialPolyline={coordinates}
      initialElevation={elevation}
      profile="bike"
      header={
        <>
          <Link
            href={`/clubs/${slug}/rides/${rideId}`}
            className="eyebrow mb-3 inline-flex items-center gap-1.5 hover:text-accent transition-colors"
          >
            ← {clubName} · {rideName}
          </Link>
          <h1 className="font-heading font-black text-2xl text-ink tracking-tight leading-tight">
            {t('title')}
          </h1>
        </>
      }
      saveSlot={s => (
        <form action={saveAction} className="space-y-4 pt-1">
          <input type="hidden" name="rideId"      value={rideId} />
          <input type="hidden" name="slug"        value={slug} />
          <input type="hidden" name="distanceKm"  value={s.distance} />
          <input type="hidden" name="elevationM"  value={s.elevation} />
          <input type="hidden" name="coordinates" value={JSON.stringify(s.polyline)} />

          {saveError && <p className="field-error">{saveError}</p>}

          <button type="submit" disabled={!s.canSave} className="btn-primary w-full">
            {t('saveChanges')}
          </button>
        </form>
      )}
      footer={
        <p className="text-xs text-ink-soft mt-2">
          {t('original', { distance, elevation })}
        </p>
      }
    />
  );
}
