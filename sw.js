const CACHE_NAME = 'discipline-v3';
const ASSETS = ['./', './index.html', './finance.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) { if (c.url && 'focus' in c) return c.focus(); }
      if (clients.openWindow) return clients.openWindow('./');
    })
  );
});

// ── TIMER STORE ───────────────────────────────────────────────────────────────
let timers = {};

function notify(tag, body) {
  return self.registration.showNotification('DISCIPLINE', {
    body,
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag,
    requireInteraction: false,
    vibrate: [200, 100, 200],
  });
}

function msUntil(hour, min) {
  const now = new Date();
  const t = new Date();
  t.setHours(hour, min, 0, 0);
  if (t <= now) t.setDate(t.getDate() + 1);
  return t - now;
}

// ── MESSAGE HANDLER ───────────────────────────────────────────────────────────
self.addEventListener('message', e => {
  const data = e.data;
  if (!data) return;

  // Daily repeating reminders
  if (data.type === 'SCHEDULE') {
    Object.values(timers).forEach(clearTimeout);
    timers = {};
    data.schedules.forEach(({ key, hour, min, msg }) => fireDaily(key, hour, min, msg));
  }

  // One-time high-risk day notifications (today only)
  if (data.type === 'SCHEDULE_ONCE') {
    data.schedules.forEach(({ key, hour, min, msg }) => {
      if (timers[key]) clearTimeout(timers[key]);
      const delay = msUntil(hour, min);
      timers[key] = setTimeout(() => notify(key, msg), delay);
    });
  }

  // Streak guard — fires once at 8PM if streak > 0
  if (data.type === 'STREAK_GUARD') {
    const { streak, hour, min, msg } = data;
    if (timers['streak_guard']) clearTimeout(timers['streak_guard']);
    const delay = msUntil(hour, min);
    timers['streak_guard'] = setTimeout(() => notify('streak_guard', msg), delay);
  }
});

function fireDaily(key, hour, min, msg) {
  if (timers[key]) clearTimeout(timers[key]);
  const delay = msUntil(hour, min);
  timers[key] = setTimeout(() => {
    notify(key, msg);
    fireDaily(key, hour, min, msg); // reschedule next day
  }, delay);
}
