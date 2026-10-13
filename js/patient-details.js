let selectedPatient = null;
let selectedPatientId = sessionStorage.getItem('lifelineSelectedPatientId');
let historyCache = [];
let prescriptionCandidates = [];
let medsCache = [];

auth.onAuthStateChanged(async user => {
  if (!user) { window.location.href = 'index.html'; return; }
  const admin = await db.collection('users').doc(user.uid).get();
  if (!admin.exists || admin.data().role !== 'admin' || !selectedPatientId) { window.location.href = 'admin-dashboard.html'; return; }
  setupCustomTimePicker();
  await loadPatient();
});

function logout() { auth.signOut().then(() => window.location.href = 'index.html'); }
function goBack() { window.location.href = 'admin-dashboard.html'; }
function text(value) { return String(value || '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])); }

async function loadPatient() {
  try {
    const [patientSnap, medsSnap, dosesSnap] = await Promise.all([
      db.collection('users').doc(selectedPatientId).get(),
      db.collection('medicines').where('patientId', '==', selectedPatientId).get(),
      db.collection('doses').where('patientId', '==', selectedPatientId).get()
    ]);
    if (!patientSnap.exists) { goBack(); return; }
    selectedPatient = { id: patientSnap.id, ...patientSnap.data() };
    renderProfile();
    renderMedicines(medsSnap.docs.map(d => ({ id:d.id, ...d.data() })));
    renderCaregivers();
    renderAlertChannel();
    historyCache = dosesSnap.docs.map(d => d.data());
    renderDoses(historyCache);
  } catch (error) {
    console.error(error);
    document.getElementById('medicineList').innerHTML = '<div class="empty-state">Could not load this patient. Check Firestore rules and refresh.</div>';
  }
}

function renderProfile() {
  const name = selectedPatient.name || selectedPatient.email || 'Patient';
  document.getElementById('patientTitle').textContent = name;
  document.getElementById('patientName').textContent = name;
  document.getElementById('patientInitial').textContent = name.charAt(0).toUpperCase();
  document.getElementById('patientSubtitle').textContent = 'Patient profile and care plan';
  document.getElementById('patientContact').textContent = [selectedPatient.phone, selectedPatient.email].filter(Boolean).join(' · ');
  document.getElementById('patientWallet').textContent = '₹' + (selectedPatient.walletBalance ?? DEMO_CONFIG.STARTING_WALLET_BALANCE);
  const archived = selectedPatient.status === 'archived';
  const button = document.getElementById('archivePatientBtn');
  button.textContent = archived ? 'Restore patient' : 'Archive patient';
  button.classList.toggle('restore-btn', archived);
  document.getElementById('medName').disabled = archived;
  document.getElementById('medDosage').disabled = archived;
  document.getElementById('medFrequency').disabled = archived;
  document.querySelectorAll('#scheduleTimes input, #weekDays input').forEach(input => input.disabled = archived);
}

function renderMedicines(medicines) {
  medsCache = medicines;
  document.getElementById('medicineCount').textContent = `${medicines.length} active medicine${medicines.length === 1 ? '' : 's'}`;
  document.getElementById('medicineList').innerHTML = medicines.length ? medicines.map(m => {
    const times = m.times || (m.time ? [m.time] : []);
    const schedule = times.map(format12Hour).join(', ') || 'Time not set';
    const frequency = m.frequency === 'weekly' ? ` · ${text((m.days || []).join(', '))}` : ' · Daily';
    const photos = medicinePhotos(m);
    const thumbs = photos.length
      ? photos.map((p, i) => `<img class="med-thumb" src="${p}" alt="Reference photo ${i + 1} of ${text(m.name)}">`).join('')
      : '<div class="med-thumb med-thumb-empty">📷</div>';
    const label = photos.length ? `📷 +Side (${photos.length})` : '📷 Photo';
    const clear = photos.length ? `<button class="mini-btn mini-clear" onclick="removeMedicineReference('${m.id}')" title="Clear reference photos">✕</button>` : '';
    return `<div class="med-item med-item-photo"><div class="med-thumbs">${thumbs}</div><div class="med-body"><div class="med-name">💊 ${text(m.name)}</div><div class="med-time">${schedule}${frequency} · ${text(m.dosage || '1 dose')}</div></div><div class="med-actions"><button class="mini-btn ${photos.length ? 'is-enrolled' : ''}" onclick="enrollMedicinePhoto('${m.id}')" title="Add a reference photo (front/back) of this medicine">${label}</button>${clear}<button class="remove-med-btn" onclick="removeMedicine('${m.id}', '${String(m.name || '').replace(/'/g, "\\'")}')">Remove</button></div></div>`;
  }).join('') : '<div class="empty-state">No medicines added yet.</div>';
}

function medicinePhotos(med) {
  if (Array.isArray(med.refPhotos) && med.refPhotos.length) return med.refPhotos;
  return med.refPhoto ? [med.refPhoto] : [];
}

async function enrollMedicinePhoto(medicineId) {
  if (selectedPatient && selectedPatient.status === 'archived') { alert('Restore this patient before editing medicines.'); return; }
  if (typeof buildMedicineReference !== 'function') { alert('The photo AI is still loading. Check your connection and try again.'); return; }
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.capture = 'environment';
  input.onchange = async () => {
    const file = input.files && input.files[0];
    if (!file) return;
    try {
      if (window.MediCareML) await MediCareML.loadMatchLibs();
      const { embedding, photo } = await buildMedicineReference(file);
      const med = medsCache.find(item => item.id === medicineId) || {};
      const embeddings = Array.isArray(med.refEmbeddings) ? med.refEmbeddings.slice()
        : (Array.isArray(med.refEmbedding) && med.refEmbedding.length ? [med.refEmbedding] : []);
      const photos = medicinePhotos(med).slice();
      embeddings.push(embedding);
      photos.push(photo);
      await db.collection('medicines').doc(medicineId).update({
        refEmbeddings: embeddings,
        refPhotos: photos,
        refEmbedding: firebase.firestore.FieldValue.delete(),
        refPhoto: firebase.firestore.FieldValue.delete(),
        refEnrolledAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      await loadPatient();
    } catch (error) {
      console.error('Could not enrol the reference photo:', error);
      alert('Could not save that photo. Use a clear, well-lit picture of the strip or box (name visible) and try again.');
    }
  };
  input.click();
}

async function removeMedicineReference(medicineId) {
  if (!confirm('Clear all reference photos for this medicine? It will fall back to generic detection.')) return;
  try {
    await db.collection('medicines').doc(medicineId).update({
      refEmbeddings: firebase.firestore.FieldValue.delete(),
      refPhotos: firebase.firestore.FieldValue.delete(),
      refEmbedding: firebase.firestore.FieldValue.delete(),
      refPhoto: firebase.firestore.FieldValue.delete()
    });
    await loadPatient();
  } catch (error) {
    console.error('Could not clear reference photos:', error);
    alert('Could not clear the reference photos. Please try again.');
  }
}

async function removeMedicine(medicineId, medicineName) {
  if (!confirm(`Remove ${medicineName} from this patient's active care plan? Existing dose history will remain.`)) return;
  try {
    await db.collection('medicines').doc(medicineId).delete();
    await loadPatient();
  } catch (error) {
    console.error('Unable to remove medicine:', error);
    alert('Could not remove this medicine. Please try again.');
  }
}

function caregiverContacts() {
  return selectedPatient.relativeContacts || (selectedPatient.relativePhone ? [{ name:'Care taker', phone:selectedPatient.relativePhone }] : []);
}

function renderCaregivers() {
  const contacts = caregiverContacts();
  document.getElementById('caregiverList').innerHTML = contacts.length ? contacts.map((c, i) => `<div class="contact-line"><div><strong>${text(c.name || 'Care taker')}</strong><span>${text(c.phone)}</span></div><button class="remove-contact" onclick="removeCaregiver(${i})">Remove</button></div>`).join('') : '<div class="empty-state">No care takers added yet.</div>';
}

function renderDoses(doses) {
  doses.sort((a,b) => String(b.date || '').localeCompare(String(a.date || '')));
  document.getElementById('doseHistory').innerHTML = doses.length ? doses.slice(0, 10).map(d => {
    const state = d.status === 'verified' ? 'verified' : d.status === 'missed' ? 'missed' : 'pending';
    return `<div class="med-item"><div><div class="med-name">${text(d.medName)}</div><div class="med-time">${text(d.date)} · ${text(d.scheduledTime)}</div></div><span class="badge ${state}">${text(d.status || 'pending')}</span></div>`;
  }).join('') : '<div class="empty-state">No dose history yet.</div>';
}

function exportPatientHistory() {
  if (!historyCache.length) { alert('There is no dose history to export yet.'); return; }
  const safe = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const rows = [
    ['Patient', selectedPatient.name || selectedPatient.email || 'Patient'],
    ['Email', selectedPatient.email || ''],
    [],
    ['Date', 'Medicine', 'Dosage', 'Scheduled Time', 'Status']
  ];
  historyCache
    .slice()
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
    .forEach(dose => rows.push([dose.date || '', dose.medName || '', dose.dosage || '', dose.scheduledTime || '', dose.status || 'pending']));
  const csv = '\ufeff' + rows.map(row => row.map(safe).join(',')).join('\r\n');
  const file = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const filename = `medicare-${String(selectedPatient.name || 'patient').replace(/[^a-z0-9]/gi, '-').toLowerCase()}-history.csv`;
  link.href = URL.createObjectURL(file);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

async function addMedicine() {
  if (selectedPatient.status === 'archived') { alert('Restore this patient before adding medicines.'); return; }
  const error = document.getElementById('medError');
  const name = document.getElementById('medName').value.trim();
  const dosage = document.getElementById('medDosage').value.trim();
  const times = Array.from(document.querySelectorAll('#scheduleTimes input:checked')).map(input => input.value);
  const frequency = document.getElementById('medFrequency').value;
  const days = Array.from(document.querySelectorAll('#weekDays input:checked')).map(input => input.value);
  error.textContent = '';
  if (!name || !times.length) { error.textContent = 'Enter medicine name and choose at least one time.'; return; }
  if (frequency === 'weekly' && !days.length) { error.textContent = 'Choose at least one day.'; return; }
  try {
    const existing = await medicinesForPatient();
    if (existing.some(medicine => normalizeMedicineName(medicine.name) === normalizeMedicineName(name))) {
      error.textContent = 'This medicine is already in the active care plan.';
      return;
    }
    await db.collection('medicines').add({ patientId:selectedPatientId, name, dosage:dosage || '1 dose', time:times[0], times, frequency, days, createdAt:firebase.firestore.FieldValue.serverTimestamp() });
    document.getElementById('medName').value = ''; document.getElementById('medDosage').value = '';
    document.querySelectorAll('#scheduleTimes input, #weekDays input').forEach(input => input.checked = false);
    document.querySelectorAll('.custom-schedule-time').forEach(item => item.remove());
    document.getElementById('medFrequency').value = 'daily'; toggleWeekDays();
    await loadPatient();
    closeAddMedicineModal();
  } catch (e) { console.error(e); error.textContent = 'Could not save medicine. Check Firestore permissions.'; }
}

function normalizeMedicineName(name) {
  return String(name || '').toLowerCase().replace(/\b(tab(let)?|cap(sule)?|syrup|mg|ml)\b/g, '').replace(/[^a-z0-9]/g, '');
}

async function medicinesForPatient() {
  const snapshot = await db.collection('medicines').where('patientId', '==', selectedPatientId).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function scanPrescription() {
  const file = document.getElementById('prescriptionFile').files[0];
  const status = document.getElementById('scanStatus');
  const results = document.getElementById('scanResults');
  const readButton = document.getElementById('scanReadBtn');
  if (!file) { status.textContent = 'Choose a prescription image first.'; return; }
  readButton.disabled = true; readButton.textContent = 'Loading scanner…';
  try {
    if (window.MediCareML) await MediCareML.loadOcrLibs();
  } catch (e) { /* handled below */ }
  if (!window.Tesseract) { status.textContent = 'Scanner could not load. Please check your internet connection and try again.'; readButton.disabled = false; readButton.textContent = 'Read prescription'; return; }
  status.textContent = 'Starting AI text reader…'; results.innerHTML = '';
  document.getElementById('scanTextWrap').style.display = 'none';
  readButton.disabled = true; readButton.textContent = 'Reading…';
  try {
    const output = await Tesseract.recognize(file, 'eng', { logger: message => {
      if (message.status === 'recognizing text') status.textContent = `Reading prescription… ${Math.round(message.progress * 100)}%`;
    }});
    document.getElementById('scanText').textContent = output.data.text || '(No text detected)';
    document.getElementById('scanTextWrap').style.display = 'block';
    prescriptionCandidates = extractMedicineCandidates(output.data.text);
    const existing = await medicinesForPatient();
    const existingNames = new Set(existing.map(medicine => normalizeMedicineName(medicine.name)));
    prescriptionCandidates.forEach(candidate => candidate.duplicate = existingNames.has(normalizeMedicineName(candidate.name)));
    renderScanResults(output.data.text);
  } catch (error) {
    console.error('Prescription scan failed:', error);
    status.textContent = 'Could not read this image. Use a brighter, clear, straight photo and try again.';
  } finally {
    readButton.disabled = false; readButton.textContent = 'Read prescription';
  }
}

function prescriptionSelected() {
  const file = document.getElementById('prescriptionFile').files[0];
  const status = document.getElementById('scanStatus');
  if (file) status.textContent = `Selected: ${file.name}. Click Read prescription to start.`;
}

function extractMedicineCandidates(rawText) {
  const candidates = [];
  rawText.split(/\r?\n/).forEach(line => {
    const clean = line.replace(/\s+/g, ' ').trim();
    if (clean.length < 4) return;
    const labelMatch = clean.match(/(?:tab(?:let)?|cap(?:sule)?|syrup)\.?\s+([a-z][a-z0-9 .-]{2,}?)(?=\s+(?:\d+(?:mg|ml)|\d[-x]\d[-x]\d|\d{1,2}:|$)|$)/i);
    const scheduleMatch = clean.match(/^([a-z][a-z0-9 .-]{2,}?)\s+(?:\d+(?:mg|ml)|\d[-x]\d[-x]\d|\d{1,2}:\d{2})/i);
    const name = (labelMatch?.[1] || scheduleMatch?.[1] || '').replace(/\b\d+(?:mg|ml)\b/ig, '').trim();
    if (!name || /doctor|patient|date|prescription|advice|morning|night/i.test(name)) return;
    const timeMatch = clean.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
    const hour = timeMatch ? Number(timeMatch[1]) : 9;
    const minute = timeMatch?.[2] || '00';
    const period = timeMatch?.[3]?.toUpperCase() || 'AM';
    const time = to24Hour(hour, minute, period);
    if (!candidates.some(candidate => normalizeMedicineName(candidate.name) === normalizeMedicineName(name))) candidates.push({ name, dosage: (clean.match(/\b\d+(?:mg|ml)\b/i) || ['1 dose'])[0], time, inferred: !timeMatch });
  });
  return candidates;
}

function to24Hour(hour, minute, period) {
  if (period === 'AM' && hour === 12) hour = 0;
  if (period === 'PM' && hour !== 12) hour += 12;
  return `${String(hour).padStart(2, '0')}:${minute}`;
}

function renderScanResults(rawText) {
  const status = document.getElementById('scanStatus');
  const results = document.getElementById('scanResults');
  if (!prescriptionCandidates.length) {
    status.textContent = 'No medicine names could be confidently extracted.';
    results.innerHTML = '<div class="scan-note">Please add medicines manually and check the prescription carefully.</div>';
    return;
  }
  status.textContent = `${prescriptionCandidates.length} medicine${prescriptionCandidates.length === 1 ? '' : 's'} found. Review before importing.`;
  results.innerHTML = prescriptionCandidates.map((candidate, index) => {
    const [hours, minutes] = candidate.time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM'; const hour = hours % 12 || 12;
    const slots = ['08:00', '13:00', '20:00'].map(time => `<label><input type="checkbox" value="${time}" ${candidate.inferred ? '' : (time === candidate.time ? 'checked' : '')}><span>${format12Hour(time)}</span></label>`).join('');
    return `<div class="scan-medicine-card ${candidate.duplicate ? 'is-duplicate' : ''}">
      <div class="scan-card-head"><label><input class="scan-select" type="checkbox" value="${index}" ${candidate.duplicate ? 'disabled' : 'checked'}> Import</label><em>${candidate.duplicate ? 'Already added' : 'Review details'}</em></div>
      <input class="scan-name" data-index="${index}" value="${text(candidate.name)}" aria-label="Medicine name">
      <input class="scan-dosage" data-index="${index}" value="${text(candidate.dosage)}" aria-label="Dosage">
      <div class="scan-field-label">Take at — select one or more</div>
      <div class="scan-times" data-index="${index}">${slots}</div>
      <div class="scan-field-label">Or choose a custom time</div>
      <div class="scan-custom-time"><select class="scan-hour" data-index="${index}">${Array.from({length:12}, (_, i) => `<option value="${i + 1}" ${hour === i + 1 ? 'selected' : ''}>${i + 1}</option>`).join('')}</select><span>:</span><select class="scan-minute" data-index="${index}">${Array.from({length:60}, (_, i) => `<option value="${String(i).padStart(2,'0')}" ${minutes === i ? 'selected' : ''}>${String(i).padStart(2,'0')}</option>`).join('')}</select><select class="scan-period" data-index="${index}"><option ${period === 'AM' ? 'selected' : ''}>AM</option><option ${period === 'PM' ? 'selected' : ''}>PM</option></select></div>
      <label class="scan-weekly-toggle"><input class="scan-weekly" type="checkbox" data-index="${index}"> Specific weekdays</label>
      <div class="scan-days" data-index="${index}" style="display:none;">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day => `<label><input type="checkbox" value="${day}"><span>${day}</span></label>`).join('')}</div>
    </div>`;
  }).join('') + '<button class="primary scan-import-btn" onclick="importPrescriptionMedicines()">Save selected medicines</button>';
  results.querySelectorAll('.scan-weekly').forEach(toggle => toggle.addEventListener('change', event => { results.querySelector(`.scan-days[data-index="${event.target.dataset.index}"]`).style.display = event.target.checked ? 'grid' : 'none'; }));
}

function format12Hour(time) {
  const [hours, minutes] = time.split(':').map(Number); const period = hours >= 12 ? 'PM' : 'AM'; const hour = hours % 12 || 12;
  return `${hour}:${String(minutes).padStart(2, '0')} ${period}`;
}

async function importPrescriptionMedicines() {
  const chosen = Array.from(document.querySelectorAll('#scanResults .scan-select:checked')).map(input => {
    const index = Number(input.value); const card = input.closest('.scan-medicine-card');
    const name = card.querySelector('.scan-name').value.trim(); const dosage = card.querySelector('.scan-dosage').value.trim() || '1 dose';
    const checkedTimes = Array.from(card.querySelectorAll('.scan-times input:checked')).map(item => item.value);
    const customTime = to24Hour(Number(card.querySelector('.scan-hour').value), card.querySelector('.scan-minute').value, card.querySelector('.scan-period').value);
    const times = checkedTimes.length ? checkedTimes : [customTime];
    const weekly = card.querySelector('.scan-weekly').checked;
    const days = weekly ? Array.from(card.querySelectorAll('.scan-days input:checked')).map(item => item.value) : [];
    return { ...prescriptionCandidates[index], name, dosage, times, time:times[0], frequency:weekly ? 'weekly' : 'daily', days };
  });
  if (!chosen.length) { alert('Choose at least one medicine to import.'); return; }
  if (chosen.some(candidate => !candidate.name)) { alert('Each selected medicine needs a name.'); return; }
  if (chosen.some(candidate => candidate.frequency === 'weekly' && !candidate.days.length)) { alert('Select at least one weekday for each weekly medicine.'); return; }
  try {
    const batch = db.batch();
    chosen.forEach(candidate => batch.set(db.collection('medicines').doc(), { patientId:selectedPatientId, name:candidate.name, dosage:candidate.dosage, time:candidate.time, times:candidate.times, frequency:candidate.frequency, days:candidate.days, source:'prescription-ocr', createdAt:firebase.firestore.FieldValue.serverTimestamp() }));
    batch.set(db.collection('healthRecords').doc(), {
      patientId: selectedPatientId,
      type: 'prescription',
      title: 'Scanned prescription',
      date: new Date().toISOString().slice(0, 10),
      medicineNames: chosen.map(candidate => ({ name: candidate.name, dosage: candidate.dosage, times: candidate.times })),
      source: 'prescription-ocr',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    await batch.commit();
    document.getElementById('scanStatus').textContent = `${chosen.length} medicine${chosen.length === 1 ? '' : 's'} imported successfully.`;
    document.getElementById('scanResults').innerHTML = '';
    await loadPatient();
  } catch (error) { console.error(error); document.getElementById('scanStatus').textContent = 'Could not import medicines. Check Firestore permissions.'; }
}

function toggleWeekDays() {
  document.getElementById('weekDays').style.display = document.getElementById('medFrequency').value === 'weekly' ? 'grid' : 'none';
}

function setupCustomTimePicker() {
  const hour = document.getElementById('customMedHour');
  const minute = document.getElementById('customMedMinute');
  if (hour.options.length) return;
  hour.innerHTML = Array.from({ length:12 }, (_, index) => `<option value="${index + 1}">${index + 1}</option>`).join('');
  minute.innerHTML = Array.from({ length:60 }, (_, index) => `<option value="${String(index).padStart(2, '0')}">${String(index).padStart(2, '0')}</option>`).join('');
}

function addCustomScheduleTime() {
  const hour = Number(document.getElementById('customMedHour').value);
  const minute = document.getElementById('customMedMinute').value;
  const period = document.getElementById('customMedPeriod').value;
  const time = to24Hour(hour, minute, period);
  const container = document.getElementById('scheduleTimes');
  if (Array.from(container.querySelectorAll('input')).some(input => input.value === time)) {
    alert(`${format12Hour(time)} is already selected.`); return;
  }
  const label = document.createElement('label');
  label.className = 'custom-schedule-time';
  label.innerHTML = `<input type="checkbox" value="${time}" checked><span>${format12Hour(time)}<small>Custom</small></span>`;
  container.appendChild(label);
}

async function archivePatient() {
  const archived = selectedPatient.status === 'archived';
  const action = archived ? 'restore' : 'archive';
  if (!confirm(`Do you want to ${action} this patient? Their history will be kept.`)) return;
  try {
    await db.collection('users').doc(selectedPatientId).update({ status: archived ? 'active' : 'archived', archivedAt: archived ? firebase.firestore.FieldValue.delete() : firebase.firestore.FieldValue.serverTimestamp() });
    selectedPatient.status = archived ? 'active' : 'archived';
    renderProfile();
  } catch (error) { console.error(error); alert('Could not update this patient.'); }
}

async function addCaregiver() {
  const error = document.getElementById('caregiverError');
  const name = document.getElementById('caregiverName').value.trim();
  const phone = document.getElementById('caregiverPhone').value.trim();
  error.textContent = '';
  if (!name || !phone) { error.textContent = 'Enter care taker name and WhatsApp number.'; return false; }
  try {
    const contacts = caregiverContacts(); contacts.push({ name, phone });
    await db.collection('users').doc(selectedPatientId).update({ relativeContacts:contacts, relativePhone:contacts[0].phone });
    selectedPatient.relativeContacts = contacts; selectedPatient.relativePhone = contacts[0].phone;
    document.getElementById('caregiverName').value = ''; document.getElementById('caregiverPhone').value = '';
    renderCaregivers();
    return true;
  } catch (e) { console.error(e); error.textContent = 'Could not save contact. Check Firestore permissions.'; return false; }
}

async function removeCaregiver(index) {
  const contacts = caregiverContacts(); contacts.splice(index, 1);
  try {
    await db.collection('users').doc(selectedPatientId).update({ relativeContacts:contacts, relativePhone:contacts[0]?.phone || '' });
    selectedPatient.relativeContacts = contacts; selectedPatient.relativePhone = contacts[0]?.phone || '';
    renderCaregivers();
  } catch (e) { console.error(e); alert('Could not remove the contact.'); }
}
