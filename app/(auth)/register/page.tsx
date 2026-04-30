'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { register } from '@/lib/actions/auth';
import { FormButton } from '@/components/form-button';

export default function RegisterPage() {
  const [error, action] = useActionState(register, null);
  return (
    <div>
      <h2 className="text-2xl font-black tracking-tight text-ink mb-2">Create account</h2>
      <p className="text-sm text-ink-muted mb-8">Join VeloClub and start riding.</p>

      <form action={action} className="space-y-4">
        {error && <p className="field-error">{error}</p>}
        <div>
          <label className="field-label">Name</label>
          <input name="name" type="text" required autoComplete="name"
            className="field-input" placeholder="Your name" />
        </div>
        <div>
          <label className="field-label">Email</label>
          <input name="email" type="email" required autoComplete="email"
            className="field-input" placeholder="you@example.com" />
        </div>
        <div>
          <label className="field-label">Password</label>
          <input name="password" type="password" required minLength={8}
            className="field-input" placeholder="At least 8 characters" />
        </div>
        <div>
          <label className="field-label">Confirm password</label>
          <input name="passwordConfirm" type="password" required minLength={8}
            className="field-input" placeholder="••••••••" />
        </div>
        <div className="pt-1">
          <FormButton label="Create account" loadingLabel="Creating…" />
        </div>
      </form>

      <p className="mt-6 text-center text-sm text-ink-muted">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
