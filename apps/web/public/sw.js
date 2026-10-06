const CACHE = 'leve-shell-v9';
const SHELL = ['/', '/theme-init.js', '/manifest.webmanifest', '/favicon.svg?v=3', '/icons/icon-192.png?v=4', '/icons/badge-96.png?v=4', '/robots.txt'];
const clientAccounts = new Map();

function safeNotificationUrl(value) {
  if (typeof value !== 'string') return '/hoje';
  try {
    const url = new URL(value, self.location.origin);
    if (url.origin !== self.location.origin) return '/hoje';
    if (/^\/hoje\/?$/.test(url.pathname) || /^\/atividade\/[A-Za-z0-9_-]+$/.test(url.pathname)) return `${url.pathname}${url.search}`;
  } catch { /* Payloads are untrusted input. */ }
  return '/hoje';
}

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') void self.skipWaiting();
  if (event.data?.type === 'LEVE_AUTH_CONTEXT' && event.source?.id) {
    if (typeof event.data.uid === 'string' && event.data.uid) clientAccounts.set(event.source.id, event.data.uid);
    else clientAccounts.delete(event.source.id);
  }
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname === '/api' || url.pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      const contentType = response.headers.get('content-type') ?? '';
      if (response.ok && contentType.includes('text/html')) { const copy = response.clone(); void caches.open(CACHE).then(cache => cache.put('/', copy)); }
      return response;
    }).catch(() => caches.match('/')));
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
  const uid = typeof data.uid === 'string' ? data.uid : null;
  if (!uid) return;
  const url = safeNotificationUrl(data.url);
  const notificationData = { uid, title: 'Lembrete do Leve', body: 'Chegou a hora de uma atividade. Toque para abrir sua agenda.', url, ...(typeof data.tag === 'string' ? { tag: data.tag } : {}) };
  event.waitUntil(Promise.all([
    self.registration.showNotification(notificationData.title, { body: notificationData.body, icon: '/icons/icon-192.png?v=4', badge: '/icons/badge-96.png?v=4', actions: [{ action: 'open-activity', title: 'Ver atividade' }], data: { url, uid }, tag: data.tag, renotify: true, silent: false, vibrate: [140, 70, 180] }),
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) if (clientAccounts.get(client.id) === uid) client.postMessage({ type: 'LEVE_REMINDER', data: notificationData });
    }),
  ]));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(safeNotificationUrl(event.notification.data?.url), self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
    const existing = clients.find(client => new URL(client.url).origin === self.location.origin);
    return existing ? existing.focus().then(() => existing.navigate(target)) : self.clients.openWindow(target);
  }));
});
