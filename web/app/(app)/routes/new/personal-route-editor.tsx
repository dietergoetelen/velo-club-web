'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { savePersonalRoute } from '@/lib/actions/personal-routes';
import { RoutePlannerShell, RouteNameInput } from '@/components/route-planner-shell';

/**
 * Personal-route planner — thin consumer of `RoutePlannerShell`. Same
 * Loop / Maak-zelf mode picker as the club planner, just without
 * date/time/schedule fields.
 */
export function PersonalRouteEditor() {
  const t = useTranslations('routes.create');
  const [saveError, saveAction] = useActionState(savePersonalRoute, null);

  return (
    <RoutePlannerShell
      modeBackLink={
        <Link
          href="/dashboard"
          className="eyebrow mb-3 inline-flex items-center gap-1.5 hover:text-accent transition-colors"
        >
          ← {t('backToDashboard')}
        </Link>
      }
      pickingSaveSlot={route => (
        <form action={saveAction} className="space-y-4 pt-1">
          <input type="hidden" name="distanceKm"  value={route.distance} />
          <input type="hidden" name="elevationM"  value={route.elevation} />
          <input type="hidden" name="coordinates" value={JSON.stringify(route.coordinates)} />

          {saveError && <p className="field-error">{saveError}</p>}

          <div>
            <label className="field-label">{t('nameLabel')}</label>
            <RouteNameInput suggestion={`${route.label} (${route.distance}km)`} />
          </div>

          <button type="submit" className="btn-primary w-full">
            {t('save')}
          </button>
        </form>
      )}
      editorSaveSlot={s => (
        <form action={saveAction} className="space-y-4 pt-1">
          <input type="hidden" name="distanceKm"  value={s.distance} />
          <input type="hidden" name="elevationM"  value={s.elevation} />
          <input type="hidden" name="coordinates" value={JSON.stringify(s.polyline)} />

          {saveError && <p className="field-error">{saveError}</p>}

          <div>
            <label className="field-label">{t('nameLabel')}</label>
            <RouteNameInput suggestion={`${s.route.label} (${s.distance}km)`} />
          </div>

          <button type="submit" disabled={!s.canSave} className="btn-primary w-full">
            {t('save')}
          </button>
        </form>
      )}
    />
  );
}
