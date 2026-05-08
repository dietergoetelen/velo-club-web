'use client';

import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';

export function FormButton({
  label,
  loadingLabel,
}: {
  label: string;
  loadingLabel?: string;
}) {
  const t = useTranslations('common');
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
      {pending ? (loadingLabel ?? t('loading')) : label}
    </button>
  );
}
