// Elios Wholesale — Service Worker for Web Push Notifications
// This file is served at /sw.js and registered by the frontend.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// ── Handle incoming push messages ─────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'Elios Wholesale', body: event.data.text(), url: '/', icon: '/favicon.ico' };
  }

  const title   = data.title   || 'Elios Wholesale';
  const options = {
    body:             data.body    || '',
    icon:             data.icon    || '/favicon.ico',
    badge:            data.badge   || '/favicon.ico',
    data:             { url: data.url || '/' },
    vibrate:          [200, 100, 200],
    requireInteraction: false,
    tag:              data.url || 'elios-notif',   // replaces same-URL notifs instead of stacking
    renotify:         true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Handle notification click — open / focus the target page ──────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // If there is already a window open on the target URL, focus it
        for (const client of windowClients) {
          if (client.url.includes(targetUrl) && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open a new tab
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
