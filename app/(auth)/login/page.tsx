'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { login } from '@/lib/actions/auth';
import { FormButton } from '@/components/form-button';

export default function LoginPage() {
  const [error, action] = useActionState(login, null);
  return (
    <div className="card p-8">
      <h2 className="text-lg font-semibold text-ink mb-6">Sign in</h2>
      <form action={action} className="space-y-4">
        {error && <p className="field-error">{error}</p>}
        <div>
          <label className="field-label">Email</label>
          <input name="email" type="email" required autoComplete="email"
            className="field-input" />
        </div>
        <div>
          <label className="field-label">Password</label>
          <input name="password" type="password" required autoComplete="current-password"
            className="field-input" />
        </div>
        <FormButton label="Sign in" loadingLabel="Signing in…" />
      </form>
      <p className="mt-5 text-center text-sm text-ink-muted">
        No account?{' '}
        <Link href="/register" className="font-medium text-brand hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
