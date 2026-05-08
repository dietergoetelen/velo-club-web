'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { updateProfile } from '@/lib/actions/profile';
import { FormButton } from '@/components/form-button';
import { AvatarUpload } from '@/components/avatar-upload';

function getInitials(nameOrEmail: string) {
  return (nameOrEmail || '?')
    .split(/[\s@.]+/)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase() ?? '')
    .join('');
}

export function ProfileForm({
  name,
  email,
  avatarUrl,
}: {
  name:       string;
  email:      string;
  avatarUrl?: string;
}) {
  const t = useTranslations('profile');
  const [error, action] = useActionState(updateProfile, null);

  return (
    <div className="card p-8">
      <form action={action} className="space-y-6">
        {error && <p className="field-error">{error}</p>}

        <div>
          <label className="field-label">{t('nameLabel')}</label>
          <input
            type="text" disabled
            defaultValue={name}
            className="field-input opacity-60 cursor-not-allowed"
          />
          <p className="text-xs text-ink-soft mt-1.5">{t('nameHint')}</p>
        </div>

        <div>
          <label className="field-label">{t('emailLabel')}</label>
          <input
            type="email" disabled
            defaultValue={email}
            className="field-input opacity-60 cursor-not-allowed"
          />
          <p className="text-xs text-ink-soft mt-1.5">{t('emailHint')}</p>
        </div>

        <AvatarUpload
          label={t('photoLabel')}
          initialUrl={avatarUrl}
          initials={getInitials(name || email)}
          accent="var(--pink)"
        />

        <FormButton label={t('submit')} loadingLabel={t('submitLoading')} />
      </form>
    </div>
  );
}
