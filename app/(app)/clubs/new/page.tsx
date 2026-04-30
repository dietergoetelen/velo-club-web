'use client';

import { useActionState } from 'react';
import { createClub } from '@/lib/actions/clubs';
import { FormButton } from '@/components/form-button';

export default function NewClubPage() {
  const [error, action] = useActionState(createClub, null);

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Create a club</h1>
      <div className="bg-white rounded-2xl border border-slate-200 p-8">
        <form action={action} className="space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Club name</label>
            <input
              name="name"
              type="text"
              required
              placeholder="e.g. Les Cyclistes de Liège"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              name="description"
              rows={3}
              placeholder="A short description of your club…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>
          <FormButton label="Create club" loadingLabel="Creating…" />
        </form>
      </div>
    </div>
  );
}
