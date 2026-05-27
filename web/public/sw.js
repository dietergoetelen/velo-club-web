/**
 * Service worker for Web Push notifications.
 *
 * Handles two events:
 *   - `push`              — show the notification when the server sends one.
 *   - `notificationclick` — focus an existing tab or open the target URL.
 *
 * The server payload (signed via VAPID + encrypted by web-push) is plain
 * JSON: { title, body, url?, tag? }.
 */

self.addEventListener('push', function (event) {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    // Fall back to raw text — keeps notifications working even if the server
    // sends a non-JSON payload by mistake.
    payload = { title: 'Zoesh', body: event.data.text() };
  }

  const title = payload.title || 'Zoesh';
  const body  = payload.body  || '';
  const url   = payload.url   || '/dashboard';
  const tag   = payload.tag   || undefined;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon:  '/icon-192.png',  // optional; falls back to browser default if missing
      badge: '/badge-72.png',
      tag,                      // same tag replaces an earlier notification
      data:  { url },
      vibrate: [120, 60, 120],
    })
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      // If a tab is already open on this origin, focus and navigate it.
      for (const client of allClients) {
        if ('focus' in client) {
          await client.focus();
          if ('navigate' in client) await client.navigate(targetUrl);
          return;
        }
      }

      // Otherwise, open a fresh tab.
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })()
  );
});
