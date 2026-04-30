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
  const name            = form.get('name')             as string;
  const email           = form.get('email')            as string;
  const password        = form.get('password')         as string;
  const passwordConfirm = form.get('passwordConfirm')  as string;

  if (password !== passwordConfirm) return 'Passwords do not match.';

  try {
    const pb = getPocketBase();
    await pb.collection('users').create({ name, email, password, passwordConfirm });
    const auth = await pb.collection('users').authWithPassword(email, password);
    await setToken(auth.token);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Registration failed.';
    return msg.includes('email') ? 'This email is already registered.' : 'Registration failed.';
  }

  redirect('/dashboard');
}

export async function registerForInvite(
  _prev: string | null,
  form: FormData,
): Promise<string | null> {
  const name            = form.get('name')            as string;
  const email           = form.get('email')           as string;
  const password        = form.get('password')        as string;
  const passwordConfirm = form.get('passwordConfirm') as string;
  const token           = form.get('inviteToken')     as string;

  if (password !== passwordConfirm) return 'Passwords do not match.';

  try {
    const pb = getPocketBase();
    await pb.collection('users').create({ name, email, password, passwordConfirm });
    const auth = await pb.collection('users').authWithPassword(email, password);
    await setToken(auth.token);

    // Accept the invitation
    const inv = await pb.collection('invitations').getFirstListItem(`token = "${token}"`);
    await pb.collection('invitations').update(inv.id, { accepted: true });
    await pb.collection('club_members').create({
      club:       inv.club,
      user:       auth.record.id,
      user_name:  name,
      user_email: email,
      role:       'member',
      points:     0,
    });

    redirect(`/dashboard`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('email')) return 'This email is already registered.';
    return 'Registration failed.';
  }
}

export async function loginForInvite(
  _prev: string | null,
  form: FormData,
): Promise<string | null> {
  const email    = form.get('email')       as string;
  const password = form.get('password')    as string;
  const token    = form.get('inviteToken') as string;

  try {
    const pb   = getPocketBase();
    const auth = await pb.collection('users').authWithPassword(email, password);
    await setToken(auth.token);

    const inv = await pb.collection('invitations').getFirstListItem(`token = "${token}"`);
    if (inv.accepted) {
      redirect('/dashboard');
    }

    // Check not already a member
    const existing = await pb.collection('club_members')
      .getList(1, 1, { filter: `club = "${inv.club}" && user = "${auth.record.id}"` });

    if (existing.totalItems === 0) {
      await pb.collection('invitations').update(inv.id, { accepted: true });
      await pb.collection('club_members').create({
        club:       inv.club,
        user:       auth.record.id,
        user_name:  auth.record['name'] as string ?? '',
        user_email: email,
        role:       'member',
        points:     0,
      });
    }
  } catch {
    return 'Invalid email or password.';
  }

  redirect('/dashboard');
}

export async function logout() {
  await clearToken();
  redirect('/login');
}
