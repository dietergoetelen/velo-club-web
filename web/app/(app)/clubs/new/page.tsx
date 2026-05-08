'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { createClub } from '@/lib/actions/clubs';
import { FormButton } from '@/components/form-button';
import { AvatarUpload } from '@/components/avatar-upload';

export default function NewClubPage() {
  const t = useTranslations('clubs.create');
  const [error, action] = useActionState(createClub, null);

  return (
    <div className="max-w-lg mx-auto">

      {/* Page header with confetti shapes */}
      <div className="relative mb-10">
        {/* Shapes */}
        <div
          aria-hidden="true"
          className="absolute -top-4 right-0 w-24 h-24 rounded-full hidden sm:block"
          style={{
            backgroundColor: 'var(--amber)',
            border: '2px solid var(--ink)',
            boxShadow: '4px 4px 0px var(--ink)',
            animation: 'float 6s ease-in-out infinite',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute top-8 right-20 w-10 h-10 rounded-xl hidden sm:block"
          style={{
            backgroundColor: 'var(--mint)',
            border: '2px solid var(--ink)',
            boxShadow: '2px 2px 0px var(--ink)',
            transform: 'rotate(15deg)',
            animation: 'float-reverse 7s ease-in-out infinite 0.5s',
          }}
        />

        <div>
          <p className="eyebrow mb-2">{t('eyebrow')}</p>
          <h1 className="font-heading font-black text-4xl text-ink tracking-tight">
            {t('title')}
          </h1>
          <p className="text-ink-soft mt-2">
            {t('subtitle')}
          </p>
        </div>
      </div>

      <div className="card p-8">
        <form action={action} className="space-y-6">
          {error && <p className="field-error">{error}</p>}

          <div>
            <label className="field-label">{t('nameLabel')}</label>
            <input
              name="name" type="text" required
              placeholder={t('namePlaceholder')}
              className="field-input"
            />
          </div>

          <div>
            <label className="field-label">
              {t('descriptionLabel')}
              <span className="text-ink-soft font-normal normal-case tracking-normal ml-1.5 text-xs">{t('descriptionOptional')}</span>
            </label>
            <textarea
              name="description" rows={3}
              placeholder={t('descriptionPlaceholder')}
              className="field-input resize-none"
            />
          </div>

          <AvatarUpload label={t('photoLabel')} accent="var(--mint)" />

          <FormButton label={t('submit')} loadingLabel={t('submitLoading')} />
        </form>
      </div>
    </div>
  );
}
