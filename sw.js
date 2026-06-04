self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

let cfg = null;
let timer = null;

// Receive settings from main page
self.addEventListener('message', e => {
  if (e.data?.type !== 'NOTIF_SETTINGS') return;
  cfg = e.data.settings;
  clearInterval(timer);
  if (cfg?.enabled) {
    checkAndNotify();                          // check immediately
    timer = setInterval(checkAndNotify, 60000); // then every minute
  }
});

async function checkAndNotify() {
  if (!cfg?.enabled) return;

  const now = new Date();
  const [h, m] = (cfg.time || '20:00').split(':').map(Number);
  const startMin = h * 60 + m;
  const nowMin   = now.getHours() * 60 + now.getMinutes();

  if (nowMin < startMin) return;          // before reminder time
  if (cfg.diaryFilledToday) return;       // diary already filled

  const since = Date.now() - (cfg.lastNotifiedAt || 0);
  if (cfg.lastNotifiedAt && since < 15 * 60 * 1000) return; // < 15 min ago

  cfg.lastNotifiedAt = Date.now();

  // Tell main page to persist the timestamp
  const list = await self.clients.matchAll({ includeUncontrolled: true });
  list.forEach(c => c.postMessage({ type: 'NOTIF_FIRED', ts: cfg.lastNotifiedAt }));

  await self.registration.showNotification('🏆 Life Grind Tracker', {
    body: 'Uzupełnij dziennik na dziś! 📅  (powtarzam co 15 min)',
    tag: 'daily-reminder',
    renotify: true,
    icon: '/icon.png',
  });
}

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      for (const c of list) if ('focus' in c) return c.focus();
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});
