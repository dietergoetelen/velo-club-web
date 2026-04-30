'use client';

import { useActionState } from 'react';
import { createClub } from '@/lib/actions/clubs';
import { FormButton } from '@/components/form-button';

export default function NewClubPage() {
  const [error, action] = useActionState(createClub, null);

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-ink tracking-tight mb-6">Create a club</h1>
      <div className="card p-8">
        <form action={action} className="space-y-4">
          {error && <p className="field-error">{error}</p>}
          <div>
            <label className="field-label">Club name</label>
            <input
              name="name" type="text" required
              placeholder="e.g. Les Cyclistes de Liège"
              className="field-input"
            />
          </div>
          <div>
            <label className="field-label">
              Description
              <span className="text-ink-faint font-normal ml-1">(optional)</span>
            </label>
            <textarea
              name="description" rows={3}
              placeholder="A short description of your club…"
              className="field-input resize-none"
            />
          </div>
          <FormButton label="Create club" loadingLabel="Creating…" />
        </form>
      </div>
    </div>
  );
}
