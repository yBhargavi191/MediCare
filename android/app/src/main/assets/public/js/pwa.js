/* Registers the MediCare service worker so the app is installable (PWA). */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('firebase-messaging-sw.js').catch(() => {});
  });
}
