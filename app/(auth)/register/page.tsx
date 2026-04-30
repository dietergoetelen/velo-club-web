'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { register } from '@/lib/actions/auth';
import { FormButton } from '@/components/form-button';

export default function RegisterPage() {
  const [error, action] = useActionState(register, null);
  return (
    <div className="card p-8">
      <h2 className="text-lg font-semibold text-ink mb-6">Create account</h2>
      <form action={action} className="space-y-4">
        {error && <p className="field-error">{error}</p>}
        <div>
          <label className="field-label">Name</label>
          <input name="name" type="text" required autoComplete="name"
            className="field-input" />
        </div>
        <div>
          <label className="field-label">Email</label>
          <input name="email" type="email" required autoComplete="email"
            className="field-input" />
        </div>
        <div>
          <label className="field-label">Password</label>
          <input name="password" type="password" required minLength={8}
            className="field-input" />
        </div>
        <div>
          <label className="field-label">Confirm password</label>
          <input name="passwordConfirm" type="password" required minLength={8}
            className="field-input" />
        </div>
        <FormButton label="Create account" loadingLabel="Creating…" />
      </form>
      <p className="mt-5 text-center text-sm text-ink-muted">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
