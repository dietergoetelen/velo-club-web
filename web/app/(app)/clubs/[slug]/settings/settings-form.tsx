'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { updateClub } from '@/lib/actions/clubs';
import { FormButton } from '@/components/form-button';
import { AvatarUpload } from '@/components/avatar-upload';
import { MarkdownEditor } from '@/components/markdown-editor';
import { StartLocationPicker } from './start-location-picker';
import type { Club } from '@/lib/types';

function getInitials(name: string) {
  return (name || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase() ?? '')
    .join('');
}

export function SettingsForm({ club, avatarUrl }: { club: Club; avatarUrl?: string }) {
  const t = useTranslations('clubs.settings');
  const [error, action] = useActionState(updateClub, null);

  return (
    <div className="card p-8">
      <form action={action} className="space-y-6">
        <input type="hidden" name="clubId" value={club.id} />
        <input type="hidden" name="slug"   value={club.slug} />

        {error && <p className="field-error">{error}</p>}

        <div>
          <label className="field-label">{t('nameLabel')}</label>
          <input
            name="name" type="text" required
            defaultValue={club.name}
            className="field-input"
          />
        </div>

        <div>
          <label className="field-label">
            {t('aboutLabel')}
            <span className="text-ink-soft font-normal normal-case tracking-normal ml-1.5 text-xs">{t('aboutOptional')}</span>
          </label>
          <p className="text-xs text-ink-soft mb-2 -mt-1">
            {t('aboutHint')}
          </p>
          <MarkdownEditor
            name="description"
            defaultValue={club.description}
            rows={10}
            placeholder={t('aboutPlaceholder')}
          />
        </div>

        <AvatarUpload
          label={t('photoLabel')}
          initialUrl={avatarUrl}
          initials={getInitials(club.name)}
          accent="var(--amber)"
        />

        <StartLocationPicker
          initialLat={club.start_lat}
          initialLng={club.start_lng}
        />

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="schedules_enabled"
            value="1"
            defaultChecked={club.schedules_enabled}
            className="mt-1 w-4 h-4 accent-current"
            style={{ accentColor: 'var(--accent)' }}
          />
          <span>
            <span className="field-label !mb-0 block">{t('schedulesLabel')}</span>
            <span className="text-xs text-ink-soft block mt-0.5">
              {t('schedulesHint')}
            </span>
          </span>
        </label>

        <FormButton label={t('submit')} loadingLabel={t('submitLoading')} />
      </form>
    </div>
  );
}
