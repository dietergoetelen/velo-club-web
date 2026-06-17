'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { LibraryPickerDialog } from '@/components/library-picker-dialog';
import { addBucketOption } from '@/lib/actions/buckets';
import type { LibraryEntry } from '@/lib/actions/route-library';

/** "Add a route" → the existing library picker → attach the chosen route. */
export function AddRouteToBucket({
  clubId,
  bucketId,
  slug,
}: {
  clubId:   string;
  bucketId: string;
  slug:     string;
}) {
  const t = useTranslations('buckets');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function pick(entry: LibraryEntry) {
    setBusy(true);
    const fd = new FormData();
    fd.set('bucketId', bucketId);
    fd.set('slug',     slug);
    fd.set('routeId',  entry.id);
    await addBucketOption(fd);
    setOpen(false);
    setBusy(false);
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} disabled={busy} className="btn-secondary text-sm">
        {busy ? t('adding') : t('addRoute')}
      </button>
      {open && (
        <LibraryPickerDialog clubId={clubId} onPick={pick} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
