'use client';

import { useFormStatus } from 'react-dom';

export function FormButton({ label, loadingLabel = 'Loading…' }: { label: string; loadingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
    >
      {pending ? loadingLabel : label}
    </button>
  );
}
