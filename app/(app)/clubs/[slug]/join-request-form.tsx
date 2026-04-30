'use client';

import { useActionState } from 'react';
import { requestToJoin } from '@/lib/actions/clubs';

export function JoinRequestForm({ clubId, slug }: { clubId: string; slug: string }) {
  const [error, action, pending] = useActionState(requestToJoin, null);

  return (
    <form action={action} className="shrink-0">
      <input type="hidden" name="clubId" value={clubId} />
      <input type="hidden" name="slug"   value={slug} />
      {error && <p className="text-xs text-danger mb-2">{error}</p>}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? 'Sending…' : 'Request to join'}
      </button>
    </form>
  );
}
