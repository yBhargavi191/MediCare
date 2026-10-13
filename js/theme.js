(function () {
  'use strict';
  if (window.MediCareThemeLoaded) return;
  window.MediCareThemeLoaded = true;

  var languageScript = document.createElement('script');
  languageScript.src = 'js/i18n.js';
  document.head.appendChild(languageScript);

  var storageKey = 'medicareTheme';
  var theme = 'light';
  try {
    theme = localStorage.getItem(storageKey) === 'dark' ? 'dark' : 'light';
  } catch (error) {}

  function applyTheme(value) {
    theme = value === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    var toggle = document.getElementById('themeToggle');
    if (toggle) toggle.checked = theme === 'dark';
  }

  applyTheme(theme);

  document.addEventListener('DOMContentLoaded', function () {
    var toggle = document.getElementById('themeToggle');
    if (!toggle) return;
    toggle.checked = theme === 'dark';
    toggle.addEventListener('change', function () {
      var selectedTheme = toggle.checked ? 'dark' : 'light';
      applyTheme(selectedTheme);
      try { localStorage.setItem(storageKey, selectedTheme); } catch (error) {}
    });
  });

  window.addEventListener('storage', function (event) {
    if (event.key === storageKey) applyTheme(event.newValue);
  });
})();