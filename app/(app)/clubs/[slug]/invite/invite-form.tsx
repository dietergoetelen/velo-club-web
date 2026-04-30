'use client';

import { useActionState } from 'react';
import { createInvitation } from '@/lib/actions/clubs';
import { FormButton } from '@/components/form-button';

const initial = { error: null, link: null };

export function InviteForm({ clubId }: { clubId: string }) {
  const [state, action] = useActionState(createInvitation, initial);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-4">
      <form action={action} className="space-y-4">
        <input type="hidden" name="clubId" value={clubId} />
        {state.error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{state.error}</p>
        )}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email address</label>
          <input
            name="email"
            type="email"
            required
            placeholder="rider@example.com"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <FormButton label="Generate invite link" loadingLabel="Generating…" />
      </form>

      {state.link && (
        <div className="pt-2">
          <p className="text-sm font-medium text-slate-700 mb-2">Invite link (valid 7 days)</p>
          <div className="flex gap-2 items-center">
            <input
              readOnly
              value={state.link}
              className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-600 font-mono truncate"
            />
            <CopyButton text={state.link} />
          </div>
        </div>
      )}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard.writeText(text)}
      className="shrink-0 px-3 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 transition-colors"
    >
      Copy
    </button>
  );
}
