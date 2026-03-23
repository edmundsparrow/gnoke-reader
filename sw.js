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

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});
