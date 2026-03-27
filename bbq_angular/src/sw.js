self.addEventListener('push', function (event) {
  let data = { title: 'BBQ GRILL 🔥', body: '', icon: '/favicon.ico', data: {} }
  try { data = event.data.json() } catch (_) {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      data: data.data,
      badge: '/favicon.ico',
      vibrate: [200, 100, 200]
    })
  )
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  const queueId = event.notification.data?.queue_id
  const url = queueId ? `/#/queue-status/${queueId}` : '/'
  event.waitUntil(clients.openWindow(url))
})
