'use client';

import { useTranslations } from 'next-intl';
import { removeAttendance } from '@/lib/actions/attendance';

export function RemoveAttendeeButton({
  rideId,
  slug,
  userId,
  name,
}: {
  rideId: string;
  slug:   string;
  userId: string;
  name:   string;
}) {
  const t = useTranslations('rides.detail');
  return (
    <form
      action={removeAttendance}
      onSubmit={e => {
        if (!confirm(t('removeAttendeeConfirm', { name }))) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="rideId" value={rideId} />
      <input type="hidden" name="slug"   value={slug} />
      <input type="hidden" name="userId" value={userId} />
      <button
        type="submit"
        aria-label={t('removeAttendee', { name })}
        title={t('removeAttendee', { name })}
        className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-black shrink-0 transition-colors"
        style={{
          backgroundColor: 'white',
          border:          '2px solid var(--ink)',
          boxShadow:       '2px 2px 0px var(--ink)',
          color:           'var(--ink)',
        }}
      >
        ×
      </button>
    </form>
  );
}
