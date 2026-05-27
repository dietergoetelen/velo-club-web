'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { updatePersonalRoute } from '@/lib/actions/personal-routes';
import { RouteEditPanel } from '@/components/route-edit-panel';

/**
 * Edit an existing personal route. Loads the saved polyline into the editor.
 * No mode picker, no Lus/Open toggle — personal routes are always open.
 */
export function EditPersonalRoute({
  routeId,
  initialName,
  coordinates,
  elevation,
}: {
  routeId:     string;
  initialName: string;
  coordinates: [number, number][];
  elevation:   number;
}) {
  const t = useTranslations('routes.edit');
  const [saveError, saveAction] = useActionState(updatePersonalRoute, null);
  const [name, setName] = useState(initialName);

  return (
    <RouteEditPanel
      initialPolyline={coordinates}
      initialElevation={elevation}
      profile="racingbike"
      open
      header={
        <>
          <Link
            href={`/routes/${routeId}`}
            className="eyebrow mb-3 inline-flex items-center gap-1.5 hover:text-accent transition-colors"
          >
            ← {t('backToRoute')}
          </Link>
          <h1 className="font-heading font-black text-2xl text-ink tracking-tight leading-tight">
            {t('title')}
          </h1>
        </>
      }
      saveSlot={s => (
        <form action={saveAction} className="space-y-4 pt-1">
          <input type="hidden" name="routeId"     value={routeId} />
          <input type="hidden" name="distanceKm"  value={s.distance} />
          <input type="hidden" name="elevationM"  value={s.elevation} />
          <input type="hidden" name="coordinates" value={JSON.stringify(s.polyline)} />

          <div>
            <label className="field-label">{t('nameLabel')}</label>
            <input
              name="name"
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="field-input"
            />
          </div>

          {saveError && <p className="field-error">{saveError}</p>}

          <button type="submit" disabled={!s.canSave} className="btn-primary w-full">
            {t('save')}
          </button>
        </form>
      )}
    />
  );
}
