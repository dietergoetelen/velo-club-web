'use client';

import { useTranslations } from 'next-intl';
import { pickWinner } from '@/lib/actions/buckets';

/** Captain "Kies deze" — resolves the vote and creates the ride, so it confirms first. */
export function PickWinnerButton({
  bucketId,
  routeId,
  slug,
  routeName,
}: {
  bucketId:  string;
  routeId:   string;
  slug:      string;
  routeName: string;
}) {
  const t = useTranslations('buckets');
  return (
    <form
      action={pickWinner}
      onSubmit={e => {
        if (!confirm(t('chooseConfirm', { name: routeName }))) e.preventDefault();
      }}
    >
      <input type="hidden" name="bucketId" value={bucketId} />
      <input type="hidden" name="routeId"  value={routeId} />
      <input type="hidden" name="slug"     value={slug} />
      <button type="submit" className="text-xs font-black text-ink-soft hover:text-accent transition-colors px-2 py-1">
        ★ {t('chooseThis')}
      </button>
    </form>
  );
}
