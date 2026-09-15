const CACHE = 'leve-shell-v4';
const SHELL = ['/', '/manifest.webmanifest', '/favicon.svg'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') void self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => { const copy = response.clone(); void caches.open(CACHE).then(cache => cache.put('/', copy)); return response; }).catch(() => caches.match('/')));
    return;
  }
  event.respondWith(caches.match(request).then(cached => cached ?? fetch(request).then(response => {
    if (response.ok && ['script', 'style', 'font', 'image'].includes(request.destination)) { const copy = response.clone(); void caches.open(CACHE).then(cache => cache.put(request, copy)); }
    return response;
  })));
});

self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data?.json() ?? {}; } catch { /* Usa a mensagem segura abaixo. */ }
  const data = payload.data ?? payload.notification ?? payload;
  event.waitUntil(Promise.all([
    self.registration.showNotification(data.title ?? 'Leve', { body: data.body ?? 'Você tem um lembrete.', icon: '/favicon.svg', data: { url: data.url ?? '/hoje' }, tag: data.tag }),
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) client.postMessage({ type: 'LEVE_REMINDER', data });
    }),
  ]));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url ?? '/hoje', self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
    const existing = clients.find(client => new URL(client.url).origin === self.location.origin);
    return existing ? existing.focus().then(() => existing.navigate(target)) : self.clients.openWindow(target);
  }));
});
