'use client';

import { useTranslations } from 'next-intl';
import { deletePersonalRoute } from '@/lib/actions/personal-routes';

export function DeletePersonalRouteButton({
  routeId,
  routeName,
}: {
  routeId:   string;
  routeName: string;
}) {
  const t = useTranslations('routes.detail');
  return (
    <form
      action={deletePersonalRoute}
      onSubmit={e => {
        if (!confirm(t('deleteConfirm', { name: routeName }))) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="routeId" value={routeId} />
      <button
        type="submit"
        className="w-full text-sm font-bold px-4 py-2.5 rounded-lg transition-colors"
        style={{
          backgroundColor: 'white',
          border:          '2px solid var(--ink)',
          boxShadow:       '3px 3px 0px var(--ink)',
          color:           'var(--ink)',
        }}
      >
        {t('delete')}
      </button>
    </form>
  );
}
