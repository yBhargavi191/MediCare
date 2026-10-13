(function () {
  'use strict';
  if (document.body.dataset.appShell === 'ready') return;

  var LOGO_SVG = '<svg class="app-logo-svg" viewBox="0 0 512 512" aria-hidden="true"><defs><linearGradient id="mcShellLogoBg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#60a5fa"/><stop offset="1" stop-color="#3b82f6"/></linearGradient></defs><rect x="0" y="0" width="512" height="512" rx="112" fill="url(#mcShellLogoBg)"/><g transform="translate(256 256) rotate(-45)"><rect x="-126" y="-62" width="252" height="124" rx="62" fill="#ffffff"/><path d="M0 -62 H64 A62 62 0 0 1 64 62 H0 Z" fill="#5e8aea"/><line x1="0" y1="-60" x2="0" y2="60" stroke="#3b82f6" stroke-opacity="0.2" stroke-width="6"/></g><g transform="translate(256 256) scale(3.9) translate(-12 -12)"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 20.28 3 22 5.42 22 7.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#f43f5e"/></g></svg>';

  var pathname = window.location.pathname.split('/').pop() || 'index.html';
  var adminPages = ['admin-dashboard.html', 'admin-alerts.html', 'admin-reports.html', 'admin-settings.html', 'patient-details.html'];
  var isAdmin = adminPages.includes(pathname) || document.body.dataset.adminPage;
  var adminLinks = [
    { label: 'Dashboard', href: 'admin-dashboard.html', icon: '▦', section: 'WORKSPACE' },
    { label: 'Patients', href: 'admin-dashboard.html#patientsCard', icon: '👥' },
    { label: 'Alert Center', href: 'admin-alerts.html', icon: '🔔' },
    { label: 'Reports', href: 'admin-reports.html', icon: '⌁' },
    { label: 'Settings', href: 'admin-settings.html', icon: '⚙', section: 'ACCOUNT' }
  ];
  var patientLinks = [
    { label: 'Dashboard', href: 'patient-dashboard.html', icon: '▦' },
    { label: 'Medication Reminders', href: 'medication-reminders.html', icon: '💊' },
    { label: 'Medical Records', href: 'health-records.html', icon: '📋' },
    { label: 'Appointments', href: 'appointments.html', icon: '🗓️' },
    { label: 'Nearby Hospitals', href: 'nearby-hospitals.html', icon: '🏥' },
    { label: 'Fitness & Wellness', href: 'fitness-checking.html', icon: '🏃' },
    { label: 'Connected Monitoring', href: 'monitor.html', icon: '⌚' },
    { label: 'Profile', href: 'profile.html', icon: '♟', section: 'ACCOUNT' },
    { label: 'Settings', href: 'settings.html', icon: '⚙' },
    { label: 'Emergency Contacts', href: 'emergency-contacts.html', icon: '✚' }
  ];
  var links = isAdmin ? adminLinks : patientLinks;
  var pageLabels = Object.fromEntries(links.map(function (item) { return [item.href, item.label]; }));
  if (!isAdmin && pathname === 'patient-dashboard.html') pageLabels[pathname] = 'Dashboard';
  var pageRoot = document.querySelector('.admin-container,.admin-page-shell,.patient-dashboard,.fitness-page');
  if (!pageRoot) return;
  document.body.dataset.appShell = 'ready';
  document.body.classList.add('app-shell-body', isAdmin ? 'admin-shell-body' : 'patient-shell-body');
  pageRoot.classList.add('app-main');

  var sidebar = document.createElement('aside');
  sidebar.className = 'app-sidebar';
  sidebar.id = 'appSidebar';
  sidebar.setAttribute('aria-label', isAdmin ? 'Admin navigation' : 'Patient navigation');
  var brand = document.createElement('div');
  brand.className = 'app-sidebar-brand';
  brand.innerHTML = '<span class="app-sidebar-logo" aria-hidden="true"><img src="icons/medicare-heart-logo.png" alt=""></span><span class="app-sidebar-brand-copy"><strong>MediCare</strong><span>' + (isAdmin ? 'ADMIN WORKSPACE' : 'PERSONAL HEALTH') + '</span></span>';

  var context = document.createElement('section');
  context.className = 'app-sidebar-context';
  context.innerHTML = '<strong><span aria-hidden="true">✦</span> ' + (isAdmin ? 'Patient care overview' : 'Your health space') + '</strong><p>' + (isAdmin ? 'Medication schedules, follow-ups, and care trends in one place.' : 'Your records, medicines, and routines stay together in one place.') + '</p>';

  var nav = document.createElement('nav');
  nav.className = 'app-sidebar-nav';
  nav.setAttribute('aria-label', isAdmin ? 'Admin workspace' : 'Your health pages');
  links.forEach(function (item) {
    if (item.section) {
      var sectionLabel = document.createElement('span');
      sectionLabel.className = 'app-sidebar-section-label';
      sectionLabel.textContent = item.section;
      nav.appendChild(sectionLabel);
    }
    var link = document.createElement('a');
    link.className = 'app-sidebar-link';
    link.href = item.href;
    if (pathname === item.href) link.setAttribute('aria-current', 'page');
    var icon = document.createElement('span');
    icon.className = 'app-sidebar-icon';
    icon.dataset.nav = item.href;
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = item.icon;
    var label = document.createElement('span');
    label.className = 'app-sidebar-link-label';
    label.textContent = item.label;
    link.append(icon, label);
    if ((isAdmin && item.label === 'Alert Center') || (!isAdmin && item.label === 'Medication Reminders')) {
      var indicator = document.createElement('span');
      indicator.className = 'app-sidebar-indicator';
      indicator.setAttribute('aria-hidden', 'true');
      link.appendChild(indicator);
    }
    nav.appendChild(link);
  });

  var metrics = document.createElement('div');
  metrics.className = 'app-sidebar-metrics';
  metrics.innerHTML = isAdmin
    ? '<div class="app-sidebar-metric"><span>Open alerts</span><strong id="appMetricPrimary">—</strong></div><div class="app-sidebar-metric"><span>Patients</span><strong id="appMetricSecondary">—</strong></div>'
    : '<div class="app-sidebar-metric"><span>Today’s doses</span><strong id="appMetricPrimary">—</strong></div><div class="app-sidebar-metric"><span>Upcoming</span><strong id="appMetricSecondary">—</strong></div>';
  if (isAdmin) sidebar.append(brand, context, nav, metrics);
  else sidebar.append(brand, nav, metrics);

  var backdrop = document.createElement('div');
  backdrop.className = 'app-sidebar-backdrop';
  backdrop.hidden = true;
  var toggle = document.createElement('button');
  toggle.className = 'app-sidebar-toggle';
  toggle.type = 'button';
  toggle.setAttribute('aria-label', 'Open navigation');
  toggle.setAttribute('aria-controls', 'appSidebar');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.innerHTML = '<svg viewBox="0 0 56 56" aria-hidden="true"><defs><linearGradient id="appMenuGradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#18c8e8"></stop><stop offset="1" stop-color="#315dff"></stop></linearGradient></defs><path d="M5 14l4 3M3 25h5M8 37l3-3" stroke="#22c8ea" stroke-width="3" stroke-linecap="round"></path><path d="M42 9l3-3M49 19h4M46 31l4 3" stroke="#d83bfa" stroke-width="3" stroke-linecap="round"></path><rect x="13" y="4" width="39" height="45" rx="13" fill="#fff" stroke="#e5edff"></rect><rect x="21" y="14" width="23" height="5" rx="2.5" fill="url(#appMenuGradient)"></rect><rect x="21" y="24" width="23" height="5" rx="2.5" fill="url(#appMenuGradient)"></rect><rect x="21" y="34" width="23" height="5" rx="2.5" fill="url(#appMenuGradient)"></rect></svg>';
  toggle.title = 'Open navigation';
  toggle.classList.add('app-sidebar-menu-button');
  var collapseButton = document.createElement('button');
  collapseButton.className = 'app-sidebar-collapse';
  collapseButton.type = 'button';
  collapseButton.setAttribute('aria-label', 'Collapse navigation');
  collapseButton.setAttribute('aria-controls', 'appSidebar');
  collapseButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3.2"></rect><path d="M9.2 4v16"></path><path class="app-sidebar-collapse-arrow" d="M16.5 9.1 13.6 12l2.9 2.9"></path></svg>';
  collapseButton.title = 'Collapse sidebar';
  brand.appendChild(collapseButton);
  document.body.insertBefore(sidebar, document.body.firstChild);
  document.body.insertBefore(backdrop, sidebar.nextSibling);
  document.body.insertBefore(toggle, backdrop.nextSibling);
  if (window.innerWidth > 720) {
    sidebar.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.disabled = true;
  }

  if (!isAdmin) {
    var fab = document.createElement('button');
    fab.type = 'button';
    fab.className = 'app-assist-fab';
    fab.setAttribute('aria-label', 'Ask the AI Assistant');
    fab.setAttribute('aria-haspopup', 'dialog');
    fab.setAttribute('aria-expanded', 'false');
    fab.innerHTML = '<img class="app-assist-fab-icon" src="icons/app-chatbot-icon.png" alt=""><span class="app-assist-fab-label">Ask AI</span>';
    document.body.appendChild(fab);
    setupAssistantWindow(fab);
  }

  /* ── In-page AI Assistant window ──────────────────────────────────
   * The assistant no longer needs a separate page: it opens as a
   * floating window over the page you are already on. Any in-app
   * link to caremate.html is routed into this window as well. */
  function setupAssistantWindow(fab) {
    var assistantWindow = document.createElement('div');
    assistantWindow.className = 'app-assist-window';
    assistantWindow.hidden = true;
    assistantWindow.innerHTML =
      '<div class="app-assist-window-backdrop" data-assist-close></div>' +
      '<section class="app-assist-window-panel" role="dialog" aria-modal="true" aria-label="AI Assistant">' +
        '<header class="app-assist-window-head">' +
          '<span class="app-assist-window-title"><img class="app-assist-window-avatar" src="icons/app-chatbot-icon.png" alt=""><strong>AI Assistant</strong></span>' +
          '<button type="button" class="app-assist-window-close" data-assist-close aria-label="Close AI Assistant">✕</button>' +
        '</header>' +
        '<div class="app-assist-window-body"></div>' +
      '</section>';
    document.body.appendChild(assistantWindow);

    var body = assistantWindow.querySelector('.app-assist-window-body');

    function open() {
      if (!body.dataset.loaded) {
        var frame = document.createElement('iframe');
        frame.className = 'app-assist-frame';
        frame.title = 'AI Assistant';
        frame.src = 'caremate.html?embed=1';
        body.appendChild(frame);
        body.dataset.loaded = 'true';
      }
      assistantWindow.hidden = false;
      fab.setAttribute('aria-expanded', 'true');
      var closeButton = assistantWindow.querySelector('.app-assist-window-close');
      if (closeButton) closeButton.focus();
    }

    function close() {
      assistantWindow.hidden = true;
      fab.setAttribute('aria-expanded', 'false');
    }

    fab.addEventListener('click', function () {
      if (assistantWindow.hidden) open(); else close();
    });
    assistantWindow.addEventListener('click', function (event) {
      if (event.target.hasAttribute && event.target.hasAttribute('data-assist-close')) close();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !assistantWindow.hidden) close();
    });
    document.addEventListener('click', function (event) {
      var target = event.target;
      if (!target || !target.closest) return;
      var link = target.closest('a[href$="caremate.html"]');
      if (!link || link.closest('.app-assist-window')) return;
      event.preventDefault();
      open();
    });
  }

  var appbar = document.createElement('header');
  appbar.className = 'app-topbar';
  var breadcrumb = document.createElement('div');
  breadcrumb.className = 'app-breadcrumb';
  breadcrumb.innerHTML = '<span class="app-breadcrumb-logo" aria-hidden="true">' + LOGO_SVG + '</span><a href="' + (isAdmin ? 'admin-dashboard.html' : 'patient-dashboard.html') + '">MediCare</a><span class="app-breadcrumb-separator" aria-hidden="true">›</span><strong>' + (pageLabels[pathname] || (isAdmin ? 'Patient Details' : 'Health')) + '</strong>';
  var searchWrap = document.createElement('label');
  searchWrap.className = 'app-global-search';
  searchWrap.innerHTML = '<span class="app-global-search-icon" aria-hidden="true">⌕</span><input id="appGlobalSearch" type="search" placeholder="Search…" aria-label="Search pages"><kbd>Ctrl K</kbd>';
  var actions = document.createElement('div');
  actions.className = 'app-topbar-actions';
  actions.innerHTML = '<div class="app-notif-wrap"><button class="app-tool-button" id="appNotificationsButton" type="button" aria-label="Open notifications" aria-haspopup="true" aria-expanded="false"><span class="app-bell" aria-hidden="true">🔔</span><span class="app-notification-badge" id="appNotificationBadge" hidden>0</span></button><div class="app-notif-pop" id="appNotificationPop" hidden></div></div><button class="app-tool-button" id="appThemeButton" type="button" aria-label="Toggle dark mode" aria-pressed="false">☾</button><a class="app-profile" id="appProfileLink" href="' + (isAdmin ? 'admin-settings.html' : 'profile.html') + '"><span class="app-profile-copy"><strong id="appProfileName">' + (isAdmin ? 'Admin' : 'Patient') + '</strong><small>' + (isAdmin ? 'Administrator' : 'Patient') + '</small></span><span class="app-avatar" id="appProfileInitial" aria-hidden="true">' + (isAdmin ? 'A' : 'P') + '</span></a><button class="app-logout" id="appLogout" type="button">Log out</button>';
  appbar.append(breadcrumb, searchWrap, actions);
  pageRoot.insertBefore(appbar, pageRoot.firstChild);

  /* ── Global search results dropdown ─────────────────────────── */
  var searchInput = document.getElementById('appGlobalSearch');
  var searchPop = document.createElement('div');
  searchPop.className = 'app-search-pop';
  searchPop.hidden = true;
  searchWrap.appendChild(searchPop);
  var contentMatches = [];

  function contentRowSelector() {
    return isAdmin
      ? '#patientReportRows tr,#alertsTable tbody tr,.admin-page-card,.patient-card'
      : '#dashboardMedicationTimeline .dose-timeline-item,#medList .med-item,.record-item,.health-record-item,.appointment-item,.fitness-hub-card,.dashboard-diet-list li';
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function renderSearch() {
    var term = searchInput.value.trim().toLocaleLowerCase();
    contentMatches = [];
    if (!term) { searchPop.hidden = true; return; }

    var html = '';
    var pageResults = links.filter(function (item) { return item.label.toLocaleLowerCase().includes(term); });
    if (pageResults.length) {
      html += '<div class="app-search-group-label">Pages</div>';
      pageResults.forEach(function (item) {
        html += '<button type="button" class="app-search-result" data-nav="' + item.href + '"><span class="app-search-result-icon" aria-hidden="true">' + (item.icon || '→') + '</span><span><strong style="display:block;font-size:12.5px;">' + item.label + '</strong><small>' + item.href + '</small></span></button>';
      });
    }

    document.querySelectorAll(contentRowSelector()).forEach(function (row) {
      if (row.textContent.toLocaleLowerCase().includes(term)) contentMatches.push(row);
    });
    if (contentMatches.length) {
      html += '<div class="app-search-group-label">On this page</div>';
      contentMatches.slice(0, 6).forEach(function (row, index) {
        var preview = (row.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);
        html += '<button type="button" class="app-search-result" data-i="' + index + '"><span class="app-search-result-icon" aria-hidden="true">⌕</span><span><strong style="display:block;font-size:12.5px;">' + (preview || 'Match') + '</strong><small>Jump to it on this page</small></span></button>';
      });
    }

    if (!html) {
      html = '<div class="app-search-empty">No matches for “' + escapeHtml(searchInput.value.trim()) + '”.</div>';
    }

    searchPop.innerHTML = html;
    searchPop.hidden = false;

    Array.prototype.forEach.call(searchPop.querySelectorAll('.app-search-result'), function (button) {
      button.addEventListener('click', function (event) {
        event.preventDefault();
        searchPop.hidden = true;
        if (button.dataset.nav) { window.location.href = button.dataset.nav; return; }
        var row = contentMatches[Number(button.dataset.i)];
        if (row) {
          row.scrollIntoView({ behavior: 'smooth', block: 'center' });
          row.classList.remove('app-search-flash');
          void row.offsetWidth;
          row.classList.add('app-search-flash');
          setTimeout(function () { row.classList.remove('app-search-flash'); }, 1800);
        }
      });
    });
  }
  searchInput.addEventListener('focus', renderSearch);
  document.addEventListener('click', function (event) { if (!searchWrap.contains(event.target)) searchPop.hidden = true; });

  /* ── Notification bell dropdown ─────────────────────────────── */
  var notifButton = document.getElementById('appNotificationsButton');
  var notifPop = document.getElementById('appNotificationPop');
  var signedInUser = null;
  var notifData = { items: [] };

  function hour12(value) {
    var parts = String(value || '').split(':');
    if (parts.length < 2) return value || '';
    var h = Number(parts[0]) % 12 || 12;
    return h + ':' + parts[1] + (Number(parts[0]) >= 12 ? ' PM' : ' AM');
  }

  function renderNotifications() {
    if (!notifPop) return;
    var html = '<div class="app-notif-head"><strong>' + (isAdmin ? 'Alert Center' : 'Notifications') + '</strong><button type="button" id="appNotifClear">Mark all read</button></div><div class="app-notif-list">';
    var items = notifData.items || [];
    if (!signedInUser) {
      html += '<div class="app-notif-empty">Sign in to see your reminders and alerts.</div>';
    } else if (!items.length) {
      html += '<div class="app-notif-empty">' + (isAdmin ? 'No new alerts. Everything looks calm. 🙂' : 'You are all caught up. 💙 Upcoming doses and missed-dose alerts will appear here.') + '</div>';
    } else {
      items.slice(0, 10).forEach(function (note) {
        html += '<div class="app-notif-item note-' + note.type + '"><span class="app-notif-icon" aria-hidden="true">' + note.icon + '</span><span class="app-notif-copy"><strong>' + note.title + '</strong><small>' + note.body + '</small></span></div>';
      });
      html += '<a class="app-notif-go" href="' + (isAdmin ? 'admin-alerts.html' : 'medication-reminders.html') + '">View all →</a>';
    }
    html += '</div>';
    notifPop.innerHTML = html;
    var clear = document.getElementById('appNotifClear');
    if (clear) clear.addEventListener('click', function () { markNotificationsSeen(); renderNotifications(); });
  }

  function updateNotificationBadge() {
    var badge = document.getElementById('appNotificationBadge');
    if (!badge) return;
    var seen = Number(localStorage.getItem('medicareNotifSeen') || 0);
    var fresh = (notifData.items || []).filter(function (note) { return (note.at || 0) > seen; }).length;
    if (signedInUser && fresh > 0) {
      badge.textContent = fresh > 9 ? '9+' : String(fresh);
      badge.hidden = false;
    } else { badge.hidden = true; badge.textContent = '0'; }
  }

  function markNotificationsSeen() {
    try { localStorage.setItem('medicareNotifSeen', String(Date.now())); } catch (error) {}
    updateNotificationBadge();
  }

  async function refreshNotifications() {
    var itemList = [];
    if (!signedInUser || typeof db === 'undefined') { notifData = { items: itemList }; updateNotificationBadge(); return; }
    try {
      var now = new Date();
      var todayStamp = now.getTime();
      var today = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      if (isAdmin) {
        var adminAlerts = (await db.collection('alerts').orderBy('createdAt', 'desc').limit(12).get()).docs;
        adminAlerts.forEach(function (doc) {
          var alert = doc.data();
          itemList.push({ type: 'alert', icon: '🔔', title: 'New caregiver alert', body: alert.message || 'An alert was raised in your centre.', at: alert.createdAt ? alert.createdAt.toMillis() : todayStamp });
        });
      } else {
        var doseSnap = await db.collection('doses').where('patientId', '==', signedInUser.uid).where('date', '==', today).get();
        doseSnap.docs.forEach(function (doc) {
          var dose = doc.data();
          if (dose.status === 'missed') {
            itemList.push({ type: 'missed', icon: '⚠️', title: 'Missed dose', body: dose.medName + ' · ' + hour12(dose.scheduledTime), at: todayStamp });
          } else if (dose.status === 'pending') {
            itemList.push({ type: 'reminder', icon: '💊', title: 'Upcoming dose', body: dose.medName + ' · ' + hour12(dose.scheduledTime), at: todayStamp });
          }
        });
        var patientAlerts = (await db.collection('alerts').where('patientId', '==', signedInUser.uid).orderBy('createdAt', 'desc').limit(8).get()).docs;
        patientAlerts.forEach(function (doc) {
          var alert = doc.data();
          itemList.push({ type: 'alert', icon: '🚨', title: 'Care alert', body: alert.message || 'Your caregiver was notified.', at: alert.createdAt ? alert.createdAt.toMillis() : todayStamp });
        });
      }
    } catch (error) {
      itemList.push({ type: 'alert', icon: 'ℹ️', title: 'Notifications unavailable', body: 'Could not load your notifications. Check your connection.' });
    }
    itemList.sort(function (a, b) { return (b.at || 0) - (a.at || 0); });
    notifData = { items: itemList };
    updateNotificationBadge();
  }

  notifButton.addEventListener('click', function (event) {
    event.preventDefault();
    var opening = notifPop.hidden;
    if (opening) refreshNotifications().then(renderNotifications);
    notifPop.hidden = !opening;
    notifButton.setAttribute('aria-expanded', String(opening));
    if (opening) markNotificationsSeen();
  });
  document.addEventListener('click', function (event) {
    if (!actions.contains(event.target)) { notifPop.hidden = true; notifButton.setAttribute('aria-expanded', 'false'); }
  });

  function setSidebarOpen(open) {
    sidebar.classList.toggle('is-open', open);
    backdrop.hidden = !open;
    document.body.classList.toggle('app-sidebar-collapsed', !open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Navigation menu is open' : 'Open navigation');
    toggle.title = open ? 'Navigation menu is open' : 'Open navigation';
    toggle.disabled = open;
  }
  toggle.addEventListener('click', function () {
    if (!sidebar.classList.contains('is-open')) setSidebarOpen(true);
  });
  collapseButton.addEventListener('click', function () { setSidebarOpen(false); });
  backdrop.addEventListener('click', function () { setSidebarOpen(false); });
  sidebar.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      if (window.innerWidth <= 720) setSidebarOpen(false);
    });
  });
  document.addEventListener('keydown', function (event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); document.getElementById('appGlobalSearch').focus(); }
    if (event.key === 'Escape') {
      setSidebarOpen(false);
      if (searchPop) searchPop.hidden = true;
      if (notifPop) notifPop.hidden = true;
    }
  });

  function applyTheme(theme) {
    var selected = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = selected;
    document.documentElement.style.colorScheme = selected;
    try { localStorage.setItem('medicareTheme', selected); } catch (error) {}
    var button = document.getElementById('appThemeButton');
    button.textContent = selected === 'dark' ? '☀' : '☾';
    button.setAttribute('aria-pressed', String(selected === 'dark'));
    button.setAttribute('aria-label', selected === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    var checkbox = document.getElementById('themeToggle');
    if (checkbox) checkbox.checked = selected === 'dark';
  }
  applyTheme(document.documentElement.dataset.theme || 'light');
  document.getElementById('appThemeButton').addEventListener('click', function () { applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'); });

  function setProfile(profile) {
    var name = profile && (profile.name || profile.email) || (isAdmin ? 'Admin' : 'Patient');
    var display = document.getElementById('appProfileName');
    if (display) display.textContent = name;
    var initial = document.getElementById('appProfileInitial');
    if (initial) initial.textContent = name.trim().charAt(0).toUpperCase();
  }

  function setMetrics(values) {
    var primary = document.getElementById('appMetricPrimary');
    var secondary = document.getElementById('appMetricSecondary');
    if (values.primary != null && primary) primary.textContent = values.primary;
    if (values.secondary != null && secondary) secondary.textContent = values.secondary;
  }

  function searchPage(query) {
    var term = query.trim().toLocaleLowerCase();
    if (isAdmin && pathname === 'admin-dashboard.html' && typeof window.filterPatients === 'function') {
      var patientSearch = document.getElementById('patientSearch');
      if (patientSearch) { patientSearch.value = query; window.filterPatients(); }
    } else if (isAdmin && pathname === 'admin-alerts.html') {
      var alertSearch = document.getElementById('alertSearch');
      if (alertSearch) { alertSearch.value = query; alertSearch.dispatchEvent(new Event('input', { bubbles: true })); }
    } else if (isAdmin && pathname === 'admin-reports.html') {
      document.querySelectorAll('#patientReportRows tr').forEach(function (row) { row.hidden = Boolean(term) && !row.textContent.toLocaleLowerCase().includes(term); });
    } else if (isAdmin && pathname === 'admin-settings.html') {
      document.querySelectorAll('.admin-page-card').forEach(function (card) { card.hidden = Boolean(term) && !card.textContent.toLocaleLowerCase().includes(term); });
    } else if (!isAdmin) {
      nav.querySelectorAll('.app-sidebar-link').forEach(function (link) { link.hidden = Boolean(term) && !link.textContent.toLocaleLowerCase().includes(term); });
      var contentRows = document.querySelectorAll('#dashboardMedicationTimeline .dose-timeline-item,#medList .med-item,.record-item,.health-record-item,.appointment-item,.fitness-hub-card');
      contentRows.forEach(function (row) { row.hidden = Boolean(term) && !row.textContent.toLocaleLowerCase().includes(term); });
    }
  }
  document.getElementById('appGlobalSearch').addEventListener('input', function (event) { searchPage(event.target.value); renderSearch(); });
  document.getElementById('appGlobalSearch').addEventListener('keydown', function (event) {
    if (event.key !== 'Enter' || isAdmin) return;
    var firstMatch = Array.from(nav.querySelectorAll('.app-sidebar-link')).find(function (link) { return !link.hidden; });
    if (event.target.value.trim() && firstMatch) { window.location.href = firstMatch.href; return; }
    var navButton = searchPop.querySelector('.app-search-result[data-nav]');
    if (event.target.value.trim() && navButton) window.location.href = navButton.dataset.nav;
  });

  document.getElementById('appLogout').addEventListener('click', function () {
    if (typeof auth !== 'undefined') auth.signOut().then(function () { window.location.href = 'index.html'; });
  });

  window.MediCareAppShell = { setProfile: setProfile, setMetrics: setMetrics };
  if (typeof auth !== 'undefined' && typeof db !== 'undefined') {
    auth.onAuthStateChanged(async function (user) {
      if (!user) return;
      signedInUser = user;
      try {
        var profileSnapshot = await db.collection('users').doc(user.uid).get();
        if (!profileSnapshot.exists) return;
        var profile = profileSnapshot.data();
        setProfile({ name: profile.name, email: profile.email || user.email });
        if (isAdmin && profile.role === 'admin') {
          var adminMetrics = await Promise.all([
            db.collection('users').where('role', '==', 'patient').get(),
            db.collection('alerts').get()
          ]);
          var activePatientCount = adminMetrics[0].docs.filter(function (doc) { return doc.data().status !== 'archived'; }).length;
          var openAlertCount = adminMetrics[1].docs.filter(function (doc) { var alert = doc.data(); return alert.status !== 'reviewed' && !alert.reviewedAt; }).length;
          setMetrics({ alerts: openAlertCount, patients: activePatientCount });
        } else if (!isAdmin && profile.role === 'patient') {
          var now = new Date();
          var today = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
          var doseSnapshot = await db.collection('doses').where('patientId', '==', user.uid).where('date', '==', today).get();
          var upcoming = doseSnapshot.docs.filter(function (doc) { return doc.data().status === 'pending'; }).length;
          setMetrics({ primary: doseSnapshot.size, secondary: upcoming, upcoming: upcoming });
        }
      } catch (error) { console.warn('Could not load app shell profile:', error); }
      refreshNotifications();
    });
  }
})();