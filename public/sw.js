// Service worker minimo per le notifiche push di ClubIS.
// Nessuna cache/offline: solo ricezione push e gestione click.

self.addEventListener('push', (event) => {
  if (!event.data) return
  let payload = {}
  try { payload = event.data.json() } catch { payload = { titolo: 'ClubIS', messaggio: event.data.text() } }

  const titolo = payload.titolo || payload.title || 'ClubIS'
  const opzioni = {
    body: payload.messaggio || payload.body || '',
    icon: '/clubis-logo.png',
    badge: '/clubis-logo.png',
    data: { url: payload.azione_url || payload.url || '/dashboard' },
  }

  event.waitUntil(self.registration.showNotification(titolo, opzioni))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/dashboard'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(url) && 'focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
