'use server';

import { getToken, getCurrentUser } from '@/lib/session';
import { getPBWithToken } from '@/lib/pocketbase';
import type { PushSubscriptionRecord } from '@/lib/types';

export interface PushSubscribePayload {
  endpoint: string;
  p256dh:   string;
  auth:     string;
}

/**
 * Persist a Web Push subscription for the current user. Idempotent: if a row
 * already exists for this endpoint, it's left alone (endpoint has a UNIQUE
 * index so a re-subscribe with the same browser is a no-op).
 */
export async function savePushSubscription(payload: PushSubscribePayload): Promise<{ ok: boolean }> {
  const token = await getToken();
  const user  = await getCurrentUser();
  if (!token || !user) return { ok: false };

  const pb = getPBWithToken(token);

  const existing = await pb.collection('push_subscriptions')
    .getFirstListItem<PushSubscriptionRecord>(`endpoint = "${payload.endpoint}"`)
    .catch(() => null);
  if (existing) return { ok: true };

  try {
    await pb.collection('push_subscriptions').create({
      user:     user.id,
      endpoint: payload.endpoint,
      p256dh:   payload.p256dh,
      auth:     payload.auth,
    });
    return { ok: true };
  } catch (err) {
    console.error('[savePushSubscription]', err);
    return { ok: false };
  }
}

/**
 * Remove a Web Push subscription by endpoint. Used when the user explicitly
 * opts out from the dashboard; the service worker hasn't necessarily been
 * unregistered, so the call is purely about pruning the PB row.
 */
export async function deletePushSubscription(endpoint: string): Promise<{ ok: boolean }> {
  const token = await getToken();
  const user  = await getCurrentUser();
  if (!token || !user) return { ok: false };

  const pb = getPBWithToken(token);

  const row = await pb.collection('push_subscriptions')
    .getFirstListItem<PushSubscriptionRecord>(`endpoint = "${endpoint}" && user = "${user.id}"`)
    .catch(() => null);
  if (!row) return { ok: true };  // already gone

  try {
    await pb.collection('push_subscriptions').delete(row.id);
    return { ok: true };
  } catch (err) {
    console.error('[deletePushSubscription]', err);
    return { ok: false };
  }
}
