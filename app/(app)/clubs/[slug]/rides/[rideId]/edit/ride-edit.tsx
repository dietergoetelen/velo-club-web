'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { updateRideRoute } from '@/lib/actions/rides';
import { RouteEditPanel } from '@/components/route-edit-panel';

type StartPos = { lat: number; lng: number };

export function RideEdit({
  rideId,
  slug,
  clubName,
  rideName,
  startPos,
  coordinates,
  distance,
  elevation,
}: {
  rideId:      string;
  slug:        string;
  clubName:    string;
  rideName:    string;
  startPos:    StartPos;
  coordinates: [number, number][];
  distance:    number;
  elevation:   number;
}) {
  const [saveError, saveAction] = useActionState(updateRideRoute, null);

  return (
    <RouteEditPanel
      start={startPos}
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
            Edit route
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
            Save changes →
          </button>
        </form>
      )}
      footer={
        <p className="text-xs text-ink-soft mt-2">
          Original: {distance} km · {elevation} m ↑
        </p>
      }
    />
  );
}
