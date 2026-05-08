'use client';

import { useTranslations } from 'next-intl';
import { deleteRide } from '@/lib/actions/rides';

export function DeleteRideButton({
  rideId,
  rideName,
  slug,
}: {
  rideId:   string;
  rideName: string;
  slug:     string;
}) {
  const t = useTranslations('rides.detail');
  return (
    <form
      action={deleteRide}
      onSubmit={e => {
        if (!confirm(t('deleteConfirm', { name: rideName }))) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="rideId" value={rideId} />
      <input type="hidden" name="slug"   value={slug} />
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
        {t('deleteRide')}
      </button>
    </form>
  );
}
