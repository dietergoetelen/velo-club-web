import 'server-only';
import { cookies } from 'next/headers';
import PocketBase from 'pocketbase';
import { getPBWithToken } from './pocketbase';
import type { ClubMember } from './types';

const COOKIE = 'pb_auth';

export async function getToken(): Promise<string | null> {
  return (await cookies()).get(COOKIE)?.value ?? null;
}

export async function setToken(token: string) {
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   60 * 60 * 24 * 14, // 14 days
    path:     '/',
  });
}

export async function clearToken() {
  (await cookies()).delete(COOKIE);
}

export interface SessionUser {
  id:    string;
  email: string;
  name:  string;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = await getToken();
  if (!token) return null;

  try {
    // Decode JWT locally to check expiry and extract id
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload.exp || payload.exp * 1000 < Date.now()) return null;
    const userId = payload.id as string | undefined;
    if (!userId) return null;

    // Use the user's own token — no admin credentials needed
    const pb   = getPBWithToken(token);
    const user = await pb.collection('users').getOne(userId);
    return { id: user.id, email: user.email as string, name: (user['name'] as string) ?? '' };
  } catch {
    return null;
  }
}

export async function getAuthenticatedPB(): Promise<PocketBase> {
  const token = await getToken();
  if (!token) throw new Error('Not authenticated');
  return getPBWithToken(token);
}

export async function getMembership(userId: string): Promise<ClubMember | null> {
  const token = await getToken();
  if (!token) return null;
  const pb = getPBWithToken(token);
  try {
    const result = await pb.collection('club_members').getFirstListItem<ClubMember>(
      `user = "${userId}"`,
    );
    return result;
  } catch {
    return null;
  }
}
