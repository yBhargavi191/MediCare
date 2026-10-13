/* This file must remain in the deployed site root for Firebase web push. */
importScripts('js/vendor/firebase-app-compat.js');
importScripts('js/vendor/firebase-messaging-compat.js');
firebase.initializeApp({ apiKey: 'AIzaSyBwThXLnL4RkJ58kGuoMy8j_RD3tGeB3VM', authDomain: 'verimed-6b92d.firebaseapp.com', projectId: 'verimed-6b92d', storageBucket: 'verimed-6b92d.firebasestorage.app', messagingSenderId: '614701180122', appId: '1:614701180122:web:16f402b66d2ed60abff1e3' });
const messaging = firebase.messaging();
messaging.onBackgroundMessage(payload => {
  const data = payload.data || {};
  self.registration.showNotification(payload.notification?.title || 'MediCare', {
    body: payload.notification?.body || 'You have a new medication alert.',
    data: data
  });
});

const PWA_CACHE = 'medicare-pwa-v4';
const PWA_SHELL = [
  './', 'index.html', 'patient-dashboard.html', 'verify.html', 'patient-details.html',
  'css/style.css', 'js/firebase-config.js', 'js/ml-loader.js', 'js/notifications.js',
  'js/patient.js', 'js/verify.js', 'js/medicine-match.js', 'js/auth.js', 'js/loading.js',
  'manifest.json'
];
// Immutable, self-hosted ML libraries + model — cache-first so the alert page
// and pill recognition open instantly and work fully offline.
const PWA_VENDOR = [
  'js/vendor/tf.min.js', 'js/vendor/teachablemachine-image.min.js', 'js/vendor/mobilenet.min.js',
  'js/vendor/pose-detection.min.js', 'js/vendor/coco-ssd.min.js', 'js/vendor/confetti.browser.min.js',
  'js/vendor/tm-model/model.json', 'js/vendor/tm-model/metadata.json', 'js/vendor/tm-model/model.weights.bin'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(PWA_CACHE).then(cache => {
      const add = url => cache.add(url).catch(() => {});
      return Promise.all(PWA_SHELL.concat(PWA_VENDOR).map(add));
    }).catch(() => {})
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== PWA_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return;

  // Cache-first for immutable vendor libraries/model files.
  if (url.pathname.indexOf('/js/vendor/') !== -1) {
    event.respondWith(
      caches.match(req).then(hit =>
        hit || fetch(req).then(res => {
          const copy = res.clone();
          caches.open(PWA_CACHE).then(cache => cache.put(req, copy)).catch(() => {});
          return res;
        })
      )
    );
    return;
  }

  const isNavigation = req.mode === 'navigate';
  event.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(PWA_CACHE).then(cache => cache.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() =>
        caches.match(req).then(hit => {
          if (hit) return hit;
          // Only fall back to the app shell for real page navigations. Serving
          // HTML for a script/style request would break the whole app.
          if (isNavigation) return caches.match('index.html');
          return new Response('', { status: 504, statusText: 'Offline' });
        })
      )
  );
});
