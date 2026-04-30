'use client';

import { useActionState } from 'react';
import { updateClub } from '@/lib/actions/clubs';
import { FormButton } from '@/components/form-button';
import { AvatarUpload } from '@/components/avatar-upload';
import type { Club } from '@/lib/types';

function getInitials(name: string) {
  return (name || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase() ?? '')
    .join('');
}

export function SettingsForm({ club, avatarUrl }: { club: Club; avatarUrl?: string }) {
  const [error, action] = useActionState(updateClub, null);

  return (
    <div className="card p-8">
      <form action={action} className="space-y-6">
        <input type="hidden" name="clubId" value={club.id} />
        <input type="hidden" name="slug"   value={club.slug} />

        {error && <p className="field-error">{error}</p>}

        <div>
          <label className="field-label">Club name</label>
          <input
            name="name" type="text" required
            defaultValue={club.name}
            className="field-input"
          />
        </div>

        <div>
          <label className="field-label">
            Description
            <span className="text-ink-soft font-normal normal-case tracking-normal ml-1.5 text-xs">(optional)</span>
          </label>
          <textarea
            name="description" rows={3}
            defaultValue={club.description}
            className="field-input resize-none"
          />
        </div>

        <AvatarUpload
          label="Club photo"
          initialUrl={avatarUrl}
          initials={getInitials(club.name)}
          accent="var(--amber)"
        />

        <FormButton label="Save changes →" loadingLabel="Saving…" />
      </form>
    </div>
  );
}
