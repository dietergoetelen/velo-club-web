'use client';

import { useFormStatus } from 'react-dom';

export function FormButton({
  label,
  loadingLabel = 'Loading…',
}: {
  label: string;
  loadingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
      {pending ? loadingLabel : label}
    </button>
  );
}
