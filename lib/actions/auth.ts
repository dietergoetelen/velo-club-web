'use server';

import { redirect } from 'next/navigation';
import { getPocketBase } from '@/lib/pocketbase';
import { setToken, clearToken } from '@/lib/session';

export async function login(_prev: string | null, form: FormData): Promise<string | null> {
  const email    = form.get('email')    as string;
  const password = form.get('password') as string;

  try {
    const pb   = getPocketBase();
    const auth = await pb.collection('users').authWithPassword(email, password);
    await setToken(auth.token);
  } catch {
    return 'Invalid email or password.';
  }

  redirect('/dashboard');
}

export async function register(_prev: string | null, form: FormData): Promise<string | null> {
  const name            = form.get('name')            as string;
  const email           = form.get('email')           as string;
  const password        = form.get('password')        as string;
  const passwordConfirm = form.get('passwordConfirm') as string;

  if (password !== passwordConfirm) return 'Passwords do not match.';

  try {
    const pb = getPocketBase();
    await pb.collection('users').create({ name, email, password, passwordConfirm });
    const auth = await pb.collection('users').authWithPassword(email, password);
    await setToken(auth.token);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    return msg.includes('email') ? 'This email is already registered.' : 'Registration failed.';
  }

  redirect('/dashboard');
}

export async function logout() {
  await clearToken();
  redirect('/login');
}
