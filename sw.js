/**
 * sw.js — Gnoke Reader
 * Offline-first service worker. Bump CACHE_NAME on every deploy.
 */

const CACHE_NAME = 'gnoke-reader-v2';

const ASSETS = [
  './',
  './index.html',
  './main/',
  './main/index.html',
  './style.css',
  './reader.css',
  './global.png',
  './manifest.json',
  './js/state.js',
  './js/theme.js',
  './js/ui.js',
  './js/reader-core.js',
  './js/readers/txt.js',
  './js/readers/log.js',
  './js/readers/md.js',
  './js/readers/json.js',
  './js/readers/csv.js',
  './js/readers/pdf.js',
  './js/readers/docx.js',
  './js/readers/ini.js',
  './js/readers/env.js',
  './js/readers/diff.js',
  './js/readers/sql.js',
  './js/app.js',
];

/* ── Install: cache all assets ── */
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

/* ── Activate: clear old caches + claim all clients immediately ── */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all([
        /* delete stale caches */
        ...keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k)),
        /* take control of all open tabs immediately, no reload needed */
        clients.claim()
      ])
    )
  );
});

/* ── Fetch: cache-first, with offline fallback to cache on network error ── */
self.addEventListener('fetch', e => {
  /* skip non-GET and cross-origin requests that aren't in ASSETS */
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;

      return fetch(e.request)
        .then(res => {
          /* cache any new successful responses dynamically */
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => {
          /* network failed and nothing in cache — return offline fallback */
          return caches.match('./index.html');
        });
    })
  );
});

            
