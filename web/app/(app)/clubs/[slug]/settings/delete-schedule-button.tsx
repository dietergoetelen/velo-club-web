'use client';

import { useTranslations } from 'next-intl';
import { deleteSchedule } from '@/lib/actions/schedules';

export function DeleteScheduleButton({
  scheduleId,
  clubId,
  slug,
  label,
}: {
  scheduleId: string;
  clubId:     string;
  slug:       string;
  label:      string;
}) {
  const t = useTranslations('clubs.schedules');
  return (
    <form
      action={deleteSchedule}
      onSubmit={e => {
        if (!confirm(t('deleteConfirm', { label }))) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="scheduleId" value={scheduleId} />
      <input type="hidden" name="clubId"     value={clubId} />
      <input type="hidden" name="slug"       value={slug} />
      <button
        type="submit"
        className="text-xs text-ink-soft hover:text-ink transition-colors font-black"
        aria-label={t('deleteAria', { label })}
      >
        ✕
      </button>
    </form>
  );
}
