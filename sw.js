const CACHE_NAME = 'discipline-v1';
const ASSETS = ['./'];

// ── INSTALL ──────────────────────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

// ── ACTIVATE ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

// ── FETCH (offline support) ───────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});

// ── NOTIFICATION CLICK ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('./');
    })
  );
});

// ── SCHEDULED NOTIFICATIONS via postMessage ───────────────────────────────────
// Receives { type:'SCHEDULE', schedules:[{key,hour,min,msg}] } from the page
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SCHEDULE') {
    scheduleAll(e.data.schedules);
  }
});

let timers = {};

function scheduleAll(schedules) {
  // Clear existing
  Object.values(timers).forEach(t => clearTimeout(t));
  timers = {};

  schedules.forEach(({ key, hour, min, msg }) => {
    fireNext(key, hour, min, msg);
  });
}

function fireNext(key, hour, min, msg) {
  const now = new Date();
  const target = new Date();
  target.setHours(hour, min, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  const delay = target - now;

  timers[key] = setTimeout(() => {
    self.registration.showNotification('DISCIPLINE', {
      body: msg,
      icon: './icon-192.png',
      badge: './icon-192.png',
      tag: `discipline-${key}`,
      requireInteraction: false,
      vibrate: [200, 100, 200],
      data: { key }
    });
    // Reschedule for next day
    fireNext(key, hour, min, msg);
  }, delay);
}
