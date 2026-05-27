'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { savePushSubscription, deletePushSubscription } from '@/lib/actions/push';

type PushState =
  | 'unsupported'      // browser doesn't support Push API
  | 'denied'           // user blocked notifications at the OS / browser level
  | 'subscribed'       // active subscription in this browser
  | 'unsubscribed';    // permission not yet asked, or user opted out

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

/**
 * Compact panel that lets the user opt in / out of Web Push notifications.
 *
 *   - Renders nothing on the server (the entire feature lives client-side).
 *   - Skips the UI entirely on unsupported browsers — no noise.
 *   - When permission was denied, shows a one-line hint instead of a button
 *     that wouldn't do anything (re-prompting after denial is locked by the
 *     browser; user has to flip a site setting manually).
 *
 * `hideWhenSubscribed` makes the component vanish once the user has opted
 * in — used on the dashboard as a first-time prompt that disappears after
 * acceptance. The profile page renders without that flag so the user can
 * always manage their subscription.
 */
export function PushNotificationsToggle({
  hideWhenSubscribed = false,
}: {
  hideWhenSubscribed?: boolean;
} = {}) {
  const t = useTranslations('push');
  const [state, setState] = useState<PushState | 'loading'>('loading');
  const [busy,  setBusy]  = useState(false);

  // Initial probe — what's the current subscription state?
  useEffect(() => {
    void (async () => {
      if (typeof window === 'undefined') return;
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setState('unsupported');
        return;
      }
      if (Notification.permission === 'denied') {
        setState('denied');
        return;
      }
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        const sub = await reg.pushManager.getSubscription();
        setState(sub ? 'subscribed' : 'unsubscribed');
      } catch (err) {
        console.error('[push] sw registration failed', err);
        setState('unsupported');
      }
    })();
  }, []);

  async function subscribe() {
    if (busy) return;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'unsubscribed');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        // Cast: PushSubscriptionOptionsInit demands `BufferSource` with an
        // `ArrayBuffer` backing in newer TS lib defs; our Uint8Array is
        // `ArrayBufferLike`. At runtime they're identical.
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY) as BufferSource,
      });
      const json = sub.toJSON();
      const p256dh = json.keys?.p256dh;
      const auth   = json.keys?.auth;
      if (!json.endpoint || !p256dh || !auth) {
        throw new Error('Subscription missing keys');
      }
      const result = await savePushSubscription({
        endpoint: json.endpoint,
        p256dh,
        auth,
      });
      if (!result.ok) {
        await sub.unsubscribe().catch(() => null);
        setState('unsubscribed');
        return;
      }
      setState('subscribed');
    } catch (err) {
      console.error('[push] subscribe failed', err);
      setState('unsubscribed');
    } finally {
      setBusy(false);
    }
  }

  async function unsubscribe() {
    if (busy) return;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await deletePushSubscription(sub.endpoint).catch(() => null);
        await sub.unsubscribe();
      }
      setState('unsubscribed');
    } catch (err) {
      console.error('[push] unsubscribe failed', err);
    } finally {
      setBusy(false);
    }
  }

  if (state === 'loading' || state === 'unsupported') return null;
  if (hideWhenSubscribed && state === 'subscribed') return null;

  return (
    <div
      className="card p-4 flex items-center gap-4"
      style={{ backgroundColor: 'var(--paper)' }}
    >
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center text-2xl shrink-0"
        style={{
          backgroundColor: state === 'subscribed' ? 'var(--amber)' : 'var(--pink)',
          border:          '2px solid var(--ink)',
          boxShadow:       '3px 3px 0px var(--ink)',
        }}
        aria-hidden
      >
        🔔
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-heading font-bold text-ink text-sm leading-tight">
          {state === 'subscribed' ? t('onTitle') : t('offTitle')}
        </p>
        <p className="text-xs text-ink-soft mt-0.5">
          {state === 'subscribed' ? t('onHint')
           : state === 'denied'   ? t('deniedHint')
                                  : t('offHint')}
        </p>
      </div>
      {state === 'subscribed' && (
        <button
          type="button"
          onClick={unsubscribe}
          disabled={busy}
          className="btn-secondary text-xs px-3 shrink-0"
        >
          {busy ? t('working') : t('turnOff')}
        </button>
      )}
      {state === 'unsubscribed' && (
        <button
          type="button"
          onClick={subscribe}
          disabled={busy}
          className="btn-primary text-xs px-3 shrink-0"
        >
          {busy ? t('working') : t('turnOn')}
        </button>
      )}
    </div>
  );
}

// VAPID public keys are base64url-encoded; PushManager.subscribe wants a
// Uint8Array, so we decode here.
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding  = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64      = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw      = atob(b64);
  const out      = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}
