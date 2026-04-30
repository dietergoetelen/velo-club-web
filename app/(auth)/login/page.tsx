'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { login } from '@/lib/actions/auth';
import { FormButton } from '@/components/form-button';

export default function LoginPage() {
  const [error, action] = useActionState(login, null);
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
      <h2 className="text-lg font-semibold text-slate-900 mb-6">Sign in</h2>
      <form action={action} className="space-y-4">
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input name="email" type="email" required autoComplete="email"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
          <input name="password" type="password" required autoComplete="current-password"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <FormButton label="Sign in" loadingLabel="Signing in…" />
      </form>
      <p className="mt-4 text-center text-sm text-slate-500">
        No account?{' '}
        <Link href="/register" className="font-medium text-emerald-600 hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
