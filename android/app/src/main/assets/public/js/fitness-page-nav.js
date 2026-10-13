(function () {
  'use strict';

  var themeScript = document.createElement('script');
  themeScript.src = 'js/theme.js';
  document.head.appendChild(themeScript);

  var shellStyles = document.createElement('link');
  shellStyles.rel = 'stylesheet';
  shellStyles.href = 'css/app-shell.css';
  document.head.appendChild(shellStyles);

  var shellScript = document.createElement('script');
  shellScript.src = 'js/app-shell.js';
  document.body.appendChild(shellScript);

  var drawer = document.getElementById('fitnessPageDrawer');
  var trigger = document.getElementById('fitnessMenuTrigger');
  var backdrop = document.getElementById('fitnessMenuBackdrop');
  var closeButton = document.getElementById('fitnessMenuClose');
  var backButton = document.getElementById('fitnessBackButton');

  if (!drawer || !trigger || !backdrop || !closeButton) return;

  function setOpen(isOpen) {
    drawer.classList.toggle('open', isOpen);
    drawer.setAttribute('aria-hidden', String(!isOpen));
    trigger.setAttribute('aria-expanded', String(isOpen));
    backdrop.hidden = !isOpen;
  }

  trigger.addEventListener('click', function () {
    setOpen(!drawer.classList.contains('open'));
  });
  closeButton.addEventListener('click', function () { setOpen(false); });
  backdrop.addEventListener('click', function () { setOpen(false); });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') setOpen(false);
  });

  if (backButton) {
    backButton.addEventListener('click', function () {
      var referrer = document.referrer;
      if (referrer && new URL(referrer).origin === window.location.origin && !/\/index\.html(?:$|\?)/.test(new URL(referrer).pathname)) {
        window.history.back();
      } else {
        window.location.href = 'patient-dashboard.html';
      }
    });
  }
})();
