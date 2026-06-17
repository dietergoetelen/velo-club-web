'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { login } from '@/lib/actions/auth';
import { FormButton } from '@/components/form-button';

export function LoginForm({ next }: { next: string }) {
  const t = useTranslations('auth.login');
  const [error, action] = useActionState(login, null);
  const registerHref = next ? `/register?next=${encodeURIComponent(next)}` : '/register';
  return (
    <div>
      <h1 className="font-heading font-black text-3xl text-ink mb-1 tracking-tight">
        {t('title')}
      </h1>
      <p className="text-ink-soft text-sm mb-8">
        {t('subtitle')}
      </p>

      <form action={action} className="space-y-5">
        {error && <p className="field-error">{error}</p>}
        {next && <input type="hidden" name="next" value={next} />}

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
            name="password" type="password" required autoComplete="current-password"
            className="field-input" placeholder={t('passwordPlaceholder')}
          />
        </div>

        <div className="pt-2">
          <FormButton label={t('submit')} loadingLabel={t('submitLoading')} />
        </div>
      </form>

      <p className="mt-7 text-center text-sm text-ink-soft">
        {t('noAccount')}{' '}
        <Link href={registerHref} className="font-black text-accent hover:underline">
          {t('createOne')}
        </Link>
      </p>
    </div>
  );
}
