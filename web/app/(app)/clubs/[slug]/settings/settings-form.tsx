'use client';

import { useActionState } from 'react';
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
            About this club
            <span className="text-ink-soft font-normal normal-case tracking-normal ml-1.5 text-xs">(optional)</span>
          </label>
          <p className="text-xs text-ink-soft mb-2 -mt-1">
            Welcome new members, set expectations, share what makes your club tick.
          </p>
          <MarkdownEditor
            name="description"
            defaultValue={club.description}
            rows={10}
            placeholder="Tell people about your club — pace, vibe, where you ride…"
          />
        </div>

        <AvatarUpload
          label="Club photo"
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
            <span className="field-label !mb-0 block">Recurring schedules</span>
            <span className="text-xs text-ink-soft block mt-0.5">
              Define weekly ride slots (e.g. A/B/C groups). Captains can pick one when planning a ride.
            </span>
          </span>
        </label>

        <FormButton label="Save changes →" loadingLabel="Saving…" />
      </form>
    </div>
  );
}
