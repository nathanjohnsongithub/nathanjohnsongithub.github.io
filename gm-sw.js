self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { self.clients.claim(); });
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch {}
  const title = data.title || 'Good Morning 💛';
  const body = data.body || 'Have a wonderful day!';
  const options = { body, icon: '/images/5k.jpg', badge: '/images/5k.jpg' };
  event.waitUntil(self.registration.showNotification(title, options));
});
