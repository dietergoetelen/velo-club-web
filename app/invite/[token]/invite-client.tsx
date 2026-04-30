'use client';

import { useState, useActionState } from 'react';
import { registerForInvite, loginForInvite } from '@/lib/actions/auth';
import { FormButton } from '@/components/form-button';
import type { SessionUser } from '@/lib/session';

export function InviteClient({
  inviteToken,
  email,
  loggedInUser,
}: {
  inviteToken: string;
  email: string;
  loggedInUser: SessionUser | null;
}) {
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [regError, regAction]   = useActionState(registerForInvite, null);
  const [loginError, loginAction] = useActionState(loginForInvite, null);

  // Already logged in — one-click join
  if (loggedInUser) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
        <p className="text-slate-600 mb-4">
          Signed in as <span className="font-medium">{loggedInUser.email}</span>.
        </p>
        <form action={loginAction}>
          <input type="hidden" name="email"       value={loggedInUser.email} />
          <input type="hidden" name="inviteToken" value={inviteToken} />
          {loginError && <p className="text-sm text-red-600 mb-3">{loginError}</p>}
          <FormButton label="Join club" loadingLabel="Joining…" />
        </form>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8">
      <div className="flex gap-2 mb-6">
        {(['register', 'login'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              mode === m ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}>
            {m === 'register' ? 'New account' : 'Sign in'}
          </button>
        ))}
      </div>

      {mode === 'register' ? (
        <form action={regAction} className="space-y-4">
          <input type="hidden" name="inviteToken" value={inviteToken} />
          {regError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{regError}</p>}
          <Field name="name"            label="Name"             type="text"     autoComplete="name" />
          <Field name="email"           label="Email"            type="email"    defaultValue={email} />
          <Field name="password"        label="Password"         type="password" minLength={8} />
          <Field name="passwordConfirm" label="Confirm password" type="password" minLength={8} />
          <FormButton label="Create account & join" loadingLabel="Creating…" />
        </form>
      ) : (
        <form action={loginAction} className="space-y-4">
          <input type="hidden" name="inviteToken" value={inviteToken} />
          {loginError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{loginError}</p>}
          <Field name="email"    label="Email"    type="email"    defaultValue={email} />
          <Field name="password" label="Password" type="password" />
          <FormButton label="Sign in & join" loadingLabel="Signing in…" />
        </form>
      )}
    </div>
  );
}

function Field({
  name, label, type, defaultValue, autoComplete, minLength,
}: {
  name: string; label: string; type: string;
  defaultValue?: string; autoComplete?: string; minLength?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input name={name} type={type} required
        defaultValue={defaultValue} autoComplete={autoComplete} minLength={minLength}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
    </div>
  );
}
