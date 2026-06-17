'use server';

import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getPocketBase } from '@/lib/pocketbase';
import { setToken, clearToken } from '@/lib/session';
import { joinFromNextPath } from '@/lib/invites';

// Only allow same-origin relative paths as a post-auth target, so the `next`
// param (used by invite links) can't be turned into an open redirect.
function safeNext(raw: FormDataEntryValue | null): string {
  const s = typeof raw === 'string' ? raw : '';
  return s.startsWith('/') && !s.startsWith('//') ? s : '/dashboard';
}

export async function login(_prev: string | null, form: FormData): Promise<string | null> {
  const email    = form.get('email')    as string;
  const password = form.get('password') as string;

  const t = await getTranslations('errors');

  let userId: string;
  let userToken: string;
  try {
    const pb   = getPocketBase();
    const auth = await pb.collection('users').authWithPassword(email, password);
    await setToken(auth.token);
    userId    = auth.record.id;
    userToken = auth.token;
  } catch {
    return t('invalidLogin');
  }

  const next   = safeNext(form.get('next'));
  const joined = await joinFromNextPath(next, userId, userToken);
  redirect(joined ?? next);
}

export async function register(_prev: string | null, form: FormData): Promise<string | null> {
  const name            = form.get('name')            as string;
  const email           = form.get('email')           as string;
  const password        = form.get('password')        as string;
  const passwordConfirm = form.get('passwordConfirm') as string;

  const t = await getTranslations('errors');

  if (password !== passwordConfirm) return t('passwordsMismatch');

  let userId: string;
  let userToken: string;
  try {
    const pb = getPocketBase();
    await pb.collection('users').create({ name, email, password, passwordConfirm });
    const auth = await pb.collection('users').authWithPassword(email, password);
    await setToken(auth.token);
    userId    = auth.record.id;
    userToken = auth.token;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    return msg.includes('email') ? t('emailExists') : t('registrationFailed');
  }

  // Signed up via an invite link → join the club and land inside it.
  const next   = safeNext(form.get('next'));
  const joined = await joinFromNextPath(next, userId, userToken);
  redirect(joined ?? next);
}

export async function logout() {
  await clearToken();
  redirect('/login');
}
