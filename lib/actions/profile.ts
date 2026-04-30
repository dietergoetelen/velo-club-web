'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getPBWithToken } from '@/lib/pocketbase';
import { getToken, getCurrentUser } from '@/lib/session';

export async function updateProfile(
  _prev: string | null,
  form: FormData,
): Promise<string | null> {
  const name         = (form.get('name') as string).trim();
  const avatar       = form.get('avatar') as File | null;
  const avatarRemove = form.get('avatar_remove') === '1';

  if (!name) return 'Name is required.';

  const token = await getToken();
  const user  = await getCurrentUser();
  if (!token || !user) redirect('/login');

  const pb = getPBWithToken(token);

  const data: Record<string, unknown> = { name };
  if (avatar && avatar.size > 0) data['avatar'] = avatar;
  else if (avatarRemove)         data['avatar'] = null;

  try {
    await pb.collection('users').update(user.id, data);
  } catch {
    return 'Failed to save changes.';
  }

  revalidatePath('/profile');
  revalidatePath('/dashboard');
  redirect('/profile');
}
