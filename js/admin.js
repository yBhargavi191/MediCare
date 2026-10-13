let adminUser = null;
let cachedPatients = [];
let cachedMeds = [];
let cachedDoses = [];
let cachedAlerts = [];
let statsRangeDays = 30;

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
}

auth.onAuthStateChanged(async (user) => {
  if (!user) { window.location.href = 'index.html'; return; }
  const doc = await db.collection('users').doc(user.uid).get();
  if (!doc.exists || doc.data().role !== 'admin') { window.location.href = 'index.html'; return; }
  adminUser = user;
  const profile = doc.data();
  document.getElementById('adminName').textContent = profile.name || profile.email;
  window.MediCareAppShell?.setProfile({ name: profile.name, email: profile.email || user.email });
  loadOverview();
});

function logout() { auth.signOut().then(() => window.location.href = 'index.html'); }

function todayStr() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

async function loadOverview() {
  const today = todayStr();

  const [patientsSnap, medsSnap, dosesSnap, alertsSnap] = await Promise.all([
    db.collection('users').where('role', '==', 'patient').get(),
    db.collection('medicines').get(),
    db.collection('doses').where('date', '==', today).get(),
    db.collection('alerts').get()
  ]);

  const patients = patientsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const activePatients = patients.filter(p => p.status !== 'archived');
  const archivedPatients = patients.filter(p => p.status === 'archived');
  const doses = dosesSnap.docs.map(d => d.data());
  const meds = medsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const alerts = alertsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  cachedPatients = patients;
  cachedMeds = meds;
  cachedDoses = doses;
  cachedAlerts = alerts;

  const completed = doses.filter(d => d.status === 'verified').length;
  const missed = doses.filter(d => d.status === 'missed').length;
  const penaltyTotal = missed * DEMO_CONFIG.PENALTY_AMOUNT;

  document.getElementById('totalPatients').textContent = activePatients.length;
  document.getElementById('totalMeds').textContent = medsSnap.size;
  document.getElementById('completedToday').textContent = completed;
  document.getElementById('missedToday').textContent = missed;
  document.getElementById('alertCount').textContent = alertsSnap.size;
  document.getElementById('accountabilityTotal').textContent = '₹' + penaltyTotal;
  window.MediCareAppShell?.setMetrics({ alerts: alerts.filter(alert => alert.status !== 'reviewed' && !alert.reviewedAt).length, patients: activePatients.length });

  renderPatientList(activePatients, doses);
  renderArchivedPatients(archivedPatients);
  loadPatientStatistics().catch(error => console.warn('Could not load patient statistics:', error));
}

function setStatText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function localDateString(date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function adherenceColor(percent) {
  return percent >= 70 ? 'var(--success)' : percent >= 40 ? 'var(--warning)' : 'var(--danger)';
}

function renderRankList(elementId, list, emptyText) {
  const box = document.getElementById(elementId);
  if (!box) return;
  if (!list.length) { box.innerHTML = `<div class="empty-state">${emptyText}</div>`; return; }
  box.innerHTML = list.map((row, index) => `<div class="stats-rank-row"><span class="stats-rank-pos">${index + 1}</span><span class="stats-rank-name">${escapeHtml(row.name)}</span><span class="stats-rank-value" style="color:${adherenceColor(row.percent)}">${row.percent}%</span></div>`).join('');
}

function recordCreatedAt(record) {
  const value = record && record.createdAt;
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  return null;
}

async function loadPatientStatistics() {
  const status = document.getElementById('statsStatus');
  const rowsBody = document.getElementById('patientStatsRows');
  const days = statsRangeDays || 30;
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);
  const startString = localDateString(start);
  const endString = localDateString(end);

  const patients = cachedPatients;
  const activePatients = patients.filter(patient => patient.status !== 'archived');
  const archivedPatients = patients.filter(patient => patient.status === 'archived');

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const newThisMonth = patients.filter(patient => {
    const created = recordCreatedAt(patient);
    return created && created >= monthStart;
  }).length;

  let doses = [];
  try {
    const snapshot = await db.collection('doses').where('date', '>=', startString).where('date', '<=', endString).get();
    const activeIds = new Set(activePatients.map(patient => patient.id));
    doses = snapshot.docs.map(doc => doc.data()).filter(dose => activeIds.has(dose.patientId));
  } catch (error) {
    console.warn('Could not load dose statistics:', error);
    setStatText('statTotalPatients', patients.length);
    setStatText('statActivePatients', activePatients.length);
    setStatText('statArchivedPatients', archivedPatients.length);
    setStatText('statNewPatients', newThisMonth);
    setStatText('statAvgAdherence', '—');
    setStatText('statAtRisk', '—');
    renderRankList('topPerformers', [], 'Statistics unavailable.');
    renderRankList('bottomPerformers', [], 'Statistics unavailable.');
    if (rowsBody) rowsBody.innerHTML = '<tr><td colspan="5">Statistics unavailable.</td></tr>';
    if (status) status.textContent = 'Could not load dose statistics. Check your connection and Firestore rules.';
    return;
  }

  const rowsById = new Map(activePatients.map(patient => [patient.id, {
    id: patient.id,
    name: patient.name || patient.email || 'Patient',
    total: 0, taken: 0, missed: 0
  }]));
  doses.forEach(dose => {
    const row = rowsById.get(dose.patientId);
    if (!row) return;
    row.total++;
    if (dose.status === 'verified') row.taken++;
    if (dose.status === 'missed') row.missed++;
  });

  const rows = Array.from(rowsById.values()).map(row => ({ ...row, percent: row.total ? Math.round((row.taken / row.total) * 100) : 0 }));
  const rowsWithDoses = rows.filter(row => row.total > 0);
  const average = rowsWithDoses.length ? Math.round(rowsWithDoses.reduce((sum, row) => sum + row.percent, 0) / rowsWithDoses.length) : 0;
  const atRisk = rowsWithDoses.filter(row => row.percent < 50);

  setStatText('statTotalPatients', patients.length);
  setStatText('statActivePatients', activePatients.length);
  setStatText('statArchivedPatients', archivedPatients.length);
  setStatText('statNewPatients', newThisMonth);
  setStatText('statAvgAdherence', rowsWithDoses.length ? average + '%' : '—');
  setStatText('statAtRisk', atRisk.length);

  const ranked = rowsWithDoses.slice().sort((a, b) => b.percent - a.percent || a.name.localeCompare(b.name));
  renderRankList('topPerformers', ranked.slice(0, 3), 'No adherence data yet.');
  renderRankList('bottomPerformers', ranked.slice().reverse().slice(0, 3), 'No adherence data yet.');

  if (rowsBody) {
    const sorted = rows.slice().sort((a, b) => a.name.localeCompare(b.name));
    rowsBody.innerHTML = sorted.length ? sorted.map(row => `<tr><td>${escapeHtml(row.name)}</td><td class="admin-number">${row.total}</td><td class="admin-number">${row.taken}</td><td class="admin-number">${row.missed}</td><td><span class="admin-progress" aria-hidden="true"><span style="width:${row.percent}%"></span></span><span class="admin-number">${row.percent}%</span></td></tr>`).join('') : '<tr><td colspan="5">No active patients found.</td></tr>';
  }

  const rangeLabel = document.getElementById('statsRangeLabel');
  if (rangeLabel) rangeLabel.textContent = `Last ${days} days · ${startString} → ${endString}`;
  if (status) status.textContent = rowsWithDoses.length
    ? `Completion = verified doses ÷ scheduled doses. Based on ${rowsWithDoses.length} patient${rowsWithDoses.length === 1 ? '' : 's'} with doses.`
    : 'No doses recorded in this period yet.';
}

function renderArchivedPatients(patients) {
  const card = document.getElementById('archivedPatientsCard');
  const box = document.getElementById('archivedPatientList');
  if (!patients.length) { card.style.display = 'none'; return; }
  card.style.display = 'block';
  box.innerHTML = patients.map(p => `<div class="patient-row archived-row" onclick="openPatientPage('${p.id}')"><div><div style="font-weight:700;font-size:14px;">${p.name || p.email}</div><div style="font-size:12px;color:var(--muted);">Archived · view history</div></div><div class="badge pending">Archived</div></div>`).join('');
}

function renderPatientList(patients, allDoses) {
  const box = document.getElementById('patientList');
  if (!patients.length) { box.innerHTML = '<div class="empty-state">No patients registered yet.</div>'; return; }

  box.innerHTML = '';
  patients.forEach(p => {
    const myDoses = allDoses.filter(d => d.patientId === p.id);
    const v = myDoses.filter(d => d.status === 'verified').length;
    const m = myDoses.filter(d => d.status === 'missed').length;
    const resolved = v + m;
    const pct = resolved === 0 ? 100 : Math.round((v / resolved) * 100);

    const row = document.createElement('div');
    row.className = 'patient-row';
    row.onclick = () => openPatientPage(p.id);
    row.innerHTML = `
      <div>
        <div style="font-weight:700;font-size:14px;">${escapeHtml(p.name || p.email)}</div>
        <div style="font-size:12px;color:var(--muted);">💰 ₹${p.walletBalance ?? DEMO_CONFIG.STARTING_WALLET_BALANCE} · ${myDoses.length} doses today</div>
      </div>
      <div class="adh" style="color:${pct >= 70 ? 'var(--success)' : pct >= 40 ? 'var(--warning)' : 'var(--danger)'}">${pct}%</div>
    `;
    box.appendChild(row);
  });
}

function filterPatients() {
  const query = document.getElementById('patientSearch')?.value.trim().toLocaleLowerCase() || '';
  const rows = Array.from(document.querySelectorAll('#patientList .patient-row'));
  let visibleCount = 0;
  rows.forEach(row => {
    const matches = !query || row.textContent.toLocaleLowerCase().includes(query);
    row.hidden = !matches;
    if (matches) visibleCount++;
  });
  const countLabel = document.getElementById('patientCountLabel');
  if (countLabel) {
    const activeCount = cachedPatients.filter(patient => patient.status !== 'archived').length;
    countLabel.textContent = query ? `${visibleCount} matching patients` : `${activeCount} active patients`;
  }
}

async function openPatientDetail(patient) {
  document.getElementById('modalPatientName').textContent = patient.name || patient.email;
  document.getElementById('modalOverlay').style.display = 'flex';
  const body = document.getElementById('modalBody');
  body.innerHTML = '<div class="spinner"></div>';

  let medsSnap, dosesSnap, alertsSnap;
  try {
    // Sort in the browser. This avoids Firestore composite-index errors that
    // previously left the patient panel spinning forever.
    [medsSnap, dosesSnap, alertsSnap] = await Promise.all([
      db.collection('medicines').where('patientId', '==', patient.id).get(),
      db.collection('doses').where('patientId', '==', patient.id).get(),
      db.collection('alerts').where('patientId', '==', patient.id).get()
    ]);
  } catch (error) {
    console.error('Unable to load patient details:', error);
    body.innerHTML = '<div class="empty-state">Patient details could not load. Please refresh and check your Firestore rules.</div>';
    return;
  }

  let html = `<p style="font-size:13px;color:var(--muted);">📞 ${patient.phone || '—'} · ✉️ ${patient.email}</p>`;
  html += `<p style="font-size:13px;">💰 Wallet Balance: <strong>₹${patient.walletBalance ?? DEMO_CONFIG.STARTING_WALLET_BALANCE}</strong></p>`;

  html += '<h4 style="margin-bottom:6px;">Medicines</h4>';
  if (medsSnap.empty) html += '<div class="empty-state">No medicines added.</div>';
  medsSnap.forEach(d => {
    const m = d.data();
    html += `<div class="med-item"><div><div class="med-name">💊 ${m.name}</div><div class="med-time">${m.time} · ${m.dosage || ''}</div></div><button class="remove-med-btn" onclick="adminRemoveMedicine('${d.id}', '${patient.id}')">Remove</button></div>`;
  });

  html += `
    <div style="background:#f8fafc;border-radius:12px;padding:12px;margin-top:10px;">
      <strong style="font-size:13px;">+ Add Medicine for this patient</strong>
      <input type="text" id="adminMedName" placeholder="Medicine name" style="margin-top:8px;">
      <input type="text" id="adminMedDosage" placeholder="Dosage (e.g. 1 tablet)">
      <div class="time-row"><select id="adminMedHour" aria-label="Hour"></select><select id="adminMedMinute" class="time-fixed" aria-label="Minute"></select><select id="adminMedPeriod" class="time-fixed" aria-label="AM or PM"><option value="AM">AM</option><option value="PM">PM</option></select></div>
      <button class="primary" onclick="adminAddMedicine('${patient.id}')">Save Medicine</button>
    </div>
  `;

  html += '<h4 style="margin:14px 0 6px;">Recent Dose History</h4>';
  if (dosesSnap.empty) html += '<div class="empty-state">No dose history yet.</div>';
  dosesSnap.docs
    .sort((a, b) => String(b.data().date || '').localeCompare(String(a.data().date || '')))
    .slice(0, 10).forEach(d => {
    const dose = d.data();
    const badgeClass = dose.status === 'verified' ? 'verified' : dose.status === 'missed' ? 'missed' : 'pending';
    const badgeText = dose.status === 'verified' ? '✅ Verified' : dose.status === 'missed' ? '⚠️ Missed' : '⏳ Pending';
    html += `<div class="med-item"><div><div class="med-name">${dose.medName}</div><div class="med-time">${dose.date} · ${dose.scheduledTime}</div></div><span class="badge ${badgeClass}">${badgeText}</span></div>`;
  });

  html += '<h4 style="margin:14px 0 6px;">Caregiver Alerts</h4>';
  if (alertsSnap.empty) html += '<div class="empty-state">No alerts.</div>';
  alertsSnap.docs
    .sort((a, b) => (b.data().createdAt?.seconds || 0) - (a.data().createdAt?.seconds || 0))
    .slice(0, 5).forEach(d => {
    html += `<div style="font-size:13px;padding:6px 0;border-bottom:1px solid var(--border);">⚠️ ${d.data().message}</div>`;
  });

  body.innerHTML = html;
  fillTimePickers('adminMed');
  setTimePickerDefaults('adminMed', 8);
}

function patientName(patientId) {
  const p = cachedPatients.find(x => x.id === patientId);
  return p ? (p.name || p.email) : 'Unknown patient';
}

function openPatientPage(patientId) {
  sessionStorage.setItem('lifelineSelectedPatientId', patientId);
  window.location.href = 'patient-details.html';
}

function openOverviewDetail(type) {
  document.getElementById('modalOverlay').style.display = 'flex';
  const body = document.getElementById('modalBody');
  let title = '', html = '';

  if (type === 'patients') {
    title = `👤 All Patients (${cachedPatients.length})`;
    if (!cachedPatients.length) html = '<div class="empty-state">No patients registered yet.</div>';
    cachedPatients.forEach(p => {
      html += `<div class="patient-row" onclick="openPatientPage('${p.id}')">
        <div><div style="font-weight:700;font-size:14px;">${p.name || p.email}</div><div style="font-size:12px;color:var(--muted);">✉️ ${p.email}</div></div>
        <div class="adh">₹${p.walletBalance ?? DEMO_CONFIG.STARTING_WALLET_BALANCE}</div>
      </div>`;
    });
  } else if (type === 'medicines') {
    title = `💊 All Medicines (${cachedMeds.length})`;
    if (!cachedMeds.length) html = '<div class="empty-state">No medicines added yet.</div>';
    cachedMeds.forEach(m => {
      html += `<div class="med-item"><div><div class="med-name">💊 ${m.name}</div><div class="med-time">${patientName(m.patientId)} · ${m.time} · ${m.dosage || ''}</div></div><button class="remove-med-btn" onclick="adminRemoveMedicine('${m.id}', '${m.patientId}', true)">Remove</button></div>`;
    });
  } else if (type === 'completed' || type === 'missed') {
    const filtered = cachedDoses.filter(d => d.status === (type === 'completed' ? 'verified' : 'missed'));
    title = type === 'completed' ? `✅ Completed Today (${filtered.length})` : `⚠️ Missed Today (${filtered.length})`;
    if (!filtered.length) html = '<div class="empty-state">Nothing here yet.</div>';
    filtered.forEach(d => {
      html += `<div class="med-item"><div><div class="med-name">${d.medName}</div><div class="med-time">${patientName(d.patientId)} · ${d.scheduledTime}</div></div></div>`;
    });
  } else if (type === 'alerts') {
    title = `🚨 Caregiver Alerts (${cachedAlerts.length})`;
    if (!cachedAlerts.length) html = '<div class="empty-state">No alerts.</div>';
    cachedAlerts
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      .forEach(a => {
        html += `<div style="font-size:13px;padding:8px 0;border-bottom:1px solid var(--border);">⚠️ <strong>${patientName(a.patientId)}</strong> — ${a.message}</div>`;
      });
  } else if (type === 'penalties') {
    const missedDoses = cachedDoses.filter(d => d.status === 'missed');
    title = `💰 Penalties Applied Today (₹${missedDoses.length * DEMO_CONFIG.PENALTY_AMOUNT})`;
    if (!missedDoses.length) html = '<div class="empty-state">No penalties today.</div>';
    missedDoses.forEach(d => {
      html += `<div class="med-item"><div><div class="med-name">${patientName(d.patientId)}</div><div class="med-time">Missed: ${d.medName}</div></div><span class="badge missed">-₹${DEMO_CONFIG.PENALTY_AMOUNT}</span></div>`;
    });
  }

  document.getElementById('modalPatientName').textContent = title;
  body.innerHTML = html;
}

async function adminAddMedicine(patientId) {
  const name = document.getElementById('adminMedName').value.trim();
  const dosage = document.getElementById('adminMedDosage').value.trim();
  const time = readTimePicker('adminMed');
  if (!name || !time) return alert('Please enter medicine name and time.');

  await db.collection('medicines').add({
    patientId, name, dosage: dosage || '1 dose', time,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  const patient = cachedPatients.find(p => p.id === patientId);
  openPatientDetail(patient); // refresh the modal with the new medicine
  loadOverview(); // refresh background stats
}

async function adminRemoveMedicine(medicineId, patientId, fromOverview) {
  if (!confirm('Remove this medicine for the patient?')) return;
  try {
    await db.collection('medicines').doc(medicineId).delete();
    await loadOverview();
    if (fromOverview) {
      openOverviewDetail('medicines');
    } else {
      const patient = cachedPatients.find(p => p.id === patientId);
      if (patient) openPatientDetail(patient);
    }
  } catch (error) {
    console.error('Unable to remove medicine:', error);
    alert('Could not remove the medicine. Please try again.');
  }
}

function closeModal() { document.getElementById('modalOverlay').style.display = 'none'; }

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

// ---------- Dashboard Add Medicine popup ----------
let addMedContextPatientId = null;

function openAddMedicine(patientId) {
  if (!cachedPatients.length) { alert('No patients registered yet.'); return; }
  addMedContextPatientId = patientId || null;
  document.getElementById('addMedName').value = '';
  document.getElementById('addMedDosage').value = '';
  fillTimePickers('addMed');
  setTimePickerDefaults('addMed', 8);
  document.getElementById('addMedError').textContent = '';
  document.querySelectorAll('#dayChipRow input').forEach(input => input.checked = false);
  setAddMedFrequency('daily');

  const select = document.getElementById('addMedPatientSelect');
  const label = document.getElementById('addMedPatientLabel');
  if (patientId) {
    select.style.display = 'none';
    label.style.display = 'block';
    const patient = cachedPatients.find(p => p.id === patientId);
    label.textContent = `For: ${patient ? (patient.name || patient.email) : 'Patient'}`;
  } else {
    label.style.display = 'none';
    select.style.display = 'block';
    select.innerHTML = cachedPatients.map(p => `<option value="${p.id}">${p.name || p.email}</option>`).join('');
  }
  document.getElementById('addMedPopup').style.display = 'flex';
}

function closeAddMedicine() {
  document.getElementById('addMedPopup').style.display = 'none';
  addMedContextPatientId = null;
}

function setAddMedFrequency(frequency) {
  document.getElementById('freqDailyBtn').classList.toggle('active', frequency === 'daily');
  document.getElementById('freqWeeklyBtn').classList.toggle('active', frequency === 'weekly');
  document.getElementById('weeklyDaysWrap').style.display = frequency === 'weekly' ? 'block' : 'none';
  document.getElementById('addMedPopup').dataset.freq = frequency;
}

async function saveAddMedicine() {
  const errorBox = document.getElementById('addMedError');
  const patientId = addMedContextPatientId || document.getElementById('addMedPatientSelect').value;
  const name = document.getElementById('addMedName').value.trim();
  const dosage = document.getElementById('addMedDosage').value.trim();
  const time = readTimePicker('addMed');
  const frequency = document.getElementById('addMedPopup').dataset.freq || 'daily';
  const days = Array.from(document.querySelectorAll('#dayChipRow input:checked')).map(input => input.value);
  errorBox.textContent = '';
  if (!patientId || !name || !time) { errorBox.textContent = 'Please select a patient, medicine name, and time.'; return; }
  if (frequency === 'weekly' && !days.length) { errorBox.textContent = 'Select at least one day.'; return; }
  try {
    await db.collection('medicines').add({ patientId, name, dosage: dosage || '1 dose', time, frequency, days, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    closeAddMedicine();
    await loadOverview();
    const patient = cachedPatients.find(p => p.id === patientId);
    if (patient && document.getElementById('modalOverlay').style.display === 'flex') openPatientDetail(patient);
  } catch (error) {
    console.error('Unable to save medicine:', error);
    errorBox.textContent = 'Could not save medicine. Please check Firestore permissions.';
  }
}

// ---------- Patient statistics period selector ----------
(function () {
  const rangeSelect = document.getElementById('statsRange');
  if (!rangeSelect) return;
  statsRangeDays = Number(rangeSelect.value) || 30;
  rangeSelect.addEventListener('change', () => {
    statsRangeDays = Number(rangeSelect.value) || 30;
    loadPatientStatistics().catch(error => console.warn('Could not load patient statistics:', error));
  });
})();
