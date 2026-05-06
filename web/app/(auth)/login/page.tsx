'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { login } from '@/lib/actions/auth';
import { FormButton } from '@/components/form-button';

export default function LoginPage() {
  const [error, action] = useActionState(login, null);
  return (
    <div>
      <h1 className="font-heading font-black text-3xl text-ink mb-1 tracking-tight">
        Welcome back
      </h1>
      <p className="text-ink-soft text-sm mb-8">
        Sign in to your club dashboard.
      </p>

      <form action={action} className="space-y-5">
        {error && <p className="field-error">{error}</p>}

        <div>
          <label className="field-label">Email</label>
          <input
            name="email" type="email" required autoComplete="email"
            className="field-input" placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="field-label">Password</label>
          <input
            name="password" type="password" required autoComplete="current-password"
            className="field-input" placeholder="••••••••"
          />
        </div>

        <div className="pt-2">
          <FormButton label="Sign in →" loadingLabel="Signing in…" />
        </div>
      </form>

      <p className="mt-7 text-center text-sm text-ink-soft">
        No account?{' '}
        <Link href="/register" className="font-black text-accent hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
