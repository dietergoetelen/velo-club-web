'use client';

import { useActionState } from 'react';
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
  const [error, action] = useActionState(updateProfile, null);

  return (
    <div className="card p-8">
      <form action={action} className="space-y-6">
        {error && <p className="field-error">{error}</p>}

        <div>
          <label className="field-label">Name</label>
          <input
            name="name" type="text" required
            defaultValue={name}
            className="field-input"
          />
        </div>

        <div>
          <label className="field-label">Email</label>
          <input
            type="email" disabled
            defaultValue={email}
            className="field-input opacity-60 cursor-not-allowed"
          />
          <p className="text-xs text-ink-soft mt-1.5">Email can&apos;t be changed yet.</p>
        </div>

        <AvatarUpload
          label="Profile photo"
          initialUrl={avatarUrl}
          initials={getInitials(name || email)}
          accent="var(--pink)"
        />

        <FormButton label="Save changes →" loadingLabel="Saving…" />
      </form>
    </div>
  );
}
