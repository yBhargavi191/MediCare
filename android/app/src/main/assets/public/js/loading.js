/* Shows a centered heartbeat while a page loads. Loaded as the first script in
   <body> so the indicator appears immediately, then fades out on window load. */
(function () {
  if (document.getElementById('appLoadingOverlay')) return;
  var overlay = document.createElement('div');
  overlay.id = 'appLoadingOverlay';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML =
    '<div class="app-loading-ecg">' +
      '<svg viewBox="0 0 280 74" role="img" aria-label="Heartbeat">' +
        '<path class="app-loading-track" d="M2 37H278"/>' +
        '<path class="app-loading-heart" d="M140 61C132 53 111 39 111 25c0-11 13-16 22-7l7 7 7-7c9-9 22-4 22 7 0 14-21 28-29 36Z"/>' +
        '<path class="app-loading-wave" d="M3 37h102c5 0 7-8 11-8s6 15 11 15l9-28 10 39 10-28 8 10h58"/>' +
        '<circle class="app-loading-dot" cx="3" cy="37" r="2.8"/>' +
        '<circle class="app-loading-dot" cx="277" cy="37" r="2.8"/>' +
      '</svg>' +
    '</div>';

  function mount() {
    if (document.body && !document.getElementById('appLoadingOverlay')) {
      document.body.appendChild(overlay);
    }
  }
  mount();

  var hidden = false;
  function hide() {
    if (hidden) return;
    hidden = true;
    var el = document.getElementById('appLoadingOverlay');
    if (!el) return;
    el.classList.add('app-loading-hide');
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 400);
  }

  window.appLoadingDone = hide;
  window.addEventListener('load', function () { setTimeout(hide, 250); });
  // Safety net so a slow third-party script can never trap the user on it.
  setTimeout(hide, 8000);
})();
