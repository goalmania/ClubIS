/* global self */

// Minimal CIS WebPush service worker:
// - on `push`: show notification using payload { title, body, url }
// - on click: open `url` (or fallback to /dashboard/notifiche)
self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch (e) {
    payload = {}
  }

  const title = payload.title || 'CIS'
  const options = {
    body: payload.body || '',
    data: {
      url: payload.url || '/dashboard/notifiche',
    },
    tag: payload.tag || 'cis-notification',
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event?.notification?.data?.url || '/dashboard/notifiche'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If there is already an open client, focus it.
      for (const client of clientList) {
        if (client.url && client.url.includes(url)) {
          return client.focus()
        }
      }
      // Otherwise open a new one.
      return self.clients.openWindow(url)
    })
  )
})

