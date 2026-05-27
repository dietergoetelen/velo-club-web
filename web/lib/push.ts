/**
 * Web Push server helpers. Encapsulates the `web-push` library so the rest
 * of the codebase only sees fire-and-forget `sendPushToUsers(...)`.
 */

import 'server-only';
import webpush from 'web-push';
import { getAdminPocketBase } from '@/lib/pocketbase';
import type { PushSubscriptionRecord } from '@/lib/types';

const PUBLIC_KEY  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY            ?? '';
const SUBJECT     = process.env.VAPID_SUBJECT                ?? 'mailto:admin@zoesh.app';

let configured = false;
function ensureConfigured() {
  if (configured) return;
  if (!PUBLIC_KEY || !PRIVATE_KEY) {
    throw new Error('VAPID keys missing — set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.');
  }
  webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
  configured = true;
}

export interface PushPayload {
  title: string;
  body:  string;
  /** Click target — relative URL within the app. */
  url?:  string;
  /** Tag collapses repeat notifications (e.g. ride updates). */
  tag?:  string;
}

/**
 * Send a push payload to every active subscription owned by any of the given
 * user ids. Failures are logged but don't propagate — the calling action
 * shouldn't fail because one user's device is unreachable. Dead endpoints
 * (410 Gone / 404 Not Found) are pruned from PB on the fly.
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload,
): Promise<void> {
  if (userIds.length === 0) return;
  try {
    ensureConfigured();
  } catch (err) {
    console.error('[push]', err);
    return;
  }

  // Admin PB because the sender doesn't own the subscriptions of the
  // recipients (typically: captain saves a ride, push goes to all members).
  const pb = await getAdminPocketBase().catch(err => {
    console.error('[push] admin PB unavailable', err);
    return null;
  });
  if (!pb) return;

  const filter = userIds.map(id => `user = "${id}"`).join(' || ');
  const subs = await pb.collection('push_subscriptions')
    .getFullList<PushSubscriptionRecord>({ filter })
    .catch(err => {
      console.error('[push] subscription lookup failed', err);
      return [] as PushSubscriptionRecord[];
    });

  if (subs.length === 0) return;

  const body = JSON.stringify(payload);
  await Promise.all(subs.map(async sub => {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        body,
      );
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        // Endpoint is permanently gone (user uninstalled the PWA, cleared
        // browser data, etc.). Drop the row so we don't keep retrying.
        await pb.collection('push_subscriptions').delete(sub.id).catch(() => null);
      } else {
        console.error(`[push] send failed (status ${status})`, err);
      }
    }
  }));
}
