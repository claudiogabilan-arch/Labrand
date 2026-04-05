// Service Worker for LaBrand Push Notifications
/* eslint-disable no-restricted-globals */

self.addEventListener('push', function(event) {
  if (!event.data) return;

  const data = event.data.json();
  const title = data.title || 'LaBrand';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-skull-black.png',
    badge: '/icon-skull-black.png',
    tag: data.tag || 'labrand',
    data: { url: data.url || '/' },
    vibrate: [100, 50, 100],
    actions: data.url ? [{ action: 'open', title: 'Abrir' }] : [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
