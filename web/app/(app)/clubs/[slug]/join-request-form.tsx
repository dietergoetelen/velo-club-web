'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { requestToJoin } from '@/lib/actions/clubs';

export function JoinRequestForm({
  clubId,
  slug,
  small = false,
}: {
  clubId: string;
  slug:   string;
  /** Compact button for list rows (e.g. dashboard discover section). */
  small?: boolean;
}) {
  const t = useTranslations('clubs.join');
  const [error, action, pending] = useActionState(requestToJoin, null);

  return (
    <form action={action} className="shrink-0">
      <input type="hidden" name="clubId" value={clubId} />
      <input type="hidden" name="slug"   value={slug} />
      {error && <p className="text-xs font-bold text-pink mb-2">{error}</p>}
      <button type="submit" disabled={pending} className={small ? 'btn-primary text-sm' : 'btn-primary'}>
        {pending ? t('sending') : t('request')}
      </button>
    </form>
  );
}
