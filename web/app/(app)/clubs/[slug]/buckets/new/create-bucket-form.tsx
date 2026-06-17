'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { createBucket } from '@/lib/actions/buckets';
import { FormButton } from '@/components/form-button';

export function CreateBucketForm({ clubId, slug }: { clubId: string; slug: string }) {
  const t = useTranslations('buckets');
  const [error, action] = useActionState(createBucket, null);

  return (
    <div className="max-w-md space-y-6">
      <div>
        <Link href={`/clubs/${slug}`} className="eyebrow mb-3 inline-flex items-center gap-1.5 hover:text-accent transition-colors">
          ← {t('back')}
        </Link>
        <h1 className="font-heading font-black text-3xl text-ink tracking-tight">{t('createTitle')}</h1>
        <p className="text-ink-soft text-sm mt-1">{t('createSubtitle')}</p>
      </div>

      <form action={action} className="space-y-5">
        {error && <p className="field-error">{error}</p>}
        <input type="hidden" name="clubId" value={clubId} />
        <input type="hidden" name="slug"   value={slug} />

        <div>
          <label className="field-label">{t('rideDateLabel')}</label>
          <div className="flex gap-3">
            <input name="rideDate" type="date" required className="field-input flex-1" />
            <input name="rideTime" type="time" required defaultValue="09:00" className="field-input w-32" />
          </div>
        </div>

        <div>
          <label className="field-label">{t('closesLabel')}</label>
          <div className="flex gap-3">
            <input name="closesDate" type="date" required className="field-input flex-1" />
            <input name="closesTime" type="time" required defaultValue="18:00" className="field-input w-32" />
          </div>
          <p className="text-xs text-ink-soft mt-1.5">{t('closesHint')}</p>
        </div>

        <FormButton label={t('createSubmit')} loadingLabel={t('creating')} />
      </form>
    </div>
  );
}
