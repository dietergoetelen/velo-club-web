'use server';

import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getPocketBase } from '@/lib/pocketbase';
import { setToken, clearToken } from '@/lib/session';

export async function login(_prev: string | null, form: FormData): Promise<string | null> {
  const email    = form.get('email')    as string;
  const password = form.get('password') as string;

  const t = await getTranslations('errors');

  try {
    const pb   = getPocketBase();
    const auth = await pb.collection('users').authWithPassword(email, password);
    await setToken(auth.token);
  } catch {
    return t('invalidLogin');
  }

  redirect('/dashboard');
}

export async function register(_prev: string | null, form: FormData): Promise<string | null> {
  const name            = form.get('name')            as string;
  const email           = form.get('email')           as string;
  const password        = form.get('password')        as string;
  const passwordConfirm = form.get('passwordConfirm') as string;

  const t = await getTranslations('errors');

  if (password !== passwordConfirm) return t('passwordsMismatch');

  try {
    const pb = getPocketBase();
    await pb.collection('users').create({ name, email, password, passwordConfirm });
    const auth = await pb.collection('users').authWithPassword(email, password);
    await setToken(auth.token);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    return msg.includes('email') ? t('emailExists') : t('registrationFailed');
  }

  redirect('/dashboard');
}

export async function logout() {
  await clearToken();
  redirect('/login');
}
