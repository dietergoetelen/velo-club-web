'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { login } from '@/lib/actions/auth';
import { FormButton } from '@/components/form-button';

export default function LoginPage() {
  const [error, action] = useActionState(login, null);
  return (
    <div>
      <h2 className="text-2xl font-black tracking-tight text-ink mb-2">Sign in</h2>
      <p className="text-sm text-ink-muted mb-8">Welcome back. Let's ride.</p>

      <form action={action} className="space-y-4">
        {error && <p className="field-error">{error}</p>}
        <div>
          <label className="field-label">Email</label>
          <input name="email" type="email" required autoComplete="email"
            className="field-input" placeholder="you@example.com" />
        </div>
        <div>
          <label className="field-label">Password</label>
          <input name="password" type="password" required autoComplete="current-password"
            className="field-input" placeholder="••••••••" />
        </div>
        <div className="pt-1">
          <FormButton label="Sign in" loadingLabel="Signing in…" />
        </div>
      </form>

      <p className="mt-6 text-center text-sm text-ink-muted">
        No account?{' '}
        <Link href="/register" className="font-semibold text-brand hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
