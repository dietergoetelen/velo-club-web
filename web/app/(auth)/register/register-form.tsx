'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { register } from '@/lib/actions/auth';
import { FormButton } from '@/components/form-button';

export function RegisterForm({ next }: { next: string }) {
  const t = useTranslations('auth.register');
  const [error, action] = useActionState(register, null);
  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : '/login';
  return (
    <div>
      <h1 className="font-heading font-black text-3xl text-ink mb-1 tracking-tight">
        {t('title')}
      </h1>
      <p className="text-ink-soft text-sm mb-8">
        {t('subtitle')}
      </p>

      <form action={action} className="space-y-4">
        {error && <p className="field-error">{error}</p>}
        {next && <input type="hidden" name="next" value={next} />}

        <div>
          <label className="field-label">{t('nameLabel')}</label>
          <input
            name="name" type="text" required autoComplete="name"
            className="field-input" placeholder={t('namePlaceholder')}
          />
        </div>

        <div>
          <label className="field-label">{t('emailLabel')}</label>
          <input
            name="email" type="email" required autoComplete="email"
            className="field-input" placeholder={t('emailPlaceholder')}
          />
        </div>

        <div>
          <label className="field-label">{t('passwordLabel')}</label>
          <input
            name="password" type="password" required minLength={8}
            className="field-input" placeholder={t('passwordPlaceholder')}
          />
        </div>

        <div>
          <label className="field-label">{t('confirmLabel')}</label>
          <input
            name="passwordConfirm" type="password" required minLength={8}
            className="field-input" placeholder={t('confirmPlaceholder')}
          />
        </div>

        <div className="pt-2">
          <FormButton label={t('submit')} loadingLabel={t('submitLoading')} />
        </div>
      </form>

      <p className="mt-7 text-center text-sm text-ink-soft">
        {t('hasAccount')}{' '}
        <Link href={loginHref} className="font-black text-accent hover:underline">
          {t('signIn')}
        </Link>
      </p>
    </div>
  );
}
