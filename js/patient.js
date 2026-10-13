let currentUser = null;
let currentUserData = null;
let medsCache = [];
let scanInterval = null;
let medicinesUnsubscribe = null;
let loadInProgress = false;
let reloadRequested = false;
const alertedDoseIds = new Set();
let reminderTimers = [];
// In-app reminder only fires within this many minutes of the scheduled time.
// Anything older is treated as past (the native alarm already handled it when
// the app was closed) so opening the app never rings for an old dose.
const DOSE_GRACE_MINUTES = 2;

function alertsAreEnabled() {
  const stored = localStorage.getItem('lifelineAlertsEnabled');
  // Once a browser has already granted notification access, reminders should
  // be active by default rather than waiting for another toggle press.
  return stored === 'true' || (stored === null && 'Notification' in window && Notification.permission === 'granted');
}

function setAlertsEnabled(enabled) {
  localStorage.setItem('lifelineAlertsEnabled', String(enabled));
}

auth.onAuthStateChanged(async (user) => {
  if (!user) { window.location.href = 'index.html'; return; }
  currentUser = user;
  const doc = await db.collection('users').doc(user.uid).get();
  if (!doc.exists || doc.data().role !== 'patient') { window.location.href = 'index.html'; return; }
  currentUserData = doc.data();
  if (currentUserData.status === 'archived') { renderArchivedAccount(); return; }
  init();
});

function renderArchivedAccount() {
  document.body.innerHTML = '<main class="inactive-account"><div class="inactive-icon">⌛</div><h2>Your care plan is inactive</h2><p>Your medication activities have been paused. Please contact your administrator if this is unexpected.</p><button class="primary" onclick="logout()">Logout</button></main>';
}

function logout() { auth.signOut().then(() => window.location.href = 'index.html'); }

function updateDashboardDate() {
  const dashboardDate = document.getElementById('dashboardDate');
  if (!dashboardDate) return;
  const locale = document.documentElement.lang || 'en-US';
  dashboardDate.textContent = new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
}

function toggleAddMed() {
  fillTimePickers('newMed');
  setTimePickerDefaults('newMed', 8);
  document.getElementById('newMedFrequency').value = 'daily';
  document.querySelectorAll('#newMedDays input[type="checkbox"]').forEach(cb => { cb.checked = false; });
  toggleWeeklyDays();
  document.getElementById('addMedicineModal').style.display = 'flex';
  document.getElementById('addMedError').textContent = '';
  setTimeout(() => document.getElementById('newMedName').focus(), 0);
}

function fillTimePickers(prefix) {
  const hour = document.getElementById(prefix + 'Hour');
  const minute = document.getElementById(prefix + 'Minute');
  if (hour && !hour.options.length) hour.innerHTML = Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('');
  if (minute && !minute.options.length) minute.innerHTML = Array.from({ length: 60 }, (_, i) => `<option value="${String(i).padStart(2, '0')}">${String(i).padStart(2, '0')}</option>`).join('');
}

function setTimePickerDefaults(prefix, hour12) {
  const hour = document.getElementById(prefix + 'Hour');
  if (!hour) return;
  hour.value = String(hour12);
  document.getElementById(prefix + 'Minute').value = '00';
  document.getElementById(prefix + 'Period').value = hour12 >= 12 ? 'PM' : 'AM';
}

function readTimePicker(prefix) {
  const h = Number(document.getElementById(prefix + 'Hour')?.value);
  const m = document.getElementById(prefix + 'Minute')?.value;
  const period = document.getElementById(prefix + 'Period')?.value;
  if (!h || !m || !period) return '';
  let hour24 = h % 12;
  if (period === 'PM') hour24 += 12;
  return `${String(hour24).padStart(2, '0')}:${m}`;
}

function closeAddMed() {
  document.getElementById('addMedicineModal').style.display = 'none';
}

function toggleWeeklyDays() {
  const frequency = document.getElementById('newMedFrequency').value;
  document.getElementById('newMedDays').style.display = frequency === 'weekly' ? 'block' : 'none';
}

function readSelectedDays() {
  return Array.from(document.querySelectorAll('#newMedDays input[type="checkbox"]:checked')).map(cb => cb.value);
}

async function addMedicine() {
  const name = document.getElementById('newMedName').value.trim();
  const dosage = document.getElementById('newMedDosage').value.trim();
  const time = readTimePicker('newMed');
  const frequency = document.getElementById('newMedFrequency').value;
  const days = frequency === 'weekly' ? readSelectedDays() : [];
  const error = document.getElementById('addMedError');
  error.textContent = '';
  if (!name || !time) { error.textContent = 'Enter the medicine name and time.'; return; }
  if (frequency === 'weekly' && !days.length) { error.textContent = 'Choose at least one day of the week.'; return; }
  try {
    await db.collection('medicines').add({
      patientId: currentUser.uid, name, dosage, times: [time], frequency, days,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    document.getElementById('newMedName').value = '';
    document.getElementById('newMedDosage').value = '';
    setTimePickerDefaults('newMed', 8);
    closeAddMed();
    await loadMedicinesAndDoses();
  } catch (err) {
    console.error('Unable to add medicine:', err);
    error.textContent = 'Could not save this medicine. Check your connection and try again.';
  }
}

async function init() {
  document.body.style.visibility = 'visible';
  const hour = new Date().getHours();
  const timeOfDay = document.getElementById('timeOfDay');
  const patientName = document.getElementById('patientName');
  const walletBalance = document.getElementById('walletBalance');
  if (timeOfDay) timeOfDay.textContent = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';
  if (patientName) patientName.textContent = currentUserData.name || currentUserData.email;
  const profileName = document.getElementById('profileDisplayName');
  if (profileName) profileName.textContent = currentUserData.name || currentUserData.email;
  const profileInitials = document.getElementById('profileInitials');
  if (profileInitials) profileInitials.textContent = (currentUserData.name || currentUserData.email || 'P').trim().charAt(0).toUpperCase();
  updateDashboardDate();
  window.addEventListener('medicare:languagechange', updateDashboardDate);
  const sosLink = document.getElementById('dashboardSosLink');
  const sosLabel = document.getElementById('dashboardSosLabel');
  if (sosLink && sosLabel) {
    const contact = (currentUserData.relativeContacts || []).find(item => item.phone) || (currentUserData.relativePhone ? { name: 'Caregiver', phone: currentUserData.relativePhone } : null);
    const phone = contact && String(contact.phone).replace(/[^+\d]/g, '');
    if (phone) {
      sosLink.href = 'tel:' + phone;
      sosLink.setAttribute('aria-label', 'Call ' + (contact.name || 'your caregiver'));
      sosLabel.textContent = 'Call ' + (contact.name || 'your caregiver');
    }
  }
  if (walletBalance) walletBalance.textContent = currentUserData.walletBalance ?? DEMO_CONFIG.STARTING_WALLET_BALANCE;
  renderTodayDietPlan();
  renderDoseStreak();
  window.addEventListener('storage', event => {
    if (event.key === 'medicare.fitness.plan' || event.key === 'medicare.fitness.profile') renderTodayDietPlan();
  });

  updateNotificationStatus();

  // If the native medication alarm launched the app, jump straight to verify.
  if (MediCareNotifications.urgentAlerts) {
    const pendingDose = await MediCareNotifications.consumePendingVerify();
    if (pendingDose) { window.location.href = `verify.html?doseId=${encodeURIComponent(pendingDose)}`; return; }
    // The alarm can also arrive while the dashboard is already open.
    setInterval(async () => {
      const dose = await MediCareNotifications.consumePendingVerify();
      if (dose) window.location.href = `verify.html?doseId=${encodeURIComponent(dose)}`;
    }, 2500);
  }

  if (MediCareNotifications.native) {
    MediCareNotifications.native.addListener('localNotificationActionPerformed', action => {
      const id = action.notification.extra?.doseId;
      if (id) window.location.href = `verify.html?doseId=${encodeURIComponent(id)}`;
    });
  }

  // React immediately when an administrator adds a custom time or changes the care plan.
  medicinesUnsubscribe = db.collection('medicines')
    .where('patientId', '==', currentUser.uid)
    .onSnapshot(() => loadMedicinesAndDoses(), error => console.error('Unable to watch medicine schedule:', error));
  renderCaregivers();

  scanInterval = setInterval(checkDueDoses, 3000);
  checkDueDoses();
}

async function enableMedicationAlerts() {
  const status = document.getElementById('notificationStatus');
  if (alertsAreEnabled()) {
    setAlertsEnabled(false);
    updateNotificationStatus();
    return;
  }
  try {
    const enabled = MediCareNotifications.native
      ? await MediCareNotifications.requestPermission()
      : WebPush.configured()
        ? Boolean(await WebPush.enable(currentUser.uid))
        : await MediCareNotifications.requestPermission();
    status.textContent = enabled
      ? (WebPush.configured() ? 'Alerts enabled. Your scheduled medication reminders are ready.' : 'Alerts enabled while this dashboard is open. Configure Firebase Web Push for background alerts.')
      : 'Alerts are off. Allow notifications in your browser settings.';
    if (enabled && !MediCareNotifications.native) {
      // Immediate confirmation so the patient can verify permission before a
      // scheduled dose is due.
      new Notification('MediCare alerts enabled', {
        body: 'Test successful. You will be alerted when it is time for your medicine.',
        tag: 'lifeline-alert-enabled',
        requireInteraction: true
      });
    }
    if (enabled) {
      setAlertsEnabled(true);
      await loadMedicinesAndDoses();
    }
    updateNotificationStatus();
  } catch (error) {
    console.error('Unable to enable alerts:', error);
    status.textContent = 'We could not enable alerts. Please check your notification settings.';
  }
}

async function enableUrgentAndroidAlerts() {
  const status = document.getElementById('notificationStatus');
  try {
    const fullScreen = await MediCareNotifications.fullScreenIntentStatus();
    if (fullScreen && fullScreen.granted === false) {
      status.textContent = 'Turn on "Allow full-screen notifications" for MediCare, then tap again to enable the alarm ring.';
      await MediCareNotifications.openFullScreenIntentSettings();
      return;
    }
    const exact = await MediCareNotifications.exactAlarmStatus();
    if (exact && exact.granted === false) {
      status.textContent = 'Allow "Alarms & reminders" for MediCare, then tap again to enable the alarm ring.';
      await MediCareNotifications.openExactAlarmSettings();
      return;
    }
    const result = await MediCareNotifications.enableUrgentAndroidAlerts();
    if (!result.supported) return;
    status.textContent = 'Android settings opened. Enable Do Not Disturb access for MediCare, then return here.';
  } catch (error) {
    console.error('Unable to open alert settings:', error);
    status.textContent = 'We could not open Android alert settings.';
  }
}

async function testAlarmSound() {
  const status = document.getElementById('notificationStatus');
  if (!MediCareNotifications.native) {
    if (status) status.textContent = 'The alarm test only works inside the installed Android app.';
    return;
  }
  if (status) status.textContent = 'Testing alarm… listen for the ring within a few seconds.';
  const result = await MediCareNotifications.ringNow('Test medicine');
  if (status) {
    status.textContent = result && result.started
      ? 'Test alarm ringing now. Cannot hear it? Tap "Alarm help".'
      : 'Could not start the alarm. Tap "Alarm help" to check the settings.';
  }
}

async function showAlarmDiagnostics() {
  const status = document.getElementById('notificationStatus');
  const info = await MediCareNotifications.alarmDiagnostics();
  if (!info || info.supported === false) {
    if (status) status.textContent = 'Alarm help works only in the installed Android app.';
    return;
  }
  const parts = [
    'Android API ' + info.sdk,
    'Notifications ' + (info.notificationsEnabled ? 'on' : 'OFF'),
    'Full-screen ' + (info.fullScreenGranted ? 'on' : 'OFF'),
    'Alarms & reminders ' + (info.exactAlarmGranted ? 'on' : 'OFF'),
    'DND access ' + (info.dndAccess ? 'on' : 'OFF'),
    'scheduled alarms ' + (info.scheduledCount ?? 0)
  ];
  if (status) status.textContent = parts.join(' · ') + '. All should read "on" for the loud alarm.';
}

async function testScheduledAlarm() {
  const status = document.getElementById('notificationStatus');
  if (!MediCareNotifications.urgentAlerts) {
    if (status) status.textContent = 'This test only works in the installed Android app.';
    return;
  }
  const result = await MediCareNotifications.scheduleTestAlarm(20);
  if (status) {
    status.textContent = result && result.scheduled
      ? 'Test alarm set for 20 seconds. Close the app now — the red alert page should appear by itself.'
      : 'Could not schedule the test alarm. Open "Alarm help".';
  }
}

async function requestBatteryExemption() {
  const status = document.getElementById('notificationStatus');
  const result = await MediCareNotifications.requestIgnoreBatteryOptimizations();
  if (status) {
    status.textContent = result.alreadyExempt
      ? 'Battery optimisation is already off for MediCare — good.'
      : 'Allow "Unrestricted / No battery restrictions" for MediCare on the screen that opened.';
  }
}

function updateNotificationStatus() {
  const toggle = document.getElementById('enableNotificationsBtn');
  const status = document.getElementById('notificationStatus');
  if (!toggle || !status) return;
  const active = alertsAreEnabled();
  const urgentButton = document.getElementById('enableUrgentAlertsBtn');
  if (urgentButton) urgentButton.style.display = MediCareNotifications.native && MediCareNotifications.urgentAlerts ? 'inline-block' : 'none';
  const batteryButton = document.getElementById('batteryBtn');
  if (batteryButton) batteryButton.style.display = MediCareNotifications.native && MediCareNotifications.urgentAlerts ? 'inline-block' : 'none';

  if (MediCareNotifications.native) {
    toggle.disabled = false;
    MediCareNotifications.native.checkPermissions().then(permission => {
      const enabled = permission.display === 'granted';
      toggle.checked = enabled && active;
      status.textContent = !enabled ? 'Turn this on and allow notifications.' : active ? 'Medication alerts are on.' : 'Medication alerts are off.';
      if (enabled && active) MediCareNotifications.configureUrgentChannel().then(result => {
        if (result.accessGranted) status.textContent = 'Urgent alerts ring like an alarm — even in silent or Do Not Disturb mode.';
      });
    });
  } else if ('Notification' in window) {
    const enabled = Notification.permission === 'granted';
    toggle.disabled = false;
    toggle.checked = enabled && active;
    status.textContent = !enabled
      ? 'Turn this on to allow medication reminders.'
      : active
        ? (WebPush.configured() ? 'Reminders are on — you’ll be alerted on time.' : 'Reminders are on while this screen stays open.')
        : 'Reminders are off.';
  } else {
    toggle.disabled = true;
    toggle.checked = false;
    status.textContent = 'This browser does not support alerts.';
  }
}

function renderCaregivers() {
  const contacts = currentUserData.relativeContacts || (currentUserData.relativePhone ? [{ name: 'Care taker', phone: currentUserData.relativePhone }] : []);
  const box = document.getElementById('caregiverList');
  if (!box) return;
  if (!contacts.length) { box.innerHTML = '<div class="empty-state">No care takers have been added by your administrator yet.</div>'; return; }
  box.innerHTML = contacts.map(contact => `<div class="contact-line"><div><strong>${escapeHtml(contact.name || 'Care taker')}</strong><span>${escapeHtml(contact.phone)}</span></div></div>`).join('');
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
}

function todayStr(date = new Date()) {
  const now = date;
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

async function loadMedicinesAndDoses() {
  if (loadInProgress) { reloadRequested = true; return; }
  loadInProgress = true;
  const list = document.getElementById('medList');
  if (list) list.innerHTML = '<div class="empty-state">Loading medicines...</div>';
  try {
    const snap = await db.collection('medicines').where('patientId', '==', currentUser.uid).get();
    medsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (medsCache.length === 0) {
      if (list) list.innerHTML = '<div class="empty-state">No medicines assigned yet. Please contact your administrator.</div>';
      renderDashboardTimeline([]);
      updateStats(0, 0, 0);
      return;
    }

    const today = todayStr();
    const scheduledDoses = medsCache.flatMap(med => {
      if (!medicineIsDueToday(med)) return [];
      const times = med.times || (med.time ? [med.time] : []);
      return times.map(scheduledTime => ({
        id: `${med.id}_${today}_${scheduledTime.replace(':', '')}`,
        patientId: currentUser.uid, medId: med.id, medName: med.name, dosage: med.dosage,
        date: today, scheduledTime, status: 'pending'
      }));
    });

    // Show the plan immediately. Saving / retrieving dose status happens in the background,
    // so a permissions or network problem cannot leave the patient on “Loading”.
    renderMedList(scheduledDoses);

    // Fetch today's dose statuses in ONE query instead of one read per dose.
    let existingById = {};
    try {
      const doseSnap = await db.collection('doses')
        .where('patientId', '==', currentUser.uid)
        .where('date', '==', today)
        .get();
      doseSnap.docs.forEach(d => { existingById[d.id] = { id: d.id, ...d.data() }; });
    } catch (error) {
      console.warn('Unable to read dose status; showing the schedule instead.', error);
    }

    const doseDocs = await Promise.all(scheduledDoses.map(async dose => {
      if (existingById[dose.id]) return existingById[dose.id];
      try {
        const ref = db.collection('doses').doc(dose.id);
        await ref.set({ ...dose, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      } catch (error) {
        console.warn('Unable to sync dose status; showing the schedule instead.', error);
      }
      return dose;
    }));
    renderMedList(doseDocs);
    scheduleBrowserReminders(doseDocs);
    // Replace existing Android alarms so a new custom time resets the timer.
    await MediCareNotifications.resetScheduledDoses(doseDocs);
  } catch (error) {
    console.error('Unable to load medicines:', error);
    if (list) list.innerHTML = '<div class="empty-state">We could not load your medicines. <button class="secondary" onclick="loadMedicinesAndDoses()">Try again</button></div>';
    const timeline = document.getElementById('dashboardMedicationTimeline');
    if (timeline) timeline.innerHTML = '<li class="timeline-empty">Your medication schedule is temporarily unavailable.</li>';
    updateStats(0, 0, 0);
  } finally {
    loadInProgress = false;
    if (reloadRequested) { reloadRequested = false; loadMedicinesAndDoses(); }
  }
}

function medicineIsDueToday(medicine) {
  if (medicine.frequency !== 'weekly') return true;
  const today = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()];
  return (medicine.days || []).includes(today);
}

function renderMedList(doses) {
  doses.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
  renderDashboardTimeline(doses);
  const list = document.getElementById('medList');
  if (list) list.innerHTML = '';

  if (!doses.length) {
    if (list) list.innerHTML = '<div class="empty-state">No medicines are scheduled for today.</div>';
    updateStats(0, 0, 0);
    return;
  }

  let verified = 0, missed = 0, upcoming = 0;

  doses.forEach(dose => {
    if (dose.status === 'verified') verified++;
    else if (dose.status === 'missed') missed++;
    else upcoming++;

    const badgeClass = dose.status === 'verified' ? 'verified' : dose.status === 'missed' ? 'missed' : 'upcoming';
    const badgeText = dose.status === 'verified' ? '✅ Verified' : dose.status === 'missed' ? '⚠️ Missed' : '⏰ Upcoming';

    if (!list) return;
    const row = document.createElement('div');
    row.className = 'med-item';
    row.innerHTML = `
      <div>
        <div class="med-name">💊 ${dose.medName}</div>
        <div class="med-time">${formatTime(dose.scheduledTime)} · ${dose.dosage || ''}</div>
      </div>
      <div style="text-align:right;">
        <div class="badge ${badgeClass}">${badgeText}</div>
      </div>
    `;
    list.appendChild(row);
  });

  updateStats(verified, missed, upcoming);
}

function renderDashboardTimeline(doses) {
  const timeline = document.getElementById('dashboardMedicationTimeline');
  if (!timeline) return;
  timeline.replaceChildren();
  if (!doses.length) {
    const empty = document.createElement('li');
    empty.className = 'timeline-empty';
    empty.textContent = 'No medication doses are scheduled for today.';
    timeline.appendChild(empty);
    return;
  }

  const statusLabels = { verified: 'Taken', missed: 'Missed', pending: 'Upcoming' };
  doses.forEach((dose, index) => {
    const item = document.createElement('li');
    item.className = 'dose-timeline-item';

    const pill = document.createElement('span');
    pill.className = 'timeline-pill timeline-pill-' + (index % 4);
    pill.setAttribute('aria-hidden', 'true');
    pill.textContent = '💊';

    const copy = document.createElement('span');
    copy.className = 'timeline-dose-copy';
    const name = document.createElement('strong');
    name.textContent = dose.medName || 'Medication';
    const detail = document.createElement('small');
    detail.textContent = formatTime(dose.scheduledTime) + (dose.dosage ? ' · ' + dose.dosage : '');
    copy.append(name, detail);

    const status = document.createElement('span');
    status.className = 'timeline-dose-status ' + (statusLabels[dose.status] ? dose.status : 'pending');
    status.textContent = statusLabels[dose.status] || 'Upcoming';
    item.append(pill, copy, status);
    timeline.appendChild(item);
  });
}

function renderDoseStreak() {
  const countElement = document.getElementById('streakCount');
  if (!countElement || !currentUser) return;
  let streak = 0;
  try {
    const record = JSON.parse(localStorage.getItem('medicare.doseStreak.' + currentUser.uid) || 'null');
    if (record && record.lastCompletedDate) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const lastDate = record.lastCompletedDate;
      if (lastDate === todayStr() || lastDate === todayStr(yesterday)) streak = Math.max(0, Number(record.count) || 0);
    }
  } catch (error) {}

  countElement.textContent = streak;
  const unit = document.getElementById('streakUnit');
  if (unit) unit.textContent = streak === 1 ? 'day streak' : 'days streak';
  const caption = document.getElementById('streakCaption');
  if (caption) {
    const nextBadge = [3, 7, 30].find(milestone => milestone > streak);
    caption.textContent = streak === 0
      ? 'Verify a dose today to begin your streak.'
      : nextBadge
        ? (nextBadge - streak) + ' more ' + (nextBadge - streak === 1 ? 'day' : 'days') + ' to your ' + nextBadge + '-day badge.'
        : 'Every dose verified. Your 30-day badge is yours.';
  }
  document.querySelectorAll('[data-streak-badge]').forEach(badge => {
    const earned = streak >= Number(badge.dataset.streakBadge);
    badge.classList.toggle('is-earned', earned);
    badge.setAttribute('aria-label', badge.dataset.streakBadge + '-day consistency badge, ' + (earned ? 'earned' : 'locked'));
  });
}

function updateStats(verified, missed, upcoming) {
  const verifiedStat = document.getElementById('statVerified');
  const missedStat = document.getElementById('statMissed');
  const upcomingStat = document.getElementById('statUpcoming');
  if (verifiedStat) verifiedStat.textContent = verified;
  if (missedStat) missedStat.textContent = missed;
  if (upcomingStat) upcomingStat.textContent = upcoming;
  const doseCount = document.getElementById('todayDoseCount');
  const doseProgress = document.getElementById('todayDoseProgress');
  if (doseCount) {
    const total = verified + missed + upcoming;
    doseCount.textContent = `${total} ${total === 1 ? 'dose' : 'doses'} scheduled`;
    doseProgress.textContent = `${verified} taken · ${upcoming} upcoming · ${missed} missed`;
    const ring = document.getElementById('dashboardDoseRing');
    const ringPercent = total ? Math.round((verified / total) * 100) : 0;
    const percentLabel = document.getElementById('dashboardDosePercent');
    if (ring) {
      ring.style.setProperty('--ring-angle', (ringPercent * 3.6) + 'deg');
      ring.setAttribute('aria-valuenow', String(ringPercent));
    }
    if (percentLabel) percentLabel.textContent = ringPercent + '%';
  }
  const resolved = verified + missed;
  window.MediCareAppShell?.setMetrics({ primary: verified + missed + upcoming, secondary: upcoming, upcoming: upcoming });
  const pct = resolved === 0 ? 100 : Math.round((verified / resolved) * 100);
  const adherenceFill = document.getElementById('adherenceFill');
  const adherenceText = document.getElementById('adherenceText');
  if (adherenceFill) adherenceFill.style.width = pct + '%';
  if (adherenceText) adherenceText.textContent = pct + '%';
}

function renderTodayDietPlan() {
  const list = document.getElementById('todayDietPlan');
  const calories = document.getElementById('todayDietCalories');
  if (!list || !calories) return;

  let plan = null;
  try { plan = JSON.parse(localStorage.getItem('medicare.fitness.plan') || 'null'); } catch (error) { plan = null; }
  list.replaceChildren();

  if (plan && Array.isArray(plan.meals) && plan.meals.length) {
    calories.textContent = plan.calories ? `${Number(plan.calories).toLocaleString()} kcal estimated` : 'Meal suggestions';
    plan.meals.forEach(meal => {
      const item = document.createElement('li');
      const mealName = document.createElement('strong');
      mealName.textContent = `${meal.name || 'Meal'}: `;
      item.append(mealName, document.createTextNode(meal.food || 'See your saved diet plan'));
      list.appendChild(item);
    });
    return;
  }

  calories.textContent = 'No plan saved yet';
  const item = document.createElement('li');
  item.textContent = 'Create a wellness profile to see your meal suggestions here. ';
  const link = document.createElement('a');
  link.href = 'fitness-checking.html';
  link.textContent = 'Set up plan';
  item.appendChild(link);
  list.appendChild(item);
}

function formatTime(t) {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function scheduleBrowserReminders(doses) {
  reminderTimers.forEach(timer => clearTimeout(timer));
  reminderTimers = [];
  const now = new Date();
  doses.filter(dose => dose.status === 'pending').forEach(dose => {
    const [hour, minute] = dose.scheduledTime.split(':').map(Number);
    const due = new Date();
    due.setHours(hour, minute, 0, 0);
    const delay = due.getTime() - now.getTime();
    if (delay > 0) reminderTimers.push(setTimeout(() => triggerScheduledReminder(dose), delay));
  });
}

function triggerScheduledReminder(dose) {
  if (!alertsAreEnabled() || alertedDoseIds.has(dose.id)) return;
  alertedDoseIds.add(dose.id);
  clearInterval(scanInterval);
  MediCareNotifications.showDueDose(dose);
  fireSystemNotification(dose.medName);
  window.location.href = `verify.html?doseId=${encodeURIComponent(dose.id)}&medId=${encodeURIComponent(dose.medId)}&medName=${encodeURIComponent(dose.medName)}`;
}

// Poll every few seconds: if a pending dose's scheduled time has arrived, auto-fire the critical alert.
async function checkDueDoses() {
  if (!alertsAreEnabled() || !medsCache.length) return;
  try {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const today = todayStr();
  // The schedule displayed on this page is the source of truth for the
  // browser reminder. Do not depend on a second Firestore query: restrictive
  // rules or a slow sync must not prevent a patient-facing alert.
  for (const medicine of medsCache) {
    if (!medicineIsDueToday(medicine)) continue;
    for (const scheduledTime of (medicine.times || (medicine.time ? [medicine.time] : []))) {
      const doseId = `${medicine.id}_${today}_${scheduledTime.replace(':', '')}`;
      if (alertedDoseIds.has(doseId)) continue;
      const [h, m] = scheduledTime.split(':').map(Number);
      const elapsed = nowMinutes - (h * 60 + m);
      // Ring at the medication time — not when the app is opened later in the
      // day for a dose whose time has long passed.
      if (elapsed >= 0 && elapsed <= DOSE_GRACE_MINUTES) {
        const dose = { id: doseId, medId: medicine.id, medName: medicine.name, scheduledTime, status: 'pending' };
        triggerScheduledReminder(dose);
        return;
      }
    }
  }
  } catch (error) {
    console.error('Unable to check scheduled doses:', error);
  }
}

function fireSystemNotification(medName) {
  if (!alertsAreEnabled()) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const n = new Notification('🚨 MediCare — Medication Time', {
      body: `Time to take ${medName}. Tap to verify.`,
      tag: 'lifeline-reminder',
      requireInteraction: true
    });
    n.onclick = () => { window.focus(); n.close(); };
  } catch (e) { /* notifications not supported in this context */ }
}

